// Baby Care Tracker - 新生儿养护追踪小程序
// 应用入口文件

import { reminderService } from './services/reminder';
import { themeService } from './services/theme';
import { syncService } from './services/sync';
import { store } from './store/index';

// 使用微信原生云开发 API（wx.cloud），无需额外 npm 依赖
const CLOUD_ENV_ID = 'neo3-7gtg0bdtc9fcc672';

/** 提醒弹窗冷却时间（毫秒）：同类型提醒 30 分钟内不重复弹 */
const REMINDER_COOLDOWN_MS = 30 * 60 * 1000;

interface IAppOption {
  globalData: {
    /** 云开发环境 ID */
    cloudEnvId: string;
    /** 云开发是否就绪 */
    cloudReady: boolean;
    currentBabyId: string | null;
    storageVersion: number;
    /** 跨 Tab 页导航意图：从首页快捷入口跳转时携带的目标动作 */
    navIntent?: {
      target: string; // 目标页面标识，如 'growth-center'
      action?: string; // 具体动作，如 'addGrowth' | 'milestone'
    } | null;
    /** 上次喂养提醒弹窗时间戳 */
    _lastFeedingAlertTime?: number;
    /** 上次疫苗提醒弹窗时间戳 */
    _lastVaccineAlertTime?: number;
    /** 手动主题模式下的 page-style 字符串 */
    pageStyle: string;
  };
}

App<IAppOption>({
  globalData: {
    cloudEnvId: CLOUD_ENV_ID,
    cloudReady: false,
    currentBabyId: null,
    storageVersion: 1,
    pageStyle: '',
  },

  onLaunch() {
    // 初始化主题
    themeService.init();
    this.globalData.pageStyle = themeService.getPageStyle();

    // 预加载 TDesign 图标字体，避免渲染层网络加载失败警告
    this.loadIconFont();

    // 初始化全局 Store（内部注册 EventBus 监听）
    store.init();

    // 初始化存储版本检查
    this.checkStorageVersion();
    // 加载当前宝宝信息
    this.loadCurrentBaby();

    // 初始化微信原生云开发（带重试）
    console.log('[App] wx.cloud 检测:', typeof wx.cloud, !!wx.cloud);
    this._initCloudAndSync();
  },

  onShow() {
    // 延迟检查提醒，避免阻塞启动渲染
    setTimeout(() => {
      this.checkReminders();
    }, 1500);

    // 恢复实时监听（从后台切回时）
    if (syncService.isCloudEnabled() && !syncService.isWatching()) {
      syncService.startWatch();
    }
  },

  onHide() {
    // 小程序进入后台时，暂停实时监听以节约资源
    syncService.stopWatch();
  },

  /**
   * 检查本地存储数据版本，必要时执行数据迁移
   */
  checkStorageVersion() {
    try {
      const version = wx.getStorageSync('storage_version');
      if (!version) {
        wx.setStorageSync('storage_version', this.globalData.storageVersion);
      } else if (version < this.globalData.storageVersion) {
        // 预留：后续版本升级时在此执行数据迁移逻辑
        this.migrateData(version, this.globalData.storageVersion);
        wx.setStorageSync('storage_version', this.globalData.storageVersion);
      }
    } catch (e) {
      console.error('存储版本检查失败:', e);
    }
  },

  /**
   * 数据迁移（预留接口）
   */
  migrateData(_fromVersion: number, _toVersion: number) {
    // 预留：根据版本差异执行对应的数据结构迁移
    console.log(`数据迁移: v${_fromVersion} -> v${_toVersion}`);
  },

  /**
   * 加载当前选中的宝宝信息
   */
  loadCurrentBaby() {
    try {
      const currentBabyId = wx.getStorageSync('current_baby_id');
      if (currentBabyId) {
        this.globalData.currentBabyId = currentBabyId;
      }
    } catch (e) {
      console.error('加载当前宝宝信息失败:', e);
    }
  },

  /**
   * 预加载 TDesign 图标字体
   * 通过 wx.loadFontFace 主动加载，避免渲染层 @font-face 网络请求失败的警告
   */
  loadIconFont() {
    wx.loadFontFace({
      global: true,
      family: 't',
      source: 'url("https://tdesign.gtimg.com/icon/0.4.1/fonts/t.woff")',
      scopes: ['webview', 'native'],
      success: () => {
        console.log('TDesign 图标字体加载成功');
      },
      fail: (err) => {
        console.warn('TDesign 图标字体加载失败（不影响功能）:', err);
      },
    });
  },

  /**
   * 初始化云开发并启动同步服务
   * wx.cloud 在某些环境/时序下可能延迟挂载，增加重试机制
   */
  _initCloudAndSync(retryCount = 0) {
    const MAX_RETRY = 3;
    const RETRY_DELAY = 1000; // 1秒后重试

    if (!wx.cloud) {
      if (retryCount < MAX_RETRY) {
        console.warn(
          `[App] wx.cloud 尚未挂载，${RETRY_DELAY}ms 后重试 (${retryCount + 1}/${MAX_RETRY})`,
        );
        setTimeout(() => {
          this._initCloudAndSync(retryCount + 1);
        }, RETRY_DELAY);
      } else {
        console.error(
          '[App] wx.cloud 多次重试后仍不可用，请检查：1) project.config.json 的 cloudfunctionRoot 配置 2) app.json 的 "cloud": true 3) 微信开发者工具是否启用云开发',
        );
      }
      return;
    }

    // wx.cloud 存在，执行初始化
    try {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true,
      });
      this.globalData.cloudReady = true;
      console.log('[App] wx.cloud 初始化成功, env:', CLOUD_ENV_ID);
    } catch (err) {
      console.error('[App] wx.cloud.init() 异常:', err);
      return;
    }

    // 初始化云同步服务（直接传入 envId，避免 getApp() 时序问题）
    syncService.initCloud(CLOUD_ENV_ID).then(async (ok) => {
      if (ok) {
        console.log('[App] 云同步服务初始化成功');
        try {
          const res = (await wx.cloud.callFunction({ name: 'getOpenId' }).catch(() => null)) as any;
          if (res?.result?.openid) {
            wx.setStorageSync('user_openid', res.result.openid as string);
          } else {
            if (!wx.getStorageSync('user_openid')) {
              const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              wx.setStorageSync('user_openid', localId);
            }
          }
        } catch (authErr) {
          console.warn('[App] 获取 openid 失败（离线可用）:', authErr);
        }
        syncService.startAutoSync();
        syncService.startWatch();
      } else {
        console.warn('[App] 云同步服务初始化跳过（离线模式）');
      }
    });
  },

  /**
   * 检查智能提醒并弹出通知
   * 带冷却机制：同类型提醒 30 分钟内不重复弹出
   */
  checkReminders() {
    try {
      if (!this.globalData.currentBabyId) return;

      const now = Date.now();

      // 检查喂养超时提醒
      const lastFeedingAlert = this.globalData._lastFeedingAlertTime || 0;
      if (now - lastFeedingAlert > REMINDER_COOLDOWN_MS) {
        if (reminderService.shouldShowFeedingAlert()) {
          const status = reminderService.getFeedingReminderStatus();
          if (status) {
            this.globalData._lastFeedingAlertTime = now;
            wx.showModal({
              title: '🍼 喂养提醒',
              content: `距上次喂养${status.reminderText}，是否现在记录一次喂养？`,
              confirmText: '去记录',
              cancelText: '稍后',
              success: (res) => {
                if (res.confirm) {
                  wx.navigateTo({ url: '/pages/feeding/add/index' });
                }
              },
            });
            return; // 一次只弹一个提醒，避免连续弹窗
          }
        }
      }

      // 检查疫苗到期提醒
      const lastVaccineAlert = this.globalData._lastVaccineAlertTime || 0;
      if (now - lastVaccineAlert > REMINDER_COOLDOWN_MS) {
        if (reminderService.shouldShowVaccineAlert()) {
          const reminders = reminderService.getVaccineReminders();
          const urgentList = reminders.filter((v) => v.daysUntil <= 0);
          if (urgentList.length > 0) {
            this.globalData._lastVaccineAlertTime = now;
            const names = urgentList
              .slice(0, 3)
              .map((v) => v.vaccineName)
              .join('、');
            const suffix = urgentList.length > 3 ? `等 ${urgentList.length} 项` : '';
            wx.showModal({
              title: '💉 疫苗提醒',
              content: `${names}${suffix}已到接种时间，请及时安排接种。`,
              confirmText: '查看',
              cancelText: '知道了',
              success: (res) => {
                if (res.confirm) {
                  wx.navigateTo({ url: '/pages/vaccine/index' });
                }
              },
            });
          }
        }
      }
    } catch (e) {
      console.error('[App] 提醒检查失败:', e);
    }
  },
});

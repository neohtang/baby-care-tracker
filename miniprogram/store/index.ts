/**
 * 轻量级全局 Store — Phase 2.5 状态管理升级
 *
 * 设计目标：
 * 1. 管理跨页面共享的高频数据（currentBaby、todaySummary、pageStyle）
 * 2. 监听 EventBus 事件，精准更新受影响的 Store 字段
 * 3. 已连接的页面自动收到 diff 更新，减少冗余 setData
 * 4. 保留 EventBus 做页面级细粒度通知（如 Daily 页的 Tab 内数据），Store 负责跨页面共享
 *
 * 不引入外部依赖，纯自研 ~200 行。
 */

import { babyService } from '../services/baby';
import { statisticsService } from '../services/statistics';
import { themeService } from '../services/theme';
import eventBus, { Events } from '../utils/event-bus';
import type { BabyInfo } from '../types/index';

// ============ Store 数据类型定义 ============

/** Store 中的宝宝展示信息 */
export interface StoreBabyDisplay {
  hasBaby: boolean;
  babyName: string;
  babyAgeText: string;
  babyGender: string;
  babyGenderText: string;
  babyAvatarUrl: string;
}

/** Store 中的仪表盘摘要 */
export interface StoreDashboardSummary {
  feedingCount: number;
  feedingDetail: string;
  sleepDuration: string;
  sleepHours: number;
  diaperCount: number;
  diaperDetail: string;
  temperature: string;
  temperatureLevel: string;
  hasAlert: boolean;
}

/** Store 全局状态 */
export interface StoreState {
  /** 当前宝宝原始数据 */
  currentBaby: BabyInfo | null;
  /** 当前宝宝展示信息（格式化后） */
  babyDisplay: StoreBabyDisplay;
  /** 今日仪表盘摘要 */
  dashboardSummary: StoreDashboardSummary | null;
  /** 当前页面样式（主题） */
  pageStyle: string;
}

/** 页面可订阅的 Store 字段 */
export type StoreKey = keyof StoreState;

/** 连接配置 —— 指定页面关心的 Store 字段及其映射到 page data 的键名 */
export type StoreMapping = Partial<Record<StoreKey, string | boolean>>;

// ============ Subscriber 类型 ============

interface Subscriber {
  /** 页面实例（Page this） */
  page: WechatMiniprogram.Page.Instance<any, any>;
  /** 订阅的字段映射：StoreKey → pageData key（true 则用默认键名） */
  mapping: StoreMapping;
}

// ============ Store 实现 ============

class AppStore {
  private _state: StoreState;
  private _subscribers: Set<Subscriber> = new Set();
  private _initialized = false;

  constructor() {
    this._state = {
      currentBaby: null,
      babyDisplay: {
        hasBaby: false,
        babyName: '',
        babyAgeText: '请前往「我的」添加宝宝信息',
        babyGender: '',
        babyGenderText: '',
        babyAvatarUrl: '',
      },
      dashboardSummary: null,
      pageStyle: '',
    };
  }

  /** 获取当前完整状态（只读引用） */
  getState(): Readonly<StoreState> {
    return this._state;
  }

  /** 获取单个字段 */
  get<K extends StoreKey>(key: K): StoreState[K] {
    return this._state[key];
  }

  /**
   * 初始化 Store —— 在 App onLaunch 中调用
   * 从 Service 层拉取初始数据，并注册 EventBus 监听
   */
  init(): void {
    if (this._initialized) return;
    this._initialized = true;

    // 拉取初始状态
    this._refreshBaby();
    this._refreshDashboard();
    this._refreshPageStyle();

    // 注册 EventBus 监听
    this._bindEventBus();
  }

  // ============ 数据刷新方法 ============

  /** 刷新宝宝信息 */
  private _refreshBaby(): void {
    const baby = babyService.getCurrentBaby();
    const oldHasBaby = this._state.babyDisplay.hasBaby;
    const oldBabyId = this._state.currentBaby?.id;

    this._state.currentBaby = baby;

    if (baby) {
      const display = babyService.getBabyDisplayInfo(baby);
      this._state.babyDisplay = {
        hasBaby: true,
        babyName: display.name,
        babyAgeText: display.ageText,
        babyGender: display.gender,
        babyGenderText: display.genderText,
        babyAvatarUrl: display.avatarUrl,
      };
    } else {
      this._state.babyDisplay = {
        hasBaby: false,
        babyName: '',
        babyAgeText: '请前往「我的」添加宝宝信息',
        babyGender: '',
        babyGenderText: '',
        babyAvatarUrl: '',
      };
    }

    // 宝宝切换时也需要刷新仪表盘
    if (oldBabyId !== baby?.id || oldHasBaby !== this._state.babyDisplay.hasBaby) {
      this._refreshDashboard();
    }

    this._notify(['currentBaby', 'babyDisplay']);
  }

  /** 刷新仪表盘摘要 */
  private _refreshDashboard(): void {
    const baby = this._state.currentBaby;
    if (!baby) {
      this._state.dashboardSummary = null;
    } else {
      this._state.dashboardSummary = statisticsService.getDashboardSummary(baby.id);
    }
    this._notify(['dashboardSummary']);
  }

  /** 刷新主题页面样式 */
  private _refreshPageStyle(): void {
    this._state.pageStyle = themeService.getPageStyle();
    this._notify(['pageStyle']);
  }

  // ============ EventBus 绑定 ============

  private _bindEventBus(): void {
    // 宝宝信息变更 → 刷新宝宝 + 仪表盘
    eventBus.on(Events.BABY_CHANGED, () => this._refreshBaby());
    eventBus.on(Events.BABY_SWITCHED, () => this._refreshBaby());

    // 记录类变更 → 仅刷新仪表盘（宝宝信息无变化）
    eventBus.on(Events.FEEDING_CHANGED, () => this._refreshDashboard());
    eventBus.on(Events.SLEEP_CHANGED, () => this._refreshDashboard());
    eventBus.on(Events.DIAPER_CHANGED, () => this._refreshDashboard());
    eventBus.on(Events.HEALTH_CHANGED, () => this._refreshDashboard());

    // 数据恢复 → 全量刷新
    eventBus.on(Events.DATA_RESTORED, () => {
      this._refreshBaby();
      this._refreshDashboard();
    });

    // 主题变更 → 刷新页面样式
    eventBus.on(Events.THEME_CHANGED, () => this._refreshPageStyle());
  }

  // ============ 订阅/通知机制 ============

  /**
   * 连接页面到 Store
   * @param page 页面实例 (this)
   * @param mapping 订阅映射，如 { babyDisplay: true, pageStyle: true }
   * @returns 取消订阅函数（在 onUnload 中调用）
   */
  connect(page: WechatMiniprogram.Page.Instance<any, any>, mapping: StoreMapping): () => void {
    const subscriber: Subscriber = { page, mapping };
    this._subscribers.add(subscriber);

    // 立即推送当前状态
    this._pushToPage(subscriber, Object.keys(mapping) as StoreKey[]);

    return () => {
      this._subscribers.delete(subscriber);
    };
  }

  /**
   * 通知所有订阅了指定字段的页面
   */
  private _notify(changedKeys: StoreKey[]): void {
    this._subscribers.forEach((sub) => {
      this._pushToPage(sub, changedKeys);
    });
  }

  /**
   * 将 Store 数据推送到指定页面
   */
  private _pushToPage(sub: Subscriber, changedKeys: StoreKey[]): void {
    const data: Record<string, any> = {};
    let hasData = false;

    for (const key of changedKeys) {
      const mapValue = sub.mapping[key];
      if (mapValue === undefined) continue; // 页面未订阅此字段

      const dataKey = typeof mapValue === 'string' ? mapValue : key;
      data[dataKey] = this._state[key];
      hasData = true;
    }

    if (hasData) {
      try {
        sub.page.setData(data);
      } catch {
        // 页面可能已销毁，静默忽略
        this._subscribers.delete(sub);
      }
    }
  }

  /**
   * 手动触发刷新全部 Store 数据
   * 用于页面 onShow 时确保数据最新
   */
  refresh(): void {
    this._refreshBaby();
    this._refreshDashboard();
    this._refreshPageStyle();
  }

  /** 手动触发仅刷新仪表盘 */
  refreshDashboard(): void {
    this._refreshDashboard();
  }

  /** 手动触发仅刷新主题 */
  refreshPageStyle(): void {
    this._refreshPageStyle();
  }
}

// 导出全局单例
export const store = new AppStore();
export default store;
// test

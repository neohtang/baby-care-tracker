// pages/home/index.ts
// 首页仪表盘 - 宝宝养护追踪 (Tender Bloom 重构版)

import statisticsService from '../../services/statistics';
import { quickRecordService } from '../../services/quick-record';
import type { QuickRecordTemplate } from '../../services/quick-record';
import { store } from '../../store/index';
import type { StoreDashboardSummary } from '../../store/index';
import eventBus, { Events } from '../../utils/event-bus';
import { formatTime } from '../../utils/date';

/** 首页页面数据 */
interface HomePageData {
  loaded: boolean;
  hasBaby: boolean;
  babyName: string;
  babyAgeText: string;
  babyGender: string;
  babyAvatarUrl: string;
  babyGenderText: string;
  todayText: string;
  summaryItems: any[];
  timelineEvents: any[];
  hasAlert: boolean;
  pageStyle: string;
  // 闪电记录
  flashTemplates: QuickRecordTemplate[];
  flashCategory: string;
}

Page({
  data: {
    loaded: false,
    hasBaby: false,
    babyName: '',
    babyAgeText: '请前往「我的」添加宝宝信息',
    babyGender: '',
    babyAvatarUrl: '',
    babyGenderText: '',
    todayText: '',
    summaryItems: [] as any[],
    timelineEvents: [] as any[],
    hasAlert: false,
    pageStyle: '',
    flashTemplates: [] as QuickRecordTemplate[],
    flashCategory: 'all',
  } as HomePageData,

  _unsubscribers: [] as (() => void)[],
  _storeDisconnect: null as (() => void) | null,

  onLoad() {
    // 连接 Store：自动获取宝宝信息、仪表盘摘要、主题样式
    this._storeDisconnect = store.connect(this as any, {
      babyDisplay: true,
      dashboardSummary: true,
      pageStyle: true,
    });

    // 仅保留 Store 不覆盖的细粒度订阅：时间线刷新
    this._unsubscribers.push(
      eventBus.on(Events.FEEDING_CHANGED, () => this.loadTimeline()),
      eventBus.on(Events.SLEEP_CHANGED, () => this.loadTimeline()),
      eventBus.on(Events.DIAPER_CHANGED, () => this.loadTimeline()),
      eventBus.on(Events.HEALTH_CHANGED, () => this.loadTimeline()),
      eventBus.on(Events.BABY_CHANGED, () => this.loadTimeline()),
      eventBus.on(Events.BABY_SWITCHED, () => this.loadTimeline()),
      eventBus.on(Events.DATA_RESTORED, () => this.loadTimeline()),
    );
  },

  onShow() {
    // Store 连接后会自动推送最新数据，此处只需手动触发 Store 刷新 + 加载时间线
    store.refresh();
    this.renderSummaryCards();
    this.loadTimeline();
    this.loadFlashTemplates();
    this.setData({ loaded: true });
  },

  onUnload() {
    this._unsubscribers.forEach((fn) => fn());
    this._unsubscribers = [];
    if (this._storeDisconnect) {
      this._storeDisconnect();
      this._storeDisconnect = null;
    }
  },

  /**
   * 根据 Store 推送的 babyDisplay 数据更新页面宝宝信息
   * （Store connect 自动调用 setData({ babyDisplay: ... })，但首页需要展平字段）
   */
  refreshAll() {
    this.renderBabyInfo();
    this.renderSummaryCards();
    this.loadTimeline();
    this.setData({ loaded: true });
  },

  /** 从 Store 的 babyDisplay 渲染宝宝信息 */
  renderBabyInfo() {
    const display = store.get('babyDisplay');
    this.setData({
      hasBaby: display.hasBaby,
      babyName: display.babyName,
      babyAgeText: display.babyAgeText,
      babyGender: display.babyGender,
      babyAvatarUrl: display.babyAvatarUrl,
      babyGenderText: display.babyGenderText,
    });
  },

  /** 从 Store 的 dashboardSummary 渲染摘要卡片 */
  renderSummaryCards() {
    const summary = store.get('dashboardSummary');
    if (!summary) {
      this.setData({
        summaryItems: this.getEmptySummaryItems(),
        hasAlert: false,
      });
      return;
    }
    this.setData({
      summaryItems: this.buildSummaryItems(summary),
      hasAlert: summary.hasAlert,
    });
  },

  refreshSummaryAndTimeline() {
    this.renderSummaryCards();
    this.loadTimeline();
  },

  loadBabyInfo() {
    this.renderBabyInfo();
  },

  loadSummary() {
    store.refreshDashboard();
    this.renderSummaryCards();
  },

  getEmptySummaryItems(): any[] {
    return [
      {
        icon: '/assets/icons/bottle.svg',
        iconBg: 'var(--module-feeding-bg)',
        value: 0,
        unit: '次',
        label: '喂养',
        detail: '暂无记录',
        detailBg: 'var(--module-feeding-bg)',
        detailColor: 'var(--module-feeding)',
      },
      {
        icon: '/assets/icons/sleep.svg',
        iconBg: 'var(--module-sleep-bg)',
        value: 0,
        unit: 'h',
        label: '睡眠',
        detail: '暂无记录',
        detailBg: 'var(--module-sleep-bg)',
        detailColor: 'var(--module-sleep)',
      },
      {
        icon: '/assets/icons/baby.svg',
        iconBg: 'var(--module-diaper-bg)',
        value: 0,
        unit: '次',
        label: '排便',
        detail: '暂无记录',
        detailBg: 'var(--module-diaper-bg)',
        detailColor: 'var(--module-diaper)',
      },
      {
        icon: '/assets/icons/thermometer.svg',
        iconBg: 'var(--module-health-bg)',
        value: '--',
        unit: '℃',
        label: '体温',
        detail: '--',
        detailBg: 'var(--module-health-bg)',
        detailColor: 'var(--module-health)',
      },
    ];
  },

  /** 将 Store 中的 DashboardSummary 构建为页面摘要卡片数据 */
  buildSummaryItems(summary: StoreDashboardSummary): any[] {
    return [
      {
        icon: '/assets/icons/bottle.svg',
        iconBg: 'var(--module-feeding-bg)',
        value: summary.feedingCount,
        unit: '次',
        label: '喂养',
        detail: summary.feedingDetail,
        detailBg: 'var(--module-feeding-bg)',
        detailColor: 'var(--module-feeding)',
      },
      {
        icon: '/assets/icons/sleep.svg',
        iconBg: 'var(--module-sleep-bg)',
        value: summary.sleepHours,
        unit: 'h',
        label: '睡眠',
        detail: summary.sleepDuration,
        detailBg: 'var(--module-sleep-bg)',
        detailColor: 'var(--module-sleep)',
      },
      {
        icon: '/assets/icons/baby.svg',
        iconBg: 'var(--module-diaper-bg)',
        value: summary.diaperCount,
        unit: '次',
        label: '排便',
        detail: summary.diaperDetail,
        detailBg: 'var(--module-diaper-bg)',
        detailColor: 'var(--module-diaper)',
      },
      {
        icon: '/assets/icons/thermometer.svg',
        iconBg:
          summary.temperatureLevel === 'normal'
            ? 'var(--module-health-bg)'
            : 'var(--color-coral-bg)',
        value: summary.temperature,
        unit: '℃',
        label: '体温',
        detail:
          summary.temperatureLevel === 'normal'
            ? '正常'
            : summary.temperatureLevel === 'mild_fever'
              ? '低烧'
              : summary.temperatureLevel === 'moderate_fever'
                ? '中烧'
                : summary.temperatureLevel === 'high_fever'
                  ? '高烧'
                  : summary.temperatureLevel === 'low'
                    ? '偏低'
                    : '--',
        alert:
          summary.temperatureLevel === 'moderate_fever' ||
          summary.temperatureLevel === 'high_fever',
        detailBg:
          summary.temperatureLevel === 'normal'
            ? 'var(--module-health-bg)'
            : 'var(--color-coral-light)',
        detailColor:
          summary.temperatureLevel === 'normal' ? 'var(--module-health)' : 'var(--color-coral)',
      },
    ];
  },

  loadTimeline() {
    const baby = store.get('currentBaby');
    if (!baby) {
      this.setData({ timelineEvents: [] });
      return;
    }

    const events = statisticsService.getTodayTimeline(baby.id);
    const timelineEvents = events.map((evt) => ({
      ...evt,
      type: evt.type,
      timeText: formatTime(evt.time),
      typeName: evt.title,
      summary: evt.description,
    }));

    this.setData({ timelineEvents });
  },

  // ============ ⚡ 闪电记录 ============

  /** 加载闪电记录模板（每次 onShow 调用，配方奶模板基于历史记录动态生成） */
  loadFlashTemplates() {
    const category = this.data.flashCategory;
    let templates: QuickRecordTemplate[];
    if (category === 'all') {
      templates = quickRecordService.getTemplates();
    } else {
      templates = quickRecordService.getTemplatesByCategory(category as any);
    }
    this.setData({ flashTemplates: templates });
  },

  onFlashCategoryChange(e: WechatMiniprogram.TouchEvent) {
    const category = e.currentTarget.dataset.value as string;
    let templates: QuickRecordTemplate[];
    if (category === 'all') {
      templates = quickRecordService.getTemplates();
    } else {
      templates = quickRecordService.getTemplatesByCategory(category as any);
    }
    this.setData({ flashCategory: category, flashTemplates: templates });
  },

  onFlashRecord(e: WechatMiniprogram.TouchEvent) {
    const templateId = e.currentTarget.dataset.id as string;
    if (!templateId) return;

    if (!this.data.hasBaby) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }

    const result = quickRecordService.execute(templateId);
    if (result) {
      wx.showToast({ title: result, icon: 'success', duration: 1500 });
      // 数据变更会通过 EventBus 自动触发刷新
      // 重新加载模板（配方奶模板会因新记录更新排序）
      setTimeout(() => this.loadFlashTemplates(), 300);
    }
  },

  goToBabyProfile() {
    wx.switchTab({ url: '/pages/profile/index' });
  },

  goToStatistics() {
    wx.navigateTo({ url: '/pages/statistics/index' });
  },

  goToReport() {
    wx.navigateTo({ url: '/pages/report/index' });
  },

  goToAiAdvisor() {
    wx.navigateTo({ url: '/pages/ai-advisor/index' });
  },

  // ============ 摘要卡片点击 ============

  onSummaryTap(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index;
    const tabMap: Record<number, string> = {
      0: '/pages/daily/index', // 喂养 → 日常记录
      1: '/pages/daily/index', // 睡眠 → 日常记录
      2: '/pages/daily/index', // 排便 → 日常记录
      3: '/pages/health-center/index', // 体温 → 健康监测
    };
    const url = tabMap[index];
    if (url) {
      wx.switchTab({ url });
    }
  },

  // ============ 时间线事件点击 ============

  onTimelineEventTap(e: WechatMiniprogram.CustomEvent) {
    const { event } = e.detail;
    if (!event) return;

    // 时间线点击跳转到对应的 Tab 页
    const routeMap: Record<string, string> = {
      feeding: '/pages/daily/index',
      sleep: '/pages/daily/index',
      diaper: '/pages/daily/index',
      health: '/pages/health-center/index',
    };

    const url = routeMap[event.type];
    if (url) {
      wx.switchTab({ url });
    }
  },

  // ============ 下拉刷新 ============

  onPullDownRefresh() {
    this.refreshAll();
    wx.stopPullDownRefresh();
  },

  onShareAppMessage() {
    return {
      title: '宝宝养护追踪 - 记录宝宝成长每一刻',
      path: '/pages/home/index',
    };
  },
});

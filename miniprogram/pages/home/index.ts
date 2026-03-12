// pages/home/index.ts
// 首页仪表盘 - 宝宝养护追踪 (Tender Bloom 重构版)

import babyService from '../../services/baby';
import statisticsService from '../../services/statistics';
import eventBus, { Events } from '../../utils/event-bus';
import { formatTime } from '../../utils/date';
import type { TimelineEvent } from '../../types/index';

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
  } as HomePageData,

  _unsubscribers: [] as (() => void)[],

  onLoad() {
    this._unsubscribers.push(
      eventBus.on(Events.BABY_CHANGED, () => this.refreshAll()),
      eventBus.on(Events.BABY_SWITCHED, () => this.refreshAll()),
      eventBus.on(Events.FEEDING_CHANGED, () => this.refreshSummaryAndTimeline()),
      eventBus.on(Events.SLEEP_CHANGED, () => this.refreshSummaryAndTimeline()),
      eventBus.on(Events.DIAPER_CHANGED, () => this.refreshSummaryAndTimeline()),
      eventBus.on(Events.HEALTH_CHANGED, () => this.refreshSummaryAndTimeline()),
      eventBus.on(Events.DATA_RESTORED, () => this.refreshAll()),
    );
  },

  onShow() {
    this.refreshAll();
  },

  onUnload() {
    this._unsubscribers.forEach(fn => fn());
    this._unsubscribers = [];
  },

  refreshAll() {
    this.loadBabyInfo();
    this.loadSummary();
    this.loadTimeline();
    this.setData({ loaded: true });
  },

  refreshSummaryAndTimeline() {
    this.loadSummary();
    this.loadTimeline();
  },

  loadBabyInfo() {
    const baby = babyService.getCurrentBaby();
    if (!baby) {
      this.setData({
        hasBaby: false,
        babyName: '',
        babyAgeText: '请前往「我的」添加宝宝信息',
        babyGender: '',
        babyAvatarUrl: '',
        babyGenderText: '',
      });
      return;
    }

    const display = babyService.getBabyDisplayInfo(baby);
    this.setData({
      hasBaby: true,
      babyName: display.name,
      babyAgeText: display.ageText,
      babyGender: display.gender,
      babyAvatarUrl: display.avatarUrl,
      babyGenderText: display.genderText,
    });
  },

  loadSummary() {
    const baby = babyService.getCurrentBaby();
    if (!baby) {
      this.setData({
        summaryItems: this.getEmptySummaryItems(),
        hasAlert: false,
      });
      return;
    }

    const summary = statisticsService.getDashboardSummary(baby.id);

    const summaryItems = [
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
        iconBg: summary.temperatureLevel === 'normal' ? 'var(--module-health-bg)' : 'var(--color-coral-bg)',
        value: summary.temperature,
        unit: '℃',
        label: '体温',
        detail: summary.temperatureLevel === 'normal' ? '正常' :
                summary.temperatureLevel === 'mild_fever' ? '低烧' :
                summary.temperatureLevel === 'moderate_fever' ? '中烧' :
                summary.temperatureLevel === 'high_fever' ? '高烧' :
                summary.temperatureLevel === 'low' ? '偏低' : '--',
        alert: summary.temperatureLevel === 'moderate_fever' || summary.temperatureLevel === 'high_fever',
        detailBg: summary.temperatureLevel === 'normal' ? 'var(--module-health-bg)' : 'var(--color-coral-light)',
        detailColor: summary.temperatureLevel === 'normal' ? 'var(--module-health)' : 'var(--color-coral)',
      },
    ];

    this.setData({
      summaryItems,
      hasAlert: summary.hasAlert,
    });
  },

  getEmptySummaryItems(): any[] {
    return [
      { icon: '/assets/icons/bottle.svg', iconBg: 'var(--module-feeding-bg)', value: 0, unit: '次', label: '喂养', detail: '暂无记录', detailBg: 'var(--module-feeding-bg)', detailColor: 'var(--module-feeding)' },
      { icon: '/assets/icons/sleep.svg', iconBg: 'var(--module-sleep-bg)', value: 0, unit: 'h', label: '睡眠', detail: '暂无记录', detailBg: 'var(--module-sleep-bg)', detailColor: 'var(--module-sleep)' },
      { icon: '/assets/icons/baby.svg', iconBg: 'var(--module-diaper-bg)', value: 0, unit: '次', label: '排便', detail: '暂无记录', detailBg: 'var(--module-diaper-bg)', detailColor: 'var(--module-diaper)' },
      { icon: '/assets/icons/thermometer.svg', iconBg: 'var(--module-health-bg)', value: '--', unit: '℃', label: '体温', detail: '--', detailBg: 'var(--module-health-bg)', detailColor: 'var(--module-health)' },
    ];
  },

  loadTimeline() {
    const baby = babyService.getCurrentBaby();
    if (!baby) {
      this.setData({ timelineEvents: [] });
      return;
    }

    const events = statisticsService.getTodayTimeline(baby.id);
    const timelineEvents = events.map(evt => ({
      ...evt,
      type: evt.type,
      timeText: formatTime(evt.time),
      typeName: evt.title,
      summary: evt.description,
    }));

    this.setData({ timelineEvents });
  },

  // ============ 快捷操作（6个入口） ============

  goToFeeding() {
    wx.navigateTo({ url: '/pages/feeding/add/index' });
  },

  goToSleep() {
    wx.navigateTo({ url: '/pages/sleep/add/index' });
  },

  goToDiaper() {
    wx.navigateTo({ url: '/pages/diaper/add/index' });
  },

  goToHealth() {
    wx.navigateTo({ url: '/pages/health/add/index' });
  },

  goToGrowth() {
    // 设置导航意图：打开生长数据Tab的添加测量弹窗
    const app = getApp<IAppOption>();
    app.globalData.navIntent = { target: 'growth-center', action: 'addGrowth' };
    wx.switchTab({ url: '/pages/growth-center/index' });
  },

  goToMilestone() {
    // 设置导航意图：切换到发育里程碑Tab
    const app = getApp<IAppOption>();
    app.globalData.navIntent = { target: 'growth-center', action: 'milestone' };
    wx.switchTab({ url: '/pages/growth-center/index' });
  },

  goToBabyProfile() {
    wx.switchTab({ url: '/pages/profile/index' });
  },

  // ============ 摘要卡片点击 ============

  onSummaryTap(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index;
    const tabMap: Record<number, string> = {
      0: '/pages/daily/index',      // 喂养 → 日常记录
      1: '/pages/daily/index',      // 睡眠 → 日常记录
      2: '/pages/daily/index',      // 排便 → 日常记录
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

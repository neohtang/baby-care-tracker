// pages/home/index.ts
// 首页仪表盘 - 宝宝养护追踪

import babyService from '../../services/baby';
import statisticsService from '../../services/statistics';
import eventBus, { Events } from '../../utils/event-bus';
import { formatTime } from '../../utils/date';
import type { TimelineEvent } from '../../types/index';

/** 首页页面数据 */
interface HomePageData {
  /** 是否已加载 */
  loaded: boolean;
  /** 是否有宝宝信息 */
  hasBaby: boolean;
  /** 宝宝展示信息 */
  babyName: string;
  babyAgeText: string;
  babyGender: string;
  babyAvatarUrl: string;
  babyGenderText: string;
  /** 今日摘要统计 */
  summaryItems: any[];
  /** 今日时间线事件 */
  timelineEvents: any[];
  /** 是否有异常 */
  hasAlert: boolean;
}

Page({
  data: {
    loaded: false,
    hasBaby: false,
    babyName: '',
    babyAgeText: '请前往设置页添加宝宝信息',
    babyGender: '',
    babyAvatarUrl: '',
    babyGenderText: '',
    summaryItems: [] as any[],
    timelineEvents: [] as any[],
    hasAlert: false,
  } as HomePageData,

  /** 事件总线解绑函数 */
  _unsubscribers: [] as (() => void)[],

  onLoad() {
    // 订阅数据变更事件
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

  /**
   * 刷新所有数据
   */
  refreshAll() {
    this.loadBabyInfo();
    this.loadSummary();
    this.loadTimeline();
    this.setData({ loaded: true });
  },

  /**
   * 仅刷新摘要和时间线
   */
  refreshSummaryAndTimeline() {
    this.loadSummary();
    this.loadTimeline();
  },

  /**
   * 加载宝宝基本信息
   */
  loadBabyInfo() {
    const baby = babyService.getCurrentBaby();
    if (!baby) {
      this.setData({
        hasBaby: false,
        babyName: '',
        babyAgeText: '请前往设置页添加宝宝信息',
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

  /**
   * 加载今日统计摘要
   */
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
        iconBg: '#EDE9FE',
        value: summary.feedingCount,
        unit: '次',
        label: '喂养',
        detail: summary.feedingDetail,
      },
      {
        icon: '/assets/icons/sleep.svg',
        iconBg: '#DBEAFE',
        value: summary.sleepHours,
        unit: 'h',
        label: '睡眠',
        detail: summary.sleepDuration,
      },
      {
        icon: '/assets/icons/baby.svg',
        iconBg: '#D1FAE5',
        value: summary.diaperCount,
        unit: '次',
        label: '排便',
        detail: summary.diaperDetail,
      },
      {
        icon: '/assets/icons/thermometer.svg',
        iconBg: summary.temperatureLevel === 'normal' ? '#FEF3C7' : '#FEE2E2',
        value: summary.temperature,
        unit: '℃',
        label: '体温',
        detail: summary.temperatureLevel === 'normal' ? '正常' :
                summary.temperatureLevel === 'mild_fever' ? '低烧' :
                summary.temperatureLevel === 'moderate_fever' ? '中烧' :
                summary.temperatureLevel === 'high_fever' ? '高烧' :
                summary.temperatureLevel === 'low' ? '偏低' : '--',
        alert: summary.temperatureLevel === 'moderate_fever' || summary.temperatureLevel === 'high_fever',
      },
    ];

    this.setData({
      summaryItems,
      hasAlert: summary.hasAlert,
    });
  },

  /**
   * 获取空状态的摘要项
   */
  getEmptySummaryItems(): any[] {
    return [
      { icon: '/assets/icons/bottle.svg', iconBg: '#EDE9FE', value: 0, unit: '次', label: '喂养', detail: '暂无记录' },
      { icon: '/assets/icons/sleep.svg', iconBg: '#DBEAFE', value: 0, unit: 'h', label: '睡眠', detail: '暂无记录' },
      { icon: '/assets/icons/baby.svg', iconBg: '#D1FAE5', value: 0, unit: '次', label: '排便', detail: '暂无记录' },
      { icon: '/assets/icons/thermometer.svg', iconBg: '#FEF3C7', value: '--', unit: '℃', label: '体温', detail: '--' },
    ];
  },

  /**
   * 加载今日时间线
   */
  loadTimeline() {
    const baby = babyService.getCurrentBaby();
    if (!baby) {
      this.setData({ timelineEvents: [] });
      return;
    }

    const events = statisticsService.getTodayTimeline(baby.id);

    // 为 daily-timeline 组件格式化数据
    const timelineEvents = events.map(evt => ({
      ...evt,
      type: evt.type,
      timeText: formatTime(evt.time),
      typeName: evt.title,
      summary: evt.description,
    }));

    this.setData({ timelineEvents });
  },

  // ============ 快捷操作 ============

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

  goToBabyProfile() {
    wx.switchTab({ url: '/pages/settings/index' });
  },

  // ============ 时间线事件点击 ============

  onTimelineEventTap(e: WechatMiniprogram.CustomEvent) {
    const { event } = e.detail;
    if (!event) return;

    const routeMap: Record<string, string> = {
      feeding: '/pages/feeding/index',
      sleep: '/pages/sleep/index',
      diaper: '/pages/diaper/index',
      health: '/pages/health/index',
    };

    const url = routeMap[event.type];
    if (url) {
      wx.navigateTo({ url });
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

// pages/home/index.ts
// 首页仪表盘

Page({
  data: {
    babyInfo: null as WechatMiniprogram.IAnyObject | null,
    todaySummary: {
      feedingCount: 0,
      feedingAmount: 0,
      sleepDuration: 0,
      diaperCount: 0,
      lastTemperature: '--',
    },
    timeline: [] as WechatMiniprogram.IAnyObject[],
  },

  onLoad() {
    // 页面加载
  },

  onShow() {
    this.loadBabyInfo();
    this.loadTodaySummary();
    this.loadTimeline();
  },

  /**
   * 加载宝宝基本信息
   */
  loadBabyInfo() {
    // TODO: 从 StorageService 加载
  },

  /**
   * 加载今日养护数据摘要
   */
  loadTodaySummary() {
    // TODO: 从 StatisticsService 加载
  },

  /**
   * 加载今日时间线
   */
  loadTimeline() {
    // TODO: 聚合今日所有记录并按时间排序
  },

  /**
   * 快捷操作：跳转喂养记录
   */
  goToFeeding() {
    wx.navigateTo({ url: '/pages/feeding/add/index' });
  },

  /**
   * 快捷操作：跳转睡眠记录
   */
  goToSleep() {
    wx.navigateTo({ url: '/pages/sleep/add/index' });
  },

  /**
   * 快捷操作：跳转排便记录
   */
  goToDiaper() {
    wx.navigateTo({ url: '/pages/diaper/add/index' });
  },

  /**
   * 快捷操作：跳转体温记录
   */
  goToHealth() {
    wx.navigateTo({ url: '/pages/health/add/index' });
  },

  onPullDownRefresh() {
    this.loadTodaySummary();
    this.loadTimeline();
    wx.stopPullDownRefresh();
  },
});

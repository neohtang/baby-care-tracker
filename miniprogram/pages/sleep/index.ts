// pages/sleep/index.ts
// 睡眠记录页

Page({
  data: {
    records: [] as WechatMiniprogram.IAnyObject[],
    todayStats: {
      totalDuration: 0,
      napDuration: 0,
      nightDuration: 0,
      napCount: 0,
    },
    isSleeping: false,
  },

  onLoad() {},
  onShow() { this.loadRecords(); },

  loadRecords() {
    // TODO: 从 SleepService 加载记录
  },

  toggleSleep() {
    if (this.data.isSleeping) {
      // 结束睡眠
      this.setData({ isSleeping: false });
      // TODO: 保存睡眠记录
      wx.showToast({ title: '睡眠已记录', icon: 'success' });
    } else {
      // 开始睡眠
      this.setData({ isSleeping: true });
    }
  },

  goToAdd() {
    wx.navigateTo({ url: '/pages/sleep/add/index' });
  },

  onPullDownRefresh() {
    this.loadRecords();
    wx.stopPullDownRefresh();
  },
});

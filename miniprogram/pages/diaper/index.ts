// pages/diaper/index.ts
// 排便记录页
Page({
  data: {
    records: [] as WechatMiniprogram.IAnyObject[],
    todayStats: { peeCount: 0, poopCount: 0, totalCount: 0 },
  },
  onLoad() {},
  onShow() { this.loadRecords(); },
  loadRecords() { /* TODO: 从 DiaperService 加载 */ },
  goToAdd() { wx.navigateTo({ url: '/pages/diaper/add/index' }); },
  onPullDownRefresh() { this.loadRecords(); wx.stopPullDownRefresh(); },
});

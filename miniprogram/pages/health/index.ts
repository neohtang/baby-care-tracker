// pages/health/index.ts
// 体温/健康监测页
Page({
  data: {
    records: [] as WechatMiniprogram.IAnyObject[],
    latestTemp: '--' as string,
    tempStatus: 'normal' as 'normal' | 'fever' | 'high',
  },
  onLoad() {},
  onShow() { this.loadRecords(); },
  loadRecords() { /* TODO */ },
  goToAdd() { wx.navigateTo({ url: '/pages/health/add/index' }); },
  onPullDownRefresh() { this.loadRecords(); wx.stopPullDownRefresh(); },
});

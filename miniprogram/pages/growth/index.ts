// pages/growth/index.ts
// 生长发育记录页
Page({
  data: {
    records: [] as WechatMiniprogram.IAnyObject[],
    latest: { weight: '--', height: '--', headCircumference: '--', date: '' },
    chartType: 'weight' as 'weight' | 'height' | 'head',
    showAddPanel: false,
    newRecord: { weight: '', height: '', headCircumference: '' },
  },
  onLoad() {},
  onShow() { this.loadRecords(); },
  loadRecords() { /* TODO: 从 GrowthService 加载 */ },
  onChartTypeChange(e: WechatMiniprogram.CustomEvent) { this.setData({ chartType: e.detail.value }); },
  toggleAddPanel() { this.setData({ showAddPanel: !this.data.showAddPanel }); },
  onWeightChange(e: WechatMiniprogram.CustomEvent) { this.setData({ 'newRecord.weight': e.detail.value }); },
  onHeightChange(e: WechatMiniprogram.CustomEvent) { this.setData({ 'newRecord.height': e.detail.value }); },
  onHeadChange(e: WechatMiniprogram.CustomEvent) { this.setData({ 'newRecord.headCircumference': e.detail.value }); },
  onSave() {
    wx.showToast({ title: '保存成功', icon: 'success' });
    this.setData({ showAddPanel: false });
    this.loadRecords();
  },
  onPullDownRefresh() { this.loadRecords(); wx.stopPullDownRefresh(); },
});

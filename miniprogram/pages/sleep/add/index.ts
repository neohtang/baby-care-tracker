// pages/sleep/add/index.ts
Page({
  data: { startTime: '', endTime: '', type: 'nap' as 'nap' | 'night', note: '' },
  onLoad() {},
  onTypeChange(e: WechatMiniprogram.CustomEvent) { this.setData({ type: e.detail.value }); },
  onStartTimeChange(e: WechatMiniprogram.CustomEvent) { this.setData({ startTime: e.detail.value }); },
  onEndTimeChange(e: WechatMiniprogram.CustomEvent) { this.setData({ endTime: e.detail.value }); },
  onNoteChange(e: WechatMiniprogram.CustomEvent) { this.setData({ note: e.detail.value }); },
  onSave() {
    // TODO: 校验并保存
    wx.showToast({ title: '保存成功', icon: 'success' });
    wx.navigateBack();
  },
});

// pages/health/add/index.ts
Page({
  data: {
    temperature: 36.5,
    method: 'axillary' as 'axillary' | 'forehead' | 'ear',
    symptoms: '' as string,
    medication: '' as string,
    note: '',
    methodOptions: [
      { label: '腋温', value: 'axillary' },
      { label: '额温', value: 'forehead' },
      { label: '耳温', value: 'ear' },
    ],
  },
  onLoad() {},
  onTempChange(e: WechatMiniprogram.CustomEvent) { this.setData({ temperature: e.detail.value }); },
  onMethodChange(e: WechatMiniprogram.CustomEvent) { this.setData({ method: e.detail.value }); },
  onSymptomsChange(e: WechatMiniprogram.CustomEvent) { this.setData({ symptoms: e.detail.value }); },
  onMedicationChange(e: WechatMiniprogram.CustomEvent) { this.setData({ medication: e.detail.value }); },
  onNoteChange(e: WechatMiniprogram.CustomEvent) { this.setData({ note: e.detail.value }); },
  onSave() {
    wx.showToast({ title: '保存成功', icon: 'success' });
    wx.navigateBack();
  },
});

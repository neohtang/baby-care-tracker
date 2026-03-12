// pages/diaper/add/index.ts
Page({
  data: {
    type: 'pee' as 'pee' | 'poop' | 'both',
    color: '' as string,
    texture: '' as string,
    isAbnormal: false,
    note: '',
    colorOptions: ['黄色', '绿色', '棕色', '黑色', '红色', '白色'],
    textureOptions: ['稀水样', '糊状', '软便', '成形', '硬便', '颗粒状'],
  },
  onLoad() {},
  onTypeChange(e: WechatMiniprogram.CustomEvent) { this.setData({ type: e.detail.value }); },
  onColorChange(e: WechatMiniprogram.CustomEvent) { this.setData({ color: e.detail.value }); },
  onTextureChange(e: WechatMiniprogram.CustomEvent) { this.setData({ texture: e.detail.value }); },
  onAbnormalChange(e: WechatMiniprogram.CustomEvent) { this.setData({ isAbnormal: e.detail.value }); },
  onNoteChange(e: WechatMiniprogram.CustomEvent) { this.setData({ note: e.detail.value }); },
  onSave() {
    wx.showToast({ title: '保存成功', icon: 'success' });
    wx.navigateBack();
  },
});

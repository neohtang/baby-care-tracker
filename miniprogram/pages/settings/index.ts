// pages/settings/index.ts
// 设置页
Page({
  data: {
    babyInfo: null as WechatMiniprogram.IAnyObject | null,
    version: '1.0.0',
  },
  onLoad() {},
  onShow() { this.loadBabyInfo(); },
  loadBabyInfo() { /* TODO: 从 BabyService 加载 */ },
  editBabyInfo() {
    // TODO: 跳转到宝宝信息编辑页或弹出编辑表单
  },
  exportData() {
    // TODO: 调用 DataExportService 导出所有数据为 JSON
    wx.showToast({ title: '导出成功', icon: 'success' });
  },
  importData() {
    // TODO: 从文件恢复数据
  },
  showDisclaimer() {
    wx.showModal({
      title: '免责声明',
      content: '本小程序仅供日常养护记录参考，不构成任何医疗建议。如有健康问题请及时就医，遵从专业医生指导。',
      showCancel: false,
    });
  },
});

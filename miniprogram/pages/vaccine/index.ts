// pages/vaccine/index.ts
// 疫苗接种记录页
Page({
  data: {
    activeTab: 0,
    vaccineList: [] as WechatMiniprogram.IAnyObject[],
    milestoneList: [] as WechatMiniprogram.IAnyObject[],
  },
  onLoad() { this.loadVaccines(); this.loadMilestones(); },
  onShow() {},
  onTabChange(e: WechatMiniprogram.CustomEvent) { this.setData({ activeTab: e.detail.value }); },
  loadVaccines() { /* TODO: 加载疫苗清单和接种记录 */ },
  loadMilestones() { /* TODO: 加载发育里程碑 */ },
  onVaccineRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.currentTarget.dataset;
    // TODO: 弹出接种记录表单
    console.log('记录疫苗:', id);
  },
  onMilestoneRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.currentTarget.dataset;
    // TODO: 弹出里程碑达成记录
    console.log('记录里程碑:', id);
  },
});

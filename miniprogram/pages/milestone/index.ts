// pages/milestone/index.ts
// 里程碑独立页面（从疫苗页跳转的详细视图）
Page({
  data: { milestones: [] as WechatMiniprogram.IAnyObject[] },
  onLoad() { this.loadMilestones(); },
  loadMilestones() { /* TODO */ },
  onRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.currentTarget.dataset;
    console.log('记录里程碑:', id);
  },
});

// pages/feeding/index.ts
// 喂养记录页

Page({
  data: {
    activeTab: 0,
    records: [] as WechatMiniprogram.IAnyObject[],
    todayStats: {
      totalCount: 0,
      totalAmount: 0,
      totalDuration: 0,
    },
  },

  onLoad() {},

  onShow() {
    this.loadRecords();
  },

  onTabChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ activeTab: e.detail.value });
    this.loadRecords();
  },

  loadRecords() {
    // TODO: 从 FeedingService 加载记录
  },

  goToAdd() {
    wx.navigateTo({ url: '/pages/feeding/add/index' });
  },

  onDelete(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条喂养记录吗？',
      success: (res) => {
        if (res.confirm) {
          // TODO: 调用 FeedingService.delete(id)
          console.log('删除记录:', id);
          this.loadRecords();
        }
      },
    });
  },

  onPullDownRefresh() {
    this.loadRecords();
    wx.stopPullDownRefresh();
  },
});

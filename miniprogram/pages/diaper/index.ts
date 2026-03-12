// pages/diaper/index.ts
// 排便记录页——完整实现

import { diaperService } from '../../services/diaper';
import { babyService } from '../../services/baby';
import eventBus, { Events } from '../../utils/event-bus';

Page({
  data: {
    records: [] as any[],
    todayStats: {
      totalCount: 0,
      peeCount: 0,
      poopCount: 0,
      hasAlert: false,
    },
    hasBaby: false,
    isEmpty: true,
  },

  _unsubscribers: [] as (() => void)[],

  onLoad() {
    this._unsubscribers.push(
      eventBus.on(Events.DIAPER_CHANGED, () => this.loadData()),
      eventBus.on(Events.BABY_SWITCHED, () => this.loadData()),
      eventBus.on(Events.DATA_RESTORED, () => this.loadData()),
    );
  },

  onShow() {
    this.loadData();
  },

  onUnload() {
    this._unsubscribers.forEach(fn => fn());
  },

  loadData() {
    const baby = babyService.getCurrentBaby();
    if (!baby) {
      this.setData({ hasBaby: false, records: [], isEmpty: true });
      return;
    }

    const summary = diaperService.getTodaySummary();
    const records = diaperService.getTodayRecords();
    const displayRecords = diaperService.formatRecordsForDisplay(records);

    this.setData({
      hasBaby: true,
      todayStats: {
        totalCount: summary.totalCount,
        peeCount: summary.peeCount,
        poopCount: summary.poopCount,
        hasAlert: summary.hasAlert,
      },
      records: displayRecords,
      isEmpty: displayRecords.length === 0,
    });
  },

  /** 快捷记录小便 */
  quickPee() {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }
    const result = diaperService.addRecord({
      babyId,
      time: new Date().toISOString(),
      type: 'pee',
    });
    if (result) {
      wx.showToast({ title: '小便已记录', icon: 'success' });
    }
  },

  /** 快捷记录大便 */
  quickPoop() {
    // 大便需要选择颜色/质地，跳转到添加页
    this.goToAdd('poop');
  },

  goToAdd(type?: string) {
    if (!this.data.hasBaby) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }
    const url = type
      ? `/pages/diaper/add/index?type=${type}`
      : '/pages/diaper/add/index';
    wx.navigateTo({ url });
  },

  onEditRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.detail;
    wx.navigateTo({ url: `/pages/diaper/add/index?id=${id}` });
  },

  onDeleteRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.detail;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条排便记录吗？',
      confirmColor: '#F87171',
      success: (res) => {
        if (res.confirm) {
          diaperService.removeRecord(id);
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      },
    });
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  },
});

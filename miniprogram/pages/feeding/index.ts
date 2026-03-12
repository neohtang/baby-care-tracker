// pages/feeding/index.ts
// 喂养记录页 — 完整实现

import { feedingService } from '../../services/feeding';
import { babyService } from '../../services/baby';
import eventBus, { Events } from '../../utils/event-bus';
import type { FeedingType } from '../../types/index';

const TABS = [
  { label: '全部', value: 'all' },
  { label: '母乳', value: 'breast' },
  { label: '配方奶', value: 'formula' },
  { label: '辅食', value: 'solid' },
];

Page({
  data: {
    tabs: TABS,
    activeTab: 'all',
    records: [] as any[],
    todayStats: {
      totalCount: 0,
      breastCount: 0,
      formulaCount: 0,
      solidCount: 0,
      totalFormulaAmount: 0,
      totalBreastDuration: 0,
    },
    hasBaby: false,
    isEmpty: true,
  },

  _unsubscribers: [] as (() => void)[],

  onLoad() {
    this._unsubscribers.push(
      eventBus.on(Events.FEEDING_CHANGED, () => this.loadData()),
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

    const summary = feedingService.getTodaySummary();
    const tab = this.data.activeTab;
    let records;

    if (tab === 'all') {
      records = feedingService.getTodayRecords();
    } else {
      records = feedingService.getTodayRecordsByType(tab as FeedingType);
    }

    const displayRecords = feedingService.formatRecordsForDisplay(records);

    this.setData({
      hasBaby: true,
      todayStats: {
        totalCount: summary.totalCount,
        breastCount: summary.breastCount,
        formulaCount: summary.formulaCount,
        solidCount: summary.solidCount,
        totalFormulaAmount: summary.totalFormulaAmount,
        totalBreastDuration: summary.totalBreastDuration,
      },
      records: displayRecords,
      isEmpty: displayRecords.length === 0,
    });
  },

  onTabChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.detail.value || e.detail;
    this.setData({ activeTab: value });
    this.loadData();
  },

  goToAdd() {
    if (!this.data.hasBaby) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/feeding/add/index' });
  },

  onEditRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.detail;
    wx.navigateTo({ url: `/pages/feeding/add/index?id=${id}` });
  },

  onDeleteRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.detail;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条喂养记录吗？',
      confirmColor: '#F87171',
      success: (res) => {
        if (res.confirm) {
          feedingService.removeRecord(id);
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

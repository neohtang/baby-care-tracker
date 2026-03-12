// pages/health/index.ts
// 体温/健康监测页——完整实现

import { healthService } from '../../services/health';
import { babyService } from '../../services/baby';
import eventBus, { Events } from '../../utils/event-bus';
import type { HealthRecordType } from '../../types/index';

const TABS = [
  { label: '全部', value: 'all' },
  { label: '体温', value: 'temperature' },
  { label: '用药', value: 'medication' },
  { label: '症状', value: 'symptom' },
];

Page({
  data: {
    tabs: TABS,
    activeTab: 'all',
    records: [] as any[],
    latestTemp: '--',
    latestTempLevel: 'normal',
    latestTempColor: '#34D399',
    latestTempLevelText: '',
    latestTempTime: '',
    tempHistory: [] as any[],
    hasBaby: false,
    isEmpty: true,
  },

  _unsubscribers: [] as (() => void)[],

  onLoad() {
    this._unsubscribers.push(
      eventBus.on(Events.HEALTH_CHANGED, () => this.loadData()),
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

    // 最新体温
    const latestTemp = healthService.getLatestTemperature();
    let tempData: any = {
      latestTemp: '--',
      latestTempLevel: 'normal',
      latestTempColor: '#34D399',
      latestTempLevelText: '',
      latestTempTime: '',
    };

    if (latestTemp && latestTemp.temperature) {
      const level = healthService.getTemperatureLevel(latestTemp.temperature);
      tempData = {
        latestTemp: latestTemp.temperature.toFixed(1),
        latestTempLevel: level,
        latestTempColor: healthService.getLevelColor(level),
        latestTempLevelText: healthService.getLevelText(level),
        latestTempTime: latestTemp.time,
      };
    }

    // 体温趋势
    const tempHistory = healthService.getRecentTemperatures(8);

    // 记录列表
    const tab = this.data.activeTab;
    let records;
    if (tab === 'all') {
      records = healthService.getTodayRecords();
    } else {
      records = healthService.getRecordsByType(tab as HealthRecordType)
        .filter(r => r.time.substring(0, 10) === new Date().toISOString().substring(0, 10));
    }

    const displayRecords = healthService.formatRecordsForDisplay(records);

    this.setData({
      hasBaby: true,
      ...tempData,
      tempHistory,
      records: displayRecords,
      isEmpty: displayRecords.length === 0,
    });
  },

  onTabChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.currentTarget.dataset.value;
    this.setData({ activeTab: value });
    this.loadData();
  },

  goToAdd(e?: WechatMiniprogram.CustomEvent) {
    if (!this.data.hasBaby) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }
    const type = e?.currentTarget?.dataset?.type || '';
    const url = type
      ? `/pages/health/add/index?type=${type}`
      : '/pages/health/add/index';
    wx.navigateTo({ url });
  },

  onEditRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.detail;
    wx.navigateTo({ url: `/pages/health/add/index?id=${id}` });
  },

  onDeleteRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.detail;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条健康记录吗？',
      confirmColor: '#F87171',
      success: (res) => {
        if (res.confirm) {
          healthService.removeRecord(id);
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

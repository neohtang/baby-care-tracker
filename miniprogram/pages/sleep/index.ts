// pages/sleep/index.ts
// 睡眠记录页——完整实现

import { sleepService } from '../../services/sleep';
import { babyService } from '../../services/baby';
import { formatDuration } from '../../utils/date';
import eventBus, { Events } from '../../utils/event-bus';

Page({
  data: {
    records: [] as any[],
    todayStats: {
      totalDuration: 0,
      napDuration: 0,
      nightDuration: 0,
      napCount: 0,
      totalDurationText: '0',
      napDurationText: '0',
      nightDurationText: '0',
    },
    isSleeping: false,
    sleepDurationText: '',
    hasBaby: false,
    isEmpty: true,
  },

  _unsubscribers: [] as (() => void)[],
  _durationTimer: null as number | null,

  onLoad() {
    this._unsubscribers.push(
      eventBus.on(Events.SLEEP_CHANGED, () => this.loadData()),
      eventBus.on(Events.BABY_SWITCHED, () => this.loadData()),
      eventBus.on(Events.DATA_RESTORED, () => this.loadData()),
    );
  },

  onShow() {
    this.loadData();
    this.updateSleepDuration();
  },

  onHide() {
    this.clearDurationTimer();
  },

  onUnload() {
    this._unsubscribers.forEach(fn => fn());
    this.clearDurationTimer();
  },

  loadData() {
    const baby = babyService.getCurrentBaby();
    if (!baby) {
      this.setData({ hasBaby: false, records: [], isEmpty: true });
      return;
    }

    const summary = sleepService.getTodaySummary();
    const records = sleepService.getTodayRecords();
    const displayRecords = sleepService.formatRecordsForDisplay(records);
    const isSleeping = sleepService.isSleeping();

    this.setData({
      hasBaby: true,
      todayStats: {
        totalDuration: summary.totalDuration,
        napDuration: summary.napDuration,
        nightDuration: summary.nightDuration,
        napCount: summary.napCount,
        totalDurationText: (summary.totalDuration / 60).toFixed(1),
        napDurationText: (summary.napDuration / 60).toFixed(1),
        nightDurationText: (summary.nightDuration / 60).toFixed(1),
      },
      records: displayRecords,
      isEmpty: displayRecords.length === 0 && !isSleeping,
      isSleeping,
    });

    if (isSleeping) {
      this.startDurationTimer();
    }
  },

  /**
   * 一键开始/结束睡眠
   */
  toggleSleep() {
    if (!this.data.hasBaby) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }

    if (this.data.isSleeping) {
      // 结束睡眠
      const record = sleepService.endSleep();
      if (record) {
        wx.showToast({ title: '睡眠已记录', icon: 'success' });
        this.clearDurationTimer();
      }
    } else {
      // 开始睡眠
      const state = sleepService.startSleep();
      if (state) {
        this.setData({ isSleeping: true });
        this.startDurationTimer();
        wx.showToast({ title: '睡眠开始计时', icon: 'none' });
      }
    }
  },

  /**
   * 更新睡眠时长显示
   */
  updateSleepDuration() {
    if (!sleepService.isSleeping()) {
      this.setData({ sleepDurationText: '' });
      return;
    }
    const minutes = sleepService.getActiveSleepDuration();
    this.setData({ sleepDurationText: formatDuration(minutes) });
  },

  startDurationTimer() {
    this.clearDurationTimer();
    this.updateSleepDuration();
    this._durationTimer = setInterval(() => {
      this.updateSleepDuration();
    }, 60000) as unknown as number; // 每分钟更新
  },

  clearDurationTimer() {
    if (this._durationTimer) {
      clearInterval(this._durationTimer);
      this._durationTimer = null;
    }
  },

  goToAdd() {
    if (!this.data.hasBaby) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/sleep/add/index' });
  },

  onDeleteRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.detail;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条睡眠记录吗？',
      confirmColor: '#F87171',
      success: (res) => {
        if (res.confirm) {
          sleepService.removeRecord(id);
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

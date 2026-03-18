// pages/daily/index.ts
// 日常记录合并页 — 喂养/睡眠/排便三合一 (Tender Bloom 主题)

import { feedingService } from '../../services/feeding';
import { sleepService } from '../../services/sleep';
import { diaperService } from '../../services/diaper';
import { babyService } from '../../services/baby';
import { reminderService } from '../../services/reminder';
import { store } from '../../store/index';
import { formatDuration } from '../../utils/date';
import eventBus, { Events } from '../../utils/event-bus';
import type { FeedingType } from '../../types/index';

const FEEDING_TABS = [
  { label: '全部', value: 'all' },
  { label: '母乳', value: 'breast' },
  { label: '配方奶', value: 'formula' },
  { label: '辅食', value: 'solid' },
];

Page({
  data: {
    // 主 Tab
    activeMainTab: 0,

    // 宝宝状态
    hasBaby: false,

    // ===== 喂养模块 =====
    feedingTabs: FEEDING_TABS,
    feedingActiveTab: 'all',
    feedingRecords: [] as any[],
    feedingStats: {
      totalCount: 0,
      breastCount: 0,
      formulaCount: 0,
      solidCount: 0,
      totalFormulaAmount: 0,
      totalBreastDuration: 0,
    },
    feedingEmpty: true,

    // ===== 睡眠模块 =====
    sleepRecords: [] as any[],
    sleepStats: {
      totalDurationText: '0',
      napDurationText: '0',
      nightDurationText: '0',
      napCount: 0,
    },
    isSleeping: false,
    sleepDurationText: '',
    sleepEmpty: true,

    // ===== 排便模块 =====
    diaperRecords: [] as any[],
    diaperStats: {
      totalCount: 0,
      peeCount: 0,
      poopCount: 0,
      hasAlert: false,
    },
    diaperEmpty: true,

    // 懒加载标记
    _feedingLoaded: true, // 首次Tab默认加载
    _sleepLoaded: false,
    _diaperLoaded: false,

    // ===== 喂养提醒横幅 =====
    feedingReminder: null as any,
    showFeedingReminder: false,

    // ===== 主题 =====
    pageStyle: '',
  },

  _unsubscribers: [] as (() => void)[],
  _durationTimer: null as number | null,
  _reminderTimer: null as number | null,
  _storeDisconnect: null as (() => void) | null,

  onLoad() {
    // Store 自动推送 pageStyle（替代 THEME_CHANGED 订阅）
    this._storeDisconnect = store.connect(this as any, {
      pageStyle: true,
    });

    // 保留页面级细粒度 EventBus 订阅
    this._unsubscribers.push(
      eventBus.on(Events.FEEDING_CHANGED, () => {
        this.loadFeedingData();
        this.loadFeedingReminder();
      }),
      eventBus.on(Events.SLEEP_CHANGED, () => this.loadSleepData()),
      eventBus.on(Events.DIAPER_CHANGED, () => this.loadDiaperData()),
      eventBus.on(Events.BABY_SWITCHED, () => this.refreshAll()),
      eventBus.on(Events.DATA_RESTORED, () => this.refreshAll()),
      eventBus.on(Events.REMINDER_SETTINGS_CHANGED, () => this.loadFeedingReminder()),
    );
  },

  onShow() {
    this.checkBaby();
    this.loadCurrentTabData();
    this.loadFeedingReminder();
    this.startReminderTimer();
    if (this.data.isSleeping || sleepService.isSleeping()) {
      this.startDurationTimer();
    }
  },

  onHide() {
    this.clearDurationTimer();
    this.clearReminderTimer();
  },

  onUnload() {
    this._unsubscribers.forEach((fn) => fn());
    this._unsubscribers = [];
    if (this._storeDisconnect) {
      this._storeDisconnect();
      this._storeDisconnect = null;
    }
    this.clearDurationTimer();
    this.clearReminderTimer();
  },

  // ============ 通用方法 ============

  checkBaby() {
    const baby = babyService.getCurrentBaby();
    this.setData({ hasBaby: !!baby });
  },

  refreshAll() {
    this.checkBaby();
    // 重置懒加载标记
    this.setData({ _feedingLoaded: false, _sleepLoaded: false, _diaperLoaded: false });
    this.loadCurrentTabData();
  },

  loadCurrentTabData() {
    const tab = Number(this.data.activeMainTab);
    if (tab === 0) this.loadFeedingData();
    else if (tab === 1) this.loadSleepData();
    else if (tab === 2) this.loadDiaperData();
  },

  onMainTabChange(e: WechatMiniprogram.CustomEvent) {
    const raw = typeof e.detail === 'object' ? e.detail.value : e.detail;
    const value = Number(raw);
    this.setData({ activeMainTab: value });

    if (value === 0) this.loadFeedingData();
    else if (value === 1) this.loadSleepData();
    else if (value === 2) this.loadDiaperData();

    // 切换到睡眠Tab时启动定时器
    if (value === 1 && this.data.isSleeping) {
      this.startDurationTimer();
    } else if (value !== 1) {
      this.clearDurationTimer();
    }
  },

  // ============ 喂养模块 ============

  loadFeedingData() {
    const baby = babyService.getCurrentBaby();
    if (!baby) {
      this.setData({ feedingRecords: [], feedingEmpty: true });
      return;
    }
    const summary = feedingService.getTodaySummary();
    const tab = this.data.feedingActiveTab;
    let records;
    if (tab === 'all') {
      records = feedingService.getTodayRecords();
    } else {
      records = feedingService.getTodayRecordsByType(tab as FeedingType);
    }
    const displayRecords = feedingService.formatRecordsForDisplay(records);
    this.setData({
      _feedingLoaded: true,
      feedingStats: {
        totalCount: summary.totalCount,
        breastCount: summary.breastCount,
        formulaCount: summary.formulaCount,
        solidCount: summary.solidCount,
        totalFormulaAmount: summary.totalFormulaAmount,
        totalBreastDuration: summary.totalBreastDuration,
      },
      feedingRecords: displayRecords,
      feedingEmpty: displayRecords.length === 0,
    });
  },

  onFeedingTabChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.currentTarget.dataset.value;
    this.setData({ feedingActiveTab: value });
    this.loadFeedingData();
  },

  goToAddFeeding() {
    if (!this.data.hasBaby) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/feeding/add/index' });
  },

  onEditFeedingRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.detail;
    wx.navigateTo({ url: `/pages/feeding/add/index?id=${id}` });
  },

  onDeleteFeedingRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.detail;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条喂养记录吗？',
      confirmColor: '#E8736C',
      success: (res) => {
        if (res.confirm) {
          feedingService.removeRecord(id);
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      },
    });
  },

  // ============ 睡眠模块 ============

  loadSleepData() {
    const baby = babyService.getCurrentBaby();
    if (!baby) {
      this.setData({ sleepRecords: [], sleepEmpty: true });
      return;
    }
    const summary = sleepService.getTodaySummary();
    const records = sleepService.getTodayRecords();
    const displayRecords = sleepService.formatRecordsForDisplay(records);
    const isSleeping = sleepService.isSleeping();
    this.setData({
      _sleepLoaded: true,
      sleepStats: {
        totalDurationText: (summary.totalDuration / 60).toFixed(1),
        napDurationText: (summary.napDuration / 60).toFixed(1),
        nightDurationText: (summary.nightDuration / 60).toFixed(1),
        napCount: summary.napCount,
      },
      sleepRecords: displayRecords,
      sleepEmpty: displayRecords.length === 0 && !isSleeping,
      isSleeping,
    });
    if (isSleeping) {
      this.updateSleepDuration();
      this.startDurationTimer();
    }
  },

  toggleSleep() {
    if (!this.data.hasBaby) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }
    if (this.data.isSleeping) {
      const record = sleepService.endSleep();
      if (record) {
        wx.showToast({ title: '睡眠已记录', icon: 'success' });
        this.clearDurationTimer();
      }
    } else {
      const state = sleepService.startSleep();
      if (state) {
        this.setData({ isSleeping: true });
        this.startDurationTimer();
        wx.showToast({ title: '睡眠开始计时', icon: 'none' });
      }
    }
  },

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
    }, 60000) as unknown as number;
  },

  clearDurationTimer() {
    if (this._durationTimer) {
      clearInterval(this._durationTimer);
      this._durationTimer = null;
    }
  },

  goToAddSleep() {
    if (!this.data.hasBaby) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/sleep/add/index' });
  },

  onDeleteSleepRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.detail;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条睡眠记录吗？',
      confirmColor: '#E8736C',
      success: (res) => {
        if (res.confirm) {
          sleepService.removeRecord(id);
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      },
    });
  },

  // ============ 排便模块 ============

  loadDiaperData() {
    const baby = babyService.getCurrentBaby();
    if (!baby) {
      this.setData({ diaperRecords: [], diaperEmpty: true });
      return;
    }
    const summary = diaperService.getTodaySummary();
    const records = diaperService.getTodayRecords();
    const displayRecords = diaperService.formatRecordsForDisplay(records);
    this.setData({
      _diaperLoaded: true,
      diaperStats: {
        totalCount: summary.totalCount,
        peeCount: summary.peeCount,
        poopCount: summary.poopCount,
        hasAlert: summary.hasAlert,
      },
      diaperRecords: displayRecords,
      diaperEmpty: displayRecords.length === 0,
    });
  },

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

  quickPoop() {
    this.goToAddDiaper('poop');
  },

  goToAddDiaper(type?: string | WechatMiniprogram.TouchEvent) {
    if (!this.data.hasBaby) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }
    const typeStr = typeof type === 'string' ? type : '';
    const url = typeStr ? `/pages/diaper/add/index?type=${typeStr}` : '/pages/diaper/add/index';
    wx.navigateTo({ url });
  },

  onEditDiaperRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.detail;
    wx.navigateTo({ url: `/pages/diaper/add/index?id=${id}` });
  },

  onDeleteDiaperRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.detail;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条排便记录吗？',
      confirmColor: '#E8736C',
      success: (res) => {
        if (res.confirm) {
          diaperService.removeRecord(id);
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      },
    });
  },

  // ============ 喂养提醒横幅 ============

  loadFeedingReminder() {
    try {
      const status = reminderService.getFeedingReminderStatus();
      if (status && status.hasReminder) {
        this.setData({
          feedingReminder: status,
          showFeedingReminder: true,
        });
      } else {
        this.setData({ feedingReminder: null, showFeedingReminder: false });
      }
    } catch (e) {
      console.error('[Daily] 加载喂养提醒失败:', e);
    }
  },

  startReminderTimer() {
    this.clearReminderTimer();
    // 每分钟刷新一次提醒状态
    this._reminderTimer = setInterval(() => {
      this.loadFeedingReminder();
    }, 60000) as unknown as number;
  },

  clearReminderTimer() {
    if (this._reminderTimer) {
      clearInterval(this._reminderTimer);
      this._reminderTimer = null;
    }
  },

  onReminderTap() {
    this.goToAddFeeding();
  },

  // ============ 下拉刷新 ============

  onPullDownRefresh() {
    this.loadCurrentTabData();
    wx.stopPullDownRefresh();
  },
});

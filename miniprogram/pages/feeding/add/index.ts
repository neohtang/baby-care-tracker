// pages/feeding/add/index.ts
// 添加/编辑喂养记录——完整实现

import { feedingService } from '../../../services/feeding';
import { babyService } from '../../../services/baby';
import { getNowISO, formatDateTime } from '../../../utils/date';
import type { FeedingType, BreastSide } from '../../../types/index';

Page({
  data: {
    editMode: false,
    recordId: '',
    feedingType: 'breast' as FeedingType,
    side: 'left' as BreastSide,
    amount: 120,
    duration: 0,
    note: '',
    startTime: '',
    startTimeDisplay: '',
    formulaBrand: '',
    solidFood: '',
    // 计时器状态
    timerSeconds: 0,
    isTimerMode: false,
    // 快捷奶量按钮
    amountPresets: [60, 90, 120, 150, 180, 240],
  },

  onLoad(options: Record<string, string>) {
    const now = getNowISO();
    this.setData({
      startTime: now,
      startTimeDisplay: formatDateTime(now),
    });

    if (options.id) {
      this.setData({ editMode: true, recordId: options.id });
      this.loadRecord(options.id);
      wx.setNavigationBarTitle({ title: '编辑喂养记录' });
    }
  },

  loadRecord(id: string) {
    const record = feedingService.getRecordById(id);
    if (!record) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      wx.navigateBack();
      return;
    }

    this.setData({
      feedingType: record.type,
      side: record.side || 'left',
      amount: record.amount || 0,
      duration: record.duration || 0,
      note: record.note || '',
      startTime: record.startTime,
      startTimeDisplay: formatDateTime(record.startTime),
      formulaBrand: record.formulaBrand || '',
      solidFood: record.solidFood || '',
    });
  },

  onTypeChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.currentTarget.dataset.value as FeedingType;
    this.setData({ feedingType: value });
  },

  onSideChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.currentTarget.dataset.value as BreastSide;
    this.setData({ side: value });
  },

  onAmountInput(e: WechatMiniprogram.CustomEvent) {
    const value = parseInt(e.detail.value || '0', 10);
    this.setData({ amount: isNaN(value) ? 0 : value });
  },

  onAmountSlider(e: WechatMiniprogram.CustomEvent) {
    this.setData({ amount: e.detail.value });
  },

  onAmountPreset(e: WechatMiniprogram.CustomEvent) {
    const value = parseInt(e.currentTarget.dataset.value, 10);
    this.setData({ amount: value });
  },

  onDurationInput(e: WechatMiniprogram.CustomEvent) {
    const value = parseInt(e.detail.value || '0', 10);
    this.setData({ duration: isNaN(value) ? 0 : value });
  },

  onNoteChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ note: e.detail.value || '' });
  },

  onBrandChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ formulaBrand: e.detail.value || '' });
  },

  onFoodChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ solidFood: e.detail.value || '' });
  },

  onTimeChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.detail.value;
    if (value) {
      // DateTimePicker 返回的时间戳
      const date = new Date(value);
      const iso = date.toISOString();
      this.setData({
        startTime: iso,
        startTimeDisplay: formatDateTime(iso),
      });
    }
  },

  /** 计时器停止回调 */
  onTimerStop(e: WechatMiniprogram.CustomEvent) {
    const { seconds, minutes } = e.detail;
    this.setData({
      duration: Math.ceil(minutes),
      timerSeconds: seconds,
      isTimerMode: false,
    });
  },

  /** 切换计时器模式 */
  toggleTimerMode() {
    this.setData({ isTimerMode: !this.data.isTimerMode });
  },

  /**
   * 保存记录
   */
  onSave() {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }

    const { feedingType, side, amount, duration, note, startTime, formulaBrand, solidFood, editMode, recordId } = this.data;

    if (editMode) {
      const result = feedingService.updateRecord(recordId, {
        type: feedingType,
        side: feedingType === 'breast' ? side : undefined,
        amount: feedingType !== 'breast' ? amount : undefined,
        duration: feedingType === 'breast' ? duration : undefined,
        note: note || undefined,
        startTime,
        formulaBrand: feedingType === 'formula' ? formulaBrand : undefined,
        solidFood: feedingType === 'solid' ? solidFood : undefined,
      });
      if (result) {
        wx.showToast({ title: '更新成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 500);
      }
    } else {
      const result = feedingService.addRecord({
        babyId,
        type: feedingType,
        side: feedingType === 'breast' ? side : undefined,
        amount: feedingType !== 'breast' ? amount : undefined,
        duration: feedingType === 'breast' ? duration : undefined,
        note: note || undefined,
        startTime,
        formulaBrand: feedingType === 'formula' ? formulaBrand : undefined,
        solidFood: feedingType === 'solid' ? solidFood : undefined,
      });
      if (result) {
        wx.showToast({ title: '记录成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 500);
      }
    }
  },
});

// pages/sleep/add/index.ts
// 添加/编辑睡眠记录——完整实现

import { sleepService } from '../../../services/sleep';
import { babyService } from '../../../services/baby';
import { getNowISO, formatDateTime, diffInMinutes, formatDuration } from '../../../utils/date';
import dayjs from 'dayjs';
import type { SleepType } from '../../../types/index';

Page({
  data: {
    editMode: false,
    recordId: '',
    type: 'nap' as SleepType,
    startTime: '',
    endTime: '',
    startTimeDisplay: '',
    endTimeDisplay: '',
    duration: 0,
    durationText: '',
    note: '',
    quality: 3,
    // 时间选择器
    showStartPicker: false,
    showEndPicker: false,
  },

  onLoad(options: Record<string, string>) {
    const now = getNowISO();
    const oneHourAgo = dayjs().subtract(1, 'hour').toISOString();

    this.setData({
      startTime: oneHourAgo,
      startTimeDisplay: formatDateTime(oneHourAgo),
      endTime: now,
      endTimeDisplay: formatDateTime(now),
    });

    this.calcDuration();

    if (options.id) {
      this.setData({ editMode: true, recordId: options.id });
      this.loadRecord(options.id);
      wx.setNavigationBarTitle({ title: '编辑睡眠记录' });
    }
  },

  loadRecord(id: string) {
    const record = sleepService.getRecordById(id);
    if (!record) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      wx.navigateBack();
      return;
    }

    this.setData({
      type: record.type,
      startTime: record.startTime,
      startTimeDisplay: formatDateTime(record.startTime),
      endTime: record.endTime || '',
      endTimeDisplay: record.endTime ? formatDateTime(record.endTime) : '',
      note: record.note || '',
      quality: record.quality || 3,
    });
    this.calcDuration();
  },

  onTypeChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.currentTarget.dataset.value as SleepType;
    this.setData({ type: value });
  },

  onStartTimeTap() {
    this.setData({ showStartPicker: true });
  },

  onEndTimeTap() {
    this.setData({ showEndPicker: true });
  },

  onStartTimeConfirm(e: WechatMiniprogram.CustomEvent) {
    const value = e.detail.value;
    const date = new Date(value);
    const iso = date.toISOString();
    this.setData({
      startTime: iso,
      startTimeDisplay: formatDateTime(iso),
      showStartPicker: false,
    });
    this.calcDuration();
  },

  onEndTimeConfirm(e: WechatMiniprogram.CustomEvent) {
    const value = e.detail.value;
    const date = new Date(value);
    const iso = date.toISOString();
    this.setData({
      endTime: iso,
      endTimeDisplay: formatDateTime(iso),
      showEndPicker: false,
    });
    this.calcDuration();
  },

  onPickerCancel() {
    this.setData({ showStartPicker: false, showEndPicker: false });
  },

  calcDuration() {
    const { startTime, endTime } = this.data;
    if (startTime && endTime) {
      const minutes = diffInMinutes(startTime, endTime);
      this.setData({
        duration: minutes,
        durationText: formatDuration(minutes),
      });
    }
  },

  onQualityChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.currentTarget.dataset.value;
    this.setData({ quality: parseInt(value, 10) });
  },

  onNoteChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ note: e.detail.value || '' });
  },

  onSave() {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }

    const { type, startTime, endTime, note, quality, editMode, recordId } = this.data;

    if (!startTime || !endTime) {
      wx.showToast({ title: '请选择入睡和醒来时间', icon: 'none' });
      return;
    }

    const duration = diffInMinutes(startTime, endTime);

    if (editMode) {
      const result = sleepService.updateRecord(recordId, {
        type,
        startTime,
        endTime,
        duration,
        note: note || undefined,
        quality,
      });
      if (result) {
        wx.showToast({ title: '更新成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 500);
      }
    } else {
      const result = sleepService.addRecord({
        babyId,
        type,
        startTime,
        endTime,
        duration,
        note: note || undefined,
        quality,
      });
      if (result) {
        wx.showToast({ title: '记录成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 500);
      }
    }
  },
});

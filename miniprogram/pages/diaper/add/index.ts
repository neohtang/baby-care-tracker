// pages/diaper/add/index.ts
// 添加/编辑排便记录——完整实现

import { diaperService } from '../../../services/diaper';
import { babyService } from '../../../services/baby';
import { getNowISO, formatDateTime } from '../../../utils/date';
import type { DiaperType, PoopColor, PoopTexture, DiaperAlert } from '../../../types/index';

const COLOR_OPTIONS: { value: PoopColor; label: string; color: string }[] = [
  { value: 'yellow', label: '黄色', color: '#FBBF24' },
  { value: 'green', label: '绿色', color: '#34D399' },
  { value: 'brown', label: '棕色', color: '#92400E' },
  { value: 'black', label: '黑色', color: '#374151' },
  { value: 'red', label: '红色', color: '#F87171' },
  { value: 'white', label: '白色', color: '#D1D5DB' },
];

const TEXTURE_OPTIONS: { value: PoopTexture; label: string }[] = [
  { value: 'watery', label: '稀水样' },
  { value: 'soft', label: '糊状' },
  { value: 'normal', label: '软便' },
  { value: 'hard', label: '成形' },
  { value: 'mucus', label: '黏液样' },
];

Page({
  data: {
    editMode: false,
    recordId: '',
    type: 'pee' as DiaperType,
    poopColor: '' as PoopColor | '',
    poopTexture: '' as PoopTexture | '',
    alert: 'none' as DiaperAlert,
    note: '',
    time: '',
    timeDisplay: '',
    colorOptions: COLOR_OPTIONS,
    textureOptions: TEXTURE_OPTIONS,
  },

  onLoad(options: Record<string, string>) {
    const now = getNowISO();
    this.setData({
      time: now,
      timeDisplay: formatDateTime(now),
    });

    if (options.type) {
      this.setData({ type: options.type as DiaperType });
    }

    if (options.id) {
      this.setData({ editMode: true, recordId: options.id });
      this.loadRecord(options.id);
      wx.setNavigationBarTitle({ title: '编辑排便记录' });
    }
  },

  loadRecord(id: string) {
    const record = diaperService.getRecordById(id);
    if (!record) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      wx.navigateBack();
      return;
    }

    this.setData({
      type: record.type,
      poopColor: record.poopColor || '',
      poopTexture: record.poopTexture || '',
      alert: record.alert || 'none',
      note: record.note || '',
      time: record.time,
      timeDisplay: formatDateTime(record.time),
    });
  },

  onTypeChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.currentTarget.dataset.value as DiaperType;
    this.setData({
      type: value,
      // 切换到小便时清空大便相关字段
      ...(value === 'pee' ? { poopColor: '', poopTexture: '', alert: 'none' as DiaperAlert } : {}),
    });
  },

  onColorChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.currentTarget.dataset.value as PoopColor;
    this.setData({ poopColor: this.data.poopColor === value ? '' : value });
  },

  onTextureChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.currentTarget.dataset.value as PoopTexture;
    this.setData({ poopTexture: this.data.poopTexture === value ? '' : value });
  },

  onAlertChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ alert: e.detail.value ? 'diarrhea' : 'none' });
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

    const { type, poopColor, poopTexture, alert, note, time, editMode, recordId } = this.data;

    if (editMode) {
      const result = diaperService.updateRecord(recordId, {
        type,
        poopColor: type !== 'pee' && poopColor ? poopColor as PoopColor : undefined,
        poopTexture: type !== 'pee' && poopTexture ? poopTexture as PoopTexture : undefined,
        alert: alert as DiaperAlert,
        note: note || undefined,
        time,
      });
      if (result) {
        wx.showToast({ title: '更新成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 500);
      }
    } else {
      const result = diaperService.addRecord({
        babyId,
        type,
        poopColor: type !== 'pee' && poopColor ? poopColor as PoopColor : undefined,
        poopTexture: type !== 'pee' && poopTexture ? poopTexture as PoopTexture : undefined,
        alert: alert as DiaperAlert,
        note: note || undefined,
        time,
      });
      if (result) {
        wx.showToast({ title: '记录成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 500);
      }
    }
  },
});

// pages/health/add/index.ts
// 添加/编辑健康记录——完整实现

import { healthService } from '../../../services/health';
import { babyService } from '../../../services/baby';
import { getNowISO, formatDateTime } from '../../../utils/date';
import type { HealthRecordType, TemperatureSite, TemperatureLevel } from '../../../types/index';

const SITE_OPTIONS: { value: TemperatureSite; label: string }[] = [
  { value: 'axillary', label: '腋温' },
  { value: 'forehead', label: '额温' },
  { value: 'ear', label: '耳温' },
  { value: 'oral', label: '口温' },
  { value: 'rectal', label: '肛温' },
];

const COMMON_SYMPTOMS = ['发热', '咳嗽', '流鼻涕', '鼻塞', '腹泻', '呕吐', '皮疹', '哭闹不安', '食欲下降', '精神不佳'];

Page({
  data: {
    editMode: false,
    recordId: '',
    recordType: 'temperature' as HealthRecordType,
    // 体温
    temperature: 36.5,
    temperatureSite: 'axillary' as TemperatureSite,
    tempLevelText: '正常',
    tempLevelColor: '#34D399',
    // 用药
    medicationName: '',
    medicationDosage: '',
    // 症状
    selectedSymptoms: [] as string[],
    commonSymptoms: COMMON_SYMPTOMS,
    // 通用
    note: '',
    time: '',
    timeDisplay: '',
    siteOptions: SITE_OPTIONS,
  },

  onLoad(options: Record<string, string>) {
    const now = getNowISO();
    this.setData({
      time: now,
      timeDisplay: formatDateTime(now),
    });

    if (options.type) {
      this.setData({ recordType: options.type as HealthRecordType });
    }

    if (options.id) {
      this.setData({ editMode: true, recordId: options.id });
      this.loadRecord(options.id);
      wx.setNavigationBarTitle({ title: '编辑健康记录' });
    }

    this.updateTempLevel();
  },

  loadRecord(id: string) {
    const record = healthService.getRecordById(id);
    if (!record) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      wx.navigateBack();
      return;
    }

    this.setData({
      recordType: record.recordType,
      temperature: record.temperature || 36.5,
      temperatureSite: record.temperatureSite || 'axillary',
      medicationName: record.medicationName || '',
      medicationDosage: record.medicationDosage || '',
      selectedSymptoms: record.symptoms || [],
      note: record.note || '',
      time: record.time,
      timeDisplay: formatDateTime(record.time),
    });
    this.updateTempLevel();
  },

  onTypeChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.currentTarget.dataset.value as HealthRecordType;
    this.setData({ recordType: value });
  },

  onTempSlider(e: WechatMiniprogram.CustomEvent) {
    const value = parseFloat((e.detail.value / 10).toFixed(1));
    this.setData({ temperature: value });
    this.updateTempLevel();
  },

  onTempInput(e: WechatMiniprogram.CustomEvent) {
    const value = parseFloat(e.detail.value);
    if (!isNaN(value) && value >= 34 && value <= 43) {
      this.setData({ temperature: value });
      this.updateTempLevel();
    }
  },

  updateTempLevel() {
    const level = healthService.getTemperatureLevel(this.data.temperature);
    this.setData({
      tempLevelText: healthService.getLevelText(level),
      tempLevelColor: healthService.getLevelColor(level),
    });
  },

  onSiteChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.currentTarget.dataset.value as TemperatureSite;
    this.setData({ temperatureSite: value });
  },

  onMedNameChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ medicationName: e.detail.value || '' });
  },

  onMedDosageChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ medicationDosage: e.detail.value || '' });
  },

  onSymptomToggle(e: WechatMiniprogram.CustomEvent) {
    const symptom = e.currentTarget.dataset.value as string;
    const selected = [...this.data.selectedSymptoms];
    const idx = selected.indexOf(symptom);
    if (idx > -1) {
      selected.splice(idx, 1);
    } else {
      selected.push(symptom);
    }
    this.setData({ selectedSymptoms: selected });
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

    const {
      recordType, temperature, temperatureSite,
      medicationName, medicationDosage, selectedSymptoms,
      note, time, editMode, recordId,
    } = this.data;

    const baseData: any = {
      recordType,
      time,
      note: note || undefined,
    };

    switch (recordType) {
      case 'temperature':
        baseData.temperature = temperature;
        baseData.temperatureSite = temperatureSite;
        break;
      case 'medication':
        baseData.medicationName = medicationName;
        baseData.medicationDosage = medicationDosage || undefined;
        break;
      case 'symptom':
        baseData.symptoms = selectedSymptoms.length > 0 ? selectedSymptoms : undefined;
        break;
    }

    if (editMode) {
      const result = healthService.updateRecord(recordId, baseData);
      if (result) {
        wx.showToast({ title: '更新成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 500);
      }
    } else {
      const result = healthService.addRecord({ babyId, ...baseData });
      if (result) {
        wx.showToast({ title: '记录成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 500);
      }
    }
  },
});

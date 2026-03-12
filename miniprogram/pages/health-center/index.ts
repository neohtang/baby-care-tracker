// pages/health-center/index.ts
// 健康监测合并页 — 健康记录 + 疫苗接种 (Tender Bloom 主题)

import { healthService } from '../../services/health';
import { vaccineService } from '../../services/vaccine';
import { babyService } from '../../services/baby';
import eventBus, { Events } from '../../utils/event-bus';

const HEALTH_TABS = [
  { label: '全部', value: 'all' },
  { label: '体温', value: 'temperature' },
  { label: '用药', value: 'medication' },
  { label: '症状', value: 'symptom' },
];

Page({
  data: {
    activeMainTab: 0,
    hasBaby: false,

    // ===== 健康记录模块 =====
    healthTabs: HEALTH_TABS,
    healthActiveTab: 'all',
    healthRecords: [] as any[],
    healthEmpty: true,
    latestTemp: '--',
    latestTempLevel: 'normal',
    latestTempColor: '#7EBEA5',
    latestTempLevelText: '',
    latestTempTime: '',
    tempHistory: [] as any[],

    // ===== 疫苗模块 =====
    vaccineGroups: [] as IAnyObject[],
    vaccineSummary: {
      total: 0,
      completed: 0,
      pending: 0,
      overdue: 0,
      progress: 0,
    },
    showVaccinePopup: false,
    selectedVaccine: null as IAnyObject | null,
    vaccineForm: {
      date: '',
      location: '',
      batchNumber: '',
      reaction: '',
      note: '',
      vaccineName: '',
      doseNumber: '',
    },
    showVaccineDatePicker: false,

    // 懒加载标记
    _healthLoaded: true,
    _vaccineLoaded: false,
  },

  _unsubscribers: [] as (() => void)[],

  onLoad() {
    this._unsubscribers.push(
      eventBus.on(Events.HEALTH_CHANGED, () => this.loadHealthData()),
      eventBus.on(Events.VACCINE_CHANGED, () => this.loadVaccineData()),
      eventBus.on(Events.BABY_SWITCHED, () => this.refreshAll()),
      eventBus.on(Events.DATA_RESTORED, () => this.refreshAll()),
    );
  },

  onShow() {
    this.checkBaby();
    this.loadCurrentTabData();
  },

  onUnload() {
    this._unsubscribers.forEach(fn => fn());
    this._unsubscribers = [];
  },

  checkBaby() {
    const baby = babyService.getCurrentBaby();
    this.setData({ hasBaby: !!baby });
  },

  refreshAll() {
    this.checkBaby();
    this.setData({ _healthLoaded: false, _vaccineLoaded: false });
    this.loadCurrentTabData();
  },

  loadCurrentTabData() {
    const tab = this.data.activeMainTab;
    if (tab === 0) this.loadHealthData();
    else if (tab === 1) this.loadVaccineData();
  },

  onMainTabChange(e: WechatMiniprogram.CustomEvent) {
    const value = typeof e.detail === 'object' ? e.detail.value : e.detail;
    this.setData({ activeMainTab: value });
    if (value === 0 && !this.data._healthLoaded) this.loadHealthData();
    else if (value === 1 && !this.data._vaccineLoaded) this.loadVaccineData();
  },

  // ============ 健康记录模块 ============

  loadHealthData() {
    const baby = babyService.getCurrentBaby();
    if (!baby) {
      this.setData({ healthRecords: [], healthEmpty: true });
      return;
    }

    // 最新体温
    const latestTemp = healthService.getLatestTemperature();
    let tempData: any = { latestTemp: '--', latestTempLevel: 'normal', latestTempColor: '#7EBEA5', latestTempLevelText: '', latestTempTime: '' };
    if (latestTemp) {
      const level = healthService.getTemperatureLevel(latestTemp.temperature);
      tempData = {
        latestTemp: latestTemp.temperature.toFixed(1),
        latestTempLevel: level,
        latestTempColor: healthService.getLevelColor(level),
        latestTempLevelText: healthService.getLevelText(level),
        latestTempTime: latestTemp.timeText || '',
      };
    }

    // 体温趋势
    const tempHistory = healthService.getRecentTemperatures(8);

    // 按 tab 筛选记录
    const tab = this.data.healthActiveTab;
    let records;
    if (tab === 'all') {
      records = healthService.getTodayRecords();
    } else {
      records = healthService.getRecordsByType(tab);
    }
    const displayRecords = healthService.formatRecordsForDisplay(records);

    this.setData({
      _healthLoaded: true,
      ...tempData,
      tempHistory,
      healthRecords: displayRecords,
      healthEmpty: displayRecords.length === 0,
    });
  },

  onHealthTabChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.currentTarget.dataset.value;
    this.setData({ healthActiveTab: value });
    this.loadHealthData();
  },

  goToAddHealth(e: WechatMiniprogram.TouchEvent) {
    if (!this.data.hasBaby) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }
    const type = e.currentTarget.dataset.type || '';
    const url = type ? `/pages/health/add/index?type=${type}` : '/pages/health/add/index';
    wx.navigateTo({ url });
  },

  onEditHealthRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.detail;
    wx.navigateTo({ url: `/pages/health/add/index?id=${id}` });
  },

  onDeleteHealthRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.detail;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条健康记录吗？',
      confirmColor: '#E8736C',
      success: (res) => {
        if (res.confirm) {
          healthService.removeRecord(id);
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      },
    });
  },

  // ============ 疫苗模块 ============

  loadVaccineData() {
    const baby = babyService.getCurrentBaby();
    if (!baby) return;

    const rawGroups = vaccineService.getVaccinePlan();
    const summary = vaccineService.getSummary();

    // Map service data → WXML template expected shape
    // Service returns: { month, monthLabel, vaccines: [{ vaccine: {name,doseNumber,...}, record, status, statusLabel, dateText, ... }] }
    // Template expects: { month, label, items: [{ vaccineId, name, doseNumber, diseases, status, statusText, record, ... }] }
    const vaccineGroups = rawGroups.map(g => ({
      month: g.month,
      label: g.monthLabel,
      items: g.vaccines.map((v: any) => ({
        vaccineId: v.vaccine.id,
        name: v.vaccine.name,
        fullName: v.vaccine.fullName,
        doseNumber: v.vaccine.doseNumber,
        totalDoses: v.vaccine.totalDoses,
        diseases: v.vaccine.preventDisease,
        description: v.vaccine.description,
        recommendedDate: v.recommendedDate,
        status: v.status,
        statusText: v.statusLabel,
        statusColor: v.statusColor,
        statusBgColor: v.statusBgColor,
        dotColor: v.dotColor,
        dateText: v.dateText,
        record: v.record || null,
      })),
    }));

    this.setData({
      _vaccineLoaded: true,
      vaccineGroups,
      vaccineSummary: {
        total: summary.total,
        completed: summary.completed,
        pending: summary.pending,
        overdue: summary.overdue,
        progress: summary.progress,
      },
    });
  },

  onVaccineRecord(e: WechatMiniprogram.TouchEvent) {
    const { groupIndex, itemIndex } = e.currentTarget.dataset;
    const group = this.data.vaccineGroups[groupIndex];
    if (!group) return;
    const vaccine = group.items[itemIndex];
    if (!vaccine) return;

    const today = new Date().toISOString().slice(0, 10);
    this.setData({
      selectedVaccine: vaccine,
      showVaccinePopup: true,
      vaccineForm: {
        date: vaccine.record ? vaccine.record.date : today,
        location: vaccine.record ? vaccine.record.location || '' : '',
        batchNumber: vaccine.record ? vaccine.record.batchNumber || '' : '',
        reaction: vaccine.record ? vaccine.record.reaction || '' : '',
        note: vaccine.record ? vaccine.record.note || '' : '',
      },
    });
  },

  closeVaccinePopup() {
    this.setData({ showVaccinePopup: false, selectedVaccine: null });
  },

  /** 从FAB按钮手动打开空白疫苗录入弹窗 */
  openAddVaccinePopup() {
    if (!this.data.hasBaby) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    this.setData({
      selectedVaccine: null,
      showVaccinePopup: true,
      vaccineForm: {
        date: today,
        location: '',
        batchNumber: '',
        reaction: '',
        note: '',
        vaccineName: '',
        doseNumber: '1',
      },
    });
  },

  onVaccineNameInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'vaccineForm.vaccineName': e.detail.value });
  },

  onVaccineDoseInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'vaccineForm.doseNumber': e.detail.value });
  },

  onVaccineDateTap() {
    this.setData({ showVaccineDatePicker: true });
  },

  onVaccineDateConfirm(e: WechatMiniprogram.CustomEvent) {
    this.setData({
      'vaccineForm.date': e.detail.value,
      showVaccineDatePicker: false,
    });
  },

  onVaccineDateCancel() {
    this.setData({ showVaccineDatePicker: false });
  },

  onVaccineLocationChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'vaccineForm.location': e.detail.value });
  },

  onVaccineBatchChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'vaccineForm.batchNumber': e.detail.value });
  },

  onVaccineReactionChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'vaccineForm.reaction': e.detail.value });
  },

  onVaccineNoteChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'vaccineForm.note': e.detail.value });
  },

  saveVaccineRecord() {
    const vaccine = this.data.selectedVaccine;
    const form = this.data.vaccineForm;
    if (!form.date) {
      wx.showToast({ title: '请选择接种日期', icon: 'none' });
      return;
    }

    if (vaccine) {
      // 从疫苗计划中选择的疫苗
      if (vaccine.record) {
        vaccineService.updateRecord(vaccine.record.id, {
          date: form.date,
          location: form.location,
          batchNumber: form.batchNumber,
          reaction: form.reaction,
          note: form.note,
        });
        wx.showToast({ title: '已更新', icon: 'success' });
      } else {
        vaccineService.addRecord({
          babyId: babyService.getCurrentBabyId(),
          vaccineId: vaccine.vaccineId,
          doseNumber: vaccine.doseNumber,
          date: form.date,
          location: form.location,
          batchNumber: form.batchNumber,
          reaction: form.reaction,
          note: form.note,
        });
        wx.showToast({ title: '接种记录已保存', icon: 'success' });
      }
    } else {
      // 手动添加模式
      if (!form.vaccineName || !form.vaccineName.trim()) {
        wx.showToast({ title: '请输入疫苗名称', icon: 'none' });
        return;
      }
      vaccineService.addRecord({
        babyId: babyService.getCurrentBabyId(),
        vaccineId: 'custom_' + Date.now(),
        doseNumber: parseInt(form.doseNumber, 10) || 1,
        vaccineName: form.vaccineName.trim(),
        date: form.date,
        location: form.location,
        batchNumber: form.batchNumber,
        reaction: form.reaction,
        note: form.note,
      });
      wx.showToast({ title: '接种记录已保存', icon: 'success' });
    }

    this.closeVaccinePopup();
  },

  deleteVaccineRecord() {
    const vaccine = this.data.selectedVaccine;
    if (!vaccine || !vaccine.record) return;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条接种记录吗？',
      confirmColor: '#E8736C',
      success: (res) => {
        if (res.confirm) {
          vaccineService.removeRecord(vaccine.record.id);
          wx.showToast({ title: '已删除', icon: 'success' });
          this.closeVaccinePopup();
        }
      },
    });
  },

  // ============ 下拉刷新 ============

  onPullDownRefresh() {
    this.loadCurrentTabData();
    wx.stopPullDownRefresh();
  },
});

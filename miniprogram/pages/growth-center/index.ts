// pages/growth-center/index.ts
// 成长发育合并页 — 生长数据 + 发育里程碑 (Tender Bloom 主题)

import { growthService } from '../../services/growth';
import { milestoneService } from '../../services/milestone';
import { babyService } from '../../services/baby';
import { store } from '../../store/index';
import { getAgeInMonths } from '../../utils/date';
import { MILESTONE_CATEGORIES } from '../../data/milestones';
import eventBus, { Events } from '../../utils/event-bus';
import type { GrowthMetric } from '../../types/index';

const getToday = () => new Date().toISOString().slice(0, 10);

Page({
  data: {
    activeMainTab: 0,
    hasBaby: false,

    // ===== 生长数据模块 =====
    growthRecords: [] as IAnyObject[],
    latest: {
      weight: '--',
      height: '--',
      headCircumference: '--',
      dateText: '暂无记录',
      hasData: false,
      weightPercentile: '',
      heightPercentile: '',
      headPercentile: '',
    },
    chartType: 'weight' as GrowthMetric,
    chartTabs: [
      { label: '体重', value: 'weight' },
      { label: '身长', value: 'height' },
      { label: '头围', value: 'headCircumference' },
    ],
    whoData: [] as IAnyObject[],
    babyChartData: [] as IAnyObject[],
    gender: 'male',
    hasChartData: false,
    showAddPanel: false,
    newRecord: { weight: '', height: '', headCircumference: '', date: getToday(), note: '' },
    editId: '',
    isEdit: false,
    showDatePicker: false,

    // ===== 里程碑模块 =====
    milestoneGroups: [] as IAnyObject[],
    milestoneSummary: {
      total: 0,
      achieved: 0,
      pending: 0,
      concern: 0,
      progress: 0,
      currentFocus: 0,
    },
    milestoneCategories: [{ key: 'all', label: '全部', color: '#C8956C' }, ...MILESTONE_CATEGORIES],
    activeCategory: 'all',
    babyAgeMonths: 0,
    showMilestonePopup: false,
    selectedMilestone: null as IAnyObject | null,
    milestoneForm: { achievedDate: getToday(), note: '' },
    showMilestoneDatePicker: false,

    // 懒加载
    _growthLoaded: true,
    _milestoneLoaded: false,

    // 主题
    pageStyle: '',
  },

  _unsubscribers: [] as (() => void)[],
  _storeDisconnect: null as (() => void) | null,

  onLoad() {
    // Store 自动推送 pageStyle
    this._storeDisconnect = store.connect(this as any, {
      pageStyle: true,
    });

    this._unsubscribers.push(
      eventBus.on(Events.GROWTH_CHANGED, () => this.loadGrowthData()),
      eventBus.on(Events.MILESTONE_CHANGED, () => this.loadMilestoneData()),
      eventBus.on(Events.BABY_SWITCHED, () => this.refreshAll()),
      eventBus.on(Events.DATA_RESTORED, () => this.refreshAll()),
    );
  },

  onShow() {
    this.checkBaby();
    this.loadCurrentTabData();
    // 处理来自首页快捷入口的导航意图
    this.handleNavIntent();
  },

  onUnload() {
    this._unsubscribers.forEach((fn) => fn());
    this._unsubscribers = [];
    if (this._storeDisconnect) {
      this._storeDisconnect();
      this._storeDisconnect = null;
    }
  },

  checkBaby() {
    const baby = babyService.getCurrentBaby();
    this.setData({
      hasBaby: !!baby,
      gender: baby ? baby.gender || 'male' : 'male',
    });
  },

  /** 处理来自首页快捷入口的跨Tab导航意图 */
  handleNavIntent() {
    const app = getApp();
    const intent = app.globalData.navIntent;
    if (!intent || intent.target !== 'growth-center') return;

    // 读取后立即清除，避免重复触发
    app.globalData.navIntent = null;

    if (intent.action === 'addGrowth') {
      // 切到生长数据Tab，打开添加测量弹窗
      this.setData({ activeMainTab: 0 });
      // 用 setTimeout 确保 Tab 渲染完成后再弹出面板
      setTimeout(() => {
        this.setData({
          showAddPanel: true,
          isEdit: false,
          editId: '',
          newRecord: { weight: '', height: '', headCircumference: '', date: getToday(), note: '' },
        });
      }, 100);
    } else if (intent.action === 'milestone') {
      // 切到发育里程碑Tab，确保数据加载
      this.setData({ activeMainTab: 1 });
      this.loadMilestoneData();
    }
  },

  refreshAll() {
    this.checkBaby();
    this.setData({ _growthLoaded: false, _milestoneLoaded: false });
    this.loadCurrentTabData();
  },

  loadCurrentTabData() {
    const tab = Number(this.data.activeMainTab);
    if (tab === 0) this.loadGrowthData();
    else if (tab === 1) this.loadMilestoneData();
  },

  onMainTabChange(e: WechatMiniprogram.CustomEvent) {
    const raw = typeof e.detail === 'object' ? e.detail.value : e.detail;
    const value = Number(raw);
    this.setData({ activeMainTab: value });
    if (value === 0) this.loadGrowthData();
    else if (value === 1) this.loadMilestoneData();
  },

  // ============ 生长数据模块 ============

  loadGrowthData() {
    const baby = babyService.getCurrentBaby();
    if (!baby) return;

    const latestDisplay = growthService.getLatestDisplay();
    const records = growthService.getAllRecords();
    const displayRecords = growthService.formatRecordsForDisplay(records);

    this.setData({
      _growthLoaded: true,
      latest: latestDisplay,
      growthRecords: displayRecords,
    });

    this.updateChartData();
  },

  updateChartData() {
    const chartType = this.data.chartType;
    const whoData = growthService.getWHOData(chartType);
    const babyChartData = growthService.getChartData(chartType);

    this.setData({
      whoData,
      babyChartData,
      hasChartData: babyChartData.length > 0,
    });
  },

  onChartTypeChange(e: WechatMiniprogram.TouchEvent) {
    const value = e.currentTarget.dataset.value as GrowthMetric;
    this.setData({ chartType: value });
    this.updateChartData();
  },

  toggleAddPanel() {
    const show = !this.data.showAddPanel;
    if (!show) {
      this.setData({
        showAddPanel: false,
        newRecord: { weight: '', height: '', headCircumference: '', date: getToday(), note: '' },
        editId: '',
        isEdit: false,
      });
    } else {
      this.setData({ showAddPanel: true });
    }
  },

  onEditGrowthRecord(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id;
    const record = growthService.getRecordById(id);
    if (!record) return;
    this.setData({
      showAddPanel: true,
      isEdit: true,
      editId: id,
      newRecord: {
        weight: record.weight ? String(record.weight) : '',
        height: record.height ? String(record.height) : '',
        headCircumference: record.headCircumference ? String(record.headCircumference) : '',
        date: record.date,
        note: record.note || '',
      },
    });
  },

  onDeleteGrowthRecord(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条测量记录吗？',
      confirmColor: '#E8736C',
      success: (res) => {
        if (res.confirm) {
          growthService.removeRecord(id);
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      },
    });
  },

  onWeightChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'newRecord.weight': e.detail.value });
  },
  onHeightChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'newRecord.height': e.detail.value });
  },
  onHeadChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'newRecord.headCircumference': e.detail.value });
  },
  onGrowthNoteChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'newRecord.note': e.detail.value });
  },

  openGrowthDatePicker() {
    this.setData({ showDatePicker: true });
  },
  onGrowthDateConfirm(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'newRecord.date': e.detail.value, showDatePicker: false });
  },
  onGrowthDateCancel() {
    this.setData({ showDatePicker: false });
  },

  onSaveGrowth() {
    const form = this.data.newRecord;
    const weight = form.weight ? parseFloat(form.weight) : undefined;
    const height = form.height ? parseFloat(form.height) : undefined;
    const headCircumference = form.headCircumference
      ? parseFloat(form.headCircumference)
      : undefined;

    if (!weight && !height && !headCircumference) {
      wx.showToast({ title: '请至少填写一项测量数据', icon: 'none' });
      return;
    }

    const ageInfo = growthService.computeAge(form.date);

    if (this.data.isEdit && this.data.editId) {
      growthService.updateRecord(this.data.editId, {
        weight,
        height,
        headCircumference,
        date: form.date,
        note: form.note,
        ...ageInfo,
      });
      wx.showToast({ title: '已更新', icon: 'success' });
    } else {
      growthService.addRecord({
        babyId: babyService.getCurrentBabyId(),
        weight,
        height,
        headCircumference,
        date: form.date,
        note: form.note,
        ...ageInfo,
      });
      wx.showToast({ title: '已记录', icon: 'success' });
    }
    this.toggleAddPanel();
  },

  // ============ 里程碑模块 ============

  loadMilestoneData() {
    const baby = babyService.getCurrentBaby();
    const rawGroups = milestoneService.getMilestonePlan();
    const summary = milestoneService.getSummary();
    const ageMonths = baby?.birthDate ? getAgeInMonths(baby.birthDate) : 0;

    // Map service data to the shape expected by WXML template
    const groups = rawGroups.map((g) => ({
      month: g.month,
      label: g.monthLabel,
      items: g.milestones.map((m: any) => ({
        id: m.milestoneId,
        name: m.milestone.name,
        description: m.description,
        category: m.milestone.category,
        categoryLabel: m.categoryLabel,
        categoryColor: m.categoryColor,
        status: m.status,
        dateText: m.dateText,
        record: m.record || null,
        concernTip: m.concernTip,
        isCurrentFocus: m.isCurrentFocus,
      })),
    }));

    const category = this.data.activeCategory;
    const filteredGroups = category === 'all' ? groups : this.filterByCategory(groups, category);

    this.setData({
      _milestoneLoaded: true,
      milestoneGroups: filteredGroups,
      milestoneSummary: summary,
      babyAgeMonths: ageMonths,
    });
  },

  filterByCategory(groups: IAnyObject[], category: string): IAnyObject[] {
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((item: any) => item.category === category),
      }))
      .filter((g) => g.items.length > 0);
  },

  onCategoryChange(e: WechatMiniprogram.TouchEvent) {
    const value = e.currentTarget.dataset.value;
    this.setData({ activeCategory: value });
    this.loadMilestoneData();
  },

  onMilestoneRecord(e: WechatMiniprogram.TouchEvent) {
    const { groupIndex, itemIndex } = e.currentTarget.dataset;
    const group = this.data.milestoneGroups[groupIndex];
    if (!group) return;
    const item = group.items[itemIndex];
    if (!item) return;

    this.setData({
      selectedMilestone: item,
      showMilestonePopup: true,
      milestoneForm: {
        achievedDate: item.record ? item.record.achievedDate : getToday(),
        note: item.record ? item.record.note || '' : '',
      },
    });
  },

  closeMilestonePopup() {
    this.setData({ showMilestonePopup: false, selectedMilestone: null });
  },

  onMilestoneDateTap() {
    this.setData({ showMilestoneDatePicker: true });
  },
  onMilestoneDateConfirm(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'milestoneForm.achievedDate': e.detail.value, showMilestoneDatePicker: false });
  },
  onMilestoneDateCancel() {
    this.setData({ showMilestoneDatePicker: false });
  },
  onMilestoneNoteChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'milestoneForm.note': e.detail.value });
  },

  saveMilestoneRecord() {
    const item = this.data.selectedMilestone;
    if (!item) return;

    const baby = babyService.getCurrentBaby();
    if (!baby) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }

    const form = this.data.milestoneForm;

    if (item.record) {
      milestoneService.updateRecord(item.record.id, {
        achievedDate: form.achievedDate,
        note: form.note,
      });
      wx.showToast({ title: '已更新', icon: 'success' });
    } else {
      milestoneService.addRecord({
        babyId: baby.id,
        milestoneId: item.id,
        achievedDate: form.achievedDate,
        note: form.note,
      });
      wx.showToast({ title: '已记录', icon: 'success' });
    }
    this.closeMilestonePopup();
  },

  deleteMilestoneRecord() {
    const item = this.data.selectedMilestone;
    if (!item || !item.record) return;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条里程碑记录吗？',
      confirmColor: '#E8736C',
      success: (res) => {
        if (res.confirm) {
          milestoneService.removeRecord(item.record.id);
          wx.showToast({ title: '已删除', icon: 'success' });
          this.closeMilestonePopup();
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

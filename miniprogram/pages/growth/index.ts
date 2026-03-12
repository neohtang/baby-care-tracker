// pages/growth/index.ts
// 生长发育记录页 - 含 WHO 标准生长曲线图
import { growthService } from '../../services/growth';
import { babyService } from '../../services/baby';
import eventBus, { Events } from '../../utils/event-bus';
import { getToday } from '../../utils/date';

type GrowthMetric = 'weight' | 'height' | 'headCircumference';

Page({
  data: {
    records: [] as WechatMiniprogram.IAnyObject[],
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
      { value: 'weight', label: '体重' },
      { value: 'height', label: '身长' },
      { value: 'headCircumference', label: '头围' },
    ],
    // 传给 growth-chart 组件的数据
    whoData: [] as WechatMiniprogram.IAnyObject[],
    babyChartData: [] as WechatMiniprogram.IAnyObject[],
    gender: 'male',
    hasChartData: false,
    // 添加面板
    showAddPanel: false,
    newRecord: {
      weight: '',
      height: '',
      headCircumference: '',
      date: getToday(),
      note: '',
    },
    editId: '',
    isEdit: false,
    showDatePicker: false,
  },

  _unsubscribers: [] as (() => void)[],

  onLoad() {
    // 订阅事件
    this._unsubscribers.push(
      eventBus.on(Events.GROWTH_CHANGED, () => this.loadData()),
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
    const gender = baby?.gender || 'male';
    const latest = growthService.getLatestDisplay();
    const records = growthService.formatRecordsForDisplay(growthService.getAllRecords());

    this.setData({
      latest,
      records,
      gender,
    });

    this.updateChartData();
  },

  updateChartData() {
    const chartType = this.data.chartType;
    const whoData = growthService.getWHOData(chartType);
    const babyData = growthService.getChartData(chartType);

    this.setData({
      whoData,
      babyChartData: babyData.map(d => ({ month: d.ageInMonths, value: d.value })),
      hasChartData: babyData.length > 0,
    });
  },

  onChartTypeChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.currentTarget.dataset.value as GrowthMetric;
    this.setData({ chartType: value });
    this.updateChartData();
  },

  toggleAddPanel() {
    const show = !this.data.showAddPanel;
    if (!show) {
      // 关闭时重置表单
      this.setData({
        showAddPanel: false,
        editId: '',
        isEdit: false,
        newRecord: { weight: '', height: '', headCircumference: '', date: getToday(), note: '' },
      });
    } else {
      this.setData({ showAddPanel: true });
    }
  },

  onEditRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.currentTarget.dataset;
    const record = growthService.getRecordById(id);
    if (!record) return;

    this.setData({
      showAddPanel: true,
      isEdit: true,
      editId: id,
      newRecord: {
        weight: record.weight !== undefined ? String(record.weight) : '',
        height: record.height !== undefined ? String(record.height) : '',
        headCircumference: record.headCircumference !== undefined ? String(record.headCircumference) : '',
        date: record.date,
        note: record.note || '',
      },
    });
  },

  onDeleteRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条测量记录吗？',
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
  onNoteChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'newRecord.note': e.detail.value });
  },
  onDateChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'newRecord.date': e.detail.value, showDatePicker: false });
  },
  openDatePicker() {
    this.setData({ showDatePicker: true });
  },
  onDatePickerCancel() {
    this.setData({ showDatePicker: false });
  },

  onSave() {
    const { weight, height, headCircumference, date, note } = this.data.newRecord;

    const w = weight ? parseFloat(weight) : undefined;
    const h = height ? parseFloat(height) : undefined;
    const hc = headCircumference ? parseFloat(headCircumference) : undefined;

    if (w === undefined && h === undefined && hc === undefined) {
      wx.showToast({ title: '请至少填写一项测量数据', icon: 'none' });
      return;
    }

    const baby = babyService.getCurrentBaby();
    if (!baby) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }

    const ageInfo = growthService.computeAge(date);

    if (this.data.isEdit && this.data.editId) {
      growthService.updateRecord(this.data.editId, {
        weight: w,
        height: h,
        headCircumference: hc,
        date,
        note: note || undefined,
        ageInMonths: ageInfo.ageInMonths,
        ageInDays: ageInfo.ageInDays,
      });
    } else {
      growthService.addRecord({
        babyId: baby.id,
        weight: w,
        height: h,
        headCircumference: hc,
        date,
        note: note || undefined,
        ageInMonths: ageInfo.ageInMonths,
        ageInDays: ageInfo.ageInDays,
      });
    }

    wx.showToast({ title: '保存成功', icon: 'success' });
    this.toggleAddPanel();
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  },
});

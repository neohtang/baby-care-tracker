// pages/vaccine/index.ts
// 疫苗接种 & 发育里程碑合并页面（TabBar 第3页）
import { vaccineService } from '../../services/vaccine';
import { milestoneService } from '../../services/milestone';
import { babyService } from '../../services/baby';
import eventBus, { Events } from '../../utils/event-bus';
import { getToday, formatDate } from '../../utils/date';

Page({
  data: {
    activeTab: 0,
    // 疫苗相关
    vaccineGroups: [] as WechatMiniprogram.IAnyObject[],
    vaccineSummary: { total: 0, completed: 0, pending: 0, overdue: 0, progress: 0 },
    // 里程碑相关
    milestoneGroups: [] as WechatMiniprogram.IAnyObject[],
    milestoneSummary: { total: 0, achieved: 0, pending: 0, concern: 0, progress: 0, currentFocus: 0 },
    // 疫苗记录弹窗
    showVaccinePopup: false,
    selectedVaccine: null as WechatMiniprogram.IAnyObject | null,
    vaccineForm: {
      date: getToday(),
      location: '',
      batchNumber: '',
      reaction: '',
      note: '',
    },
    showVaccineDatePicker: false,
    // 里程碑记录弹窗
    showMilestonePopup: false,
    selectedMilestone: null as WechatMiniprogram.IAnyObject | null,
    milestoneForm: {
      achievedDate: getToday(),
      note: '',
    },
    showMilestoneDatePicker: false,
  },

  _unsubscribers: [] as (() => void)[],

  onLoad() {
    this._unsubscribers.push(
      eventBus.on(Events.VACCINE_CHANGED, () => this.loadVaccines()),
      eventBus.on(Events.MILESTONE_CHANGED, () => this.loadMilestones()),
      eventBus.on(Events.BABY_SWITCHED, () => { this.loadVaccines(); this.loadMilestones(); }),
      eventBus.on(Events.DATA_RESTORED, () => { this.loadVaccines(); this.loadMilestones(); }),
    );
  },

  onShow() {
    this.loadVaccines();
    this.loadMilestones();
  },

  onUnload() {
    this._unsubscribers.forEach(fn => fn());
  },

  onTabChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ activeTab: Number(e.detail.value) });
  },

  // ======================== 疫苗 ========================

  loadVaccines() {
    const vaccineGroups = vaccineService.getVaccinePlan();
    const vaccineSummary = vaccineService.getSummary();
    this.setData({ vaccineGroups, vaccineSummary });
  },

  onVaccineRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.currentTarget.dataset;
    // 在 vaccineGroups 中查找
    let found: any = null;
    for (const group of this.data.vaccineGroups) {
      for (const v of (group as any).vaccines) {
        if (v.vaccine.id === id) {
          found = v;
          break;
        }
      }
      if (found) break;
    }
    if (!found) return;

    // 如果已有接种记录，查看详情
    if (found.record) {
      this.setData({
        showVaccinePopup: true,
        selectedVaccine: found,
        vaccineForm: {
          date: found.record.date || getToday(),
          location: found.record.location || '',
          batchNumber: found.record.batchNumber || '',
          reaction: found.record.reaction || '',
          note: found.record.note || '',
        },
      });
    } else {
      // 新增接种记录
      this.setData({
        showVaccinePopup: true,
        selectedVaccine: found,
        vaccineForm: {
          date: getToday(),
          location: '',
          batchNumber: '',
          reaction: '',
          note: '',
        },
      });
    }
  },

  closeVaccinePopup() {
    this.setData({ showVaccinePopup: false, selectedVaccine: null });
  },

  onVaccineDateTap() {
    this.setData({ showVaccineDatePicker: true });
  },
  onVaccineDateConfirm(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'vaccineForm.date': e.detail.value, showVaccineDatePicker: false });
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
    const sv = this.data.selectedVaccine as any;
    if (!sv) return;

    const baby = babyService.getCurrentBaby();
    if (!baby) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }

    const { date, location, batchNumber, reaction, note } = this.data.vaccineForm;

    if (sv.record) {
      // 更新
      vaccineService.updateRecord(sv.record.id, {
        date,
        status: 'completed',
        location: location || undefined,
        batchNumber: batchNumber || undefined,
        reaction: reaction || undefined,
        note: note || undefined,
      });
    } else {
      // 新增
      vaccineService.addRecord({
        babyId: baby.id,
        vaccineId: sv.vaccine.id,
        date,
        status: 'completed',
        location: location || undefined,
        batchNumber: batchNumber || undefined,
        reaction: reaction || undefined,
        note: note || undefined,
      });
    }

    wx.showToast({ title: '记录成功', icon: 'success' });
    this.closeVaccinePopup();
  },

  deleteVaccineRecord() {
    const sv = this.data.selectedVaccine as any;
    if (!sv?.record) return;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条接种记录吗？',
      success: (res) => {
        if (res.confirm) {
          vaccineService.removeRecord(sv.record.id);
          wx.showToast({ title: '已删除', icon: 'success' });
          this.closeVaccinePopup();
        }
      },
    });
  },

  // ======================== 里程碑 ========================

  loadMilestones() {
    const milestoneGroups = milestoneService.getMilestonePlan();
    const milestoneSummary = milestoneService.getSummary();
    this.setData({ milestoneGroups, milestoneSummary });
  },

  onMilestoneRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.currentTarget.dataset;
    let found: any = null;
    for (const group of this.data.milestoneGroups) {
      for (const m of (group as any).milestones) {
        if (m.milestone.id === id) {
          found = m;
          break;
        }
      }
      if (found) break;
    }
    if (!found) return;

    this.setData({
      showMilestonePopup: true,
      selectedMilestone: found,
      milestoneForm: {
        achievedDate: found.record?.achievedDate || getToday(),
        note: found.record?.note || '',
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
    const sm = this.data.selectedMilestone as any;
    if (!sm) return;

    const baby = babyService.getCurrentBaby();
    if (!baby) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }

    const { achievedDate, note } = this.data.milestoneForm;

    if (sm.record) {
      milestoneService.updateRecord(sm.record.id, {
        achievedDate,
        status: 'achieved',
        note: note || undefined,
      });
    } else {
      milestoneService.addRecord({
        babyId: baby.id,
        milestoneId: sm.milestone.id,
        achievedDate,
        status: 'achieved',
        note: note || undefined,
      });
    }

    wx.showToast({ title: '记录成功', icon: 'success' });
    this.closeMilestonePopup();
  },

  deleteMilestoneRecord() {
    const sm = this.data.selectedMilestone as any;
    if (!sm?.record) return;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条里程碑记录吗？',
      success: (res) => {
        if (res.confirm) {
          milestoneService.removeRecord(sm.record.id);
          wx.showToast({ title: '已删除', icon: 'success' });
          this.closeMilestonePopup();
        }
      },
    });
  },

  // 跳转到里程碑详情页
  goToMilestoneDetail() {
    wx.navigateTo({ url: '/pages/milestone/index' });
  },
});

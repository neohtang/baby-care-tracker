// pages/milestone/index.ts
// 发育里程碑独立详情页
// 可从疫苗页跳转，提供按类别筛选和详细的里程碑列表
import { milestoneService } from '../../services/milestone';
import { babyService } from '../../services/baby';
import eventBus, { Events } from '../../utils/event-bus';
import { getToday, getAgeInMonths } from '../../utils/date';
import { MILESTONE_CATEGORIES } from '../../data/milestones';

type CategoryFilter = 'all' | 'gross_motor' | 'fine_motor' | 'language' | 'social' | 'cognitive';

Page({
  data: {
    milestoneGroups: [] as WechatMiniprogram.IAnyObject[],
    summary: { total: 0, achieved: 0, pending: 0, concern: 0, progress: 0, currentFocus: 0 },
    categories: [{ key: 'all', label: '全部', color: '#C8956C' }, ...MILESTONE_CATEGORIES],
    activeCategory: 'all' as CategoryFilter,
    babyAgeMonths: 0,
    // 记录弹窗
    showRecordPopup: false,
    selectedItem: null as WechatMiniprogram.IAnyObject | null,
    recordForm: {
      achievedDate: getToday(),
      note: '',
    },
    showDatePicker: false,
  },

  _unsubscribers: [] as (() => void)[],

  onLoad() {
    this._unsubscribers.push(
      eventBus.on(Events.MILESTONE_CHANGED, () => this.loadData()),
      eventBus.on(Events.BABY_SWITCHED, () => this.loadData()),
      eventBus.on(Events.DATA_RESTORED, () => this.loadData()),
    );
  },

  onShow() {
    this.loadData();
  },

  onUnload() {
    this._unsubscribers.forEach((fn) => fn());
  },

  loadData() {
    const baby = babyService.getCurrentBaby();
    const babyAgeMonths = baby ? getAgeInMonths(baby.birthDate) : 0;
    const allGroups = milestoneService.getMilestonePlan();
    const summary = milestoneService.getSummary();

    // 根据类别筛选
    const filtered = this.filterByCategory(allGroups, this.data.activeCategory);

    this.setData({
      milestoneGroups: filtered,
      summary,
      babyAgeMonths,
    });
  },

  filterByCategory(groups: any[], category: CategoryFilter): any[] {
    if (category === 'all') return groups;

    return groups
      .map((group) => ({
        ...group,
        milestones: group.milestones.filter((m: any) => m.milestone.category === category),
      }))
      .filter((group) => group.milestones.length > 0);
  },

  onCategoryChange(e: WechatMiniprogram.CustomEvent) {
    const key = e.currentTarget.dataset.key as CategoryFilter;
    this.setData({ activeCategory: key });
    this.loadData();
  },

  onRecord(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.currentTarget.dataset;
    let found: any = null;

    // 从原始数据查找（不受筛选影响）
    const allGroups = milestoneService.getMilestonePlan();
    for (const group of allGroups) {
      for (const m of group.milestones) {
        if (m.milestone.id === id) {
          found = m;
          break;
        }
      }
      if (found) break;
    }
    if (!found) return;

    this.setData({
      showRecordPopup: true,
      selectedItem: found,
      recordForm: {
        achievedDate: found.record?.achievedDate || getToday(),
        note: found.record?.note || '',
      },
    });
  },

  closeRecordPopup() {
    this.setData({ showRecordPopup: false, selectedItem: null });
  },

  onDateTap() {
    this.setData({ showDatePicker: true });
  },
  onDateConfirm(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'recordForm.achievedDate': e.detail.value, showDatePicker: false });
  },
  onDateCancel() {
    this.setData({ showDatePicker: false });
  },
  onNoteChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'recordForm.note': e.detail.value });
  },

  saveRecord() {
    const item = this.data.selectedItem as any;
    if (!item) return;

    const baby = babyService.getCurrentBaby();
    if (!baby) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return;
    }

    const { achievedDate, note } = this.data.recordForm;

    if (item.record) {
      milestoneService.updateRecord(item.record.id, {
        achievedDate,
        status: 'achieved',
        note: note || undefined,
      });
    } else {
      milestoneService.addRecord({
        babyId: baby.id,
        milestoneId: item.milestone.id,
        achievedDate,
        status: 'achieved',
        note: note || undefined,
      });
    }

    wx.showToast({ title: '记录成功', icon: 'success' });
    this.closeRecordPopup();
  },

  deleteRecord() {
    const item = this.data.selectedItem as any;
    if (!item?.record) return;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条里程碑记录吗？',
      success: (res) => {
        if (res.confirm) {
          milestoneService.removeRecord(item.record.id);
          wx.showToast({ title: '已删除', icon: 'success' });
          this.closeRecordPopup();
        }
      },
    });
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  },
});

// pages/profile/index.ts
// 我的页面 — 替代原 settings (Tender Bloom 主题)

import { babyService } from '../../services/baby';
import { exportService } from '../../services/export';
import { formatDate } from '../../utils/date';
import eventBus, { Events } from '../../utils/event-bus';

Page({
  data: {
    // 宝宝信息
    hasBaby: false,
    babyName: '',
    babyAgeText: '',
    babyGender: '',
    babyGenderText: '',
    babyAvatarUrl: '',
    babyBirthDate: '',
    babyBirthDateText: '',

    // 编辑表单
    showEditPopup: false,
    editMode: 'create' as 'create' | 'edit',
    formName: '',
    formGender: 'male',
    formBirthDate: '',
    formAvatarUrl: '',
    formBirthWeight: '',
    formBirthHeight: '',
    formNote: '',
    genderOptions: [{ label: '男宝', value: 'male' }, { label: '女宝', value: 'female' }],
    genderIndex: 0,

    // 数据管理
    storageUsage: '',
    storagePercentage: 0,
    moduleStatsRow1: [] as any[],
    moduleStatsRow2: [] as any[],
    totalRecords: 0,

    // 版本
    version: '1.0.0',
  },

  _unsubscribers: [] as (() => void)[],
  _currentBabyId: '',

  onLoad() {
    this._unsubscribers.push(
      eventBus.on(Events.BABY_CHANGED, () => this.loadBabyInfo()),
      eventBus.on(Events.DATA_RESTORED, () => { this.loadBabyInfo(); this.loadStorageInfo(); }),
    );
  },

  onShow() {
    this.loadBabyInfo();
    this.loadStorageInfo();
  },

  onUnload() {
    this._unsubscribers.forEach(fn => fn());
    this._unsubscribers = [];
  },

  loadBabyInfo() {
    const baby = babyService.getCurrentBaby();
    if (!baby) {
      this.setData({
        hasBaby: false, babyName: '', babyAgeText: '', babyGender: '', babyGenderText: '',
        babyAvatarUrl: '', babyBirthDate: '', babyBirthDateText: '',
      });
      return;
    }
    this._currentBabyId = baby.id;
    const display = babyService.getBabyDisplayInfo(baby);
    this.setData({
      hasBaby: true,
      babyName: display.name,
      babyAgeText: display.ageText,
      babyGender: display.gender,
      babyGenderText: display.genderText,
      babyAvatarUrl: display.avatarUrl,
      babyBirthDate: baby.birthDate || '',
      babyBirthDateText: baby.birthDate ? formatDate(baby.birthDate, 'YYYY年MM月DD日') : '',
    });
  },

  async loadStorageInfo() {
    const MODULE_META: Record<string, { icon: string; bg: string }> = {
      feeding: { icon: '/assets/icons/bottle.svg', bg: 'var(--module-feeding-bg, #FFF5EC)' },
      sleep: { icon: '/assets/icons/sleep.svg', bg: 'var(--module-sleep-bg, #F0F7FC)' },
      diaper: { icon: '/assets/icons/baby.svg', bg: 'var(--module-diaper-bg, #F0F9F5)' },
      health: { icon: '/assets/icons/thermometer.svg', bg: 'var(--module-health-bg, #FEF8E8)' },
      growth: { icon: '/assets/icons/ruler.svg', bg: 'var(--module-growth-bg, #FFF0F4)' },
      vaccine: { icon: '/assets/icons/vaccine.svg', bg: 'var(--module-vaccine-bg, #F3F0FC)' },
      milestone: { icon: '/assets/icons/star.svg', bg: 'var(--module-milestone-bg, #FFF8EC)' },
    };
    try {
      const usage = await exportService.getStorageUsage();
      const stats = exportService.getModuleStats();
      let total = 0;
      const enriched = stats.map((s: any) => {
        total += s.count;
        const meta = MODULE_META[s.module] || { icon: '', bg: 'var(--module-feeding-bg)' };
        return { ...s, icon: meta.icon, bg: meta.bg };
      });
      // Split into 2 rows (first 3 + rest)
      const row1 = enriched.slice(0, 3);
      const row2 = enriched.slice(3);
      this.setData({
        storageUsage: usage.usageText || '',
        storagePercentage: usage.percentage || 0,
        moduleStatsRow1: row1,
        moduleStatsRow2: row2,
        totalRecords: total,
      });
    } catch (e) {
      console.warn('loadStorageInfo failed', e);
    }
  },

  // ============ 宝宝信息编辑 ============

  editBabyInfo() {
    const baby = babyService.getCurrentBaby();
    if (baby) {
      this.setData({
        showEditPopup: true, editMode: 'edit',
        formName: baby.name || '', formGender: baby.gender || 'male',
        formBirthDate: baby.birthDate || '', formAvatarUrl: baby.avatarUrl || '',
        formBirthWeight: baby.birthWeight ? String(baby.birthWeight) : '',
        formBirthHeight: baby.birthHeight ? String(baby.birthHeight) : '',
        formNote: baby.note || '',
        genderIndex: baby.gender === 'female' ? 1 : 0,
      });
    } else {
      this.setData({
        showEditPopup: true, editMode: 'create',
        formName: '', formGender: 'male', formBirthDate: '',
        formAvatarUrl: '', formBirthWeight: '', formBirthHeight: '', formNote: '', genderIndex: 0,
      });
    }
  },

  closeEditPopup() {
    this.setData({ showEditPopup: false });
  },

  onNameChange(e: WechatMiniprogram.CustomEvent) { this.setData({ formName: e.detail.value }); },
  onGenderChange(e: WechatMiniprogram.CustomEvent) {
    const idx = e.detail.value;
    this.setData({ genderIndex: idx, formGender: idx === 1 ? 'female' : 'male' });
  },
  onBirthDateChange(e: WechatMiniprogram.CustomEvent) { this.setData({ formBirthDate: e.detail.value }); },
  onBirthWeightChange(e: WechatMiniprogram.CustomEvent) { this.setData({ formBirthWeight: e.detail.value }); },
  onBirthHeightChange(e: WechatMiniprogram.CustomEvent) { this.setData({ formBirthHeight: e.detail.value }); },
  onNoteChange(e: WechatMiniprogram.CustomEvent) { this.setData({ formNote: e.detail.value }); },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: (res) => {
        if (res.tempFiles && res.tempFiles[0]) {
          this.setData({ formAvatarUrl: res.tempFiles[0].tempFilePath });
        }
      },
    });
  },

  saveBabyInfo() {
    const { formName, formGender, formBirthDate, formAvatarUrl, formBirthWeight, formBirthHeight, formNote } = this.data;
    if (!formName.trim()) {
      wx.showToast({ title: '请输入宝宝姓名', icon: 'none' }); return;
    }
    if (!formBirthDate) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' }); return;
    }

    const data = {
      name: formName.trim(), gender: formGender, birthDate: formBirthDate,
      avatarUrl: formAvatarUrl,
      birthWeight: formBirthWeight ? parseFloat(formBirthWeight) : undefined,
      birthHeight: formBirthHeight ? parseFloat(formBirthHeight) : undefined,
      note: formNote,
    };

    if (this.data.editMode === 'edit' && this._currentBabyId) {
      babyService.updateBaby(this._currentBabyId, data);
    } else {
      babyService.createBaby(data);
    }
    wx.showToast({ title: '已保存', icon: 'success' });
    this.closeEditPopup();
  },

  // ============ 数据管理 ============

  exportData() {
    exportService.exportAndSave();
  },

  async importData() {
    await exportService.importFromFile();
  },

  clearAllData() {
    wx.showModal({
      title: '清除所有数据',
      content: '此操作将删除所有记录，不可恢复。建议先导出备份。',
      confirmColor: '#E8736C',
      confirmText: '确认清除',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          eventBus.emit(Events.DATA_RESTORED);
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      },
    });
  },

  showDisclaimer() {
    wx.showModal({
      title: '免责声明',
      content: '本应用仅供记录参考，不构成医疗建议。宝宝的健康问题请咨询专业医生。生长发育数据基于WHO 2006标准，仅作参考。',
      showCancel: false,
      confirmText: '我知道了',
      confirmColor: '#C8956C',
    });
  },

  onPullDownRefresh() {
    this.loadBabyInfo();
    this.loadStorageInfo();
    wx.stopPullDownRefresh();
  },
});

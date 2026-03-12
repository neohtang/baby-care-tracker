// pages/settings/index.ts
// 设置页 - 宝宝信息管理、数据导出与恢复

import babyService from '../../services/baby';
import exportService from '../../services/export';
import eventBus, { Events } from '../../utils/event-bus';
import { formatDate } from '../../utils/date';
import type { BabyInfo, Gender } from '../../types/index';

Page({
  data: {
    /** 宝宝信息 */
    hasBaby: false,
    babyName: '',
    babyAgeText: '',
    babyGender: '' as string,
    babyGenderText: '',
    babyAvatarUrl: '',
    babyBirthDate: '',
    babyBirthDateText: '',

    /** 编辑表单 */
    showEditPopup: false,
    editMode: 'create' as 'create' | 'edit',
    formName: '',
    formGender: 'male' as string,
    formBirthDate: '',
    formAvatarUrl: '',
    formBirthWeight: '',
    formBirthHeight: '',
    formNote: '',

    /** 性别选项 */
    genderOptions: [
      { label: '男宝', value: 'male' },
      { label: '女宝', value: 'female' },
    ],
    genderIndex: 0,

    /** 数据管理 */
    storageUsage: '',
    storagePercentage: 0,
    moduleStats: [] as any[],
    totalRecords: 0,

    /** 版本信息 */
    version: '1.0.0',
  },

  /** 事件总线解绑函数 */
  _unsubscribers: [] as (() => void)[],
  /** 当前宝宝 ID */
  _currentBabyId: '' as string,

  onLoad() {
    this._unsubscribers.push(
      eventBus.on(Events.BABY_CHANGED, () => this.loadBabyInfo()),
      eventBus.on(Events.DATA_RESTORED, () => {
        this.loadBabyInfo();
        this.loadStorageInfo();
      }),
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

  // ============ 数据加载 ============

  /**
   * 加载宝宝信息
   */
  loadBabyInfo() {
    const baby = babyService.getCurrentBaby();
    if (!baby) {
      this.setData({
        hasBaby: false,
        babyName: '',
        babyAgeText: '点击添加宝宝信息',
        babyGender: '',
        babyGenderText: '',
        babyAvatarUrl: '',
        babyBirthDate: '',
        babyBirthDateText: '',
      });
      this._currentBabyId = '';
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
      babyBirthDate: baby.birthDate,
      babyBirthDateText: formatDate(baby.birthDate, 'YYYY年MM月DD日'),
    });
  },

  /**
   * 加载存储使用信息
   */
  async loadStorageInfo() {
    const usage = await exportService.getStorageUsage();
    const stats = exportService.getModuleStats();
    const totalRecords = stats.reduce((sum, s) => sum + s.count, 0);

    this.setData({
      storageUsage: usage.sizeText,
      storagePercentage: usage.percentage,
      moduleStats: stats.filter(s => s.count > 0),
      totalRecords,
    });
  },

  // ============ 宝宝信息编辑 ============

  /**
   * 打开编辑弹窗
   */
  editBabyInfo() {
    const baby = babyService.getCurrentBaby();
    if (baby) {
      // 编辑模式
      this.setData({
        showEditPopup: true,
        editMode: 'edit',
        formName: baby.name,
        formGender: baby.gender,
        formBirthDate: baby.birthDate,
        formAvatarUrl: baby.avatarUrl || '',
        formBirthWeight: baby.birthWeight ? String(baby.birthWeight) : '',
        formBirthHeight: baby.birthHeight ? String(baby.birthHeight) : '',
        formNote: baby.note || '',
        genderIndex: baby.gender === 'male' ? 0 : 1,
      });
    } else {
      // 创建模式
      this.setData({
        showEditPopup: true,
        editMode: 'create',
        formName: '',
        formGender: 'male',
        formBirthDate: '',
        formAvatarUrl: '',
        formBirthWeight: '',
        formBirthHeight: '',
        formNote: '',
        genderIndex: 0,
      });
    }
  },

  /**
   * 关闭编辑弹窗
   */
  closeEditPopup() {
    this.setData({ showEditPopup: false });
  },

  /**
   * 表单字段变化处理
   */
  onNameChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ formName: e.detail.value || e.detail });
  },

  onGenderChange(e: WechatMiniprogram.CustomEvent) {
    const index = e.detail.value;
    this.setData({
      genderIndex: index,
      formGender: index === 0 ? 'male' : 'female',
    });
  },

  onBirthDateChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ formBirthDate: e.detail.value });
  },

  onBirthWeightChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ formBirthWeight: e.detail.value || e.detail });
  },

  onBirthHeightChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ formBirthHeight: e.detail.value || e.detail });
  },

  onNoteChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ formNote: e.detail.value || e.detail });
  },

  /**
   * 选择头像
   */
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({ formAvatarUrl: tempFilePath });
      },
    });
  },

  /**
   * 保存宝宝信息
   */
  saveBabyInfo() {
    const { formName, formGender, formBirthDate, formAvatarUrl, formBirthWeight, formBirthHeight, formNote, editMode } = this.data;

    if (!formName.trim()) {
      wx.showToast({ title: '请输入宝宝姓名', icon: 'none' });
      return;
    }
    if (!formBirthDate) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' });
      return;
    }

    const babyData = {
      name: formName.trim(),
      gender: formGender as Gender,
      birthDate: formBirthDate,
      avatarUrl: formAvatarUrl || undefined,
      birthWeight: formBirthWeight ? parseFloat(formBirthWeight) : undefined,
      birthHeight: formBirthHeight ? parseFloat(formBirthHeight) : undefined,
      note: formNote || undefined,
    };

    let success = false;
    if (editMode === 'edit' && this._currentBabyId) {
      const updated = babyService.updateBaby(this._currentBabyId, babyData);
      success = !!updated;
    } else {
      const created = babyService.createBaby(babyData);
      success = !!created;
    }

    if (success) {
      this.setData({ showEditPopup: false });
      this.loadBabyInfo();
      wx.showToast({
        title: editMode === 'edit' ? '修改成功' : '添加成功',
        icon: 'success',
      });
    }
  },

  // ============ 数据管理 ============

  /**
   * 导出数据
   */
  exportData() {
    exportService.exportAndSave();
  },

  /**
   * 导入/恢复数据
   */
  async importData() {
    const result = await exportService.importFromFile();
    if (result) {
      this.loadBabyInfo();
      this.loadStorageInfo();
    }
  },

  /**
   * 清除所有数据
   */
  clearAllData() {
    wx.showModal({
      title: '清除所有数据',
      content: '此操作不可恢复，建议先导出备份。确定要清除所有数据吗？',
      confirmText: '确定清除',
      confirmColor: '#F87171',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.clearStorageSync();
            eventBus.emit(Events.DATA_RESTORED);
            this.loadBabyInfo();
            this.loadStorageInfo();
            wx.showToast({ title: '已清除所有数据', icon: 'success' });
          } catch (e) {
            wx.showToast({ title: '清除失败', icon: 'none' });
          }
        }
      },
    });
  },

  // ============ 其他 ============

  /**
   * 显示免责声明
   */
  showDisclaimer() {
    wx.showModal({
      title: '免责声明',
      content: '本小程序仅供日常养护记录参考，所有数据存储在您的设备本地，不会上传至任何服务器。记录内容不构成任何医疗建议或诊断依据。如宝宝出现健康问题，请及时就医，遵从专业医生指导。\n\n本应用中的疫苗清单和发育里程碑参考数据来源于公开的国家免疫规划和WHO标准，仅供参考，具体接种和发育评估请咨询专业医疗机构。',
      showCancel: false,
      confirmText: '我知道了',
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadBabyInfo();
    this.loadStorageInfo();
    wx.stopPullDownRefresh();
  },
});

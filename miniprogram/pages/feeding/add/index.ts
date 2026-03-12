// pages/feeding/add/index.ts
// 添加/编辑喂养记录

Page({
  data: {
    editMode: false,
    recordId: '',
    feedingType: 'breast' as 'breast' | 'formula' | 'solid',
    side: 'left' as 'left' | 'right' | 'both',
    amount: 0,
    duration: 0,
    isTimerRunning: false,
    timerSeconds: 0,
    note: '',
    startTime: '',
  },

  timerInterval: null as number | null,

  onLoad(options: Record<string, string>) {
    if (options.id) {
      this.setData({ editMode: true, recordId: options.id });
      this.loadRecord(options.id);
    }
    this.setData({ startTime: new Date().toISOString() });
  },

  onUnload() {
    this.stopTimer();
  },

  loadRecord(_id: string) {
    // TODO: 加载已有记录用于编辑
  },

  onTypeChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ feedingType: e.detail.value });
  },

  onSideChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ side: e.detail.value });
  },

  onAmountChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ amount: e.detail.value });
  },

  onNoteChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ note: e.detail.value });
  },

  /**
   * 开始/暂停计时器
   */
  toggleTimer() {
    if (this.data.isTimerRunning) {
      this.stopTimer();
    } else {
      this.startTimer();
    }
  },

  startTimer() {
    this.setData({ isTimerRunning: true });
    this.timerInterval = setInterval(() => {
      this.setData({ timerSeconds: this.data.timerSeconds + 1 });
    }, 1000) as unknown as number;
  },

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.setData({
      isTimerRunning: false,
      duration: Math.ceil(this.data.timerSeconds / 60),
    });
  },

  resetTimer() {
    this.stopTimer();
    this.setData({ timerSeconds: 0, duration: 0 });
  },

  /**
   * 保存记录
   */
  onSave() {
    // TODO: 数据校验和保存
    wx.showToast({ title: '保存成功', icon: 'success' });
    wx.navigateBack();
  },
});

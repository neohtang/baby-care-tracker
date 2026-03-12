/**
 * Timer 计时器组件
 * 用于喂养和睡眠的开始/暂停/结束计时
 * 支持正计时模式，显示圆形动画进度环
 */

Component({
  properties: {
    /** 计时器标题 */
    title: {
      type: String,
      value: '计时',
    },
    /** 主题色 */
    color: {
      type: String,
      value: '#7C6FE0',
    },
    /** 是否自动开始 */
    autoStart: {
      type: Boolean,
      value: false,
    },
    /** 计时器初始秒数（用于恢复） */
    initialSeconds: {
      type: Number,
      value: 0,
    },
    /** 最大时长（秒），超过后自动停止，0表示不限制 */
    maxDuration: {
      type: Number,
      value: 0,
    },
    /** 进度环半径 rpx */
    radius: {
      type: Number,
      value: 140,
    },
  },

  data: {
    /** 已计时秒数 */
    seconds: 0,
    /** 是否正在运行 */
    isRunning: false,
    /** 格式化的分钟数 */
    displayMinutes: '00',
    /** 格式化的秒数 */
    displaySeconds: '00',
    /** 格式化的小时数（超过60分钟显示） */
    displayHours: '',
    /** 进度环角度 (0-360)，每60秒一圈 */
    progressDeg: 0,
    /** 动画关键帧（用于脉冲效果） */
    pulseAnimation: '',
    /** 开始时间戳 */
    startTimestamp: 0,
  },

  lifetimes: {
    attached() {
      if (this.data.initialSeconds > 0) {
        this.setData({ seconds: this.data.initialSeconds });
        this._updateDisplay();
      }
      if (this.data.autoStart) {
        this.start();
      }
    },
    detached() {
      this._clearTimer();
    },
  },

  pageLifetimes: {
    hide() {
      // 页面隐藏时记录时间点，页面再显示时可以补偿
    },
    show() {
      // 如果正在运行，根据 startTimestamp 修正秒数
      if (this.data.isRunning && this.data.startTimestamp > 0) {
        const elapsed = Math.floor((Date.now() - this.data.startTimestamp) / 1000);
        this.setData({ seconds: elapsed });
        this._updateDisplay();
      }
    },
  },

  methods: {
    /**
     * 开始计时
     */
    start() {
      if (this.data.isRunning) return;

      const startTimestamp = this.data.seconds > 0
        ? Date.now() - this.data.seconds * 1000
        : Date.now();

      this.setData({
        isRunning: true,
        startTimestamp,
      });

      this._timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.data.startTimestamp) / 1000);
        const newSeconds = elapsed;

        // 检查是否超过最大时长
        if (this.data.maxDuration > 0 && newSeconds >= this.data.maxDuration) {
          this.stop();
          this.triggerEvent('maxreached', { seconds: this.data.maxDuration });
          return;
        }

        this.setData({ seconds: newSeconds });
        this._updateDisplay();
        this.triggerEvent('tick', { seconds: newSeconds });
      }, 1000);

      this.triggerEvent('start', { seconds: this.data.seconds });
    },

    /**
     * 暂停计时
     */
    pause() {
      if (!this.data.isRunning) return;
      this._clearTimer();
      this.setData({ isRunning: false });
      this.triggerEvent('pause', { seconds: this.data.seconds });
    },

    /**
     * 停止计时并返回结果
     */
    stop() {
      this._clearTimer();
      const finalSeconds = this.data.seconds;
      this.setData({ isRunning: false });
      this.triggerEvent('stop', {
        seconds: finalSeconds,
        minutes: Math.round(finalSeconds / 60 * 10) / 10,
        formatted: this._formatResult(finalSeconds),
      });
    },

    /**
     * 重置计时器
     */
    reset() {
      this._clearTimer();
      this.setData({
        seconds: 0,
        isRunning: false,
        startTimestamp: 0,
        displayMinutes: '00',
        displaySeconds: '00',
        displayHours: '',
        progressDeg: 0,
      });
      this.triggerEvent('reset');
    },

    /**
     * 切换开始/暂停
     */
    toggle() {
      if (this.data.isRunning) {
        this.pause();
      } else {
        this.start();
      }
    },

    /**
     * 获取当前秒数（供外部调用）
     */
    getSeconds(): number {
      return this.data.seconds;
    },

    /**
     * 获取当前分钟数（供外部调用）
     */
    getMinutes(): number {
      return Math.round(this.data.seconds / 60 * 10) / 10;
    },

    // ===== 内部方法 =====

    /** 更新显示文字和进度 */
    _updateDisplay() {
      const s = this.data.seconds;
      const hours = Math.floor(s / 3600);
      const mins = Math.floor((s % 3600) / 60);
      const secs = s % 60;

      const displayHours = hours > 0 ? String(hours).padStart(2, '0') : '';
      const displayMinutes = String(mins).padStart(2, '0');
      const displaySeconds = String(secs).padStart(2, '0');

      // 进度环：每60秒转一圈
      const progressDeg = (s % 60) / 60 * 360;

      this.setData({
        displayHours,
        displayMinutes,
        displaySeconds,
        progressDeg,
      });
    },

    /** 清除定时器 */
    _clearTimer() {
      if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
    },

    /** 格式化结果 */
    _formatResult(totalSeconds: number): string {
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      if (hours > 0) {
        return `${hours}小时${mins}分${secs}秒`;
      }
      if (mins > 0) {
        return `${mins}分${secs}秒`;
      }
      return `${secs}秒`;
    },

    /** 按钮事件处理 */
    onToggle() {
      this.toggle();
    },

    onStop() {
      this.stop();
    },

    onReset() {
      this.reset();
    },
  } as any,
});

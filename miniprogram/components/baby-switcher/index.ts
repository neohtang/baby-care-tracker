/**
 * BabySwitcher 组件 — Phase 3.5 多宝宝管理
 * 全局悬浮切换入口：悬浮球（当前宝宝头像）+ 展开选择列表
 * 仅在多宝宝场景下显示，单宝宝自动隐藏
 */

import { babyService } from '../../services/baby';
import eventBus, { Events } from '../../utils/event-bus';
import type { BabyInfo } from '../../types/index';

interface BabyOption {
  id: string;
  name: string;
  initial: string;
  avatarUrl: string;
  gender: string;
  ageText: string;
  isCurrent: boolean;
}

Component({
  properties: {
    /** 悬浮球位置：left / right */
    position: {
      type: String,
      value: 'right',
    },
  },

  data: {
    /** 是否显示组件（多宝宝时才显示） */
    visible: false,
    /** 是否展开选择列表 */
    expanded: false,
    /** 当前宝宝信息 */
    currentBaby: null as BabyOption | null,
    /** 所有宝宝列表 */
    babyList: [] as BabyOption[],
    /** 切换动画状态 */
    switching: false,
    /** 悬浮球拖拽位置 */
    fabX: 0,
    fabY: 0,
    /** 是否正在拖拽 */
    dragging: false,
    /** 拖拽起始位置 */
    _startX: 0,
    _startY: 0,
    _startFabX: 0,
    _startFabY: 0,
    /** 是否需要阻止 tap（拖拽后） */
    _moved: false,
  },

  lifetimes: {
    attached() {
      this._loadBabies();
      this._initPosition();

      // 监听宝宝变化事件
      this._onBabyChanged = () => this._loadBabies();
      this._onBabySwitched = () => this._loadBabies();
      this._onDataRestored = () => this._loadBabies();

      eventBus.on(Events.BABY_CHANGED, this._onBabyChanged);
      eventBus.on(Events.BABY_SWITCHED, this._onBabySwitched);
      eventBus.on(Events.DATA_RESTORED, this._onDataRestored);
    },

    detached() {
      if (this._onBabyChanged) {
        eventBus.off(Events.BABY_CHANGED, this._onBabyChanged);
      }
      if (this._onBabySwitched) {
        eventBus.off(Events.BABY_SWITCHED, this._onBabySwitched);
      }
      if (this._onDataRestored) {
        eventBus.off(Events.DATA_RESTORED, this._onDataRestored);
      }
    },
  },

  methods: {
    _onBabyChanged: null as any,
    _onBabySwitched: null as any,
    _onDataRestored: null as any,

    /** 初始化悬浮球位置 */
    _initPosition() {
      try {
        const info = wx.getWindowInfo();
        const screenWidth = info.windowWidth;
        const screenHeight = info.windowHeight;
        const fabSize = 52; // 悬浮球 px 大小
        const margin = 16;

        const x = this.properties.position === 'left' ? margin : screenWidth - fabSize - margin;
        const y = screenHeight * 0.65;

        this.setData({ fabX: x, fabY: y });
      } catch {
        // 降级：使用默认位置
        this.setData({ fabX: 320, fabY: 500 });
      }
    },

    /** 加载宝宝列表 */
    _loadBabies() {
      const allBabies = babyService.getAllBabies();
      const currentId = babyService.getCurrentBabyId();

      // 仅多宝宝时显示
      if (allBabies.length <= 1) {
        this.setData({ visible: false, expanded: false });
        return;
      }

      const babyList: BabyOption[] = allBabies.map((baby: BabyInfo) => ({
        id: baby.id,
        name: baby.name,
        initial: baby.name ? baby.name.charAt(0) : '',
        avatarUrl: baby.avatarUrl || '',
        gender: baby.gender,
        ageText: babyService.getAgeText(baby),
        isCurrent: baby.id === currentId,
      }));

      const currentBaby = babyList.find((b) => b.isCurrent) || babyList[0];

      this.setData({
        visible: true,
        babyList,
        currentBaby,
      });
    },

    /** 点击悬浮球 */
    onFabTap() {
      if (this.data._moved) {
        this.setData({ _moved: false });
        return;
      }
      this.setData({ expanded: !this.data.expanded });
    },

    /** 选择宝宝 */
    onSelectBaby(e: WechatMiniprogram.TouchEvent) {
      const babyId = e.currentTarget.dataset.id as string;
      if (!babyId) return;

      const currentId = babyService.getCurrentBabyId();
      if (babyId === currentId) {
        // 选中当前宝宝，仅收起面板
        this.setData({ expanded: false });
        return;
      }

      // 播放切换动画
      this.setData({ switching: true, expanded: false });

      // 延迟切换，让动画先播放
      setTimeout(() => {
        babyService.setCurrentBaby(babyId);
        this._loadBabies();

        // 动画结束
        setTimeout(() => {
          this.setData({ switching: false });
        }, 300);
      }, 150);
    },

    /** 点击遮罩关闭 */
    onMaskTap() {
      this.setData({ expanded: false });
    },

    /** 悬浮球拖拽 - 开始 */
    onTouchStart(e: WechatMiniprogram.TouchEvent) {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      this.setData({
        dragging: true,
        _moved: false,
        _startX: touch.clientX,
        _startY: touch.clientY,
        _startFabX: this.data.fabX,
        _startFabY: this.data.fabY,
      });
    },

    /** 悬浮球拖拽 - 移动 */
    onTouchMove(e: WechatMiniprogram.TouchEvent) {
      if (!this.data.dragging || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = touch.clientX - this.data._startX;
      const dy = touch.clientY - this.data._startY;

      // 移动距离 > 5px 才算拖拽
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        this.setData({ _moved: true });
      }

      const newX = this.data._startFabX + dx;
      const newY = this.data._startFabY + dy;

      // 边界限制
      try {
        const info = wx.getWindowInfo();
        const fabSize = 52;
        const clampX = Math.max(0, Math.min(newX, info.windowWidth - fabSize));
        const clampY = Math.max(0, Math.min(newY, info.windowHeight - fabSize));
        this.setData({ fabX: clampX, fabY: clampY });
      } catch {
        this.setData({ fabX: newX, fabY: newY });
      }
    },

    /** 悬浮球拖拽 - 结束：吸边 */
    onTouchEnd() {
      if (!this.data.dragging) return;
      this.setData({ dragging: false });

      // 吸附到左边或右边
      try {
        const info = wx.getWindowInfo();
        const fabSize = 52;
        const margin = 16;
        const midX = info.windowWidth / 2;
        const targetX =
          this.data.fabX + fabSize / 2 < midX ? margin : info.windowWidth - fabSize - margin;

        this.setData({ fabX: targetX });
      } catch {
        // 降级不处理
      }
    },
  },
});

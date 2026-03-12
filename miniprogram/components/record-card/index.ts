/**
 * RecordCard 记录卡片组件
 * 通用的单条记录展示卡片，支持左滑编辑/删除
 * 展示：图标 + 标题 + 时间 + 摘要 + 可选标签
 */

Component({
  properties: {
    /** 记录ID */
    recordId: {
      type: String,
      value: '',
    },
    /** 图标（emoji 或文字） */
    icon: {
      type: String,
      value: '',
    },
    /** 图标背景色 */
    iconBg: {
      type: String,
      value: '#F5EDE4',
    },
    /** 标题 */
    title: {
      type: String,
      value: '',
    },
    /** 时间文字 */
    timeText: {
      type: String,
      value: '',
    },
    /** 详情描述 */
    detail: {
      type: String,
      value: '',
    },
    /** 标签列表 */
    tags: {
      type: Array,
      value: [],
      // 每个 tag: { text, color?, bgColor? }
    },
    /** 是否可左滑删除 */
    swipeable: {
      type: Boolean,
      value: true,
    },
    /** 是否显示编辑按钮 */
    showEdit: {
      type: Boolean,
      value: false,
    },
    /** 是否可点击 */
    clickable: {
      type: Boolean,
      value: true,
    },
    /** 异常/警示标记 */
    alert: {
      type: Boolean,
      value: false,
    },
    /** 异常提示文字 */
    alertText: {
      type: String,
      value: '',
    },
  },

  data: {
    showDeleteConfirm: false,
  },

  methods: {
    /** 卡片点击 */
    onTap() {
      if (!this.data.clickable) return;
      this.triggerEvent('tap', { id: this.data.recordId });
    },

    /** 滑动操作按钮点击 */
    onSwipeAction(e: WechatMiniprogram.TouchEvent) {
      // TDesign SwipeCell 的 click 事件
    },

    /** 编辑按钮 */
    onEdit() {
      this.triggerEvent('edit', { id: this.data.recordId });
    },

    /** 删除按钮——弹出确认 */
    onDelete() {
      this.setData({ showDeleteConfirm: true });
    },

    /** 确认删除 */
    onConfirmDelete() {
      this.setData({ showDeleteConfirm: false });
      this.triggerEvent('delete', { id: this.data.recordId });
    },

    /** 取消删除 */
    onCancelDelete() {
      this.setData({ showDeleteConfirm: false });
    },
  },
});

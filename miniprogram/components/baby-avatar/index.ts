/**
 * BabyAvatar 组件
 * 圆形头像 + 月龄标签，用于展示宝宝基本信息
 */

Component({
  properties: {
    /** 头像图片地址 */
    avatarUrl: {
      type: String,
      value: '',
    },
    /** 宝宝姓名（无头像时显示首字作为占位） */
    name: {
      type: String,
      value: '',
    },
    /** 月龄文字，如 "5个月12天" */
    ageText: {
      type: String,
      value: '',
    },
    /** 头像尺寸：small(64rpx) / medium(96rpx) / large(120rpx) */
    size: {
      type: String,
      value: 'large',
    },
    /** 是否显示月龄标签 */
    showAge: {
      type: Boolean,
      value: true,
    },
    /** 性别：male / female，影响装饰色 */
    gender: {
      type: String,
      value: '',
    },
  },

  observers: {
    'name': function(name: string) {
      this.setData({
        initial: name ? name.charAt(0) : '',
      });
    },
    'size': function(size: string) {
      const sizeMap: Record<string, number> = {
        small: 64,
        medium: 96,
        large: 120,
      };
      const px = sizeMap[size] || 120;
      this.setData({
        avatarSize: `${px}rpx`,
        fontSize: `${Math.round(px * 0.4)}rpx`,
      });
    },
    'gender': function(gender: string) {
      const colorMap: Record<string, string[]> = {
        male: ['#60A5FA', '#93C5FD'],
        female: ['#F0ABFC', '#F5D0FE'],
      };
      const colors = colorMap[gender] || ['#A78BFA', '#C4B5FD'];
      this.setData({
        ringGradient: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
        placeholderBg: colors[0],
      });
    },
  },

  data: {
    initial: '',
    avatarSize: '120rpx',
    fontSize: '48rpx',
    ringGradient: 'linear-gradient(135deg, #A78BFA, #C4B5FD)',
    placeholderBg: '#A78BFA',
  },

  lifetimes: {
    attached() {
      // 触发 observers 初始化
      this.setData({
        initial: this.data.name ? this.data.name.charAt(0) : '',
      });
    },
  },

  methods: {
    onTap() {
      this.triggerEvent('tap');
    },
  },
});

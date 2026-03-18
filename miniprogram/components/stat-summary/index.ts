/**
 * StatSummary 统计摘要组件
 * 展示数字 + 标签 + 趋势指示的摘要卡片
 * 支持单卡片和网格排列两种模式
 */

Component({
  properties: {
    /** 摘要数据项列表 */
    items: {
      type: Array,
      value: [],
      // 每个 item: { label, value, unit?, icon?, color?, trend?: 'up'|'down'|'stable', trendText? }
    },
    /** 排列列数：2/3/4 */
    columns: {
      type: Number,
      value: 2,
    },
    /** 标题 */
    title: {
      type: String,
      value: '',
    },
    /** 是否显示卡片容器 */
    showCard: {
      type: Boolean,
      value: true,
    },
    /** 是否可点击 */
    clickable: {
      type: Boolean,
      value: false,
    },
  },

  observers: {
    columns: function (columns: number) {
      this.setData({
        gridStyle: `grid-template-columns: repeat(${columns}, 1fr);`,
      });
    },
  },

  data: {
    gridStyle: 'grid-template-columns: repeat(2, 1fr);',
  },

  methods: {
    onItemTap(e: WechatMiniprogram.TouchEvent) {
      if (!this.data.clickable) return;
      const index = e.currentTarget.dataset.index;
      const item = this.data.items[index];
      this.triggerEvent('itemtap', { index, item });
    },
  },
});

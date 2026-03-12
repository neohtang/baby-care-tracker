/**
 * DailyTimeline 每日时间线组件
 * 按时间顺序展示一天内所有类型的记录，不同类型用不同颜色圆点标识
 * 左侧时间轴线连贯，支持点击单条记录查看详情
 */

/** 记录类型配色映射 */
const TYPE_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  feeding: { color: '#C8956C', icon: '/assets/icons/bottle.svg', label: '喂养' },
  breast: { color: '#D4A97A', icon: '/assets/icons/breastfeed.svg', label: '母乳' },
  formula: { color: '#C8956C', icon: '/assets/icons/bottle.svg', label: '配方奶' },
  solid: { color: '#E8C4A0', icon: '/assets/icons/solid-food.svg', label: '辅食' },
  sleep: { color: '#7CAFD4', icon: '/assets/icons/sleep.svg', label: '睡眠' },
  nap: { color: '#A8CBE4', icon: '/assets/icons/sun.svg', label: '小睡' },
  night: { color: '#5A99C4', icon: '/assets/icons/moon.svg', label: '夜间睡眠' },
  diaper: { color: '#7EBEA5', icon: '/assets/icons/baby.svg', label: '换尿布' },
  pee: { color: '#A5D4C0', icon: '/assets/icons/waterdrop.svg', label: '小便' },
  poop: { color: '#7EBEA5', icon: '/assets/icons/poop.svg', label: '大便' },
  both: { color: '#5EA88A', icon: '/assets/icons/baby.svg', label: '大小便' },
  health: { color: '#F0B44A', icon: '/assets/icons/thermometer.svg', label: '健康' },
  temperature: { color: '#F0B44A', icon: '/assets/icons/thermometer.svg', label: '体温' },
  medication: { color: '#E8736C', icon: '/assets/icons/medicine.svg', label: '用药' },
  symptom: { color: '#F0B44A', icon: '/assets/icons/stethoscope.svg', label: '症状' },
  growth: { color: '#F5A5B8', icon: '/assets/icons/ruler.svg', label: '生长测量' },
  vaccine: { color: '#9B8EC4', icon: '/assets/icons/vaccine.svg', label: '疫苗' },
  milestone: { color: '#D4A97A', icon: '/assets/icons/star.svg', label: '里程碑' },
};

Component({
  properties: {
    /**
     * 时间线事件列表
     * 每个 item: { id, type, typeName?, time, timeText, summary, color?, icon? }
     */
    events: {
      type: Array,
      value: [],
    },
    /** 是否显示空状态 */
    showEmpty: {
      type: Boolean,
      value: true,
    },
    /** 空状态提示文字 */
    emptyText: {
      type: String,
      value: '今日暂无记录',
    },
    /** 是否可点击 */
    clickable: {
      type: Boolean,
      value: true,
    },
    /** 最大显示条数，0表示不限制 */
    maxCount: {
      type: Number,
      value: 0,
    },
  },

  observers: {
    'events, maxCount': function(events: any[], maxCount: number) {
      if (!events || events.length === 0) {
        this.setData({ displayEvents: [], hasMore: false });
        return;
      }

      // 为每个事件补充配色信息
      const enriched = events.map((evt: any) => {
        const config = TYPE_CONFIG[evt.type] || { color: '#9CA3AF', icon: '📝', label: evt.type };
        return {
          ...evt,
          color: evt.color || config.color,
          icon: evt.icon || config.icon,
          typeName: evt.typeName || config.label,
        };
      });

      const hasMore = maxCount > 0 && enriched.length > maxCount;
      const displayEvents = maxCount > 0 ? enriched.slice(0, maxCount) : enriched;

      this.setData({ displayEvents, hasMore, totalCount: events.length });
    },
  },

  data: {
    displayEvents: [] as any[],
    hasMore: false,
    totalCount: 0,
  },

  methods: {
    /** 单条事件点击 */
    onEventTap(e: WechatMiniprogram.TouchEvent) {
      if (!this.data.clickable) return;
      const index = e.currentTarget.dataset.index;
      const event = this.data.displayEvents[index];
      this.triggerEvent('eventtap', { index, event });
    },

    /** 查看更多 */
    onShowMore() {
      this.triggerEvent('showmore');
    },
  },
});

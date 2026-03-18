/**
 * TrendChart 通用趋势图组件
 * 基于微信小程序 Canvas 2D 绘制柱状图（支持堆叠）
 * 用于展示近7天喂养/睡眠/排便趋势
 */

/** 图表配置常量 */
const CHART_CONFIG = {
  padding: { top: 20, right: 20, bottom: 45, left: 45 },
  colors: {
    grid: '#F3F4F6',
    axis: '#E5E7EB',
    axisLabel: '#8B7B6B',
    valueLabelColor: '#6B5E52',
    todayHighlight: 'rgba(200, 149, 108, 0.08)',
  },
  /** 默认数据系列颜色 */
  seriesColors: [
    '#C8956C', // 暖棕 - 主色
    '#93C5FD', // 淡蓝
    '#6EE7B7', // 淡绿
    '#FBBF24', // 金黄
    '#F9A8D4', // 粉色
  ],
  barRadius: 4,
  barMaxWidth: 28,
  barGroupGap: 0.35, // 柱组之间留白比例
};

/** 图例项 */
interface LegendItem {
  name: string;
  color: string;
}

Component({
  properties: {
    /** 图表标题 */
    title: {
      type: String,
      value: '',
    },
    /** 图表副标题 */
    subtitle: {
      type: String,
      value: '',
    },
    /** X 轴标签数组 */
    labels: {
      type: Array,
      value: [],
    },
    /**
     * 数据系列数组
     * 每项: { name: string, data: number[], color?: string, stacked?: boolean }
     */
    series: {
      type: Array,
      value: [],
    },
    /** Y 轴单位 */
    unit: {
      type: String,
      value: '',
    },
    /** Y 轴最小值（可选，默认自动） */
    minY: {
      type: Number,
      value: -1, // -1 表示自动
    },
    /** Y 轴最大值（可选，默认自动） */
    maxY: {
      type: Number,
      value: -1,
    },
    /** 是否堆叠模式 */
    stacked: {
      type: Boolean,
      value: false,
    },
    /** Canvas 宽度 rpx */
    width: {
      type: Number,
      value: 690,
    },
    /** Canvas 高度 rpx */
    height: {
      type: Number,
      value: 360,
    },
    /** 高亮最后一个柱（今天） */
    highlightLast: {
      type: Boolean,
      value: true,
    },
  },

  observers: {
    'labels, series, stacked, minY, maxY': function () {
      if (this._ready) {
        this.drawChart();
      }
    },
  },

  data: {
    canvasId: '',
    isEmpty: true,
    legendItems: [] as LegendItem[],
  },

  lifetimes: {
    attached() {
      this._ready = false;
      const canvasId = `trend-chart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      this.setData({ canvasId });
    },
    ready() {
      this._ready = true;
      this._updateLegend();
      setTimeout(() => this.drawChart(), 100);
    },
  },

  methods: {
    /**
     * 更新图例数据
     */
    _updateLegend() {
      const seriesArr = this.data.series as any[];
      if (!seriesArr || seriesArr.length === 0) {
        this.setData({ legendItems: [], isEmpty: true });
        return;
      }

      const legendItems: LegendItem[] = seriesArr.map((s: any, i: number) => ({
        name: s.name || `系列${i + 1}`,
        color: s.color || CHART_CONFIG.seriesColors[i % CHART_CONFIG.seriesColors.length],
      }));

      // 判空：所有系列所有数据都是 0 则视为空
      const hasData = seriesArr.some((s: any) => (s.data || []).some((v: number) => v > 0));

      this.setData({ legendItems, isEmpty: !hasData });
    },

    /**
     * 主绘制方法
     */
    drawChart() {
      this._updateLegend();

      const seriesArr = this.data.series as any[];
      const labels = this.data.labels as string[];

      if (!seriesArr || seriesArr.length === 0 || !labels || labels.length === 0) {
        return;
      }

      const query = this.createSelectorQuery();
      query
        .select(`#${this.data.canvasId}`)
        .fields({ node: true, size: true })
        .exec((res: any) => {
          if (!res || !res[0] || !res[0].node) {
            console.warn('[TrendChart] Canvas node not found');
            return;
          }

          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getWindowInfo().pixelRatio || 2;
          const canvasWidth = res[0].width;
          const canvasHeight = res[0].height;

          canvas.width = canvasWidth * dpr;
          canvas.height = canvasHeight * dpr;
          ctx.scale(dpr, dpr);

          // 清除画布
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);

          const padding = CHART_CONFIG.padding;
          const chartWidth = canvasWidth - padding.left - padding.right;
          const chartHeight = canvasHeight - padding.top - padding.bottom;
          const barCount = labels.length;

          // 计算 Y 轴范围
          const { yMin, yMax } = this._computeYRange(seriesArr);

          // 坐标转换
          const toY = (value: number) => {
            if (yMax === yMin) return padding.top + chartHeight;
            return padding.top + (1 - (value - yMin) / (yMax - yMin)) * chartHeight;
          };

          // 每组宽度
          const groupWidth = chartWidth / barCount;

          // 1. 绘制网格和坐标轴
          this._drawGrid(ctx, padding, chartWidth, chartHeight, yMin, yMax, toY);

          // 2. 高亮今天（最后一个柱组）
          if (this.data.highlightLast && barCount > 0) {
            const lastGroupX = padding.left + (barCount - 1) * groupWidth;
            ctx.fillStyle = CHART_CONFIG.colors.todayHighlight;
            ctx.fillRect(lastGroupX, padding.top, groupWidth, chartHeight);
          }

          // 3. 绘制柱状图
          if (this.data.stacked) {
            this._drawStackedBars(
              ctx,
              seriesArr,
              labels,
              padding,
              groupWidth,
              chartHeight,
              yMin,
              yMax,
              toY,
            );
          } else {
            this._drawGroupedBars(
              ctx,
              seriesArr,
              labels,
              padding,
              groupWidth,
              chartHeight,
              yMin,
              yMax,
              toY,
            );
          }

          // 4. 绘制 X 轴标签
          this._drawXLabels(ctx, labels, padding, groupWidth, chartHeight);

          // 5. 绘制 Y 轴标签
          this._drawYLabels(ctx, padding, chartHeight, yMin, yMax, toY);
        });
    },

    /**
     * 计算 Y 轴范围
     */
    _computeYRange(seriesArr: any[]): { yMin: number; yMax: number } {
      const yMin = this.data.minY >= 0 ? this.data.minY : 0;
      let yMax = this.data.maxY > 0 ? this.data.maxY : -1;

      if (yMax < 0) {
        // 自动计算 Y 轴最大值
        if (this.data.stacked) {
          // 堆叠模式：取每个 index 处各系列值之和的最大值
          const barCount = (this.data.labels as string[]).length;
          let maxSum = 0;
          for (let i = 0; i < barCount; i++) {
            let sum = 0;
            seriesArr.forEach((s: any) => {
              sum += (s.data && s.data[i]) || 0;
            });
            maxSum = Math.max(maxSum, sum);
          }
          yMax = maxSum;
        } else {
          // 分组模式：取所有值的最大值
          let maxVal = 0;
          seriesArr.forEach((s: any) => {
            (s.data || []).forEach((v: number) => {
              maxVal = Math.max(maxVal, v || 0);
            });
          });
          yMax = maxVal;
        }

        // 上留 20% 空间，至少为 1
        yMax = Math.max(1, Math.ceil(yMax * 1.2));
      }

      return { yMin, yMax };
    },

    /**
     * 绘制网格线
     */
    _drawGrid(
      ctx: any,
      padding: any,
      chartWidth: number,
      chartHeight: number,
      yMin: number,
      yMax: number,
      toY: (v: number) => number,
    ) {
      ctx.strokeStyle = CHART_CONFIG.colors.grid;
      ctx.lineWidth = 0.5;

      const yStep = this._niceStep(yMin, yMax, 4);
      for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
        ctx.beginPath();
        ctx.moveTo(padding.left, toY(y));
        ctx.lineTo(padding.left + chartWidth, toY(y));
        ctx.stroke();
      }

      // X 轴线
      ctx.strokeStyle = CHART_CONFIG.colors.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top + chartHeight);
      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
      ctx.stroke();
    },

    /**
     * 绘制分组柱状图
     */
    _drawGroupedBars(
      ctx: any,
      seriesArr: any[],
      labels: string[],
      padding: any,
      groupWidth: number,
      chartHeight: number,
      yMin: number,
      yMax: number,
      toY: (v: number) => number,
    ) {
      const seriesCount = seriesArr.length;
      const gapRatio = CHART_CONFIG.barGroupGap;
      const usableWidth = groupWidth * (1 - gapRatio);
      const barWidth = Math.min(usableWidth / seriesCount, CHART_CONFIG.barMaxWidth);
      const totalBarsWidth = barWidth * seriesCount;
      const baselineY = toY(yMin);

      labels.forEach((_label: string, i: number) => {
        const groupCenterX = padding.left + (i + 0.5) * groupWidth;
        const groupStartX = groupCenterX - totalBarsWidth / 2;

        seriesArr.forEach((s: any, si: number) => {
          const value = (s.data && s.data[i]) || 0;
          if (value <= 0) return;

          const color = s.color || CHART_CONFIG.seriesColors[si % CHART_CONFIG.seriesColors.length];
          const barX = groupStartX + si * barWidth;
          const barTop = toY(value);
          const barH = baselineY - barTop;

          // 绘制圆角柱
          this._drawRoundedBar(
            ctx,
            barX,
            barTop,
            barWidth - 2,
            barH,
            CHART_CONFIG.barRadius,
            color,
          );

          // 柱顶数值标签
          if (value > 0) {
            ctx.font = '9px PingFang SC';
            ctx.fillStyle = CHART_CONFIG.colors.valueLabelColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(this._formatValue(value), barX + (barWidth - 2) / 2, barTop - 3);
          }
        });
      });
    },

    /**
     * 绘制堆叠柱状图
     */
    _drawStackedBars(
      ctx: any,
      seriesArr: any[],
      labels: string[],
      padding: any,
      groupWidth: number,
      chartHeight: number,
      yMin: number,
      yMax: number,
      toY: (v: number) => number,
    ) {
      const gapRatio = CHART_CONFIG.barGroupGap;
      const barWidth = Math.min(groupWidth * (1 - gapRatio), CHART_CONFIG.barMaxWidth);
      const baselineY = toY(yMin);

      labels.forEach((_label: string, i: number) => {
        const groupCenterX = padding.left + (i + 0.5) * groupWidth;
        const barX = groupCenterX - barWidth / 2;
        let currentBottom = baselineY;

        // 从下往上堆叠
        seriesArr.forEach((s: any, si: number) => {
          const value = (s.data && s.data[i]) || 0;
          if (value <= 0) return;

          const color = s.color || CHART_CONFIG.seriesColors[si % CHART_CONFIG.seriesColors.length];
          const barH = baselineY - toY(value);
          const barTop = currentBottom - barH;

          // 最上层才有圆角
          const isTopmost = this._isTopmostSegment(seriesArr, i, si);
          const radius = isTopmost ? CHART_CONFIG.barRadius : 0;

          this._drawRoundedBar(ctx, barX, barTop, barWidth, barH, radius, color);

          currentBottom = barTop;
        });

        // 堆叠总值标签
        const totalValue = seriesArr.reduce(
          (sum: number, s: any) => sum + ((s.data && s.data[i]) || 0),
          0,
        );
        if (totalValue > 0) {
          const totalBarTop = toY(totalValue);
          ctx.font = '9px PingFang SC';
          ctx.fillStyle = CHART_CONFIG.colors.valueLabelColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(this._formatValue(totalValue), groupCenterX, totalBarTop - 3);
        }
      });
    },

    /**
     * 判断堆叠中是否为最顶层segment
     */
    _isTopmostSegment(seriesArr: any[], barIndex: number, seriesIndex: number): boolean {
      for (let si = seriesArr.length - 1; si > seriesIndex; si--) {
        const val = (seriesArr[si].data && seriesArr[si].data[barIndex]) || 0;
        if (val > 0) return false;
      }
      return true;
    },

    /**
     * 绘制圆角矩形柱
     */
    _drawRoundedBar(
      ctx: any,
      x: number,
      y: number,
      w: number,
      h: number,
      radius: number,
      color: string,
    ) {
      if (h <= 0) return;

      const r = Math.min(radius, w / 2, h / 2);
      ctx.fillStyle = color;
      ctx.beginPath();

      if (r > 0) {
        // 顶部圆角
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
      } else {
        ctx.rect(x, y, w, h);
      }

      ctx.closePath();
      ctx.fill();
    },

    /**
     * 绘制 X 轴标签
     */
    _drawXLabels(
      ctx: any,
      labels: string[],
      padding: any,
      groupWidth: number,
      chartHeight: number,
    ) {
      ctx.font = '10px PingFang SC';
      ctx.fillStyle = CHART_CONFIG.colors.axisLabel;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      labels.forEach((label: string, i: number) => {
        const x = padding.left + (i + 0.5) * groupWidth;
        const y = padding.top + chartHeight + 8;

        // 今天加粗
        if (this.data.highlightLast && i === labels.length - 1) {
          ctx.font = 'bold 10px PingFang SC';
          ctx.fillStyle = '#C8956C';
          ctx.fillText('今天', x, y);
          ctx.font = '10px PingFang SC';
          ctx.fillStyle = CHART_CONFIG.colors.axisLabel;
        } else {
          ctx.fillText(label, x, y);
        }
      });
    },

    /**
     * 绘制 Y 轴标签
     */
    _drawYLabels(
      ctx: any,
      padding: any,
      chartHeight: number,
      yMin: number,
      yMax: number,
      toY: (v: number) => number,
    ) {
      ctx.font = '10px PingFang SC';
      ctx.fillStyle = CHART_CONFIG.colors.axisLabel;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      const yStep = this._niceStep(yMin, yMax, 4);
      for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
        const py = toY(y);
        const label = Number.isInteger(y) ? y.toString() : y.toFixed(1);
        ctx.fillText(label, padding.left - 8, py);
      }

      // 单位标签
      if (this.data.unit) {
        ctx.font = '9px PingFang SC';
        ctx.textAlign = 'left';
        ctx.fillText(`(${this.data.unit})`, padding.left - 8, padding.top - 10);
      }
    },

    /**
     * 格式化数值显示
     */
    _formatValue(value: number): string {
      if (value === 0) return '';
      if (Number.isInteger(value)) return value.toString();
      return value.toFixed(1);
    },

    /**
     * 计算合适的刻度步长
     */
    _niceStep(min: number, max: number, targetCount: number): number {
      const range = max - min;
      if (range <= 0) return 1;

      const rawStep = range / targetCount;
      const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
      const normalized = rawStep / magnitude;

      let niceStep: number;
      if (normalized <= 1) niceStep = 1;
      else if (normalized <= 2) niceStep = 2;
      else if (normalized <= 5) niceStep = 5;
      else niceStep = 10;

      return niceStep * magnitude;
    },
  } as any,
});

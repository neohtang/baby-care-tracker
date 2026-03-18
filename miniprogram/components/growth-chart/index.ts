/**
 * GrowthChart 生长曲线图组件
 * 基于微信小程序 Canvas 2D 绘制身高/体重/头围曲线
 * 叠加 WHO 标准百分位区间（P3/P15/P50/P85/P97）
 */

/** 图表配置常量 */
const CHART_CONFIG = {
  padding: { top: 40, right: 30, bottom: 50, left: 55 },
  colors: {
    /** WHO 百分位区间填充色 */
    whoP3_P97: 'rgba(200, 149, 108, 0.06)',
    whoP15_P85: 'rgba(200, 149, 108, 0.10)',
    whoP50: 'rgba(200, 149, 108, 0.35)',
    /** WHO 百分位线颜色 */
    whoLine: 'rgba(200, 149, 108, 0.2)',
    whoMedian: 'rgba(200, 149, 108, 0.45)',
    /** 宝宝数据线 */
    dataLine: '#C8956C',
    dataPoint: '#C8956C',
    dataPointStroke: '#FFFFFF',
    /** 网格和坐标轴 */
    grid: '#F3F4F6',
    axis: '#E5E7EB',
    axisLabel: '#8B7B6B',
    axisTitle: '#6B5E52',
  },
  /** 百分位标签 */
  percentileLabels: ['P3', 'P15', 'P50', 'P85', 'P97'],
};

/** 指标配置 */
const METRIC_CONFIG: Record<string, { label: string; unit: string; yRange: number[] }> = {
  weight: { label: '体重', unit: 'kg', yRange: [2, 14] },
  height: { label: '身长', unit: 'cm', yRange: [40, 85] },
  headCircumference: { label: '头围', unit: 'cm', yRange: [30, 50] },
};

Component({
  properties: {
    /** 图表类型：weight / height / headCircumference */
    type: {
      type: String,
      value: 'weight',
    },
    /** 性别：male / female（影响 WHO 标准） */
    gender: {
      type: String,
      value: 'male',
    },
    /**
     * WHO 标准数据
     * 数组，每项: { month, p3, p15, p50, p85, p97 }
     */
    whoData: {
      type: Array,
      value: [],
    },
    /**
     * 宝宝实际测量数据
     * 数组，每项: { month, value }
     */
    babyData: {
      type: Array,
      value: [],
    },
    /** Canvas 宽度 rpx */
    width: {
      type: Number,
      value: 690,
    },
    /** Canvas 高度 rpx */
    height: {
      type: Number,
      value: 450,
    },
  },

  observers: {
    'type, gender, whoData, babyData': function () {
      // 数据变化时重绘
      if (this._ready) {
        this.drawChart();
      }
    },
  },

  data: {
    canvasId: '',
    metricLabel: '体重',
    metricUnit: 'kg',
  },

  lifetimes: {
    attached() {
      this._ready = false;
      // 生成唯一 canvas id
      const canvasId = `growth-chart-${Date.now()}`;
      const config = METRIC_CONFIG[this.data.type] || METRIC_CONFIG.weight;
      this.setData({
        canvasId,
        metricLabel: config.label,
        metricUnit: config.unit,
      });
    },
    ready() {
      this._ready = true;
      // 延迟绘制确保 canvas 已挂载
      setTimeout(() => this.drawChart(), 100);
    },
  },

  methods: {
    /**
     * 主绘制方法
     */
    drawChart() {
      const query = this.createSelectorQuery();
      query
        .select(`#${this.data.canvasId}`)
        .fields({ node: true, size: true })
        .exec((res: any) => {
          if (!res || !res[0] || !res[0].node) {
            console.warn('[GrowthChart] Canvas node not found');
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

          const config = METRIC_CONFIG[this.data.type] || METRIC_CONFIG.weight;
          const padding = CHART_CONFIG.padding;
          const chartWidth = canvasWidth - padding.left - padding.right;
          const chartHeight = canvasHeight - padding.top - padding.bottom;

          // X 轴范围：0-12 月龄
          const xMin = 0;
          const xMax = 12;

          // Y 轴范围
          let yMin = config.yRange[0];
          let yMax = config.yRange[1];

          // 根据数据自适应 Y 轴
          const allYValues: number[] = [];
          if (this.data.whoData && this.data.whoData.length > 0) {
            (this.data.whoData as any[]).forEach((d: any) => {
              allYValues.push(d.p3, d.p97);
            });
          }
          if (this.data.babyData && this.data.babyData.length > 0) {
            (this.data.babyData as any[]).forEach((d: any) => {
              if (d.value !== undefined && d.value !== null) allYValues.push(d.value);
            });
          }
          if (allYValues.length > 0) {
            const dataMin = Math.min(...allYValues);
            const dataMax = Math.max(...allYValues);
            yMin = Math.floor(dataMin * 0.9);
            yMax = Math.ceil(dataMax * 1.05);
          }

          // 坐标转换函数
          const toX = (month: number) =>
            padding.left + ((month - xMin) / (xMax - xMin)) * chartWidth;
          const toY = (value: number) =>
            padding.top + (1 - (value - yMin) / (yMax - yMin)) * chartHeight;

          // 1. 绘制网格
          this._drawGrid(ctx, padding, chartWidth, chartHeight, xMin, xMax, yMin, yMax, toX, toY);

          // 2. 绘制 WHO 百分位区间
          if (this.data.whoData && this.data.whoData.length > 0) {
            this._drawWHOBands(ctx, this.data.whoData as any[], toX, toY);
          }

          // 3. 绘制宝宝数据线和点
          if (this.data.babyData && this.data.babyData.length > 0) {
            this._drawBabyData(ctx, this.data.babyData as any[], toX, toY);
          }

          // 4. 绘制坐标轴标签
          this._drawAxisLabels(
            ctx,
            padding,
            chartWidth,
            chartHeight,
            xMin,
            xMax,
            yMin,
            yMax,
            toX,
            toY,
            config,
          );
        });
    },

    /** 绘制网格 */
    _drawGrid(
      ctx: any,
      padding: any,
      chartWidth: number,
      chartHeight: number,
      xMin: number,
      xMax: number,
      yMin: number,
      yMax: number,
      toX: (v: number) => number,
      toY: (v: number) => number,
    ) {
      ctx.strokeStyle = CHART_CONFIG.colors.grid;
      ctx.lineWidth = 0.5;

      // 水平网格线
      const yStep = this._niceStep(yMin, yMax, 5);
      for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
        ctx.beginPath();
        ctx.moveTo(padding.left, toY(y));
        ctx.lineTo(padding.left + chartWidth, toY(y));
        ctx.stroke();
      }

      // 垂直网格线
      for (let x = xMin; x <= xMax; x += 1) {
        ctx.beginPath();
        ctx.moveTo(toX(x), padding.top);
        ctx.lineTo(toX(x), padding.top + chartHeight);
        ctx.stroke();
      }

      // 坐标轴线
      ctx.strokeStyle = CHART_CONFIG.colors.axis;
      ctx.lineWidth = 1;
      // X 轴
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top + chartHeight);
      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
      ctx.stroke();
      // Y 轴
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, padding.top + chartHeight);
      ctx.stroke();
    },

    /** 绘制 WHO 百分位区间 */
    _drawWHOBands(
      ctx: any,
      whoData: any[],
      toX: (v: number) => number,
      toY: (v: number) => number,
    ) {
      if (whoData.length < 2) return;

      // P3-P97 填充区间
      ctx.fillStyle = CHART_CONFIG.colors.whoP3_P97;
      ctx.beginPath();
      whoData.forEach((d: any, i: number) => {
        const x = toX(d.month);
        if (i === 0) ctx.moveTo(x, toY(d.p97));
        else ctx.lineTo(x, toY(d.p97));
      });
      for (let i = whoData.length - 1; i >= 0; i--) {
        ctx.lineTo(toX(whoData[i].month), toY(whoData[i].p3));
      }
      ctx.closePath();
      ctx.fill();

      // P15-P85 填充区间
      ctx.fillStyle = CHART_CONFIG.colors.whoP15_P85;
      ctx.beginPath();
      whoData.forEach((d: any, i: number) => {
        const x = toX(d.month);
        if (i === 0) ctx.moveTo(x, toY(d.p85));
        else ctx.lineTo(x, toY(d.p85));
      });
      for (let i = whoData.length - 1; i >= 0; i--) {
        ctx.lineTo(toX(whoData[i].month), toY(whoData[i].p15));
      }
      ctx.closePath();
      ctx.fill();

      // 百分位线
      const percentileKeys = ['p3', 'p15', 'p50', 'p85', 'p97'];
      percentileKeys.forEach((key: string) => {
        const isMedian = key === 'p50';
        ctx.strokeStyle = isMedian ? CHART_CONFIG.colors.whoMedian : CHART_CONFIG.colors.whoLine;
        ctx.lineWidth = isMedian ? 1.5 : 0.8;
        if (!isMedian) {
          ctx.setLineDash([4, 4]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        whoData.forEach((d: any, i: number) => {
          const x = toX(d.month);
          const y = toY(d[key]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // 百分位标签（右侧）
      ctx.font = '9px PingFang SC';
      ctx.fillStyle = CHART_CONFIG.colors.axisLabel;
      ctx.textAlign = 'left';
      const lastWho = whoData[whoData.length - 1];
      if (lastWho) {
        const labels = ['P3', 'P15', 'P50', 'P85', 'P97'];
        const keys = ['p3', 'p15', 'p50', 'p85', 'p97'];
        keys.forEach((key: string, i: number) => {
          const x = toX(lastWho.month) + 4;
          const y = toY(lastWho[key]);
          ctx.fillText(labels[i], x, y + 3);
        });
      }
    },

    /** 绘制宝宝数据 */
    _drawBabyData(
      ctx: any,
      babyData: any[],
      toX: (v: number) => number,
      toY: (v: number) => number,
    ) {
      const validData = babyData.filter((d: any) => d.value !== undefined && d.value !== null);
      if (validData.length === 0) return;

      // 数据连线
      if (validData.length > 1) {
        ctx.strokeStyle = CHART_CONFIG.colors.dataLine;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        validData.forEach((d: any, i: number) => {
          const x = toX(d.month);
          const y = toY(d.value);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // 数据点
      validData.forEach((d: any) => {
        const x = toX(d.month);
        const y = toY(d.value);

        // 外圈白色描边
        ctx.fillStyle = CHART_CONFIG.colors.dataPointStroke;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        // 内圈主色
        ctx.fillStyle = CHART_CONFIG.colors.dataPoint;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // 最新数据点高亮（光晕效果）
      if (validData.length > 0) {
        const last = validData[validData.length - 1];
        const x = toX(last.month);
        const y = toY(last.value);

        ctx.fillStyle = 'rgba(200, 149, 108, 0.15)';
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /** 绘制坐标轴标签 */
    _drawAxisLabels(
      ctx: any,
      padding: any,
      chartWidth: number,
      chartHeight: number,
      xMin: number,
      xMax: number,
      yMin: number,
      yMax: number,
      toX: (v: number) => number,
      toY: (v: number) => number,
      config: any,
    ) {
      ctx.font = '10px PingFang SC';
      ctx.fillStyle = CHART_CONFIG.colors.axisLabel;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // X 轴标签（月龄）
      for (let x = xMin; x <= xMax; x += 1) {
        const px = toX(x);
        ctx.fillText(`${x}`, px, padding.top + chartHeight + 8);
      }

      // X 轴标题
      ctx.font = '11px PingFang SC';
      ctx.fillStyle = CHART_CONFIG.colors.axisTitle;
      ctx.fillText('月龄', padding.left + chartWidth / 2, padding.top + chartHeight + 28);

      // Y 轴标签
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = '10px PingFang SC';
      ctx.fillStyle = CHART_CONFIG.colors.axisLabel;

      const yStep = this._niceStep(yMin, yMax, 5);
      for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
        const py = toY(y);
        const label = Number.isInteger(y) ? y.toString() : y.toFixed(1);
        ctx.fillText(label, padding.left - 8, py);
      }

      // Y 轴标题
      ctx.save();
      ctx.translate(14, padding.top + chartHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.font = '11px PingFang SC';
      ctx.fillStyle = CHART_CONFIG.colors.axisTitle;
      ctx.fillText(`${config.label}(${config.unit})`, 0, 0);
      ctx.restore();
    },

    /** 计算合适的刻度步长 */
    _niceStep(min: number, max: number, targetCount: number): number {
      const range = max - min;
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

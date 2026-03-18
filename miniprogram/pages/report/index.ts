// pages/report/index.ts
// 成长报告页面 — 生成周报/月报，支持 Canvas 分享图 (Phase 3.4)

import { reportService } from '../../services/report';
import type { ReportSummary } from '../../services/report';
import { babyService } from '../../services/baby';
import { store } from '../../store/index';

Page({
  data: {
    pageStyle: '',
    hasBaby: false,

    // 报告类型
    reportType: 'weekly' as 'weekly' | 'monthly',
    typeOptions: [
      { label: '周报', value: 'weekly' },
      { label: '月报', value: 'monthly' },
    ],

    // 偏移量（0=当前周/月，1=上一周/月...）
    offset: 0,
    offsetLabel: '本周',

    // 报告数据
    report: null as ReportSummary | null,
    hasReport: false,

    // Canvas 状态
    canvasReady: false,
    isDrawing: false,
    isExporting: false,
    tempImagePath: '',

    // 画布尺寸
    canvasWidth: 375,
    canvasHeight: 900,
  },

  _storeDisconnect: null as (() => void) | null,
  _canvas: null as any,
  _ctx: null as any,

  onLoad() {
    this._storeDisconnect = store.connect(this as any, {
      pageStyle: true,
    });

    const baby = babyService.getCurrentBaby();
    this.setData({ hasBaby: !!baby });

    if (baby) {
      this._generateReport();
    }
  },

  onUnload() {
    if (this._storeDisconnect) {
      this._storeDisconnect();
      this._storeDisconnect = null;
    }
  },

  // ============ 报告类型切换 ============

  onTypeChange(e: WechatMiniprogram.CustomEvent) {
    const type = e.currentTarget.dataset.type as 'weekly' | 'monthly';
    if (type === this.data.reportType) return;

    this.setData({
      reportType: type,
      offset: 0,
      tempImagePath: '',
    });
    this._updateOffsetLabel();
    this._generateReport();
  },

  // ============ 前后翻页 ============

  onPrevPeriod() {
    this.setData({
      offset: this.data.offset + 1,
      tempImagePath: '',
    });
    this._updateOffsetLabel();
    this._generateReport();
  },

  onNextPeriod() {
    if (this.data.offset <= 0) return;
    this.setData({
      offset: this.data.offset - 1,
      tempImagePath: '',
    });
    this._updateOffsetLabel();
    this._generateReport();
  },

  // ============ 生成报告 ============

  _generateReport() {
    const { reportType, offset } = this.data;
    let report: ReportSummary | null = null;

    if (reportType === 'weekly') {
      report = reportService.generateWeeklyReport(offset);
    } else {
      report = reportService.generateMonthlyReport(offset);
    }

    this.setData({
      report,
      hasReport: !!report,
    });
  },

  _updateOffsetLabel() {
    const { reportType, offset } = this.data;
    if (reportType === 'weekly') {
      if (offset === 0) this.setData({ offsetLabel: '本周' });
      else if (offset === 1) this.setData({ offsetLabel: '上周' });
      else this.setData({ offsetLabel: `${offset}周前` });
    } else {
      if (offset === 0) this.setData({ offsetLabel: '本月' });
      else if (offset === 1) this.setData({ offsetLabel: '上月' });
      else this.setData({ offsetLabel: `${offset}个月前` });
    }
  },

  // ============ Canvas 绘制与导出 ============

  onCanvasReady() {
    // Canvas 2D API：通过选择器获取 Canvas 实例
    const query = this.createSelectorQuery();
    query
      .select('#reportCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res && res[0]) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getWindowInfo().pixelRatio || 2;

          canvas.width = this.data.canvasWidth * dpr;
          canvas.height = this.data.canvasHeight * dpr;
          ctx.scale(dpr, dpr);

          this._canvas = canvas;
          this._ctx = ctx;
          this.setData({ canvasReady: true });
        }
      });
  },

  async onGenerateImage() {
    const { report } = this.data;
    if (!report) {
      wx.showToast({ title: '暂无报告数据', icon: 'none' });
      return;
    }

    if (!this._canvas || !this._ctx) {
      // 延迟等待 Canvas 初始化
      this.onCanvasReady();
      wx.showToast({ title: '正在初始化画布...', icon: 'none' });
      return;
    }

    this.setData({ isDrawing: true });

    try {
      // 绘制报告
      reportService.drawReportImage(
        this._ctx,
        report,
        this.data.canvasWidth,
        this.data.canvasHeight,
      );

      // 导出为图片
      const tempPath = await reportService.canvasToImage(this._canvas);
      this.setData({
        tempImagePath: tempPath,
        isDrawing: false,
      });
    } catch (err) {
      console.error('生成报告图片失败', err);
      wx.showToast({ title: '生成图片失败', icon: 'none' });
      this.setData({ isDrawing: false });
    }
  },

  async onShareImage() {
    const { tempImagePath } = this.data;
    if (!tempImagePath) {
      await this.onGenerateImage();
      if (!this.data.tempImagePath) return;
    }
    reportService.shareReportImage(this.data.tempImagePath);
  },

  async onSaveImage() {
    const { tempImagePath } = this.data;
    if (!tempImagePath) {
      await this.onGenerateImage();
      if (!this.data.tempImagePath) return;
    }

    this.setData({ isExporting: true });
    await reportService.saveReportImage(this.data.tempImagePath);
    this.setData({ isExporting: false });
  },

  // ============ 分享 ============

  onShareAppMessage() {
    const { report } = this.data;
    return {
      title: report ? report.title : '宝宝成长报告',
      path: '/pages/report/index',
    };
  },
});

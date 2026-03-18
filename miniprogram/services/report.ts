/**
 * ReportService - 成长报告生成服务 (Phase 3.4)
 * 聚合宝宝数据生成周报/月报，支持 Canvas 绘制分享图
 */

import { babyService } from './baby';
import { statisticsService } from './statistics';
import { growthService } from './growth';
import { milestoneService } from './milestone';
import { feedingService } from './feeding';
import { sleepService } from './sleep';
import { diaperService } from './diaper';
import { formatDate, formatAge, getLastNDays, getDateRange, getWeekRange } from '../utils/date';

// ============ 报告数据类型 ============

/** 日汇总 */
interface DaySummary {
  date: string;
  dateLabel: string;
  feedingCount: number;
  breastCount: number;
  formulaCount: number;
  solidCount: number;
  totalFormulaML: number;
  sleepHours: number;
  napCount: number;
  diaperCount: number;
  peeCount: number;
  poopCount: number;
}

/** 报告摘要 */
export interface ReportSummary {
  /** 报告类型 */
  type: 'weekly' | 'monthly';
  /** 报告标题 */
  title: string;
  /** 日期范围 */
  dateRange: string;
  startDate: string;
  endDate: string;
  /** 宝宝信息 */
  babyName: string;
  babyAgeText: string;
  babyGender: string;
  /** 喂养汇总 */
  feedingTotal: number;
  feedingAvgPerDay: string;
  feedingBreastPercent: number;
  feedingFormulaPercent: number;
  feedingSolidPercent: number;
  feedingFormulaAvgML: string;
  /** 睡眠汇总 */
  sleepTotalHours: string;
  sleepAvgHoursPerDay: string;
  sleepNapAvg: string;
  /** 排便汇总 */
  diaperTotal: number;
  diaperAvgPerDay: string;
  diaperPeePercent: number;
  diaperPoopPercent: number;
  /** 生长数据 */
  latestWeight: string;
  latestHeight: string;
  latestHeadCirc: string;
  weightPercentile: string;
  heightPercentile: string;
  /** 里程碑 */
  milestoneAchieved: number;
  milestoneTotal: number;
  milestoneProgress: number;
  /** 每日数据（用于趋势图） */
  dailyData: DaySummary[];
  /** 生成时间 */
  generatedAt: string;
}

class ReportService {
  /**
   * 生成周报
   */
  generateWeeklyReport(weekOffset: number = 0): ReportSummary | null {
    const baby = babyService.getCurrentBaby();
    if (!baby) return null;

    const today = new Date();
    today.setDate(today.getDate() - weekOffset * 7);
    const dateStr = today.toISOString().substring(0, 10);
    const { start, end } = getWeekRange(dateStr);

    return this._generateReport('weekly', baby, start, end);
  }

  /**
   * 生成月报
   */
  generateMonthlyReport(monthOffset: number = 0): ReportSummary | null {
    const baby = babyService.getCurrentBaby();
    if (!baby) return null;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() - monthOffset;
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // 月末

    const start = startDate.toISOString().substring(0, 10);
    const end = endDate.toISOString().substring(0, 10);

    return this._generateReport('monthly', baby, start, end);
  }

  /**
   * 核心报告生成
   */
  private _generateReport(
    type: 'weekly' | 'monthly',
    baby: any,
    startDate: string,
    endDate: string,
  ): ReportSummary {
    const dates = getDateRange(startDate, endDate);
    const dayCount = dates.length;

    // 收集每日数据
    const dailyData: DaySummary[] = dates.map((date) => {
      const feedSummary = feedingService.getDailySummary(date);
      const sleepSummary = sleepService.getDailySummary(date);
      const diaperSummary = diaperService.getDailySummary(date);

      return {
        date,
        dateLabel: formatDate(date, 'MM/DD'),
        feedingCount: feedSummary.totalCount,
        breastCount: feedSummary.breastCount,
        formulaCount: feedSummary.formulaCount,
        solidCount: feedSummary.solidCount,
        totalFormulaML: feedSummary.totalFormulaAmount,
        sleepHours: Math.round((sleepSummary.totalDuration / 60) * 10) / 10,
        napCount: sleepSummary.napCount,
        diaperCount: diaperSummary.totalCount,
        peeCount: diaperSummary.peeCount,
        poopCount: diaperSummary.poopCount,
      };
    });

    // 汇总计算
    let feedingTotal = 0;
    let breastTotal = 0;
    let formulaTotal = 0;
    let solidTotal = 0;
    let formulaMLTotal = 0;
    let sleepHoursTotal = 0;
    let napTotal = 0;
    let diaperTotal = 0;
    let peeTotal = 0;
    let poopTotal = 0;

    dailyData.forEach((d) => {
      feedingTotal += d.feedingCount;
      breastTotal += d.breastCount;
      formulaTotal += d.formulaCount;
      solidTotal += d.solidCount;
      formulaMLTotal += d.totalFormulaML;
      sleepHoursTotal += d.sleepHours;
      napTotal += d.napCount;
      diaperTotal += d.diaperCount;
      peeTotal += d.peeCount;
      poopTotal += d.poopCount;
    });

    // 百分比计算
    const feedingTotalTypes = breastTotal + formulaTotal + solidTotal;
    const feedingBreastPercent =
      feedingTotalTypes > 0 ? Math.round((breastTotal / feedingTotalTypes) * 100) : 0;
    const feedingFormulaPercent =
      feedingTotalTypes > 0 ? Math.round((formulaTotal / feedingTotalTypes) * 100) : 0;
    const feedingSolidPercent =
      feedingTotalTypes > 0 ? 100 - feedingBreastPercent - feedingFormulaPercent : 0;

    const diaperTotalTypes = peeTotal + poopTotal;
    const diaperPeePercent =
      diaperTotalTypes > 0 ? Math.round((peeTotal / diaperTotalTypes) * 100) : 0;
    const diaperPoopPercent = diaperTotalTypes > 0 ? 100 - diaperPeePercent : 0;

    // 生长数据
    const growth = growthService.getLatestDisplay();

    // 里程碑
    const milestoneSummary = milestoneService.getSummary();

    // 报告标题
    const typeLabel = type === 'weekly' ? '周报' : '月报';
    const dateRangeText = `${formatDate(startDate, 'MM.DD')} - ${formatDate(endDate, 'MM.DD')}`;

    return {
      type,
      title: `${baby.name}的${typeLabel}`,
      dateRange: dateRangeText,
      startDate,
      endDate,
      babyName: baby.name,
      babyAgeText: formatAge(baby.birthDate),
      babyGender: baby.gender,
      feedingTotal,
      feedingAvgPerDay: (feedingTotal / dayCount).toFixed(1),
      feedingBreastPercent,
      feedingFormulaPercent,
      feedingSolidPercent,
      feedingFormulaAvgML:
        formulaTotal > 0 ? Math.round(formulaMLTotal / formulaTotal).toString() : '0',
      sleepTotalHours: sleepHoursTotal.toFixed(1),
      sleepAvgHoursPerDay: (sleepHoursTotal / dayCount).toFixed(1),
      sleepNapAvg: (napTotal / dayCount).toFixed(1),
      diaperTotal,
      diaperAvgPerDay: (diaperTotal / dayCount).toFixed(1),
      diaperPeePercent,
      diaperPoopPercent,
      latestWeight: growth.weight,
      latestHeight: growth.height,
      latestHeadCirc: growth.headCircumference,
      weightPercentile: growth.weightPercentile,
      heightPercentile: growth.heightPercentile,
      milestoneAchieved: milestoneSummary.achieved,
      milestoneTotal: milestoneSummary.total,
      milestoneProgress: milestoneSummary.progress,
      dailyData,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 使用 Canvas 2D 绘制报告分享图
   * @param canvas Canvas 2D 实例
   * @param report 报告数据
   * @param width 画布宽度
   * @param height 画布高度
   */
  drawReportImage(ctx: any, report: ReportSummary, width: number, height: number): void {
    const dpr = wx.getWindowInfo().pixelRatio || 2;
    const w = width;
    const h = height;

    // ---- 背景 ----
    ctx.fillStyle = '#FDF8F3';
    ctx.fillRect(0, 0, w, h);

    // ---- 顶部装饰条 ----
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#C8956C');
    grad.addColorStop(0.5, '#D4A97A');
    grad.addColorStop(1, '#E8C4A0');
    ctx.fillStyle = grad;
    this._roundRect(ctx, 0, 0, w, 120, 0);
    ctx.fill();

    // ---- 标题 ----
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(report.title, 32, 50);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(`${report.dateRange}  ·  ${report.babyAgeText}`, 32, 85);

    // ---- 数据卡片区域 ----
    let y = 145;

    // 喂养卡片
    y = this._drawCard(ctx, 20, y, w - 40, '喂养', '#D4A97A', [
      { label: '总次数', value: `${report.feedingTotal}次` },
      { label: '日均', value: `${report.feedingAvgPerDay}次` },
      {
        label: '构成',
        value: `母乳${report.feedingBreastPercent}% 配方${report.feedingFormulaPercent}%`,
      },
    ]);

    y += 16;

    // 睡眠卡片
    y = this._drawCard(ctx, 20, y, w - 40, '睡眠', '#7CAFD4', [
      { label: '总时长', value: `${report.sleepTotalHours}h` },
      { label: '日均', value: `${report.sleepAvgHoursPerDay}h` },
      { label: '日均小睡', value: `${report.sleepNapAvg}次` },
    ]);

    y += 16;

    // 排便卡片
    y = this._drawCard(ctx, 20, y, w - 40, '排便', '#6EE7B7', [
      { label: '总次数', value: `${report.diaperTotal}次` },
      { label: '日均', value: `${report.diaperAvgPerDay}次` },
      {
        label: '比例',
        value: `小便${report.diaperPeePercent}% 大便${report.diaperPoopPercent}%`,
      },
    ]);

    y += 16;

    // 生长数据
    if (report.latestWeight !== '--' || report.latestHeight !== '--') {
      y = this._drawCard(ctx, 20, y, w - 40, '生长发育', '#F5A5B8', [
        { label: '体重', value: `${report.latestWeight}kg` },
        { label: '身长', value: `${report.latestHeight}cm` },
        { label: '头围', value: `${report.latestHeadCirc}cm` },
      ]);
      y += 16;
    }

    // 里程碑
    if (report.milestoneAchieved > 0) {
      y = this._drawCard(ctx, 20, y, w - 40, '发育里程碑', '#FBBF24', [
        { label: '已达成', value: `${report.milestoneAchieved}/${report.milestoneTotal}` },
        { label: '进度', value: `${report.milestoneProgress}%` },
      ]);
      y += 16;
    }

    // ---- 趋势迷你柱状图 ----
    if (report.dailyData.length > 0) {
      y = this._drawMiniChart(ctx, 20, y, w - 40, report);
    }

    // ---- 底部水印 ----
    y += 20;
    ctx.fillStyle = '#B5A89C';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('宝宝养护追踪  ·  记录成长每一刻', w / 2, y);
    ctx.textAlign = 'left';
  }

  /** 绘制数据卡片 */
  private _drawCard(
    ctx: any,
    x: number,
    y: number,
    w: number,
    title: string,
    accentColor: string,
    items: { label: string; value: string }[],
  ): number {
    const cardH = 40 + items.length * 30;

    // 卡片背景
    ctx.fillStyle = '#FFFFFF';
    this._roundRect(ctx, x, y, w, cardH, 12);
    ctx.fill();

    // 卡片阴影效果（简化）
    ctx.strokeStyle = 'rgba(200,149,108,0.1)';
    ctx.lineWidth = 1;
    this._roundRect(ctx, x, y, w, cardH, 12);
    ctx.stroke();

    // 左侧色条
    ctx.fillStyle = accentColor;
    this._roundRect(ctx, x, y + 8, 4, cardH - 16, 2);
    ctx.fill();

    // 标题
    ctx.fillStyle = '#3D2E22';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(title, x + 20, y + 28);

    // 数据项
    ctx.font = '15px sans-serif';
    items.forEach((item, i) => {
      const itemY = y + 55 + i * 30;
      ctx.fillStyle = '#8B7B6B';
      ctx.fillText(item.label, x + 20, itemY);
      ctx.fillStyle = '#3D2E22';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(item.value, x + 100, itemY);
      ctx.font = '15px sans-serif';
    });

    return y + cardH;
  }

  /** 绘制迷你趋势柱状图 */
  private _drawMiniChart(ctx: any, x: number, y: number, w: number, report: ReportSummary): number {
    const chartH = 130;
    const data = report.dailyData;
    const barCount = data.length;

    // 卡片背景
    ctx.fillStyle = '#FFFFFF';
    this._roundRect(ctx, x, y, w, chartH, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(200,149,108,0.1)';
    ctx.lineWidth = 1;
    this._roundRect(ctx, x, y, w, chartH, 12);
    ctx.stroke();

    // 标题
    ctx.fillStyle = '#3D2E22';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('喂养趋势', x + 20, y + 28);

    // 柱状图区域
    const chartX = x + 20;
    const chartY = y + 45;
    const chartW = w - 40;
    const maxBarH = 60;
    const gap = 4;
    const barW = (chartW - gap * (barCount - 1)) / barCount;

    const maxVal = Math.max(...data.map((d) => d.feedingCount), 1);

    data.forEach((d, i) => {
      const barH = (d.feedingCount / maxVal) * maxBarH;
      const bx = chartX + i * (barW + gap);
      const by = chartY + maxBarH - barH;

      // 柱体
      ctx.fillStyle = '#D4A97A';
      this._roundRect(ctx, bx, by, barW, barH, 3);
      ctx.fill();

      // 日期标签
      ctx.fillStyle = '#B5A89C';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.dateLabel, bx + barW / 2, chartY + maxBarH + 16);
      ctx.textAlign = 'left';
    });

    return y + chartH;
  }

  /** 圆角矩形辅助 */
  private _roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  /**
   * 导出 Canvas 为临时图片路径
   */
  async canvasToImage(canvas: any): Promise<string> {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas,
        fileType: 'png',
        quality: 1,
        success: (res: any) => resolve(res.tempFilePath),
        fail: (err: any) => reject(err),
      });
    });
  }

  /**
   * 分享报告图片
   */
  async shareReportImage(tempFilePath: string): Promise<void> {
    return new Promise((resolve) => {
      wx.previewImage({
        current: tempFilePath,
        urls: [tempFilePath],
        success: () => resolve(),
        fail: () => {
          wx.showToast({ title: '预览失败', icon: 'none' });
          resolve();
        },
      });
    });
  }

  /**
   * 保存报告图片到相册
   */
  async saveReportImage(tempFilePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      wx.saveImageToPhotosAlbum({
        filePath: tempFilePath,
        success: () => {
          wx.showToast({ title: '已保存到相册', icon: 'success' });
          resolve(true);
        },
        fail: (err: any) => {
          if (err?.errMsg?.indexOf('auth deny') !== -1) {
            wx.showModal({
              title: '权限提示',
              content: '需要相册权限才能保存图片，请在设置中开启',
              confirmText: '去设置',
              success: (res) => {
                if (res.confirm) {
                  wx.openSetting({});
                }
              },
            });
          } else {
            wx.showToast({ title: '保存失败', icon: 'none' });
          }
          resolve(false);
        },
      });
    });
  }
}

export const reportService = new ReportService();
export default reportService;

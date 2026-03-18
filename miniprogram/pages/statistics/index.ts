/**
 * 数据统计页面
 * 展示近7天喂养/睡眠/排便趋势图
 */

import { statisticsService } from '../../services/statistics';
import { babyService } from '../../services/baby';
import { themeService } from '../../services/theme';
import { getShortDateLabel } from '../../utils/date';
import type { FeedingTrendPoint, SleepTrendPoint, DiaperTrendPoint } from '../../types/index';

Page({
  data: {
    // 日期范围
    dateRangeText: '',

    // 图表宽度（rpx，稍后根据屏幕计算）
    chartWidth: 640,

    // 喂养趋势
    feedingLabels: [] as string[],
    feedingSeries: [] as any[],
    feedingAvg: '0',
    feedingFormulaAvg: '0',

    // 睡眠趋势
    sleepLabels: [] as string[],
    sleepSeries: [] as any[],
    sleepAvgHours: '0',
    sleepNightAvg: '0',

    // 排便趋势
    diaperLabels: [] as string[],
    diaperSeries: [] as any[],
    diaperAvg: '0',
    diaperPoopAvg: '0',

    // 主题
    pageStyle: '',
  },

  onLoad() {
    // 计算图表宽度：屏幕宽度 - 卡片padding(28*2) - 页面margin(24*2) - 图表区域负margin(8*2)
    // 粗略取 屏幕宽 - 120rpx
    try {
      const windowInfo = wx.getWindowInfo();
      const screenWidthRpx = 750; // 标准 rpx
      // 卡片内容宽度 = 屏幕宽 - 页面左右margin(24*2) - 卡片内边距(28*2) + 图表区域负margin(8*2)
      const chartWidthRpx = screenWidthRpx - 48 - 56 + 16;
      this.setData({ chartWidth: chartWidthRpx });
    } catch {
      // 使用默认值
    }
  },

  onShow() {
    this.setData({ pageStyle: themeService.getPageStyle() });
    this.loadData();
  },

  /**
   * 加载所有趋势数据
   */
  loadData() {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return;

    const trendData = statisticsService.getWeeklyTrendData(babyId);

    // 日期范围文本
    const startLabel = getShortDateLabel(trendData.startDate);
    const endLabel = getShortDateLabel(trendData.endDate);
    const dateRangeText = `${startLabel} - ${endLabel}`;

    // ===== 喂养趋势 =====
    const feedingLabels = trendData.feeding.map((p: FeedingTrendPoint) => p.label);
    const feedingSeries = [
      {
        name: '母乳',
        data: trendData.feeding.map((p: FeedingTrendPoint) => p.breastCount),
        color: '#D4A97A',
      },
      {
        name: '配方奶',
        data: trendData.feeding.map((p: FeedingTrendPoint) => p.formulaCount),
        color: '#93C5FD',
      },
      {
        name: '辅食',
        data: trendData.feeding.map((p: FeedingTrendPoint) => p.solidCount),
        color: '#6EE7B7',
      },
    ];

    // 日均喂养次数
    const totalFeeding = trendData.feeding.reduce(
      (s: number, p: FeedingTrendPoint) => s + p.totalCount,
      0,
    );
    const feedingAvg = (totalFeeding / 7).toFixed(1);

    // 日均配方奶量
    const totalFormula = trendData.feeding.reduce(
      (s: number, p: FeedingTrendPoint) => s + p.totalFormulaAmount,
      0,
    );
    const feedingFormulaAvg = Math.round(totalFormula / 7).toString();

    // ===== 睡眠趋势 =====
    const sleepLabels = trendData.sleep.map((p: SleepTrendPoint) => p.label);
    const sleepSeries = [
      {
        name: '夜间',
        data: trendData.sleep.map((p: SleepTrendPoint) => p.nightHours),
        color: '#3B82F6',
      },
      {
        name: '日间',
        data: trendData.sleep.map((p: SleepTrendPoint) => p.napHours),
        color: '#93C5FD',
      },
    ];

    // 日均睡眠小时
    const totalSleep = trendData.sleep.reduce(
      (s: number, p: SleepTrendPoint) => s + p.totalHours,
      0,
    );
    const sleepAvgHours = (totalSleep / 7).toFixed(1);

    // 日均夜间睡眠
    const totalNight = trendData.sleep.reduce(
      (s: number, p: SleepTrendPoint) => s + p.nightHours,
      0,
    );
    const sleepNightAvg = (totalNight / 7).toFixed(1);

    // ===== 排便趋势 =====
    const diaperLabels = trendData.diaper.map((p: DiaperTrendPoint) => p.label);
    const diaperSeries = [
      {
        name: '小便',
        data: trendData.diaper.map((p: DiaperTrendPoint) => p.peeCount),
        color: '#FBBF24',
      },
      {
        name: '大便',
        data: trendData.diaper.map((p: DiaperTrendPoint) => p.poopCount),
        color: '#34D399',
      },
    ];

    // 日均排便次数
    const totalDiaper = trendData.diaper.reduce(
      (s: number, p: DiaperTrendPoint) => s + p.totalCount,
      0,
    );
    const diaperAvg = (totalDiaper / 7).toFixed(1);

    // 日均大便次数
    const totalPoop = trendData.diaper.reduce(
      (s: number, p: DiaperTrendPoint) => s + p.poopCount,
      0,
    );
    const diaperPoopAvg = (totalPoop / 7).toFixed(1);

    this.setData({
      dateRangeText,
      feedingLabels,
      feedingSeries,
      feedingAvg,
      feedingFormulaAvg,
      sleepLabels,
      sleepSeries,
      sleepAvgHours,
      sleepNightAvg,
      diaperLabels,
      diaperSeries,
      diaperAvg,
      diaperPoopAvg,
    });
  },
});

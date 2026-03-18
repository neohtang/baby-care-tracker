/**
 * 数据统计与趋势分析类型定义
 */

import type { FeedingDailySummary } from './feeding';
import type { SleepDailySummary } from './sleep';
import type { DiaperDailySummary } from './diaper';

/** 喂养周趋势数据点（单日） */
export interface FeedingTrendPoint {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 日期简短标签（如 "周一"、"03/15"） */
  label: string;
  /** 总喂养次数 */
  totalCount: number;
  /** 母乳次数 */
  breastCount: number;
  /** 配方奶次数 */
  formulaCount: number;
  /** 辅食次数 */
  solidCount: number;
  /** 配方奶总量 ml */
  totalFormulaAmount: number;
  /** 母乳总时长 分钟 */
  totalBreastDuration: number;
}

/** 睡眠周趋势数据点（单日） */
export interface SleepTrendPoint {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 日期简短标签 */
  label: string;
  /** 总睡眠时长（小时，保留1位小数） */
  totalHours: number;
  /** 日间小睡时长（小时） */
  napHours: number;
  /** 夜间睡眠时长（小时） */
  nightHours: number;
  /** 总次数 */
  totalCount: number;
}

/** 排便周趋势数据点（单日） */
export interface DiaperTrendPoint {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 日期简短标签 */
  label: string;
  /** 总换尿布次数 */
  totalCount: number;
  /** 小便次数 */
  peeCount: number;
  /** 大便次数 */
  poopCount: number;
  /** 是否有异常 */
  hasAlert: boolean;
}

/** 周趋势数据（7天） */
export interface WeeklyTrendData {
  /** 起始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
  /** 喂养趋势 */
  feeding: FeedingTrendPoint[];
  /** 睡眠趋势 */
  sleep: SleepTrendPoint[];
  /** 排便趋势 */
  diaper: DiaperTrendPoint[];
}

/** 趋势图数据系列 */
export interface TrendChartSeries {
  /** 系列名称 */
  name: string;
  /** 数据值数组 */
  data: number[];
  /** 系列颜色 */
  color: string;
  /** 是否为堆叠系列 */
  stacked?: boolean;
}

/** 趋势图配置 */
export interface TrendChartConfig {
  /** 图表标题 */
  title: string;
  /** X 轴标签 */
  labels: string[];
  /** 数据系列 */
  series: TrendChartSeries[];
  /** Y 轴单位 */
  unit: string;
  /** Y 轴最小值 */
  minY?: number;
  /** Y 轴最大值 */
  maxY?: number;
}

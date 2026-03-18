/**
 * StatisticsService - 统计服务门面（Facade）
 *
 * 委托给两个子模块：
 * - statistics-dashboard.ts：仪表盘摘要 + 时间线（首页使用）
 * - statistics-trend.ts：周趋势分析（数据统计页使用）
 *
 * Phase 1.3b 拆分：原 474 行 → 门面 ~60 行 + Dashboard ~320 行 + Trend ~100 行
 * 上层代码 import 路径无需变更。
 */

import { statisticsDashboardService } from './statistics-dashboard';
import { statisticsTrendService } from './statistics-trend';
import type {
  FeedingDailySummary,
  SleepDailySummary,
  DiaperDailySummary,
  TimelineEvent,
  FeedingTrendPoint,
  SleepTrendPoint,
  DiaperTrendPoint,
  WeeklyTrendData,
} from '../types/index';

class StatisticsService {
  // ==================== 仪表盘统计（委托 Dashboard） ====================

  getTodayFeedingSummary(babyId: string): FeedingDailySummary {
    return statisticsDashboardService.getTodayFeedingSummary(babyId);
  }

  getTodaySleepSummary(babyId: string): SleepDailySummary {
    return statisticsDashboardService.getTodaySleepSummary(babyId);
  }

  getTodayDiaperSummary(babyId: string): DiaperDailySummary {
    return statisticsDashboardService.getTodayDiaperSummary(babyId);
  }

  getLatestTemperature(babyId: string): { value: number | null; time: string; level: string } {
    return statisticsDashboardService.getLatestTemperature(babyId);
  }

  getDashboardSummary(babyId: string): {
    feedingCount: number;
    feedingDetail: string;
    sleepDuration: string;
    sleepHours: number;
    diaperCount: number;
    diaperDetail: string;
    temperature: string;
    temperatureLevel: string;
    hasAlert: boolean;
  } {
    return statisticsDashboardService.getDashboardSummary(babyId);
  }

  getTodayTimeline(babyId: string): TimelineEvent[] {
    return statisticsDashboardService.getTodayTimeline(babyId);
  }

  // ==================== 周趋势统计（委托 Trend） ====================

  getWeeklyFeedingTrend(babyId: string): FeedingTrendPoint[] {
    return statisticsTrendService.getWeeklyFeedingTrend(babyId);
  }

  getWeeklySleepTrend(babyId: string): SleepTrendPoint[] {
    return statisticsTrendService.getWeeklySleepTrend(babyId);
  }

  getWeeklyDiaperTrend(babyId: string): DiaperTrendPoint[] {
    return statisticsTrendService.getWeeklyDiaperTrend(babyId);
  }

  getWeeklyTrendData(babyId: string): WeeklyTrendData {
    return statisticsTrendService.getWeeklyTrendData(babyId);
  }
}

export const statisticsService = new StatisticsService();
export default statisticsService;

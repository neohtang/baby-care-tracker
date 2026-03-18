/**
 * StatisticsTrendService - 周趋势统计
 * 负责计算近7天喂养/睡眠/排便趋势数据
 * 从 statistics.ts 拆分而来（Phase 1.3b）
 */

import { feedingService } from './feeding';
import { sleepService } from './sleep';
import { diaperService } from './diaper';
import { getLastNDays, getWeekdayShort } from '../utils/date';
import type {
  FeedingTrendPoint,
  SleepTrendPoint,
  DiaperTrendPoint,
  WeeklyTrendData,
} from '../types/index';

class StatisticsTrendService {
  /**
   * 获取近7天喂养趋势数据
   */
  getWeeklyFeedingTrend(_babyId: string): FeedingTrendPoint[] {
    const days = getLastNDays(7);

    return days.map((date) => {
      const summary = feedingService.getDailySummary(date);
      return {
        date,
        label: getWeekdayShort(date),
        totalCount: summary.totalCount,
        breastCount: summary.breastCount,
        formulaCount: summary.formulaCount,
        solidCount: summary.solidCount,
        totalFormulaAmount: summary.totalFormulaAmount,
        totalBreastDuration: summary.totalBreastDuration,
      };
    });
  }

  /**
   * 获取近7天睡眠趋势数据
   */
  getWeeklySleepTrend(_babyId: string): SleepTrendPoint[] {
    const days = getLastNDays(7);

    return days.map((date) => {
      const summary = sleepService.getDailySummary(date);
      return {
        date,
        label: getWeekdayShort(date),
        totalHours: Math.round((summary.totalDuration / 60) * 10) / 10,
        napHours: Math.round((summary.napDuration / 60) * 10) / 10,
        nightHours: Math.round((summary.nightDuration / 60) * 10) / 10,
        totalCount: summary.totalCount,
      };
    });
  }

  /**
   * 获取近7天排便趋势数据
   */
  getWeeklyDiaperTrend(_babyId: string): DiaperTrendPoint[] {
    const days = getLastNDays(7);

    return days.map((date) => {
      const summary = diaperService.getDailySummary(date);
      return {
        date,
        label: getWeekdayShort(date),
        totalCount: summary.totalCount,
        peeCount: summary.peeCount,
        poopCount: summary.poopCount,
        hasAlert: summary.hasAlert,
      };
    });
  }

  /**
   * 获取完整的周趋势数据（三合一）
   */
  getWeeklyTrendData(babyId: string): WeeklyTrendData {
    const days = getLastNDays(7);
    return {
      startDate: days[0],
      endDate: days[days.length - 1],
      feeding: this.getWeeklyFeedingTrend(babyId),
      sleep: this.getWeeklySleepTrend(babyId),
      diaper: this.getWeeklyDiaperTrend(babyId),
    };
  }
}

export const statisticsTrendService = new StatisticsTrendService();
export default statisticsTrendService;

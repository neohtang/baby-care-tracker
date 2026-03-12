/**
 * StatisticsService - 统计计算服务
 * 首页仪表盘数据聚合、各模块按日统计
 */

import {
  feedingStorage,
  sleepStorage,
  diaperStorage,
  healthStorage,
} from './storage';
import { getToday, diffInMinutes, formatTime, formatDuration } from '../utils/date';
import type {
  FeedingRecord,
  FeedingDailySummary,
  SleepRecord,
  SleepDailySummary,
  DiaperRecord,
  DiaperDailySummary,
  HealthRecord,
  TimelineEvent,
} from '../types/index';

class StatisticsService {
  /**
   * 获取今日喂养统计
   */
  getTodayFeedingSummary(babyId: string): FeedingDailySummary {
    const today = getToday();
    const records = feedingStorage.getAll().filter(
      (r: FeedingRecord) => r.babyId === babyId && r.startTime.substring(0, 10) === today
    );

    const summary: FeedingDailySummary = {
      date: today,
      totalCount: records.length,
      breastCount: 0,
      formulaCount: 0,
      solidCount: 0,
      totalBreastDuration: 0,
      totalFormulaAmount: 0,
      totalSolidAmount: 0,
    };

    records.forEach((r: FeedingRecord) => {
      switch (r.type) {
        case 'breast':
          summary.breastCount++;
          summary.totalBreastDuration += r.duration || 0;
          break;
        case 'formula':
          summary.formulaCount++;
          summary.totalFormulaAmount += r.amount || 0;
          break;
        case 'solid':
          summary.solidCount++;
          summary.totalSolidAmount += r.amount || 0;
          break;
      }
    });

    return summary;
  }

  /**
   * 获取今日睡眠统计
   */
  getTodaySleepSummary(babyId: string): SleepDailySummary {
    const today = getToday();
    const records = sleepStorage.getAll().filter(
      (r: SleepRecord) => r.babyId === babyId && r.startTime.substring(0, 10) === today
    );

    const summary: SleepDailySummary = {
      date: today,
      totalCount: records.length,
      napCount: 0,
      nightCount: 0,
      totalDuration: 0,
      napDuration: 0,
      nightDuration: 0,
    };

    records.forEach((r: SleepRecord) => {
      const duration = r.duration || (r.endTime ? diffInMinutes(r.startTime, r.endTime) : 0);
      summary.totalDuration += duration;

      if (r.type === 'nap') {
        summary.napCount++;
        summary.napDuration += duration;
      } else {
        summary.nightCount++;
        summary.nightDuration += duration;
      }
    });

    return summary;
  }

  /**
   * 获取今日排便统计
   */
  getTodayDiaperSummary(babyId: string): DiaperDailySummary {
    const today = getToday();
    const records = diaperStorage.getAll().filter(
      (r: DiaperRecord) => r.babyId === babyId && r.time.substring(0, 10) === today
    );

    const summary: DiaperDailySummary = {
      date: today,
      totalCount: records.length,
      peeCount: 0,
      poopCount: 0,
      hasAlert: false,
      alerts: [],
    };

    records.forEach((r: DiaperRecord) => {
      if (r.type === 'pee') {
        summary.peeCount++;
      } else if (r.type === 'poop') {
        summary.poopCount++;
      } else if (r.type === 'both') {
        summary.peeCount++;
        summary.poopCount++;
      }

      if (r.alert && r.alert !== 'none') {
        summary.hasAlert = true;
        if (!summary.alerts.includes(r.alert)) {
          summary.alerts.push(r.alert);
        }
      }
    });

    return summary;
  }

  /**
   * 获取今日最近一次体温
   */
  getLatestTemperature(babyId: string): {
    value: number | null;
    time: string;
    level: string;
  } {
    const records = healthStorage.getAll().filter(
      (r: HealthRecord) =>
        r.babyId === babyId &&
        r.recordType === 'temperature' &&
        r.temperature !== undefined
    );

    if (records.length === 0) {
      return { value: null, time: '', level: 'normal' };
    }

    // 按时间倒序，取最近一条
    records.sort((a: HealthRecord, b: HealthRecord) =>
      new Date(b.time).getTime() - new Date(a.time).getTime()
    );

    const latest = records[0];
    return {
      value: latest.temperature!,
      time: latest.time,
      level: latest.temperatureLevel || this.getTemperatureLevel(latest.temperature!),
    };
  }

  /**
   * 根据体温值判断等级
   */
  private getTemperatureLevel(temp: number): string {
    if (temp < 36.0) return 'low';
    if (temp <= 37.3) return 'normal';
    if (temp <= 38.0) return 'mild_fever';
    if (temp <= 39.0) return 'moderate_fever';
    return 'high_fever';
  }

  /**
   * 获取首页仪表盘摘要数据
   */
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
    const feeding = this.getTodayFeedingSummary(babyId);
    const sleep = this.getTodaySleepSummary(babyId);
    const diaper = this.getTodayDiaperSummary(babyId);
    const temp = this.getLatestTemperature(babyId);

    // 构造喂养详情文本
    const feedingDetails: string[] = [];
    if (feeding.breastCount > 0) feedingDetails.push(`母乳${feeding.breastCount}次`);
    if (feeding.formulaCount > 0) feedingDetails.push(`配方${feeding.formulaCount}次`);
    if (feeding.solidCount > 0) feedingDetails.push(`辅食${feeding.solidCount}次`);

    // 构造排便详情文本
    const diaperDetails: string[] = [];
    if (diaper.peeCount > 0) diaperDetails.push(`小便${diaper.peeCount}次`);
    if (diaper.poopCount > 0) diaperDetails.push(`大便${diaper.poopCount}次`);

    const sleepHours = Math.round(sleep.totalDuration / 60 * 10) / 10;

    return {
      feedingCount: feeding.totalCount,
      feedingDetail: feedingDetails.join('·') || '暂无记录',
      sleepDuration: formatDuration(sleep.totalDuration),
      sleepHours,
      diaperCount: diaper.totalCount,
      diaperDetail: diaperDetails.join('·') || '暂无记录',
      temperature: temp.value !== null ? temp.value.toFixed(1) : '--',
      temperatureLevel: temp.level,
      hasAlert: diaper.hasAlert || temp.level === 'moderate_fever' || temp.level === 'high_fever',
    };
  }

  /**
   * 获取今日时间线事件
   */
  getTodayTimeline(babyId: string): TimelineEvent[] {
    const today = getToday();
    const events: TimelineEvent[] = [];

    // 喂养记录
    const feedingRecords = feedingStorage.getAll().filter(
      (r: FeedingRecord) => r.babyId === babyId && r.startTime.substring(0, 10) === today
    );
    feedingRecords.forEach((r: FeedingRecord) => {
      const typeMap: Record<string, { icon: string; label: string; color: string }> = {
        breast: { icon: '/assets/icons/breastfeed.svg', label: '母乳喂养', color: '#A78BFA' },
        formula: { icon: '/assets/icons/bottle.svg', label: '配方奶', color: '#7C6FE0' },
        solid: { icon: '/assets/icons/solid-food.svg', label: '辅食', color: '#F0ABFC' },
      };
      const config = typeMap[r.type] || typeMap.breast;

      let desc = '';
      if (r.type === 'breast') {
        const sideText = r.side === 'left' ? '左侧' : r.side === 'right' ? '右侧' : '双侧';
        desc = r.duration ? `${sideText} ${r.duration}分钟` : sideText;
      } else if (r.type === 'formula') {
        desc = r.amount ? `${r.amount}ml` : '';
        if (r.formulaBrand) desc += ` ${r.formulaBrand}`;
      } else if (r.type === 'solid') {
        desc = r.solidFood || '';
        if (r.amount) desc += ` ${r.amount}g`;
      }

      events.push({
        id: r.id,
        type: 'feeding',
        time: r.startTime,
        title: config.label,
        description: desc.trim(),
        icon: config.icon,
        color: config.color,
        recordId: r.id,
      });
    });

    // 睡眠记录
    const sleepRecords = sleepStorage.getAll().filter(
      (r: SleepRecord) => r.babyId === babyId && r.startTime.substring(0, 10) === today
    );
    sleepRecords.forEach((r: SleepRecord) => {
      const isNap = r.type === 'nap';
      const duration = r.duration || (r.endTime ? diffInMinutes(r.startTime, r.endTime) : 0);
      const desc = duration > 0 ? formatDuration(duration) : '进行中...';

      events.push({
        id: r.id,
        type: 'sleep',
        time: r.startTime,
        title: isNap ? '日间小睡' : '夜间睡眠',
        description: desc,
        icon: isNap ? '/assets/icons/sun.svg' : '/assets/icons/moon.svg',
        color: isNap ? '#93C5FD' : '#3B82F6',
        recordId: r.id,
      });
    });

    // 排便记录
    const diaperRecords = diaperStorage.getAll().filter(
      (r: DiaperRecord) => r.babyId === babyId && r.time.substring(0, 10) === today
    );
    diaperRecords.forEach((r: DiaperRecord) => {
      const typeMap: Record<string, { icon: string; label: string; color: string }> = {
        pee: { icon: '/assets/icons/waterdrop.svg', label: '小便', color: '#6EE7B7' },
        poop: { icon: '/assets/icons/poop.svg', label: '大便', color: '#34D399' },
        both: { icon: '/assets/icons/baby.svg', label: '大小便', color: '#059669' },
      };
      const config = typeMap[r.type] || typeMap.pee;
      let desc = '';
      if (r.type !== 'pee' && r.poopColor) {
        const colorMap: Record<string, string> = {
          yellow: '黄色', green: '绿色', brown: '棕色', black: '黑色',
          red: '红色', white: '白色', other: '其他',
        };
        desc = colorMap[r.poopColor] || '';
      }
      if (r.alert && r.alert !== 'none') {
        const alertMap: Record<string, string> = {
          diarrhea: '腹泻', constipation: '便秘',
          blood: '带血', mucus: '粘液',
        };
        desc += ` ${alertMap[r.alert] || ''}`;
      }

      events.push({
        id: r.id,
        type: 'diaper',
        time: r.time,
        title: config.label,
        description: desc.trim(),
        icon: config.icon,
        color: config.color,
        recordId: r.id,
      });
    });

    // 健康记录
    const healthRecords = healthStorage.getAll().filter(
      (r: HealthRecord) => r.babyId === babyId && r.time.substring(0, 10) === today
    );
    healthRecords.forEach((r: HealthRecord) => {
      let title = '';
      let desc = '';
      let icon = '/assets/icons/thermometer.svg';
      let color = '#FBBF24';

      if (r.recordType === 'temperature') {
        title = '体温测量';
        desc = r.temperature ? `${r.temperature.toFixed(1)}°C` : '';
        if (r.temperatureLevel === 'mild_fever' || r.temperatureLevel === 'moderate_fever' || r.temperatureLevel === 'high_fever') {
          icon = '/assets/icons/fever.svg';
          color = '#F87171';
        }
      } else if (r.recordType === 'medication') {
        title = '用药记录';
        desc = r.medicationName || '';
        if (r.medicationDosage) desc += ` ${r.medicationDosage}`;
        icon = '/assets/icons/medicine.svg';
        color = '#F87171';
      } else if (r.recordType === 'symptom') {
        title = '症状记录';
        desc = r.symptoms ? r.symptoms.join('、') : '';
        icon = '/assets/icons/stethoscope.svg';
        color = '#FB923C';
      }

      events.push({
        id: r.id,
        type: 'health',
        time: r.time,
        title,
        description: desc.trim(),
        icon,
        color,
        recordId: r.id,
      });
    });

    // 按时间倒序排列
    events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // 附加格式化时间
    events.forEach(evt => {
      (evt as any).timeText = formatTime(evt.time);
    });

    return events;
  }
}

export const statisticsService = new StatisticsService();
export default statisticsService;
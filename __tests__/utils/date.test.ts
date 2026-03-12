/**
 * date.ts 单元测试
 * 覆盖所有日期工具函数
 */
import {
  calculateAge,
  formatAge,
  getAgeInMonths,
  getAgeInDays,
  formatDate,
  formatTime,
  formatDateTime,
  getRelativeTime,
  getToday,
  getNowISO,
  isDaytime,
  isToday,
  diffInMinutes,
  formatDuration,
  formatDurationShort,
  getDateRange,
  getWeekRange,
} from '../../miniprogram/utils/date';

describe('date.ts', () => {
  // 固定时间为 2025-06-15T10:30:00.000Z
  const FIXED_NOW = new Date('2025-06-15T10:30:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ========== calculateAge ==========
  describe('calculateAge', () => {
    it('应正确计算月龄和天数', () => {
      const result = calculateAge('2025-01-01', '2025-06-15');
      expect(result.months).toBe(5);
      expect(result.days).toBe(14);
      expect(result.totalDays).toBe(165);
    });

    it('同一天应返回全零', () => {
      const result = calculateAge('2025-06-15', '2025-06-15');
      expect(result.months).toBe(0);
      expect(result.days).toBe(0);
      expect(result.totalDays).toBe(0);
    });

    it('目标日期在出生日期之前应返回全零', () => {
      const result = calculateAge('2025-06-15', '2025-01-01');
      expect(result).toEqual({ months: 0, days: 0, totalDays: 0 });
    });

    it('无效日期应返回全零', () => {
      const result = calculateAge('invalid-date', '2025-06-15');
      expect(result).toEqual({ months: 0, days: 0, totalDays: 0 });
    });

    it('不传目标日期时使用当前时间', () => {
      const result = calculateAge('2025-01-01');
      expect(result.months).toBe(5);
      expect(result.totalDays).toBeGreaterThan(0);
    });

    it('跨年计算正确', () => {
      const result = calculateAge('2024-01-01', '2025-06-15');
      expect(result.months).toBe(17);
    });
  });

  // ========== formatAge ==========
  describe('formatAge', () => {
    it('刚出生应返回 "刚出生"', () => {
      expect(formatAge('2025-06-15', '2025-06-15')).toBe('刚出生');
    });

    it('不足一个月应返回天数', () => {
      expect(formatAge('2025-06-01', '2025-06-15')).toBe('14天');
    });

    it('整月应返回 "X个月"', () => {
      expect(formatAge('2025-01-15', '2025-06-15')).toBe('5个月');
    });

    it('月+天应返回 "X个月Y天"', () => {
      expect(formatAge('2025-01-01', '2025-06-15')).toBe('5个月14天');
    });

    it('超过12个月应返回 "X岁" 或 "X岁Y个月"', () => {
      expect(formatAge('2024-06-15', '2025-06-15')).toBe('1岁');
      expect(formatAge('2024-01-15', '2025-06-15')).toBe('1岁5个月');
    });

    it('整两岁', () => {
      expect(formatAge('2023-06-15', '2025-06-15')).toBe('2岁');
    });
  });

  // ========== getAgeInMonths / getAgeInDays ==========
  describe('getAgeInMonths / getAgeInDays', () => {
    it('getAgeInMonths 应返回整月数', () => {
      expect(getAgeInMonths('2025-01-01', '2025-06-15')).toBe(5);
    });

    it('getAgeInDays 应返回总天数', () => {
      expect(getAgeInDays('2025-06-01', '2025-06-15')).toBe(14);
    });
  });

  // ========== formatDate / formatTime / formatDateTime ==========
  describe('formatDate / formatTime / formatDateTime', () => {
    it('formatDate 默认格式 YYYY-MM-DD', () => {
      expect(formatDate('2025-06-15T10:30:00')).toBe('2025-06-15');
    });

    it('formatDate 自定义格式', () => {
      expect(formatDate('2025-06-15T10:30:00', 'MM月DD日')).toBe('06月15日');
    });

    it('formatDate 无效日期返回空字符串', () => {
      expect(formatDate('invalid')).toBe('');
    });

    it('formatTime 返回 HH:mm', () => {
      expect(formatTime('2025-06-15T10:30:00')).toBe('10:30');
    });

    it('formatDateTime 返回 YYYY-MM-DD HH:mm', () => {
      expect(formatDateTime('2025-06-15T10:30:00')).toBe('2025-06-15 10:30');
    });
  });

  // ========== getRelativeTime ==========
  describe('getRelativeTime', () => {
    it('1分钟内返回 "刚刚"', () => {
      expect(getRelativeTime('2025-06-15T10:30:00.000Z')).toBe('刚刚');
    });

    it('5分钟前', () => {
      expect(getRelativeTime('2025-06-15T10:25:00.000Z')).toBe('5分钟前');
    });

    it('2小时前', () => {
      expect(getRelativeTime('2025-06-15T08:30:00.000Z')).toBe('2小时前');
    });

    it('1天前返回 "昨天 HH:mm"', () => {
      // 确保差值正好是 24-48 小时之间
      const yesterdaySameTime = '2025-06-14T10:30:00.000Z';
      const result = getRelativeTime(yesterdaySameTime);
      expect(result).toContain('昨天');
    });

    it('无效日期返回空字符串', () => {
      expect(getRelativeTime('invalid')).toBe('');
    });
  });

  // ========== getToday / getNowISO ==========
  describe('getToday / getNowISO', () => {
    it('getToday 返回 YYYY-MM-DD 格式', () => {
      const today = getToday();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('getNowISO 返回 ISO 8601 格式', () => {
      const iso = getNowISO();
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ========== isDaytime ==========
  describe('isDaytime', () => {
    it('上午 10 点是日间', () => {
      expect(isDaytime('2025-06-15T10:00:00')).toBe(true);
    });

    it('凌晨 3 点不是日间', () => {
      expect(isDaytime('2025-06-15T03:00:00')).toBe(false);
    });

    it('边界值 6:00 是日间', () => {
      expect(isDaytime('2025-06-15T06:00:00')).toBe(true);
    });

    it('边界值 20:00 不是日间', () => {
      expect(isDaytime('2025-06-15T20:00:00')).toBe(false);
    });

    it('边界值 5:59 不是日间', () => {
      expect(isDaytime('2025-06-15T05:59:00')).toBe(false);
    });

    it('边界值 19:59 是日间', () => {
      expect(isDaytime('2025-06-15T19:59:00')).toBe(true);
    });
  });

  // ========== isToday ==========
  describe('isToday', () => {
    it('今天的日期返回 true', () => {
      expect(isToday('2025-06-15T08:00:00')).toBe(true);
    });

    it('昨天的日期返回 false', () => {
      expect(isToday('2025-06-14T08:00:00')).toBe(false);
    });
  });

  // ========== diffInMinutes ==========
  describe('diffInMinutes', () => {
    it('正常计算时间差', () => {
      expect(diffInMinutes('2025-06-15T08:00:00', '2025-06-15T10:30:00')).toBe(150);
    });

    it('相同时间返回 0', () => {
      expect(diffInMinutes('2025-06-15T08:00:00', '2025-06-15T08:00:00')).toBe(0);
    });

    it('结束时间早于开始时间返回 0', () => {
      expect(diffInMinutes('2025-06-15T10:00:00', '2025-06-15T08:00:00')).toBe(0);
    });

    it('无效日期返回 0', () => {
      expect(diffInMinutes('invalid', '2025-06-15T10:00:00')).toBe(0);
    });
  });

  // ========== formatDuration ==========
  describe('formatDuration', () => {
    it('0 或负数返回 "0分钟"', () => {
      expect(formatDuration(0)).toBe('0分钟');
      expect(formatDuration(-5)).toBe('0分钟');
    });

    it('纯分钟', () => {
      expect(formatDuration(45)).toBe('45分钟');
    });

    it('整小时', () => {
      expect(formatDuration(120)).toBe('2小时');
    });

    it('小时+分钟', () => {
      expect(formatDuration(150)).toBe('2小时30分钟');
    });
  });

  // ========== formatDurationShort ==========
  describe('formatDurationShort', () => {
    it('0 或负数返回 "0m"', () => {
      expect(formatDurationShort(0)).toBe('0m');
      expect(formatDurationShort(-5)).toBe('0m');
    });

    it('纯分钟', () => {
      expect(formatDurationShort(45)).toBe('45m');
    });

    it('整小时', () => {
      expect(formatDurationShort(120)).toBe('2h');
    });

    it('小时+分钟', () => {
      expect(formatDurationShort(150)).toBe('2h30m');
    });
  });

  // ========== getDateRange ==========
  describe('getDateRange', () => {
    it('应返回日期范围内的每一天', () => {
      const range = getDateRange('2025-06-10', '2025-06-13');
      expect(range).toEqual([
        '2025-06-10',
        '2025-06-11',
        '2025-06-12',
        '2025-06-13',
      ]);
    });

    it('同一天应返回单元素数组', () => {
      const range = getDateRange('2025-06-15', '2025-06-15');
      expect(range).toEqual(['2025-06-15']);
    });

    it('跨月', () => {
      const range = getDateRange('2025-06-29', '2025-07-02');
      expect(range).toEqual([
        '2025-06-29',
        '2025-06-30',
        '2025-07-01',
        '2025-07-02',
      ]);
    });
  });

  // ========== getWeekRange ==========
  describe('getWeekRange', () => {
    it('周三应返回所在周的周一和周日', () => {
      // 2025-06-11 是周三
      const { start, end } = getWeekRange('2025-06-11');
      expect(start).toBe('2025-06-09'); // 周一
      expect(end).toBe('2025-06-15');   // 周日
    });

    it('周一应返回当天和 +6 天', () => {
      // 2025-06-09 是周一
      const { start, end } = getWeekRange('2025-06-09');
      expect(start).toBe('2025-06-09');
      expect(end).toBe('2025-06-15');
    });

    it('周日应返回上周一和当天', () => {
      // 2025-06-15 是周日
      const { start, end } = getWeekRange('2025-06-15');
      expect(start).toBe('2025-06-09');
      expect(end).toBe('2025-06-15');
    });
  });
});

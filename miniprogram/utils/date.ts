/**
 * 日期工具函数
 * 基于 dayjs 封装常用的日期处理方法
 */

import dayjs from 'dayjs';

/**
 * 计算月龄（精确到天）
 * @param birthDate 出生日期 YYYY-MM-DD
 * @param targetDate 目标日期 YYYY-MM-DD（默认今天）
 * @returns { months: 完整月数, days: 剩余天数, totalDays: 总天数 }
 */
export function calculateAge(
  birthDate: string,
  targetDate?: string,
): {
  months: number;
  days: number;
  totalDays: number;
} {
  const birth = dayjs(birthDate);
  const target = targetDate ? dayjs(targetDate) : dayjs();

  if (!birth.isValid() || !target.isValid() || target.isBefore(birth)) {
    return { months: 0, days: 0, totalDays: 0 };
  }

  const totalDays = target.diff(birth, 'day');
  const months = target.diff(birth, 'month');
  const daysAfterMonth = target.diff(birth.add(months, 'month'), 'day');

  return {
    months,
    days: daysAfterMonth,
    totalDays,
  };
}

/**
 * 格式化月龄显示文本
 * @param birthDate 出生日期
 * @returns 如 "5个月12天"、"刚出生"、"1岁2个月"
 */
export function formatAge(birthDate: string, targetDate?: string): string {
  const { months, days } = calculateAge(birthDate, targetDate);

  if (months === 0 && days === 0) {
    return '刚出生';
  }

  if (months >= 12) {
    const years = Math.floor(months / 12);
    const remainMonths = months % 12;
    if (remainMonths === 0) {
      return `${years}岁`;
    }
    return `${years}岁${remainMonths}个月`;
  }

  if (months === 0) {
    return `${days}天`;
  }

  if (days === 0) {
    return `${months}个月`;
  }

  return `${months}个月${days}天`;
}

/**
 * 获取月龄（仅整数月份）
 */
export function getAgeInMonths(birthDate: string, targetDate?: string): number {
  return calculateAge(birthDate, targetDate).months;
}

/**
 * 获取天龄
 */
export function getAgeInDays(birthDate: string, targetDate?: string): number {
  return calculateAge(birthDate, targetDate).totalDays;
}

/**
 * 格式化日期为友好显示
 * @param dateStr ISO 日期字符串
 * @param format 输出格式
 */
export function formatDate(dateStr: string, format: string = 'YYYY-MM-DD'): string {
  const d = dayjs(dateStr);
  return d.isValid() ? d.format(format) : '';
}

/**
 * 格式化时间为友好显示（HH:mm）
 */
export function formatTime(dateStr: string): string {
  return formatDate(dateStr, 'HH:mm');
}

/**
 * 格式化日期时间
 */
export function formatDateTime(dateStr: string): string {
  return formatDate(dateStr, 'YYYY-MM-DD HH:mm');
}

/**
 * 获取相对时间描述
 * @returns 如 "刚刚"、"5分钟前"、"2小时前"、"昨天 14:30"
 */
export function getRelativeTime(dateStr: string): string {
  const now = dayjs();
  const target = dayjs(dateStr);

  if (!target.isValid()) return '';

  const diffMinutes = now.diff(target, 'minute');
  const diffHours = now.diff(target, 'hour');
  const diffDays = now.diff(target, 'day');

  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays === 1) return `昨天 ${target.format('HH:mm')}`;
  if (diffDays === 2) return `前天 ${target.format('HH:mm')}`;
  if (diffDays < 7) return `${diffDays}天前`;

  return target.format('MM-DD HH:mm');
}

/**
 * 获取今天的日期字符串 YYYY-MM-DD
 */
export function getToday(): string {
  return dayjs().format('YYYY-MM-DD');
}

/**
 * 获取当前 ISO 时间字符串
 */
export function getNowISO(): string {
  return dayjs().toISOString();
}

/**
 * 判断给定时间是否为日间（6:00-20:00）
 * 用于区分日间小睡和夜间睡眠
 */
export function isDaytime(dateStr: string): boolean {
  const hour = dayjs(dateStr).hour();
  return hour >= 6 && hour < 20;
}

/**
 * 判断给定日期是否为今天
 */
export function isToday(dateStr: string): boolean {
  return dayjs(dateStr).format('YYYY-MM-DD') === getToday();
}

/**
 * 计算两个时间之间的分钟数
 */
export function diffInMinutes(startTime: string, endTime: string): number {
  const start = dayjs(startTime);
  const end = dayjs(endTime);

  if (!start.isValid() || !end.isValid()) return 0;

  return Math.max(0, end.diff(start, 'minute'));
}

/**
 * 格式化时长（分钟 -> "Xh Xm" 或 "Xm"）
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0分钟';

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) return `${mins}分钟`;
  if (mins === 0) return `${hours}小时`;
  return `${hours}小时${mins}分钟`;
}

/**
 * 格式化时长为简短形式
 */
export function formatDurationShort(minutes: number): string {
  if (minutes <= 0) return '0m';

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}m`;
}

/**
 * 获取日期范围内每一天的日期数组
 * @returns YYYY-MM-DD 格式的日期数组
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = dayjs(startDate);
  const end = dayjs(endDate);

  while (current.isBefore(end) || current.isSame(end, 'day')) {
    dates.push(current.format('YYYY-MM-DD'));
    current = current.add(1, 'day');
  }

  return dates;
}

/**
 * 获取指定日期所在周的起止日期（周一为一周起始）
 */
export function getWeekRange(dateStr: string): { start: string; end: string } {
  const d = dayjs(dateStr);
  const dayOfWeek = d.day(); // 0=周日, 1=周一, ..., 6=周六
  const monday = d.subtract(dayOfWeek === 0 ? 6 : dayOfWeek - 1, 'day');
  const sunday = monday.add(6, 'day');

  return {
    start: monday.format('YYYY-MM-DD'),
    end: sunday.format('YYYY-MM-DD'),
  };
}

/**
 * 获取最近 N 天的日期数组（含今天，从远到近排列）
 * @param n 天数，默认 7
 * @returns YYYY-MM-DD 格式的日期数组
 */
export function getLastNDays(n: number = 7): string[] {
  const dates: string[] = [];
  const today = dayjs();

  for (let i = n - 1; i >= 0; i--) {
    dates.push(today.subtract(i, 'day').format('YYYY-MM-DD'));
  }

  return dates;
}

/**
 * 获取日期的星期几简称
 * @returns 如 "周一"、"周二"、...、"周日"
 */
export function getWeekdayShort(dateStr: string): string {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekdays[dayjs(dateStr).day()];
}

/**
 * 获取日期的短格式标签（MM/DD）
 */
export function getShortDateLabel(dateStr: string): string {
  return dayjs(dateStr).format('MM/DD');
}

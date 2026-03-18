/**
 * 睡眠记录类型定义
 */

/** 睡眠类型 */
export type SleepType = 'nap' | 'night';

/** 睡眠记录 */
export interface SleepRecord {
  /** 唯一标识 */
  id: string;
  /** 关联宝宝 ID */
  babyId: string;
  /** 入睡时间，ISO 8601 格式 */
  startTime: string;
  /** 醒来时间，ISO 8601 格式 */
  endTime?: string;
  /** 睡眠时长（分钟），自动计算或手动输入 */
  duration?: number;
  /** 睡眠类型：日间小睡 / 夜间睡眠 */
  type: SleepType;
  /** 睡眠质量评分 1-5 */
  quality?: number;
  /** 备注 */
  note?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/** 创建睡眠记录的入参 */
export type CreateSleepInput = Omit<SleepRecord, 'id' | 'createdAt' | 'updatedAt'>;

/** 更新睡眠记录的入参 */
export type UpdateSleepInput = Partial<
  Omit<SleepRecord, 'id' | 'babyId' | 'createdAt' | 'updatedAt'>
>;

/** 睡眠日统计 */
export interface SleepDailySummary {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 总睡眠次数 */
  totalCount: number;
  /** 日间小睡次数 */
  napCount: number;
  /** 夜间睡眠次数 */
  nightCount: number;
  /** 总睡眠时长（分钟） */
  totalDuration: number;
  /** 日间小睡总时长（分钟） */
  napDuration: number;
  /** 夜间睡眠总时长（分钟） */
  nightDuration: number;
}

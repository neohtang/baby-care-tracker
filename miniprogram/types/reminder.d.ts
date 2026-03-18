/**
 * 提醒系统类型定义
 */

/** 提醒类型 */
export type ReminderType = 'feeding' | 'vaccine';

/** 提醒设置 */
export interface ReminderSettings {
  /** 存储用唯一标识 */
  id: string;
  /** 关联宝宝 ID */
  babyId: string;

  /** ===== 喂养提醒 ===== */
  /** 喂养提醒总开关 */
  feedingReminderEnabled: boolean;
  /** 喂养间隔（分钟），默认 180（3小时） */
  feedingIntervalMinutes: number;

  /** ===== 疫苗提醒 ===== */
  /** 疫苗提醒总开关 */
  vaccineReminderEnabled: boolean;
  /** 疫苗提醒提前天数，默认 7 */
  vaccineAdvanceDays: number;

  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/** 提醒设置的创建入参 */
export type CreateReminderSettingsInput = Omit<ReminderSettings, 'id' | 'createdAt' | 'updatedAt'>;

/** 提醒设置的更新入参 */
export type UpdateReminderSettingsInput = Partial<
  Omit<ReminderSettings, 'id' | 'babyId' | 'createdAt' | 'updatedAt'>
>;

/** 喂养提醒状态（实时计算，不持久化） */
export interface FeedingReminderStatus {
  /** 是否有活跃提醒 */
  hasReminder: boolean;
  /** 距上次喂养已过分钟数 */
  minutesSinceLastFeeding: number;
  /** 距下次喂养剩余分钟数（负数表示已超时） */
  minutesUntilNext: number;
  /** 上次喂养时间（ISO 8601） */
  lastFeedingTime: string | null;
  /** 上次喂养类型名称 */
  lastFeedingTypeName: string;
  /** 提醒文本 */
  reminderText: string;
  /** 是否已超时 */
  isOverdue: boolean;
  /** 进度百分比（0-100，超时后可 > 100） */
  progress: number;
}

/** 疫苗提醒项 */
export interface VaccineReminderItem {
  /** 疫苗 ID */
  vaccineId: string;
  /** 疫苗名称 */
  vaccineName: string;
  /** 推荐接种日期 */
  recommendedDate: string;
  /** 距推荐日还有多少天（负数表示已逾期） */
  daysUntil: number;
  /** 是否已逾期 */
  isOverdue: boolean;
  /** 提醒文本 */
  reminderText: string;
}

/** 综合提醒摘要（首页/App 级别使用） */
export interface ReminderSummary {
  /** 喂养提醒状态 */
  feeding: FeedingReminderStatus | null;
  /** 疫苗提醒列表 */
  vaccines: VaccineReminderItem[];
  /** 是否有任何需要关注的提醒 */
  hasActiveReminders: boolean;
  /** 需要关注的提醒总数 */
  activeReminderCount: number;
}

/** 喂养间隔预设选项 */
export interface FeedingIntervalOption {
  /** 显示文本 */
  label: string;
  /** 间隔分钟数 */
  value: number;
}

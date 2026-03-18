/**
 * 统一类型导出
 * 所有模块的类型定义从此文件导出
 */

// 宝宝信息
export type { Gender, BabyInfo, CreateBabyInput, UpdateBabyInput } from './baby';

// 喂养记录
export type {
  FeedingType,
  BreastSide,
  FeedingRecord,
  CreateFeedingInput,
  UpdateFeedingInput,
  FeedingDailySummary,
} from './feeding';

// 睡眠记录
export type {
  SleepType,
  SleepRecord,
  CreateSleepInput,
  UpdateSleepInput,
  SleepDailySummary,
} from './sleep';

// 排便/换尿布记录
export type {
  DiaperType,
  PoopColor,
  PoopTexture,
  DiaperAlert,
  DiaperRecord,
  CreateDiaperInput,
  UpdateDiaperInput,
  DiaperDailySummary,
} from './diaper';

// 体温/健康记录
export type {
  TemperatureSite,
  TemperatureLevel,
  HealthRecordType,
  HealthRecord,
  CreateHealthInput,
  UpdateHealthInput,
  TemperatureThresholds,
} from './health';

// 生长发育
export type {
  GrowthRecord,
  CreateGrowthInput,
  UpdateGrowthInput,
  WHOPercentilePoint,
  WHOGrowthStandard,
  GrowthChartDataPoint,
} from './growth';

// 疫苗接种
export type {
  VaccineStatus,
  VaccineItem,
  VaccinationRecord,
  CreateVaccinationInput,
  UpdateVaccinationInput,
  VaccinePlanItem,
} from './vaccine';

// 提醒系统
export type {
  ReminderType,
  ReminderSettings,
  CreateReminderSettingsInput,
  UpdateReminderSettingsInput,
  FeedingReminderStatus,
  VaccineReminderItem,
  ReminderSummary,
  FeedingIntervalOption,
} from './reminder';

// 数据统计与趋势
export type {
  FeedingTrendPoint,
  SleepTrendPoint,
  DiaperTrendPoint,
  WeeklyTrendData,
  TrendChartSeries,
  TrendChartConfig,
} from './statistics';

// 发育里程碑
export type {
  MilestoneCategory,
  MilestoneStatus,
  MilestoneItem,
  MilestoneRecord,
  CreateMilestoneRecordInput,
  UpdateMilestoneRecordInput,
  MilestonePlanItem,
  MilestoneCategoryInfo,
} from './milestone';

/**
 * 通用分页查询参数
 */
export interface QueryParams {
  /** 页码（从 1 开始） */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
  /** 起始日期 YYYY-MM-DD */
  startDate?: string;
  /** 结束日期 YYYY-MM-DD */
  endDate?: string;
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 通用分页结果
 */
export interface PaginatedResult<T> {
  /** 数据列表 */
  items: T[];
  /** 总数 */
  total: number;
  /** 当前页 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 是否有下一页 */
  hasMore: boolean;
}

/**
 * 存储数据包装器（带版本号）
 */
export interface StorageWrapper<T> {
  /** 数据版本号 */
  version: number;
  /** 数据内容 */
  data: T[];
  /** 最后更新时间 */
  lastUpdated: string;
}

// 内部导入（用于 DailySummary 接口）
import type { FeedingDailySummary } from './feeding';
import type { SleepDailySummary } from './sleep';
import type { DiaperDailySummary } from './diaper';
import type { TemperatureLevel } from './health';

/**
 * 首页仪表盘今日摘要
 */
export interface DailySummary {
  /** 日期 */
  date: string;
  /** 喂养摘要 */
  feeding: FeedingDailySummary;
  /** 睡眠摘要 */
  sleep: SleepDailySummary;
  /** 排便摘要 */
  diaper: DiaperDailySummary;
  /** 最近体温 */
  lastTemperature?: number;
  /** 最近体温等级 */
  lastTemperatureLevel?: TemperatureLevel;
  /** 最近体温时间 */
  lastTemperatureTime?: string;
}

/**
 * 时间线事件（首页时间线用）
 */
export interface TimelineEvent {
  /** 事件 ID */
  id: string;
  /** 事件类型 */
  type: 'feeding' | 'sleep' | 'diaper' | 'health' | 'growth' | 'vaccine' | 'milestone';
  /** 事件时间 */
  time: string;
  /** 事件标题 */
  title: string;
  /** 事件描述 */
  description: string;
  /** 事件图标 */
  icon: string;
  /** 事件颜色 */
  color: string;
  /** 关联记录 ID */
  recordId: string;
}

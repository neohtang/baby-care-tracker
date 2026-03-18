/**
 * 喂养记录类型定义
 */

/** 喂养类型 */
export type FeedingType = 'breast' | 'formula' | 'solid';

/** 母乳喂养侧 */
export type BreastSide = 'left' | 'right' | 'both';

/** 喂养记录 */
export interface FeedingRecord {
  /** 唯一标识 */
  id: string;
  /** 关联宝宝 ID */
  babyId: string;
  /** 喂养类型 */
  type: FeedingType;
  /** 开始时间，ISO 8601 格式 */
  startTime: string;
  /** 结束时间，ISO 8601 格式（母乳喂养时使用） */
  endTime?: string;
  /** 喂养时长（分钟），母乳喂养时使用 */
  duration?: number;
  /** 摄入量：配方奶为毫升(ml)，辅食为克(g) */
  amount?: number;
  /** 母乳喂养侧 */
  side?: BreastSide;
  /** 配方奶品牌 */
  formulaBrand?: string;
  /** 辅食食材描述 */
  solidFood?: string;
  /** 备注 */
  note?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/** 创建喂养记录的入参 */
export type CreateFeedingInput = Omit<FeedingRecord, 'id' | 'createdAt' | 'updatedAt'>;

/** 更新喂养记录的入参 */
export type UpdateFeedingInput = Partial<
  Omit<FeedingRecord, 'id' | 'babyId' | 'createdAt' | 'updatedAt'>
>;

/** 喂养日统计 */
export interface FeedingDailySummary {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 总喂养次数 */
  totalCount: number;
  /** 母乳次数 */
  breastCount: number;
  /** 配方奶次数 */
  formulaCount: number;
  /** 辅食次数 */
  solidCount: number;
  /** 母乳总时长（分钟） */
  totalBreastDuration: number;
  /** 配方奶总量（ml） */
  totalFormulaAmount: number;
  /** 辅食总量（g） */
  totalSolidAmount: number;
}

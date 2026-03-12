/**
 * 排便/换尿布记录类型定义
 */

/** 排泄类型 */
export type DiaperType = 'pee' | 'poop' | 'both';

/** 大便颜色 */
export type PoopColor = 'yellow' | 'green' | 'brown' | 'black' | 'red' | 'white' | 'other';

/** 大便质地 */
export type PoopTexture = 'watery' | 'soft' | 'normal' | 'hard' | 'mucus' | 'other';

/** 排便异常标记 */
export type DiaperAlert = 'diarrhea' | 'constipation' | 'blood' | 'mucus' | 'none';

/** 排便/换尿布记录 */
export interface DiaperRecord {
  /** 唯一标识 */
  id: string;
  /** 关联宝宝 ID */
  babyId: string;
  /** 记录时间，ISO 8601 格式 */
  time: string;
  /** 类型：小便 / 大便 / 都有 */
  type: DiaperType;
  /** 大便颜色（仅 type 为 poop 或 both 时） */
  poopColor?: PoopColor;
  /** 大便质地（仅 type 为 poop 或 both 时） */
  poopTexture?: PoopTexture;
  /** 异常标记 */
  alert?: DiaperAlert;
  /** 备注 */
  note?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/** 创建排便记录的入参 */
export type CreateDiaperInput = Omit<DiaperRecord, 'id' | 'createdAt' | 'updatedAt'>;

/** 更新排便记录的入参 */
export type UpdateDiaperInput = Partial<Omit<DiaperRecord, 'id' | 'babyId' | 'createdAt' | 'updatedAt'>>;

/** 排便日统计 */
export interface DiaperDailySummary {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 总换尿布次数 */
  totalCount: number;
  /** 小便次数 */
  peeCount: number;
  /** 大便次数 */
  poopCount: number;
  /** 是否有异常 */
  hasAlert: boolean;
  /** 异常详情 */
  alerts: DiaperAlert[];
}

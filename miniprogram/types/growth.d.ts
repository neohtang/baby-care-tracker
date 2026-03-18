/**
 * 生长发育记录类型定义
 */

/** 生长记录 */
export interface GrowthRecord {
  /** 唯一标识 */
  id: string;
  /** 关联宝宝 ID */
  babyId: string;
  /** 测量日期 YYYY-MM-DD */
  date: string;
  /** 体重 (kg) */
  weight?: number;
  /** 身长/身高 (cm) */
  height?: number;
  /** 头围 (cm) */
  headCircumference?: number;
  /** 测量时的月龄（自动计算） */
  ageInMonths: number;
  /** 测量时的天数（自动计算） */
  ageInDays: number;
  /** 备注 */
  note?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/** 创建生长记录的入参 */
export type CreateGrowthInput = Omit<GrowthRecord, 'id' | 'createdAt' | 'updatedAt'>;

/** 更新生长记录的入参 */
export type UpdateGrowthInput = Partial<
  Omit<GrowthRecord, 'id' | 'babyId' | 'createdAt' | 'updatedAt'>
>;

/** WHO 生长标准百分位数据点 */
export interface WHOPercentilePoint {
  /** 月龄 */
  month: number;
  /** 第 3 百分位 */
  p3: number;
  /** 第 15 百分位 */
  p15: number;
  /** 第 50 百分位（中位数） */
  p50: number;
  /** 第 85 百分位 */
  p85: number;
  /** 第 97 百分位 */
  p97: number;
}

/** WHO 生长标准数据集 */
export interface WHOGrowthStandard {
  /** 性别 */
  gender: 'male' | 'female';
  /** 指标类型 */
  metric: 'weight' | 'height' | 'headCircumference';
  /** 百分位数据 */
  data: WHOPercentilePoint[];
}

/** 生长曲线图数据点 */
export interface GrowthChartDataPoint {
  /** 月龄 */
  ageInMonths: number;
  /** 测量值 */
  value: number;
  /** 测量日期 */
  date: string;
}

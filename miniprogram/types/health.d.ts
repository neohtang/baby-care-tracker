/**
 * 体温/健康记录类型定义
 */

/** 体温测量部位 */
export type TemperatureSite = 'axillary' | 'forehead' | 'ear' | 'oral' | 'rectal';

/** 体温等级 */
export type TemperatureLevel = 'low' | 'normal' | 'mild_fever' | 'moderate_fever' | 'high_fever';

/** 健康记录类型 */
export type HealthRecordType = 'temperature' | 'medication' | 'symptom';

/** 体温/健康记录 */
export interface HealthRecord {
  /** 唯一标识 */
  id: string;
  /** 关联宝宝 ID */
  babyId: string;
  /** 记录类型 */
  recordType: HealthRecordType;
  /** 记录时间，ISO 8601 格式 */
  time: string;
  /** 体温值 (°C)，仅 recordType 为 temperature 时 */
  temperature?: number;
  /** 测量部位，仅 recordType 为 temperature 时 */
  temperatureSite?: TemperatureSite;
  /** 体温等级，自动根据温度判断 */
  temperatureLevel?: TemperatureLevel;
  /** 药物名称，仅 recordType 为 medication 时 */
  medicationName?: string;
  /** 药物剂量 */
  medicationDosage?: string;
  /** 症状描述，仅 recordType 为 symptom 时 */
  symptoms?: string[];
  /** 备注 */
  note?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/** 创建健康记录的入参 */
export type CreateHealthInput = Omit<HealthRecord, 'id' | 'createdAt' | 'updatedAt'>;

/** 更新健康记录的入参 */
export type UpdateHealthInput = Partial<
  Omit<HealthRecord, 'id' | 'babyId' | 'createdAt' | 'updatedAt'>
>;

/**
 * 根据体温值判断体温等级
 * 标准参考（腋温）：
 * - < 36.0°C: 偏低
 * - 36.0 - 37.3°C: 正常
 * - 37.4 - 38.0°C: 低烧
 * - 38.1 - 39.0°C: 中烧
 * - > 39.0°C: 高烧
 */
export interface TemperatureThresholds {
  low: number; // 36.0
  normalHigh: number; // 37.3
  mildHigh: number; // 38.0
  moderateHigh: number; // 39.0
}

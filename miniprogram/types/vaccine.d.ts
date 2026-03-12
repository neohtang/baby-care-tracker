/**
 * 疫苗接种记录类型定义
 */

/** 疫苗接种状态 */
export type VaccineStatus = 'pending' | 'completed' | 'overdue' | 'skipped';

/** 疫苗信息（静态数据） */
export interface VaccineItem {
  /** 疫苗唯一标识 */
  id: string;
  /** 疫苗名称 */
  name: string;
  /** 疫苗全称 */
  fullName: string;
  /** 预防疾病 */
  preventDisease: string;
  /** 推荐接种月龄 */
  recommendedMonth: number;
  /** 第几剂次 */
  doseNumber: number;
  /** 总剂次 */
  totalDoses: number;
  /** 是否为国家免疫规划疫苗（免费） */
  isFree: boolean;
  /** 接种说明 */
  description?: string;
}

/** 疫苗接种记录 */
export interface VaccinationRecord {
  /** 唯一标识 */
  id: string;
  /** 关联宝宝 ID */
  babyId: string;
  /** 关联疫苗 ID */
  vaccineId: string;
  /** 接种日期 YYYY-MM-DD */
  date: string;
  /** 接种状态 */
  status: VaccineStatus;
  /** 接种机构 */
  location?: string;
  /** 疫苗批号 */
  batchNumber?: string;
  /** 接种后反应记录 */
  reaction?: string;
  /** 备注 */
  note?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/** 创建疫苗接种记录的入参 */
export type CreateVaccinationInput = Omit<VaccinationRecord, 'id' | 'createdAt' | 'updatedAt'>;

/** 更新疫苗接种记录的入参 */
export type UpdateVaccinationInput = Partial<Omit<VaccinationRecord, 'id' | 'babyId' | 'createdAt' | 'updatedAt'>>;

/** 疫苗接种计划项（列表展示用） */
export interface VaccinePlanItem {
  /** 疫苗信息 */
  vaccine: VaccineItem;
  /** 接种记录（已接种时存在） */
  record?: VaccinationRecord;
  /** 当前状态 */
  status: VaccineStatus;
  /** 推荐接种日期（根据出生日期计算） */
  recommendedDate: string;
}

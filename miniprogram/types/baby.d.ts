/**
 * 宝宝基本信息类型定义
 */

/** 宝宝性别 */
export type Gender = 'male' | 'female';

/** 宝宝基本信息 */
export interface BabyInfo {
  /** 唯一标识 */
  id: string;
  /** 宝宝姓名 */
  name: string;
  /** 性别 */
  gender: Gender;
  /** 出生日期，ISO 8601 格式 (YYYY-MM-DD) */
  birthDate: string;
  /** 头像 URL（本地临时路径或云存储地址） */
  avatarUrl?: string;
  /** 血型 */
  bloodType?: 'A' | 'B' | 'AB' | 'O' | 'unknown';
  /** 出生体重 (kg) */
  birthWeight?: number;
  /** 出生身长 (cm) */
  birthHeight?: number;
  /** 备注 */
  note?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/** 创建宝宝信息的入参（不含自动生成字段） */
export type CreateBabyInput = Omit<BabyInfo, 'id' | 'createdAt' | 'updatedAt'>;

/** 更新宝宝信息的入参 */
export type UpdateBabyInput = Partial<Omit<BabyInfo, 'id' | 'createdAt' | 'updatedAt'>>;

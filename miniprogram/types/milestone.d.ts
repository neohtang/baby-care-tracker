/**
 * 发育里程碑类型定义
 */

/** 里程碑类别 */
export type MilestoneCategory = 'gross_motor' | 'fine_motor' | 'language' | 'social' | 'cognitive';

/** 里程碑状态 */
export type MilestoneStatus = 'pending' | 'achieved' | 'concern';

/** 里程碑项目（静态数据） */
export interface MilestoneItem {
  /** 唯一标识 */
  id: string;
  /** 里程碑名称 */
  name: string;
  /** 类别 */
  category: MilestoneCategory;
  /** 预期达成月龄（起始） */
  expectedMonthStart: number;
  /** 预期达成月龄（结束） */
  expectedMonthEnd: number;
  /** 描述说明 */
  description: string;
  /** 关注提示（如果到期未达成） */
  concernTip?: string;
}

/** 里程碑达成记录 */
export interface MilestoneRecord {
  /** 唯一标识 */
  id: string;
  /** 关联宝宝 ID */
  babyId: string;
  /** 关联里程碑 ID */
  milestoneId: string;
  /** 达成日期 YYYY-MM-DD */
  achievedDate: string;
  /** 状态 */
  status: MilestoneStatus;
  /** 备注/描述 */
  note?: string;
  /** 纪念照片路径 */
  photoUrl?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/** 创建里程碑记录的入参 */
export type CreateMilestoneRecordInput = Omit<MilestoneRecord, 'id' | 'createdAt' | 'updatedAt'>;

/** 更新里程碑记录的入参 */
export type UpdateMilestoneRecordInput = Partial<
  Omit<MilestoneRecord, 'id' | 'babyId' | 'createdAt' | 'updatedAt'>
>;

/** 里程碑展示项（列表用） */
export interface MilestonePlanItem {
  /** 里程碑信息 */
  milestone: MilestoneItem;
  /** 达成记录（已达成时存在） */
  record?: MilestoneRecord;
  /** 当前状态 */
  status: MilestoneStatus;
  /** 是否在当前月龄的关注范围内 */
  isCurrentFocus: boolean;
}

/** 里程碑类别显示信息 */
export interface MilestoneCategoryInfo {
  key: MilestoneCategory;
  label: string;
  icon: string;
  color: string;
}

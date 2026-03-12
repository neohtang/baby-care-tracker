/**
 * MilestoneService - 发育里程碑记录管理服务
 * 封装里程碑达成记录 CRUD、当前月龄关注项计算、分组展示
 */

import { milestoneStorage, generateId, nowISO } from './storage';
import { validateMilestoneRecord } from '../utils/validator';
import { formatDate, getAgeInMonths } from '../utils/date';
import { babyService } from './baby';
import eventBus, { Events } from '../utils/event-bus';
import {
  MILESTONE_LIST,
  MILESTONE_CATEGORIES,
  getMilestoneById,
  getMilestonesByAge,
  getMilestoneMonthGroups,
  getCategoryInfo,
} from '../data/milestones';
import type {
  MilestoneRecord,
  MilestonePlanItem,
  MilestoneStatus,
  MilestoneCategory,
  CreateMilestoneRecordInput,
  UpdateMilestoneRecordInput,
} from '../types/index';

/** 状态配置（使用纯文字符号，避免 base64 图标在小程序中的兼容性问题） */
const STATUS_CONFIG: Record<MilestoneStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  achieved: { label: '已达成', color: '#059669', bgColor: '#D1FAE5', icon: '★' },
  pending: { label: '待达成', color: '#6B7280', bgColor: '#F3F4F6', icon: '☆' },
  concern: { label: '需关注', color: '#DC2626', bgColor: '#FEE2E2', icon: '⚠' },
};

class MilestoneService {
  /**
   * 获取当前宝宝的所有里程碑记录
   */
  getAllRecords(): MilestoneRecord[] {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return [];
    return milestoneStorage.query((r: MilestoneRecord) => r.babyId === babyId);
  }

  /**
   * 根据里程碑 ID 获取达成记录
   */
  getRecordByMilestoneId(milestoneId: string): MilestoneRecord | undefined {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return undefined;
    const records = milestoneStorage.query((r: MilestoneRecord) => {
      return r.babyId === babyId && r.milestoneId === milestoneId;
    });
    return records.length > 0 ? records[0] : undefined;
  }

  /**
   * 添加里程碑记录
   */
  addRecord(input: CreateMilestoneRecordInput): MilestoneRecord | null {
    const validation = validateMilestoneRecord(input);
    if (!validation.valid) {
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return null;
    }

    // 防止重复记录
    const existing = this.getRecordByMilestoneId(input.milestoneId);
    if (existing) {
      wx.showToast({ title: '该里程碑已有记录', icon: 'none' });
      return null;
    }

    const now = nowISO();
    const record: MilestoneRecord = {
      id: generateId(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    milestoneStorage.add(record);
    eventBus.emit(Events.MILESTONE_CHANGED, record);
    return record;
  }

  /**
   * 更新里程碑记录
   */
  updateRecord(id: string, updates: UpdateMilestoneRecordInput): MilestoneRecord | null {
    const existing = milestoneStorage.getById(id);
    if (!existing) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      return null;
    }

    const merged = { ...existing, ...updates };
    const validation = validateMilestoneRecord(merged);
    if (!validation.valid) {
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return null;
    }

    const updated = milestoneStorage.update(id, {
      ...updates,
      updatedAt: nowISO(),
    } as any);

    if (updated) {
      eventBus.emit(Events.MILESTONE_CHANGED, updated);
    }
    return updated as MilestoneRecord || null;
  }

  /**
   * 删除里程碑记录
   */
  removeRecord(id: string): boolean {
    const success = milestoneStorage.remove(id);
    if (success) {
      eventBus.emit(Events.MILESTONE_CHANGED);
    }
    return success;
  }

  /**
   * 判断某里程碑的状态
   */
  getMilestoneStatus(milestoneId: string): MilestoneStatus {
    const record = this.getRecordByMilestoneId(milestoneId);
    if (record) return record.status;

    const milestone = getMilestoneById(milestoneId);
    if (!milestone) return 'pending';

    const baby = babyService.getCurrentBaby();
    if (!baby) return 'pending';

    const ageInMonths = getAgeInMonths(baby.birthDate);

    // 如果已经超过预期结束月龄且未记录，标记为 concern
    if (ageInMonths > milestone.expectedMonthEnd && milestone.concernTip) {
      return 'concern';
    }

    return 'pending';
  }

  /**
   * 生成完整的里程碑计划（按月龄分组）
   */
  getMilestonePlan(): {
    month: number;
    monthLabel: string;
    milestones: (MilestonePlanItem & {
      statusLabel: string;
      statusColor: string;
      statusBgColor: string;
      statusIcon: string;
      categoryLabel: string;
      categoryColor: string;
      dateText: string;
      description: string;
      concernTip: string;
    })[];
  }[] {
    const monthGroups = getMilestoneMonthGroups();
    const result: any[] = [];

    monthGroups.forEach(month => {
      const milestonesInMonth = MILESTONE_LIST.filter(m => m.expectedMonthStart === month);
      const baby = babyService.getCurrentBaby();
      const ageInMonths = baby ? getAgeInMonths(baby.birthDate) : 0;

      const milestones = milestonesInMonth.map(milestone => {
        const record = this.getRecordByMilestoneId(milestone.id);
        const status = this.getMilestoneStatus(milestone.id);
        const isCurrentFocus = ageInMonths >= milestone.expectedMonthStart &&
                               ageInMonths <= milestone.expectedMonthEnd;
        const statusCfg = STATUS_CONFIG[status];
        const catInfo = getCategoryInfo(milestone.category);

        return {
          milestoneId: milestone.id,
          milestone,
          record,
          status,
          isCurrentFocus,
          statusLabel: statusCfg.label,
          statusColor: statusCfg.color,
          statusBgColor: statusCfg.bgColor,
          statusIcon: statusCfg.icon,
          categoryLabel: catInfo?.label || '',
          categoryColor: catInfo?.color || '#6B7280',
          dateText: record?.achievedDate
            ? formatDate(record.achievedDate, 'MM月DD日达成')
            : '',
          description: milestone.description,
          concernTip: milestone.concernTip || '',
        };
      });

      const monthEnd = milestonesInMonth.length > 0
        ? Math.max(...milestonesInMonth.map(m => m.expectedMonthEnd))
        : month + 1;

      result.push({
        month,
        monthLabel: month === 0 ? '0-1月龄' : `${month}-${monthEnd}月龄`,
        milestones,
      });
    });

    return result;
  }

  /**
   * 获取当前月龄应关注的里程碑
   */
  getCurrentFocusMilestones(): MilestonePlanItem[] {
    const baby = babyService.getCurrentBaby();
    if (!baby) return [];

    const ageInMonths = getAgeInMonths(baby.birthDate);
    const milestones = getMilestonesByAge(ageInMonths);

    return milestones.map(milestone => ({
      milestone,
      record: this.getRecordByMilestoneId(milestone.id),
      status: this.getMilestoneStatus(milestone.id),
      isCurrentFocus: true,
    }));
  }

  /**
   * 获取统计摘要
   */
  getSummary(): {
    total: number;
    achieved: number;
    pending: number;
    concern: number;
    progress: number;
    currentFocus: number;
  } {
    let achieved = 0;
    let pending = 0;
    let concern = 0;

    MILESTONE_LIST.forEach(m => {
      const status = this.getMilestoneStatus(m.id);
      if (status === 'achieved') achieved++;
      else if (status === 'concern') concern++;
      else pending++;
    });

    const total = MILESTONE_LIST.length;
    const currentFocus = this.getCurrentFocusMilestones().length;

    return {
      total,
      achieved,
      pending,
      concern,
      progress: total > 0 ? Math.round((achieved / total) * 100) : 0,
      currentFocus,
    };
  }

  /**
   * 获取类别列表
   */
  getCategories() {
    return MILESTONE_CATEGORIES;
  }

  /**
   * 获取状态配置
   */
  getStatusConfig(status: MilestoneStatus) {
    return STATUS_CONFIG[status];
  }
}

export const milestoneService = new MilestoneService();
export default milestoneService;

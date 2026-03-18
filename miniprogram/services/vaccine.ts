/**
 * VaccineService - 疫苗接种记录管理服务
 * 封装接种记录 CRUD、疫苗计划生成、逾期检测与提醒
 */

import { vaccineStorage, generateId, nowISO } from './storage';
import { validateVaccinationRecord } from '../utils/validator';
import { formatDate, getAgeInMonths } from '../utils/date';
import { babyService } from './baby';
import eventBus, { Events } from '../utils/event-bus';
import {
  VACCINE_LIST,
  VACCINE_SCHEDULE,
  MONTH_LABELS,
  getVaccineById,
  getScheduleMonths,
} from '../data/vaccines';
import type {
  VaccinationRecord,
  VaccinePlanItem,
  VaccineStatus,
  CreateVaccinationInput,
  UpdateVaccinationInput,
} from '../types/index';

/** 疫苗状态配置 */
const STATUS_CONFIG: Record<
  VaccineStatus,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  completed: { label: '已接种', color: '#059669', bgColor: '#D1FAE5', dotColor: '#34D399' },
  pending: { label: '待接种', color: '#D97706', bgColor: '#FEF3C7', dotColor: '#FBBF24' },
  overdue: { label: '已逾期', color: '#DC2626', bgColor: '#FEE2E2', dotColor: '#F87171' },
  skipped: { label: '已跳过', color: '#6B7280', bgColor: '#F3F4F6', dotColor: '#9CA3AF' },
};

class VaccineService {
  /**
   * 获取当前宝宝的所有接种记录
   */
  getAllRecords(): VaccinationRecord[] {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return [];
    return vaccineStorage.query((r: VaccinationRecord) => r.babyId === babyId);
  }

  /**
   * 根据疫苗 ID 获取接种记录
   */
  getRecordByVaccineId(vaccineId: string): VaccinationRecord | undefined {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return undefined;
    const records = vaccineStorage.query((r: VaccinationRecord) => {
      return r.babyId === babyId && r.vaccineId === vaccineId;
    });
    return records.length > 0 ? records[0] : undefined;
  }

  /**
   * 添加接种记录
   */
  addRecord(input: CreateVaccinationInput): VaccinationRecord | null {
    const validation = validateVaccinationRecord(input);
    if (!validation.valid) {
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return null;
    }

    const now = nowISO();
    const record: VaccinationRecord = {
      id: generateId(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    vaccineStorage.add(record);
    eventBus.emit(Events.VACCINE_CHANGED, record);
    return record;
  }

  /**
   * 更新接种记录
   */
  updateRecord(id: string, updates: UpdateVaccinationInput): VaccinationRecord | null {
    const existing = vaccineStorage.getById(id);
    if (!existing) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      return null;
    }

    const merged = { ...existing, ...updates };
    const validation = validateVaccinationRecord(merged);
    if (!validation.valid) {
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return null;
    }

    const updated = vaccineStorage.update(id, {
      ...updates,
      updatedAt: nowISO(),
    } as any);

    if (updated) {
      eventBus.emit(Events.VACCINE_CHANGED, updated);
    }
    return (updated as VaccinationRecord) || null;
  }

  /**
   * 删除接种记录
   */
  removeRecord(id: string): boolean {
    const success = vaccineStorage.remove(id);
    if (success) {
      eventBus.emit(Events.VACCINE_CHANGED);
    }
    return success;
  }

  /**
   * 根据出生日期计算推荐接种日期
   */
  getRecommendedDate(recommendedMonth: number): string {
    const baby = babyService.getCurrentBaby();
    if (!baby) return '';

    const birthDate = new Date(baby.birthDate);
    const recommendedDate = new Date(birthDate);
    recommendedDate.setMonth(recommendedDate.getMonth() + recommendedMonth);
    return formatDate(recommendedDate.toISOString(), 'YYYY-MM-DD');
  }

  /**
   * 判断某疫苗的接种状态
   */
  getVaccineStatus(vaccineId: string, recommendedMonth: number): VaccineStatus {
    const record = this.getRecordByVaccineId(vaccineId);

    if (record) {
      return record.status;
    }

    const baby = babyService.getCurrentBaby();
    if (!baby) return 'pending';

    const ageInMonths = getAgeInMonths(baby.birthDate);

    // 如果宝宝月龄已超过推荐月龄+1个月，且未接种，标记为逾期
    if (ageInMonths > recommendedMonth + 1) {
      return 'overdue';
    }

    return 'pending';
  }

  /**
   * 生成完整的疫苗接种计划（合并静态清单 + 接种记录）
   * 按月龄分组返回
   */
  getVaccinePlan(): {
    month: number;
    monthLabel: string;
    vaccines: (VaccinePlanItem & {
      statusLabel: string;
      statusColor: string;
      statusBgColor: string;
      dotColor: string;
      dateText: string;
    })[];
  }[] {
    const months = getScheduleMonths();
    const result: any[] = [];

    months.forEach((month) => {
      const vaccineIds = VACCINE_SCHEDULE[month] || [];
      const vaccines = vaccineIds
        .map((id) => {
          const vaccine = getVaccineById(id);
          if (!vaccine) return null;

          const record = this.getRecordByVaccineId(id);
          const status = this.getVaccineStatus(id, vaccine.recommendedMonth);
          const recommendedDate = this.getRecommendedDate(vaccine.recommendedMonth);
          const config = STATUS_CONFIG[status];

          return {
            vaccine,
            record,
            status,
            recommendedDate,
            statusLabel: config.label,
            statusColor: config.color,
            statusBgColor: config.bgColor,
            dotColor: config.dotColor,
            dateText: record?.date
              ? formatDate(record.date, 'YYYY-MM-DD')
              : `推荐 ${formatDate(recommendedDate, 'MM月DD日')}`,
          };
        })
        .filter(Boolean);

      if (vaccines.length > 0) {
        result.push({
          month,
          monthLabel: MONTH_LABELS[month] || `${month}月龄`,
          vaccines,
        });
      }
    });

    return result;
  }

  /**
   * 获取统计摘要
   */
  getSummary(): {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    progress: number;
  } {
    const plan = this.getVaccinePlan();
    let total = 0;
    let completed = 0;
    let pending = 0;
    let overdue = 0;

    plan.forEach((group) => {
      group.vaccines.forEach((v: any) => {
        total++;
        if (v.status === 'completed') completed++;
        else if (v.status === 'overdue') overdue++;
        else pending++;
      });
    });

    return {
      total,
      completed,
      pending,
      overdue,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  /**
   * 获取即将到期的疫苗（当前月龄±1个月内待接种）
   */
  getUpcomingVaccines(): VaccinePlanItem[] {
    const baby = babyService.getCurrentBaby();
    if (!baby) return [];

    const ageInMonths = getAgeInMonths(baby.birthDate);
    const upcoming: VaccinePlanItem[] = [];

    VACCINE_LIST.forEach((vaccine) => {
      if (Math.abs(vaccine.recommendedMonth - ageInMonths) <= 1) {
        const record = this.getRecordByVaccineId(vaccine.id);
        if (!record || record.status !== 'completed') {
          upcoming.push({
            vaccine,
            record,
            status: this.getVaccineStatus(vaccine.id, vaccine.recommendedMonth),
            recommendedDate: this.getRecommendedDate(vaccine.recommendedMonth),
          });
        }
      }
    });

    return upcoming;
  }

  /**
   * 获取状态配置
   */
  getStatusConfig(status: VaccineStatus) {
    return STATUS_CONFIG[status];
  }
}

export const vaccineService = new VaccineService();
export default vaccineService;

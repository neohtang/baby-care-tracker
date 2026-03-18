/**
 * FeedingService - 喂养记录管理服务
 * 封装喂养记录的 CRUD 操作、日统计、类型筛选
 */

import { feedingStorage, generateId, nowISO } from './storage';
import { validateFeedingRecord } from '../utils/validator';
import {
  getToday,
  formatTime,
  getRelativeTime,
  diffInMinutes,
  formatDuration,
} from '../utils/date';
import { babyService } from './baby';
import eventBus, { Events } from '../utils/event-bus';
import type {
  FeedingRecord,
  FeedingType,
  FeedingDailySummary,
  CreateFeedingInput,
  UpdateFeedingInput,
} from '../types/index';

/** 喂养类型配置 */
const FEEDING_TYPE_CONFIG: Record<FeedingType, { name: string; icon: string; iconBg: string }> = {
  breast: { name: '母乳', icon: '/assets/icons/breastfeed.svg', iconBg: '#FCE7F3' },
  formula: { name: '配方奶', icon: '/assets/icons/bottle.svg', iconBg: '#DBEAFE' },
  solid: { name: '辅食', icon: '/assets/icons/solid-food.svg', iconBg: '#FEF3C7' },
};

/** 母乳侧文本 */
const SIDE_TEXT: Record<string, string> = {
  left: '左侧',
  right: '右侧',
  both: '双侧',
};

class FeedingService {
  /**
   * 获取当前宝宝的所有喂养记录
   */
  getAllRecords(): FeedingRecord[] {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return [];
    return feedingStorage.query((r: FeedingRecord) => r.babyId === babyId);
  }

  /**
   * 按日期获取记录
   */
  getRecordsByDate(date: string): FeedingRecord[] {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return [];
    return feedingStorage.query((r: FeedingRecord) => {
      return r.babyId === babyId && r.startTime.substring(0, 10) === date;
    });
  }

  /**
   * 获取今日记录
   */
  getTodayRecords(): FeedingRecord[] {
    return this.getRecordsByDate(getToday());
  }

  /**
   * 按类型筛选今日记录
   */
  getTodayRecordsByType(type: FeedingType): FeedingRecord[] {
    return this.getTodayRecords().filter((r) => r.type === type);
  }

  /**
   * 获取单条记录
   */
  getRecordById(id: string): FeedingRecord | undefined {
    return feedingStorage.getById(id);
  }

  /**
   * 添加喂养记录
   */
  addRecord(input: CreateFeedingInput): FeedingRecord | null {
    const validation = validateFeedingRecord(input);
    if (!validation.valid) {
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return null;
    }

    const now = nowISO();
    const record: FeedingRecord = {
      id: generateId(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    // 母乳喂养自动计算时长
    if (record.type === 'breast' && record.startTime && record.endTime && !record.duration) {
      record.duration = diffInMinutes(record.startTime, record.endTime);
    }

    feedingStorage.add(record);
    eventBus.emit(Events.FEEDING_CHANGED, record);
    return record;
  }

  /**
   * 更新喂养记录
   */
  updateRecord(id: string, updates: UpdateFeedingInput): FeedingRecord | null {
    const existing = feedingStorage.getById(id);
    if (!existing) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      return null;
    }

    const merged = { ...existing, ...updates };
    const validation = validateFeedingRecord(merged);
    if (!validation.valid) {
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return null;
    }

    const updated = feedingStorage.update(id, {
      ...updates,
      updatedAt: nowISO(),
    } as any);

    if (updated) {
      eventBus.emit(Events.FEEDING_CHANGED, updated);
    }
    return (updated as FeedingRecord) || null;
  }

  /**
   * 删除喂养记录
   */
  removeRecord(id: string): boolean {
    const success = feedingStorage.remove(id);
    if (success) {
      eventBus.emit(Events.FEEDING_CHANGED);
    }
    return success;
  }

  /**
   * 计算日统计
   */
  getDailySummary(date: string): FeedingDailySummary {
    const records = this.getRecordsByDate(date);

    const summary: FeedingDailySummary = {
      date,
      totalCount: records.length,
      breastCount: 0,
      formulaCount: 0,
      solidCount: 0,
      totalBreastDuration: 0,
      totalFormulaAmount: 0,
      totalSolidAmount: 0,
    };

    records.forEach((r) => {
      switch (r.type) {
        case 'breast':
          summary.breastCount++;
          summary.totalBreastDuration += r.duration || 0;
          break;
        case 'formula':
          summary.formulaCount++;
          summary.totalFormulaAmount += r.amount || 0;
          break;
        case 'solid':
          summary.solidCount++;
          summary.totalSolidAmount += r.amount || 0;
          break;
      }
    });

    return summary;
  }

  /**
   * 获取今日统计
   */
  getTodaySummary(): FeedingDailySummary {
    return this.getDailySummary(getToday());
  }

  /**
   * 将记录转换为列表展示格式
   */
  formatRecordForDisplay(record: FeedingRecord): {
    id: string;
    icon: string;
    iconBg: string;
    typeName: string;
    timeText: string;
    detail: string;
    type: FeedingType;
    tags: { text: string; color?: string; bgColor?: string }[];
  } {
    const config = FEEDING_TYPE_CONFIG[record.type];
    let detail = '';
    const tags: { text: string; color?: string; bgColor?: string }[] = [];

    switch (record.type) {
      case 'breast':
        if (record.side) {
          tags.push({ text: SIDE_TEXT[record.side] || record.side });
        }
        if (record.duration) {
          detail = formatDuration(record.duration);
        }
        break;
      case 'formula':
        detail = `${record.amount || 0}ml`;
        if (record.formulaBrand) {
          tags.push({ text: record.formulaBrand });
        }
        break;
      case 'solid':
        detail = `${record.amount || 0}g`;
        if (record.solidFood) {
          detail = `${record.solidFood} ${detail}`;
        }
        break;
    }

    if (record.note) {
      detail += detail ? ` · ${record.note}` : record.note;
    }

    return {
      id: record.id,
      icon: config.icon,
      iconBg: config.iconBg,
      typeName: config.name,
      timeText: getRelativeTime(record.startTime),
      detail,
      type: record.type,
      tags,
    };
  }

  /**
   * 批量格式化记录列表
   */
  formatRecordsForDisplay(
    records: FeedingRecord[],
  ): ReturnType<typeof this.formatRecordForDisplay>[] {
    return records.map((r) => this.formatRecordForDisplay(r));
  }

  /**
   * 获取类型配置
   */
  getTypeConfig(type: FeedingType) {
    return FEEDING_TYPE_CONFIG[type];
  }

  /**
   * 获取所有类型配置
   */
  getAllTypeConfigs() {
    return FEEDING_TYPE_CONFIG;
  }
}

export const feedingService = new FeedingService();
export default feedingService;

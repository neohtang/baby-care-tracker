/**
 * SleepService - 睡眠记录管理服务
 * 封装睡眠记录的 CRUD、计时器状态管理、日/夜分类统计
 */

import { sleepStorage, generateId, nowISO } from './storage';
import { validateSleepRecord } from '../utils/validator';
import {
  getToday, formatTime, getRelativeTime,
  diffInMinutes, formatDuration, isDaytime, getNowISO,
} from '../utils/date';
import { babyService } from './baby';
import eventBus, { Events } from '../utils/event-bus';
import type {
  SleepRecord,
  SleepType,
  SleepDailySummary,
  CreateSleepInput,
  UpdateSleepInput,
} from '../types/index';

/** 睡眠状态存储 key */
const SLEEP_STATE_KEY = 'sleep_active_state';

/** 进行中的睡眠状态 */
interface ActiveSleepState {
  startTime: string;
  babyId: string;
  type: SleepType;
}

class SleepService {
  /**
   * 获取当前宝宝的所有睡眠记录
   */
  getAllRecords(): SleepRecord[] {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return [];
    return sleepStorage.query((r: SleepRecord) => r.babyId === babyId);
  }

  /**
   * 按日期获取记录
   */
  getRecordsByDate(date: string): SleepRecord[] {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return [];
    return sleepStorage.query((r: SleepRecord) => {
      return r.babyId === babyId && r.startTime.substring(0, 10) === date;
    });
  }

  /**
   * 获取今日记录
   */
  getTodayRecords(): SleepRecord[] {
    return this.getRecordsByDate(getToday());
  }

  /**
   * 获取单条记录
   */
  getRecordById(id: string): SleepRecord | undefined {
    return sleepStorage.getById(id);
  }

  /**
   * 开始睡眠（一键计时）
   */
  startSleep(): ActiveSleepState | null {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return null;
    }

    const now = getNowISO();
    const type: SleepType = isDaytime(now) ? 'nap' : 'night';

    const state: ActiveSleepState = {
      startTime: now,
      babyId,
      type,
    };

    try {
      wx.setStorageSync(SLEEP_STATE_KEY, state);
    } catch (e) {
      console.error('[SleepService] 保存睡眠状态失败:', e);
    }

    return state;
  }

  /**
   * 结束睡眠（一键计时），自动保存记录
   */
  endSleep(): SleepRecord | null {
    const state = this.getActiveSleepState();
    if (!state) {
      wx.showToast({ title: '当前没有进行中的睡眠', icon: 'none' });
      return null;
    }

    const endTime = getNowISO();
    const duration = diffInMinutes(state.startTime, endTime);

    const record = this.addRecord({
      babyId: state.babyId,
      startTime: state.startTime,
      endTime,
      duration,
      type: state.type,
    });

    // 清除进行中状态
    this.clearActiveSleepState();

    return record;
  }

  /**
   * 获取进行中的睡眠状态
   */
  getActiveSleepState(): ActiveSleepState | null {
    try {
      const state = wx.getStorageSync(SLEEP_STATE_KEY);
      if (state && state.startTime) {
        return state as ActiveSleepState;
      }
    } catch {}
    return null;
  }

  /**
   * 清除进行中的睡眠状态
   */
  clearActiveSleepState(): void {
    try {
      wx.removeStorageSync(SLEEP_STATE_KEY);
    } catch {}
  }

  /**
   * 是否有进行中的睡眠
   */
  isSleeping(): boolean {
    return this.getActiveSleepState() !== null;
  }

  /**
   * 获取进行中睡眠已经持续的分钟数
   */
  getActiveSleepDuration(): number {
    const state = this.getActiveSleepState();
    if (!state) return 0;
    return diffInMinutes(state.startTime, getNowISO());
  }

  /**
   * 添加睡眠记录
   */
  addRecord(input: CreateSleepInput): SleepRecord | null {
    const validation = validateSleepRecord(input);
    if (!validation.valid) {
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return null;
    }

    const now = nowISO();

    // 自动计算时长
    let duration = input.duration;
    if (!duration && input.startTime && input.endTime) {
      duration = diffInMinutes(input.startTime, input.endTime);
    }

    const record: SleepRecord = {
      id: generateId(),
      ...input,
      duration,
      createdAt: now,
      updatedAt: now,
    };

    sleepStorage.add(record);
    eventBus.emit(Events.SLEEP_CHANGED, record);
    return record;
  }

  /**
   * 更新睡眠记录
   */
  updateRecord(id: string, updates: UpdateSleepInput): SleepRecord | null {
    const existing = sleepStorage.getById(id);
    if (!existing) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      return null;
    }

    const merged = { ...existing, ...updates };
    const validation = validateSleepRecord(merged);
    if (!validation.valid) {
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return null;
    }

    // 自动重算时长
    if (merged.startTime && merged.endTime) {
      merged.duration = diffInMinutes(merged.startTime, merged.endTime);
    }

    const updated = sleepStorage.update(id, {
      ...updates,
      duration: merged.duration,
      updatedAt: nowISO(),
    } as any);

    if (updated) {
      eventBus.emit(Events.SLEEP_CHANGED, updated);
    }
    return updated as SleepRecord || null;
  }

  /**
   * 删除睡眠记录
   */
  removeRecord(id: string): boolean {
    const success = sleepStorage.remove(id);
    if (success) {
      eventBus.emit(Events.SLEEP_CHANGED);
    }
    return success;
  }

  /**
   * 计算日统计
   */
  getDailySummary(date: string): SleepDailySummary {
    const records = this.getRecordsByDate(date);

    const summary: SleepDailySummary = {
      date,
      totalCount: records.length,
      napCount: 0,
      nightCount: 0,
      totalDuration: 0,
      napDuration: 0,
      nightDuration: 0,
    };

    records.forEach(r => {
      const dur = r.duration || 0;
      summary.totalDuration += dur;
      if (r.type === 'nap') {
        summary.napCount++;
        summary.napDuration += dur;
      } else {
        summary.nightCount++;
        summary.nightDuration += dur;
      }
    });

    return summary;
  }

  /**
   * 获取今日统计
   */
  getTodaySummary(): SleepDailySummary {
    return this.getDailySummary(getToday());
  }

  /**
   * 将记录转换为列表展示格式
   */
  formatRecordForDisplay(record: SleepRecord): {
    id: string;
    icon: string;
    iconBg: string;
    typeName: string;
    timeText: string;
    startTimeText: string;
    endTimeText: string;
    durationText: string;
    detail: string;
    type: SleepType;
  } {
    const isNap = record.type === 'nap';
    return {
      id: record.id,
      icon: isNap ? '/assets/icons/sun.svg' : '/assets/icons/moon.svg',
      iconBg: isNap ? '#FEF3C7' : '#DBEAFE',
      typeName: isNap ? '日间小睡' : '夜间睡眠',
      timeText: getRelativeTime(record.startTime),
      startTimeText: formatTime(record.startTime),
      endTimeText: record.endTime ? formatTime(record.endTime) : '进行中',
      durationText: record.duration ? formatDuration(record.duration) : '--',
      detail: record.note || '',
      type: record.type,
    };
  }

  /**
   * 批量格式化记录列表
   */
  formatRecordsForDisplay(records: SleepRecord[]): ReturnType<typeof this.formatRecordForDisplay>[] {
    return records.map(r => this.formatRecordForDisplay(r));
  }
}

export const sleepService = new SleepService();
export default sleepService;

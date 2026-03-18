/**
 * ReminderService - 智能提醒系统核心服务
 *
 * 功能：
 * - 基于喂养间隔计算下次喂养提醒
 * - 基于疫苗接种计划生成到期/逾期提醒
 * - 管理提醒设置的 CRUD
 * - 提供综合提醒摘要供页面消费
 */

import { reminderStorage, generateId, nowISO } from './storage';
import { feedingService } from './feeding';
import { vaccineService } from './vaccine';
import { babyService } from './baby';
import eventBus, { Events } from '../utils/event-bus';
import { diffInMinutes } from '../utils/date';
import type {
  ReminderSettings,
  UpdateReminderSettingsInput,
  FeedingReminderStatus,
  VaccineReminderItem,
  ReminderSummary,
  FeedingIntervalOption,
} from '../types/index';

/** 喂养间隔预设选项 */
const FEEDING_INTERVAL_OPTIONS: FeedingIntervalOption[] = [
  { label: '1.5 小时', value: 90 },
  { label: '2 小时', value: 120 },
  { label: '2.5 小时', value: 150 },
  { label: '3 小时', value: 180 },
  { label: '3.5 小时', value: 210 },
  { label: '4 小时', value: 240 },
];

/** 喂养类型名称映射 */
const FEEDING_TYPE_NAME: Record<string, string> = {
  breast: '母乳',
  formula: '配方奶',
  solid: '辅食',
};

/** 默认提醒设置 */
const DEFAULT_SETTINGS: Omit<ReminderSettings, 'id' | 'babyId' | 'createdAt' | 'updatedAt'> = {
  feedingReminderEnabled: true,
  feedingIntervalMinutes: 180,
  vaccineReminderEnabled: true,
  vaccineAdvanceDays: 7,
};

class ReminderService {
  /**
   * 获取当前宝宝的提醒设置
   * 如果不存在则自动创建默认设置
   */
  getSettings(): ReminderSettings | null {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return null;

    const existing = reminderStorage.query((s: ReminderSettings) => s.babyId === babyId);

    if (existing.length > 0) {
      return existing[0];
    }

    // 首次访问，自动创建默认设置
    return this.createDefaultSettings(babyId);
  }

  /**
   * 创建默认提醒设置
   */
  private createDefaultSettings(babyId: string): ReminderSettings {
    const now = nowISO();
    const settings: ReminderSettings = {
      id: generateId(),
      babyId,
      ...DEFAULT_SETTINGS,
      createdAt: now,
      updatedAt: now,
    };

    reminderStorage.add(settings);
    return settings;
  }

  /**
   * 更新提醒设置
   */
  updateSettings(updates: UpdateReminderSettingsInput): ReminderSettings | null {
    const settings = this.getSettings();
    if (!settings) return null;

    const updated = reminderStorage.update(settings.id, {
      ...updates,
      updatedAt: nowISO(),
    } as any);

    if (updated) {
      eventBus.emit(Events.REMINDER_SETTINGS_CHANGED, updated);
    }

    return (updated as ReminderSettings) || null;
  }

  // ============ 喂养提醒 ============

  /**
   * 获取喂养提醒状态
   */
  getFeedingReminderStatus(): FeedingReminderStatus | null {
    const settings = this.getSettings();
    if (!settings || !settings.feedingReminderEnabled) return null;

    const baby = babyService.getCurrentBaby();
    if (!baby) return null;

    // 获取最近一次喂养记录
    const todayRecords = feedingService.getTodayRecords();
    const allRecords = todayRecords.length > 0 ? todayRecords : feedingService.getAllRecords();
    const lastRecord = allRecords.length > 0 ? allRecords[0] : null;

    if (!lastRecord) {
      return {
        hasReminder: false,
        minutesSinceLastFeeding: 0,
        minutesUntilNext: settings.feedingIntervalMinutes,
        lastFeedingTime: null,
        lastFeedingTypeName: '',
        reminderText: '暂无喂养记录',
        isOverdue: false,
        progress: 0,
      };
    }

    const now = new Date().toISOString();
    const minutesSince = diffInMinutes(lastRecord.startTime, now);
    const minutesUntil = settings.feedingIntervalMinutes - minutesSince;
    const isOverdue = minutesUntil <= 0;
    const progress = Math.min(
      Math.round((minutesSince / settings.feedingIntervalMinutes) * 100),
      150,
    );

    let reminderText: string;
    if (isOverdue) {
      const overdueMinutes = Math.abs(minutesUntil);
      if (overdueMinutes >= 60) {
        const hours = Math.floor(overdueMinutes / 60);
        const mins = overdueMinutes % 60;
        reminderText = mins > 0 ? `已超时 ${hours}h${mins}min` : `已超时 ${hours}h`;
      } else {
        reminderText = `已超时 ${overdueMinutes}min`;
      }
    } else {
      if (minutesUntil >= 60) {
        const hours = Math.floor(minutesUntil / 60);
        const mins = minutesUntil % 60;
        reminderText = mins > 0 ? `约 ${hours}h${mins}min 后喂养` : `约 ${hours}h 后喂养`;
      } else {
        reminderText = `约 ${minutesUntil}min 后喂养`;
      }
    }

    return {
      hasReminder: true,
      minutesSinceLastFeeding: minutesSince,
      minutesUntilNext: minutesUntil,
      lastFeedingTime: lastRecord.startTime,
      lastFeedingTypeName: FEEDING_TYPE_NAME[lastRecord.type] || lastRecord.type,
      reminderText,
      isOverdue,
      progress,
    };
  }

  // ============ 疫苗提醒 ============

  /**
   * 获取疫苗提醒列表
   */
  getVaccineReminders(): VaccineReminderItem[] {
    const settings = this.getSettings();
    if (!settings || !settings.vaccineReminderEnabled) return [];

    const baby = babyService.getCurrentBaby();
    if (!baby) return [];

    const upcoming = vaccineService.getUpcomingVaccines();
    const now = new Date();
    const reminders: VaccineReminderItem[] = [];

    upcoming.forEach((item) => {
      if (!item.recommendedDate) return;

      const recDate = new Date(item.recommendedDate);
      const diffTime = recDate.getTime() - now.getTime();
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isOverdue = daysUntil < 0;

      // 只显示提前 N 天到逾期 30 天内的疫苗
      if (daysUntil <= settings.vaccineAdvanceDays && daysUntil >= -30) {
        let reminderText: string;
        if (isOverdue) {
          reminderText = `已逾期 ${Math.abs(daysUntil)} 天`;
        } else if (daysUntil === 0) {
          reminderText = '今日应接种';
        } else {
          reminderText = `${daysUntil} 天后应接种`;
        }

        reminders.push({
          vaccineId: item.vaccine.id,
          vaccineName: item.vaccine.name,
          recommendedDate: item.recommendedDate,
          daysUntil,
          isOverdue,
          reminderText,
        });
      }
    });

    // 逾期的排前面，然后按天数排序
    reminders.sort((a, b) => a.daysUntil - b.daysUntil);

    return reminders;
  }

  // ============ 综合提醒 ============

  /**
   * 获取综合提醒摘要
   */
  getReminderSummary(): ReminderSummary {
    const feeding = this.getFeedingReminderStatus();
    const vaccines = this.getVaccineReminders();

    let activeCount = 0;
    if (feeding?.isOverdue) activeCount++;
    activeCount += vaccines.filter((v) => v.isOverdue || v.daysUntil <= 3).length;

    return {
      feeding,
      vaccines,
      hasActiveReminders: activeCount > 0,
      activeReminderCount: activeCount,
    };
  }

  // ============ 辅助方法 ============

  /**
   * 获取喂养间隔预设选项
   */
  getFeedingIntervalOptions(): FeedingIntervalOption[] {
    return FEEDING_INTERVAL_OPTIONS;
  }

  /**
   * 格式化喂养间隔为文本
   */
  formatIntervalText(minutes: number): string {
    if (minutes >= 60) {
      const hours = minutes / 60;
      return hours % 1 === 0 ? `${hours} 小时` : `${hours.toFixed(1)} 小时`;
    }
    return `${minutes} 分钟`;
  }

  /**
   * 检查是否应该弹出喂养提醒
   * 用于 App onShow 时判断是否需要提示用户
   */
  shouldShowFeedingAlert(): boolean {
    const status = this.getFeedingReminderStatus();
    if (!status || !status.hasReminder) return false;
    // 超时 5 分钟以上才弹提醒，避免刚到时间就弹
    return status.isOverdue && Math.abs(status.minutesUntilNext) >= 5;
  }

  /**
   * 检查是否有紧急疫苗提醒
   * 用于 App onShow 时判断是否需要提示用户
   */
  shouldShowVaccineAlert(): boolean {
    const reminders = this.getVaccineReminders();
    // 有逾期或今天该接种的疫苗
    return reminders.some((v) => v.daysUntil <= 0);
  }
}

export const reminderService = new ReminderService();
export default reminderService;

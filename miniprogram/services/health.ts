/**
 * HealthService - 体温/健康记录管理服务
 * 封装体温、用药、症状记录的 CRUD、异常体温检测、体温趋势
 */

import { healthStorage, generateId, nowISO } from './storage';
import { validateHealthRecord } from '../utils/validator';
import { getToday, getRelativeTime, formatTime, getNowISO } from '../utils/date';
import { babyService } from './baby';
import eventBus, { Events } from '../utils/event-bus';
import type {
  HealthRecord,
  HealthRecordType,
  TemperatureSite,
  TemperatureLevel,
  CreateHealthInput,
  UpdateHealthInput,
} from '../types/index';

/** 测量部位文本映射 */
const SITE_TEXT: Record<TemperatureSite, string> = {
  axillary: '腋温',
  forehead: '额温',
  ear: '耳温',
  oral: '口温',
  rectal: '肛温',
};

/** 体温等级文本映射 */
const LEVEL_TEXT: Record<TemperatureLevel, string> = {
  low: '偏低',
  normal: '正常',
  mild_fever: '低烧',
  moderate_fever: '中烧',
  high_fever: '高烧',
};

/** 体温等级颜色映射 */
const LEVEL_COLOR: Record<TemperatureLevel, string> = {
  low: '#60A5FA',
  normal: '#34D399',
  mild_fever: '#FBBF24',
  moderate_fever: '#FB923C',
  high_fever: '#F87171',
};

/** 记录类型配置 */
const RECORD_TYPE_CONFIG: Record<HealthRecordType, { name: string; icon: string; iconBg: string }> =
  {
    temperature: { name: '体温', icon: '/assets/icons/thermometer.svg', iconBg: '#D1FAE5' },
    medication: { name: '用药', icon: '/assets/icons/medicine.svg', iconBg: '#DBEAFE' },
    symptom: { name: '症状', icon: '/assets/icons/bandage.svg', iconBg: '#FEE2E2' },
  };

class HealthService {
  /**
   * 获取当前宝宝的所有健康记录
   */
  getAllRecords(): HealthRecord[] {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return [];
    return healthStorage.query((r: HealthRecord) => r.babyId === babyId);
  }

  /**
   * 按日期获取记录
   */
  getRecordsByDate(date: string): HealthRecord[] {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return [];
    return healthStorage.query((r: HealthRecord) => {
      return r.babyId === babyId && r.time.substring(0, 10) === date;
    });
  }

  /**
   * 获取今日记录
   */
  getTodayRecords(): HealthRecord[] {
    return this.getRecordsByDate(getToday());
  }

  /**
   * 按类型获取记录
   */
  getRecordsByType(recordType: HealthRecordType): HealthRecord[] {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return [];
    return healthStorage.query((r: HealthRecord) => {
      return r.babyId === babyId && r.recordType === recordType;
    });
  }

  /**
   * 获取单条记录
   */
  getRecordById(id: string): HealthRecord | undefined {
    return healthStorage.getById(id);
  }

  /**
   * 根据体温值判断等级
   */
  getTemperatureLevel(temperature: number): TemperatureLevel {
    if (temperature < 36.0) return 'low';
    if (temperature <= 37.3) return 'normal';
    if (temperature <= 38.0) return 'mild_fever';
    if (temperature <= 39.0) return 'moderate_fever';
    return 'high_fever';
  }

  /**
   * 添加健康记录
   */
  addRecord(input: CreateHealthInput): HealthRecord | null {
    const validation = validateHealthRecord(input);
    if (!validation.valid) {
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return null;
    }

    const now = nowISO();
    const record: HealthRecord = {
      id: generateId(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    // 自动判断体温等级
    if (record.recordType === 'temperature' && record.temperature) {
      record.temperatureLevel = this.getTemperatureLevel(record.temperature);
    }

    healthStorage.add(record);
    eventBus.emit(Events.HEALTH_CHANGED, record);
    return record;
  }

  /**
   * 更新健康记录
   */
  updateRecord(id: string, updates: UpdateHealthInput): HealthRecord | null {
    const existing = healthStorage.getById(id);
    if (!existing) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      return null;
    }

    const merged = { ...existing, ...updates };
    const validation = validateHealthRecord(merged);
    if (!validation.valid) {
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return null;
    }

    // 重新计算体温等级
    if (merged.recordType === 'temperature' && merged.temperature) {
      merged.temperatureLevel = this.getTemperatureLevel(merged.temperature);
    }

    const updated = healthStorage.update(id, {
      ...updates,
      temperatureLevel: merged.temperatureLevel,
      updatedAt: nowISO(),
    } as any);

    if (updated) {
      eventBus.emit(Events.HEALTH_CHANGED, updated);
    }
    return (updated as HealthRecord) || null;
  }

  /**
   * 删除健康记录
   */
  removeRecord(id: string): boolean {
    const success = healthStorage.remove(id);
    if (success) {
      eventBus.emit(Events.HEALTH_CHANGED);
    }
    return success;
  }

  /**
   * 获取最近一次体温记录
   */
  getLatestTemperature(): HealthRecord | null {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return null;

    const tempRecords = healthStorage.query((r: HealthRecord) => {
      return r.babyId === babyId && r.recordType === 'temperature' && r.temperature !== undefined;
    });

    return tempRecords.length > 0 ? tempRecords[0] : null;
  }

  /**
   * 获取最近 N 条体温记录（用于趋势展示）
   */
  getRecentTemperatures(count: number = 10): {
    temperature: number;
    time: string;
    level: TemperatureLevel;
    timeText: string;
  }[] {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return [];

    const records = healthStorage.query((r: HealthRecord) => {
      return r.babyId === babyId && r.recordType === 'temperature' && r.temperature !== undefined;
    });

    return records
      .slice(0, count)
      .map((r) => ({
        temperature: r.temperature!,
        time: r.time,
        level: r.temperatureLevel || this.getTemperatureLevel(r.temperature!),
        timeText: formatTime(r.time),
      }))
      .reverse(); // 按时间正序
  }

  /**
   * 判断最近体温是否异常
   */
  isLatestTempAbnormal(): boolean {
    const latest = this.getLatestTemperature();
    if (!latest || !latest.temperature) return false;
    const level = this.getTemperatureLevel(latest.temperature);
    return level !== 'normal' && level !== 'low';
  }

  /**
   * 将记录转换为列表展示格式
   */
  formatRecordForDisplay(record: HealthRecord): {
    id: string;
    icon: string;
    iconBg: string;
    typeName: string;
    timeText: string;
    detail: string;
    recordType: HealthRecordType;
    isAbnormal: boolean;
    temperature?: number;
    methodName?: string;
    levelText?: string;
    levelColor?: string;
    tags: { text: string; color?: string; bgColor?: string }[];
  } {
    const config = RECORD_TYPE_CONFIG[record.recordType];
    const tags: { text: string; color?: string; bgColor?: string }[] = [];
    let detail = '';
    let isAbnormal = false;
    let levelText = '';
    let levelColor = '';

    switch (record.recordType) {
      case 'temperature': {
        const level =
          record.temperatureLevel ||
          (record.temperature ? this.getTemperatureLevel(record.temperature) : 'normal');
        levelText = LEVEL_TEXT[level];
        levelColor = LEVEL_COLOR[level];
        isAbnormal = level !== 'normal' && level !== 'low';

        if (record.temperatureSite) {
          tags.push({ text: SITE_TEXT[record.temperatureSite] || record.temperatureSite });
        }
        tags.push({
          text: levelText,
          color: levelColor,
          bgColor: `${levelColor}20`,
        });

        detail = `${record.temperature?.toFixed(1)}°C`;
        break;
      }
      case 'medication':
        detail = record.medicationName || '';
        if (record.medicationDosage) {
          detail += ` ${record.medicationDosage}`;
        }
        break;
      case 'symptom':
        if (record.symptoms && record.symptoms.length > 0) {
          detail = record.symptoms.join('、');
        }
        break;
    }

    if (record.note) {
      detail += detail ? ` · ${record.note}` : record.note;
    }

    return {
      id: record.id,
      icon: config.icon,
      iconBg: isAbnormal ? '#FEE2E2' : config.iconBg,
      typeName: config.name,
      timeText: getRelativeTime(record.time),
      detail,
      recordType: record.recordType,
      isAbnormal,
      temperature: record.temperature,
      methodName: record.temperatureSite ? SITE_TEXT[record.temperatureSite] : undefined,
      levelText,
      levelColor,
      tags,
    };
  }

  /**
   * 批量格式化记录列表
   */
  formatRecordsForDisplay(
    records: HealthRecord[],
  ): ReturnType<typeof this.formatRecordForDisplay>[] {
    return records.map((r) => this.formatRecordForDisplay(r));
  }

  /**
   * 获取测量部位选项
   */
  getSiteOptions(): { value: TemperatureSite; label: string }[] {
    return Object.entries(SITE_TEXT).map(([value, label]) => ({
      value: value as TemperatureSite,
      label,
    }));
  }

  /**
   * 获取等级文本
   */
  getLevelText(level: TemperatureLevel): string {
    return LEVEL_TEXT[level];
  }

  /**
   * 获取等级颜色
   */
  getLevelColor(level: TemperatureLevel): string {
    return LEVEL_COLOR[level];
  }
}

export const healthService = new HealthService();
export default healthService;

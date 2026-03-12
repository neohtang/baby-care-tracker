/**
 * DiaperService - 排便记录管理服务
 * 封装排便记录的 CRUD、日统计、异常检测
 */

import { diaperStorage, generateId, nowISO } from './storage';
import { validateDiaperRecord } from '../utils/validator';
import { getToday, getRelativeTime, getNowISO } from '../utils/date';
import { babyService } from './baby';
import eventBus, { Events } from '../utils/event-bus';
import type {
  DiaperRecord,
  DiaperType,
  DiaperAlert,
  PoopColor,
  PoopTexture,
  DiaperDailySummary,
  CreateDiaperInput,
  UpdateDiaperInput,
} from '../types/index';

/** 排便类型配置 */
const DIAPER_TYPE_CONFIG: Record<DiaperType, { name: string; icon: string; iconBg: string }> = {
  pee: { name: '小便', icon: '/assets/icons/waterdrop.svg', iconBg: '#FEF3C7' },
  poop: { name: '大便', icon: '/assets/icons/poop.svg', iconBg: '#D1FAE5' },
  both: { name: '大小便', icon: '/assets/icons/baby.svg', iconBg: '#EDE9FE' },
};

/** 大便颜色中文映射 */
const COLOR_TEXT: Record<PoopColor, string> = {
  yellow: '黄色',
  green: '绿色',
  brown: '棕色',
  black: '黑色',
  red: '红色',
  white: '白色',
  other: '其他',
};

/** 大便质地中文映射 */
const TEXTURE_TEXT: Record<PoopTexture, string> = {
  watery: '稀水样',
  soft: '糊状',
  normal: '软便',
  hard: '成形',
  mucus: '黏液样',
  other: '其他',
};

/** 异常标记中文映射 */
const ALERT_TEXT: Record<DiaperAlert, string> = {
  diarrhea: '腹泻',
  constipation: '便秘',
  blood: '血便',
  mucus: '黏液',
  none: '',
};

class DiaperService {
  /**
   * 获取当前宝宝的所有排便记录
   */
  getAllRecords(): DiaperRecord[] {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return [];
    return diaperStorage.query((r: DiaperRecord) => r.babyId === babyId);
  }

  /**
   * 按日期获取记录
   */
  getRecordsByDate(date: string): DiaperRecord[] {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return [];
    return diaperStorage.query((r: DiaperRecord) => {
      return r.babyId === babyId && r.time.substring(0, 10) === date;
    });
  }

  /**
   * 获取今日记录
   */
  getTodayRecords(): DiaperRecord[] {
    return this.getRecordsByDate(getToday());
  }

  /**
   * 获取单条记录
   */
  getRecordById(id: string): DiaperRecord | undefined {
    return diaperStorage.getById(id);
  }

  /**
   * 添加排便记录
   */
  addRecord(input: CreateDiaperInput): DiaperRecord | null {
    const validation = validateDiaperRecord(input);
    if (!validation.valid) {
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return null;
    }

    const now = nowISO();
    const record: DiaperRecord = {
      id: generateId(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    // 自动异常检测
    if (!record.alert || record.alert === 'none') {
      record.alert = this.detectAbnormality(record);
    }

    diaperStorage.add(record);
    eventBus.emit(Events.DIAPER_CHANGED, record);
    return record;
  }

  /**
   * 更新排便记录
   */
  updateRecord(id: string, updates: UpdateDiaperInput): DiaperRecord | null {
    const existing = diaperStorage.getById(id);
    if (!existing) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      return null;
    }

    const merged = { ...existing, ...updates };
    const validation = validateDiaperRecord(merged);
    if (!validation.valid) {
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return null;
    }

    const updated = diaperStorage.update(id, {
      ...updates,
      updatedAt: nowISO(),
    } as any);

    if (updated) {
      eventBus.emit(Events.DIAPER_CHANGED, updated);
    }
    return updated as DiaperRecord || null;
  }

  /**
   * 删除排便记录
   */
  removeRecord(id: string): boolean {
    const success = diaperStorage.remove(id);
    if (success) {
      eventBus.emit(Events.DIAPER_CHANGED);
    }
    return success;
  }

  /**
   * 计算日统计
   */
  getDailySummary(date: string): DiaperDailySummary {
    const records = this.getRecordsByDate(date);
    const alerts: DiaperAlert[] = [];

    let peeCount = 0;
    let poopCount = 0;

    records.forEach(r => {
      if (r.type === 'pee') {
        peeCount++;
      } else if (r.type === 'poop') {
        poopCount++;
      } else {
        peeCount++;
        poopCount++;
      }

      if (r.alert && r.alert !== 'none' && !alerts.includes(r.alert)) {
        alerts.push(r.alert);
      }
    });

    return {
      date,
      totalCount: records.length,
      peeCount,
      poopCount,
      hasAlert: alerts.length > 0,
      alerts,
    };
  }

  /**
   * 获取今日统计
   */
  getTodaySummary(): DiaperDailySummary {
    return this.getDailySummary(getToday());
  }

  /**
   * 自动异常检测
   */
  detectAbnormality(record: DiaperRecord): DiaperAlert {
    if (record.type === 'pee') return 'none';

    // 血便检测
    if (record.poopColor === 'red') return 'blood';

    // 稀水样 -> 腹泻倾向
    if (record.poopTexture === 'watery') return 'diarrhea';

    // 硬便 -> 便秘倾向
    if (record.poopTexture === 'hard') return 'constipation';

    // 黏液样
    if (record.poopTexture === 'mucus') return 'mucus';

    return 'none';
  }

  /**
   * 将记录转换为列表展示格式
   */
  formatRecordForDisplay(record: DiaperRecord): {
    id: string;
    icon: string;
    iconBg: string;
    typeName: string;
    timeText: string;
    detail: string;
    type: DiaperType;
    isAbnormal: boolean;
    alertText: string;
    tags: { text: string; color?: string; bgColor?: string }[];
  } {
    const config = DIAPER_TYPE_CONFIG[record.type];
    const tags: { text: string; color?: string; bgColor?: string }[] = [];
    const detailParts: string[] = [];

    if (record.poopColor && record.type !== 'pee') {
      tags.push({ text: COLOR_TEXT[record.poopColor] || record.poopColor });
    }
    if (record.poopTexture && record.type !== 'pee') {
      tags.push({ text: TEXTURE_TEXT[record.poopTexture] || record.poopTexture });
    }

    if (record.note) {
      detailParts.push(record.note);
    }

    const isAbnormal = record.alert !== undefined && record.alert !== 'none';
    const alertText = isAbnormal && record.alert ? (ALERT_TEXT[record.alert] || '') : '';

    if (isAbnormal) {
      tags.push({
        text: alertText,
        color: '#F87171',
        bgColor: '#FEE2E2',
      });
    }

    return {
      id: record.id,
      icon: config.icon,
      iconBg: isAbnormal ? '#FEE2E2' : config.iconBg,
      typeName: config.name,
      timeText: getRelativeTime(record.time),
      detail: detailParts.join(' · '),
      type: record.type,
      isAbnormal,
      alertText,
      tags,
    };
  }

  /**
   * 批量格式化记录列表
   */
  formatRecordsForDisplay(records: DiaperRecord[]): ReturnType<typeof this.formatRecordForDisplay>[] {
    return records.map(r => this.formatRecordForDisplay(r));
  }

  /**
   * 获取颜色选项
   */
  getColorOptions(): { value: PoopColor; label: string }[] {
    return Object.entries(COLOR_TEXT).map(([value, label]) => ({
      value: value as PoopColor,
      label,
    }));
  }

  /**
   * 获取质地选项
   */
  getTextureOptions(): { value: PoopTexture; label: string }[] {
    return Object.entries(TEXTURE_TEXT).map(([value, label]) => ({
      value: value as PoopTexture,
      label,
    }));
  }

  /**
   * 获取异常类型选项
   */
  getAlertOptions(): { value: DiaperAlert; label: string }[] {
    return Object.entries(ALERT_TEXT)
      .filter(([k]) => k !== 'none')
      .map(([value, label]) => ({
        value: value as DiaperAlert,
        label,
      }));
  }
}

export const diaperService = new DiaperService();
export default diaperService;

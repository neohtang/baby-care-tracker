/**
 * GrowthService - 生长发育记录管理服务
 * 封装生长记录的 CRUD 操作、WHO 标准对照、曲线图数据生成
 */

import { growthStorage, generateId, nowISO } from './storage';
import { validateGrowthRecord } from '../utils/validator';
import { getToday, formatDate, getAgeInMonths, getAgeInDays, calculateAge } from '../utils/date';
import { babyService } from './baby';
import eventBus, { Events } from '../utils/event-bus';
import { getPercentileData, getPercentileRange, METRIC_LABELS, METRIC_UNITS } from '../data/who-standards';
import type {
  GrowthRecord,
  CreateGrowthInput,
  UpdateGrowthInput,
  GrowthChartDataPoint,
  WHOPercentilePoint,
} from '../types/index';

/** 指标类型映射 */
type GrowthMetric = 'weight' | 'height' | 'headCircumference';

/** 指标配置 */
const METRIC_CONFIG: Record<GrowthMetric, { label: string; unit: string; icon: string; color: string }> = {
  weight: { label: '体重', unit: 'kg', icon: '/assets/icons/scale.svg', color: '#C8956C' },
  height: { label: '身长', unit: 'cm', icon: '/assets/icons/ruler.svg', color: '#D4A97A' },
  headCircumference: { label: '头围', unit: 'cm', icon: '/assets/icons/brain.svg', color: '#F5A5B8' },
};

class GrowthService {
  /**
   * 获取当前宝宝的所有生长记录（按日期降序）
   */
  getAllRecords(): GrowthRecord[] {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) return [];
    return growthStorage.query((r: GrowthRecord) => r.babyId === babyId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * 获取所有记录按日期升序（用于曲线图）
   */
  getAllRecordsAsc(): GrowthRecord[] {
    return this.getAllRecords().reverse();
  }

  /**
   * 获取单条记录
   */
  getRecordById(id: string): GrowthRecord | undefined {
    return growthStorage.getById(id);
  }

  /**
   * 获取最新的生长记录
   */
  getLatestRecord(): GrowthRecord | null {
    const records = this.getAllRecords();
    return records.length > 0 ? records[0] : null;
  }

  /**
   * 添加生长记录
   */
  addRecord(input: CreateGrowthInput): GrowthRecord | null {
    const validation = validateGrowthRecord(input);
    if (!validation.valid) {
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return null;
    }

    const now = nowISO();
    const record: GrowthRecord = {
      id: generateId(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    growthStorage.add(record);
    eventBus.emit(Events.GROWTH_CHANGED, record);
    return record;
  }

  /**
   * 更新生长记录
   */
  updateRecord(id: string, updates: UpdateGrowthInput): GrowthRecord | null {
    const existing = growthStorage.getById(id);
    if (!existing) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      return null;
    }

    const merged = { ...existing, ...updates };
    const validation = validateGrowthRecord(merged);
    if (!validation.valid) {
      wx.showToast({ title: validation.errors[0], icon: 'none' });
      return null;
    }

    const updated = growthStorage.update(id, {
      ...updates,
      updatedAt: nowISO(),
    } as any);

    if (updated) {
      eventBus.emit(Events.GROWTH_CHANGED, updated);
    }
    return updated as GrowthRecord || null;
  }

  /**
   * 删除生长记录
   */
  removeRecord(id: string): boolean {
    const success = growthStorage.remove(id);
    if (success) {
      eventBus.emit(Events.GROWTH_CHANGED);
    }
    return success;
  }

  /**
   * 根据宝宝信息自动计算月龄和天龄
   */
  computeAge(measureDate: string): { ageInMonths: number; ageInDays: number } {
    const baby = babyService.getCurrentBaby();
    if (!baby) return { ageInMonths: 0, ageInDays: 0 };

    const age = calculateAge(baby.birthDate, measureDate);
    return {
      ageInMonths: age.months,
      ageInDays: age.totalDays,
    };
  }

  /**
   * 获取最新数据的展示信息
   */
  getLatestDisplay(): {
    weight: string;
    height: string;
    headCircumference: string;
    date: string;
    dateText: string;
    hasData: boolean;
    weightPercentile: string;
    heightPercentile: string;
    headPercentile: string;
  } {
    const latest = this.getLatestRecord();
    const baby = babyService.getCurrentBaby();

    if (!latest) {
      return {
        weight: '--',
        height: '--',
        headCircumference: '--',
        date: '',
        dateText: '暂无记录',
        hasData: false,
        weightPercentile: '',
        heightPercentile: '',
        headPercentile: '',
      };
    }

    const gender = baby?.gender || 'male';
    const ageMonths = latest.ageInMonths;

    return {
      weight: latest.weight !== undefined ? latest.weight.toFixed(1) : '--',
      height: latest.height !== undefined ? latest.height.toFixed(1) : '--',
      headCircumference: latest.headCircumference !== undefined ? latest.headCircumference.toFixed(1) : '--',
      date: latest.date,
      dateText: formatDate(latest.date, 'MM月DD日') + '测量',
      hasData: true,
      weightPercentile: latest.weight !== undefined
        ? getPercentileRange(gender, 'weight', ageMonths, latest.weight)
        : '',
      heightPercentile: latest.height !== undefined
        ? getPercentileRange(gender, 'height', ageMonths, latest.height)
        : '',
      headPercentile: latest.headCircumference !== undefined
        ? getPercentileRange(gender, 'headCircumference', ageMonths, latest.headCircumference)
        : '',
    };
  }

  /**
   * 生成生长曲线图数据
   * @param metric 指标类型
   * @returns 宝宝数据点数组 { month, value }
   */
  getChartData(metric: GrowthMetric): GrowthChartDataPoint[] {
    const records = this.getAllRecordsAsc();
    const fieldMap: Record<GrowthMetric, keyof GrowthRecord> = {
      weight: 'weight',
      height: 'height',
      headCircumference: 'headCircumference',
    };

    const field = fieldMap[metric];
    return records
      .filter(r => r[field] !== undefined && r[field] !== null)
      .map(r => ({
        ageInMonths: r.ageInMonths,
        value: r[field] as number,
        date: r.date,
      }));
  }

  /**
   * 获取 WHO 标准数据（按当前宝宝性别）
   */
  getWHOData(metric: GrowthMetric): WHOPercentilePoint[] {
    const baby = babyService.getCurrentBaby();
    const gender = baby?.gender || 'male';
    return getPercentileData(gender, metric);
  }

  /**
   * 将记录转换为列表展示格式
   */
  formatRecordForDisplay(record: GrowthRecord): {
    id: string;
    dateText: string;
    date: string;
    weight: string;
    height: string;
    headCircumference: string;
    ageText: string;
    hasWeight: boolean;
    hasHeight: boolean;
    hasHead: boolean;
    note: string;
  } {
    return {
      id: record.id,
      dateText: formatDate(record.date, 'YYYY年MM月DD日'),
      date: record.date,
      weight: record.weight !== undefined ? record.weight.toFixed(1) : '--',
      height: record.height !== undefined ? record.height.toFixed(1) : '--',
      headCircumference: record.headCircumference !== undefined ? record.headCircumference.toFixed(1) : '--',
      ageText: `${record.ageInMonths}个月`,
      hasWeight: record.weight !== undefined,
      hasHeight: record.height !== undefined,
      hasHead: record.headCircumference !== undefined,
      note: record.note || '',
    };
  }

  /**
   * 批量格式化
   */
  formatRecordsForDisplay(records: GrowthRecord[]): ReturnType<typeof this.formatRecordForDisplay>[] {
    return records.map(r => this.formatRecordForDisplay(r));
  }

  /**
   * 获取指标配置
   */
  getMetricConfig(metric: GrowthMetric) {
    return METRIC_CONFIG[metric];
  }

  /**
   * 获取指标标签
   */
  getMetricLabel(metric: GrowthMetric): string {
    return METRIC_LABELS[metric] || metric;
  }

  /**
   * 获取指标单位
   */
  getMetricUnit(metric: GrowthMetric): string {
    return METRIC_UNITS[metric] || '';
  }
}

export const growthService = new GrowthService();
export default growthService;

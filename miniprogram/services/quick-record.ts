/**
 * QuickRecordService - 闪电记录服务
 *
 * 提供预定义 + 动态的快捷记录模板，用户一键即可完成常用记录。
 * 配方奶模板基于用户历史记录动态生成，展示常用奶量。
 */

import { feedingService } from './feeding';
import { sleepService } from './sleep';
import { diaperService } from './diaper';
import { healthService } from './health';
import { babyService } from './baby';
import { getNowISO } from '../utils/date';
import type { CreateFeedingInput, CreateDiaperInput, CreateHealthInput } from '../types/index';

/** 快速记录模板分类 */
export type QuickRecordCategory = 'feeding' | 'sleep' | 'diaper' | 'health';

/** 快速记录模板定义 */
export interface QuickRecordTemplate {
  /** 唯一标识 */
  id: string;
  /** 分类 */
  category: QuickRecordCategory;
  /** 模板名称 */
  name: string;
  /** 简要描述 */
  desc: string;
  /** 图标路径 */
  icon: string;
  /** 图标背景色（CSS 变量或色值） */
  iconBg: string;
  /** 模块色 */
  color: string;
  /** 是否为动态模板（配方奶历史奶量） */
  dynamic?: boolean;
  /** 动态参数 - 配方奶奶量 */
  formulaAmount?: number;
}

/** 固定模板（不含配方奶，配方奶动态生成） */
const STATIC_TEMPLATES: QuickRecordTemplate[] = [
  // ===== 喂养 - 母乳 =====
  {
    id: 'breast_left_15',
    category: 'feeding',
    name: '左侧母乳',
    desc: '左侧15分钟',
    icon: '/assets/icons/breastfeed.svg',
    iconBg: 'var(--module-feeding-bg, #FFF5EC)',
    color: 'var(--module-feeding, #C8956C)',
  },
  {
    id: 'breast_right_15',
    category: 'feeding',
    name: '右侧母乳',
    desc: '右侧15分钟',
    icon: '/assets/icons/breastfeed.svg',
    iconBg: 'var(--module-feeding-bg, #FFF5EC)',
    color: 'var(--module-feeding, #C8956C)',
  },
  // ===== 排便 =====
  {
    id: 'diaper_pee',
    category: 'diaper',
    name: '换尿布·小便',
    desc: '仅小便',
    icon: '/assets/icons/waterdrop.svg',
    iconBg: 'var(--module-diaper-bg, #F0F9F5)',
    color: 'var(--module-diaper, #7EBEA5)',
  },
  {
    id: 'diaper_poop_normal',
    category: 'diaper',
    name: '换尿布·大便',
    desc: '黄色软便',
    icon: '/assets/icons/poop.svg',
    iconBg: 'var(--module-diaper-bg, #F0F9F5)',
    color: 'var(--module-diaper, #7EBEA5)',
  },
  {
    id: 'diaper_both',
    category: 'diaper',
    name: '换尿布·大小便',
    desc: '大小便一起',
    icon: '/assets/icons/baby.svg',
    iconBg: 'var(--module-diaper-bg, #F0F9F5)',
    color: 'var(--module-diaper, #7EBEA5)',
  },
  // ===== 睡眠 =====
  {
    id: 'sleep_start',
    category: 'sleep',
    name: '开始睡觉',
    desc: '开始计时',
    icon: '/assets/icons/sleep.svg',
    iconBg: 'var(--module-sleep-bg, #F0F7FC)',
    color: 'var(--module-sleep, #7CAFD4)',
  },
  {
    id: 'sleep_end',
    category: 'sleep',
    name: '睡醒了',
    desc: '结束计时',
    icon: '/assets/icons/sun.svg',
    iconBg: 'var(--module-sleep-bg, #F0F7FC)',
    color: 'var(--module-sleep, #7CAFD4)',
  },
  // ===== 体温 =====
  {
    id: 'temp_normal',
    category: 'health',
    name: '体温正常',
    desc: '36.5°C 额温',
    icon: '/assets/icons/thermometer.svg',
    iconBg: 'var(--module-health-bg, #FEF8E8)',
    color: 'var(--module-health, #D4B36A)',
  },
];

/** 默认配方奶奶量（无历史记录时使用） */
const DEFAULT_FORMULA_AMOUNTS = [90, 120, 150, 180];

/** 最多展示的配方奶快捷奶量数 */
const MAX_FORMULA_QUICK_ITEMS = 4;

class QuickRecordService {
  /**
   * 从历史喂养记录中提取用户常用的配方奶奶量
   * 按使用频率排序，取前 MAX_FORMULA_QUICK_ITEMS 个
   */
  private getHistoryFormulaAmounts(): number[] {
    const records = feedingService.getAllRecords();
    const formulaRecords = records.filter((r) => r.type === 'formula' && r.amount && r.amount > 0);

    if (formulaRecords.length === 0) {
      return DEFAULT_FORMULA_AMOUNTS;
    }

    // 统计每个奶量出现的次数
    const amountCount = new Map<number, number>();
    formulaRecords.forEach((r) => {
      const amt = r.amount!;
      amountCount.set(amt, (amountCount.get(amt) || 0) + 1);
    });

    // 按频率降序排列
    const sorted = [...amountCount.entries()].sort((a, b) => b[1] - a[1]).map(([amount]) => amount);

    return sorted.slice(0, MAX_FORMULA_QUICK_ITEMS);
  }

  /**
   * 生成配方奶动态模板
   */
  private buildFormulaTemplates(): QuickRecordTemplate[] {
    const amounts = this.getHistoryFormulaAmounts();
    return amounts.map((amount) => ({
      id: `formula_${amount}`,
      category: 'feeding' as QuickRecordCategory,
      name: `配方奶${amount}ml`,
      desc: `配方奶 ${amount}ml`,
      icon: '/assets/icons/bottle.svg',
      iconBg: 'var(--module-feeding-bg, #FFF5EC)',
      color: 'var(--module-feeding, #C8956C)',
      dynamic: true,
      formulaAmount: amount,
    }));
  }

  /**
   * 统计各模板的历史使用频率
   * 将历史记录映射回对应的模板 ID，返回 { templateId → 使用次数 }
   */
  private getTemplateUsageFrequency(): Map<string, number> {
    const freq = new Map<string, number>();
    const inc = (id: string) => freq.set(id, (freq.get(id) || 0) + 1);

    // 喂养记录 → 模板映射
    const feedingRecords = feedingService.getAllRecords();
    for (const r of feedingRecords) {
      if (r.type === 'breast') {
        if (r.side === 'left') inc('breast_left_15');
        else if (r.side === 'right') inc('breast_right_15');
        else inc('breast_left_15'); // 未指定侧 fallback
      } else if (r.type === 'formula' && r.amount && r.amount > 0) {
        inc(`formula_${r.amount}`);
      }
    }

    // 排便记录 → 模板映射
    const diaperRecords = diaperService.getAllRecords();
    for (const r of diaperRecords) {
      if (r.type === 'pee') inc('diaper_pee');
      else if (r.type === 'poop') inc('diaper_poop_normal');
      else if (r.type === 'both') inc('diaper_both');
    }

    // 睡眠记录 → 统一计入 sleep_start（每条完整记录 = 一次开始+结束）
    const sleepRecords = sleepService.getAllRecords();
    for (const _r of sleepRecords) {
      inc('sleep_start');
      inc('sleep_end');
    }

    // 体温记录 → 模板映射
    const healthRecords = healthService.getAllRecords();
    for (const r of healthRecords) {
      if (r.recordType === 'temperature') inc('temp_normal');
    }

    return freq;
  }

  /**
   * 按使用频率对模板列表排序：常用的排前面，未使用的保持原始相对顺序
   */
  private sortByFrequency(templates: QuickRecordTemplate[]): QuickRecordTemplate[] {
    const freq = this.getTemplateUsageFrequency();

    // 稳定排序：有使用记录的按频率降序，无使用记录的保持原始顺序
    return [...templates].sort((a, b) => {
      const fa = freq.get(a.id) || 0;
      const fb = freq.get(b.id) || 0;
      // 都没使用过 → 保持原序
      if (fa === 0 && fb === 0) return 0;
      // 一个有一个没有 → 有使用的排前面
      if (fa === 0) return 1;
      if (fb === 0) return -1;
      // 都有使用 → 频率高的排前面
      return fb - fa;
    });
  }

  /**
   * 获取所有可用的闪电记录模板（静态 + 动态配方奶），按使用频率排序
   */
  getTemplates(): QuickRecordTemplate[] {
    const breast = STATIC_TEMPLATES.filter((t) => t.category === 'feeding');
    const formula = this.buildFormulaTemplates();
    const rest = STATIC_TEMPLATES.filter((t) => t.category !== 'feeding');
    // 合并全部模板，再按历史使用频率排序
    const all = [...breast, ...formula, ...rest];
    return this.sortByFrequency(all);
  }

  /**
   * 按分类获取模板（分类内也按使用频率排序）
   */
  getTemplatesByCategory(category: QuickRecordCategory): QuickRecordTemplate[] {
    return this.getTemplates().filter((t) => t.category === category);
  }

  /**
   * 执行闪电记录
   * @returns 成功提示文本，null 表示失败
   */
  execute(templateId: string): string | null {
    const babyId = babyService.getCurrentBabyId();
    if (!babyId) {
      wx.showToast({ title: '请先添加宝宝信息', icon: 'none' });
      return null;
    }

    const now = getNowISO();

    // 处理动态配方奶模板 (formula_90, formula_120, ...)
    if (templateId.startsWith('formula_')) {
      const amount = parseInt(templateId.replace('formula_', ''), 10);
      if (isNaN(amount) || amount <= 0) {
        wx.showToast({ title: '无效的奶量', icon: 'none' });
        return null;
      }
      const input: CreateFeedingInput = {
        babyId,
        type: 'formula',
        startTime: now,
        amount,
      };
      const r = feedingService.addRecord(input);
      return r ? `配方奶 ${amount}ml 已记录` : null;
    }

    switch (templateId) {
      // ===== 母乳模板 =====
      case 'breast_left_15': {
        const input: CreateFeedingInput = {
          babyId,
          type: 'breast',
          startTime: now,
          side: 'left',
          duration: 15,
        };
        const r = feedingService.addRecord(input);
        return r ? '左侧母乳 15min 已记录' : null;
      }
      case 'breast_right_15': {
        const input: CreateFeedingInput = {
          babyId,
          type: 'breast',
          startTime: now,
          side: 'right',
          duration: 15,
        };
        const r = feedingService.addRecord(input);
        return r ? '右侧母乳 15min 已记录' : null;
      }

      // ===== 排便模板 =====
      case 'diaper_pee': {
        const input: CreateDiaperInput = {
          babyId,
          time: now,
          type: 'pee',
        };
        const r = diaperService.addRecord(input);
        return r ? '小便已记录' : null;
      }
      case 'diaper_poop_normal': {
        const input: CreateDiaperInput = {
          babyId,
          time: now,
          type: 'poop',
          poopColor: 'yellow',
          poopTexture: 'soft',
        };
        const r = diaperService.addRecord(input);
        return r ? '大便已记录' : null;
      }
      case 'diaper_both': {
        const input: CreateDiaperInput = {
          babyId,
          time: now,
          type: 'both',
        };
        const r = diaperService.addRecord(input);
        return r ? '大小便已记录' : null;
      }

      // ===== 睡眠模板 =====
      case 'sleep_start': {
        if (sleepService.isSleeping()) {
          wx.showToast({ title: '已在睡眠计时中', icon: 'none' });
          return null;
        }
        const state = sleepService.startSleep();
        return state ? '睡眠开始计时' : null;
      }
      case 'sleep_end': {
        if (!sleepService.isSleeping()) {
          wx.showToast({ title: '当前没有进行中的睡眠', icon: 'none' });
          return null;
        }
        const record = sleepService.endSleep();
        return record ? '睡眠已记录' : null;
      }

      // ===== 体温模板 =====
      case 'temp_normal': {
        const input: CreateHealthInput = {
          babyId,
          recordType: 'temperature',
          time: now,
          temperature: 36.5,
          temperatureSite: 'forehead',
        };
        const r = healthService.addRecord(input);
        return r ? '体温 36.5°C 已记录' : null;
      }

      default:
        wx.showToast({ title: '未知模板', icon: 'none' });
        return null;
    }
  }

  /**
   * 获取睡眠状态（用于动态显示开始/结束按钮）
   */
  isSleeping(): boolean {
    return sleepService.isSleeping();
  }
}

export const quickRecordService = new QuickRecordService();
export default quickRecordService;

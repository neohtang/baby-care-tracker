/**
 * AiAdvisorService - AI 育儿助手 (Phase 3.3)
 * 智能分析：异常检测、个性化建议、AI 大模型对话
 * 查询引擎：本地关键词匹配（数据查询）+ 腾讯混元大模型（育儿问答）
 */

import { feedingService } from './feeding';
import { sleepService } from './sleep';
import { diaperService } from './diaper';
import { healthService } from './health';
import { growthService } from './growth';
import { babyService } from './baby';
import {
  getToday,
  getLastNDays,
  getDateRange,
  formatDate,
  formatAge,
  calculateAge,
} from '../utils/date';
import { hunyuanService } from './hunyuan';
import type { StreamCallbacks } from './hunyuan';

// ============ 类型定义 ============

/** 建议优先级 */
export type AdviceLevel = 'info' | 'warning' | 'alert';

/** 建议分类 */
export type AdviceCategory = 'feeding' | 'sleep' | 'diaper' | 'health' | 'growth' | 'general';

/** 单条建议 */
export interface Advice {
  id: string;
  level: AdviceLevel;
  category: AdviceCategory;
  title: string;
  content: string;
  icon: string;
  color: string;
}

/** 异常检测结果 */
export interface AnomalyResult {
  hasAnomaly: boolean;
  anomalies: Advice[];
}

/** 日常评估 */
export interface DailyAssessment {
  date: string;
  score: number; // 0-100
  scoreLabel: string;
  summary: string;
  advices: Advice[];
  anomalies: Advice[];
}

/** 自然语言查询结果 */
export interface QueryResult {
  answer: string;
  data?: any;
  relatedAdvices?: Advice[];
}

// ============ 月龄参考标准 ============

interface AgeStandard {
  minMonths: number;
  maxMonths: number;
  feedingCountRange: [number, number]; // 日均喂养次数
  sleepHoursRange: [number, number]; // 日均睡眠小时
  napCountRange: [number, number]; // 日均小睡次数
  diaperCountRange: [number, number]; // 日均排便次数
}

const AGE_STANDARDS: AgeStandard[] = [
  {
    minMonths: 0,
    maxMonths: 1,
    feedingCountRange: [8, 12],
    sleepHoursRange: [14, 17],
    napCountRange: [4, 6],
    diaperCountRange: [6, 10],
  },
  {
    minMonths: 1,
    maxMonths: 3,
    feedingCountRange: [7, 10],
    sleepHoursRange: [14, 17],
    napCountRange: [3, 5],
    diaperCountRange: [5, 8],
  },
  {
    minMonths: 3,
    maxMonths: 6,
    feedingCountRange: [6, 8],
    sleepHoursRange: [12, 15],
    napCountRange: [3, 4],
    diaperCountRange: [4, 7],
  },
  {
    minMonths: 6,
    maxMonths: 9,
    feedingCountRange: [5, 7],
    sleepHoursRange: [12, 14],
    napCountRange: [2, 3],
    diaperCountRange: [3, 6],
  },
  {
    minMonths: 9,
    maxMonths: 12,
    feedingCountRange: [4, 6],
    sleepHoursRange: [12, 14],
    napCountRange: [2, 3],
    diaperCountRange: [3, 5],
  },
  {
    minMonths: 12,
    maxMonths: 24,
    feedingCountRange: [3, 5],
    sleepHoursRange: [11, 14],
    napCountRange: [1, 2],
    diaperCountRange: [2, 4],
  },
  {
    minMonths: 24,
    maxMonths: 36,
    feedingCountRange: [3, 4],
    sleepHoursRange: [10, 13],
    napCountRange: [1, 2],
    diaperCountRange: [1, 3],
  },
];

// ============ 服务主体 ============

class AiAdvisorService {
  private _adviceIdCounter = 0;

  /**
   * 获取月龄对应的参考标准
   */
  private _getStandard(): AgeStandard | null {
    const baby = babyService.getCurrentBaby();
    if (!baby?.birthDate) return null;

    const { months } = calculateAge(baby.birthDate);
    return (
      AGE_STANDARDS.find((s) => months >= s.minMonths && months < s.maxMonths) ||
      AGE_STANDARDS[AGE_STANDARDS.length - 1]
    );
  }

  /**
   * 生成建议 ID
   */
  private _nextId(): string {
    return `advice_${++this._adviceIdCounter}`;
  }

  // ============ 1. 异常检测 ============

  /**
   * 检测最近 3 天的异常模式
   */
  detectAnomalies(): AnomalyResult {
    const anomalies: Advice[] = [];
    const baby = babyService.getCurrentBaby();
    if (!baby?.birthDate) return { hasAnomaly: false, anomalies };

    const standard = this._getStandard();
    const dates = getLastNDays(3);

    // 检查每天的数据
    for (const date of dates) {
      const dateLabel = formatDate(date, 'MM月DD日');

      // --- 喂养异常 ---
      const feedSummary = feedingService.getDailySummary(date);
      if (standard && feedSummary.totalCount > 0) {
        if (feedSummary.totalCount < standard.feedingCountRange[0] - 2) {
          anomalies.push({
            id: this._nextId(),
            level: 'warning',
            category: 'feeding',
            title: '喂养次数偏少',
            content: `${dateLabel}仅喂养${feedSummary.totalCount}次，${baby.name}这个月龄建议每天${standard.feedingCountRange[0]}-${standard.feedingCountRange[1]}次`,
            icon: '🍼',
            color: '#FBBF24',
          });
        }
      }

      // --- 睡眠异常 ---
      const sleepSummary = sleepService.getDailySummary(date);
      if (standard && sleepSummary.totalDuration > 0) {
        const sleepHours = sleepSummary.totalDuration / 60;
        if (sleepHours < standard.sleepHoursRange[0] - 2) {
          anomalies.push({
            id: this._nextId(),
            level: 'warning',
            category: 'sleep',
            title: '睡眠时间不足',
            content: `${dateLabel}总睡眠${sleepHours.toFixed(1)}小时，建议${standard.sleepHoursRange[0]}-${standard.sleepHoursRange[1]}小时`,
            icon: '😴',
            color: '#7CAFD4',
          });
        }
      }

      // --- 排便异常 ---
      const diaperSummary = diaperService.getDailySummary(date);
      const diaperRecords = diaperService.getRecordsByDate(date);
      // 检查是否有腹泻/血便标记
      for (const record of diaperRecords) {
        if (record.alert === 'diarrhea') {
          anomalies.push({
            id: this._nextId(),
            level: 'alert',
            category: 'diaper',
            title: '腹泻记录',
            content: `${dateLabel}记录了腹泻，请注意观察宝宝精神状态和补水情况，持续腹泻建议就医`,
            icon: '⚠️',
            color: '#F87171',
          });
        }
        if (record.alert === 'blood') {
          anomalies.push({
            id: this._nextId(),
            level: 'alert',
            category: 'diaper',
            title: '血便预警',
            content: `${dateLabel}记录了血便，建议尽早就医检查`,
            icon: '🚨',
            color: '#EF4444',
          });
        }
      }
    }

    // --- 连续高温检测 ---
    const tempAnomalies = this._detectTemperatureAnomaly(dates);
    anomalies.push(...tempAnomalies);

    // --- 喂养量骤降检测 ---
    const feedingDropAnomaly = this._detectFeedingDrop();
    if (feedingDropAnomaly) anomalies.push(feedingDropAnomaly);

    // 去重（按 title 去重）
    const seen = new Set<string>();
    const unique = anomalies.filter((a) => {
      if (seen.has(a.title + a.content)) return false;
      seen.add(a.title + a.content);
      return true;
    });

    return { hasAnomaly: unique.length > 0, anomalies: unique };
  }

  /**
   * 连续高温检测
   */
  private _detectTemperatureAnomaly(dates: string[]): Advice[] {
    const anomalies: Advice[] = [];
    let consecutiveHighTemp = 0;
    let maxTemp = 0;

    for (const date of dates) {
      const records = healthService.getRecordsByDate(date);
      const tempRecords = records.filter((r) => r.recordType === 'temperature' && r.temperature);

      let dayHasHighTemp = false;
      for (const r of tempRecords) {
        const temp = r.temperature || 0;
        if (temp > maxTemp) maxTemp = temp;
        if (temp >= 37.4) dayHasHighTemp = true;
        if (temp >= 39.0) {
          anomalies.push({
            id: this._nextId(),
            level: 'alert',
            category: 'health',
            title: '高烧预警',
            content: `${formatDate(date, 'MM月DD日')}体温达到${temp}°C，属于高烧范围，建议及时就医`,
            icon: '🌡️',
            color: '#EF4444',
          });
        }
      }

      if (dayHasHighTemp) {
        consecutiveHighTemp++;
      } else {
        consecutiveHighTemp = 0;
      }
    }

    if (consecutiveHighTemp >= 2) {
      anomalies.push({
        id: this._nextId(),
        level: 'alert',
        category: 'health',
        title: '连续发热',
        content: `近${consecutiveHighTemp}天持续发热（最高${maxTemp}°C），建议就医检查`,
        icon: '🏥',
        color: '#EF4444',
      });
    }

    return anomalies;
  }

  /**
   * 喂养量骤降检测（对比近 3 天 vs 前 3 天）
   */
  private _detectFeedingDrop(): Advice | null {
    const recent3 = getLastNDays(3);
    const prev3 = getLastNDays(6).slice(0, 3);

    let recentTotal = 0;
    let prevTotal = 0;

    for (const date of recent3) {
      recentTotal += feedingService.getDailySummary(date).totalCount;
    }
    for (const date of prev3) {
      prevTotal += feedingService.getDailySummary(date).totalCount;
    }

    if (prevTotal > 0 && recentTotal > 0) {
      const dropRate = (prevTotal - recentTotal) / prevTotal;
      if (dropRate >= 0.4) {
        return {
          id: this._nextId(),
          level: 'warning',
          category: 'feeding',
          title: '喂养量骤降',
          content: `近3天喂养总次数(${recentTotal}次)较前3天(${prevTotal}次)下降了${Math.round(dropRate * 100)}%，请关注宝宝食欲变化`,
          icon: '📉',
          color: '#FB923C',
        };
      }
    }

    return null;
  }

  // ============ 2. 每日评估 ============

  /**
   * 生成今日（或指定日期）的综合评估
   */
  getDailyAssessment(date?: string): DailyAssessment {
    const targetDate = date || getToday();
    const baby = babyService.getCurrentBaby();
    const standard = this._getStandard();

    const feedSummary = feedingService.getDailySummary(targetDate);
    const sleepSummary = sleepService.getDailySummary(targetDate);
    const diaperSummary = diaperService.getDailySummary(targetDate);

    let score = 80; // 基础分
    const advices: Advice[] = [];

    if (!baby?.birthDate) {
      return {
        date: targetDate,
        score: 0,
        scoreLabel: '--',
        summary: '请先添加宝宝信息',
        advices: [],
        anomalies: [],
      };
    }

    // --- 喂养评分 ---
    if (standard) {
      const [minFeed, maxFeed] = standard.feedingCountRange;
      if (feedSummary.totalCount >= minFeed && feedSummary.totalCount <= maxFeed) {
        score += 5;
      } else if (feedSummary.totalCount < minFeed) {
        score -= 5;
        advices.push({
          id: this._nextId(),
          level: 'info',
          category: 'feeding',
          title: '增加喂养频次',
          content: `今日喂养${feedSummary.totalCount}次，建议${minFeed}-${maxFeed}次`,
          icon: '🍼',
          color: '#D4A97A',
        });
      }

      // --- 睡眠评分 ---
      const sleepHours = sleepSummary.totalDuration / 60;
      const [minSleep, maxSleep] = standard.sleepHoursRange;
      if (sleepHours >= minSleep && sleepHours <= maxSleep) {
        score += 5;
      } else if (sleepHours < minSleep && sleepHours > 0) {
        score -= 5;
        advices.push({
          id: this._nextId(),
          level: 'info',
          category: 'sleep',
          title: '注意充足睡眠',
          content: `今日睡眠${sleepHours.toFixed(1)}小时，建议${minSleep}-${maxSleep}小时`,
          icon: '😴',
          color: '#7CAFD4',
        });
      }

      // --- 排便评分 ---
      const [minDiaper, maxDiaper] = standard.diaperCountRange;
      if (diaperSummary.totalCount >= minDiaper) {
        score += 5;
      } else if (diaperSummary.totalCount > 0 && diaperSummary.totalCount < minDiaper) {
        advices.push({
          id: this._nextId(),
          level: 'info',
          category: 'diaper',
          title: '排便观察',
          content: `今日排便${diaperSummary.totalCount}次，稍少于参考范围(${minDiaper}-${maxDiaper}次)`,
          icon: '👶',
          color: '#6EE7B7',
        });
      }
    }

    // --- 数据完整性加分 ---
    const hasFeeding = feedSummary.totalCount > 0;
    const hasSleep = sleepSummary.totalDuration > 0;
    const hasDiaper = diaperSummary.totalCount > 0;
    const completeness = [hasFeeding, hasSleep, hasDiaper].filter(Boolean).length;

    if (completeness === 3) {
      score += 5;
    } else if (completeness === 0 && targetDate === getToday()) {
      advices.push({
        id: this._nextId(),
        level: 'info',
        category: 'general',
        title: '开始今天的记录',
        content: '今天还没有任何记录哦，记录越完整，分析越准确',
        icon: '📝',
        color: '#B5A89C',
      });
    }

    // 分数上下限
    score = Math.max(0, Math.min(100, score));

    // 异常检测
    const { anomalies } = this.detectAnomalies();

    // 综合评语
    const summary = this._generateSummary(
      score,
      feedSummary.totalCount,
      sleepSummary.totalDuration / 60,
      diaperSummary.totalCount,
    );
    const scoreLabel =
      score >= 90 ? '很棒' : score >= 70 ? '不错' : score >= 50 ? '一般' : '需关注';

    return {
      date: targetDate,
      score,
      scoreLabel,
      summary,
      advices,
      anomalies,
    };
  }

  /**
   * 生成综合评语
   */
  private _generateSummary(
    score: number,
    feedCount: number,
    sleepHours: number,
    diaperCount: number,
  ): string {
    const baby = babyService.getCurrentBaby();
    const name = baby?.name || '宝宝';

    if (feedCount === 0 && sleepHours === 0 && diaperCount === 0) {
      return `${name}今天还没有记录数据，快去添加吧~`;
    }

    const parts: string[] = [];
    if (feedCount > 0) parts.push(`喂养${feedCount}次`);
    if (sleepHours > 0) parts.push(`睡眠${sleepHours.toFixed(1)}小时`);
    if (diaperCount > 0) parts.push(`换尿布${diaperCount}次`);

    const dataText = parts.join('、');

    if (score >= 90) {
      return `${name}今天表现很棒！${dataText}，各项指标都在健康范围内。`;
    } else if (score >= 70) {
      return `${name}今天状态不错，${dataText}。继续保持规律的作息哦~`;
    } else if (score >= 50) {
      return `${name}今天${dataText}，部分指标偏离参考范围，请留意调整。`;
    } else {
      return `${name}今天${dataText}，建议关注下方的建议和提醒。`;
    }
  }

  // ============ 3. 个性化建议 ============

  /**
   * 获取基于月龄的个性化育儿建议
   */
  getPersonalizedAdvices(): Advice[] {
    const baby = babyService.getCurrentBaby();
    if (!baby?.birthDate) return [];

    const { months } = calculateAge(baby.birthDate);
    const advices: Advice[] = [];

    // 月龄段建议
    if (months < 1) {
      advices.push(
        {
          id: this._nextId(),
          level: 'info',
          category: 'feeding',
          title: '新生儿喂养',
          content: '新生儿建议按需喂养，每天8-12次，每次喂奶间隔不超过3小时',
          icon: '🍼',
          color: '#D4A97A',
        },
        {
          id: this._nextId(),
          level: 'info',
          category: 'sleep',
          title: '新生儿睡眠',
          content: '新生儿每天需要16-17小时睡眠，注意仰卧入睡，保持安全睡眠环境',
          icon: '🛏️',
          color: '#7CAFD4',
        },
        {
          id: this._nextId(),
          level: 'info',
          category: 'health',
          title: '脐带护理',
          content: '保持脐部干燥清洁，避免覆盖，通常1-2周自然脱落',
          icon: '🏥',
          color: '#6EE7B7',
        },
      );
    } else if (months < 3) {
      advices.push(
        {
          id: this._nextId(),
          level: 'info',
          category: 'feeding',
          title: '喂养节奏',
          content: '逐渐建立规律喂养，每3-4小时一次，注意观察饥饿信号',
          icon: '🍼',
          color: '#D4A97A',
        },
        {
          id: this._nextId(),
          level: 'info',
          category: 'sleep',
          title: '建立作息',
          content: '可以开始尝试建立日夜节律，白天多互动，夜间保持安静环境',
          icon: '🌙',
          color: '#7CAFD4',
        },
        {
          id: this._nextId(),
          level: 'info',
          category: 'growth',
          title: '抬头训练',
          content: '每天进行适量俯趴训练(Tummy Time)，增强颈部和上肢力量',
          icon: '💪',
          color: '#F5A5B8',
        },
      );
    } else if (months < 6) {
      advices.push(
        {
          id: this._nextId(),
          level: 'info',
          category: 'feeding',
          title: '辅食准备',
          content: `${baby.name}快到添加辅食的月龄了，6个月前以母乳/配方奶为主`,
          icon: '🥄',
          color: '#D4A97A',
        },
        {
          id: this._nextId(),
          level: 'info',
          category: 'sleep',
          title: '小睡规律',
          content: '这个阶段通常每天2-3次小睡，晚间连续睡眠时间逐渐延长',
          icon: '😴',
          color: '#7CAFD4',
        },
        {
          id: this._nextId(),
          level: 'info',
          category: 'growth',
          title: '翻身发育',
          content: '大部分宝宝4-6月会学会翻身，提供安全的活动空间',
          icon: '🔄',
          color: '#F5A5B8',
        },
      );
    } else if (months < 12) {
      advices.push(
        {
          id: this._nextId(),
          level: 'info',
          category: 'feeding',
          title: '辅食多样化',
          content: '6月龄后开始添加辅食，从单一食材开始，观察过敏反应，逐步增加种类',
          icon: '🥬',
          color: '#D4A97A',
        },
        {
          id: this._nextId(),
          level: 'info',
          category: 'sleep',
          title: '规律作息',
          content: '建立固定的睡前流程：洗澡→按摩→讲故事→入睡，帮助宝宝自主入睡',
          icon: '🌙',
          color: '#7CAFD4',
        },
        {
          id: this._nextId(),
          level: 'info',
          category: 'growth',
          title: '运动发育',
          content: '鼓励宝宝爬行、扶站，提供安全的探索环境',
          icon: '🏃',
          color: '#F5A5B8',
        },
      );
    } else {
      advices.push(
        {
          id: this._nextId(),
          level: 'info',
          category: 'feeding',
          title: '饮食过渡',
          content: '1岁后可逐步过渡到家庭饮食，保证营养均衡，少盐少糖',
          icon: '🍽️',
          color: '#D4A97A',
        },
        {
          id: this._nextId(),
          level: 'info',
          category: 'sleep',
          title: '午睡调整',
          content: '1岁后多数宝宝过渡为1次午睡，每天总睡眠11-14小时',
          icon: '😴',
          color: '#7CAFD4',
        },
        {
          id: this._nextId(),
          level: 'info',
          category: 'growth',
          title: '语言发展',
          content: '多和宝宝交流，指认物品名称，阅读绘本促进语言发育',
          icon: '🗣️',
          color: '#F5A5B8',
        },
      );
    }

    return advices;
  }

  // ============ 4. 自然语言查询（本地） ============

  /**
   * 本地自然语言查询引擎（关键词匹配）
   * 用于快速查询宝宝的数据记录
   */
  queryLocal(question: string): QueryResult {
    const q = question.trim().toLowerCase();
    const baby = babyService.getCurrentBaby();
    const name = baby?.name || '宝宝';
    const today = getToday();

    // --- 今天/昨天的喂养 ---
    if (this._matchKeywords(q, ['吃', '喂', '奶', '喂养'])) {
      const isYesterday = this._matchKeywords(q, ['昨天']);
      const date = isYesterday ? getLastNDays(2)[0] : today;
      const dateLabel = isYesterday ? '昨天' : '今天';
      const summary = feedingService.getDailySummary(date);

      let answer = `${name}${dateLabel}共喂养了${summary.totalCount}次`;
      if (summary.breastCount > 0) answer += `，母乳${summary.breastCount}次`;
      if (summary.formulaCount > 0)
        answer += `，配方奶${summary.formulaCount}次(共${summary.totalFormulaAmount}ml)`;
      if (summary.solidCount > 0) answer += `，辅食${summary.solidCount}次`;
      if (summary.totalCount === 0) answer = `${name}${dateLabel}还没有喂养记录`;

      return { answer, data: summary };
    }

    // --- 睡眠 ---
    if (this._matchKeywords(q, ['睡', '睡眠', '小睡', '觉'])) {
      const isYesterday = this._matchKeywords(q, ['昨天']);
      const date = isYesterday ? getLastNDays(2)[0] : today;
      const dateLabel = isYesterday ? '昨天' : '今天';
      const summary = sleepService.getDailySummary(date);
      const hours = (summary.totalDuration / 60).toFixed(1);

      const answer =
        summary.totalDuration > 0
          ? `${name}${dateLabel}总共睡了${hours}小时，小睡${summary.napCount}次`
          : `${name}${dateLabel}还没有睡眠记录`;

      return { answer, data: summary };
    }

    // --- 体温 ---
    if (this._matchKeywords(q, ['体温', '温度', '发烧', '烧'])) {
      const records = healthService.getTodayRecords().filter((r) => r.recordType === 'temperature');
      if (records.length > 0) {
        const latest = records.sort((a, b) => b.time.localeCompare(a.time))[0];
        const temp = latest.temperature || 0;
        return {
          answer: `${name}最近一次体温是${temp}°C（${formatDate(latest.time, 'HH:mm')}），${temp >= 37.4 ? '偏高，请持续观察' : '正常范围'}`,
          data: latest,
        };
      }
      return { answer: `${name}今天还没有体温记录` };
    }

    // --- 排便 ---
    if (this._matchKeywords(q, ['排便', '尿布', '拉', '大便', '小便', '尿'])) {
      const summary = diaperService.getDailySummary(today);
      const answer =
        summary.totalCount > 0
          ? `${name}今天换了${summary.totalCount}次尿布，其中小便${summary.peeCount}次、大便${summary.poopCount}次`
          : `${name}今天还没有排便记录`;

      return { answer, data: summary };
    }

    // --- 生长数据 ---
    if (this._matchKeywords(q, ['体重', '身高', '身长', '头围', '长了', '重了', '发育'])) {
      const display = growthService.getLatestDisplay();
      const parts: string[] = [];
      if (display.weight !== '--') parts.push(`体重${display.weight}kg`);
      if (display.height !== '--') parts.push(`身长${display.height}cm`);
      if (display.headCircumference !== '--') parts.push(`头围${display.headCircumference}cm`);

      const answer =
        parts.length > 0
          ? `${name}最新的生长数据：${parts.join('、')}`
          : `${name}还没有生长发育记录`;

      return { answer, data: display };
    }

    // --- 月龄/年龄 ---
    if (this._matchKeywords(q, ['多大', '月龄', '几个月', '几天', '几岁', '年龄'])) {
      if (baby?.birthDate) {
        const ageText = formatAge(baby.birthDate);
        return { answer: `${name}现在${ageText}` };
      }
      return { answer: '请先添加宝宝的出生日期' };
    }

    // --- 建议 ---
    if (this._matchKeywords(q, ['建议', '怎么', '应该', '如何', '注意'])) {
      const advices = this.getPersonalizedAdvices();
      if (advices.length > 0) {
        const answer =
          `以下是给${name}的育儿建议：\n` +
          advices.map((a) => `• ${a.title}：${a.content}`).join('\n');
        return { answer, relatedAdvices: advices };
      }
      return { answer: '暂时没有针对性的建议，请先完善宝宝信息和记录' };
    }

    // --- 兜底 ---
    return {
      answer: `抱歉，我还不太理解这个问题。你可以试试问我：\n• "${name}今天吃了多少奶？"\n• "${name}昨天睡了多久？"\n• "体温正常吗？"\n• "${name}多大了？"\n• "有什么育儿建议？"`,
    };
  }

  /**
   * 关键词匹配辅助
   */
  private _matchKeywords(text: string, keywords: string[]): boolean {
    return keywords.some((k) => text.includes(k));
  }

  // ============ 5. AI 大模型对话 ============

  /**
   * 智能查询入口 — 先尝试本地匹配，无匹配时走大模型
   * 返回 { isLocal: true, result } 或 { isLocal: false } 表示需要走大模型
   */
  smartQuery(question: string): { isLocal: boolean; result?: QueryResult } {
    const q = question.trim().toLowerCase();

    // 数据查询类关键词 → 本地快速回答
    const dataKeywords = [
      '吃',
      '喂',
      '奶',
      '喂养',
      '睡',
      '睡眠',
      '小睡',
      '觉',
      '体温',
      '温度',
      '发烧',
      '烧',
      '排便',
      '尿布',
      '拉',
      '大便',
      '小便',
      '尿',
      '体重',
      '身高',
      '身长',
      '头围',
      '长了',
      '重了',
      '发育',
      '多大',
      '月龄',
      '几个月',
      '几天',
      '几岁',
      '年龄',
    ];

    if (dataKeywords.some((k) => q.includes(k))) {
      return { isLocal: true, result: this.queryLocal(question) };
    }

    // 其他问题 → 走大模型
    return { isLocal: false };
  }

  /**
   * 使用混元大模型进行对话（非流式）
   */
  async queryAI(question: string): Promise<QueryResult> {
    const res = await hunyuanService.chat(question);
    if (res.success) {
      return { answer: res.content };
    }
    return { answer: `抱歉，AI 暂时无法回答：${res.error || '请稍后再试'}` };
  }

  /**
   * 使用混元大模型进行流式对话（逐字渲染动画）
   */
  queryAIStream(question: string, callbacks: StreamCallbacks): { abort: () => void } {
    return hunyuanService.chatStream(question, callbacks);
  }

  /**
   * 清除 AI 对话历史
   */
  clearAIHistory(): void {
    hunyuanService.clearHistory();
  }
}

export const aiAdvisorService = new AiAdvisorService();
export default aiAdvisorService;

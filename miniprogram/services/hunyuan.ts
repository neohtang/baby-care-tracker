/**
 * HunyuanService - 腾讯混元大模型 API 接入层
 *
 * 架构：小程序 → wx.cloud.callFunction → 云函数(hunyuan-chat) → 混元 API
 * API Key 安全存放在云函数中，前端完全不暴露密钥
 *
 * 特点：
 * - 通过云函数中转，保障 API Key 安全
 * - 自动构建育儿助手系统提示词（结合宝宝实际数据）
 * - 逐字渲染动画模拟流式打字效果
 * - 对话历史管理（内存中维护最近 N 轮）
 * - 支持回退到直连模式（云开发不可用时）
 */

import { babyService } from './baby';
import { feedingService } from './feeding';
import { sleepService } from './sleep';
import { diaperService } from './diaper';
import { healthService } from './health';
import { growthService } from './growth';
import { calculateAge, formatAge, getToday, getLastNDays, formatDate } from '../utils/date';

// ============ 配置 ============

const HUNYUAN_CONFIG = {
  /** 云函数名称 */
  cloudFunctionName: 'hunyuan-chat',
  /** 保留的历史对话轮数（user+assistant 各一条算一轮） */
  maxHistoryRounds: 8,
  /** 逐字渲染速度：每个字符间隔（ms） */
  typingSpeed: 30,
  /** 逐字渲染最小间隔（内容很长时加速） */
  typingSpeedMin: 10,
  /** 超过此长度启用加速渲染 */
  typingAccelerateThreshold: 200,
};

// ============ 类型定义 ============

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  success: boolean;
  content: string;
  error?: string;
}

/** 流式回调（用逐字渲染模拟） */
export interface StreamCallbacks {
  onChunk: (chunk: string, fullText: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}

// ============ 服务主体 ============

class HunyuanService {
  /** 对话历史（不含 system） */
  private _history: ChatMessage[] = [];
  /** 当前正在进行的逐字渲染定时器 */
  private _typingTimer: number | null = null;
  /** 是否正在请求中 */
  private _requesting = false;

  /**
   * 构建系统提示词 — 结合当前宝宝的实际数据
   */
  private _buildSystemPrompt(): string {
    const baby = babyService.getCurrentBaby();
    const today = getToday();

    let babyContext = '';
    if (baby?.birthDate) {
      const age = calculateAge(baby.birthDate);
      const ageText = formatAge(baby.birthDate);
      babyContext += `\n当前宝宝信息：\n- 昵称：${baby.name}\n- 年龄：${ageText}（${age.months}个月${age.days}天）\n- 性别：${baby.gender === 'male' ? '男' : baby.gender === 'female' ? '女' : '未知'}`;

      // 今日数据摘要
      const feedSummary = feedingService.getDailySummary(today);
      const sleepSummary = sleepService.getDailySummary(today);
      const diaperSummary = diaperService.getDailySummary(today);

      babyContext += `\n\n今日（${formatDate(today, 'YYYY年MM月DD日')}）记录摘要：`;
      babyContext += `\n- 喂养：${feedSummary.totalCount}次`;
      if (feedSummary.breastCount > 0) babyContext += `（母乳${feedSummary.breastCount}次）`;
      if (feedSummary.formulaCount > 0)
        babyContext += `（配方奶${feedSummary.formulaCount}次，共${feedSummary.totalFormulaAmount}ml）`;
      if (feedSummary.solidCount > 0) babyContext += `（辅食${feedSummary.solidCount}次）`;
      babyContext += `\n- 睡眠：总时长${(sleepSummary.totalDuration / 60).toFixed(1)}小时，小睡${sleepSummary.napCount}次`;
      babyContext += `\n- 换尿布：${diaperSummary.totalCount}次（小便${diaperSummary.peeCount}次，大便${diaperSummary.poopCount}次）`;

      // 最新生长数据
      const growth = growthService.getLatestDisplay();
      if (growth.weight !== '--' || growth.height !== '--') {
        babyContext += `\n- 最新生长：`;
        if (growth.weight !== '--') babyContext += `体重${growth.weight}kg `;
        if (growth.height !== '--') babyContext += `身长${growth.height}cm `;
        if (growth.headCircumference !== '--') babyContext += `头围${growth.headCircumference}cm`;
      }

      // 昨日数据（用于对比）
      const yesterday = getLastNDays(2)[0];
      const yFeed = feedingService.getDailySummary(yesterday);
      const ySleep = sleepService.getDailySummary(yesterday);
      if (yFeed.totalCount > 0 || ySleep.totalDuration > 0) {
        babyContext += `\n\n昨日记录：喂养${yFeed.totalCount}次，睡眠${(ySleep.totalDuration / 60).toFixed(1)}小时`;
      }

      // 体温记录
      const todayHealth = healthService
        .getTodayRecords()
        .filter((r) => r.recordType === 'temperature');
      if (todayHealth.length > 0) {
        const latest = todayHealth.sort((a, b) => b.time.localeCompare(a.time))[0];
        babyContext += `\n- 最近体温：${latest.temperature}°C`;
      }
    } else {
      babyContext = '\n当前没有宝宝信息，用户尚未添加宝宝资料。';
    }

    return `你是一位专业、温暖的 AI 育儿助手，名叫"宝宝养护助手"。你的职责是根据用户记录的宝宝数据，提供科学、个性化的育儿指导和建议。

核心原则：
1. 基于循证医学和权威育儿指南（WHO、AAP、中国营养学会等）回答问题
2. 回答要简洁实用，避免过长，适合手机阅读（控制在200字以内）
3. 涉及疾病症状时要建议就医，不做诊断
4. 语气亲切温暖，像一个有经验的育儿朋友
5. 如果数据显示异常趋势，主动提醒关注
6. 不确定的问题如实说明，不编造信息
${babyContext}

回答格式要求：
- 直接回答问题，不要重复问题
- 适当使用 emoji 让回答更生动
- 给出具体可操作的建议
- 如果涉及紧急情况（高烧、血便等），请强调就医建议`;
  }

  /**
   * 发送非流式对话请求（通过云函数中转）
   */
  async chat(userMessage: string): Promise<ChatResponse> {
    if (this._requesting) {
      return { success: false, content: '', error: '请等待上一次回答完成' };
    }

    this._requesting = true;

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: this._buildSystemPrompt() },
        ...this._getRecentHistory(),
        { role: 'user', content: userMessage },
      ];

      const res = await this._callCloudFunction(messages);

      if (res.success && res.content) {
        this._addToHistory({ role: 'user', content: userMessage });
        this._addToHistory({ role: 'assistant', content: res.content });
      }

      return res;
    } catch (err: any) {
      return {
        success: false,
        content: '',
        error: this._errorToString(err),
      };
    } finally {
      this._requesting = false;
    }
  }

  /**
   * 带逐字渲染动画的对话请求
   * 云函数返回完整结果后，前端用逐字动画模拟流式打字效果
   */
  chatStream(userMessage: string, callbacks: StreamCallbacks): { abort: () => void } {
    // 先清除上次可能残留的渲染
    this._stopTyping();

    let aborted = false;

    const doRequest = async () => {
      const res = await this.chat(userMessage);

      if (aborted) return;

      if (!res.success) {
        callbacks.onError(res.error || '请求失败');
        return;
      }

      // 逐字渲染动画
      this._startTypingAnimation(res.content, callbacks, aborted);
    };

    doRequest().catch((err) => {
      if (!aborted) {
        callbacks.onError(this._errorToString(err));
      }
    });

    return {
      abort: () => {
        aborted = true;
        this._stopTyping();
        this._requesting = false;
      },
    };
  }

  /**
   * 逐字渲染动画
   */
  private _startTypingAnimation(
    fullText: string,
    callbacks: StreamCallbacks,
    abortFlag: boolean,
  ): void {
    let index = 0;
    const len = fullText.length;

    // 根据内容长度动态调整速度
    const speed =
      len > HUNYUAN_CONFIG.typingAccelerateThreshold
        ? HUNYUAN_CONFIG.typingSpeedMin
        : HUNYUAN_CONFIG.typingSpeed;

    // 每次渲染的字符数（长文本时每次多渲染几个字）
    const chunkSize = len > 500 ? 3 : len > 200 ? 2 : 1;

    const tick = () => {
      if (abortFlag || index >= len) {
        this._typingTimer = null;
        if (!abortFlag) {
          callbacks.onDone(fullText);
        }
        return;
      }

      const end = Math.min(index + chunkSize, len);
      const chunk = fullText.slice(index, end);
      index = end;

      callbacks.onChunk(chunk, fullText.slice(0, index));

      this._typingTimer = setTimeout(tick, speed) as unknown as number;
    };

    tick();
  }

  /**
   * 停止逐字渲染
   */
  private _stopTyping(): void {
    if (this._typingTimer !== null) {
      clearTimeout(this._typingTimer);
      this._typingTimer = null;
    }
  }

  /**
   * 安全地将任意错误对象转为可读字符串
   */
  private _errorToString(err: any): string {
    if (!err) return '未知错误';
    if (typeof err === 'string') return err;
    if (typeof err.errMsg === 'string') return err.errMsg;
    if (typeof err.message === 'string') return err.message;
    if (typeof err.error === 'string') return err.error;
    try {
      const str = JSON.stringify(err);
      return str === '{}' ? '未知错误' : str;
    } catch {
      return String(err);
    }
  }

  /**
   * 通过云函数调用混元 API
   */
  private _callCloudFunction(messages: ChatMessage[]): Promise<ChatResponse> {
    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: HUNYUAN_CONFIG.cloudFunctionName,
        data: {
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        },
        success: (res: any) => {
          const result = res.result;
          if (result && result.success) {
            resolve({
              success: true,
              content: result.content,
            });
          } else {
            resolve({
              success: false,
              content: '',
              error: this._errorToString(result?.error) || '云函数返回异常',
            });
          }
        },
        fail: (err: any) => {
          console.error('[HunyuanService] 云函数调用失败:', err);
          resolve({
            success: false,
            content: '',
            error: this._errorToString(err) || '云函数调用失败，请检查网络',
          });
        },
      });
    });
  }

  /**
   * 获取最近 N 轮历史对话
   */
  private _getRecentHistory(): ChatMessage[] {
    const maxMessages = HUNYUAN_CONFIG.maxHistoryRounds * 2;
    return this._history.slice(-maxMessages);
  }

  /**
   * 添加到对话历史
   */
  private _addToHistory(msg: ChatMessage): void {
    this._history.push(msg);
    const maxMessages = HUNYUAN_CONFIG.maxHistoryRounds * 2;
    if (this._history.length > maxMessages) {
      this._history = this._history.slice(-maxMessages);
    }
  }

  /**
   * 清除对话历史
   */
  clearHistory(): void {
    this._history = [];
    this._stopTyping();
  }

  /**
   * 获取当前对话历史长度
   */
  getHistoryLength(): number {
    return this._history.length;
  }

  /**
   * 是否正在请求中
   */
  isRequesting(): boolean {
    return this._requesting;
  }
}

export const hunyuanService = new HunyuanService();
export default hunyuanService;

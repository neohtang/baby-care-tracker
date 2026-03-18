// pages/ai-advisor/index.ts
// AI 育儿助手页面 — 大模型对话 + 智能分析 (Phase 3.3 → 升级)

import { aiAdvisorService } from '../../services/ai-advisor';
import type { DailyAssessment, Advice } from '../../services/ai-advisor';
import { babyService } from '../../services/baby';
import { store } from '../../store/index';

/** 单条对话消息 */
interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** 是否正在流式输出中 */
  streaming?: boolean;
  /** 是否来自本地查询（非大模型） */
  isLocal?: boolean;
  timestamp: number;
}

Page({
  data: {
    pageStyle: '',
    hasBaby: false,
    babyName: '',

    // 每日评估
    assessment: null as DailyAssessment | null,
    scoreClass: '',

    // 个性化建议
    personalAdvices: [] as Advice[],

    // 对话消息列表
    chatList: [] as ChatItem[],
    /** 输入框内容 */
    queryInput: '',
    /** 是否正在请求中 */
    isQuerying: false,

    // 展示控制
    showAdvices: true,
    showAnomalies: true,

    // 预设问题 — 分为数据查询和 AI 问答两类
    presetQuestions: [
      { text: '今天吃了多少奶？', icon: '🍼' },
      { text: '昨天睡了多久？', icon: '😴' },
      { text: '宝宝多大了？', icon: '👶' },
      { text: '宝宝最近老是吐奶怎么办？', icon: '🤔' },
      { text: '这个月龄辅食怎么加？', icon: '🥄' },
      { text: '宝宝夜醒频繁怎么改善？', icon: '🌙' },
    ],

    /** 滚动到底部锚点 */
    scrollIntoView: '',
  },

  /** 当前请求任务（用于取消） */
  _requestTask: null as { abort: () => void } | null,
  _storeDisconnect: null as (() => void) | null,
  _msgIdCounter: 0,

  onLoad() {
    this._storeDisconnect = store.connect(this as any, {
      pageStyle: true,
    });
  },

  onShow() {
    const baby = babyService.getCurrentBaby();
    this.setData({
      hasBaby: !!baby,
      babyName: baby?.name || '',
    });

    if (baby) {
      this._loadAssessment();
      this._loadAdvices();
    }
  },

  onUnload() {
    // 取消进行中的请求
    if (this._requestTask) {
      this._requestTask.abort();
      this._requestTask = null;
    }
    if (this._storeDisconnect) {
      this._storeDisconnect();
      this._storeDisconnect = null;
    }
  },

  // ============ 数据加载 ============

  _loadAssessment() {
    const assessment = aiAdvisorService.getDailyAssessment();
    const scoreClass =
      assessment.score >= 90
        ? 'excellent'
        : assessment.score >= 70
          ? 'good'
          : assessment.score >= 50
            ? 'normal'
            : 'warning';
    this.setData({ assessment, scoreClass });
  },

  _loadAdvices() {
    const personalAdvices = aiAdvisorService.getPersonalizedAdvices();
    this.setData({ personalAdvices });
  },

  // ============ 生成消息 ID ============

  _nextMsgId(): string {
    return `msg_${Date.now()}_${++this._msgIdCounter}`;
  },

  // ============ 查询入口 ============

  onQueryInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ queryInput: e.detail.value });
  },

  onQuerySubmit() {
    const { queryInput, isQuerying } = this.data;
    if (!queryInput.trim() || isQuerying) return;

    const question = queryInput.trim();
    this.setData({ queryInput: '' });

    this._sendQuestion(question);
  },

  onPresetQuestion(e: WechatMiniprogram.CustomEvent) {
    const question = e.currentTarget.dataset.question;
    if (this.data.isQuerying) return;
    this._sendQuestion(question);
  },

  /**
   * 发送问题 — 智能路由：本地匹配 or 大模型流式
   */
  _sendQuestion(question: string) {
    // 添加用户消息
    const userMsg: ChatItem = {
      id: this._nextMsgId(),
      role: 'user',
      content: question,
      timestamp: Date.now(),
    };

    const chatList = [...this.data.chatList, userMsg];
    this.setData({ chatList, isQuerying: true });
    this._scrollToBottom();

    // 尝试本地快速回答
    const smartResult = aiAdvisorService.smartQuery(question);

    if (smartResult.isLocal && smartResult.result) {
      // 本地回答 — 即时返回
      const assistantMsg: ChatItem = {
        id: this._nextMsgId(),
        role: 'assistant',
        content: smartResult.result.answer,
        isLocal: true,
        timestamp: Date.now(),
      };
      this.setData({
        chatList: [...chatList, assistantMsg],
        isQuerying: false,
      });
      this._scrollToBottom();
      return;
    }

    // 大模型流式回答
    this._streamChat(question, chatList);
  },

  /**
   * 流式调用大模型
   */
  _streamChat(question: string, currentList: ChatItem[]) {
    const assistantMsgId = this._nextMsgId();

    // 先添加一个空的 assistant 消息（streaming 状态）
    const assistantMsg: ChatItem = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      streaming: true,
      timestamp: Date.now(),
    };

    const listWithPlaceholder = [...currentList, assistantMsg];
    this.setData({ chatList: listWithPlaceholder });
    this._scrollToBottom();

    // 节流计时器 — 避免频繁 setData
    let pendingContent = '';
    let throttleTimer: number | null = null;
    const THROTTLE_MS = 100;

    const flushContent = (content: string, done?: boolean) => {
      const idx = this.data.chatList.length - 1;
      if (idx < 0) return;

      this.setData({
        [`chatList[${idx}].content`]: content,
        ...(done ? { [`chatList[${idx}].streaming`]: false, isQuerying: false } : {}),
      });
      this._scrollToBottom();
    };

    this._requestTask = aiAdvisorService.queryAIStream(question, {
      onChunk: (_chunk: string, fullText: string) => {
        pendingContent = fullText;
        if (!throttleTimer) {
          throttleTimer = setTimeout(() => {
            flushContent(pendingContent);
            throttleTimer = null;
          }, THROTTLE_MS) as unknown as number;
        }
      },
      onDone: (fullText: string) => {
        if (throttleTimer) {
          clearTimeout(throttleTimer);
          throttleTimer = null;
        }
        pendingContent = fullText;
        flushContent(fullText, true);
        this._requestTask = null;
      },
      onError: (error: string) => {
        if (throttleTimer) {
          clearTimeout(throttleTimer);
          throttleTimer = null;
        }
        const errorStr =
          typeof error === 'string'
            ? error
            : typeof error === 'object'
              ? JSON.stringify(error)
              : String(error);
        const errorContent = pendingContent
          ? `${pendingContent}\n\n⚠️ 回答中断：${errorStr}`
          : `抱歉，暂时无法回答您的问题 😔\n${errorStr}`;
        flushContent(errorContent, true);
        this._requestTask = null;
      },
    });
  },

  /**
   * 滚动到底部
   */
  _scrollToBottom() {
    setTimeout(() => {
      this.setData({ scrollIntoView: `chat-bottom-anchor` });
    }, 50);
  },

  /**
   * 清除对话
   */
  onClearChat() {
    wx.showModal({
      title: '清除对话',
      content: '确定清除所有对话记录吗？',
      success: (res) => {
        if (res.confirm) {
          aiAdvisorService.clearAIHistory();
          this.setData({ chatList: [] });
        }
      },
    });
  },

  // ============ 展开/收起 ============

  toggleAdvices() {
    this.setData({ showAdvices: !this.data.showAdvices });
  },

  toggleAnomalies() {
    this.setData({ showAnomalies: !this.data.showAnomalies });
  },

  // ============ 刷新 ============

  onPullDownRefresh() {
    this._loadAssessment();
    this._loadAdvices();
    wx.stopPullDownRefresh();
  },
});

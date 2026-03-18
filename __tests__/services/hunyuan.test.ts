/**
 * HunyuanService 单元测试
 * 覆盖云函数调用全链路：成功 / 失败 / 错误序列化 / 限流 / 流式渲染 / 对话历史
 */
import { clearMockStorage } from '../setup';

// ===== Mock wx.cloud =====
const mockCallFunction = jest.fn();

beforeAll(() => {
  // 挂载 wx.cloud mock（setup.ts 里没有，这里补充）
  (global as any).wx.cloud = {
    callFunction: mockCallFunction,
  };
});

// 需要在 mock 就位后再 import，否则模块初始化时 wx.cloud 不存在
// eslint-disable-next-line @typescript-eslint/no-var-requires
let hunyuanService: any;

beforeAll(() => {
  // 先 mock babyService 避免 _buildSystemPrompt 依赖真实数据
  jest.mock('../../miniprogram/services/baby', () => ({
    babyService: {
      getCurrentBaby: jest.fn(() => ({
        id: 'baby_test_001',
        name: '测试宝宝',
        gender: 'male',
        birthDate: '2025-06-01',
      })),
    },
  }));
  jest.mock('../../miniprogram/services/feeding', () => ({
    feedingService: {
      getDailySummary: jest.fn(() => ({
        totalCount: 6, breastCount: 3, formulaCount: 2, solidCount: 1,
        totalFormulaAmount: 360,
      })),
    },
  }));
  jest.mock('../../miniprogram/services/sleep', () => ({
    sleepService: {
      getDailySummary: jest.fn(() => ({
        totalDuration: 780, napCount: 3,
      })),
    },
  }));
  jest.mock('../../miniprogram/services/diaper', () => ({
    diaperService: {
      getDailySummary: jest.fn(() => ({
        totalCount: 5, peeCount: 3, poopCount: 2,
      })),
    },
  }));
  jest.mock('../../miniprogram/services/health', () => ({
    healthService: {
      getTodayRecords: jest.fn(() => []),
    },
  }));
  jest.mock('../../miniprogram/services/growth', () => ({
    growthService: {
      getLatestDisplay: jest.fn(() => ({
        weight: '7.2', height: '68', headCircumference: '42',
      })),
    },
  }));

  // 动态 require 确保 mock 先于模块加载
  hunyuanService = require('../../miniprogram/services/hunyuan').hunyuanService;
});

describe('HunyuanService', () => {
  beforeEach(() => {
    clearMockStorage();
    mockCallFunction.mockReset();
    hunyuanService.clearHistory();
  });

  // ================================================================
  // 1. 云函数调用成功
  // ================================================================
  describe('chat() - 成功场景', () => {
    it('云函数返回正常结果，chat 应返回 success=true 和 content', async () => {
      mockCallFunction.mockImplementation(({ success }: any) => {
        success({
          result: {
            success: true,
            content: '宝宝6个月可以开始添加辅食了，从含铁米粉开始 🥄',
            usage: { total_tokens: 128 },
          },
        });
      });

      const res = await hunyuanService.chat('宝宝什么时候可以吃辅食？');

      expect(res.success).toBe(true);
      expect(res.content).toContain('辅食');
      expect(res.error).toBeUndefined();
    });

    it('成功后对话历史增加两条（user + assistant）', async () => {
      mockCallFunction.mockImplementation(({ success }: any) => {
        success({
          result: { success: true, content: '测试回复' },
        });
      });

      expect(hunyuanService.getHistoryLength()).toBe(0);
      await hunyuanService.chat('你好');
      expect(hunyuanService.getHistoryLength()).toBe(2);
    });

    it('对话历史超过上限自动裁剪', async () => {
      mockCallFunction.mockImplementation(({ success }: any) => {
        success({
          result: { success: true, content: '回复' },
        });
      });

      // maxHistoryRounds=8，即 16 条消息
      for (let i = 0; i < 12; i++) {
        await hunyuanService.chat(`问题${i}`);
      }
      // 应裁剪到 16 条（8 轮 × 2）
      expect(hunyuanService.getHistoryLength()).toBeLessThanOrEqual(16);
    });
  });

  // ================================================================
  // 2. 云函数返回业务失败
  // ================================================================
  describe('chat() - 云函数业务失败', () => {
    it('result.success=false 时返回错误信息', async () => {
      mockCallFunction.mockImplementation(({ success }: any) => {
        success({
          result: {
            success: false,
            content: '',
            error: '请求太频繁，请稍后再试',
          },
        });
      });

      const res = await hunyuanService.chat('测试限流');
      expect(res.success).toBe(false);
      expect(res.error).toBe('请求太频繁，请稍后再试');
    });

    it('result 为 null 时返回兜底错误', async () => {
      mockCallFunction.mockImplementation(({ success }: any) => {
        success({ result: null });
      });

      const res = await hunyuanService.chat('测试空结果');
      expect(res.success).toBe(false);
      expect(res.error).toBeTruthy();
      // 不应出现 [object Object]
      expect(res.error).not.toContain('[object Object]');
    });

    it('result.error 为对象时（非字符串）应被安全序列化', async () => {
      mockCallFunction.mockImplementation(({ success }: any) => {
        success({
          result: {
            success: false,
            content: '',
            error: { code: 'RATE_LIMIT', message: '触发限流' },
          },
        });
      });

      const res = await hunyuanService.chat('测试对象错误');
      expect(res.success).toBe(false);
      // 应转为可读字符串，不是 [object Object]
      expect(res.error).not.toBe('[object Object]');
      expect(typeof res.error).toBe('string');
      expect(res.error!.length).toBeGreaterThan(0);
    });
  });

  // ================================================================
  // 3. 云函数网络/调用失败（fail 回调）
  // ================================================================
  describe('chat() - 网络失败（fail 回调）', () => {
    it('标准 errMsg 格式的错误能正确提取', async () => {
      mockCallFunction.mockImplementation(({ fail }: any) => {
        fail({
          errMsg: 'cloud.callFunction:fail Error: timeout',
          errCode: -1,
        });
      });

      const res = await hunyuanService.chat('超时测试');
      expect(res.success).toBe(false);
      expect(res.error).toContain('timeout');
      expect(res.error).not.toContain('[object Object]');
    });

    it('无 errMsg 的纯对象错误不会变成 [object Object]', async () => {
      mockCallFunction.mockImplementation(({ fail }: any) => {
        fail({ code: -501000, msg: 'system error' });
      });

      const res = await hunyuanService.chat('纯对象错误');
      expect(res.success).toBe(false);
      expect(res.error).not.toBe('[object Object]');
      expect(typeof res.error).toBe('string');
    });

    it('字符串类型的错误直接使用', async () => {
      mockCallFunction.mockImplementation(({ fail }: any) => {
        fail('网络异常');
      });

      const res = await hunyuanService.chat('字符串错误');
      expect(res.success).toBe(false);
      expect(res.error).toBe('网络异常');
    });

    it('null/undefined 错误返回兜底文案', async () => {
      mockCallFunction.mockImplementation(({ fail }: any) => {
        fail(null);
      });

      const res = await hunyuanService.chat('空错误');
      expect(res.success).toBe(false);
      expect(res.error).toBeTruthy();
      expect(res.error!.length).toBeGreaterThan(0);
    });

    it('空对象 {} 错误返回兜底', async () => {
      mockCallFunction.mockImplementation(({ fail }: any) => {
        fail({});
      });

      const res = await hunyuanService.chat('空对象');
      expect(res.success).toBe(false);
      expect(res.error).not.toBe('[object Object]');
      expect(res.error).toBeTruthy();
    });
  });

  // ================================================================
  // 4. 并发请求保护
  // ================================================================
  describe('chat() - 并发保护', () => {
    it('正在请求时第二次调用应直接返回错误', async () => {
      // 第一个请求延迟完成
      mockCallFunction.mockImplementation(({ success }: any) => {
        setTimeout(() => {
          success({ result: { success: true, content: '慢回复' } });
        }, 100);
      });

      const promise1 = hunyuanService.chat('第一个问题');
      const res2 = await hunyuanService.chat('第二个问题');

      expect(res2.success).toBe(false);
      expect(res2.error).toContain('等待');

      // 等第一个完成
      await promise1;
    });
  });

  // ================================================================
  // 5. _errorToString 边界覆盖
  // ================================================================
  describe('_errorToString 错误安全序列化', () => {
    // 通过 fail 回调间接测试 _errorToString
    const testCases = [
      { name: '标准 Error 对象', input: new Error('测试错误'), expected: '测试错误' },
      { name: '带 errMsg 的微信错误', input: { errMsg: 'request:fail' }, expected: 'request:fail' },
      { name: '带 message 的对象', input: { message: '服务端错误' }, expected: '服务端错误' },
      { name: '带 error 字段', input: { error: 'API 限流' }, expected: 'API 限流' },
      { name: '纯字符串', input: '直接字符串', expected: '直接字符串' },
      { name: 'null', input: null, shouldNotBeObjectObject: true },
      { name: 'undefined', input: undefined, shouldNotBeObjectObject: true },
      { name: '数字', input: 42, shouldNotBeObjectObject: true },
      { name: '嵌套对象', input: { a: { b: 'c' } }, shouldNotBeObjectObject: true },
    ];

    testCases.forEach(({ name, input, expected, shouldNotBeObjectObject }) => {
      it(`处理 ${name}`, async () => {
        mockCallFunction.mockImplementation(({ fail }: any) => {
          fail(input);
        });

        const res = await hunyuanService.chat(`测试 ${name}`);
        expect(res.success).toBe(false);
        expect(res.error).not.toBe('[object Object]');

        if (expected) {
          expect(res.error).toBe(expected);
        }
        if (shouldNotBeObjectObject) {
          expect(res.error).not.toContain('[object Object]');
          expect(typeof res.error).toBe('string');
          expect(res.error!.length).toBeGreaterThan(0);
        }
      });
    });
  });

  // ================================================================
  // 6. chatStream - 逐字渲染 + 流式回调
  // ================================================================
  describe('chatStream() - 流式回调', () => {
    it('成功时依次触发 onChunk 和 onDone', (done) => {
      mockCallFunction.mockImplementation(({ success }: any) => {
        success({
          result: { success: true, content: '你好呀' },
        });
      });

      const chunks: string[] = [];

      hunyuanService.chatStream('测试流式', {
        onChunk: (chunk: string, _fullText: string) => {
          chunks.push(chunk);
        },
        onDone: (fullText: string) => {
          expect(fullText).toBe('你好呀');
          expect(chunks.length).toBeGreaterThan(0);
          // 拼接所有 chunk 应等于完整文本
          expect(chunks.join('')).toBe('你好呀');
          done();
        },
        onError: (err: string) => {
          done(new Error(`不应触发 onError: ${err}`));
        },
      });
    });

    it('失败时触发 onError 且内容可读', (done) => {
      mockCallFunction.mockImplementation(({ fail }: any) => {
        fail({ errMsg: 'cloud.callFunction:fail timeout' });
      });

      hunyuanService.chatStream('测试流式失败', {
        onChunk: () => {},
        onDone: () => {
          done(new Error('不应触发 onDone'));
        },
        onError: (error: string) => {
          expect(typeof error).toBe('string');
          expect(error).not.toContain('[object Object]');
          expect(error.length).toBeGreaterThan(0);
          done();
        },
      });
    });

    it('abort() 能中断渲染，不触发 onDone', (done) => {
      mockCallFunction.mockImplementation(({ success }: any) => {
        success({
          result: { success: true, content: '一段很长的回复内容用于测试中断机制是否生效' },
        });
      });

      let doneCalled = false;
      const task = hunyuanService.chatStream('测试中断', {
        onChunk: () => {
          // 收到第一个 chunk 就中断
          task.abort();
        },
        onDone: () => {
          doneCalled = true;
        },
        onError: () => {},
      });

      // 等足够长的时间确认 onDone 没被调用
      setTimeout(() => {
        expect(doneCalled).toBe(false);
        done();
      }, 500);
    });
  });

  // ================================================================
  // 7. 对话历史管理
  // ================================================================
  describe('对话历史管理', () => {
    it('clearHistory 清除所有历史', async () => {
      mockCallFunction.mockImplementation(({ success }: any) => {
        success({ result: { success: true, content: '回复' } });
      });

      await hunyuanService.chat('第一句');
      expect(hunyuanService.getHistoryLength()).toBe(2);

      hunyuanService.clearHistory();
      expect(hunyuanService.getHistoryLength()).toBe(0);
    });

    it('失败请求不添加到历史', async () => {
      mockCallFunction.mockImplementation(({ fail }: any) => {
        fail({ errMsg: 'network error' });
      });

      await hunyuanService.chat('失败请求');
      expect(hunyuanService.getHistoryLength()).toBe(0);
    });

    it('isRequesting 状态正确切换', async () => {
      expect(hunyuanService.isRequesting()).toBe(false);

      mockCallFunction.mockImplementation(({ success }: any) => {
        // 验证请求中状态
        expect(hunyuanService.isRequesting()).toBe(true);
        success({ result: { success: true, content: 'ok' } });
      });

      await hunyuanService.chat('状态测试');
      expect(hunyuanService.isRequesting()).toBe(false);
    });
  });

  // ================================================================
  // 8. 系统提示词构建
  // ================================================================
  describe('系统提示词', () => {
    it('发送请求时 messages 首条为 system 角色', async () => {
      let capturedMessages: any[] = [];
      mockCallFunction.mockImplementation(({ data, success }: any) => {
        capturedMessages = data.messages;
        success({ result: { success: true, content: '回复' } });
      });

      await hunyuanService.chat('测试提示词');

      expect(capturedMessages.length).toBeGreaterThanOrEqual(2);
      expect(capturedMessages[0].role).toBe('system');
      expect(capturedMessages[0].content).toContain('育儿');
      // 最后一条是用户消息
      expect(capturedMessages[capturedMessages.length - 1].role).toBe('user');
      expect(capturedMessages[capturedMessages.length - 1].content).toBe('测试提示词');
    });

    it('系统提示词包含宝宝实际数据', async () => {
      let systemPrompt = '';
      mockCallFunction.mockImplementation(({ data, success }: any) => {
        systemPrompt = data.messages[0].content;
        success({ result: { success: true, content: '回复' } });
      });

      await hunyuanService.chat('测试数据');

      expect(systemPrompt).toContain('测试宝宝');
      expect(systemPrompt).toContain('喂养');
      expect(systemPrompt).toContain('睡眠');
    });
  });
});

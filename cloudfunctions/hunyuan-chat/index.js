/**
 * hunyuan-chat 云函数
 * 中转腾讯混元大模型 API，API Key 安全存放在云端
 *
 * 功能：
 * 1. 接收前端传入的 messages（对话消息列表）
 * 2. 用云端存储的 API Key 调用混元 OpenAI 兼容接口
 * 3. 返回 AI 回复内容给前端
 * 4. 基于 openId 做基本限流保护
 */

const cloud = require('wx-server-sdk');
const http = require('http');
const https = require('https');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

// ============ 配置 ============
// API Key 安全存储在云函数中，前端无法获取
const HUNYUAN_API_KEY = 'sk-2I31BWLkc5AZ1yj5MfGxo87n7GBICUB8HmNC8SyXFZYUPDHg';
const HUNYUAN_BASE_URL = 'https://api.hunyuan.cloud.tencent.com';
const HUNYUAN_MODEL = 'hunyuan-lite';
const MAX_TOKENS = 1024;
const TEMPERATURE = 0.7;
const REQUEST_TIMEOUT = 25000; // 云函数超时略小于默认60s

// 简易限流：每个用户每分钟最多请求次数
const RATE_LIMIT_PER_MINUTE = 20;
// 内存级限流计数器（云函数实例复用时生效）
const rateLimitMap = new Map();

/**
 * 检查限流
 */
function checkRateLimit(openid) {
  const now = Date.now();
  const key = openid || 'anonymous';
  const record = rateLimitMap.get(key);

  if (!record || now - record.windowStart > 60000) {
    // 新窗口
    rateLimitMap.set(key, { windowStart: now, count: 1 });
    return true;
  }

  if (record.count >= RATE_LIMIT_PER_MINUTE) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * 通过 https 模块调用混元 API（云函数环境不支持 fetch）
 */
function callHunyuanAPI(messages) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: HUNYUAN_MODEL,
      messages: messages,
      stream: false,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
    });

    const options = {
      hostname: 'api.hunyuan.cloud.tencent.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HUNYUAN_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: REQUEST_TIMEOUT,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const content = parsed.choices?.[0]?.message?.content || '';
            resolve({
              success: true,
              content: content,
              usage: parsed.usage || null,
            });
          } else {
            const errMsg = parsed.error?.message || `HTTP ${res.statusCode}`;
            resolve({
              success: false,
              content: '',
              error: errMsg,
            });
          }
        } catch (e) {
          resolve({
            success: false,
            content: '',
            error: `响应解析失败: ${e.message}`,
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`网络请求失败: ${e.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.write(postData);
    req.end();
  });
}

// ============ 主入口 ============

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 参数校验
  const { messages } = event;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return {
      success: false,
      content: '',
      error: '参数错误：messages 不能为空',
    };
  }

  // 消息格式校验 & 安全过滤
  const validRoles = ['system', 'user', 'assistant'];
  const sanitizedMessages = messages
    .filter(m => m && validRoles.includes(m.role) && typeof m.content === 'string')
    .map(m => ({
      role: m.role,
      content: m.content.slice(0, 4000), // 限制单条消息长度
    }));

  if (sanitizedMessages.length === 0) {
    return {
      success: false,
      content: '',
      error: '参数错误：无有效消息',
    };
  }

  // 限制总消息条数（避免滥用）
  if (sanitizedMessages.length > 20) {
    return {
      success: false,
      content: '',
      error: '对话历史过长，请清除历史后重试',
    };
  }

  // 限流检查
  if (!checkRateLimit(openid)) {
    return {
      success: false,
      content: '',
      error: '请求太频繁，请稍后再试',
    };
  }

  try {
    const result = await callHunyuanAPI(sanitizedMessages);

    // 记录日志（方便排查问题）
    console.log(`[hunyuan-chat] openid=${openid}, messages=${sanitizedMessages.length}, success=${result.success}, usage=${JSON.stringify(result.usage)}`);

    return result;
  } catch (err) {
    console.error(`[hunyuan-chat] openid=${openid}, error=${err.message}`);
    return {
      success: false,
      content: '',
      error: err.message || '服务暂时不可用，请稍后再试',
    };
  }
};

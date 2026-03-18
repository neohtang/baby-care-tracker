/**
 * getOpenId 云函数
 * 获取当前用户的 openId、appId 和 unionId
 *
 * 用途：
 * 1. 用户登录后获取微信身份标识
 * 2. 与匿名登录的 uid 配合，建立微信用户与 CloudBase 用户的映射
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async (event, context) => {
  // 获取 WX Context（微信调用上下文）
  const wxContext = cloud.getWXContext();

  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID || '',
    // 云函数环境信息
    env: wxContext.ENV,
    timestamp: new Date().toISOString(),
  };
};

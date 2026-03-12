# Baby Care Tracker 🍼

**0-12个月新生儿日常养护追踪微信小程序**

一款面向新手父母的微信小程序，系统化追踪宝宝的喂养、睡眠、排便、健康、发育等各方面情况，帮助家长全面掌握宝宝的成长状态。

## 功能特性

| 模块 | 功能说明 |
|------|----------|
| 喂养记录 | 支持母乳（计时器+侧选择）、配方奶（奶量）、辅食（食材+重量）三种类型 |
| 睡眠记录 | 一键开始/结束睡眠计时，区分日间小睡和夜间睡眠，按日统计 |
| 排便记录 | 快速记录大小便，支持颜色/质地选择，异常标记 |
| 体温健康 | 体温记录（腋温/额温/耳温），用药和症状备注，异常高亮 |
| 生长发育 | 身高/体重/头围记录，生长曲线图（对照WHO标准） |
| 疫苗接种 | 国家免疫规划疫苗清单，接种记录和到期提醒 |
| 发育里程碑 | 按月龄发育项目追踪（大运动/精细运动/语言/社交） |
| 首页仪表盘 | 今日养护数据一览，快捷记录入口，每日时间线 |

## 技术栈

- **框架**: 微信小程序原生 + TypeScript
- **UI 组件库**: [TDesign 微信小程序版](https://tdesign.tencent.com/miniprogram/)
- **日期处理**: dayjs
- **图表**: echarts-for-weixin（生长曲线）
- **数据存储**: 微信本地存储（wx.setStorageSync）

## 项目结构

```
baby-care-tracker/
├── miniprogram/
│   ├── app.ts              # 小程序入口
│   ├── app.json            # 全局配置
│   ├── app.wxss            # 全局样式
│   ├── types/              # TypeScript 类型定义
│   ├── services/           # 业务服务层
│   ├── utils/              # 工具函数
│   ├── data/               # 静态数据（疫苗清单、里程碑、WHO标准）
│   ├── components/         # 自定义组件
│   └── pages/              # 页面
├── package.json
├── tsconfig.json
├── project.config.json
└── README.md
```

## 开发指南

### 环境准备

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 安装 Node.js >= 16
3. 在[微信公众平台](https://mp.weixin.qq.com/)注册小程序账号，获取 AppID

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/YOUR_USERNAME/baby-care-tracker.git
cd baby-care-tracker

# 安装依赖
npm install

# 用微信开发者工具打开项目目录
# 在开发者工具中：工具 -> 构建 npm
```

### 配置 AppID

编辑 `project.config.json`，将 `appid` 字段替换为你的小程序 AppID：

```json
{
  "appid": "wx你的AppID"
}
```

## 数据存储

所有数据存储在用户微信客户端本地，不上传服务器，无隐私泄露风险。支持通过设置页导出 JSON 格式的数据备份。

## 免责声明

本小程序仅供日常养护记录参考，不构成任何医疗建议。如有健康问题请及时就医，遵从专业医生指导。

## 开源协议

[MIT License](./LICENSE)

# Baby Care Tracker

**0-12 个月新生儿日常养护追踪微信小程序**

一款面向新手父母的微信小程序，系统化追踪宝宝的喂养、睡眠、排便、健康、发育等各方面情况，帮助家长全面掌握宝宝的成长状态。

## 功能特性

小程序采用五 Tab 底部导航架构：**首页 → 日常记录 → 健康监测 → 成长发育 → 我的**。

| 模块 | 功能说明 |
|------|----------|
| **首页** | 卡片化今日概览（喂养/睡眠/排便统计），快捷入口（记喂养、记睡眠、记排便、记体温、记生长、里程碑），每日时间线 |
| **日常记录** | 喂养记录（母乳计时器 + 侧选择、配方奶奶量、辅食食材重量）、睡眠记录（一键计时，日间/夜间分类）、排便记录（颜色/质地选择，腹泻预警） |
| **健康监测** | 体温记录（腋温/额温/耳温，异常高亮）、疫苗接种（国家免疫规划清单，接种记录与到期提醒）、用药记录 |
| **成长发育** | 生长数据（身高/体重/头围记录，WHO 标准生长曲线图）、发育里程碑（按月龄追踪大运动/精细运动/语言/社交） |
| **我的** | 宝宝信息管理，多宝宝切换，数据导入/导出（JSON 备份），设置 |

## 技术栈

- **框架**: 微信小程序原生 + TypeScript
- **UI 组件库**: [TDesign 微信小程序版](https://tdesign.tencent.com/miniprogram/)
- **日期处理**: dayjs
- **图表**: echarts-for-weixin（生长曲线）
- **图标**: 自制 SVG 图标体系（33 个矢量图标，统一柔和配色风格）
- **数据存储**: 微信本地存储（wx.setStorageSync）
- **测试**: Jest + ts-jest
- **CI**: 微信 CI 脚本（预览、上传、NPM 构建）

## 项目结构

```
baby-care-tracker/
├── miniprogram/
│   ├── app.ts                    # 小程序入口
│   ├── app.json                  # 全局配置（页面路由、tabBar、组件引用）
│   ├── app.wxss                  # 全局样式
│   ├── sitemap.json              # 小程序索引配置
│   ├── assets/
│   │   └── icons/                # SVG 矢量图标 & tabBar PNG 图标
│   │       ├── bottle.svg        #   喂奶瓶
│   │       ├── breastfeed.svg    #   母乳喂养
│   │       ├── sleep.svg         #   睡眠
│   │       ├── thermometer.svg   #   体温计
│   │       ├── baby.svg          #   宝宝
│   │       ├── ...               #   共 33 个 SVG + 16 个 PNG
│   │       └── warning.svg       #   警告
│   ├── components/               # 自定义组件
│   │   ├── baby-avatar/          #   宝宝头像
│   │   ├── daily-timeline/       #   每日时间线
│   │   ├── growth-chart/         #   生长曲线图表
│   │   ├── record-card/          #   记录卡片（支持滑动操作）
│   │   ├── stat-summary/         #   统计摘要
│   │   └── timer/                #   计时器
│   ├── data/                     # 静态数据
│   │   ├── milestones.ts         #   发育里程碑数据
│   │   ├── vaccines.ts           #   国家免疫规划疫苗清单
│   │   └── who-standards.ts      #   WHO 生长标准参考值
│   ├── pages/                    # 页面
│   │   ├── home/                 #   首页（卡片化概览 + 快捷入口）  [Tab]
│   │   ├── daily/                #   日常记录中心（喂养/睡眠/排便） [Tab]
│   │   ├── health-center/        #   健康监测中心（体温/疫苗/用药） [Tab]
│   │   ├── growth-center/        #   成长发育中心（生长数据/里程碑）[Tab]
│   │   ├── profile/              #   我的（宝宝管理/数据/设置）     [Tab]
│   │   ├── feeding/              #   喂养记录列表
│   │   │   └── add/              #     新增喂养记录
│   │   ├── sleep/                #   睡眠记录列表
│   │   │   └── add/              #     新增睡眠记录
│   │   ├── diaper/               #   排便记录列表
│   │   │   └── add/              #     新增排便记录
│   │   ├── health/               #   健康/体温记录
│   │   │   └── add/              #     新增健康记录
│   │   ├── growth/               #   生长数据（独立页入口）
│   │   ├── milestone/            #   发育里程碑（独立页入口）
│   │   ├── vaccine/              #   疫苗接种
│   │   └── settings/             #   设置
│   ├── services/                 # 业务服务层
│   │   ├── storage.ts            #   通用存储引擎（泛型 CRUD）
│   │   ├── baby.ts               #   宝宝信息管理
│   │   ├── feeding.ts            #   喂养业务逻辑
│   │   ├── sleep.ts              #   睡眠业务逻辑
│   │   ├── diaper.ts             #   排便业务逻辑
│   │   ├── health.ts             #   健康/体温业务逻辑
│   │   ├── growth.ts             #   生长发育业务逻辑
│   │   ├── milestone.ts          #   发育里程碑业务逻辑
│   │   ├── vaccine.ts            #   疫苗接种业务逻辑
│   │   ├── statistics.ts         #   首页仪表盘统计聚合
│   │   └── export.ts             #   数据导入导出
│   ├── types/                    # TypeScript 类型定义
│   │   ├── index.d.ts            #   统一导出入口
│   │   ├── baby.d.ts             #   宝宝信息类型
│   │   ├── feeding.d.ts          #   喂养记录类型
│   │   ├── sleep.d.ts            #   睡眠记录类型
│   │   ├── diaper.d.ts           #   排便记录类型
│   │   ├── health.d.ts           #   健康记录类型
│   │   ├── growth.d.ts           #   生长发育类型
│   │   ├── milestone.d.ts        #   发育里程碑类型
│   │   └── vaccine.d.ts          #   疫苗接种类型
│   └── utils/                    # 工具函数
│       ├── date.ts               #   日期格式化与计算
│       ├── event-bus.ts          #   全局事件总线
│       ├── icons.ts              #   图标路径映射
│       └── validator.ts          #   表单校验工具
├── __tests__/                    # 单元测试
│   ├── setup.ts                  #   测试环境初始化
│   ├── wx-types.d.ts             #   wx API 模拟类型
│   ├── services/                 #   服务层测试（10 个文件）
│   └── utils/                    #   工具函数测试
├── ci/                           # CI/CD 脚本
│   ├── pack-npm.js               #   NPM 构建
│   ├── preview.js                #   预览二维码生成
│   ├── upload.js                 #   版本上传
│   └── project.js                #   项目配置
├── package.json
├── package-lock.json
├── tsconfig.json                 # 小程序 TS 编译配置
├── tsconfig.test.json            # Jest 测试 TS 配置
├── jest.config.ts                # Jest 测试配置
├── project.config.json           # 微信开发者工具项目配置
├── LICENSE
└── README.md
```

## 开发指南

### 环境准备

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 安装 Node.js >= 16
3. 在 [微信公众平台](https://mp.weixin.qq.com/) 注册小程序账号，获取 AppID

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/neohtang/baby-care-tracker.git
cd baby-care-tracker

# 安装依赖
npm install

# 用微信开发者工具打开项目目录
# 在开发者工具中：工具 -> 构建 npm
```

### 运行测试

```bash
# 执行全部单元测试
npx jest

# 带覆盖率报告
npx jest --coverage
```

### 配置 AppID

编辑 `project.config.json`，将 `appid` 字段替换为你的小程序 AppID：

```json
{
  "appid": "wx你的AppID"
}
```

## 数据存储

所有数据存储在用户微信客户端本地，不上传服务器，无隐私泄露风险。支持通过设置页导出 JSON 格式的数据备份，也可从备份文件恢复数据。

## 免责声明

本小程序仅供日常养护记录参考，不构成任何医疗建议。如有健康问题请及时就医，遵从专业医生指导。

## 开源协议

[MIT License](./LICENSE)

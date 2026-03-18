# Baby Care Tracker 小程序 — 长期优化路线图

> **创建日期**：2026-03-17
> **最后更新**：2026-03-18（CloudBase 集合部署 + 实时 watch 同步）
> **状态说明**：⬜ 待开始 | 🔄 进行中 | ✅ 已完成 | ❌ 已取消

---

## 项目现状概要

**Baby Care Tracker**（新生儿养护追踪）是一款微信小程序原生框架 + TypeScript 育儿记录工具，使用 TDesign 组件库构建 UI，数据存储在本地。

| 维度 | 现状（Phase 3 完成后） |
|------|------|
| 技术栈 | 微信小程序原生 + TypeScript + TDesign v1.7.0 + dayjs |
| 页面数 | 15 个（5 Tab + 1 statistics + 4 添加页 + 1 里程碑 + 4 Phase3 新增页面）—— 9 个分包 |
| Service | 21 个业务服务类 + 1 个 Store（新增 report / ai-advisor / sync / family） |
| 组件 | 8 个自定义组件（含 baby-switcher 全局悬浮球） |
| 测试 | 13 个 Jest 测试文件（services + utils） |
| 数据存储 | 纯本地 wx.setStorageSync + @cloudbase/js-sdk 云同步（离线优先、已加入 debounce 批量写入） |
| 分包 | ✅ 已配置 5 个分包 + preloadRule 预下载 |
| 代码质量 | ✅ ESLint 8 + Prettier 3 已配置，0 error / 104 warnings |

### 核心优势
- ✅ TypeScript 全覆盖，类型定义完整
- ✅ Service 层与 UI 层分离良好
- ✅ 泛型 StorageService<T> 存储引擎设计优雅
- ✅ WHO 2006 儿童生长标准数据集成专业
- ✅ Canvas 2D 自绘生长曲线图实现完整
- ✅ Tender Bloom 设计系统（CSS 变量体系）规范
- ✅ 已有单元测试基础和 CI 脚本

---

## Phase 1：打磨期 ✅（已完成 2026-03-17）

> 目标：清理技术债务，夯实工程基础

### 1.1 ✅ 遗留代码清理

清理早期独立页面（已被合并到 Tab 页，代码仍保留）：

| 文件 | 原因 | 状态 |
|------|------|------|
| `pages/feeding/index.*` | 已合并入 daily Tab | ✅ 已删除 |
| `pages/sleep/index.*` | 已合并入 daily Tab | ✅ 已删除 |
| `pages/diaper/index.*` | 已合并入 daily Tab | ✅ 已删除 |
| `pages/health/index.*` | 已合并入 health-center Tab | ✅ 已删除 |
| `pages/growth/index.*` | 已合并入 growth-center Tab | ✅ 已删除（含目录） |
| `pages/vaccine/index.*` | 已合并入 health-center Tab | ✅ 已删除（含目录） |
| `pages/settings/index.*` | 已合并入 profile Tab | ✅ 已删除（含目录） |

**完成情况**：删除 28 个遗留文件（含 6 个废弃 tabBar 图标），经确认零外部引用。同步更新了 `app.json` pages 配置。

### 1.2 ✅ 引入分包策略

**现状**：~~所有页面在主包，无分包配置。~~ 已完成分包拆分。

**完成情况**：
- ✅ 将 `add/` 子页面拆为 3 个独立分包（feeding / sleep / diaper）
- ✅ 将 health/add 拆为 health 分包，milestone 拆为 milestone 分包
- ✅ 配置分包预下载规则（preloadRule）：daily→[feeding,sleep,diaper]、health-center→[health]、growth-center→[milestone]
- ✅ 主包仅保留 5 个 Tab 页面
- ✅ 清理页面级冗余 TDesign 组件声明（daily、growth-center、health-center、milestone 共 4 个页面）

### 1.3 ✅ 存储性能优化

**问题**：~~`StorageService` 每次 add/update/remove 都序列化完整数组写入 Storage。~~ 已优化。

**完成情况**：
- ✅ 引入脏标记（dirty flag）+ debounce 批量写入（默认 300ms），大幅减少 I/O 频率
- ✅ 新增 `flush()` 公开方法，供 onHide/onUnload 等关键时刻强制持久化
- ✅ 修复类型安全：8 个 `StorageService<any>` 全部替换为精确业务类型（BabyInfo、FeedingRecord 等）
- ✅ `getAllStorageInstances()` 添加显式返回类型签名
- ⬜ 数据量大时按月份分片存储（暂不急需，留待 Phase 2）
- ⬜ 引入数据索引机制（暂不急需，留待 Phase 2）

### 1.4 ✅ ESLint / Prettier 配置

- ✅ 配置 ESLint 8（@typescript-eslint/parser + @typescript-eslint/eslint-plugin）+ Prettier 3
- ✅ 全量格式化现有代码（修复 366 个格式问题 + 11 个代码错误，最终 0 error / 104 warnings）
- ✅ 修复 `growth-chart/index.ts` 中 8 处 `Function` 类型 → `(v: number) => number`
- ✅ 修复 `sleep.ts`、`baby.ts` 中 3 处空 catch 块
- ✅ 配置 `.eslintignore` / `.prettierignore`，排除编译产物和声明文件
- ✅ TypeScript 严格模式（strict: true）已启用
- ✅ 配置 pre-commit hook（husky 9 + lint-staged 16）—— `npx lint-staged` 自动执行 eslint --fix + prettier

### 1.5 ✅ 包体积优化

- ✅ 审查 TDesign 组件引用——7 个全局组件均有实际使用，无需移除
- ✅ 完成全量文件体积分析——所有文件体积合理（最大 TS 文件 15.69 KB），无异常大文件
- ✅ 清理 6 个废弃 tabBar PNG 图标
- ⬜ SVG 图标评估合并为 SVG sprite（30 个 SVG 均 < 700 bytes，优先级低）
- ✅ 拆分 300+ 行的 Service 文件（statistics.ts 474 行 → 门面 ~85 行 + dashboard ~390 行 + trend ~95 行）

---

## Phase 2：增强期（2-4 周）

> 目标：补齐核心功能短板，提升用户体验

### 2.1 ✅ 智能提醒系统

- ✅ 基于喂养间隔生成下次喂养提醒
- ✅ 疫苗到期/逾期提醒
- ⬜ 利用微信订阅消息（wx.requestSubscribeMessage）推送关键提醒
- ✅ 本地通知兜底方案（App onShow 弹窗 + Daily 页横幅）

### 2.2 ✅ 数据可视化扩展

**决策**：不引入 echarts-for-weixin（~600KB 太重），继续使用 Canvas 2D 手绘方案。新建通用 `trend-chart` 组件，复用 `growth-chart` 的设计模式。

- ✅ 扩展 StatisticsService 支持近7天历史统计（getWeeklyFeedingTrend / getWeeklySleepTrend / getWeeklyDiaperTrend）
- ✅ 新建通用 trend-chart 组件（Canvas 2D 柱状图/堆叠柱状图，支持分组、堆叠、圆角、今日高亮）
- ✅ 新建数据统计页面（pages/statistics/index）—— 喂养/睡眠/排便三个趋势图卡片
- ✅ 首页"今日概览"添加"趋势分析"入口
- ✅ 新增类型：types/statistics.d.ts（FeedingTrendPoint / SleepTrendPoint / DiaperTrendPoint / WeeklyTrendData / TrendChartConfig）
- ✅ 日期工具扩展：getLastNDays / getWeekdayShort / getShortDateLabel

### 2.3 ✅ 深色模式支持

- ✅ 基于现有 CSS 变量体系新增暗色变量集（app.wxss `@media (prefers-color-scheme: dark)` 60+ 变量覆盖）
- ✅ 通过 `prefers-color-scheme` 媒体查询自动切换 + `app.json darkmode:true` + `theme.json`
- ✅ 手动切换开关（Profile 页面外观设置：跟随系统/浅色模式/深色模式）
- ✅ 图表适配暗色模式（ThemeService.getChartColors()）
- ✅ `page-meta` 组件实现手动主题覆盖（注入 CSS 变量覆盖系统设置）
- ✅ 全部 11 个页面暗色模式适配（5 Tab + statistics + 4 add 子包 + milestone）

### 2.4 ✅ 一键快速记录

- ✅ 新建 `QuickRecordService`（10 个预设模板：喂养 4 / 排便 3 / 睡眠 2 / 体温 1）
- ✅ 首页"闪电记录"入口 + 半屏弹窗（分类 Tab + 4列网格）
- ✅ 一键执行：调用底层 Service API + EventBus 自动刷新首页摘要和时间线
- ✅ 支持自定义模板排序（`saveOrder()` 持久化，拖拽 UI 留待后续）
- ✅ 暗色模式适配
- ⬜ 添加记录时支持语音输入备注（需 RecorderManager API，留待 Phase 3）

### 2.5 ✅ 状态管理升级

- ✅ 自研轻量 Store（`store/index.ts` ~250行，零外部依赖）
- ✅ 管理三类跨页面共享数据：currentBaby、dashboardSummary、pageStyle
- ✅ Store 内部监听 EventBus 事件，精准更新受影响字段
- ✅ `store.connect()` 方法：页面自动订阅 Store 变化，局部 setData 推送
- ✅ 首页（home）完成 Store 深度集成：宝宝信息、仪表盘摘要、主题全部从 Store 获取
- ✅ 5 个 Tab 页（home/daily/growth-center/health-center/profile）全部接入 store.connect
- ✅ 消除 5 页的 `THEME_CHANGED` 手动订阅（Store 自动推送 pageStyle）
- ✅ 保留 EventBus 做页面级细粒度通知（如 daily 的 tab 内数据、timeline 等）

---

## Phase 3：进化期（1-2 月）

> 目标：引入云端能力，实现数据同步和社交功能

### 3.1 ✅ 云开发接入

- ✅ 评估微信云开发（CloudBase）—— 选择云开发方案，零后端成本
- ✅ 设计云端数据模型（CloudRecord：localId 映射、版本号乐观锁、软删除）
- ✅ 同步抽象层 SyncService（离线优先架构：本地操作 → 变更日志 → 后台异步同步）
- ✅ 变更日志系统（ChangeLogEntry：记录所有 CRUD 操作、重试计数、7天自动清理）
- ✅ 冲突解决机制（Last-Write-Wins 基于 updatedAt 时间戳）
- ✅ 增量同步（仅同步 lastSync 后的变更，减少网络开销）
- ✅ 全量迁移方法（migrateToCloud：首次同步一键上传）
- ✅ Profile 页云同步设置（开关 + 手动同步 + 状态显示 + data 声明补全 + onShow 自动加载）
- ✅ 统一 SDK：SyncService 从 wx.cloud 切换到 @cloudbase/js-sdk（通过 getApp().globalData.app 获取实例）
- ✅ app.ts 中初始化 CloudBase + 匿名登录 + syncService.initCloud() 自动连接
- ✅ StorageService → SyncService 桥接（CRUD 操作自动触发 logChange，懒加载避免循环依赖）
- ✅ project.config.json 添加 cloudbaseRoot 配置
- ✅ CloudBase 控制台 11 个数据库集合已部署 + 安全规则已配置 + 匿名登录已开启（通过 deploy-db.js 自动化完成）

### 3.2 ✅ 家庭成员协作

- ✅ 家庭组创建和管理（FamilyService：创建/删除/重命名家庭组）
- ✅ 成员邀请（6位邀请码 + 7天有效期 + 微信分享）
- ✅ 多角色权限（管理员/记录者/查看者，RBAC 权限体系）
- ✅ 操作记录归属（OperationRecord：谁在什么时间做了什么操作）
- ✅ 家庭管理页面（pages/family/index：引导页 + 成员管理 + 邀请 + 操作日志）
- ✅ 分包注册 + Profile 页导航入口
- ✅ 暗色模式适配
- ✅ 用户标识改造：mock_openid → CloudBase 匿名登录 uid（user_openid），降级兼容离线场景
- ✅ FamilyService 云端桥接：创建/更新/删除/加入 自动同步到 family_groups 集合
- ✅ 邀请码云端验证：joinFamily 优先从云端查询家庭组，支持跨设备加入
- ✅ 云端拉取：pullFamilyFromCloud() 在新设备自动恢复家庭组数据
- ✅ sync.ts 修复：_uploadChanges 写入 userId + version 乐观锁递增
- ✅ cloudbaseRoot 路径修正（cloudbase/ → cloudfunctions/）
- ✅ 实时数据同步：SyncService watch 能力（CloudBase 实时推送 → 本地更新 → EventBus 通知 UI，含自动重连 + 前后台生命周期管理）

### 3.3 ✅ AI 育儿助手

- ✅ 本地智能分析引擎（AiAdvisorService：基于月龄参考标准的规则引擎）
- ✅ 异常模式识别（连续高温、喂养量骤降、腹泻/血便、睡眠不足等自动预警）
- ✅ 个性化育儿建议（按月龄段提供喂养/睡眠/发育专业建议）
- ✅ 自然语言查询（关键词匹配引擎：支持查询喂养/睡眠/排便/体温/生长/月龄数据）
- ✅ 每日综合评估（0-100 分评分 + 综合评语 + 改善建议）
- ✅ AI 助手页面（pages/ai-advisor/index：评估卡 + 预警区 + 建议区 + 对话查询）
- ✅ 分包注册 + 首页/Profile 双入口
- ✅ 暗色模式适配
- ⬜ 接入云端大模型 API（留待 Phase 3.1 云开发接入后扩展）

### 3.4 ✅ 成长报告生成与分享

- ✅ 周报/月报自动生成（ReportService：数据聚合 + generateWeeklyReport/generateMonthlyReport）
- ✅ 精美分享图片（Canvas 2D 绘制：渐变头部 + 数据卡片 + 迷你柱状图）
- ✅ 分享到微信好友 + 预览（previewImage + shareAppMessage）
- ✅ 保存到相册（saveImageToPhotosAlbum + 权限处理）
- ✅ 报告页面（pages/report/index：类型切换 + 日期翻页 + 数据卡片 + 趋势图）
- ✅ 分包注册 + 首页/Profile 双入口导航
- ✅ 暗色模式适配

### 3.5 ✅ 多宝宝管理完善

- ✅ 全局悬浮切换入口（baby-switcher 组件：可拖拽悬浮球 + 展开选择面板）
- ✅ 切换时平滑过渡动画（fabPulse + ringExpand + panelSlideIn）
- ✅ 每个宝宝独立数据空间（所有 Service 已通过 babyId 隔离，切换触发全量刷新）
- ✅ 5 个 Tab 页全部集成 baby-switcher 组件
- ✅ 仅多宝宝场景显示，单宝宝自动隐藏
- ✅ 悬浮球支持拖拽 + 自动吸边
- ✅ 深色模式适配

---

## Phase 4：规模化（2-3 月）

> 目标：面向更大用户群体，提升工程质量和可扩展性

### 4.1 ⬜ 国际化支持

- ⬜ 抽取所有硬编码中文字符串为 i18n 资源文件
- ⬜ 构建 i18n 工具函数（t('key') 模式）
- ⬜ 支持中/英双语切换
- ⬜ WHO 标准数据适配不同地区

### 4.2 ⬜ 完整 CI/CD 流水线

- ⬜ 集成 GitHub Actions / GitLab CI
- ⬜ 流程：lint → test → build → 体验版预览 → 审批 → 正式发布
- ⬜ 版本号自动管理和 CHANGELOG 生成
- ⬜ 发布通知（企业微信/邮件）

### 4.3 ⬜ E2E 自动化测试

- ⬜ 补充组件级测试（miniprogram-simulate）
- ⬜ 引入 E2E 测试（miniprogram-automator）
- ⬜ 核心业务逻辑测试覆盖率 > 80%
- ⬜ CI 中集成测试卡点

### 4.4 ⬜ 无障碍支持

- ⬜ 所有交互元素添加 `aria-label`
- ⬜ 色彩对比度符合 WCAG AA 标准
- ⬜ 计时器组件增加语音反馈
- ⬜ 屏幕阅读器兼容测试

### 4.5 ⬜ 小程序插件化

- ⬜ 核心功能抽取为微信小程序插件
- ⬜ 发布到微信插件市场
- ⬜ 提供开放 API 供第三方集成

---

## 架构演进全景

```
当前架构                          目标架构
┌─────────────┐                ┌─────────────────┐
│   Pages     │                │     Pages        │
│  (主包全量)  │                │  (主包 + 分包)    │
├─────────────┤                ├─────────────────┤
│  Components │                │   Components     │
│  (6 个)      │                │  (扩展 + 插件化) │
├─────────────┤                ├─────────────────┤
│  Services   │                │   Services       │
│  (EventBus) │    ──────►     │  (全局 Store)    │
├─────────────┤                ├─────────────────┤
│  Storage    │                │   Data Layer     │
│ (本地全量)   │                │ (SQLite/云同步)   │
├─────────────┤                ├─────────────────┤
│  无后端      │                │  CloudBase/API   │
└─────────────┘                └─────────────────┘
```

---

## 变更记录

| 日期 | 变更内容 | 操作人 |
|------|---------|--------|
| 2026-03-18 | **CloudBase 集合部署 + 实时 watch 同步**：修复 deploy-db.js（ModifySafeRule 替代 ModifyDatabaseACL + CreateLoginConfig 匿名登录）→ 成功部署 11 个集合 + 安全规则 + 匿名登录 → SyncService 新增 startWatch/stopWatch 实时监听（CloudBase watch → 本地更新 → EventBus 通知 UI）→ 自动重连 + 回环检测 + 集合→事件映射 → app.ts onShow/onHide 生命周期管理 watch → Profile 页实时同步状态指示器（绿色脉冲圆点） | — |
| 2026-03-18 | **Phase 3.1/3.2 缺陷修复 + 家庭协作云端化**：sync.ts _uploadChanges 写入 userId 实现用户级数据隔离 + version 乐观锁递增激活并发检测 → FamilyService 全面云端桥接（创建/更新/删除/加入 自动同步 family_groups 集合）→ joinFamily 改为 async、优先从云端查询邀请码实现跨设备加入 → 新增 pullFamilyFromCloud() 云端拉取 → cloudbaserc.json 新增 family_groups + family_operations 集合 → cloudbaseRoot 路径修正 → family 页面适配 async joinFamily + 分享链接自动填充邀请码 + onShow 云端拉取 | — |
| 2026-03-18 | **Phase 3 全部完成**：3.5 多宝宝管理（baby-switcher 全局悬浮球）→ 3.4 成长报告（ReportService + Canvas 分享图 + report 页面）→ 3.3 AI 育儿助手（AiAdvisorService 本地规则引擎 + 异常检测 + 自然语言查询 + ai-advisor 页面）→ 3.1 云开发接入（SyncService 离线优先同步层 + 变更日志 + LWW 冲突解决）→ 3.2 家庭成员协作（FamilyService + RBAC 权限 + 邀请码 + 操作归属 + family 页面）。新增 4 个 Service + 4 个分包页面 + Profile 智能功能/云同步入口 | — |
| 2026-03-17 | **Phase 2.5 状态管理升级完成**：自研轻量 Store（store/index.ts ~250行）、管理 currentBaby/dashboardSummary/pageStyle、store.connect() 自动推送、5 个 Tab 页接入、消除 THEME_CHANGED 手动订阅 | — |
| 2026-03-17 | **Phase 2.4 一键快速记录完成**：QuickRecordService（10 模板）、首页"闪电记录"半屏弹窗、一键执行 + EventBus 自动刷新、暗色模式适配 | — |
| 2026-03-17 | **Phase 1 遗留任务完成**：配置 husky 9 + lint-staged 16 pre-commit hook；拆分 statistics.ts（474行→3文件：facade + dashboard + trend） | — |
| 2026-03-17 | **Phase 2.3 深色模式支持完成**：ThemeService（auto/light/dark 三模式）、theme.json 导航栏/tabBar 自动切换、@media(prefers-color-scheme:dark) CSS 变量覆盖、page-meta 手动覆盖、全部 11 页暗色适配 | — |
| 2026-03-17 | **Phase 2.2 数据可视化扩展完成**：新建 trend-chart Canvas 2D 组件（柱状/堆叠）、StatisticsService 7 天趋势方法、statistics 数据统计页面、首页趋势入口 | — |
| 2026-03-17 | **Phase 2.1 智能提醒系统完成**：ReminderService、App onShow 弹窗提醒、Daily 页喂养倒计时横幅、Profile 页提醒设置 | — |
| 2026-03-17 | **Phase 1 全部完成**：遗留代码清理（删 28 文件）、分包策略（5 分包 + preloadRule）、存储优化（debounce + 类型安全）、ESLint/Prettier（0 error）、包体积分析 | — |
| 2026-03-17 | 创建路线图，完成项目全面分析 | — |

---

*此文档为长期维护文档，每次迭代完成后请更新对应任务状态和变更记录。*

# Recallo App Store User Handoff - 2026-07-03

> 这份交接包由 `npm run app-store:create-user-handoff` 从当前决策表和上架状态自动生成。它只列用户必须补齐的事项；Codex 可自动执行的回写、验证和证据记录不要求用户手动做。

| 字段 | 值 |
| --- | --- |
| 日期 | 2026-07-03 |
| Git commit | f272048ee260 |
| Branch | codex/recallo-review-replay-mode |
| 决策字段总数 | 26 |
| 已完成字段 | 4 |
| 待用户补齐字段 | 22 |

## 当前状态摘要

- BLOCKED 用户决策表: totalFields=26, missingFields=22
- BLOCKED 用户行动分组: totalFields=26, missingFields=22
- BLOCKED 截图规格报告: Screenshot readiness: NOT READY (7 issues)
- BLOCKED 真机验收报告: Production acceptance: NOT READY (1 issue)
- PASS 生产健康报告: Production health: READY
- BLOCKED 公开页面报告: Static pages readiness: NOT READY (6 issues)
- BLOCKED 提交 readiness 报告: App Store submission readiness: NOT READY (10 blockers)
- PASS iOS Release 预检: Release archive preflight passed.
Overall status: NOT READY (6 blocking areas)
先运行 `npm run app-store:user-actions`，按分组补齐用户决策、URL、邮箱、截图和真机验收状态。

## 你需要补齐的事项

### 产品与商业化决策

| 项目 | 当前值 | 影响 |
| --- | --- | --- |
| 首版价格 | 待填写 | App Store 价格、审核备注、产品页文案 |
| 首版是否启用 IAP/订阅 | 待填写 | App Store 商业化配置、审核复杂度 |
| 每日真实 AI 生成额度 | 待填写 | 后端额度、App 内提示、隐私政策、审核备注 |
| 推荐好文是否计入额度 | 待填写 | 新用户体验、额度说明、审核备注 |
| 匿名用户是否可直接生成 | 待填写 | 首次体验、账号说明、审核备注 |

### 账号与数据恢复决策

| 项目 | 当前值 | 影响 |
| --- | --- | --- |
| 首版是否加入可选 Apple 登录 | 待填写 | 账号删除、隐私政策、App Review、前端入口 |
| 如果首版暂不做 Apple 登录，是否接受匿名数据恢复边界 | 待填写 | 隐私政策、账号说明、审核备注 |
| 如果首版做 Apple 登录，是否同步做删除账号入口 | 待填写 | Apple 审核硬要求、后端删除接口、前端入口 |

### 对外联系与 URL

| 项目 | 当前值 | 影响 |
| --- | --- | --- |
| 支持邮箱 | 待填写 | 例如 `support@example.com` |
| Privacy Policy URL | 待填写 | 必须 HTTPS、公开可访问 |
| Support URL | 待填写 | 必须 HTTPS、公开可访问 |

### App Store 元数据确认

| 项目 | 当前值 | 影响 |
| --- | --- | --- |
| Subtitle | 待填写 |  |
| Promotional Text | 待填写 |  |
| Category | 待填写 |  |
| Secondary Category | 待填写 |  |
| Keywords | 待填写 |  |

### 真机验收与截图

| 项目 | 当前值 | 影响 |
| --- | --- | --- |
| 真机验收记录文件 | 待填写 | 复制 `docs/app-store-release-evidence/production-acceptance-template.md` 后填写 |
| 是否仍有 P0 | 待填写 | 有 P0 时不能 Archive |
| 是否仍有未豁免 P1 | 待填写 | 有未豁免 P1 时不能 Archive |
| App Store 截图是否已准备 | 待填写 | 按 `docs/app-store-release-evidence/screenshots-checklist.md` |

### Xcode / App Store Connect 手动确认

| 项目 | 当前值 | 影响 |
| --- | --- | --- |
| Archive 中 App 名称/图标是否正确 | 待填写 | 旧名称或旧图标时立即停止 |
| App Store Connect 是否选择旧 bundle id 对应 App | 待填写 | 不要创建新 App |

## 建议直接回复模板

如果你同意快速首版方案，可以直接复制并填写这段：

```text
采用快速首版方案。

支持邮箱：<填写邮箱>
Privacy Policy URL：<填写公开 HTTPS URL>
Support URL：<填写公开 HTTPS URL>

每日真实 AI 生成额度：每天 3 篇，按 UTC day
推荐好文不计入额度：确认
匿名用户可直接生成：确认
首版暂不做 Apple 登录，并接受匿名数据恢复边界：确认
首版不启用 IAP/订阅：确认

App Store 元数据：
App Name：Recallo
Subtitle：把文章变成练习题
Promotional Text：把文章、长文和好内容变成知识点与练习题，让阅读真正变成可以继续学习的进度。
Category：Education
Secondary Category：Productivity
Keywords：学习,知识管理,文章,AI,记忆,题库,阅读,笔记,知识点,碎片知识,练习

真机验收：<无 P0 / 有 P0；无未豁免 P1 / 有未豁免 P1>
App Store 截图：<已准备 / 未准备>
Archive 确认：<名称/图标/Bundle ID 是否正确>
App Store Connect 确认：<是否在 com.maxhan.shibei 对应 App 下提交>
```

## 你回复后 Codex 自动执行

1. 把你的回复整理成决策 JSON。
2. 运行 `npm run app-store:apply-decisions -- <决策 JSON>`。
3. 把邮箱和 URL 整理成联系信息 JSON。
4. 运行 `npm run app-store:apply-contact -- <联系信息 JSON>`。
5. 回写隐私政策、支持页、App Store 元数据、审核包、用户清单和 Archive runbook。
6. 运行 `npm run app-store:create-acceptance` 创建真机验收记录。
7. 运行 `npm run app-store:status`、`npm run check:app-store-submit`、`npm run check:release-ios`、`npm run check`。
8. 把结果写回 `docs/app-store-release-readiness-plan-zh.md` 和证据目录。

## 仍需用户手动完成的外部动作

- 在 Apple Developer / App Store Connect 中确认旧 bundle id 对应的 App。
- 在 Xcode 中执行 Archive 和 Upload。
- 在 App Store Connect 中选择 build、填写隐私标签、上传截图、填写年龄分级并提交审核。
- 真机或 TestFlight 上完成核心路径验收并确认没有 P0 / 未豁免 P1。

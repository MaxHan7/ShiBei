# Recallo App Store User Handoff - 2026-07-03

> 这份交接包由 `npm run app-store:create-user-handoff` 从当前决策表和上架状态自动生成。它只列用户必须补齐的事项；Codex 可自动执行的回写、验证和证据记录不要求用户手动做。

| 字段 | 值 |
| --- | --- |
| 日期 | 2026-07-03 |
| 生成基准 Git commit | fbf02c56dd8e |
| Branch | codex/recallo-review-replay-mode |
| 决策字段总数 | 26 |
| 已完成字段 | 4 |
| 待用户补齐字段 | 22 |

## 当前状态摘要

- BLOCKED 用户决策表: totalFields=26, missingFields=22
- BLOCKED 用户行动分组: totalFields=26, missingFields=22
- BLOCKED 截图规格报告: Screenshot readiness: NOT READY (1 issue)
- BLOCKED 真机验收报告: Production acceptance: NOT READY (36 issues)
- PASS 生产健康报告: Production health: READY
- BLOCKED 公开页面报告: Static pages readiness: NOT READY (6 issues)
- PASS 隐私标签报告: App Store privacy labels readiness: READY
- BLOCKED 外部控制台确认: External console readiness: NOT READY (26 blockers)
- BLOCKED 提交 readiness 报告: App Store submission readiness: NOT READY (10 blockers)
- PASS iOS Release 预检: Release archive preflight passed.
Overall status: NOT READY (7 blocking areas)
- 运行 `npm run app-store:create-user-handoff -- --force` 刷新用户交接包，作为当前唯一用户待办入口。
- 用户按交接包模板补齐价格、额度、Apple 登录、邮箱、URL、元数据、截图和验收状态；Codex 随后运行 `npm run app-store:ingest-user-reply -- --input <reply-file> --acceptance-record <acceptance-file>` 做 dry-run，确认后加 `--apply` 回写。
- 用户提供正式支持邮箱、Privacy Policy URL、Support URL；Codex 用 `npm run app-store:apply-contact -- <contact-json> --dry-run` 验证并回写公开页面和提交包。
- 用户把至少 1 张符合规格的正式 App Store 截图放入 `docs/app-store-release-evidence/screenshots/app-store/`；首版仍建议补齐 6 张核心场景。Codex 运行 `npm run check:app-store-screenshots`。
- 用户填写已创建的真机/TestFlight 验收记录 `docs/app-store-release-evidence/2026-07-03-production-acceptance.md`；Codex 用 `npm run check:app-store-acceptance -- docs/app-store-release-evidence/2026-07-03-production-acceptance.md` 做严格检查。
- 用户填写已创建的 `.release/app-store-inputs/external-console-checks.json`；Codex 运行 `npm run check:app-store-external-console`。
- 所有用户输入回写后，Codex 跑 `npm run app-store:final-gate` 预览最终缺口；严格通过 `npm run check:app-store-final`、`npm run check:release-ios`、`npm run check` 后，用户再 Archive / Upload。

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

## 推荐执行顺序

字段不知道填什么时，先看：`docs/app-store-user-input-field-map-zh.md`。

1. 先按下面“建议直接回复模板”给 Codex 一次性回复产品决策、邮箱、URL、元数据和验收状态。
2. 再按“真机验收记录”填写 TestFlight/真机结果。
3. 然后按“Apple 外部控制台确认文件”填写 App Store Connect / Apple Developer 后台实际值。
4. 最后把至少 1 张符合规格的 App Store 截图放入 `docs/app-store-release-evidence/screenshots/app-store/`；首版仍建议补齐 6 张核心场景。

你不需要手动改隐私政策、支持页、元数据、审核说明或总计划。你给出上述输入后，Codex 会 dry-run、回写、跑 gate、记录证据并提交。

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

## Apple 外部控制台确认文件

App Store Connect 和 Apple Developer 后台信息不能靠 Codex 猜，需要你填写确认文件：

Codex 已创建本地文件：`.release/app-store-inputs/external-console-checks.json`。

打开它：

```bash
open .release/app-store-inputs/external-console-checks.json
```

不要重新复制模板覆盖这个文件；如果已经填过一部分，只继续补缺失字段。

然后按照 `docs/app-store-external-console-checklist-zh.md`，把 `.release/app-store-inputs/external-console-checks.json` 里的 `待确认` 改成实际值。填完后运行：

```bash
npm run check:app-store-external-console
```

这个检查通过前，不进入最终 App Review 提交。

## 真机验收记录

Codex 已创建真机验收记录草稿：`docs/app-store-release-evidence/2026-07-03-production-acceptance.md`。

打开它：

```bash
open docs/app-store-release-evidence/2026-07-03-production-acceptance.md
```

你只需要在这份记录里填写真机/TestFlight 结果、截图证据、iOS build number、设备、iOS 版本和最终结论。填完后运行：

```bash
npm run check:app-store-acceptance -- docs/app-store-release-evidence/2026-07-03-production-acceptance.md
```

## 你回复后 Codex 自动执行

1. 把你的回复保存为临时文本，运行 `npm run app-store:parse-fast-release-reply -- --input <回复文本> --acceptance-record <验收记录路径>`，生成 `.release/app-store-inputs/decision-values.json` 和 `.release/app-store-inputs/contact-values.json`。
2. 如果你没有一次性提供所有字段，Codex 会改用 `npm run app-store:create-fast-release-inputs` 补齐或生成 draft。
3. 运行 `npm run app-store:apply-decisions -- .release/app-store-inputs/decision-values.json --dry-run`。
4. 运行 `npm run app-store:apply-contact -- .release/app-store-inputs/contact-values.json --dry-run`。
5. dry-run 通过后，运行正式回写命令，更新决策表、隐私政策、支持页、App Store 元数据、审核包、用户清单和 Archive runbook。
6. 运行 `npm run app-store:final-gate` 预览剩余缺口。
7. 用户输入全部回写且验收完成后，运行 `npm run check:app-store-final`、`npm run check:release-ios`、`npm run check`。
8. 把结果写回 `docs/app-store-release-readiness-plan-zh.md` 和证据目录。

## 仍需用户手动完成的外部动作

- 在 Apple Developer / App Store Connect 中确认旧 bundle id 对应的 App。
- 按 `docs/app-store-external-console-checklist-zh.md` 填写 `.release/app-store-inputs/external-console-checks.json`。
- 在 Xcode 中执行 Archive 和 Upload。
- 在 App Store Connect 中选择 build、填写隐私标签、上传截图、填写年龄分级并提交审核。
- 真机或 TestFlight 上完成核心路径验收并确认没有 P0 / 未豁免 P1。

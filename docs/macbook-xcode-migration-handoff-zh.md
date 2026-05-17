# 拾贝 MacBook / Xcode 迁移交接文档

> 给接手的 AI / 工程师：请先读这份文档，再读 PRD 和开发计划。本文是当前项目状态和迁移路线的总入口，不替代 PRD。

## 1. 给接手 AI / 工程师的快速说明

拾贝是一款面向碎片知识的 AI 复习 iOS App。用户把文字、文章链接或视频链接添加进来，系统自动提取知识点、生成测试题，用户像背单词一样随时刷题复习。

当前项目还没有真实 Xcode 工程。现在的工作重点是：用 HTML Demo + Node 后端验证“真实内容输入 -> AI 生成知识点和题目 -> 用户复习 -> 反馈 -> 总结”的核心体验，并把已经验证过的产品逻辑迁移到 SwiftUI iOS App。

接手后不要直接把 HTML/CSS 代码搬进 iOS。HTML Demo 是行为原型和真实体验验证工具；iOS 端应按 PRD、页面原型和当前 Demo 交互逻辑重新用 SwiftUI 实现。

## 2. 项目目标和 MVP 范围

产品名：拾贝。

Slogan：每天捡起一枚知识贝壳。

MVP 核心目标：

- 让用户快速添加碎片知识。
- 自动生成章节、知识点和复习题。
- 用题卡复习验证用户是否真正理解内容。
- 按知识点维护本轮复习状态，而不是简单顺序刷题。
- 验证 AI 生成题目的质量是否足够支撑产品价值。

MVP 当前不做：

- 截图上传和 OCR。
- 订阅、会员和支付。
- 首页推荐系统。
- 标签、文件夹、搜索、归档、收藏。
- 用户手动编辑知识点或题目。
- 通知左滑已读、删除或复杂通知管理。

## 3. 必须先读的文档

建议阅读顺序：

1. `tasks/prd-ai-knowledge-review-ios.md`
   - 最完整的产品需求源头。
   - 页面、状态、复习规则、生成逻辑、失败处理都以这里为准。

2. `docs/superpowers/plans/2026-05-12-shibei-ios-mvp-implementation-plan-zh.md`
   - 中文 iOS MVP 开发计划。
   - 包含建议项目结构、里程碑和核心系统拆分。

3. `demo/README.md`
   - 当前 HTML Demo 的运行方式。

4. `quality-test-set/README.md`
   - 题目生成质量测试集说明。

5. `docs/superpowers/specs/2026-04-28-ai-knowledge-review-design-zh.md`
   - 早期中文产品设计稿，可辅助理解产品演进。

## 4. 当前代码结构

```text
tasks/
  prd-ai-knowledge-review-ios.md       # PRD，产品需求主文档

docs/
  macbook-xcode-migration-handoff-zh.md # 当前交接入口文档
  superpowers/
    specs/                             # 早期设计稿
    plans/                             # iOS MVP 开发计划

demo/
  index.html                           # HTML Demo 入口
  app.js                               # Demo 交互、复习 session、本地状态
  styles.css                           # Demo 视觉样式
  README.md                            # Demo 运行说明

backend/
  package.json                         # Node 后端脚本
  src/server.js                        # 本地 HTTP 服务和 API 雏形
  src/generation/                      # 核心出题系统
  src/sources/                         # 文本 / 链接正文提取输入层

quality-test-set/
  samples/                             # 固定测试样本
  results/                             # 批量测试结果输出目录
  manual-scoring-template.md           # 人工评分模板
```

## 5. 当前已完成进度

### 产品和 PRD

- 已明确产品名、slogan、MVP 范围和核心体验。
- 已完成较完整的中文 PRD。
- 已讨论并记录页面结构、复习规则、反馈逻辑、失败处理、通知入口、章节结构。

### HTML Demo

- 已接入真实后端生成接口，不再只是静态假数据。
- 支持粘贴文字生成章节、知识点、题目和解释。
- 支持普通文章链接输入层；视频链接当前只识别并友好失败。
- 支持章节详情、知识点列表、题卡、答题反馈、解释页、题目反馈、章节总结。
- 支持多章节本地状态。
- 支持每个章节独立保存 `reviewSession`。
- 支持通知页，生成成功 / 失败通知点击后进入章节详情。
- 支持失败章节进入详情页查看原因、重新生成或不再提示。
- 支持章节删除二次确认，删除后同步移除该章节通知和本地复习状态。
- 支持章节总结后继续下一章。

### 后端和核心出题系统

- 已有独立 `backend/src/generation/` 核心出题模块。
- 已包含内容清洗、语义分块、知识点候选提取、知识点过滤、题目生成、质量检查、AI Judge、单题重写、统一输出。
- 已支持 DeepSeek / OpenAI 模型调用配置。
- 已有文章链接输入层 `backend/src/sources/extractSourceContent.js`。
- 已有 `/api/generate` 和 `/api/regenerate`。
- 已新增内存版章节 / 通知 API 雏形，便于未来 iOS Service 层对齐：
  - `POST /api/chapters`
  - `GET /api/chapters`
  - `GET /api/chapters/:id`
  - `POST /api/chapters/:id/regenerate`
  - `DELETE /api/chapters/:id`
  - `GET /api/notifications`
  - `POST /api/notifications/:id/read`
  - `POST /api/notifications/:id/dismiss`

### 质量测试集

- `quality-test-set/samples/` 现在只用于真实样本 baseline，已加入 5 篇真实公众号文章样本。
- 之前的人工构造样本已移到 `quality-test-set/synthetic-samples/`，只用于开发回归、边界场景和 smoke test，不用于真实质量 baseline。
- 已有批量运行脚本入口：在项目根目录运行 `npm.cmd --prefix backend run quality:test`。
- 已有人工评分模板，用于记录题目是否可用、来源是否支撑、是否存在严重问题。
- 2026-05-15 已做第一次真实样本批量运行尝试，结果文件为 `quality-test-set/results/2026-05-15-093432.json`。本次 5 条样本全部失败，原因是运行测试的终端环境没有设置 `DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY`，不计入题目质量 baseline。配置模型 Key 后需要重新运行。
- 2026-05-15 已完成第一版真实样本 baseline，结果文件为 `quality-test-set/results/2026-05-15-095758.json`：5 条真实样本中 3 条成功、2 条失败；共提取 14 个知识点、入池 10 道题，机器平均分 4.4。该结果只能作为第一轮机器 baseline，仍需人工评分确认。
- 第一版 baseline 暴露的问题：两篇文章能提取知识点但没有合格题入池；少数通过题仍带 `distractorQuality_low`，说明干扰项质量门槛需要继续收紧；部分样本会围绕同一知识点生成多道题，后续需要检查是否符合“高可考性知识点 1-3 题”的策略。
- 2026-05-16 已开始按“单篇公众号逐篇打磨”的方式修复，不再一次跑 5 篇，也不把知识点和题目数量写死。首篇样本为 `wechat-OLsU21MsXlUtZlubVj5tkg.md`（AI 创业点子），最新结果为 `quality-test-set/results/2026-05-16-021420.json`：1 篇成功，提取 10 个知识点，入池 8 道题，机器平均分 4.5。该轮修复了长文只读取前 18 个 chunk 导致后半篇知识点缺失的问题，并让测试报告保留被拒题诊断。
- 2026-05-16 继续收紧 PRD 验收口径：单篇样本必须 `questionCoverageRate=100%` 才算通过，即每个最终保留知识点至少 1 道题、最多 3 道题。出题 prompt 已按第一性原理重写题型契约：`scenario_judgment` 必须是 4 个行动/判断方案，不再允许 A/B 成立判断题。
- 2026-05-16 完成第一性原理出题 prompt 优化后的单篇验证，结果文件为 `quality-test-set/results/2026-05-16-032253.json`：AI 创业点子样本 5 个保留知识点、11 道入池题、知识点覆盖率 100%、平均质量分 4.7。该轮没有核心低分 issue 入池，`scenario_judgment` 已按 4 选项行动/判断方案生成。

## 6. 本地运行方式

当前后端需要 Node.js 20+。

在 Windows 当前项目里：

```powershell
cd backend
$env:DEEPSEEK_API_KEY="你的 DeepSeek Key"
$env:DEEPSEEK_MODEL="deepseek-v4-flash"
npm.cmd run dev
```

如果使用 OpenAI：

```powershell
cd backend
$env:OPENAI_API_KEY="你的 OpenAI Key"
$env:OPENAI_MODEL="你的模型名"
npm.cmd run dev
```

在 Mac 上建议等价使用：

```bash
cd backend
export DEEPSEEK_API_KEY="你的 DeepSeek Key"
export DEEPSEEK_MODEL="deepseek-v4-flash"
npm run dev
```

然后打开：

```text
http://127.0.0.1:5173/index.html
```

检查命令：

```bash
cd backend
npm run check
cd ..
npm --prefix backend run quality:test
```

注意：不要把任何 API Key 写进文档、代码或提交记录。

## 7. 核心出题系统现状

核心出题系统是拾贝的核心资产，应该继续保持为独立模块，不要写死到 iOS 页面里。

当前设计方向：

- 输入层负责把文字、文章链接或未来视频链接转成干净文本。
- generation engine 只关心干净文本、来源信息和可选的已提取知识点。
- 输出必须包含章节标题、来源、知识点、题目、正确答案、解释、常见误区、来源片段和质量评分。
- 题目入池前必须通过质量检查。
- 质量检查包含规则检查和 AI Judge。
- 低质量题会单题重写；重写后仍不合格则丢弃。
- 如果没有任何合格题，应进入失败章节，而不是白屏或卡住。

迁移到 iOS 时，iOS 端不应直接调用模型。iOS 应调用后端 API，由后端负责生成、质量检查、失败处理和状态更新。

## 8. HTML Demo 现状

Demo 的价值是验证真实体验，而不是最终技术架构。

当前 Demo 已验证的关键产品逻辑：

- 首页保持极简，只展示开始 / 继续复习入口。
- 添加入口在底部中间 `+ 添加`。
- 用户提交后回首页并显示“已提交，正在生成；完成后会通知你”浮窗。
- 通知点击进入章节详情，不直接进入题卡。
- 章节详情是生成完成和失败后的落地页。
- 旧题答对在原题卡轻反馈后进入下一题。
- 新题答对 / 答错 / 不知道都会进入解释页。
- 严重题目反馈会把题从本轮复习移除。
- `太简单` 只做降权，不移除。
- 答错或不知道的知识点会在间隔 3 道其他题后强化，直到本轮答对。
- 章节完成页不显示“未掌握知识点”，因为未掌握会继续推题直到掌握或被跳过。
- 章节完成页可以继续下一章。

## 9. 后端 API 现状

当前后端仍是本地原型，不是生产后端。

已存在接口：

- `POST /api/generate`
  - Demo 当前主要使用。
  - 支持 `sourceType: "text"` 和 `sourceType: "article_link"`。

- `POST /api/regenerate`
  - 用于失败章节重新生成。

- 章节 / 通知 / 复习 API
  - 用于稳定 iOS Service 层的数据形状。
  - Railway 云端可通过 PostgreSQL 按匿名设备 ID 持久化；本地没有 `DATABASE_URL` 时仍使用内存模式。

后续真实 iOS MVP 需要补：

- 账号和用户数据绑定。
- 匿名设备数据迁移到账号。
- 真实通知系统，包括 APNs。
- 生产级任务队列和后台 worker。
- 生产级错误码和日志。

## 10. 质量测试集现状

测试集用于验证 AI 生成题目质量，是迁移前和迁移后都必须保留的资产。

当前已有：

- 真实样本目录 `quality-test-set/samples/`，已开始放入真实公众号文章、网页文章、用户笔记或视频摘要。
- 人工构造样本目录 `quality-test-set/synthetic-samples/`，覆盖 AI Agent、增长、产品理论、低密度内容、来源边界等开发场景。
- 批量生成脚本。
- 人工评分模板。
- 第一版真实样本机器 baseline：`quality-test-set/results/2026-05-15-095758.json`。
- 首篇单篇打磨结果：`quality-test-set/results/2026-05-16-021420.json`。该结果显示 AI 创业点子样本已从 0 道入池题提升到 8 道入池题，并覆盖小团队人效、AI 顾问、GEO、语音前台、AI 原生广告、电商内容、垂直 AI 产品、服务到产品等核心结构；但 10 个知识点只有 8 道题，按最新 PRD 口径仍不算通过，必须继续优化到每个知识点至少 1 道题。
- 最新达标结果：`quality-test-set/results/2026-05-16-032253.json`。该结果按新口径通过：5 个保留知识点全部覆盖，入池 11 道题，每个知识点 1-3 道题，题型和质量规则与 PRD 对齐。

下一步应该做：

- 先人工检查 `quality-test-set/results/2026-05-16-032253.json` 中的 11 道入池题，确认机器评分和真实复习体验一致。
- 下一篇建议继续单篇打磨 `wechat-claude-code-second-brain-every.md`，因为它在第一版 baseline 中同样是 0 道题入池。
- 继续修复被拒题诊断中高频出现的干扰项质量问题，重点提升无题知识点的补题成功率。
- 当前已有 5 条真实样本；如果时间允许，再补到 8-10 条会更稳。
- 每次修改 prompt 或质量规则后跑测试集。
- 记录可用题比例、严重问题比例、来源支撑问题、干扰项质量问题。
- 在迁移 iOS 前，至少建立一版人工评分 baseline。

## 11. 迁移到 Xcode 的建议路线

建议路线：

1. 在 MacBook 上先确认 Node 后端和 HTML Demo 能跑通。
2. 新建 SwiftUI iOS 工程，例如 `ios/ShiBei/`。
3. 先按 PRD 搭建 iOS 页面壳和导航，不急着接真实后端。
4. 用本地 mock 数据复刻 Demo 的主要页面流：
   - 首页
   - 添加知识
   - 全部章节
   - 通知
   - 章节详情
   - 完整知识点
   - 题卡
   - 解释页
   - 题目反馈弹窗
   - 章节总结
   - 来源详情
5. 把 Demo 的数据模型翻译成 Swift 模型：
   - `Chapter`
   - `Source`
   - `KnowledgePoint`
   - `Question`
   - `ReviewSession`
   - `ReviewAttempt`
   - `NotificationItem`
   - `FeedbackRecord`
6. 再接后端 API。
7. 最后补账号、数据库、异步任务和 APNs。

优先保证产品体验和复习闭环正确，不要一开始就陷入复杂后端架构。

## 12. 下一步优先任务

建议迁移前继续完成：

1. 在 HTML Demo 中继续测试多章节和通知流程，确认没有明显跳转错误。
2. 用 3-5 篇真实文章跑生成质量，记录问题。
3. 建立一版人工评分 baseline。
4. 明确 iOS 数据模型字段，和当前 API 返回字段对齐。
5. 准备 Xcode 工程结构和 SwiftUI 页面拆分计划。

建议迁移到 Mac / Xcode 后优先做：

1. 创建 SwiftUI 工程和基础导航。
2. 先用 mock 数据实现完整页面流。
3. 实现 ReviewSession 本地复习调度。
4. 接入本地后端 API。
5. 再考虑账号、数据库和推送。

## 12.1 迁移前验收清单

迁移到 MacBook / Xcode 前，建议先完成下面这轮验收。目的不是把 HTML Demo 做成正式产品，而是确认已经讨论过的核心体验没有明显断点。

### A. 多章节和首页入口

- 添加两段不同内容后，章节页出现两个章节。
- 首页只展示一个主入口：优先未完成 ReviewSession，其次最近已生成但未复习章节。
- 从章节页进入任意章节详情后，开始复习不会串到别的章节。
- 一个章节复习到一半后切换章节，再回来能继续原章节进度。
- 删除当前首页入口章节后，首页能自动选择下一个可复习章节；没有章节时回到极简空状态。

### B. 通知生命周期

- 生成成功后创建通知，点击通知进入对应章节详情页，不直接进入题卡。
- 生成失败后创建失败通知，点击通知进入失败章节详情页。
- 失败页点击“不再提示”后，该失败通知从通知页隐藏，但章节仍保留在章节页。
- 重新生成成功后，旧失败通知消失，并出现或保留生成成功通知。
- 删除章节后，该章节相关通知一并消失。

### C. 失败章节和重新生成

- 文章抓取失败、视频文本提取失败、内容不足、题目生成失败都能形成可进入的失败章节。
- 失败章节不能开始复习。
- 如果失败章节已有知识点，章节详情页展示前 6 个知识点，并可进入完整知识点页。
- 失败页按钮区只保留主操作“重试 / 重新生成”和文字操作“不再提示”。
- 点击重新生成后回到首页，并显示“已提交，正在生成；完成后会通知你”浮窗。

### D. 复习闭环

- 每个知识点初始至少出现一次。
- 新题答对或答错都会先显示选项颜色反馈，再进入解释页。
- 旧题答对显示原地轻反馈和“下一题”。
- 答错或点击“不知道”的知识点会在间隔 3 道其他题后强化。
- 如果剩余题不足 3 道，强化题排到本轮末尾。
- 强化答对后该知识点从强化队列移除。
- 所有未跳过知识点本轮答对后才进入章节总结页。
- 章节总结页不展示“未掌握知识点”，只显示章节信息、知识点和动作按钮。
- 存在下一章时，章节总结页显示“继续下一章”；始终显示“回到章节”。

### E. 来源和反馈

- 解释页只展示正确答案、正确理解、常见误区和来源片段，不展示“你的答案”或“为什么对”。
- 解释页“查看完整来源”能进入来源详情页。
- 链接来源显示“打开原文链接”；粘贴文字来源显示原始输入内容。
- 题目反馈弹窗包含：答案不准、题目看不懂、和来源无关、太简单。
- 严重反馈后，当前题从本轮复习移除，并撤销最近一次作答影响。
- “太简单”只记录降权，不移除当前题。

### F. 题目质量 baseline

- 至少用 5 个 `quality-test-set/samples/` 样本跑一次批量测试。
- 至少人工检查 20 道题，记录可用题比例和严重问题比例。
- 严重问题至少标记：来源不支撑、答案不唯一、解释错误、题目太简单、干扰项凑数。
- 把测试日期、样本范围和主要问题记录到 `quality-test-set/results/` 或单独记录文件中。

### 2026-05-15 验收记录

已完成一轮自动化 HTML Demo 行为验收，使用本地 seeded demo state，不依赖真实模型生成速度。

验收覆盖：

- 首页展示最近可复习章节。
- 章节页展示成功章节和失败章节。
- 点击章节卡片进入正确章节详情。
- 粘贴文字来源页展示原始输入内容。
- 章节 A / 章节 B 的 ReviewSession 互不串章。
- 从通知页点击失败通知进入对应失败章节详情。
- 失败页点击“不再提示”后，失败通知从通知页隐藏，但章节仍保留。
- 删除章节弹出二次确认。
- 删除章节后，该章节和相关通知都被移除。
- 章节总结页不会把已完成章节作为“继续下一章”目标。

验收结果：

```text
15 passed, 0 failed
```

本轮发现并修复：

- `继续下一章` 原先只排除当前章节，没有排除已经完成过复习的章节；已改为只选择未完成复习且可复习的章节。

本轮未覆盖：

- 真实模型生成速度和质量。
- 真实文章链接抓取成功率。
- 题目质量人工 baseline。
- 账号、数据库、APNs 和真实异步任务。

## 12.2 Xcode 首轮开发计划

这部分是迁移到 MacBook 后的第一轮执行建议。目标是先搭出 SwiftUI 产品骨架和 mock 体验，不要一开始就做完整云端后端。

### 阶段 1：创建 SwiftUI 工程和基础结构

- 在 `ios/ShiBei/` 下创建 SwiftUI App。
- 最低支持版本先按当前 Xcode 默认 iOS 版本设置，后续再根据真机情况调整。
- 建议目录：
  - `Models/`
  - `Services/`
  - `ViewModels/`
  - `Views/`
  - `Components/`
  - `Fixtures/`
- 先实现底部导航：`首页 / 章节 / + 添加 / 通知 / 我的`。

### 阶段 2：定义 Swift 数据模型

先用本地模型承接 Demo 和 API 字段：

- `Chapter`
- `ChapterSource`
- `KnowledgePoint`
- `ReviewQuestion`
- `QuestionOption`
- `ReviewSession`
- `ReviewAttempt`
- `NotificationItem`
- `FeedbackRecord`

模型需要支持本地 mock 数据和未来 JSON 解码。字段以 PRD 第 10 章和当前 Demo 输出为准，避免 iOS 端依赖后端调试字段。

### 阶段 3：用 mock 数据复刻完整页面流

先不接后端，使用 `Fixtures/` 里的 mock 数据实现：

- 首页空状态和可复习状态。
- 添加知识页。
- 全部章节页：已生成、处理中、失败三类卡片。
- 通知页：成功通知、失败通知、空状态。
- 章节详情页：已生成、处理中、失败三种状态。
- 完整知识点页。
- 题卡页：未作答、答对、答错。
- 解释页。
- 题目反馈弹窗。
- 来源详情页。
- 章节总结页。
- 删除确认弹窗。

验收标准：不接网络，也能完整走一遍 PRD 主流程和失败流程。

### 阶段 4：实现本地 ReviewSession 调度

- 每个章节同时只保留一个未完成 ReviewSession。
- 首次开始复习时按知识点生成队列。
- 答对、答错、不知道按 PRD 掌握分规则更新。
- 答错 / 不知道进入强化队列，固定间隔 3 道其他题后出现。
- 中途退出后能恢复。
- 完成条件和 HTML Demo 保持一致。

### 阶段 5：接入本地后端 API

- 先接 `GET /api/chapters`、`GET /api/notifications`，验证列表结构。
- 再接 `POST /api/chapters` 或保留当前 `/api/generate` 兼容调用。
- 接 `POST /api/chapters/:id/regenerate` 和 `DELETE /api/chapters/:id`。
- iOS 端只处理用户可见状态，不承载生成 prompt 或质量判断。

### 阶段 6：再进入真实后端能力

在 SwiftUI 主流程稳定后，再做：

- 匿名设备级 PostgreSQL 持久化。
- 账号系统和匿名数据迁移。
- 生产级异步任务队列。
- APNs 通知。
- 长期复习记录和云端恢复。

不要过早把账号、推送、支付和正式生产任务系统一起做进来；当前优先级是先把匿名设备云端生成和复习闭环稳定下来。

## 13. 已知风险和注意事项

- 当前没有真实 iOS 工程。
- 当前没有数据库和账号系统。
- 当前 API 是本地原型，内存数据重启即丢失。
- 公众号抓取受平台限制，不能假设 100% 成功。
- 视频链接当前只识别，不提取正文。
- 题目质量仍是最大风险，必须用测试集和人工评分持续打磨。
- HTML Demo 当前是行为参考，不是 iOS 架构参考。
- 如果修改产品逻辑，必须同步 PRD；如果只修改实现进度或迁移步骤，同步本文档即可。

## 14. 后续更新规则

之后每次讨论或开发，只要涉及以下内容，都要同步更新本文档：

- 页面结构或跳转逻辑变化。
- ReviewSession、掌握分、强化规则变化。
- 生成系统、质量检查、题型策略变化。
- API 字段、状态机、失败处理变化。
- Demo 已完成进度变化。
- iOS 迁移路线变化。
- 新增重要风险或技术决策。

更新原则：

- PRD 记录“产品应该是什么”。
- 本文档记录“当前项目做到哪里，以及接手者下一步怎么继续”。
- Demo README 记录“如何运行和测试 HTML Demo”。

## 15. iOS 接口 / 数据结构收口状态

2026-05-16 已新增 `docs/ios-api-data-contract-zh.md`，作为迁移到 MacBook / Xcode 后定义 Swift `Codable` 模型和 Service 层的第一阅读文件之一。

当前收口结论：

- `/api/chapters` 是未来 iOS 主入口，`/api/generate` 只作为 HTML Demo 和调试兼容入口保留。
- MVP 中 `Chapter` 继续直接保存来源信息，不单独拆 `Source` 对象。
- iOS 端不直接调用模型，也不承载 prompt、题目质量判断或正文提取逻辑。
- Xcode 第一轮应先实现 `Chapter`、`ChapterSource`、`KnowledgePoint`、`ReviewQuestion`、`ReviewSession`、`ReviewAttempt`、`QuestionFeedback`、`NotificationItem` 这些本地模型。
- Xcode 第一轮可以先用 mock service 复刻 Demo 行为，再按同一套数据结构接本地 Node API。
- Xcode 第一轮实施路径已收口到 `docs/xcode-first-sprint-plan-zh.md`。
- SwiftUI mock 数据已放在 `docs/fixtures/ios/`。

当前本地 Node API 已对齐以下接口雏形：

```text
POST   /api/chapters
GET    /api/chapters
GET    /api/chapters/:id
POST   /api/chapters/:id/regenerate
DELETE /api/chapters/:id

POST   /api/chapters/:id/review-session
GET    /api/chapters/:id/review-session
POST   /api/review-sessions/:id/attempts
POST   /api/questions/:id/feedback

GET    /api/notifications
POST   /api/notifications/:id/read
POST   /api/notifications/:id/dismiss
```

注意：这些接口仍然是本地内存原型，没有账号、数据库、鉴权、APNs 和真实异步任务队列。迁移到 iOS 时，先按 `docs/ios-api-data-contract-zh.md` 写模型和 mock service，不要把当前 HTML Demo 的本地状态实现方式直接搬到 SwiftUI。

## 16. 给下一个 AI 的建议提示词

可以把下面这段话给 MacBook / Xcode 上接手的 AI：

```text
你正在接手一个叫“拾贝”的 iOS MVP 项目。请先阅读：
1. docs/macbook-xcode-migration-handoff-zh.md
2. tasks/prd-ai-knowledge-review-ios.md
3. docs/superpowers/plans/2026-05-12-shibei-ios-mvp-implementation-plan-zh.md
4. demo/README.md

当前还没有真实 iOS 工程。已有 HTML Demo 和 Node 后端原型，用于验证真实内容生成题目和复习闭环。请不要直接照搬 HTML 代码到 SwiftUI，而是按 PRD 和 Demo 行为重新实现 iOS App。

优先任务是：在 Xcode 中创建 SwiftUI 工程，先用 mock 数据复刻首页、添加、章节、通知、题卡、解释页、总结页和来源页，再接入后端 API。

实现时要特别注意：题目质量是核心资产；ReviewSession 按知识点调度；答错/不知道的知识点要强化直到掌握；通知点击进入章节详情；失败章节要可进入查看原因；章节可删除；不要做订阅、支付、标签、搜索等非 MVP 功能。
```

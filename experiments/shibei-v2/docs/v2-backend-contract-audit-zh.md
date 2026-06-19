# 拾贝 V2 后端开工前 Contract Audit

日期：2026-06-19

本文档用于回答一个具体问题：当前 SwiftUI V2 mock、后端字段契约、prompt 字段生成规则之间是否已经足够对齐，能否进入后端实现阶段。

结论先行：可以进入后端实现阶段，但第一批实现必须先做 contract / serializer / golden sample validation，不能直接写 prompt 调 OpenAI。当前没有阻塞性的产品语义问题；剩余问题主要是工程落地顺序和字段适配。

## 当前状态

### 已经具备

- V2 产品主流程已经明确：主页当前章节、章节详情、章节概要、知识点开场、题目、答后反馈、单元总结、章节总结。
- SwiftUI 本地 mock 已经形成可运行的核心 UI 与交互。
- 后端字段语义已经集中在 `v2-backend-field-contract-zh.md`。
- prompt 生成质量规则已经集中在 `v2-prompt-field-rules-zh.md`。
- 后端实现计划已经存在：`docs/superpowers/plans/2026-06-18-shibei-v2-backend-prompt-schema-plan.md`。

### 已经开始实现

- `experiments/shibei-v2/backend/src/v2/contracts/reviewPathContract.js` 已建立，负责校验 V2 review path 的核心结构。
- `experiments/shibei-v2/backend/src/v2/golden/loadGoldenReviewPaths.js` 已建立，负责把人工 golden sample normalize 成正式 V2 contract 并通过 validator。
- `experiments/shibei-v2/backend/src/v2/serializers/reviewPathClientSerializer.js` 已建立，负责把正式 contract 映射给当前 SwiftUI V2 UI model。
- `experiments/shibei-v2/backend/src/v2/state/reviewSessionV2.js` 已建立，负责章节概要、知识点、题目、反馈、总结和收藏题入口的状态推进。
- `experiments/shibei-v2/backend/src/v2/generation/prompts/` 已建立第一批 prompt schema 与本地 validator，包括 `sourceMap`、`reviewPathPlan`、`unitCards`、`qualityJudge`。
- 当前后端仍以 V1 型 `knowledgePoints + questions` 为主。
- 当前 SwiftUI mock 使用的是本地 UI 友好模型，并不等于最终 API contract。
- prompt orchestration 仍在第一阶段后续任务中；当前还没有接真实模型。

## SwiftUI 当前字段与后端正式字段映射

### Chapter

| SwiftUI 当前字段 | 后端正式字段 | 处理方式 |
|---|---|---|
| `V2ReviewChapterData.title` | `chapter.title` | 直接映射。 |
| `V2ReviewChapterData.overview` | `chapter.summaryCard.text` | serializer 映射；SwiftUI 后续可改名为 `summaryText`，但不是阻塞项。 |
| `sourceTitle` | `chapter.source.title` | 直接映射。 |
| `sourceAuthor` | `chapter.source.author` | 直接映射；旧后端字段 `account` / `sourceAccount` 需要在 V2 serializer 中归一。 |
| `sourceURL` | `chapter.source.url` | 直接映射。 |
| `sourceBody[]` | `chapter.source.blocks[]` | serializer 映射；block kind 需要稳定枚举。 |
| `units[]` | `chapter.units[]` | 直接映射到 UI 数据数组。 |

需要注意：

- `chapter.summaryCard.note` 是后台校准/debug 字段，不进入 SwiftUI 正式 UI。
- `chapter.chapterSummary` 是整章完成页字段，不能和 `summaryCard` 混用。

### Unit / Knowledge Point

| SwiftUI 当前字段 | 后端正式字段 | 处理方式 |
|---|---|---|
| `V2ReviewUnitData.id` | `unit.id` | 直接映射。 |
| `title` | `unit.title` | 直接映射。 |
| `overview` | `unit.overview.text` | serializer 映射。 |
| `questions[]` | `unit.questions[]` | 直接映射到 UI 数据数组。 |
| `completionMessage` | `unit.summary.text` | serializer 映射；标题可由 `unit.summary.title` 或 UI 常量提供。 |

后端仍需提供但当前 SwiftUI mock 没有完整表达：

- `unit.order`：主页路径和章节详情排序使用。
- `unit.shortSummary`：章节详情折叠态、节点弹窗、列表预览使用。
- `unit.detailSummary`：章节详情展开态和题目生成上下文使用。
- `unit.why`：质量校验/debug 使用，默认不展示。
- `unit.sourceAnchor`：知识点级查看原文和题目 source anchor 校验使用。
- `unit.summary.title`：单元总结标题，第一版可固定“单元完成”。

这些不是产品待确认问题；后端实现时按字段契约补齐。

### Question

| SwiftUI 当前字段 | 后端正式字段 | 处理方式 |
|---|---|---|
| `V2ReviewQuestionData.id` | `question.id` | 直接映射。 |
| `kind` | `question.type` | enum 映射：`multiple_choice` / `matching`。 |
| `title` | UI 派生字段 | 不建议作为核心 schema 字段；可由题型和顺序派生，例如“轻量理解”“匹配理解”。如后续需要模型控制，再新增 `question.displayLabel`。 |
| `prompt` | `question.stem` | serializer 映射。 |
| `options[]` | `question.options[].text` | serializer 映射；正式后端必须保留 option id。 |
| `correctOptionIndex` | `question.correctOptionId` | serializer 将 id 转为 SwiftUI 需要的 index，或 SwiftUI 改为按 id 判断。推荐后端保留 id。 |
| `matchingPairs[]` | `question.leftItems[]` / `rightItems[]` / `pairs[]` | 当前 SwiftUI 把 pair 压平成 `left/right`，后端正式必须拆开左右选项和答案映射。 |
| `feedback` | `question.explanation` | serializer 映射；前端只展示这一段。 |
| `sourceExcerpt` | `question.sourceAnchorId` + `source.blocks` | 当前 mock 是临时文字。正式后端不应只给 excerpt，而应给 anchor id，由查看原文页滚动和高亮。 |

需要注意：

- `correctUnderstanding` 和 `misconception` 可以持久化用于 QA/debug，也可以只存在于生成链路内部；前端默认不展示。
- 匹配题左右各 4 项是当前真实 UI 目标；后端 validator 应当先按 4 对 4 校验。

### Home Path

| SwiftUI 当前字段 | 后端/状态来源 | 处理方式 |
|---|---|---|
| `currentChapter.eyebrow` | UI 常量 | 例如“当前章节”，不需要后端生成。 |
| `currentChapter.title` | 当前复习章节 `chapter.title` | 来自 `currentReviewChapter` 状态。 |
| `nodes[].id` | `start` + `unit.id` | serializer 派生。 |
| `nodes[].title` | `开始` 或 `unit.title` / 单元序号 | serializer 派生。 |
| `nodes[].subtitle` | `unit.shortSummary` 或题数进度 | serializer 派生。 |
| `nodes[].state` | `reviewSession.completedStepIds` + 当前 card | serializer 计算。 |
| `completedQuestionCount` / `totalQuestionCount` | `reviewSession.questionStates` + `unit.questions.length` | serializer 计算。 |
| `position` | 前端布局模板 | 不属于后端字段。 |

重要产品规则：

- 新生成章节不会自动替换首页当前章节。
- 只有用户在章节详情点击“开始复习/继续复习”，才写入当前复习章节。

### Review Session State

必须由后端/客户端共同维护，不是模型生成字段。

| 字段 | 用途 |
|---|---|
| `reviewSession.currentCard` | 恢复到章节概要、知识点开场、题目、答后反馈、单元总结或章节总结。 |
| `reviewSession.questionStates` | 记录选择题/连线题已答状态、反馈浮窗是否显示、查看原文返回后恢复状态。 |
| `reviewSession.completedStepIds` | 计算顶部进度条、主页节点进度环和继续按钮可用性。 |

工程要求：

- 从答后反馈进入查看原文，返回后仍是已作答 + 反馈可见状态。
- 从未作答题目进入查看原文，返回后仍是未作答状态。
- 从笔记页收藏题进入题目，默认未作答，不污染正式复习进度。

### Favorites / Notes

| SwiftUI 当前字段 | 后端正式字段 | 处理方式 |
|---|---|---|
| `V2SavedQuestionData.id` | `favorite.id` | 直接映射。 |
| `unitID` | `favorite.unitId` | 直接映射。 |
| `questionID` | `favorite.questionId` | 直接映射。 |
| `title` | `question.stem` 或收藏卡摘要 | serializer 派生。 |
| `source` | `chapter.title` / `source.title` | serializer 派生。 |
| `type` | `question.type` -> UI 文案 | serializer 派生。 |

收藏题路由需要 `favoriteRoute` 临时上下文：

- 返回：回笔记页。
- 继续：进入收藏列表下一题。
- 不更新 `reviewSession.currentCard`。

### Generation / Materials

全部章节页需要后端提供：

- `chapter.status`: `generating` / `completed` / `failed`。
- `generationMeta.currentStage`: `submitted`、`extracting_content`、`generating_points`、`generating_questions`、`quality_checking`、`completed`、失败阶段等。
- `chapter.displayStatusText`: 用户可见生成进度文案，可由后端派生。
- `chapter.failureReason`: 失败详情页展示文案。

生成后行为：

- 用户从上传页或推荐文章点击开始生成后，跳转全部章节页。
- 先显示遮罩 + 生成提示浮窗。
- 用户点击“知道了”关闭浮窗；若第一次生成，请求 iOS 通知权限。
- 关闭浮窗后插入新的生成中章节卡。

### Notifications

通知相关字段：

- `notification.type`: `chapter_generation_success` / `chapter_generation_failure`。
- `notification.target`: 成功进入章节详情；失败进入生成失败通知详情。
- `notification.createdAt` 或 `relativeTimeText`: 通知列表展示“刚刚”等时间。
- `chapter.failureReason`: 失败通知详情页展示。

通知 icon、banner、IP 都是前端组件/资产，不是后端字段。

## Prompt 规则覆盖检查

已覆盖：

- Summary 不是目录，而是核心命题 + 展开方向。
- 知识点按原文顺序切分，背景段不强行出题。
- `unit.title` / `shortSummary` / `detailSummary` / `overview.text` 语义分离。
- 题干自足，避免“根据原文/这篇文章/这里的”。
- 选择题一正三扰，干扰项承载真实误区。
- 连线题用于职责、边界、场景、验证维度，不机械配同义词。
- 前端只展示 `question.explanation`。
- `sourceAnchorId` 必须精准对应题目来源。
- 单元总结和章节总结职责分离。

仍需在实现时通过测试保证：

- 选择题没有第二正确答案。
- 连线题 `leftItems/rightItems/pairs` id 全部有效、一一对应、数量符合当前 UI。
- `sourceAnchorId` 指向真实 source block。
- 不生成空泛鼓励语或与章节内容无关的总结。

## 后端第一阶段实现清单

### P0：必须作为第一批后端任务完成

1. 建立 `src/v2/contracts/reviewPathContract.js`。**已完成**
   - 校验 top-level chapter shape。
   - 校验 unit/question/source anchor/chapter summary。
   - 校验 matching 结构。
   - 当前额外收紧：`source.blocks` 不能为空、`unit.questions` 不能为空、单选题必须 4 个选项。
2. 建立 golden sample loader。**已完成**
   - 读取 `docs/golden-samples/*.json`。
   - 将样章 normalize 到 V2 contract。
   - 用 contract validator 校验。
   - 当前兼容：旧 golden sample 中 3 对连线题会 normalize 为 4 对，以符合真实 UI 约束。
3. 建立 SwiftUI adapter/serializer。**已完成**
   - 把正式 contract 映射为当前 SwiftUI mock 需要的 UI model。
   - 用测试锁定 `stem -> prompt`、`explanation -> feedback`、`sourceAnchorId -> source article highlight` 等映射。
4. 建立 review session V2 状态机。**已完成**
   - 覆盖章节概要 -> unit overview -> question -> feedback -> unit summary -> next unit / chapter summary。
   - 覆盖查看原文返回后状态恢复。
   - 覆盖笔记收藏题入口不污染正式复习进度。
   - 当前实现文件：`src/v2/state/reviewSessionV2.js`。
   - 当前测试覆盖：完整流程推进、答题后反馈态、反馈浮窗关闭/重开、查看原文返回、收藏题临时 route。

### P1：prompt pipeline 开始前必须完成

1. `sourceMap` prompt/schema。**已完成第一版本地 schema/validator**
2. `reviewPathPlan` prompt/schema。**已完成第一版本地 schema/validator**
3. `unitCards` prompt/schema。**已完成第一版本地 schema/validator**
4. `qualityJudge` prompt/schema。**已完成第一版本地 schema/validator**
5. fake caller orchestration test，先不接真实模型。

### P2：接真实模型前完成

1. 生成状态和通知 target API。
2. 当前复习章节状态 API。
3. 推荐文章生成入口。
4. 失败详情页所需 failure reason normalization。

## 是否还需要继续查漏补缺

不需要继续开放式查漏补缺。

现在需要的是在实现中用测试兜底：

- contract validator 负责发现字段缺失。
- golden sample test 负责发现生成质量规则与样章不一致。
- serializer test 负责发现前后端字段名不一致。
- review session test 负责发现恢复、查看原文、收藏入口的状态 bug。

如果实现中发现某个字段含义无法从现有文档判断，再回到产品讨论；否则不再逐项询问设计端。

## 能否进入后端开发阶段

可以进入，但第一阶段不是直接写 prompt，而是：

1. V2 contract validator。
2. golden sample validation。
3. SwiftUI adapter serializer。
4. review session V2 state machine。

完成这四项后，再进入真实 prompt pipeline。这样风险最低，也最适合拆给 subagent 执行。

截至当前实现进度：P0 四项已经完成并纳入 `npm run check`；P1 的四个 prompt schema 已完成第一版本地 validator；当前后端检查为 `148/148` 通过。

## 推荐 subagent 执行方式

使用“一任务一个 subagent”的方式：

1. Subagent A：实现 `reviewPathContract` + tests。
2. Subagent B：实现 golden sample loader + tests。
3. Subagent C：实现 SwiftUI API serializer + tests。
4. Subagent D：实现 reviewSessionV2 + tests。
5. Subagent E：实现 prompt schema 文件，不接真实模型，只写结构化 schema 和 prompt 文案。
6. Subagent F：实现 fake caller orchestration，验证 pipeline 能产出 contract-valid payload。

每个 subagent 完成后，主线程审查 diff 和测试，再派下一个。不要一次性并行写全部后端，因为 contract 和 serializer 是后续任务的地基。

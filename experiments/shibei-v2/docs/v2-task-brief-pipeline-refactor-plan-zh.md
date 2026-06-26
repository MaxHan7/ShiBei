# V2 Task Brief Pipeline Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or execute this plan task-by-task with explicit checkpoints.

**Goal:** 把当前过重的 V2 ECD 生成链路，从“每个 unit 输出一份 ECD JSON”改成“把 ECD 自然融入 prompt 思考方式，只输出轻量 task brief”。第一轮目标是降低调用数、稳定 JSON、保留知识点覆盖和题型选择质量。

**Architecture:** ECD 不作为用户不可见的大型中间 JSON 字段输出，而作为各阶段 prompt 的设计准则：先明确学习对象，再明确可观察掌握证据，再选择适合的任务形态，最后生成前端可见题目。工程上采用 task brief 作为跨阶段契约，避免把完整 ECD 术语和推理链塞进 JSON。

**Tech Stack:** Node.js ESM、现有 V2 backend prompt schema、DeepSeek/OpenAI JSON caller、V2 quality runner、HTML quality report、`node:test`。

---

## Checkpoint 0: Baseline

- [x] 已提交架构重构前检查点：`dcab23e chore(v2): checkpoint before task brief refactor`
- [x] 当前问题确认：
  - 最新链路约 26 次模型调用。
  - `ecdPlanning` 每个 unit 调一次，且输出 ECD 结构化字段。
  - ECD 原则被“重 JSON 化”，导致 token、重试和 JSON 失败风险升高。

## Checkpoint 1: Replace Per-Unit ECD JSON With Batched Task Brief

**目标：** 保留 `sourceMap -> reviewPathPlan -> unitKnowledgeMap`，新增一次性 `taskBriefPlan`，替代 per-unit `ecdPlanning`。

- [x] 新增 `taskBriefPlan` schema。
- [x] 新增 `taskBriefPlan` prompt：让模型使用 ECD 作为思考方式，但只输出 `practiceGoals` 和 `questionPlans`。
- [x] 修改主链路：`unitKnowledgeMap -> taskBriefPlan -> multipleChoiceDraft / matchingDraft / unitSummaryDraft`。
- [x] `generationMeta` 记录 `taskBriefPlan` 和 `unitPracticePlans`，不再记录完整 `ecdPlanning`。
- [x] 保留 `ecdPlanning` 文件作为历史实验代码，但默认主链路不调用。
- [x] 跑 backend check。
- [x] 用黄金游戏化文章跑一轮质量实验，对比调用数、token、JSON 稳定性、知识点覆盖、题型质量。

**预期效果：** 先减少每个 unit 一次的 `ecdPlanning` 调用；如果 6 个 unit，调用数应至少减少 5 次。题目 draft 仍是 per-unit，因此这不是最终瘦身终点。

**结果：**

- 成功模型调用从 24 降到 16。
- 总 token 从约 147k 降到约 85k。
- DMC 仍是独立 unit，没有回到“游戏化核心概念 + DMC 合并”的结构性错误。
- 本轮仍有 2 次 retry，全部发生在 `matchingDraft`。
- 下一轮瓶颈已经明确：不是 ECD 方向本身，而是 per-unit draft stage 和 matching 结构化输出。

## Checkpoint 2: Batch Draft Stages

**目标：** 如果 Checkpoint 1 质量不退步，再把选择题、连线题、单元文案从 per-unit 调用改为批量调用。

- [x] 新增 `questionDraftBatch` schema：一次生成多个 unit 的 MC / matching 题。
- [x] 新增 `unitCopyBatch` schema：一次生成多个 unit 的 overview / summary。
- [x] 把总调用数压到接近：`sourceMap/deterministic + reviewPathPlan + unitKnowledgeMap + taskBriefPlan + questionDraftBatch + unitCopyBatch`。
- [x] 保留调试字段，但不把大段 source 和 ECD 思考重复传给每个 unit。

**结果：**

- 第一次 batch run 失败在 `taskBriefPlan`：模型输出过长，三次都没有闭合 JSON。
- 因此先对 `taskBriefPlan` 做了一次小瘦身：
  - 只允许 `microIds`，不再让模型同时输出 `targetIds` 和 `microIds`。
  - 对 `practiceGoal.target` 和 `commonMisconception` 加长度边界。
  - 明确 multiple-choice 不输出 `relationType`。
- compact-brief rerun 完成，证明 batch draft 可运行：
  - 成功模型调用从 16 降到 5。
  - 但总 token 从约 85k 升到约 109k。
  - retry 从 2 次升到 3 次。
  - matching 从 3 道降到 1 道。

**判断：**

- 这个 checkpoint 是有价值的技术验证，但不是最终推荐架构。
- 单个 `questionDraftBatch` 太大，容易把结构化 JSON 稳定性和 completion token 推高。
- `unitCopyBatch` 表现相对稳定，可以继续保留。
- 下一轮不应继续把所有题目塞进一个 batch；更合理的是拆成中等粒度：
  - `multipleChoiceDraftBatch`：只批量生成 MC。
  - `matchingDraftBatch`：只批量生成 selected matching，或在 matching 少量时保留 per-matching 调用。
  - 保持 `taskBriefPlan` 的 compact contract。

## Checkpoint 2.5: DSPy-Style Typed Draft Batches

**目标：** 按 DSPy-style signature 边界，把过粗的 `questionDraftBatch` 拆成两个中等粒度模块：

- `multipleChoiceDraftBatch`：只生成所有 unit 的选择题。
- `matchingDraftBatch`：只生成所有 unit 的连线题。
- `unitCopyBatch` 继续保留批量形态。

**实现结果：**

- [x] 新增 `multipleChoiceDraftBatch` schema / validator。
- [x] 新增 `matchingDraftBatch` schema / validator。
- [x] 主链路改为：
  `sourceMap/deterministic -> reviewPathPlan -> unitKnowledgeMap -> taskBriefPlan -> multipleChoiceDraftBatch -> matchingDraftBatch -> unitCopyBatch`。
- [x] typed batch 输入只带对应题型的 `questionPlans`，并只带这些题目引用到的 `practiceGoals`。
- [x] 旧 `questionDraftBatch` 保留为历史/回滚模块，但不再是默认主链路。
- [x] backend `npm run check` 通过。
- [x] 同篇黄金文章复测完成：`20260621-183909-v2-typed-draft-batches-max6`。

**对比结果：**

| Metric | Task brief per-stage | Mixed `questionDraftBatch` | Typed draft batches |
| --- | ---: | ---: | ---: |
| Units | 6 | 6 | 6 |
| Questions | 13 | 11 | 12 |
| Multiple choice | 10 | 10 | 10 |
| Matching | 3 | 1 | 2 |
| Successful model calls | 16 | 5 | 6 |
| Runtime failed attempts | 2 | 3 | 0 |
| Runtime retry attempts | 2 | 3 | 0 |
| Prompt tokens | 56,524 | 69,510 | 45,544 |
| Completion tokens | 28,220 | 39,612 | 22,755 |
| Total tokens | 84,744 | 109,122 | 68,299 |

**判断：**

- 这是当前三轮里技术指标最平衡的一版：调用数接近 mixed batch，但 token 和 retry 明显下降。
- DMC 继续作为独立 unit 出现，并得到 2 道 matching 题，说明拆分没有破坏结构型知识点覆盖。
- 仍有 5 个 deterministic diagnostic issue，主要是题干风格仍出现“以下/下列表述”一类考试感表达；下一轮应优化题干语气，但不属于架构性失败。
- 当前推荐把 typed draft batches 作为默认候选链路继续迭代。

## Checkpoint 3: Quality Comparison

每次测试都记录：

- 模型调用次数。
- prompt / completion / total tokens。
- JSON 失败与 retry 次数。
- unit 数量、题目数量、题型分布。
- 是否漏掉 DMC 这类独立知识点。
- matching 是否在自然关系题中出现。
- 题干是否自足，是否仍出现“根据本文/根据文章”。
- 干扰项是否有真实误区。

## Non-Goals

- 本轮不加入新的质量改写审查员。
- 本轮不做质量拦截；质量诊断只用于报告。
- 本轮不把 ECD 删除；只删除 ECD 的重型 JSON 中间产物。
- 本轮不改前端字段合同。

# V2 Backend Stability And Scenario Questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 先把 V2 后端出题链路的运行稳定性、JSON 输出稳定性和 token 成本压回可控范围，再单独进入“情境题/原文例子转题”质量增强。

**Architecture:** 本轮拆成两个轨道。Track A 只处理后端 runtime、stage 粒度、JSON 输出和 token metrics，不改题目教学策略；Track B 只登记题目质量方向，等 Track A 稳定后再做。ECD 继续作为设计原则，DSPy-style LM Program 继续作为技术框架，但不再把 ECD 变成重型 JSON 输出。

**Tech Stack:** Node.js ESM、V2 backend prompt stages、DeepSeek/OpenAI structured JSON caller、quality runner、HTML reports、`node:test`。

---

## Current Problem Record

### Track A: 后端稳定性 / 输出稳定性 / token 成本

当前最新可跑通版本证明题目质量大体能稳住，但后端链路仍不适合进入生产：

- 最新成功测试仍有 retry，说明 JSON 输出稳定性没有达到产品级。
- token 又上涨到高位，需要区分是“重试次数过多导致总 token 爆炸”，还是“单次架构本身已经过重”。
- `reviewPathPlan` 和 `unitKnowledgeMap` 仍是最需要关注的前置阶段；这两个阶段一旦失败，后续题目生成完全无法开始。
- 当前应优先减少无谓重试、缩短每个 stage 的输入/输出面、让报告清楚显示每个 stage 的输入 token、输出 token、attempt 次数、失败类型。

本轨道不解决：

- 选择题是否更像专家出的。
- 是否增加情境题。
- 是否让原文例子直接转题。
- 是否加入 quality repair 审查员。

### Track B: 题目质量 / 情境题 / 原文例子转题

当前题目质量处于“可接受但还不够理想”的状态。明显缺口是：

- 现在基本没有真正的情境题。
- 原文中很多有教学价值的例子没有转化成题。
- ECD 本身不直接告诉我们“必须出情境题”，但它强调 task 要能观察 learner evidence；原文例子可以作为 scenario task 的材料，用来观察用户是否能迁移、判断、应用。

本轨道后续要探索：

- 从 source blocks 中识别高价值 examples / scenarios。
- 把 example 变成“应用理解题”或“判断情境是否符合概念”的题。
- 让情境题服务于 ECD 的 evidence，不是为了增加题型花样。

Track B 必须等 Track A 稳定后再做，否则无法判断质量变化来自 prompt 改动还是 runtime 不稳定。

## Files

- Modify: `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js`
  - 记录每次模型调用的 prompt/completion/total tokens、attempt、stage、error type。
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js`
  - HTML report 增加 stage cost/stability 表。
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
  - 仅在 Track A 需要时缩短 `reviewPathPlan` / `unitKnowledgeMap` 的输出要求；不要加入情境题规则。
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/reviewPathPlan.js`
  - 如果 schema 仍要求过重字段，减少非必要长文本字段。
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/unitKnowledgeMap.js`
  - 保持 micro knowledge map 短字段，确保不输出长原文。
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`
  - 锁定 prompt 不再要求长 source support、不再把情境题规则混入 Track A。
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`
  - 锁定 stage schema 的字段长度和必填字段。
- Modify: `experiments/shibei-v2/docs/v2-llm-runtime-reliability-contract-zh.md`
  - 补充 Track A 的稳定性目标和通过线。
- Modify: `experiments/shibei-v2/docs/v2-llm-pipeline-technical-framework-zh.md`
  - 补充“稳定性优先于题型增强”的 checkpoint 原则。
- Modify: `experiments/shibei-v2/docs/v2-prompt-field-rules-zh.md`
  - 登记 Track B：情境题/原文例子转题规则，但标记为后续阶段。
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`
  - 记录每次实验结论。

## Acceptance Criteria

Track A 第一轮通过线：

- 同一篇黄金文章生成完成。
- `runtimeFailedAttemptCount <= 1`。
- `runtimeRetryAttemptCount <= 1`。
- `modelCallCount` 不高于当前可跑通版本的同级结构。
- HTML report 能显示每个 stage 的 token、attempt、失败类型。
- 总 token 明显低于当前 `120k` 左右的回归运行，或能清楚证明 token 爆炸主要来自 retry 而不是单次架构。
- 不降低 unit 覆盖，DMC 模型不能被合并丢失。
- 不在本轮引入情境题规则，保证变量单一。

Track B 后续通过线：

- 能识别原文中的 example/scenario source blocks。
- 至少能在有明显例子的 unit 中生成 1 道应用型情境题。
- 情境题的题干来自原文例子的抽象迁移，不直接变成阅读理解。
- 情境题仍有 `sourceAnchorId`，可跳转原文。

---

## Task 1: Add Stage Cost And Stability Breakdown

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js`

- [x] **Step 1: Inspect current runtime call metadata**

Run:

```bash
rg -n "promptToken|completionToken|runtime|attempt|modelCall" experiments/shibei-v2/backend/src/v2/generation
```

Expected: identify where token usage and retry attempts are currently recorded.

- [x] **Step 2: Add per-stage aggregation test or fixture check**

If `v2QualityExperiment.js` already has report tests, add an assertion that the report data contains:

```js
{
  stage: "unitKnowledgeMap",
  callCount: 1,
  failedAttemptCount: 0,
  retryAttemptCount: 0,
  promptTokenCount: 0,
  completionTokenCount: 0,
  totalTokenCount: 0
}
```

If there is no direct test seam, add a small pure helper near the report code:

```js
export function summarizeRuntimeByStage(runtimeCalls = []) {
  const byStage = new Map();
  for (const call of runtimeCalls) {
    const stage = call.stage || call.modelStage || "unknown";
    const row = byStage.get(stage) || {
      stage,
      callCount: 0,
      failedAttemptCount: 0,
      retryAttemptCount: 0,
      promptTokenCount: 0,
      completionTokenCount: 0,
      totalTokenCount: 0,
      errorTypes: {}
    };
    row.callCount += call.attempt === 1 ? 1 : 0;
    row.failedAttemptCount += call.status === "failed" ? 1 : 0;
    row.retryAttemptCount += call.attempt > 1 ? 1 : 0;
    row.promptTokenCount += call.promptTokenCount || 0;
    row.completionTokenCount += call.completionTokenCount || 0;
    row.totalTokenCount += call.totalTokenCount || 0;
    if (call.errorType) {
      row.errorTypes[call.errorType] = (row.errorTypes[call.errorType] || 0) + 1;
    }
    byStage.set(stage, row);
  }
  return Array.from(byStage.values());
}
```

- [x] **Step 3: Render stage breakdown in HTML report**

Add a compact table with columns:

```text
stage | calls | retries | failed attempts | prompt tokens | completion tokens | total tokens | error types
```

Expected: the report answers whether token explosion comes from one heavy stage or repeated attempts.

- [x] **Step 4: Run backend check**

Run:

```bash
npm --prefix experiments/shibei-v2/backend run check
```

Expected: all tests pass.

## Task 2: Diagnose Whether Token Explosion Is Retry-Driven Or Architecture-Driven

**Files:**
- Read: latest run JSON in `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs/`
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

- [x] **Step 1: Extract metrics from latest successful run**

Run:

```bash
node -e 'const fs=require("fs"); const p="experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs/20260623-000646-v2-knowledge-map-slim-regression-fix.json"; const j=JSON.parse(fs.readFileSync(p,"utf8")); console.log(JSON.stringify({status:j.status, modelCallCount:j.summary?.modelCallCount, runtimeFailedAttemptCount:j.summary?.runtimeFailedAttemptCount, runtimeRetryAttemptCount:j.summary?.runtimeRetryAttemptCount, promptTokenCount:j.summary?.promptTokenCount, completionTokenCount:j.summary?.completionTokenCount, totalTokenCount:j.summary?.totalTokenCount}, null, 2));'
```

Expected: produce exact baseline metrics for comparison.

- [x] **Step 2: After Task 1, rerun same article once**

Run with the existing quality runner command used for `_WY2GXs-iynGePgdsYLi0A`, using label:

```text
v2-stage-cost-breakdown-baseline
```

Expected: a new JSON and HTML report are saved under the same article quality-run directory.

- [x] **Step 3: Record diagnosis**

Update README with:

```markdown
### 2026-06-23 Stage Cost Breakdown Baseline

- Result:
- Retry-driven cost:
- Architecture-driven cost:
- Worst stage by total tokens:
- Worst stage by retries:
- Decision:
```

Do not paste API keys or full raw JSON.

## Task 3: Stabilize `reviewPathPlan` And `unitKnowledgeMap` Without Adding Teaching Rules

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/reviewPathPlan.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/unitKnowledgeMap.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`

- [x] **Step 1: Locate long required fields**

Run:

```bash
rg -n "sourceSupport|rationale|evidence|reason|summary|maxLength|required" experiments/shibei-v2/backend/src/v2/generation/prompts/reviewPathPlan.js experiments/shibei-v2/backend/src/v2/generation/prompts/unitKnowledgeMap.js experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js
```

Expected: identify any remaining fields that ask the model to output long justifications.

- [x] **Step 2: Remove or bound non-essential long fields**

Rules:

- Keep user-facing `chapterSummary`, unit title, unit short/long summary.
- Keep micro knowledge inventory, but short.
- Do not require per-micro source quotes.
- Do not require long rationale.
- If a field is only for debugging and not needed downstream, remove it from required schema or make it optional.

- [x] **Step 3: Add tests to prevent regression**

Add assertions in prompt tests:

```js
assert.equal(prompt.includes("不要输出 sourceSupport"), true);
assert.equal(prompt.includes("不要粘贴长原文"), true);
assert.equal(prompt.includes("每个 micro 都必须提供原文依据"), false);
```

Add schema tests that reject overlong micro summaries if max length exists.

- [x] **Step 4: Run backend check**

Run:

```bash
npm --prefix experiments/shibei-v2/backend run check
```

Expected: all tests pass.

## Task 4: Rerun Quality Test For Track A

**Files:**
- Add: new run JSON under `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs/`
- Add: new HTML report under `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/reports/`
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

- [x] **Step 1: Run same golden article**

Use the existing DeepSeek quality runner with label:

```text
v2-runtime-stability-token-baseline-fix
```

Expected: one JSON and one HTML report are created.

- [x] **Step 2: Compare against previous successful baseline**

Compare against:

```text
20260623-000646-v2-knowledge-map-slim-regression-fix
```

Record:

```text
status
unitCount
questionCount
matchingCount
modelCallCount
runtimeFailedAttemptCount
runtimeRetryAttemptCount
promptTokenCount
completionTokenCount
totalTokenCount
worstStageByToken
worstStageByRetry
```

- [x] **Step 3: Make a keep / revert decision**

Decision: do not treat the length-limit-only change as a successful stability fix. It passed unit tests but failed the golden-article run at `v2_unitKnowledgeMap` after three attempts. Keep the artifact as a diagnostic checkpoint, but the next implementation should change the shape of `unitKnowledgeMap` rather than adding more prompt wording.

Keep only if:

- generation completes;
- unit coverage is not worse;
- DMC remains independent;
- retry count is lower or the report clearly identifies a next smaller fix;
- total token count does not increase.

## Task 5: Register Track B Without Implementing It

**Files:**
- Modify: `experiments/shibei-v2/docs/v2-prompt-field-rules-zh.md`
- Modify: `experiments/shibei-v2/docs/v2-ecd-theory-background-zh.md`

- [ ] **Step 1: Add scenario-question note**

Add a section:

```markdown
## 情境题 / 原文例子转题（后续轨道）

目标不是增加题量，而是让原文中的高价值例子成为 ECD task，用来观察用户是否能迁移和应用知识。
```

- [ ] **Step 2: Define non-goals**

Add:

```markdown
- 不把所有例子都机械改写成题。
- 不在稳定性 checkpoint 里加入情境题规则。
- 不把情境题写成“根据本文例子”式阅读理解。
```

- [ ] **Step 3: Define future input/output idea**

Add:

```markdown
未来可新增 `scenarioCandidates`，由 deterministic source windows 或轻量 stage 提取高价值例子，再由题目 stage 判断是否适合生成 scenario task。
```

## Task 6: Commit Checkpoint

**Files:**
- Stage all modified Track A documentation/code/report files.

- [ ] **Step 1: Check status**

Run:

```bash
git status --short
```

Expected: only `experiments/shibei-v2/` files changed.

- [ ] **Step 2: Commit**

Run:

```bash
git add experiments/shibei-v2
git commit -m "Plan V2 backend stability and scenario question tracks"
```

Expected: commit succeeds and leaves worktree clean.

## Self-Review

- Spec coverage: The user asked to record the current issues, separate stability from question-quality work, and plan backend stability first. This plan does that.
- Placeholder scan: No TODO/TBD placeholders are used.
- Scope control: Track A does not modify question-quality strategy; Track B is recorded but blocked until Track A is stable.

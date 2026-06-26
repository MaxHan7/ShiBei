# V2 Task Brief Plan Scoped Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change `taskBriefPlan` from one all-chapter JSON output into per-unit scoped JSON outputs, then rerun the same golden article to validate runtime stability, token cost, and quality continuity.

**Architecture:** Keep the DSPy-style pyramid and extend the scoped boundary that already stabilized `unitKnowledgeMap`. `reviewPathPlan` remains the only all-article planning stage; after units exist, `unitKnowledgeMap` and `taskBriefPlan` both receive only one unit, that unit's micro map, and that unit's source window. The pipeline merges scoped `taskBriefPlan` outputs back into the existing downstream `{ units: [...] }` contract.

**Tech Stack:** Node.js ESM, V2 generation pipeline, existing `callAndValidate`, DeepSeek structured JSON output, `node:test`, V2 quality runner.

---

## Current Problem

The latest run (`20260623-145027-v2-unit-knowledge-map-primary-angle`) proved that scoped `unitKnowledgeMap` is stable:

- `reviewPathPlan` succeeded on the first attempt.
- All 8 `unitKnowledgeMap` calls succeeded on the first attempt.
- The run failed later in `taskBriefPlan`.

`taskBriefPlan` still receives full chapter context:

- all planned units;
- merged `unitKnowledgeMap`;
- a plan-level source union window;
- then it outputs all units' `practiceGoals` and `questionPlans` in one JSON response.

That single stage failed 3 attempts with `empty_structured_text`; each attempt consumed roughly 10.8k prompt tokens and 3.8k completion tokens. This is a structural payload problem, not primarily a wording problem.

## Files

- Modify: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js`
  - Replace single all-unit `taskBriefPlan` call with per-unit calls.
  - Add helper to extract one unit's micro map.
  - Add helper to merge scoped task brief outputs.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
  - Make taskBriefPlan wording scoped-compatible.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.test.js`
  - Assert `taskBriefPlan` receives one unit and one unit source window per call.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`
  - Update captured taskBriefPlan expectations from one all-unit call to per-unit calls.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`
  - Assert scoped taskBriefPlan prompt wording.
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`
  - Record the experiment result.

## Acceptance Criteria

- Backend tests pass.
- Prompt system HTML is regenerated.
- Same golden article reaches question drafting or completes.
- `taskBriefPlan` runtime rows show one call per planned unit instead of one all-unit call.
- `taskBriefPlan` receives `unit_window`, not `plan_union_window`.
- Total token cost is lower than the failed `82,212` token run, or the report clearly identifies the next bottleneck.
- No new question-quality rules are introduced in this checkpoint.

## Task 1: Add Scoped `taskBriefPlan` Pipeline Calls

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.test.js`

- [x] **Step 1: Add scoped task brief helpers**

Add helpers near the existing unit-map helpers:

```js
function pickUnitKnowledgeMapForUnit(unitKnowledgeMap, unitId) {
  return {
    units: (unitKnowledgeMap?.units || []).filter((unitMap) => unitMap?.unitId === unitId)
  };
}

function mergeTaskBriefPlanOutputs(outputs) {
  return {
    units: (outputs || []).flatMap((output) => output?.units || [])
  };
}
```

- [x] **Step 2: Replace the all-unit taskBriefPlan call**

Replace the current single `callAndValidate(..., "taskBriefPlan", ...)` block with:

```js
const taskBriefPlan = mergeTaskBriefPlanOutputs(
  await mapWithConcurrency(plan.units, unitConcurrency, async (plannedUnit) => {
    const sourceContext = unitSourceContexts.get(plannedUnit.id);
    const sourceAnchorByScopedUnit = new Map([[plannedUnit.id, plannedUnit.sourceAnchor?.id].filter(Boolean)]);
    return callAndValidate(
      activePromptCaller,
      "taskBriefPlan",
      {
        article,
        source: sourceContext.source,
        blocks: sourceContext.blocks,
        sourceContextNote: sourceContext.sourceContextNote,
        plan: buildSingleUnitPlan(stripReviewPathPlanForMetadata(plan), plannedUnit),
        unitKnowledgeMap: pickUnitKnowledgeMapForUnit(unitKnowledgeMap, plannedUnit.id)
      },
      (output) =>
        validateTaskBriefPlanOutput(output, {
          unitIds: new Set([plannedUnit.id]),
          sourceAnchorByUnit: sourceAnchorByScopedUnit
        }),
      {
        normalize: (output) =>
          normalizeTaskBriefPlanOutput(output, {
            sourceAnchorByUnit: sourceAnchorByScopedUnit
          })
      }
    );
  })
);
```

If the `Map` construction is awkward, implement it as:

```js
const sourceAnchorByScopedUnit = new Map();
if (plannedUnit.sourceAnchor?.id) {
  sourceAnchorByScopedUnit.set(plannedUnit.id, plannedUnit.sourceAnchor.id);
}
```

- [x] **Step 3: Keep downstream shape unchanged**

Leave downstream code unchanged:

```js
const questionBriefsByUnit = buildQuestionBriefsByUnit({
  taskBriefPlan,
  unitKnowledgeMap,
  unitSourceContexts
});
```

This proves the merge keeps the current internal contract.

- [x] **Step 4: Update pipeline tests**

In `v2GenerationProgram.test.js`, capture every taskBriefPlan payload. Assert:

```js
assert.equal(captured.taskBriefPlan.length, 2);
assert.deepEqual(captured.taskBriefPlan.map((payload) => payload.plan.units.length), [1, 1]);
assert.deepEqual(
  captured.taskBriefPlan.map((payload) => payload.plan.units[0].id),
  ["unit-01", "unit-02"]
);
assert.deepEqual(captured.taskBriefPlan[0].blocks.map((block) => block.id), ["p-002", "p-003", "p-004"]);
assert.deepEqual(captured.taskBriefPlan[1].blocks.map((block) => block.id), ["p-006", "p-007", "p-008"]);
assert.equal(captured.taskBriefPlan[0].sourceContextNote.mode, "unit_window");
assert.equal(captured.taskBriefPlan[1].sourceContextNote.mode, "unit_window");
```

- [x] **Step 5: Run focused pipeline tests**

Run:

```bash
node --test experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.test.js experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js
```

Expected: pass.

## Task 2: Align Prompt Wording With Scoped Shape

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`

- [x] **Step 1: Update taskBriefPlan wording**

In `buildTaskBriefPlanMessages`, change the task framing to:

```text
任务：只为当前输入的单个 unit 生成 compact practiceGoals 和 questionPlans；本阶段不生成用户可见题目。
```

Add:

```text
- 本次输入的 reviewPathPlan.units 只包含当前 unit；只输出 units 数组中的这一个 unit。
- 只使用当前 unit 的 unitKnowledgeMap.microKnowledgePoints；不要引用其他 unit。
```

Keep:

```text
- 输出只保留 practiceGoals 和 questionPlans；不要输出 ECD 术语字段、推理链、候选矩阵或长篇解释。
```

- [x] **Step 2: Update prompt tests**

In `buildV2PromptMessages.test.js`, assert:

```js
assert.match(messages.user, /只为当前输入的单个 unit/);
assert.match(messages.user, /只输出 units 数组中的这一个 unit/);
assert.match(messages.user, /不要引用其他 unit/);
```

- [x] **Step 3: Run prompt tests**

Run:

```bash
node --test experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js
```

Expected: pass.

## Task 3: Run Backend Check And Regenerate Prompt Map

**Files:**
- Modify generated: `experiments/shibei-v2/docs/prompt-system/v2-prompt-system-structure.html`

- [x] **Step 1: Run full backend check**

Run:

```bash
npm --prefix experiments/shibei-v2/backend run check
```

Expected: all tests pass.

- [x] **Step 2: Regenerate prompt system structure HTML**

Run:

```bash
node experiments/shibei-v2/docs/tools/generate-v2-prompt-system-map.mjs
```

Expected: prompt map HTML updates successfully.

## Task 4: Rerun Same Golden Article

**Files:**
- Add: new JSON under `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs/`
- Add: new HTML under `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/reports/`
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

- [x] **Step 1: Run the quality experiment**

Use label:

```text
v2-task-brief-plan-scoped
```

Run:

```bash
DEEPSEEK_API_KEY='<redacted>' QUALITY_ARTICLE_URL='https://mp.weixin.qq.com/s/_WY2GXs-iynGePgdsYLi0A' QUALITY_EXPERIMENT_SLUG='_WY2GXs-iynGePgdsYLi0A' QUALITY_EXPERIMENT_LABEL='v2-task-brief-plan-scoped' QUALITY_EXPERIMENT_TIMEOUT_MS=1200000 npm --prefix experiments/shibei-v2/backend run quality:v2
```

Expected: a JSON and HTML report are created.

- [x] **Step 2: Compare with the previous failed run**

Compare against:

- `20260623-145027-v2-unit-knowledge-map-primary-angle`

Record:

```text
status
failedStage
unitCount
questionCount
matchingCount
runtimeFailedAttemptCount
runtimeRetryAttemptCount
modelCallCount
promptTokenCount
completionTokenCount
totalTokenCount
taskBriefPlan calls / retries / token cost
```

- [x] **Step 3: Record conclusion**

Update README with:

```markdown
## 2026-06-23 Scoped Task Brief Plan

### Hypothesis
...

### Result
...

### Conclusion
...
```

## Self-Review

- Spec coverage: The plan implements the user's requested structural input slicing for `taskBriefPlan`, not only prompt wording.
- Placeholder scan: No TBD/TODO/fill-later placeholders remain.
- Type consistency: The plan keeps the existing `{ units: [...] }` downstream contract and only changes how scoped stage outputs are produced and merged.

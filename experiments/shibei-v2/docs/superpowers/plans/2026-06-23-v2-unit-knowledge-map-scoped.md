# V2 Unit Knowledge Map Scoped Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change `unitKnowledgeMap` from one all-chapter JSON output into per-unit scoped JSON outputs, then rerun the same golden article to validate stability, token cost, and coverage.

**Architecture:** Keep the current DSPy-style pyramid: `reviewPathPlan -> unitKnowledgeMap -> taskBriefPlan -> scoped question drafts`. Only change the `unitKnowledgeMap` stage shape. Each call receives one planned unit plus that unit's source window, returns one unit's micro knowledge inventory, and the pipeline merges all per-unit outputs into the existing downstream `unitKnowledgeMap` object.

**Tech Stack:** Node.js ESM, V2 generation pipeline, existing `callAndValidate`, DeepSeek JSON output, `node:test`, V2 quality runner.

---

## Current Problem

The latest failed run (`20260623-050536-v2-review-knowledge-length-limits`) showed:

- `reviewPathPlan` still had one JSON parse retry but eventually succeeded.
- `unitKnowledgeMap` failed three times:
  - 2 x `empty_structured_text`;
  - 1 x `json_parse_error`.
- The run burned 64,576 tokens before question drafting started.

The root issue is stage shape: `unitKnowledgeMap` currently asks the model to output all units' micro knowledge points in one large JSON. Length limits are not enough because one failed unit can invalidate the whole all-unit response.

## Files

- Modify: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js`
  - Replace single all-unit `unitKnowledgeMap` call with per-unit calls.
  - Merge per-unit outputs into `{ units: [...] }`.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
  - Clarify that `unitKnowledgeMap` can receive a one-unit `reviewPathPlan`.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.test.js`
  - Assert `unitKnowledgeMap` is called once per planned unit with one-unit plan/source context.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`
  - Update any all-unit `unitKnowledgeMap` expectations if needed.
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`
  - Record the experiment result and compare to previous runs.

## Acceptance Criteria

- Backend tests pass.
- Same golden article runs to completion, or if it fails, failure is isolated to a smaller scoped stage and recorded.
- `unitKnowledgeMap` runtime rows show multiple smaller calls instead of one all-unit call.
- Coverage is not worse than the successful baseline:
  - DMC remains an independent unit;
  - unit count does not collapse;
  - questions are generated after knowledge-map stage.
- Total token cost is lower than the previous successful 120,669-token run, or the report clearly shows the next bottleneck.

## Task 1: Add Per-Unit `unitKnowledgeMap` Pipeline Calls

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.test.js`

- [x] **Step 1: Add a helper that merges scoped maps**

Add this helper near existing unit-map helpers:

```js
function mergeUnitKnowledgeMapOutputs(outputs) {
  return {
    units: (outputs || []).flatMap((output) => output?.units || [])
  };
}
```

- [x] **Step 2: Replace the single call with per-unit calls**

Use the existing `mapWithConcurrency`, `buildSingleUnitPlan`, and `buildUnitSourceContexts` helpers. For each planned unit:

```js
const unitSourceContexts = buildUnitSourceContexts({ sourceMap, plan });
const unitKnowledgeMap = mergeUnitKnowledgeMapOutputs(
  await mapWithConcurrency(plan.units, unitConcurrency, async (plannedUnit) => {
    const singleUnitPlan = buildSingleUnitPlan(plan, plannedUnit);
    const sourceContext = unitSourceContexts.get(plannedUnit.id);
    return callAndValidate(
      activePromptCaller,
      "unitKnowledgeMap",
      {
        article,
        source: sourceMap.source,
        blocks: sourceContext.blocks,
        sourceContextNote: sourceContext.sourceContextNote,
        plan: singleUnitPlan
      },
      (output) =>
        validateUnitKnowledgeMapOutput(output, {
          unitIds: new Set([plannedUnit.id]),
          sourceAnchorIds: new Set([plannedUnit.sourceAnchor?.id].filter(Boolean))
        }),
      { normalize: normalizeUnitKnowledgeMapOutput }
    );
  })
);
```

- [x] **Step 3: Remove the later duplicate `unitSourceContexts` declaration**

The pipeline already needs `unitSourceContexts` before the scoped knowledge-map calls. Reuse that same variable downstream.

- [x] **Step 4: Add/adjust tests**

In `v2GenerationProgram.test.js`, make the fake prompt caller capture every `unitKnowledgeMap` payload. Assert:

```js
assert.equal(capturedUnitKnowledgeMapPayloads.length, 2);
assert.deepEqual(capturedUnitKnowledgeMapPayloads.map((payload) => payload.plan.units.length), [1, 1]);
assert.deepEqual(
  capturedUnitKnowledgeMapPayloads.map((payload) => payload.plan.units[0].id),
  ["unit-01", "unit-02"]
);
```

- [x] **Step 5: Run the focused test**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/pipeline/v2GenerationProgram.test.js
```

Expected: pass.

## Task 2: Keep Prompt Wording Aligned With Scoped Shape

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`

- [x] **Step 1: Adjust the stage description**

Change the wording from all-unit oriented text to scoped-compatible text:

```text
本次输入可能只包含一个 unit；只为输入 plan.units[] 中出现的 unit 输出 units[]。
```

- [x] **Step 2: Add a prompt assertion**

Assert the prompt contains:

```js
assert.match(messages.user, /本次输入可能只包含一个 unit/);
```

- [x] **Step 3: Run prompt tests**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/prompts/buildV2PromptMessages.test.js
```

Expected: pass.

## Task 3: Run Backend Check

**Files:**
- No new files.

- [x] **Step 1: Run full backend check**

Run:

```bash
npm --prefix experiments/shibei-v2/backend run check
```

Expected: all tests pass.

## Task 4: Rerun Same Golden Article

**Files:**
- Add: new JSON under `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs/`
- Add: new HTML under `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/reports/`
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

- [x] **Step 1: Run the quality experiment**

Use label:

```text
v2-unit-knowledge-map-scoped
```

Expected: a JSON and HTML report are created.

- [x] **Step 2: Compare with two baselines**

Compare against:

- `20260623-000646-v2-knowledge-map-slim-regression-fix`
- `20260623-050536-v2-review-knowledge-length-limits`

Record:

```text
status
unitCount
questionCount
matchingCount
runtimeFailedAttemptCount
runtimeRetryAttemptCount
modelCallCount
promptTokenCount
completionTokenCount
totalTokenCount
unitKnowledgeMap calls / retries / token cost
```

- [x] **Step 3: Record conclusion**

Update README with:

```markdown
## 2026-06-23 Scoped Unit Knowledge Map

### Hypothesis
...

### Result
...

### Conclusion
...
```

## Self-Review

- Spec coverage: The plan implements the chosen per-unit scoped strategy and validates it on the same article.
- Placeholder scan: No TODO/TBD placeholders are present.
- Scope control: The plan changes only `unitKnowledgeMap` stage shape and report docs; it does not add scenario-question or quality-repair behavior.

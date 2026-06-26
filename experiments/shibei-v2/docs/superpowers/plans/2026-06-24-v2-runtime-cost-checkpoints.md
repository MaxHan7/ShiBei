# V2 Runtime Cost Checkpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce V2 prompt runtime cost and JSON instability without changing the current acceptable question-quality behavior.

**Architecture:** Keep the current DSPy-style pyramid stages, but tighten the payload each downstream stage receives. Start with the lowest-risk stage, `unitCopyBatch`, because it only writes UI copy and should not need full question/source context.

**Tech Stack:** Node.js backend, V2 generation pipeline, schema-constrained model calls, `node:test`.

---

### Task 1: Slim `unitCopyBatch` Input

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.test.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`

- [x] **Step 1: Add a compact copy-input builder**

Create a helper that converts each unit into only the fields needed to write mobile copy:

```js
function buildUnitCopyInputs({ unitDraftInputs, questionDraftsByUnit }) {
  return unitDraftInputs.map((input) => {
    const questions = questionDraftsByUnit.get(input.unit.id)?.questions || [];
    return {
      unit: pickUnitCopyFields(input.unit),
      practiceSignals: summarizePracticeSignals(input.practicePlan, questions)
    };
  });
}
```

- [x] **Step 2: Stop passing source windows and full question plans to `unitCopyBatch`**

Replace the current inline payload:

```js
units: unitDraftInputs.map((input) => ({
  unit: input.unit,
  practicePlan: input.practicePlan,
  questions: questionDraftsByUnit.get(input.unit.id)?.questions || [],
  sourceContext: input.sourceContext
}))
```

with:

```js
units: buildUnitCopyInputs({ unitDraftInputs, questionDraftsByUnit })
```

- [x] **Step 3: Update prompt text**

Change `unitCopyBatch` instructions so the model knows it receives compact unit metadata and practice signals, not source blocks or question drafts.

- [x] **Step 4: Update tests**

Assert `unitCopyBatch` no longer receives `sourceContext.blocks`, `questions`, or `practicePlan.questionPlans`, and still returns copy for every unit.

- [x] **Step 5: Run focused and full checks**

Run:

```bash
cd experiments/shibei-v2/backend && node --test src/v2/generation/pipeline/v2GenerationProgram.test.js src/v2/generation/generateReviewPathV2.test.js src/v2/generation/prompts/buildV2PromptMessages.test.js
npm --prefix experiments/shibei-v2/backend run check
```

Expected: all tests pass.

### Task 2: Run Same-Article Runtime Comparison

**Files:**
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

- [x] **Step 1: Run quality experiment**

Run the same golden article with label `v2-unit-copy-slim`.

- [x] **Step 2: Compare against baseline**

Compare against `20260623-151023-v2-task-brief-plan-scoped`:

```text
modelCallCount
runtimeFailedAttemptCount
runtimeRetryAttemptCount
unitCopyBatch prompt/completion/total tokens
totalTokenCount
questionCount
matchingCount
```

- [x] **Step 3: Update README**

Record whether `unitCopyBatch` token cost dropped and whether question quality looked unchanged.

### Task 3: Decide Next Checkpoint

**Files:**
- Modify: `experiments/shibei-v2/docs/superpowers/plans/2026-06-24-v2-runtime-cost-checkpoints.md`

- [x] **Step 1: If Task 1 improves cost without quality loss**

Next checkpoint should focus on `matchingDraftBatch` first: it is still a whole-chapter batch, and this run shows it grows when matching plans increase. Keep `unitCopyBatch` output length caps as a secondary low-risk refinement.

- [x] **Step 2: If quality regresses**

Not needed in this run. Keep baseline commit `b67f01c` as rollback point.

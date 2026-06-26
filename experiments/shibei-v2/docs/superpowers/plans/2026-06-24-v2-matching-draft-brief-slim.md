# V2 Matching Draft Brief Slim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `matchingDraftBatch` prompt payload without changing matching output schema or increasing model call count.

**Architecture:** Keep `matchingDraftBatch` as one whole-chapter call for now, because the latest run had 0 retries and the stage is not the largest cost source. Slim the payload by passing typed `questionBriefs` instead of duplicating `practicePlan.practiceGoals` and `practicePlan.questionPlans`.

**Tech Stack:** Node.js backend, V2 generation pipeline, schema-constrained model calls, `node:test`.

---

### Task 1: Pass Matching Brief Inputs

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.test.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`

- [x] **Step 1: Add matching-specific input builder**

Create a helper that keeps only:

```js
{
  unit,
  questionBriefs,
  sourceContext
}
```

for units that have matching briefs.

- [x] **Step 2: Keep validation against hydrated practice plans**

Do not weaken validation. Continue to validate output with `practicePlansByUnit` and `sourceAnchorByUnit` outside the model payload.

- [x] **Step 3: Update matching prompt wording**

Replace `questionPlan` and `practicePlan` references with `questionBrief` references. The model should use `questionBrief.relationType`, `questionBrief.purpose`, `questionBrief.practiceGoal.target`, and `questionBrief.evidence`.

- [x] **Step 4: Update tests**

Assert `matchingDraftBatch` receives `questionBriefs` but does not receive `practicePlan.questionPlans` or `practicePlan.practiceGoals`.

- [x] **Step 5: Run checks**

Run:

```bash
cd experiments/shibei-v2/backend && node --test src/v2/generation/pipeline/v2GenerationProgram.test.js src/v2/generation/generateReviewPathV2.test.js src/v2/generation/prompts/buildV2PromptMessages.test.js
npm --prefix experiments/shibei-v2/backend run check
```

Expected: all tests pass.

### Task 2: Run Same-Article Comparison

**Files:**
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

- [x] **Step 1: Run quality experiment**

Run with label `v2-matching-brief-slim`.

- [x] **Step 2: Compare to `v2-unit-copy-slim`**

Compare:

```text
matchingDraftBatch prompt/completion/total tokens
runtimeRetryAttemptCount
runtimeFailedAttemptCount
questionCount
matchingCount
diagnosticIssueCount
```

- [x] **Step 3: Decide whether to keep**

Keep if matching cost drops or stays flat without quality/retry regression. If token cost rises meaningfully, revert this checkpoint and revisit a true per-unit matching split later.

Result: do not keep the code change. The experiment completed, but `matchingDraftBatch` became less stable and more expensive:

- `matchingDraftBatch` total tokens: `14,271 -> 40,771`
- `matchingDraftBatch` calls/attempts: `1 -> 3`
- `matchingDraftBatch` retry errors: `0 -> 2 json_parse_error`
- Whole-run total tokens: `113,156 -> 174,130`
- Whole-run retry attempts: `0 -> 6`

Decision: revert matching brief-slim code and keep this plan/report as a negative checkpoint. The likely reason is that removing hydrated `practicePlan` made matching output less anchored even though the input looked smaller. Future matching optimization should not repeat this exact brief-only approach; if needed, test true per-unit matching or smaller output budgets behind a separate checkpoint.

# V2 DSPy Typed Draft Batches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the oversized `questionDraftBatch` stage with two medium-grained DSPy-style draft modules, then rerun the golden article experiment and compare stability, cost, and output quality.

**Architecture:** Keep the current compact pyramid `sourceMap -> reviewPathPlan -> unitKnowledgeMap -> taskBriefPlan`, then split question drafting by output signature: one batch module only drafts multiple-choice questions, and one batch module only drafts matching questions. Keep `unitCopyBatch` because it is short and stable, and keep `questionDraftBatch` as a rollback/historical module rather than the default path.

**Tech Stack:** Node.js ESM, local JSON-schema validators, V2 quality runner, DeepSeek/OpenAI-compatible structured JSON caller.

---

## File Structure

- Create `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend/src/v2/generation/prompts/multipleChoiceDraftBatch.js`
  - Defines the schema and validator for a cross-unit multiple-choice-only batch.
- Create `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend/src/v2/generation/prompts/matchingDraftBatch.js`
  - Defines the schema and validator for a cross-unit matching-only batch.
- Modify `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
  - Adds prompt builders for the two typed batch modules.
- Modify `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js`
  - Registers the two new schemas and output token budgets.
- Modify `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
  - Replaces the default `questionDraftBatch` call with `multipleChoiceDraftBatch` plus optional `matchingDraftBatch`.
- Modify backend tests under `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend/src/v2/generation/`
  - Updates stage order and skip behavior.
  - Adds schema/prompt registration tests.
- Modify V2 docs:
  - `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/v2-llm-stage-contracts-zh.md`
  - `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/v2-task-brief-pipeline-refactor-plan-zh.md`
  - `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

## Task 1: Add typed batch schemas

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/generation/prompts/multipleChoiceDraftBatch.js`
- Create: `experiments/shibei-v2/backend/src/v2/generation/prompts/matchingDraftBatch.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`

- [x] **Step 1: Add schema imports and expected schema names to the test**

Add imports for the two new schema files and assert these names:

```js
assert.equal(MULTIPLE_CHOICE_DRAFT_BATCH_OUTPUT_SCHEMA.name, "shibei_v2_multiple_choice_draft_batch");
assert.equal(MATCHING_DRAFT_BATCH_OUTPUT_SCHEMA.name, "shibei_v2_matching_draft_batch");
```

- [x] **Step 2: Implement `multipleChoiceDraftBatch.js`**

Create a batch schema with `{ units: [{ unitId, questions }] }`, reusing `MULTIPLE_CHOICE_DRAFT_OUTPUT_SCHEMA.properties.questions.items` for question shape. Validator must:

```js
validateMultipleChoiceDraftBatchOutput(output, { practicePlansByUnit, sourceAnchorByUnit })
```

For each unit, call `validateMultipleChoiceDraftOutput({ unitId, questions }, { unitId, plans: practicePlan.questionPlans, sourceAnchorId })`.

- [x] **Step 3: Implement `matchingDraftBatch.js`**

Create a batch schema with `{ units: [{ unitId, questions }] }`, reusing `MATCHING_DRAFT_OUTPUT_SCHEMA.properties.questions.items` for question shape. Validator must:

```js
validateMatchingDraftBatchOutput(output, { practicePlansByUnit, sourceAnchorByUnit })
```

For each unit, call `validateMatchingDraftOutput({ unitId, questions }, { unitId, plans: practicePlan.questionPlans, sourceAnchorId })`.

- [x] **Step 4: Run schema tests**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/prompts/promptSchemas.test.js
```

Expected: tests pass after implementation.

## Task 2: Add typed batch prompt modules

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.test.js`

- [x] **Step 1: Add prompt-builder tests**

Add tests that call:

```js
buildV2PromptMessages("multipleChoiceDraftBatch", payload)
buildV2PromptMessages("matchingDraftBatch", payload)
```

Assertions:
- MC prompt says it only generates multiple-choice questions.
- Matching prompt says it only generates matching questions.
- Both prompts say not to output ECD fields or reasoning.
- Both prompts include `unitDraftInputs`.

- [x] **Step 2: Implement prompt builders**

Add stage dispatch for `multipleChoiceDraftBatch` and `matchingDraftBatch`. The prompts should be shorter than `questionDraftBatch` and include only rules relevant to that type.

- [x] **Step 3: Register schemas in `modelPromptCaller.js`**

Add imports and stage configs:

```js
multipleChoiceDraftBatch: { estimatedOutputTokens: 6500 }
matchingDraftBatch: { estimatedOutputTokens: 5200 }
```

- [x] **Step 4: Run prompt/model caller tests**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/prompts/buildV2PromptMessages.test.js src/v2/generation/modelPromptCaller.test.js
```

Expected: tests pass after implementation.

## Task 3: Switch default orchestration to typed batches

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`

- [x] **Step 1: Update stage order tests**

Expected default stages:

```js
[
  "sourceMap",
  "reviewPathPlan",
  "unitKnowledgeMap",
  "taskBriefPlan",
  "multipleChoiceDraftBatch",
  "matchingDraftBatch",
  "unitCopyBatch"
]
```

If no matching plans exist, `matchingDraftBatch` must be skipped at runtime, but the active stage list can still describe the default pipeline contract.

- [x] **Step 2: Add orchestration helper functions**

Add helpers:

```js
buildTypedDraftInputs(unitDraftInputs, type)
normalizeTypedQuestionDraftBatchIds(output, unitDraftInputs, type)
mergeTypedQuestionDrafts({ unitDraftInputs, multipleChoiceDraftBatch, matchingDraftBatch })
```

- [x] **Step 3: Replace default `questionDraftBatch` call**

Call:

```js
const multipleChoiceDraftBatch = hasMultipleChoicePlans ? await callAndValidate(...) : { units: [] };
const matchingDraftBatch = hasMatchingPlans ? await callAndValidate(...) : { units: [] };
```

Then merge and sort questions per unit by `practicePlan.questionPlans`.

- [x] **Step 4: Preserve rollback metadata clearly**

Remove `generationMeta.questionDraftBatch` from the default output and add:

```js
generationMeta.multipleChoiceDraftBatch
generationMeta.matchingDraftBatch
```

Keep the old `questionDraftBatch.js` file as rollback code, but do not call it in the default chain.

- [x] **Step 5: Run orchestration tests**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/generateReviewPathV2.test.js
```

Expected: tests pass.

## Task 4: Run full backend check

**Files:**
- No code changes unless tests expose failures.

- [x] **Step 1: Run backend check**

Run:

```bash
npm --prefix experiments/shibei-v2/backend run check
```

Expected: all tests pass.

## Task 5: Rerun the golden article quality experiment

**Files:**
- Generated: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs/<timestamp>-v2-typed-draft-batches-max6.json`
- Generated: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/reports/<timestamp>-v2-typed-draft-batches-max6.html`

- [x] **Step 1: Run the same golden article**

Run with `DEEPSEEK_API_KEY` in the environment, deterministic source map, max 6 units, serial unit execution, and label `v2-typed-draft-batches-max6`.

- [x] **Step 2: Compare against prior runs**

Compare:
- `20260621-173146-v2-task-brief-plan-max6`
- `20260621-180107-v2-batched-draft-compact-brief-max6`
- new `v2-typed-draft-batches-max6`

Record:
- model call count
- retry count
- total input/output tokens
- question count
- matching count
- structural JSON failures
- qualitative judgment on knowledge coverage

## Task 6: Update docs and commit

**Files:**
- Modify: `experiments/shibei-v2/docs/v2-llm-stage-contracts-zh.md`
- Modify: `experiments/shibei-v2/docs/v2-task-brief-pipeline-refactor-plan-zh.md`
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

- [x] **Step 1: Update stage contract docs**

Mark `questionDraftBatch` as historical / rollback. Document `multipleChoiceDraftBatch` and `matchingDraftBatch` as the current typed batch defaults if the test is acceptable.

- [x] **Step 2: Update quality run README**

Add the new run metrics, artifact links, and conclusion.

- [x] **Step 3: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-06-21-v2-dspy-typed-draft-batches.md experiments/shibei-v2/backend/src/v2/generation experiments/shibei-v2/docs
git commit -m "refactor(v2): split batched question draft stages"
```

Expected: commit succeeds on `codex/shibei-v2-isolated-build`.

## Self-Review

- Spec coverage: The plan addresses DSPy-style module/signature granularity, implementation, tests, quality rerun, comparison, docs, and commit.
- Placeholder scan: No TBD or missing implementation intent remains.
- Type consistency: `multipleChoiceDraftBatch` and `matchingDraftBatch` consistently use `{ units: [{ unitId, questions }] }`, matching existing per-unit draft schemas and orchestration expectations.

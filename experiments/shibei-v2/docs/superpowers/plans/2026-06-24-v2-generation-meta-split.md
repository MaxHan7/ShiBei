# V2 Generation Meta Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate production-light generation metadata from full quality-experiment/debug metadata without changing prompt generation quality.

**Architecture:** Keep the current V2 generation chain unchanged. Add an explicit `generationMetaMode` option in the orchestration layer: production runs keep only lightweight operational metadata, while quality experiments keep full intermediate prompt artifacts for review.

**Tech Stack:** Node.js ESM backend, V2 generation pipeline, existing `node --test` test suite, existing quality single-article runner.

---

## File Structure

- Modify: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js`
  - Add `generationMetaMode`.
  - Build full debug meta for quality experiments and lightweight meta for production.
  - Keep quality diagnostics and runtime summary available in both modes.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/runV2QualityExperiment.js`
  - Ensure quality runs request full debug metadata.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`
  - Add focused assertions for `generationMetaMode: "production"` and `"debug"`.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.test.js`
  - Add or update pipeline-level assertions if needed.
- Modify: `experiments/shibei-v2/docs/v2-backend-field-contract-zh.md`
  - Record that full intermediate metadata is quality/debug-only.

## Task 1: Add a Production-Light Metadata Mode

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`

- [ ] **Step 1: Add failing tests for production metadata**

Add a test that calls:

```js
const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
  promptCaller: happyPathPromptCaller,
  now: "2026-06-24T00:00:00.000Z",
  generationMetaMode: "production"
});
```

Expected assertions:

```js
assert.equal(reviewPath.generationMeta.currentStage, "completed");
assert.equal(reviewPath.generationMeta.stageRuntime.schemaVersion, "v2_stage_runtime_1");
assert.equal(reviewPath.generationMeta.sourceContextStats.fullBlockCount > 0, true);
assert.equal(reviewPath.generationMeta.qualityGate.blocking, false);
assert.equal(reviewPath.generationMeta.reviewPathPlan, undefined);
assert.equal(reviewPath.generationMeta.unitKnowledgeMap, undefined);
assert.equal(reviewPath.generationMeta.taskBriefPlan, undefined);
assert.equal(reviewPath.generationMeta.multipleChoiceDraftBatch, undefined);
assert.equal(reviewPath.generationMeta.matchingDraftBatch, undefined);
assert.equal(reviewPath.generationMeta.unitCopyBatch, undefined);
assert.equal(reviewPath.generationMeta.unitPracticePlans, undefined);
```

- [ ] **Step 2: Add debug metadata test**

Add a second test that calls:

```js
const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
  promptCaller: happyPathPromptCaller,
  now: "2026-06-24T00:00:00.000Z",
  generationMetaMode: "debug"
});
```

Expected assertions:

```js
assert.equal(reviewPath.generationMeta.unitKnowledgeMap.units.length > 0, true);
assert.equal(reviewPath.generationMeta.taskBriefPlan.units.length > 0, true);
assert.equal(reviewPath.generationMeta.multipleChoiceDraftBatch.units.length > 0, true);
assert.equal(reviewPath.generationMeta.unitPracticePlans.length > 0, true);
```

- [ ] **Step 3: Implement `generationMetaMode`**

Add an option to `runV2GenerationProgram`:

```js
generationMetaMode = process.env.V2_GENERATION_META_MODE || "production"
```

Add helper:

```js
function shouldIncludeDebugGenerationMeta(mode) {
  return mode === "debug" || mode === "quality";
}
```

Build base metadata:

```js
const baseGenerationMeta = {
  currentStage: "completed",
  sourceContextStats: buildSourceContextStats({ sourceMap, plan, planSourceContext }),
  stageRuntime: runtimeRecorder.summary(),
  stages: activeV2GenerationStages({ qualityJudgeEnabled }).map((stage) => ({
    status: stage,
    displayStatusText: stageDisplayText(stage),
    at: now
  }))
};
```

Then conditionally merge debug-only fields:

```js
const generationMeta = {
  ...baseGenerationMeta,
  ...(shouldIncludeDebugGenerationMeta(generationMetaMode)
    ? {
        reviewPathPlan: stripReviewPathPlanForMetadata(plan),
        unitKnowledgeMap,
        taskBriefPlan,
        multipleChoiceDraftBatch,
        matchingDraftBatch,
        unitCopyBatch,
        unitPracticePlans
      }
    : {})
};
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm --prefix experiments/shibei-v2/backend run check
```

Expected: all tests pass.

## Task 2: Keep Quality Experiments Full-Fidelity

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/runV2QualityExperiment.js`

- [ ] **Step 1: Set quality runner metadata mode**

When calling `runV2GenerationJob`, pass:

```js
generationMetaMode: "quality"
```

Expected behavior:

- Quality report JSON still contains `chapter.generationMeta.unitKnowledgeMap`.
- Quality report JSON still contains `chapter.generationMeta.taskBriefPlan`.
- HTML report still has enough data for manual prompt audit.

- [ ] **Step 2: Run a single-article quality test**

Use the existing quality runner with the current golden article and stable label.

Expected:

- status `completed`
- `runtimeRetryAttemptCount` remains acceptable
- HTML report generated
- `generationMeta` in quality report remains full

## Task 3: Document the Contract

**Files:**
- Modify: `experiments/shibei-v2/docs/v2-backend-field-contract-zh.md`

- [ ] **Step 1: Add a metadata mode note**

Add a short section under Internal Generation / Quality Metadata:

```md
### Generation Meta Modes

V2 has two metadata modes:

- `production`: default for product generation. Keeps operational status, stage runtime, source context stats, and quality gate summary. Does not persist full intermediate prompt artifacts.
- `quality` / `debug`: used by quality experiments and prompt audits. Keeps `unitKnowledgeMap`, `taskBriefPlan`, draft batches, and unit practice plans for human review.

SwiftUI must not depend on debug-only fields.
```

- [ ] **Step 2: Run docs-free validation**

Run:

```bash
git diff --check
```

Expected: no whitespace errors.

## Task 4: Commit and Report

- [ ] **Step 1: Review changed files**

Run:

```bash
git diff --name-only
```

Expected files are only under `experiments/shibei-v2/`.

- [ ] **Step 2: Commit implementation**

Run:

```bash
git add experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js \
  experiments/shibei-v2/backend/src/v2/generation/tests/runV2QualityExperiment.js \
  experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js \
  experiments/shibei-v2/docs/v2-backend-field-contract-zh.md \
  experiments/shibei-v2/docs/superpowers/plans/2026-06-24-v2-generation-meta-split.md
git commit -m "Split V2 generation metadata modes"
```

Expected: commit succeeds.

## Self-Review

- Spec coverage: production-light meta and quality-full meta are both covered.
- Placeholder scan: no TBD placeholders.
- Type consistency: `generationMetaMode` is passed through `generateReviewPathV2` to `runV2GenerationProgram` via options.

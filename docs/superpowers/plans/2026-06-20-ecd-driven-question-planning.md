# ECD-Driven Question Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ecdPlanning` drive downstream unit practice planning and question drafting instead of staying as a diagnostic-only shadow stage.

**Architecture:** Keep the existing V2 split-stage pipeline, but pass the current unit's ECD `knowledgeModel`, `learningClaims`, `evidenceNeeds`, `taskPlans`, and `assemblyPlan` into `unitPracticePlan`. The first implementation keeps `unitPracticePlan` as a transition adapter that converts ECD `selectedTasks` into existing `practiceGoals` and `questionPlans`, so SwiftUI and visible question contracts remain stable.

**Tech Stack:** Node.js ESM backend, JSON schema prompt contracts, built-in `node:test`, V2 quality runner.

---

### Task 1: Add Per-Unit ECD Context

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`

- [x] **Step 1: Write a test asserting `unitPracticePlan` receives current-unit ECD context**

Add a test that uses a custom prompt caller, inspects the `unitPracticePlan` payload, and expects:

```js
assert.equal(payload.ecdContext.unitId, payload.unit.id);
assert.equal(payload.ecdContext.assemblyPlan.unitId, payload.unit.id);
assert.equal(payload.ecdContext.selectedTasks.length, 2);
assert.equal(payload.ecdContext.selectedTasks[0].taskAffordance, "matching");
```

- [x] **Step 2: Implement context extraction**

Add a helper:

```js
function getEcdContextForUnit(ecdPlanning, plannedUnit) {
  const unitId = plannedUnit.id;
  const knowledgeUnit = ecdPlanning.knowledgeModel?.units?.find((item) => item.unitId === unitId) ?? null;
  const learningClaims = (ecdPlanning.unitLearningClaims ?? []).filter((item) => item.unitId === unitId);
  const evidenceNeeds = (ecdPlanning.unitEvidenceNeeds ?? []).filter((item) => item.unitId === unitId);
  const taskPlans = (ecdPlanning.unitTaskPlan ?? []).filter((item) => item.unitId === unitId);
  const assemblyPlan = (ecdPlanning.unitAssemblyPlan ?? []).find((item) => item.unitId === unitId) ?? null;
  return {
    unitId,
    knowledgeUnit,
    learningClaims,
    evidenceNeeds,
    taskPlans,
    assemblyPlan,
    selectedTasks: assemblyPlan?.selectedTasks ?? [],
    skippedEvidence: assemblyPlan?.skippedEvidence ?? []
  };
}
```

- [x] **Step 3: Pass ECD context into unit generation**

Update the orchestration so `generateUnitReviewContent` receives `ecdContext` and includes it in the `unitPracticePlan` prompt payload.

### Task 2: Make `unitPracticePlan` an ECD Adapter

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`

- [x] **Step 1: Write a prompt test**

Assert that `buildV2PromptMessages("unitPracticePlan", ...)` includes:

```text
ECD context
selectedTasks
不要重新选择题型
```

- [x] **Step 2: Update the prompt signature**

Change:

```js
function buildUnitPracticePlanMessages({ article, source, blocks, unit })
```

to:

```js
function buildUnitPracticePlanMessages({ article, source, blocks, unit, ecdContext })
```

- [x] **Step 3: Rewrite the prompt contract**

Tell the model:

- Convert ECD `selectedTasks` into existing `questionPlans`.
- Do not invent extra matching tasks.
- Preserve `questionPlan.id = selectedTask.questionPlanId`.
- Map `selectedTask.taskAffordance` to `questionPlan.type`.
- Map `selectedTask.taskPurpose` to `questionPlan.purpose`.
- Use selected task evidence to create `practiceGoals`.

### Task 3: Preserve ECD Traceability in Draft Payloads

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`

- [x] **Step 1: Pass `ecdContext` to draft stages**

Update `multipleChoiceDraft`, `matchingDraft`, and `unitSummaryDraft` payloads to include `ecdContext`.

- [x] **Step 2: Include ECD context in draft prompts**

Update draft prompts so they know the source claim/evidence/task they are fulfilling.

- [x] **Step 3: Preserve existing front-end contract**

Do not expose internal fields in SwiftUI-visible question data during this task. Keep ECD metadata in `generationMeta.ecdPlanning` and `generationMeta.unitPracticePlans`.

### Task 4: Run Tests and Quality Smoke

**Files:**
- No new files expected.

- [x] **Step 1: Run focused tests**

```bash
node --test experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js
```

- [x] **Step 2: Run backend check**

```bash
npm --prefix experiments/shibei-v2/backend run check
```

- [x] **Step 3: Run the same gamification article once**

Use the same quality runner with a new label such as `v2-ecd-driven-planning`.

### Task 5: Document Result

**Files:**
- Modify: `experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md`
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

- [x] **Step 1: Update implementation status**

Record that `ecdPlanning` now drives `unitPracticePlan`, while draft output remains front-end compatible.

- [x] **Step 2: Record quality finding**

After the run, record whether DMC matching remains and whether non-DMC units stopped borrowing DMC-style matching.

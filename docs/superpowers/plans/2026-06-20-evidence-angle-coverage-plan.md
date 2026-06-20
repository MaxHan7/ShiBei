# Evidence Angle Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Extend the V2 ECD planning pipeline so each important knowledge point can be assessed from multiple evidence angles rather than only by a single broad task.

**Architecture:** Keep the current coverage-first ECD pipeline, but add a new internal `unitEvidenceAngles` layer between `unitSubObjectives` and `unitEvidenceNeeds`. Assembly remains evidence-driven: required evidence still must be covered, and selected tasks now also expose which evidence angles they cover.

**Tech Stack:** Node.js ESM backend, JSON-schema-like prompt schemas, `node --test`, V2 quality runner, Markdown docs.

---

### Task 0: Preserve Previous Checkpoint

**Files:**
- No file edits.

- [x] **Step 1: Confirm previous commit**

Run:

```bash
git rev-parse --short HEAD
```

Expected: previous coverage-first commit `21875f3`.

- [x] **Step 2: Add checkpoint tag**

Run:

```bash
git tag checkpoint/v2-coverage-first-ecd-20260620 21875f3
```

Expected: tag exists and can be used to return to the pre-angle state.

### Task 1: Extend ECD Schema With Evidence Angles

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/ecdPlanning.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`

- [x] **Step 1: Add failing schema test**

Add assertions that `ECD_PLANNING_OUTPUT_SCHEMA` exposes `unitEvidenceAngles` and each angle includes:

```js
angleId
unitId
subObjectiveId
claimId
angleType
importance
anglePurpose
sourceAnchorId
```

- [x] **Step 2: Implement schema**

Add enums:

```js
export const EVIDENCE_ANGLE_TYPES = [
  "definition_grasp",
  "structure_mapping",
  "boundary_discrimination",
  "misconception_detection",
  "scenario_transfer",
  "mechanism_reasoning",
  "source_grounding"
];

export const EVIDENCE_ANGLE_IMPORTANCE = [
  "required",
  "supporting",
  "optional"
];
```

Add top-level `unitEvidenceAngles` to the schema and validation flow.

- [x] **Step 3: Validate references**

Validation must ensure:

```text
unitEvidenceAngles[].unitId references a known unit
unitEvidenceAngles[].subObjectiveId references unitSubObjectives
unitEvidenceAngles[].claimId references unitLearningClaims
unitEvidenceNeeds[].angleId references unitEvidenceAngles
```

- [x] **Step 4: Preserve backward normalization**

Normalize unknown angle types to `definition_grasp`, unknown importance to `supporting`, and keep the original value in `originalAngleType` / `originalImportance`.

### Task 2: Make Assembly Cover Angles, Not Only Evidence IDs

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/ecdPlanning.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`

- [x] **Step 1: Add `angleIds` to task plans and selected tasks**

Each `unitTaskPlan[]` and `unitAssemblyPlan[].selectedTasks[]` item should include `angleIds`.

- [x] **Step 2: Validate required angles**

If an angle has `importance: "required"`, then at least one selected task in the same unit must include that `angleId`.

- [x] **Step 3: Add rejection test**

Create a fixture where a required angle is not selected by assembly. Expected validation error:

```text
selectedTasks must cover required angle <angleId>
```

### Task 3: Update Prompts To Ask For Multi-Angle Evidence

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`

- [x] **Step 1: Update ECD planning prompt**

Prompt must explicitly say:

```text
For each important subObjective, list evidence angles before writing evidenceNeeds.
Use multiple angles when one broad task would not be enough to support the learner claim.
Do not add mechanical volume; add angles only when they produce different observable evidence.
```

- [x] **Step 2: Update assertions**

Add tests that the prompt includes:

```text
unitEvidenceAngles
多角度 evidence
definition_grasp
scenario_transfer
misconception_detection
Assembly must cover required angles
```

### Task 4: Pass Angles Into Practice Planning

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`

- [x] **Step 1: Include angles in `getEcdContextForUnit`**

The unit context should include:

```js
angles: ecdPlanning.unitEvidenceAngles.filter((item) => item.unitId === unitId)
```

- [x] **Step 2: Carry angle IDs into generated question plans**

When converting selected tasks to practice `questionPlans`, include `angleIds` on internal plans so the quality report can show what each question covers.

### Task 5: Render Angle Coverage In HTML Reports

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js`

- [x] **Step 1: Add Angle Coverage Matrix**

Render each unit’s angles with:

```text
Angle
Claim
Evidence
Selected task
Covered / missing
```

- [x] **Step 2: Keep Coverage Matrix**

Do not remove the existing required evidence coverage table; angle coverage is an additional view.

### Task 6: Update Documentation

**Files:**
- Modify: `experiments/shibei-v2/docs/v2-ecd-product-ai-system-analysis-zh.md`
- Modify: `experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md`
- Modify: `experiments/shibei-v2/docs/v2-backend-field-contract-zh.md`

- [x] **Step 1: Record the problem**

Document that coverage-first fixed missing knowledge points but did not yet ensure multi-angle assessment inside each knowledge point.

- [x] **Step 2: Record the ECD basis**

Tie this change to:

```text
Evidence Model: one learner claim may require multiple observable evidence angles.
Task Model: different tasks elicit different evidence.
Assembly Model: task sets should represent breadth and diversity, not just count.
```

- [x] **Step 3: Record the schema**

Document `unitEvidenceAngles[]`, `angleId`, `angleType`, and required angle coverage.

### Task 7: Run Tests And Quality Experiment

**Files:**
- Generated: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs/*.json`
- Generated: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/reports/*.html`
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

- [x] **Step 1: Run focused tests**

Run:

```bash
node --test \
  experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js \
  experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js \
  experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js \
  experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js
```

Expected: PASS.

- [x] **Step 2: Run full backend check**

Run:

```bash
npm --prefix experiments/shibei-v2/backend run check
```

Expected: PASS.

- [x] **Step 3: Run same golden article**

Run with the existing quality runner and the same article slug:

```bash
V2_SOURCE_MAP_MODE=deterministic \
V2_GENERATION_MAX_UNITS=6 \
V2_GENERATION_UNIT_CONCURRENCY=3 \
QUALITY_EXPERIMENT_SLUG=_WY2GXs-iynGePgdsYLi0A \
QUALITY_EXPERIMENT_LABEL=v2-evidence-angle-coverage-max6 \
QUALITY_ARTICLE_URL=https://mp.weixin.qq.com/s/_WY2GXs-iynGePgdsYLi0A \
npm --prefix experiments/shibei-v2/backend run quality:v2
```

Expected: completed run with HTML report showing Angle Coverage Matrix.

### Task 8: Execution Notes And Outcome

- [x] **Step 1: Record implementation outcome**

Implemented `unitEvidenceAngles[]` and `angleIds[]` across ECD schemas, prompt text, validation, normalization, deterministic ECD-to-practice adaptation, and HTML quality reports.

- [x] **Step 2: Record issues found during testing**

The first runs exposed several structural and provider-stability issues:

```text
unitPracticePlan model stage could drift from ECD selected tasks
unit-scoped ECD source anchors could drift into block ids
draft stages could invent extra question ids
matchingDraft could run out of output budget
DeepSeek structured output is unstable under max6 + concurrency3
```

Each issue was handled structurally rather than patched in a single report:

```text
unitPracticePlan is now a deterministic adapter
unit-scoped source anchors are normalized back to planned unit anchors
draft questions are normalized to planned question ids and counts
matchingDraft output budget is higher
transient structured JSON failures have a narrow retry path
```

- [x] **Step 3: Record final quality run**

Final completed report:

```text
reports/20260620-222608-v2-evidence-angle-coverage-max6-deterministic-source-final-serial.html
```

Result:

```text
6 units
12 questions
11 multiple choice
1 matching
127 source blocks
0 structural issues
2 diagnostic issues
```

The serial run completed successfully. The concurrent run remains unstable for this provider, so future DeepSeek quality experiments should use `V2_GENERATION_UNIT_CONCURRENCY=1` until provider stability is improved.

### Task 8: Commit The Iteration

**Files:**
- All modified files from Tasks 1-7.

- [x] **Step 1: Review status**

Run:

```bash
git status --short
```

Expected: only V2 backend/docs/quality artifacts and this plan.

- [x] **Step 2: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-06-20-evidence-angle-coverage-plan.md experiments/shibei-v2
git commit -m "feat(v2): add evidence angle coverage planning"
```

Expected: new commit on `codex/shibei-v2-isolated-build`.

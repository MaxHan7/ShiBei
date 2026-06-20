# Coverage-First ECD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the V2 ECD prompt pipeline so each unit first decomposes into assessable sub-objectives, then selects task types to cover required evidence, avoiding both under-coverage and fixed question counts.

**Architecture:** Keep the current visible SwiftUI review path contract stable. Add internal ECD coverage fields inside `ecdPlanning`: `unitSubObjectives[]`, richer `unitEvidenceNeeds[]`, and coverage-aware `unitAssemblyPlan[]`. `unitPracticePlan` remains a temporary adapter that consumes selected tasks; it must not independently choose task types.

**Tech Stack:** Node.js ESM backend, JSON schema prompt contracts, built-in `node:test`, V2 quality runner, DeepSeek quality experiments, HTML quality reports.

---

## Current Baseline

Current committed checkpoint:

```bash
git show --stat --oneline -1
```

Expected latest commit:

```text
109ba3a feat(v2): protect knowledge object boundaries
```

Known result:

- `20260620-183009-v2-knowledge-object-boundary-max6-rerun` completed.
- It restored DMC as an independent unit.
- It produced only 9 questions for 6 units.
- Root cause: the ECD chain now protects unit boundaries, but does not yet require unit-internal evidence coverage.

## File Map

- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/ecdPlanning.js`
  - Add `unitSubObjectives[]`.
  - Add `importance` / `coverageRequirement` to evidence needs.
  - Add assembly coverage validation.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
  - Rewrite `ecdPlanning` instructions to follow coverage-first order.
  - Keep task type selection after sub-objective/evidence decomposition.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`
  - Assert prompt asks for assessable sub-objectives, coverage matrix, and no fixed question count.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`
  - Add validator tests for required sub-objective and evidence coverage.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
  - Preserve new ECD fields in `generationMeta.ecdPlanning`.
  - No visible contract changes expected.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`
  - Add regression that multiple required evidence needs produce multiple selected tasks when one task cannot cover all of them.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js`
  - Render coverage matrix in HTML report.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js`
  - Assert HTML includes coverage information.
- Modify: `experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md`
  - Document sub-objectives and coverage-first assembly.
- Modify: `experiments/shibei-v2/docs/v2-backend-field-contract-zh.md`
  - Document internal-only coverage fields.
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`
  - Record the next quality experiment and compare with prior runs.

---

### Task 1: Extend ECD Schema With Unit Sub-Objectives

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/ecdPlanning.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`

- [ ] **Step 1: Add a failing schema-name assertion**

In `promptSchemas.test.js`, update the schema exposure test so it expects a `unitSubObjectives` top-level field:

```js
test("ECD planning schema exposes nested fields needed by the shadow stage contract", () => {
  const schema = ECD_PLANNING_OUTPUT_SCHEMA;
  assert.equal(schema.name, "shibei_v2_ecd_planning");
  assert.equal(schema.properties.knowledgeModel.type, "object");
  assert.equal(schema.properties.unitSubObjectives.type, "array");
  assert.equal(schema.properties.unitLearningClaims.type, "array");
  assert.equal(schema.properties.unitEvidenceNeeds.type, "array");
  assert.equal(schema.properties.unitTaskPlan.type, "array");
  assert.equal(schema.properties.unitAssemblyPlan.type, "array");
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
node --test experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js
```

Expected:

```text
FAIL ... Cannot read properties of undefined ... unitSubObjectives
```

- [ ] **Step 3: Add sub-objective schema constants**

In `ecdPlanning.js`, add:

```js
export const SUB_OBJECTIVE_IMPORTANCE = [
  "required",
  "supporting",
  "optional"
];

export const SUB_OBJECTIVE_TYPES = [
  "definition",
  "boundary",
  "layer",
  "element_classification",
  "mechanism",
  "process_step",
  "scenario_application",
  "misconception",
  "example_case"
];
```

Add a top-level `unitSubObjectives` schema:

```js
unitSubObjectives: {
  type: "array",
  items: {
    type: "object",
    required: [
      "unitId",
      "subObjectiveId",
      "title",
      "type",
      "importance",
      "learningTarget",
      "sourceAnchorId"
    ],
    properties: {
      unitId: { type: "string" },
      subObjectiveId: { type: "string" },
      title: { type: "string" },
      type: { enum: SUB_OBJECTIVE_TYPES },
      importance: { enum: SUB_OBJECTIVE_IMPORTANCE },
      learningTarget: { type: "string" },
      sourceAnchorId: { type: "string" }
    }
  }
}
```

Update `ECD_PLANNING_OUTPUT_SCHEMA.required`:

```js
required: [
  "articleUnderstanding",
  "knowledgeModel",
  "unitSubObjectives",
  "unitLearningClaims",
  "unitEvidenceNeeds",
  "unitTaskPlan",
  "unitAssemblyPlan"
]
```

- [ ] **Step 4: Add sub-objective validation**

In `ecdPlanning.js`, implement:

```js
function validateSubObjectives(items, { unitIds, sourceAnchorIds, errors }) {
  const subObjectiveIds = new Set();

  if (!Array.isArray(items) || items.length === 0) {
    errors.push("ecdPlanning.unitSubObjectives must be a non-empty array");
    return subObjectiveIds;
  }

  const seen = new Set();
  items.forEach((item, index) => {
    const path = `ecdPlanning.unitSubObjectives[${index}]`;
    if (!isPlainObject(item)) {
      errors.push(`${path} must be an object`);
      return;
    }

    requireFields(
      item,
      ["unitId", "subObjectiveId", "title", "type", "importance", "learningTarget", "sourceAnchorId"],
      path,
      errors
    );

    if (isNonEmptyString(item.subObjectiveId)) {
      if (seen.has(item.subObjectiveId)) {
        errors.push(`ecdPlanning.unitSubObjectives duplicate id: ${item.subObjectiveId}`);
      }
      seen.add(item.subObjectiveId);
      subObjectiveIds.add(item.subObjectiveId);
    }

    if (isNonEmptyString(item.unitId) && !unitIds.has(item.unitId)) {
      errors.push(`${path}.unitId must reference a known unit`);
    }
    if (isNonEmptyString(item.sourceAnchorId) && !sourceAnchorIds.has(item.sourceAnchorId)) {
      errors.push(`${path}.sourceAnchorId must reference a known source anchor`);
    }
    if (isNonEmptyString(item.type) && !SUB_OBJECTIVE_TYPES.includes(item.type)) {
      errors.push(`${path}.type must be one of ${SUB_OBJECTIVE_TYPES.join(", ")}`);
    }
    if (isNonEmptyString(item.importance) && !SUB_OBJECTIVE_IMPORTANCE.includes(item.importance)) {
      errors.push(`${path}.importance must be one of ${SUB_OBJECTIVE_IMPORTANCE.join(", ")}`);
    }
  });

  return subObjectiveIds;
}
```

Call it inside `validateEcdPlanningOutput` before learning claims:

```js
const subObjectiveIds = validateSubObjectives(output.unitSubObjectives, {
  unitIds,
  sourceAnchorIds,
  errors
});
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
node --test experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js
```

Expected: existing fixture failures because fixtures do not include `unitSubObjectives` yet.

---

### Task 2: Link Claims And Evidence To Sub-Objectives

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/ecdPlanning.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`

- [ ] **Step 1: Update schema for learning claims**

Add `subObjectiveId` to `unitLearningClaims` required fields:

```js
required: ["unitId", "subObjectiveId", "claimId", "claimType", "learningClaim", "sourceAnchorId"]
```

Add property:

```js
subObjectiveId: { type: "string" }
```

- [ ] **Step 2: Update schema for evidence needs**

Add fields:

```js
required: [
  "unitId",
  "evidenceId",
  "claimId",
  "subObjectiveId",
  "evidenceType",
  "coverageRequirement",
  "evidenceNeed",
  "observableResponse",
  "sourceAnchorId"
]
```

Add property:

```js
subObjectiveId: { type: "string" },
coverageRequirement: { enum: ["required", "supporting", "optional"] }
```

- [ ] **Step 3: Update claim validation**

In `validateLearningClaims`, accept `subObjectiveIds`:

```js
function validateLearningClaims(items, { unitIds, sourceAnchorIds, subObjectiveIds, errors }) {
```

Require and validate:

```js
requireFields(item, ["unitId", "subObjectiveId", "claimId", "claimType", "learningClaim", "sourceAnchorId"], path, errors);

if (isNonEmptyString(item.subObjectiveId) && !subObjectiveIds.has(item.subObjectiveId)) {
  errors.push(`${path}.subObjectiveId must reference a known sub-objective`);
}
```

- [ ] **Step 4: Update evidence validation**

In `validateEvidenceNeeds`, accept `subObjectiveIds`:

```js
function validateEvidenceNeeds(items, { unitIds, sourceAnchorIds, claimIds, subObjectiveIds, errors }) {
```

Require and validate:

```js
requireFields(
  item,
  ["unitId", "evidenceId", "claimId", "subObjectiveId", "evidenceType", "coverageRequirement", "evidenceNeed", "observableResponse", "sourceAnchorId"],
  path,
  errors
);

if (isNonEmptyString(item.subObjectiveId) && !subObjectiveIds.has(item.subObjectiveId)) {
  errors.push(`${path}.subObjectiveId must reference a known sub-objective`);
}

if (
  isNonEmptyString(item.coverageRequirement) &&
  !SUB_OBJECTIVE_IMPORTANCE.includes(item.coverageRequirement)
) {
  errors.push(`${path}.coverageRequirement must be one of ${SUB_OBJECTIVE_IMPORTANCE.join(", ")}`);
}
```

- [ ] **Step 5: Update `ecdPlanningFixture` in tests**

In `promptSchemas.test.js`, update the fixture with:

```js
unitSubObjectives: [
  {
    unitId: "unit-01",
    subObjectiveId: "sub-01",
    title: "Hook 的核心定义",
    type: "definition",
    importance: "required",
    learningTarget: "理解 Hook 是关键动作前后的流程控制器。",
    sourceAnchorId: "anchor-unit-01"
  },
  {
    unitId: "unit-01",
    subObjectiveId: "sub-02",
    title: "Hook 与 Prompt 的边界",
    type: "boundary",
    importance: "required",
    learningTarget: "区分 Hook 的流程职责和 Prompt 的上下文职责。",
    sourceAnchorId: "anchor-unit-01"
  }
]
```

Add `subObjectiveId` and `coverageRequirement` to existing claims/evidence:

```js
subObjectiveId: "sub-01",
coverageRequirement: "required",
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
node --test experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js
```

Expected: PASS.

---

### Task 3: Enforce Required Evidence Coverage In Assembly

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/ecdPlanning.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`

- [ ] **Step 1: Add failing test for uncovered required evidence**

Add:

```js
test("rejects ECD assembly that leaves required evidence uncovered", () => {
  const fixture = ecdPlanningFixture();
  fixture.unitAssemblyPlan[0].selectedTasks = fixture.unitAssemblyPlan[0].selectedTasks.filter(
    (task) => !task.evidenceIds.includes("ev-002")
  );
  fixture.unitAssemblyPlan[0].skippedEvidence = [];

  const result = validateEcdPlanningOutput(fixture, {
    unitIds: new Set(["unit-01"]),
    sourceAnchorIds: new Set(["anchor-unit-01"])
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /required evidence.*ev-002.*must be covered/);
});
```

- [ ] **Step 2: Add task-plan evidence validation rule**

Inside `validateAssemblyPlan`, build selected evidence ids:

```js
const selectedEvidenceIds = new Set();
assembly.selectedTasks.forEach((task) => {
  for (const evidenceId of task.evidenceIds || []) selectedEvidenceIds.add(evidenceId);
});
```

Then check required evidence for this unit:

```js
const requiredEvidenceForUnit = evidenceItems.filter(
  (evidence) =>
    evidence.unitId === assembly.unitId &&
    evidence.coverageRequirement === "required"
);

requiredEvidenceForUnit.forEach((evidence) => {
  const skipped = assembly.skippedEvidence?.some((item) => item.evidenceId === evidence.evidenceId);
  if (!selectedEvidenceIds.has(evidence.evidenceId) && !skipped) {
    errors.push(`${path}.required evidence ${evidence.evidenceId} must be covered by selectedTasks or explicitly skipped`);
  }
});
```

This requires changing `validateAssemblyPlan` signature to receive `evidenceItems`, not only `evidenceIds`:

```js
validateAssemblyPlan(output.unitAssemblyPlan, {
  unitIds,
  evidenceIds,
  evidenceItems: output.unitEvidenceNeeds,
  taskPlanIds,
  errors
});
```

- [ ] **Step 3: Require explicit skip reason**

Keep skips allowed, but only if they reference known evidence and include a reason. Existing schema already requires `reason`; ensure validation still checks reference.

- [ ] **Step 4: Run focused tests**

Run:

```bash
node --test experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js
```

Expected: PASS.

---

### Task 4: Rewrite ECD Planning Prompt As Coverage-First

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`

- [ ] **Step 1: Add failing prompt assertions**

In `buildV2PromptMessages.test.js`, update the `ecdPlanning` test:

```js
assert.match(messages.user, /先拆 unitSubObjectives/);
assert.match(messages.user, /每个 required sub-objective/);
assert.match(messages.user, /coverage matrix/);
assert.match(messages.user, /先决定 evidence，再选择 task affordance/);
assert.match(messages.user, /题目数量不写死，但 required evidence 必须覆盖/);
```

- [ ] **Step 2: Update prompt text**

In `buildEcdPlanningMessages`, replace the current core-principles block with:

```js
"核心顺序：",
"1. 先做 Domain / Unit 内部拆解：为每个 unit 输出 unitSubObjectives。",
"2. 每个 required sub-objective 至少产生一个 learningClaim。",
"3. 每个 required learningClaim 至少产生一个 evidenceNeed。",
"4. 先决定 evidence，再选择 task affordance；题型服务于 evidence，不反过来。",
"5. unitTaskPlan 为每个可收集 evidence 的方式提出候选任务。",
"6. unitAssemblyPlan 从候选任务中选择一组任务，形成 coverage matrix。",
"7. 题目数量不写死，但 required evidence 必须覆盖；如果一道题自然覆盖多个 evidence，可以合并；如果不能自然覆盖，必须拆成多道题。",
```

Add ECD mapping:

```js
"题型映射提示：",
"- definition / select_core_claim 通常适合 light_understanding multiple_choice。",
"- boundary / misconception 通常适合 boundary_check 或 misconception_check multiple_choice。",
"- layer / element_classification / type_set 通常适合 matching，尤其是 DMC 这种层级 -> 职责/元素归属。",
"- scenario_application 通常适合 scenario_application multiple_choice。",
"- process_step / signal_action 通常适合 step_purpose_matching、signal_action_matching 或情境选择题。",
```

Add coverage rules:

```js
"覆盖规则：",
"- unitSubObjectives.importance 为 required 的小目标不能消失。",
"- unitEvidenceNeeds.coverageRequirement 为 required 的证据，必须被 selectedTasks 覆盖，除非 skippedEvidence 明确说明为什么本轮不考。",
"- selectedTasks[].evidenceIds 可以包含多个 evidenceId，但 assemblyReason 必须解释为什么一题能真实观察这些 evidence。",
"- 不要为了少题而把不相关 evidence 合并成一个题。",
"- 不要为了多题而重复考同一个 observableResponse。",
```

- [ ] **Step 3: Run prompt tests**

Run:

```bash
node --test experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js
```

Expected: PASS.

---

### Task 5: Update Generation Tests For Coverage-First ECD

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`

- [ ] **Step 1: Update `ecdPlanningFixture`**

Add `unitSubObjectives`:

```js
unitSubObjectives: [
  {
    unitId,
    subObjectiveId: "sub-001",
    title: "Hook 的核心作用",
    type: "definition",
    importance: "required",
    learningTarget: "理解 Hook 是关键动作前后的固定流程约束。",
    sourceAnchorId
  },
  {
    unitId,
    subObjectiveId: "sub-002",
    title: "Hook 工作流的角色边界",
    type: "boundary",
    importance: "required",
    learningTarget: "区分 Prompt、Hook、CI 和规则文档的职责。",
    sourceAnchorId
  }
]
```

Add `subObjectiveId` and `coverageRequirement` to fixture claims/evidence:

```js
subObjectiveId: "sub-001",
coverageRequirement: "required",
```

- [ ] **Step 2: Add a regression test for required coverage**

Add:

```js
test("coverage-first ECD keeps separate selected tasks for distinct required evidence", async () => {
  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    promptCaller: async (stage, payload) => happyPathPromptCaller(stage, payload),
    now: "2026-06-19T00:00:00.000Z"
  });

  const selectedTasks = reviewPath.generationMeta.ecdPlanning.unitAssemblyPlan[0].selectedTasks;
  const selectedEvidence = new Set(selectedTasks.flatMap((task) => task.evidenceIds));

  assert.equal(selectedEvidence.has("ev-001"), true);
  assert.equal(selectedEvidence.has("ev-002"), true);
  assert.equal(reviewPath.generationMeta.unitPracticePlans[0].questionPlans.length, 2);
});
```

- [ ] **Step 3: Run generation tests**

Run:

```bash
node --test experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js
```

Expected: PASS.

---

### Task 6: Render Coverage Matrix In HTML Quality Report

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js`

- [ ] **Step 1: Add failing HTML test**

In `v2QualityExperiment.test.js`, extend the ECD fixture with:

```js
unitSubObjectives: [
  {
    unitId: "unit-1",
    subObjectiveId: "sub-1",
    title: "DMC 三层职责",
    type: "layer",
    importance: "required",
    learningTarget: "区分 DMC 三层的职责。",
    sourceAnchorId: "anchor-1"
  }
]
```

Then assert:

```js
assert.match(html, /Coverage Matrix/);
assert.match(html, /DMC 三层职责/);
assert.match(html, /required/);
assert.match(html, /covered/);
```

- [ ] **Step 2: Add coverage helper**

In `v2QualityExperiment.js`, add:

```js
function renderCoverageMatrix(report, unit) {
  const ecd = report.ecdPlanning || report.chapter?.generationMeta?.ecdPlanning || {};
  const subObjectives = (ecd.unitSubObjectives || []).filter((item) => item.unitId === unit.id);
  const evidence = (ecd.unitEvidenceNeeds || []).filter((item) => item.unitId === unit.id);
  const assembly = (ecd.unitAssemblyPlan || []).find((item) => item.unitId === unit.id);
  const selectedEvidenceIds = new Set((assembly?.selectedTasks || []).flatMap((task) => task.evidenceIds || []));

  if (subObjectives.length === 0 && evidence.length === 0) return "";

  return `
    <section class="panel">
      <h4>Coverage Matrix</h4>
      <table>
        <thead>
          <tr><th>Sub-objective</th><th>Importance</th><th>Evidence</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${evidence.map((item) => {
            const sub = subObjectives.find((objective) => objective.subObjectiveId === item.subObjectiveId);
            const status = selectedEvidenceIds.has(item.evidenceId) ? "covered" : "not covered";
            return `<tr>
              <td>${escapeHtml(sub?.title || item.subObjectiveId || "")}</td>
              <td>${escapeHtml(item.coverageRequirement || sub?.importance || "")}</td>
              <td>${escapeHtml(`${item.evidenceId}: ${item.evidenceNeed}`)}</td>
              <td>${escapeHtml(status)}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </section>`;
}
```

Call this inside the per-unit HTML section, immediately after ECD task plan rendering.

- [ ] **Step 3: Run report tests**

Run:

```bash
node --test experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js
```

Expected: PASS.

---

### Task 7: Documentation Update

**Files:**
- Modify: `experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md`
- Modify: `experiments/shibei-v2/docs/v2-backend-field-contract-zh.md`
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

- [ ] **Step 1: Update ECD schema draft**

Add under Domain Modeling:

```md
### Unit 内部可考小目标：`unitSubObjectives[]`

ECD 对应：Domain Model -> Learner Model bridge。

作用：把一个 visible unit 内部拆成可追踪的小学习目标。它不是题目，也不是前端卡片文字，而是后续 learningClaim / evidenceNeed 的来源。

规则：

- `required` 小目标必须进入 learning/evidence 链路。
- `supporting` 小目标可以被合并进其他题。
- `optional` 小目标只在题目负担合理时覆盖。
- 题目数量不写死，但 required evidence 必须覆盖。
```

- [ ] **Step 2: Update backend field contract**

Add an internal metadata section:

```md
### `generationMeta.ecdPlanning.unitSubObjectives[]`

- **用途**：记录每个 unit 内部可以被考察的小知识点。
- **ECD 对应**：Domain Model / Learner Model bridge。
- **前端使用位置**：不展示。
- **注意事项**：它用于防止一个大 unit 只出一道题而漏掉内部关键目标。
```

Add:

```md
### `generationMeta.ecdPlanning.unitEvidenceNeeds[].coverageRequirement`

- **用途**：区分 required / supporting / optional evidence。
- **注意事项**：required evidence 必须被 selectedTasks 覆盖或明确 skip。
```

- [ ] **Step 3: Update quality README planned experiment**

Add:

```md
### Next planned run: coverage-first ECD

Hypothesis: Adding unitSubObjectives and required evidence coverage will keep DMC independent while increasing coverage for multi-part units without hard-coding question counts.

Pass criteria:

- DMC remains a standalone unit.
- Required evidence coverage is visible in the HTML report.
- Units with multiple required sub-objectives receive multiple selectedTasks unless one task clearly covers multiple evidence needs.
- Question count increases because coverage improves, not because of a fixed target.
```

---

### Task 8: Full Validation

**Files:**
- All modified files above.

- [ ] **Step 1: Run focused tests**

Run:

```bash
node --test \
  experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js \
  experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js \
  experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js \
  experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js
```

Expected: PASS.

- [ ] **Step 2: Run full backend check**

Run:

```bash
npm --prefix experiments/shibei-v2/backend run check
```

Expected: PASS.

---

### Task 9: Same-Article Quality Run And Comparison

**Files:**
- Generated: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs/*.json`
- Generated: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/reports/*.html`
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

- [ ] **Step 1: Run quality experiment**

Run with the same article and same bounded unit config:

```bash
export AI_PROVIDER=deepseek
export DEEPSEEK_API_KEY="<local-secret>"
export QUALITY_ARTICLE_URL="https://mp.weixin.qq.com/s/_WY2GXs-iynGePgdsYLi0A"
export QUALITY_EXPERIMENT_SLUG="_WY2GXs-iynGePgdsYLi0A"
export QUALITY_EXPERIMENT_LABEL="v2-coverage-first-ecd-max6"
export V2_GENERATION_MAX_UNITS=6
export V2_GENERATION_UNIT_CONCURRENCY=3
npm --prefix experiments/shibei-v2/backend run quality:v2
```

Expected:

```json
{
  "status": "completed",
  "metrics": {
    "unitCount": 6
  }
}
```

- [ ] **Step 2: Compare runs**

Compare:

```text
20260620-135541-v2-ecd-shadow-max6-concurrency3-anchor-normalized
20260620-175013-v2-ecd-driven-planning-max6-schema-items
20260620-183009-v2-knowledge-object-boundary-max6-rerun
new v2-coverage-first-ecd-max6
```

Use this command:

```bash
node --input-type=module <<'NODE'
import { readFile } from "node:fs/promises";
const base = "experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs";
const files = [
  "20260620-135541-v2-ecd-shadow-max6-concurrency3-anchor-normalized.json",
  "20260620-175013-v2-ecd-driven-planning-max6-schema-items.json",
  "20260620-183009-v2-knowledge-object-boundary-max6-rerun.json"
];
const latest = process.argv[1];
if (latest) files.push(latest);
for (const file of files) {
  const report = JSON.parse(await readFile(`${base}/${file}`, "utf8"));
  const chapter = report.chapter;
  const ecd = chapter?.generationMeta?.ecdPlanning || {};
  console.log("\\n", file);
  console.log("metrics", report.metrics);
  console.log("units", chapter.units.map((unit) => `${unit.title}(${unit.questions.length})`).join(" | "));
  console.log(
    "coverage",
    "subObjectives=", (ecd.unitSubObjectives || []).length,
    "evidence=", (ecd.unitEvidenceNeeds || []).length,
    "selected=", (ecd.unitAssemblyPlan || []).reduce((sum, item) => sum + (item.selectedTasks?.length || 0), 0)
  );
}
NODE <latest-json-filename>
```

- [ ] **Step 3: Update README conclusion**

Record:

```md
The coverage-first run should be judged by coverage, not raw question count. A successful run keeps DMC as a standalone unit, increases selectedTasks where required evidence was previously collapsed, and renders a coverage matrix in the HTML report.
```

---

### Task 10: Commit Coverage-First Iteration

**Files:**
- All modified code, docs, and generated quality artifacts.

- [ ] **Step 1: Check status**

Run:

```bash
git status --short
```

Expected: only V2 backend/docs and quality artifacts.

- [ ] **Step 2: Commit**

Run:

```bash
git add \
  experiments/shibei-v2/backend/src/v2/generation/prompts/ecdPlanning.js \
  experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js \
  experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js \
  experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js \
  experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js \
  experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js \
  experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js \
  experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js \
  experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md \
  experiments/shibei-v2/docs/v2-backend-field-contract-zh.md \
  experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A \
  docs/superpowers/plans/2026-06-20-coverage-first-ecd-plan.md
git commit -m "feat(v2): add coverage-first ECD planning"
```

Expected: commit succeeds.

---

## Self-Review

- Spec coverage: This plan handles the user's requirement to preserve the previous run, avoid hard-coded question counts, use ECD to cover what should be assessed, run a same-article test, and compare with prior runs.
- Placeholder scan: No TBD / TODO placeholders remain. Every implementation step includes file paths, code snippets, commands, and expected results.
- Type consistency: `unitSubObjectives[].subObjectiveId`, `unitLearningClaims[].subObjectiveId`, `unitEvidenceNeeds[].subObjectiveId`, and `coverageRequirement` are consistently named across schema, prompt, tests, and report.

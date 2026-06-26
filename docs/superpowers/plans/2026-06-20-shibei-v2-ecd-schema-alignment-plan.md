# Shibei V2 ECD Schema Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first ECD-aligned internal schema layer for Shibei V2 generation without changing the SwiftUI frontend contract or rewriting the prompt chain in the same step.

**Architecture:** This plan introduces a new `ecdPlanning` schema module that validates the internal ECD fields documented in `v2-ecd-field-schema-draft-zh.md`: article understanding, knowledge model, learning claims, evidence needs, task plan, and assembly plan. It also relaxes the legacy `unitPracticePlan` validator so existing transitional stages no longer encode a fixed two-question rule. Runtime orchestration changes are intentionally deferred until the schema has tests.

**Tech Stack:** Node.js ESM, `node:test`, existing V2 backend prompt schema validators, Markdown docs.

---

## Files

- Create: `experiments/shibei-v2/backend/src/v2/generation/prompts/ecdPlanning.js`
  - Owns ECD enum constants and `validateEcdPlanningOutput`.
  - Does not call the model and does not change runtime orchestration.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`
  - Adds schema export and validator tests for ECD planning.
  - Adds regression coverage that ECD assembly allows variable selected task counts.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/unitPracticePlan.js`
  - Keeps transitional legacy schema but removes the hard `questionPlans.length === 2` validation.
  - Extends purpose/relation enums only as needed for ECD-compatible transitional data.
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`
  - Updates the old `unitPracticePlan` test name and fixture to verify variable question plan counts.
- Modify: `experiments/shibei-v2/docs/v2-backend-field-contract-zh.md`
  - Already aligned in the preparatory doc pass; review after code changes for drift.
- Optional Modify: `experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md`
  - Only update if implementation discovers a field naming mismatch.

## Task 1: Add ECD Planning Schema Tests

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`

- [ ] **Step 1: Add imports for the new schema**

Add this import near the other prompt schema imports:

```js
import {
  ECD_PLANNING_OUTPUT_SCHEMA,
  validateEcdPlanningOutput
} from "./ecdPlanning.js";
```

- [ ] **Step 2: Add the stable schema name assertion**

In `exports stable prompt schema names for the V2 generation pipeline`, add:

```js
assert.equal(ECD_PLANNING_OUTPUT_SCHEMA.name, "shibei_v2_ecd_planning");
```

- [ ] **Step 3: Add a valid DMC ECD planning test**

Add this test after the review path plan tests:

```js
test("validates ECD planning output with claim evidence task and assembly links", () => {
  const result = validateEcdPlanningOutput(ecdPlanningFixture(), {
    unitIds: new Set(["unit-03"]),
    sourceAnchorIds: new Set(["anchor-unit-03"])
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});
```

- [ ] **Step 4: Add a variable task count test**

Add this test next to the valid ECD planning test:

```js
test("allows ECD assembly plans to select a variable number of tasks", () => {
  const fixture = ecdPlanningFixture();
  fixture.unitAssemblyPlan[0].selectedTasks.push({
    questionPlanId: "qp-03-2",
    taskPlanId: "tp-03-2",
    evidenceIds: ["ev-03-2"],
    taskAffordance: "multiple_choice",
    taskPurpose: "misconception_check",
    assemblyReason: "该题暴露把 DMC 理解成组件清单的常见误区。"
  });

  const result = validateEcdPlanningOutput(fixture, {
    unitIds: new Set(["unit-03"]),
    sourceAnchorIds: new Set(["anchor-unit-03"])
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});
```

- [ ] **Step 5: Add a broken reference test**

Add:

```js
test("rejects ECD planning output with broken claim evidence and task references", () => {
  const fixture = ecdPlanningFixture();
  fixture.unitEvidenceNeeds[0].claimId = "missing-claim";
  fixture.unitTaskPlan[0].evidenceIds = ["missing-evidence"];
  fixture.unitAssemblyPlan[0].selectedTasks[0].taskPlanId = "missing-task-plan";

  const result = validateEcdPlanningOutput(fixture, {
    unitIds: new Set(["unit-03"]),
    sourceAnchorIds: new Set(["anchor-unit-03"])
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /claimId must reference a unitLearningClaims item/);
  assert.match(result.errors.join("\n"), /evidenceIds\\[0\\] must reference a unitEvidenceNeeds item/);
  assert.match(result.errors.join("\n"), /taskPlanId must reference a unitTaskPlan item/);
});
```

- [ ] **Step 6: Add fixture helper**

Add this helper near the other fixtures:

```js
function ecdPlanningFixture() {
  return {
    articleUnderstanding: {
      coreThesis: "游戏化设计应从体验目标出发，而不是只堆可见组件。",
      articleStructure: [
        {
          id: "section-03",
          title: "DMC 模型",
          role: "core_argument",
          sourceAnchorIds: ["anchor-unit-03"]
        }
      ],
      reviewableSections: ["section-03"],
      nonReviewableSections: []
    },
    knowledgeModel: {
      units: [
        {
          unitId: "unit-03",
          title: "DMC 模型区分体验目标、行为机制和界面组件",
          nodeLabel: "DMC 三层模型",
          shortSummary: "DMC 把游戏化设计拆成目标、机制和组件三个层次。",
          detailSummary: "DMC 模型提醒设计者先明确用户体验目标，再设计参与机制，最后选择界面组件。",
          knowledgeShape: "layered_framework",
          sourceAnchorId: "anchor-unit-03"
        }
      ]
    },
    unitLearningClaims: [
      {
        unitId: "unit-03",
        claimId: "claim-03-1",
        claimType: "structure_understanding",
        learningClaim: "用户能区分 DMC 三层分别承担的设计作用。",
        sourceAnchorId: "anchor-unit-03"
      }
    ],
    unitEvidenceNeeds: [
      {
        unitId: "unit-03",
        evidenceId: "ev-03-1",
        claimId: "claim-03-1",
        evidenceType: "map_structure_relation",
        evidenceNeed: "用户能把动力层、机制层、组件层分别匹配到正确作用。",
        observableResponse: "完成层级与作用的连线匹配。",
        sourceAnchorId: "anchor-unit-03"
      },
      {
        unitId: "unit-03",
        evidenceId: "ev-03-2",
        claimId: "claim-03-1",
        evidenceType: "identify_misconception",
        evidenceNeed: "用户能识别把 DMC 理解成组件清单的误区。",
        observableResponse: "在选择题中排除只堆组件的错误理解。",
        sourceAnchorId: "anchor-unit-03"
      }
    ],
    unitTaskPlan: [
      {
        unitId: "unit-03",
        taskPlanId: "tp-03-1",
        evidenceIds: ["ev-03-1"],
        taskAffordance: "matching",
        taskPurpose: "layer_role_matching",
        whyThisTask: "DMC 是分层模型，连线题能直接观察用户是否理解层级和作用的对应关系。"
      },
      {
        unitId: "unit-03",
        taskPlanId: "tp-03-2",
        evidenceIds: ["ev-03-2"],
        taskAffordance: "multiple_choice",
        taskPurpose: "misconception_check",
        whyThisTask: "选择题适合暴露用户是否把游戏化误解成堆组件。"
      }
    ],
    unitAssemblyPlan: [
      {
        unitId: "unit-03",
        selectedTasks: [
          {
            questionPlanId: "qp-03-1",
            taskPlanId: "tp-03-1",
            evidenceIds: ["ev-03-1"],
            taskAffordance: "matching",
            taskPurpose: "layer_role_matching",
            assemblyReason: "该 task 直接覆盖 DMC 结构理解的核心 evidence，因此进入本 unit。"
          }
        ],
        skippedEvidence: []
      }
    ]
  };
}
```

- [ ] **Step 7: Run the test and confirm failure**

Run:

```bash
cd experiments/shibei-v2/backend && node --test src/v2/generation/prompts/promptSchemas.test.js
```

Expected: FAIL with module not found for `./ecdPlanning.js`.

## Task 2: Implement `ecdPlanning.js`

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/generation/prompts/ecdPlanning.js`

- [ ] **Step 1: Create enum constants and output schema**

Create the file with:

```js
import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  requireFields
} from "./schemaValidation.js";

export const ECD_PLANNING_PROMPT_SCHEMA_NAME = "shibei_v2_ecd_planning";

export const KNOWLEDGE_SHAPES = [
  "core_concept",
  "layered_framework",
  "process_steps",
  "type_set",
  "boundary_rule",
  "scenario_rule",
  "cause_effect",
  "comparison_pair",
  "signal_action",
  "role_boundary",
  "misconception"
];

export const CLAIM_TYPES = [
  "concept_understanding",
  "structure_understanding",
  "boundary_understanding",
  "process_understanding",
  "cause_effect_understanding",
  "scenario_transfer",
  "misconception_recognition",
  "source_grounded_understanding"
];

export const EVIDENCE_TYPES = [
  "select_core_claim",
  "distinguish_boundary",
  "map_structure_relation",
  "apply_to_scenario",
  "identify_misconception",
  "map_step_purpose",
  "map_signal_action",
  "ground_answer_in_source"
];

export const TASK_AFFORDANCES = [
  "multiple_choice",
  "matching",
  "future_sorting",
  "future_correction",
  "future_source_location"
];

export const TASK_PURPOSES = [
  "light_understanding",
  "boundary_check",
  "misconception_check",
  "scenario_application",
  "counterexample_check",
  "layer_role_matching",
  "type_feature_matching",
  "step_purpose_matching",
  "signal_action_matching",
  "role_responsibility_matching"
];

export const ECD_PLANNING_OUTPUT_SCHEMA = {
  name: ECD_PLANNING_PROMPT_SCHEMA_NAME,
  type: "object",
  required: [
    "articleUnderstanding",
    "knowledgeModel",
    "unitLearningClaims",
    "unitEvidenceNeeds",
    "unitTaskPlan",
    "unitAssemblyPlan"
  ],
  properties: {
    articleUnderstanding: { type: "object" },
    knowledgeModel: { type: "object" },
    unitLearningClaims: { type: "array" },
    unitEvidenceNeeds: { type: "array" },
    unitTaskPlan: { type: "array" },
    unitAssemblyPlan: { type: "array" }
  }
};
```

- [ ] **Step 2: Add validation entrypoint**

Append:

```js
export function validateEcdPlanningOutput(output, { unitIds = new Set(), sourceAnchorIds = new Set() } = {}) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["ecdPlanning output must be an object"]);
  }

  requireFields(
    output,
    [
      "articleUnderstanding",
      "knowledgeModel",
      "unitLearningClaims",
      "unitEvidenceNeeds",
      "unitTaskPlan",
      "unitAssemblyPlan"
    ],
    "ecdPlanning",
    errors
  );

  validateArticleUnderstanding(output.articleUnderstanding, errors);
  validateKnowledgeModel(output.knowledgeModel, { unitIds, sourceAnchorIds, errors });
  const claimIds = validateLearningClaims(output.unitLearningClaims, { unitIds, sourceAnchorIds, errors });
  const evidenceIds = validateEvidenceNeeds(output.unitEvidenceNeeds, { unitIds, sourceAnchorIds, claimIds, errors });
  const taskPlanIds = validateTaskPlan(output.unitTaskPlan, { unitIds, evidenceIds, errors });
  validateAssemblyPlan(output.unitAssemblyPlan, { unitIds, evidenceIds, taskPlanIds, errors });

  return createValidationResult(errors);
}
```

- [ ] **Step 3: Add helper validators**

Append:

```js
function validateArticleUnderstanding(value, errors) {
  if (!isPlainObject(value)) {
    errors.push("ecdPlanning.articleUnderstanding must be an object");
    return;
  }

  requireFields(value, ["coreThesis"], "ecdPlanning.articleUnderstanding", errors);

  if (!Array.isArray(value.articleStructure) || value.articleStructure.length === 0) {
    errors.push("ecdPlanning.articleUnderstanding.articleStructure must be a non-empty array");
  }

  if (!Array.isArray(value.reviewableSections)) {
    errors.push("ecdPlanning.articleUnderstanding.reviewableSections must be an array");
  }

  if (!Array.isArray(value.nonReviewableSections)) {
    errors.push("ecdPlanning.articleUnderstanding.nonReviewableSections must be an array");
  }
}

function validateKnowledgeModel(value, { unitIds, sourceAnchorIds, errors }) {
  if (!isPlainObject(value)) {
    errors.push("ecdPlanning.knowledgeModel must be an object");
    return;
  }
  if (!Array.isArray(value.units) || value.units.length === 0) {
    errors.push("ecdPlanning.knowledgeModel.units must be a non-empty array");
    return;
  }

  const seen = new Set();
  value.units.forEach((unit, index) => {
    const path = `ecdPlanning.knowledgeModel.units[${index}]`;
    if (!isPlainObject(unit)) {
      errors.push(`${path} must be an object`);
      return;
    }
    requireFields(
      unit,
      ["unitId", "title", "nodeLabel", "shortSummary", "detailSummary", "knowledgeShape", "sourceAnchorId"],
      path,
      errors
    );
    if (seen.has(unit.unitId)) errors.push(`${path}.unitId must be unique`);
    seen.add(unit.unitId);
    if (unitIds.size > 0 && !unitIds.has(unit.unitId)) errors.push(`${path}.unitId must reference a known unit`);
    if (isNonEmptyString(unit.knowledgeShape) && !KNOWLEDGE_SHAPES.includes(unit.knowledgeShape)) {
      errors.push(`${path}.knowledgeShape must be one of ${KNOWLEDGE_SHAPES.join(", ")}`);
    }
    if (sourceAnchorIds.size > 0 && !sourceAnchorIds.has(unit.sourceAnchorId)) {
      errors.push(`${path}.sourceAnchorId must reference a known source anchor`);
    }
  });
}

function validateLearningClaims(items, { unitIds, sourceAnchorIds, errors }) {
  const ids = new Set();
  if (!Array.isArray(items) || items.length === 0) {
    errors.push("ecdPlanning.unitLearningClaims must be a non-empty array");
    return ids;
  }

  items.forEach((claim, index) => {
    const path = `ecdPlanning.unitLearningClaims[${index}]`;
    if (!isPlainObject(claim)) {
      errors.push(`${path} must be an object`);
      return;
    }
    requireFields(claim, ["unitId", "claimId", "claimType", "learningClaim", "sourceAnchorId"], path, errors);
    if (ids.has(claim.claimId)) errors.push(`${path}.claimId must be unique`);
    ids.add(claim.claimId);
    if (unitIds.size > 0 && !unitIds.has(claim.unitId)) errors.push(`${path}.unitId must reference a known unit`);
    if (isNonEmptyString(claim.claimType) && !CLAIM_TYPES.includes(claim.claimType)) {
      errors.push(`${path}.claimType must be one of ${CLAIM_TYPES.join(", ")}`);
    }
    if (sourceAnchorIds.size > 0 && !sourceAnchorIds.has(claim.sourceAnchorId)) {
      errors.push(`${path}.sourceAnchorId must reference a known source anchor`);
    }
  });

  return ids;
}

function validateEvidenceNeeds(items, { unitIds, sourceAnchorIds, claimIds, errors }) {
  const ids = new Set();
  if (!Array.isArray(items) || items.length === 0) {
    errors.push("ecdPlanning.unitEvidenceNeeds must be a non-empty array");
    return ids;
  }

  items.forEach((evidence, index) => {
    const path = `ecdPlanning.unitEvidenceNeeds[${index}]`;
    if (!isPlainObject(evidence)) {
      errors.push(`${path} must be an object`);
      return;
    }
    requireFields(
      evidence,
      ["unitId", "evidenceId", "claimId", "evidenceType", "evidenceNeed", "observableResponse", "sourceAnchorId"],
      path,
      errors
    );
    if (ids.has(evidence.evidenceId)) errors.push(`${path}.evidenceId must be unique`);
    ids.add(evidence.evidenceId);
    if (unitIds.size > 0 && !unitIds.has(evidence.unitId)) errors.push(`${path}.unitId must reference a known unit`);
    if (isNonEmptyString(evidence.claimId) && !claimIds.has(evidence.claimId)) {
      errors.push(`${path}.claimId must reference a unitLearningClaims item`);
    }
    if (isNonEmptyString(evidence.evidenceType) && !EVIDENCE_TYPES.includes(evidence.evidenceType)) {
      errors.push(`${path}.evidenceType must be one of ${EVIDENCE_TYPES.join(", ")}`);
    }
    if (sourceAnchorIds.size > 0 && !sourceAnchorIds.has(evidence.sourceAnchorId)) {
      errors.push(`${path}.sourceAnchorId must reference a known source anchor`);
    }
  });

  return ids;
}

function validateTaskPlan(items, { unitIds, evidenceIds, errors }) {
  const ids = new Set();
  if (!Array.isArray(items) || items.length === 0) {
    errors.push("ecdPlanning.unitTaskPlan must be a non-empty array");
    return ids;
  }

  items.forEach((task, index) => {
    const path = `ecdPlanning.unitTaskPlan[${index}]`;
    if (!isPlainObject(task)) {
      errors.push(`${path} must be an object`);
      return;
    }
    requireFields(task, ["unitId", "taskPlanId", "taskAffordance", "taskPurpose", "whyThisTask"], path, errors);
    if (ids.has(task.taskPlanId)) errors.push(`${path}.taskPlanId must be unique`);
    ids.add(task.taskPlanId);
    if (unitIds.size > 0 && !unitIds.has(task.unitId)) errors.push(`${path}.unitId must reference a known unit`);
    if (!Array.isArray(task.evidenceIds) || task.evidenceIds.length === 0) {
      errors.push(`${path}.evidenceIds must be a non-empty array`);
    } else {
      task.evidenceIds.forEach((evidenceId, evidenceIndex) => {
        if (!evidenceIds.has(evidenceId)) {
          errors.push(`${path}.evidenceIds[${evidenceIndex}] must reference a unitEvidenceNeeds item`);
        }
      });
    }
    if (isNonEmptyString(task.taskAffordance) && !TASK_AFFORDANCES.includes(task.taskAffordance)) {
      errors.push(`${path}.taskAffordance must be one of ${TASK_AFFORDANCES.join(", ")}`);
    }
    if (isNonEmptyString(task.taskPurpose) && !TASK_PURPOSES.includes(task.taskPurpose)) {
      errors.push(`${path}.taskPurpose must be one of ${TASK_PURPOSES.join(", ")}`);
    }
  });

  return ids;
}

function validateAssemblyPlan(items, { unitIds, evidenceIds, taskPlanIds, errors }) {
  if (!Array.isArray(items) || items.length === 0) {
    errors.push("ecdPlanning.unitAssemblyPlan must be a non-empty array");
    return;
  }

  items.forEach((assembly, index) => {
    const path = `ecdPlanning.unitAssemblyPlan[${index}]`;
    if (!isPlainObject(assembly)) {
      errors.push(`${path} must be an object`);
      return;
    }
    requireFields(assembly, ["unitId"], path, errors);
    if (unitIds.size > 0 && !unitIds.has(assembly.unitId)) errors.push(`${path}.unitId must reference a known unit`);
    if (!Array.isArray(assembly.selectedTasks)) {
      errors.push(`${path}.selectedTasks must be an array`);
    } else {
      assembly.selectedTasks.forEach((task, taskIndex) => {
        validateSelectedTask(task, `${path}.selectedTasks[${taskIndex}]`, { evidenceIds, taskPlanIds, errors });
      });
    }
    if (!Array.isArray(assembly.skippedEvidence)) {
      errors.push(`${path}.skippedEvidence must be an array`);
    }
  });
}

function validateSelectedTask(task, path, { evidenceIds, taskPlanIds, errors }) {
  if (!isPlainObject(task)) {
    errors.push(`${path} must be an object`);
    return;
  }

  requireFields(task, ["questionPlanId", "taskPlanId", "taskAffordance", "taskPurpose", "assemblyReason"], path, errors);

  if (isNonEmptyString(task.taskPlanId) && !taskPlanIds.has(task.taskPlanId)) {
    errors.push(`${path}.taskPlanId must reference a unitTaskPlan item`);
  }
  if (!Array.isArray(task.evidenceIds) || task.evidenceIds.length === 0) {
    errors.push(`${path}.evidenceIds must be a non-empty array`);
  } else {
    task.evidenceIds.forEach((evidenceId, evidenceIndex) => {
      if (!evidenceIds.has(evidenceId)) {
        errors.push(`${path}.evidenceIds[${evidenceIndex}] must reference a unitEvidenceNeeds item`);
      }
    });
  }
  if (isNonEmptyString(task.taskAffordance) && !TASK_AFFORDANCES.includes(task.taskAffordance)) {
    errors.push(`${path}.taskAffordance must be one of ${TASK_AFFORDANCES.join(", ")}`);
  }
  if (isNonEmptyString(task.taskPurpose) && !TASK_PURPOSES.includes(task.taskPurpose)) {
    errors.push(`${path}.taskPurpose must be one of ${TASK_PURPOSES.join(", ")}`);
  }
}
```

- [ ] **Step 4: Run schema tests**

Run:

```bash
cd experiments/shibei-v2/backend && node --test src/v2/generation/prompts/promptSchemas.test.js
```

Expected: ECD planning tests PASS, but legacy unitPracticePlan variable-count changes may still fail until Task 3.

## Task 3: Relax Transitional `unitPracticePlan`

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/unitPracticePlan.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`

- [ ] **Step 1: Rename the old fixed-count test**

Change:

```js
test("validates unit practice plans with two question plans", () => {
```

to:

```js
test("validates unit practice plans with variable question plan counts", () => {
```

- [ ] **Step 2: Make the fixture contain three plans**

In `unitPracticePlanFixture()`, append a third question plan:

```js
{
  id: "q-003",
  type: "multiple_choice",
  purpose: "misconception_check",
  practiceGoalId: "goal-01",
  sourceAnchorId: "anchor-unit-01"
}
```

- [ ] **Step 3: Extend legacy purposes**

In `unitPracticePlan.js`, replace `QUESTION_PLAN_PURPOSES` with:

```js
export const QUESTION_PLAN_PURPOSES = [
  "light_understanding",
  "scenario_application",
  "boundary_clarification",
  "relationship_matching",
  "boundary_check",
  "misconception_check",
  "counterexample_check",
  "layer_role_matching",
  "type_feature_matching",
  "step_purpose_matching",
  "signal_action_matching",
  "role_responsibility_matching"
];
```

- [ ] **Step 4: Relax count validation**

Replace:

```js
if (!Array.isArray(plans) || plans.length !== 2) {
  errors.push("unitPracticePlan.questionPlans must contain exactly 2 plans");
  return;
}
```

with:

```js
if (!Array.isArray(plans) || plans.length === 0) {
  errors.push("unitPracticePlan.questionPlans must be a non-empty array");
  return;
}
```

- [ ] **Step 5: Run prompt schema tests**

Run:

```bash
cd experiments/shibei-v2/backend && node --test src/v2/generation/prompts/promptSchemas.test.js
```

Expected: PASS.

## Task 4: Document Schema-Layer Status

**Files:**
- Modify: `experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md`
- Modify: `experiments/shibei-v2/docs/v2-backend-field-contract-zh.md`

- [ ] **Step 1: Add implementation status to the ECD schema draft**

Near the top of `v2-ecd-field-schema-draft-zh.md`, add:

```markdown
## Implementation Status

- `ecdPlanning.js` is the first code-level schema module for the ECD internal planning fields.
- The schema is not yet wired into model orchestration.
- Legacy `unitPracticePlan` remains as a transitional schema, but no longer encodes a fixed two-question rule.
- Prompt chain rewiring is a separate implementation phase.
```

- [ ] **Step 2: Add a transition note to field contract**

Under `Internal Generation / Quality Metadata`, confirm the text says:

```markdown
`unitPracticePlan` is transitional. New ECD work should prefer `articleUnderstanding`, `knowledgeModel`, `unitLearningClaims`, `unitEvidenceNeeds`, `unitTaskPlan`, and `unitAssemblyPlan`.
```

If this exact meaning is missing, add it.

- [ ] **Step 3: Run docs check**

Run:

```bash
git diff --check -- experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md experiments/shibei-v2/docs/v2-backend-field-contract-zh.md
```

Expected: no output.

## Task 5: Run Backend Check

**Files:**
- No edits.

- [ ] **Step 1: Run all backend tests**

Run:

```bash
npm --prefix experiments/shibei-v2/backend run check
```

Expected: all tests pass.

- [ ] **Step 2: Confirm no old fixed-count validation remains**

Run:

```bash
rg -n "exactly 2|固定 2|默认 2|must contain exactly 2|每个 unit 默认" experiments/shibei-v2/backend/src/v2 experiments/shibei-v2/docs
```

Expected: no code validation says `exactly 2`; any docs hits should be historical explanations or explicit “do not fix count” rules.

- [ ] **Step 3: Review changed files**

Run:

```bash
git diff --name-only
git diff -- experiments/shibei-v2/backend/src/v2/generation/prompts/ecdPlanning.js experiments/shibei-v2/backend/src/v2/generation/prompts/unitPracticePlan.js experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js
```

Expected: only V2 experiment backend/docs files changed.

## Commit Guidance

After Task 5 passes, commit the schema layer separately from future prompt-chain rewiring:

```bash
git add \
  experiments/shibei-v2/backend/src/v2/generation/prompts/ecdPlanning.js \
  experiments/shibei-v2/backend/src/v2/generation/prompts/unitPracticePlan.js \
  experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js \
  experiments/shibei-v2/docs/v2-backend-field-contract-zh.md \
  experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md \
  experiments/shibei-v2/docs/v2-ecd-middle-layer-framework-zh.md \
  experiments/shibei-v2/docs/v2-ecd-product-ai-system-analysis-zh.md \
  docs/superpowers/plans/2026-06-20-shibei-v2-ecd-schema-alignment-plan.md

git commit -m "feat(v2): add ECD planning schema contract"
```

Do not include quality-run JSON/HTML output in this commit unless a new run was intentionally produced.

## Self-Review Checklist

- [ ] New schema covers claim, evidence, task, and assembly.
- [ ] New schema does not expose ECD internal fields to SwiftUI.
- [ ] Legacy unitPracticePlan no longer hard-codes exactly two question plans.
- [ ] No prompt chain orchestration is changed in this plan.
- [ ] Backend tests pass before commit.

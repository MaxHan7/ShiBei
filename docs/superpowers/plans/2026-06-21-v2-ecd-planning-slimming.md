# V2 ECD Planning Slimming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the V2 `ecdPlanning` stage latency and JSON failure risk while preserving the ECD pyramid: unit micro knowledge points -> assessable targets -> selected tasks -> visible questions.

**Architecture:** Keep `unitKnowledgeMap` as the protected knowledge inventory. Split ECD information into three layers: front-end visible contract, persisted/debuggable backend JSON, and prompt-only ephemeral reasoning. Replace the current verbose per-unit `ecdPlanning` output with the smallest persisted task-planning schema needed for downstream generation and debugging; do not persist the full ECD reasoning chain. Keep `qualityJudge` disabled by default; do not add a new judge or rewrite role in this plan.

**Tech Stack:** Node.js ESM, `node:test`, existing V2 backend prompt/schema modules, V2 quality runner HTML/JSON reports.

---

## Diagnosis From Current Test Result

Latest runner-progress smoke:

- Report: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/reports/20260621-030640-v2-runner-progress-max1-timeout90s.html`
- `reviewPathPlan`: completed in about 39s.
- `unitKnowledgeMap`: completed in about 14s.
- `ecdPlanning`: still running when `QUALITY_EXPERIMENT_TIMEOUT_MS=90000` fired.

Why `ecdPlanning` is still heavy:

- The prompt now runs per unit, but the schema still requires a full ECD matrix:
  - `articleUnderstanding`
  - `knowledgeModel`
  - `unitSubObjectives`
  - `unitLearningClaims`
  - `unitEvidenceAngles`
  - `unitEvidenceNeeds`
  - `unitTaskPlan`
  - `unitAssemblyPlan`
- For downstream generation, we do not need every intermediate reasoning layer as persisted JSON.
- The essential product/debug needs are:
  - Did the model preserve every important micro knowledge point?
  - Which learning targets are assessable?
  - Which tasks/questions were selected?
  - Which micro points and evidence goals does each task cover?
  - Is matching chosen when a natural relation exists?

Therefore the next optimization is not to remove ECD. It is to stop treating every ECD thinking layer as a persisted JSON field.

## Independent Subagent Review

A read-only subagent reviewed the current prompt/schema/pipeline and reached the same diagnosis:

- `ecdPlanning.js` currently forces the model to output the whole ECD matrix: article understanding, knowledge model, sub-objectives, learning claims, evidence angles, evidence needs, task plan, and assembly plan.
- `validateEcdPlanningOutput()` still requires those verbose layers to be non-empty, so the model is incentivized to build a large ID graph before it can produce usable tasks.
- `buildEcdPlanningMessages()` asks for too many jobs in one response: article-level reasoning, unit reasoning, evidence construction, task selection, coverage matrix, and selected tasks.
- `modelPromptCaller.js` still budgets `ecdPlanning` at `14000` output tokens, matching the observed timeout behavior.
- `buildSingleUnitPlan()` narrows `plan.units` to one unit, but still spreads the rest of the full plan object, so unrelated full-chapter fields can still enter the per-unit prompt.
- `getEcdContextForUnit()` and downstream draft prompts still pass around the old verbose ECD context, so even a slimmer output would not fully solve the later prompt bloat unless downstream context is compact too.

The implementation direction is therefore:

1. Slim the per-unit input.
2. Slim the `ecdPlanning` output.
3. Slim the context passed to downstream generation.
4. Keep verbose ECD only as a deliberate debug mode, not the default chain.

## Refined Data-Layer Strategy

The implementation must distinguish three kinds of information:

| Layer | Purpose | Examples | Persist as JSON? |
| --- | --- | --- | --- |
| Front-end visible contract | SwiftUI rendering and product state | `units[]`、`questions[]`、`explanation`、`sourceAnchorId` | Yes, stable API |
| Backend persisted/debug JSON | Debug coverage and drive later prompt stages | `unitKnowledgeMap.microKnowledgePoints`、compact `assessableTargets[]`、compact `selectedTasks[]` | Yes, but compact |
| Prompt-only ephemeral reasoning | Help the model reason during a stage | learning-claim wording, evidence-angle brainstorming, rejected task candidates, local comparison notes | No by default |

The key technical shift is:

```text
Do not ask the model to output every intermediate ECD thought.
Ask the model to use ECD reasoning internally, then output only the compact decision artifacts needed by the next stage.
```

This means the plan should prefer:

- persisted micro inventory: yes
- persisted final selected task coverage: yes
- persisted full `unitLearningClaims[]`, `unitEvidenceAngles[]`, `unitEvidenceNeeds[]`, `unitTaskPlan[]`, `unitAssemblyPlan[]`: no, unless a future debug mode explicitly enables them
- full-chapter quality judge: no
- future review/repair role: only as per-unit or per-question small review, and only after the main generation path is stable

## Candidate Technical Options

Before implementing, workers should compare these options and pick the smallest change that solves the current bottleneck:

1. **Compact single-stage ecdPlanning**
   - Keep one per-unit `ecdPlanning` model call.
   - Prompt says “use ECD internally, only output compact task model.”
   - Lowest code churn.
   - Best first implementation.

2. **Two-stage ephemeral planning**
   - Stage A outputs compact `assessableTargets[]`.
   - Stage B consumes those targets and outputs compact `selectedTasks[]`.
   - More model calls, but each call has smaller output.
   - Use only if compact single-stage still times out or drops targets.

3. **Prompt-only hidden reasoning in same call**
   - DeepSeek does not provide a separate private reasoning channel for our JSON schema flow.
   - Therefore “hidden” here means instructions such as “reason internally, do not include reasoning in JSON,” not storing chain-of-thought.
   - We should not ask for chain-of-thought or save it.

4. **Debug mode with verbose ECD**
   - Keep the old verbose schema only behind a deliberate debug/experiment flag if we still need it.
   - It must not be the default quality runner path.

The recommended next step is Option 1. If Option 1 passes max1 but loses DMC/matching coverage in max6, then move to Option 2.

## File Structure

- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/ecdPlanning.js`
  - Replace verbose persisted output schema with compact `unitTaskModel` output shape.
  - Keep ECD reasoning in prompt instructions, but do not require every reasoning layer as JSON.
  - Keep normalization and validation helpers, but validate the compact shape.

- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
  - Rewrite the `ecdPlanning` prompt so it asks the model to use ECD internally and output compact selected task planning, not a full ECD essay/matrix.

- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
  - Merge compact per-unit planning outputs.
  - Replace `buildSingleUnitPlan()` with a compact input builder that only passes the current unit and relevant source/knowledge objects.
  - Adapt `getEcdContextForUnit()` and `buildPracticePlanFromEcdContext()` to use compact selected tasks.

- Modify: `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js`
  - Lower `ecdPlanning.estimatedOutputTokens` after compacting the schema. Start around `3000`, then calibrate from quality-run usage.

- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/unitPracticePlan.js`
  - Decide whether `targetIds` and `microIds` are first-class schema fields in `questionPlans[]`. For this plan, make them explicit so downstream reports and fixtures do not rely on loose extra fields.

- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js`
  - Update HTML report sections to show compact task planning:
    - micro knowledge points
    - assessable targets
    - selected tasks
    - selected task coverage by micro point

- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`
  - Update schema tests from verbose ECD arrays to compact task-model validation.

- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`
  - Assert the new prompt emphasizes compact task planning and does not ask for full article structure.

- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`
  - Update fixtures and expectations to compact `ecdPlanning`.

- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js`
  - Update HTML report fixture for compact task planning.

- Modify: `experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md`
  - Document which ECD layers remain conceptual and which fields are persisted.

- Modify: `experiments/shibei-v2/docs/v2-ecd-product-ai-system-analysis-zh.md`
  - Record the decision: “ECD stays, persisted JSON is slimmed.”

- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`
  - Add experiment record for this optimization and next run results.

---

### Task 0: Lock Down Per-Unit Input Slimming

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`

- [ ] **Step 1: Write a failing test that proves `ecdPlanning` does not receive unrelated full-chapter fields**

In `generateReviewPathV2.test.js`, add a fake prompt caller that captures the input passed to the `ecdPlanning` stage:

```js
test("passes only compact current-unit context into ecdPlanning", async () => {
  const captured = [];
  const promptCaller = async (stage, input) => {
    if (stage === "sourceMap") return sourceMapFixture();
    if (stage === "reviewPathPlan") return reviewPathPlanFixtureWithTwoUnits();
    if (stage === "unitKnowledgeMap") return unitKnowledgeMapFixtureWithTwoUnits();
    if (stage === "ecdPlanning") {
      captured.push(input);
      return compactEcdPlanningFixture({
        unitId: input.plan.units[0].id,
        sourceAnchorId: input.plan.units[0].sourceAnchor.id
      });
    }
    if (stage === "multipleChoiceDraft") return multipleChoiceDraftFixture();
    if (stage === "matchingDraft") return null;
    if (stage === "unitSummaryDraft") return unitSummaryDraftFixture();
    throw new Error(`Unexpected stage ${stage}`);
  };

  await generateReviewPathV2({
    article: articleFixture(),
    promptCaller,
    maxUnits: 2,
    unitConcurrency: 1
  });

  assert.equal(captured.length, 2);
  assert.equal(captured[0].plan.units.length, 1);
  assert.equal(captured[1].plan.units.length, 1);
  assert.notEqual(captured[0].plan.units[0].id, captured[1].plan.units[0].id);
  assert.equal(captured[0].plan.knowledgeObjects.every((item) => item.unitId === captured[0].plan.units[0].id), true);
  assert.equal(captured[1].plan.knowledgeObjects.every((item) => item.unitId === captured[1].plan.units[0].id), true);
  assert.equal(Array.isArray(captured[0].plan.chapterWideNotes), false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/generateReviewPathV2.test.js --test-name-pattern "compact current-unit context"
```

Expected: FAIL because `buildSingleUnitPlan()` currently spreads the full plan object.

- [ ] **Step 3: Replace `buildSingleUnitPlan()` with a compact input builder**

Use a helper that keeps only fields needed for this one unit:

```js
function buildSingleUnitPlan(plan, plannedUnit) {
  const unitId = plannedUnit.id;
  const sourceAnchorId = plannedUnit.sourceAnchor?.id;
  return {
    articleSummary: plan.articleSummary,
    chapterSummary: plan.chapterSummary,
    chapterEncouragement: plan.chapterEncouragement,
    units: [plannedUnit],
    knowledgeObjects: (plan.knowledgeObjects || []).filter((item) => {
      return item.unitId === unitId || item.sourceAnchorId === sourceAnchorId;
    })
  };
}
```

If the actual plan fields use slightly different names, keep the same rule: only current-unit summary, current unit, current-unit knowledge objects, and current source anchor metadata enter `ecdPlanning`.

- [ ] **Step 4: Run the focused test again**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/generateReviewPathV2.test.js --test-name-pattern "compact current-unit context"
```

Expected: PASS.

- [ ] **Step 5: Commit input-slimming checkpoint**

Run:

```bash
git add experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js
git commit -m "refactor(v2): slim ecd planning input"
```

### Task 1: Add Compact ECD Schema Tests

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/ecdPlanning.js`

- [ ] **Step 1: Write failing schema tests for the compact ECD output**

Add a test near the existing ECD planning schema tests:

```js
test("validates compact ECD task model output", () => {
  const output = compactEcdPlanningFixture();
  const result = validateEcdPlanningOutput(output, {
    unitIds: new Set(["unit-01"]),
    sourceAnchorIds: new Set(["anchor-unit-01"])
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("rejects compact ECD selected tasks that do not reference assessable targets", () => {
  const output = compactEcdPlanningFixture();
  output.units[0].selectedTasks[0].targetIds = ["missing-target"];

  const result = validateEcdPlanningOutput(output, {
    unitIds: new Set(["unit-01"]),
    sourceAnchorIds: new Set(["anchor-unit-01"])
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /targetIds\[0\] must reference an assessableTargets item/);
});
```

Add the fixture at the bottom of the test file:

```js
function compactEcdPlanningFixture() {
  return {
    units: [
      {
        unitId: "unit-01",
        assessableTargets: [
          {
            targetId: "target-001",
            microId: "micro-unit-01-001",
            title: "DMC 三层结构",
            importance: "required",
            learningTarget: "能区分 dynamics、mechanics、components 三层各自的作用。",
            sourceAnchorId: "anchor-unit-01"
          }
        ],
        selectedTasks: [
          {
            questionPlanId: "q-001",
            targetIds: ["target-001"],
            microIds: ["micro-unit-01-001"],
            taskAffordance: "matching",
            taskPurpose: "layer_role_matching",
            evidenceGoal: "观察用户能否把每一层和它承担的设计作用对应起来。",
            commonMisconception: "把三层当成同义词或简单名词定义。",
            sourceAnchorId: "anchor-unit-01"
          }
        ]
      }
    ]
  };
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/prompts/promptSchemas.test.js --test-name-pattern "compact ECD"
```

Expected: FAIL because `ecdPlanning.js` still expects the old verbose fields.

- [ ] **Step 3: Implement compact persisted schema in `ecdPlanning.js`**

Important: this is not removing ECD from the system. It is removing full persisted ECD reasoning from the default JSON contract. The prompt can still ask the model to consider claims, evidence, angles, misconceptions, and task affordances, but the response JSON should only include the compact artifacts below.

Replace the required output shape with:

```js
export const ECD_PLANNING_OUTPUT_SCHEMA = {
  name: ECD_PLANNING_PROMPT_SCHEMA_NAME,
  type: "object",
  required: ["units"],
  properties: {
    units: {
      type: "array",
      items: {
        type: "object",
        required: ["unitId", "assessableTargets", "selectedTasks"],
        properties: {
          unitId: { type: "string" },
          assessableTargets: {
            type: "array",
            items: {
              type: "object",
              required: [
                "targetId",
                "microId",
                "title",
                "importance",
                "learningTarget",
                "sourceAnchorId"
              ],
              properties: {
                targetId: { type: "string" },
                microId: { type: "string" },
                title: { type: "string" },
                importance: { enum: ["required", "supporting", "optional"] },
                learningTarget: { type: "string" },
                sourceAnchorId: { type: "string" }
              }
            }
          },
          selectedTasks: {
            type: "array",
            items: {
              type: "object",
              required: [
                "questionPlanId",
                "targetIds",
                "microIds",
                "taskAffordance",
                "taskPurpose",
                "evidenceGoal",
                "commonMisconception",
                "sourceAnchorId"
              ],
              properties: {
                questionPlanId: { type: "string" },
                targetIds: { type: "array", items: { type: "string" } },
                microIds: { type: "array", items: { type: "string" } },
                taskAffordance: { enum: TASK_AFFORDANCES },
                taskPurpose: { enum: TASK_PURPOSES },
                evidenceGoal: { type: "string" },
                commonMisconception: { type: "string" },
                sourceAnchorId: { type: "string" }
              }
            }
          }
        }
      }
    }
  }
};
```

Adapt `validateEcdPlanningOutput()` so it checks:

```js
const units = output.units;
if (!Array.isArray(units) || units.length === 0) {
  errors.push("ecdPlanning.units must be a non-empty array");
}

for (const [unitIndex, unit] of units.entries()) {
  const path = `units[${unitIndex}]`;
  if (!unitIds.has(unit.unitId)) errors.push(`${path}.unitId must reference a planned unit`);

  const targetIds = new Set((unit.assessableTargets || []).map((target) => target.targetId));
  const microIds = new Set((unit.assessableTargets || []).map((target) => target.microId));

  for (const [taskIndex, task] of (unit.selectedTasks || []).entries()) {
    for (const [targetIndex, targetId] of (task.targetIds || []).entries()) {
      if (!targetIds.has(targetId)) {
        errors.push(`${path}.selectedTasks[${taskIndex}].targetIds[${targetIndex}] must reference an assessableTargets item`);
      }
    }
    for (const [microIndex, microId] of (task.microIds || []).entries()) {
      if (!microIds.has(microId)) {
        errors.push(`${path}.selectedTasks[${taskIndex}].microIds[${microIndex}] must reference an assessableTargets microId`);
      }
    }
    if (!sourceAnchorIds.has(task.sourceAnchorId)) {
      errors.push(`${path}.selectedTasks[${taskIndex}].sourceAnchorId must reference a known source anchor`);
    }
  }
}
```

- [ ] **Step 4: Run compact schema tests again**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/prompts/promptSchemas.test.js --test-name-pattern "compact ECD"
```

Expected: PASS.

- [ ] **Step 5: Commit schema checkpoint**

Run:

```bash
git add experiments/shibei-v2/backend/src/v2/generation/prompts/ecdPlanning.js experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js
git commit -m "refactor(v2): slim ecd planning schema"
```

---

### Task 2: Rewrite `ecdPlanning` Prompt for Compact Task Planning

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`

- [ ] **Step 1: Write failing prompt tests**

Update the existing `ecdPlanning` prompt test to assert:

```js
assert.match(messages.user, /只输出 compact task model/);
assert.match(messages.user, /assessableTargets/);
assert.match(messages.user, /selectedTasks/);
assert.doesNotMatch(messages.user, /articleUnderstanding\.articleStructure/);
assert.doesNotMatch(messages.user, /unitEvidenceAngles/);
assert.doesNotMatch(messages.user, /unitLearningClaims/);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/prompts/buildV2PromptMessages.test.js --test-name-pattern "ecdPlanning"
```

Expected: FAIL because the current prompt still asks for verbose ECD fields.

- [ ] **Step 3: Replace `buildEcdPlanningMessages()` instruction body**

The prompt should explicitly say that ECD reasoning is internal to the stage and must not be fully serialized. It should still preserve the pyramid:

```text
microKnowledgePoints
-> assessableTargets
-> selectedTasks
-> visible question drafts
```

Use this prompt body:

```js
function buildEcdPlanningMessages({ article, source, blocks, plan, unitKnowledgeMap }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：ecdPlanning。",
      "任务：使用 Evidence-Centered Design 进行内部判断，但只输出 compact task model。不要生成用户可见题目，不要输出完整 ECD 思考链。",
      "你当前只处理 reviewPathPlan.units 中的一个 unit。",
      "",
      "保留 ECD 的顺序：",
      "1. 从 unitKnowledgeMap.microKnowledgePoints 中找出 required/supporting 的可考小知识点。",
      "2. 把这些小知识点转成 assessableTargets。",
      "3. 为每个 selectedTask 写清它覆盖哪些 targetIds / microIds。",
      "4. 再选择最适合收集证据的 taskAffordance 和 taskPurpose。",
      "",
      "输出约束：",
      "- 只输出 units[]。",
      "- 每个 unit 只输出 assessableTargets[] 和 selectedTasks[]。",
      "- 不输出 articleUnderstanding、knowledgeModel、unitLearningClaims、unitEvidenceAngles、unitEvidenceNeeds、unitTaskPlan、unitAssemblyPlan；这些只是你内部判断 selectedTasks 时可使用的思考框架。",
      "- high / medium assessmentValue 的 microKnowledgePoint 默认应该进入 assessableTargets，除非它和另一个 target 完全同义。",
      "- selectedTasks 的数量由证据价值自然决定，不写死，不为了少题而丢 required target。",
      "- matching 适合天然关系：分层模型、类型集合、流程步骤、信号动作、角色职责。",
      "- DMC 这类“模型层级 -> 设计作用”的知识点，通常适合 layer_role_matching。",
      "- commonMisconception 要服务于后续选择题干扰项或答后解释。",
      "",
      `reviewPathPlan:\n${JSON.stringify(plan, null, 2)}`,
      "",
      `unitKnowledgeMap:\n${JSON.stringify(unitKnowledgeMap || {}, null, 2)}`,
      "",
      renderSource(source, blocks),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}
```

- [ ] **Step 4: Run prompt test again**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/prompts/buildV2PromptMessages.test.js --test-name-pattern "ecdPlanning"
```

Expected: PASS.

- [ ] **Step 5: Commit prompt checkpoint**

Run:

```bash
git add experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js
git commit -m "refactor(v2): make ecd planning prompt compact"
```

---

### Task 3: Adapt Generation Pipeline to Compact ECD Context

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`

- [ ] **Step 1: Write failing pipeline tests**

Update the happy-path fixture so `ecdPlanningFixture()` returns:

```js
return {
  units: [
    {
      unitId,
      assessableTargets: [
        {
          targetId: "target-001",
          microId: "micro-unit-01-001",
          title: "Hook 是流程约束",
          importance: "required",
          learningTarget: "能把 Hook 理解为关键动作前后的固定流程约束。",
          sourceAnchorId
        },
        {
          targetId: "target-002",
          microId: "micro-unit-01-002",
          title: "职责边界",
          importance: matching ? "required" : "supporting",
          learningTarget: "能区分 Prompt、Hook、CI 和规则文档的职责。",
          sourceAnchorId
        }
      ],
      selectedTasks: matching
        ? [
            {
              questionPlanId: "q-001",
              targetIds: ["target-001"],
              microIds: ["micro-unit-01-001"],
              taskAffordance: "multiple_choice",
              taskPurpose: "light_understanding",
              evidenceGoal: "观察用户是否理解 Hook 是流程约束。",
              commonMisconception: "把 Hook 当成更长提示词。",
              sourceAnchorId
            },
            {
              questionPlanId: "q-002",
              targetIds: ["target-002"],
              microIds: ["micro-unit-01-002"],
              taskAffordance: "matching",
              taskPurpose: "role_responsibility_matching",
              evidenceGoal: "观察用户是否能匹配不同工具在流程中的职责。",
              commonMisconception: "把所有约束都交给 Prompt。",
              sourceAnchorId
            }
          ]
        : [
            {
              questionPlanId: "q-001",
              targetIds: ["target-001"],
              microIds: ["micro-unit-01-001"],
              taskAffordance: "multiple_choice",
              taskPurpose: "light_understanding",
              evidenceGoal: "观察用户是否理解 Hook 是流程约束。",
              commonMisconception: "把 Hook 当成更长提示词。",
              sourceAnchorId
            }
          ]
    }
  ]
};
```

Update expectations:

```js
assert.equal(reviewPath.generationMeta.ecdPlanning.units[0].assessableTargets.length, 2);
assert.equal(reviewPath.generationMeta.ecdPlanning.units[0].selectedTasks.length, 2);
assert.deepEqual(reviewPath.generationMeta.unitPracticePlans[0].questionPlans[1].targetIds, ["target-002"]);
```

- [ ] **Step 2: Run generation test to verify it fails**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/generateReviewPathV2.test.js
```

Expected: FAIL because `getEcdContextForUnit()` and `alignPracticePlanWithEcdContext()` still expect old fields.

- [ ] **Step 3: Merge compact outputs**

Replace `mergeEcdPlanningOutputs()` with:

```js
function mergeEcdPlanningOutputs(outputs) {
  return {
    units: (outputs || [])
      .filter(Boolean)
      .flatMap((output) => Array.isArray(output.units) ? output.units : [])
  };
}
```

- [ ] **Step 4: Adapt `getEcdContextForUnit()`**

Use:

```js
function getEcdContextForUnit(ecdPlanning, plannedUnit, unitKnowledgeMap = null) {
  const unitId = plannedUnit.id;
  const microKnowledgePoints =
    unitKnowledgeMap?.units?.find((item) => item.unitId === unitId)?.microKnowledgePoints ?? [];
  const compactUnit = (ecdPlanning.units ?? []).find((item) => item.unitId === unitId) ?? null;
  return {
    unitId,
    microKnowledgePoints,
    assessableTargets: compactUnit?.assessableTargets ?? [],
    selectedTasks: compactUnit?.selectedTasks ?? []
  };
}
```

- [ ] **Step 5: Adapt practice plan alignment**

Replace task conversion helpers so selected tasks produce practice goals directly:

```js
function alignPracticePlanWithEcdContext(practicePlan, { ecdContext, plannedUnit }) {
  const selectedTasks = Array.isArray(ecdContext?.selectedTasks) ? ecdContext.selectedTasks : [];
  if (selectedTasks.length === 0) return practicePlan;

  const sourceAnchorId = plannedUnit.sourceAnchor.id;
  const goals = selectedTasks.map((task, index) => ({
    id: practiceGoalIdForSelectedTask(task, index),
    kind: practiceGoalKindForSelectedTask(task),
    target: task.evidenceGoal,
    commonMisconception: task.commonMisconception,
    targetIds: Array.isArray(task.targetIds) ? task.targetIds : [],
    microIds: Array.isArray(task.microIds) ? task.microIds : [],
    sourceAnchorId
  }));

  const questionPlans = selectedTasks.map((task, index) => {
    const type = questionTypeForTaskAffordance(task.taskAffordance);
    return {
      id: task.questionPlanId,
      type,
      purpose: questionPurposeForSelectedTask(task.taskPurpose),
      practiceGoalId: goals[index].id,
      targetIds: goals[index].targetIds,
      microIds: goals[index].microIds,
      ...(type === "matching" ? { relationType: relationTypeForTaskPurpose(task.taskPurpose) } : {}),
      sourceAnchorId
    };
  });

  return {
    ...practicePlan,
    unitId: plannedUnit.id,
    practiceGoals: goals,
    questionPlans
  };
}
```

- [ ] **Step 6: Run generation tests**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/generateReviewPathV2.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit pipeline checkpoint**

Run:

```bash
git add experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js
git commit -m "refactor(v2): adapt generation to compact ecd context"
```

---

### Task 4: Calibrate Stage Budget and Practice Plan Contract

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/unitPracticePlan.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`

- [ ] **Step 1: Write a failing test that `unitPracticePlan.questionPlans[]` officially accepts ECD coverage ids**

Add a test that validates `targetIds` and `microIds` are part of the contract, not loose accidental fields:

```js
test("validates unitPracticePlan question coverage ids", () => {
  const output = unitPracticePlanFixture();
  output.questionPlans[0].targetIds = ["target-001"];
  output.questionPlans[0].microIds = ["micro-unit-01-001"];

  const result = validateUnitPracticePlanOutput(output, {
    unitId: "unit-01",
    sourceAnchorIds: new Set(["anchor-unit-01"])
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});
```

- [ ] **Step 2: Run the focused schema test**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/prompts/promptSchemas.test.js --test-name-pattern "unitPracticePlan question coverage"
```

Expected: FAIL if the schema or validator does not explicitly support coverage ids yet.

- [ ] **Step 3: Add `targetIds` and `microIds` to `UNIT_PRACTICE_PLAN_OUTPUT_SCHEMA`**

In each `questionPlans[].items.properties`, add:

```js
targetIds: { type: "array", items: { type: "string" } },
microIds: { type: "array", items: { type: "string" } }
```

They should be optional for backward compatibility, but when compact ECD creates practice plans they must be populated.

- [ ] **Step 4: Lower `ecdPlanning` output token estimate**

In `modelPromptCaller.js`, change:

```js
ecdPlanning: {
  schemaName: ECD_PLANNING_PROMPT_SCHEMA_NAME,
  schema: ECD_PLANNING_OUTPUT_SCHEMA,
  estimatedOutputTokens: 3000
}
```

Expected: the stage no longer reserves a huge completion window for a compact JSON shape. If real usage later exceeds this, raise it based on observed run metrics, not preemptively.

- [ ] **Step 5: Run prompt schema tests**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/prompts/promptSchemas.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit contract checkpoint**

Run:

```bash
git add experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js experiments/shibei-v2/backend/src/v2/generation/prompts/unitPracticePlan.js experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js
git commit -m "refactor(v2): calibrate compact ecd planning contract"
```

---

### Task 5: Update V2 Quality Report for Compact ECD

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js`

- [ ] **Step 1: Write failing report expectations**

In `v2QualityExperiment.test.js`, update fixture and assertions:

```js
assert.match(html, /Compact ECD Task Model/);
assert.match(html, /Assessable Targets/);
assert.match(html, /Selected Tasks/);
assert.match(html, /target-001/);
assert.match(html, /micro-u1-1/);
assert.match(html, /role_responsibility_matching/);
assert.doesNotMatch(html, /Learning Claims/);
assert.doesNotMatch(html, /Evidence Needs/);
```

- [ ] **Step 2: Run report test to verify it fails**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/tests/v2QualityExperiment.test.js
```

Expected: FAIL because the report still renders verbose ECD sections.

- [ ] **Step 3: Replace verbose ECD report section**

In `renderV2QualityReportHtml()`, replace the old ECD shadow section with a compact section:

```js
function renderCompactEcdPlanning(ecdPlanning) {
  const units = Array.isArray(ecdPlanning?.units) ? ecdPlanning.units : [];
  if (units.length === 0) return "";

  return `
    <section>
      <h2>Compact ECD Task Model</h2>
      ${units.map((unit) => `
        <div class="card">
          <h3>${escapeHtml(unit.unitId)}</h3>
          <h4>Assessable Targets</h4>
          <ul>
            ${(unit.assessableTargets || []).map((target) => `
              <li><code>${escapeHtml(target.targetId)}</code> · ${escapeHtml(target.importance)} · <code>${escapeHtml(target.microId)}</code><br>${escapeHtml(target.learningTarget)}</li>
            `).join("")}
          </ul>
          <h4>Selected Tasks</h4>
          <ul>
            ${(unit.selectedTasks || []).map((task) => `
              <li><code>${escapeHtml(task.questionPlanId)}</code> · ${escapeHtml(task.taskAffordance)} · ${escapeHtml(task.taskPurpose)}<br>
              targets: ${escapeHtml((task.targetIds || []).join(", "))}<br>
              micros: ${escapeHtml((task.microIds || []).join(", "))}<br>
              ${escapeHtml(task.evidenceGoal || "")}</li>
            `).join("")}
          </ul>
        </div>
      `).join("")}
    </section>
  `;
}
```

- [ ] **Step 4: Run report test again**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/tests/v2QualityExperiment.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit report checkpoint**

Run:

```bash
git add experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js
git commit -m "refactor(v2): report compact ecd task model"
```

---

### Task 6: Update Documentation for the Slimmed ECD Contract

**Files:**
- Modify: `experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md`
- Modify: `experiments/shibei-v2/docs/v2-ecd-product-ai-system-analysis-zh.md`
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

- [ ] **Step 1: Update schema draft**

Add this section near Implementation Status:

```markdown
2026-06-21 下一轮减重原则：ECD 仍然是系统理论，但不再把完整 ECD 思考链全部持久化为 JSON。`unitKnowledgeMap` 负责防止漏小知识点；`ecdPlanning` 只保留 compact task model：`assessableTargets[]` 和 `selectedTasks[]`。`learningClaim / evidenceAngle / evidenceNeed / taskPlan / assemblyPlan` 作为概念存在于 prompt 推理中，但不再作为默认持久化字段。
```

- [ ] **Step 2: Update product AI analysis**

Add:

```markdown
这次调整不是撤销 ECD，而是把 ECD 从“全量可见中间链”调整为“驱动任务选择的内部方法”。真正需要长期记录的是知识覆盖和任务覆盖，而不是每一层推理的完整文本。
```

- [ ] **Step 3: Update quality README**

Add experiment hypothesis:

```markdown
Hypothesis: compact ECD task planning should reduce `ecdPlanning` latency and JSON failure risk while preserving DMC-style matching and multi-angle coverage.
```

- [ ] **Step 4: Commit docs checkpoint**

Run:

```bash
git add experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md experiments/shibei-v2/docs/v2-ecd-product-ai-system-analysis-zh.md experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md
git commit -m "docs(v2): document compact ecd planning contract"
```

---

### Task 7: Run Full Tests and One Controlled Quality Experiment

**Files:**
- Possibly create:
  - `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs/<timestamp>-v2-compact-ecd-max1.json`
  - `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/reports/<timestamp>-v2-compact-ecd-max1.html`

- [ ] **Step 1: Run full backend check**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
npm --prefix experiments/shibei-v2/backend run check
```

Expected: all tests pass.

- [ ] **Step 2: Run max1 quality experiment with stage progress**

Run with the real DeepSeek key supplied at execution time:

```bash
AI_PROVIDER=deepseek \
DEEPSEEK_API_KEY='<set-at-runtime>' \
QUALITY_ARTICLE_URL='https://mp.weixin.qq.com/s/_WY2GXs-iynGePgdsYLi0A' \
QUALITY_EXPERIMENT_SLUG='_WY2GXs-iynGePgdsYLi0A' \
QUALITY_EXPERIMENT_LABEL='v2-compact-ecd-max1' \
QUALITY_OUTPUT_ROOT='/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/quality-runs/v2-single-article' \
V2_SOURCE_MAP_MODE=deterministic \
V2_GENERATION_MAX_UNITS=1 \
V2_GENERATION_UNIT_CONCURRENCY=1 \
QUALITY_EXPERIMENT_TIMEOUT_MS=90000 \
MODEL_REQUEST_TIMEOUT_MS=30000 \
npm --prefix experiments/shibei-v2/backend run quality:v2
```

Expected:

- The runner prints `stage_start` / `stage_done`.
- `ecdPlanning` should finish inside the 90s experiment window.
- JSON and HTML artifacts are written.
- `qualityJudge` does not run unless `V2_ENABLE_QUALITY_JUDGE=1` is set.

- [ ] **Step 3: Compare against current timeout run**

Record these metrics in the article README:

```markdown
Before compact ECD:
- max1 timed out at ecdPlanning after 90s.
- reviewPathPlan: about 39s.
- unitKnowledgeMap: about 14s.

After compact ECD:
- ecdPlanning: <observed seconds>.
- unit count: <observed>.
- question count: <observed>.
- matching count: <observed>.
- whether DMC-style structural matching survives: yes/no.
```

- [ ] **Step 4: If max1 passes, run max6**

Run:

```bash
AI_PROVIDER=deepseek \
DEEPSEEK_API_KEY='<set-at-runtime>' \
QUALITY_ARTICLE_URL='https://mp.weixin.qq.com/s/_WY2GXs-iynGePgdsYLi0A' \
QUALITY_EXPERIMENT_SLUG='_WY2GXs-iynGePgdsYLi0A' \
QUALITY_EXPERIMENT_LABEL='v2-compact-ecd-max6' \
QUALITY_OUTPUT_ROOT='/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/quality-runs/v2-single-article' \
V2_SOURCE_MAP_MODE=deterministic \
V2_GENERATION_MAX_UNITS=6 \
V2_GENERATION_UNIT_CONCURRENCY=1 \
QUALITY_EXPERIMENT_TIMEOUT_MS=600000 \
MODEL_REQUEST_TIMEOUT_MS=60000 \
npm --prefix experiments/shibei-v2/backend run quality:v2
```

Expected:

- The run completes or writes a stage-specific timeout report.
- If it completes, compare unit coverage and question quality against:
  - `20260621-014913-v2-unit-ecd-per-unit-max6`
  - `20260620-135541-v2-ecd-shadow-max6-concurrency3-anchor-normalized`

- [ ] **Step 5: Commit final experiment checkpoint**

Run:

```bash
git add experiments/shibei-v2/backend/src/v2/generation experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md experiments/shibei-v2/docs/v2-ecd-product-ai-system-analysis-zh.md experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A
git commit -m "refactor(v2): compact ecd planning pipeline"
```

---

## Self-Review

Spec coverage:

- Addresses why `ecdPlanning` is slow using the latest stage-progress result.
- Adds an independent subagent review section that identifies input bloat, output bloat, downstream context bloat, and token-budget bloat separately.
- Keeps ECD as the theory and structure.
- Slims the current-unit input before changing the output contract.
- Removes full persisted ECD matrix from default JSON.
- Keeps micro knowledge coverage protected.
- Keeps matching and multi-angle task selection possible.
- Keeps `qualityJudge` out of the main chain.
- Lowers the `ecdPlanning` output token budget after compacting the schema.
- Uses quality runner progress and timeout for comparison.

Placeholder scan:

- No implementation task relies on “TBD” or “handle later”.
- Runtime API key is intentionally written as `<set-at-runtime>` so no secret is stored in the repo.

Type consistency:

- Compact schema fields are consistently named:
  - `units[]`
  - `assessableTargets[]`
  - `selectedTasks[]`
  - `targetIds`
  - `microIds`
  - `evidenceGoal`
  - `commonMisconception`

# V2 Prompt Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 V2 出题系统从“直接生成题目”重构为“文章理解 -> 知识结构 -> 学习规格 -> 题型计划 -> 题目生成”的金字塔式 prompt 链路。

**Architecture:** 本轮不加入末端改写审查员。以 Evidence-Centered Design 为主线，把教学判断前移到 `UnitLearningSpec` 和 `AssessmentPlan`：先明确 learning claim，再明确 evidence need，再选择 task affordance，最后生成题目。每个题型选择都要有结构化理由，尤其修复 DMC 这类分层模型无法生成 matching 的问题。所有阶段继续使用 JSON schema、validator、diagnostic-only quality report。

**Reference:** ECD 产品分析见 `experiments/shibei-v2/docs/v2-ecd-product-ai-system-analysis-zh.md`。实现时优先遵循该文档中的 claim / evidence / task / assembly 映射。

**Tech Stack:** Node.js ESM、现有 V2 backend prompt schema、`node:test`、DeepSeek/OpenAI JSON caller、V2 quality runner、HTML quality report。

---

## Current Status

- 已完成第一步低风险接入：`ecdPlanning` 已进入真实 V2 生成链路。
- 当前阶段顺序为：`sourceMap -> reviewPathPlan -> ecdPlanning -> unitPracticePlan -> multipleChoiceDraft / matchingDraft -> unitSummaryDraft -> qualityJudge`。
- `ecdPlanning` 输出已经写入 `generationMeta.ecdPlanning`，并在 V2 HTML 质量报告中展示。
- `ecdPlanning.unitAssemblyPlan.selectedTasks` 已经开始驱动 `unitPracticePlan` 的题型计划。`unitPracticePlan` 目前是过渡 adapter：把 ECD selectedTasks 转成现有 `practiceGoals` 和 `questionPlans`，同时保持前端可见字段合同稳定。
- 下一步不应让 `unitPracticePlan` 重新选择题型，而应继续强化上游 `reviewPathPlan` / `knowledgeModel` 的知识点切分，以及 `ecdPlanning` 对 matching 关系强度的判断。

## Files

- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
  - 增加 `unitLearningSpec` 和 `assessmentPlan` prompt。
  - 调整 `unitPracticePlan` 语气，或在新结构完成后废弃其题型判断职责。
- Create: `experiments/shibei-v2/backend/src/v2/generation/prompts/unitLearningSpec.js`
  - 定义学习对象、知识形状、关系、误区和 source anchor schema。
- Create: `experiments/shibei-v2/backend/src/v2/generation/prompts/assessmentPlan.js`
  - 定义题型适配评分、selectedTasks 和题型计划 schema。
- Modify: `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js`
  - 注册新阶段 schema 和 token 预算。
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
  - 调整阶段顺序，传递 `unitLearningSpec` 和 `assessmentPlan`。
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/multipleChoiceDraft.js`
  - 让选择题 validator 接受新的 plan 字段。
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/matchingDraft.js`
  - 让 matching 接收 `relations` 和 `relationGoal`，并支持三组核心关系加一组高价值补充。
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js`
  - 报告增加 knowledge shape、task fit、selected task reason。
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`
  - 新增 schema validator tests。
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`
  - 验证 prompt 包含 ECD 风格字段、非禁令式题型判断和 DMC matching 适配。
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`
  - 验证阶段顺序、DMC-like layered framework 生成 matching plan、matchingDraft 被调用。
- Modify: `experiments/shibei-v2/docs/v2-prompt-field-rules-zh.md`
  - 引用新架构文档，补充 `knowledgeShape`、`cognitiveAction`、`taskAffordance`。
- Modify: `experiments/shibei-v2/docs/v2-prompt-quality-gap-audit-zh.md`
  - 记录本轮根因：planning 阶段过度保守，而不是 matchingDraft 失败。

## Task 1: Add UnitLearningSpec Schema

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/generation/prompts/unitLearningSpec.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`

- [ ] **Step 1: Write failing schema export test**

Add imports to `promptSchemas.test.js`:

```js
import {
  UNIT_LEARNING_SPEC_PROMPT_SCHEMA,
  validateUnitLearningSpecOutput
} from "./unitLearningSpec.js";
```

Add test:

```js
test("validates unit learning specs with knowledge shape and relations", () => {
  assert.equal(UNIT_LEARNING_SPEC_PROMPT_SCHEMA.name, "shibei_v2_unit_learning_spec");

  const result = validateUnitLearningSpecOutput(
    {
      unitId: "unit-3",
      learningObject: "DMC 三层模型",
      knowledgeShape: "layered_framework",
      learningClaim: "用户能区分 DMC 三层分别承担的设计作用。",
      commonMisconceptions: [
        "把 DMC 当成可见游戏元素清单。",
        "误以为组件层最重要，忽略动力层和机制层。"
      ],
      relations: [
        {
          id: "rel-1",
          left: "动力层",
          right: "定义用户最终体验到的方向",
          relationType: "layer_role"
        },
        {
          id: "rel-2",
          left: "机制层",
          right: "组织用户持续参与的规则和流程",
          relationType: "layer_role"
        },
        {
          id: "rel-3",
          left: "组件层",
          right: "呈现用户能看到和操作的界面单元",
          relationType: "layer_role"
        }
      ],
      sourceAnchorId: "anchor-unit-3"
    },
    { unitId: "unit-3", sourceAnchorId: "anchor-unit-3" }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/prompts/promptSchemas.test.js
```

Expected: FAIL because `unitLearningSpec.js` does not exist.

- [ ] **Step 3: Create `unitLearningSpec.js`**

Create:

```js
import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  requireFields,
  validateUniqueIds
} from "./schemaValidation.js";

export const UNIT_LEARNING_SPEC_PROMPT_SCHEMA_NAME = "shibei_v2_unit_learning_spec";

export const KNOWLEDGE_SHAPES = [
  "core_concept",
  "boundary_rule",
  "process_steps",
  "layered_framework",
  "type_set",
  "signal_set",
  "role_boundary",
  "scenario_rule"
];

export const RELATION_TYPES = [
  "layer_role",
  "type_meaning",
  "step_purpose",
  "signal_action",
  "role_responsibility",
  "boundary_contrast",
  "scenario_effect"
];

export const UNIT_LEARNING_SPEC_PROMPT_SCHEMA = {
  name: UNIT_LEARNING_SPEC_PROMPT_SCHEMA_NAME,
  type: "object",
  required: [
    "unitId",
    "learningObject",
    "knowledgeShape",
    "learningClaim",
    "commonMisconceptions",
    "relations",
    "sourceAnchorId"
  ],
  properties: {
    unitId: { type: "string" },
    learningObject: { type: "string" },
    knowledgeShape: { enum: KNOWLEDGE_SHAPES },
    learningClaim: { type: "string" },
    commonMisconceptions: {
      type: "array",
      items: { type: "string" }
    },
    relations: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "left", "right", "relationType"],
        properties: {
          id: { type: "string" },
          left: { type: "string" },
          right: { type: "string" },
          relationType: { enum: RELATION_TYPES }
        }
      }
    },
    sourceAnchorId: { type: "string" }
  }
};

export function validateUnitLearningSpecOutput(output, { unitId, sourceAnchorId } = {}) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["unitLearningSpec output must be an object"]);
  }

  requireFields(
    output,
    [
      "unitId",
      "learningObject",
      "knowledgeShape",
      "learningClaim",
      "commonMisconceptions",
      "relations",
      "sourceAnchorId"
    ],
    "unitLearningSpec",
    errors
  );

  if (unitId && output.unitId !== unitId) {
    errors.push(`unitLearningSpec.unitId must match ${unitId}`);
  }

  if (sourceAnchorId && output.sourceAnchorId !== sourceAnchorId) {
    errors.push(`unitLearningSpec.sourceAnchorId must match ${sourceAnchorId}`);
  }

  if (isNonEmptyString(output.knowledgeShape) && !KNOWLEDGE_SHAPES.includes(output.knowledgeShape)) {
    errors.push(`unitLearningSpec.knowledgeShape must be one of ${KNOWLEDGE_SHAPES.join(", ")}`);
  }

  if (!Array.isArray(output.commonMisconceptions)) {
    errors.push("unitLearningSpec.commonMisconceptions must be an array");
  }

  if (!Array.isArray(output.relations)) {
    errors.push("unitLearningSpec.relations must be an array");
  } else {
    validateUniqueIds(output.relations, "unitLearningSpec.relations", errors);
    output.relations.forEach((relation, index) => {
      const path = `unitLearningSpec.relations[${index}]`;
      if (!isPlainObject(relation)) {
        errors.push(`${path} must be an object`);
        return;
      }
      requireFields(relation, ["id", "left", "right", "relationType"], path, errors);
      if (isNonEmptyString(relation.relationType) && !RELATION_TYPES.includes(relation.relationType)) {
        errors.push(`${path}.relationType must be one of ${RELATION_TYPES.join(", ")}`);
      }
    });
  }

  return createValidationResult(errors);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/prompts/promptSchemas.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add experiments/shibei-v2/backend/src/v2/generation/prompts/unitLearningSpec.js experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js
git commit -m "feat(v2): add unit learning spec schema"
```

## Task 2: Add AssessmentPlan Schema

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/generation/prompts/assessmentPlan.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`

- [ ] **Step 1: Write failing assessment plan tests**

Add imports:

```js
import {
  ASSESSMENT_PLAN_PROMPT_SCHEMA,
  validateAssessmentPlanOutput
} from "./assessmentPlan.js";
```

Add test:

```js
test("validates assessment plans with matching selected for layered frameworks", () => {
  assert.equal(ASSESSMENT_PLAN_PROMPT_SCHEMA.name, "shibei_v2_assessment_plan");

  const result = validateAssessmentPlanOutput(
    {
      unitId: "unit-3",
      recommendedTasks: [
        {
          type: "matching",
          fitScore: 0.9,
          cognitiveAction: "map_relationship",
          reason: "DMC 是三层模型，每层都有明确作用，适合匹配层级和作用。"
        },
        {
          type: "multiple_choice",
          fitScore: 0.74,
          cognitiveAction: "apply_to_scenario",
          reason: "也适合判断只堆组件的场景误区。"
        }
      ],
      selectedTasks: [
        {
          id: "qp-1",
          type: "multiple_choice",
          purpose: "light_understanding",
          cognitiveAction: "recognize_core_claim",
          practiceGoalId: "pg-1",
          sourceAnchorId: "anchor-unit-3"
        },
        {
          id: "qp-2",
          type: "matching",
          purpose: "relationship_matching",
          cognitiveAction: "map_relationship",
          practiceGoalId: "pg-2",
          relationType: "layer_role",
          sourceAnchorId: "anchor-unit-3"
        }
      ]
    },
    { unitId: "unit-3", sourceAnchorId: "anchor-unit-3" }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/prompts/promptSchemas.test.js
```

Expected: FAIL because `assessmentPlan.js` does not exist.

- [ ] **Step 3: Create `assessmentPlan.js`**

Create:

```js
import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  requireFields,
  validateUniqueIds
} from "./schemaValidation.js";

export const ASSESSMENT_PLAN_PROMPT_SCHEMA_NAME = "shibei_v2_assessment_plan";

export const ASSESSMENT_TASK_TYPES = ["multiple_choice", "matching"];
export const COGNITIVE_ACTIONS = [
  "recognize_core_claim",
  "distinguish_boundary",
  "apply_to_scenario",
  "map_relationship"
];
export const ASSESSMENT_PURPOSES = [
  "light_understanding",
  "scenario_application",
  "boundary_clarification",
  "relationship_matching"
];
export const ASSESSMENT_RELATION_TYPES = [
  "layer_role",
  "type_meaning",
  "step_purpose",
  "signal_action",
  "role_responsibility",
  "boundary_contrast",
  "scenario_effect"
];

export const ASSESSMENT_PLAN_PROMPT_SCHEMA = {
  name: ASSESSMENT_PLAN_PROMPT_SCHEMA_NAME,
  type: "object",
  required: ["unitId", "recommendedTasks", "selectedTasks"],
  properties: {
    unitId: { type: "string" },
    recommendedTasks: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "fitScore", "cognitiveAction", "reason"],
        properties: {
          type: { enum: ASSESSMENT_TASK_TYPES },
          fitScore: { type: "number" },
          cognitiveAction: { enum: COGNITIVE_ACTIONS },
          reason: { type: "string" }
        }
      }
    },
    selectedTasks: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "type", "purpose", "cognitiveAction", "practiceGoalId", "sourceAnchorId"],
        properties: {
          id: { type: "string" },
          type: { enum: ASSESSMENT_TASK_TYPES },
          purpose: { enum: ASSESSMENT_PURPOSES },
          cognitiveAction: { enum: COGNITIVE_ACTIONS },
          practiceGoalId: { type: "string" },
          relationType: { enum: ASSESSMENT_RELATION_TYPES },
          sourceAnchorId: { type: "string" }
        }
      }
    }
  }
};

export function validateAssessmentPlanOutput(output, { unitId, sourceAnchorId } = {}) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["assessmentPlan output must be an object"]);
  }

  requireFields(output, ["unitId", "recommendedTasks", "selectedTasks"], "assessmentPlan", errors);

  if (unitId && output.unitId !== unitId) {
    errors.push(`assessmentPlan.unitId must match ${unitId}`);
  }

  validateRecommendedTasks(output.recommendedTasks, errors);
  validateSelectedTasks(output.selectedTasks, { sourceAnchorId, errors });

  return createValidationResult(errors);
}

function validateRecommendedTasks(tasks, errors) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    errors.push("assessmentPlan.recommendedTasks must be a non-empty array");
    return;
  }

  tasks.forEach((task, index) => {
    const path = `assessmentPlan.recommendedTasks[${index}]`;
    if (!isPlainObject(task)) {
      errors.push(`${path} must be an object`);
      return;
    }
    requireFields(task, ["type", "fitScore", "cognitiveAction", "reason"], path, errors);
    if (task.type && !ASSESSMENT_TASK_TYPES.includes(task.type)) {
      errors.push(`${path}.type must be multiple_choice or matching`);
    }
    if (task.cognitiveAction && !COGNITIVE_ACTIONS.includes(task.cognitiveAction)) {
      errors.push(`${path}.cognitiveAction must be one of ${COGNITIVE_ACTIONS.join(", ")}`);
    }
  });
}

function validateSelectedTasks(tasks, { sourceAnchorId, errors }) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    errors.push("assessmentPlan.selectedTasks must be a non-empty array");
    return;
  }

  validateUniqueIds(tasks, "assessmentPlan.selectedTasks", errors);

  tasks.forEach((task, index) => {
    const path = `assessmentPlan.selectedTasks[${index}]`;
    if (!isPlainObject(task)) {
      errors.push(`${path} must be an object`);
      return;
    }
    requireFields(task, ["id", "type", "purpose", "cognitiveAction", "practiceGoalId", "sourceAnchorId"], path, errors);
    if (sourceAnchorId && task.sourceAnchorId !== sourceAnchorId) {
      errors.push(`${path}.sourceAnchorId must match ${sourceAnchorId}`);
    }
    if (task.type === "matching" && !ASSESSMENT_RELATION_TYPES.includes(task.relationType)) {
      errors.push(`${path}.relationType is required for matching tasks`);
    }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/prompts/promptSchemas.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add experiments/shibei-v2/backend/src/v2/generation/prompts/assessmentPlan.js experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js
git commit -m "feat(v2): add assessment plan schema"
```

## Task 3: Add Prompt Messages for the New Pyramid Stages

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`

- [ ] **Step 1: Write failing prompt tests**

Add tests:

```js
test("unitLearningSpec prompt asks for knowledge shape without generating questions", () => {
  const messages = buildV2PromptMessages("unitLearningSpec", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    blocks: [{ id: "p-001", type: "paragraph", text: "DMC 模型分为动力、机制和组件三层。" }],
    unit: {
      id: "unit-3",
      title: "DMC 模型",
      sourceAnchor: { id: "anchor-unit-3", blockIds: ["p-001"] }
    }
  });

  assert.match(messages.user, /knowledgeShape/);
  assert.match(messages.user, /layered_framework/);
  assert.match(messages.user, /不生成题目/);
});

test("assessmentPlan prompt treats layered frameworks as matching-friendly", () => {
  const messages = buildV2PromptMessages("assessmentPlan", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    blocks: [{ id: "p-001", type: "paragraph", text: "DMC 模型分为动力、机制和组件三层。" }],
    unit: unitFixture(),
    learningSpec: {
      unitId: "unit-01",
      learningObject: "DMC 三层模型",
      knowledgeShape: "layered_framework",
      learningClaim: "区分三层作用",
      commonMisconceptions: ["只盯着组件层"],
      relations: [
        { id: "rel-1", left: "动力层", right: "定义体验方向", relationType: "layer_role" },
        { id: "rel-2", left: "机制层", right: "组织参与循环", relationType: "layer_role" },
        { id: "rel-3", left: "组件层", right: "呈现可见功能", relationType: "layer_role" }
      ],
      sourceAnchorId: "anchor-unit-01"
    }
  });

  assert.match(messages.user, /分层模型/);
  assert.match(messages.user, /优先考虑 matching/);
  assert.match(messages.user, /三组核心关系/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/prompts/buildV2PromptMessages.test.js
```

Expected: FAIL because stages are unsupported.

- [ ] **Step 3: Implement prompt message builders**

Add stage routing:

```js
if (stage === "unitLearningSpec") return buildUnitLearningSpecMessages(payload);
if (stage === "assessmentPlan") return buildAssessmentPlanMessages(payload);
```

Add `buildUnitLearningSpecMessages`:

```js
function buildUnitLearningSpecMessages({ article, source, blocks, unit }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：unitLearningSpec。",
      "任务：分析当前知识点的学习对象、知识形状、学习主张、常见误区和可匹配关系；不生成题目。",
      "参考思想：Evidence-Centered Design。先明确 learningClaim，再思考什么表现可以证明用户理解。",
      "knowledgeShape 可选：core_concept、boundary_rule、process_steps、layered_framework、type_set、signal_set、role_boundary、scenario_rule。",
      "如果知识点是 DMC 这类分层模型，应标记为 layered_framework，并在 relations 中列出层级与对应设计作用。",
      "relations 只记录真实有学习价值的关系，不为凑数制造弱关系。",
      "",
      `当前 unit:\\n${JSON.stringify(unit, null, 2)}`,
      "",
      renderSource(source, blocks),
      "",
      renderArticleMeta(article)
    ].join("\\n")
  };
}
```

Add `buildAssessmentPlanMessages`:

```js
function buildAssessmentPlanMessages({ article, source, blocks, unit, learningSpec }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：assessmentPlan。",
      "任务：根据 learningSpec 选择当前知识点最适合的 2 个练习任务；不生成题干、选项或答案。",
      "语气规则：这里做教学判断，不使用过度保守的“只有/只允许”过滤。格式限制才是硬约束。",
      "题型适配偏好：",
      "- layered_framework、type_set、process_steps、signal_set、role_boundary 通常适合 matching。",
      "- boundary_rule 和 scenario_rule 通常适合 scenario_application multiple_choice。",
      "- core_concept 通常适合 light_understanding multiple_choice。",
      "- 如果三组核心关系非常强，且 UI 需要四组 matching，可以补一组整体作用、设计风险或常见误区作为高价值第四组。",
      "- 模型层级 -> 对应作用 是好 matching，不属于机械名词解释。",
      "输出必须包含 recommendedTasks 和 selectedTasks。selectedTasks 不写死数量；先根据 learningClaim 和 evidenceNeed 选择有价值的 task，再说明每个 task 为什么存在。",
      "",
      `当前 unit:\\n${JSON.stringify(unit, null, 2)}`,
      "",
      `learningSpec:\\n${JSON.stringify(learningSpec, null, 2)}`,
      "",
      renderSource(source, blocks),
      "",
      renderArticleMeta(article)
    ].join("\\n")
  };
}
```

- [ ] **Step 4: Run prompt tests**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/prompts/buildV2PromptMessages.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js
git commit -m "feat(v2): add pyramid prompt stages"
```

## Task 4: Wire New Stages into Model Caller

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.test.js`

- [ ] **Step 1: Write failing model caller test**

Add or update test to assert `unitLearningSpec` and `assessmentPlan` stage schemas are accepted.

```js
test("supports unit learning spec and assessment plan stages", async () => {
  const calls = [];
  const caller = createModelPromptCaller({
    transport: async ({ schemaName }) => {
      calls.push(schemaName);
      return { unitId: "unit-1", learningObject: "x", knowledgeShape: "core_concept", learningClaim: "x", commonMisconceptions: [], relations: [], sourceAnchorId: "a1" };
    }
  });

  await caller("unitLearningSpec", {});
  assert.deepEqual(calls, ["shibei_v2_unit_learning_spec"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/modelPromptCaller.test.js
```

Expected: FAIL because schema map does not include the new stages.

- [ ] **Step 3: Register schemas**

In `modelPromptCaller.js`, import:

```js
import {
  UNIT_LEARNING_SPEC_PROMPT_SCHEMA,
  validateUnitLearningSpecOutput
} from "./prompts/unitLearningSpec.js";
import {
  ASSESSMENT_PLAN_PROMPT_SCHEMA,
  validateAssessmentPlanOutput
} from "./prompts/assessmentPlan.js";
```

Add to stage schema map:

```js
unitLearningSpec: {
  schema: UNIT_LEARNING_SPEC_PROMPT_SCHEMA,
  validate: validateUnitLearningSpecOutput,
  maxOutputTokens: 1800
},
assessmentPlan: {
  schema: ASSESSMENT_PLAN_PROMPT_SCHEMA,
  validate: validateAssessmentPlanOutput,
  maxOutputTokens: 1800
}
```

- [ ] **Step 4: Run model caller test**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/modelPromptCaller.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.test.js
git commit -m "feat(v2): register pyramid prompt schemas"
```

## Task 5: Rewire Generation Orchestration

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`

- [ ] **Step 1: Write failing orchestration test for DMC-like matching**

Add test:

```js
test("plans matching for layered framework units before drafting questions", async () => {
  const calledStages = [];
  const reviewPath = await generateReviewPathV2({
    article: ARTICLE_INPUT,
    promptCaller: async (stage, payload) => {
      calledStages.push(stage);
      return layeredFrameworkPromptCaller(stage, payload);
    }
  });

  assert.deepEqual(calledStages, [
    "sourceMap",
    "reviewPathPlan",
    "unitLearningSpec",
    "assessmentPlan",
    "multipleChoiceDraft",
    "matchingDraft",
    "unitSummaryDraft",
    "qualityJudge"
  ]);
  assert.deepEqual(
    reviewPath.units[0].questions.map((question) => question.type),
    ["multiple_choice", "matching"]
  );
});
```

Add helper:

```js
async function layeredFrameworkPromptCaller(stage, payload) {
  if (stage === "unitLearningSpec") {
    return {
      unitId: payload.unit.id,
      learningObject: "DMC 三层模型",
      knowledgeShape: "layered_framework",
      learningClaim: "区分三层各自设计作用。",
      commonMisconceptions: ["只盯着组件层。"],
      relations: [
        { id: "rel-1", left: "动力层", right: "定义体验方向", relationType: "layer_role" },
        { id: "rel-2", left: "机制层", right: "组织参与循环", relationType: "layer_role" },
        { id: "rel-3", left: "组件层", right: "呈现可见功能", relationType: "layer_role" }
      ],
      sourceAnchorId: payload.unit.sourceAnchor.id
    };
  }

  if (stage === "assessmentPlan") {
    return {
      unitId: payload.unit.id,
      recommendedTasks: [
        { type: "matching", fitScore: 0.9, cognitiveAction: "map_relationship", reason: "分层模型适合匹配层级和作用。" },
        { type: "multiple_choice", fitScore: 0.7, cognitiveAction: "apply_to_scenario", reason: "也适合场景判断。" }
      ],
      selectedTasks: [
        { id: "qp-1", type: "multiple_choice", purpose: "light_understanding", cognitiveAction: "recognize_core_claim", practiceGoalId: "pg-1", sourceAnchorId: payload.unit.sourceAnchor.id },
        { id: "qp-2", type: "matching", purpose: "relationship_matching", cognitiveAction: "map_relationship", practiceGoalId: "pg-2", relationType: "layer_role", sourceAnchorId: payload.unit.sourceAnchor.id }
      ]
    };
  }

  return happyPathPromptCaller(stage, payload, { matching: true });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/generateReviewPathV2.test.js
```

Expected: FAIL because orchestration does not call new stages.

- [ ] **Step 3: Update orchestration**

In `generateReviewPathV2.js`, after `reviewPathPlan` and before drafting questions:

```js
const learningSpec = await callAndValidate(
  activePromptCaller,
  "unitLearningSpec",
  {
    article,
    source: sourceMap.source,
    blocks: sourceMap.blocks,
    unit: plannedUnit
  },
  (output) =>
    validateUnitLearningSpecOutput(output, {
      unitId: plannedUnit.id,
      sourceAnchorId: plannedUnit.sourceAnchor.id
    })
);

const assessmentPlan = await callAndValidate(
  activePromptCaller,
  "assessmentPlan",
  {
    article,
    source: sourceMap.source,
    blocks: sourceMap.blocks,
    unit: plannedUnit,
    learningSpec
  },
  (output) =>
    validateAssessmentPlanOutput(output, {
      unitId: plannedUnit.id,
      sourceAnchorId: plannedUnit.sourceAnchor.id
    })
);
```

Pass `assessmentPlan.selectedTasks` to `multipleChoiceDraft` and `matchingDraft` where current code uses `practicePlan.questionPlans`. Store both `learningSpec` and `assessmentPlan` in `generationMeta`.

- [ ] **Step 4: Run orchestration tests**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/generateReviewPathV2.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js
git commit -m "feat(v2): wire pyramid generation stages"
```

## Task 6: Update Draft Prompts to Consume Structured Plans

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/multipleChoiceDraft.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/matchingDraft.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`

- [ ] **Step 1: Write failing matching plan test for three-core-plus-one**

Add test:

```js
test("validates matching drafts that add one high-value supplement to three core relations", () => {
  const plan = assessmentPlanFixtureWithMatching();
  const result = validateMatchingDraftOutput(
    {
      unitId: "unit-3",
      questions: [
        {
          id: "qp-2",
          type: "matching",
          practiceGoalId: "pg-2",
          relationType: "layer_role",
          relationGoal: "匹配 DMC 三层和对应设计作用，并识别组件堆砌误区。",
          stem: "把 DMC 三层和对应设计作用匹配起来。",
          leftItems: [
            { id: "L1", text: "动力层" },
            { id: "L2", text: "机制层" },
            { id: "L3", text: "组件层" },
            { id: "L4", text: "只堆组件" }
          ],
          rightItems: [
            { id: "R1", text: "定义体验方向" },
            { id: "R2", text: "组织参与循环" },
            { id: "R3", text: "呈现可见功能" },
            { id: "R4", text: "容易忽略目标和机制" }
          ],
          pairs: [
            { leftId: "L1", rightId: "R1" },
            { leftId: "L2", rightId: "R2" },
            { leftId: "L3", rightId: "R3" },
            { leftId: "L4", rightId: "R4" }
          ],
          explanation: "DMC 不是组件清单，而是从体验方向到参与循环再到可见功能的分层框架。",
          sourceAnchorId: "anchor-unit-3"
        }
      ]
    },
    { unitId: "unit-3", plans: plan.selectedTasks, sourceAnchorId: "anchor-unit-3" }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});
```

- [ ] **Step 2: Run prompt schema tests**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/prompts/promptSchemas.test.js
```

Expected: PASS if validators already support it; otherwise adjust validators to accept `selectedTasks`.

- [ ] **Step 3: Update matching prompt wording**

In `buildMatchingDraftMessages`, replace overly prohibitive wording with:

```text
题型判断来自 assessmentPlan；本阶段不要重新否定题型。
如果 relations 中有三组核心关系，且 UI 需要四组，可以补一组高价值整体判断、设计风险或常见误区。
模型层级 -> 对应作用 是高价值 matching，不属于机械名词解释。
避免空泛同义词互换，例如“概念 -> 概念的定义”。
```

- [ ] **Step 4: Update multiple choice prompt wording**

Ensure multiple choice receives `learningSpec` and `assessmentPlan`:

```text
题目必须服务 selectedTask.cognitiveAction。
干扰项优先来自 learningSpec.commonMisconceptions。
不要把题目写成原文回忆。
```

- [ ] **Step 5: Run check**

Run:

```bash
npm --prefix experiments/shibei-v2/backend run check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js experiments/shibei-v2/backend/src/v2/generation/prompts/multipleChoiceDraft.js experiments/shibei-v2/backend/src/v2/generation/prompts/matchingDraft.js experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js
git commit -m "feat(v2): align draft prompts with learning specs"
```

## Task 7: Improve Quality Report for Human Comparison

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js`

- [ ] **Step 1: Write failing report test**

Add assertion that HTML contains:

```js
assert.match(html, /knowledge shape:/);
assert.match(html, /task fit:/);
assert.match(html, /selected reason:/);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/tests/v2QualityExperiment.test.js
```

Expected: FAIL.

- [ ] **Step 3: Render learning spec and assessment metadata**

In the report renderer, read:

```js
const learningSpecs = report.chapter.generationMeta?.unitLearningSpecs ?? [];
const assessmentPlans = report.chapter.generationMeta?.assessmentPlans ?? [];
```

For each unit/question, render:

```html
<div class="meta">knowledge shape: ${escapeHtml(learningSpec?.knowledgeShape || "unknown")}</div>
<div class="meta">task fit: ${escapeHtml(selectedTask?.cognitiveAction || "unknown")}</div>
<div class="meta">selected reason: ${escapeHtml(selectedTaskReason || "")}</div>
```

- [ ] **Step 4: Run report test**

Run:

```bash
npm --prefix experiments/shibei-v2/backend test -- src/v2/generation/tests/v2QualityExperiment.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js
git commit -m "feat(v2): expose prompt planning diagnostics"
```

## Task 8: Document the New Chain

**Files:**
- Modify: `experiments/shibei-v2/docs/v2-prompt-field-rules-zh.md`
- Modify: `experiments/shibei-v2/docs/v2-prompt-quality-gap-audit-zh.md`

- [ ] **Step 1: Update field rules**

Add a section:

```md
## 金字塔式生成链路

V2 prompt 不应直接从 unit 生成题目。正式链路为：

1. `sourceMap`
2. `reviewPathPlan`
3. `unitLearningSpec`
4. `assessmentPlan`
5. `multipleChoiceDraft` / `matchingDraft`
6. `unitSummaryDraft`
7. `qualityJudge`

`unitLearningSpec` 决定知识形状和误区；`assessmentPlan` 决定题型；draft 阶段只负责按计划生成用户可见题目。
```

- [ ] **Step 2: Update gap audit**

Add note:

```md
本轮 DMC 未生成 matching 的根因不是 `matchingDraft` 失败，而是 `assessmentPlan` 前身 `unitPracticePlan` 在题型规划阶段选择了两道选择题。后续用 `knowledgeShape: layered_framework` 和 `taskAffordance` 修正题型选择。
```

- [ ] **Step 3: Commit**

```bash
git add experiments/shibei-v2/docs/v2-prompt-field-rules-zh.md experiments/shibei-v2/docs/v2-prompt-quality-gap-audit-zh.md
git commit -m "docs(v2): document pyramid prompt chain"
```

## Task 9: Run Same-Article Regression

**Files:**
- Generated: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs/*.json`
- Generated: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/reports/*.html`

- [ ] **Step 1: Run backend check**

Run:

```bash
npm --prefix experiments/shibei-v2/backend run check
```

Expected: PASS.

- [ ] **Step 2: Run the same golden article**

Use the existing quality runner and the same article slug. Do not paste API keys into shell history or docs.

Run with environment variables already configured in the local shell:

```bash
QUALITY_ARTICLE_URL="https://mp.weixin.qq.com/s/_WY2GXs-iynGePgdsYLi0A" \
QUALITY_EXPERIMENT_SLUG="_WY2GXs-iynGePgdsYLi0A" \
QUALITY_EXPERIMENT_LABEL="v2-pyramid-prompt-first-run" \
npm --prefix experiments/shibei-v2/backend run quality:v2-single
```

Expected:

- New JSON appears under `quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs/`.
- New HTML appears under `quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/reports/`.

- [ ] **Step 3: Inspect DMC unit**

Open the new HTML report and verify:

- DMC unit has `knowledge shape: layered_framework`.
- DMC second task is matching or report explains why not.
- If matching exists, it is “层级 -> 对应作用” rather than weak definition matching.

- [ ] **Step 4: Compare against golden HTML**

Open:

```text
http://127.0.0.1:51851/gamification-ux-v2-flow-simulation.html
```

Compare:

- Unit count and unit boundaries.
- DMC matching presence.
- Stem length and option length.
- Scenario value.
- Distractor misconception quality.

- [ ] **Step 5: Record run summary**

Append to the article run README or quality notes:

```md
## v2-pyramid-prompt-first-run

Hypothesis: Moving knowledge-shape and assessment planning before drafting should recover high-value matching for layered frameworks such as DMC.

Key checks:
- DMC matching:
- Forbidden phrase count:
- Matching count:
- Scenario count:
- Obvious bad distractors:

Conclusion:

Next experiment:
```

- [ ] **Step 6: Commit generated report if useful**

```bash
git add experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A
git commit -m "test(v2): record pyramid prompt quality run"
```

## Self-Review Checklist

- [ ] The plan does not add a quality rewrite/auditor role to the main chain.
- [ ] DMC matching failure is addressed at the planning stage, not patched in `matchingDraft` only.
- [ ] ECD concepts appear as fields: learning claim, evidence need, task affordance.
- [ ] Bloom is used as cognitive action vocabulary, not as a rigid school-test pyramid.
- [ ] Prompt wording separates hard constraints from teaching preferences.
- [ ] Every new stage has schema, validator, prompt test, orchestration test, and report visibility.

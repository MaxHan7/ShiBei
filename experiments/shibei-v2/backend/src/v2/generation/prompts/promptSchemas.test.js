import assert from "node:assert/strict";
import test from "node:test";

import {
  ECD_PLANNING_OUTPUT_SCHEMA,
  normalizeEcdPlanningOutput,
  validateEcdPlanningOutput
} from "./ecdPlanning.js";
import {
  MATCHING_DRAFT_OUTPUT_SCHEMA,
  validateMatchingDraftOutput
} from "./matchingDraft.js";
import {
  MULTIPLE_CHOICE_DRAFT_OUTPUT_SCHEMA,
  validateMultipleChoiceDraftOutput
} from "./multipleChoiceDraft.js";
import {
  QUALITY_JUDGE_OUTPUT_SCHEMA,
  validateQualityJudgeOutput
} from "./qualityJudge.js";
import {
  REVIEW_PATH_PLAN_OUTPUT_SCHEMA,
  validateReviewPathPlanOutput
} from "./reviewPathPlan.js";
import {
  SOURCE_MAP_OUTPUT_SCHEMA,
  validateSourceMapOutput
} from "./sourceMap.js";
import {
  UNIT_PRACTICE_PLAN_OUTPUT_SCHEMA,
  validateUnitPracticePlanOutput
} from "./unitPracticePlan.js";
import {
  UNIT_SUMMARY_DRAFT_OUTPUT_SCHEMA,
  validateUnitSummaryDraftOutput
} from "./unitSummaryDraft.js";

test("exports stable prompt schema names for the V2 generation pipeline", () => {
  assert.equal(SOURCE_MAP_OUTPUT_SCHEMA.name, "shibei_v2_source_map");
  assert.equal(ECD_PLANNING_OUTPUT_SCHEMA.name, "shibei_v2_ecd_planning");
  assert.equal(REVIEW_PATH_PLAN_OUTPUT_SCHEMA.name, "shibei_v2_review_path_plan");
  assert.equal(UNIT_PRACTICE_PLAN_OUTPUT_SCHEMA.name, "shibei_v2_unit_practice_plan");
  assert.equal(MULTIPLE_CHOICE_DRAFT_OUTPUT_SCHEMA.name, "shibei_v2_multiple_choice_draft");
  assert.equal(MATCHING_DRAFT_OUTPUT_SCHEMA.name, "shibei_v2_matching_draft");
  assert.equal(UNIT_SUMMARY_DRAFT_OUTPUT_SCHEMA.name, "shibei_v2_unit_summary_draft");
  assert.equal(QUALITY_JUDGE_OUTPUT_SCHEMA.name, "shibei_v2_quality_judge");
});

test("ECD planning schema exposes nested fields needed by the shadow stage contract", () => {
  const schema = ECD_PLANNING_OUTPUT_SCHEMA;
  const articleUnderstanding = schema.properties.articleUnderstanding;
  const knowledgeUnit = schema.properties.knowledgeModel.properties.units.items;
  const evidenceNeed = schema.properties.unitEvidenceNeeds.items;
  const selectedTask = schema.properties.unitAssemblyPlan.items.properties.selectedTasks.items;

  assert.deepEqual(articleUnderstanding.required, [
    "coreThesis",
    "articleStructure",
    "reviewableSections",
    "nonReviewableSections"
  ]);
  assert.ok(knowledgeUnit.required.includes("knowledgeShape"));
  assert.ok(knowledgeUnit.properties.knowledgeShape.enum.includes("layered_framework"));
  assert.ok(evidenceNeed.required.includes("observableResponse"));
  assert.ok(selectedTask.required.includes("assemblyReason"));
  assert.ok(selectedTask.properties.taskPurpose.enum.includes("layer_role_matching"));
});

test("validates source map blocks with stable ids and supported block types", () => {
  const result = validateSourceMapOutput({
    source: {
      type: "article",
      title: "Hook 的工作流",
      author: "MetaTown",
      url: "https://example.com"
    },
    blocks: [
      { id: "p-001", type: "heading", text: "Hook 是什么" },
      { id: "p-002", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ]
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("rejects source map output with duplicated source block ids", () => {
  const result = validateSourceMapOutput({
    source: { type: "article", title: "重复 id" },
    blocks: [
      { id: "p-001", type: "paragraph", text: "第一段" },
      { id: "p-001", type: "paragraph", text: "第二段" }
    ]
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /id must be unique/);
});

test("validates review path plans against known source block ids", () => {
  const result = validateReviewPathPlanOutput(
    {
      title: "Hook 的工作流",
      summaryCard: { text: "Hook 把关键动作变成稳定流程。" },
      units: [
        {
          id: "unit-01",
          order: 1,
          title: "Hook 是什么",
          nodeLabel: "流程控制",
          shortSummary: "Hook 是流程控制器。",
          detailSummary: "Hook 在关键动作前后加入规则、上下文和验证。",
          why: "这是理解后续场景的基础。",
          sourceAnchor: {
            id: "anchor-unit-01",
            blockIds: ["p-002"],
            quote: "Hook 是关键动作前后的流程控制器。"
          }
        }
      ],
      chapterSummary: {
        encouragementText: "你已经掌握了 Hook 作为流程约束的基本判断。"
      }
    },
    { sourceBlockIds: new Set(["p-001", "p-002"]) }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("rejects review path plans that point anchors at missing source blocks", () => {
  const result = validateReviewPathPlanOutput(
    {
      title: "Hook 的工作流",
      summaryCard: { text: "Hook 把关键动作变成稳定流程。" },
      units: [
        {
          id: "unit-01",
          order: 1,
          title: "Hook 是什么",
          nodeLabel: "流程控制",
          shortSummary: "Hook 是流程控制器。",
          detailSummary: "Hook 在关键动作前后加入规则、上下文和验证。",
          why: "这是理解后续场景的基础。",
          sourceAnchor: { id: "anchor-unit-01", blockIds: ["missing-block"] }
        }
      ],
      chapterSummary: { encouragementText: "继续向前。" }
    },
    { sourceBlockIds: new Set(["p-001"]) }
  );

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /references missing source block missing-block/);
});

test("validates ECD planning output with claim evidence task and assembly links", () => {
  const result = validateEcdPlanningOutput(ecdPlanningFixture(), {
    unitIds: new Set(["unit-03"]),
    sourceAnchorIds: new Set(["anchor-unit-03"])
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

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
  assert.match(result.errors.join("\n"), /evidenceIds\[0\] must reference a unitEvidenceNeeds item/);
  assert.match(result.errors.join("\n"), /taskPlanId must reference a unitTaskPlan item/);
});

test("normalizes unknown ECD taxonomy labels without dropping the model signal", () => {
  const fixture = ecdPlanningFixture();
  fixture.knowledgeModel.units[0].knowledgeShape = "design_model";
  fixture.unitLearningClaims[0].claimType = "relationship_understanding";
  fixture.unitEvidenceNeeds[0].evidenceType = "classify_model_layer";
  fixture.unitTaskPlan[0].taskPurpose = "model_layer_matching";
  fixture.unitAssemblyPlan[0].selectedTasks[0].taskPurpose = "model_layer_matching";

  const normalized = normalizeEcdPlanningOutput(fixture);

  assert.equal(normalized.knowledgeModel.units[0].knowledgeShape, "core_concept");
  assert.equal(normalized.knowledgeModel.units[0].originalKnowledgeShape, "design_model");
  assert.equal(normalized.unitLearningClaims[0].claimType, "source_grounded_understanding");
  assert.equal(normalized.unitLearningClaims[0].originalClaimType, "relationship_understanding");
  assert.equal(normalized.unitEvidenceNeeds[0].evidenceType, "ground_answer_in_source");
  assert.equal(normalized.unitEvidenceNeeds[0].originalEvidenceType, "classify_model_layer");
  assert.equal(normalized.unitTaskPlan[0].taskPurpose, "light_understanding");
  assert.equal(normalized.unitTaskPlan[0].originalTaskPurpose, "model_layer_matching");
  assert.equal(normalized.unitAssemblyPlan[0].selectedTasks[0].taskPurpose, "light_understanding");
  assert.equal(normalized.unitAssemblyPlan[0].selectedTasks[0].originalTaskPurpose, "model_layer_matching");

  const result = validateEcdPlanningOutput(normalized, {
    unitIds: new Set(["unit-03"]),
    sourceAnchorIds: new Set(["anchor-unit-03"])
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validates unit practice plans with variable question plan counts", () => {
  const result = validateUnitPracticePlanOutput(
    unitPracticePlanFixture(),
    { unitId: "unit-01", sourceAnchorId: "anchor-unit-01" }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("rejects matching question plans without relationType", () => {
  const plan = unitPracticePlanFixture();
  delete plan.questionPlans[1].relationType;
  const result = validateUnitPracticePlanOutput(
    plan,
    { unitId: "unit-01", sourceAnchorId: "anchor-unit-01" }
  );

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /relationType is required for matching plans/);
});

test("validates multiple choice drafts against question plans", () => {
  const result = validateMultipleChoiceDraftOutput(
    {
      unitId: "unit-01",
      questions: [multipleChoiceQuestionFixture()]
    },
    {
      unitId: "unit-01",
      sourceAnchorId: "anchor-unit-01",
      plans: unitPracticePlanFixture().questionPlans.filter((plan) => plan.id !== "q-003")
    }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("rejects multiple choice drafts that do not match the practice plan", () => {
  const question = multipleChoiceQuestionFixture();
  question.id = "unexpected";
  question.options = question.options.slice(0, 3);
  const result = validateMultipleChoiceDraftOutput(
    {
      unitId: "unit-01",
      questions: [question]
    },
    {
      unitId: "unit-01",
      sourceAnchorId: "anchor-unit-01",
      plans: [{ id: "q-001", type: "multiple_choice" }]
    }
  );

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /id must match a multiple_choice question plan id/);
  assert.match(result.errors.join("\n"), /options must contain exactly 4 options/);
});

test("validates matching drafts against question plans", () => {
  const result = validateMatchingDraftOutput(
    {
      unitId: "unit-01",
      questions: [matchingQuestionFixture()]
    },
    {
      unitId: "unit-01",
      sourceAnchorId: "anchor-unit-01",
      plans: unitPracticePlanFixture().questionPlans
    }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validates unit summary drafts", () => {
  const result = validateUnitSummaryDraftOutput(
    {
      unitId: "unit-01",
      overview: { text: "Hook 不是提示词，而是稳定触发的流程约束。" },
      summary: {
        title: "单元完成",
        text: "你已经理解 Hook 的基本机制。"
      }
    },
    { unitId: "unit-01" }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validates quality judge verdicts and structured issues", () => {
  const result = validateQualityJudgeOutput({
    verdict: "revise",
    issues: [
      {
        code: "weak_source_anchor",
        severity: "error",
        message: "题目来源片段不能支撑正确答案。",
        targetId: "q-001"
      }
    ]
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("rejects malformed quality judge output", () => {
  const result = validateQualityJudgeOutput({
    verdict: "maybe",
    issues: [{ code: "", severity: "fatal", message: "" }]
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /verdict must be pass, revise, or discard/);
  assert.match(result.errors.join("\n"), /severity must be info, warning, or error/);
});

function unitPracticePlanFixture() {
  return {
    unitId: "unit-01",
    practiceGoals: [
      {
        id: "goal-01",
        kind: "core_understanding",
        target: "理解 Hook 是流程约束",
        commonMisconception: "把 Hook 当成更长提示词",
        sourceAnchorId: "anchor-unit-01"
      },
      {
        id: "goal-02",
        kind: "relationship_mapping",
        target: "区分 Prompt、Hook、CI 的职责边界",
        commonMisconception: "把所有约束都交给 Prompt",
        sourceAnchorId: "anchor-unit-01"
      }
    ],
    questionPlans: [
      {
        id: "q-001",
        type: "multiple_choice",
        purpose: "light_understanding",
        practiceGoalId: "goal-01",
        sourceAnchorId: "anchor-unit-01"
      },
      {
        id: "q-002",
        type: "matching",
        purpose: "relationship_matching",
        practiceGoalId: "goal-02",
        relationType: "boundary",
        sourceAnchorId: "anchor-unit-01"
      },
      {
        id: "q-003",
        type: "multiple_choice",
        purpose: "misconception_check",
        practiceGoalId: "goal-01",
        sourceAnchorId: "anchor-unit-01"
      }
    ]
  };
}

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

function multipleChoiceQuestionFixture() {
  return {
    id: "q-001",
    type: "multiple_choice",
    practiceGoalId: "goal-01",
    stem: "Hook 更接近哪种机制？",
    correctUnderstanding: "Hook 是关键动作前后的固定流程约束。",
    misconception: "把 Hook 当成更长提示词。",
    options: [
      { id: "A", text: "关键动作前后的固定流程" },
      { id: "B", text: "更长的提示词" },
      { id: "C", text: "一段文章总结" },
      { id: "D", text: "单纯的 UI 操作" }
    ],
    correctOptionId: "A",
    explanation: "Hook 的重点是稳定执行，而不是模型自觉记住。",
    sourceAnchorId: "anchor-unit-01"
  };
}

function matchingQuestionFixture() {
  return {
    id: "q-002",
    type: "matching",
    practiceGoalId: "goal-02",
    relationType: "boundary",
    relationGoal: "区分 Hook 工作流里的职责边界。",
    stem: "把 Hook 工作流中的角色和作用匹配起来。",
    leftItems: [
      { id: "L1", text: "Prompt" },
      { id: "L2", text: "Hook" },
      { id: "L3", text: "CI" },
      { id: "L4", text: "规则文档" }
    ],
    rightItems: [
      { id: "R1", text: "为模型提供任务上下文" },
      { id: "R2", text: "在关键动作前后稳定执行" },
      { id: "R3", text: "在交付前验证结果是否达标" },
      { id: "R4", text: "把反复提醒沉淀成规则" }
    ],
    pairs: [
      { leftId: "L1", rightId: "R1" },
      { leftId: "L2", rightId: "R2" },
      { leftId: "L3", rightId: "R3" },
      { leftId: "L4", rightId: "R4" }
    ],
    explanation: "这组关系区分的是流程中的职责边界，不是背名词定义。",
    sourceAnchorId: "anchor-unit-01"
  };
}

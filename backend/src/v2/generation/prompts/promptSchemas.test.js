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
  MATCHING_DRAFT_BATCH_OUTPUT_SCHEMA,
  validateMatchingDraftBatchOutput
} from "./matchingDraftBatch.js";
import {
  MULTIPLE_CHOICE_DRAFT_OUTPUT_SCHEMA,
  validateMultipleChoiceDraftOutput
} from "./multipleChoiceDraft.js";
import {
  MULTIPLE_CHOICE_DRAFT_BATCH_OUTPUT_SCHEMA,
  validateMultipleChoiceDraftBatchOutput
} from "./multipleChoiceDraftBatch.js";
import {
  MULTIPLE_CHOICE_DRAFT_UNIT_BATCH_OUTPUT_SCHEMA,
  validateMultipleChoiceDraftUnitBatchOutput
} from "./multipleChoiceDraftUnitBatch.js";
import {
  QUALITY_JUDGE_OUTPUT_SCHEMA,
  validateQualityJudgeOutput
} from "./qualityJudge.js";
import {
  QUESTION_DRAFT_BATCH_OUTPUT_SCHEMA,
  validateQuestionDraftBatchOutput
} from "./questionDraftBatch.js";
import {
  normalizeReviewPathPlanOutput,
  REVIEW_PATH_PLAN_OUTPUT_SCHEMA,
  validateReviewPathPlanOutput
} from "./reviewPathPlan.js";
import {
  SOURCE_MAP_OUTPUT_SCHEMA,
  validateSourceMapOutput
} from "./sourceMap.js";
import {
  normalizeTaskBriefPlanOutput,
  TASK_BRIEF_PLAN_OUTPUT_SCHEMA,
  validateTaskBriefPlanOutput
} from "./taskBriefPlan.js";
import {
  normalizeUnitKnowledgeMapOutput,
  UNIT_KNOWLEDGE_MAP_OUTPUT_SCHEMA,
  validateUnitKnowledgeMapOutput
} from "./unitKnowledgeMap.js";
import {
  UNIT_COPY_BATCH_OUTPUT_SCHEMA,
  validateUnitCopyBatchOutput
} from "./unitCopyBatch.js";
import {
  normalizeQuestionPlanPurpose,
  normalizeUnitPracticePlanOutput,
  UNIT_PRACTICE_PLAN_OUTPUT_SCHEMA,
  validateUnitPracticePlanOutput
} from "./unitPracticePlan.js";
import {
  UNIT_SUMMARY_DRAFT_OUTPUT_SCHEMA,
  validateUnitSummaryDraftOutput
} from "./unitSummaryDraft.js";

test("exports stable prompt schema names for the V2 generation pipeline", () => {
  assert.equal(SOURCE_MAP_OUTPUT_SCHEMA.name, "shibei_v2_source_map");
  assert.equal(UNIT_KNOWLEDGE_MAP_OUTPUT_SCHEMA.name, "shibei_v2_unit_knowledge_map");
  assert.equal(ECD_PLANNING_OUTPUT_SCHEMA.name, "shibei_v2_ecd_planning");
  assert.equal(TASK_BRIEF_PLAN_OUTPUT_SCHEMA.name, "shibei_v2_task_brief_plan");
  assert.equal(QUESTION_DRAFT_BATCH_OUTPUT_SCHEMA.name, "shibei_v2_question_draft_batch");
  assert.equal(MULTIPLE_CHOICE_DRAFT_BATCH_OUTPUT_SCHEMA.name, "shibei_v2_multiple_choice_draft_batch");
  assert.equal(MULTIPLE_CHOICE_DRAFT_UNIT_BATCH_OUTPUT_SCHEMA.name, "shibei_v2_multiple_choice_draft_unit_batch");
  assert.equal(MATCHING_DRAFT_BATCH_OUTPUT_SCHEMA.name, "shibei_v2_matching_draft_batch");
  assert.equal(UNIT_COPY_BATCH_OUTPUT_SCHEMA.name, "shibei_v2_unit_copy_batch");
  assert.equal(REVIEW_PATH_PLAN_OUTPUT_SCHEMA.name, "shibei_v2_review_path_plan");
  assert.equal(UNIT_PRACTICE_PLAN_OUTPUT_SCHEMA.name, "shibei_v2_unit_practice_plan");
  assert.equal(MULTIPLE_CHOICE_DRAFT_OUTPUT_SCHEMA.name, "shibei_v2_multiple_choice_draft");
  assert.equal(MATCHING_DRAFT_OUTPUT_SCHEMA.name, "shibei_v2_matching_draft");
  assert.equal(UNIT_SUMMARY_DRAFT_OUTPUT_SCHEMA.name, "shibei_v2_unit_summary_draft");
  assert.equal(QUALITY_JUDGE_OUTPUT_SCHEMA.name, "shibei_v2_quality_judge");
});

test("validates unit knowledge maps as protected micro knowledge inventory", () => {
  const result = validateUnitKnowledgeMapOutput(unitKnowledgeMapFixture(), {
    unitIds: new Set(["unit-01"]),
    sourceAnchorIds: new Set(["anchor-unit-01"])
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("rejects overlong unit knowledge map micro copy", () => {
  const fixture = unitKnowledgeMapFixture();
  fixture.units[0].microKnowledgePoints[0].summary = "过长说明".repeat(30);
  fixture.units[0].microKnowledgePoints[0].primaryEvidenceAngle = "overlong_angle".repeat(6);

  const result = validateUnitKnowledgeMapOutput(fixture, {
    unitIds: new Set(["unit-01"]),
    sourceAnchorIds: new Set(["anchor-unit-01"])
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /summary must be at most 48 characters/);
  assert.match(result.errors.join("\n"), /primaryEvidenceAngle must be at most 16 characters/);
});

test("validates multiple choice draft batches by unit practice plans", () => {
  const practicePlansByUnit = new Map([["unit-01", unitPracticePlanFixture()]]);
  const sourceAnchorByUnit = new Map([["unit-01", "anchor-unit-01"]]);
  const result = validateMultipleChoiceDraftBatchOutput(
    {
      units: [
        {
          unitId: "unit-01",
          questions: [
            multipleChoiceQuestionFixture(),
            {
              ...multipleChoiceQuestionFixture(),
              id: "q-003",
              practiceGoalId: "goal-01",
              stem: "Hook 最容易被误解成什么？"
            }
          ]
        }
      ]
    },
    { practicePlansByUnit, sourceAnchorByUnit }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validates scoped multiple choice unit batches", () => {
  const result = validateMultipleChoiceDraftUnitBatchOutput(
    {
      unitId: "unit-01",
      questions: [multipleChoiceQuestionFixture()]
    },
    {
      unitId: "unit-01",
      questionPlanIds: new Set(["q-001"]),
      sourceAnchorId: "anchor-unit-01"
    }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validates matching draft batches by unit practice plans", () => {
  const practicePlansByUnit = new Map([["unit-01", unitPracticePlanFixture()]]);
  const sourceAnchorByUnit = new Map([["unit-01", "anchor-unit-01"]]);
  const result = validateMatchingDraftBatchOutput(
    {
      units: [
        {
          unitId: "unit-01",
          questions: [matchingQuestionFixture()]
        }
      ]
    },
    { practicePlansByUnit, sourceAnchorByUnit }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("allows matching drafts to use natural 2 to 4 pair counts", () => {
  const practicePlansByUnit = new Map([["unit-01", unitPracticePlanFixture()]]);
  const sourceAnchorByUnit = new Map([["unit-01", "anchor-unit-01"]]);
  const threePairQuestion = matchingQuestionFixture();
  threePairQuestion.leftItems = threePairQuestion.leftItems.slice(0, 3);
  threePairQuestion.rightItems = threePairQuestion.rightItems.slice(0, 3);
  threePairQuestion.pairs = threePairQuestion.pairs.slice(0, 3);

  const result = validateMatchingDraftBatchOutput(
    {
      units: [
        {
          unitId: "unit-01",
          questions: [threePairQuestion]
        }
      ]
    },
    { practicePlansByUnit, sourceAnchorByUnit }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("rejects matching drafts with mismatched item and pair counts", () => {
  const practicePlansByUnit = new Map([["unit-01", unitPracticePlanFixture()]]);
  const sourceAnchorByUnit = new Map([["unit-01", "anchor-unit-01"]]);
  const mismatchedQuestion = matchingQuestionFixture();
  mismatchedQuestion.rightItems = mismatchedQuestion.rightItems.slice(0, 3);

  const result = validateMatchingDraftBatchOutput(
    {
      units: [
        {
          unitId: "unit-01",
          questions: [mismatchedQuestion]
        }
      ]
    },
    { practicePlansByUnit, sourceAnchorByUnit }
  );

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /leftItems and rightItems must contain the same number of items/);
  assert.match(result.errors.join("\n"), /pairs must contain one pair for each left\/right item/);
});

test("normalizes unit knowledge map taxonomy aliases before validation", () => {
  const fixture = unitKnowledgeMapFixture();
  fixture.units[0].microKnowledgePoints[0].role = "model_layer_classification";
  fixture.units[0].microKnowledgePoints[0].assessmentValue = "core";
  fixture.units[0].microKnowledgePoints[0].summary = "这是一段明显过长的知识索引句，应该在归一化阶段被收束，避免后续 prompt 和合同校验被冗长解释拖垮。";
  fixture.units[0].microKnowledgePoints[0].primaryEvidenceAngle = "这是一个明显过长的可观察理解角度标签";
  fixture.units[0].microKnowledgePoints[1].role = "概念边界";
  fixture.units[0].microKnowledgePoints[1].assessmentValue = "supporting";

  const normalized = normalizeUnitKnowledgeMapOutput(fixture);

  assert.equal(normalized.units[0].microKnowledgePoints[0].role, "model_layer");
  assert.equal(normalized.units[0].microKnowledgePoints[0].assessmentValue, "high");
  assert.ok(normalized.units[0].microKnowledgePoints[0].summary.length <= 48);
  assert.ok(normalized.units[0].microKnowledgePoints[0].primaryEvidenceAngle.length <= 16);
  assert.equal(normalized.units[0].microKnowledgePoints[0].rawRole, "model_layer_classification");
  assert.equal(normalized.units[0].microKnowledgePoints[0].rawAssessmentValue, "core");
  assert.equal(normalized.units[0].microKnowledgePoints[1].role, "definition");
  assert.equal(normalized.units[0].microKnowledgePoints[1].assessmentValue, "medium");
  assert.deepEqual(validateUnitKnowledgeMapOutput(normalized, {
    unitIds: new Set(["unit-01"]),
    sourceAnchorIds: new Set(["anchor-unit-01"])
  }), { ok: true, errors: [] });
});

test("rejects unit knowledge maps that omit planned units", () => {
  const result = validateUnitKnowledgeMapOutput({ units: [] }, {
    unitIds: new Set(["unit-01"]),
    sourceAnchorIds: new Set(["anchor-unit-01"])
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /units must be a non-empty array/);
});

test("ECD planning schema exposes compact target and task fields", () => {
  const schema = ECD_PLANNING_OUTPUT_SCHEMA;
  const unit = schema.properties.units.items;
  const target = unit.properties.assessableTargets.items;
  const selectedTask = unit.properties.selectedTasks.items;

  assert.deepEqual(schema.required, ["units"]);
  assert.deepEqual(unit.required, ["unitId", "sourceAnchorId", "assessableTargets", "selectedTasks"]);
  assert.ok(target.required.includes("targetId"));
  assert.ok(target.required.includes("microIds"));
  assert.ok(target.required.includes("evidenceGoal"));
  assert.ok(target.required.includes("coverageRequirement"));
  assert.ok(target.properties.evidenceType.enum.includes("map_structure_relation"));
  assert.ok(selectedTask.required.includes("targetIds"));
  assert.ok(selectedTask.required.includes("microIds"));
  assert.ok(selectedTask.required.includes("evidenceGoal"));
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
  const result = validateReviewPathPlanOutput(reviewPathPlanFixture(), {
    sourceBlockIds: new Set(["p-001", "p-002"])
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("rejects overlong review path mobile copy", () => {
  const plan = reviewPathPlanFixture();
  plan.units[0].nodeLabel = "这是一个明显超出主页节点弹窗承载范围的过长知识点标题";
  plan.units[0].detailSummary = "过长详情".repeat(50);
  plan.chapterSummary.encouragementText = "过长鼓励".repeat(40);

  const result = validateReviewPathPlanOutput(plan, {
    sourceBlockIds: new Set(["p-001", "p-002"])
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /nodeLabel must be at most 24 characters/);
  assert.match(result.errors.join("\n"), /detailSummary must be at most 180 characters/);
  assert.match(result.errors.join("\n"), /encouragementText must be at most 96 characters/);
});

test("normalizes overlong review path mobile copy before validation", () => {
  const plan = reviewPathPlanFixture();
  plan.summaryCard.text = "这是一段用于手机章节概要卡片的超长文案".repeat(8);
  plan.units[0].nodeLabel = "这是一个明显超出主页节点弹窗承载范围的过长知识点标题";
  plan.units[0].shortSummary = "这是一个过长短摘要".repeat(8);
  plan.units[0].detailSummary = "过长详情".repeat(50);
  plan.units[0].why = "过长价值说明".repeat(20);
  plan.chapterSummary.encouragementText = "过长鼓励".repeat(40);

  const normalized = normalizeReviewPathPlanOutput(plan);
  const result = validateReviewPathPlanOutput(normalized, {
    sourceBlockIds: new Set(["p-001", "p-002"])
  });

  assert.deepEqual(result, { ok: true, errors: [] });
  assert.equal(Array.from(normalized.summaryCard.text).length, 96);
  assert.equal(Array.from(normalized.units[0].nodeLabel).length, 24);
  assert.equal(Array.from(normalized.units[0].shortSummary).length, 56);
  assert.equal(Array.from(normalized.units[0].detailSummary).length, 180);
  assert.equal(Array.from(normalized.units[0].why).length, 96);
  assert.equal(Array.from(normalized.chapterSummary.encouragementText).length, 96);
});

test("rejects review path plans that point anchors at missing source blocks", () => {
  const plan = reviewPathPlanFixture();
  plan.units[0].sourceAnchor = { id: "anchor-unit-01", blockIds: ["missing-block"] };
  const result = validateReviewPathPlanOutput(plan, { sourceBlockIds: new Set(["p-001"]) });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /references missing source block missing-block/);
});

test("validates compact ECD planning output with target and selected task links", () => {
  const result = validateEcdPlanningOutput(ecdPlanningFixture(), {
    unitIds: new Set(["unit-03"]),
    sourceAnchorIds: new Set(["anchor-unit-03"])
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("allows compact ECD plans to select a variable number of tasks", () => {
  const fixture = ecdPlanningFixture();
  fixture.units[0].selectedTasks = fixture.units[0].selectedTasks.slice(0, 1);
  fixture.units[0].assessableTargets[1].coverageRequirement = "supporting";

  const result = validateEcdPlanningOutput(fixture, {
    unitIds: new Set(["unit-03"]),
    sourceAnchorIds: new Set(["anchor-unit-03"])
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("rejects compact ECD plans that skip required target coverage", () => {
  const fixture = ecdPlanningFixture();
  fixture.units[0].selectedTasks = fixture.units[0].selectedTasks.slice(0, 1);

  const result = validateEcdPlanningOutput(fixture, {
    unitIds: new Set(["unit-03"]),
    sourceAnchorIds: new Set(["anchor-unit-03"])
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /must cover required target target-03-2/);
});

test("rejects compact ECD planning output with broken selected task references", () => {
  const fixture = ecdPlanningFixture();
  fixture.units[0].selectedTasks[0].targetIds = ["missing-target"];
  fixture.units[0].selectedTasks[0].microIds = [];

  const result = validateEcdPlanningOutput(fixture, {
    unitIds: new Set(["unit-03"]),
    sourceAnchorIds: new Set(["anchor-unit-03"])
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /targetIds\[0\] must reference an assessableTargets item/);
  assert.match(result.errors.join("\n"), /microIds must be a non-empty array/);
});

test("normalizes unknown compact ECD taxonomy labels without dropping the model signal", () => {
  const fixture = ecdPlanningFixture();
  fixture.units[0].assessableTargets[0].evidenceType = "classify_model_layer";
  fixture.units[0].assessableTargets[0].coverageRequirement = "must_cover";
  fixture.units[0].selectedTasks[0].taskPurpose = "model_layer_matching";

  const normalized = normalizeEcdPlanningOutput(fixture);

  assert.equal(normalized.units[0].assessableTargets[0].evidenceType, "ground_answer_in_source");
  assert.equal(normalized.units[0].assessableTargets[0].originalEvidenceType, "classify_model_layer");
  assert.equal(normalized.units[0].assessableTargets[0].coverageRequirement, "required");
  assert.equal(normalized.units[0].assessableTargets[0].originalCoverageRequirement, "must_cover");
  assert.equal(normalized.units[0].selectedTasks[0].taskPurpose, "light_understanding");
  assert.equal(normalized.units[0].selectedTasks[0].originalTaskPurpose, "model_layer_matching");

  const result = validateEcdPlanningOutput(normalized, {
    unitIds: new Set(["unit-03"]),
    sourceAnchorIds: new Set(["anchor-unit-03"])
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("normalizes unit-scoped compact ECD source anchors back to the planned unit anchor", () => {
  const fixture = ecdPlanningFixture();
  fixture.units[0].sourceAnchorId = "p-010";
  fixture.units[0].assessableTargets[0].sourceAnchorId = "p-011";

  const normalized = normalizeEcdPlanningOutput(fixture, {
    unitSourceAnchorIds: new Map([["unit-03", "anchor-unit-03"]])
  });

  assert.equal(normalized.units[0].sourceAnchorId, "anchor-unit-03");
  assert.equal(normalized.units[0].originalSourceAnchorId, "p-010");
  assert.equal(normalized.units[0].assessableTargets[0].sourceAnchorId, "anchor-unit-03");
  assert.equal(normalized.units[0].assessableTargets[0].originalSourceAnchorId, "p-011");

  const result = validateEcdPlanningOutput(normalized, {
    unitIds: new Set(["unit-03"]),
    sourceAnchorIds: new Set(["anchor-unit-03"])
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validates unit practice plans with variable question plan counts", () => {
  const questionPlanSchema = UNIT_PRACTICE_PLAN_OUTPUT_SCHEMA.properties.questionPlans.items;
  assert.ok(questionPlanSchema.properties.targetIds);
  assert.ok(questionPlanSchema.properties.microIds);

  const result = validateUnitPracticePlanOutput(
    unitPracticePlanFixture(),
    { unitId: "unit-01", sourceAnchorId: "anchor-unit-01" }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("normalizes task brief purpose aliases before validation", () => {
  const fixture = unitPracticePlanFixture();
  fixture.questionPlans[0].purpose = "concept_understanding";
  fixture.questionPlans[1].purpose = "model_layer_matching";

  const normalized = normalizeUnitPracticePlanOutput(fixture);

  assert.equal(normalized.questionPlans[0].purpose, "light_understanding");
  assert.equal(normalized.questionPlans[0].originalPurpose, "concept_understanding");
  assert.equal(normalized.questionPlans[1].purpose, "layer_role_matching");
  assert.equal(normalized.questionPlans[1].originalPurpose, "model_layer_matching");
  assert.equal(normalizeQuestionPlanPurpose("scenario_transfer"), "scenario_application");
  assert.equal(normalizeQuestionPlanPurpose("case_reasoning_application"), "scenario_application");
  assert.equal(normalizeQuestionPlanPurpose("relation_mapping_check"), "relationship_matching");
  assert.equal(normalizeQuestionPlanPurpose("custom_unknown_purpose"), "light_understanding");

  const result = validateUnitPracticePlanOutput(normalized, {
    unitId: "unit-01",
    sourceAnchorId: "anchor-unit-01"
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("normalizes batched task brief purpose aliases", () => {
  const fixture = unitPracticePlanFixture();
  fixture.questionPlans[0].purpose = "definition_grasp";

  const normalized = normalizeTaskBriefPlanOutput(
    { units: [fixture] },
    { sourceAnchorByUnit: new Map([["unit-01", "anchor-unit-01"]]) }
  );

  assert.equal(normalized.units[0].questionPlans[0].purpose, "light_understanding");
  assert.equal(normalized.units[0].questionPlans[0].originalPurpose, "definition_grasp");
});

test("hydrates compact task brief plans before validation", () => {
  const compact = {
    units: [
      {
        unitId: "unit-01",
        practiceGoals: [
          {
            kind: "core_understanding",
            target: "理解 Hook 是流程约束",
            commonMisconception: "把 Hook 当成更长提示词",
            microIds: ["micro-unit-01-001"]
          },
          {
            kind: "relationship_mapping",
            target: "区分 Prompt、Hook、CI 的职责边界",
            commonMisconception: "把所有约束都交给 Prompt",
            microIds: ["micro-unit-01-002"]
          }
        ],
        questionPlans: [
          {
            type: "multiple_choice",
            purpose: "definition_grasp",
            goalIndex: 1,
            microIds: ["micro-unit-01-001"]
          },
          {
            type: "matching",
            purpose: "role_responsibility_mapping",
            goalIndex: 2,
            relationType: "responsibility",
            microIds: ["micro-unit-01-002"]
          }
        ]
      }
    ]
  };

  const normalized = normalizeTaskBriefPlanOutput(compact, {
    sourceAnchorByUnit: new Map([["unit-01", "anchor-unit-01"]])
  });

  assert.deepEqual(
    normalized.units[0].practiceGoals.map((goal) => `${goal.id}:${goal.sourceAnchorId}`),
    ["goal-unit-01-001:anchor-unit-01", "goal-unit-01-002:anchor-unit-01"]
  );
  assert.deepEqual(
    normalized.units[0].questionPlans.map((plan) => `${plan.id}:${plan.practiceGoalId}:${plan.purpose}:${plan.sourceAnchorId}`),
    [
      "q-unit-01-001:goal-unit-01-001:light_understanding:anchor-unit-01",
      "q-unit-01-002:goal-unit-01-002:role_responsibility_matching:anchor-unit-01"
    ]
  );

  const result = validateTaskBriefPlanOutput(normalized, {
    unitIds: new Set(["unit-01"]),
    sourceAnchorByUnit: new Map([["unit-01", "anchor-unit-01"]])
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validates batched task brief plans across planned units", () => {
  const first = unitPracticePlanFixture();
  const second = {
    ...unitPracticePlanFixture(),
    unitId: "unit-02",
    practiceGoals: unitPracticePlanFixture().practiceGoals.map((goal) => ({
      ...goal,
      id: goal.id.replace("goal", "goal-unit-02"),
      sourceAnchorId: "anchor-unit-02"
    })),
    questionPlans: unitPracticePlanFixture().questionPlans.map((plan) => ({
      ...plan,
      id: plan.id.replace("q-", "q-unit-02-"),
      practiceGoalId: plan.practiceGoalId.replace("goal", "goal-unit-02"),
      sourceAnchorId: "anchor-unit-02"
    }))
  };

  const result = validateTaskBriefPlanOutput(
    { units: [first, second] },
    {
      unitIds: new Set(["unit-01", "unit-02"]),
      sourceAnchorByUnit: new Map([
        ["unit-01", "anchor-unit-01"],
        ["unit-02", "anchor-unit-02"]
      ])
    }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("rejects task brief plans that omit a planned unit", () => {
  const result = validateTaskBriefPlanOutput(
    { units: [unitPracticePlanFixture()] },
    {
      unitIds: new Set(["unit-01", "unit-02"]),
      sourceAnchorByUnit: new Map([["unit-01", "anchor-unit-01"]])
    }
  );

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /missing unitId unit-02/);
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

test("normalizes missing matching relationType from question purpose", () => {
  const plan = unitPracticePlanFixture();
  delete plan.questionPlans[1].relationType;
  plan.questionPlans[1].purpose = "layer_role_matching";

  const normalized = normalizeTaskBriefPlanOutput(
    { units: [plan] },
    { sourceAnchorByUnit: new Map([["unit-01", "anchor-unit-01"]]) }
  );
  const result = validateTaskBriefPlanOutput(normalized, {
    unitIds: new Set(["unit-01"]),
    sourceAnchorByUnit: new Map([["unit-01", "anchor-unit-01"]])
  });

  assert.equal(normalized.units[0].questionPlans[1].relationType, "responsibility");
  assert.deepEqual(result, { ok: true, errors: [] });
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

test("validates batched question drafts against per-unit plans", () => {
  const result = validateQuestionDraftBatchOutput(
    {
      units: [
        {
          unitId: "unit-01",
          questions: [multipleChoiceQuestionFixture(), matchingQuestionFixture()]
        }
      ]
    },
    {
      practicePlansByUnit: new Map([["unit-01", unitPracticePlanFixture().questionPlans.length
        ? {
            ...unitPracticePlanFixture(),
            questionPlans: unitPracticePlanFixture().questionPlans.filter((plan) => plan.id !== "q-003")
          }
        : unitPracticePlanFixture()]]),
      sourceAnchorByUnit: new Map([["unit-01", "anchor-unit-01"]])
    }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validates batched unit copy outputs", () => {
  const result = validateUnitCopyBatchOutput(
    {
      units: [
        {
          unitId: "unit-01",
          overview: { text: "Hook 是稳定流程。" },
          summary: { text: "你已经理解 Hook。" }
        }
      ]
    },
    { unitIds: new Set(["unit-01"]) }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validates unit summary drafts", () => {
  const result = validateUnitSummaryDraftOutput(
    {
      unitId: "unit-01",
      overview: { text: "Hook 不是提示词，而是稳定触发的流程约束。" },
      summary: {
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
        targetIds: ["target-01"],
        microIds: ["micro-unit-01-001"],
        sourceAnchorId: "anchor-unit-01"
      },
      {
        id: "goal-02",
        kind: "relationship_mapping",
        target: "区分 Prompt、Hook、CI 的职责边界",
        commonMisconception: "把所有约束都交给 Prompt",
        targetIds: ["target-02"],
        microIds: ["micro-unit-01-002"],
        sourceAnchorId: "anchor-unit-01"
      }
    ],
    questionPlans: [
      {
        id: "q-001",
        type: "multiple_choice",
        purpose: "light_understanding",
        practiceGoalId: "goal-01",
        targetIds: ["target-01"],
        microIds: ["micro-unit-01-001"],
        sourceAnchorId: "anchor-unit-01"
      },
      {
        id: "q-002",
        type: "matching",
        purpose: "relationship_matching",
        practiceGoalId: "goal-02",
        relationType: "boundary",
        targetIds: ["target-02"],
        microIds: ["micro-unit-01-002"],
        sourceAnchorId: "anchor-unit-01"
      },
      {
        id: "q-003",
        type: "multiple_choice",
        purpose: "misconception_check",
        practiceGoalId: "goal-01",
        targetIds: ["target-01"],
        microIds: ["micro-unit-01-001"],
        sourceAnchorId: "anchor-unit-01"
      }
    ]
  };
}

function reviewPathPlanFixture() {
  return {
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
  };
}

function ecdPlanningFixture() {
  return {
    units: [
      {
        unitId: "unit-03",
        sourceAnchorId: "anchor-unit-03",
        assessableTargets: [
          {
            targetId: "target-03-1",
            microIds: ["micro-unit-03-001"],
            title: "DMC 三层与作用对应",
            learningTarget: "用户能把 Dynamics、Mechanics、Components 分别对应到设计目标、行为机制和界面组件。",
            evidenceGoal: "用户能把动力层、机制层、组件层分别匹配到正确作用。",
            evidenceType: "map_structure_relation",
            coverageRequirement: "required",
            sourceAnchorId: "anchor-unit-03"
          },
          {
            targetId: "target-03-2",
            microIds: ["micro-unit-03-002"],
            title: "避免把 DMC 误解成组件清单",
            learningTarget: "用户能识别只堆积分、徽章、排行榜并不等于完成游戏化设计。",
            evidenceGoal: "用户能识别把 DMC 理解成组件清单的误区。",
            evidenceType: "identify_misconception",
            coverageRequirement: "required",
            sourceAnchorId: "anchor-unit-03"
          }
        ],
        selectedTasks: [
          {
            questionPlanId: "qp-03-1",
            targetIds: ["target-03-1"],
            microIds: ["micro-unit-03-001"],
            taskAffordance: "matching",
            taskPurpose: "layer_role_matching",
            evidenceGoal: "用户能把动力层、机制层、组件层分别匹配到正确作用。",
            assemblyReason: "该 task 直接覆盖 DMC 结构理解的核心 target，因此进入本 unit。"
          },
          {
            questionPlanId: "qp-03-2",
            targetIds: ["target-03-2"],
            microIds: ["micro-unit-03-002"],
            taskAffordance: "multiple_choice",
            taskPurpose: "misconception_check",
            evidenceGoal: "用户能识别把 DMC 理解成组件清单的误区。",
            assemblyReason: "该题暴露把 DMC 理解成组件清单的常见误区。"
          }
        ],
        skippedTargets: []
      }
    ]
  };
}

function unitKnowledgeMapFixture() {
  return {
    units: [
      {
        unitId: "unit-01",
        microKnowledgePoints: [
          {
            microId: "micro-unit-01-001",
            title: "Hook 核心定义",
            summary: "Hook 是关键动作前后的流程约束，不是更长提示词。",
            role: "definition",
            assessmentValue: "high",
            primaryEvidenceAngle: "定义识别",
            sourceAnchorId: "anchor-unit-01",
            sourceSupport: "原文说明 Hook 是关键动作前后的流程控制器。"
          },
          {
            microId: "micro-unit-01-002",
            title: "流程职责边界",
            summary: "Prompt、Hook、CI 和规则文档在流程中承担不同职责。",
            role: "relationship",
            assessmentValue: "medium",
            primaryEvidenceAngle: "职责区分",
            sourceAnchorId: "anchor-unit-01",
            sourceSupport: "原文对 Hook 的触发、上下文和验证有连续说明。"
          }
        ]
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

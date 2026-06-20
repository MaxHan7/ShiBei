import assert from "node:assert/strict";
import test from "node:test";

import { validateReviewPathV2 } from "../contracts/reviewPathContract.js";
import {
  generateReviewPathV2,
  V2_GENERATION_STAGES
} from "./generateReviewPathV2.js";

const ARTICLE_INPUT = {
  id: "chapter-fake-001",
  title: "Hook 如何让 AI 工作流稳定",
  url: "https://example.com/hook",
  author: "MetaTown",
  rawText: "Hook 是关键动作前后的流程控制器。它能稳定触发规则、上下文和验证。"
};

test("generates a contract-valid V2 review path from split prompt stages", async () => {
  const calls = [];
  const promptCaller = async (stage, payload) => {
    calls.push({ stage, payload });
    return happyPathPromptCaller(stage, payload);
  };

  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    promptCaller,
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.deepEqual(
    calls.map((call) => call.stage),
    V2_GENERATION_STAGES
  );
  assert.equal(reviewPath.schemaVersion, "v2_review_path_1");
  assert.equal(reviewPath.id, ARTICLE_INPUT.id);
  assert.equal(reviewPath.status, "completed");
  assert.equal(reviewPath.units.length, 1);
  assert.equal(reviewPath.units[0].questions.length, 2);
  assert.deepEqual(
    reviewPath.units[0].questions.map((question) => question.type),
    ["multiple_choice", "matching"]
  );
  assert.equal(reviewPath.units[0].questions[0].correctUnderstanding, undefined);
  assert.equal(reviewPath.units[0].questions[1].relationGoal, undefined);
  assert.equal(reviewPath.generationMeta.currentStage, "completed");
  assert.equal(reviewPath.generationMeta.unitPracticePlans.length, 1);
  assert.equal(reviewPath.generationMeta.qualityDiagnostics.length, 2);
  assert.deepEqual(reviewPath.generationMeta.qualityGate, {
    mode: "diagnostic_only",
    blocking: false,
    deterministicVerdict: "pass",
    deterministicIssueCount: 0,
    judgeVerdict: "pass",
    judgeIssueCount: 0
  });
  assert.deepEqual(validateReviewPathV2(reviewPath), {
    ok: true,
    errors: []
  });
});

test("skips matchingDraft when the practice plan chooses two multiple choice questions", async () => {
  const stages = [];
  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    promptCaller: async (stage, payload) => {
      stages.push(stage);
      return happyPathPromptCaller(stage, payload, { matching: false });
    },
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.deepEqual(stages, [
    "sourceMap",
    "reviewPathPlan",
    "unitPracticePlan",
    "multipleChoiceDraft",
    "unitSummaryDraft",
    "qualityJudge"
  ]);
  assert.deepEqual(
    reviewPath.units[0].questions.map((question) => question.type),
    ["multiple_choice", "multiple_choice"]
  );
});

test("throws a stage-specific error when sourceMap output is invalid", async () => {
  await assert.rejects(
    () =>
      generateReviewPathV2(ARTICLE_INPUT, {
        promptCaller: async (stage) => {
          if (stage === "sourceMap") {
            return {
              source: { type: "article", title: ARTICLE_INPUT.title },
              blocks: []
            };
          }
          throw new Error(`Unexpected stage ${stage}`);
        },
        now: "2026-06-19T00:00:00.000Z"
      }),
    (error) => {
      assert.equal(error.stage, "sourceMap");
      assert.match(error.message, /sourceMap output failed validation/);
      assert.match(error.errors.join("\n"), /blocks must be a non-empty array/);
      return true;
    }
  );
});

test("keeps generated questions when quality judge revises in diagnostic-only mode", async () => {
  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    promptCaller: fakePromptCallerWithJudge({
      verdict: "revise",
      issues: [
        {
          code: "weak_matching_relation",
          severity: "error",
          message: "连线题没有关系理解价值。",
          targetId: "q-002"
        }
      ]
    }),
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.equal(reviewPath.status, "completed");
  assert.equal(reviewPath.units[0].questions.length, 2);
  assert.equal(reviewPath.generationMeta.qualityJudge.verdict, "revise");
  assert.equal(reviewPath.generationMeta.qualityGate.blocking, false);
  assert.equal(reviewPath.generationMeta.qualityGate.judgeIssueCount, 1);
});

test("normalizes draft question ids from question plan order", async () => {
  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    promptCaller: async (stage, payload) => {
      const output = await happyPathPromptCaller(stage, payload);
      if (stage === "multipleChoiceDraft") {
        output.questions[0].id = "model-made-up-id";
      }
      if (stage === "matchingDraft") {
        output.questions[0].id = "another-made-up-id";
      }
      return output;
    },
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.deepEqual(
    reviewPath.units[0].questions.map((question) => question.id),
    ["q-001", "q-002"]
  );
});

test("keeps generated questions when deterministic guardrails find forbidden phrases", async () => {
  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    promptCaller: async (stage, payload) => {
      if (stage === "multipleChoiceDraft") {
        const draft = await happyPathPromptCaller(stage, payload);
        draft.questions[0].stem = "根据本文，Hook 更接近哪种机制？";
        return draft;
      }
      return happyPathPromptCaller(stage, payload);
    },
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.equal(reviewPath.status, "completed");
  assert.equal(reviewPath.units[0].questions[0].stem, "根据本文，Hook 更接近哪种机制？");
  assert.equal(reviewPath.generationMeta.qualityGate.blocking, false);
  assert.equal(reviewPath.generationMeta.qualityGate.deterministicVerdict, "revise");
  assert.equal(reviewPath.generationMeta.qualityDiagnostics[0].issues[0].code, "v2_forbidden_stem_phrase");
});

test("throws when the final review path violates the V2 contract", async () => {
  await assert.rejects(
    () =>
      generateReviewPathV2({
        ...ARTICLE_INPUT,
        id: ""
      }, {
        promptCaller: happyPathPromptCaller,
        now: "2026-06-19T00:00:00.000Z"
      }),
    (error) => {
      assert.match(error.message, /failed contract validation/);
      assert.match(error.errors.join("\n"), /payload.id is required/);
      return true;
    }
  );
});

test("uses a default prompt caller factory when promptCaller is omitted", async () => {
  const stages = [];
  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    createPromptCaller: () => async (stage, payload) => {
      stages.push(stage);
      return happyPathPromptCaller(stage, payload);
    },
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.deepEqual(stages, V2_GENERATION_STAGES);
  assert.equal(reviewPath.status, "completed");
});

function fakePromptCallerWithJudge(judgeOutput) {
  return async (stage, payload) => {
    if (stage === "qualityJudge") {
      return judgeOutput;
    }

    return happyPathPromptCaller(stage, payload);
  };
}

async function happyPathPromptCaller(stage, payload, { matching = true } = {}) {
  if (stage === "sourceMap") {
    return {
      source: {
        type: "article",
        title: ARTICLE_INPUT.title,
        author: ARTICLE_INPUT.author,
        url: ARTICLE_INPUT.url
      },
      blocks: [
        { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" },
        { id: "p-002", type: "paragraph", text: "它能稳定触发规则、上下文和验证。" }
      ]
    };
  }

  if (stage === "reviewPathPlan") {
    return {
      title: ARTICLE_INPUT.title,
      summaryCard: {
        text: "这篇文章解释 Hook 如何把 AI 工作流里的关键动作变成稳定流程。"
      },
      units: [
        {
          id: "unit-01",
          order: 1,
          title: "Hook 是什么",
          nodeLabel: "流程控制",
          shortSummary: "Hook 是关键动作前后的流程控制器。",
          detailSummary: "Hook 不是更长提示词，而是在关键动作前后稳定执行规则、上下文和验证的流程约束。",
          why: "这是理解后续自动化边界的基础。",
          sourceAnchor: {
            id: "anchor-unit-01",
            blockIds: ["p-001", "p-002"],
            quote: "Hook 是关键动作前后的流程控制器。"
          }
        }
      ],
      chapterSummary: {
        encouragementText: "你已经能把 Hook 理解成稳定流程，而不是单纯依赖模型自觉。"
      }
    };
  }

  if (stage === "unitPracticePlan") {
    return practicePlanFixture(payload.unit.id, payload.unit.sourceAnchor.id, { matching });
  }

  if (stage === "multipleChoiceDraft") {
    const choicePlans = payload.practicePlan.questionPlans.filter((plan) => plan.type === "multiple_choice");
    return {
      unitId: payload.unit.id,
      questions: choicePlans.map((plan, index) => ({
        id: plan.id,
        type: "multiple_choice",
        practiceGoalId: plan.practiceGoalId,
        stem: index === 0 ? "Hook 更接近哪种机制？" : "团队想减少重复提醒时，更适合怎么做？",
        correctUnderstanding: "Hook 是关键动作前后的固定流程约束。",
        misconception: "把 Hook 当成更长提示词。",
        distractorRationale: "干扰项覆盖把约束交给提示词、人工复查或摘要的误区。",
        options: [
          { id: "A", text: "关键动作前后的固定流程" },
          { id: "B", text: "让提示词承担所有提醒" },
          { id: "C", text: "每次都依赖人工复查" },
          { id: "D", text: "只把文章内容做成摘要" }
        ],
        correctOptionId: "A",
        explanation: "Hook 的重点是稳定触发流程，而不是让模型自己记住。",
        sourceAnchorId: payload.unit.sourceAnchor.id
      }))
    };
  }

  if (stage === "matchingDraft") {
    return {
      unitId: payload.unit.id,
      questions: [
        {
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
          sourceAnchorId: payload.unit.sourceAnchor.id
        }
      ]
    };
  }

  if (stage === "unitSummaryDraft") {
    return {
      unitId: payload.unit.id,
      overview: {
        text: "Hook 更像一段固定流程，负责在关键动作前后稳定补上规则和验证。"
      },
      summary: {
        title: "单元完成",
        text: "你已经理解 Hook 的基本机制。"
      }
    };
  }

  if (stage === "qualityJudge") {
    return { verdict: "pass", issues: [] };
  }

  throw new Error(`Unexpected stage: ${stage}`);
}

function practicePlanFixture(unitId, sourceAnchorId, { matching }) {
  return {
    unitId,
    practiceGoals: [
      {
        id: "goal-01",
        kind: "core_understanding",
        target: "理解 Hook 是流程约束",
        commonMisconception: "把 Hook 当成更长提示词",
        sourceAnchorId
      },
      {
        id: "goal-02",
        kind: matching ? "relationship_mapping" : "scenario_application",
        target: matching ? "区分 Prompt、Hook、CI 的职责边界" : "把重复提醒沉淀成固定动作",
        commonMisconception: "把所有约束都交给 Prompt",
        sourceAnchorId
      }
    ],
    questionPlans: [
      {
        id: "q-001",
        type: "multiple_choice",
        purpose: "light_understanding",
        practiceGoalId: "goal-01",
        sourceAnchorId
      },
      matching
        ? {
            id: "q-002",
            type: "matching",
            purpose: "relationship_matching",
            practiceGoalId: "goal-02",
            relationType: "boundary",
            sourceAnchorId
          }
        : {
            id: "q-002",
            type: "multiple_choice",
            purpose: "scenario_application",
            practiceGoalId: "goal-02",
            sourceAnchorId
          }
    ]
  };
}

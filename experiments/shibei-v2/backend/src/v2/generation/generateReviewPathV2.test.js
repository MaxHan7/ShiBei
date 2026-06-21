import assert from "node:assert/strict";
import test from "node:test";

import { validateReviewPathV2 } from "../contracts/reviewPathContract.js";
import {
  activeV2GenerationStages,
  generateReviewPathV2
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
    activeV2GenerationStages()
  );
  assert.equal(reviewPath.schemaVersion, "v2_review_path_1");
  assert.equal(reviewPath.id, ARTICLE_INPUT.id);
  assert.equal(reviewPath.status, "completed");
  assert.equal(reviewPath.units.length, 1);
  assert.equal(reviewPath.units[0].questions.length, 2);
  assert.equal(reviewPath.units[0].sourceKnowledgeObjectIds, undefined);
  assert.equal(reviewPath.generationMeta.reviewPathPlan.knowledgeObjects, undefined);
  assert.equal(reviewPath.generationMeta.reviewPathPlan.units[0].sourceKnowledgeObjectIds, undefined);
  assert.deepEqual(
    reviewPath.units[0].questions.map((question) => question.type),
    ["multiple_choice", "matching"]
  );
  assert.equal(reviewPath.units[0].questions[0].correctUnderstanding, undefined);
  assert.equal(reviewPath.units[0].questions[1].relationGoal, undefined);
  assert.equal(reviewPath.generationMeta.currentStage, "completed");
  assert.equal(reviewPath.generationMeta.unitKnowledgeMap.units[0].microKnowledgePoints.length, 2);
  assert.equal(reviewPath.generationMeta.stageRuntime.schemaVersion, "v2_stage_runtime_1");
  assert.equal(reviewPath.generationMeta.stageRuntime.callCount, 0);
  assert.equal(reviewPath.generationMeta.ecdPlanning, undefined);
  assert.equal(reviewPath.generationMeta.taskBriefPlan.units[0].questionPlans.length, 2);
  assert.equal(reviewPath.generationMeta.unitPracticePlans.length, 1);
  assert.deepEqual(
    reviewPath.generationMeta.unitPracticePlans[0].questionPlans.map((plan) => plan.type),
    ["multiple_choice", "matching"]
  );
  assert.equal(reviewPath.generationMeta.qualityDiagnostics.length, 2);
  assert.deepEqual(reviewPath.generationMeta.qualityGate, {
    mode: "deterministic_only",
    blocking: false,
    qualityJudgeEnabled: false,
    deterministicVerdict: "pass",
    deterministicIssueCount: 0,
    judgeVerdict: "skipped",
    judgeIssueCount: 0
  });
  assert.deepEqual(validateReviewPathV2(reviewPath), {
    ok: true,
    errors: []
  });
});

test("task briefs drive downstream practice plans and suppress model-invented matching", async () => {
  const stages = [];
  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    promptCaller: async (stage, payload) => {
      stages.push(stage);
      if (stage === "taskBriefPlan") {
        return {
          units: payload.plan.units.map((unit) => practicePlanFixture(unit.id, unit.sourceAnchor.id, { matching: false }))
        };
      }
      return happyPathPromptCaller(stage, payload);
    },
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.equal(stages.includes("matchingDraft"), false);
  assert.equal(stages.includes("questionDraftBatch"), true);
  assert.deepEqual(
    reviewPath.generationMeta.unitPracticePlans[0].questionPlans.map((plan) => `${plan.id}:${plan.type}`),
    ["q-001:multiple_choice", "q-002:multiple_choice"]
  );
  assert.deepEqual(
    reviewPath.units[0].questions.map((question) => `${question.id}:${question.type}`),
    ["q-001:multiple_choice", "q-002:multiple_choice"]
  );
});

test("passes only compact source windows into per-unit stages", async () => {
  const captured = {
    unitKnowledgeMap: null,
    taskBriefPlan: null,
    questionDraftBatch: null,
    unitCopyBatch: null
  };
  const longBlocks = Array.from({ length: 8 }, (_, index) => ({
    id: `p-${String(index + 1).padStart(3, "0")}`,
    type: "paragraph",
    text: `长文章段落 ${index + 1}`
  }));
  const promptCaller = async (stage, payload) => {
    if (stage === "sourceMap") {
      return {
        source: {
          type: "article",
          title: ARTICLE_INPUT.title,
          author: ARTICLE_INPUT.author,
          url: ARTICLE_INPUT.url
        },
        blocks: longBlocks
      };
    }
    if (stage === "taskBriefPlan") {
      captured.taskBriefPlan = payload;
      return {
        units: payload.plan.units.map((unit) => practicePlanFixture(unit.id, unit.sourceAnchor.id, { matching: false }))
      };
    }
    if (stage === "questionDraftBatch") {
      captured.questionDraftBatch = payload;
      return happyPathPromptCaller(stage, payload);
    }
    if (stage === "unitCopyBatch") {
      captured.unitCopyBatch = payload;
      return happyPathPromptCaller(stage, payload);
    }
    if (stage === "reviewPathPlan") {
      const plan = await happyPathPromptCaller(stage, payload);
      return {
        ...plan,
        chapterWideNotes: ["unrelated full-chapter note"],
        units: [
          {
            ...plan.units[0],
            sourceAnchor: {
              ...plan.units[0].sourceAnchor,
              blockIds: ["p-003"]
            }
          },
          {
            ...plan.units[0],
            id: "unit-02",
            order: 2,
            title: "第二个知识点",
            sourceAnchor: {
              ...plan.units[0].sourceAnchor,
              id: "anchor-unit-02",
              blockIds: ["p-007"]
            }
          }
        ]
      };
    }
    if (stage === "unitKnowledgeMap") {
      captured.unitKnowledgeMap = payload;
      return {
        units: payload.plan.units.map((unit) => unitKnowledgeMapFixture(unit.id, unit.sourceAnchor.id).units[0])
      };
    }
    return happyPathPromptCaller(stage, payload);
  };

  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    promptCaller,
    unitConcurrency: 1,
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.deepEqual(
    captured.unitKnowledgeMap.blocks.map((block) => block.id),
    ["p-002", "p-003", "p-004", "p-006", "p-007", "p-008"]
  );
  assert.equal(captured.unitKnowledgeMap.sourceContextNote.mode, "plan_union_window");

  assert.deepEqual(captured.taskBriefPlan.blocks.map((block) => block.id), ["p-002", "p-003", "p-004", "p-006", "p-007", "p-008"]);
  assert.equal(captured.taskBriefPlan.sourceContextNote.mode, "plan_union_window");
  assert.equal(captured.taskBriefPlan.plan.units.length, 2);
  assert.equal(captured.taskBriefPlan.plan.knowledgeObjects, undefined);
  assert.equal(Array.isArray(captured.taskBriefPlan.plan.chapterWideNotes), false);

  assert.deepEqual(captured.questionDraftBatch.units[0].sourceContext.blocks.map((block) => block.id), ["p-002", "p-003", "p-004"]);
  assert.deepEqual(captured.questionDraftBatch.units[1].sourceContext.blocks.map((block) => block.id), ["p-006", "p-007", "p-008"]);
  assert.deepEqual(captured.unitCopyBatch.units[0].sourceContext.blocks.map((block) => block.id), ["p-002", "p-003", "p-004"]);
  assert.deepEqual(captured.unitCopyBatch.units[1].sourceContext.blocks.map((block) => block.id), ["p-006", "p-007", "p-008"]);
  assert.deepEqual(reviewPath.generationMeta.sourceContextStats, {
    fullBlockCount: 8,
    unitKnowledgeMap: {
      mode: "plan_union_window",
      selectedBlockCount: 6,
      selectedBlockIds: ["p-002", "p-003", "p-004", "p-006", "p-007", "p-008"],
      fallbackUsed: false
    },
    unitWindows: [
      {
        unitId: "unit-01",
        anchorId: "anchor-unit-01",
        anchorBlockIds: ["p-003"],
        selectedBlockCount: 3,
        selectedBlockIds: ["p-002", "p-003", "p-004"],
        fallbackUsed: false
      },
      {
        unitId: "unit-02",
        anchorId: "anchor-unit-02",
        anchorBlockIds: ["p-007"],
        selectedBlockCount: 3,
        selectedBlockIds: ["p-006", "p-007", "p-008"],
        fallbackUsed: false
      }
    ]
  });
});

test("can build sourceMap deterministically for long article quality experiments", async () => {
  const stages = [];
  const reviewPath = await generateReviewPathV2(
    {
      ...ARTICLE_INPUT,
      rawText: "内容摘要\nHook 是关键动作前后的流程控制器。\n它能稳定触发规则、上下文和验证。"
    },
    {
      sourceMapMode: "deterministic",
      promptCaller: async (stage, payload) => {
        stages.push(stage);
        if (stage === "reviewPathPlan") {
          assert.deepEqual(
            payload.blocks.map((block) => `${block.id}:${block.type}`),
            ["p-001:heading", "p-002:paragraph", "p-003:paragraph"]
          );
        }
        return happyPathPromptCaller(stage, payload);
      },
      now: "2026-06-19T00:00:00.000Z"
    }
  );

  assert.equal(stages.includes("sourceMap"), false);
  assert.equal(reviewPath.source.blocks.length, 3);
});

test("derives matching relationType from task briefs", async () => {
  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    promptCaller: happyPathPromptCaller,
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.equal(
    reviewPath.generationMeta.unitPracticePlans[0].questionPlans[1].relationType,
    "responsibility"
  );
  assert.deepEqual(
    reviewPath.units[0].questions.map((question) => `${question.id}:${question.type}`),
    ["q-001:multiple_choice", "q-002:matching"]
  );
});

test("skips multipleChoiceDraft when task brief selects only matching", async () => {
  const stages = [];
  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    promptCaller: async (stage, payload) => {
      stages.push(stage);
      if (stage === "taskBriefPlan") {
        const plan = practicePlanFixture(payload.plan.units[0].id, payload.plan.units[0].sourceAnchor.id, { matching: true });
        return {
          units: [
            {
              ...plan,
              practiceGoals: plan.practiceGoals.filter((goal) => goal.id === "goal-02"),
              questionPlans: plan.questionPlans.filter((questionPlan) => questionPlan.type === "matching")
            }
          ]
        };
      }
      return happyPathPromptCaller(stage, payload);
    },
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.equal(stages.includes("multipleChoiceDraft"), false);
  assert.equal(stages.includes("matchingDraft"), false);
  assert.equal(stages.includes("questionDraftBatch"), true);
  assert.deepEqual(
    reviewPath.units[0].questions.map((question) => `${question.id}:${question.type}`),
    ["q-002:matching"]
  );
});

test("skips matchingDraft when task brief does not select matching", async () => {
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
    "unitKnowledgeMap",
    "taskBriefPlan",
    "questionDraftBatch",
    "unitCopyBatch"
  ]);
  assert.deepEqual(
    reviewPath.units[0].questions.map((question) => question.type),
    ["multiple_choice", "multiple_choice"]
  );
});

test("can limit planned units for bounded quality experiments", async () => {
  const stages = [];
  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    promptCaller: async (stage, payload) => {
      stages.push(stage);
      if (stage !== "reviewPathPlan") return happyPathPromptCaller(stage, payload);
      const plan = await happyPathPromptCaller(stage, payload);
      return {
        ...plan,
        units: [
          ...plan.units,
          {
            ...plan.units[0],
            id: "unit-02",
            order: 2,
            title: "Hook 的边界",
            sourceAnchor: {
              ...plan.units[0].sourceAnchor,
              id: "anchor-unit-02"
            }
          }
        ]
      };
    },
    maxUnitCount: 1,
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.equal(reviewPath.units.length, 1);
  assert.equal(reviewPath.generationMeta.unitPracticePlans.length, 1);
  assert.equal(reviewPath.generationConstraints.originalUnitCount, 2);
  assert.equal(reviewPath.generationConstraints.maxUnitCount, 1);
  assert.equal(stages.filter((stage) => stage === "unitPracticePlan").length, 0);
  assert.equal(stages.filter((stage) => stage === "multipleChoiceDraft").length, 0);
  assert.equal(stages.filter((stage) => stage === "unitSummaryDraft").length, 0);
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
    qualityJudgeEnabled: true,
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.equal(reviewPath.status, "completed");
  assert.equal(reviewPath.units[0].questions.length, 2);
  assert.equal(reviewPath.generationMeta.qualityJudge.verdict, "revise");
  assert.equal(reviewPath.generationMeta.qualityGate.qualityJudgeEnabled, true);
  assert.equal(reviewPath.generationMeta.qualityGate.blocking, false);
  assert.equal(reviewPath.generationMeta.qualityGate.judgeIssueCount, 1);
});

test("keeps generated questions when quality judge JSON fails in diagnostic-only mode", async () => {
  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    promptCaller: async (stage, payload) => {
      if (stage === "qualityJudge") {
        const error = new Error("DeepSeek 没有返回结构化文本。");
        error.stage = "v2_qualityJudge";
        error.modelStage = "qualityJudge";
        error.retryAttempts = 3;
        throw error;
      }
      return happyPathPromptCaller(stage, payload);
    },
    qualityJudgeEnabled: true,
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.equal(reviewPath.status, "completed");
  assert.equal(reviewPath.units[0].questions.length, 2);
  assert.equal(reviewPath.generationMeta.qualityJudge.verdict, "pass");
  assert.equal(reviewPath.generationMeta.qualityJudgeError.stage, "v2_qualityJudge");
  assert.equal(reviewPath.generationMeta.qualityGate.blocking, false);
  assert.equal(reviewPath.generationMeta.qualityGate.judgeError, "DeepSeek 没有返回结构化文本。");
});

test("normalizes draft question ids from question plan order", async () => {
  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    promptCaller: async (stage, payload) => {
      const output = await happyPathPromptCaller(stage, payload);
      if (stage === "questionDraftBatch") {
        output.units[0].questions[0].id = "model-made-up-id";
        delete output.units[0].questions[0].sourceAnchorId;
        output.units[0].questions.push({
          ...output.units[0].questions[0],
          id: "model-extra-question"
        });
        output.units[0].questions[1].id = "another-made-up-id";
        delete output.units[0].questions[1].practiceGoalId;
      }
      return output;
    },
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.deepEqual(
    reviewPath.units[0].questions.map((question) => question.id),
    ["q-001", "q-002"]
  );
  assert.deepEqual(
    reviewPath.units[0].questions.map((question) => question.sourceAnchorId),
    ["anchor-unit-01", "anchor-unit-01"]
  );
});

test("keeps generated questions when deterministic guardrails find forbidden phrases", async () => {
  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    promptCaller: async (stage, payload) => {
      if (stage === "questionDraftBatch") {
        const draft = await happyPathPromptCaller(stage, payload);
        draft.units[0].questions[0].stem = "根据本文，Hook 更接近哪种机制？";
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

  assert.deepEqual(stages, activeV2GenerationStages());
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

  if (stage === "unitKnowledgeMap") {
    return unitKnowledgeMapFixture(payload.plan.units[0].id, payload.plan.units[0].sourceAnchor.id);
  }

  if (stage === "taskBriefPlan") {
    return {
      units: payload.plan.units.map((unit) => practicePlanFixture(unit.id, unit.sourceAnchor.id, { matching }))
    };
  }

  if (stage === "ecdPlanning") {
    assert.equal(payload.unitKnowledgeMap.units[0].microKnowledgePoints[0].microId, "micro-unit-01-001");
    return ecdPlanningFixture(payload.plan.units[0].id, payload.plan.units[0].sourceAnchor.id, { matching });
  }

  if (stage === "questionDraftBatch") {
    return {
      units: payload.units.map((input) => ({
        unitId: input.unit.id,
        questions: input.practicePlan.questionPlans.map((plan, index) =>
          plan.type === "matching"
            ? matchingQuestionForPlan(input.unit, plan)
            : multipleChoiceQuestionForPlan(input.unit, plan, index)
        )
      }))
    };
  }

  if (stage === "unitCopyBatch") {
    return {
      units: payload.units.map((input) => unitCopyForUnit(input.unit))
    };
  }

  if (stage === "multipleChoiceDraft") {
    const choicePlans = payload.practicePlan.questionPlans.filter((plan) => plan.type === "multiple_choice");
    return {
      unitId: payload.unit.id,
      questions: choicePlans.map((plan, index) => multipleChoiceQuestionForPlan(payload.unit, plan, index))
    };
  }

  if (stage === "matchingDraft") {
    return {
      unitId: payload.unit.id,
      questions: payload.practicePlan.questionPlans
        .filter((plan) => plan.type === "matching")
        .map((plan) => matchingQuestionForPlan(payload.unit, plan))
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

function multipleChoiceQuestionForPlan(unit, plan, index = 0) {
  return {
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
    sourceAnchorId: unit.sourceAnchor.id
  };
}

function matchingQuestionForPlan(unit, plan) {
  return {
    id: plan.id,
    type: "matching",
    practiceGoalId: plan.practiceGoalId,
    relationType: plan.relationType,
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
    sourceAnchorId: unit.sourceAnchor.id
  };
}

function unitCopyForUnit(unit) {
  return {
    unitId: unit.id,
    overview: {
      text: "Hook 更像一段固定流程，负责在关键动作前后稳定补上规则和验证。"
    },
    summary: {
      title: "单元完成",
      text: "你已经理解 Hook 的基本机制。"
    }
  };
}

function practicePlanFixture(unitId, sourceAnchorId, { matching }) {
  const firstMicroId = `micro-${unitId}-001`;
  const secondMicroId = `micro-${unitId}-002`;
  return {
    unitId,
    practiceGoals: [
      {
        id: "goal-01",
        kind: "core_understanding",
        target: "理解 Hook 是流程约束",
        commonMisconception: "把 Hook 当成更长提示词",
        microIds: [firstMicroId],
        sourceAnchorId
      },
      {
        id: "goal-02",
        kind: matching ? "relationship_mapping" : "scenario_application",
        target: matching ? "区分 Prompt、Hook、CI 的职责边界" : "把重复提醒沉淀成固定动作",
        commonMisconception: "把所有约束都交给 Prompt",
        microIds: [secondMicroId],
        sourceAnchorId
      }
    ],
    questionPlans: [
      {
        id: "q-001",
        type: "multiple_choice",
        purpose: "light_understanding",
        practiceGoalId: "goal-01",
        microIds: [firstMicroId],
        sourceAnchorId
      },
      matching
        ? {
            id: "q-002",
            type: "matching",
            purpose: "relationship_matching",
            practiceGoalId: "goal-02",
            relationType: "responsibility",
            microIds: [secondMicroId],
            sourceAnchorId
          }
        : {
            id: "q-002",
            type: "multiple_choice",
            purpose: "scenario_application",
            practiceGoalId: "goal-02",
            microIds: [secondMicroId],
            sourceAnchorId
          }
    ]
  };
}

function ecdPlanningFixture(unitId, sourceAnchorId, { matching }) {
  const firstMicroId = `micro-${unitId}-001`;
  const secondMicroId = `micro-${unitId}-002`;
  const selectedTasks = [
    {
      questionPlanId: "q-001",
      targetIds: ["target-001"],
      microIds: [firstMicroId],
      taskAffordance: "multiple_choice",
      taskPurpose: "light_understanding",
      evidenceGoal: "用户能选择 Hook 的核心作用。",
      assemblyReason: "先确认用户能把 Hook 理解成流程约束，而不是更长提示词。"
    }
  ];

  if (matching) {
    selectedTasks.push({
      questionPlanId: "q-002",
      targetIds: ["target-002"],
      microIds: [secondMicroId],
      taskAffordance: "matching",
      taskPurpose: "role_responsibility_matching",
      evidenceGoal: "用户能把不同角色匹配到对应职责。",
      assemblyReason: "Hook、Prompt、CI、规则文档构成职责边界，适合用连线观察关系理解。"
    });
  }

  return {
    units: [
      {
        unitId,
        sourceAnchorId,
        assessableTargets: [
          {
            targetId: "target-001",
            microIds: [firstMicroId],
            title: "Hook 核心定义",
            learningTarget: "用户能理解 Hook 是关键动作前后的流程约束。",
            evidenceGoal: "用户能选择 Hook 的核心作用。",
            evidenceType: "select_core_claim",
            coverageRequirement: "required",
            sourceAnchorId
          },
          {
            targetId: "target-002",
            microIds: [secondMicroId],
            title: "职责边界",
            learningTarget: "用户能区分 Prompt、Hook、CI 和规则文档的职责边界。",
            evidenceGoal: "用户能把不同角色匹配到对应职责。",
            evidenceType: "map_structure_relation",
            coverageRequirement: matching ? "required" : "supporting",
            sourceAnchorId
          }
        ],
        selectedTasks,
        skippedTargets: matching
          ? []
          : [
              {
                targetId: "target-002",
                reason: "本次 fixture 关闭 matching，用场景选择题覆盖第二个目标。"
              }
            ]
      }
    ]
  };
}

function unitKnowledgeMapFixture(unitId, sourceAnchorId) {
  const firstMicroId = `micro-${unitId}-001`;
  const secondMicroId = `micro-${unitId}-002`;
  return {
    units: [
      {
        unitId,
        microKnowledgePoints: [
          {
            microId: firstMicroId,
            title: "Hook 核心定义",
            summary: "Hook 是关键动作前后的流程约束。",
            role: "definition",
            assessmentValue: "high",
            suggestedEvidenceAngles: ["definition_grasp", "misconception_detection"],
            sourceAnchorId,
            sourceSupport: "原文说明 Hook 是关键动作前后的流程控制器。"
          },
          {
            microId: secondMicroId,
            title: "职责边界",
            summary: "Prompt、Hook、CI 和规则文档在流程中承担不同职责。",
            role: "relationship",
            assessmentValue: "medium",
            suggestedEvidenceAngles: ["structure_mapping", "boundary_discrimination"],
            sourceAnchorId,
            sourceSupport: "原文说明 Hook 能稳定触发规则、上下文和验证。"
          }
        ]
      }
    ]
  };
}

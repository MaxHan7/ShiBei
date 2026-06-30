import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeMultipleChoiceAnswerPositions,
  runV2GenerationProgram
} from "./v2GenerationProgram.js";

test("runs the V2 pyramid stages in stable order", async () => {
  const calls = [];
  const promptCaller = async (stage, payload) => {
    calls.push(stage);
    return fixtureOutputForStage(stage, payload);
  };

  await runV2GenerationProgram(makeArticleFixture(), {
    promptCaller,
    now: "2026-06-21T00:00:00.000Z"
  });

  assert.deepEqual(calls, [
    "reviewPathPlan",
    "unitKnowledgeMap",
    "unitKnowledgeMap",
    "taskBriefPlan",
    "taskBriefPlan",
    "multipleChoiceDraftUnitBatch",
    "multipleChoiceDraftUnitBatch",
    "matchingDraft",
    "unitCopyBatch"
  ]);
});

test("normalizes V2 multiple choice answer positions without changing option meaning", () => {
  const questions = Array.from({ length: 6 }, (_, index) => ({
    id: `q-${index + 1}`,
    type: "multiple_choice",
    practiceGoalId: `goal-${index + 1}`,
    sourceAnchorId: "anchor-01",
    stem: `测试题 ${index + 1}`,
    options: [
      { id: "a", text: "干扰项一" },
      { id: "b", text: `正确理解 ${index + 1}` },
      { id: "c", text: "干扰项二" },
      { id: "d", text: "干扰项三" }
    ],
    correctOptionId: "b"
  }));

  const normalized = normalizeMultipleChoiceAnswerPositions(questions, "unit-01");

  assert.deepEqual(
    normalized.map((question) => question.correctOptionId),
    ["D", "C", "B", "A", "D", "C"]
  );
  for (const [index, question] of normalized.entries()) {
    assert.deepEqual(question.options.map((option) => option.id), ["A", "B", "C", "D"]);
    const correctOption = question.options.find((option) => option.id === question.correctOptionId);
    assert.equal(correctOption.text, `正确理解 ${index + 1}`);
  }
});

test("calls scoped MC unit batches with only current unit briefs and source context", async () => {
  const captured = {
    unitKnowledgeMap: [],
    taskBriefPlan: [],
    multipleChoiceDraftUnitBatch: [],
    matchingDraft: [],
    unitCopyBatch: null
  };
  const promptCaller = async (stage, payload) => {
    if (stage === "unitKnowledgeMap") {
      captured.unitKnowledgeMap.push(payload);
    }
    if (stage === "taskBriefPlan") {
      captured.taskBriefPlan.push(payload);
    }
    if (stage === "multipleChoiceDraftUnitBatch") {
      captured.multipleChoiceDraftUnitBatch.push(payload);
    }
    if (stage === "matchingDraft") {
      captured.matchingDraft.push(payload);
    }
    if (stage === "unitCopyBatch") {
      captured.unitCopyBatch = payload;
    }
    return fixtureOutputForStage(stage, payload);
  };

  const reviewPath = await runV2GenerationProgram(makeArticleFixture(), {
    promptCaller,
    now: "2026-06-21T00:00:00.000Z"
  });

  assert.equal(reviewPath.source.author, "MetaTown");
  assert.equal(reviewPath.source.account, "MetaTown");
  assert.equal(reviewPath.source.accountOrDomain, "MetaTown");
  assert.equal(captured.unitKnowledgeMap.length, 2);
  assert.deepEqual(captured.unitKnowledgeMap.map((payload) => payload.plan.units.length), [1, 1]);
  assert.deepEqual(
    captured.unitKnowledgeMap.map((payload) => payload.plan.units[0].id),
    ["unit-01", "unit-02"]
  );
  assert.deepEqual(captured.unitKnowledgeMap[0].blocks.map((block) => block.id), ["p-001", "p-002", "p-003"]);
  assert.deepEqual(captured.unitKnowledgeMap[1].blocks.map((block) => block.id), ["p-002", "p-003"]);

  assert.equal(captured.taskBriefPlan.length, 2);
  assert.deepEqual(captured.taskBriefPlan.map((payload) => payload.plan.units.length), [1, 1]);
  assert.deepEqual(
    captured.taskBriefPlan.map((payload) => payload.plan.units[0].id),
    ["unit-01", "unit-02"]
  );
  assert.deepEqual(captured.taskBriefPlan[0].blocks.map((block) => block.id), ["p-001", "p-002", "p-003"]);
  assert.deepEqual(captured.taskBriefPlan[1].blocks.map((block) => block.id), ["p-002", "p-003"]);
  assert.equal(captured.taskBriefPlan[0].sourceContextNote.mode, "unit_window");
  assert.equal(captured.taskBriefPlan[1].sourceContextNote.mode, "unit_window");

  assert.equal(captured.multipleChoiceDraftUnitBatch.length, 2);

  const firstMcPayload = captured.multipleChoiceDraftUnitBatch[0];
  const secondMcPayload = captured.multipleChoiceDraftUnitBatch[1];
  const firstMcBrief = firstMcPayload.questionBriefs[0];
  const secondMcBrief = secondMcPayload.questionBriefs[0];
  const matchingPlan = captured.matchingDraft[0].practicePlan.questionPlans.find((plan) => plan.type === "matching");

  assert.equal(firstMcPayload.unit.id, "unit-01");
  assert.deepEqual(firstMcPayload.questionBriefs.map((brief) => brief.questionPlanId), ["q-001"]);
  assert.equal(firstMcBrief.practiceGoal.target, "理解 Hook 是流程控制器");
  assert.equal(firstMcBrief.practiceGoal.commonMisconception, "把 Hook 当作更长提示词。");
  assert.deepEqual(firstMcBrief.evidence.microIds, ["micro-unit-01-001"]);
  assert.deepEqual(firstMcPayload.sourceContext.blocks.map((block) => block.id), ["p-001", "p-002", "p-003"]);
  assert.doesNotMatch(JSON.stringify(firstMcPayload), /unit-02/);

  assert.equal(secondMcPayload.unit.id, "unit-02");
  assert.deepEqual(secondMcPayload.questionBriefs.map((brief) => brief.questionPlanId), ["q-003"]);
  assert.equal(secondMcBrief.practiceGoal.target, "理解验证规则让流程可复查");
  assert.deepEqual(secondMcPayload.sourceContext.blocks.map((block) => block.id), ["p-002", "p-003"]);
  assert.doesNotMatch(JSON.stringify(secondMcPayload), /unit-01/);
  assert.equal(captured.matchingDraft.length, 1);
  assert.equal(captured.matchingDraft[0].unit.id, "unit-01");
  assert.deepEqual(captured.matchingDraft[0].blocks.map((block) => block.id), ["p-001", "p-002", "p-003"]);
  assert.equal(matchingPlan.relationType, "responsibility");
  assert.doesNotMatch(JSON.stringify(captured.matchingDraft[0]), /unit-02/);
  assert.equal(firstMcBrief.fullArticleText, undefined);
  assert.doesNotMatch(JSON.stringify(firstMcPayload.questionBriefs), /rawText/);
  assert.equal(captured.unitCopyBatch.units.length, 2);
  assert.deepEqual(
    captured.unitCopyBatch.units.map((input) => input.unit.id),
    ["unit-01", "unit-02"]
  );
  assert.deepEqual(Object.keys(captured.unitCopyBatch.units[0].unit).sort(), [
    "detailSummary",
    "id",
    "nodeLabel",
    "order",
    "shortSummary",
    "title",
    "why"
  ]);
  assert.equal(captured.unitCopyBatch.units[0].sourceContext, undefined);
  assert.equal(captured.unitCopyBatch.units[0].questions, undefined);
  assert.equal(captured.unitCopyBatch.units[0].practicePlan, undefined);
  assert.equal(captured.unitCopyBatch.units[0].practiceSignals.questionCount, 2);
  assert.equal(captured.unitCopyBatch.units[0].practiceSignals.multipleChoiceCount, 1);
  assert.equal(captured.unitCopyBatch.units[0].practiceSignals.matchingCount, 1);
  assert.deepEqual(captured.unitCopyBatch.units[0].practiceSignals.focusTargets, [
    {
      kind: "core_understanding",
      target: "理解 Hook 是流程控制器",
      commonMisconception: "把 Hook 当作更长提示词。"
    },
    {
      kind: "relationship_mapping",
      target: "区分 Hook 中规则、上下文和验证的职责",
      commonMisconception: "把三者混成同一个检查步骤。"
    }
  ]);
  assert.equal(reviewPath.generationMeta.questionBriefsByUnit, undefined);
  assert.deepEqual(
    reviewPath.generationMeta.multipleChoiceDraftBatch.units.map((unit) => unit.unitId),
    ["unit-01", "unit-02"]
  );
  assert.equal(reviewPath.units[0].summary.title, "单元完成");
  assert.equal(reviewPath.units[0].summary.text, "你已经能区分 Hook 和单纯提示词。");
});

function makeArticleFixture() {
  return {
    id: "chapter-fake-001",
    title: "Hook 如何让 AI 工作流稳定",
    url: "https://example.com/hook",
    author: "MetaTown",
    rawText: "Hook 是关键动作前后的流程控制器。\n它能稳定触发规则、上下文和验证。\n验证规则让流程可复查。"
  };
}

function fixtureOutputForStage(stage, payload) {
  if (stage === "reviewPathPlan") return reviewPathPlanFixture();
  if (stage === "unitKnowledgeMap") return unitKnowledgeMapFixture(payload.plan.units[0].id);
  if (stage === "taskBriefPlan") return taskBriefPlanFixture(payload.plan.units[0].id);
  if (stage === "multipleChoiceDraftUnitBatch") {
    const isSecondUnit = payload.unit.id === "unit-02";
    return {
      unitId: payload.unit.id,
      questions: [
        {
          id: isSecondUnit ? "q-003" : "q-001",
          type: "multiple_choice",
          practiceGoalId: isSecondUnit ? "goal-03" : "goal-01",
          stem: isSecondUnit ? "验证规则在流程中最接近哪种作用？" : "Hook 更接近哪种机制？",
          correctUnderstanding: isSecondUnit
            ? "验证规则让流程结果可复查。"
            : "Hook 是关键动作前后的流程控制。",
          misconception: isSecondUnit
            ? "验证规则只是补充说明。"
            : "Hook 只是把提示词写得更长。",
          distractorRationale: "干扰项覆盖提示词、模型、人工检查或说明文字的误解。",
          options: isSecondUnit
            ? [
                { id: "a", text: "补充说明文字" },
                { id: "b", text: "让流程结果可复查" },
                { id: "c", text: "替代所有上下文" },
                { id: "d", text: "加长提示词" }
              ]
            : [
                { id: "a", text: "更长的提示词模板" },
                { id: "b", text: "关键动作前后的流程控制器" },
                { id: "c", text: "模型自动记住所有规则" },
                { id: "d", text: "人工复查清单" }
              ],
          correctOptionId: "b",
          explanation: isSecondUnit
            ? "验证规则的价值是让流程输出能被稳定检查。"
            : "Hook 的价值在关键动作前后稳定触发规则、上下文和验证。",
          sourceAnchorId: isSecondUnit ? "anchor-unit-02" : "anchor-unit-01"
        }
      ]
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
          relationType: "responsibility",
          relationGoal: "区分规则、上下文和验证在 Hook 中的职责。",
          stem: "把 Hook 稳定流程中的元素与职责连起来。",
          leftItems: [
            { id: "l1", text: "规则" },
            { id: "l2", text: "上下文" }
          ],
          rightItems: [
            { id: "r1", text: "约束动作边界" },
            { id: "r2", text: "提供判断依据" }
          ],
          pairs: [
            { leftId: "l1", rightId: "r1" },
            { leftId: "l2", rightId: "r2" }
          ],
          explanation: "Hook 通过规则和上下文把动作变成可控流程。",
          sourceAnchorId: "anchor-unit-01"
        }
      ]
    };
  }
  if (stage === "unitCopyBatch") {
    return {
      units: payload.units.map((unitInput) => ({
        unitId: unitInput.unit.id,
        overview: { text: "Hook 把关键动作前后的控制变成稳定流程。" },
        summary: {
          text: "你已经能区分 Hook 和单纯提示词。"
        }
      }))
    };
  }
  throw new Error(`Unexpected stage ${stage}`);
}

function reviewPathPlanFixture() {
  return {
    title: "Hook 如何让 AI 工作流稳定",
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
        detailSummary: "Hook 不是更长提示词，而是在关键动作前后稳定执行规则、上下文和验证。",
        why: "这是理解自动化边界的基础。",
        sourceAnchor: {
          id: "anchor-unit-01",
          blockIds: ["p-001", "p-002"],
          quote: "Hook 是关键动作前后的流程控制器。"
        }
      },
      {
        id: "unit-02",
        order: 2,
        title: "验证规则",
        nodeLabel: "可复查验证",
        shortSummary: "验证规则让流程输出可复查。",
        detailSummary: "验证规则不是补充说明，而是让流程结果能被稳定检查。",
        why: "这是理解自动化可靠性的基础。",
        sourceAnchor: {
          id: "anchor-unit-02",
          blockIds: ["p-003"],
          quote: "验证规则让流程可复查。"
        }
      }
    ],
    chapterSummary: {
      encouragementText: "你已经能把 Hook 理解成稳定流程。"
    }
  };
}

function unitKnowledgeMapFixture(unitId = null) {
  const units = [
      {
        unitId: "unit-01",
        microKnowledgePoints: [
          {
            microId: "micro-unit-01-001",
            title: "Hook 的定义",
            summary: "Hook 是关键动作前后的流程控制器。",
            role: "definition",
            assessmentValue: "high",
            primaryEvidenceAngle: "关键动作前后",
            sourceAnchorId: "anchor-unit-01",
            sourceSupport: "Hook 是关键动作前后的流程控制器。"
          },
          {
            microId: "micro-unit-01-002",
            title: "Hook 的职责",
            summary: "Hook 稳定触发规则、上下文和验证。",
            role: "relationship",
            assessmentValue: "high",
            primaryEvidenceAngle: "规则",
            sourceAnchorId: "anchor-unit-01",
            sourceSupport: "它能稳定触发规则、上下文和验证。"
          }
        ]
      },
      {
        unitId: "unit-02",
        microKnowledgePoints: [
          {
            microId: "micro-unit-02-001",
            title: "验证规则的作用",
            summary: "验证规则让流程结果可复查。",
            role: "mechanism",
            assessmentValue: "high",
            primaryEvidenceAngle: "可复查",
            sourceAnchorId: "anchor-unit-02",
            sourceSupport: "验证规则让流程可复查。"
          }
        ]
      }
    ];
  return {
    units: unitId ? units.filter((unit) => unit.unitId === unitId) : units
  };
}

function taskBriefPlanFixture(unitId = null) {
  const units = [
    {
      unitId: "unit-01",
      practiceGoals: [
        {
          id: "goal-01",
          kind: "core_understanding",
          target: "理解 Hook 是流程控制器",
          commonMisconception: "把 Hook 当作更长提示词。",
          microIds: ["micro-unit-01-001"],
          sourceAnchorId: "anchor-unit-01"
        },
        {
          id: "goal-02",
          kind: "relationship_mapping",
          target: "区分 Hook 中规则、上下文和验证的职责",
          commonMisconception: "把三者混成同一个检查步骤。",
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
          microIds: ["micro-unit-01-001"],
          sourceAnchorId: "anchor-unit-01"
        },
        {
          id: "q-002",
          type: "matching",
          purpose: "role_responsibility_matching",
          relationType: "responsibility",
          practiceGoalId: "goal-02",
          microIds: ["micro-unit-01-002"],
          sourceAnchorId: "anchor-unit-01"
        }
      ]
    },
    {
      unitId: "unit-02",
      practiceGoals: [
        {
          id: "goal-03",
          kind: "core_understanding",
          target: "理解验证规则让流程可复查",
          commonMisconception: "把验证规则当补充说明。",
          microIds: ["micro-unit-02-001"],
          sourceAnchorId: "anchor-unit-02"
        }
      ],
      questionPlans: [
        {
          id: "q-003",
          type: "multiple_choice",
          purpose: "misconception_check",
          practiceGoalId: "goal-03",
          microIds: ["micro-unit-02-001"],
          sourceAnchorId: "anchor-unit-02"
        }
      ]
    }
  ];
  return {
    units: unitId ? units.filter((unit) => unit.unitId === unitId) : units
  };
}

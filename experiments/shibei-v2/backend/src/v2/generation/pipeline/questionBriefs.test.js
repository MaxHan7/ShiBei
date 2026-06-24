import assert from "node:assert/strict";
import test from "node:test";

import { buildQuestionBriefsByUnit } from "./questionBriefs.js";

test("builds compact question briefs from task plans and micro evidence", () => {
  const result = buildQuestionBriefsByUnit({
    taskBriefPlan: makeTaskBriefPlanFixture(),
    unitKnowledgeMap: makeUnitKnowledgeMapFixture(),
    unitSourceContexts: new Map([["u1", makeUnitSourceContextFixture()]])
  });

  const unitBriefs = result.get("u1");
  const brief = unitBriefs.questionBriefs[0];

  assert.equal(brief.questionPlanId, "q-u1-001");
  assert.equal(brief.practiceGoal.target, "理解游戏化的定义和边界");
  assert.equal(brief.practiceGoal.commonMisconception, "把游戏化误解成完整电子游戏。");
  assert.deepEqual(brief.evidence.microIds, ["micro-u1-001"]);
  assert.deepEqual(brief.evidence.microTitles, ["游戏化定义"]);
  assert.deepEqual(brief.evidence.evidenceAngles, ["非游戏情境"]);
  assert.ok(unitBriefs.sourceContext.blocks.length <= 8);
  assert.equal(brief.fullArticleText, undefined);
  assert.equal(unitBriefs.sourceContext.source, undefined);
});

test("does not include full article text from source context", () => {
  const result = buildQuestionBriefsByUnit({
    taskBriefPlan: makeTaskBriefPlanFixture(),
    unitKnowledgeMap: makeUnitKnowledgeMapFixture(),
    unitSourceContexts: new Map([
      [
        "u1",
        {
          source: {
            rawText: "这是一段不应该进入 question brief 的完整正文。",
            cleanedText: "这也是不应该进入 question brief 的正文。"
          },
          ...makeUnitSourceContextFixture()
        }
      ]
    ])
  });

  const serialized = JSON.stringify(result.get("u1"));

  assert.doesNotMatch(serialized, /完整正文/);
  assert.doesNotMatch(serialized, /cleanedText/);
  assert.match(serialized, /非游戏情境/);
});

function makeTaskBriefPlanFixture() {
  return {
    units: [
      {
        unitId: "u1",
        practiceGoals: [
          {
            id: "goal-u1-001",
            kind: "core_understanding",
            target: "理解游戏化的定义和边界",
            commonMisconception: "把游戏化误解成完整电子游戏。",
            microIds: ["micro-u1-001"],
            sourceAnchorId: "anchor-u1"
          }
        ],
        questionPlans: [
          {
            id: "q-u1-001",
            type: "multiple_choice",
            purpose: "boundary_check",
            practiceGoalId: "goal-u1-001",
            microIds: ["micro-u1-001"],
            sourceAnchorId: "anchor-u1"
          }
        ]
      }
    ]
  };
}

function makeUnitKnowledgeMapFixture() {
  return {
    units: [
      {
        unitId: "u1",
        microKnowledgePoints: [
          {
            microId: "micro-u1-001",
            title: "游戏化定义",
            summary: "游戏化是在非游戏情境使用游戏设计元素。",
            role: "definition",
            assessmentValue: "high",
            primaryEvidenceAngle: "非游戏情境",
            sourceAnchorId: "anchor-u1",
            sourceSupport: "定义句"
          }
        ]
      }
    ]
  };
}

function makeUnitSourceContextFixture() {
  return {
    blocks: Array.from({ length: 3 }, (_, index) => ({
      id: `p-00${index + 1}`,
      type: "paragraph",
      text: `scoped block ${index + 1}`
    })),
    sourceContextNote: {
      mode: "unit_window",
      unitId: "u1",
      selectedBlockCount: 3,
      selectedBlockIds: ["p-001", "p-002", "p-003"]
    }
  };
}

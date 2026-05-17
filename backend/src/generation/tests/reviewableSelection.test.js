import assert from "node:assert/strict";
import test from "node:test";

import { selectQualifiedQuestionsByPoint } from "../index.js";

const point = {
  id: "kp-1",
  title: "测试知识点",
  testabilityScore: 4,
  knowledgeType: "concept"
};

function question(overrides = {}) {
  return {
    id: overrides.id || "q-1",
    knowledgePointId: "kp-1",
    type: "multiple_choice",
    stem: "在一个具体场景中，哪种理解最符合这个知识点？",
    options: [
      { id: "A", text: "正确理解" },
      { id: "B", text: "常见误解一" },
      { id: "C", text: "常见误解二" },
      { id: "D", text: "常见误解三" }
    ],
    correctOptionId: "A",
    sourceSnippet: "这是一段可以支撑题目的来源片段。",
    qualityAction: "pass",
    qualityIssues: [],
    qualityScore: {
      sourceSupport: 5,
      answerUniqueness: 5,
      understandingDepth: 4,
      clarity: 5,
      distractorQuality: 4,
      reviewValue: 4,
      average: 4.5
    },
    ...overrides
  };
}

test("selects the highest-scoring pass question first", () => {
  const selected = selectQualifiedQuestionsByPoint([point], [
    question({ id: "rewrite-high", qualityAction: "rewrite", qualityScore: { ...question().qualityScore, average: 4.9 } }),
    question({ id: "pass-low", qualityAction: "pass", qualityScore: { ...question().qualityScore, average: 4.1 } }),
    question({ id: "pass-high", qualityAction: "pass", qualityScore: { ...question().qualityScore, average: 4.8 } })
  ]);

  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, "pass-high");
  assert.equal(selected[0].confidenceLevel, "high");
});

test("retains the best rewrite question as low confidence when no pass question exists", () => {
  const selected = selectQualifiedQuestionsByPoint([point], [
    question({ id: "rewrite-low", qualityAction: "rewrite", qualityScore: { ...question().qualityScore, average: 3.4 } }),
    question({ id: "rewrite-high", qualityAction: "rewrite", qualityScore: { ...question().qualityScore, average: 4.2 } })
  ]);

  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, "rewrite-high");
  assert.equal(selected[0].confidenceLevel, "low");
  assert.equal(selected[0].retainedBy, "best_effort_quality_fallback");
});

test("does not retain discard questions", () => {
  const selected = selectQualifiedQuestionsByPoint([point], [
    question({ id: "discarded", qualityAction: "discard", qualityScore: { ...question().qualityScore, average: 4.9 } })
  ]);

  assert.equal(selected.length, 0);
});

test("does not retain structurally invalid rewrite questions", () => {
  const selected = selectQualifiedQuestionsByPoint([point], [
    question({
      id: "bad-options",
      qualityAction: "rewrite",
      options: [{ id: "A", text: "只有一个选项" }],
      qualityIssues: ["non_binary_question_requires_four_options"]
    }),
    question({
      id: "bad-answer",
      qualityAction: "rewrite",
      correctOptionId: "Z"
    })
  ]);

  assert.equal(selected.length, 0);
});

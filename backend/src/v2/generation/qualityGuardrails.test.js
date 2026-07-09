import assert from "node:assert/strict";
import test from "node:test";

import { runV2QualityGuardrails } from "./qualityGuardrails.js";

test("records standardized multiple choice option quality diagnostics", () => {
  const reviewPath = reviewPathWithQuestion({
    options: [
      { id: "A", text: "关键动作前后的固定流程" },
      { id: "B", text: "完全不需要流程约束" },
      { id: "C", text: "只能让提示词承担所有提醒" },
      { id: "D", text: "把规则沉淀成协作材料" }
    ],
    correctOptionId: "A"
  });

  const result = runV2QualityGuardrails(reviewPath);
  const diagnostic = result.diagnostics[0];

  assert.equal(diagnostic.checks.optionLengthBalance, "pass");
  assert.deepEqual(diagnostic.checks.optionQuality.optionLengths, {
    A: 11,
    B: 9,
    C: 12,
    D: 10
  });
  assert.equal(diagnostic.checks.optionQuality.correctLength, 11);
  assert.equal(diagnostic.checks.optionQuality.medianDistractorLength, 10);
  assert.equal(diagnostic.checks.optionQuality.correctToMedianDistractorRatio, 1.1);
  assert.equal(diagnostic.checks.optionQuality.lengthRange, 3);
  assert.deepEqual(diagnostic.checks.optionQuality.correctCueTerms, []);
  assert.deepEqual(diagnostic.checks.optionQuality.distractorCueTerms, ["完全", "不需要", "所有", "只能"]);
  assert.deepEqual(diagnostic.checks.optionQuality.cueHits, [
    { optionId: "B", term: "完全", isCorrect: false },
    { optionId: "B", term: "不需要", isCorrect: false },
    { optionId: "C", term: "所有", isCorrect: false },
    { optionId: "C", term: "只能", isCorrect: false }
  ]);
  assert.equal(result.issues.find((issue) => issue.code === "v2_option_tone_cue")?.severity, "warning");
});

test("marks correct option length imbalance in diagnostics without adding a new issue", () => {
  const reviewPath = reviewPathWithQuestion({
    options: [
      { id: "A", text: "关键动作前后稳定执行规则、上下文注入、结果验证和失败处理" },
      { id: "B", text: "普通提示词" },
      { id: "C", text: "文章摘要" },
      { id: "D", text: "人工提醒" }
    ],
    correctOptionId: "A"
  });

  const result = runV2QualityGuardrails(reviewPath);
  const diagnostic = result.diagnostics[0];

  assert.equal(diagnostic.checks.optionLengthBalance, "correct_option_too_obvious");
  assert.equal(diagnostic.checks.optionQuality.correctLength, 28);
  assert.equal(diagnostic.checks.optionQuality.medianDistractorLength, 4);
  assert.equal(diagnostic.checks.optionQuality.correctToMedianDistractorRatio, 7);
  assert.equal(
    result.issues.find((issue) => issue.code === "v2_weak_distractor_set")?.message,
    "正确选项明显更长、更像标准答案，干扰项价值不足。"
  );
});

function reviewPathWithQuestion(questionOverrides) {
  return {
    units: [
      {
        id: "unit-01",
        sourceAnchor: { id: "anchor-01", blockIds: ["p-001"] },
        questions: [
          {
            id: "q-001",
            type: "multiple_choice",
            stem: "Hook 更接近哪种机制？",
            options: [],
            correctOptionId: "A",
            explanation: "Hook 的重点是稳定触发流程。",
            sourceAnchorId: "anchor-01",
            ...questionOverrides
          }
        ]
      }
    ]
  };
}

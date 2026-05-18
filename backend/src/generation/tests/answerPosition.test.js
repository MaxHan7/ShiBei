import assert from "node:assert/strict";
import test from "node:test";

import { normalizeAnswerPosition } from "../generateQuestions.js";

function multipleChoice(overrides = {}) {
  return {
    id: "q-1",
    knowledgePointId: "kp-1",
    type: "multiple_choice",
    stem: "在这个场景里，哪种做法最符合原文主张？",
    options: [
      { id: "A", text: "明显但不完整的做法" },
      { id: "B", text: "真正正确的做法" },
      { id: "C", text: "片面工具化的做法" },
      { id: "D", text: "过度自动化的做法" }
    ],
    correctOptionId: "B",
    ...overrides
  };
}

test("relabels four-option questions while preserving the correct answer text", () => {
  const normalized = normalizeAnswerPosition(multipleChoice(), 0);
  const correctOption = normalized.options.find((option) => option.id === normalized.correctOptionId);

  assert.deepEqual(normalized.options.map((option) => option.id), ["A", "B", "C", "D"]);
  assert.equal(correctOption?.text, "真正正确的做法");
});

test("relabels true/false questions while preserving成立 and 不成立 semantics", () => {
  const normalized = normalizeAnswerPosition({
    id: "q-tf",
    knowledgePointId: "kp-tf",
    type: "true_false",
    stem: "这个判断是否成立？",
    options: [
      { id: "A", text: "成立" },
      { id: "B", text: "不成立" }
    ],
    correctOptionId: "B"
  }, 2);
  const correctOption = normalized.options.find((option) => option.id === normalized.correctOptionId);

  assert.deepEqual(normalized.options.map((option) => option.id), ["A", "B"]);
  assert.equal(correctOption?.text, "不成立");
});

test("keeps answer position normalization stable for the same input", () => {
  const first = normalizeAnswerPosition(multipleChoice(), 4);
  const second = normalizeAnswerPosition(multipleChoice(), 4);

  assert.deepEqual(first.options, second.options);
  assert.equal(first.correctOptionId, second.correctOptionId);
});

test("distributes correct answer positions across a generated batch", () => {
  const positions = Array.from({ length: 8 }, (_, index) => {
    const normalized = normalizeAnswerPosition(multipleChoice({
      id: `q-${index + 1}`,
      knowledgePointId: `kp-${index + 1}`,
      stem: `第 ${index + 1} 个场景里，哪种做法最符合原文主张？`
    }), index);
    return normalized.correctOptionId;
  });

  assert.notEqual(new Set(positions).size, 1);
  assert.equal(positions.every((id) => ["A", "B", "C", "D"].includes(id)), true);
});

test("does not hide structurally invalid generated questions", () => {
  const normalized = normalizeAnswerPosition(multipleChoice({
    options: [
      { id: "A", text: "只有一个选项" }
    ],
    correctOptionId: "B"
  }), 0);

  assert.equal(normalized.options.length, 1);
  assert.equal(normalized.correctOptionId, "B");
});

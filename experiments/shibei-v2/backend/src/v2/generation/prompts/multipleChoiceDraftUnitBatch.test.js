import assert from "node:assert/strict";
import test from "node:test";

import {
  MULTIPLE_CHOICE_DRAFT_UNIT_BATCH_OUTPUT_SCHEMA,
  validateMultipleChoiceDraftUnitBatchOutput
} from "./multipleChoiceDraftUnitBatch.js";

test("validates a scoped unit MC draft batch", () => {
  const result = validateMultipleChoiceDraftUnitBatchOutput(
    {
      unitId: "u1",
      questions: [
        {
          id: "q-u1-001",
          type: "multiple_choice",
          practiceGoalId: "goal-u1-001",
          stem: "游戏化的核心边界是什么？",
          correctUnderstanding: "游戏化是在非游戏情境使用游戏设计元素。",
          misconception: "游戏化就是做完整电子游戏或堆积分徽章。",
          options: [
            { id: "a", text: "做完整电子游戏" },
            { id: "b", text: "堆积分和徽章" },
            { id: "c", text: "在非游戏情境使用游戏设计元素" },
            { id: "d", text: "让界面看起来有趣" }
          ],
          correctOptionId: "c",
          explanation: "游戏化不是做游戏，而是在非游戏情境中使用游戏设计元素。",
          sourceAnchorId: "anchor-u1"
        }
      ]
    },
    {
      unitId: "u1",
      questionPlanIds: new Set(["q-u1-001"]),
      sourceAnchorId: "anchor-u1"
    }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("rejects a unit MC draft that leaks another unit or omits a planned question", () => {
  const result = validateMultipleChoiceDraftUnitBatchOutput(
    {
      unitId: "u2",
      questions: []
    },
    {
      unitId: "u1",
      questionPlanIds: new Set(["q-u1-001"]),
      sourceAnchorId: "anchor-u1"
    }
  );

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /unitId must match u1/);
  assert.match(result.errors.join("\n"), /must contain 1 multiple choice questions/);
});

test("exposes the scoped unit MC draft schema shape", () => {
  assert.equal(
    MULTIPLE_CHOICE_DRAFT_UNIT_BATCH_OUTPUT_SCHEMA.name,
    "shibei_v2_multiple_choice_draft_unit_batch"
  );
  assert.deepEqual(MULTIPLE_CHOICE_DRAFT_UNIT_BATCH_OUTPUT_SCHEMA.required, [
    "unitId",
    "questions"
  ]);
  assert.equal(
    MULTIPLE_CHOICE_DRAFT_UNIT_BATCH_OUTPUT_SCHEMA.properties.questions.items.properties.type.enum[0],
    "multiple_choice"
  );
});

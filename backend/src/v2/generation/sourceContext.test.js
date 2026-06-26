import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPlanSourceContext,
  buildUnitSourceContext
} from "./sourceContext.js";

const BLOCKS = Array.from({ length: 8 }, (_, index) => ({
  id: `p-${String(index + 1).padStart(3, "0")}`,
  type: "paragraph",
  text: `段落 ${index + 1}`
}));

test("buildUnitSourceContext selects anchor blocks with one-neighbor window", () => {
  const unit = {
    id: "unit-01",
    sourceAnchor: { id: "anchor-unit-01", blockIds: ["p-003", "p-004"] }
  };

  const context = buildUnitSourceContext({ source: { title: "T" }, blocks: BLOCKS }, unit, {
    radius: 1
  });

  assert.deepEqual(context.blocks.map((block) => block.id), ["p-002", "p-003", "p-004", "p-005"]);
  assert.equal(context.sourceContextNote.anchorId, "anchor-unit-01");
  assert.deepEqual(context.sourceContextNote.anchorBlockIds, ["p-003", "p-004"]);
  assert.deepEqual(context.sourceContextNote.selectedBlockIds, ["p-002", "p-003", "p-004", "p-005"]);
  assert.equal(context.sourceContextNote.fullBlockCount, 8);
  assert.equal(context.sourceContextNote.selectedBlockCount, 4);
});

test("buildUnitSourceContext deduplicates blocks and preserves original order", () => {
  const unit = {
    id: "unit-02",
    sourceAnchor: { id: "anchor-unit-02", blockIds: ["p-004", "p-003", "p-003"] }
  };

  const context = buildUnitSourceContext({ source: {}, blocks: BLOCKS }, unit, { radius: 0 });

  assert.deepEqual(context.blocks.map((block) => block.id), ["p-003", "p-004"]);
});

test("buildUnitSourceContext falls back to first blocks when anchor is missing", () => {
  const unit = {
    id: "unit-03",
    sourceAnchor: { id: "anchor-unit-03", blockIds: ["missing"] }
  };

  const context = buildUnitSourceContext({ source: {}, blocks: BLOCKS }, unit, {
    radius: 1,
    fallbackBlockCount: 3
  });

  assert.deepEqual(context.blocks.map((block) => block.id), ["p-001", "p-002", "p-003"]);
  assert.equal(context.sourceContextNote.fallbackUsed, true);
});

test("buildPlanSourceContext selects union of all unit windows", () => {
  const plan = {
    units: [
      { id: "unit-01", sourceAnchor: { id: "a1", blockIds: ["p-002"] } },
      { id: "unit-02", sourceAnchor: { id: "a2", blockIds: ["p-006"] } }
    ]
  };

  const context = buildPlanSourceContext({ source: {}, blocks: BLOCKS }, plan, { radius: 1 });

  assert.deepEqual(context.blocks.map((block) => block.id), [
    "p-001",
    "p-002",
    "p-003",
    "p-005",
    "p-006",
    "p-007"
  ]);
  assert.equal(context.sourceContextNote.selectedUnitCount, 2);
  assert.equal(context.sourceContextNote.fullBlockCount, 8);
  assert.equal(context.sourceContextNote.selectedBlockCount, 6);
});

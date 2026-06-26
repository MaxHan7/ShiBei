import assert from "node:assert/strict";
import test from "node:test";

import { loadGoldenReviewPaths } from "../golden/loadGoldenReviewPaths.js";
import { serializeReviewPathForClient } from "./reviewPathClientSerializer.js";

test("serializes both golden review paths into SwiftUI chapter data", async () => {
  const samples = await loadGoldenReviewPaths();

  assert.equal(samples.length, 2);

  for (const sample of samples) {
    const serialized = serializeReviewPathForClient(sample);

    assert.equal(serialized.schemaVersion, sample.schemaVersion);
    assert.equal(serialized.chapter.id, sample.id);
    assert.equal(serialized.chapter.title, sample.title);
    assert.equal(serialized.chapter.overview, sample.summaryCard.text);
    assert.equal(serialized.chapter.sourceTitle, sample.source.title);
    assert.ok(serialized.chapter.sourceBody.length > 0);
    assert.deepEqual(serialized.chapter.sourceBody[0], {
      id: sample.source.blocks[0].id,
      kind: sample.source.blocks[0].type,
      text: sample.source.blocks[0].text
    });
    assert.equal(serialized.chapter.units.length, sample.units.length);
    assert.equal(serialized.chapter.units[0].id, sample.units[0].id);
    assert.equal(
      serialized.chapter.units[0].overview,
      sample.units[0].overview.text
    );
    assert.equal(
      serialized.chapter.units[0].completionMessage,
      sample.units[0].summary.text
    );
  }
});

test("maps multiple choice answers to correctOptionIndex", async () => {
  const [sample] = await loadGoldenReviewPaths();
  const serialized = serializeReviewPathForClient(sample);

  const sourceQuestion = sample.units
    .flatMap((unit) => unit.questions)
    .find((question) => question.type === "multiple_choice");
  const clientQuestion = serialized.chapter.units
    .flatMap((unit) => unit.questions)
    .find((question) => question.id === sourceQuestion.id);

  assert.ok(clientQuestion);
  assert.equal(clientQuestion.kind, "multipleChoice");
  assert.deepEqual(
    clientQuestion.options,
    sourceQuestion.options.map((option) => option.text)
  );
  assert.equal(
    clientQuestion.correctOptionIndex,
    sourceQuestion.options.findIndex(
      (option) => option.id === sourceQuestion.correctOptionId
    )
  );
});

test("joins matching pair ids to left and right display text", async () => {
  const [sample] = await loadGoldenReviewPaths();
  const serialized = serializeReviewPathForClient(sample);

  const sourceQuestion = sample.units
    .flatMap((unit) => unit.questions)
    .find((question) => question.type === "matching");
  const clientQuestion = serialized.chapter.units
    .flatMap((unit) => unit.questions)
    .find((question) => question.id === sourceQuestion.id);
  const leftItemsById = new Map(
    sourceQuestion.leftItems.map((item) => [item.id, item])
  );
  const rightItemsById = new Map(
    sourceQuestion.rightItems.map((item) => [item.id, item])
  );

  assert.ok(clientQuestion);
  assert.equal(clientQuestion.kind, "matching");
  assert.equal(clientQuestion.correctOptionIndex, null);
  assert.equal(clientQuestion.matchingPairs.length, sourceQuestion.pairs.length);

  for (const [index, pair] of sourceQuestion.pairs.entries()) {
    assert.equal(
      clientQuestion.matchingPairs[index].left,
      leftItemsById.get(pair.leftId).text
    );
    assert.equal(
      clientQuestion.matchingPairs[index].right,
      rightItemsById.get(pair.rightId).text
    );
  }
});

test("includes non-empty source excerpts for serialized questions", async () => {
  const samples = await loadGoldenReviewPaths();

  for (const sample of samples) {
    const serialized = serializeReviewPathForClient(sample);
    const questions = serialized.chapter.units.flatMap((unit) => unit.questions);

    assert.ok(questions.length > 0);

    for (const question of questions) {
      assert.ok(
        question.sourceExcerpt.length > 0,
        `${sample.id} ${question.id} should have a source excerpt`
      );
    }
  }
});

test("serializes sourceAnchors with unit ids and joined source text", async () => {
  const [sample] = await loadGoldenReviewPaths();
  const serialized = serializeReviewPathForClient(sample);
  const unit = sample.units[0];
  const sourceBlocksById = new Map(
    sample.source.blocks.map((block) => [block.id, block])
  );
  const expectedText = unit.sourceAnchor.blockIds
    .map((blockId) => sourceBlocksById.get(blockId).text)
    .join(" ");

  assert.deepEqual(serialized.sourceAnchors[unit.sourceAnchor.id], {
    id: unit.sourceAnchor.id,
    unitId: unit.id,
    label: unit.sourceAnchor.label,
    quote: unit.sourceAnchor.quote,
    blockIds: unit.sourceAnchor.blockIds,
    text: expectedText
  });
});

test("home contains start and unit nodes with default currentNodeID", async () => {
  const [sample] = await loadGoldenReviewPaths();
  const serialized = serializeReviewPathForClient(sample);

  assert.equal(serialized.home.currentChapter.eyebrow, "当前章节");
  assert.equal(serialized.home.currentChapter.title, sample.title);
  assert.equal(serialized.home.currentNodeID, sample.units[0].id);
  assert.equal(serialized.home.nodes.length, sample.units.length + 1);
  assert.deepEqual(serialized.home.nodes[0], {
    id: "start",
    title: "开始",
    subtitle: "章节概要",
    kind: "start",
    state: "completed"
  });
  assert.equal(serialized.home.nodes[1].id, sample.units[0].id);
  assert.equal(serialized.home.nodes[1].subtitle, sample.units[0].nodeLabel);
  assert.notEqual(serialized.home.nodes[1].subtitle, sample.units[0].shortSummary);
  assert.equal(serialized.home.nodes[1].state, "current");
});

test("home respects valid currentUnitId and completedUnitIds", async () => {
  const [sample] = await loadGoldenReviewPaths();
  const serialized = serializeReviewPathForClient(sample, {
    currentUnitId: sample.units[1].id,
    completedUnitIds: [sample.units[0].id]
  });

  assert.equal(serialized.home.currentNodeID, sample.units[1].id);
  assert.equal(serialized.home.nodes[1].state, "completed");
  assert.equal(serialized.home.nodes[2].state, "current");
});

test("home falls back to first unit when currentUnitId is invalid", async () => {
  const [sample] = await loadGoldenReviewPaths();
  const serialized = serializeReviewPathForClient(sample, {
    currentUnitId: "missing-unit"
  });

  assert.equal(serialized.home.currentNodeID, sample.units[0].id);
  assert.equal(serialized.home.nodes[1].state, "current");
});

test("home supports start as the current node before review begins", async () => {
  const [sample] = await loadGoldenReviewPaths();
  const serialized = serializeReviewPathForClient(sample, {
    currentUnitId: "start"
  });

  assert.equal(serialized.home.currentNodeID, "start");
  assert.equal(serialized.home.nodes[0].state, "current");
  assert.equal(serialized.home.nodes[1].state, "locked");
});

test("invalid payload throws an Error carrying validation errors", async () => {
  const [sample] = await loadGoldenReviewPaths();
  const invalidPayload = structuredClone(sample);
  invalidPayload.summaryCard.text = "";

  assert.throws(
    () => serializeReviewPathForClient(invalidPayload),
    (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /failed contract validation/);
      assert.ok(Array.isArray(error.errors));
      assert.match(error.errors.join("\n"), /summaryCard\.text is required/);
      return true;
    }
  );
});

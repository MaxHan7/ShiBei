import assert from "node:assert/strict";
import test from "node:test";

import { validateReviewPathV2 } from "../contracts/reviewPathContract.js";
import { loadGoldenReviewPaths } from "./loadGoldenReviewPaths.js";

test("loads the two existing golden samples in stable filename order", async () => {
  const samples = await loadGoldenReviewPaths();

  assert.equal(samples.length, 2);
  assert.deepEqual(
    samples.map((sample) => sample.id),
    ["ai-pm-skill-v2-golden-sample", "hook-v2-golden-sample"]
  );
});

test("all normalized golden samples pass the V2 review path contract", async () => {
  const samples = await loadGoldenReviewPaths();

  for (const sample of samples) {
    assert.deepEqual(validateReviewPathV2(sample), { ok: true, errors: [] });
  }
});

test("preserves sample id, source title, and summary card text", async () => {
  const [aiPmSample, hookSample] = await loadGoldenReviewPaths();

  assert.equal(aiPmSample.id, "ai-pm-skill-v2-golden-sample");
  assert.equal(
    aiPmSample.source.title,
    "让你拿到 offer 的 AI 产品经理核心技能丨Aakash Gupta"
  );
  assert.match(aiPmSample.summaryCard.text, /AI 产品经理的竞争力正在从/);

  assert.equal(hookSample.id, "hook-v2-golden-sample");
  assert.equal(
    hookSample.source.title,
    "和AI产品经理聊天，她说\"我用Vibe coding做Demo\"，我问她：怎么用hook？她说我一般用claude code"
  );
  assert.match(hookSample.summaryCard.text, /Hook 的作用/);
});

test("normalizes single choice cards into four-option multiple choice questions with parsed answers", async () => {
  const samples = await loadGoldenReviewPaths();
  const multipleChoiceQuestions = samples.flatMap((sample) =>
    sample.units.flatMap((unit) =>
      unit.questions.filter((question) => question.type === "multiple_choice")
    )
  );

  assert.ok(multipleChoiceQuestions.length > 0);

  for (const question of multipleChoiceQuestions) {
    assert.equal(question.options.length, 4);
    assert.ok(
      question.options.some((option) => option.id === question.correctOptionId),
      `${question.id} correctOptionId should reference an option`
    );
  }
});

test("normalizes matching cards to four left and right items", async () => {
  const samples = await loadGoldenReviewPaths();
  const matchingQuestions = samples.flatMap((sample) =>
    sample.units.flatMap((unit) =>
      unit.questions.filter((question) => question.type === "matching")
    )
  );

  assert.ok(matchingQuestions.length > 0);

  for (const question of matchingQuestions) {
    assert.equal(question.leftItems.length, 4);
    assert.equal(question.rightItems.length, 4);
    assert.equal(question.pairs.length, 4);
  }
});

test("compatibility normalizer derives a fourth pair for legacy three-pair matching samples", async () => {
  const [aiPmSample] = await loadGoldenReviewPaths();
  const firstMatchingQuestion = aiPmSample.units[0].questions.find(
    (question) => question.type === "matching"
  );

  assert.equal(firstMatchingQuestion.leftItems[3].id, "L4");
  assert.equal(firstMatchingQuestion.leftItems[3].text, "核心判断");
  assert.equal(firstMatchingQuestion.rightItems[3].id, "R4");
  assert.equal(firstMatchingQuestion.pairs[3].leftId, "L4");
  assert.equal(firstMatchingQuestion.pairs[3].rightId, "R4");
});

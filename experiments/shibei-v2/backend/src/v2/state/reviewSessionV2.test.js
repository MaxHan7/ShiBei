import assert from "node:assert/strict";
import test from "node:test";

import { loadGoldenReviewPaths } from "../golden/loadGoldenReviewPaths.js";
import {
  advanceFavoriteRouteV2,
  advancePracticeCardV2,
  advanceReviewCardV2,
  answerPracticeQuestionV2,
  answerQuestionV2,
  createFavoriteQuestionStateV2,
  createFavoriteRouteV2,
  createReviewSessionV2,
  deriveCompletedUnitIdsFromSessionV2,
  deriveCurrentUnitIdFromSessionV2,
  finishPracticeV2,
  openSourceFromReviewV2,
  returnFromSourceToReviewV2,
  setQuestionFeedbackVisibleV2,
  startPracticeFromUnitV2,
  V2_REVIEW_SESSION_SCHEMA_VERSION
} from "./reviewSessionV2.js";

const NOW = "2026-06-19T00:00:00.000Z";

test("starts a V2 review session at chapter overview before any unit is current", async () => {
  const [reviewPath] = await loadGoldenReviewPaths();
  const session = createReviewSessionV2(reviewPath, {
    sessionId: "session-test",
    now: NOW
  });

  assert.equal(session.schemaVersion, V2_REVIEW_SESSION_SCHEMA_VERSION);
  assert.equal(session.id, "session-test");
  assert.equal(session.chapterId, reviewPath.id);
  assert.equal(session.status, "active");
  assert.deepEqual(session.currentCard, {
    type: "chapter_overview",
    chapterId: reviewPath.id
  });
  assert.deepEqual(session.questionStates, {});
  assert.deepEqual(session.completedStepIds, []);
  assert.equal(deriveCurrentUnitIdFromSessionV2(reviewPath, session), "start");
});

test("advances through chapter overview, unit overview, question feedback, and unit summary", async () => {
  const [reviewPath] = await loadGoldenReviewPaths();
  const firstUnit = reviewPath.units[0];
  const firstQuestion = firstUnit.questions[0];
  let session = createReviewSessionV2(reviewPath, { now: NOW });

  session = advanceReviewCardV2(reviewPath, session, { now: NOW });
  assert.deepEqual(session.currentCard, {
    type: "unit_overview",
    chapterId: reviewPath.id,
    unitId: firstUnit.id
  });
  assert.deepEqual(session.completedStepIds, ["chapter_overview"]);

  session = advanceReviewCardV2(reviewPath, session, { now: NOW });
  assert.deepEqual(session.currentCard, {
    type: "question",
    chapterId: reviewPath.id,
    unitId: firstUnit.id,
    questionId: firstQuestion.id
  });
  assert.ok(session.completedStepIds.includes(`${firstUnit.id}:overview`));

  session = answerQuestionV2(
    reviewPath,
    session,
    {
      unitId: firstUnit.id,
      questionId: firstQuestion.id,
      result: "correct",
      selectedOptionId: firstQuestion.correctOptionId
    },
    { now: NOW }
  );
  assert.equal(session.currentCard.type, "question_feedback");
  assert.equal(session.questionStates[firstQuestion.id].status, "answered");
  assert.equal(session.questionStates[firstQuestion.id].feedbackVisible, true);
  assert.ok(session.completedStepIds.includes(`${firstUnit.id}:${firstQuestion.id}`));

  session = advanceReviewCardV2(reviewPath, session, { now: NOW });
  const nextQuestion = firstUnit.questions[1];
  assert.equal(session.currentCard.type, nextQuestion ? "question" : "unit_summary");
  if (nextQuestion) {
    assert.equal(session.currentCard.questionId, nextQuestion.id);
  }
});

test("finishes all cards at chapter summary and marks the session completed", async () => {
  const [reviewPath] = await loadGoldenReviewPaths();
  let session = createReviewSessionV2(reviewPath, { now: NOW });

  session = advanceReviewCardV2(reviewPath, session, { now: NOW });

  while (session.status !== "completed") {
    if (session.currentCard.type === "question") {
      const unit = reviewPath.units.find((candidate) => candidate.id === session.currentCard.unitId);
      const question = unit.questions.find((candidate) => candidate.id === session.currentCard.questionId);
      session = answerQuestionV2(
        reviewPath,
        session,
        {
          unitId: unit.id,
          questionId: question.id,
          result: "correct",
          selectedOptionId: question.correctOptionId ?? null
        },
        { now: NOW }
      );
    }

    session = advanceReviewCardV2(reviewPath, session, { now: NOW });
  }

  assert.equal(session.currentCard.type, "chapter_summary");
  assert.equal(session.completedAt, NOW);
  assert.ok(session.completedStepIds.includes("chapter_summary"));
  assert.deepEqual(
    deriveCompletedUnitIdsFromSessionV2(reviewPath, session),
    reviewPath.units.map((unit) => unit.id)
  );
});

test("returning from source preserves unanswered question state", async () => {
  const [reviewPath] = await loadGoldenReviewPaths();
  const firstUnit = reviewPath.units[0];
  let session = createReviewSessionV2(reviewPath, { now: NOW });
  session = advanceReviewCardV2(reviewPath, session, { now: NOW });
  session = advanceReviewCardV2(reviewPath, session, { now: NOW });
  const questionCard = structuredClone(session.currentCard);

  session = openSourceFromReviewV2(reviewPath, session, {}, { now: NOW });
  assert.equal(session.sourceRoute.sourceAnchorId, firstUnit.sourceAnchor.id);
  assert.deepEqual(session.sourceRoute.returnCard, questionCard);

  session = returnFromSourceToReviewV2(reviewPath, session, { now: NOW });
  assert.deepEqual(session.currentCard, questionCard);
  assert.equal(session.sourceRoute, null);
  assert.deepEqual(session.questionStates, {});
});

test("returning from source preserves answered feedback state", async () => {
  const [reviewPath] = await loadGoldenReviewPaths();
  const firstUnit = reviewPath.units[0];
  const firstQuestion = firstUnit.questions[0];
  let session = createReviewSessionV2(reviewPath, { now: NOW });
  session = advanceReviewCardV2(reviewPath, session, { now: NOW });
  session = advanceReviewCardV2(reviewPath, session, { now: NOW });
  session = answerQuestionV2(
    reviewPath,
    session,
    {
      unitId: firstUnit.id,
      questionId: firstQuestion.id,
      result: "correct",
      selectedOptionId: firstQuestion.correctOptionId
    },
    { now: NOW }
  );

  const feedbackCard = structuredClone(session.currentCard);
  session = openSourceFromReviewV2(reviewPath, session, {}, { now: NOW });
  session = returnFromSourceToReviewV2(reviewPath, session, { now: NOW });

  assert.deepEqual(session.currentCard, feedbackCard);
  assert.equal(session.questionStates[firstQuestion.id].status, "answered");
  assert.equal(session.questionStates[firstQuestion.id].feedbackVisible, true);
});

test("closing and reopening feedback toggles the card type and keeps answer data", async () => {
  const [reviewPath] = await loadGoldenReviewPaths();
  const firstUnit = reviewPath.units[0];
  const firstQuestion = firstUnit.questions[0];
  let session = createReviewSessionV2(reviewPath, { now: NOW });
  session = advanceReviewCardV2(reviewPath, session, { now: NOW });
  session = advanceReviewCardV2(reviewPath, session, { now: NOW });
  session = answerQuestionV2(
    reviewPath,
    session,
    {
      unitId: firstUnit.id,
      questionId: firstQuestion.id,
      result: "incorrect",
      selectedOptionId: "A"
    },
    { now: NOW }
  );

  session = setQuestionFeedbackVisibleV2(
    reviewPath,
    session,
    { questionId: firstQuestion.id, visible: false },
    { now: NOW }
  );
  assert.equal(session.currentCard.type, "question");
  assert.equal(session.questionStates[firstQuestion.id].result, "incorrect");
  assert.equal(session.questionStates[firstQuestion.id].feedbackVisible, false);

  session = setQuestionFeedbackVisibleV2(
    reviewPath,
    session,
    { questionId: firstQuestion.id, visible: true },
    { now: NOW }
  );
  assert.equal(session.currentCard.type, "question_feedback");
  assert.equal(session.questionStates[firstQuestion.id].feedbackVisible, true);
});

test("favorite question route opens as unanswered and does not mutate review session progress", async () => {
  const [reviewPath] = await loadGoldenReviewPaths();
  const firstUnit = reviewPath.units[0];
  const secondUnit = reviewPath.units[1];
  const favorites = [
    {
      id: "favorite-001",
      chapterId: reviewPath.id,
      unitId: firstUnit.id,
      questionId: firstUnit.questions[0].id
    },
    {
      id: "favorite-002",
      chapterId: reviewPath.id,
      unitId: secondUnit.id,
      questionId: secondUnit.questions[0].id
    }
  ];
  const session = createReviewSessionV2(reviewPath, { now: NOW });
  const route = createFavoriteRouteV2(favorites, { favoriteId: "favorite-001" });
  const favoriteState = createFavoriteQuestionStateV2(reviewPath, route, { now: NOW });
  const nextRoute = advanceFavoriteRouteV2(favorites, route);

  assert.deepEqual(session.currentCard, {
    type: "chapter_overview",
    chapterId: reviewPath.id
  });
  assert.deepEqual(session.completedStepIds, []);
  assert.equal(favoriteState.route.origin, "notes");
  assert.equal(favoriteState.currentCard.type, "question");
  assert.equal(favoriteState.questionState.status, "unanswered");
  assert.equal(favoriteState.questionState.feedbackVisible, false);
  assert.equal(nextRoute.favoriteId, "favorite-002");
  assert.equal(nextRoute.nextFavoriteId, null);
});

test("practice from a later unit does not move the mainline current card", async () => {
  const [reviewPath] = await loadGoldenReviewPaths();
  const firstUnit = reviewPath.units[0];
  const laterUnit = reviewPath.units[1] ?? reviewPath.units[0];
  let session = createReviewSessionV2(reviewPath, {
    sessionId: "session-practice",
    now: NOW
  });

  session = advanceReviewCardV2(reviewPath, session, { now: NOW });
  const mainlineCard = structuredClone(session.currentCard);
  session = startPracticeFromUnitV2(
    reviewPath,
    session,
    { unitId: laterUnit.id },
    { practiceId: "practice-later", now: NOW }
  );

  assert.deepEqual(session.currentCard, mainlineCard);
  assert.equal(session.practice.id, "practice-later");
  assert.deepEqual(session.practice.currentCard, {
    type: "unit_overview",
    chapterId: reviewPath.id,
    unitId: laterUnit.id
  });
  assert.deepEqual(session.activeCard, session.practice.currentCard);
  assert.deepEqual(session.completedStepIds, ["chapter_overview"]);
  assert.deepEqual(session.practice.completedStepIds, []);
  assert.equal(deriveCurrentUnitIdFromSessionV2(reviewPath, session), firstUnit.id);
});

test("practice answers and advances only mutate practice state", async () => {
  const [reviewPath] = await loadGoldenReviewPaths();
  const firstUnit = reviewPath.units[0];
  const practiceUnit = reviewPath.units[1] ?? reviewPath.units[0];
  const practiceQuestion = practiceUnit.questions[0];
  let session = createReviewSessionV2(reviewPath, { now: NOW });
  session = advanceReviewCardV2(reviewPath, session, { now: NOW });
  const mainlineCard = structuredClone(session.currentCard);
  const mainlineSteps = [...session.completedStepIds];

  session = startPracticeFromUnitV2(
    reviewPath,
    session,
    { unitId: practiceUnit.id },
    { practiceId: "practice-answer", now: NOW }
  );
  session = advancePracticeCardV2(reviewPath, session, { now: NOW });
  assert.deepEqual(session.currentCard, mainlineCard);
  assert.deepEqual(session.completedStepIds, mainlineSteps);
  assert.equal(session.practice.currentCard.type, "question");
  assert.equal(session.practice.currentCard.questionId, practiceQuestion.id);

  session = answerPracticeQuestionV2(
    reviewPath,
    session,
    {
      unitId: practiceUnit.id,
      questionId: practiceQuestion.id,
      result: "correct",
      selectedOptionId: practiceQuestion.correctOptionId
    },
    { now: NOW }
  );

  assert.deepEqual(session.currentCard, mainlineCard);
  assert.deepEqual(session.questionStates, {});
  assert.equal(session.practice.currentCard.type, "question_feedback");
  assert.equal(session.practice.questionStates[practiceQuestion.id].status, "answered");
  assert.ok(session.practice.completedStepIds.includes(`${practiceUnit.id}:${practiceQuestion.id}`));

  session = finishPracticeV2(reviewPath, session, { now: NOW });
  assert.equal(session.practice, null);
  assert.equal(session.activeCard, null);
  assert.deepEqual(session.currentCard, mainlineCard);
});

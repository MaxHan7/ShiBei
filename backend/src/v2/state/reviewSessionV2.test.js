import assert from "node:assert/strict";
import test from "node:test";

import { loadGoldenReviewPaths } from "../golden/loadGoldenReviewPaths.js";
import {
  advanceFavoriteRouteV2,
  advanceReviewCardV2,
  answerQuestionV2,
  createFavoriteQuestionStateV2,
  createFavoriteRouteV2,
  createReviewSessionV2,
  deriveCompletedUnitIdsFromSessionV2,
  deriveCurrentUnitIdFromSessionV2,
  focusReviewUnitV2,
  openSourceFromReviewV2,
  returnFromSourceToReviewV2,
  setQuestionFeedbackVisibleV2,
  startReplayFromUnitV2,
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
  assert.deepEqual(session.needsReviewQuestionIds, []);
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

test("replays incorrectly answered V2 questions after all new cards before chapter completion", async () => {
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
      selectedOptionId: "wrong-option"
    },
    { now: NOW }
  );
  assert.deepEqual(session.needsReviewQuestionIds, [firstQuestion.id]);
  assert.equal(session.questionStates[firstQuestion.id].result, "incorrect");
  assert.ok(!session.completedStepIds.includes(`${firstUnit.id}:${firstQuestion.id}`));

  session = advanceReviewCardV2(reviewPath, session, { now: NOW });

  for (let guard = 0; guard < 200; guard += 1) {
    if (
      session.currentCard.type === "question" &&
      session.currentCard.questionId === firstQuestion.id &&
      reviewPath.units.every((unit) => session.completedStepIds.includes(`${unit.id}:summary`))
    ) {
      break;
    }

    assert.notEqual(session.currentCard.type, "chapter_summary");

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

  assert.equal(session.currentCard.type, "question");
  assert.equal(session.currentCard.questionId, firstQuestion.id);
  assert.deepEqual(session.needsReviewQuestionIds, [firstQuestion.id]);

  session = answerQuestionV2(
    reviewPath,
    session,
    {
      unitId: firstUnit.id,
      questionId: firstQuestion.id,
      result: "correct",
      selectedOptionId: firstQuestion.correctOptionId ?? null
    },
    { now: NOW }
  );
  assert.deepEqual(session.needsReviewQuestionIds, []);
  assert.ok(session.completedStepIds.includes(`${firstUnit.id}:${firstQuestion.id}`));

  session = advanceReviewCardV2(reviewPath, session, { now: NOW });
  assert.equal(session.currentCard.type, "chapter_summary");
});

test("focuses a later V2 unit at its first incomplete card without losing earlier progress", async () => {
  const [reviewPath] = await loadGoldenReviewPaths();
  const laterUnit = reviewPath.units[1];
  const firstQuestion = laterUnit.questions[0];
  const secondQuestion = laterUnit.questions[1];
  let session = createReviewSessionV2(reviewPath, { now: NOW });

  session = focusReviewUnitV2(
    reviewPath,
    session,
    { unitId: laterUnit.id },
    { now: NOW }
  );
  assert.deepEqual(session.currentCard, {
    type: "unit_overview",
    chapterId: reviewPath.id,
    unitId: laterUnit.id
  });

  session = advanceReviewCardV2(reviewPath, session, { now: NOW });
  assert.deepEqual(session.currentCard, {
    type: "question",
    chapterId: reviewPath.id,
    unitId: laterUnit.id,
    questionId: firstQuestion.id
  });

  session = answerQuestionV2(
    reviewPath,
    session,
    {
      unitId: laterUnit.id,
      questionId: firstQuestion.id,
      result: "correct",
      selectedOptionId: firstQuestion.correctOptionId ?? null
    },
    { now: NOW }
  );

  session = focusReviewUnitV2(
    reviewPath,
    session,
    { unitId: laterUnit.id },
    { now: NOW }
  );

  assert.deepEqual(session.currentCard, {
    type: "question",
    chapterId: reviewPath.id,
    unitId: laterUnit.id,
    questionId: secondQuestion.id
  });
  assert.ok(session.completedStepIds.includes(`${laterUnit.id}:overview`));
  assert.ok(session.completedStepIds.includes(`${laterUnit.id}:${firstQuestion.id}`));
});

test("sequential V2 flow skips questions already completed through free unit focus", async () => {
  const [reviewPath] = await loadGoldenReviewPaths();
  const firstUnit = reviewPath.units[0];
  const laterUnit = reviewPath.units[1];
  const firstLaterQuestion = laterUnit.questions[0];
  const secondLaterQuestion = laterUnit.questions[1];
  let session = createReviewSessionV2(reviewPath, { now: NOW });

  session = focusReviewUnitV2(
    reviewPath,
    session,
    { unitId: laterUnit.id },
    { now: NOW }
  );
  session = advanceReviewCardV2(reviewPath, session, { now: NOW });
  session = answerQuestionV2(
    reviewPath,
    session,
    {
      unitId: laterUnit.id,
      questionId: firstLaterQuestion.id,
      result: "correct",
      selectedOptionId: firstLaterQuestion.correctOptionId ?? null
    },
    { now: NOW }
  );

  session = {
    ...session,
    currentCard: {
      type: "unit_summary",
      chapterId: reviewPath.id,
      unitId: firstUnit.id
    }
  };

  session = advanceReviewCardV2(reviewPath, session, { now: NOW });

  assert.deepEqual(session.currentCard, {
    type: "question",
    chapterId: reviewPath.id,
    unitId: laterUnit.id,
    questionId: secondLaterQuestion.id
  });
});

test("focused V2 unit keeps incorrectly answered questions incomplete until answered correctly", async () => {
  const [reviewPath] = await loadGoldenReviewPaths();
  const laterUnit = reviewPath.units[1];
  const firstQuestion = laterUnit.questions[0];
  let session = createReviewSessionV2(reviewPath, { now: NOW });

  session = focusReviewUnitV2(
    reviewPath,
    session,
    { unitId: laterUnit.id },
    { now: NOW }
  );
  session = advanceReviewCardV2(reviewPath, session, { now: NOW });
  session = answerQuestionV2(
    reviewPath,
    session,
    {
      unitId: laterUnit.id,
      questionId: firstQuestion.id,
      result: "incorrect",
      selectedOptionId: "wrong-option"
    },
    { now: NOW }
  );

  assert.ok(!session.completedStepIds.includes(`${laterUnit.id}:${firstQuestion.id}`));
  assert.deepEqual(session.needsReviewQuestionIds, [firstQuestion.id]);

  session = focusReviewUnitV2(
    reviewPath,
    session,
    { unitId: laterUnit.id },
    { now: NOW }
  );

  assert.deepEqual(session.currentCard, {
    type: "question",
    chapterId: reviewPath.id,
    unitId: laterUnit.id,
    questionId: firstQuestion.id
  });
});

test("keeps a reinforcement question queued when it is answered incorrectly again", async () => {
  const [reviewPath] = await loadGoldenReviewPaths();
  const firstUnit = reviewPath.units[0];
  const firstQuestion = firstUnit.questions[0];
  const session = createReviewSessionV2(reviewPath, {
    now: NOW
  });
  const sessionInReinforcement = {
    ...session,
    currentCard: {
      type: "question",
      chapterId: reviewPath.id,
      unitId: firstUnit.id,
      questionId: firstQuestion.id
    },
    completedStepIds: reviewPath.units.map((unit) => `${unit.id}:summary`),
    needsReviewQuestionIds: [firstQuestion.id]
  };

  const answered = answerQuestionV2(
    reviewPath,
    sessionInReinforcement,
    {
      unitId: firstUnit.id,
      questionId: firstQuestion.id,
      result: "incorrect",
      selectedOptionId: "wrong-option"
    },
    { now: NOW }
  );

  assert.deepEqual(answered.needsReviewQuestionIds, [firstQuestion.id]);
  assert.ok(!answered.completedStepIds.includes(`${firstUnit.id}:${firstQuestion.id}`));

  const advanced = advanceReviewCardV2(reviewPath, answered, { now: NOW });
  assert.equal(advanced.currentCard.type, "question");
  assert.equal(advanced.currentCard.questionId, firstQuestion.id);
});

test("does not regress current card when a delayed duplicate answer arrives", async () => {
  const [reviewPath] = await loadGoldenReviewPaths();
  const firstUnit = reviewPath.units[0];
  const firstQuestion = firstUnit.questions[0];
  const secondQuestion = firstUnit.questions[1];
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
  session = advanceReviewCardV2(reviewPath, session, { now: NOW });

  assert.equal(session.currentCard.type, secondQuestion ? "question" : "unit_summary");
  if (secondQuestion) {
    assert.equal(session.currentCard.questionId, secondQuestion.id);
  }

  const duplicateAnswer = answerQuestionV2(
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

  assert.deepEqual(duplicateAnswer.currentCard, session.currentCard);
  assert.ok(duplicateAnswer.completedStepIds.includes(`${firstUnit.id}:${firstQuestion.id}`));
});

test("incorrect feedback does not count as completed until the question is answered correctly", async () => {
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
      selectedOptionId: "wrong-option"
    },
    { now: NOW }
  );
  session = advanceReviewCardV2(reviewPath, session, { now: NOW });

  assert.ok(!session.completedStepIds.includes(`${firstUnit.id}:${firstQuestion.id}`));
  assert.deepEqual(session.needsReviewQuestionIds, [firstQuestion.id]);
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

test("replaying an earlier unit keeps main progress while exposing unanswered practice cards", async () => {
  const [reviewPath] = await loadGoldenReviewPaths();
  const firstUnit = reviewPath.units[0];
  const secondUnit = reviewPath.units[1];
  const firstQuestion = firstUnit.questions[0];
  let session = createReviewSessionV2(reviewPath, { now: NOW });

  session = {
    ...session,
    currentCard: {
      type: "question",
      chapterId: reviewPath.id,
      unitId: secondUnit.id,
      questionId: secondUnit.questions[0].id
    },
    questionStates: {
      [firstQuestion.id]: {
        status: "answered",
        result: "correct",
        selectedOptionId: firstQuestion.correctOptionId,
        matchedPairs: [],
        lockedPairIds: [],
        feedbackVisible: true,
        answeredAt: NOW
      }
    },
    completedStepIds: [
      "chapter_overview",
      `${firstUnit.id}:overview`,
      `${firstUnit.id}:${firstQuestion.id}`,
      `${firstUnit.id}:summary`
    ]
  };

  session = startReplayFromUnitV2(reviewPath, session, { unitId: firstUnit.id }, { now: NOW });

  assert.equal(session.mode, "replay_from_unit");
  assert.equal(session.currentCard.unitId, secondUnit.id);
  assert.equal(session.activeCard.type, "unit_overview");
  assert.equal(session.activeCard.unitId, firstUnit.id);
  assert.deepEqual(session.activeQuestionStates, {});
  assert.equal(session.questionStates[firstQuestion.id].status, "answered");
});

test("replay from an earlier unit promotes back to main once it catches up", async () => {
  const [reviewPath] = await loadGoldenReviewPaths();
  const firstUnit = reviewPath.units[0];
  const secondUnit = reviewPath.units[1];
  const mainQuestion = secondUnit.questions[0];
  let session = createReviewSessionV2(reviewPath, { now: NOW });

  session = {
    ...session,
    currentCard: {
      type: "question",
      chapterId: reviewPath.id,
      unitId: secondUnit.id,
      questionId: mainQuestion.id
    },
    completedStepIds: [
      "chapter_overview",
      `${firstUnit.id}:overview`,
      ...firstUnit.questions.map((question) => `${firstUnit.id}:${question.id}`),
      `${firstUnit.id}:summary`,
      `${secondUnit.id}:overview`
    ]
  };

  session = startReplayFromUnitV2(reviewPath, session, { unitId: firstUnit.id }, { now: NOW });

  for (let guard = 0; guard < 50 && session.mode === "replay_from_unit"; guard += 1) {
    if (session.activeCard.type === "question") {
      const unit = reviewPath.units.find((candidate) => candidate.id === session.activeCard.unitId);
      const question = unit.questions.find((candidate) => candidate.id === session.activeCard.questionId);
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

  assert.equal(session.mode, "main");
  assert.equal(session.practice, null);
  assert.equal(session.currentCard.unitId, secondUnit.id);
  assert.equal(session.currentCard.questionId, mainQuestion.id);
  assert.ok(session.completedStepIds.includes(`${firstUnit.id}:summary`));
});

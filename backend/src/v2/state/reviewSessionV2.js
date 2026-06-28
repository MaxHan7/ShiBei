import { validateReviewPathV2 } from "../contracts/reviewPathContract.js";

export const V2_REVIEW_SESSION_SCHEMA_VERSION = "v2_review_session_1";

export const V2_REVIEW_SESSION_CARD_TYPES = [
  "chapter_overview",
  "unit_overview",
  "question",
  "question_feedback",
  "unit_summary",
  "chapter_summary"
];

export function createReviewSessionV2(
  reviewPath,
  { sessionId = `v2-session-${Date.now()}`, now = new Date().toISOString() } = {}
) {
  assertValidReviewPath(reviewPath);

  return {
    schemaVersion: V2_REVIEW_SESSION_SCHEMA_VERSION,
    id: sessionId,
    chapterId: reviewPath.id,
    status: "active",
    currentCard: chapterOverviewCard(reviewPath),
    questionStates: {},
    completedStepIds: [],
    needsReviewQuestionIds: [],
    sourceRoute: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null
  };
}

export function normalizeReviewSessionV2(
  reviewPath,
  session,
  { now = new Date().toISOString() } = {}
) {
  assertValidReviewPath(reviewPath);

  if (!session || typeof session !== "object") {
    return createReviewSessionV2(reviewPath, { now });
  }

  return {
    schemaVersion: V2_REVIEW_SESSION_SCHEMA_VERSION,
    id: session.id || `v2-session-${Date.now()}`,
    chapterId: reviewPath.id,
    status: session.status === "completed" ? "completed" : "active",
    currentCard: normalizeCurrentCard(reviewPath, session.currentCard),
    questionStates: normalizeQuestionStates(session.questionStates),
    completedStepIds: normalizeCompletedStepIds(session.completedStepIds),
    needsReviewQuestionIds: normalizeNeedsReviewQuestionIds(reviewPath, session.needsReviewQuestionIds),
    sourceRoute: session.sourceRoute ?? null,
    createdAt: session.createdAt || now,
    updatedAt: session.updatedAt || now,
    completedAt: session.completedAt ?? null
  };
}

export function advanceReviewCardV2(
  reviewPath,
  session,
  { now = new Date().toISOString() } = {}
) {
  const currentSession = normalizeReviewSessionV2(reviewPath, session, { now });
  const nextSession = cloneSession(currentSession);
  const currentCard = nextSession.currentCard;

  markCurrentCardCompleted(nextSession, currentCard);

  if (currentCard.type === "chapter_overview") {
    nextSession.currentCard = unitOverviewCard(reviewPath, reviewPath.units[0]);
    return touchSession(nextSession, now);
  }

  if (currentCard.type === "unit_overview") {
    const unit = findUnit(reviewPath, currentCard.unitId);
    nextSession.currentCard = firstIncompleteCardInUnit(reviewPath, nextSession, unit, {
      includeOverview: false
    });
    return touchSession(nextSession, now);
  }

  if (currentCard.type === "question") {
    const questionState = nextSession.questionStates[currentCard.questionId];
    if (questionState?.status === "answered") {
      nextSession.currentCard = questionFeedbackCard(currentCard);
    }
    return touchSession(nextSession, now);
  }

  if (currentCard.type === "question_feedback") {
    nextSession.currentCard = nextCardAfterQuestionFeedback(reviewPath, nextSession, currentCard);
    return touchSession(nextSession, now);
  }

  if (currentCard.type === "unit_summary") {
    const unitIndex = reviewPath.units.findIndex((unit) => unit.id === currentCard.unitId);
    const nextUnit = reviewPath.units[unitIndex + 1];
    nextSession.currentCard = nextUnit
      ? firstIncompleteCardInUnit(reviewPath, nextSession, nextUnit)
      : firstNeedsReviewQuestionCard(reviewPath, nextSession) ?? chapterSummaryCard(reviewPath);
    return touchSession(nextSession, now);
  }

  if (currentCard.type === "chapter_summary") {
    nextSession.status = "completed";
    nextSession.completedAt = now;
    return touchSession(nextSession, now);
  }

  return touchSession(nextSession, now);
}

export function focusReviewUnitV2(
  reviewPath,
  session,
  { unitId },
  { now = new Date().toISOString() } = {}
) {
  const currentSession = normalizeReviewSessionV2(reviewPath, session, { now });
  const nextSession = cloneSession(currentSession);
  const unit = findUnit(reviewPath, unitId);

  nextSession.currentCard = firstIncompleteCardInUnit(reviewPath, nextSession, unit);
  return touchSession(nextSession, now);
}

export function answerQuestionV2(
  reviewPath,
  session,
  {
    unitId,
    questionId,
    result,
    selectedOptionId,
    matchedPairs = [],
    lockedPairIds = []
  },
  { now = new Date().toISOString() } = {}
) {
  const currentSession = normalizeReviewSessionV2(reviewPath, session, { now });
  const unit = findUnit(reviewPath, unitId);
  const question = findQuestion(unit, questionId);
  const normalizedResult = result === "correct" ? "correct" : "incorrect";
  const nextSession = cloneSession(currentSession);

  nextSession.questionStates[question.id] = {
    status: "answered",
    result: normalizedResult,
    selectedOptionId: selectedOptionId ?? null,
    matchedPairs: Array.isArray(matchedPairs) ? matchedPairs : [],
    lockedPairIds: Array.isArray(lockedPairIds) ? lockedPairIds : [],
    feedbackVisible: true,
    answeredAt: now
  };

  if (normalizedResult === "correct") {
    addCompletedStep(nextSession, questionStepId(unit.id, question.id));
    removeNeedsReviewQuestion(nextSession, question.id);
  } else {
    removeCompletedStep(nextSession, questionStepId(unit.id, question.id));
    scheduleNeedsReviewQuestion(nextSession, question.id);
  }

  nextSession.currentCard = questionFeedbackCard(questionCard(reviewPath, unit, question));

  return touchSession(nextSession, now);
}

export function setQuestionFeedbackVisibleV2(
  reviewPath,
  session,
  { questionId, visible },
  { now = new Date().toISOString() } = {}
) {
  const currentSession = normalizeReviewSessionV2(reviewPath, session, { now });
  const nextSession = cloneSession(currentSession);
  const state = nextSession.questionStates[questionId];

  if (!state || state.status !== "answered") {
    return touchSession(nextSession, now);
  }

  state.feedbackVisible = Boolean(visible);

  if (nextSession.currentCard.type === "question_feedback" && !state.feedbackVisible) {
    nextSession.currentCard = {
      ...nextSession.currentCard,
      type: "question"
    };
  }

  if (nextSession.currentCard.type === "question" && state.feedbackVisible) {
    nextSession.currentCard = {
      ...nextSession.currentCard,
      type: "question_feedback"
    };
  }

  return touchSession(nextSession, now);
}

export function openSourceFromReviewV2(
  reviewPath,
  session,
  { sourceAnchorId, entry = "review" } = {},
  { now = new Date().toISOString() } = {}
) {
  const currentSession = normalizeReviewSessionV2(reviewPath, session, { now });
  const nextSession = cloneSession(currentSession);
  const anchor = resolveSourceAnchorForCard(reviewPath, nextSession.currentCard, sourceAnchorId);

  nextSession.sourceRoute = {
    entry,
    sourceAnchorId: anchor.id,
    returnCard: structuredClone(nextSession.currentCard),
    openedAt: now
  };

  return touchSession(nextSession, now);
}

export function returnFromSourceToReviewV2(
  reviewPath,
  session,
  { now = new Date().toISOString() } = {}
) {
  const currentSession = normalizeReviewSessionV2(reviewPath, session, { now });
  const nextSession = cloneSession(currentSession);

  if (nextSession.sourceRoute?.returnCard) {
    nextSession.currentCard = normalizeCurrentCard(reviewPath, nextSession.sourceRoute.returnCard);
  }

  nextSession.sourceRoute = null;

  return touchSession(nextSession, now);
}

export function createFavoriteRouteV2(
  favorites,
  { favoriteId = favorites?.[0]?.id } = {}
) {
  if (!Array.isArray(favorites) || favorites.length === 0) {
    throw new Error("favorites must not be empty");
  }

  const index = favorites.findIndex((favorite) => favorite.id === favoriteId);
  const favorite = favorites[index >= 0 ? index : 0];
  const nextFavorite = favorites[(index >= 0 ? index : 0) + 1] ?? null;

  return {
    origin: "notes",
    favoriteId: favorite.id,
    chapterId: favorite.chapterId,
    unitId: favorite.unitId,
    questionId: favorite.questionId,
    nextFavoriteId: nextFavorite?.id ?? null
  };
}

export function createFavoriteQuestionStateV2(
  reviewPath,
  favoriteRoute,
  { now = new Date().toISOString() } = {}
) {
  assertValidReviewPath(reviewPath);
  const unit = findUnit(reviewPath, favoriteRoute.unitId);
  const question = findQuestion(unit, favoriteRoute.questionId);

  return {
    route: { ...favoriteRoute },
    currentCard: questionCard(reviewPath, unit, question),
    questionState: {
      status: "unanswered",
      result: null,
      selectedOptionId: null,
      matchedPairs: [],
      lockedPairIds: [],
      feedbackVisible: false,
      openedAt: now
    }
  };
}

export function advanceFavoriteRouteV2(favorites, favoriteRoute) {
  if (!favoriteRoute?.nextFavoriteId) {
    return null;
  }

  return createFavoriteRouteV2(favorites, {
    favoriteId: favoriteRoute.nextFavoriteId
  });
}

export function deriveCurrentUnitIdFromSessionV2(reviewPath, session) {
  const currentSession = normalizeReviewSessionV2(reviewPath, session);

  if (currentSession.currentCard.type === "chapter_overview") {
    return "start";
  }

  return currentSession.currentCard.unitId ?? reviewPath.units.at(-1)?.id ?? "start";
}

export function deriveCompletedUnitIdsFromSessionV2(reviewPath, session) {
  const currentSession = normalizeReviewSessionV2(reviewPath, session);
  const completedStepIds = new Set(currentSession.completedStepIds);

  return reviewPath.units
    .filter((unit) => completedStepIds.has(unitSummaryStepId(unit.id)))
    .map((unit) => unit.id);
}

function assertValidReviewPath(reviewPath) {
  const validation = validateReviewPathV2(reviewPath);

  if (!validation.ok) {
    const error = new Error(
      `V2 review path failed contract validation:\n${validation.errors.join("\n")}`
    );
    error.errors = validation.errors;
    throw error;
  }
}

function normalizeCurrentCard(reviewPath, card) {
  if (!card || typeof card !== "object") {
    return chapterOverviewCard(reviewPath);
  }

  if (card.type === "chapter_overview") {
    return chapterOverviewCard(reviewPath);
  }

  if (card.type === "chapter_summary") {
    return chapterSummaryCard(reviewPath);
  }

  if (!card.unitId) {
    return chapterOverviewCard(reviewPath);
  }

  const unit = reviewPath.units.find((candidate) => candidate.id === card.unitId);
  if (!unit) {
    return chapterOverviewCard(reviewPath);
  }

  if (card.type === "unit_overview") {
    return unitOverviewCard(reviewPath, unit);
  }

  if (card.type === "unit_summary") {
    return unitSummaryCard(reviewPath, unit);
  }

  if (card.type === "question" || card.type === "question_feedback") {
    const question = unit.questions.find((candidate) => candidate.id === card.questionId);
    if (!question) {
      return unitOverviewCard(reviewPath, unit);
    }
    const normalizedCard = questionCard(reviewPath, unit, question);
    return card.type === "question_feedback"
      ? questionFeedbackCard(normalizedCard)
      : normalizedCard;
  }

  return chapterOverviewCard(reviewPath);
}

function normalizeQuestionStates(questionStates) {
  if (!questionStates || typeof questionStates !== "object") {
    return {};
  }

  return structuredClone(questionStates);
}

function normalizeCompletedStepIds(stepIds) {
  if (!Array.isArray(stepIds)) {
    return [];
  }

  return [...new Set(stepIds.filter((stepId) => typeof stepId === "string" && stepId.length > 0))];
}

function normalizeNeedsReviewQuestionIds(reviewPath, questionIds) {
  if (!Array.isArray(questionIds)) {
    return [];
  }

  const validQuestionIds = new Set(
    reviewPath.units.flatMap((unit) => unit.questions.map((question) => question.id))
  );

  return [
    ...new Set(
      questionIds.filter(
        (questionId) => typeof questionId === "string" && validQuestionIds.has(questionId)
      )
    )
  ];
}

function chapterOverviewCard(reviewPath) {
  return {
    type: "chapter_overview",
    chapterId: reviewPath.id
  };
}

function unitOverviewCard(reviewPath, unit) {
  return {
    type: "unit_overview",
    chapterId: reviewPath.id,
    unitId: unit.id
  };
}

function questionCard(reviewPath, unit, question) {
  return {
    type: "question",
    chapterId: reviewPath.id,
    unitId: unit.id,
    questionId: question.id
  };
}

function questionFeedbackCard(card) {
  return {
    ...card,
    type: "question_feedback"
  };
}

function unitSummaryCard(reviewPath, unit) {
  return {
    type: "unit_summary",
    chapterId: reviewPath.id,
    unitId: unit.id
  };
}

function chapterSummaryCard(reviewPath) {
  return {
    type: "chapter_summary",
    chapterId: reviewPath.id
  };
}

function nextCardAfterQuestionFeedback(reviewPath, session, card) {
  if (allUnitSummariesCompleted(reviewPath, session)) {
    return firstNeedsReviewQuestionCard(reviewPath, session) ?? chapterSummaryCard(reviewPath);
  }

  const unit = findUnit(reviewPath, card.unitId);
  const questionIndex = unit.questions.findIndex((question) => question.id === card.questionId);
  const nextQuestion = unit.questions
    .slice(questionIndex + 1)
    .find((question) => !isQuestionCompleted(session, unit.id, question.id));

  return nextQuestion
    ? questionCard(reviewPath, unit, nextQuestion)
    : unitSummaryCard(reviewPath, unit);
}

function markCurrentCardCompleted(session, card) {
  if (card.type === "chapter_overview") {
    addCompletedStep(session, "chapter_overview");
    return;
  }

  if (card.type === "unit_overview") {
    addCompletedStep(session, unitOverviewStepId(card.unitId));
    return;
  }

  if (card.type === "question_feedback") {
    addCompletedStep(session, questionStepId(card.unitId, card.questionId));
    return;
  }

  if (card.type === "unit_summary") {
    addCompletedStep(session, unitSummaryStepId(card.unitId));
    return;
  }

  if (card.type === "chapter_summary") {
    addCompletedStep(session, "chapter_summary");
  }
}

function addCompletedStep(session, stepId) {
  if (!session.completedStepIds.includes(stepId)) {
    session.completedStepIds.push(stepId);
  }
}

function removeCompletedStep(session, stepId) {
  session.completedStepIds = session.completedStepIds.filter((candidate) => candidate !== stepId);
}

function scheduleNeedsReviewQuestion(session, questionId) {
  removeNeedsReviewQuestion(session, questionId);
  session.needsReviewQuestionIds.push(questionId);
}

function removeNeedsReviewQuestion(session, questionId) {
  session.needsReviewQuestionIds = session.needsReviewQuestionIds.filter(
    (candidate) => candidate !== questionId
  );
}

function firstNeedsReviewQuestionCard(reviewPath, session) {
  for (const questionId of session.needsReviewQuestionIds) {
    const unit = reviewPath.units.find((candidate) =>
      candidate.questions.some((question) => question.id === questionId)
    );
    if (!unit) continue;

    const question = unit.questions.find((candidate) => candidate.id === questionId);
    if (question) {
      return questionCard(reviewPath, unit, question);
    }
  }

  return null;
}

function allUnitSummariesCompleted(reviewPath, session) {
  return reviewPath.units.every((unit) =>
    session.completedStepIds.includes(unitSummaryStepId(unit.id))
  );
}

function firstIncompleteCardInUnit(
  reviewPath,
  session,
  unit,
  { includeOverview = true } = {}
) {
  if (includeOverview && !session.completedStepIds.includes(unitOverviewStepId(unit.id))) {
    return unitOverviewCard(reviewPath, unit);
  }

  const firstIncompleteQuestion = unit.questions.find(
    (question) => !isQuestionCompleted(session, unit.id, question.id)
  );

  if (firstIncompleteQuestion) {
    return questionCard(reviewPath, unit, firstIncompleteQuestion);
  }

  return unitSummaryCard(reviewPath, unit);
}

function isQuestionCompleted(session, unitId, questionId) {
  return session.completedStepIds.includes(questionStepId(unitId, questionId));
}

function resolveSourceAnchorForCard(reviewPath, card, sourceAnchorId) {
  if (sourceAnchorId) {
    const unit = reviewPath.units.find((candidate) => candidate.sourceAnchor.id === sourceAnchorId);
    if (unit) {
      return unit.sourceAnchor;
    }
  }

  if (card.unitId) {
    return findUnit(reviewPath, card.unitId).sourceAnchor;
  }

  return reviewPath.units[0].sourceAnchor;
}

function findUnit(reviewPath, unitId) {
  const unit = reviewPath.units.find((candidate) => candidate.id === unitId);

  if (!unit) {
    throw new Error(`Unknown V2 unit id: ${unitId}`);
  }

  return unit;
}

function findQuestion(unit, questionId) {
  const question = unit.questions.find((candidate) => candidate.id === questionId);

  if (!question) {
    throw new Error(`Unknown V2 question id: ${questionId}`);
  }

  return question;
}

function unitOverviewStepId(unitId) {
  return `${unitId}:overview`;
}

function questionStepId(unitId, questionId) {
  return `${unitId}:${questionId}`;
}

function unitSummaryStepId(unitId) {
  return `${unitId}:summary`;
}

function cloneSession(session) {
  return structuredClone(session);
}

function touchSession(session, now) {
  return {
    ...session,
    updatedAt: now
  };
}

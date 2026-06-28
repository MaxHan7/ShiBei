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

  const normalized = {
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
    completedAt: session.completedAt ?? null,
    practice: normalizePracticeSession(reviewPath, session.practice, { now })
  };

  return decorateActiveReviewSession(normalized);
}

export function advanceReviewCardV2(
  reviewPath,
  session,
  { now = new Date().toISOString() } = {}
) {
  const currentSession = normalizeReviewSessionV2(reviewPath, session, { now });
  const nextSession = cloneSession(currentSession);
  const activeCore = activeReviewCore(nextSession);
  const currentCard = activeCore.currentCard;

  markCurrentCardCompleted(activeCore, currentCard);

  if (currentCard.type === "chapter_overview") {
    activeCore.currentCard = unitOverviewCard(reviewPath, reviewPath.units[0]);
    return finalizeActiveMutation(reviewPath, nextSession, now);
  }

  if (currentCard.type === "unit_overview") {
    const unit = findUnit(reviewPath, currentCard.unitId);
    activeCore.currentCard = questionCard(reviewPath, unit, unit.questions[0]);
    return finalizeActiveMutation(reviewPath, nextSession, now);
  }

  if (currentCard.type === "question") {
    const questionState = activeCore.questionStates[currentCard.questionId];
    if (questionState?.status === "answered") {
      activeCore.currentCard = questionFeedbackCard(currentCard);
    }
    return finalizeActiveMutation(reviewPath, nextSession, now);
  }

  if (currentCard.type === "question_feedback") {
    activeCore.currentCard = nextCardAfterQuestionFeedback(reviewPath, activeCore, currentCard);
    return finalizeActiveMutation(reviewPath, nextSession, now);
  }

  if (currentCard.type === "unit_summary") {
    const unitIndex = reviewPath.units.findIndex((unit) => unit.id === currentCard.unitId);
    const nextUnit = reviewPath.units[unitIndex + 1];
    activeCore.currentCard = nextUnit
      ? unitOverviewCard(reviewPath, nextUnit)
      : firstNeedsReviewQuestionCard(reviewPath, activeCore) ?? chapterSummaryCard(reviewPath);
    return finalizeActiveMutation(reviewPath, nextSession, now);
  }

  if (currentCard.type === "chapter_summary") {
    activeCore.status = "completed";
    activeCore.completedAt = now;
    return finalizeActiveMutation(reviewPath, nextSession, now);
  }

  return finalizeActiveMutation(reviewPath, nextSession, now);
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
  const activeCore = activeReviewCore(nextSession);

  activeCore.questionStates[question.id] = {
    status: "answered",
    result: normalizedResult,
    selectedOptionId: selectedOptionId ?? null,
    matchedPairs: Array.isArray(matchedPairs) ? matchedPairs : [],
    lockedPairIds: Array.isArray(lockedPairIds) ? lockedPairIds : [],
    feedbackVisible: true,
    answeredAt: now
  };

  if (normalizedResult === "correct") {
    addCompletedStep(activeCore, questionStepId(unit.id, question.id));
    removeNeedsReviewQuestion(activeCore, question.id);
  } else {
    removeCompletedStep(activeCore, questionStepId(unit.id, question.id));
    scheduleNeedsReviewQuestion(activeCore, question.id);
  }

  activeCore.currentCard = questionFeedbackCard(questionCard(reviewPath, unit, question));

  return finalizeActiveMutation(reviewPath, nextSession, now);
}

export function setQuestionFeedbackVisibleV2(
  reviewPath,
  session,
  { questionId, visible },
  { now = new Date().toISOString() } = {}
) {
  const currentSession = normalizeReviewSessionV2(reviewPath, session, { now });
  const nextSession = cloneSession(currentSession);
  const activeCore = activeReviewCore(nextSession);
  const state = activeCore.questionStates[questionId];

  if (!state || state.status !== "answered") {
    return finalizeActiveMutation(reviewPath, nextSession, now);
  }

  state.feedbackVisible = Boolean(visible);

  if (activeCore.currentCard.type === "question_feedback" && !state.feedbackVisible) {
    activeCore.currentCard = {
      ...activeCore.currentCard,
      type: "question"
    };
  }

  if (activeCore.currentCard.type === "question" && state.feedbackVisible) {
    activeCore.currentCard = {
      ...activeCore.currentCard,
      type: "question_feedback"
    };
  }

  return finalizeActiveMutation(reviewPath, nextSession, now);
}

export function openSourceFromReviewV2(
  reviewPath,
  session,
  { sourceAnchorId, entry = "review" } = {},
  { now = new Date().toISOString() } = {}
) {
  const currentSession = normalizeReviewSessionV2(reviewPath, session, { now });
  const nextSession = cloneSession(currentSession);
  const activeCore = activeReviewCore(nextSession);
  const anchor = resolveSourceAnchorForCard(reviewPath, activeCore.currentCard, sourceAnchorId);

  nextSession.sourceRoute = {
    entry,
    sourceAnchorId: anchor.id,
    returnCard: structuredClone(activeCore.currentCard),
    openedAt: now
  };

  return finalizeActiveMutation(reviewPath, nextSession, now);
}

export function returnFromSourceToReviewV2(
  reviewPath,
  session,
  { now = new Date().toISOString() } = {}
) {
  const currentSession = normalizeReviewSessionV2(reviewPath, session, { now });
  const nextSession = cloneSession(currentSession);

  if (nextSession.sourceRoute?.returnCard) {
    activeReviewCore(nextSession).currentCard = normalizeCurrentCard(reviewPath, nextSession.sourceRoute.returnCard);
  }

  nextSession.sourceRoute = null;

  return finalizeActiveMutation(reviewPath, nextSession, now);
}

export function startReplayFromUnitV2(
  reviewPath,
  session,
  { unitId },
  { now = new Date().toISOString() } = {}
) {
  const currentSession = normalizeReviewSessionV2(reviewPath, session, { now });
  const unit = findUnit(reviewPath, unitId);
  const replayCard = unitOverviewCard(reviewPath, unit);

  if (
    currentSession.status !== "completed" &&
    cardProgressRank(reviewPath, replayCard) >= cardProgressRank(reviewPath, currentSession.currentCard)
  ) {
    return decorateActiveReviewSession(touchSession({ ...currentSession, practice: null }, now));
  }

  return decorateActiveReviewSession(touchSession({
    ...currentSession,
    practice: {
      id: `practice-${Date.now()}`,
      mode: "replay_from_unit",
      startUnitId: unit.id,
      status: "active",
      currentCard: replayCard,
      questionStates: {},
      completedStepIds: [],
      needsReviewQuestionIds: [],
      createdAt: now,
      updatedAt: now,
      completedAt: null
    }
  }, now));
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

function normalizePracticeSession(reviewPath, practice, { now }) {
  if (!practice || typeof practice !== "object" || practice.mode !== "replay_from_unit") {
    return null;
  }

  if (!practice.startUnitId || !reviewPath.units.some((unit) => unit.id === practice.startUnitId)) {
    return null;
  }

  return {
    id: practice.id || `practice-${Date.now()}`,
    mode: "replay_from_unit",
    startUnitId: practice.startUnitId,
    status: practice.status === "completed" ? "completed" : "active",
    currentCard: normalizeCurrentCard(reviewPath, practice.currentCard),
    questionStates: normalizeQuestionStates(practice.questionStates),
    completedStepIds: normalizeCompletedStepIds(practice.completedStepIds),
    needsReviewQuestionIds: normalizeNeedsReviewQuestionIds(reviewPath, practice.needsReviewQuestionIds),
    createdAt: practice.createdAt || now,
    updatedAt: practice.updatedAt || now,
    completedAt: practice.completedAt ?? null
  };
}

function decorateActiveReviewSession(session) {
  return {
    ...session,
    mode: session.practice ? "replay_from_unit" : "main",
    activeCard: session.practice?.currentCard ?? session.currentCard,
    activeQuestionStates: session.practice?.questionStates ?? session.questionStates
  };
}

function activeReviewCore(session) {
  return session.practice ?? session;
}

function finalizeActiveMutation(reviewPath, session, now) {
  if (session.practice) {
    session.practice.updatedAt = now;
    maybePromoteOrClosePractice(reviewPath, session, now);
  }

  return decorateActiveReviewSession(touchSession(session, now));
}

function maybePromoteOrClosePractice(reviewPath, session, now) {
  const practice = session.practice;
  if (!practice) return;

  if (session.status === "completed") {
    if (practice.status === "completed" || practice.currentCard.type === "chapter_summary") {
      session.practice = null;
    }
    return;
  }

  if (cardProgressRank(reviewPath, practice.currentCard) < cardProgressRank(reviewPath, session.currentCard)) {
    return;
  }

  session.currentCard = practice.currentCard;
  session.questionStates = {
    ...session.questionStates,
    ...practice.questionStates
  };
  session.completedStepIds = unionStrings(session.completedStepIds, practice.completedStepIds);
  session.needsReviewQuestionIds = unionStrings(
    session.needsReviewQuestionIds,
    practice.needsReviewQuestionIds
  );
  session.practice = null;
  session.updatedAt = now;
}

function cardProgressRank(reviewPath, card) {
  if (!card || card.type === "chapter_overview") return 0;
  if (card.type === "chapter_summary") return Number.MAX_SAFE_INTEGER;

  const unitIndex = reviewPath.units.findIndex((unit) => unit.id === card.unitId);
  if (unitIndex < 0) return 0;

  let rank = 1;
  for (let index = 0; index < unitIndex; index += 1) {
    rank += 2 + reviewPath.units[index].questions.length;
  }

  if (card.type === "unit_overview") return rank;
  const unit = reviewPath.units[unitIndex];
  const questionIndex = unit.questions.findIndex((question) => question.id === card.questionId);
  if (card.type === "question" || card.type === "question_feedback") {
    return rank + 1 + Math.max(questionIndex, 0);
  }
  if (card.type === "unit_summary") return rank + 1 + unit.questions.length;
  return rank;
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
  const nextQuestion = unit.questions[questionIndex + 1];

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

function unionStrings(left = [], right = []) {
  return [
    ...new Set(
      [...left, ...right].filter((value) => typeof value === "string" && value.length > 0)
    )
  ];
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

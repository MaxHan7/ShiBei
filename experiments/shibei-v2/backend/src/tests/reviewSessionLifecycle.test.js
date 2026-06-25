import assert from "node:assert/strict";
import test from "node:test";

import { loadGoldenReviewPaths } from "../v2/golden/loadGoldenReviewPaths.js";
import {
  recordSessionAttempt,
  serializeChapterForClient,
  startOrResumeReviewSession,
  startOrResumeV2ReviewSession
} from "../server.js";

function reviewableChapter(overrides = {}) {
  return {
    id: "chapter-test",
    status: "completed",
    knowledgePoints: [
      { id: "kp-1", masteryScore: 80 },
      { id: "kp-2", masteryScore: 65 }
    ],
    questions: [
      { id: "q-1", knowledgePointId: "kp-1" },
      { id: "q-2", knowledgePointId: "kp-2" }
    ],
    masteredPoints: 2,
    ...overrides
  };
}

test("starts and preserves a V2 review session for generated V2 chapters", async () => {
  const [reviewPath] = await loadGoldenReviewPaths();
  const chapter = {
    ...structuredClone(reviewPath),
    status: "completed"
  };

  const session = startOrResumeV2ReviewSession(chapter);
  const serialized = serializeChapterForClient(chapter);

  assert.equal(session.schemaVersion, "v2_review_session_1");
  assert.equal(session.chapterId, chapter.id);
  assert.deepEqual(session.currentCard, {
    type: "chapter_overview",
    chapterId: chapter.id
  });
  assert.equal(serialized.v2ReviewSession.id, session.id);
  assert.equal(serialized.v2ReviewSession.currentCard.type, "chapter_overview");
});

test("rejects V2 review sessions for non-V2 chapters", () => {
  const chapter = reviewableChapter();

  assert.throws(
    () => startOrResumeV2ReviewSession(chapter),
    /暂时不能开始 V2 复习/
  );
});

test("starts a new review session after the previous one is completed", () => {
  const chapter = reviewableChapter({
    reviewSession: {
      id: "session-old",
      chapterId: "chapter-test",
      status: "completed",
      queue: [{ id: "queue-old", pointId: "kp-1", questionId: "q-1", isReinforcement: false }],
      reinforcementQueue: [],
      currentQueueIndex: 0,
      attempts: [],
      masteryByPointId: { "kp-1": 95, "kp-2": 90 },
      answeredPointIds: ["kp-1", "kp-2"],
      masteredThisRoundPointIds: ["kp-1", "kp-2"],
      skippedPointIds: [],
      createdAt: "2026-05-18T00:00:00.000Z",
      updatedAt: "2026-05-18T00:10:00.000Z",
      completedAt: "2026-05-18T00:10:00.000Z"
    }
  });

  const session = startOrResumeReviewSession(chapter);

  assert.equal(session.status, "active");
  assert.notEqual(session.id, "session-old");
  assert.equal(session.completedAt, null);
  assert.deepEqual(session.answeredPointIds, []);
  assert.deepEqual(session.masteredThisRoundPointIds, []);
  assert.equal(session.queue.length, 2);
  assert.equal(chapter.masteredPoints, 2);
});

test("resumes an active review session without replacing it", () => {
  const chapter = reviewableChapter({
    masteredPoints: 1,
    reviewSession: {
      id: "session-active",
      chapterId: "chapter-test",
      status: "active",
      queue: [
        { id: "queue-1", pointId: "kp-1", questionId: "q-1", isReinforcement: false },
        { id: "queue-2", pointId: "kp-2", questionId: "q-2", isReinforcement: false }
      ],
      reinforcementQueue: [],
      currentQueueIndex: 1,
      attempts: [],
      masteryByPointId: { "kp-1": 95, "kp-2": 65 },
      answeredPointIds: ["kp-1"],
      masteredThisRoundPointIds: ["kp-1"],
      skippedPointIds: [],
      createdAt: "2026-05-18T00:00:00.000Z",
      updatedAt: "2026-05-18T00:10:00.000Z",
      completedAt: null
    }
  });

  const session = startOrResumeReviewSession(chapter);

  assert.equal(session.id, "session-active");
  assert.equal(session.status, "active");
  assert.equal(session.currentQueueIndex, 1);
  assert.deepEqual(session.masteredThisRoundPointIds, ["kp-1"]);
  assert.equal(chapter.masteredPoints, 1);
});

test("starts the first review session in source order", () => {
  const chapter = reviewableChapter({
    knowledgePoints: [
      { id: "kp-late", masteryScore: 20, sourceOrder: 2, sourceStartOffset: 80 },
      { id: "kp-early", masteryScore: 90, sourceOrder: 0, sourceStartOffset: 10 }
    ],
    questions: [
      { id: "q-late", knowledgePointId: "kp-late", sourceOrder: 2, sourceStartOffset: 80 },
      { id: "q-early", knowledgePointId: "kp-early", sourceOrder: 0, sourceStartOffset: 10 }
    ],
    masteredPoints: 0
  });

  const session = startOrResumeReviewSession(chapter);

  assert.deepEqual(session.queue.map((item) => item.pointId), ["kp-early", "kp-late"]);
  assert.deepEqual(session.queue.map((item) => item.questionId), ["q-early", "q-late"]);
});

test("starts review sessions with every reviewable question, not one question per point", () => {
  const chapter = reviewableChapter({
    knowledgePoints: [
      { id: "kp-1", masteryScore: 80, sourceOrder: 0 },
      { id: "kp-2", masteryScore: 65, sourceOrder: 1 }
    ],
    questions: [
      { id: "q-1-a", knowledgePointId: "kp-1", sourceOrder: 0, sourceStartOffset: 10 },
      { id: "q-1-b", knowledgePointId: "kp-1", sourceOrder: 0, sourceStartOffset: 20 },
      { id: "q-1-c", knowledgePointId: "kp-1", sourceOrder: 0, sourceStartOffset: 30 },
      { id: "q-2-a", knowledgePointId: "kp-2", sourceOrder: 1, sourceStartOffset: 40 }
    ],
    masteredPoints: 0
  });

  const session = startOrResumeReviewSession(chapter);

  assert.equal(session.schemaVersion, 2);
  assert.deepEqual(session.queue.map((item) => item.questionId), ["q-1-a", "q-1-b", "q-1-c", "q-2-a"]);
});

test("completes when every queued question is answered correctly even if some knowledge points have no question", () => {
  const chapter = reviewableChapter({
    knowledgePoints: [
      { id: "kp-1", masteryScore: 80 },
      { id: "kp-2", masteryScore: 65 },
      { id: "kp-no-question", masteryScore: 50 }
    ],
    questions: [
      { id: "q-1", knowledgePointId: "kp-1" },
      { id: "q-2", knowledgePointId: "kp-2" }
    ],
    masteredPoints: 0
  });

  const session = startOrResumeReviewSession(chapter);

  assert.deepEqual(session.queue.map((item) => item.pointId), ["kp-1", "kp-2"]);

  recordSessionAttempt(chapter, { questionId: "q-1", answer: "A", result: "correct" });
  const result = recordSessionAttempt(chapter, { questionId: "q-2", answer: "A", result: "correct" });

  assert.equal(result.session.status, "completed");
  assert.equal(chapter.reviewSession.status, "completed");
  assert.equal(chapter.masteredPoints, 2);
});

test("does not complete a point until all of that point's main questions are correct", () => {
  const chapter = reviewableChapter({
    knowledgePoints: [{ id: "kp-1", masteryScore: 80 }],
    questions: [
      { id: "q-1-a", knowledgePointId: "kp-1", sourceOrder: 0 },
      { id: "q-1-b", knowledgePointId: "kp-1", sourceOrder: 1 },
      { id: "q-1-c", knowledgePointId: "kp-1", sourceOrder: 2 }
    ],
    masteredPoints: 0
  });

  let session = startOrResumeReviewSession(chapter);
  assert.equal(session.queue.length, 3);

  session = recordSessionAttempt(chapter, { queueItemId: session.queue[0].id, questionId: "q-1-a", answer: "A", result: "correct" }).session;
  assert.deepEqual(session.masteredThisRoundPointIds, []);
  session = recordSessionAttempt(chapter, { queueItemId: session.queue[1].id, questionId: "q-1-b", answer: "A", result: "correct" }).session;
  assert.deepEqual(session.masteredThisRoundPointIds, []);
  session = recordSessionAttempt(chapter, { queueItemId: session.queue[2].id, questionId: "q-1-c", answer: "A", result: "correct" }).session;

  assert.equal(session.status, "completed");
  assert.deepEqual(session.masteredThisRoundPointIds, ["kp-1"]);
  assert.equal(chapter.masteredPoints, 1);
});

test("caps reinforcement for the final question so the session can finish", () => {
  const chapter = reviewableChapter({
    knowledgePoints: [{ id: "kp-1", masteryScore: 80 }],
    questions: [{ id: "q-1", knowledgePointId: "kp-1" }],
    masteredPoints: 0
  });

  let session = startOrResumeReviewSession(chapter);
  session = recordSessionAttempt(chapter, { queueItemId: session.queue[0].id, questionId: "q-1", answer: "B", result: "incorrect" }).session;
  assert.equal(session.status, "active");
  assert.equal(session.queue[session.currentQueueIndex].isReinforcement, true);

  session = recordSessionAttempt(chapter, {
    queueItemId: session.queue[session.currentQueueIndex].id,
    questionId: "q-1",
    answer: "B",
    result: "incorrect"
  }).session;
  assert.equal(session.status, "active");
  assert.equal(session.queue[session.currentQueueIndex].isReinforcement, true);

  session = recordSessionAttempt(chapter, {
    queueItemId: session.queue[session.currentQueueIndex].id,
    questionId: "q-1",
    answer: "B",
    result: "incorrect"
  }).session;

  assert.equal(session.status, "completed");
  assert.deepEqual(session.needsReviewQuestionIds, ["q-1"]);
});

test("migrates active legacy sessions to question-first queues", () => {
  const chapter = reviewableChapter({
    questions: [
      { id: "q-1-a", knowledgePointId: "kp-1", sourceOrder: 0 },
      { id: "q-1-b", knowledgePointId: "kp-1", sourceOrder: 1 },
      { id: "q-2-a", knowledgePointId: "kp-2", sourceOrder: 2 }
    ],
    masteredPoints: 0,
    reviewSession: {
      id: "session-v1",
      chapterId: "chapter-test",
      status: "active",
      queue: [{ id: "queue-v1", pointId: "kp-1", questionId: "q-1-a", isReinforcement: false }],
      reinforcementQueue: [],
      currentQueueIndex: 0,
      attempts: [
        { id: "attempt-1", reviewSessionId: "session-v1", chapterId: "chapter-test", knowledgePointId: "kp-1", questionId: "q-1-a", answer: "A", result: "correct" }
      ],
      masteryByPointId: { "kp-1": 95, "kp-2": 50 },
      answeredPointIds: ["kp-1"],
      masteredThisRoundPointIds: ["kp-1"],
      skippedPointIds: [],
      createdAt: "2026-05-18T00:00:00.000Z",
      updatedAt: "2026-05-18T00:10:00.000Z",
      completedAt: null
    }
  });

  const session = startOrResumeReviewSession(chapter);

  assert.equal(session.id, "session-v1");
  assert.equal(session.schemaVersion, 2);
  assert.deepEqual(session.queue.map((item) => item.questionId), ["q-1-a", "q-1-b", "q-2-a"]);
  assert.equal(session.completedQueueItemIds.length, 1);
  assert.equal(session.queue[session.currentQueueIndex].questionId, "q-1-b");
});

test("serializes legacy chapters with an empty core summary", () => {
  const chapter = reviewableChapter();

  const serialized = serializeChapterForClient(chapter);

  assert.equal(serialized.coreSummary, "");
  assert.equal(serialized.id, chapter.id);
});

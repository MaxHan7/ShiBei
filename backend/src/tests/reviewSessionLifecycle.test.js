import assert from "node:assert/strict";
import test from "node:test";

import { serializeChapterForClient, startOrResumeReviewSession } from "../server.js";

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
  assert.equal(chapter.masteredPoints, 0);
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

test("serializes legacy chapters with an empty core summary", () => {
  const chapter = reviewableChapter();

  const serialized = serializeChapterForClient(chapter);

  assert.equal(serialized.coreSummary, "");
  assert.equal(serialized.id, chapter.id);
});

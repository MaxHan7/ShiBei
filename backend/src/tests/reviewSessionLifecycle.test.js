import assert from "node:assert/strict";
import test from "node:test";

import { startOrResumeReviewSession } from "../server.js";

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

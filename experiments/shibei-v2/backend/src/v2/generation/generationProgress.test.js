import assert from "node:assert/strict";
import test from "node:test";

import {
  buildV2GenerationProgress,
  emitV2GenerationProgress,
  mapV2ModelStageToProgressStage,
  V2_GENERATION_STAGE,
  V2_GENERATION_STATUS
} from "./generationProgress.js";

test("maps internal model stages to user-facing V2 progress stages", () => {
  assert.equal(
    mapV2ModelStageToProgressStage("unitKnowledgeMap"),
    V2_GENERATION_STAGE.MAPPING_KNOWLEDGE
  );
  assert.equal(
    mapV2ModelStageToProgressStage("multipleChoiceDraftUnitBatch"),
    V2_GENERATION_STAGE.GENERATING_QUESTIONS
  );
});

test("builds a stable user-facing generation progress DTO", () => {
  const progress = buildV2GenerationProgress({
    jobId: "job-001",
    chapterId: "chapter-001",
    status: V2_GENERATION_STATUS.RUNNING,
    stage: V2_GENERATION_STAGE.PLANNING_PRACTICE,
    updatedAt: "2026-06-24T12:00:00.000Z"
  });

  assert.deepEqual(progress, {
    jobId: "job-001",
    chapterId: "chapter-001",
    status: "running",
    stage: "planning_practice",
    stageGroup: "practice",
    displayText: "正在规划复习题",
    progress: 0.58,
    userVisible: true,
    retryCount: 0,
    canRetry: false,
    updatedAt: "2026-06-24T12:00:00.000Z"
  });
});

test("builds dynamic unit question progress text", () => {
  const progress = buildV2GenerationProgress({
    status: V2_GENERATION_STATUS.RUNNING,
    stage: V2_GENERATION_STAGE.GENERATING_QUESTIONS,
    unitIndex: 1,
    unitTitle: "DMC模型"
  });

  assert.equal(progress.displayText, "正在为「DMC模型」生成题目");
  assert.equal(progress.unitIndex, 1);
  assert.equal(progress.unitTitle, "DMC模型");
});

test("falls back to unit index when title is too long", () => {
  const progress = buildV2GenerationProgress({
    status: V2_GENERATION_STATUS.RUNNING,
    stage: V2_GENERATION_STAGE.GENERATING_QUESTIONS,
    unitIndex: 2,
    unitTitle: "这是一个非常非常长的知识点标题不适合放进进度提示"
  });

  assert.equal(progress.displayText, "正在为单元3生成题目");
});

test("emits normalized generation progress when a reporter is provided", async () => {
  const events = [];
  const progress = await emitV2GenerationProgress((event) => events.push(event), {
    chapterId: "chapter-001",
    stage: V2_GENERATION_STAGE.FAILED,
    status: V2_GENERATION_STATUS.FAILED,
    failureCode: "input_too_long",
    failureMessage: "文章太长"
  });

  assert.equal(events.length, 1);
  assert.equal(progress.failureCode, "input_too_long");
  assert.equal(events[0].displayText, "文章太长");
});

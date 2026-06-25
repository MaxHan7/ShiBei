import { createId, createSubmittedChapter } from "../../chapterGeneration.js";
import { buildV2GenerationIdempotencyKey } from "./generationIdempotency.js";
import {
  buildV2GenerationProgress,
  V2_GENERATION_STAGE,
  V2_GENERATION_STATUS
} from "./generationProgress.js";

export function buildPendingV2Chapter(body = {}, {
  chapterId = createId("chapter"),
  jobId = "",
  now = new Date().toISOString()
} = {}) {
  const submitted = createSubmittedChapter(body);
  const progress = buildV2GenerationProgress({
    jobId,
    chapterId,
    status: V2_GENERATION_STATUS.QUEUED,
    stage: V2_GENERATION_STAGE.ACCEPTED,
    updatedAt: now
  });

  return {
    ...submitted,
    id: chapterId,
    status: "submitted",
    displayStatusText: progress.displayText,
    generationProgress: progress,
    generationMeta: {
      ...(submitted.generationMeta || {}),
      schemaVersion: "v2_review_path_queued_1",
      currentStage: progress.stage,
      v2Progress: progress,
      generationProgress: progress
    },
    createdAt: now,
    updatedAt: now
  };
}

export function buildV2ChapterQueueIdempotencyKey({ deviceId, body = {} } = {}) {
  return buildV2GenerationIdempotencyKey({
    deviceId,
    jobType: "v2_create_chapter",
    sourceUrl: body.sourceUrl || "",
    rawText: body.rawText || body.cleanedText || body.text || "",
    contentHash: body.contentHash || "",
    clientRequestId: body.clientRequestId || body.client_request_id || ""
  });
}

export async function enqueueV2ChapterGeneration({
  deviceId,
  body,
  deps,
  now = new Date().toISOString()
} = {}) {
  if (!deviceId) throw new Error("enqueueV2ChapterGeneration requires deviceId");
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("enqueueV2ChapterGeneration requires request body");
  }
  const services = normalizeDeps(deps);
  const idempotencyKey = buildV2ChapterQueueIdempotencyKey({ deviceId, body });
  const existingJob = await services.getPendingGenerationJobByIdempotencyKey(deviceId, idempotencyKey);
  if (existingJob) {
    const existingChapter = await services.getChapter(deviceId, existingJob.chapterId);
    return buildQueueResponse({
      chapter: existingChapter,
      job: existingJob,
      reused: true
    });
  }

  const chapterId = body.chapterId || body.id || createId("chapter");
  const jobId = createId("generation");
  const pendingChapter = buildPendingV2Chapter(body, { chapterId, jobId, now });
  const savedChapter = await services.upsertChapter(deviceId, pendingChapter);
  const { job, reused } = await services.enqueueIdempotentGenerationJob(deviceId, {
    id: jobId,
    chapterId,
    status: "submitted",
    currentStage: "accepted",
    jobType: "v2_create_chapter",
    payload: buildV2JobPayload(body),
    idempotencyKey
  });
  const chapter = reused
    ? (await services.getChapter(deviceId, job.chapterId)) || savedChapter
    : savedChapter;

  return buildQueueResponse({ chapter, job, reused });
}

function buildV2JobPayload(body) {
  const payload = { body };
  if (body.debugV2FailureMode) {
    payload.debugV2FailureMode = body.debugV2FailureMode;
  }
  return payload;
}

function buildQueueResponse({ chapter, job, reused }) {
  return {
    status: chapter?.status || "submitted",
    chapter,
    generationProgress: chapter?.generationProgress || chapter?.generationMeta?.v2Progress || null,
    job,
    reused: Boolean(reused)
  };
}

function normalizeDeps(deps = {}) {
  const required = [
    "getPendingGenerationJobByIdempotencyKey",
    "getChapter",
    "upsertChapter",
    "enqueueIdempotentGenerationJob"
  ];
  for (const key of required) {
    if (typeof deps[key] !== "function") {
      throw new Error(`enqueueV2ChapterGeneration missing dependency: ${key}`);
    }
  }
  return deps;
}

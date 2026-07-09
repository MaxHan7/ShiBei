#!/usr/bin/env node
import "../src/env.js";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { summarizeModelUsage, createModelUsageRecorder } from "../src/generation/modelCost.js";
import { createMediaUsageRecorder, summarizeMediaUsage } from "../src/media/mediaCost.js";
import { extractVideoLearningSource } from "../src/media/extractVideoLearningSource.js";
import { createFileTtlCache } from "../src/media/videoExtractionCache.js";
import { buildV2SourceFromLearningSource } from "../src/media/learningSource.js";
import { VIDEO_DEFAULTS } from "../src/media/videoDefaults.js";
import { createV2ModelPromptCaller } from "../src/v2/generation/modelPromptCaller.js";
import { runV2GenerationJob } from "../src/v2/generation/runV2GenerationJob.js";
import {
  buildV2QualityReport,
  buildV2QualityRunPaths,
  resolveUniqueV2QualityRunPaths,
  sanitizeFileSegment,
  writeV2QualityArtifacts
} from "../src/v2/generation/tests/v2QualityExperiment.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

async function main() {
  const startedAt = Date.now();
  const args = parseArgs(process.argv.slice(2));
  const sourceUrl = args.url || process.env.QUALITY_VIDEO_URL?.trim();
  if (!sourceUrl) {
    console.error("Usage: node backend/scripts/run-video-v2-quality-experiment.mjs --url <video-url>");
    process.exit(1);
  }

  const timeoutMs = readOptionalPositiveInt(process.env.QUALITY_EXPERIMENT_TIMEOUT_MS) ?? 20 * 60 * 1000;
  const outputRoot = path.resolve(
    args.outputRoot
      || process.env.QUALITY_OUTPUT_ROOT?.trim()
      || path.join(repoRoot, "docs", "quality-runs", "video-link")
  );
  const label = args.label || process.env.QUALITY_EXPERIMENT_LABEL?.trim() || "video-v2-quality";
  const cacheRoot = path.resolve(
    args.cacheRoot
      || process.env.QUALITY_VIDEO_CACHE_DIR?.trim()
      || path.join(outputRoot, ".cache")
  );
  const cacheTtlMs = readOptionalPositiveInt(process.env.QUALITY_VIDEO_CACHE_TTL_MS) ?? 30 * 24 * 60 * 60 * 1000;
  const cacheMaxEntries = readOptionalPositiveInt(process.env.QUALITY_VIDEO_CACHE_MAX_ENTRIES) ?? 200;
  const videoSourceCache = createFileTtlCache({
    dir: path.join(cacheRoot, "video-source"),
    ttlMs: cacheTtlMs,
    maxEntries: cacheMaxEntries
  });
  const learningSourceCache = createFileTtlCache({
    dir: path.join(cacheRoot, "learning-source"),
    ttlMs: cacheTtlMs,
    maxEntries: cacheMaxEntries
  });
  const mediaUsageRecords = [];
  const mediaUsageRecorder = createMediaUsageRecorder({ runId: `video-quality-${Date.now()}`, calls: mediaUsageRecords });
  const progressEvents = [];
  const timeoutState = { timedOut: false };

  logProgress(progressEvents, {
    status: "stage_start",
    stage: "video_extraction",
    elapsedMs: 0
  });
  const learningSource = await extractVideoLearningSource({
    sourceUrl,
    mediaUsageRecorder,
    videoSourceCache,
    learningSourceCache
  });
  const source = buildV2SourceFromLearningSource(learningSource);
  logProgress(progressEvents, {
    status: "stage_done",
    stage: "video_extraction",
    elapsedMs: Date.now() - startedAt,
    message: `blocks=${source.blocks.length} text=${source.cleanedText.length}`
  });

  const slug = args.slug
    || process.env.QUALITY_EXPERIMENT_SLUG?.trim()
    || sanitizeFileSegment(source.title || "video-v2-quality", "video-v2-quality");
  const paths = await resolveUniqueV2QualityRunPaths(buildV2QualityRunPaths({
    outputRoot,
    slug,
    label
  }));
  const modelUsageRecords = [];
  const modelUsageRecorder = createModelUsageRecorder({ runId: paths.runId, calls: modelUsageRecords });
  const article = buildArticleInput({ source, paths });

  logProgress(progressEvents, {
    status: "run_start",
    stage: "quality:v2-video",
    elapsedMs: Date.now() - startedAt,
    message: `label=${paths.label} slug=${paths.slug}`
  });

  const jobResult = await withExperimentTimeout(
    runV2GenerationJob(article, {
      modelUsageRecorder,
      generationMetaMode: "quality",
      createPromptCaller: createProgressPromptCallerFactory({
        modelUsageRecorder,
        progressEvents,
        startedAt
      })
    }),
    {
      timeoutMs,
      progressEvents,
      startedAt,
      timeoutState
    }
  );

  const mediaUsage = summarizeMediaUsage(mediaUsageRecords);
  const questionCount = countQuestions(jobResult?.chapter);
  const modelCostSummary = summarizeModelUsage(modelUsageRecords, { qualifiedQuestionCount: questionCount });
  const mediaCostSummary = buildMediaCostSummary(mediaUsage);
  jobResult.modelUsage = modelUsageRecords.map((record, index) => ({ index: index + 1, ...record }));
  const report = buildV2QualityReport({
    slug: paths.slug,
    label: paths.label,
    source: {
      sourceType: "video_link",
      sourceTitle: source.title,
      sourceUrl: source.url,
      sourceAccount: source.account,
      rawText: source.cleanedText
    },
    jobResult,
    mediaUsage,
    mediaUsageRecords,
    modelCostSummary,
    mediaCostSummary,
    progressEvents,
    learningSourceSummary: summarizeLearningSource(learningSource)
  });

  await writeV2QualityArtifacts({ report, paths });
  logProgress(progressEvents, {
    status: "run_done",
    stage: "quality:v2-video",
    elapsedMs: Date.now() - startedAt,
    message: `status=${report.status} json=${paths.jsonPath} html=${paths.htmlPath}`
  });
  console.log(JSON.stringify({
    jsonPath: paths.jsonPath,
    htmlPath: paths.htmlPath,
    status: report.status,
    metrics: report.metrics,
    mediaCostSummary,
    modelCostSummary: modelCostSummary.totalsByCurrency
  }, null, 2));

  if (timeoutState.timedOut) {
    process.exitCode = 124;
    setTimeout(() => process.exit(124), 250).unref();
  }
}

function buildArticleInput({ source, paths }) {
  return {
    id: paths.slug,
    title: source.title || paths.label,
    sourceType: "video_link",
    sourceTitle: source.title || "",
    sourceUrl: source.url || "",
    url: source.url || "",
    sourceAccount: source.account || "",
    author: source.account || "",
    rawText: source.cleanedText || "",
    cleanedText: source.cleanedText || "",
    source,
    blocks: source.blocks
  };
}

function createProgressPromptCallerFactory({
  modelUsageRecorder,
  progressEvents,
  startedAt
}) {
  return function createProgressPromptCaller({ runtimeRecorder } = {}) {
    const basePromptCaller = createV2ModelPromptCaller({ modelUsageRecorder, runtimeRecorder });
    const stageAttempts = new Map();

    return async function callWithProgress(stage, payload) {
      const attempt = (stageAttempts.get(stage) || 0) + 1;
      stageAttempts.set(stage, attempt);
      const stageStartedAt = Date.now();
      logProgress(progressEvents, {
        status: "stage_start",
        stage,
        attempt,
        elapsedMs: stageStartedAt - startedAt
      });

      try {
        const output = await basePromptCaller(stage, payload);
        logProgress(progressEvents, {
          status: "stage_done",
          stage,
          attempt,
          elapsedMs: Date.now() - startedAt,
          durationMs: Date.now() - stageStartedAt
        });
        return output;
      } catch (error) {
        logProgress(progressEvents, {
          status: "stage_failed",
          stage,
          attempt,
          elapsedMs: Date.now() - startedAt,
          durationMs: Date.now() - stageStartedAt,
          message: error instanceof Error ? error.message : String(error || "stage failed")
        });
        throw error;
      }
    };
  };
}

function withExperimentTimeout(promise, {
  timeoutMs,
  progressEvents,
  startedAt,
  timeoutState
}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) return promise;

  let timeout;
  const timeoutPromise = new Promise((resolve) => {
    timeout = setTimeout(() => {
      timeoutState.timedOut = true;
      const lastEvent = progressEvents[progressEvents.length - 1];
      const stage = lastEvent?.stage || "unknown";
      logProgress(progressEvents, {
        status: "run_timeout",
        stage,
        attempt: lastEvent?.attempt || "",
        elapsedMs: Date.now() - startedAt,
        message: `QUALITY_EXPERIMENT_TIMEOUT_MS=${timeoutMs} exceeded`
      });
      resolve({
        status: "failed_generation",
        displayStatusText: "生成失败",
        failedStage: "quality_experiment_timeout",
        failureReason: `视频质量实验超过 ${timeoutMs}ms；最后阶段：${stage}`,
        retryable: true,
        ...(stage !== "unknown" ? { modelStage: stage } : {}),
        diagnostics: [
          {
            code: "v2_video_quality_experiment_timeout",
            message: `视频质量实验超过 ${timeoutMs}ms；最后阶段：${stage}`
          }
        ]
      });
    }, timeoutMs);
  });

  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timeout)),
    timeoutPromise
  ]);
}

function buildMediaCostSummary(mediaUsage) {
  const tikhubUnitCost = readOptionalPositiveNumber(process.env.TIKHUB_UNIT_COST_USD) ?? VIDEO_DEFAULTS.tikhubUnitCostUsd;
  const byStage = {};
  let totalActualCost = 0;

  for (const [stage, row] of Object.entries(mediaUsage?.byStage || {})) {
    const cost = estimateMediaStageCost(stage, row, { tikhubUnitCost });
    totalActualCost += cost.actualCost;
    byStage[stage] = {
      ...row,
      currency: "USD",
      actualCost: roundCost(cost.actualCost),
      costNote: cost.costNote
    };
  }

  return {
    currency: "USD",
    totalActualCost: roundCost(totalActualCost),
    byStage
  };
}

function estimateMediaStageCost(stage, row, { tikhubUnitCost }) {
  if (stage === "tikhub_fetch") {
    return {
      actualCost: Number(row.callCount || 0) * tikhubUnitCost,
      costNote: `TikHub dashboard unit price from user: USD ${tikhubUnitCost}/call`
    };
  }
  if (stage === "visual_understanding" && String(row.provider || "").includes("qwen")) {
    const usage = row.metadata?.usage || {};
    const inputTokens = Number(usage.input_tokens ?? usage.prompt_tokens ?? 0);
    const outputTokens = Number(usage.output_tokens ?? usage.completion_tokens ?? 0);
    return {
      actualCost: ((inputTokens * 0.05) + (outputTokens * 0.40)) / 1_000_000,
      costNote: "qwen3-vl-flash estimate: USD 0.05/M input, USD 0.40/M output"
    };
  }
  return {
    actualCost: Number(row.totalCost || 0),
    costNote: Number(row.totalCost || 0) > 0 ? "provider recorded cost" : "local/no provider fee recorded"
  };
}

function summarizeLearningSource(learningSource) {
  return {
    id: learningSource.id,
    type: learningSource.type,
    platform: learningSource.platform,
    title: learningSource.title,
    normalizedTextLength: String(learningSource.normalizedText || "").length,
    sectionCount: Array.isArray(learningSource.sourceSections) ? learningSource.sourceSections.length : 0,
    contentBasis: learningSource.extractionMeta?.userVisibleContentBasis || null,
    visualUnderstanding: learningSource.extractionMeta?.visualUnderstanding || null,
    cache: learningSource.extractionMeta?.cache || null
  };
}

function countQuestions(chapter) {
  return (Array.isArray(chapter?.units) ? chapter.units : []).reduce(
    (sum, unit) => sum + (Array.isArray(unit.questions) ? unit.questions.length : 0),
    0
  );
}

function logProgress(progressEvents, event) {
  const record = {
    at: new Date().toISOString(),
    ...event
  };
  progressEvents.push(record);
  console.error(formatProgressEvent(record));
}

function formatProgressEvent(event) {
  const parts = [
    `[quality:v2-video] ${event.status}`,
    `stage=${event.stage}`,
    event.attempt ? `attempt=${event.attempt}` : "",
    Number.isFinite(event.elapsedMs) ? `elapsed=${Math.round(event.elapsedMs / 1000)}s` : "",
    Number.isFinite(event.durationMs) ? `duration=${Math.round(event.durationMs / 1000)}s` : "",
    event.message || ""
  ].filter(Boolean);
  return parts.join(" ");
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--url") args.url = argv[++index] || "";
    else if (arg === "--slug") args.slug = argv[++index] || "";
    else if (arg === "--label") args.label = argv[++index] || "";
    else if (arg === "--output-root") args.outputRoot = argv[++index] || "";
    else if (arg === "--cache-root") args.cacheRoot = argv[++index] || "";
  }
  return args;
}

function readOptionalPositiveInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function readOptionalPositiveNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function roundCost(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 1_000_000_000) / 1_000_000_000 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

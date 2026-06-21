import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractSourceContent, isLikelyUrl } from "../../../sources/extractSourceContent.js";
import { createV2ModelPromptCaller } from "../modelPromptCaller.js";
import { runV2GenerationJob } from "../runV2GenerationJob.js";
import {
  buildV2QualityReport,
  buildV2QualityRunPaths,
  resolveUniqueV2QualityRunPaths,
  sanitizeFileSegment,
  writeV2QualityArtifacts
} from "./v2QualityExperiment.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const shibeiV2Root = path.resolve(__dirname, "../../../../..");

async function main() {
  const startedAt = Date.now();
  const timeoutMs = readOptionalPositiveInt(process.env.QUALITY_EXPERIMENT_TIMEOUT_MS) ?? 15 * 60 * 1000;
  const progressEvents = [];
  const timeoutState = { timedOut: false };

  const source = await resolveSource();
  const slug = process.env.QUALITY_EXPERIMENT_SLUG?.trim() || sanitizeFileSegment(source.sourceTitle || "v2-quality", "v2-quality");
  const label = process.env.QUALITY_EXPERIMENT_LABEL?.trim() || "v2-quality";
  const outputRoot = process.env.QUALITY_OUTPUT_ROOT?.trim()
    ? path.resolve(process.env.QUALITY_OUTPUT_ROOT)
    : path.join(shibeiV2Root, "docs", "quality-runs", "v2-single-article");

  const paths = await resolveUniqueV2QualityRunPaths(buildV2QualityRunPaths({
    outputRoot,
    slug,
    label
  }));

  const article = {
    id: paths.slug,
    title: source.sourceTitle || paths.label,
    sourceUrl: source.sourceUrl || "",
    sourceAccount: source.sourceAccount || "",
    rawText: source.rawText,
    cleanedText: source.rawText
  };
  const modelUsageRecords = [];
  const modelUsageRecorder = {
    record(record) {
      modelUsageRecords.push(record);
      return record;
    }
  };

  console.error(formatProgressEvent({
    status: "run_start",
    stage: "quality:v2",
    elapsedMs: 0,
    message: `label=${paths.label} slug=${paths.slug}`
  }));

  const jobResult = await withExperimentTimeout(
    runV2GenerationJob(article, {
      modelUsageRecorder,
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

  jobResult.modelUsage = sanitizeModelUsageRecords(modelUsageRecords);
  const report = buildV2QualityReport({
    slug: paths.slug,
    label: paths.label,
    source,
    jobResult
  });

  await writeV2QualityArtifacts({ report, paths });
  console.error(formatProgressEvent({
    status: "run_done",
    stage: "quality:v2",
    elapsedMs: Date.now() - startedAt,
    message: `status=${report.status} json=${paths.jsonPath} html=${paths.htmlPath}`
  }));
  console.log(JSON.stringify({
    jsonPath: paths.jsonPath,
    htmlPath: paths.htmlPath,
    status: report.status,
    metrics: report.metrics,
    failure: report.failure
  }, null, 2));

  if (timeoutState.timedOut) {
    process.exitCode = 124;
    setTimeout(() => process.exit(124), 250).unref();
  }
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
        failureReason: `质量实验超过 ${timeoutMs}ms；最后阶段：${stage}`,
        retryable: true,
        ...(stage !== "unknown" ? { modelStage: stage } : {}),
        diagnostics: [
          {
            code: "v2_quality_experiment_timeout",
            message: `质量实验超过 ${timeoutMs}ms；最后阶段：${stage}`
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

function logProgress(progressEvents, event) {
  progressEvents.push({
    at: new Date().toISOString(),
    ...event
  });
  console.error(formatProgressEvent(event));
}

function formatProgressEvent(event) {
  const parts = [
    `[quality:v2] ${event.status}`,
    `stage=${event.stage}`,
    event.attempt ? `attempt=${event.attempt}` : "",
    Number.isFinite(event.elapsedMs) ? `elapsed=${Math.round(event.elapsedMs / 1000)}s` : "",
    Number.isFinite(event.durationMs) ? `duration=${Math.round(event.durationMs / 1000)}s` : "",
    event.message || ""
  ].filter(Boolean);
  return parts.join(" ");
}

async function resolveSource() {
  const articleUrl = process.env.QUALITY_ARTICLE_URL?.trim();
  const textFile = process.env.QUALITY_ARTICLE_TEXT_FILE?.trim();

  if (articleUrl) {
    if (!isLikelyUrl(articleUrl)) {
      throw new Error("QUALITY_ARTICLE_URL 必须是 http 或 https 文章链接。");
    }
    return extractSourceContent({
      sourceType: "article_link",
      sourceUrl: articleUrl
    });
  }

  if (textFile) {
    const absolutePath = path.resolve(textFile);
    const rawText = await readFile(absolutePath, "utf8");
    return extractSourceContent({
      sourceType: "text",
      rawText,
      sourceTitle: process.env.QUALITY_ARTICLE_TITLE?.trim() || path.basename(absolutePath),
      sourceUrl: process.env.QUALITY_ARTICLE_SOURCE_URL?.trim() || "",
      sourceAccount: process.env.QUALITY_ARTICLE_ACCOUNT?.trim() || ""
    });
  }

  throw new Error("请设置 QUALITY_ARTICLE_URL 或 QUALITY_ARTICLE_TEXT_FILE。");
}

function sanitizeModelUsageRecords(records) {
  return (Array.isArray(records) ? records : []).map((record, index) => ({
    index: index + 1,
    provider: record.provider || "",
    model: record.model || "",
    stage: record.stage || "",
    estimatedOutputTokens: record.estimatedOutputTokens || 0,
    error: record.error || "",
    parseError: record.parseError || "",
    rawResponsePreview: record.rawResponsePreview || "",
    usage: sanitizeUsage(record.usage)
  }));
}

function sanitizeUsage(usage) {
  if (!usage || typeof usage !== "object") return null;
  return {
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_tokens: usage.total_tokens,
    prompt_cache_hit_tokens: usage.prompt_cache_hit_tokens,
    prompt_cache_miss_tokens: usage.prompt_cache_miss_tokens
  };
}

function readOptionalPositiveInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

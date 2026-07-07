#!/usr/bin/env node
import "../src/env.js";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createMediaUsageRecorder, summarizeMediaUsage } from "../src/media/mediaCost.js";
import { extractVideoLearningSource } from "../src/media/extractVideoLearningSource.js";

const args = parseArgs(process.argv.slice(2));
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const inputPath = resolveRepoPath(args.inputPath);
const outputPath = resolveRepoPath(
  args.outputPath || "quality-test-set/results/video-learning-source/benchmark.json"
);

if (!inputPath) {
  console.error("Usage: node backend/scripts/benchmark-video-learning-source.mjs <links.json> [output.json]");
  console.error("   or: node backend/scripts/benchmark-video-learning-source.mjs --url <video-url> [output.json]");
  process.exit(1);
}

const links = args.sourceUrl ? [{ url: args.sourceUrl }] : JSON.parse(await readFile(inputPath, "utf8"));
const results = [];

for (const [index, item] of links.entries()) {
  const sourceUrl = typeof item === "string" ? item : item.url;
  const contentType = typeof item === "string" ? "" : item.contentType || "";
  const startedAt = new Date().toISOString();
  const usageRecorder = createMediaUsageRecorder({ runId: `video-benchmark-${index + 1}` });
  try {
    const source = await extractVideoLearningSource({ sourceUrl, mediaUsageRecorder: usageRecorder });
    const mediaUsage = summarizeMediaUsage(usageRecorder.calls);
    results.push({
      index,
      sourceUrl,
      contentType,
      status: "succeeded",
      platform: source.platform,
      title: source.title,
      normalizedTextLength: source.normalizedText.length,
      sectionCount: source.sourceSections.length,
      framePack: summarizeFramePack(mediaUsage),
      mediaUsage,
      startedAt,
      finishedAt: new Date().toISOString()
    });
  } catch (error) {
    const mediaUsage = summarizeMediaUsage(usageRecorder.calls);
    results.push({
      index,
      sourceUrl,
      contentType,
      status: "failed",
      code: error.code || "unknown",
      mediaErrorType: error.mediaErrorType || "",
      message: error.message,
      retryable: Boolean(error.retryable),
      framePack: summarizeFramePack(mediaUsage),
      mediaUsage,
      startedAt,
      finishedAt: new Date().toISOString()
    });
  }
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  inputPath,
  total: results.length,
  succeeded: results.filter((result) => result.status === "succeeded").length,
  failed: results.filter((result) => result.status === "failed").length,
  results
}, null, 2));

console.log(`Wrote ${outputPath}`);

function summarizeFramePack(mediaUsage) {
  const stage = mediaUsage?.byStage?.video_frame_pack || {};
  const metadata = stage.metadata || {};
  return {
    provider: stage.provider || "",
    frameCount: Number(metadata.frameCount || 0),
    gridCount: Number(metadata.gridCount || 0),
    skipped: Boolean(metadata.skipped),
    reason: String(metadata.reason || ""),
    timestampMode: String(metadata.timestampMode || "")
  };
}

function parseArgs(argv) {
  if (argv[0] === "--url") {
    return {
      sourceUrl: argv[1] || "",
      inputPath: "inline-url",
      outputPath: argv[2] || ""
    };
  }
  return {
    inputPath: argv[0] || "",
    outputPath: argv[1] || ""
  };
}

function resolveRepoPath(value) {
  if (!value || value === "inline-url") return value || "";
  if (isAbsolute(value)) return value;
  return value.startsWith(".") ? resolve(process.cwd(), value) : resolve(repoRoot, value);
}

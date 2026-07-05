#!/usr/bin/env node
import "../src/env.js";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { createMediaUsageRecorder, summarizeMediaUsage } from "../src/media/mediaCost.js";
import { extractVideoLearningSource } from "../src/media/extractVideoLearningSource.js";

const inputPath = process.argv[2];
const outputPath = process.argv[3] || resolve(process.cwd(), "../quality-test-set/results/video-learning-source/benchmark.json");

if (!inputPath) {
  console.error("Usage: node backend/scripts/benchmark-video-learning-source.mjs <links.json> [output.json]");
  process.exit(1);
}

const links = JSON.parse(await readFile(inputPath, "utf8"));
const results = [];

for (const [index, item] of links.entries()) {
  const sourceUrl = typeof item === "string" ? item : item.url;
  const contentType = typeof item === "string" ? "" : item.contentType || "";
  const startedAt = new Date().toISOString();
  const usageRecorder = createMediaUsageRecorder({ runId: `video-benchmark-${index + 1}` });
  try {
    const source = await extractVideoLearningSource({ sourceUrl, mediaUsageRecorder: usageRecorder });
    results.push({
      index,
      sourceUrl,
      contentType,
      status: "succeeded",
      platform: source.platform,
      title: source.title,
      normalizedTextLength: source.normalizedText.length,
      sectionCount: source.sourceSections.length,
      mediaUsage: summarizeMediaUsage(usageRecorder.calls),
      startedAt,
      finishedAt: new Date().toISOString()
    });
  } catch (error) {
    results.push({
      index,
      sourceUrl,
      contentType,
      status: "failed",
      code: error.code || "unknown",
      mediaErrorType: error.mediaErrorType || "",
      message: error.message,
      retryable: Boolean(error.retryable),
      mediaUsage: summarizeMediaUsage(usageRecorder.calls),
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

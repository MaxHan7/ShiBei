#!/usr/bin/env node
import "../src/env.js";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const configPath = resolveRepoPath(process.argv[2] || "");
const outputPath = resolveRepoPath(
  process.argv[3] || "quality-test-set/results/video-learning-source/model-candidates.json"
);

if (!configPath) {
  console.error("Usage: node backend/scripts/benchmark-video-model-candidates.mjs <candidates.json> [output.json]");
  process.exit(1);
}

const config = JSON.parse(await readFile(configPath, "utf8"));
const rows = [];

for (const source of config.sources || []) {
  for (const asr of enabled(config.asrCandidates)) {
    for (const visual of enabled(config.visualCandidates)) {
      for (const generation of enabled(config.generationCandidates)) {
        rows.push({
          sourceId: source.id,
          platform: source.platform,
          contentType: source.contentType || "",
          asrCandidate: asr.id,
          visualCandidate: visual.id,
          generationCandidate: generation.id,
          status: "planned",
          metrics: {
            sourceFetchSucceeded: null,
            asrSucceeded: null,
            visualSucceeded: null,
            generationSucceeded: null,
            normalizedTextLength: null,
            questionCount: null,
            sourceSupportRate: null,
            severeIssueRate: null,
            estimatedCost: null,
            durationMs: null
          }
        });
      }
    }
  }
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  configPath,
  rowCount: rows.length,
  rows
}, null, 2));

console.log(`Wrote ${outputPath}`);

function enabled(items = []) {
  return items.filter((item) => item.enabled !== false);
}

function resolveRepoPath(value) {
  if (!value) return "";
  if (isAbsolute(value)) return value;
  return value.startsWith(".") ? resolve(process.cwd(), value) : resolve(repoRoot, value);
}

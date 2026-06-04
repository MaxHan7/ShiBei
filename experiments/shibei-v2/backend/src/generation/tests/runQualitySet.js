import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateReviewChapter } from "../index.js";
import { buildReviewRows, parseSampleFile, summarize } from "./qualityReport.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../..");
const samplesDir = path.join(repoRoot, "quality-test-set", "samples");
const syntheticSamplesDir = path.join(repoRoot, "quality-test-set", "synthetic-samples");
const resultsDir = path.join(repoRoot, "quality-test-set", "results");

async function main() {
  const sampleFiles = await listSampleFiles();

  if (!sampleFiles.length) {
    throw new Error(process.env.QUALITY_SAMPLE
      ? `没有找到匹配 QUALITY_SAMPLE=${process.env.QUALITY_SAMPLE} 的测试样本。`
      : "没有找到可运行的测试样本。");
  }

  const results = [];
  for (const sample of sampleFiles) {
    const rawFile = await readFile(sample.path, "utf8");
    const parsed = parseSampleFile(rawFile, sample.file);
    const startedAt = new Date().toISOString();
    try {
      const output = await generateReviewChapter({ sourceType: "text", rawText: parsed.body });
      results.push({
        file: sample.file,
        sampleSet: sample.sampleSet,
        sampleMeta: parsed.meta,
        startedAt,
        status: output.status,
        chapter: output.chapter || null,
        generationDebug: output.generationDebug || null,
        message: output.message || ""
      });
    } catch (error) {
      results.push({
        file: sample.file,
        sampleSet: sample.sampleSet,
        sampleMeta: parsed.meta,
        startedAt,
        status: "error",
        chapter: null,
        generationDebug: null,
        message: error.message
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    config: {
      sampleFilter: process.env.QUALITY_SAMPLE || "",
      limit: process.env.QUALITY_LIMIT || "",
      includeSynthetic: process.env.QUALITY_INCLUDE_SYNTHETIC === "1"
    },
    summary: summarize(results),
    reviewRows: buildReviewRows(results),
    results
  };

  await mkdir(resultsDir, { recursive: true });
  const outputFile = path.join(resultsDir, `${outputBasename()}.json`);
  await writeFile(outputFile, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ outputFile, summary: report.summary }, null, 2));
}

async function listSampleFiles() {
  const sampleFilter = process.env.QUALITY_SAMPLE?.trim().toLowerCase();
  const limit = Number.parseInt(process.env.QUALITY_LIMIT || "", 10);
  const includeSynthetic = process.env.QUALITY_INCLUDE_SYNTHETIC === "1";
  const realSamples = await listFiles(samplesDir, "real");
  const syntheticSamples = includeSynthetic ? await listFiles(syntheticSamplesDir, "synthetic") : [];
  const filtered = [...realSamples, ...syntheticSamples]
    .filter((sample) => !sampleFilter || sample.file.toLowerCase().includes(sampleFilter))
    .sort((a, b) => `${a.sampleSet}:${a.file}`.localeCompare(`${b.sampleSet}:${b.file}`));
  return Number.isFinite(limit) && limit > 0 ? filtered.slice(0, limit) : filtered;
}

async function listFiles(directory, sampleSet) {
  const files = await readdir(directory);
  return files
    .filter((file) => file.endsWith(".md") || file.endsWith(".txt"))
    .filter((file) => file.toLowerCase() !== "readme.md")
    .map((file) => ({
      file,
      sampleSet,
      path: path.join(directory, file)
    }));
}

function outputBasename() {
  const requested = process.env.QUALITY_OUTPUT_BASENAME?.trim();
  return requested || timestamp();
}

function timestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}-${hh}${mi}${ss}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

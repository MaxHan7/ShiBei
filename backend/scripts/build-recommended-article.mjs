import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { extractSourceContent } from "../src/sources/extractSourceContent.js";
import { runV2GenerationJob } from "../src/v2/generation/runV2GenerationJob.js";
import { createV2ModelPromptCaller } from "../src/v2/generation/modelPromptCaller.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, "..");
const repoRoot = resolve(backendRoot, "..");
const DEFAULT_CANDIDATES_PATH = resolve(backendRoot, "content/recommended-candidates.json");
const DEFAULT_OUTPUT_DIR = resolve(backendRoot, "content/recommended");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const candidateId = args["candidate-id"] || args.id;
  if (!candidateId) {
    throw new Error("Usage: node backend/scripts/build-recommended-article.mjs --candidate-id <id> [--text-file <path>] [--output-dir <path>]");
  }

  const candidatesPath = resolve(args["candidates-path"] || DEFAULT_CANDIDATES_PATH);
  const outputDir = resolve(args["output-dir"] || DEFAULT_OUTPUT_DIR);
  const catalog = JSON.parse(await readFile(candidatesPath, "utf8"));
  const candidate = (catalog.articles || []).find((article) => article.id === candidateId);
  if (!candidate) {
    throw new Error(`Recommended article candidate not found: ${candidateId}`);
  }

  const source = await resolveSource(candidate, args);
  const modelUsageRecords = [];
  const result = await runV2GenerationJob({
    id: candidate.id,
    sourceTitle: source.sourceTitle || candidate.title,
    sourceUrl: candidate.sourceUrl,
    sourceAccount: source.sourceAccount || candidate.sourceAuthor || candidate.source,
    rawText: source.rawText,
    cleanedText: source.rawText
  }, {
    generationMetaMode: "production",
    createPromptCaller: ({ runtimeRecorder } = {}) => {
      const basePromptCaller = createV2ModelPromptCaller({
        runtimeRecorder,
        modelUsageRecorder: {
          record(record) {
            modelUsageRecords.push(record);
            return record;
          }
        }
      });
      return async function promptCallerWithProgress(stage, payload) {
        const startedAt = Date.now();
        console.error(`[recommended:build] stage_start candidate=${candidate.id} stage=${stage}`);
        const output = await basePromptCaller(stage, payload);
        console.error(`[recommended:build] stage_done candidate=${candidate.id} stage=${stage} duration=${Date.now() - startedAt}ms`);
        return output;
      };
    }
  });

  if (result.status !== "completed" || !result.chapter) {
    console.error(JSON.stringify({
      candidateId,
      status: result.status,
      failedStage: result.failedStage,
      failureReason: result.failureReason,
      errors: result.errors || [],
      issues: result.issues || [],
      diagnostics: result.diagnostics || []
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const preparedChapter = prepareChapterForSeed(result.chapter, candidate, source);
  await mkdir(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, `${candidate.id}-chapter.json`);
  await writeFile(outputPath, `${JSON.stringify(preparedChapter, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    candidateId,
    outputPath,
    catalogPreparedChapterPath: relative(resolve(backendRoot, "content"), outputPath),
    title: preparedChapter.title,
    unitCount: Array.isArray(preparedChapter.units) ? preparedChapter.units.length : 0,
    modelUsage: summarizeModelUsage(modelUsageRecords)
  }, null, 2));
}

async function resolveSource(candidate, args) {
  const textFile = args["text-file"];
  if (textFile) {
    const rawText = await readFile(resolve(textFile), "utf8");
    return extractSourceContent({
      sourceType: "text",
      rawText,
      sourceTitle: candidate.title,
      sourceUrl: candidate.sourceUrl,
      sourceAccount: candidate.sourceAuthor || candidate.source
    });
  }

  if (candidate.contentAccess === "public_pdf" || /\.pdf($|\?)/i.test(candidate.sourceUrl || "")) {
    throw new Error(`Candidate ${candidate.id} is a PDF source. Provide --text-file with reviewed extracted text.`);
  }

  return extractSourceContent({
    sourceType: "article_link",
    sourceUrl: candidate.sourceUrl
  });
}

function prepareChapterForSeed(chapter, candidate, source) {
  const now = new Date().toISOString();
  const seedSource = sanitizeSeedSource({
    ...(chapter.source || {}),
    type: "article",
    title: source.sourceTitle || candidate.title,
    author: candidate.sourceAuthor || source.sourceAccount || candidate.source,
    account: candidate.source || source.sourceAccount || "",
    accountOrDomain: candidate.source || source.sourceAccount || "",
    url: candidate.sourceUrl,
    rawInput: candidate.sourceUrl
  }, chapter);

  return {
    ...chapter,
    id: candidate.id,
    title: chapter.title || candidate.title,
    status: "completed",
    displayStatusText: "已生成",
    source: seedSource,
    reviewSession: null,
    v2ReviewSession: null,
    generationProgress: null,
    generationMeta: {
      ...(chapter.generationMeta || {}),
      seededRecommendedArticle: true,
      recommendedArticleId: candidate.id,
      recommendedArticleSource: candidate.source,
      preparedAt: now
    },
    updatedAt: now
  };
}

function sanitizeSeedSource(source, chapter) {
  const sanitized = { ...source };
  delete sanitized.rawText;
  delete sanitized.cleanedText;
  delete sanitized.extractedText;

  if (Array.isArray(sanitized.blocks)) {
    const referencedBlockIds = collectReferencedSourceBlockIds(chapter);
    if (referencedBlockIds.size > 0) {
      sanitized.blocks = sanitized.blocks.filter((block) => referencedBlockIds.has(block.id));
    }
  }

  return sanitized;
}

function collectReferencedSourceBlockIds(chapter) {
  const blockIds = new Set();
  for (const unit of chapter.units || []) {
    for (const blockId of unit.sourceAnchor?.blockIds || []) {
      blockIds.add(blockId);
    }
    for (const anchor of unit.sourceAnchors || []) {
      for (const blockId of anchor.blockIds || []) {
        blockIds.add(blockId);
      }
    }
  }
  return blockIds;
}

function summarizeModelUsage(records) {
  return {
    stages: records.length,
    totalTokens: records.reduce((sum, record) => sum + Number(record.usage?.total_tokens || 0), 0)
  };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

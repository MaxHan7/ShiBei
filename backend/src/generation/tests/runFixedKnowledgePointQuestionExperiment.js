import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractSourceContent, isLikelyUrl } from "../../sources/extractSourceContent.js";
import { generateReviewChapter } from "../index.js";
import {
  buildExperimentPaths,
  buildSingleArticleReport,
  resolveUniqueExperimentPaths,
  writeExperimentArtifacts
} from "./singleArticleExperiment.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../..");
const DEFAULT_BASELINE = path.join(
  repoRoot,
  "quality-test-set",
  "results",
  "single-article",
  "UMr6ia1QubqOMw3aBUGbOw",
  "runs",
  "20260604-022023-v26-prd-field-standard-lean-prompt.json"
);

async function main() {
  const baselinePath = path.resolve(process.env.FIXED_KP_BASELINE_JSON?.trim() || DEFAULT_BASELINE);
  const baseline = await readBaseline(baselinePath);
  const slug = process.env.QUALITY_EXPERIMENT_SLUG?.trim() || baseline.slug || "fixed-kp";
  const label = requiredEnv("QUALITY_EXPERIMENT_LABEL");
  const articleUrl = process.env.QUALITY_ARTICLE_URL?.trim() || baseline.articleUrl;
  if (!isLikelyUrl(articleUrl)) {
    throw new Error("QUALITY_ARTICLE_URL 必须是 http 或 https 文章链接，或 baseline JSON 必须包含 articleUrl。");
  }

  const outputRoot = process.env.QUALITY_OUTPUT_ROOT?.trim()
    ? path.resolve(process.env.QUALITY_OUTPUT_ROOT)
    : path.join(repoRoot, "quality-test-set", "results", "fixed-kp-question-prompt");

  const paths = await resolveUniqueExperimentPaths(buildExperimentPaths({
    outputRoot,
    slug,
    label
  }));

  const source = await extractSourceContent({
    sourceType: "article_link",
    sourceUrl: articleUrl
  });

  const output = await generateReviewChapter({
    sourceType: "text",
    originalSourceType: source.sourceType,
    rawText: source.rawText,
    sourceTitle: baseline.chapterTitle || source.sourceTitle,
    sourceUrl: articleUrl,
    sourceAccount: source.sourceAccount,
    knowledgePoints: baseline.knowledgePoints
  });

  const report = buildSingleArticleReport({
    slug: paths.slug,
    label: paths.label,
    articleUrl,
    source,
    output
  });
  report.config = {
    ...(report.config || {}),
    experimentType: "fixed_kp_question_prompt",
    fixedKnowledgePointBaseline: path.relative(repoRoot, baselinePath),
    fixedKnowledgePointCount: baseline.knowledgePoints.length,
    fixedKnowledgePointIds: baseline.knowledgePoints.map((point) => point.id)
  };
  report.fixedKnowledgePoints = baseline.knowledgePoints.map((point) => ({
    id: point.id,
    title: point.title,
    structureRole: point.structureRole || "",
    importanceScore: point.importanceScore,
    testabilityScore: point.testabilityScore,
    targetQuestionCount: point.targetQuestionCount ?? null
  }));

  await writeExperimentArtifacts({ report, paths });
  console.log(JSON.stringify({
    jsonPath: paths.jsonPath,
    csvPath: paths.csvPath,
    markdownPath: paths.markdownPath,
    fixedKnowledgePointCount: baseline.knowledgePoints.length,
    summary: report.summary
  }, null, 2));
}

async function readBaseline(filePath) {
  const baseline = JSON.parse(await readFile(filePath, "utf8"));
  const knowledgePoints = baseline.result?.chapter?.knowledgePoints;
  if (!Array.isArray(knowledgePoints) || !knowledgePoints.length) {
    throw new Error(`baseline JSON 没有可用的 result.chapter.knowledgePoints: ${filePath}`);
  }
  return {
    articleUrl: baseline.articleUrl || baseline.source?.url || "",
    slug: baseline.slug || "",
    chapterTitle: baseline.result?.chapter?.title || baseline.source?.title || "",
    knowledgePoints: knowledgePoints.map((point) => ({ ...point }))
  };
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`缺少环境变量 ${name}`);
  return value;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

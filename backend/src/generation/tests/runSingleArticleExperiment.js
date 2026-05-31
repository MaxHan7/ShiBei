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

async function main() {
  const articleUrl = requiredEnv("QUALITY_ARTICLE_URL");
  const slug = requiredEnv("QUALITY_EXPERIMENT_SLUG");
  const label = requiredEnv("QUALITY_EXPERIMENT_LABEL");
  if (!isLikelyUrl(articleUrl)) {
    throw new Error("QUALITY_ARTICLE_URL 必须是 http 或 https 文章链接。");
  }

  const outputRoot = process.env.QUALITY_OUTPUT_ROOT?.trim()
    ? path.resolve(process.env.QUALITY_OUTPUT_ROOT)
    : path.join(repoRoot, "quality-test-set", "results", "single-article");

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
    sourceTitle: source.sourceTitle,
    sourceUrl: articleUrl,
    sourceAccount: source.sourceAccount
  });
  const report = buildSingleArticleReport({
    slug: paths.slug,
    label: paths.label,
    articleUrl,
    source,
    output
  });

  await writeExperimentArtifacts({ report, paths });
  console.log(JSON.stringify({
    jsonPath: paths.jsonPath,
    csvPath: paths.csvPath,
    markdownPath: paths.markdownPath,
    summary: report.summary
  }, null, 2));
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

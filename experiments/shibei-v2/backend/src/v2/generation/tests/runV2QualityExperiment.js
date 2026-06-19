import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractSourceContent, isLikelyUrl } from "../../../sources/extractSourceContent.js";
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
  const jobResult = await runV2GenerationJob(article);
  const report = buildV2QualityReport({
    slug: paths.slug,
    label: paths.label,
    source,
    jobResult
  });

  await writeV2QualityArtifacts({ report, paths });
  console.log(JSON.stringify({
    jsonPath: paths.jsonPath,
    htmlPath: paths.htmlPath,
    status: report.status,
    metrics: report.metrics,
    failure: report.failure
  }, null, 2));
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildReviewRows, summarize } from "./qualityReport.js";

const REDACTED_TEXT = "[redacted: full source text omitted]";

export function sanitizeFileSegment(value, fallback = "run") {
  const normalized = String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || fallback;
}

export function formatRunTimestamp(date = new Date()) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

export function buildExperimentPaths({
  outputRoot,
  slug,
  label,
  date = new Date()
}) {
  const safeSlug = sanitizeFileSegment(slug, "single-article");
  const safeLabel = sanitizeFileSegment(label, "experiment");
  const runId = `${formatRunTimestamp(date)}-${safeLabel}`;
  const articleDir = path.join(outputRoot, safeSlug);
  return {
    articleDir,
    readmePath: path.join(articleDir, "README.md"),
    runsDir: path.join(articleDir, "runs"),
    reviewsDir: path.join(articleDir, "reviews"),
    analysisDir: path.join(articleDir, "analysis"),
    jsonPath: path.join(articleDir, "runs", `${runId}.json`),
    csvPath: path.join(articleDir, "reviews", `${runId}.csv`),
    markdownPath: path.join(articleDir, "analysis", `${runId}.md`),
    runId,
    slug: safeSlug,
    label: safeLabel
  };
}

export async function resolveUniqueExperimentPaths(paths) {
  const parsed = path.parse(paths.jsonPath);
  let suffix = 1;
  let candidate = paths;
  while (await exists(candidate.jsonPath) || await exists(candidate.csvPath) || await exists(candidate.markdownPath)) {
    suffix += 1;
    const base = `${parsed.name}-${suffix}`;
    candidate = {
      ...paths,
      runId: base,
      jsonPath: path.join(paths.runsDir, `${base}.json`),
      csvPath: path.join(paths.reviewsDir, `${base}.csv`),
      markdownPath: path.join(paths.analysisDir, `${base}.md`)
    };
  }
  return candidate;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function buildSingleArticleReport({
  slug,
  label,
  articleUrl,
  source,
  output,
  generatedAt = new Date().toISOString()
}) {
  const result = {
    file: `${slug}.article`,
    sampleSet: "single_article",
    sampleMeta: {
      title: source?.sourceTitle || slug,
      sourceType: source?.sourceType || "article_link",
      topic: "single_article",
      difficulty: "unknown",
      structureType: "unknown",
      expectedFocus: [],
      reviewPriority: "diagnostic"
    },
    startedAt: generatedAt,
    status: output.status,
    chapter: output.chapter ? redactChapter(output.chapter, source) : null,
    generationDebug: redactGenerationDebug(output.generationDebug || null),
    message: output.message || ""
  };
  const report = {
    generatedAt,
    articleUrl,
    slug,
    label,
    source: {
      title: source?.sourceTitle || "",
      account: source?.sourceAccount || "",
      url: source?.sourceUrl || articleUrl,
      type: source?.sourceType || "article_link",
      rawTextLength: String(source?.rawText || "").length
    },
    config: {
      experimentType: "single_article",
      label
    },
    summary: summarize([result]),
    reviewRows: buildReviewRows([result]),
    result
  };
  return report;
}

function redactChapter(chapter, source) {
  const redacted = cloneJson(chapter);
  if (redacted.source && typeof redacted.source === "object") {
    redacted.source = {
      ...redacted.source,
      rawTextLength: String(redacted.source.rawText || source?.rawText || "").length,
      cleanedTextLength: String(redacted.source.cleanedText || "").length,
      rawText: REDACTED_TEXT,
      cleanedText: REDACTED_TEXT
    };
  }
  if (redacted.generationMeta?.modelUsage) {
    redacted.generationMeta.modelUsage = redactModelUsage(redacted.generationMeta.modelUsage);
  }
  return redacted;
}

function redactGenerationDebug(debug) {
  if (!debug) return null;
  const redacted = cloneJson(debug);
  delete redacted.cleaned;
  if (redacted.modelUsage) redacted.modelUsage = redactModelUsage(redacted.modelUsage);
  if (redacted.generationMeta?.modelUsage) {
    redacted.generationMeta.modelUsage = redactModelUsage(redacted.generationMeta.modelUsage);
  }
  return redactTextFields(redacted);
}

function redactModelUsage(modelUsage) {
  if (!Array.isArray(modelUsage)) return modelUsage;
  return modelUsage.map((call) => {
    const copy = { ...call };
    if ("requestText" in copy) copy.requestText = REDACTED_TEXT;
    if ("responseText" in copy) copy.responseText = REDACTED_TEXT;
    if ("prompt" in copy) copy.prompt = REDACTED_TEXT;
    return copy;
  });
}

function redactTextFields(value) {
  if (Array.isArray(value)) return value.map(redactTextFields);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => {
    if (["rawText", "cleanedText", "requestText", "responseText"].includes(key)) {
      return [key, REDACTED_TEXT];
    }
    return [key, redactTextFields(child)];
  }));
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value || null));
}

export function rowsToCsv(rows) {
  const headers = collectHeaders(rows);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ].join("\n");
}

function collectHeaders(rows) {
  const headers = [];
  const seen = new Set();
  for (const row of rows) {
    for (const key of Object.keys(row || {})) {
      if (seen.has(key)) continue;
      seen.add(key);
      headers.push(key);
    }
  }
  return headers;
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, "\"\"")}"`;
}

export function renderSingleArticleAnalysis({ report, paths }) {
  const summary = report.summary || {};
  const topConfidenceReasons = frequencyLines(summary.trustReasonFrequency);
  const topBlockingReasons = frequencyLines(summary.blockingReasonFrequency);
  return [
    `# 单篇出题实验分析：${report.label}`,
    "",
    `- 生成时间：${report.generatedAt}`,
    `- 文章：${report.articleUrl}`,
    `- 原始 JSON：${relativeOrSelf(paths.jsonPath)}`,
    `- 人工审查 CSV：${relativeOrSelf(paths.csvPath)}`,
    "",
    "## 核心指标",
    "",
    `- 生成状态：${report.result?.status || ""}`,
    `- 保留知识点：${summary.knowledgePointCount ?? 0}`,
    `- 入池题数：${summary.qualifiedQuestionCount ?? 0}`,
    `- 平均每知识点题数：${summary.averageQuestionsPerPoint ?? 0}`,
    `- 3 题知识点比例：${summary.threeQuestionPointRate ?? 0}%`,
    `- 需重写题比例：${summary.needsRewriteQuestionRate ?? summary.lowConfidenceQuestionRate ?? 0}%`,
    `- 可复习提醒题比例：${summary.reviewWarningQuestionRate ?? 0}%`,
    `- 高置信题比例：${summary.highConfidenceQuestionRate ?? 0}%`,
    `- 平均来源精准度：${summary.averageSourcePrecisionScore ?? 0}`,
    `- 平均最小证据分：${summary.averageSourceMinimalityScore ?? 0}`,
    `- 平均认知动作匹配：${summary.averageCognitiveActionFitScore ?? 0}`,
    `- 平均练习递进：${summary.averagePracticeProgressionScore ?? 0}`,
    `- 平均证据学习价值：${summary.averageEvidenceLearningValueScore ?? 0}`,
    `- 平均低摩擦题卡分：${summary.averageReviewFrictionScore ?? 0}`,
    `- 平均可见阅读负担：${summary.averageVisibleReadingLoad ?? 0}`,
    `- 高摩擦题数：${summary.highFrictionQuestionCount ?? 0}`,
    `- 强制重写级高摩擦题数：${summary.mandatoryFrictionRewriteCount ?? 0}`,
    `- 重复练习风险题：${summary.duplicatePracticeRiskCount ?? 0}`,
    `- 未覆盖知识点：${summary.uncoveredKnowledgePointCount ?? 0}`,
    "",
    "## 主要可信度原因",
    "",
    ...topConfidenceReasons,
    "",
    "## 主要阻断原因",
    "",
    ...topBlockingReasons,
    "",
    "## 来源复用 Top 5",
    "",
    ...sourceReuseLines(summary.sourceReuseTop),
    "",
    "## 来源重叠 Top 5",
    "",
    ...sourceOverlapLines(summary.sourceOverlapTop),
    "",
    "## 证据块复用 Top 5",
    "",
    ...sourceBlockReuseLines(summary.sourceBlockReuseTop),
    "",
    "## 每知识点证据块覆盖",
    "",
    ...sourceBlockCoverageLines(summary.sourceBlockCoverageByPoint),
    "",
    "## 高摩擦题 Top 5",
    "",
    ...heavyQuestionLines(summary.heavyQuestionTop),
    "",
    "## 实验记录草稿",
    "",
    "- 本轮假设：",
    "- Prompt 改动：",
    "- 规则改动：",
    "- 改善：",
    "- 新问题：",
    "- 下一轮：",
    ""
  ].join("\n");
}

function frequencyLines(frequency = {}) {
  const entries = Object.entries(frequency).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!entries.length) return ["- 暂无"];
  return entries.map(([key, count]) => `- ${key}: ${count}`);
}

function sourceReuseLines(items = []) {
  if (!items.length) return ["- 暂无"];
  return items.map((item) => `- ${item.key}: ${item.count} 题 (${(item.questionIds || []).join(", ")})`);
}

function sourceOverlapLines(items = []) {
  if (!items.length) return ["- 暂无"];
  return items.map((item) => `- ${item.key}: ${item.count} 题，最高重叠 ${item.maxOverlapRatio} (${(item.questionIds || []).join(", ")})`);
}

function sourceBlockReuseLines(items = []) {
  if (!items.length) return ["- 暂无"];
  return items.map((item) => `- ${item.key}: ${item.count} 题，角色 ${item.evidenceRole || "-"}，知识点 ${item.knowledgePointCount || 0} 个 (${(item.questionIds || []).join(", ")})`);
}

function sourceBlockCoverageLines(items = []) {
  if (!items.length) return ["- 暂无"];
  return items
    .slice(0, 12)
    .map((item) => `- ${item.knowledgePointId}: ${item.questionCount} 题 / ${item.sourceBlockCount} 个证据块 / ${item.evidenceRoleCount} 种角色`);
}

function heavyQuestionLines(items = []) {
  if (!items.length) return ["- 暂无"];
  return items.map((item) => (
    `- ${item.questionId}: load ${item.visibleReadingLoad}, stem ${item.stemLength}, option ${item.maxOptionLength}, friction ${item.reviewFrictionScore}, reasons ${(item.reviewFrictionReasons || []).join("|") || "-"}`
  ));
}

function relativeOrSelf(filePath) {
  return filePath.replace(process.cwd() + path.sep, "");
}

export async function writeExperimentArtifacts({ report, paths }) {
  await mkdir(paths.runsDir, { recursive: true });
  await mkdir(paths.reviewsDir, { recursive: true });
  await mkdir(paths.analysisDir, { recursive: true });
  await writeFile(paths.jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(paths.csvPath, rowsToCsv(report.reviewRows || []), "utf8");
  await writeFile(paths.markdownPath, renderSingleArticleAnalysis({ report, paths }), "utf8");
}

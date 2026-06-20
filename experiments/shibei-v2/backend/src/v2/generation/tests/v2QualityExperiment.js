import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

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

export function buildV2QualityRunPaths({
  outputRoot,
  slug,
  label,
  date = new Date()
}) {
  const safeSlug = sanitizeFileSegment(slug, "v2-quality");
  const safeLabel = sanitizeFileSegment(label, "run");
  const runId = `${formatRunTimestamp(date)}-${safeLabel}`;
  const articleDir = path.join(outputRoot, safeSlug);

  return {
    articleDir,
    runsDir: path.join(articleDir, "runs"),
    reportsDir: path.join(articleDir, "reports"),
    jsonPath: path.join(articleDir, "runs", `${runId}.json`),
    htmlPath: path.join(articleDir, "reports", `${runId}.html`),
    runId,
    slug: safeSlug,
    label: safeLabel
  };
}

export async function resolveUniqueV2QualityRunPaths(paths) {
  const parsed = path.parse(paths.jsonPath);
  let suffix = 1;
  let candidate = paths;

  while (await exists(candidate.jsonPath) || await exists(candidate.htmlPath)) {
    suffix += 1;
    const base = `${parsed.name}-${suffix}`;
    candidate = {
      ...paths,
      runId: base,
      jsonPath: path.join(paths.runsDir, `${base}.json`),
      htmlPath: path.join(paths.reportsDir, `${base}.html`)
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

export function buildV2QualityReport({
  slug,
  label,
  source,
  jobResult,
  generatedAt = new Date().toISOString()
}) {
  const chapter = jobResult?.chapter || null;
  const units = Array.isArray(chapter?.units) ? chapter.units : [];
  const questions = units.flatMap((unit) =>
    (unit.questions || []).map((question) => ({ ...question, unitId: unit.id, unitTitle: unit.title }))
  );
  const sourceBlocks = Array.isArray(chapter?.source?.blocks) ? chapter.source.blocks : [];
  const qualityDiagnostics = Array.isArray(chapter?.generationMeta?.qualityDiagnostics)
    ? chapter.generationMeta.qualityDiagnostics
    : Array.isArray(jobResult?.diagnostics)
      ? jobResult.diagnostics
      : [];

  return {
    schemaVersion: "v2_quality_report_1",
    generatedAt,
    slug,
    label,
    status: jobResult?.status || "unknown",
    source: {
      title: source?.sourceTitle || chapter?.source?.title || chapter?.title || "",
      account: source?.sourceAccount || chapter?.source?.account || "",
      url: source?.sourceUrl || chapter?.source?.url || "",
      type: source?.sourceType || chapter?.source?.type || "",
      rawTextLength: String(source?.rawText || chapter?.source?.rawText || "").length
    },
    metrics: {
      unitCount: units.length,
      questionCount: questions.length,
      multipleChoiceCount: questions.filter((question) => question.type === "multiple_choice").length,
      matchingCount: questions.filter((question) => question.type === "matching").length,
      sourceBlockCount: sourceBlocks.length,
      issueCount: countQualityIssues(jobResult),
      diagnosticIssueCount: countDiagnosticIssues(qualityDiagnostics)
    },
    chapter,
    qualityDiagnostics,
    failure: buildFailure(jobResult)
  };
}

function countQualityIssues(jobResult) {
  if (Array.isArray(jobResult?.issues)) return jobResult.issues.length;
  if (Array.isArray(jobResult?.errors)) return jobResult.errors.length;
  return 0;
}

function buildFailure(jobResult) {
  if (jobResult?.status === "completed") return null;
  return {
    failedStage: jobResult?.failedStage || "",
    failureReason: jobResult?.failureReason || "",
    retryable: Boolean(jobResult?.retryable),
    issues: jobResult?.issues || [],
    errors: jobResult?.errors || [],
    diagnostics: jobResult?.diagnostics || []
  };
}

function countDiagnosticIssues(diagnostics) {
  if (!Array.isArray(diagnostics)) return 0;
  return diagnostics.reduce((sum, item) => sum + (Array.isArray(item.issues) ? item.issues.length : 0), 0);
}

export function renderV2QualityReportHtml(report) {
  const chapter = report.chapter || {};
  const units = Array.isArray(chapter.units) ? chapter.units : [];
  const sourceBlocks = Array.isArray(chapter.source?.blocks) ? chapter.source.blocks : [];
  const sourceBlockMap = new Map(sourceBlocks.map((block) => [block.id, block]));
  const diagnosticsByQuestionId = new Map(
    (report.qualityDiagnostics || []).map((diagnostic) => [diagnostic.questionId, diagnostic])
  );

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(report.label)} - V2 出题质量报告</title>
  <style>
    :root {
      --bg: #f2f5cf;
      --paper: #fdfaf2;
      --ink: #44423d;
      --muted: #807d73;
      --line: #dde1ac;
      --brand: #98a84e;
      --soft: #f2f1da;
      --danger: #ed765c;
    }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Helvetica Neue", Arial, sans-serif;
      line-height: 1.65;
    }
    main {
      max-width: 1040px;
      margin: 0 auto;
      padding: 32px 20px 64px;
    }
    h1, h2, h3 {
      line-height: 1.25;
      margin: 0;
    }
    h1 {
      font-size: 30px;
      margin-bottom: 8px;
    }
    h2 {
      font-size: 22px;
      margin: 40px 0 16px;
    }
    h3 {
      font-size: 18px;
      margin-bottom: 10px;
    }
    .card {
      background: var(--paper);
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(152, 163, 94, 0.18);
      padding: 20px;
      margin: 16px 0;
    }
    .meta {
      color: var(--muted);
      font-size: 14px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }
    .metric {
      background: var(--soft);
      border-radius: 12px;
      padding: 12px 14px;
    }
    .metric strong {
      display: block;
      font-size: 24px;
      color: var(--brand);
    }
    .tag {
      display: inline-flex;
      align-items: center;
      height: 24px;
      padding: 0 10px;
      border-radius: 999px;
      background: var(--soft);
      color: var(--brand);
      font-size: 13px;
      font-weight: 700;
      margin-right: 8px;
    }
    .question {
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 14px;
      margin: 14px 0;
      background: rgba(253, 250, 242, 0.72);
    }
    .stem {
      font-weight: 700;
      margin-bottom: 10px;
    }
    .options, .pairs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 8px;
      margin: 10px 0;
    }
    .option, .pair {
      background: white;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 8px 10px;
    }
    .correct {
      border-color: var(--brand);
      background: rgba(152, 168, 78, 0.12);
    }
    .explanation {
      margin-top: 10px;
      color: var(--muted);
    }
    .source {
      margin-top: 12px;
      border-left: 4px solid var(--line);
      padding-left: 12px;
      color: var(--muted);
      font-size: 14px;
    }
    .source-block {
      border: 1px solid transparent;
      border-radius: 10px;
      padding: 8px 10px;
      margin: 8px 0;
      background: rgba(255,255,255,0.45);
    }
    .source-block.highlight {
      border-color: var(--brand);
      background: rgba(152, 168, 78, 0.12);
    }
    .failure {
      border: 1px solid var(--danger);
      color: var(--danger);
    }
    details {
      margin-top: 12px;
    }
    .diagnostic {
      border-top: 1px dashed var(--line);
      padding-top: 10px;
    }
    summary {
      cursor: pointer;
      font-weight: 700;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      background: #fff;
      border-radius: 12px;
      padding: 12px;
      overflow: auto;
    }
  </style>
</head>
<body>
  <main>
    <h1>V2 出题质量报告</h1>
    <div class="meta">${escapeHtml(report.generatedAt)} · ${escapeHtml(report.label)} · ${escapeHtml(report.status)}</div>
    ${renderFailure(report.failure)}
    <section class="card">
      <h2 style="margin-top:0">文章与章节</h2>
      <p><strong>${escapeHtml(chapter.title || report.source.title || "未命名文章")}</strong></p>
      <p class="meta">${escapeHtml(report.source.account || "")} ${report.source.url ? `· <a href="${escapeAttribute(report.source.url)}">${escapeHtml(report.source.url)}</a>` : ""}</p>
      <p>${escapeHtml(chapter.summaryCard?.text || "")}</p>
      <div class="grid">
        ${metric("知识点", report.metrics.unitCount)}
        ${metric("题目", report.metrics.questionCount)}
        ${metric("选择题", report.metrics.multipleChoiceCount)}
        ${metric("连线题", report.metrics.matchingCount)}
        ${metric("Source blocks", report.metrics.sourceBlockCount)}
        ${metric("Issues", report.metrics.issueCount)}
        ${metric("Diagnostics", report.metrics.diagnosticIssueCount)}
      </div>
    </section>
    ${units.map((unit, index) => renderUnit(unit, index, sourceBlockMap, diagnosticsByQuestionId)).join("\n")}
    <section class="card">
      <h2 style="margin-top:0">章节总结</h2>
      <p><span class="tag">${escapeHtml(chapter.chapterSummary?.title || "章节完成")}</span>${escapeHtml(chapter.chapterSummary?.statsText || "")}</p>
      <p>${escapeHtml(chapter.chapterSummary?.encouragementText || "")}</p>
    </section>
    <section class="card">
      <h2 style="margin-top:0">完整来源块</h2>
      ${sourceBlocks.map((block) => renderSourceBlock(block, false)).join("\n") || "<p class=\"meta\">暂无 source blocks</p>"}
    </section>
  </main>
</body>
</html>`;
}

function metric(label, value) {
  return `<div class="metric"><strong>${escapeHtml(value)}</strong>${escapeHtml(label)}</div>`;
}

function renderFailure(failure) {
  if (!failure) return "";
  return `<section class="card failure">
    <h2 style="margin-top:0">生成失败</h2>
    <p><strong>${escapeHtml(failure.failedStage)}</strong> · ${failure.retryable ? "可重试" : "不可重试"}</p>
    <p>${escapeHtml(failure.failureReason)}</p>
    ${failure.issues?.length || failure.errors?.length ? `<pre>${escapeHtml(JSON.stringify(failure.issues?.length ? failure.issues : failure.errors, null, 2))}</pre>` : ""}
    ${failure.diagnostics?.length ? `<details open><summary>质量诊断</summary><pre>${escapeHtml(JSON.stringify(failure.diagnostics, null, 2))}</pre></details>` : ""}
  </section>`;
}

function renderUnit(unit, index, sourceBlockMap, diagnosticsByQuestionId) {
  const anchorBlockIds = Array.isArray(unit.sourceAnchor?.blockIds) ? unit.sourceAnchor.blockIds : [];
  const sourceBlocks = anchorBlockIds.map((id) => sourceBlockMap.get(id)).filter(Boolean);
  return `<section class="card">
    <h2 style="margin-top:0">${index + 1}. ${escapeHtml(unit.title)}</h2>
    <p><span class="tag">短版</span>${escapeHtml(unit.shortSummary)}</p>
    <p><span class="tag">长版</span>${escapeHtml(unit.detailSummary)}</p>
    <p><span class="tag">概要页</span>${escapeHtml(unit.overview?.text || "")}</p>
    <div class="source">
      <strong>Source anchor: ${escapeHtml(unit.sourceAnchor?.id || "")}</strong>
      ${sourceBlocks.map((block) => renderSourceBlock(block, true)).join("\n")}
    </div>
    ${(unit.questions || []).map((question, questionIndex) =>
      renderQuestion(question, questionIndex, diagnosticsByQuestionId.get(question.id))
    ).join("\n")}
    <details>
      <summary>单元总结</summary>
      <p><strong>${escapeHtml(unit.summary?.title || "")}</strong></p>
      <p>${escapeHtml(unit.summary?.text || "")}</p>
    </details>
  </section>`;
}

function renderQuestion(question, index, diagnostic) {
  if (question.type === "multiple_choice") return renderMultipleChoiceQuestion(question, index, diagnostic);
  if (question.type === "matching") return renderMatchingQuestion(question, index, diagnostic);
  return `<div class="question"><div class="stem">${index + 1}. ${escapeHtml(question.stem || "")}</div></div>`;
}

function renderMultipleChoiceQuestion(question, index, diagnostic) {
  return `<div class="question">
    <div class="stem">${index + 1}. 选择题 · ${escapeHtml(question.stem)}</div>
    <div class="options">
      ${(question.options || []).map((option) => {
        const correct = option.id === question.correctOptionId;
        return `<div class="option ${correct ? "correct" : ""}"><strong>${escapeHtml(option.id)}</strong> ${escapeHtml(option.text)}</div>`;
      }).join("\n")}
    </div>
    <div class="explanation"><strong>解释：</strong>${escapeHtml(question.explanation)}</div>
    <div class="meta">sourceAnchorId: ${escapeHtml(question.sourceAnchorId || "")}</div>
    ${renderQuestionDiagnostic(diagnostic)}
  </div>`;
}

function renderMatchingQuestion(question, index, diagnostic) {
  const rightById = new Map((question.rightItems || []).map((item) => [item.id, item]));
  return `<div class="question">
    <div class="stem">${index + 1}. 连线题 · ${escapeHtml(question.stem)}</div>
    <div class="pairs">
      ${(question.pairs || []).map((pair) => {
        const left = (question.leftItems || []).find((item) => item.id === pair.leftId);
        const right = rightById.get(pair.rightId);
        return `<div class="pair"><strong>${escapeHtml(pair.leftId)} → ${escapeHtml(pair.rightId)}</strong><br>${escapeHtml(left?.text || "")}<br><span class="meta">${escapeHtml(right?.text || "")}</span></div>`;
      }).join("\n")}
    </div>
    <details>
      <summary>左右选项原始列表</summary>
      <pre>${escapeHtml(JSON.stringify({ leftItems: question.leftItems, rightItems: question.rightItems, pairs: question.pairs }, null, 2))}</pre>
    </details>
    <div class="explanation"><strong>解释：</strong>${escapeHtml(question.explanation)}</div>
    <div class="meta">sourceAnchorId: ${escapeHtml(question.sourceAnchorId || "")}</div>
    ${renderQuestionDiagnostic(diagnostic)}
  </div>`;
}

function renderQuestionDiagnostic(diagnostic) {
  if (!diagnostic) return "";
  const checks = diagnostic.checks || {};
  const issueText = diagnostic.issues?.length
    ? diagnostic.issues.map((issue) => `${issue.code}: ${issue.message}`).join("\n")
    : "pass";
  return `<details class="diagnostic" open>
    <summary>质量诊断</summary>
    <div class="meta">forbidden phrase: ${escapeHtml(formatCheckValue(checks.forbiddenPhrase))}</div>
    <div class="meta">distractor value: ${escapeHtml(checks.distractorValue || "not_applicable")}</div>
    <div class="meta">matching relation value: ${escapeHtml(checks.matchingRelationValue || "not_applicable")}</div>
    <div class="meta">explanation UI fit: ${escapeHtml(checks.explanationUiFit || "unknown")}</div>
    <div class="meta">source anchor precision: ${escapeHtml(checks.sourceAnchorPrecision || "unknown")}</div>
    <pre>${escapeHtml(issueText)}</pre>
  </details>`;
}

function formatCheckValue(value) {
  if (Array.isArray(value)) return value.length ? value.join("、") : "pass";
  return value || "pass";
}

function renderSourceBlock(block, highlighted) {
  return `<div class="source-block ${highlighted ? "highlight" : ""}">
    <strong>${escapeHtml(block.id)} · ${escapeHtml(block.type)}</strong>
    <div>${escapeHtml(block.text)}</div>
  </div>`;
}

export async function writeV2QualityArtifacts({ report, paths }) {
  await mkdir(paths.runsDir, { recursive: true });
  await mkdir(paths.reportsDir, { recursive: true });
  await writeFile(paths.jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(paths.htmlPath, renderV2QualityReportHtml(report), "utf8");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

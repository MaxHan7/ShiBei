import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { extractSourceContent } from "../src/sources/extractSourceContent.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, "..");
const repoRoot = resolve(backendRoot, "..");

const DEFAULT_CANDIDATES_PATH = resolve(backendRoot, "content/recommended-candidates.json");
const DEFAULT_REPORT_PATH = resolve(repoRoot, "docs/recommended-articles-candidate-audit-zh.md");

async function main() {
  const candidatesPath = resolve(process.env.RECOMMENDED_CANDIDATES_PATH || DEFAULT_CANDIDATES_PATH);
  const reportPath = resolve(process.env.RECOMMENDED_CANDIDATES_REPORT_PATH || DEFAULT_REPORT_PATH);
  const catalog = JSON.parse(await readFile(candidatesPath, "utf8"));
  const articles = Array.isArray(catalog.articles) ? catalog.articles : [];
  if (articles.length === 0) {
    throw new Error("No recommended article candidates found.");
  }

  const rows = [];
  for (const article of articles) {
    rows.push(await auditArticle(article));
  }

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, renderMarkdownReport({ catalog, rows }), "utf8");
  console.log(JSON.stringify({
    reportPath,
    total: rows.length,
    directHtmlReady: rows.filter((row) => row.status === "direct_html_ready").length,
    needsPdfOrManualText: rows.filter((row) => row.status === "needs_pdf_or_manual_text").length,
    failed: rows.filter((row) => row.status === "failed").length
  }, null, 2));
}

async function auditArticle(article) {
  const base = {
    id: article.id || "",
    title: article.title || "",
    source: article.source || "",
    sourceUrl: article.sourceUrl || "",
    tags: Array.isArray(article.tags) ? article.tags.join(", ") : "",
    contentAccess: article.contentAccess || "",
    extractedTitle: "",
    extractedAccount: "",
    textLength: 0,
    status: "",
    note: ""
  };

  if (article.contentAccess === "public_pdf" || /\.pdf($|\?)/i.test(article.sourceUrl || "")) {
    return {
      ...base,
      status: "needs_pdf_or_manual_text",
      note: "PDF source. Use a local text file extracted from the PDF for generation, then keep the public source URL for attribution."
    };
  }

  try {
    const source = await extractSourceContent({
      sourceType: "article_link",
      sourceUrl: article.sourceUrl
    });
    const textLength = source.rawText.length;
    return {
      ...base,
      extractedTitle: source.sourceTitle,
      extractedAccount: source.sourceAccount,
      textLength,
      status: classifyTextLength(textLength),
      note: textLength > 12000
        ? "Extracted text is long; generate from a reviewed excerpt or expect higher model cost."
        : "Ready for generation input review."
    };
  } catch (error) {
    return {
      ...base,
      status: "failed",
      note: error instanceof Error ? error.message : String(error || "unknown error")
    };
  }
}

function classifyTextLength(length) {
  if (length < 2000) return "short_needs_review";
  if (length > 12000) return "long_needs_excerpt";
  return "direct_html_ready";
}

function renderMarkdownReport({ catalog, rows }) {
  const generatedAt = new Date().toISOString();
  return `# 推荐好文候选审查

生成时间：${generatedAt}

## 策略

- 目标读者：${catalog.selectionPolicy?.audience || ""}
- 目标长度：${catalog.selectionPolicy?.targetLength || ""}
- 入池流程：${catalog.selectionPolicy?.approvalFlow || ""}

## 审查结果

| ID | 标题 | 来源 | 标签 | 抽取长度 | 状态 | 备注 |
| --- | --- | --- | --- | ---: | --- | --- |
${rows.map((row) => `| ${escapeCell(row.id)} | [${escapeCell(row.title)}](${row.sourceUrl}) | ${escapeCell(row.source)} | ${escapeCell(row.tags)} | ${row.textLength} | ${escapeCell(row.status)} | ${escapeCell(row.note)} |`).join("\n")}

## 状态解释

- direct_html_ready：现有网页抽取器可以拿到适中正文，可进入生成前人工快速审阅。
- long_needs_excerpt：正文可抽取，但有明显导航/营销/评论等噪声或长度偏长，建议先做节选清洗。
- short_needs_review：正文可抽取但偏短，需确认是否足够形成一个完整章节。
- needs_pdf_or_manual_text：PDF 或非 HTML 来源，管理员生成时应先保存干净文本文件，再跑生成。
- failed：当前抽取器失败，需更换来源或手动提供正文。

## 下一步

1. 对 direct_html_ready 的文章先跑 V2 生成实验。
2. 对 long_needs_excerpt 的文章先人工/脚本清洗成 3000-8000 字左右的学习版文本。
3. 对 PDF 文章先抽取干净文本文件，使用原始 URL 做来源归属。
4. 生成完成并人工验收后，把对应 prepared chapter 移入 backend/content/recommended/，再加入 backend/content/recommended-articles.json。
`;
}

function escapeCell(value) {
  return String(value || "")
    .replace(/\|/g, "\\|")
    .replace(/\n+/g, " ")
    .trim();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

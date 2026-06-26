import { callOpenAIJson } from "./openaiClient.js";
import { chapterSummarySchema, chapterSummarySystemPrompt } from "./prompts/chapterSummary.js";

export async function generateChapterSummary({ cleanedText, title = "", modelUsageRecorder = null }) {
  const result = await callOpenAIJson({
    system: chapterSummarySystemPrompt,
    user: buildUserPrompt({ cleanedText, title }),
    schemaName: "chapter_core_summary",
    schema: chapterSummarySchema,
    stage: "chapter_summary",
    modelUsageRecorder,
    estimatedOutputTokens: 180
  });

  return normalizeCoreSummary(result.coreSummary);
}

export function normalizeCoreSummary(value) {
  return String(value || "")
    .replace(/^(本文主要讲了|这篇文章告诉我们|总的来说|总体来说|总结来说)[：:，,\s]*/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function buildUserPrompt({ cleanedText, title }) {
  const text = String(cleanedText || "").slice(0, 12000);
  return `标题：${title || "未命名文章"}

请基于以下原文写一段“文章核心”总结。它会显示在章节总结页，帮助用户快速过一遍整篇文章的整体核心观点。

原文：
${text}`;
}

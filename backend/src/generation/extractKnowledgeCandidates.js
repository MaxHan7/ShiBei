import { callOpenAIJson } from "./openaiClient.js";
import { knowledgePointSchema, knowledgePointSystemPrompt } from "./prompts/knowledgePoints.js";

export async function extractKnowledgeCandidates({ cleanedText, chunks }) {
  const chunkText = chunks
    .map((chunk) => `【${chunk.id}｜${chunk.chunkType}】${chunk.text}`)
    .join("\n\n");

  const result = await callOpenAIJson({
    system: knowledgePointSystemPrompt,
    user: `请从以下内容中提取可复习知识点。\n\n${chunkText || cleanedText}`,
    schemaName: "knowledge_points",
    schema: knowledgePointSchema
  });

  return {
    chapterTitle: normalizeTitle(result.chapterTitle, cleanedText),
    candidates: (result.candidates || []).map((candidate, index) => ({
      id: `kp-${index + 1}`,
      title: candidate.title?.trim() || `知识点 ${index + 1}`,
      knowledgeType: candidate.knowledgeType,
      summary: candidate.summary?.trim() || candidate.keyClaim?.trim() || "",
      keyClaim: candidate.keyClaim?.trim() || candidate.summary?.trim() || "",
      sourceQuote: candidate.sourceQuote?.trim() || "",
      testabilityScore: clampScore(candidate.testabilityScore)
    }))
  };
}

function normalizeTitle(title, cleanedText) {
  const normalized = String(title || "").trim();
  if (normalized) return normalized.slice(0, 36);
  return cleanedText.slice(0, 28).replace(/[。！？!?；;，,]$/, "") || "新添加的知识";
}

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(5, Math.max(1, number));
}

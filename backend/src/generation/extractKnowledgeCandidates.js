import { callOpenAIJson } from "./openaiClient.js";
import { knowledgePointSchema, knowledgePointSystemPrompt } from "./prompts/knowledgePoints.js";

export async function extractKnowledgeCandidates({ cleanedText, chunks, modelUsageRecorder = null }) {
  const chunkText = chunks
    .map((chunk) => `【${chunk.id}｜${chunk.chunkType}｜${chunk.sourceRole || "body"}】${chunk.text}`)
    .join("\n\n");

  const result = await callOpenAIJson({
    system: knowledgePointSystemPrompt,
    user: `请从以下内容中提取可复习知识点。\n\n${chunkText || cleanedText}`,
    schemaName: "knowledge_points",
    schema: knowledgePointSchema,
    stage: "knowledge_points",
    modelUsageRecorder,
    estimatedOutputTokens: 1800
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
      testabilityReason: candidate.testabilityReason?.trim() || "",
      structureRole: normalizeStructureRole(candidate.structureRole, candidate.knowledgeType),
      importanceScore: clampScore(candidate.importanceScore ?? candidate.testabilityScore),
      coverageReason: candidate.coverageReason?.trim() || candidate.testabilityReason?.trim() || "",
      questionAngles: Array.isArray(candidate.questionAngles)
        ? candidate.questionAngles.map((angle) => String(angle || "").trim()).filter(Boolean)
        : [],
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

function normalizeStructureRole(value, knowledgeType) {
  const normalized = String(value || "").trim();
  if ([
    "main_claim",
    "supporting_reason",
    "method_step",
    "boundary",
    "case_evidence",
    "background",
    "detail"
  ].includes(normalized)) {
    return normalized;
  }

  switch (knowledgeType) {
  case "method":
  case "step":
    return "method_step";
  case "counterexample":
    return "boundary";
  case "scenario":
  case "comparison":
    return "supporting_reason";
  case "judgment":
  case "concept":
  default:
    return "main_claim";
  }
}

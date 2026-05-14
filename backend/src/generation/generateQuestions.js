import { callOpenAIJson } from "./openaiClient.js";
import { expectedQuestionType } from "./evaluateQuestions.js";
import { questionSchema, questionSystemPrompt } from "./prompts/questions.js";

export async function generateQuestions({ knowledgePoints, rewrite = false, rewriteContext = "" }) {
  const points = knowledgePoints.map((point) => ({
    id: point.id,
    title: point.title,
    knowledgeType: point.knowledgeType,
    keyClaim: point.keyClaim,
    sourceQuote: point.sourceQuote,
    testabilityScore: point.testabilityScore,
    preferredQuestionType: expectedQuestionType(point),
    targetQuestionCount: rewrite ? 1 : targetQuestionCount(point)
  }));

  const result = await callOpenAIJson({
    system: questionSystemPrompt,
    user: buildUserPrompt({ points, rewrite, rewriteContext }),
    schemaName: "generated_questions",
    schema: questionSchema
  });

  return (result.questions || []).map((question, index) => ({
    id: `q-${index + 1}`,
    knowledgePointId: String(question.knowledgePointId || points[index]?.id || "").trim(),
    type: question.type,
    stem: question.stem?.trim() || "",
    options: normalizeOptions(question),
    correctOptionId: String(question.correctOptionId || "").trim(),
    explanation: question.explanation?.trim() || "",
    correctUnderstanding: question.correctUnderstanding?.trim() || "",
    commonMisconception: question.commonMisconception?.trim() || "",
    sourceSnippet: question.sourceSnippet?.trim() || "",
    difficulty: question.difficulty || "medium"
  }));
}

function buildUserPrompt({ points, rewrite, rewriteContext }) {
  const rewriteInstruction = rewrite
    ? `上一题没有通过质量检查。请只为给定知识点重写 1 道题。
需要修复的问题：${rewriteContext || "质量检查未通过"}
避免原文填空、凑数干扰项、多个正确答案、题型不匹配、来源片段不匹配。`
    : "";

  return `${rewriteInstruction}
请为每个知识点生成 targetQuestionCount 道题。题型必须严格等于 preferredQuestionType。
如果 preferredQuestionType 是 true_false，只能使用两个选项：A 成立，B 不成立。
sourceSnippet 必须逐字来自该知识点 sourceQuote，不要改写来源片段。
题目必须考理解、边界、场景、误区或迁移应用，不要问“原文提到了什么”。
${JSON.stringify(points, null, 2)}`;
}

function targetQuestionCount(point) {
  const highValueType = ["method", "scenario", "step", "comparison", "counterexample"].includes(point.knowledgeType);
  if (point.testabilityScore >= 5 && highValueType) return 3;
  if (point.testabilityScore >= 4 || highValueType) return 2;
  return 1;
}

function normalizeOptions(question) {
  if (question.type === "true_false") {
    return [
      { id: "A", text: "成立" },
      { id: "B", text: "不成立" }
    ];
  }
  const options = Array.isArray(question.options) ? question.options : [];
  return options.slice(0, 4).map((option, index) => ({
    id: option.id || String.fromCharCode(65 + index),
    text: option.text || ""
  }));
}

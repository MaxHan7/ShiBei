import { callOpenAIJson } from "./openaiClient.js";
import { QUALITY_DIMENSIONS } from "./types.js";

const judgeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          questionId: { type: "string" },
          sourceSupport: { type: "number" },
          answerUniqueness: { type: "number" },
          understandingDepth: { type: "number" },
          clarity: { type: "number" },
          distractorQuality: { type: "number" },
          reviewValue: { type: "number" },
          seriousIssues: {
            type: "array",
            items: { type: "string" }
          },
          qualityAction: { type: "string", enum: ["pass", "rewrite", "discard"] },
          reason: { type: "string" }
        },
        required: [
          "questionId",
          "sourceSupport",
          "answerUniqueness",
          "understandingDepth",
          "clarity",
          "distractorQuality",
          "reviewValue",
          "seriousIssues",
          "qualityAction",
          "reason"
        ]
      }
    }
  },
  required: ["results"]
};

const judgeSystemPrompt = `你是 Recallo的题目质量审查员。请按 PRD 的六个维度给每道题打 1-5 分：
1. sourceSupport：来源片段是否是准确原文锚点，能支撑正确答案的关键判断。来源片段不需要承担完整解释页职责。
2. answerUniqueness：是否只有一个最合理答案。
3. understandingDepth：是否考核心理解、边界或使用场景，而不是文章背诵或原文填空。
4. clarity：题干是否让用户快速进入判断，选项和解释是否清楚无歧义。
5. distractorQuality：把三个干扰项作为一组判断，是否同语境、有区分度、无第二正确答案；允许一个较明显的排除项，但不能整体凑数。
6. reviewValue：是否值得用户复习，能否帮助用户更好理解文章主线知识点。

判定动作：
- pass：可直接入池。
- rewrite：方向有价值，但题干、选项组、解释或来源锚点需要修正。
- discard：来源缺失、严重无关、常识碎片或无法修复。

请只输出 JSON。`;

export async function judgeQuestionQuality({
  questions,
  knowledgePoints,
  stage = "judge_initial",
  modelUsageRecorder = null
}) {
  if (!questions.length) return { results: [], judgeUnavailable: false };

  try {
    const payload = await callOpenAIJson({
      system: judgeSystemPrompt,
      user: JSON.stringify({ knowledgePoints, questions }, null, 2),
      schemaName: "question_quality_judge",
      schema: judgeSchema,
      stage,
      modelUsageRecorder,
      estimatedOutputTokens: estimateJudgeOutputTokens(stage, questions.length)
    });

    return {
      results: normalizeJudgeResults(payload.results || []),
      judgeUnavailable: false
    };
  } catch (error) {
    return {
      results: [],
      judgeUnavailable: true,
      judgeError: error.message
    };
  }
}

function estimateJudgeOutputTokens(stage, questionCount) {
  const count = Math.max(1, Number(questionCount) || 1);
  if (stage === "judge_supplement") return Math.max(800, count * 220);
  if (stage === "judge_rewrite") return Math.max(600, count * 190);
  return Math.max(500, count * 165);
}

function normalizeJudgeResults(results) {
  return results.map((result) => {
    const scores = {};
    for (const dimension of QUALITY_DIMENSIONS) {
      scores[dimension] = clampScore(result[dimension]);
    }
    const averageScore = round(
      QUALITY_DIMENSIONS.reduce((sum, dimension) => sum + scores[dimension], 0) / QUALITY_DIMENSIONS.length
    );

    return {
      questionId: String(result.questionId || ""),
      scores,
      averageScore,
      seriousIssues: Array.isArray(result.seriousIssues) ? result.seriousIssues : [],
      qualityAction: normalizeAction(result.qualityAction, scores, averageScore),
      reason: String(result.reason || "")
    };
  });
}

function normalizeAction(action, scores, averageScore) {
  if (action === "discard" || action === "rewrite" || action === "pass") return action;
  if (scores.sourceSupport < 3 || scores.answerUniqueness < 3) return "discard";
  if (scores.sourceSupport < 4 || scores.answerUniqueness < 4 || scores.clarity < 4 || averageScore < 4) return "rewrite";
  return "pass";
}

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(5, Math.max(1, number));
}

function round(value) {
  return Math.round(value * 10) / 10;
}

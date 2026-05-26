import { callOpenAIJson } from "./openaiClient.js";
import { expectedQuestionType } from "./evaluateQuestions.js";
import { questionSchema, questionSystemPrompt } from "./prompts/questions.js";

export async function generateQuestions({
  knowledgePoints,
  rewrite = false,
  rewriteContext = "",
  targetQuestionCountOverride = null,
  stage = "",
  modelUsageRecorder = null
}) {
  const points = knowledgePoints.map((point) => ({
    id: point.id,
    title: point.title,
    knowledgeType: point.knowledgeType,
    keyClaim: point.keyClaim,
    sourceQuote: point.sourceQuote,
    testabilityReason: point.testabilityReason || "",
    questionAngles: Array.isArray(point.questionAngles) ? point.questionAngles : [],
    testabilityScore: point.testabilityScore,
    preferredQuestionType: expectedQuestionType(point),
    targetQuestionCount: targetQuestionCountOverride !== null
      && targetQuestionCountOverride !== undefined
      && Number.isFinite(Number(targetQuestionCountOverride))
      ? Math.max(1, Math.min(3, Number(targetQuestionCountOverride)))
      : (rewrite ? 1 : targetQuestionCountForPoint(point))
  }));

  const result = await callOpenAIJson({
    system: questionSystemPrompt,
    user: buildUserPrompt({ points, rewrite, rewriteContext }),
    schemaName: "generated_questions",
    schema: questionSchema,
    stage: stage || (rewrite ? "question_rewrite" : "questions_initial"),
    modelUsageRecorder,
    estimatedOutputTokens: estimateQuestionOutputTokens(points)
  });

  return (result.questions || []).map((question, index) => normalizeAnswerPosition({
    id: `q-${index + 1}`,
    knowledgePointId: String(question.knowledgePointId || fallbackPointId(points, index) || "").trim(),
    type: question.type,
    stem: question.stem?.trim() || "",
    options: normalizeOptions(question),
    correctOptionId: String(question.correctOptionId || "").trim(),
    explanation: question.explanation?.trim() || "",
    correctUnderstanding: question.correctUnderstanding?.trim() || "",
    commonMisconception: question.commonMisconception?.trim() || "",
    sourceSnippet: question.sourceSnippet?.trim() || "",
    difficulty: question.difficulty || "medium"
  }, index));
}

function estimateQuestionOutputTokens(points) {
  const targetCount = points.reduce((sum, point) => sum + (Number(point.targetQuestionCount) || 1), 0);
  return Math.max(700, targetCount * 520);
}

function fallbackPointId(points, index) {
  if (points.length === 1) return points[0].id;
  return points[index]?.id || "";
}

function buildUserPrompt({ points, rewrite, rewriteContext }) {
  const rewriteCount = points[0]?.targetQuestionCount || 1;
  const rewriteInstruction = rewrite
    ? `上一题没有通过质量检查。请只为给定知识点重写 ${rewriteCount} 道题。
需要修复的问题：${rewriteContext || "质量检查未通过"}
${rewriteGuidance(rewriteContext)}
避免原文填空、凑数干扰项、多个正确答案和来源片段不匹配。`
    : "";

  return `${rewriteInstruction}
请为每个知识点生成 targetQuestionCount 道候选题。targetQuestionCount 是根据该知识点价值动态给出的候选数量，不代表最终入池数量。
每个知识点至少返回 1 道结构完整题，不要跳过任何知识点。
当 targetQuestionCount 为 2 或 3 时，不要生成同质题：优先覆盖“理解核心判断”“辨析误区/边界”“迁移到具体场景”三个不同记忆角度，并尽量使用不同题型。
preferredQuestionType 是推荐题型：优先使用它；如果另一种题型更自然、更能考理解，也可以改用其它允许题型。
如果使用 true_false，只能使用两个选项：A 成立，B 不成立。
如果使用 multiple_choice，必须使用 A/B/C/D 四个选项。
如果使用 scenario_judgment，必须使用 A/B/C/D 四个选项；题干描述具体使用场景，四个选项分别是四种行动方案、判断方式或处理策略，禁止使用“成立 / 不成立”。
正确答案位置要自然分散，不要固定放在 B。后端仍会重新排列选项，你只需要保证 correctOptionId 指向你认为正确的选项。
sourceSnippet 优先逐字来自该知识点 sourceQuote，不要改写来源片段；如果不确定怎么截取，直接把完整 sourceQuote 作为 sourceSnippet。
题目必须考理解、边界、场景、误区或迁移应用，不要问“原文提到了什么”。
每道题的 3 个错误选项必须来自不同常见误解：错因要接近真实用户会犯的理解偏差，而不是随便编无关选项。
如果 sourceQuote 很短，优先生成直接理解题或边界判断题；不要编造 sourceQuote 没有支撑的复杂业务细节。
优先参考 questionAngles 设计不同考察角度；如果没有 questionAngles，就根据 keyClaim 和 sourceQuote 自行选择最值得复习的角度。
${JSON.stringify(points, null, 2)}`;
}

export function targetQuestionCountForPoint(point) {
  const highValueType = ["method", "scenario", "step", "comparison", "counterexample"].includes(point.knowledgeType);
  const angleCount = Array.isArray(point.questionAngles) ? point.questionAngles.length : 0;
  if (point.testabilityScore >= 5 && (highValueType || angleCount >= 2)) return 3;
  if (point.testabilityScore >= 4 || highValueType || angleCount >= 2) return 2;
  return 1;
}

function rewriteGuidance(context = "") {
  const issues = String(context);
  const guidance = [];
  if (/distractorQuality|干扰/.test(issues)) {
    guidance.push("干扰项修复：3 个错误选项都要贴近同一主题，看起来可能被误选，但必须被 sourceQuote 或正确理解明确排除。不要使用无关、极端、玩笑或明显错误选项。");
  }
  if (/answerUniqueness|答案|唯一/.test(issues)) {
    guidance.push("答案唯一性修复：只有一个选项能同时被 sourceQuote 和正确理解支撑，其他选项必须各自错在清晰可解释的点上。");
  }
  if (/understandingDepth|理解|source_repetition|原文/.test(issues)) {
    guidance.push("理解深度修复：把题干改成应用场景、边界判断、误区辨析或行动选择，不要问原文复述。");
  }
  if (/source|来源/.test(issues)) {
    guidance.push("来源修复：sourceSnippet 优先逐字截取自当前知识点 sourceQuote；如果无法稳定截取，直接使用完整 sourceQuote。不要拼接、改写或概括。");
  }
  if (/question_type|题型/.test(issues)) {
    guidance.push("题型提示：preferredQuestionType 只是推荐题型。优先使用它；如果当前题型更自然，也可以保留，但选项结构必须合法。");
  }
  return guidance.join("\n");
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

export function normalizeAnswerPosition(question, index = 0) {
  const labels = question.type === "true_false" ? ["A", "B"] : ["A", "B", "C", "D"];
  if (!Array.isArray(question.options) || question.options.length !== labels.length) {
    return { ...question, options: relabelOptions(question.options || [], labels) };
  }
  const correct = question.options.find((option) => option.id === question.correctOptionId);
  if (!correct) {
    return { ...question, options: relabelOptions(question.options, labels) };
  }

  const targetIndex = desiredCorrectIndex(question, index, labels.length);
  const wrongOptions = stableShuffle(
    question.options.filter((option) => option.id !== question.correctOptionId),
    answerSeed(question, index, "wrong-options")
  );
  const reordered = [];
  let wrongIndex = 0;
  for (let optionIndex = 0; optionIndex < labels.length; optionIndex += 1) {
    reordered[optionIndex] = optionIndex === targetIndex ? correct : wrongOptions[wrongIndex++];
  }

  return {
    ...question,
    options: reordered.map((option, optionIndex) => ({
      ...option,
      id: labels[optionIndex]
    })),
    correctOptionId: labels[targetIndex]
  };
}

function desiredCorrectIndex(question, index, optionCount) {
  return (stableHash(answerSeed(question, index, "correct-position")) + index) % optionCount;
}

function answerSeed(question, index, salt) {
  return [
    salt,
    index,
    question.knowledgePointId,
    question.type,
    question.stem
  ].join("|");
}

function stableShuffle(items, seed) {
  return [...items]
    .map((item, index) => ({ item, rank: stableHash(`${seed}|${index}|${item.text}`) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item);
}

function relabelOptions(options, labels) {
  return options.map((option, index) => ({
    ...option,
    id: labels[index] || option.id || `option-${index + 1}`
  }));
}

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

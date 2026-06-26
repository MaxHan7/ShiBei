import { callOpenAIJson } from "./openaiClient.js";
import { expectedQuestionType } from "./evaluateQuestions.js";
import {
  questionSchema,
  questionSystemPrompt
} from "./prompts/questions.js";

export async function generateQuestions({
  knowledgePoints,
  rewrite = false,
  rewriteContext = "",
  supplement = false,
  supplementContext = "",
  targetQuestionCountOverride = null,
  stage = "",
  modelUsageRecorder = null
}) {
  const points = knowledgePoints.map((point) => {
    const preferredQuestionType = expectedQuestionType(point);
    const targetQuestionCount = targetQuestionCountOverride !== null
      && targetQuestionCountOverride !== undefined
      && Number.isFinite(Number(targetQuestionCountOverride))
      ? Math.max(1, Math.min(3, Number(targetQuestionCountOverride)))
      : (rewrite ? 1 : targetQuestionCountForPoint(point));
    const practiceBlueprint = Array.isArray(point.practiceBlueprint) && point.practiceBlueprint.length
      ? point.practiceBlueprint.slice(0, targetQuestionCount)
      : [];
    return {
      id: point.id,
      title: point.title,
      knowledgeType: point.knowledgeType,
      keyClaim: point.keyClaim,
      sourceQuote: point.sourceQuote,
      testabilityReason: point.testabilityReason || "",
      questionAngles: Array.isArray(point.questionAngles) ? point.questionAngles : [],
      testabilityScore: point.testabilityScore,
      structureRole: point.structureRole || "",
      importanceScore: point.importanceScore,
      roleInArticle: point.roleInArticle || point.structureRole || "",
      whyWorthReviewing: point.whyWorthReviewing || point.coverageReason || "",
      preferredQuestionType,
      targetQuestionCount
    };
  });

  const resolvedStage = stage || (supplement ? "question_supplement" : (rewrite ? "question_rewrite" : "questions_initial"));
  const result = await callOpenAIJson({
    system: questionSystemPrompt,
    user: buildUserPrompt({ points, rewrite, rewriteContext, supplement, supplementContext }),
    schemaName: "generated_questions",
    schema: questionSchema,
    stage: resolvedStage,
    modelUsageRecorder,
    estimatedOutputTokens: estimateQuestionOutputTokens(points, resolvedStage)
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
    memoryAngle: normalizeMemoryAngle(question.memoryAngle, question),
    blueprintItemId: question.blueprintItemId?.trim() || "",
    blueprintGoal: question.blueprintGoal?.trim() || "",
    difficulty: question.difficulty || "medium"
  }, index));
}

function estimateQuestionOutputTokens(points, stage = "") {
  const targetCount = points.reduce((sum, point) => sum + (Number(point.targetQuestionCount) || 1), 0);
  if (stage === "question_supplement") return Math.max(1000, targetCount * 900);
  if (stage === "question_rewrite") return Math.max(700, targetCount * 650);
  return Math.max(700, targetCount * 520);
}

function fallbackPointId(points, index) {
  if (points.length === 1) return points[0].id;
  return points[index]?.id || "";
}

export function buildUserPrompt({ points, rewrite, rewriteContext, supplement, supplementContext }) {
  const rewriteCount = points[0]?.targetQuestionCount || 1;
  const promptPoints = points.map(sanitizeQuestionPromptPoint);
  const supplementInstruction = supplement
    ? `任务类型：supplement
只为给定知识点补充最多 ${rewriteCount} 道新题。
缺口：${supplementContext || "当前知识点还需要补充可靠题目"}
只补不同理解角度；如果只能重复已有题，少补或不补。`
    : "";
  const rewriteInstruction = rewrite
    ? `任务类型：rewrite
只为给定知识点重写 ${rewriteCount} 道题。
需要修复：${rewriteContext || "质量检查未通过"}
${rewriteGuidance(rewriteContext)}
优先修复题目本身，不要扩大考察范围。`
    : "";

  const taskInstruction = supplementInstruction || rewriteInstruction || "任务类型：initial";

  return `${taskInstruction}

请根据下面的知识点生成题目。
targetQuestionCount 是温和目标：可靠、自然、角度不同才生成；否则少出。
preferredQuestionType 只是推荐题型，选择最自然的允许题型。

知识点：
${JSON.stringify(promptPoints, null, 2)}`;
}

function sanitizeQuestionPromptPoint(point = {}) {
  return {
    id: point.id,
    title: point.title,
    knowledgeType: point.knowledgeType,
    keyClaim: point.keyClaim,
    sourceQuote: point.sourceQuote,
    testabilityReason: point.testabilityReason || "",
    questionAngles: Array.isArray(point.questionAngles) ? point.questionAngles : [],
    testabilityScore: point.testabilityScore,
    structureRole: point.structureRole || "",
    importanceScore: point.importanceScore,
    roleInArticle: point.roleInArticle || point.structureRole || "",
    whyWorthReviewing: point.whyWorthReviewing || "",
    preferredQuestionType: point.preferredQuestionType,
    targetQuestionCount: point.targetQuestionCount
  };
}

export function targetQuestionCountForPoint(point) {
  return targetQuestionCountDecisionForPoint(point).count;
}

export function targetQuestionCountDecisionForPoint(point = {}) {
  const testabilityScore = clampScore(point.testabilityScore);
  const importanceScore = clampScore(point.importanceScore ?? point.testabilityScore);
  const role = String(point.structureRole || "");
  const angleCount = Array.isArray(point.questionAngles) ? point.questionAngles.length : 0;
  const factors = [
    `testability:${testabilityScore}`,
    `importance:${importanceScore}`,
    role ? `role:${role}` : "",
    `angles:${angleCount}`
  ].filter(Boolean);

  if (testabilityScore <= 2) {
    return {
      count: 1,
      reason: "low_testability",
      factors
    };
  }

  if (testabilityScore === 3 && importanceScore <= 2) {
    return {
      count: 1,
      reason: "low_importance",
      factors
    };
  }

  const highValueRole = ["main_claim", "method_step", "supporting_reason", "boundary"].includes(role);
  if (importanceScore >= 5 && testabilityScore >= 5 && angleCount >= 2) {
    return {
      count: 3,
      reason: "high_value_multi_angle",
      factors
    };
  }

  if ((importanceScore >= 4 && testabilityScore >= 4) || (testabilityScore >= 4 && highValueRole)) {
    return {
      count: 2,
      reason: "valuable_two_angle_target",
      factors
    };
  }

  return {
    count: 1,
    reason: "lean_default_single_question_target",
    factors
  };
}

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(5, Math.max(1, Math.round(number)));
}

function rewriteGuidance(context = "") {
  const issues = String(context);
  const guidance = [];
  if (/distractorQuality|干扰/.test(issues)) {
    guidance.push("干扰项：让选项组回到同一判断空间，移除重复、无关、极端或第二正确答案。");
  }
  if (/answerUniqueness|答案|唯一/.test(issues)) {
    guidance.push("答案唯一：只保留一个能被来源明确支持的正确答案。");
  }
  if (/understandingDepth|理解|source_repetition|原文/.test(issues)) {
    guidance.push("理解深度：考主张、边界或应用，不要问原文复述。");
  }
  if (/review_friction|friction|question_card_too_heavy|stem_too_long|scenario_background_too_long|option_too_explanatory|题卡|阅读负担|过长/.test(issues)) {
    guidance.push("题卡压缩：题干和选项只保留做判断所需的信息，把背景、证据链和解释移到答后字段。");
  }
  if (/source|来源/.test(issues)) {
    guidance.push("来源：sourceSnippet 必须来自 sourceQuote 或原文，定位本题锚点，不改写或概括。");
  }
  if (/question_type|题型/.test(issues)) {
    guidance.push("题型：题型只是表达方式，选择最自然的允许题型并保证结构合法。");
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

function normalizeMemoryAngle(value, question = {}) {
  const angle = String(value || "").trim();
  if (["core_understanding", "misconception_boundary", "scenario_application"].includes(angle)) return angle;
  const text = `${question.stem || ""} ${question.correctUnderstanding || ""} ${question.commonMisconception || ""}`;
  if (/场景|案例|应用|迁移|如果|团队|项目|应该怎么|最佳做法|处理/.test(text)) return "scenario_application";
  if (/误区|边界|区别|对比|不应|不能|混淆|错误|为什么.*不/.test(text)) return "misconception_boundary";
  return "core_understanding";
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

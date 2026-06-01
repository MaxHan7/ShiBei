import { callOpenAIJson } from "./openaiClient.js";
import { expectedQuestionType } from "./evaluateQuestions.js";
import { questionSchema, questionSystemPrompt } from "./prompts/questions.js";

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
      expectedCognitiveActions: Array.isArray(point.expectedCognitiveActions)
        ? point.expectedCognitiveActions
        : practiceBlueprint.map((item) => item.memoryAngle).filter(Boolean),
      preferredQuestionType,
      targetQuestionCount,
      practiceBlueprint
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
  const supplementInstruction = supplement
    ? `这是补题任务。请只为给定知识点补充最多 ${rewriteCount} 道新题。
已有题目和缺口：${supplementContext || "当前知识点还没有达到目标入池数量"}
要求：
- 不要复用已有题干、选项结构、正确理解、相同场景或同一判断。
- 如果补不出可靠新角度，可以少补题；不要编造来源或误区。`
    : "";
  const rewriteInstruction = rewrite
    ? `上一题没有通过质量检查。请只为给定知识点重写 ${rewriteCount} 道题。
需要修复的问题：${rewriteContext || "质量检查未通过"}
${rewriteGuidance(rewriteContext)}
避免原文填空、凑数干扰项、多个正确答案和来源片段不匹配。`
    : "";

  return `${supplementInstruction || rewriteInstruction}
请把 targetQuestionCount 当作温和目标：优先生成 targetQuestionCount 道不同角度候选题，而不是只保守生成 1 道。
每个知识点至少返回 1 道结构完整题；只有在来源无法支撑、答案会不唯一、或只能生成换壳重复题时，才少于 targetQuestionCount。
如果 targetQuestionCount >= 2，优先覆盖 core_understanding + misconception_boundary 或 scenario_application；如果 targetQuestionCount = 3，再补第三个自然角度。
memoryAngle 用来说明题目练习意图：
- core_understanding：抓住核心主张，不考原文复述、关键词识别或“原文提到了什么”。
- misconception_boundary：分清真实混淆和边界，错误选项必须是同一语境里的真实误区。
- scenario_application：把原文原则迁移到一个新场景，不能只是把原文句子换壳。
轻量复习要求：题干只放用户做判断所需的最少信息。题干保留关键变量，选项保留可比较的判断对象；复杂背景、来源证据和完整解释放进 explanation / correctUnderstanding / sourceSnippet。
preferredQuestionType 是推荐题型：优先使用它；如果另一种题型更自然、更能考理解，也可以改用其它允许题型。
如果使用 true_false，只能使用两个选项：A 成立，B 不成立。
如果使用 multiple_choice，必须使用 A/B/C/D 四个选项。
如果使用 scenario_judgment，必须使用 A/B/C/D 四个选项；题干描述具体使用场景，四个选项分别是四种行动方案、判断方式或处理策略，禁止使用“成立 / 不成立”。
正确答案位置要自然分散，不要固定放在 B。后端仍会重新排列选项，你只需要保证 correctOptionId 指向你认为正确的选项。
sourceSnippet 优先逐字来自该知识点 sourceQuote，不要改写来源片段；如果不确定怎么截取，直接把完整 sourceQuote 作为 sourceSnippet。
每道题的 3 个错误选项必须来自不同常见误解：错因要接近真实用户会犯的理解偏差，而不是随便编无关选项。
解释必须只解释来源中能支持的判断；如果要解释其它选项为什么错，必须能从来源、正确理解或常见误区中推出。
commonMisconception 必须描述一个真实、具体、贴近题目的误解；不要写“没有理解原文”“理解片面”这类泛泛说法。
如果 sourceQuote 很短，优先生成直接理解题或边界判断题；不要编造 sourceQuote 没有支撑的复杂业务细节。
优先参考 questionAngles 设计不同考察角度；如果没有 questionAngles，就根据 keyClaim 和 sourceQuote 选择最值得复习的角度。
${JSON.stringify(points, null, 2)}`;
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
    guidance.push("干扰项修复：3 个错误选项都要贴近同一主题，看起来可能被误选，但必须被 sourceQuote 或正确理解明确排除。不要使用无关、极端、玩笑或明显错误选项。");
  }
  if (/answerUniqueness|答案|唯一/.test(issues)) {
    guidance.push("答案唯一性修复：只有一个选项能同时被 sourceQuote 和正确理解支撑，其他选项必须各自错在清晰可解释的点上。");
  }
  if (/understandingDepth|理解|source_repetition|原文/.test(issues)) {
    guidance.push("理解深度修复：把题干改成应用场景、边界判断、误区辨析或行动选择，不要问原文复述。");
  }
  if (/review_friction|friction|question_card_too_heavy|stem_too_long|scenario_background_too_long|option_too_explanatory|题卡|阅读负担|过长/.test(issues)) {
    guidance.push("题卡压缩修复：题干优先控制在 15-45 个中文字符，只保留一个判断点；选项优先控制在 8-24 个中文字符。把背景、证据链和解释移到 explanation / correctUnderstanding / sourceSnippet。");
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

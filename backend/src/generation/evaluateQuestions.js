import { QUALITY_DIMENSIONS } from "./types.js";

export function evaluateQuestions({ questions, knowledgePoints, cleanedText = "", judgeResults = [] }) {
  const pointMap = new Map(knowledgePoints.map((point) => [point.id, point]));
  const judgeMap = new Map(judgeResults.map((result) => [result.questionId, result]));
  const seenStems = new Set();

  return questions.map((question) => {
    const point = pointMap.get(question.knowledgePointId);
    const normalizedQuestion = normalizeQuestionSourceSnippet(question, point, cleanedText);
    const typeValidation = validateQuestionType(question, point);
    const sourceValidation = validateSourceSnippet(normalizedQuestion, point, cleanedText);
    const scores = scoreQuestion(normalizedQuestion, point, seenStems, sourceValidation);
    const averageScore = average(Object.values(scores));
    const ruleIssues = collectIssues(normalizedQuestion, scores, point, typeValidation, sourceValidation);
    const ruleAction = decideAction(scores, averageScore, ruleIssues);
    const judge = judgeMap.get(normalizedQuestion.id) || null;
    const qualityIssues = mergeIssues(ruleIssues, judge?.seriousIssues);
    const action = mergeActions(ruleAction, judge?.qualityAction, qualityIssues);
    seenStems.add(normalize(normalizedQuestion.stem));

    return {
      ...normalizedQuestion,
      pointTitle: point?.title || "",
      qualityScore: {
        ...scores,
        average: round(averageScore),
        ...(judge ? { judge: judge.scores, judgeAverage: judge.averageScore } : {})
      },
      qualityIssues,
      qualityAction: action,
      ruleQualityAction: ruleAction,
      ...(judge ? { judgeQualityAction: judge.qualityAction, judgeReason: judge.reason } : {})
    };
  });
}

function normalizeQuestionSourceSnippet(question, point, cleanedText) {
  if (!point?.sourceQuote) return question;
  const currentValidation = validateSourceSnippet(question, point, cleanedText);
  if (currentValidation.valid) return question;
  const support = currentValidation.support;
  if (support === "missing" || support === "not_found") {
    return {
      ...question,
      sourceSnippet: point.sourceQuote,
      sourceSnippetWasBackfilled: true
    };
  }
  return question;
}

export function validateQuestionType(question, point) {
  if (!point) {
    return { valid: false, expectedType: "", issue: "missing_knowledge_point" };
  }
  const expectedType = expectedQuestionType(point);
  if (question.type !== expectedType) {
    return { valid: false, expectedType, issue: "question_type_mismatch" };
  }
  return { valid: true, expectedType, issue: "" };
}

export function expectedQuestionType(point) {
  const type = point?.knowledgeType;
  if (type === "judgment") {
    const angles = Array.isArray(point?.questionAngles) ? point.questionAngles.join("") : "";
    if ((Number(point?.testabilityScore) || 0) >= 4 && /为什么|如何|怎么|场景|适合|路径|策略|行动/.test(angles)) {
      return "scenario_judgment";
    }
    return "true_false";
  }
  if (type === "method" || type === "scenario" || type === "step") return "scenario_judgment";
  return "multiple_choice";
}

function scoreQuestion(question, point, seenStems, sourceValidation) {
  const sourceSupport = scoreSourceSupport(sourceValidation);
  const answerUniqueness = scoreAnswerUniqueness(question);
  const understandingDepth = scoreUnderstandingDepth(question);
  const clarity = scoreClarity(question);
  const distractorQuality = scoreDistractorQuality(question);
  const reviewValue = scoreReviewValue(question, point);
  const duplicatePenalty = seenStems.has(normalize(question.stem)) ? -1 : 0;

  return {
    sourceSupport,
    answerUniqueness,
    understandingDepth: clamp(understandingDepth + duplicatePenalty),
    clarity,
    distractorQuality,
    reviewValue
  };
}

function validateSourceSnippet(question, point, cleanedText) {
  const snippet = normalize(question.sourceSnippet);
  const pointSource = normalize(point?.sourceQuote);
  const fullText = normalize(cleanedText);
  if (!snippet) return { valid: false, support: "missing" };
  if (!pointSource && !fullText) return { valid: false, support: "missing_source" };
  if (pointSource.includes(snippet) || snippet.includes(pointSource.slice(0, 24))) {
    return { valid: true, support: "point_source" };
  }
  if (snippet.length >= 12 && fullText.includes(snippet)) {
    return { valid: true, support: "cleaned_text" };
  }
  if (snippet.length >= 18 && pointSource.includes(snippet.slice(0, 18))) {
    return { valid: true, support: "partial_point_source" };
  }
  return { valid: false, support: "not_found" };
}

function scoreSourceSupport(sourceValidation) {
  if (!sourceValidation.valid) return 1;
  if (sourceValidation.support === "point_source") return 5;
  if (sourceValidation.support === "cleaned_text" || sourceValidation.support === "partial_point_source") return 4;
  return 2;
}

function scoreAnswerUniqueness(question) {
  if (!question.correctOptionId) return 1;
  if (question.type !== "true_false" && question.options.length !== 4) return 1;
  if (question.type === "true_false" && question.options.length !== 2) return 1;
  const ids = new Set(question.options.map((option) => option.id));
  if (!ids.has(question.correctOptionId)) return 1;
  const optionTexts = question.options.map((option) => normalize(option.text));
  if (new Set(optionTexts).size !== optionTexts.length) return 2;
  const correctText = normalize(question.options.find((option) => option.id === question.correctOptionId)?.text || "");
  const nearDuplicates = question.options.filter((option) => option.id !== question.correctOptionId)
    .some((option) => overlapRatio(correctText, normalize(option.text)) > 0.82);
  if (nearDuplicates) return 3;
  return 5;
}

function scoreUnderstandingDepth(question) {
  const text = `${question.stem}${question.correctUnderstanding}`;
  if (/场景|适合|边界|误区|为什么|区别|对比|应用|做法|条件|判断|迁移|取舍/.test(text)) return 5;
  if (/以下哪种|哪种理解|是否成立|成立/.test(text)) return 4;
  if (/原文|提到|关键词|填空|作者认为|文中说/.test(text)) return 2;
  return 3;
}

function scoreClarity(question) {
  if (!question.stem || question.stem.length < 10) return 1;
  if (!question.explanation || !question.correctUnderstanding || !question.commonMisconception) return 2;
  if (question.options.some((option) => !option.text || option.text.length < 2)) return 2;
  if (question.type === "scenario_judgment" && isBinaryJudgmentOptions(question)) return 2;
  if (/以上都|无法判断|都正确|都不正确/.test(question.options.map((option) => option.text).join(""))) return 3;
  return 5;
}

function scoreDistractorQuality(question) {
  if (question.type === "true_false") return question.options.length === 2 ? 4 : 2;
  if (question.options.length < 4) return 2;
  if (question.type === "scenario_judgment" && isBinaryJudgmentOptions(question)) return 1;
  const correct = question.options.find((option) => option.id === question.correctOptionId)?.text || "";
  const wrongOptions = question.options.filter((option) => option.id !== question.correctOptionId);
  if (wrongOptions.some((option) => option.text.length < 6)) return 2;
  if (wrongOptions.some((option) => normalize(option.text) === normalize(correct))) return 1;
  if (wrongOptions.some((option) => /明显错误|无关|随便|都不/.test(option.text))) return 2;
  return 4;
}

function scoreReviewValue(question, point) {
  if (!point) return 1;
  if (point.testabilityScore >= 4) return 5;
  if (/常识|显然|大家都知道/.test(`${point.summary}${question.stem}`)) return 2;
  return 3;
}

function collectIssues(question, scores, point, typeValidation, sourceValidation) {
  const issues = [];
  for (const key of QUALITY_DIMENSIONS) {
    if (scores[key] <= 2) issues.push(`${key}_low`);
  }
  if (!point) issues.push("missing_knowledge_point");
  if (typeValidation && !typeValidation.valid && typeValidation.issue) issues.push(typeValidation.issue);
  if (!question.sourceSnippet) issues.push("missing_source_snippet");
  if (sourceValidation && !sourceValidation.valid) issues.push(`source_snippet_${sourceValidation.support}`);
  if (!question.options.length) issues.push("missing_options");
  if (question.type !== "true_false" && question.options.length !== 4) issues.push("non_binary_question_requires_four_options");
  if (question.type === "true_false" && question.options.length !== 2) issues.push("true_false_requires_two_options");
  if (question.type === "scenario_judgment" && isBinaryJudgmentOptions(question)) {
    issues.push("scenario_judgment_binary_options");
  }
  if (isSourceRepeatingStem(question)) issues.push("source_repetition_stem");
  return [...new Set(issues)];
}

function decideAction(scores, averageScore, issues) {
  if (issues.includes("missing_knowledge_point") || issues.includes("missing_source_snippet")) return "discard";
  if (issues.includes("source_snippet_not_found") || issues.includes("source_snippet_missing_source")) return "discard";
  if (issues.includes("scenario_judgment_binary_options")) return "rewrite";
  if (issues.includes("non_binary_question_requires_four_options") || issues.includes("true_false_requires_two_options")) return "rewrite";
  if (scores.sourceSupport < 4 || scores.answerUniqueness < 4 || scores.clarity < 4 || scores.distractorQuality < 4) {
    return "rewrite";
  }
  if (scores.reviewValue < 3 || scores.understandingDepth < 3) return "discard";
  if (averageScore < 4 && scores.sourceSupport < 5) return "rewrite";
  return "pass";
}

function mergeActions(ruleAction, judgeAction, qualityIssues = []) {
  const rank = { pass: 0, rewrite: 1, discard: 2 };
  if (qualityIssues.some((issue) => /来源.*不.*支撑|来源.*未.*支持|来源.*不足|source.*support/i.test(issue))) {
    return "rewrite";
  }
  const normalizedJudgeAction = rank[judgeAction] === undefined ? "pass" : judgeAction;
  return rank[ruleAction] >= rank[normalizedJudgeAction] ? ruleAction : normalizedJudgeAction;
}

function mergeIssues(ruleIssues, judgeIssues = []) {
  return [...new Set([...ruleIssues, ...judgeIssues.filter(Boolean).map((issue) => `judge_${issue}`)])];
}

function isSourceRepeatingStem(question) {
  const stem = normalize(question.stem);
  const snippet = normalize(question.sourceSnippet);
  if (!stem || !snippet) return false;
  return overlapRatio(stem, snippet) > 0.75 && /原文|提到|文中|作者/.test(question.stem);
}

function overlapRatio(a, b) {
  if (!a || !b) return 0;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  let hits = 0;
  for (const char of new Set([...shorter])) {
    if (longer.includes(char)) hits += 1;
  }
  return hits / Math.max(1, new Set([...shorter]).size);
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, "");
}

function isBinaryJudgmentOptions(question) {
  const optionTexts = question.options.map((option) => normalize(option.text));
  if (optionTexts.length !== 2) return false;
  return optionTexts.includes("成立") && optionTexts.includes("不成立");
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function clamp(value) {
  return Math.min(5, Math.max(1, value));
}

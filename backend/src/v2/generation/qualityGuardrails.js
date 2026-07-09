const FORBIDDEN_STEM_PHRASES = [
  "根据本文",
  "根据文章",
  "根据原文",
  "文中提到",
  "这篇文章里",
  "这篇文章的",
  "这里的",
  "上述",
  "文章指出"
];

const FORBIDDEN_EXPLANATION_PATTERNS = [
  /正确选项\s*[A-DＡ-Ｄ]/i,
  /选项\s*[A-DＡ-Ｄ]\s*正确/i,
  /文章指出/,
  /根据文章/,
  /根据原文/
];

const OPTION_TONE_CUE_TERMS = [
  "完全",
  "一定",
  "所有",
  "任何",
  "只能",
  "只要",
  "不需要",
  "无需",
  "无关",
  "没有关系",
  "替代一切",
  "全部替代",
  "百分百",
  "必然",
  "绝不",
  "绝对"
];

const WEAK_MATCHING_STEM_PATTERNS = [
  /概念.{0,6}(描述|解释|定义)/,
  /名词.{0,6}(描述|解释|定义)/,
  /人物.{0,6}(贡献|定义)/,
  /案例.{0,6}(特征|描述)/,
  /术语.{0,6}(解释|定义)/
];

const EXPLANATION_MAX_CHARS = 120;
const SHORT_GENERIC_MATCHING_TEXT_MAX = 7;
const GENERIC_RIGHT_TEXT_PATTERNS = [
  /定义$/,
  /描述$/,
  /解释$/,
  /贡献$/,
  /特征$/,
  /概念$/,
  /案例$/
];
const MATCHING_RELATION_SIGNAL_TERMS = [
  "负责",
  "作用",
  "目的",
  "用于",
  "用来",
  "触发",
  "验证",
  "检查",
  "边界",
  "条件",
  "时机",
  "场景",
  "影响",
  "导致",
  "输出",
  "下一步",
  "行动",
  "信号",
  "判断",
  "依据",
  "限制",
  "区分",
  "可复查",
  "执行",
  "调用",
  "生成",
  "搜索",
  "分析",
  "制定",
  "更新"
];

export function runV2QualityGuardrails(reviewPath) {
  const issues = [];
  const diagnostics = [];
  const anchorIds = new Set(
    (reviewPath.units || []).map((unit) => unit.sourceAnchor?.id).filter(Boolean)
  );

  for (const unit of reviewPath.units || []) {
    for (const question of unit.questions || []) {
      const questionDiagnostics = analyzeQuestion(question, unit, anchorIds);
      diagnostics.push(questionDiagnostics);
      issues.push(...questionDiagnostics.issues);
    }
  }

  return {
    verdict: issues.some((issue) => issue.severity === "error") ? "revise" : "pass",
    issues,
    diagnostics
  };
}

function analyzeQuestion(question, unit, anchorIds) {
  const checks = {
    forbiddenPhrase: [],
    distractorValue: "not_applicable",
    matchingRelationValue: "not_applicable",
    matchingQuality: null,
    explanationUiFit: "pass",
    sourceAnchorPrecision: "pass",
    optionLengthBalance: "not_applicable",
    optionQuality: null
  };
  const issues = [];

  const forbiddenPhrases = findForbiddenStemPhrases(question.stem);
  if (forbiddenPhrases.length > 0) {
    checks.forbiddenPhrase = forbiddenPhrases;
    issues.push(issue({
      code: "v2_forbidden_stem_phrase",
      severity: "error",
      message: `题干包含 V2 禁用的原文回忆表达：${forbiddenPhrases.join("、")}`,
      targetId: question.id
    }));
  }

  if (FORBIDDEN_EXPLANATION_PATTERNS.some((pattern) => pattern.test(question.explanation || ""))) {
    issues.push(issue({
      code: "v2_exam_feedback_phrase",
      severity: "error",
      message: "答后解释包含考试批改话术或原文回忆表达。",
      targetId: question.id
    }));
  }

  if (countVisibleChars(question.explanation) > EXPLANATION_MAX_CHARS) {
    checks.explanationUiFit = "too_long";
    issues.push(issue({
      code: "v2_explanation_too_long",
      severity: "error",
      message: `答后解释超过 ${EXPLANATION_MAX_CHARS} 字，不适合底部反馈浮窗。`,
      targetId: question.id
    }));
  }

  if (!question.sourceAnchorId || question.sourceAnchorId !== unit.sourceAnchor?.id || !anchorIds.has(question.sourceAnchorId)) {
    checks.sourceAnchorPrecision = "missing_or_mismatched";
    issues.push(issue({
      code: "v2_anchor_missing_support",
      severity: "error",
      message: "题目的 sourceAnchorId 没有指向当前 unit 的有效 source anchor。",
      targetId: question.id
    }));
  }

  if (question.type === "multiple_choice") {
    const optionQuality = analyzeOptionQuality(question);
    checks.optionQuality = optionQuality;
    checks.optionLengthBalance = optionQuality.lengthBalance;

    const distractorCheck = analyzeDistractors(question);
    checks.distractorValue = distractorCheck.status;
    if (distractorCheck.issue) issues.push(distractorCheck.issue);

    const toneCueCheck = analyzeOptionToneCues(question);
    checks.optionToneCue = toneCueCheck.status;
    if (toneCueCheck.issue) issues.push(toneCueCheck.issue);
  }

  if (question.type === "matching") {
    const matchingCheck = analyzeMatchingRelation(question);
    checks.matchingRelationValue = matchingCheck.status;
    checks.matchingQuality = matchingCheck.quality;
    if (matchingCheck.issue) issues.push(matchingCheck.issue);
  }

  return {
    unitId: unit.id,
    questionId: question.id,
    questionType: question.type,
    checks,
    issues
  };
}

function findForbiddenStemPhrases(stem = "") {
  return FORBIDDEN_STEM_PHRASES.filter((phrase) => stem.includes(phrase));
}

function analyzeDistractors(question) {
  const options = Array.isArray(question.options) ? question.options : [];
  const correct = options.find((option) => option.id === question.correctOptionId);
  const distractors = options.filter((option) => option.id !== question.correctOptionId);

  if (!correct || distractors.length !== 3) {
    return { status: "invalid_options" };
  }

  const correctLength = countVisibleChars(correct.text);
  const longestDistractorLength = Math.max(...distractors.map((option) => countVisibleChars(option.text)));
  const shortestDistractorLength = Math.min(...distractors.map((option) => countVisibleChars(option.text)));

  if (correctLength >= 24 && correctLength > longestDistractorLength * 1.8) {
    return {
      status: "correct_option_too_obvious",
      issue: issue({
        code: "v2_weak_distractor_set",
        severity: "error",
        message: "正确选项明显更长、更像标准答案，干扰项价值不足。",
        targetId: question.id
      })
    };
  }

  if (shortestDistractorLength <= 3) {
    return {
      status: "distractor_too_short",
      issue: issue({
        code: "v2_weak_distractor_set",
        severity: "error",
        message: "存在过短干扰项，疑似凑数。",
        targetId: question.id
      })
    };
  }

  return { status: "pass" };
}

function analyzeOptionQuality(question) {
  const options = Array.isArray(question.options) ? question.options : [];
  const correctOptionId = String(question.correctOptionId || "");
  const correct = options.find((option) => option.id === correctOptionId);
  const distractors = options.filter((option) => option.id !== correctOptionId);
  const optionLengths = Object.fromEntries(
    options.map((option) => [option.id, countVisibleChars(option.text)])
  );
  const lengths = Object.values(optionLengths);
  const distractorLengths = distractors.map((option) => countVisibleChars(option.text));
  const correctLength = correct ? countVisibleChars(correct.text) : 0;
  const medianDistractorLength = median(distractorLengths);
  const correctToMedianDistractorRatio = medianDistractorLength
    ? roundToTwoDecimals(correctLength / medianDistractorLength)
    : null;
  const cueHits = options.flatMap((option) =>
    cueTermsInText(option.text).map((term) => ({
      optionId: option.id,
      term,
      isCorrect: option.id === correctOptionId
    }))
  );
  const correctCueTerms = unique(
    cueHits.filter((hit) => hit.isCorrect).map((hit) => hit.term)
  );
  const distractorCueTerms = unique(
    cueHits.filter((hit) => !hit.isCorrect).map((hit) => hit.term)
  );

  return {
    optionCount: options.length,
    correctOptionId,
    optionLengths,
    correctLength,
    distractorLengths,
    medianDistractorLength,
    correctToMedianDistractorRatio,
    shortestOptionLength: lengths.length ? Math.min(...lengths) : 0,
    longestOptionLength: lengths.length ? Math.max(...lengths) : 0,
    lengthRange: lengths.length ? Math.max(...lengths) - Math.min(...lengths) : 0,
    lengthBalance: optionLengthBalance({ correctLength, medianDistractorLength }),
    cueHits,
    correctCueTerms,
    distractorCueTerms
  };
}

function analyzeOptionToneCues(question) {
  const options = Array.isArray(question.options) ? question.options : [];
  const correct = options.find((option) => option.id === question.correctOptionId);
  const distractors = options.filter((option) => option.id !== question.correctOptionId);

  if (!correct || distractors.length === 0) {
    return { status: "invalid_options" };
  }

  const correctHits = cueTermsInText(correct.text);
  const distractorHits = distractors.flatMap((option) =>
    cueTermsInText(option.text).map((term) => ({ optionId: option.id, term }))
  );
  const distractorHitOptionCount = new Set(distractorHits.map((hit) => hit.optionId)).size;

  if (distractorHitOptionCount >= 2 && correctHits.length === 0) {
    return {
      status: "distractor_tone_cue",
      issue: issue({
        code: "v2_option_tone_cue",
        severity: "warning",
        message: `多个干扰项包含绝对化或否定化泄题词：${unique(distractorHits.map((hit) => hit.term)).join("、")}`,
        targetId: question.id
      })
    };
  }

  if (distractorHits.length > 0) {
    return { status: "watch", cueTerms: unique(distractorHits.map((hit) => hit.term)) };
  }

  return { status: "pass" };
}

function optionLengthBalance({ correctLength, medianDistractorLength }) {
  if (!medianDistractorLength) return "invalid_options";
  if (correctLength >= 24 && correctLength > medianDistractorLength * 1.8) {
    return "correct_option_too_obvious";
  }
  if (correctLength >= 18 && correctLength > medianDistractorLength * 1.35) {
    return "watch_correct_option_longer";
  }
  return "pass";
}

function cueTermsInText(value = "") {
  const text = String(value || "");
  return OPTION_TONE_CUE_TERMS.filter((term) => text.includes(term));
}

function median(values) {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);
  if (!sorted.length) return 0;
  return sorted[Math.floor(sorted.length / 2)];
}

function roundToTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function analyzeMatchingRelation(question) {
  const quality = analyzeMatchingQuality(question);

  if (quality.status === "weak_relation") {
    return {
      status: quality.status,
      quality,
      issue: issue({
        code: "v2_weak_matching_relation",
        severity: "error",
        message: "连线题像机械名词解释配对，没有体现职责、边界、时机、作用或验证维度。",
        targetId: question.id
      })
    };
  }

  return {
    status: quality.status,
    quality
  };
}

function analyzeMatchingQuality(question) {
  const stem = question.stem || "";
  const leftItems = Array.isArray(question.leftItems) ? question.leftItems : [];
  const rightItems = Array.isArray(question.rightItems) ? question.rightItems : [];
  const weakStem = WEAK_MATCHING_STEM_PATTERNS.some((pattern) => pattern.test(stem));
  const genericRightItems = rightItems.filter((item) =>
    countVisibleChars(item.text) <= SHORT_GENERIC_MATCHING_TEXT_MAX ||
    GENERIC_RIGHT_TEXT_PATTERNS.some((pattern) => pattern.test(item.text || ""))
  );
  const relationSignalHits = unique(
    [...rightItems, ...leftItems, { text: question.relationGoal }, { text: question.explanation }]
      .flatMap((item) => relationSignalsInText(item.text))
  );
  const leftItemLengths = Object.fromEntries(
    leftItems.map((item) => [item.id, countVisibleChars(item.text)])
  );
  const rightItemLengths = Object.fromEntries(
    rightItems.map((item) => [item.id, countVisibleChars(item.text)])
  );
  const shortRightItems = rightItems.filter((item) =>
    countVisibleChars(item.text) <= SHORT_GENERIC_MATCHING_TEXT_MAX
  );
  const genericRightTexts = genericRightItems.map((item) => item.text);
  const status = weakStem || (genericRightItems.length >= 3 && relationSignalHits.length < 2)
    ? "weak_relation"
    : "pass";

  return {
    status,
    relationType: question.relationType || "",
    relationGoalLength: countVisibleChars(question.relationGoal),
    pairCount: Array.isArray(question.pairs) ? question.pairs.length : 0,
    leftItemCount: leftItems.length,
    rightItemCount: rightItems.length,
    leftItemLengths,
    rightItemLengths,
    weakStem,
    genericRightItemCount: genericRightItems.length,
    shortRightItemCount: shortRightItems.length,
    genericRightTexts,
    relationSignalHits
  };
}

function relationSignalsInText(value = "") {
  const text = String(value || "");
  return MATCHING_RELATION_SIGNAL_TERMS.filter((term) => text.includes(term));
}

function issue({ code, severity, message, targetId }) {
  return {
    code,
    severity,
    message,
    ...(targetId ? { targetId } : {})
  };
}

function countVisibleChars(value = "") {
  return String(value).replace(/\s+/g, "").length;
}

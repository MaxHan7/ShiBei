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
  const sourceContext = selectSourceContext({ question, point, cleanedText });
  if (sourceContext) {
    return {
      ...question,
      sourceSnippet: sourceContext.text,
      sourceSnippetAnchor: point.sourceQuote,
      sourceContextWasExpanded: sourceContext.text !== question.sourceSnippet,
      sourceContextScore: sourceContext.score
    };
  }
  if (cleanedText && !sourceMatches(cleanedText, point.sourceQuote)) {
    return {
      ...question,
      sourceSnippet: point.sourceQuote,
      sourceSnippetWasBackfilled: true
    };
  }
  const currentValidation = validateSourceSnippet(question, point, cleanedText);
  if (currentValidation.support === "missing" || currentValidation.support === "not_found") {
    return {
      ...question,
      sourceSnippet: point.sourceQuote,
      sourceSnippetWasBackfilled: true
    };
  }
  return question;
}

function selectSourceContext({ question, point, cleanedText }) {
  if (!point?.sourceQuote || !cleanedText) return null;
  const paragraphs = splitParagraphs(cleanedText);
  const candidates = [];

  paragraphs.forEach((paragraph, index) => {
    if (!sourceMatches(paragraph.text, point.sourceQuote)) return;
    const context = buildContextWindow(paragraphs, index, paragraph.text, point.sourceQuote, question, point);
    if (!context) return;
    candidates.push(context);
  });

  candidates.sort((a, b) => b.score - a.score || scoreLength(b.text) - scoreLength(a.text));
  return candidates[0] || null;
}

function splitParagraphs(text) {
  return String(text || "")
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({ text: paragraph, sentences: splitSentences(paragraph) }));
}

function splitSentences(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const matches = normalized.match(/[^。！？!?；;\n]+[。！？!?；;]?/g) || [normalized];
  return matches.map((sentence) => sentence.trim()).filter(Boolean);
}

function sourceMatches(text, sourceQuote) {
  const body = normalize(text);
  const quote = normalize(sourceQuote);
  if (!body || !quote) return false;
  if (body.includes(quote)) return true;
  if (quote.length >= 24 && body.includes(quote.slice(0, 24))) return true;
  return quote.length >= 24 && body.includes(quote.slice(-24));
}

function buildContextWindow(paragraphs, paragraphIndex, paragraphText, sourceQuote, question, point) {
  if (paragraphText.length >= 150 && paragraphText.length <= 500) {
    return scoreContext(paragraphText, sourceQuote, question, point);
  }

  if (paragraphText.length < 150) {
    const nearby = [
      ...(paragraphs[paragraphIndex - 1]?.sentences || []).slice(-2),
      ...paragraphs[paragraphIndex].sentences,
      ...(paragraphs[paragraphIndex + 1]?.sentences || []).slice(0, 2)
    ];
    const expanded = trimSentencesToLimit(nearby, sourceQuote);
    return scoreContext(expanded || paragraphText, sourceQuote, question, point);
  }

  const sentences = paragraphs[paragraphIndex].sentences;
  const anchorIndex = sentences.findIndex((sentence) => sourceMatches(sentence, sourceQuote));
  if (anchorIndex === -1) {
    return scoreContext(cropAtSentenceBoundary(paragraphText, sourceQuote), sourceQuote, question, point);
  }
  const window = expandSentenceWindow(sentences, anchorIndex, question, point);
  return scoreContext(window, sourceQuote, question, point);
}

function expandSentenceWindow(sentences, anchorIndex, question, point) {
  const selected = new Set([anchorIndex]);
  let left = anchorIndex - 1;
  let right = anchorIndex + 1;
  let text = sentences[anchorIndex] || "";
  const keywords = extractKeywords(question, point);

  while (text.length < 150 && (left >= 0 || right < sentences.length)) {
    const leftScore = left >= 0 ? sentenceRelevance(sentences[left], keywords) : -1;
    const rightScore = right < sentences.length ? sentenceRelevance(sentences[right], keywords) : -1;
    const nextIndex = rightScore > leftScore ? right++ : left--;
    selected.add(nextIndex);
    text = [...selected].sort((a, b) => a - b).map((index) => sentences[index]).join("");
    if (text.length > 500) {
      selected.delete(nextIndex);
      break;
    }
  }

  while (left >= 0 || right < sentences.length) {
    const leftSentence = left >= 0 ? sentences[left] : "";
    const rightSentence = right < sentences.length ? sentences[right] : "";
    const leftScore = sentenceRelevance(leftSentence, keywords);
    const rightScore = sentenceRelevance(rightSentence, keywords);
    if (Math.max(leftScore, rightScore) <= 0) break;
    const nextIndex = rightScore > leftScore ? right++ : left--;
    const nextText = [...selected, nextIndex].sort((a, b) => a - b).map((index) => sentences[index]).join("");
    if (nextText.length > 500) break;
    selected.add(nextIndex);
    text = nextText;
  }

  return text || sentences[anchorIndex] || "";
}

function trimSentencesToLimit(sentences, sourceQuote) {
  const anchorIndex = sentences.findIndex((sentence) => sourceMatches(sentence, sourceQuote));
  const start = anchorIndex === -1 ? 0 : anchorIndex;
  const selected = [];
  for (let index = start; index < sentences.length; index += 1) {
    const next = [...selected, sentences[index]].join("");
    if (next.length > 500 && selected.length) break;
    selected.push(sentences[index]);
    if (next.length >= 150) break;
  }
  for (let index = start - 1; selected.join("").length < 150 && index >= 0; index -= 1) {
    const next = [sentences[index], ...selected].join("");
    if (next.length > 500) break;
    selected.unshift(sentences[index]);
  }
  return selected.join("");
}

function cropAtSentenceBoundary(text, sourceQuote) {
  const quote = normalize(sourceQuote);
  const normalizedText = normalize(text);
  const normalizedIndex = normalizedText.indexOf(quote.slice(0, Math.min(quote.length, 24)));
  if (normalizedIndex === -1) return text.slice(0, 500);
  const approximateStart = Math.max(0, normalizedIndex - 180);
  const approximateEnd = Math.min(text.length, approximateStart + 500);
  const chunk = text.slice(approximateStart, approximateEnd);
  return chunk.replace(/^[^。！？!?；;]*[。！？!?；;]?/, "").trim() || chunk.trim();
}

function scoreContext(text, sourceQuote, question, point) {
  const trimmed = String(text || "").trim();
  if (!trimmed || !sourceMatches(trimmed, sourceQuote)) return null;
  const keywords = extractKeywords(question, point);
  const relevance = keywords.reduce((sum, keyword) => sum + (normalize(trimmed).includes(keyword) ? 1 : 0), 0);
  return {
    text: trimmed,
    score: 100 + relevance * 5 + scoreLength(trimmed)
  };
}

function scoreLength(text) {
  const length = String(text || "").length;
  if (length >= 150 && length <= 500) return 20;
  if (length >= 80 && length < 150) return 10;
  if (length > 500) return 4;
  return 0;
}

function extractKeywords(question, point) {
  const source = [
    question?.stem,
    question?.correctUnderstanding,
    question?.commonMisconception,
    point?.title,
    point?.keyClaim,
    point?.summary
  ].filter(Boolean).join(" ");
  const normalized = source
    .replace(/[，。！？；：、,.!?;:()[\]{}"'“”‘’|/\\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = normalized.split(" ").filter((word) => /[A-Za-z0-9]/.test(word) && word.length >= 3);
  const chineseRuns = normalized.split(/\s+/).filter((word) => /[\u4e00-\u9fff]/.test(word));
  const grams = [];
  for (const run of chineseRuns) {
    const chars = [...run].filter((char) => /[\u4e00-\u9fff]/.test(char));
    for (let index = 0; index < chars.length - 1; index += 1) {
      grams.push(chars.slice(index, index + 2).join(""));
    }
    for (let index = 0; index < chars.length - 2; index += 1) {
      grams.push(chars.slice(index, index + 3).join(""));
    }
  }
  return [...new Set([...words, ...grams].map(normalize).filter((keyword) => keyword.length >= 2))].slice(0, 60);
}

function sentenceRelevance(sentence, keywords) {
  const body = normalize(sentence);
  return keywords.reduce((sum, keyword) => sum + (body.includes(keyword) ? 1 : 0), 0);
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

import { QUALITY_DIMENSIONS } from "./types.js";
import { blueprintAlignment, pedagogyDiagnosticsForQuestion } from "./practiceBlueprint.js";

export function evaluateQuestions({ questions, knowledgePoints, cleanedText = "", judgeResults = [] }) {
  const pointMap = new Map(knowledgePoints.map((point) => [point.id, point]));
  const judgeMap = new Map(judgeResults.map((result) => [result.questionId, result]));
  const seenStems = new Set();
  const sourceContextUsage = createSourceContextUsage(cleanedText);

  return questions.map((question) => {
    const point = pointMap.get(question.knowledgePointId);
    const normalizedQuestion = normalizeQuestionSourceSnippet(question, point, cleanedText, sourceContextUsage);
    const reviewFriction = reviewFrictionDiagnostics(normalizedQuestion);
    const typeValidation = validateQuestionType(question, point);
    const sourceValidation = validateSourceSnippet(normalizedQuestion, point, cleanedText);
    const scores = scoreQuestion(normalizedQuestion, point, seenStems, sourceValidation);
    const averageScore = average(Object.values(scores));
    const ruleIssues = collectIssues(normalizedQuestion, scores, point, typeValidation, sourceValidation, reviewFriction);
    const ruleAction = decideAction(scores, averageScore, ruleIssues);
    const judge = judgeMap.get(normalizedQuestion.id) || null;
    const qualityIssues = mergeIssues(ruleIssues, judge?.seriousIssues);
    const blueprint = blueprintAlignment(normalizedQuestion, point);
    const pedagogy = pedagogyDiagnosticsForQuestion(normalizedQuestion, point, blueprint);
    const trust = buildTrustDiagnostics({
      question: normalizedQuestion,
      point,
      scores,
      sourceValidation,
      typeValidation,
      qualityIssues,
      ruleAction,
      judge,
      pedagogy,
      reviewFriction
    });
    const action = mergeActions(ruleAction, judge?.qualityAction, qualityIssues);
    seenStems.add(normalize(normalizedQuestion.stem));

    return {
      ...normalizedQuestion,
      ...blueprint,
      ...pedagogy,
      pointTitle: point?.title || "",
      structureNodeId: normalizedQuestion.structureNodeId || point?.structureNodeId || "",
      roleInArticle: normalizedQuestion.roleInArticle || point?.roleInArticle || point?.structureRole || "",
      requiredEvidenceIds: Array.isArray(normalizedQuestion.requiredEvidenceIds)
        ? normalizedQuestion.requiredEvidenceIds
        : (Array.isArray(point?.sourceEvidenceIds) ? point.sourceEvidenceIds : []),
      sourceEvidenceIds: Array.isArray(point?.sourceEvidenceIds) ? point.sourceEvidenceIds : [],
      qualityScore: {
        ...scores,
        average: round(averageScore),
        ...(judge ? { judge: judge.scores, judgeAverage: judge.averageScore } : {})
      },
      qualityIssues,
      qualityAction: action,
      ruleQualityAction: ruleAction,
      trustDiagnostics: trust.trustDiagnostics,
      sourceCoverageScore: trust.sourceCoverageScore,
      claimFidelityScore: trust.claimFidelityScore,
      confidenceReasons: trust.confidenceReasons,
      blockingReasons: trust.blockingReasons,
      primaryBlockingReason: trust.primaryBlockingReason,
      confidenceTier: trust.confidenceTier,
      repairHint: trust.repairHint,
      reviewFrictionScore: trust.reviewFrictionScore,
      visibleReadingLoad: trust.visibleReadingLoad,
      stemLength: trust.stemLength,
      maxOptionLength: trust.maxOptionLength,
      reviewFrictionReasons: trust.reviewFrictionReasons,
      ...(judge ? { judgeQualityAction: judge.qualityAction, judgeReason: judge.reason } : {})
    };
  });
}

function normalizeQuestionSourceSnippet(question, point, cleanedText, sourceContextUsage = createSourceContextUsage()) {
  if (!point?.sourceQuote) return question;
  const sourceContext = selectSourceContext({ question, point, cleanedText, sourceContextUsage });
  if (sourceContext) {
    recordSourceContextUsage(sourceContext, sourceContextUsage);
    return {
      ...question,
      sourceSnippet: sourceContext.text,
      sourceSnippetAnchor: point.sourceQuote,
      sourceContextWasExpanded: sourceContext.text !== question.sourceSnippet,
      sourceContextScore: sourceContext.score,
      sourcePrecisionScore: sourceContext.selection?.sourcePrecisionScore ?? null,
      sourceSpecificityScore: sourceContext.selection?.specificityScore ?? null,
      sourceMinimalityScore: sourceContext.selection?.sourceMinimalityScore ?? null,
      sourceEvidenceRole: sourceContext.selection?.sourceEvidenceRole || "",
      sourceBlockId: sourceContext.selection?.sourceBlockId || "",
      sourceEvidenceDiversityScore: sourceContext.selection?.sourceEvidenceDiversityScore ?? null,
      sourceReuseReason: sourceContext.selection?.sourceReuseReason || "",
      sourceOverlapRatio: sourceContext.selection?.sourceOverlapRatio ?? 0,
      sourceOverlapGroupId: sourceContext.selection?.sourceOverlapGroupId || "",
      sourceReuseCount: sourceContext.selection?.reuseCount ?? 0,
      sourceContextSelection: sourceContext.selection,
      sourceSnippetWasBackfilled: sourceContext.selection?.fallback ? true : question.sourceSnippetWasBackfilled
    };
  }
  if (cleanedText && !sourceMatches(cleanedText, point.sourceQuote)) {
    return {
      ...question,
      sourceSnippet: point.sourceQuote,
      sourceSnippetWasBackfilled: true,
      sourceContextUnsupported: true
    };
  }
  const currentValidation = validateSourceSnippet(question, point, cleanedText);
  if (currentValidation.support === "missing" || currentValidation.support === "not_found") {
    return {
      ...question,
      sourceSnippet: point.sourceQuote,
      sourceSnippetWasBackfilled: true,
      sourceContextUnsupported: true
    };
  }
  return question;
}

function selectSourceContext({ question, point, cleanedText, sourceContextUsage = createSourceContextUsage() }) {
  if (!point?.sourceQuote || !cleanedText) return null;
  const paragraphs = splitParagraphs(cleanedText);
  const anchorIndexes = [];
  const anchorCandidates = [];
  const blockCandidates = selectSourceBlockCandidates({
    sourceBlocks: sourceContextUsage.sourceBlocks || [],
    paragraphs,
    anchorIndexes,
    question,
    point
  });

  paragraphs.forEach((paragraph, index) => {
    if (!sourceMatches(paragraph.text, point.sourceQuote)) return;
    anchorIndexes.push(index);
    const context = buildContextWindow(paragraphs, index, paragraph.text, point.sourceQuote, question, point);
    if (!context) return;
    anchorCandidates.push(context);
  });

  const rankedAnchors = rankSourceContextCandidates(anchorCandidates, sourceContextUsage);
  const rankedBlocks = rankSourceContextCandidates(blockCandidates, sourceContextUsage);
  const bestBlock = rankedBlocks[0] || null;
  const bestAnchor = rankedAnchors[0] || null;
  const fallback = selectFallbackSourceContext({ paragraphs, anchorIndexes, question, point });
  const rankedFallback = rankSourceContextCandidates([fallback].filter(Boolean), sourceContextUsage)[0] || null;
  if (bestBlock && shouldPreferBlockContext(bestBlock, bestAnchor, rankedFallback)) {
    return finalizeSourceContextCandidate(bestBlock, rankedBlocks.length + rankedAnchors.length + (rankedFallback ? 1 : 0), sourceContextUsage);
  }
  if (bestAnchor && shouldPreferAnchorContext(bestAnchor, rankedFallback)) {
    return finalizeSourceContextCandidate(bestAnchor, rankedAnchors.length + rankedBlocks.length + (rankedFallback ? 1 : 0), sourceContextUsage);
  }

  const candidates = [bestBlock, rankedFallback, bestAnchor].filter(Boolean);
  candidates.sort((a, b) => b.score - a.score || scoreLength(b.text) - scoreLength(a.text));
  return candidates[0] ? finalizeSourceContextCandidate(candidates[0], candidates.length, sourceContextUsage) : null;
}

function shouldPreferBlockContext(block, anchor, fallback) {
  if (!block) return false;
  const blockPrecision = block.selection?.sourcePrecisionScore || 0;
  const blockMinimality = block.selection?.sourceMinimalityScore || 0;
  const blockRelevance = block.selection?.relevanceScore || 0;
  const bestOtherPrecision = Math.max(anchor?.selection?.sourcePrecisionScore || 0, fallback?.selection?.sourcePrecisionScore || 0);
  const bestOtherRelevance = Math.max(anchor?.selection?.relevanceScore || 0, fallback?.selection?.relevanceScore || 0);
  if (blockPrecision >= bestOtherPrecision && blockMinimality >= 4 && blockRelevance >= bestOtherRelevance - 2) return true;
  return blockPrecision >= 4 && blockMinimality >= 4 && blockRelevance >= 8;
}

function shouldPreferAnchorContext(anchor, fallback) {
  if (!fallback) return true;
  const anchorRelevance = anchor.selection?.relevanceScore || 0;
  const fallbackRelevance = fallback.selection?.relevanceScore || 0;
  const anchorPrecision = anchor.selection?.sourcePrecisionScore || 0;
  const fallbackPrecision = fallback.selection?.sourcePrecisionScore || 0;
  return fallbackPrecision <= anchorPrecision && fallbackRelevance <= anchorRelevance + 2;
}

function rankSourceContextCandidates(candidates, sourceContextUsage) {
  return candidates
    .filter(Boolean)
    .map((candidate) => applySourceContextRanking(candidate, sourceContextUsage))
    .sort((a, b) => b.score - a.score || scoreLength(b.text) - scoreLength(a.text));
}

function applySourceContextRanking(candidate, sourceContextUsage) {
  const paragraphKey = sourceContextUsageKey(candidate);
  const reuseCount = Number.isFinite(paragraphKey) ? (sourceContextUsage.paragraphCounts.get(paragraphKey) || 0) : 0;
  const blockReuseCount = candidate.selection?.sourceBlockId
    ? (sourceContextUsage.blockCounts.get(candidate.selection.sourceBlockId) || 0)
    : 0;
  const pointKey = candidate.point?.id || candidate.question?.knowledgePointId || "";
  const pointBlockKey = pointKey && candidate.selection?.sourceBlockId ? `${pointKey}:${candidate.selection.sourceBlockId}` : "";
  const pointBlockReuseCount = pointBlockKey ? (sourceContextUsage.pointBlockCounts.get(pointBlockKey) || 0) : 0;
  const pointRoleKey = pointKey && candidate.selection?.sourceEvidenceRole ? `${pointKey}:${candidate.selection.sourceEvidenceRole}` : "";
  const pointRoleReuseCount = pointRoleKey ? (sourceContextUsage.pointRoleCounts.get(pointRoleKey) || 0) : 0;
  const sourceOverlap = sourceOverlapSummary(candidate.text, sourceContextUsage);
  const specificityScore = scoreSourceSpecificity(candidate.text, candidate.selection?.relevanceScore || 0);
  const sourceMinimalityScore = scoreSourceMinimality(candidate.text, candidate.selection?.relevanceScore || 0, sourceOverlap.ratio);
  const sourceEvidenceRole = candidate.selection?.sourceEvidenceRole || inferSourceEvidenceRole(candidate.text, candidate.question, candidate.point);
  const sourceEvidenceDiversityScore = scoreSourceEvidenceDiversity({
    sourceBlockId: candidate.selection?.sourceBlockId,
    sourceEvidenceRole,
    blockReuseCount,
    pointBlockReuseCount,
    pointRoleReuseCount,
    sourceOverlapRatio: sourceOverlap.ratio
  });
  const sourcePrecisionScore = scoreSourcePrecision({
    text: candidate.text,
    relevanceScore: candidate.selection?.relevanceScore || 0,
    anchorMatched: candidate.selection?.anchorMatched,
    fallback: candidate.selection?.fallback,
    reuseCount,
    specificityScore,
    sourceMinimalityScore,
    sourceOverlapRatio: sourceOverlap.ratio,
    sourceEvidenceDiversityScore
  });
  const reusePenalty = reuseCount * 16
    + blockReuseCount * 24
    + pointBlockReuseCount * 38
    + pointRoleReuseCount * 14
    + Math.round(sourceOverlap.ratio * 36);
  return {
    ...candidate,
    score: candidate.score
      + specificityScore * 7
      + sourcePrecisionScore * 8
      + sourceMinimalityScore * 10
      + sourceEvidenceDiversityScore * 8
      - reusePenalty,
    selection: {
      ...candidate.selection,
      originalScore: candidate.score,
      specificityScore,
      sourcePrecisionScore,
      sourceMinimalityScore,
      sourceEvidenceRole,
      sourceEvidenceDiversityScore,
      sourceOverlapRatio: sourceOverlap.ratio,
      sourceOverlapGroupId: sourceOverlap.groupId,
      reuseCount,
      blockReuseCount,
      pointBlockReuseCount,
      pointRoleReuseCount,
      sourceReuseReason: sourceReuseReasonForCandidate({
        sourceBlockId: candidate.selection?.sourceBlockId,
        blockReuseCount,
        pointBlockReuseCount,
        pointRoleReuseCount,
        sourceOverlapRatio: sourceOverlap.ratio
      }),
      reusePenalty
    }
  };
}

function finalizeSourceContextCandidate(candidate, candidateCount, sourceContextUsage) {
  const paragraphKey = sourceContextUsageKey(candidate);
  const sameParagraphReuseCount = Number.isFinite(paragraphKey) ? (sourceContextUsage.paragraphCounts.get(paragraphKey) || 0) : 0;
  return {
    ...candidate,
    selection: {
      ...candidate.selection,
      candidateCount,
      sameParagraphReuseCount
    }
  };
}

function sourceContextUsageKey(candidate) {
  const paragraphIndex = candidate?.selection?.paragraphIndex;
  return Number.isFinite(Number(paragraphIndex)) ? Number(paragraphIndex) : NaN;
}

function recordSourceContextUsage(sourceContext, sourceContextUsage) {
  const key = sourceContextUsageKey(sourceContext);
  if (Number.isFinite(key)) {
    sourceContextUsage.paragraphCounts.set(key, (sourceContextUsage.paragraphCounts.get(key) || 0) + 1);
  }
  const blockId = sourceContext.selection?.sourceBlockId || "";
  if (blockId) {
    sourceContextUsage.blockCounts.set(blockId, (sourceContextUsage.blockCounts.get(blockId) || 0) + 1);
  }
  const pointKey = sourceContext.point?.id || sourceContext.question?.knowledgePointId || "";
  if (pointKey && blockId) {
    const pointBlockKey = `${pointKey}:${blockId}`;
    sourceContextUsage.pointBlockCounts.set(pointBlockKey, (sourceContextUsage.pointBlockCounts.get(pointBlockKey) || 0) + 1);
  }
  const role = sourceContext.selection?.sourceEvidenceRole || "";
  if (pointKey && role) {
    const pointRoleKey = `${pointKey}:${role}`;
    sourceContextUsage.pointRoleCounts.set(pointRoleKey, (sourceContextUsage.pointRoleCounts.get(pointRoleKey) || 0) + 1);
  }
  sourceContextUsage.snippets.push({
    groupId: sourceContext.selection?.sourceOverlapGroupId || `source-${sourceContextUsage.snippets.length + 1}`,
    text: sourceContext.text,
    questionId: sourceContext.question?.id || ""
  });
}

function createSourceContextUsage(cleanedText = "") {
  const paragraphs = splitParagraphs(cleanedText);
  return {
    paragraphCounts: new Map(),
    blockCounts: new Map(),
    pointBlockCounts: new Map(),
    pointRoleCounts: new Map(),
    snippets: [],
    sourceBlocks: buildSourceBlocks(paragraphs)
  };
}

function splitParagraphs(text) {
  return String(text || "")
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => ({ index, text: paragraph, sentences: splitSentences(paragraph) }));
}

function splitSentences(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const matches = normalized.match(/[^。！？!?；;\n]+[。！？!?；;]?/g) || [normalized];
  return matches.map((sentence) => sentence.trim()).filter(Boolean);
}

export function buildSourceBlocks(paragraphs = []) {
  if (!Array.isArray(paragraphs)) {
    return buildSourceBlocks(splitParagraphs(paragraphs));
  }
  const blocks = [];
  let sectionTitle = "";
  paragraphs.forEach((paragraph) => {
    if (isLikelySectionHeading(paragraph.text)) {
      sectionTitle = paragraph.text;
      blocks.push(sourceBlock({
        paragraph,
        sectionTitle,
        sentenceStart: 0,
        sentenceEnd: Math.max(0, (paragraph.sentences || []).length - 1),
        text: paragraph.text,
        type: "section_heading"
      }));
      return;
    }
    const sentences = paragraph.sentences || [];
    if (!sentences.length) return;
    if (paragraph.text.length <= 180 || sentences.length === 1) {
      blocks.push(sourceBlock({
        paragraph,
        sectionTitle,
        sentenceStart: 0,
        sentenceEnd: sentences.length - 1,
        text: paragraph.text,
        type: "paragraph"
      }));
      return;
    }
    sentences.forEach((sentence, index) => {
      const text = buildSentenceWindowBlockText(sentences, index);
      blocks.push(sourceBlock({
        paragraph,
        sectionTitle,
        sentenceStart: Math.max(0, index - (sentence.length < 36 ? 1 : 0)),
        sentenceEnd: Math.min(sentences.length - 1, index + (sentence.length < 70 ? 1 : 0)),
        text,
        type: "sentence_window"
      }));
    });
  });
  return dedupeSourceBlocks(blocks);
}

function sourceBlock({ paragraph, sectionTitle, sentenceStart, sentenceEnd, text, type }) {
  const blockId = `p${paragraph.index}-s${sentenceStart}-${sentenceEnd}`;
  return {
    blockId,
    sectionTitle,
    paragraphIndex: paragraph.index,
    sentenceStart,
    sentenceEnd,
    text: String(text || "").trim(),
    blockType: type,
    evidenceRole: inferBlockEvidenceRole(text, sectionTitle)
  };
}

function buildSentenceWindowBlockText(sentences, index) {
  const selected = new Set([index]);
  const sentence = sentences[index] || "";
  if (sentence.length < 36 && index > 0) selected.add(index - 1);
  if (sentence.length < 70 && index + 1 < sentences.length) selected.add(index + 1);
  return [...selected].sort((a, b) => a - b).map((item) => sentences[item]).join("");
}

function dedupeSourceBlocks(blocks) {
  const seen = new Set();
  return blocks.filter((block) => {
    const key = normalize(block.text);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isLikelySectionHeading(text) {
  const source = String(text || "").trim();
  if (!source || source.length > 32) return false;
  if (/[。！？!?；;]/.test(source)) return false;
  return /hook|prompt|claude|ci|vibe|什么时候|为什么|区别|场景|信号|边界|写在最后|总结|首先|其次|最后|核心|方法|定义/i.test(source);
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
  const sentences = paragraphs[paragraphIndex].sentences;
  const anchorIndex = findSourceQuoteAnchorIndex(sentences, sourceQuote);
  if (sentences.length > 1 && anchorIndex !== -1) {
    const minimal = expandSentenceWindow(sentences, anchorIndex, question, point, { minLength: 40, maxLength: 260 });
    return scoreContext(minimal, sourceQuote, question, point, {
      method: "source_quote_anchor_minimal",
      paragraphIndex
    });
  }

  if (anchorIndex === -1) {
    return scoreContext(cropAtSentenceBoundary(paragraphText, sourceQuote), sourceQuote, question, point, {
      method: "source_quote_anchor_cropped",
      paragraphIndex
    });
  }

  if (paragraphText.length >= 150 && paragraphText.length <= 500) {
    const evidence = cropAtEvidenceWindow(paragraphText, sourceQuote, question, point);
    return scoreContext(evidence || paragraphText, sourceQuote, question, point, {
      method: "source_quote_anchor",
      paragraphIndex
    });
  }

  if (paragraphText.length < 150) {
    const expanded = buildNearbyParagraphContext(paragraphs, paragraphIndex, sourceQuote);
    return scoreContext(expanded || paragraphText, sourceQuote, question, point, {
      method: "source_quote_anchor_expanded",
      paragraphIndex
    });
  }
  const window = expandSentenceWindow(sentences, anchorIndex, question, point, { minLength: 40, maxLength: 260 });
  return scoreContext(window, sourceQuote, question, point, {
    method: "source_quote_anchor_sentence_window",
    paragraphIndex
  });
}

function findSourceQuoteAnchorIndex(sentences, sourceQuote) {
  const exactIndex = sentences.findIndex((sentence) => sourceMatches(sentence, sourceQuote));
  if (exactIndex !== -1) return exactIndex;
  const quoteKeywords = extractSupportKeywords([sourceQuote], { minChineseLength: 2, minLatinLength: 3, limit: 32 });
  let best = { index: -1, score: 0 };
  sentences.forEach((sentence, index) => {
    const score = sentenceRelevance(sentence, quoteKeywords);
    if (score > best.score) best = { index, score };
  });
  return best.score >= 3 ? best.index : -1;
}

function selectFallbackSourceContext({ paragraphs, anchorIndexes, question, point }) {
  const sourceQuoteFound = anchorIndexes.length > 0;
  const indexes = sourceQuoteFound
    ? sameSectionParagraphIndexes(paragraphs, anchorIndexes[0])
    : paragraphs.map((paragraph) => paragraph.index);
  const candidates = indexes
    .map((index) => buildRelevanceParagraphContext(paragraphs, index, question, point))
    .filter(Boolean)
    .map(({ text, paragraphIndex }) => scoreContext(text, point.sourceQuote, question, point, {
      requireSourceQuote: false,
      method: sourceQuoteFound ? "same_section_relevance" : "keyword_relevance_fallback",
      paragraphIndex,
      fallback: true,
      fallbackReason: sourceQuoteFound ? "anchor_context_weak" : "source_quote_not_found"
    }))
    .filter(Boolean);
  candidates.sort((a, b) => b.score - a.score || scoreLength(b.text) - scoreLength(a.text));
  return candidates[0] || null;
}

function selectSourceBlockCandidates({ sourceBlocks = [], paragraphs = [], anchorIndexes = [], question, point }) {
  if (!sourceBlocks.length) return [];
  const preferredRoles = preferredEvidenceRolesForQuestion(question, point);
  const keywords = extractKeywords(question, point);
  const sourceQuoteFound = anchorIndexes.length > 0;
  const sectionIndexes = sourceQuoteFound ? new Set(sameSectionParagraphIndexes(paragraphs, anchorIndexes[0])) : null;
  const candidates = [];

  for (const block of sourceBlocks) {
    if (sectionIndexes && !sectionIndexes.has(block.paragraphIndex) && !sourceMatches(block.text, point.sourceQuote)) {
      continue;
    }
    const anchorMatched = sourceMatches(block.text, point.sourceQuote);
    const relevance = sentenceRelevance(block.text, keywords);
    const roleMatched = preferredRoles.includes(block.evidenceRole);
    if (!anchorMatched && relevance <= 1 && !roleMatched) continue;
    const context = scoreContext(block.text, point.sourceQuote, question, point, {
      requireSourceQuote: false,
      method: anchorMatched ? "source_block_anchor" : "source_block_relevance",
      paragraphIndex: block.paragraphIndex,
      fallback: !anchorMatched,
      fallbackReason: anchorMatched ? "" : "source_block_keyword_match",
      sourceBlockId: block.blockId,
      sourceBlockType: block.blockType,
      sourceBlockSectionTitle: block.sectionTitle,
      sourceBlockSentenceStart: block.sentenceStart,
      sourceBlockSentenceEnd: block.sentenceEnd,
      sourceEvidenceRole: block.evidenceRole,
      roleMatched
    });
    if (!context) continue;
    candidates.push({
      ...context,
      score: context.score + (roleMatched ? 24 : 0) + (anchorMatched ? 16 : 0) + relevance * 3,
      selection: {
        ...context.selection,
        relevanceScore: Math.max(context.selection.relevanceScore || 0, relevance),
        sourceBlockId: block.blockId,
        sourceBlockType: block.blockType,
        contextSectionTitle: block.sectionTitle,
        sourceBlockSentenceStart: block.sentenceStart,
        sourceBlockSentenceEnd: block.sentenceEnd,
        sourceEvidenceRole: block.evidenceRole,
        preferredEvidenceRoles: preferredRoles,
        roleMatched
      }
    });
  }

  candidates.sort((a, b) => b.score - a.score || scoreLength(b.text) - scoreLength(a.text));
  return candidates.slice(0, 12);
}

function preferredEvidenceRolesForQuestion(question, point) {
  const source = normalize([
    question?.stem,
    question?.correctUnderstanding,
    question?.commonMisconception,
    question?.memoryAngle,
    point?.title,
    point?.structureRole,
    point?.questionAngles?.join(" ")
  ].filter(Boolean).join(" "));
  if (/例子|比如|例如|posttooluse|formatter|场景|如果|当|应用|迁移/.test(source)) return ["example", "method", "boundary"];
  if (/区别|对比|不是|而是|相比|prompt|提示词|分工/.test(source)) return ["contrast", "boundary", "mechanism"];
  if (/生命周期|节点|触发|机制|执行|handler|decision|json|控制器/.test(source)) return ["mechanism", "definition"];
  if (/边界|不要|不能|风险|拦截|权限|错误|误区/.test(source)) return ["boundary", "contrast"];
  if (/怎么|步骤|方法|法则|信号|适合|判断|什么时候/.test(source)) return ["method", "example"];
  return ["definition", "mechanism"];
}

function sameSectionParagraphIndexes(paragraphs, anchorIndex) {
  const start = Math.max(0, anchorIndex - 2);
  const end = Math.min(paragraphs.length - 1, anchorIndex + 4);
  const indexes = [];
  for (let index = start; index <= end; index += 1) {
    indexes.push(index);
  }
  return indexes;
}

function buildRelevanceParagraphContext(paragraphs, paragraphIndex, question, point) {
  const paragraph = paragraphs[paragraphIndex];
  if (!paragraph) return null;
  const keywords = extractKeywords(question, point);
  const sentenceContext = buildRelevanceSentenceContext(paragraph, keywords);
  if (sentenceContext) {
    return {
      paragraphIndex,
      text: sentenceContext
    };
  }
  const selected = new Set([paragraphIndex]);
  let text = paragraph.text;
  let left = paragraphIndex - 1;
  let right = paragraphIndex + 1;

  while (text.length < 150 && (left >= 0 || right < paragraphs.length)) {
    const leftScore = left >= 0 ? sentenceRelevance(paragraphs[left].text, keywords) : -1;
    const rightScore = right < paragraphs.length ? sentenceRelevance(paragraphs[right].text, keywords) : -1;
    const nextIndex = rightScore > leftScore ? right++ : left--;
    const nextText = paragraphWindowText(paragraphs, new Set([...selected, nextIndex]));
    if (nextText.length > 500) break;
    selected.add(nextIndex);
    text = nextText;
  }

  while (left >= 0 || right < paragraphs.length) {
    const leftScore = left >= 0 ? sentenceRelevance(paragraphs[left].text, keywords) : -1;
    const rightScore = right < paragraphs.length ? sentenceRelevance(paragraphs[right].text, keywords) : -1;
    if (Math.max(leftScore, rightScore) <= 1) break;
    const nextIndex = rightScore > leftScore ? right++ : left--;
    const nextText = paragraphWindowText(paragraphs, new Set([...selected, nextIndex]));
    if (nextText.length > 500) break;
    selected.add(nextIndex);
    text = nextText;
  }

  const minimalText = text.length > 360 ? cropByKeywords(text, keywords, { minLength: 60, maxLength: 280 }) : text;
  return {
    paragraphIndex,
    text: minimalText || text
  };
}

function cropAtEvidenceWindow(text, sourceQuote, question, point) {
  const sentences = splitSentences(text);
  const anchorIndex = findSourceQuoteAnchorIndex(sentences, sourceQuote);
  if (sentences.length > 1 && anchorIndex !== -1) {
    return expandSentenceWindow(sentences, anchorIndex, question, point, { minLength: 40, maxLength: 260 });
  }
  const directIndex = findApproximateTextIndex(text, sourceQuote);
  if (directIndex !== -1) return cropAroundCharacterIndex(text, directIndex, String(sourceQuote || "").length, 280);
  return cropByKeywords(text, extractKeywords(question, point), { minLength: 60, maxLength: 280 });
}

function cropByKeywords(text, keywords, options = {}) {
  const sentences = splitSentences(text);
  if (sentences.length > 1) {
    const ranked = sentences
      .map((sentence, index) => ({ index, sentence, score: sentenceRelevance(sentence, keywords) }))
      .sort((a, b) => b.score - a.score || b.sentence.length - a.sentence.length);
    const best = ranked[0];
    if (best?.score > 0) {
      return expandSentenceWindow(sentences, best.index, { stem: "", correctUnderstanding: "", commonMisconception: "" }, {}, {
        keywords,
        minLength: options.minLength || 60,
        maxLength: options.maxLength || 280
      });
    }
  }
  const normalizedText = normalize(text);
  const hit = (keywords || []).find((keyword) => keyword && normalizedText.includes(keyword));
  if (hit) {
    const index = Math.max(0, normalizedText.indexOf(hit));
    return cropAroundCharacterIndex(text, index, hit.length, options.maxLength || 280);
  }
  return String(text || "").slice(0, options.maxLength || 280).trim();
}

function findApproximateTextIndex(text, needle) {
  const source = String(text || "");
  const quote = String(needle || "").trim();
  if (!source || !quote) return -1;
  const direct = source.indexOf(quote);
  if (direct !== -1) return direct;
  const prefix = quote.slice(0, Math.min(24, quote.length));
  const prefixIndex = source.indexOf(prefix);
  if (prefixIndex !== -1) return prefixIndex;
  const suffix = quote.slice(-Math.min(24, quote.length));
  return source.indexOf(suffix);
}

function cropAroundCharacterIndex(text, index, hitLength, maxLength = 280) {
  const source = String(text || "");
  if (source.length <= maxLength) return source.trim();
  const center = Math.max(0, index + Math.floor((hitLength || 0) / 2));
  let start = Math.max(0, center - Math.floor(maxLength / 2));
  let end = Math.min(source.length, start + maxLength);
  start = Math.max(0, end - maxLength);
  const beforeBoundary = source.slice(0, start).search(/[。！？!?；;]\s*[^。！？!?；;]*$/);
  if (beforeBoundary !== -1 && start - beforeBoundary < 80) {
    start = beforeBoundary + 1;
  }
  const after = source.slice(end);
  const afterBoundary = after.search(/[。！？!?；;]/);
  if (afterBoundary !== -1 && afterBoundary < 80) {
    end += afterBoundary + 1;
  }
  const cropped = source.slice(start, end).replace(/^[，。！？；：、,.!?;:\s]+/, "").trim();
  return cropped || source.slice(Math.max(0, index - 40), Math.min(source.length, index + hitLength + 160)).trim();
}

function paragraphWindowText(paragraphs, selected) {
  return [...selected]
    .sort((a, b) => a - b)
    .map((index) => paragraphs[index]?.text || "")
    .filter(Boolean)
    .join("\n\n");
}

function buildRelevanceSentenceContext(paragraph, keywords) {
  const sentences = paragraph.sentences || [];
  if (!sentences.length) return "";
  const ranked = sentences
    .map((sentence, index) => ({ index, sentence, score: sentenceRelevance(sentence, keywords) }))
    .sort((a, b) => b.score - a.score || b.sentence.length - a.sentence.length);
  const best = ranked[0];
  if (!best || best.score <= 1) return "";
  return expandSentenceWindow(sentences, best.index, { stem: "", correctUnderstanding: "", commonMisconception: "" }, {}, {
    keywords,
    minLength: 40,
    maxLength: 260
  });
}

function expandSentenceWindow(sentences, anchorIndex, question, point, options = {}) {
  const selected = new Set([anchorIndex]);
  let left = anchorIndex - 1;
  let right = anchorIndex + 1;
  let text = sentences[anchorIndex] || "";
  const keywords = options.keywords || extractKeywords(question, point);
  const minLength = options.minLength || 150;
  const maxLength = options.maxLength || 500;

  while (text.length < minLength && (left >= 0 || right < sentences.length)) {
    const leftScore = left >= 0 ? sentenceRelevance(sentences[left], keywords) : -1;
    const rightScore = right < sentences.length ? sentenceRelevance(sentences[right], keywords) : -1;
    const nextIndex = rightScore > leftScore ? right++ : left--;
    selected.add(nextIndex);
    text = [...selected].sort((a, b) => a - b).map((index) => sentences[index]).join("");
    if (text.length > maxLength) {
      selected.delete(nextIndex);
      break;
    }
  }

  while (options.expandRelevantAfterMin && (left >= 0 || right < sentences.length)) {
    const leftSentence = left >= 0 ? sentences[left] : "";
    const rightSentence = right < sentences.length ? sentences[right] : "";
    const leftScore = sentenceRelevance(leftSentence, keywords);
    const rightScore = sentenceRelevance(rightSentence, keywords);
    if (Math.max(leftScore, rightScore) <= 0) break;
    const nextIndex = rightScore > leftScore ? right++ : left--;
    const nextText = [...selected, nextIndex].sort((a, b) => a - b).map((index) => sentences[index]).join("");
    if (nextText.length > maxLength) break;
    selected.add(nextIndex);
    text = nextText;
  }

  return text || sentences[anchorIndex] || "";
}

function buildNearbyParagraphContext(paragraphs, paragraphIndex, sourceQuote) {
  const groups = [
    (paragraphs[paragraphIndex - 1]?.sentences || []).slice(-2),
    paragraphs[paragraphIndex].sentences,
    (paragraphs[paragraphIndex + 1]?.sentences || []).slice(0, 2)
  ].map((sentences) => sentences.filter(Boolean));
  const expanded = trimParagraphGroupsToLimit(groups, sourceQuote);
  if (expanded) return expanded;

  const nearby = groups.flat();
  return trimSentencesToLimit(nearby, sourceQuote);
}

function trimParagraphGroupsToLimit(groups, sourceQuote) {
  const groupTexts = groups.map((sentences) => sentences.join("")).filter(Boolean);
  if (!groupTexts.length) return "";
  const anchorIndex = groupTexts.findIndex((text) => sourceMatches(text, sourceQuote));
  if (anchorIndex === -1) return "";

  const selected = new Set([anchorIndex]);
  let left = anchorIndex - 1;
  let right = anchorIndex + 1;
  let text = joinParagraphGroups(groupTexts, selected);

  while (text.length < 150 && (left >= 0 || right < groupTexts.length)) {
    const nextIndex = right < groupTexts.length ? right++ : left--;
    const nextSelected = new Set([...selected, nextIndex]);
    const nextText = joinParagraphGroups(groupTexts, nextSelected);
    if (nextText.length > 500) break;
    selected.add(nextIndex);
    text = nextText;
  }

  while (text.length < 150 && left >= 0) {
    const nextSelected = new Set([...selected, left]);
    const nextText = joinParagraphGroups(groupTexts, nextSelected);
    if (nextText.length > 500) break;
    selected.add(left);
    left -= 1;
    text = nextText;
  }

  return text;
}

function joinParagraphGroups(groupTexts, selected) {
  return [...selected]
    .sort((a, b) => a - b)
    .map((index) => groupTexts[index])
    .filter(Boolean)
    .join("\n\n");
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

function scoreContext(text, sourceQuote, question, point, options = {}) {
  const trimmed = String(text || "").trim();
  const anchorMatched = Boolean(sourceQuote && sourceMatches(trimmed, sourceQuote));
  const requireSourceQuote = options.requireSourceQuote !== false;
  if (!trimmed || (requireSourceQuote && !anchorMatched)) return null;
  const support = scoreQuestionContextSupport(trimmed, question, point);
  if (!support.supported) return null;
  const relevance = support.score;
  const score = (anchorMatched ? 100 : 80) + relevance * 5 + scoreLength(trimmed);
  return {
    text: trimmed,
    question,
    point,
    score,
    selection: {
      method: options.method || "source_quote_anchor",
      paragraphIndex: Number.isFinite(options.paragraphIndex) ? options.paragraphIndex : null,
      sourceBlockId: options.sourceBlockId || "",
      sourceBlockType: options.sourceBlockType || "",
      contextSectionTitle: options.sourceBlockSectionTitle || "",
      sourceBlockSentenceStart: Number.isFinite(options.sourceBlockSentenceStart) ? options.sourceBlockSentenceStart : null,
      sourceBlockSentenceEnd: Number.isFinite(options.sourceBlockSentenceEnd) ? options.sourceBlockSentenceEnd : null,
      sourceEvidenceRole: options.sourceEvidenceRole || "",
      preferredEvidenceRoles: options.preferredEvidenceRoles || [],
      roleMatched: Boolean(options.roleMatched),
      score,
      relevanceScore: relevance,
      anchorMatched,
      fallback: Boolean(options.fallback),
      fallbackReason: options.fallbackReason || ""
    }
  };
}

function scoreLength(text) {
  const length = String(text || "").length;
  if (length >= 150 && length <= 500) return 20;
  if (length >= 80 && length < 150) return 10;
  if (length > 500) return 4;
  return 0;
}

function scoreSourceSpecificity(text, relevanceScore = 0) {
  const length = String(text || "").length;
  let score = 3;
  if (relevanceScore >= 18) score += 2;
  else if (relevanceScore >= 9) score += 1;
  else if (relevanceScore <= 2) score -= 1;
  if (length > 420) score -= 1;
  if (length < 90) score -= 1;
  return clamp(score);
}

function scoreSourcePrecision({
  text,
  relevanceScore = 0,
  anchorMatched = false,
  fallback = false,
  reuseCount = 0,
  specificityScore = 3,
  sourceMinimalityScore = 3,
  sourceOverlapRatio = 0,
  sourceEvidenceDiversityScore = 3
}) {
  const length = String(text || "").length;
  let score = specificityScore;
  if (anchorMatched) score += 1;
  if (fallback && relevanceScore < 6) score -= 1;
  if (reuseCount >= 2) score -= 1;
  if (reuseCount >= 4) score -= 1;
  if (sourceOverlapRatio >= 0.7) score -= 1;
  if (length > 500) score -= 2;
  else if (length > 420) score -= 1;
  if (sourceMinimalityScore >= 4) score += 1;
  if (sourceMinimalityScore <= 2) score -= 1;
  if (sourceEvidenceDiversityScore >= 4) score += 1;
  if (sourceEvidenceDiversityScore <= 2) score -= 1;
  if (length >= 120 && length <= 360 && relevanceScore >= 6) score += 1;
  return clamp(score);
}

function scoreSourceEvidenceDiversity({
  sourceBlockId,
  sourceEvidenceRole,
  blockReuseCount = 0,
  pointBlockReuseCount = 0,
  pointRoleReuseCount = 0,
  sourceOverlapRatio = 0
}) {
  let score = sourceBlockId ? 4 : 3;
  if (sourceEvidenceRole && sourceEvidenceRole !== "general") score += 1;
  if (blockReuseCount >= 1) score -= 1;
  if (pointBlockReuseCount >= 1) score -= 2;
  if (pointRoleReuseCount >= 2) score -= 1;
  if (sourceOverlapRatio >= 0.7) score -= 1;
  return clamp(score);
}

function sourceReuseReasonForCandidate({
  sourceBlockId,
  blockReuseCount = 0,
  pointBlockReuseCount = 0,
  pointRoleReuseCount = 0,
  sourceOverlapRatio = 0
}) {
  if (!sourceBlockId) return "";
  if (pointBlockReuseCount >= 1) return "same_knowledge_point_reused_source_block";
  if (sourceOverlapRatio >= 0.7) return "source_text_overlap_above_threshold";
  if (blockReuseCount >= 2) return "source_block_reused_across_questions";
  if (pointRoleReuseCount >= 2) return "same_knowledge_point_reused_evidence_role";
  return "";
}

function scoreSourceMinimality(text, relevanceScore = 0, overlapRatio = 0) {
  const length = String(text || "").length;
  let score = 3;
  if (length >= 60 && length <= 260) score += 2;
  else if (length > 500) score -= 2;
  else if (length > 360) score -= 1;
  else if (length < 40) score -= 1;
  if (relevanceScore >= 10) score += 1;
  if (overlapRatio >= 0.7) score -= 1;
  return clamp(score);
}

function sourceOverlapSummary(text, sourceContextUsage) {
  const current = compactOverlapText(text);
  if (!current || !sourceContextUsage?.snippets?.length) {
    return { ratio: 0, groupId: "" };
  }
  let best = { ratio: 0, groupId: "" };
  for (const item of sourceContextUsage.snippets) {
    const ratio = overlapRatio(current, compactOverlapText(item.text));
    if (ratio > best.ratio) {
      best = {
        ratio: Math.round(ratio * 100) / 100,
        groupId: item.groupId || item.questionId || ""
      };
    }
  }
  return {
    ratio: best.ratio,
    groupId: best.ratio >= 0.7 ? best.groupId : ""
  };
}

function compactOverlapText(text) {
  return normalize(text).slice(0, 900);
}

export function inferSourceEvidenceRole(text, question, point) {
  const source = normalize([
    text,
    question?.stem,
    question?.correctUnderstanding,
    question?.memoryAngle,
    point?.title,
    point?.structureRole
  ].filter(Boolean).join(" "));
  if (/例子|比如|例如|posttooluse|formatter|场景|如果|当/.test(source)) return "example";
  if (/区别|对比|不是|而是|相比|prompt|提示词/.test(source)) return "contrast";
  if (/生命周期|节点|触发|机制|执行|handler|decision|json/.test(source)) return "mechanism";
  if (/边界|不要|不能|风险|拦截|权限|错误/.test(source)) return "boundary";
  if (/怎么|步骤|方法|法则|信号|适合|判断/.test(source)) return "method";
  return "definition";
}

function inferBlockEvidenceRole(text, sectionTitle = "") {
  const source = normalize([sectionTitle, text].filter(Boolean).join(" "));
  if (/例子|比如|例如|posttooluse|formatter|客户|团队|场景|如果|当/.test(source)) return "example";
  if (/区别|对比|不是|而是|相比|prompt|提示词|分工/.test(source)) return "contrast";
  if (/生命周期|节点|触发|机制|执行|handler|decision|json|控制器/.test(source)) return "mechanism";
  if (/边界|不要|不能|风险|拦截|权限|错误|不可接受|最低限度/.test(source)) return "boundary";
  if (/怎么|步骤|方法|法则|信号|适合|判断|什么时候|需要/.test(source)) return "method";
  if (/是什么|本质|定义|可以理解成|一句话/.test(source)) return "definition";
  return "general";
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

function scoreQuestionContextSupport(text, question, point) {
  const body = normalize(text);
  const requiredPhrases = extractSupportPhrases([
    question?.correctUnderstanding,
    correctOptionText(question)
  ]);
  const strongKeywords = extractSupportKeywords([
    question?.correctUnderstanding,
    correctOptionText(question)
  ], { minChineseLength: 2, minLatinLength: 3, limit: 40 });
  const weakKeywords = extractSupportKeywords([
    question?.stem,
    question?.commonMisconception,
    point?.keyClaim,
    point?.summary
  ], { minChineseLength: 2, minLatinLength: 3, limit: 60 });
  const phraseHits = countKeywordHits(body, requiredPhrases);
  const strongHits = countKeywordHits(body, strongKeywords);
  const weakHits = countKeywordHits(body, weakKeywords);

  return {
    supported: phraseHits >= 1 || strongHits >= 3 || (strongHits >= 2 && weakHits >= 2),
    score: phraseHits * 4 + strongHits * 2 + weakHits
  };
}

function buildTrustDiagnostics({
  question,
  point,
  scores,
  sourceValidation,
  typeValidation,
  qualityIssues,
  ruleAction,
  judge,
  pedagogy = {},
  reviewFriction = reviewFrictionDiagnostics(question)
}) {
  const answerGroundingScore = scoreTextGrounding(question.sourceSnippet, [
    correctOptionText(question),
    question.correctUnderstanding
  ], [
    question.stem,
    point?.keyClaim,
    point?.summary
  ]);
  const explanationFaithfulnessScore = scoreTextGrounding(question.sourceSnippet, [
    question.explanation,
    question.correctUnderstanding
  ], [
    correctOptionText(question),
    point?.keyClaim,
    point?.summary
  ]);
  const contextRelevanceScore = scoreContextRelevance(question, sourceValidation);
  const misconceptionSupportScore = scoreTextGrounding(question.sourceSnippet, [
    question.commonMisconception
  ], [
    question.stem,
    point?.keyClaim,
    point?.summary
  ]);
  const sourcePrecisionScore = clamp(Number(question.sourcePrecisionScore || question.sourceContextSelection?.sourcePrecisionScore || contextRelevanceScore || 1));
  const sourceCoverageScore = scoreSourceCoverage(question);
  const claimFidelityScore = scoreClaimFidelity(question, point);
  const confidenceReasons = [];
  const blockingReasons = [];
  const issueSet = new Set(qualityIssues || []);

  if (scores.sourceSupport < 4 || answerGroundingScore < 4) confidenceReasons.push("answer_grounding_weak");
  if (explanationFaithfulnessScore < 4) {
    confidenceReasons.push(explanationReason(question, explanationFaithfulnessScore));
  }
  if (contextRelevanceScore < 4 || sourcePrecisionScore < 4) confidenceReasons.push("weak_context_relevance");
  if (sourceCoverageScore < 4) confidenceReasons.push("source_coverage_incomplete");
  if (claimFidelityScore < 4) confidenceReasons.push("claim_overextended");
  if (misconceptionSupportScore < 3) confidenceReasons.push(misconceptionReason(question));
  const cognitiveActionFitScore = Number(pedagogy.cognitiveActionFitScore || 0);
  if (typeValidation && !typeValidation.valid && cognitiveActionFitScore > 0 && cognitiveActionFitScore < 3) {
    confidenceReasons.push("type_does_not_serve_cognitive_action");
  }
  for (const reason of pedagogy.pedagogyDiagnostics?.reasons || []) {
    confidenceReasons.push(reason);
  }
  if ((question.sourceSnippetWasBackfilled || question.sourceContextUnsupported) && sourcePrecisionScore < 4) confidenceReasons.push("source_context_backfilled");
  if (judge?.qualityAction === "rewrite" || ruleAction === "rewrite") confidenceReasons.push("judge_rewrite");
  if (scores.distractorQuality < 4) confidenceReasons.push(distractorReason(question));
  if (scores.answerUniqueness < 4) confidenceReasons.push("answer_not_unique");
  if (reviewFriction.reviewFrictionScore < 4) {
    confidenceReasons.push(...reviewFriction.reviewFrictionReasons);
  }

  if ([
    "missing_knowledge_point",
    "missing_source_snippet",
    "missing_options",
    "non_binary_question_requires_four_options",
    "true_false_requires_two_options"
  ].some((issue) => issueSet.has(issue))) {
    blockingReasons.push("structure_invalid");
  }
  if (scores.answerUniqueness < 4) blockingReasons.push("answer_not_unique");
  if (scores.sourceSupport <= 1 || issueSet.has("source_snippet_not_found") || issueSet.has("source_snippet_missing_source") || issueSet.has("source_snippet_unsupported_question_context")) {
    blockingReasons.push("weak_source_support");
  }
  if (answerGroundingScore <= 1 && !sourceValidation?.valid) blockingReasons.push("weak_source_support");

  const uniqueBlockingReasons = [...new Set(blockingReasons)];
  const primaryBlockingReason = uniqueBlockingReasons[0] || "";
  const uniqueConfidenceReasons = [...new Set(confidenceReasons)];
  const confidenceTier = confidenceTierForQuestion({
    blockingReasons: uniqueBlockingReasons,
    confidenceReasons: uniqueConfidenceReasons,
    sourcePrecisionScore,
    sourceCoverageScore,
    claimFidelityScore,
    answerGroundingScore,
    explanationFaithfulnessScore,
    scores,
    reviewFrictionScore: reviewFriction.reviewFrictionScore
  });

  return {
    trustDiagnostics: {
      answerGroundingScore,
      explanationFaithfulnessScore,
      contextRelevanceScore,
      misconceptionSupportScore,
      sourcePrecisionScore,
      sourceCoverageScore,
      claimFidelityScore,
      cognitiveActionFitScore: pedagogy.cognitiveActionFitScore ?? null,
      coreUnderstandingScore: pedagogy.coreUnderstandingScore ?? null,
      boundaryDiscriminationFitScore: pedagogy.boundaryDiscriminationFitScore ?? null,
      scenarioApplicationScore: pedagogy.scenarioApplicationScore ?? null,
      cognitiveActionIssue: pedagogy.cognitiveActionIssue || "",
      evidenceLearningValueScore: pedagogy.evidenceLearningValueScore ?? null,
      reviewFrictionScore: reviewFriction.reviewFrictionScore,
      visibleReadingLoad: reviewFriction.visibleReadingLoad,
      stemLength: reviewFriction.stemLength,
      maxOptionLength: reviewFriction.maxOptionLength,
      reviewFrictionReasons: reviewFriction.reviewFrictionReasons,
      pedagogyWarnings: pedagogy.pedagogyDiagnostics?.warnings || [],
      pedagogyReasons: pedagogy.pedagogyDiagnostics?.reasons || []
    },
    confidenceReasons: uniqueConfidenceReasons,
    blockingReasons: uniqueBlockingReasons,
    primaryBlockingReason,
    confidenceTier,
    repairHint: repairHintForReason(primaryBlockingReason, confidenceReasons),
    sourceCoverageScore,
    claimFidelityScore,
    reviewFrictionScore: reviewFriction.reviewFrictionScore,
    visibleReadingLoad: reviewFriction.visibleReadingLoad,
    stemLength: reviewFriction.stemLength,
    maxOptionLength: reviewFriction.maxOptionLength,
    reviewFrictionReasons: reviewFriction.reviewFrictionReasons
  };
}

function confidenceTierForQuestion({
  blockingReasons,
  confidenceReasons,
  sourcePrecisionScore,
  sourceCoverageScore,
  claimFidelityScore,
  answerGroundingScore,
  explanationFaithfulnessScore,
  scores,
  reviewFrictionScore
}) {
  if ((blockingReasons || []).length) return "should_block";
  if (!(confidenceReasons || []).length) return "high_confidence";
  if (
    sourcePrecisionScore <= 1
    || answerGroundingScore <= 1
    || (scores?.answerUniqueness || 0) < 4
  ) {
    return "should_block";
  }
  if (hasActionableRewriteReason(confidenceReasons, {
    sourceCoverageScore,
    claimFidelityScore,
    reviewFrictionScore
  })) {
    return "needs_rewrite";
  }
  return "review_warning";
}

function hasActionableRewriteReason(confidenceReasons = [], {
  sourceCoverageScore = 5,
  claimFidelityScore = 5,
  reviewFrictionScore = 5
} = {}) {
  const reasons = new Set(confidenceReasons || []);
  const reliabilityReasons = [
    "answer_grounding_weak",
    "explanation_overextends_source",
    "explanation_not_tied_to_answer",
    "judge_rewrite"
  ];
  if (reliabilityReasons.some((reason) => reasons.has(reason))) return true;
  if (reasons.has("source_coverage_incomplete") && Number(sourceCoverageScore || 0) <= 2) return true;
  if (reasons.has("claim_overextended") && Number(claimFidelityScore || 0) <= 3) return true;
  if (Number(reviewFrictionScore || 0) <= 3) return true;
  if (reasons.has("question_card_too_heavy")
    || reasons.has("stem_too_long")
    || reasons.has("scenario_background_too_long")
    || reasons.has("option_too_explanatory")) {
    return true;
  }
  if ([...reasons].some((reason) => String(reason).startsWith("distractors_"))) return true;
  return false;
}

function repairHintForReason(primaryBlockingReason, confidenceReasons = []) {
  if (primaryBlockingReason === "structure_invalid") return "修复题目结构、选项数量或正确答案字段";
  if (primaryBlockingReason === "answer_not_unique") return "重写选项，确保只有一个答案能被来源和正确理解同时支撑";
  if (primaryBlockingReason === "weak_source_support") return "重新选择能直接支撑正确答案的原文上下文";
  if (confidenceReasons.includes("weak_explanation_faithfulness")) return "收窄解释，只解释来源中能支撑的判断";
  if (confidenceReasons.includes("weak_context_relevance")) return "换用更贴近题干和正确答案的原文段落";
  if (confidenceReasons.includes("answer_grounding_weak")) return "保留为低置信，人工重点检查来源是否足够支撑答案";
  if (confidenceReasons.includes("explanation_overextends_source")) return "收窄解释，不要解释来源无法支持的延伸判断";
  if (confidenceReasons.includes("explanation_not_tied_to_answer")) return "把解释改成围绕正确答案和原文证据的因果关系";
  if (confidenceReasons.includes("misconception_too_generic")) return "把常见误区改成具体、可被选项体现的真实混淆";
  if (confidenceReasons.includes("misconception_not_grounded")) return "让常见误区来自题干、错误选项或原文边界，而不是泛泛补写";
  if (confidenceReasons.includes("type_does_not_serve_cognitive_action")) return "改题型或题干，让题目真正服务当前练习目标";
  if (confidenceReasons.includes("core_claim_too_literal")) return "把题目从原文字面识别改成核心主张回忆";
  if (confidenceReasons.includes("boundary_confusion_not_real")) return "补真实混淆对象，让题目能训练边界辨析";
  if (confidenceReasons.includes("scenario_is_restatement")) return "把题目改成需要在新场景中迁移判断，而不是复述原文";
  if (confidenceReasons.includes("core_recall_too_literal")) return "把题目从原文字面识别改成核心主张回忆";
  if (confidenceReasons.includes("boundary_not_teaching_real_confusion")) return "补真实混淆对象，让题目能训练边界辨析";
  if (confidenceReasons.includes("scenario_transfer_too_literal")) return "把题目改成需要在新场景中迁移判断，而不是复述原文";
  if (confidenceReasons.includes("weak_evidence_learning_value")) return "重新选择更像学习导航的最小充分证据";
  if (confidenceReasons.includes("source_coverage_incomplete")) return "补充覆盖全部关键概念的来源证据，或把题目收窄到当前来源能支撑的范围";
  if (confidenceReasons.includes("claim_overextended")) return "收窄题目主张，避免把原文局部判断扩张成更强因果或普遍规律";
  if (confidenceReasons.includes("question_card_too_heavy")) return "压缩题卡可见阅读负担，只保留做判断所需的题干变量和短选项";
  if (confidenceReasons.includes("scenario_background_too_long")) return "把场景压成一个角色、一个冲突或一个决策点，删除不参与判断的背景";
  if (confidenceReasons.includes("stem_too_long")) return "缩短题干，把背景和证据链移到解释页";
  if (confidenceReasons.includes("option_too_explanatory")) return "把选项改成短判断对象，不在选项里写解释段落";
  if (confidenceReasons.some((reason) => String(reason).startsWith("distractors_"))) return "重写干扰项，让错误选项来自同一语境并能教学边界";
  return "";
}

function reviewFrictionDiagnostics(question = {}) {
  const stemLength = visibleLength(question.stem);
  const optionLengths = Array.isArray(question.options)
    ? question.options.map((option) => visibleLength(option.text))
    : [];
  const maxOptionLength = optionLengths.length ? Math.max(...optionLengths) : 0;
  const averageOptionLength = optionLengths.length
    ? optionLengths.reduce((sum, length) => sum + length, 0) / optionLengths.length
    : 0;
  const visibleReadingLoad = stemLength + optionLengths.reduce((sum, length) => sum + length, 0);
  const reasons = [];
  let score = 5;

  if (visibleReadingLoad > 220) {
    score -= 2;
    reasons.push("question_card_too_heavy");
  } else if (visibleReadingLoad > 170) {
    score -= 1;
    reasons.push("question_card_too_heavy");
  }

  if (question.type === "scenario_judgment") {
    if (stemLength > 110) {
      score -= 2;
      reasons.push("scenario_background_too_long");
    } else if (stemLength > 80) {
      score -= 1;
      reasons.push("scenario_background_too_long");
    }
  } else if (stemLength > 90) {
    score -= 1;
    reasons.push("stem_too_long");
  }

  if (maxOptionLength > 60) {
    score -= 2;
    reasons.push("option_too_explanatory");
  } else if (maxOptionLength > 45) {
    score -= 1;
    reasons.push("option_too_explanatory");
  }

  if (averageOptionLength > 42) {
    score -= 1;
    reasons.push("option_too_explanatory");
  }

  return {
    stemLength,
    optionLengths,
    maxOptionLength,
    visibleReadingLoad,
    reviewFrictionScore: clamp(score),
    reviewFrictionReasons: [...new Set(reasons)]
  };
}

function scoreSourceCoverage(question = {}) {
  const concepts = extractQuestionConcepts([
    question.stem,
    question.correctUnderstanding,
    correctOptionText(question)
  ].join(" "));
  if (!concepts.length) return 5;
  const source = normalize(question.sourceSnippet || "").toLowerCase();
  const covered = concepts.filter((concept) => source.includes(normalize(concept).toLowerCase()));
  const ratio = covered.length / concepts.length;
  if (ratio >= 0.85) return 5;
  if (ratio >= 0.65) return 4;
  if (ratio >= 0.45) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

function scoreClaimFidelity(question = {}, point = {}) {
  const source = normalize([
    point.keyClaim,
    point.summary,
    question.sourceSnippet
  ].filter(Boolean).join(" ")).toLowerCase();
  const questionText = normalize([
    question.stem,
    question.correctUnderstanding
  ].filter(Boolean).join(" ")).toLowerCase();
  if (!source || !questionText) return 3;
  const overstatementCues = ["主要原因", "根本原因", "总是", "完全", "必须", "只要", "所有", "一定"];
  const cuePenalty = overstatementCues.some((cue) => questionText.includes(normalize(cue).toLowerCase()))
    && !overstatementCues.some((cue) => source.includes(normalize(cue).toLowerCase()))
    ? 2
    : 0;
  const overlap = overlapRatio(source, questionText);
  const base = overlap >= 0.5 ? 5 : overlap >= 0.22 ? 4 : overlap >= 0.12 ? 3 : 2;
  const scored = Math.max(1, base - cuePenalty);
  return cuePenalty ? Math.min(3, scored) : scored;
}

function extractQuestionConcepts(text = "") {
  const source = String(text || "");
  const latin = source.match(/[A-Za-z][A-Za-z0-9_.-]{1,}/g) || [];
  const knownChinese = [
    "提示词",
    "模型",
    "系统",
    "控制器",
    "生命周期",
    "自动化",
    "主干",
    "裁判",
    "工程化",
    "演示",
    "职责",
    "分工"
  ].filter((word) => source.includes(word));
  const metaTerms = new Set(["原文", "来源", "题目", "选项", "场景", "正确", "理解", "判断"]);
  return [...new Set([...latin, ...knownChinese])]
    .filter((concept) => !metaTerms.has(concept))
    .slice(0, 12);
}

function explanationReason(question, explanationFaithfulnessScore) {
  const explanation = String(question?.explanation || "");
  const correct = String(question?.correctUnderstanding || "");
  if (explanationFaithfulnessScore <= 2 && explanation.length > correct.length * 1.4) return "explanation_overextends_source";
  if (/因此|所以|意味着|说明/.test(explanation) && !keywordOverlap(explanation, correct)) return "explanation_not_tied_to_answer";
  return "explanation_not_tied_to_answer";
}

function misconceptionReason(question) {
  const misconception = String(question?.commonMisconception || "");
  const options = Array.isArray(question?.options) ? question.options.map((option) => option.text || "").join(" ") : "";
  if (/没有理解|理解片面|忽略.*关键|只是.*表面|不够深入|混淆概念/.test(misconception) || misconception.length < 18) {
    return "misconception_too_generic";
  }
  if (misconception && options && !keywordOverlap(misconception, options)) {
    return "misconception_not_reflected_in_options";
  }
  return "misconception_not_grounded";
}

function distractorReason(question) {
  const wrongOptions = Array.isArray(question?.options)
    ? question.options.filter((option) => option.id !== question.correctOptionId)
    : [];
  if (wrongOptions.some((option) => String(option.text || "").length < 6 || /明显错误|无关|随便|都不/.test(option.text || ""))) {
    return "distractors_too_obvious";
  }
  const stem = String(question?.stem || "");
  if (wrongOptions.some((option) => !keywordOverlap(stem, option.text || ""))) {
    return "distractors_not_same_context";
  }
  return "distractors_do_not_teach_boundary";
}

function keywordOverlap(left, right) {
  const leftKeywords = extractSupportKeywords([left], { minChineseLength: 2, minLatinLength: 3, limit: 20 });
  const rightKeywords = extractSupportKeywords([right], { minChineseLength: 2, minLatinLength: 3, limit: 20 });
  if (!leftKeywords.length || !rightKeywords.length) return false;
  return rightKeywords.some((keyword) => leftKeywords.includes(keyword));
}

function scoreTextGrounding(sourceText, strongParts, weakParts = []) {
  const body = normalize(sourceText);
  if (!body) return 1;
  const phrases = extractSupportPhrases(strongParts);
  const strongKeywords = extractSupportKeywords(strongParts, { minChineseLength: 2, minLatinLength: 3, limit: 48 });
  const weakKeywords = extractSupportKeywords(weakParts, { minChineseLength: 2, minLatinLength: 3, limit: 48 });
  const phraseHits = countKeywordHits(body, phrases);
  const strongHits = countKeywordHits(body, strongKeywords);
  const weakHits = countKeywordHits(body, weakKeywords);
  if (phraseHits >= 2 || strongHits >= 5) return 5;
  if (phraseHits >= 1 || strongHits >= 3) return 4;
  if (strongHits >= 2 || (strongHits >= 1 && weakHits >= 2)) return 3;
  if (strongHits >= 1 || weakHits >= 2) return 2;
  return 1;
}

function scoreContextRelevance(question, sourceValidation) {
  if (!sourceValidation?.valid) return 1;
  const sourceContextScore = Number(question.sourceContextScore || 0);
  if (sourceContextScore >= 130) return 5;
  if (sourceContextScore >= 110) return 4;
  if (question.sourceContextSelection?.fallback && (question.sourceContextSelection?.relevanceScore || 0) >= 4) return 4;
  if (sourceValidation.support === "point_source") return 5;
  if (sourceValidation.support === "cleaned_text" || sourceValidation.support === "partial_point_source") return 4;
  return 3;
}

function extractSupportPhrases(parts) {
  const stopPhrases = new Set(["正确理解", "常见误区", "这个知识点", "来源片段"]);
  const phrases = [];
  for (const part of parts.filter(Boolean)) {
    const normalized = String(part)
      .replace(/[，。！？；：、,.!?;:()[\]{}"'“”‘’|/\\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const chineseRuns = normalized.split(/\s+/).filter((word) => /[\u4e00-\u9fff]/.test(word));
    for (const run of chineseRuns) {
      const chars = [...run].filter((char) => /[\u4e00-\u9fff]/.test(char));
      for (let length = 4; length <= Math.min(8, chars.length); length += 1) {
        for (let index = 0; index <= chars.length - length; index += 1) {
          phrases.push(chars.slice(index, index + length).join(""));
        }
      }
    }
  }
  return [...new Set(phrases.map(normalize).filter((phrase) => (
    phrase.length >= 4 && ![...stopPhrases].some((stop) => phrase.includes(stop))
  )))].slice(0, 80);
}

function extractSupportKeywords(parts, options = {}) {
  const minChineseLength = options.minChineseLength || 2;
  const minLatinLength = options.minLatinLength || 3;
  const normalized = parts
    .filter(Boolean)
    .join(" ")
    .replace(/[，。！？；：、,.!?;:()[\]{}"'“”‘’|/\\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const stopWords = new Set([
    "这个",
    "一种",
    "需要",
    "不能",
    "不是",
    "因为",
    "所以",
    "正确",
    "理解",
    "文章",
    "原文",
    "选项",
    "用户",
    "问题",
    "场景",
    "判断",
    "符合",
    "知识",
    "来源",
    "常见",
    "误区",
    "通过",
    "顾问",
    "信任",
    "建立"
  ]);
  const words = normalized
    .split(" ")
    .filter((word) => /[A-Za-z0-9]/.test(word) && word.length >= minLatinLength);
  const chineseRuns = normalized.split(/\s+/).filter((word) => /[\u4e00-\u9fff]/.test(word));
  const grams = [];
  for (const run of chineseRuns) {
    const chars = [...run].filter((char) => /[\u4e00-\u9fff]/.test(char));
    for (let index = 0; index <= chars.length - minChineseLength; index += 1) {
      grams.push(chars.slice(index, index + minChineseLength).join(""));
    }
    if (chars.length >= 4) {
      for (let index = 0; index <= chars.length - 4; index += 1) {
        grams.push(chars.slice(index, index + 4).join(""));
      }
    }
  }
  return [...new Set([...words, ...grams].map(normalize).filter((keyword) => (
    keyword.length >= minChineseLength && !stopWords.has(keyword)
  )))].slice(0, options.limit || 60);
}

function correctOptionText(question) {
  if (!Array.isArray(question?.options)) return "";
  return question.options.find((option) => option.id === question.correctOptionId)?.text || "";
}

function countKeywordHits(body, keywords) {
  return keywords.reduce((sum, keyword) => sum + (body.includes(keyword) ? 1 : 0), 0);
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
  if (question.sourceContextUnsupported) return { valid: false, support: "unsupported_question_context" };
  if (snippet.length >= 12 && fullText.includes(snippet)) {
    return { valid: true, support: "cleaned_text" };
  }
  if (!fullText && (pointSource.includes(snippet) || snippet.includes(pointSource.slice(0, 24)))) {
    return { valid: true, support: "point_source" };
  }
  if (!fullText && snippet.length >= 18 && pointSource.includes(snippet.slice(0, 18))) {
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
  if (question.type === "true_false") return 5;
  const correctText = normalize(question.options.find((option) => option.id === question.correctOptionId)?.text || "");
  const nearDuplicates = question.options.filter((option) => option.id !== question.correctOptionId)
    .some((option) => overlapRatio(correctText, normalize(option.text)) > 0.82);
  if (nearDuplicates) return 3;
  return 5;
}

function scoreUnderstandingDepth(question) {
  const text = `${question.stem}${question.correctUnderstanding}`;
  if (/场景|适合|边界|误区|为什么|区别|对比|应用|做法|条件|判断|迁移|取舍/.test(text)) return 5;
  if (/本质|核心|主张|关键|意味着|不是.*而是|区别是什么|主要作用|真正.*区别/.test(text)) return 4;
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

function collectIssues(question, scores, point, typeValidation, sourceValidation, reviewFriction = reviewFrictionDiagnostics(question)) {
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
  if (reviewFriction.reviewFrictionScore <= 2) issues.push("review_friction_mandatory_rewrite");
  else if (reviewFriction.reviewFrictionScore < 4) issues.push("review_friction_high");
  return [...new Set(issues)];
}

function decideAction(scores, averageScore, issues) {
  if (issues.includes("missing_knowledge_point") || issues.includes("missing_source_snippet")) return "discard";
  if (issues.includes("source_snippet_not_found") || issues.includes("source_snippet_missing_source")) return "discard";
  if (issues.includes("source_snippet_unsupported_question_context")) return "discard";
  if (issues.includes("review_friction_mandatory_rewrite") || issues.includes("review_friction_high")) return "rewrite";
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
  if (ruleAction === "discard") return "discard";
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

function visibleLength(value) {
  return [...normalize(value)].length;
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

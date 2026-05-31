import { buildPracticeBlueprintForPoint, MEMORY_ANGLE_ORDER } from "./practiceBlueprint.js";

export function attachReviewableClaimsToKnowledgePoints(points = [], cleanedText = "") {
  return (points || []).map((point) => {
    const targetCount = claimTargetCountForPoint(point);
    const practiceBlueprint = Array.isArray(point.practiceBlueprint) && point.practiceBlueprint.length
      ? point.practiceBlueprint.slice(0, targetCount)
      : buildPracticeBlueprintForPoint(point, { targetCount });
    const reviewableClaims = normalizeReviewableClaims(point.reviewableClaims, point, cleanedText, practiceBlueprint);
    return {
      ...point,
      practiceBlueprint,
      reviewableClaims
    };
  });
}

export function reviewableClaimForQuestion(point = {}, question = {}) {
  const claims = Array.isArray(point?.reviewableClaims) ? point.reviewableClaims : [];
  const claimId = String(question.reviewableClaimId || question.blueprintItemId || "").trim();
  if (claimId) {
    const exact = claims.find((claim) => claim.id === claimId);
    if (exact) return exact;
  }
  const byAngle = claims.find((claim) => claim.memoryAngle && claim.memoryAngle === question.memoryAngle);
  return byAngle || claims[0] || null;
}

export function buildExplanatoryEvidenceContext(cleanedText = "", sourceQuote = "", point = {}, hintText = "") {
  const text = String(cleanedText || "");
  const quote = String(sourceQuote || "").trim();
  if (!text) return quote;
  const paragraphs = splitParagraphs(text);
  if (!paragraphs.length) return quote;

  const directIndex = quote ? paragraphs.findIndex((paragraph) => sourceMatches(paragraph.text, quote)) : -1;
  if (directIndex >= 0) {
    return contextFromParagraph(paragraphs[directIndex], quote, point, hintText);
  }

  const keywords = supportKeywords([quote, point.title, point.keyClaim, hintText].join(" "));
  const ranked = paragraphs
    .map((paragraph) => ({ paragraph, score: keywordHitCount(paragraph.text, keywords) }))
    .sort((a, b) => b.score - a.score || b.paragraph.text.length - a.paragraph.text.length);
  const best = ranked[0];
  if (best?.score > 0) return contextFromParagraph(best.paragraph, quote, point, hintText);
  return quote || String(point.keyClaim || point.summary || "").trim();
}

function normalizeReviewableClaims(value, point, cleanedText, practiceBlueprint) {
  if (Array.isArray(value) && value.length) {
    return value.map((claim, index) => normalizeClaim(claim, point, cleanedText, practiceBlueprint[index], index));
  }
  return buildReviewableClaims(point, cleanedText, practiceBlueprint);
}

function buildReviewableClaims(point, cleanedText, practiceBlueprint = []) {
  const blueprint = practiceBlueprint.length
    ? practiceBlueprint
    : buildPracticeBlueprintForPoint(point, { targetCount: claimTargetCountForPoint(point) });
  const questionAngles = Array.isArray(point.questionAngles) ? point.questionAngles : [];
  return blueprint.map((item, index) => {
    const hint = questionAngles[index] || item.goal || item.memoryAngle || point.keyClaim || point.title || "";
    const evidenceText = String(point.sourceQuote || "").trim();
    const evidenceContextText = buildExplanatoryEvidenceContext(cleanedText, evidenceText, point, hint);
    return {
      id: `${point.id || "kp"}-claim-${item.memoryAngle || index + 1}`,
      claim: claimTextForAngle(point, item.memoryAngle, hint),
      evidenceText,
      evidenceContextText,
      allowedQuestionScope: allowedScopeForClaim(point, item, hint),
      prohibitedExtensions: prohibitedExtensionsForClaim(point, item),
      memoryAngle: item.memoryAngle || MEMORY_ANGLE_ORDER[index] || "core_understanding",
      blueprintItemId: item.id || "",
      evidenceRole: item.sourceEvidenceRole || evidenceRoleForAngle(item.memoryAngle),
      contextSectionTitle: ""
    };
  });
}

function normalizeClaim(claim, point, cleanedText, blueprintItem, index) {
  const evidenceText = String(claim.evidenceText || point.sourceQuote || "").trim();
  const memoryAngle = claim.memoryAngle || blueprintItem?.memoryAngle || MEMORY_ANGLE_ORDER[index] || "core_understanding";
  return {
    id: String(claim.id || `${point.id || "kp"}-claim-${memoryAngle}`).trim(),
    claim: String(claim.claim || point.keyClaim || point.summary || point.title || "").trim(),
    evidenceText,
    evidenceContextText: String(claim.evidenceContextText || buildExplanatoryEvidenceContext(cleanedText, evidenceText, point, claim.claim || "")).trim(),
    allowedQuestionScope: String(claim.allowedQuestionScope || allowedScopeForClaim(point, { memoryAngle }, claim.claim || "")).trim(),
    prohibitedExtensions: String(claim.prohibitedExtensions || prohibitedExtensionsForClaim(point, { memoryAngle })).trim(),
    memoryAngle,
    blueprintItemId: claim.blueprintItemId || blueprintItem?.id || "",
    evidenceRole: claim.evidenceRole || blueprintItem?.sourceEvidenceRole || evidenceRoleForAngle(memoryAngle),
    contextSectionTitle: claim.contextSectionTitle || ""
  };
}

function claimTargetCountForPoint(point = {}) {
  const testabilityScore = clampScore(point.testabilityScore);
  const importanceScore = clampScore(point.importanceScore ?? point.testabilityScore);
  const angleCount = Array.isArray(point.questionAngles) ? point.questionAngles.length : 0;
  const role = String(point.structureRole || "");
  if (testabilityScore <= 2) return 1;
  if (testabilityScore === 3 && importanceScore <= 2) return 1;
  if (importanceScore >= 5 && testabilityScore >= 5 && angleCount >= 2) return 3;
  if (importanceScore >= 4 || testabilityScore >= 4 || ["main_claim", "method_step", "supporting_reason", "boundary"].includes(role)) return 2;
  return 1;
}

function claimTextForAngle(point = {}, memoryAngle = "", hint = "") {
  const base = String(point.keyClaim || point.summary || point.title || "").trim();
  const angle = String(hint || "").trim();
  if (angle && !isGenericAngle(angle)) return angle;
  if (memoryAngle === "misconception_boundary") return `${base} 的适用边界或常见误解`;
  if (memoryAngle === "scenario_application") return `${base} 在具体场景中的判断方式`;
  return base;
}

function allowedScopeForClaim(point = {}, blueprintItem = {}, hint = "") {
  const claim = String(point.keyClaim || point.summary || point.title || "").trim();
  const angle = String(hint || blueprintItem.goal || "").trim();
  return [
    claim ? `只考这个判断：${claim}` : "",
    angle ? `可考察角度：${angle}` : "",
    "题目、正确答案和解释都必须能由 evidenceContextText 推出。"
  ].filter(Boolean).join(" ");
}

function prohibitedExtensionsForClaim(point = {}, blueprintItem = {}) {
  const angle = blueprintItem?.memoryAngle || "";
  const parts = [
    "不得引入 evidenceContextText 没有覆盖的因果、比较、工具职责或普遍规律。",
    "不得把局部例子扩大成一般结论。"
  ];
  if (angle === "misconception_boundary") {
    parts.push("误区必须来自错误选项、原文边界或 evidenceContextText 中可见的混淆。");
  }
  if (angle === "scenario_application") {
    parts.push("场景题只能迁移 evidenceContextText 支撑的原则，不得编造额外业务约束。");
  }
  return parts.join(" ");
}

function evidenceRoleForAngle(memoryAngle) {
  if (memoryAngle === "misconception_boundary") return "boundary";
  if (memoryAngle === "scenario_application") return "method";
  return "definition";
}

function contextFromParagraph(paragraph, sourceQuote, point, hintText) {
  const text = paragraph.text;
  if (text.length <= 520) return text;
  const sentences = paragraph.sentences;
  const keywords = supportKeywords([sourceQuote, point.title, point.keyClaim, hintText].join(" "));
  let anchorIndex = sourceQuote ? sentences.findIndex((sentence) => sourceMatches(sentence, sourceQuote)) : -1;
  if (anchorIndex === -1) {
    anchorIndex = bestSentenceIndex(sentences, keywords);
  }
  if (anchorIndex === -1) return text.slice(0, 520).trim();
  return expandSentences(sentences, anchorIndex, keywords, { minLength: 120, maxLength: 520 });
}

function expandSentences(sentences, anchorIndex, keywords, { minLength, maxLength }) {
  const selected = new Set([anchorIndex]);
  let left = anchorIndex - 1;
  let right = anchorIndex + 1;
  let text = joinSentences(sentences, selected);
  while (text.length < minLength && (left >= 0 || right < sentences.length)) {
    const leftScore = left >= 0 ? keywordHitCount(sentences[left], keywords) : -1;
    const rightScore = right < sentences.length ? keywordHitCount(sentences[right], keywords) : -1;
    const next = rightScore >= leftScore ? right++ : left--;
    const nextSelected = new Set([...selected, next]);
    const nextText = joinSentences(sentences, nextSelected);
    if (nextText.length > maxLength) break;
    selected.add(next);
    text = nextText;
  }
  return text || sentences[anchorIndex] || "";
}

function joinSentences(sentences, selected) {
  return [...selected].sort((a, b) => a - b).map((index) => sentences[index]).join("");
}

function bestSentenceIndex(sentences, keywords) {
  let best = { index: -1, score: 0 };
  sentences.forEach((sentence, index) => {
    const score = keywordHitCount(sentence, keywords);
    if (score > best.score) best = { index, score };
  });
  return best.score > 0 ? best.index : -1;
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
  return (normalized.match(/[^。！？!?；;\n]+[。！？!?；;]?/g) || [normalized])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function sourceMatches(text, sourceQuote) {
  const body = normalize(text);
  const quote = normalize(sourceQuote);
  if (!body || !quote) return false;
  if (body.includes(quote)) return true;
  if (quote.length >= 24 && body.includes(quote.slice(0, 24))) return true;
  return quote.length >= 24 && body.includes(quote.slice(-24));
}

function supportKeywords(value) {
  return [...new Set(String(value || "")
    .replace(/[，。！？；：、,.!?;:()[\]{}"'“”‘’|/\\-]/g, " ")
    .split(/\s+/)
    .flatMap((word) => {
      if (/[\u4e00-\u9fff]/.test(word)) {
        const chars = [...word].filter((char) => /[\u4e00-\u9fff]/.test(char));
        const tokens = [];
        for (let length = 2; length <= Math.min(4, chars.length); length += 1) {
          for (let index = 0; index <= chars.length - length; index += 1) {
            tokens.push(chars.slice(index, index + length).join(""));
          }
        }
        return tokens;
      }
      return word.length >= 3 ? [word.toLowerCase()] : [];
    })
    .map(normalize)
    .filter((token) => token.length >= 2))].slice(0, 60);
}

function keywordHitCount(text, keywords = []) {
  const body = normalize(text);
  return keywords.reduce((sum, keyword) => sum + (body.includes(keyword) ? 1 : 0), 0);
}

function isGenericAngle(value = "") {
  return /核心理解|边界辨析|场景迁移|理解动作|复习/.test(value) || value.length < 6;
}

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(5, Math.max(1, Math.round(number)));
}

function normalize(value) {
  return String(value || "").replace(/\s+/g, "").toLowerCase();
}

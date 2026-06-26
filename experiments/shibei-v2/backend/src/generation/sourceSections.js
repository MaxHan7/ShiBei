export function splitParagraphs(text) {
  return String(text || "")
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function isLeadSummaryParagraph(paragraph, index, paragraphs = []) {
  if (index > 10) return false;
  const text = String(paragraph || "").trim();
  if (!text) return false;
  if (isQuotedTeaser(text)) return true;
  if (isBoilerplateLead(text)) return true;
  if (isOpeningShortClaimCluster(text, index, paragraphs)) return true;

  const nextQuotedCount = paragraphs
    .slice(index, Math.min(paragraphs.length, index + 4))
    .filter(isQuotedTeaser)
    .length;
  return nextQuotedCount >= 2 && text.length <= 120 && !looksLikeBodyHeading(text);
}

export function isLeadSummarySource(cleanedText, sourceQuote) {
  const paragraphs = splitParagraphs(cleanedText);
  const quote = normalizeSource(sourceQuote);
  if (quote.length < 8) return false;

  let firstMatchIndex = -1;
  let laterBodyMatch = false;
  paragraphs.forEach((paragraph, index) => {
    if (!sourceMatches(paragraph, quote)) return;
    if (firstMatchIndex < 0) firstMatchIndex = index;
    if (!isLeadSummaryParagraph(paragraph, index, paragraphs)) laterBodyMatch = true;
  });

  return firstMatchIndex >= 0
    && isLeadSummaryParagraph(paragraphs[firstMatchIndex], firstMatchIndex, paragraphs)
    && !laterBodyMatch;
}

export function sourceMatches(text, normalizedQuote) {
  const normalizedText = normalizeSource(text);
  if (normalizedText.includes(normalizedQuote)) return true;
  const prefix = normalizedQuote.slice(0, Math.min(28, normalizedQuote.length));
  return prefix.length >= 8 && normalizedText.includes(prefix);
}

function isQuotedTeaser(text) {
  const normalized = text.trim();
  const quoteWrapped = /^["“”「『].+["“”」』。.!！?？]?$/.test(normalized)
    || /^「.+」$/.test(normalized)
    || /^『.+』$/.test(normalized);
  return quoteWrapped && normalized.length >= 10 && normalized.length <= 140;
}

function isBoilerplateLead(text) {
  return /全文约|如果你现在没有时间|稍后再听|每天为你更新|与前沿保持同频|来源：微信公众号|原文链接/.test(text);
}

function isOpeningShortClaimCluster(text, index, paragraphs) {
  if (index > 5) return false;
  if (!isShortClaim(text)) return false;

  const firstBodyIndex = paragraphs.findIndex((paragraph) => paragraph.length >= 60);
  if (firstBodyIndex < 2 || index >= firstBodyIndex) return false;

  const opening = paragraphs.slice(0, firstBodyIndex);
  const shortClaimCount = opening.filter(isShortClaim).length;
  const laterBodyCount = paragraphs.slice(firstBodyIndex).length;

  return shortClaimCount >= 2 && laterBodyCount >= 1;
}

function isShortClaim(text) {
  const normalized = String(text || "").trim();
  return normalized.length >= 12
    && normalized.length <= 120
    && /[。！？!?]$/.test(normalized)
    && !looksLikeBodyHeading(normalized);
}

function looksLikeBodyHeading(text) {
  return text.length <= 26 && !/[。！？!?；;]/.test(text) && !/^["“”「『]/.test(text);
}

export function normalizeSource(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[“”"「」『』《》〈〉（）()，,。.!！?？:：;；、]/g, "");
}

export function filterKnowledgePoints(candidates, cleanedText) {
  const kept = [];
  const filtered = [];
  const seen = new Set();

  for (const candidate of candidates || []) {
    const reasons = filterReasons(candidate, cleanedText, seen);
    const normalized = normalizePoint(candidate);
    if (!reasons.length) {
      kept.push(normalized);
      seen.add(fingerprint(normalized));
    } else {
      filtered.push({
        ...normalized,
        filterReasons: reasons
      });
    }
  }

  return { kept, filtered };
}

function normalizePoint(candidate = {}) {
  return {
    ...candidate,
    title: String(candidate.title || "").trim(),
    summary: String(candidate.summary || "").trim(),
    keyClaim: String(candidate.keyClaim || "").trim(),
    sourceQuote: String(candidate.sourceQuote || "").trim(),
    testabilityReason: String(candidate.testabilityReason || "").trim(),
    questionAngles: Array.isArray(candidate.questionAngles)
      ? candidate.questionAngles.map((angle) => String(angle || "").trim()).filter(Boolean)
      : [],
    testabilityScore: Number(candidate.testabilityScore) || 1
  };
}

function filterReasons(candidate, cleanedText, seen) {
  const point = normalizePoint(candidate);
  const reasons = [];

  if (!point.title || !point.summary || !point.keyClaim) reasons.push("incomplete_fields");
  if (!point.sourceQuote || !sourceExists(cleanedText, point.sourceQuote)) reasons.push("source_not_supported");
  if (point.testabilityScore < 3) reasons.push("low_testability");
  if (isFragment(point)) reasons.push("fragmented_information");
  if (isEmotionalExpression(point)) reasons.push("emotional_expression");
  if (isCommonSense(point)) reasons.push("common_sense");
  if (seen.has(fingerprint(point))) reasons.push("duplicate");

  return [...new Set(reasons)];
}

function sourceExists(cleanedText, sourceQuote) {
  const source = normalize(sourceQuote);
  const text = normalize(cleanedText);
  if (source.length < 8) return false;
  if (text.includes(source)) return true;
  return source.slice(0, Math.min(28, source.length)).length >= 8 && text.includes(source.slice(0, 28));
}

function normalize(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[“”"「」『』《》〈〉（）()，,。.!！?？:：;；、]/g, "");
}

function fingerprint(point) {
  return normalize(`${point.title}${point.keyClaim}`).slice(0, 80);
}

function isFragment(point) {
  const merged = `${point.title}${point.summary}${point.keyClaim}`.trim();
  return merged.length < 16 || point.keyClaim.length < 8;
}

function isEmotionalExpression(point) {
  const merged = `${point.title}${point.summary}${point.keyClaim}`;
  return /真好|很棒|不错|感动|喜欢|震惊|焦虑|兴奋/.test(merged);
}

function isCommonSense(point) {
  const merged = `${point.title}${point.summary}${point.keyClaim}`;
  return /大家都知道|众所周知|非常重要|显然|理所当然/.test(merged) && point.testabilityScore < 4;
}

import { isLeadSummarySource } from "./sourceSections.js";

export function filterKnowledgePoints(candidates, cleanedText) {
  const kept = [];
  const filtered = [];
  const seen = new Set();

  for (const candidate of candidates || []) {
    const normalized = repairPointSourceQuote(normalizePoint(candidate), cleanedText);
    const reasons = filterReasons(normalized, cleanedText, seen);
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

  const selected = selectMainlineKnowledgePoints(kept, cleanedText);
  const selectedIds = new Set(selected.map((point) => point.id));
  const trimmed = kept
    .filter((point) => !selectedIds.has(point.id))
    .map((point) => ({
      ...point,
      filterReasons: ["mainline_priority_trimmed"]
    }));

  return { kept: selected, filtered: [...filtered, ...trimmed] };
}

function normalizePoint(candidate = {}) {
  const structureRole = normalizeStructureRole(candidate.structureRole, candidate.knowledgeType);
  return {
    ...candidate,
    title: String(candidate.title || "").trim(),
    summary: String(candidate.summary || "").trim(),
    keyClaim: String(candidate.keyClaim || "").trim(),
    sourceQuote: String(candidate.sourceQuote || "").trim(),
    testabilityReason: String(candidate.testabilityReason || "").trim(),
    structureRole,
    importanceScore: clampScore(candidate.importanceScore ?? candidate.testabilityScore ?? defaultImportanceForRole(structureRole)),
    coverageReason: String(candidate.coverageReason || candidate.testabilityReason || "").trim(),
    questionAngles: Array.isArray(candidate.questionAngles)
      ? candidate.questionAngles.map((angle) => String(angle || "").trim()).filter(Boolean)
      : [],
    testabilityScore: clampScore(candidate.testabilityScore)
  };
}

function filterReasons(candidate, cleanedText, seen) {
  const point = candidate.sourceQuote === undefined ? normalizePoint(candidate) : candidate;
  const reasons = [];

  if (!point.title || !point.summary || !point.keyClaim) reasons.push("incomplete_fields");
  if (!point.sourceQuote || !sourceExists(cleanedText, point.sourceQuote)) {
    reasons.push("source_not_supported");
  } else if (isLeadSummarySource(cleanedText, point.sourceQuote)) {
    reasons.push("lead_summary_source");
  }
  if (point.testabilityScore < 3) reasons.push("low_testability");
  if (["background", "detail"].includes(point.structureRole)) reasons.push("low_structure_value");
  if (point.structureRole === "case_evidence" && point.importanceScore < 4) reasons.push("low_importance_case");
  if (isFragment(point)) reasons.push("fragmented_information");
  if (isEmotionalExpression(point)) reasons.push("emotional_expression");
  if (isCommonSense(point)) reasons.push("common_sense");
  if (seen.has(fingerprint(point))) reasons.push("duplicate");

  return [...new Set(reasons)];
}

function repairPointSourceQuote(point, cleanedText) {
  if (!point.sourceQuote || sourceExists(cleanedText, point.sourceQuote)) return point;
  const replacement = findBestSourceQuote(point, cleanedText);
  if (!replacement) return point;
  return {
    ...point,
    originalSourceQuote: point.sourceQuote,
    sourceQuote: replacement,
    sourceQuoteWasRepaired: true
  };
}

function findBestSourceQuote(point, cleanedText) {
  const paragraphs = String(cleanedText || "")
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (!paragraphs.length) return "";
  const keywords = extractPointKeywords(point);
  const windows = [];
  for (let index = 0; index < paragraphs.length; index += 1) {
    for (let size = 1; size <= 4 && index + size <= paragraphs.length; size += 1) {
      const text = paragraphs.slice(index, index + size).join("\n\n");
      if (text.length < 18 || text.length > 650) continue;
      windows.push({
        text,
        score: scorePointSourceWindow(text, keywords)
      });
    }
  }
  windows.sort((a, b) => b.score - a.score || sourceQuoteLengthScore(b.text) - sourceQuoteLengthScore(a.text));
  const best = windows[0];
  return best && best.score >= 4 ? best.text : "";
}

function extractPointKeywords(point) {
  const source = [
    point.title,
    point.summary,
    point.keyClaim,
    ...(Array.isArray(point.questionAngles) ? point.questionAngles : [])
  ].filter(Boolean).join(" ");
  const normalized = source
    .replace(/[，。！？；：、,.!?;:()[\]{}"'“”‘’|/\\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const latin = normalized.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word) && word.length >= 2);
  const chineseRuns = normalized.split(/\s+/).filter((word) => /[\u4e00-\u9fff]/.test(word));
  const grams = [];
  for (const run of chineseRuns) {
    const chars = [...run].filter((char) => /[\u4e00-\u9fff]/.test(char));
    for (let index = 0; index <= chars.length - 2; index += 1) {
      grams.push(chars.slice(index, index + 2).join(""));
    }
    for (let index = 0; index <= chars.length - 4; index += 1) {
      grams.push(chars.slice(index, index + 4).join(""));
    }
  }
  const stopWords = new Set(["这个", "一种", "需要", "不能", "不是", "因为", "所以", "文章", "原文", "知识", "来源", "问题"]);
  return [...new Set([...latin, ...grams].map(normalize).filter((keyword) => keyword.length >= 2 && !stopWords.has(keyword)))].slice(0, 80);
}

function scorePointSourceWindow(text, keywords) {
  const body = normalize(text);
  return keywords.reduce((sum, keyword) => sum + (body.includes(keyword) ? 1 : 0), 0);
}

function sourceQuoteLengthScore(text) {
  const length = String(text || "").length;
  if (length >= 80 && length <= 420) return 10;
  if (length > 420) return 4;
  return 1;
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

function selectMainlineKnowledgePoints(points, cleanedText = "") {
  const targetMax = dynamicKnowledgePointLimit(cleanedText, points.length);
  if (points.length <= targetMax) return points;

  const ranked = points
    .map((point, index) => ({
      point,
      index,
      score: rolePriority(point.structureRole) * 100
        + point.importanceScore * 20
        + point.testabilityScore * 10
        - index / 100
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = ranked.slice(0, targetMax).map((item) => item.point);
  const hasMainClaim = selected.some((point) => point.structureRole === "main_claim");
  const bestMainClaim = ranked.find((item) => item.point.structureRole === "main_claim")?.point;

  if (!hasMainClaim && bestMainClaim) {
    selected[selected.length - 1] = bestMainClaim;
  }

  const selectedIds = new Set(selected.map((point) => point.id));
  return points.filter((point) => selectedIds.has(point.id));
}

function dynamicKnowledgePointLimit(cleanedText, candidateCount) {
  const textLength = String(cleanedText || "").replace(/\s+/g, "").length;
  if (textLength < 800) return Math.min(candidateCount, 4);
  if (textLength < 2500) return Math.min(candidateCount, 8);
  if (textLength < 6000) return Math.min(candidateCount, 12);
  return Math.min(candidateCount, 16);
}

function rolePriority(role) {
  switch (role) {
  case "main_claim":
    return 6;
  case "method_step":
  case "supporting_reason":
    return 5;
  case "boundary":
    return 4;
  case "case_evidence":
    return 3;
  case "background":
  case "detail":
  default:
    return 1;
  }
}

function normalizeStructureRole(value, knowledgeType) {
  const normalized = String(value || "").trim();
  if ([
    "main_claim",
    "supporting_reason",
    "method_step",
    "boundary",
    "case_evidence",
    "background",
    "detail"
  ].includes(normalized)) {
    return normalized;
  }

  switch (knowledgeType) {
  case "method":
  case "step":
    return "method_step";
  case "counterexample":
    return "boundary";
  case "scenario":
  case "comparison":
    return "supporting_reason";
  case "judgment":
  case "concept":
  default:
    return "main_claim";
  }
}

function defaultImportanceForRole(role) {
  switch (role) {
  case "main_claim":
    return 4;
  case "supporting_reason":
  case "method_step":
  case "boundary":
    return 3;
  default:
    return 2;
  }
}

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(5, Math.max(1, Math.round(number)));
}

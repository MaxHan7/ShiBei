import { createMediaExtractionError } from "./mediaErrors.js";

const MIN_NORMALIZED_TEXT_LENGTH = 80;
const TRANSCRIPT_TARGET_SECONDS = 24;
const TRANSCRIPT_TARGET_CHARS = 220;
const TRANSCRIPT_MAX_SECONDS = 32;
const TRANSCRIPT_MAX_CHARS = 280;
const TRANSCRIPT_PAUSE_BREAK_SECONDS = 2.5;
const TRANSCRIPT_TOPIC_START_PATTERN = /^(先说|再说|第三|第四|第五|最后|总结|一句话|接下来|然后说|再来看)/;

export function buildLearningSourceFromVideo({
  platform = "unknown",
  title = "",
  url = "",
  account = "",
  author = "",
  durationSeconds = null,
  description = "",
  transcriptSegments = [],
  visualSegments = [],
  media = {},
  now = new Date().toISOString()
} = {}) {
  const normalizedTranscriptSegments = normalizeTranscriptSegments(transcriptSegments);
  const sourceSections = [
    ...descriptionToSections(description),
    ...transcriptToSections(normalizedTranscriptSegments),
    ...visualToSections(visualSegments)
  ];
  const normalizedText = renderNormalizedText(sourceSections);

  if (normalizedText.replace(/\s/g, "").length < MIN_NORMALIZED_TEXT_LENGTH) {
    throw createMediaExtractionError(
      "video_content_too_short",
      "这条视频没有提取到足够的可复习内容。请换一个信息量更高的公开视频链接。",
      { retryable: false }
    );
  }

  return {
    id: media.providerContentId
      ? `video-source-${media.providerContentId}`
      : `video-source-${hashString(url || title || normalizedText)}`,
    sourceType: "video_link",
    platform,
    title: cleanText(title) || platformLabel(platform),
    url,
    account: cleanText(account),
    author: cleanText(author || account),
    durationSeconds: finiteNumber(durationSeconds),
    rawText: normalizedText,
    normalizedText,
    transcriptSegments: normalizedTranscriptSegments,
    visualSegments: Array.isArray(visualSegments) ? visualSegments : [],
    sourceSections,
    media: {
      provider: media.provider || "",
      providerContentId: media.providerContentId || "",
      coverUrl: media.coverUrl || "",
      playUrlExpiresAt: media.playUrlExpiresAt || ""
    },
    extractionMeta: {
      stages: [],
      createdAt: now
    }
  };
}

export function buildV2SourceFromLearningSource(learningSource) {
  const blocks = learningSource.sourceSections.map((section, index) => ({
    id: section.id || `video-section-${String(index + 1).padStart(3, "0")}`,
    type: "paragraph",
    text: section.text,
    sourceRole: section.sourceRole,
    ...(Number.isFinite(section.startSeconds) ? { startSeconds: section.startSeconds } : {}),
    ...(Number.isFinite(section.endSeconds) ? { endSeconds: section.endSeconds } : {}),
    ...(Array.isArray(section.segmentIds) && section.segmentIds.length ? { segmentIds: section.segmentIds } : {})
  }));
  const contentBasis = buildContentBasis(learningSource);

  return {
    type: "video_link",
    platform: learningSource.platform,
    title: learningSource.title,
    url: learningSource.url,
    author: learningSource.author || learningSource.account,
    account: learningSource.account || learningSource.author,
    accountOrDomain: learningSource.account || learningSource.author || learningSource.platform,
    rawInput: learningSource.url,
    rawText: learningSource.normalizedText,
    extractedText: learningSource.normalizedText,
    cleanedText: learningSource.normalizedText,
    durationSeconds: learningSource.durationSeconds,
    media: learningSource.media,
    ...(contentBasis ? { contentBasis } : {}),
    blocks
  };
}

function descriptionToSections(description) {
  const text = cleanText(description);
  if (!text) return [];
  return [{
    id: "video-platform-description",
    sourceRole: "platform_description",
    text: `平台文案：${text}`
  }];
}

function transcriptToSections(segments) {
  const groups = groupTranscriptSegments(segments);
  return groups.map((group, index) => ({
    id: `video-transcript-${String(index + 1).padStart(3, "0")}`,
    sourceRole: "audio_transcript",
    startSeconds: group.startSeconds,
    endSeconds: group.endSeconds,
    text: joinTranscriptTexts(group.segments.map((segment) => segment.text)),
    segmentIds: group.segments.map((segment) => segment.id).filter(Boolean)
  }));
}

function groupTranscriptSegments(segments) {
  const groups = [];
  let current = [];

  for (const segment of segments) {
    if (!segment?.text) continue;

    if (current.length > 0 && shouldBreakBeforeSegment(current, segment)) {
      groups.push(buildTranscriptGroup(current));
      current = [];
    }

    current.push(segment);

    if (shouldBreakAfterCurrentGroup(current)) {
      groups.push(buildTranscriptGroup(current));
      current = [];
    }
  }

  if (current.length > 0) {
    groups.push(buildTranscriptGroup(current));
  }

  return groups;
}

function shouldBreakBeforeSegment(current, nextSegment) {
  const last = current.at(-1);
  const currentGroup = buildTranscriptGroup(current);
  const nextText = cleanText(nextSegment.text);
  const combinedLength = currentGroup.textLength + nextText.length;
  const combinedEnd = finiteNumber(nextSegment.endSeconds) ?? currentGroup.endSeconds;
  const combinedDuration = secondsBetween(currentGroup.startSeconds, combinedEnd);
  const pause = secondsBetween(last?.endSeconds, nextSegment.startSeconds);

  return (
    pause >= TRANSCRIPT_PAUSE_BREAK_SECONDS ||
    (TRANSCRIPT_TOPIC_START_PATTERN.test(nextText) && currentGroup.durationSeconds >= 8) ||
    combinedLength > TRANSCRIPT_MAX_CHARS ||
    combinedDuration > TRANSCRIPT_MAX_SECONDS
  );
}

function shouldBreakAfterCurrentGroup(current) {
  const group = buildTranscriptGroup(current);
  return (
    group.durationSeconds >= TRANSCRIPT_TARGET_SECONDS ||
    group.textLength >= TRANSCRIPT_TARGET_CHARS
  );
}

function buildTranscriptGroup(segments) {
  const first = segments[0] || {};
  const last = segments.at(-1) || {};
  const startSeconds = finiteNumber(first.startSeconds);
  const endSeconds = finiteNumber(last.endSeconds);
  const text = joinTranscriptTexts(segments.map((segment) => segment.text));

  return {
    startSeconds,
    endSeconds,
    durationSeconds: secondsBetween(startSeconds, endSeconds),
    textLength: text.length,
    segments
  };
}

function joinTranscriptTexts(texts) {
  return texts
    .map(cleanText)
    .filter(Boolean)
    .reduce((joined, text) => {
      if (!joined) return text;
      return `${joined}${joinerForTranscriptText(joined, text)}${text}`;
    }, "");
}

function joinerForTranscriptText(previous, next) {
  if (/[。！？!?；;：:]$/.test(previous)) return "";
  if (/^[，。！？!?；;：:、]/.test(next)) return "";
  if (/[A-Za-z0-9]$/.test(previous) && /^[A-Za-z0-9]/.test(next)) return " ";
  return "，";
}

function visualToSections(segments) {
  return Array.isArray(segments)
    ? segments
      .map((segment, index) => ({
        id: segment.id || `video-visual-${String(index + 1).padStart(3, "0")}`,
        sourceRole: segment.sourceRole || "visual_summary",
        startSeconds: finiteNumber(segment.startSeconds),
        endSeconds: finiteNumber(segment.endSeconds),
        text: cleanText(segment.ocrText || segment.summary || segment.text || "")
      }))
      .filter((section) => section.text)
    : [];
}

function normalizeTranscriptSegments(segments) {
  return Array.isArray(segments)
    ? segments
      .map((segment, index) => ({
        id: segment.id || `transcript-${String(index + 1).padStart(3, "0")}`,
        startSeconds: finiteNumber(segment.startSeconds),
        endSeconds: finiteNumber(segment.endSeconds),
        text: cleanText(segment.text),
        ...(Number.isFinite(Number(segment.confidence)) ? { confidence: Number(segment.confidence) } : {})
      }))
      .filter((segment) => segment.text)
    : [];
}

function renderNormalizedText(sections) {
  return sections
    .map((section) => cleanText(section.text))
    .filter(Boolean)
    .join("\n\n");
}

function cleanText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildContentBasis(learningSource) {
  const basis = learningSource?.extractionMeta?.userVisibleContentBasis;
  if (!basis || typeof basis !== "object") return null;
  const safeBasis = String(basis.basis || "");
  const message = String(basis.message || "");
  if (!["audio_visual", "audio_transcript"].includes(safeBasis) || !message) return null;
  return { basis: safeBasis, message };
}

function secondsBetween(start, end) {
  const startNumber = Number(start);
  const endNumber = Number(end);
  if (!Number.isFinite(startNumber) || !Number.isFinite(endNumber)) return 0;
  return Math.max(0, endNumber - startNumber);
}

function platformLabel(platform) {
  if (platform === "douyin") return "抖音视频";
  if (platform === "xiaohongshu") return "小红书视频";
  return "视频链接";
}

function hashString(value) {
  let hash = 0;
  for (const char of String(value || "")) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash).toString(36);
}

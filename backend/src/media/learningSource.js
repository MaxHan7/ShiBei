import { createMediaExtractionError } from "./mediaErrors.js";

const MIN_NORMALIZED_TEXT_LENGTH = 80;

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
    ...(Number.isFinite(section.endSeconds) ? { endSeconds: section.endSeconds } : {})
  }));

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
  return segments.map((segment, index) => ({
    id: segment.id || `video-transcript-${String(index + 1).padStart(3, "0")}`,
    sourceRole: "audio_transcript",
    startSeconds: segment.startSeconds,
    endSeconds: segment.endSeconds,
    text: segment.text
  }));
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

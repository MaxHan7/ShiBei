import { createMediaExtractionError } from "./mediaErrors.js";

export function normalizeTranscriptionPayload(payload, {
  provider = ""
} = {}) {
  const text = cleanText(payload?.text);
  const segments = Array.isArray(payload?.segments)
    ? payload.segments
      .map((segment, index) => ({
        id: segment.id
          ? String(segment.id)
          : `transcript-${String(index + 1).padStart(3, "0")}`,
        startSeconds: finiteNumber(segment.startSeconds ?? segment.start),
        endSeconds: finiteNumber(segment.endSeconds ?? segment.end),
        text: cleanText(segment.text)
      }))
      .filter((segment) => segment.text)
    : [];

  if (!text && segments.length === 0) {
    throw createMediaExtractionError("video_no_speech", "这条视频没有识别到足够清晰的语音内容。", {
      retryable: false,
      provider
    });
  }

  return {
    provider,
    text: text || segments.map((segment) => segment.text).join(" "),
    segments
  };
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

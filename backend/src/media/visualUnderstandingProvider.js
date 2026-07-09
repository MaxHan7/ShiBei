import { createMediaExtractionError } from "./mediaErrors.js";
import { createQwenVlVisualUnderstandingProvider } from "./qwenVlVisualUnderstandingProvider.js";
import { VIDEO_DEFAULTS } from "./videoDefaults.js";

const DISABLED_PROVIDER_NAMES = new Set(["", "none", "off", "disabled"]);

export function resolveVisualUnderstandingProviderName(env = process.env) {
  const provider = String(env.VIDEO_VISUAL_PROVIDER || VIDEO_DEFAULTS.visualProvider).trim().toLowerCase();
  return DISABLED_PROVIDER_NAMES.has(provider) ? "none" : provider;
}

export function createNoopVisualUnderstandingProvider({
  reason = "visual_understanding_disabled"
} = {}) {
  return {
    name: "none",
    async understandVideo() {
      return {
        provider: "none",
        skipped: true,
        reason,
        segments: []
      };
    }
  };
}

export function createVisualUnderstandingProvider({
  env = process.env
} = {}) {
  const providerName = resolveVisualUnderstandingProviderName(env);
  if (providerName === "none") return createNoopVisualUnderstandingProvider();
  if (["qwen-vl", "qwen", "qwen3-vl"].includes(providerName)) {
    return createQwenVlVisualUnderstandingProvider({ env });
  }

  throw createMediaExtractionError(
    "unsupported_visual_understanding_provider",
    `暂不支持的视频画面理解供应商：${providerName}`,
    { retryable: false, provider: providerName }
  );
}

export async function understandVideoVisuals({
  provider = createVisualUnderstandingProvider(),
  video = {},
  mediaFile = null,
  transcriptSegments = [],
  framePack = null
} = {}) {
  if (!provider || typeof provider.understandVideo !== "function") {
    throw createMediaExtractionError(
      "invalid_visual_understanding_provider",
      "视频画面理解供应商未实现 understandVideo。",
      { retryable: false }
    );
  }

  const result = await provider.understandVideo({
    video,
    mediaFile,
    transcriptSegments,
    framePack
  });

  return normalizeVisualUnderstandingResult(result, provider.name || "");
}

function normalizeVisualUnderstandingResult(result, fallbackProvider) {
  const payload = result && typeof result === "object" ? result : {};
  return {
    provider: String(payload.provider || fallbackProvider || "unknown"),
    model: String(payload.model || ""),
    skipped: Boolean(payload.skipped),
    reason: String(payload.reason || ""),
    segments: normalizeVisualSegments(payload.segments),
    usage: normalizeUsage(payload.usage)
  };
}

function normalizeVisualSegments(segments) {
  return Array.isArray(segments)
    ? segments
      .map((segment, index) => ({
        id: segment.id || `visual-${String(index + 1).padStart(3, "0")}`,
        sourceRole: segment.sourceRole || "visual_summary",
        startSeconds: finiteNumber(segment.startSeconds),
        endSeconds: finiteNumber(segment.endSeconds),
        text: cleanText(segment.text || segment.summary || segment.ocrText || ""),
        ...(segment.confidence !== undefined ? { confidence: finiteNumber(segment.confidence) } : {})
      }))
      .filter((segment) => segment.text)
    : [];
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

function normalizeUsage(usage) {
  if (!usage || typeof usage !== "object" || Array.isArray(usage)) return {};
  const promptTokens = firstFiniteNumber(usage.prompt_tokens, usage.input_tokens);
  const completionTokens = firstFiniteNumber(usage.completion_tokens, usage.output_tokens);
  const totalTokens = firstFiniteNumber(
    usage.total_tokens,
    Number.isFinite(promptTokens) && Number.isFinite(completionTokens)
      ? promptTokens + completionTokens
      : null
  );
  return {
    ...(Number.isFinite(promptTokens) ? { prompt_tokens: promptTokens } : {}),
    ...(Number.isFinite(completionTokens) ? { completion_tokens: completionTokens } : {}),
    ...(Number.isFinite(totalTokens) ? { total_tokens: totalTokens } : {}),
    ...(Number.isFinite(Number(usage.input_tokens)) ? { input_tokens: Number(usage.input_tokens) } : {}),
    ...(Number.isFinite(Number(usage.output_tokens)) ? { output_tokens: Number(usage.output_tokens) } : {})
  };
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

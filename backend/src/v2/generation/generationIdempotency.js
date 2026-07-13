import crypto from "node:crypto";
import { normalizeGenerationLanguage } from "./generationLanguage.js";

export function normalizeGenerationIdempotencyKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 160);
}

export function hashV2GenerationContent(value) {
  return crypto
    .createHash("sha256")
    .update(String(value || ""), "utf8")
    .digest("hex")
    .slice(0, 32);
}

export function buildV2GenerationIdempotencyKey({
  deviceId = "",
  jobType = "create_chapter",
  sourceUrl = "",
  contentHash = "",
  rawText = "",
  clientRequestId = "",
  generationLanguage = "zh-Hans"
} = {}) {
  const languageKey = `lang:${normalizeGenerationIdempotencyKey(normalizeGenerationLanguage(generationLanguage))}`;
  const explicit = normalizeGenerationIdempotencyKey(clientRequestId);
  if (explicit) return normalizeGenerationIdempotencyKey(`${explicit}:${languageKey}`);

  const sourceKey = sourceUrl
    ? `url:${normalizeUrlForIdempotency(sourceUrl)}`
    : `text:${contentHash || hashV2GenerationContent(rawText)}`;

  return normalizeGenerationIdempotencyKey([
    "v2-generation",
    deviceId,
    jobType,
    languageKey,
    sourceKey
  ].join(":"));
}

function normalizeUrlForIdempotency(url) {
  try {
    const parsed = new URL(String(url));
    parsed.hash = "";
    parsed.searchParams.sort();
    return parsed.toString();
  } catch {
    return String(url || "").trim();
  }
}

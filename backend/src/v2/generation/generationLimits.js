export const DEFAULT_V2_MAX_ARTICLE_CHARS = 50000;

export function readV2MaxArticleChars(env = process.env) {
  const raw = Number(env.V2_MAX_ARTICLE_CHARS);
  return Number.isFinite(raw) && raw > 0
    ? Math.floor(raw)
    : DEFAULT_V2_MAX_ARTICLE_CHARS;
}

export function extractV2ArticleText(input = {}) {
  return String(
    input.cleanedText ||
    input.rawText ||
    input.text ||
    input.body?.cleanedText ||
    input.body?.rawText ||
    input.body?.text ||
    ""
  );
}

export function countV2ArticleChars(text) {
  return Array.from(String(text || "")).length;
}

export function validateV2ArticleInput(input, { maxChars = readV2MaxArticleChars() } = {}) {
  const text = extractV2ArticleText(input);
  const charCount = countV2ArticleChars(text);

  if (charCount > maxChars) {
    return {
      ok: false,
      code: "input_too_long",
      charCount,
      maxChars,
      message: `这篇文章目前太长，建议控制在 ${maxChars} 字以内。`
    };
  }

  return {
    ok: true,
    charCount,
    maxChars
  };
}

export function assertV2ArticleInputWithinLimits(input, options = {}) {
  const validation = validateV2ArticleInput(input, options);
  if (validation.ok) return validation;

  const error = new Error(validation.message);
  error.code = validation.code;
  error.status = "failed_input";
  error.failedStage = "input_validation";
  error.retryable = false;
  error.charCount = validation.charCount;
  error.maxChars = validation.maxChars;
  throw error;
}

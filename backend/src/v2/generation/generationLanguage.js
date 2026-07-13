const SUPPORTED_GENERATION_LANGUAGES = new Set(["zh-Hans", "en"]);

export function normalizeGenerationLanguage(value) {
  const normalized = String(value || "").trim();
  const lower = normalized.toLowerCase().replace(/_/g, "-");
  if (lower === "en" || lower.startsWith("en-") || lower === "english") return "en";
  if (
    lower === "zh" ||
    lower === "zh-hans" ||
    lower === "zh-cn" ||
    lower === "cn" ||
    lower === "chinese" ||
    lower === "simplified-chinese"
  ) {
    return "zh-Hans";
  }
  return "zh-Hans";
}

export function isSupportedGenerationLanguage(value) {
  return SUPPORTED_GENERATION_LANGUAGES.has(value);
}

export function generationLanguageLabel(value) {
  return normalizeGenerationLanguage(value) === "en" ? "English" : "简体中文";
}

export function generationLanguageInstruction(value) {
  const language = normalizeGenerationLanguage(value);
  if (language === "en") {
    return [
      "输出语言：",
      "- 所有用户可见 JSON 字段必须使用 English。",
      "- 用户可见字段包括 chapter title, overview, unit title, unit overview, question stem, options, matching item text, explanation, and unit summary.",
      "- source quote / source block text must preserve original wording and must not be translated.",
      "- Stable ids, enum values, sourceAnchorId, type, relationType, and internal schema fields remain unchanged."
    ].join("\n");
  }

  return [
    "输出语言：",
    "- 所有用户可见 JSON 字段必须使用简体中文。",
    "- 用户可见字段包括章节标题、章节概要、单元标题、单元开场、题干、选项、连线项、解释和单元总结。",
    "- source quote / source block text 保持原文，不要翻译。",
    "- Stable ids, enum values, sourceAnchorId, type, relationType, and internal schema fields remain unchanged."
  ].join("\n");
}

export function visibleTextBudgetInstruction(value, kind = "multiple_choice") {
  const language = normalizeGenerationLanguage(value);
  if (kind === "matching") {
    if (language === "en") {
      return [
        "可见文字长度：",
        "- 题干 target <= 75 characters or <= 12 words.",
        "- 左右两侧连线项 target <= 34 characters or <= 6 words.",
        "- 解释 target <= 95 characters or <= 16 words.",
        "- Prefer compact noun phrases; avoid clause-heavy item text."
      ].join("\n");
    }
    return [
      "可见文字长度：",
      "- 题干控制在 44 个汉字以内。",
      "- 左右两侧连线项控制在 16 个汉字以内。",
      "- 解释控制在 60 个汉字以内。",
      "- 优先使用短名词短语，不要写成长句。"
    ].join("\n");
  }

  if (language === "en") {
    return [
      "可见文字长度：",
      "- 题干 target <= 95 characters or <= 16 words.",
      "- 选项 target <= 48 characters or <= 8 words.",
      "- 解释 target <= 95 characters or <= 16 words.",
      "- Prefer direct, compact wording over clause-heavy sentences."
    ].join("\n");
  }

  return [
    "可见文字长度：",
    "- 题干控制在 60 个汉字以内。",
    "- 选项控制在 28 个汉字以内。",
    "- 解释控制在 60 个汉字以内。",
    "- 优先使用直接、紧凑的表达，不要写成长句。"
  ].join("\n");
}

export function generatedUnitSummaryTitle(value) {
  return normalizeGenerationLanguage(value) === "en" ? "Unit complete" : "单元完成";
}

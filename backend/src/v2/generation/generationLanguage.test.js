import test from "node:test";
import assert from "node:assert/strict";
import {
  generationLanguageInstruction,
  generationLanguageLabel,
  isSupportedGenerationLanguage,
  normalizeGenerationLanguage,
  visibleTextBudgetInstruction
} from "./generationLanguage.js";

test("normalizes supported generation languages", () => {
  assert.equal(normalizeGenerationLanguage("en"), "en");
  assert.equal(normalizeGenerationLanguage("en-US"), "en");
  assert.equal(normalizeGenerationLanguage("en_GB"), "en");
  assert.equal(normalizeGenerationLanguage("English"), "en");
  assert.equal(normalizeGenerationLanguage("zh-Hans"), "zh-Hans");
  assert.equal(normalizeGenerationLanguage("zh-CN"), "zh-Hans");
  assert.equal(normalizeGenerationLanguage("Chinese"), "zh-Hans");
});

test("defaults unsupported generation languages to zh-Hans", () => {
  assert.equal(normalizeGenerationLanguage(""), "zh-Hans");
  assert.equal(normalizeGenerationLanguage(null), "zh-Hans");
  assert.equal(normalizeGenerationLanguage("fr"), "zh-Hans");
});

test("reports supported canonical languages", () => {
  assert.equal(isSupportedGenerationLanguage("en"), true);
  assert.equal(isSupportedGenerationLanguage("zh-Hans"), true);
  assert.equal(isSupportedGenerationLanguage("en-US"), false);
});

test("renders compact language labels", () => {
  assert.equal(generationLanguageLabel("en"), "English");
  assert.equal(generationLanguageLabel("zh-Hans"), "简体中文");
});

test("renders prompt instruction without translating source text", () => {
  const english = generationLanguageInstruction("en");
  assert.match(english, /所有用户可见 JSON 字段必须使用 English/);
  assert.match(english, /source quote \/ source block text must preserve original wording/);

  const chinese = generationLanguageInstruction("zh-Hans");
  assert.match(chinese, /所有用户可见 JSON 字段必须使用简体中文/);
  assert.match(chinese, /source quote \/ source block text 保持原文/);
});

test("renders stricter English visible text budgets", () => {
  const english = visibleTextBudgetInstruction("en", "multiple_choice");
  assert.match(english, /题干 target <= 95 characters or <= 16 words/);
  assert.match(english, /选项 target <= 48 characters or <= 8 words/);

  const chinese = visibleTextBudgetInstruction("zh-Hans", "multiple_choice");
  assert.match(chinese, /题干控制在 60 个汉字以内/);
  assert.match(chinese, /选项控制在 28 个汉字以内/);
});

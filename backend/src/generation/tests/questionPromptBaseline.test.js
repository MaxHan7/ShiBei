import assert from "node:assert/strict";
import test from "node:test";

import { buildUserPrompt } from "../generateQuestions.js";
import { questionSystemPrompt } from "../prompts/questions.js";

test("question prompt stays on the v26 field-standard baseline", () => {
  assert.match(questionSystemPrompt, /产品目标：/);
  assert.match(questionSystemPrompt, /好题原则：/);
  assert.match(questionSystemPrompt, /字段职责：/);
  assert.match(questionSystemPrompt, /输出格式：/);
  assert.match(questionSystemPrompt, /题卡要轻/);
  assert.match(questionSystemPrompt, /干扰项作为一组形成合理判断空间/);
  assert.match(questionSystemPrompt, /sourceSnippet 是原文锚点/);
});

test("question prompt does not include later length experiment notes", () => {
  const userPrompt = buildUserPrompt({
    points: [{
      id: "kp-1",
      title: "测试知识点",
      keyClaim: "测试主张",
      sourceQuote: "测试来源",
      targetQuestionCount: 2,
      preferredQuestionType: "multiple_choice"
    }],
    rewrite: false
  });
  const rewritePrompt = buildUserPrompt({
    points: [{
      id: "kp-1",
      title: "测试知识点",
      keyClaim: "测试主张",
      sourceQuote: "测试来源",
      targetQuestionCount: 1,
      preferredQuestionType: "multiple_choice"
    }],
    rewrite: true,
    rewriteContext: "review_friction_mandatory_rewrite; question_card_too_heavy"
  });
  const combinedPromptText = `${questionSystemPrompt}\n${userPrompt}\n${rewritePrompt}`;
  const forbiddenV27AndLaterPhrases = [
    /场景题只保留一个关键冲突/,
    /不铺完整背景/,
    /需要解释的细节放到 correctUnderstanding/,
    /相近的长度、语气和抽象层级/,
    /输出前做一次题卡正面自检/,
    /题干是否还能删掉背景/,
    /正确选项是否因为更长/,
    /题干能短就短/,
    /约 60 字以内/,
    /正确项和干扰项长度尽量接近/,
    /不要让正确项明显更长或显得更完整/
  ];
  for (const phrase of forbiddenV27AndLaterPhrases) {
    assert.doesNotMatch(combinedPromptText, phrase);
  }
});

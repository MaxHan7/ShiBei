import assert from "node:assert/strict";
import test from "node:test";

import { buildV2PromptMessages } from "./buildV2PromptMessages.js";

const ARTICLE = {
  id: "chapter-001",
  title: "Hook 如何让 AI 工作流稳定",
  author: "MetaTown",
  url: "https://example.com/hook",
  rawText: "Hook 是关键动作前后的流程控制器。它能稳定触发规则、上下文和验证。"
};

test("sourceMap prompt asks for stable source blocks and no question generation", () => {
  const messages = buildV2PromptMessages("sourceMap", { article: ARTICLE });

  assert.match(messages.system, /拾贝 V2/);
  assert.match(messages.user, /sourceMap/);
  assert.match(messages.user, /稳定的 source block/);
  assert.match(messages.user, /不要生成知识点或题目/);
  assert.match(messages.user, /Hook 如何让 AI 工作流稳定/);
  assert.match(messages.user, /Hook 是关键动作前后的流程控制器/);
});

test("reviewPathPlan prompt separates chapter summary and unit summaries", () => {
  const messages = buildV2PromptMessages("reviewPathPlan", {
    article: ARTICLE,
    source: {
      type: "article",
      title: ARTICLE.title,
      author: ARTICLE.author,
      url: ARTICLE.url
    },
    blocks: [
      { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ]
  });

  assert.match(messages.user, /chapter summary 是整章概要/);
  assert.match(messages.user, /unit.shortSummary/);
  assert.match(messages.user, /unit.detailSummary/);
  assert.match(messages.user, /sourceAnchor.blockIds/);
  assert.match(messages.user, /章节完成页鼓励文案/);
});

test("unitCards prompt locks visible question rules", () => {
  const messages = buildV2PromptMessages("unitCards", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    blocks: [
      { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ],
    unit: {
      id: "unit-01",
      title: "Hook 是什么",
      shortSummary: "Hook 是流程控制器。",
      detailSummary: "Hook 在关键动作前后稳定执行规则。",
      sourceAnchor: { id: "anchor-unit-01", blockIds: ["p-001"] }
    }
  });

  assert.match(messages.user, /只生成一个 explanation/);
  assert.match(messages.user, /选择题必须 4 个选项/);
  assert.match(messages.user, /连线题必须左右各 4 项/);
  assert.match(messages.user, /不要输出 correctUnderstanding 或 misconception 给前端/);
});

test("qualityJudge prompt checks source support and UI fitness", () => {
  const messages = buildV2PromptMessages("qualityJudge", {
    article: ARTICLE,
    reviewPath: { id: "chapter-001", units: [] }
  });

  assert.match(messages.user, /source anchor/);
  assert.match(messages.user, /选择题是否只有一个正确答案/);
  assert.match(messages.user, /连线题是否一一对应/);
});

test("unsupported prompt stage fails loudly", () => {
  assert.throws(
    () => buildV2PromptMessages("unknown", {}),
    /Unsupported V2 prompt stage: unknown/
  );
});

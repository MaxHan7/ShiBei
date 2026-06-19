export function buildV2PromptMessages(stage, payload) {
  if (stage === "sourceMap") return buildSourceMapMessages(payload);
  if (stage === "reviewPathPlan") return buildReviewPathPlanMessages(payload);
  if (stage === "unitCards") return buildUnitCardsMessages(payload);
  if (stage === "qualityJudge") return buildQualityJudgeMessages(payload);

  throw new Error(`Unsupported V2 prompt stage: ${stage}`);
}

function baseSystem() {
  return [
    "你是拾贝 V2 的学习路径生成器。",
    "你必须优先遵守产品字段契约：字段要稳定、可验证、可被 SwiftUI 直接消费。",
    "不要输出 Markdown，不要输出解释文字，只输出符合调用方 JSON schema 的对象。"
  ].join("\n");
}

function buildSourceMapMessages({ article }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：sourceMap。",
      "任务：把原文切成稳定的 source block，供后续知识点和题目引用。",
      "要求：",
      "- 每个 block 必须有稳定 id，例如 p-001。",
      "- block.type 只能是 heading、paragraph、quote。",
      "- 保留原文语义顺序。",
      "- 不要生成知识点或题目。",
      "",
      renderArticle(article)
    ].join("\n")
  };
}

function buildReviewPathPlanMessages({ article, source, blocks }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：reviewPathPlan。",
      "任务：生成整章概要、知识点计划、章节完成页鼓励文案。",
      "字段语义：",
      "- chapter summary 是整章概要，解释整篇文章的主旨，不是知识点详情。",
      "- unit.shortSummary 是知识点短摘要，用于章节详情折叠态、节点弹窗和列表预览。",
      "- unit.detailSummary 是知识点完整总结，用于展开态和出题上下文。",
      "- unit.overview 不在本阶段生成，留给 unitCards 阶段。",
      "- 每个 unit.sourceAnchor.blockIds 必须引用 sourceMap 已有 block id。",
      "- chapterSummary.encouragementText 是章节完成页鼓励文案，要结合本章内容，不要空泛。",
      "",
      renderSource(source, blocks),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildUnitCardsMessages({ article, source, blocks, unit }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：unitCards。",
      "任务：为一个知识点生成开场 overview、题目和单元总结。",
      "前端展示规则：",
      "- 只生成一个 explanation，前端答后反馈只展示这一段。",
      "- 不要输出 correctUnderstanding 或 misconception 给前端；如果内部推理需要，也必须合并进 explanation。",
      "- 选择题必须 4 个选项，只有一个正确答案。",
      "- 干扰项必须承载真实误区，不能明显凑数。",
      "- 连线题必须左右各 4 项，pairs 必须一一对应。",
      "- 题干要自足，不要写“根据原文/这篇文章/这里的”。",
      "- 每道题的 sourceAnchorId 必须等于当前 unit.sourceAnchor.id。",
      "",
      `当前 unit:\n${JSON.stringify(unit, null, 2)}`,
      "",
      renderSource(source, blocks),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildQualityJudgeMessages({ article, reviewPath }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：qualityJudge。",
      "任务：检查候选 review path 是否适合进入前端。",
      "检查重点：",
      "- source anchor 是否真实支撑每个知识点和题目。",
      "- 选择题是否只有一个正确答案。",
      "- 干扰项是否有学习价值。",
      "- 连线题是否一一对应，且不是机械同义词匹配。",
      "- explanation 是否短、清晰、能解释题目核心。",
      "- UI 是否能承载：选择题 4 项，连线题左右各 4 项。",
      "",
      renderArticleMeta(article),
      "",
      `候选 reviewPath:\n${JSON.stringify(reviewPath, null, 2)}`
    ].join("\n")
  };
}

function renderArticle(article) {
  return [
    renderArticleMeta(article),
    "",
    "原文：",
    article.rawText || article.cleanedText || ""
  ].join("\n");
}

function renderArticleMeta(article) {
  return [
    `文章 id：${article.id || ""}`,
    `标题：${article.title || article.sourceTitle || ""}`,
    `作者：${article.author || ""}`,
    `链接：${article.url || ""}`
  ].join("\n");
}

function renderSource(source, blocks = []) {
  return [
    `source:\n${JSON.stringify(source || {}, null, 2)}`,
    `blocks:\n${JSON.stringify(blocks, null, 2)}`
  ].join("\n");
}

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

test("article meta supports extracted sourceAccount and sourceUrl aliases", () => {
  const messages = buildV2PromptMessages("sourceMap", {
    article: {
      id: "chapter-002",
      sourceTitle: "外部提取文章",
      sourceAccount: "晚点再听LaterCast",
      sourceUrl: "https://mp.weixin.qq.com/s/example",
      rawText: "正文"
    }
  });

  assert.match(messages.user, /标题：外部提取文章/);
  assert.match(messages.user, /作者：晚点再听LaterCast/);
  assert.match(messages.user, /链接：https:\/\/mp\.weixin\.qq\.com\/s\/example/);
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
  assert.match(messages.user, /unit.nodeLabel/);
  assert.match(messages.user, /unit.shortSummary/);
  assert.match(messages.user, /unit.detailSummary/);
  assert.match(messages.user, /sourceAnchor 必须包含稳定 id/);
  assert.match(messages.user, /sourceAnchor.blockIds/);
  assert.match(messages.user, /章节完成页鼓励文案/);
});

test("unitPracticePlan prompt uses evidence value instead of fixed question counts", () => {
  const messages = buildV2PromptMessages("unitPracticePlan", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    blocks: [
      { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ],
    unit: {
      id: "unit-01",
      title: "Hook 是什么",
      nodeLabel: "流程控制",
      shortSummary: "Hook 是流程控制器。",
      detailSummary: "Hook 在关键动作前后稳定执行规则。",
      sourceAnchor: { id: "anchor-unit-01", blockIds: ["p-001"] }
    }
  });

  assert.match(messages.user, /unitPracticePlan/);
  assert.match(messages.user, /questionPlans 不写死数量/);
  assert.match(messages.user, /learningClaim \/ evidenceNeed/);
  assert.match(messages.user, /模型层级 -> 设计作用/);
  assert.match(messages.user, /避免空泛“名词 -> 定义\/贡献\/描述”的机械配对/);
});

test("ecdPlanning prompt asks for ECD claims evidence and task planning without drafting questions", () => {
  const messages = buildV2PromptMessages("ecdPlanning", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    blocks: [
      { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ],
    plan: {
      title: ARTICLE.title,
      summaryCard: { text: "Hook 把关键动作变成稳定流程。" },
      units: [unitFixture()],
      chapterSummary: { encouragementText: "你已经理解 Hook 的流程价值。" }
    }
  });

  assert.match(messages.user, /ecdPlanning/);
  assert.match(messages.user, /Evidence-Centered Design/);
  assert.match(messages.user, /learningClaim/);
  assert.match(messages.user, /evidenceNeed/);
  assert.match(messages.user, /taskPlan/);
  assert.match(messages.user, /本阶段不生成用户可见题目/);
  assert.match(messages.user, /题目数量不写死/);
  assert.match(messages.user, /DMC 这类“模型层级 -> 设计作用”/);
});

test("multipleChoiceDraft prompt requires misconception-first distractors", () => {
  const messages = buildV2PromptMessages("multipleChoiceDraft", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    blocks: [
      { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ],
    unit: unitFixture(),
    practicePlan: practicePlanFixture()
  });

  assert.match(messages.user, /multipleChoiceDraft/);
  assert.match(messages.user, /生成 correctUnderstanding/);
  assert.match(messages.user, /生成 misconception/);
  assert.match(messages.user, /不能写“根据本文\/根据文章\/根据原文/);
  assert.match(messages.user, /正确选项不能明显更长/);
  assert.match(messages.user, /不要写“正确选项A\/B\/C\/D”/);
});

test("matchingDraft prompt only allows relation-value matching", () => {
  const messages = buildV2PromptMessages("matchingDraft", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    blocks: [
      { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ],
    unit: unitFixture(),
    practicePlan: practicePlanFixture()
  });

  assert.match(messages.user, /matchingDraft/);
  assert.match(messages.user, /职责、边界、使用时机、场景作用、验证维度或流程信号/);
  assert.match(messages.user, /禁止只做“概念\/名词\/人物\/案例 -> 定义\/贡献\/描述\/特征”/);
});

test("unitSummaryDraft prompt separates overview from first answer", () => {
  const messages = buildV2PromptMessages("unitSummaryDraft", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    blocks: [
      { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ],
    unit: unitFixture(),
    practicePlan: practicePlanFixture(),
    questions: []
  });

  assert.match(messages.user, /unitSummaryDraft/);
  assert.match(messages.user, /不能把第一题答案原样写成开场/);
  assert.match(messages.user, /只总结当前知识点/);
});

test("qualityJudge prompt checks source support and UI fitness", () => {
  const messages = buildV2PromptMessages("qualityJudge", {
    article: ARTICLE,
    reviewPath: { id: "chapter-001", units: [] }
  });

  assert.match(messages.user, /source anchor/);
  assert.match(messages.user, /选择题是否只有一个正确答案/);
  assert.match(messages.user, /连线题是否一一对应/);
  assert.match(messages.user, /发现上述任一严重问题时 verdict 必须是 revise 或 discard/);
});

test("unsupported prompt stage fails loudly", () => {
  assert.throws(
    () => buildV2PromptMessages("unknown", {}),
    /Unsupported V2 prompt stage: unknown/
  );
});

function unitFixture() {
  return {
    id: "unit-01",
    title: "Hook 是什么",
    nodeLabel: "流程控制",
    shortSummary: "Hook 是流程控制器。",
    detailSummary: "Hook 在关键动作前后稳定执行规则。",
    sourceAnchor: { id: "anchor-unit-01", blockIds: ["p-001"] }
  };
}

function practicePlanFixture() {
  return {
    unitId: "unit-01",
    practiceGoals: [
      {
        id: "goal-01",
        kind: "core_understanding",
        target: "理解 Hook 是流程约束",
        commonMisconception: "把 Hook 当成更长提示词",
        sourceAnchorId: "anchor-unit-01"
      }
    ],
    questionPlans: [
      {
        id: "q-001",
        type: "multiple_choice",
        purpose: "light_understanding",
        practiceGoalId: "goal-01",
        sourceAnchorId: "anchor-unit-01"
      }
    ]
  };
}

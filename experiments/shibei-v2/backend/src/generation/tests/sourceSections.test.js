import assert from "node:assert/strict";
import test from "node:test";

import { chunkContent } from "../chunkContent.js";
import { filterKnowledgePoints } from "../filterKnowledgePoints.js";
import { isLeadSummarySource } from "../sourceSections.js";

const cleanedText = [
  "Markdown 计划太长了，我老实说已经不读了。",
  "你说 Claude 可以跑 8 小时，其实是在说 Claude 可以花掉 500 美元。",
  "HTML 更容易读，是你和 Claude 之间更丰富的沟通媒介。",
  "",
  "作者真正讨论的是，HTML 计划比 Markdown 计划更适合人机协作，因为它能把任务拆解、状态、交互和交付物放在同一个可视界面里，降低人和模型之间的沟通损耗。",
  "当团队把 AI 当成执行者时，过长的 Markdown 文档会让上下文变得难以检查；而 HTML 原型能让人直接在界面上审阅结构、发现遗漏并调整需求。"
].join("\n");

test("marks opening teaser paragraphs as lead summary chunks", () => {
  const chunks = chunkContent(cleanedText);

  assert.equal(chunks[0].chunkType, "lead_summary");
  assert.equal(chunks[0].sourceRole, "lead_summary");
  assert.equal(chunks[2].sourceRole, "lead_summary");
  assert.equal(chunks[3].sourceRole, "body");
});

test("detects source quotes that only appear in the lead summary", () => {
  assert.equal(
    isLeadSummarySource(cleanedText, "HTML 更容易读，是你和 Claude 之间更丰富的沟通媒介。"),
    true
  );
  assert.equal(
    isLeadSummarySource(cleanedText, "HTML 计划比 Markdown 计划更适合人机协作"),
    false
  );
});

test("allows lead claims when the same quote is expanded later in body", () => {
  const repeated = [
    "HTML 更容易读，是你和 Claude 之间更丰富的沟通媒介。",
    "",
    "文章后半部分再次强调，HTML 更容易读，是你和 Claude 之间更丰富的沟通媒介。原因是 HTML 能把需求、状态和反馈压进一个可检查的界面。"
  ].join("\n");

  assert.equal(isLeadSummarySource(repeated, "HTML 更容易读，是你和 Claude 之间更丰富的沟通媒介。"), false);
});

test("filters knowledge points anchored only to lead summary text", () => {
  const candidates = [
    {
      title: "导读句不应直接出题",
      knowledgeType: "judgment",
      summary: "HTML 更容易读。",
      keyClaim: "HTML 更容易读，是更丰富的沟通媒介。",
      sourceQuote: "HTML 更容易读，是你和 Claude 之间更丰富的沟通媒介。",
      testabilityReason: "可测试",
      questionAngles: ["判断来源"],
      testabilityScore: 4
    },
    {
      title: "HTML 原型降低沟通损耗",
      knowledgeType: "method",
      summary: "HTML 计划通过可视界面降低人机沟通损耗。",
      keyClaim: "HTML 计划比 Markdown 计划更适合人机协作。",
      sourceQuote: "HTML 计划比 Markdown 计划更适合人机协作，因为它能把任务拆解、状态、交互和交付物放在同一个可视界面里，降低人和模型之间的沟通损耗。",
      testabilityReason: "可测试",
      questionAngles: ["原因判断"],
      testabilityScore: 4
    }
  ];

  const result = filterKnowledgePoints(candidates, cleanedText);

  assert.equal(result.kept.length, 1);
  assert.equal(result.kept[0].title, "HTML 原型降低沟通损耗");
  assert.equal(result.filtered.length, 1);
  assert.deepEqual(result.filtered[0].filterReasons, ["lead_summary_source"]);
});

test("filters low-value structure roles and low-importance cases", () => {
  const body = "核心观点是 HTML 原型能降低人机协作成本。案例说明，团队通过可视化界面发现计划遗漏。背景资料只是工具名称。";
  const candidates = [
    candidate({
      id: "main",
      title: "HTML 原型降低协作成本",
      structureRole: "main_claim",
      importanceScore: 5,
      sourceQuote: "核心观点是 HTML 原型能降低人机协作成本。"
    }),
    candidate({
      id: "detail",
      title: "工具名称背景",
      structureRole: "detail",
      importanceScore: 5,
      sourceQuote: "背景资料只是工具名称。"
    }),
    candidate({
      id: "case",
      title: "低重要度案例",
      structureRole: "case_evidence",
      importanceScore: 3,
      sourceQuote: "案例说明，团队通过可视化界面发现计划遗漏。"
    })
  ];

  const result = filterKnowledgePoints(candidates, body);

  assert.deepEqual(result.kept.map((point) => point.id), ["main"]);
  assert.equal(result.filtered.find((point) => point.id === "detail").filterReasons[0], "low_structure_value");
  assert.equal(result.filtered.find((point) => point.id === "case").filterReasons[0], "low_importance_case");
});

test("repairs discontinuous source quotes by locating a relevant body paragraph", () => {
  const body = [
    "Prompt 负责告诉 AI 怎么思考，CLAUDE.md 负责沉淀项目长期规则。",
    "Hook 管事件发生时必须执行的动作，CI 管进入主干前的最终裁判。四者不能互相替代。"
  ].join("\n");
  const result = filterKnowledgePoints([
    candidate({
      id: "boundary",
      title: "Hook、Prompt、CLAUDE.md、CI 的分工边界",
      structureRole: "main_claim",
      importanceScore: 4,
      keyClaim: "Prompt、CLAUDE.md、hook 和 CI 有清晰分工，不能相互替代。",
      summary: "Prompt 管思考方式，CLAUDE.md 管长期背景，hook 管事件动作，CI 管最终门槛。",
      sourceQuote: "Prompt 管思考。CLAUDE.md 管背景。Hook 管动作。CI 管最终裁判。"
    })
  ], body);

  assert.equal(result.kept.length, 1);
  assert.equal(result.kept[0].sourceQuoteWasRepaired, true);
  assert.equal(result.kept[0].sourceQuote.includes("CI 管进入主干前的最终裁判"), true);
  assert.equal(result.filtered.length, 0);
});

test("does not repair unsupported knowledge points with unrelated source text", () => {
  const result = filterKnowledgePoints([
    candidate({
      id: "unsupported",
      title: "Hook、Prompt、CLAUDE.md、CI 的分工边界",
      structureRole: "main_claim",
      importanceScore: 4,
      keyClaim: "Prompt、CLAUDE.md、hook 和 CI 有清晰分工，不能相互替代。",
      summary: "Prompt 管思考方式，CLAUDE.md 管长期背景，hook 管事件动作，CI 管最终门槛。",
      sourceQuote: "Prompt 管思考。CLAUDE.md 管背景。Hook 管动作。CI 管最终裁判。"
    })
  ], "这段正文只讨论产品定价、用户访谈和市场定位，没有任何工程工具分工。");

  assert.equal(result.kept.length, 0);
  assert.equal(result.filtered[0].filterReasons.includes("source_not_supported"), true);
});

test("trims short overlong candidate sets by mainline priority without dropping the core claim", () => {
  const body = Array.from({ length: 10 }, (_, index) => `短文第${index + 1}点说明AI计划价值。`).join("\n");
  const candidates = [
    candidate({
      id: "kp-main",
      title: "核心主干",
      structureRole: "main_claim",
      importanceScore: 5,
      sourceQuote: "短文第1点说明AI计划价值。"
    }),
    ...Array.from({ length: 9 }, (_, index) => candidate({
      id: `kp-${index + 2}`,
      title: `支撑点 ${index + 2}`,
      structureRole: index < 4 ? "method_step" : "supporting_reason",
      importanceScore: index < 7 ? 4 : 3,
      sourceQuote: `短文第${index + 2}点说明AI计划价值。`
    }))
  ];

  const result = filterKnowledgePoints(candidates, body);

  assert.equal(result.kept.length, 4);
  assert.ok(result.kept.some((point) => point.id === "kp-main"));
  assert.equal(result.filtered.filter((point) => point.filterReasons.includes("mainline_priority_trimmed")).length, 6);
});

test("allows more knowledge points for long dense articles", () => {
  const body = Array.from({ length: 12 }, (_, index) => (
    `第 ${index + 1} 段说明一个可复习观点，并补充足够的论证、应用场景、反例和方法边界，让这篇长文需要更多知识点才能重建文章主线。这个段落继续展开不同的实践条件、判断原则和迁移场景，避免把多个必要节点压缩成一个知识点。`
    + "它还补充了团队协作、成本控制、风险识别和复盘方式，说明该节点不是局部细节，而是长文中独立承担理解功能的一段论证。"
    + "如果删除这个节点，用户就难以理解前后观点如何连接，也难以把文章里的方法迁移到真实工作场景。"
    + "因此这个节点需要被单独保留。"
  )).join("\n");
  const candidates = Array.from({ length: 12 }, (_, index) => candidate({
    id: `kp-${index + 1}`,
    title: index === 0 ? "核心主干" : `长文必要节点 ${index + 1}`,
    structureRole: index === 0 ? "main_claim" : "method_step",
    importanceScore: 4,
    sourceQuote: `第 ${index + 1} 段说明一个可复习观点`
  }));

  const result = filterKnowledgePoints(candidates, body);

  assert.equal(result.kept.length, 12);
  assert.equal(result.filtered.filter((point) => point.filterReasons.includes("mainline_priority_trimmed")).length, 0);
});

function candidate(overrides = {}) {
  return {
    id: overrides.id || "kp",
    title: overrides.title || "知识点",
    knowledgeType: "method",
    summary: overrides.summary || overrides.title || "知识点摘要",
    keyClaim: overrides.keyClaim || `${overrides.title || "知识点"}是文章中值得复习的完整主张`,
    sourceQuote: overrides.sourceQuote,
    testabilityReason: "可测试",
    structureRole: overrides.structureRole,
    importanceScore: overrides.importanceScore,
    coverageReason: "覆盖文章主线",
    questionAngles: ["理解判断"],
    testabilityScore: 4
  };
}

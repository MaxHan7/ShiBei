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

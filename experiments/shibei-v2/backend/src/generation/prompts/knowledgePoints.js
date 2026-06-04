export const knowledgePointSystemPrompt = `你是拾贝的知识点提取器。你的任务不是总结全文，而是把用户提供的内容转成可复习、可出题、可追溯来源的知识点。

严格遵守：
1. 知识点不能只是原文摘抄，要表达成适合记忆和测试的判断。
2. 每个知识点必须有 sourceQuote，且 sourceQuote 必须来自输入文本。
3. MVP 采用“主线 + 可用方法型”：优先覆盖文章核心主线，再保留可迁移的方法、判断原则和适用场景，少量保留关键误区和边界。
4. 知识点数量必须随内容密度变化，不要硬凑固定数量。短内容可以只有 1-3 个，普通文章通常 4-8 个，长文、清单、访谈或多段论证可以更多；但不要把好出题却不关键的局部细节入池。
5. 优先保留概念边界、方法原则、适用场景、常见误区、反例、对比、步骤。
6. 过滤纯情绪表达、孤立句、常识、碎片细节和来源无法支撑的推断。
7. 如果文章是清单、步骤、案例或多个机会点结构，要覆盖主要结构，不要只抽开头或总结段。
8. 输入块标记为 lead_summary 的内容是文章开头导读、金句摘录或编辑摘要。它可以帮助你理解文章主题，但不能作为 sourceQuote，也不能单独生成知识点。
9. 如果某个观点先出现在 lead_summary 中，必须找到正文 body 里真正展开解释、论证或举例的段落，并用那里的原文作为 sourceQuote；如果正文没有展开，就不要提取这个知识点。
10. 为每个候选标注 structureRole：main_claim 表示核心主干观点；supporting_reason 表示支撑理由；method_step 表示可迁移方法、原则或适用场景；boundary 表示误区、边界或反例；case_evidence 表示承载核心论证的关键案例；background/detail 通常不应入池。
11. importanceScore 表示该点对文章主线和用户复习价值的重要度，不是单纯可出题程度。
12. coverageReason 必须说明为什么这个点值得进入复习池，或为什么只是候选。`;

export const knowledgePointSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    chapterTitle: { type: "string" },
    candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          knowledgeType: {
            type: "string",
            enum: ["concept", "judgment", "method", "scenario", "counterexample", "comparison", "step"]
          },
          summary: { type: "string" },
          keyClaim: { type: "string" },
          sourceQuote: { type: "string" },
          testabilityReason: { type: "string" },
          structureRole: {
            type: "string",
            enum: ["main_claim", "supporting_reason", "method_step", "boundary", "case_evidence", "background", "detail"]
          },
          importanceScore: { type: "number", minimum: 1, maximum: 5 },
          coverageReason: { type: "string" },
          questionAngles: {
            type: "array",
            items: { type: "string" }
          },
          testabilityScore: { type: "number", minimum: 1, maximum: 5 }
        },
        required: [
          "title",
          "knowledgeType",
          "summary",
          "keyClaim",
          "sourceQuote",
          "testabilityReason",
          "structureRole",
          "importanceScore",
          "coverageReason",
          "questionAngles",
          "testabilityScore"
        ]
      }
    }
  },
  required: ["chapterTitle", "candidates"]
};

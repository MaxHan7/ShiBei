export const knowledgePointSystemPrompt = `你是拾贝的知识点提取器。你的任务不是总结全文，而是把用户提供的内容转成可复习、可出题、可追溯来源的知识点。

严格遵守：
1. 知识点不能只是原文摘抄，要表达成适合记忆和测试的判断。
2. 每个知识点必须有 sourceQuote，且 sourceQuote 必须来自输入文本。
3. 优先保留概念边界、方法原则、适用场景、常见误区、反例、对比、步骤。
4. 过滤纯情绪表达、孤立句、常识、碎片细节和来源无法支撑的推断。
5. 输出 3 到 8 个知识点。内容确实不足时可以少于 3 个。`;

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
          testabilityScore: { type: "number", minimum: 1, maximum: 5 }
        },
        required: ["title", "knowledgeType", "summary", "keyClaim", "sourceQuote", "testabilityScore"]
      }
    }
  },
  required: ["chapterTitle", "candidates"]
};

export const questionSystemPrompt = `你是拾贝的出题器。请根据知识点和来源片段生成能检验理解的复习题，而不是原文填空。
严格遵守：
1. 题型只能是 multiple_choice、true_false、scenario_judgment。
2. 概念辨析用 multiple_choice 承载。
3. 判断题固定选项为“成立 / 不成立”。
4. 每题必须有正确答案、正确理解、常见误区、来源片段。
5. sourceSnippet 必须逐字来自知识点 sourceQuote 或原文。
6. 题干避免直接问“原文提到了什么”，优先考场景、边界、误区、对比、迁移应用。
7. 干扰项要合理但明确错误，不能用明显凑数的无关选项。`;

export const questionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          knowledgePointId: { type: "string" },
          type: { type: "string", enum: ["multiple_choice", "true_false", "scenario_judgment"] },
          stem: { type: "string" },
          options: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                text: { type: "string" }
              },
              required: ["id", "text"]
            }
          },
          correctOptionId: { type: "string" },
          explanation: { type: "string" },
          correctUnderstanding: { type: "string" },
          commonMisconception: { type: "string" },
          sourceSnippet: { type: "string" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] }
        },
        required: [
          "knowledgePointId",
          "type",
          "stem",
          "options",
          "correctOptionId",
          "explanation",
          "correctUnderstanding",
          "commonMisconception",
          "sourceSnippet",
          "difficulty"
        ]
      }
    }
  },
  required: ["questions"]
};

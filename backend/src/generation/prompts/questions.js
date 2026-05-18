export const questionSystemPrompt = `你是拾贝的出题器。请根据知识点和来源片段生成能检验理解的复习题，而不是原文填空。
严格遵守：
1. 题型只能是 multiple_choice、true_false、scenario_judgment。
2. 每个输入知识点都至少返回 1 道结构完整题，不要跳过任何知识点。
3. multiple_choice：固定 4 个选项，1 个正确答案，3 个错误选项。
4. scenario_judgment：固定 4 个选项，题干给出具体场景，选项是 4 种行动方案、判断方式或处理策略；禁止输出“成立 / 不成立”二选一。
5. true_false：只用于适合直接判断成立/不成立的简单判断型知识点，固定两个选项：A 成立，B 不成立；如果需要解释原因、路径、策略或应用场景，应使用 scenario_judgment。
6. 每题必须有正确答案、正确理解、常见误区、来源片段。
7. sourceSnippet 优先逐字来自知识点 sourceQuote 或原文；如果不确定怎么截取，直接使用完整 sourceQuote。
8. 每道题先围绕一个真实误解设计干扰项：错误选项必须贴近同一业务语境，分别代表不同误解，不能是无关项、极端项、文字游戏项或一眼排除项。
9. 题干避免直接问“原文提到了什么”，优先考场景、边界、误区、对比、迁移应用。
10. 同一知识点多道题必须考不同角度，不要重复问法。`;

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

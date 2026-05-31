export const questionSystemPrompt = `你是拾贝的出题器。你的任务是把文章里的高价值知识点变成清楚、可信、适合手机上随手复习的题目。

产品原则：
- 好题宁少勿凑。每个知识点通常 1-2 道题就够；只有非常关键、证据充足、角度自然的知识点才需要第 3 道。
- 题目必须帮助用户判断自己是否理解了原文，而不是做关键词识别或原文填空。
- 来源片段必须来自原文或知识点 sourceQuote，不能改写、扩写或编造。
- 题卡要轻：题干只放必要判断条件，选项短而可比较；复杂背景、证据链和完整解释放到答后解释里。
- 轻量不等于低质量；答案必须唯一，错误选项必须贴近真实误解，解释必须忠实于来源。

题目结构规则：
1. 题型只能是 multiple_choice、true_false、scenario_judgment。
2. 每个输入知识点都至少返回 1 道结构完整题，不要跳过任何知识点。
3. multiple_choice：固定 4 个选项，1 个正确答案，3 个错误选项。
4. scenario_judgment：固定 4 个选项，题干给出具体场景，选项是 4 种行动方案、判断方式或处理策略；禁止输出“成立 / 不成立”二选一。
5. true_false：只用于适合直接判断成立/不成立的简单判断型知识点，固定两个选项：A 成立，B 不成立；如果需要解释原因、路径、策略或应用场景，应使用 scenario_judgment。
6. 每题必须有正确答案、正确理解、常见误区、来源片段。
7. sourceSnippet 优先逐字来自知识点 sourceQuote 或原文；如果不确定怎么截取，直接使用完整 sourceQuote。
8. 错误选项必须贴近同一语境里的真实误解，不能是无关项、极端项、文字游戏项或一眼排除项。
9. 题干避免直接问“原文提到了什么”，优先考场景、边界、误区、对比、迁移应用。
10. 正确答案位置要自然分散，不要固定放在 B。
11. 同一知识点多道题要考不同角度，不要换壳重复。
12. memoryAngle 只用来说明练习意图：core_understanding（核心理解）、misconception_boundary（误区/边界辨析）、scenario_application（场景迁移）。题型服务这个意图，不要反过来为了题型牺牲自然度。
13. 遇到多义术语时，必须按文章语境理解，不要套用其它领域含义。
14. 场景题只保留关键变量：一个角色、一个冲突或一个决策点即可；不参与判断的背景不要写进题干。
15. 选项是判断对象，不是解释段落；每个选项应短、清楚、可比较，不要把“为什么对/为什么错”写进选项。

输出格式规则：
- blueprintItemId 如果输入知识点带有 practiceBlueprint，就填对应 id；否则填空字符串。
- blueprintGoal 用一句话说明这道题训练什么理解动作，不要复述题干。
- 如果无法生成可靠题目，宁可少出题，也不要凑数。`;

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
          memoryAngle: { type: "string", enum: ["core_understanding", "misconception_boundary", "scenario_application"] },
          blueprintItemId: { type: "string" },
          blueprintGoal: { type: "string" },
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
          "memoryAngle",
          "blueprintItemId",
          "blueprintGoal",
          "difficulty"
        ]
      }
    }
  },
  required: ["questions"]
};

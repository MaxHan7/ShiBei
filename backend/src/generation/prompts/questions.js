export const questionSystemPrompt = `你是拾贝的出题器。把文章里的高价值知识点变成清楚、可信、适合手机上随手复习的题目。

1. 好题标准
- 可信：答案唯一，解释忠实于来源，不扩写原文没有支持的判断。
- 有效：考用户是否理解核心主张、边界误区或迁移用法，不做关键词识别和原文填空。
- 轻量：题干只放必要判断条件，选项短而可比较；背景、证据链和完整解释放到答后解释里。推荐题干 15-45 个中文字符，选项 8-24 个中文字符。
- 真实：错误选项贴近同一语境里的真实误解，不用无关项、极端项或一眼排除项。
- 克制：宁可少出题，也不要凑重复题、无来源题或答案不唯一的题。

2. 题量策略
- targetQuestionCount 是温和目标：优先尝试覆盖目标数量，不是硬凑，也不是默认上限。
- targetQuestionCount 为 2 或 3 时，尽量生成不同角度；只有会重复、无来源或答案不唯一时才少出。

3. 练习意图
- memoryAngle 只表示练习意图：core_understanding（核心理解）、misconception_boundary（误区/边界辨析）、scenario_application（场景迁移）。
- 题型服务 memoryAngle，不要为了题型牺牲自然度；同一知识点多题必须考不同角度。

4. 题型契约
- multiple_choice：A/B/C/D 四个选项，只有一个正确答案。
- scenario_judgment：A/B/C/D 四个行动方案、判断方式或处理策略；题干只给一个角色、冲突或决策点；禁止写成“成立 / 不成立”。
- true_false：只用于简单成立/不成立判断，固定 A 成立、B 不成立；需要原因、路径、策略或应用场景时改用 scenario_judgment。

5. 输出字段
- 每题必须填写 correctUnderstanding、commonMisconception、explanation、sourceSnippet、memoryAngle、blueprintGoal。
- sourceSnippet 必须逐字来自原文或知识点 sourceQuote；不确定时直接使用完整 sourceQuote，不要改写。
- blueprintGoal 用一句话说明这道题训练什么理解动作，不要复述题干。`;

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

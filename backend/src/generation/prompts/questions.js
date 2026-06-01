export const questionSystemPrompt = `你是拾贝的出题器。拾贝不是考试工具，也不是摘要工具；它把文章中值得记住的知识点，变成用户可以在手机上轻松复习、真正理解和回忆的题目。

核心目标：
- 题目来自知识点，知识点来自原文；不要脱离文章自由发挥。
- 题目检查理解，而不是检查用户是否记住原文措辞。
- 题卡要轻：题干和选项只放做判断所需的信息；更完整的解释和来源放在答后。
- 来源建立信任：sourceSnippet 必须来自原文或知识点 sourceQuote，能够支撑题目和解释。
- 宁可少出可靠题，也不要为了数量生成重复、含糊、无来源或多个答案都说得通的题。

好题标准：
1. 围绕一个知识点的明确主张、边界、误区或应用场景出题，不把多个无关概念塞进一道题。
2. 正确答案必须唯一；错误选项要像真实误解，而不是无关项、极端项或一眼排除项。
3. 如果题目练习误区或边界，题干要直接呈现需要区分的两个相邻概念、场景或判断边界；不要只靠选项制造难度。
4. 解释说明为什么正确答案成立，并指出常见误区；不能编造原文没有支持的结论。
5. 如果一个知识点需要多道题，它们应该从不同理解角度帮助用户复习，而不是换壳重复。
6. 遇到多义术语时，只按本文语境理解，不套用其它领域含义。

题型格式：
- multiple_choice：A/B/C/D 四个选项，只有一个正确答案。
- scenario_judgment：A/B/C/D 四个选项，题干给一个简短场景，选项是行动方案、判断方式或处理策略。
- true_false：只用于简单判断题，固定 A 成立、B 不成立。

字段说明：
- correctUnderstanding：用简短话说明用户应该形成的正确理解。
- commonMisconception：写一个具体误解，最好能对应错误选项。
- explanation：答后解释，忠实于来源，不重复题干。
- sourceSnippet：使用原文或 sourceQuote 中足以支撑本题的片段；不要改写。
- memoryAngle：只作轻量标注，可选 core_understanding、misconception_boundary、scenario_application。
- blueprintItemId 和 blueprintGoal 没有明确输入时填空字符串。`;

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

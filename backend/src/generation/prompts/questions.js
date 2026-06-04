export const questionSystemPrompt = `你是拾贝的出题器。拾贝把用户收藏的文章知识，转成手机上轻量、可信、能帮助理解和回忆的复习题。

产品目标：
- 题目必须来自给定知识点和原文锚点，不脱离文章自由发挥。
- 题目考用户是否理解知识点，不考用户是否背下原文措辞。
- 题卡要轻：题干和选项只承载必要判断，背景、证据和解释放到答后字段。
- 宁可少出可靠题，也不要为了数量生成重复、含糊、无来源或多答案题。

好题原则：
- 知识点值得复习：能帮助用户重建文章核心理解，而不是零散细节。
- 题干进入快：用户读完能立刻知道在判断什么，不用先理解一大段背景。
- 正确答案准确、唯一、自然；不要靠更长、更专业、更完整来暴露自己。
- 干扰项作为一组形成合理判断空间；允许一个较明显的排除项，但不能凑数、重复或产生第二正确答案。
- 常见误区应先于干扰项成立，至少能被一个干扰项承载；没有自然误区时不要硬编。
- sourceSnippet 是原文锚点：位置要准、长度适中、必须来自原文或 sourceQuote，不承担完整解释任务。

字段职责：
- stem：提出一个清楚、轻量的理解判断，避免“根据文章 / 文章指出”这类模板腔。
- correctUnderstanding：轻度展开正确答案，说明为什么它对。
- commonMisconception：说明用户可能混淆的点；如果不自然，可写成简短混淆提醒。
- explanation：答后解释，连接题干、正确答案和知识点，不编造来源外结论。
- sourceSnippet：使用原文锚点，不改写、不总结。
- memoryAngle：轻量标注，可选 core_understanding、misconception_boundary、scenario_application。
- blueprintItemId 和 blueprintGoal 没有明确输入时填空字符串。

输出格式：
- multiple_choice：A/B/C/D 四个选项，只有一个正确答案。
- scenario_judgment：A/B/C/D 四个选项，题干给一个简短场景，选项是行动方案、判断方式或处理策略。
- true_false：只用于简单判断题，固定 A 成立、B 不成立。`;

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

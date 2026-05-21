import assert from "node:assert/strict";
import test from "node:test";

import { evaluateQuestions } from "../evaluateQuestions.js";
import { selectQualifiedQuestionsByPoint } from "../index.js";

const point = {
  id: "kp-1",
  title: "测试知识点",
  testabilityScore: 4,
  knowledgeType: "concept",
  sourceQuote: "这是一段可以支撑题目的来源片段。"
};

function question(overrides = {}) {
  return {
    id: overrides.id || "q-1",
    knowledgePointId: "kp-1",
    type: "multiple_choice",
    stem: "在一个具体场景中，哪种理解最符合这个知识点？",
    options: [
      { id: "A", text: "把来源主张迁移到具体场景中判断" },
      { id: "B", text: "只记住来源里的几个关键词" },
      { id: "C", text: "忽略题目场景直接照搬原句" },
      { id: "D", text: "根据常识补充原文没有的结论" }
    ],
    correctOptionId: "A",
    explanation: "正确理解能把来源片段里的主张迁移到具体判断场景。",
    correctUnderstanding: "这个知识点强调要从来源片段里的关键主张出发，判断具体场景是否符合原文逻辑。",
    commonMisconception: "常见误区是只记住关键词，而没有理解来源片段支撑的判断边界。",
    sourceSnippet: "这是一段可以支撑题目的来源片段。",
    qualityAction: "pass",
    qualityIssues: [],
    qualityScore: {
      sourceSupport: 5,
      answerUniqueness: 5,
      understandingDepth: 4,
      clarity: 5,
      distractorQuality: 4,
      reviewValue: 4,
      average: 4.5
    },
    ...overrides
  };
}

test("selects the highest-scoring pass question first", () => {
  const selected = selectQualifiedQuestionsByPoint([point], [
    question({ id: "rewrite-high", qualityAction: "rewrite", qualityScore: { ...question().qualityScore, average: 4.9 } }),
    question({ id: "pass-low", qualityAction: "pass", qualityScore: { ...question().qualityScore, average: 4.1 } }),
    question({ id: "pass-high", qualityAction: "pass", qualityScore: { ...question().qualityScore, average: 4.8 } })
  ]);

  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, "pass-high");
  assert.equal(selected[0].confidenceLevel, "high");
});

test("retains the best rewrite question as low confidence when no pass question exists", () => {
  const selected = selectQualifiedQuestionsByPoint([point], [
    question({ id: "rewrite-low", qualityAction: "rewrite", qualityScore: { ...question().qualityScore, average: 3.4 } }),
    question({ id: "rewrite-high", qualityAction: "rewrite", qualityScore: { ...question().qualityScore, average: 4.2 } })
  ]);

  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, "rewrite-high");
  assert.equal(selected[0].confidenceLevel, "low");
  assert.equal(selected[0].retainedBy, "best_effort_quality_fallback");
});

test("does not retain discard questions", () => {
  const selected = selectQualifiedQuestionsByPoint([point], [
    question({ id: "discarded", qualityAction: "discard", qualityScore: { ...question().qualityScore, average: 4.9 } })
  ]);

  assert.equal(selected.length, 0);
});

test("does not retain structurally invalid rewrite questions", () => {
  const selected = selectQualifiedQuestionsByPoint([point], [
    question({
      id: "bad-options",
      qualityAction: "rewrite",
      options: [{ id: "A", text: "只有一个选项" }],
      qualityIssues: ["non_binary_question_requires_four_options"]
    }),
    question({
      id: "bad-answer",
      qualityAction: "rewrite",
      correctOptionId: "Z"
    })
  ]);

  assert.equal(selected.length, 0);
});

test("retains question type mismatch as low confidence instead of blocking coverage", () => {
  const evaluated = evaluateQuestions({
    questions: [
      question({
        id: "type-mismatch",
        type: "scenario_judgment",
        sourceSnippet: point.sourceQuote
      })
    ],
    knowledgePoints: [point],
    cleanedText: point.sourceQuote
  });
  const selected = selectQualifiedQuestionsByPoint([point], evaluated);

  assert.equal(evaluated[0].qualityIssues.includes("question_type_mismatch"), true);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, "type-mismatch");
  assert.equal(selected[0].confidenceLevel, "low");
});

test("expands source snippet to the original paragraph context", () => {
  const evaluated = evaluateQuestions({
    questions: [
      question({
        id: "missing-source",
        sourceSnippet: ""
      })
    ],
    knowledgePoints: [point],
    cleanedText: `前一句说明了用户为什么需要回看上下文。${point.sourceQuote}后一句解释了这段话和题目判断之间的关系。`
  });
  const selected = selectQualifiedQuestionsByPoint([point], evaluated);

  assert.equal(evaluated[0].sourceSnippet.includes(point.sourceQuote), true);
  assert.equal(evaluated[0].sourceSnippet.includes("后一句解释了这段话和题目判断之间的关系"), true);
  assert.equal(evaluated[0].sourceSnippetWasBackfilled, undefined);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].confidenceLevel, "high");
});

test("keeps long source context sentence-bounded and near the anchor", () => {
  const longPoint = {
    ...point,
    sourceQuote: "团队应该先用只读权限验证代理能力。"
  };
  const evaluated = evaluateQuestions({
    questions: [
      question({
        sourceSnippet: "",
        stem: "为什么团队应该先用只读权限验证代理能力？",
        correctUnderstanding: "只读权限能降低早期试错风险，同时让团队观察代理是否可靠。"
      })
    ],
    knowledgePoints: [longPoint],
    cleanedText: "文章先介绍了很多背景信息，讨论企业对自动化系统的期待，也描述了团队协作的复杂性。随后作者指出，团队应该先用只读权限验证代理能力。这样做的原因是只读权限不会直接改动生产系统，却能暴露代理在理解任务、检索资料、汇总证据时是否可靠。等团队积累足够信任以后，再逐步开放低风险写权限。最后文章还提醒，不要把一次成功演示误认为长期可靠的生产能力。"
  });

  assert.equal(evaluated[0].sourceSnippet.includes(longPoint.sourceQuote), true);
  assert.equal(evaluated[0].sourceSnippet.includes("只读权限不会直接改动生产系统"), true);
  assert.equal(evaluated[0].sourceSnippet.length <= 500, true);
  assert.equal(/[。！？!?]$/.test(evaluated[0].sourceSnippet), true);
});

test("preserves paragraph breaks when source context spans original paragraphs", () => {
  const shortPoint = {
    ...point,
    sourceQuote: "HTML 原型让沟通媒介更丰富。"
  };
  const evaluated = evaluateQuestions({
    questions: [
      question({
        sourceSnippet: "",
        stem: "为什么 HTML 原型能让人和 Claude 的沟通更丰富？",
        correctUnderstanding: "HTML 原型把任务状态和交互反馈放在一个可检查的界面里。"
      })
    ],
    knowledgePoints: [shortPoint],
    cleanedText: [
      "前文先说明 Markdown 计划过长时会让人不愿意读，也不容易发现遗漏。",
      "HTML 原型让沟通媒介更丰富。",
      "它把任务状态和交互反馈放在一起，让人能沿着界面检查 Claude 的计划，而不是只读一段抽象文字。"
    ].join("\n")
  });

  assert.equal(evaluated[0].sourceSnippet.includes(shortPoint.sourceQuote), true);
  assert.equal(evaluated[0].sourceSnippet.includes("任务状态和交互反馈"), true);
  assert.equal(evaluated[0].sourceSnippet.includes("\n\n"), true);
});

test("chooses the source context that best matches the question keywords", () => {
  const repeatedPoint = {
    ...point,
    sourceQuote: "公司知道自己需要 AI，只是不知道该信任谁。"
  };
  const evaluated = evaluateQuestions({
    questions: [
      question({
        sourceSnippet: "",
        stem: "这句话为什么说明 AI 顾问的价值在于建立信任？",
        correctUnderstanding: "AI 顾问要把抽象需求转成可信、低风险、可验证的场景。"
      })
    ],
    knowledgePoints: [repeatedPoint],
    cleanedText: [
      "市场报道里提到，公司知道自己需要 AI，只是不知道该信任谁。这一句只是在描述采购热度，并没有展开顾问的具体工作。",
      "真正的问题是，公司知道自己需要 AI，只是不知道该信任谁。所以 AI 顾问的价值不只是推荐工具，而是通过低风险试点、边界说明和证据回看帮助团队建立信任。"
    ].join("\n")
  });

  assert.equal(evaluated[0].sourceSnippet.includes("低风险试点"), true);
  assert.equal(evaluated[0].sourceSnippet.includes("建立信任"), true);
});

test("does not retain a question when no source context supports its answer", () => {
  const unsupportedPoint = {
    ...point,
    sourceQuote: "公司知道自己需要 AI，只是不知道该信任谁。"
  };
  const evaluated = evaluateQuestions({
    questions: [
      question({
        id: "unsupported-context",
        sourceSnippet: "",
        stem: "这句话为什么说明 AI 顾问应该通过试点建立信任？",
        correctUnderstanding: "顾问需要通过低风险试点、边界说明和证据回看来建立信任。",
        options: [
          { id: "A", text: "通过低风险试点建立信任" },
          { id: "B", text: "直接出售提示词模板" },
          { id: "C", text: "替企业购买所有模型账号" },
          { id: "D", text: "只讲行业趋势不做验证" }
        ]
      })
    ],
    knowledgePoints: [unsupportedPoint],
    cleanedText: "市场报道里提到，公司知道自己需要 AI，只是不知道该信任谁。这一句只是在描述采购热度，并没有展开顾问的具体工作。"
  });
  const selected = selectQualifiedQuestionsByPoint([unsupportedPoint], evaluated);

  assert.equal(evaluated[0].qualityIssues.includes("source_snippet_unsupported_question_context"), true);
  assert.equal(evaluated[0].qualityAction, "discard");
  assert.equal(selected.length, 0);
});

test("falls back to unsupported source quote as discard when the quote cannot be located", () => {
  const evaluated = evaluateQuestions({
    questions: [
      question({
        id: "missing-anchor",
        sourceSnippet: ""
      })
    ],
    knowledgePoints: [point],
    cleanedText: "这段原文没有包含对应的短锚点，因此无法可靠定位上下文。"
  });
  const selected = selectQualifiedQuestionsByPoint([point], evaluated);

  assert.equal(evaluated[0].sourceSnippet, point.sourceQuote);
  assert.equal(evaluated[0].sourceSnippetWasBackfilled, true);
  assert.equal(evaluated[0].qualityIssues.includes("source_snippet_unsupported_question_context"), true);
  assert.equal(selected.length, 0);
});

test("keeps one reviewable question for each covered knowledge point", () => {
  const points = Array.from({ length: 10 }, (_, index) => ({
    ...point,
    id: `kp-${index + 1}`,
    title: `知识点 ${index + 1}`,
    sourceQuote: `第 ${index + 1} 个知识点的来源片段可以支撑题目。`
  }));
  const selected = selectQualifiedQuestionsByPoint(
    points,
    points.map((item, index) => question({
      id: `q-${index + 1}`,
      knowledgePointId: item.id,
      sourceSnippet: item.sourceQuote
    }))
  );

  assert.equal(selected.length, 10);
  assert.deepEqual(selected.map((item) => item.knowledgePointId), points.map((item) => item.id));
});

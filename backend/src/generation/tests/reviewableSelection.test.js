import assert from "node:assert/strict";
import test from "node:test";

import { evaluateQuestions } from "../evaluateQuestions.js";
import { buildUserPrompt, targetQuestionCountDecisionForPoint, targetQuestionCountForPoint } from "../generateQuestions.js";
import { selectQualifiedQuestionsByPoint } from "../index.js";
import { buildPracticeBlueprintForPoint, pedagogyDiagnosticsForQuestion } from "../practiceBlueprint.js";

const point = {
  id: "kp-1",
  title: "测试知识点",
  testabilityScore: 4,
  knowledgeType: "concept",
  sourceQuote: "这是一段可以支撑题目的来源片段。"
};

const highValuePoint = {
  ...point,
  testabilityScore: 5,
  knowledgeType: "method",
  questionAngles: ["理解核心判断", "辨析常见误区", "迁移到具体场景"]
};

const lowTargetPoint = {
  ...point,
  testabilityScore: 2,
  importanceScore: 2,
  questionAngles: []
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

function typedQuestion({ id, type, stem, qualityAction = "pass", average = 4.5, ...overrides }) {
  const base = question({
    id,
    type,
    stem,
    qualityAction,
    qualityScore: {
      ...question().qualityScore,
      average
    },
    ...overrides
  });
  if (type === "true_false") {
    return {
      ...base,
      options: [
        { id: "A", text: "成立" },
        { id: "B", text: "不成立" }
      ],
      correctOptionId: "A"
    };
  }
  return base;
}

test("selects the highest-scoring pass question first", () => {
  const selected = selectQualifiedQuestionsByPoint([lowTargetPoint], [
    question({ id: "rewrite-high", qualityAction: "rewrite", qualityScore: { ...question().qualityScore, average: 4.9 } }),
    question({ id: "pass-low", qualityAction: "pass", qualityScore: { ...question().qualityScore, average: 4.1 } }),
    question({ id: "pass-high", qualityAction: "pass", qualityScore: { ...question().qualityScore, average: 4.8 } })
  ]);

  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, "pass-high");
  assert.equal(selected[0].confidenceLevel, "high");
});

test("retains up to three diverse pass questions for a high-value knowledge point", () => {
  const selected = selectQualifiedQuestionsByPoint([highValuePoint], [
    typedQuestion({
      id: "mc",
      type: "multiple_choice",
      stem: "哪种理解最符合这个知识点？",
      correctUnderstanding: "这个知识点的核心主张是要围绕来源里的关键判断做理解。",
      memoryAngle: "core_understanding",
      average: 4.6
    }),
    typedQuestion({
      id: "tf",
      type: "true_false",
      stem: "这个边界判断是否成立？",
      correctUnderstanding: "这个知识点的边界在于不能只靠关键词做判断。",
      memoryAngle: "misconception_boundary",
      average: 4.4
    }),
    typedQuestion({
      id: "scenario",
      type: "scenario_judgment",
      stem: "在具体业务场景中应该怎么应用？",
      correctUnderstanding: "这个知识点可以迁移到具体业务场景中指导行动选择。",
      memoryAngle: "scenario_application",
      average: 4.8
    })
  ]);

  assert.equal(selected.length, 3);
  assert.deepEqual(new Set(selected.map((item) => item.type)), new Set([
    "multiple_choice",
    "true_false",
    "scenario_judgment"
  ]));
  assert.deepEqual(selected.map((item) => item.confidenceLevel), ["high", "high", "high"]);
});

test("uses reviewable rewrite questions as low-confidence supplements", () => {
  const selected = selectQualifiedQuestionsByPoint([highValuePoint], [
    typedQuestion({
      id: "mc",
      type: "multiple_choice",
      stem: "哪种理解最符合这个知识点？",
      correctUnderstanding: "这个知识点的核心主张是来源片段中的关键判断。",
      memoryAngle: "core_understanding",
      average: 4.7
    }),
    typedQuestion({
      id: "tf",
      type: "true_false",
      stem: "这个边界判断是否成立？",
      correctUnderstanding: "这个知识点的边界是不能把关键词记忆当成理解。",
      memoryAngle: "misconception_boundary",
      average: 4.4
    }),
    typedQuestion({
      id: "scenario-rewrite",
      type: "scenario_judgment",
      stem: "如果团队遇到相似场景，应该选择哪种做法？",
      correctUnderstanding: "这个知识点可以用来指导相似场景下的行动选择。",
      memoryAngle: "scenario_application",
      qualityAction: "rewrite",
      average: 4.1
    })
  ]);

  assert.equal(selected.length, 3);
  assert.equal(selected[2].id, "scenario-rewrite");
  assert.equal(selected[2].confidenceLevel, "low");
  assert.equal(selected[2].retainedBy, "best_effort_quality_fallback");
});

test("does not keep near-duplicate questions just to reach three per point", () => {
  const selected = selectQualifiedQuestionsByPoint([highValuePoint], [
    typedQuestion({
      id: "mc-1",
      type: "multiple_choice",
      stem: "哪种理解最符合这个知识点？",
      correctUnderstanding: "这个知识点的核心主张是要围绕来源里的关键判断做理解。",
      memoryAngle: "core_understanding",
      average: 4.8
    }),
    typedQuestion({
      id: "mc-2",
      type: "multiple_choice",
      stem: "哪种理解最符合这个知识点呢？",
      correctUnderstanding: "这个知识点的核心主张是要围绕来源里的关键判断做理解。",
      memoryAngle: "core_understanding",
      average: 4.7
    }),
    typedQuestion({
      id: "scenario",
      type: "scenario_judgment",
      stem: "在具体业务场景中应该怎么应用？",
      correctUnderstanding: "这个知识点可以迁移到具体业务场景中指导行动选择。",
      memoryAngle: "scenario_application",
      average: 4.5
    })
  ]);

  assert.equal(selected.length, 2);
  assert.deepEqual(selected.map((item) => item.id), ["mc-1", "scenario"]);
});

test("retains the best rewrite question as low confidence when no pass question exists", () => {
  const selected = selectQualifiedQuestionsByPoint([lowTargetPoint], [
    question({ id: "rewrite-low", qualityAction: "rewrite", qualityScore: { ...question().qualityScore, average: 3.4 } }),
    question({ id: "rewrite-high", qualityAction: "rewrite", qualityScore: { ...question().qualityScore, average: 4.2 } })
  ]);

  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, "rewrite-high");
  assert.equal(selected[0].confidenceLevel, "low");
  assert.equal(selected[0].retainedBy, "best_effort_quality_fallback");
});

test("does not retain discard questions", () => {
  const selected = selectQualifiedQuestionsByPoint([lowTargetPoint], [
    question({ id: "discarded", qualityAction: "discard", qualityScore: { ...question().qualityScore, average: 4.9 } })
  ]);

  assert.equal(selected.length, 0);
});

test("does not retain structurally invalid rewrite questions", () => {
  const selected = selectQualifiedQuestionsByPoint([lowTargetPoint], [
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

test("retains question type mismatch without treating type as the core quality signal", () => {
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
  assert.equal((evaluated[0].confidenceReasons || []).includes("question_type_mismatch"), false);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, "type-mismatch");
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

test("selects minimal evidence sentences for hook definition, lifecycle, contrast, and formatter examples", () => {
  const cleanedText = [
    "hook 可以先理解成一句话：在 AI agent 的某个固定节点，自动执行你定义好的命令、HTTP 请求、提示词或工具调用。",
    "官方文档的说法更工程化：hooks 会在 Claude Code 生命周期中的特定点触发；事件发生后，系统把相关 JSON 上下文传给你的 hook handler。",
    "prompt 是请求模型记住；hook 是让系统执行。",
    "比如在 PostToolUse 里规定，只要它编辑了文件，就自动跑 formatter。"
  ].join("");
  const hookPoints = [
    {
      ...point,
      id: "kp-hook-definition",
      title: "hook 的定义",
      sourceQuote: "hook 可以先理解成一句话：在 AI agent 的某个固定节点，自动执行你定义好的命令、HTTP 请求、提示词或工具调用。"
    },
    {
      ...point,
      id: "kp-hook-lifecycle",
      title: "hook 的生命周期触发",
      sourceQuote: "hooks 会在 Claude Code 生命周期中的特定点触发"
    },
    {
      ...point,
      id: "kp-hook-contrast",
      title: "prompt 与 hook 的区别",
      sourceQuote: "prompt 是请求模型记住；hook 是让系统执行。"
    },
    {
      ...point,
      id: "kp-hook-example",
      title: "PostToolUse formatter 示例",
      sourceQuote: "在 PostToolUse 里规定，只要它编辑了文件，就自动跑 formatter。"
    }
  ];
  const evaluated = evaluateQuestions({
    questions: [
      question({
        id: "q-hook-definition",
        knowledgePointId: "kp-hook-definition",
        stem: "hook 在 Claude Code 语境里首先应该被理解为什么？",
        correctUnderstanding: "hook 是在 AI agent 的固定节点自动执行命令、HTTP 请求、提示词或工具调用的机制。",
        options: [
          { id: "A", text: "在固定节点自动执行命令或工具调用的机制" },
          { id: "B", text: "只用于 React 组件复用的函数" },
          { id: "C", text: "让模型凭记忆遵守规则的提示词" },
          { id: "D", text: "只记录聊天内容的日志系统" }
        ]
      }),
      question({
        id: "q-hook-lifecycle",
        knowledgePointId: "kp-hook-lifecycle",
        stem: "官方文档强调 hook 会在什么位置触发？",
        correctUnderstanding: "hook 会在 Claude Code 生命周期中的特定点触发，并接收相关 JSON 上下文。",
        options: [
          { id: "A", text: "Claude Code 生命周期中的特定点" },
          { id: "B", text: "用户完成整篇文章阅读之后" },
          { id: "C", text: "只在前端组件渲染时" },
          { id: "D", text: "只在 App Store 审核时" }
        ]
      }),
      question({
        id: "q-hook-contrast",
        knowledgePointId: "kp-hook-contrast",
        stem: "prompt 和 hook 的关键差别是什么？",
        correctUnderstanding: "prompt 是请求模型记住规则，而 hook 是让系统执行确定性流程。",
        options: [
          { id: "A", text: "prompt 请求模型记住，hook 让系统执行" },
          { id: "B", text: "prompt 更确定，hook 只能靠模型自觉" },
          { id: "C", text: "二者完全相同" },
          { id: "D", text: "hook 只负责改变按钮颜色" }
        ]
      }),
      question({
        id: "q-hook-example",
        knowledgePointId: "kp-hook-example",
        stem: "PostToolUse 自动跑 formatter 的例子说明了什么？",
        correctUnderstanding: "它说明 hook 可以在 AI 编辑文件后自动执行格式化这类确定性流程。",
        options: [
          { id: "A", text: "hook 可以在编辑文件后自动跑 formatter" },
          { id: "B", text: "formatter 只能由用户手动执行" },
          { id: "C", text: "PostToolUse 与文件编辑无关" },
          { id: "D", text: "hook 的目标是替代所有测试" }
        ]
      })
    ],
    knowledgePoints: hookPoints,
    cleanedText
  });

  assert.equal(evaluated[0].sourceSnippet.includes("在 AI agent 的某个固定节点"), true);
  assert.equal(evaluated[1].sourceSnippet.includes("生命周期中的特定点触发"), true);
  assert.equal(evaluated[2].sourceSnippet.includes("prompt 是请求模型记住；hook 是让系统执行"), true);
  assert.equal(evaluated[3].sourceSnippet.includes("PostToolUse"), true);
  assert.equal(new Set(evaluated.map((item) => item.sourceSnippet)).size >= 3, true);
  assert.equal(evaluated.every((item) => Number(item.sourceMinimalityScore) >= 4), true);
  assert.equal(evaluated.every((item) => cleanedText.includes(item.sourceSnippet.replace(/\n\n/g, ""))), true);
});

test("records overlap diagnostics when two questions reuse the same minimal evidence", () => {
  const overlapPoint = {
    ...point,
    sourceQuote: "prompt 是请求模型记住；hook 是让系统执行。"
  };
  const evaluated = evaluateQuestions({
    questions: [
      question({
        id: "q-overlap-1",
        stem: "prompt 和 hook 的关键差别是什么？",
        correctUnderstanding: "prompt 是请求模型记住规则，而 hook 是让系统执行确定性流程。",
        sourceSnippet: ""
      }),
      question({
        id: "q-overlap-2",
        stem: "为什么 hook 比提示词更像控制器？",
        correctUnderstanding: "因为 hook 让系统执行固定流程，而不是只请求模型记住。",
        sourceSnippet: ""
      })
    ],
    knowledgePoints: [overlapPoint],
    cleanedText: "prompt 是请求模型记住；hook 是让系统执行。你可以反复对 AI 说改完代码记得格式化，也可以在 PostToolUse 里规定自动跑 formatter。"
  });

  assert.equal(Number(evaluated[1].sourceOverlapRatio) >= 0.7, true);
  assert.equal(Boolean(evaluated[1].sourceOverlapGroupId), true);
});

test("assigns same-point questions to different source blocks when evidence differs", () => {
  const hookTimingPoint = {
    ...point,
    id: "kp-hook-timing",
    title: "什么时候需要 hook",
    keyClaim: "hook 应该在项目从可运行走向可复用时引入，而不是 demo 一开始就引入。",
    sourceQuote: "真正该上 hook 的时刻，通常有四个信号。",
    questionAngles: ["理解引入时机", "辨析信号", "迁移到 formatter 场景"]
  };
  const cleanedText = [
    "什么时候需要 hook：不是一开始，而是从可运行走向可复用时",
    "一个 20 分钟的概念 demo，不需要先搭一套复杂 hook。那会把 AI coding 的速度优势抵消掉。",
    "真正该上 hook 的时刻，通常有四个信号：不可接受的行为需要拦截、重复动作需要自动化、AI 结束前必须完成最低限度检查、团队开始复用这套流程。",
    "例如你可以在 PostToolUse 里规定，只要 AI 编辑了文件，就自动跑 formatter。这个例子说明 hook 适合把确定性动作固化下来。"
  ].join("\n");

  const evaluated = evaluateQuestions({
    questions: [
      question({
        id: "q-demo",
        knowledgePointId: "kp-hook-timing",
        stem: "为什么 20 分钟概念 demo 不需要一开始就上 hook？",
        correctUnderstanding: "因为早期 demo 追求速度，复杂 hook 会抵消 AI coding 的速度优势。",
        commonMisconception: "误以为任何 AI coding 项目都应该先搭 hook。",
        sourceSnippet: ""
      }),
      question({
        id: "q-signal",
        knowledgePointId: "kp-hook-timing",
        stem: "哪些信号说明团队真正该引入 hook？",
        correctUnderstanding: "当不可接受行为需要拦截、重复动作需要自动化、最低检查需要固化或流程被团队复用时，就应该考虑 hook。",
        commonMisconception: "误以为只要代码能跑就不需要任何 hook。",
        sourceSnippet: ""
      }),
      question({
        id: "q-formatter",
        knowledgePointId: "kp-hook-timing",
        stem: "PostToolUse 自动跑 formatter 的例子说明了 hook 的什么价值？",
        correctUnderstanding: "它说明 hook 适合把编辑文件后的格式化这类确定性动作固化为自动流程。",
        commonMisconception: "误以为 formatter 只能靠人提醒 AI 去执行。",
        sourceSnippet: ""
      })
    ],
    knowledgePoints: [hookTimingPoint],
    cleanedText
  });

  const blockIds = new Set(evaluated.map((item) => item.sourceBlockId).filter(Boolean));
  assert.equal(blockIds.size >= 2, true);
  assert.equal(evaluated.every((item) => item.sourceBlockId), true);
  assert.equal(evaluated.some((item) => item.sourceEvidenceRole === "example"), true);
  assert.equal(evaluated.every((item) => Number(item.sourceEvidenceDiversityScore) >= 3), true);
});

test("uses the most relevant source block instead of forcing the anchor paragraph", () => {
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

  assert.equal(evaluated[0].sourceSnippet.includes("任务状态和交互反馈"), true);
  assert.equal(evaluated[0].sourceBlockId, "p2-s0-0");
  assert.equal(evaluated[0].sourceContextSelection.method, "source_block_relevance");
  assert.equal(evaluated[0].sourcePrecisionScore >= 4, true);
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

test("falls back to a more relevant paragraph in the same section when the source quote paragraph is weak", () => {
  const sectionPoint = {
    ...point,
    title: "Hook 与 CI、Prompt、项目规则的分工",
    keyClaim: "Prompt、CLAUDE.md、hook 和 CI 各自负责不同层级的约束。",
    sourceQuote: "很多团队会在这里混淆。其实分工很清楚。"
  };
  const evaluated = evaluateQuestions({
    questions: [
      question({
        id: "same-section-context",
        stem: "在这套 AI coding 工作流里，hook 和 CI 的边界是什么？",
        correctUnderstanding: "hook 适合在本地执行高频、即时、可自动化的约束；CI 负责最终的跨环境质量门槛。",
        options: [
          { id: "A", text: "hook 做即时约束，CI 做最终质量门槛" },
          { id: "B", text: "hook 可以完全替代 CI" },
          { id: "C", text: "CI 只负责保存提示词" },
          { id: "D", text: "Prompt 和 hook 没有分工区别" }
        ],
        sourceSnippet: ""
      })
    ],
    knowledgePoints: [sectionPoint],
    cleanedText: [
      "很多团队会在这里混淆。其实分工很清楚。这一段只是引出问题，没有解释具体边界，也没有说明任何工具各自应该负责什么。它继续描述团队在工具选择上会犹豫，会把不同层级的规则混在同一个文档里，但仍然没有给出明确分工。作者还说这种混淆会让团队以为只要多写提示词就能解决所有流程问题，结果真正需要自动执行的检查仍然停留在口头提醒里。",
      "Prompt 负责告诉 AI 怎么思考，CLAUDE.md 负责沉淀项目长期规则，hook 适合在本地执行每次都必须发生的即时约束，CI 则负责最终跨环境质量门槛，防止个人机器上的自动化遗漏生产检查。"
    ].join("\n")
  });
  const selected = selectQualifiedQuestionsByPoint([sectionPoint], evaluated);

  assert.equal(evaluated[0].sourceSnippet.includes("CI 则负责最终跨环境质量门槛"), true);
  assert.equal(evaluated[0].sourceContextSelection.method, "source_block_relevance");
  assert.equal(evaluated[0].sourceContextSelection.fallback, true);
  assert.equal(evaluated[0].blockingReasons.includes("weak_source_support"), false);
  assert.equal(selected.length, 1);
});

test("locates source context from title and key claim when the source quote is not a continuous substring", () => {
  const discontinuousPoint = {
    ...point,
    title: "Vibe Coding 与 Hook 的关系",
    keyClaim: "Vibe coding 负责快速起飞，hook 负责让流程不偏航。",
    sourceQuote: "vibe coding 负责起飞，hook 负责别偏航。这个引用在正文里不是连续片段。"
  };
  const evaluated = evaluateQuestions({
    questions: [
      question({
        id: "keyword-fallback",
        stem: "如何理解 vibe coding 和 hook 的关系？",
        correctUnderstanding: "vibe coding 负责快速做出 demo，hook 负责把必要约束自动化，避免流程偏航。",
        options: [
          { id: "A", text: "vibe coding 负责快速做 demo，hook 负责自动化约束防偏航" },
          { id: "B", text: "hook 只负责让页面变得更美观" },
          { id: "C", text: "vibe coding 可以替代所有工程约束" },
          { id: "D", text: "二者没有任何关系" }
        ],
        sourceSnippet: ""
      })
    ],
    knowledgePoints: [discontinuousPoint],
    cleanedText: "最后的判断很简单：vibe coding 负责快速起飞，让 PM 先把 demo 和想法跑起来；hook 负责把必须发生的检查、提醒和约束自动化，避免 AI coding 的流程偏航。"
  });
  const selected = selectQualifiedQuestionsByPoint([discontinuousPoint], evaluated);

  assert.equal(evaluated[0].sourceSnippet.includes("避免 AI coding 的流程偏航"), true);
  assert.equal(evaluated[0].sourceContextSelection.method, "source_block_relevance");
  assert.equal(evaluated[0].sourceContextSelection.fallbackReason, "source_block_keyword_match");
  assert.equal(evaluated[0].sourceContextSelection.fallback, true);
  assert.equal(evaluated[0].sourcePrecisionScore >= 4, true);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].confidenceTier, "high_confidence");
  assert.equal(selected[0].confidenceLevel, "high");
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

test("adds trust diagnostics and confidence reasons for weak but reviewable questions", () => {
  const weakPoint = {
    ...point,
    sourceQuote: "HTML 原型让沟通媒介更丰富。"
  };
  const evaluated = evaluateQuestions({
    questions: [
      question({
        id: "weak-source",
        sourceSnippet: "",
        stem: "为什么 HTML 原型比长 Markdown 更适合和 AI 沟通？",
        correctUnderstanding: "HTML 原型能把任务状态、交互和反馈组织成一个可检查的界面。",
        commonMisconception: "误以为只要计划写得越长，沟通质量就越高。",
        options: [
          { id: "A", text: "因为它能承载更丰富的沟通媒介" },
          { id: "B", text: "因为它可以完全替代人工判断" },
          { id: "C", text: "因为它让模型运行时间变短" },
          { id: "D", text: "因为它不需要任何上下文" }
        ]
      })
    ],
    knowledgePoints: [weakPoint],
    cleanedText: [
      "Markdown 计划太长时，读者很容易失去耐心。",
      "HTML 原型让沟通媒介更丰富。"
    ].join("\n")
  });
  const selected = selectQualifiedQuestionsByPoint([weakPoint], evaluated);

  assert.equal(evaluated[0].trustDiagnostics.answerGroundingScore >= 1, true);
  assert.equal(evaluated[0].confidenceReasons.some((reason) => reason.startsWith("explanation_")), true);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].confidenceLevel, "low");
});

test("keeps weak explanation faithfulness as low confidence when the source still supports the answer", () => {
  const evaluated = evaluateQuestions({
    questions: [
      question({
        id: "bad-explanation",
        sourceSnippet: "",
        stem: "这段来源说明什么？",
        correctUnderstanding: "这段来源说明题目应当由来源片段支撑。",
        explanation: "原文说明成熟账号系统和推荐算法已经解决了个性化问题。",
        options: [
          { id: "A", text: "题目应当由来源片段支撑" },
          { id: "B", text: "题目可以不需要来源" },
          { id: "C", text: "所有选项都应当正确" },
          { id: "D", text: "解释可以完全脱离原文" }
        ]
      })
    ],
    knowledgePoints: [point],
    cleanedText: `这是一段可以支撑题目的来源片段。题目应当由来源片段支撑，解释不能完全脱离原文。`
  });
  const selected = selectQualifiedQuestionsByPoint([point], evaluated);

  assert.equal(evaluated[0].confidenceReasons.some((reason) => reason.startsWith("explanation_")), true);
  assert.equal(evaluated[0].blockingReasons.includes("weak_explanation_faithfulness"), false);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].confidenceLevel, "low");
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

test("uses lean dynamic targets instead of defaulting every reviewable point to three questions", () => {
  const decision = targetQuestionCountDecisionForPoint({
    ...point,
    testabilityScore: 4,
    importanceScore: 3,
    questionAngles: []
  });

  assert.equal(targetQuestionCountForPoint(point), 2);
  assert.equal(decision.count, 1);
  assert.equal(decision.reason, "lean_default_single_question_target");
});

test("builds a three-step practice blueprint for high-value knowledge points", () => {
  const blueprint = buildPracticeBlueprintForPoint(highValuePoint, {
    targetCount: 3,
    preferredQuestionType: "multiple_choice"
  });

  assert.equal(blueprint.length, 3);
  assert.deepEqual(blueprint.map((item) => item.memoryAngle), [
    "core_understanding",
    "misconception_boundary",
    "scenario_application"
  ]);
  assert.equal(blueprint.every((item) => item.id.includes(highValuePoint.id)), true);
});

test("keeps same-type questions when they cover distinct cognitive actions", () => {
  const selected = selectQualifiedQuestionsByPoint([highValuePoint], [
    typedQuestion({
      id: "core",
      type: "scenario_judgment",
      stem: "团队判断这个知识点的核心主张时，哪种说法最准确？",
      average: 4.8,
      memoryAngle: "core_understanding",
      blueprintItemId: "kp-1-core_understanding",
      sourceBlockId: "block-shared",
      correctUnderstanding: "核心动作是概括来源中的主要判断。",
      blueprintAlignmentScore: 5,
      memoryAngleFitScore: 5,
      cognitiveActionFitScore: 5,
      evidenceLearningValueScore: 4.5
    }),
    typedQuestion({
      id: "boundary",
      type: "scenario_judgment",
      stem: "团队误用这个知识点时，哪种边界判断最容易出错？",
      average: 4.7,
      memoryAngle: "misconception_boundary",
      blueprintItemId: "kp-1-misconception_boundary",
      sourceBlockId: "block-shared",
      correctUnderstanding: "边界动作是识别错误使用方式与真实限制。",
      blueprintAlignmentScore: 5,
      memoryAngleFitScore: 5,
      cognitiveActionFitScore: 5,
      evidenceLearningValueScore: 4.5
    }),
    typedQuestion({
      id: "scenario",
      type: "scenario_judgment",
      stem: "如果团队遇到新项目场景，应该怎样迁移这个知识点？",
      average: 4.6,
      memoryAngle: "scenario_application",
      blueprintItemId: "kp-1-scenario_application",
      sourceBlockId: "block-shared",
      correctUnderstanding: "迁移动作是把原则用于新的项目决策。",
      blueprintAlignmentScore: 5,
      memoryAngleFitScore: 5,
      cognitiveActionFitScore: 5,
      evidenceLearningValueScore: 4.5
    })
  ]);

  assert.equal(selected.length, 3);
  assert.equal(new Set(selected.map((item) => item.type)).size, 1);
  assert.equal(new Set(selected.map((item) => item.memoryAngle)).size, 3);
  assert.equal(selected[0].typeDiversityReason, "same_type_but_distinct_cognitive_actions");
  assert.equal(selected[0].practiceProgressionScore, 5);
  assert.equal(selected[0].sourceReuseLearningReason, "same_point_all_questions_share_one_source_block");
});

test("does not demote type mismatch when the cognitive action is satisfied", () => {
  const selected = selectQualifiedQuestionsByPoint([lowTargetPoint], [
    question({
      id: "type-warning-only",
      type: "scenario_judgment",
      qualityIssues: ["question_type_mismatch"],
      confidenceTier: "high_confidence",
      confidenceReasons: [],
      cognitiveActionFitScore: 5
    })
  ]);

  assert.equal(selected.length, 1);
  assert.equal(selected[0].confidenceLevel, "high");
});

test("selection rejects same-judgment duplicates even when question types differ", () => {
  const selected = selectQualifiedQuestionsByPoint([highValuePoint], [
    typedQuestion({
      id: "core-a",
      type: "multiple_choice",
      stem: "哪项最能概括这个知识点的核心主张？",
      correctUnderstanding: "这个知识点强调把核心主张迁移到具体场景中判断。",
      memoryAngle: "core_understanding",
      blueprintItemId: "kp-1-core_understanding",
      sourceBlockId: "block-a",
      blueprintAlignmentScore: 5,
      memoryAngleFitScore: 5,
      cognitiveActionFitScore: 5
    }),
    typedQuestion({
      id: "core-b",
      type: "scenario_judgment",
      stem: "遇到具体场景时，哪项最符合这个知识点的核心主张？",
      correctUnderstanding: "这个知识点强调把核心主张迁移到具体场景中判断。",
      memoryAngle: "scenario_application",
      blueprintItemId: "kp-1-scenario_application",
      sourceBlockId: "block-b",
      blueprintAlignmentScore: 5,
      memoryAngleFitScore: 5,
      cognitiveActionFitScore: 5
    }),
    typedQuestion({
      id: "boundary-c",
      type: "true_false",
      stem: "把这个知识点理解成只要记住关键词就够了。",
      correctUnderstanding: "这个知识点强调不能只记关键词，还要理解判断边界。",
      memoryAngle: "misconception_boundary",
      blueprintItemId: "kp-1-misconception_boundary",
      sourceBlockId: "block-c",
      blueprintAlignmentScore: 5,
      memoryAngleFitScore: 5,
      cognitiveActionFitScore: 5
    })
  ]);

  assert.equal(selected.length, 2);
  assert.equal(selected.some((item) => item.id === "core-a"), true);
  assert.equal(selected.some((item) => item.id === "core-b"), false);
  assert.equal(selected.some((item) => item.id === "boundary-c"), true);
});

test("selection keeps similar claims when they train different cognitive actions", () => {
  const selected = selectQualifiedQuestionsByPoint([highValuePoint], [
    typedQuestion({
      id: "core-a",
      type: "multiple_choice",
      stem: "哪项最能概括这个知识点的核心主张？",
      correctUnderstanding: "这个知识点强调把原则用于项目判断，而不是停留在字面记忆。",
      memoryAngle: "core_understanding",
      blueprintItemId: "kp-1-core_understanding",
      sourceBlockId: "block-a",
      blueprintAlignmentScore: 5,
      memoryAngleFitScore: 5,
      cognitiveActionFitScore: 5
    }),
    typedQuestion({
      id: "scenario-b",
      type: "scenario_judgment",
      stem: "一个团队遇到新的项目取舍时，应该如何应用这个原则？",
      correctUnderstanding: "这个知识点强调把原则用于新的项目取舍，而不是复述原文。",
      memoryAngle: "scenario_application",
      blueprintItemId: "kp-1-scenario_application",
      sourceBlockId: "block-b",
      blueprintAlignmentScore: 5,
      memoryAngleFitScore: 5,
      cognitiveActionFitScore: 5
    }),
    typedQuestion({
      id: "boundary-c",
      type: "true_false",
      stem: "把这个知识点理解成只要记住关键词就够了。",
      correctUnderstanding: "这个知识点强调不能只记关键词，还要理解判断边界。",
      memoryAngle: "misconception_boundary",
      blueprintItemId: "kp-1-misconception_boundary",
      sourceBlockId: "block-c",
      blueprintAlignmentScore: 5,
      memoryAngleFitScore: 5,
      cognitiveActionFitScore: 5
    })
  ]);

  assert.equal(selected.length, 3);
  assert.equal(new Set(selected.map((item) => item.memoryAngle)).size, 3);
});

test("pedagogy diagnostics penalize literal scenario transfer and generic boundary practice", () => {
  const literalScenario = pedagogyDiagnosticsForQuestion({
    ...question(),
    memoryAngle: "scenario_application",
    stem: "原文提到这段话时，哪项说法正确？",
    options: [
      { id: "A", text: "原文中的字面说法" },
      { id: "B", text: "另一个字面说法" },
      { id: "C", text: "第三个字面说法" },
      { id: "D", text: "第四个字面说法" }
    ],
    correctUnderstanding: "这道题只要求识别原文中的字面说法。",
    explanation: "答案来自原文这段话本身。",
    sourceSnippet: "原文提到这段话时，哪项说法正确？"
  }, highValuePoint, { blueprintPreferredQuestionType: "scenario_judgment" });
  const genericBoundary = pedagogyDiagnosticsForQuestion({
    ...question(),
    memoryAngle: "misconception_boundary",
    commonMisconception: "理解片面",
    options: [
      { id: "A", text: "成立" },
      { id: "B", text: "不成立" }
    ]
  }, highValuePoint, { blueprintPreferredQuestionType: "true_false" });

  assert.equal(literalScenario.scenarioTransferFitScore < 4, true);
  assert.equal(literalScenario.pedagogyDiagnostics.reasons.includes("scenario_is_restatement"), true);
  assert.equal(genericBoundary.boundaryDiscriminationFitScore < 4, true);
  assert.equal(genericBoundary.pedagogyDiagnostics.reasons.includes("boundary_confusion_not_real"), true);
});

test("pedagogy diagnostics labels literal core recall with the v11 action issue", () => {
  const literalCore = pedagogyDiagnosticsForQuestion({
    ...question(),
    memoryAngle: "core_understanding",
    stem: "根据原文，哪一项说法被提到了？",
    correctUnderstanding: "这道题只要求识别原文提到的字面内容。",
    explanation: "答案来自原文提到的字面内容。"
  }, highValuePoint, { blueprintPreferredQuestionType: "multiple_choice" });

  assert.equal(literalCore.coreUnderstandingScore < 4, true);
  assert.equal(literalCore.cognitiveActionIssue, "core_claim_too_literal");
  assert.equal(literalCore.pedagogyDiagnostics.reasons.includes("core_claim_too_literal"), true);
});

test("question prompt stays lean and does not force article structure binding fields", () => {
  const prompt = buildUserPrompt({
    points: [
      {
        id: "kp-1",
        title: "Hook 与 prompt 的区别",
        keyClaim: "prompt 是请求，hook 是机制。",
        sourceQuote: "prompt 是请求模型记住，hook 是让系统执行。",
        structureNodeId: "asn-2",
        roleInArticle: "contrast",
        sourceEvidenceIds: ["p2-s0-0"],
        expectedCognitiveActions: ["core_understanding", "misconception_boundary"],
        targetQuestionCount: 3,
        practiceBlueprint: [
          {
            id: "kp-1-core_understanding",
            memoryAngle: "core_understanding",
            preferredQuestionType: "multiple_choice",
            goal: "确认用户能说清 prompt 和 hook 的区别"
          }
        ]
      }
    ],
    rewrite: false,
    supplement: false
  });

  assert.equal(prompt.includes("题目必须服务该结构节点"), false);
  assert.equal(prompt.includes("真实混淆对象是什么"), false);
  assert.equal(prompt.includes("新场景变量是什么"), false);
  assert.match(prompt, /轻量复习要求/);
  assert.match(prompt, /不要改写来源片段/);
  assert.match(prompt, /换壳重复/);
});

test("heavy question cards are marked for rewrite instead of being treated as high confidence", () => {
  const frictionPoint = {
    id: "kp-1",
    title: "轻量复习题卡",
    keyClaim: "题卡只放必要判断条件，复杂背景放在解释和来源里。",
    sourceQuote: "轻量复习要求题卡只呈现必要判断条件，复杂背景应放到解释和来源里。",
    testabilityScore: 5,
    importanceScore: 5
  };
  const evaluated = evaluateQuestions({
    questions: [question({
      type: "scenario_judgment",
      stem: "一个产品经理正在设计一个移动端碎片时间复习产品，他既想让用户在公交车上快速判断，又担心题目不够严谨，于是把文章背景、项目上下文、用户画像、团队争论、完整证据链和多个限制条件都塞进题干，下面哪种处理方式更符合轻量复习题卡的原则？",
      options: [
        { id: "A", text: "保留关键判断变量，把复杂背景、证据链和完整解释放到答后解释与来源里" },
        { id: "B", text: "把所有背景继续放在题干中，因为题干越完整越能保证用户不会误解" },
        { id: "C", text: "删除所有上下文，只留下一个没有判断边界的口号式问题" },
        { id: "D", text: "把每个选项都写成一段解释，让用户在选项里读完整分析" }
      ],
      correctOptionId: "A",
      correctUnderstanding: "轻量复习题卡应该保留必要判断条件，把复杂背景放到解释和来源里。",
      commonMisconception: "误以为题干越长、背景越完整，复习质量就越高。",
      explanation: "来源强调题卡只呈现必要判断条件，因此复杂背景应移到答后解释和来源里。",
      sourceSnippet: "轻量复习要求题卡只呈现必要判断条件，复杂背景应放到解释和来源里。",
      memoryAngle: "scenario_application"
    })],
    knowledgePoints: [frictionPoint],
    cleanedText: "轻量复习要求题卡只呈现必要判断条件，复杂背景应放到解释和来源里。"
  });

  assert.equal(evaluated[0].qualityAction, "rewrite");
  assert.equal(evaluated[0].confidenceTier, "needs_rewrite");
  assert.equal(evaluated[0].blockingReasons.length, 0);
  assert.equal(evaluated[0].reviewFrictionScore < 4, true);
  assert.equal(evaluated[0].qualityIssues.includes("review_friction_mandatory_rewrite"), true);
  assert.equal(evaluated[0].confidenceReasons.includes("scenario_background_too_long"), true);
  assert.match(evaluated[0].repairHint, /场景|题卡|背景/);
});

test("composite question is low confidence when source covers only one concept", () => {
  const compositePoint = {
    id: "kp-1",
    title: "Prompt、Hook、CI 的分工",
    keyClaim: "prompt 管本次思考，hook 管事件触发动作，CI 管主干前裁判。",
    sourceQuote: "hooks 会在 Claude Code 生命周期中的特定点触发。",
    testabilityScore: 5,
    importanceScore: 5
  };
  const evaluated = evaluateQuestions({
    questions: [question({
      stem: "关于 Prompt、Hook 和 CI 的职责划分，哪项正确？",
      options: [
        { id: "A", text: "prompt 管本次思考，hook 管事件触发动作，CI 管主干前裁判。" },
        { id: "B", text: "hook 可以完全替代 CI。" },
        { id: "C", text: "prompt 是比 hook 更强的控制器。" },
        { id: "D", text: "CI 只负责提示词记忆。" }
      ],
      correctOptionId: "A",
      correctUnderstanding: "prompt、hook、CI 分别承担不同职责。",
      commonMisconception: "误以为 hook 能替代 CI。",
      sourceSnippet: "hooks 会在 Claude Code 生命周期中的特定点触发。",
      memoryAngle: "misconception_boundary"
    })],
    knowledgePoints: [compositePoint],
    cleanedText: "hooks 会在 Claude Code 生命周期中的特定点触发。"
  });

  assert.equal(evaluated[0].sourceCoverageScore < 4, true);
  assert.equal(evaluated[0].confidenceReasons.includes("source_coverage_incomplete"), true);
});

test("claim fidelity drops when question overstates source claim", () => {
  const demoPoint = {
    id: "kp-1",
    title: "Demo 阶段不需要严格控制",
    keyClaim: "Demo 阶段的目标不是工程化可交付版本，因此不需要严格控制。",
    sourceQuote: "用于产品演示的阶段，不需要严格的控制。",
    testabilityScore: 5,
    importanceScore: 4
  };
  const evaluated = evaluateQuestions({
    questions: [question({
      stem: "产品经理忽视 Hook 的主要原因是什么？",
      options: [
        { id: "A", text: "Demo 阶段需求不同，不关注工程化控制。" },
        { id: "B", text: "产品经理不理解技术。" },
        { id: "C", text: "Hook 只能用于后端。" },
        { id: "D", text: "AI 不支持 Hook。" }
      ],
      correctOptionId: "A",
      correctUnderstanding: "Demo 阶段不需要严格控制。",
      commonMisconception: "认为是产品经理能力不足。",
      sourceSnippet: "用于产品演示的阶段，不需要严格的控制。",
      memoryAngle: "core_understanding"
    })],
    knowledgePoints: [demoPoint],
    cleanedText: "用于产品演示的阶段，不需要严格的控制。"
  });

  assert.equal(evaluated[0].claimFidelityScore < 4, true);
  assert.equal(evaluated[0].confidenceReasons.includes("claim_overextended"), true);
});

test("records a lower target reason for clearly low-testability points", () => {
  const decision = targetQuestionCountDecisionForPoint(lowTargetPoint);

  assert.equal(decision.count, 1);
  assert.equal(decision.reason, "low_testability");
  assert.equal(decision.factors.includes("testability:2"), true);
});

test("supplement prompt is a concise best-effort supplement, not a failed-question rewrite", () => {
  const prompt = buildUserPrompt({
    points: [{
      ...highValuePoint,
      preferredQuestionType: "scenario_judgment",
      targetQuestionCount: 2
    }],
    supplement: true,
    supplementContext: "missing_question_types:true_false|scenario_judgment; existing_reviewable_questions:multiple_choice:已有题"
  });

  assert.equal(prompt.includes("这是补题任务"), true);
  assert.equal(prompt.includes("上一题没有通过质量检查"), false);
  assert.equal(prompt.includes("missing_question_types:true_false|scenario_judgment"), true);
  assert.equal(prompt.includes("不要编造来源或误区"), true);
});

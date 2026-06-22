import assert from "node:assert/strict";
import test from "node:test";

import { buildV2PromptMessages } from "./buildV2PromptMessages.js";

const ARTICLE = {
  id: "chapter-001",
  title: "Hook 如何让 AI 工作流稳定",
  author: "MetaTown",
  url: "https://example.com/hook",
  rawText: "Hook 是关键动作前后的流程控制器。它能稳定触发规则、上下文和验证。"
};

test("sourceMap prompt asks for stable source blocks and no question generation", () => {
  const messages = buildV2PromptMessages("sourceMap", { article: ARTICLE });

  assert.match(messages.system, /拾贝 V2/);
  assert.match(messages.user, /sourceMap/);
  assert.match(messages.user, /稳定的 source block/);
  assert.match(messages.user, /不要生成知识点或题目/);
  assert.match(messages.user, /Hook 如何让 AI 工作流稳定/);
  assert.match(messages.user, /Hook 是关键动作前后的流程控制器/);
});

test("article meta supports extracted sourceAccount and sourceUrl aliases", () => {
  const messages = buildV2PromptMessages("sourceMap", {
    article: {
      id: "chapter-002",
      sourceTitle: "外部提取文章",
      sourceAccount: "晚点再听LaterCast",
      sourceUrl: "https://mp.weixin.qq.com/s/example",
      rawText: "正文"
    }
  });

  assert.match(messages.user, /标题：外部提取文章/);
  assert.match(messages.user, /作者：晚点再听LaterCast/);
  assert.match(messages.user, /链接：https:\/\/mp\.weixin\.qq\.com\/s\/example/);
});

test("reviewPathPlan prompt separates chapter summary and unit summaries", () => {
  const messages = buildV2PromptMessages("reviewPathPlan", {
    article: ARTICLE,
    source: {
      type: "article",
      title: ARTICLE.title,
      author: ARTICLE.author,
      url: ARTICLE.url
    },
    blocks: [
      { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ]
  });

  assert.match(messages.user, /chapter summary 是整章概要/);
  assert.match(messages.user, /unit.nodeLabel/);
  assert.match(messages.user, /unit.shortSummary/);
  assert.match(messages.user, /unit.detailSummary/);
  assert.match(messages.user, /sourceAnchor 必须包含稳定 id/);
  assert.match(messages.user, /sourceAnchor.blockIds/);
  assert.match(messages.user, /章节完成页鼓励文案/);
  assert.match(messages.user, /不能用 section\/outline\/目录项\/骨架对象替代/);
  assert.match(messages.user, /缺 nodeLabel、shortSummary、detailSummary、why 或 sourceAnchor/);
  assert.match(messages.user, /先识别文章核心命题和阅读主线/);
  assert.match(messages.user, /unit 是可复习的独立学习对象/);
  assert.match(messages.user, /判断一个内容是否成为 unit/);
  assert.match(messages.user, /背景、例子、铺垫不自动成为 unit/);
  assert.match(messages.user, /某段承载独立学习对象并有 source evidence/);
  assert.match(messages.user, /unit 数量由文章长度、结构密度、独立学习对象数量和可观察 evidence 决定/);
  assert.match(messages.user, /不要使用固定范围控制产量/);
  assert.match(messages.user, /独立分层结构、流程步骤、类型集合或边界规则/);
  assert.match(messages.user, /不能把相关但独立的大知识点合并/);
  assert.match(messages.user, /sourceAnchor 必须能支撑该 unit 的 title、shortSummary、detailSummary 和 why/);
  assert.doesNotMatch(messages.user, /DMC|游戏化|心流|享乐/);
  assert.doesNotMatch(messages.user, /4-7|4 到 7|4到7/);
  assert.doesNotMatch(messages.user, /knowledgeObjects/);
  assert.doesNotMatch(messages.user, /standalone_unit/);
});

test("unitPracticePlan prompt uses evidence value instead of fixed question counts", () => {
  const messages = buildV2PromptMessages("unitPracticePlan", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    blocks: [
      { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ],
    unit: unitFixture(),
    ecdContext: ecdContextFixture()
  });

  assert.match(messages.user, /unitPracticePlan/);
  assert.match(messages.user, /ECD context/);
  assert.match(messages.user, /selectedTasks/);
  assert.match(messages.user, /保持 ECD 已选择的 compact task 组合/);
  assert.match(messages.user, /questionPlan.id 必须等于 selectedTask.questionPlanId/);
  assert.match(messages.user, /targetIds/);
  assert.match(messages.user, /microIds/);
  assert.match(messages.user, /questionPlan.type 为 matching 时，必须填写 relationType/);
  assert.match(messages.user, /layer_role_matching \/ role_responsibility_matching 通常是 responsibility/);
  assert.match(messages.user, /matching 优先表达当前 unit 自身的层级、边界、步骤、信号、角色等关系证据/);
});

test("unitKnowledgeMap prompt isolates micro knowledge discovery from task assembly", () => {
  const messages = buildV2PromptMessages("unitKnowledgeMap", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    blocks: [
      { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ],
    sourceContextNote: {
      mode: "plan_union_window",
      selectedBlockIds: ["p-001"],
      fullBlockCount: 8,
      selectedBlockCount: 1
    },
    plan: {
      title: ARTICLE.title,
      summaryCard: { text: "Hook 把关键动作变成稳定流程。" },
      units: [unitFixture()],
      chapterSummary: { encouragementText: "你已经理解 Hook 的流程价值。" }
    }
  });

  assert.match(messages.user, /unitKnowledgeMap/);
  assert.match(messages.user, /sourceContextNote/);
  assert.match(messages.user, /plan_union_window/);
  assert.match(messages.user, /本阶段不生成题目、不选择题型、不做 selectedTasks/);
  assert.match(messages.user, /完整发现/);
  assert.match(messages.user, /最小的有意义学习对象/);
  assert.match(messages.user, /如果一句内容包含两个不同掌握表现/);
  assert.match(messages.user, /根据原文自然存在的内容判断 role/);
  assert.match(messages.user, /assessmentValue 只描述这个小点的考察价值，不表达题目数量/);
  assert.match(messages.user, /high：缺少它会导致用户无法掌握该 unit 的核心/);
  assert.match(messages.user, /suggestedEvidenceAngles 只写建议观察角度，不选择题型/);
  assert.match(messages.user, /sourceSupport 写该 source 如何支撑这个 micro/);
  assert.match(messages.user, /不要为了控制题量而删掉/);
  assert.match(messages.user, /分层模型、结构框架或层级体系/);
  assert.match(messages.user, /microKnowledgePoints/);
  assert.doesNotMatch(messages.user, /DMC|游戏化|心流|享乐|每个 unit 必须|至少.*micro|至少.*definition|至少.*boundary|4-7/);
});

test("taskBriefPlan prompt embeds ECD as thinking method without heavy ECD JSON", () => {
  const messages = buildV2PromptMessages("taskBriefPlan", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    blocks: [
      { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ],
    sourceContextNote: {
      mode: "plan_union_window",
      selectedBlockIds: ["p-001"],
      fullBlockCount: 8,
      selectedBlockCount: 1
    },
    plan: {
      title: ARTICLE.title,
      summaryCard: { text: "Hook 把关键动作变成稳定流程。" },
      units: [unitFixture()],
      chapterSummary: { encouragementText: "你已经理解 Hook 的流程价值。" }
    },
    unitKnowledgeMap: unitKnowledgeMapFixture()
  });

  assert.match(messages.user, /taskBriefPlan/);
  assert.match(messages.user, /练习任务设计者/);
  assert.match(messages.user, /Evidence-Centered Design 是你的思考方法/);
  assert.match(messages.user, /learning target -> observable evidence -> practiceGoal -> questionPlan/);
  assert.match(messages.user, /practiceGoal 不是 micro 的改写，而是可观察掌握目标/);
  assert.match(messages.user, /只保留 practiceGoals 和 questionPlans/);
  assert.match(messages.user, /不要输出 ECD 术语字段、推理链、候选矩阵或长篇解释/);
  assert.match(messages.user, /不要输出 practiceGoal\.id、questionPlan\.id、practiceGoalId 或 sourceAnchorId/);
  assert.match(messages.user, /goalIndex 是 1-based 数字/);
  assert.match(messages.user, /每个 high \/ medium microKnowledgePoint 都应进入覆盖判断/);
  assert.match(messages.user, /多角度 evidence coverage/);
  assert.match(messages.user, /互补角度包括：核心理解、边界辨析、误区识别、场景迁移、关系映射/);
  assert.match(messages.user, /可以为同一个 practiceGoal 设计多个 questionPlans/);
  assert.match(messages.user, /多个 questionPlans 应分别服务于不同 evidence angle/);
  assert.match(messages.user, /先判断 evidence 需要用户表现什么，再选择题型/);
  assert.match(messages.user, /matching 适合需要用户建立多个元素之间稳定对应关系的 evidence/);
  assert.match(messages.user, /结构、流程、角色、条件、场景、因果、特征、判断依据或适用边界/);
  assert.match(messages.user, /同级、可并列、可一一对应的关系/);
  assert.match(messages.user, /matching 不是机械名词释义/);
  assert.doesNotMatch(messages.user, /DMC|游戏化|心流|享乐|每个 unit 必须.*题|至少.*questionPlans|不要为了增加体量重复|模型层级 -> 对应作用|流程步骤 -> 目的|角色 -> 职责/);
});

test("questionDraftBatch prompt generates all planned questions without ECD JSON", () => {
  const messages = buildV2PromptMessages("questionDraftBatch", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    units: [
      {
        unit: unitFixture(),
        practicePlan: {
          unitId: "unit-01",
          practiceGoals: [],
          questionPlans: []
        },
        sourceContext: {
          blocks: [{ id: "p-001", type: "paragraph", text: "Hook 是流程控制器。" }],
          sourceContextNote: { mode: "unit_window", unitId: "unit-01" }
        }
      }
    ]
  });

  assert.match(messages.user, /questionDraftBatch/);
  assert.match(messages.user, /整章所有 unit 的选择题和连线题/);
  assert.match(messages.user, /不要输出 ECD 字段、推理链、候选矩阵或批注/);
  assert.match(messages.user, /不要新增 questionPlan；不要漏掉任何 questionPlan/);
  assert.match(messages.user, /unitDraftInputs/);
  assert.match(messages.user, /sourceContext/);
});

test("multipleChoiceDraftBatch prompt only generates planned multiple choice questions", () => {
  const messages = buildV2PromptMessages("multipleChoiceDraftBatch", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    units: [
      {
        unit: unitFixture(),
        practicePlan: {
          unitId: "unit-01",
          practiceGoals: [],
          questionPlans: [{ id: "q-001", type: "multiple_choice" }]
        },
        sourceContext: {
          blocks: [{ id: "p-001", type: "paragraph", text: "Hook 是流程控制器。" }],
          sourceContextNote: { mode: "unit_window", unitId: "unit-01" }
        }
      }
    ]
  });

  assert.match(messages.user, /multipleChoiceDraftBatch/);
  assert.match(messages.user, /只生成整章各 unit 的选择题/);
  assert.match(messages.user, /不要输出 ECD 字段、推理链、候选矩阵或批注/);
  assert.match(messages.user, /不要新增 questionPlan；不要漏掉任何 multiple_choice questionPlan/);
  assert.match(messages.user, /至少一个干扰项必须承载真实常见误区或混淆点/);
  assert.match(messages.user, /边界辨析/);
  assert.match(messages.user, /unitDraftInputs/);
});

test("multipleChoiceDraftUnitBatch prompt turns current unit briefs into evidence-based choices", () => {
  const messages = buildV2PromptMessages("multipleChoiceDraftUnitBatch", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    unit: unitFixture(),
    questionBriefs: [
      {
        questionPlanId: "q-001",
        sourceAnchorId: "anchor-unit-01",
        practiceGoal: {
          id: "goal-001",
          target: "用户能区分 Hook 的流程控制价值。",
          commonMisconception: "把 Hook 当成普通提示词。"
        },
        evidence: {
          microSummaries: ["Hook 在关键动作前后稳定触发规则和验证。"],
          evidenceAngles: ["boundary_discrimination", "misconception_detection"]
        }
      }
    ],
    sourceContext: {
      blocks: [{ id: "p-001", type: "paragraph", text: "Hook 是流程控制器。" }],
      sourceContextNote: { mode: "unit_window", unitId: "unit-01" }
    }
  });

  assert.match(messages.user, /multipleChoiceDraftUnitBatch/);
  assert.match(messages.user, /选择题任务生成器/);
  assert.match(messages.user, /掌握证据和常见误区/);
  assert.match(messages.user, /写题前先确认/);
  assert.match(messages.user, /定义理解、边界判断、误区识别、结构理解，还是场景迁移/);
  assert.match(messages.user, /表面合理/);
  assert.match(messages.user, /混淆边界、因果、适用条件、结构关系或场景迁移/);
  assert.match(messages.user, /像一个理解判断任务/);
  assert.match(messages.user, /不能为了变短牺牲关键区分点/);
  assert.match(messages.user, /把 correctUnderstanding 和 misconception 融合成一句短解释/);
  assert.match(messages.user, /不写逐项解析/);
  assert.doesNotMatch(messages.user, /移动端复习题设计者|世界顶级|请按 ECD 思考/);
});

test("matchingDraftBatch prompt only generates planned matching questions", () => {
  const messages = buildV2PromptMessages("matchingDraftBatch", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    units: [
      {
        unit: unitFixture(),
        practicePlan: {
          unitId: "unit-01",
          practiceGoals: [],
          questionPlans: [{ id: "q-002", type: "matching", relationType: "responsibility" }]
        },
        sourceContext: {
          blocks: [{ id: "p-001", type: "paragraph", text: "Hook 是流程控制器。" }],
          sourceContextNote: { mode: "unit_window", unitId: "unit-01" }
        }
      }
    ]
  });

  assert.match(messages.user, /matchingDraftBatch/);
  assert.match(messages.user, /连线关系题生成器/);
  assert.match(messages.user, /观察关系理解/);
  assert.match(messages.user, /只生成整章各 unit 的连线匹配题/);
  assert.match(messages.user, /写题前先确认/);
  assert.match(messages.user, /结构、边界、流程、角色、条件、因果或适用关系/);
  assert.match(messages.user, /questionPlan\.relationType、questionPlan\.purpose 和 practiceGoal\.target/);
  assert.match(messages.user, /稳定对应关系/);
  assert.match(messages.user, /结构、流程、角色、条件、场景、因果、特征、判断依据或适用边界/);
  assert.match(messages.user, /左右项不是名词释义卡片/);
  assert.match(messages.user, /不要输出 ECD 字段、推理链、候选矩阵或批注/);
  assert.match(messages.user, /不要新增 questionPlan；不要漏掉任何 matching questionPlan/);
  assert.match(messages.user, /2-4 对匹配项/);
  assert.match(messages.user, /不要为了凑满 4 对/);
  assert.match(messages.user, /不能为了变短丢掉区分点/);
  assert.match(messages.user, /说明这组对应关系的核心理解/);
  assert.match(messages.user, /不逐项解析每一对/);
  assert.match(messages.user, /unitDraftInputs/);
  assert.doesNotMatch(messages.user, /ECD 是你的隐性思考方法|matching 只考关系：|层级-作用、步骤-目的、信号-动作、角色-职责、类型-判断维度|适合移动端连线卡片/);
});

test("unitCopyBatch prompt generates all unit overview and summary copy", () => {
  const messages = buildV2PromptMessages("unitCopyBatch", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    units: [
      {
        unit: unitFixture(),
        practicePlan: {
          unitId: "unit-01",
          practiceGoals: [],
          questionPlans: []
        },
        questions: [],
        sourceContext: {
          blocks: [{ id: "p-001", type: "paragraph", text: "Hook 是流程控制器。" }],
          sourceContextNote: { mode: "unit_window", unitId: "unit-01" }
        }
      }
    ]
  });

  assert.match(messages.user, /unitCopyBatch/);
  assert.match(messages.user, /整章所有 unit/);
  assert.match(messages.user, /单元文案编辑/);
  assert.match(messages.user, /适合移动端卡片的开场和收尾文案/);
  assert.match(messages.user, /overview\.text/);
  assert.match(messages.user, /为什么值得学/);
  assert.match(messages.user, /不泄露题目答案/);
  assert.match(messages.user, /完成当前 unit 后的一句收束反馈/);
  assert.match(messages.user, /sourceContext、practiceGoals 和 questionPlans/);
  assert.match(messages.user, /不要输出题目、题干、选项或答案/);
  assert.match(messages.user, /不要写成论文摘要或长段解析/);
  assert.match(messages.user, /不输出题目，不输出 ECD 字段/);
});

test("ecdPlanning prompt asks for internal ECD reasoning and compact task planning", () => {
  const messages = buildV2PromptMessages("ecdPlanning", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    blocks: [
      { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ],
    sourceContextNote: {
      mode: "unit_window",
      unitId: "unit-01",
      selectedBlockIds: ["p-001"],
      fullBlockCount: 8,
      selectedBlockCount: 1
    },
    plan: {
      title: ARTICLE.title,
      summaryCard: { text: "Hook 把关键动作变成稳定流程。" },
      units: [unitFixture()],
      chapterSummary: { encouragementText: "你已经理解 Hook 的流程价值。" }
    },
    unitKnowledgeMap: unitKnowledgeMapFixture()
  });

  assert.match(messages.user, /ecdPlanning/);
  assert.match(messages.user, /unit_window/);
  assert.match(messages.user, /Evidence-Centered Design/);
  assert.match(messages.user, /compact task model/);
  assert.match(messages.user, /内部按 ECD 推理/);
  assert.match(messages.user, /unitKnowledgeMap\.microKnowledgePoints/);
  assert.match(messages.user, /不要在本阶段重新压缩/);
  assert.match(messages.user, /high 或 medium/);
  assert.match(messages.user, /assessableTargets/);
  assert.match(messages.user, /selectedTasks/);
  assert.match(messages.user, /targetIds/);
  assert.match(messages.user, /microIds/);
  assert.match(messages.user, /evidenceGoal/);
  assert.match(messages.user, /掌握证据组合/);
  assert.match(messages.user, /required 的 assessableTargets/);
  assert.match(messages.user, /不要输出 skippedEvidence、learningClaims、evidenceNeeds、taskPlan 或 articleUnderstanding/);
  assert.match(messages.user, /本阶段不生成用户可见题目/);
  assert.match(messages.user, /模型层级 -> 对应作用/);
  assert.doesNotMatch(messages.user, /DMC|游戏化|心流|享乐/);
});

test("multipleChoiceDraft prompt requires misconception-first distractors", () => {
  const messages = buildV2PromptMessages("multipleChoiceDraft", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    blocks: [
      { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ],
    unit: unitFixture(),
    practicePlan: practicePlanFixture()
  });

  assert.match(messages.user, /multipleChoiceDraft/);
  assert.match(messages.user, /生成 correctUnderstanding/);
  assert.match(messages.user, /生成 misconception/);
  assert.match(messages.user, /不能写“根据本文\/根据文章\/根据原文/);
  assert.match(messages.user, /正确选项不能明显更长/);
  assert.match(messages.user, /不要写“正确选项A\/B\/C\/D”/);
});

test("matchingDraft prompt only allows relation-value matching", () => {
  const messages = buildV2PromptMessages("matchingDraft", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    blocks: [
      { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ],
    unit: unitFixture(),
    practicePlan: practicePlanFixture()
  });

  assert.match(messages.user, /matchingDraft/);
  assert.match(messages.user, /职责、边界、使用时机、场景作用、验证维度或流程信号/);
  assert.match(messages.user, /优先生成层级-作用、步骤-目的、信号-动作、角色-职责、类型-判断维度/);
});

test("unitSummaryDraft prompt separates overview from first answer", () => {
  const messages = buildV2PromptMessages("unitSummaryDraft", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    blocks: [
      { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ],
    unit: unitFixture(),
    practicePlan: practicePlanFixture(),
    questions: []
  });

  assert.match(messages.user, /unitSummaryDraft/);
  assert.match(messages.user, /不能把第一题答案原样写成开场/);
  assert.match(messages.user, /只总结当前知识点/);
});

test("qualityJudge prompt checks source support and UI fitness", () => {
  const messages = buildV2PromptMessages("qualityJudge", {
    article: ARTICLE,
    reviewPath: { id: "chapter-001", units: [] }
  });

  assert.match(messages.user, /source anchor/);
  assert.match(messages.user, /选择题是否只有一个正确答案/);
  assert.match(messages.user, /连线题是否一一对应/);
  assert.match(messages.user, /发现上述任一严重问题时 verdict 必须是 revise 或 discard/);
});

test("unsupported prompt stage fails loudly", () => {
  assert.throws(
    () => buildV2PromptMessages("unknown", {}),
    /Unsupported V2 prompt stage: unknown/
  );
});

function unitFixture() {
  return {
    id: "unit-01",
    title: "Hook 是什么",
    nodeLabel: "流程控制",
    shortSummary: "Hook 是流程控制器。",
    detailSummary: "Hook 在关键动作前后稳定执行规则。",
    sourceAnchor: { id: "anchor-unit-01", blockIds: ["p-001"] }
  };
}

function unitKnowledgeMapFixture() {
  return {
    units: [
      {
        unitId: "unit-01",
        microKnowledgePoints: [
          {
            microId: "micro-unit-01-001",
            title: "Hook 核心定义",
            summary: "Hook 是关键动作前后的流程约束。",
            role: "definition",
            assessmentValue: "high",
            suggestedEvidenceAngles: ["definition_grasp"],
            sourceAnchorId: "anchor-unit-01",
            sourceSupport: "原文说明 Hook 是流程控制器。"
          }
        ]
      }
    ]
  };
}

function practicePlanFixture() {
  return {
    unitId: "unit-01",
    practiceGoals: [
      {
        id: "goal-01",
        kind: "core_understanding",
        target: "理解 Hook 是流程约束",
        commonMisconception: "把 Hook 当成更长提示词",
        sourceAnchorId: "anchor-unit-01"
      }
    ],
    questionPlans: [
      {
        id: "q-001",
        type: "multiple_choice",
        purpose: "light_understanding",
        practiceGoalId: "goal-01",
        sourceAnchorId: "anchor-unit-01"
      }
    ]
  };
}

function ecdContextFixture() {
  return {
    unitId: "unit-01",
    assessableTargets: [
      {
        targetId: "target-01",
        microIds: ["micro-unit-01-001"],
        title: "职责边界",
        learningTarget: "用户能区分 Hook 和 Prompt 的职责边界。",
        evidenceGoal: "用户能把不同工作流组件匹配到对应职责。",
        evidenceType: "map_structure_relation",
        coverageRequirement: "required",
        sourceAnchorId: "anchor-unit-01"
      }
    ],
    selectedTasks: [
      {
        questionPlanId: "q-001",
        targetIds: ["target-01"],
        microIds: ["micro-unit-01-001"],
        taskAffordance: "matching",
        taskPurpose: "role_responsibility_matching",
        evidenceGoal: "用户能把不同工作流组件匹配到对应职责。",
        assemblyReason: "该题直接服务于职责边界 evidence。"
      }
    ],
    skippedTargets: []
  };
}

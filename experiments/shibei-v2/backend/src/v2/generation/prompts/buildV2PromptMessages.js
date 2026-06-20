export function buildV2PromptMessages(stage, payload) {
  if (stage === "sourceMap") return buildSourceMapMessages(payload);
  if (stage === "reviewPathPlan") return buildReviewPathPlanMessages(payload);
  if (stage === "ecdPlanning") return buildEcdPlanningMessages(payload);
  if (stage === "unitPracticePlan") return buildUnitPracticePlanMessages(payload);
  if (stage === "multipleChoiceDraft") return buildMultipleChoiceDraftMessages(payload);
  if (stage === "matchingDraft") return buildMatchingDraftMessages(payload);
  if (stage === "unitSummaryDraft") return buildUnitSummaryDraftMessages(payload);
  if (stage === "qualityJudge") return buildQualityJudgeMessages(payload);

  throw new Error(`Unsupported V2 prompt stage: ${stage}`);
}

function baseSystem() {
  return [
    "你是拾贝 V2 的学习路径生成器。",
    "你必须优先遵守产品字段契约：字段要稳定、可验证、可被 SwiftUI 直接消费。",
    "不要输出 Markdown，不要输出解释文字，只输出符合调用方 JSON schema 的对象。"
  ].join("\n");
}

function buildSourceMapMessages({ article }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：sourceMap。",
      "任务：把原文切成稳定的 source block，供后续知识点和题目引用。",
      "要求：",
      "- 每个 block 必须有稳定 id，例如 p-001。",
      "- block.type 只能是 heading、paragraph、quote。",
      "- 保留原文语义顺序。",
      "- 不要生成知识点或题目。",
      "",
      renderArticle(article)
    ].join("\n")
  };
}

function buildReviewPathPlanMessages({ article, source, blocks }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：reviewPathPlan。",
      "任务：生成整章概要、知识点计划、章节完成页鼓励文案。",
      "字段语义：",
      "- chapter summary 是整章概要，解释整篇文章的主旨，不是知识点详情。",
      "- unit.nodeLabel 是主页路径节点弹窗里的知识点标题短语，可以直接复用合适的 unit.title；它不是完整摘要。",
      "- unit.shortSummary 是知识点短摘要，用于章节详情折叠态和列表预览，不用于主页节点弹窗。",
      "- unit.detailSummary 是知识点完整总结，用于展开态和出题上下文。",
      "- unit.overview 不在本阶段生成，留给 unitSummaryDraft 阶段。",
      "- 每个 unit.sourceAnchor 必须包含稳定 id 和 blockIds；id 建议使用 anchor-<unit id>。",
      "- 每个 unit.sourceAnchor.blockIds 必须引用 sourceMap 已有 block id。",
      "- chapterSummary.encouragementText 是章节完成页鼓励文案，要结合本章内容，不要空泛。",
      "质量规则：",
      "- summaryCard 要先点核心命题，再轻量带出展开方向，不要写成目录。",
      "- 按原文阅读顺序切分知识点，背景段和铺垫段不强行出题。",
      "- 每个 unit 只围绕一个清晰学习对象，不混入多个独立观点。",
      "- unit.nodeLabel 适合在节点浮窗中显示一到两行；通常是 4-24 个汉字或等价长度，例如“游戏化的概念与核心定义”“用户体验的演变：从可用性到享乐质量”。",
      "",
      renderSource(source, blocks),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildEcdPlanningMessages({ article, source, blocks, plan }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：ecdPlanning。",
      "任务：基于 Evidence-Centered Design，为已切好的 unit 建立内部出题规划；本阶段不生成用户可见题目。",
      "核心原则：",
      "- 先判断文章核心论点和可复习结构，再判断每个 unit 的学习主张。",
      "- 每个 learningClaim 要回答：用户学完这个知识点后，应该能理解、区分、迁移或识别什么。",
      "- 每个 evidenceNeed 要回答：什么可观察反应能证明用户掌握了这个 learningClaim。",
      "- 每个 taskPlan 要回答：哪种题型最适合收集这个 evidence，以及为什么。",
      "- unitAssemblyPlan 要说明本轮实际选择哪些 task；题目数量不写死，由 evidence 价值自然决定。",
      "- matching 不要被机械过滤。分层模型、类型集合、流程步骤、信号动作、角色职责等结构关系，如果原文有证据支撑，就应该作为高价值候选。",
      "- DMC 这类“模型层级 -> 设计作用”的知识点，通常适合 layer_role_matching。",
      "- 避免空泛“名词 -> 定义/贡献/描述”的弱匹配。",
      "字段约束：",
      "- knowledgeModel.units 必须覆盖并只引用 reviewPathPlan.units 里的 unitId。",
      "- knowledgeModel.units[].sourceAnchorId 必须引用对应 unit.sourceAnchor.id。",
      "- unitLearningClaims、unitEvidenceNeeds、unitTaskPlan、unitAssemblyPlan 都必须使用稳定 id，且引用关系必须闭合。",
      "- unitAssemblyPlan.selectedTasks[].questionPlanId 是后续题目计划 id，不是最终题目正文。",
      "",
      `reviewPathPlan:\n${JSON.stringify(plan, null, 2)}`,
      "",
      renderSource(source, blocks),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildUnitPracticePlanMessages({ article, source, blocks, unit }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：unitPracticePlan。",
      "任务：只为当前知识点设计练习计划，不生成用户可见题目。",
      "计划规则：",
      "- 输出 practiceGoals 和 questionPlans。",
      "- questionPlans 不写死数量；先根据 learningClaim / evidenceNeed 判断哪些题有证据价值，再生成对应计划。",
      "- 选择题可承担 light_understanding、scenario_application、boundary_check、misconception_check 等目的。",
      "- matching 适合训练分层模型、类型集合、流程步骤、信号动作、角色职责等关系；DMC 这类“模型层级 -> 设计作用”是高价值 matching。",
      "- 避免空泛“名词 -> 定义/贡献/描述”的机械配对，但不要误伤有明确关系证据的 matching。",
      "- 每个 practiceGoal 要写明 target 和 commonMisconception，供后续选择题生成真实干扰项。",
      "- questionPlans[].sourceAnchorId 必须等于当前 unit.sourceAnchor.id。",
      "",
      `当前 unit:\n${JSON.stringify(unit, null, 2)}`,
      "",
      renderSource(source, blocks),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildMultipleChoiceDraftMessages({ article, source, blocks, unit, practicePlan }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：multipleChoiceDraft。",
      "任务：按 practice plan 生成当前知识点的选择题。",
      "生成顺序必须遵守：",
      "1. 先确认每题考察目标。",
      "2. 生成 correctUnderstanding。",
      "3. 生成 misconception 或容易混淆点。",
      "4. 基于正确理解和误区生成 1 个正确选项与 3 个干扰项。",
      "5. 生成用户可见的单段 explanation。",
      "用户可见规则：",
      "- question.type 只能是 multiple_choice。",
      "- 题干要自足，不能写“根据本文/根据文章/根据原文/文中提到/这篇文章里/这里的/上述”。",
      "- 优先正向提问，不写没必要的“哪一项不是/最不应该”。",
      "- 选择题必须 4 个选项，只有一个正确答案。",
      "- 至少一个干扰项承载真实常见误区或混淆点，不能明显凑数。",
      "- 正确选项不能明显更长、更像标准答案。",
      "- explanation 要短、明确，适合底部反馈浮窗；不要写“正确选项A/B/C/D”。",
      "- 每道题的 sourceAnchorId 必须等于当前 unit.sourceAnchor.id。",
      "",
      `当前 unit:\n${JSON.stringify(unit, null, 2)}`,
      "",
      `practicePlan:\n${JSON.stringify(practicePlan, null, 2)}`,
      "",
      renderSource(source, blocks),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildMatchingDraftMessages({ article, source, blocks, unit, practicePlan }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：matchingDraft。",
      "任务：只生成 practice plan 中要求的高价值连线题。",
      "连线题规则：",
      "- question.type 只能是 matching。",
      "- 左右各 4 项，pairs 一一对应。",
      "- stem 必须说明匹配的关系：职责、边界、使用时机、场景作用、验证维度或流程信号。",
      "- 右侧必须是具体作用、处理方式、职责边界、判断结果、典型场景或验证维度。",
      "- 禁止只做“概念/名词/人物/案例 -> 定义/贡献/描述/特征”。",
      "- 如果无法形成自然 4 组关系，本阶段应该由上游跳过；不要为了凑数生成弱匹配。",
      "- explanation 要短、明确，适合底部反馈浮窗。",
      "- 每道题的 sourceAnchorId 必须等于当前 unit.sourceAnchor.id。",
      "",
      `当前 unit:\n${JSON.stringify(unit, null, 2)}`,
      "",
      `practicePlan:\n${JSON.stringify(practicePlan, null, 2)}`,
      "",
      renderSource(source, blocks),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildUnitSummaryDraftMessages({ article, source, blocks, unit, practicePlan, questions }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：unitSummaryDraft。",
      "任务：为当前知识点生成单元开场和单元总结，不生成题目。",
      "生成规则：",
      "- overview.text 是知识点开场页正文，帮助用户知道接下来复习哪个核心理念、方法、判断或关系。",
      "- overview 要和第一题分工明确，不能把第一题答案原样写成开场。",
      "- summary.title 通常写“单元完成”。",
      "- summary.text 只总结当前知识点，不总结整篇文章。",
      "- 文案要短、具体、适合移动端卡片。",
      "",
      `当前 unit:\n${JSON.stringify(unit, null, 2)}`,
      "",
      `practicePlan:\n${JSON.stringify(practicePlan, null, 2)}`,
      "",
      `已生成题目:\n${JSON.stringify(questions, null, 2)}`,
      "",
      renderSource(source, blocks),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildQualityJudgeMessages({ article, reviewPath }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：qualityJudge。",
      "任务：检查候选 review path 是否适合进入前端。",
      "检查重点：",
      "- source anchor 是否真实支撑每个知识点和题目。",
      "- 选择题是否只有一个正确答案。",
      "- 干扰项是否承载真实误区，正确选项是否过于像标准答案。",
      "- 连线题是否一一对应，且匹配的是职责、边界、时机、作用或验证维度，不是机械名词解释。",
      "- explanation 是否短、清晰、能解释题目核心，且不包含“正确选项A/B/C/D”。",
      "- 题干是否自足，是否避免“根据本文/根据文章/这里的/上述”等原文回忆词。",
      "- UI 是否能承载：选择题 4 项，连线题左右各 4 项。",
      "判定规则：",
      "- 发现上述任一严重问题时 verdict 必须是 revise 或 discard，不能 pass。",
      "",
      renderArticleMeta(article),
      "",
      `候选 reviewPath:\n${JSON.stringify(reviewPath, null, 2)}`
    ].join("\n")
  };
}

function renderArticle(article) {
  return [
    renderArticleMeta(article),
    "",
    "原文：",
    article.rawText || article.cleanedText || ""
  ].join("\n");
}

function renderArticleMeta(article) {
  return [
    `文章 id：${article.id || ""}`,
    `标题：${article.title || article.sourceTitle || ""}`,
    `作者：${article.author || article.sourceAccount || ""}`,
    `链接：${article.url || article.sourceUrl || ""}`
  ].join("\n");
}

function renderSource(source, blocks = []) {
  return [
    `source:\n${JSON.stringify(source || {}, null, 2)}`,
    `blocks:\n${JSON.stringify(blocks, null, 2)}`
  ].join("\n");
}

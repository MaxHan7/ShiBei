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
      "- knowledgeObjects 是内部知识对象地图：先列知识对象，再决定 unit。",
      "- 每个 knowledgeObjects[] 必须说明 knowledgeShape、roleInArticle、sourceBlockIds、boundaryDecision 和 boundaryReason。",
      "- boundaryDecision 只能是 standalone_unit、merge_fragment、context_only。",
      "- standalone_unit 表示该知识对象有独立 learning claim、独立 evidence 或天然题型，应该成为自己的 unit。",
      "- merge_fragment 表示它只是另一个知识对象的局部说明，可以并入一个 unit。",
      "- context_only 表示它是背景、铺垫或案例，不直接成为 unit。",
      "- units[].sourceKnowledgeObjectIds 必须引用 knowledgeObjects[].id，说明该 unit 来自哪些知识对象。",
      "- 每个 units[] 都必须是完整知识点对象，不能用 section/outline/目录项/骨架对象替代。",
      "- 每个 units[] 必须同时包含 id、order、title、nodeLabel、shortSummary、detailSummary、why、sourceAnchor。",
      "- 如果某段只能写成目录项，宁可不生成该 unit；不要输出缺字段的半成品 unit。",
      "质量规则：",
      "- summaryCard 要先点核心命题，再轻量带出展开方向，不要写成目录。",
      "- 按原文阅读顺序切分知识点，背景段和铺垫段不强行出题。",
      "- 不能把相关但独立的知识对象合并成一个 unit。相关不等于可合并。",
      "- layered_framework、process_steps、type_set、boundary_rule 如果有自己的原文证据和可观察 evidence，通常应是 standalone_unit。",
      "- DMC 模型是 standalone_unit 的典型例子：它是独立分层模型，不应被合并进“游戏化定义”这种概念 unit。",
      "- 优先选择最值得复习、能形成 evidence 的核心知识点；不要为了覆盖所有段落把每个小段都切成 unit。",
      "- 移动端第一版通常保留 4-7 个高价值完整 unit；如果文章特别短可以更少，如果特别密集也要优先合并相近对象。",
      "- 每个 unit 只围绕一个清晰学习对象，不混入多个独立观点。",
      "- unit.nodeLabel 适合在节点浮窗中显示一到两行；通常是 4-24 个汉字或等价长度，例如“游戏化的概念与核心定义”“用户体验的演变：从可用性到享乐质量”。",
      "- 输出前自检：units 数组里任意一个对象缺 nodeLabel、shortSummary、detailSummary、why 或 sourceAnchor，就删除或补完整该对象后再输出。",
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
      "- 对每个 unit，先拆 unitSubObjectives：一个大知识点内部有哪些可考、可观察、可被原文支撑的小目标。",
      "- unitSubObjectives 不是目录拆分；它们是 ECD 里的 assessment targets，用来避免大 unit 内部漏掉关键 evidence。",
      "- 每个 required subObjective 必须至少产生一个 learningClaim；claim 要回答：用户学完这个小目标后，应该能理解、区分、迁移或识别什么。",
      "- 每个重要 learningClaim 先列 unitEvidenceAngles：同一个知识点可以从 definition_grasp、structure_mapping、boundary_discrimination、misconception_detection、scenario_transfer、mechanism_reasoning、source_grounding 等多角度收集 evidence。",
      "- 多角度 evidence 不是机械加题量。只有当不同 angle 能产生不同可观察反应时才拆开；如果一个宽泛题无法支撑 claim，就必须拆出多个 required angle。",
      "- 每个 required learningClaim 必须至少产生一个 evidenceNeed；evidenceNeed 要回答：什么可观察反应能证明用户掌握了这个 claim。",
      "- 每个 evidenceNeed 必须引用一个 unitEvidenceAngles[].angleId，说明它属于哪个考察角度。",
      "- 每个 required evidenceNeed 的 coverageRequirement 必须写 required，并且后续必须被 unitAssemblyPlan.selectedTasks 覆盖。",
      "- 先列 evidence，再选 task affordance；题型服务于 evidence，不要先选题型再反推 evidence。",
      "- 每个 taskPlan 要回答：哪种题型最适合收集这个 evidence angle，以及为什么。",
      "- unitAssemblyPlan 要形成 coverage matrix：selectedTasks 覆盖所有 required evidence 和所有 required angles；题目数量不写死，由 required evidence angles 覆盖自然决定。",
      "- matching 不要被机械过滤。分层模型、类型集合、流程步骤、信号动作、角色职责等结构关系，如果原文有证据支撑，就应该作为高价值候选。",
      "- DMC 这类“模型层级 -> 设计作用”的知识点，通常适合 layer_role_matching。",
      "- 避免空泛“名词 -> 定义/贡献/描述”的弱匹配。",
      "- 如果一个 unit 内含多个同等重要的小目标，例如“核心定义”“边界误区”“DMC 层级作用”，不要只选一个宽泛题覆盖全部；应分别建立 evidence。",
      "字段约束：",
      "- knowledgeModel.units 必须覆盖并只引用 reviewPathPlan.units 里的 unitId。",
      "- knowledgeModel.units[].sourceAnchorId 必须引用对应 unit.sourceAnchor.id。",
      "- unitSubObjectives、unitLearningClaims、unitEvidenceAngles、unitEvidenceNeeds、unitTaskPlan、unitAssemblyPlan 都必须使用稳定 id，且引用关系必须闭合。",
      "- unitLearningClaims[].subObjectiveId、unitEvidenceAngles[].subObjectiveId 和 unitEvidenceNeeds[].subObjectiveId 必须引用 unitSubObjectives。",
      "- unitEvidenceAngles[].claimId 必须引用 unitLearningClaims；unitEvidenceNeeds[].angleId 必须引用 unitEvidenceAngles。",
      "- unitEvidenceNeeds[].coverageRequirement 只能是 required、supporting、optional；required 代表本轮必须覆盖。",
      "- unitTaskPlan[].angleIds 和 unitAssemblyPlan.selectedTasks[].angleIds 必须引用 unitEvidenceAngles。",
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

function buildUnitPracticePlanMessages({ article, source, blocks, unit, ecdContext }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：unitPracticePlan。",
      "任务：把当前 unit 的 ECD context 转换为现有 practiceGoals 和 questionPlans；不生成用户可见题目。",
      "转换规则：",
      "- 输出 practiceGoals 和 questionPlans。",
      "- 以 ECD context.assemblyPlan.selectedTasks 为唯一题型来源；不要重新选择题型，不要自行增加额外 matching。",
      "- questionPlans 的数量、顺序和 id 应跟 selectedTasks 对齐。",
      "- questionPlan.id 必须等于 selectedTask.questionPlanId。",
      "- selectedTask.taskAffordance 为 matching 时，questionPlan.type 写 matching；其他当前前端未支持的 affordance 先转换为 multiple_choice。",
      "- questionPlan.purpose 必须继承 selectedTask.taskPurpose。",
      "- questionPlan.type 为 matching 时，必须填写 relationType；relationType 只能是 responsibility、boundary、usage_timing、scenario_effect、verification_dimension、process_signal。",
      "- relationType 要从 selectedTask.taskPurpose 推导：layer_role_matching / role_responsibility_matching 通常是 responsibility；step_purpose_matching / signal_action_matching 通常是 process_signal；type_feature_matching 通常是 boundary 或 verification_dimension。",
      "- practiceGoal 要服务于 selectedTask.evidenceIds 对应的 evidenceNeed 和 learningClaim。",
      "- practiceGoal 和 questionPlan 要保留 selectedTask.angleIds；这些 angleIds 用于报告判断同一知识点是否被多角度考察。",
      "- 选择题可承担 light_understanding、scenario_application、boundary_check、misconception_check 等目的。",
      "- matching 只在 ECD selectedTasks 已经选择 matching 时出现；不要把其他 unit 套成 DMC 式 matching。",
      "- 避免空泛“名词 -> 定义/贡献/描述”的机械配对，但不要误伤有明确关系证据的 matching。",
      "- 每个 practiceGoal 要写明 target 和 commonMisconception，供后续选择题生成真实干扰项。",
      "- questionPlans[].sourceAnchorId 必须等于当前 unit.sourceAnchor.id。",
      "",
      `当前 unit:\n${JSON.stringify(unit, null, 2)}`,
      "",
      `ECD context:\n${JSON.stringify(ecdContext || {}, null, 2)}`,
      "",
      renderSource(source, blocks),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildMultipleChoiceDraftMessages({ article, source, blocks, unit, practicePlan, ecdContext }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：multipleChoiceDraft。",
      "任务：按 practice plan 生成当前知识点的选择题。",
      "ECD 使用方式：",
      "- 每道题必须服务于对应 questionPlan 背后的 ECD learningClaim、evidenceNeed 和 assemblyReason。",
      "- 不要重新改变题型或新增题；只把已有 questionPlan 写成可见选择题。",
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
      `ECD context:\n${JSON.stringify(ecdContext || {}, null, 2)}`,
      "",
      renderSource(source, blocks),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildMatchingDraftMessages({ article, source, blocks, unit, practicePlan, ecdContext }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：matchingDraft。",
      "任务：只生成 practice plan 中要求的高价值连线题。",
      "输出数量：questions.length 必须等于 practicePlan.questionPlans 中 type=matching 的数量；不要多生成，也不要少生成。",
      "id 对齐：每道题的 id 必须直接使用对应 matching questionPlan.id。",
      "ECD 使用方式：",
      "- 只实现 ECD selectedTasks 中已经选择 matching 的题。",
      "- stem、左右项和 explanation 必须贴合当前 unit 的 evidenceNeed 和 assemblyReason。",
      "- 不要把其他 unit 的好模式套到当前 unit；尤其不要把非 DMC unit 写成 DMC 三层匹配。",
      "连线题规则：",
      "- question.type 只能是 matching。",
      "- 左右必须各 4 项，pairs 必须正好 4 对，一一对应；少于 4 对会被前端合同拒绝。",
      "- 如果原始结构看起来只有 3 组，第四组必须来自当前 unit 中同级、有原文支撑的边界项、对照项、步骤项或角色项；不要虚构。",
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
      `ECD context:\n${JSON.stringify(ecdContext || {}, null, 2)}`,
      "",
      renderSource(source, blocks),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildUnitSummaryDraftMessages({ article, source, blocks, unit, practicePlan, questions, ecdContext }) {
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
      `ECD context:\n${JSON.stringify(ecdContext || {}, null, 2)}`,
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

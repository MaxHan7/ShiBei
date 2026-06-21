export function buildV2PromptMessages(stage, payload) {
  if (stage === "sourceMap") return buildSourceMapMessages(payload);
  if (stage === "reviewPathPlan") return buildReviewPathPlanMessages(payload);
  if (stage === "unitKnowledgeMap") return buildUnitKnowledgeMapMessages(payload);
  if (stage === "ecdPlanning") return buildEcdPlanningMessages(payload);
  if (stage === "taskBriefPlan") return buildTaskBriefPlanMessages(payload);
  if (stage === "questionDraftBatch") return buildQuestionDraftBatchMessages(payload);
  if (stage === "unitCopyBatch") return buildUnitCopyBatchMessages(payload);
  if (stage === "unitPracticePlan") return buildUnitPracticePlanMessages(payload);
  if (stage === "multipleChoiceDraft") return buildMultipleChoiceDraftMessages(payload);
  if (stage === "matchingDraft") return buildMatchingDraftMessages(payload);
  if (stage === "unitSummaryDraft") return buildUnitSummaryDraftMessages(payload);
  if (stage === "qualityJudge") return buildQualityJudgeMessages(payload);

  throw new Error(`Unsupported V2 prompt stage: ${stage}`);
}

function buildQuestionDraftBatchMessages({ article, source, units }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：questionDraftBatch。",
      "任务：按 taskBriefPlan 生成整章所有 unit 的选择题和连线题。",
      "核心设计方式：",
      "- ECD 是你的隐性思考方法：每道题都要服务于对应 practiceGoal 的可观察掌握证据。",
      "- 不要输出 ECD 字段、推理链、候选矩阵或批注。",
      "- 不要新增 questionPlan；不要漏掉任何 questionPlan。",
      "- 每个 unit 输出一个 units[] 对象，unitId 必须原样对应输入。",
      "- questions 数量必须等于该 unit 的 practicePlan.questionPlans 数量。",
      "选择题规则：",
      "- 题干要自足，不写“根据本文/根据文章/文中提到/上述/以下哪”。",
      "- 先抓正确理解，再用真实误区设计干扰项。",
      "- 4 个选项只能有一个正确答案；正确选项不能明显更长。",
      "- explanation 是答后浮窗里的一段短解释，不写逐项解析，不写“正确选项A/B/C/D”。",
      "连线题规则：",
      "- 左右必须各 4 项，pairs 正好 4 对，一一对应。",
      "- matching 只考关系：层级-作用、步骤-目的、信号-动作、角色-职责、类型-判断维度。",
      "- 如果某个 matching 计划看起来只有 3 组，第四组必须来自同一 unit 中有原文支撑的同级边界项、对照项、步骤项或角色项；不要虚构。",
      "- stem 要说明要匹配的关系，不写机械的“请将左侧与右侧匹配”。",
      "source 使用规则：",
      "- 每个 unit 都带有自己的 compact source window，只引用该 unit 的 sourceContext.blocks。",
      "- sourceAnchorId 必须等于 questionPlan.sourceAnchorId。",
      "",
      `source:\n${JSON.stringify(source || {}, null, 2)}`,
      "",
      `unitDraftInputs:\n${JSON.stringify(units || [], null, 2)}`,
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildUnitCopyBatchMessages({ article, source, units }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：unitCopyBatch。",
      "任务：为整章所有 unit 生成单元开场 overview 和单元完成 summary。",
      "规则：",
      "- 每个输入 unit 输出一个 units[] 对象，unitId 必须原样对应。",
      "- overview.text 是知识点开场页正文，帮助用户进入当前知识点。",
      "- overview 不要泄露题目答案，也不要复述第一题。",
      "- summary.title 通常写“单元完成”。",
      "- summary.text 只总结当前知识点，不总结整篇文章。",
      "- 文案短、具体、适合移动端卡片。",
      "- 不输出题目，不输出 ECD 字段。",
      "",
      `source:\n${JSON.stringify(source || {}, null, 2)}`,
      "",
      `unitCopyInputs:\n${JSON.stringify(units || [], null, 2)}`,
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildTaskBriefPlanMessages({ article, source, blocks, sourceContextNote, plan, unitKnowledgeMap }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：taskBriefPlan。",
      "任务：为整章所有 unit 一次性生成轻量练习任务简报；本阶段不生成用户可见题目。",
      "核心设计方式：",
      "- Evidence-Centered Design 是你的思考方法，不是要输出的字段。",
      "- 你要自然完成这条链路：学习对象 -> 可观察掌握证据 -> 适合的练习任务 -> 题型计划。",
      "- 输出只保留 practiceGoals 和 questionPlans；不要输出 ECD 术语字段、推理链、候选矩阵或长篇解释。",
      "- unitKnowledgeMap.microKnowledgePoints 是上游已经拆好的小知识点 inventory；不要重新压缩成一句大话。",
      "- 每个 high / medium microKnowledgePoint 都要被某个 practiceGoal 或 questionPlan 覆盖；context_only 可以不出题。",
      "- 一个 unit 可以有多个题目计划，数量由掌握证据和考察角度自然决定，不写死题目数。",
      "- 不要为了减少题量漏掉独立的小知识点；也不要为了凑题生成无证据的题。",
      "题型选择：",
      "- multiple_choice 适合核心理解、边界判断、误区识别、场景迁移。",
      "- matching 适合天然关系结构：分层模型、类型集合、流程步骤、信号动作、角色职责、验证维度。",
      "- DMC 这类“模型层级 -> 设计作用”的知识点，如果 microKnowledgePoints 中有对应关系，应生成 matching 计划。",
      "- matching 不是机械名词释义；它要考关系：层级-作用、步骤-目的、信号-动作、角色-职责、类型-判断维度。",
      "字段规则：",
      "- units 数组必须覆盖 reviewPathPlan.units 的每个 unit，且 unitId 一一对应。",
      "- practiceGoal.id 使用稳定 id，例如 goal-<unit id>-001。",
      "- questionPlan.id 使用稳定 id，例如 q-<unit order>-001。",
      "- practiceGoal.target 写成短句，最长约 30 个中文字，只描述用户要掌握什么。",
      "- practiceGoal.commonMisconception 写真实误区，最长约 20 个中文字。",
      "- practiceGoals 和 questionPlans 都只用 microIds 引用 unitKnowledgeMap.microKnowledgePoints；不要输出 targetIds。",
      "- 不要输出 microKnowledgePoint 的正文、定义或解释；只输出它们的 id。",
      "- questionPlans[].practiceGoalId 必须引用同一 unit 的 practiceGoals[].id。",
      "- questionPlans[].sourceAnchorId 和 practiceGoals[].sourceAnchorId 必须等于对应 unit.sourceAnchor.id。",
      "- questionPlans[].type 为 matching 时必须填写 relationType；multiple_choice 不要填写 relationType。",
      "",
      `reviewPathPlan:\n${JSON.stringify(plan, null, 2)}`,
      "",
      `unitKnowledgeMap:\n${JSON.stringify(unitKnowledgeMap || {}, null, 2)}`,
      "",
      renderSource(source, blocks, sourceContextNote),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
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
      "- 每个 units[] 都必须是完整知识点对象，不能用 section/outline/目录项/骨架对象替代。",
      "- 每个 units[] 必须同时包含 id、order、title、nodeLabel、shortSummary、detailSummary、why、sourceAnchor。",
      "- 如果某段只能写成目录项，宁可不生成该 unit；不要输出缺字段的半成品 unit。",
      "质量规则：",
      "- summaryCard 要先点核心命题，再轻量带出展开方向，不要写成目录。",
      "- 按原文阅读顺序切分知识点，背景段和铺垫段不强行出题。",
      "- 不能把相关但独立的大知识点合并成一个 unit。相关不等于可合并。",
      "- layered_framework、process_steps、type_set、boundary_rule 如果有自己的原文证据和后续可观察 evidence，通常应该拆成独立 unit。",
      "- DMC 模型是独立 unit 的典型例子：它是独立分层模型，不应被合并进“游戏化定义”这种概念 unit。",
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

function buildUnitKnowledgeMapMessages({ article, source, blocks, sourceContextNote, plan }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：unitKnowledgeMap。",
      "任务：只为每个已确定的 unit 拆出内部 microKnowledgePoints；本阶段不生成题目、不选择题型、不做 selectedTasks。",
      "为什么需要这一层：",
      "- 一个 unit 是大知识点，内部通常包含多个可学习的小知识点。",
      "- 这些小知识点是后续 ECD evidence 和题目生成的上游 inventory。",
      "- 本阶段的目标是完整发现，不是压缩、筛选或组装题目。",
      "拆分原则：",
      "- 对每个 reviewPathPlan.units[] 都输出一个 units[] 对象。",
      "- microKnowledgePoints 要覆盖该 unit 内所有有学习价值、可被原文支撑的小点。",
      "- microKnowledgePoints 可以是定义、边界、模型层级、机制、流程步骤、场景应用、误区、案例或关系。",
      "- 不要因为后续可能题目多，就把多个小点合成一句大话。",
      "- 不要为了控制题量而删掉原文中重要的小点；题量控制留给后续 assembly。",
      "- assessmentValue 只描述这个小点的考察价值：high、medium、low、context_only。",
      "- context_only 只能用于背景、铺垫或不适合直接考察的案例，并要在 summary/sourceSupport 里看得出原因。",
      "- 对 DMC 这类分层模型，要把整体结构、每一层的作用、层级关系或边界分别拆出来。",
      "- 对流程、信号、角色、类型集合，要保留能形成 matching 或场景判断的关系小点。",
      "输出字段：",
      "- microId 使用稳定 id，例如 micro-<unit id>-001。",
      "- title 是短标题，可用于人工报告对比。",
      "- summary 是一两句说明这个小点是什么。",
      "- role 只能使用 schema enum。",
      "- suggestedEvidenceAngles 只写建议观察角度，例如 definition_grasp、structure_mapping、boundary_discrimination、misconception_detection、scenario_transfer、mechanism_reasoning。",
      "- sourceAnchorId 必须引用当前 unit.sourceAnchor.id。",
      "- sourceSupport 写该小点由原文哪一部分支撑，不粘贴长原文。",
      "",
      `reviewPathPlan:\n${JSON.stringify(plan, null, 2)}`,
      "",
      renderSource(source, blocks, sourceContextNote),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildEcdPlanningMessages({ article, source, blocks, sourceContextNote, plan, unitKnowledgeMap }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：ecdPlanning。",
      "任务：基于 Evidence-Centered Design，只为本次输入的单个 unit 建立 compact task model；本阶段不生成用户可见题目。",
      "核心原则：",
      "- 你需要在内部按 ECD 推理：micro knowledge point -> assessable target -> evidence goal -> selected task。",
      "- 不要把内部推理链、文章结构分析、learningClaim 草稿、evidenceNeed 草稿或候选任务矩阵输出到 JSON。",
      "- unitKnowledgeMap.microKnowledgePoints 是上游已经拆好的小知识点 inventory；不要在本阶段重新压缩它。",
      "- 对每个 assessmentValue 为 high 或 medium 的 microKnowledgePoint，优先保留为 assessableTargets；low 可合并到相邻 target；context_only 通常不进入 selectedTasks。",
      "- assessableTargets 是可考察目标，不是完整 ECD 论文；每个 target 只写学习目标、证据目标、覆盖级别和所覆盖 microIds。",
      "- selectedTasks 是最终选择的题目计划；题型服务于 evidenceGoal，不要先选题型再反推目标。",
      "- selectedTasks 必须覆盖所有 coverageRequirement=required 的 assessableTargets，并优先纳入有独立观察价值的 supporting target。",
      "- 题目数量由 evidence value 和掌握证据组合自然决定；一个 unit 可以因为多个可观察理解点而生成多道题，但不要输出未被选择的候选任务。",
      "- matching 应被积极用于天然结构关系：分层模型、类型集合、流程步骤、信号动作、角色职责等关系，如果原文有证据支撑，就是高价值候选。",
      "- DMC 这类“模型层级 -> 设计作用”的知识点，通常适合 layer_role_matching。",
      "- matching 的价值来自关系本身：层级-作用、步骤-目的、信号-动作、角色-职责、类型-判断维度都比孤立名词释义更适合连线。",
      "- 如果一个 unit 内含多个同等重要的小目标，例如“核心定义”“边界误区”“DMC 层级作用”，应分别建立 assessableTargets，并让 selectedTasks 呈现这些互补角度。",
      "字段约束：",
      "- reviewPathPlan.units 在本阶段只会包含当前这一个 unit；只输出 units 数组中的这一个 unit。",
      "- units[].unitId 必须等于当前 unit.id；units[].sourceAnchorId 必须等于当前 unit.sourceAnchor.id。",
      "- units[].assessableTargets[].targetId 使用稳定 id，例如 target-<unit id>-001。",
      "- units[].assessableTargets[].microIds 必须引用 unitKnowledgeMap 中当前 unit 的 microKnowledgePoints[].microId。",
      "- units[].assessableTargets[].coverageRequirement 只能是 required、supporting、optional；required 代表本轮必须覆盖。",
      "- units[].selectedTasks[].questionPlanId 是后续题目计划 id，不是最终题目正文，例如 q-001。",
      "- units[].selectedTasks[].targetIds 必须引用同一 unit 的 assessableTargets[].targetId。",
      "- units[].selectedTasks[].microIds 必须汇总该任务覆盖的 microKnowledgePoints[].microId。",
      "- units[].selectedTasks[].evidenceGoal 写可观察证据目标，用于后续 practiceGoal.target 和题目生成。",
      "- units[].selectedTasks[].commonMisconception 写该任务最可能暴露的误区，用于后续选择题干扰项和答后解释。",
      "- 如跳过非 required target，可写 skippedTargets；不要输出 skippedEvidence、learningClaims、evidenceNeeds、taskPlan 或 articleUnderstanding。",
      "",
      `reviewPathPlan:\n${JSON.stringify(plan, null, 2)}`,
      "",
      `unitKnowledgeMap:\n${JSON.stringify(unitKnowledgeMap || {}, null, 2)}`,
      "",
      renderSource(source, blocks, sourceContextNote),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildUnitPracticePlanMessages({ article, source, blocks, sourceContextNote, unit, ecdContext }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：unitPracticePlan。",
      "任务：把当前 unit 的 ECD context 转换为现有 practiceGoals 和 questionPlans；不生成用户可见题目。",
      "转换规则：",
      "- 输出 practiceGoals 和 questionPlans。",
      "- 以 ECD context.selectedTasks 为计划来源，保持 ECD 已选择的 compact task 组合。",
      "- questionPlans 的数量、顺序和 id 应跟 selectedTasks 对齐。",
      "- questionPlan.id 必须等于 selectedTask.questionPlanId。",
      "- selectedTask.taskAffordance 为 matching 时，questionPlan.type 写 matching；其他当前前端未支持的 affordance 先转换为 multiple_choice。",
      "- questionPlan.purpose 必须继承 selectedTask.taskPurpose。",
      "- practiceGoals 和 questionPlans 都要保留 selectedTask.targetIds 与 selectedTask.microIds。",
      "- questionPlan.type 为 matching 时，必须填写 relationType；relationType 只能是 responsibility、boundary、usage_timing、scenario_effect、verification_dimension、process_signal。",
      "- relationType 要从 selectedTask.taskPurpose 推导：layer_role_matching / role_responsibility_matching 通常是 responsibility；step_purpose_matching / signal_action_matching 通常是 process_signal；type_feature_matching 通常是 boundary 或 verification_dimension。",
      "- practiceGoal 要服务于 selectedTask.evidenceGoal 和 targetIds 对应的 assessableTargets。",
      "- 选择题可承担 light_understanding、scenario_application、boundary_check、misconception_check 等目的。",
      "- matching 跟随 ECD selectedTasks：当 selectedTask 已选择 matching，要保留它的关系目的。",
      "- matching 优先表达当前 unit 自身的层级、边界、步骤、信号、角色等关系证据。",
      "- 每个 practiceGoal 要写明 target 和 commonMisconception，供后续选择题生成真实干扰项。",
      "- questionPlans[].sourceAnchorId 必须等于当前 unit.sourceAnchor.id。",
      "",
      `当前 unit:\n${JSON.stringify(unit, null, 2)}`,
      "",
      `ECD context:\n${JSON.stringify(ecdContext || {}, null, 2)}`,
      "",
      renderSource(source, blocks, sourceContextNote),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildMultipleChoiceDraftMessages({ article, source, blocks, sourceContextNote, unit, practicePlan, ecdContext }) {
  const ecdContextSection = ecdContext
    ? [`ECD context:\n${JSON.stringify(ecdContext, null, 2)}`, ""]
    : [];
  return {
    system: baseSystem(),
    user: [
      "阶段：multipleChoiceDraft。",
      "任务：按 practice plan 生成当前知识点的选择题。",
      "设计方式：",
      "- practicePlan 已经体现学习对象、掌握证据和题型选择；本阶段不要重新改变题型或新增题。",
      "- 每道题必须服务于对应 questionPlan 和 practiceGoal。",
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
      ...ecdContextSection,
      renderSource(source, blocks, sourceContextNote),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildMatchingDraftMessages({ article, source, blocks, sourceContextNote, unit, practicePlan, ecdContext }) {
  const ecdContextSection = ecdContext
    ? [`ECD context:\n${JSON.stringify(ecdContext, null, 2)}`, ""]
    : [];
  return {
    system: baseSystem(),
    user: [
      "阶段：matchingDraft。",
      "任务：只生成 practice plan 中要求的高价值连线题。",
      "输出数量：questions.length 必须等于 practicePlan.questionPlans 中 type=matching 的数量；不要多生成，也不要少生成。",
      "id 对齐：每道题的 id 必须直接使用对应 matching questionPlan.id。",
      "设计方式：",
      "- 只实现 practicePlan 中已经选择 matching 的题。",
      "- stem、左右项和 explanation 必须贴合当前 unit 的关系目的和掌握证据。",
      "- matching 应实现当前 unit 自身的关系目的；非 DMC unit 可以使用自己的步骤、边界、信号或角色关系。",
      "连线题规则：",
      "- question.type 只能是 matching。",
      "- 左右必须各 4 项，pairs 必须正好 4 对，一一对应；少于 4 对会被前端合同拒绝。",
      "- 如果原始结构看起来只有 3 组，第四组必须来自当前 unit 中同级、有原文支撑的边界项、对照项、步骤项或角色项；不要虚构。",
      "- stem 必须说明匹配的关系：职责、边界、使用时机、场景作用、验证维度或流程信号。",
      "- 右侧必须是具体作用、处理方式、职责边界、判断结果、典型场景或验证维度。",
      "- 优先生成层级-作用、步骤-目的、信号-动作、角色-职责、类型-判断维度这类有关系价值的 matching。",
      "- 如果 selected task 是 matching，应尽量实现它的关系目的，并从当前 unit 的同级证据中补足 4 组。",
      "- explanation 要短、明确，适合底部反馈浮窗。",
      "- 每道题的 sourceAnchorId 必须等于当前 unit.sourceAnchor.id。",
      "",
      `当前 unit:\n${JSON.stringify(unit, null, 2)}`,
      "",
      `practicePlan:\n${JSON.stringify(practicePlan, null, 2)}`,
      "",
      ...ecdContextSection,
      renderSource(source, blocks, sourceContextNote),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildUnitSummaryDraftMessages({ article, source, blocks, sourceContextNote, unit, practicePlan, questions, ecdContext }) {
  const ecdContextSection = ecdContext
    ? [`ECD context:\n${JSON.stringify(ecdContext, null, 2)}`, ""]
    : [];
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
      ...ecdContextSection,
      `已生成题目:\n${JSON.stringify(questions, null, 2)}`,
      "",
      renderSource(source, blocks, sourceContextNote),
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

function renderSource(source, blocks = [], sourceContextNote = null) {
  return [
    `source:\n${JSON.stringify(source || {}, null, 2)}`,
    sourceContextNote
      ? `sourceContextNote:\n${JSON.stringify(sourceContextNote, null, 2)}`
      : "",
    `blocks:\n${JSON.stringify(blocks, null, 2)}`
  ].filter(Boolean).join("\n");
}

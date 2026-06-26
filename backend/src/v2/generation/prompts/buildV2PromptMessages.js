export function buildV2PromptMessages(stage, payload) {
  if (stage === "sourceMap") return buildSourceMapMessages(payload);
  if (stage === "reviewPathPlan") return buildReviewPathPlanMessages(payload);
  if (stage === "unitKnowledgeMap") return buildUnitKnowledgeMapMessages(payload);
  if (stage === "ecdPlanning") return buildEcdPlanningMessages(payload);
  if (stage === "taskBriefPlan") return buildTaskBriefPlanMessages(payload);
  if (stage === "questionDraftBatch") return buildQuestionDraftBatchMessages(payload);
  if (stage === "multipleChoiceDraftBatch") return buildMultipleChoiceDraftBatchMessages(payload);
  if (stage === "multipleChoiceDraftUnitBatch") return buildMultipleChoiceDraftUnitBatchMessages(payload);
  if (stage === "matchingDraftBatch") return buildMatchingDraftBatchMessages(payload);
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
      "- 生成每道题时按这个内部顺序执行：先确认 questionPlan 的考察目标，再确认正确理解，再确认 commonMisconception 或容易混淆点，最后生成 1 个正确选项与 3 个干扰项。",
      "- 至少一个干扰项必须承载真实常见误区或混淆点，不能只是明显错误、无关事实或为了凑数。",
      "- 4 个选项只能有一个正确答案；正确选项不能明显更长。",
      "- 如果 questionPlan 的 purpose 是 boundary_clarification 或 practiceGoal 带有 commonMisconception，选项必须体现边界辨析，而不是退化成简单事实识别。",
      "- explanation 是答后浮窗里的一段短解释，不写逐项解析，不写“正确选项A/B/C/D”。",
      "连线题规则：",
      "- 根据原文中自然存在的关系生成 2-4 对匹配项；leftItems、rightItems、pairs 数量必须一致，一一对应。",
      "- matching 只考关系：层级-作用、步骤-目的、信号-动作、角色-职责、类型-判断维度。",
      "- 不要为了凑满 4 对而补弱关系或虚构关系；2/3 对高价值关系优先于 4 对低价值关系。",
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

function buildMultipleChoiceDraftBatchMessages({ article, source, units }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：multipleChoiceDraftBatch。",
      "任务：按 taskBriefPlan 只生成整章各 unit 的选择题。",
      "核心设计方式：",
      "- ECD 是你的隐性思考方法：题目要让用户表现出对应 practiceGoal 的可观察掌握证据。",
      "- 不要输出 ECD 字段、推理链、候选矩阵或批注。",
      "- 不要新增 questionPlan；不要漏掉任何 multiple_choice questionPlan。",
      "- 每个输出 unitId 必须原样对应输入。",
      "- questions 数量必须等于该 unit 的 multiple_choice questionPlans 数量。",
      "选择题规则：",
      "- 题干要自足，不写“根据本文/根据文章/文中提到/上述/以下哪”。",
      "- 生成每道题时按这个内部顺序执行：先确认 questionPlan 的考察目标，再确认正确理解，再确认 commonMisconception 或容易混淆点，最后生成 1 个正确选项与 3 个干扰项。",
      "- 至少一个干扰项必须承载真实常见误区或混淆点，不能只是明显错误、无关事实或为了凑数。",
      "- 4 个选项只能有一个正确答案；正确选项不能明显更长。",
      "- 如果 questionPlan 的 purpose 是 boundary_clarification 或 practiceGoal 带有 commonMisconception，选项必须体现边界辨析，而不是退化成简单事实识别。",
      "- 选项尽量短，考理解、边界、误区或场景迁移，不做阅读理解复述。",
      "- explanation 是答后浮窗里的一段短解释，不写逐项解析，不写“正确选项A/B/C/D”。",
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

function buildMultipleChoiceDraftUnitBatchMessages({
  article,
  source,
  unit,
  questionBriefs,
  sourceContext
}) {
  return {
    system: baseSystem(),
    user: [
      "阶段：multipleChoiceDraftUnitBatch。",
      "短角色：你在这一阶段扮演选择题任务生成器；目标是把 questionBrief 中的掌握证据和常见误区转成一题可作答的选择题。",
      "任务：只为当前 unit 生成选择题小批次；不要生成其他 unit 的题。",
      "输入边界：",
      "- 当前调用只包含一个 unit、这个 unit 的 multiple_choice questionBriefs、以及这个 unit 的 sourceContext。",
      "- 不要重做知识点规划；每个 questionBrief 生成一题。",
      "- 输出 unitId 必须等于当前 unit.id。",
      "- questions 数量必须等于 questionBriefs 数量，题目 id 必须等于 questionBrief.questionPlanId。",
      "ECD 设计约束：",
      "- 写题前先确认：这题要观察的 evidence 是定义理解、边界判断、误区识别、结构理解，还是场景迁移。",
      "- 每题必须围绕 questionBrief.practiceGoal.target 的可观察掌握证据来写。",
      "- 每题必须使用 questionBrief.practiceGoal.commonMisconception 设计至少一个真实干扰项。",
      "- 干扰项应表面合理，但混淆边界、因果、适用条件、结构关系或场景迁移。",
      "- 干扰项还要参考 evidence.microSummaries 和 evidence.evidenceAngles，体现边界、误区、结构或迁移混淆。",
      "- 不要输出完整 ECD JSON，不要输出推理链、候选矩阵或批注。",
      "选择题规则：",
      "- 题干要自足，像一个理解判断任务，不写“根据本文/根据文章/文中提到/上述/以下哪”。",
      "- 4 个选项只能有一个正确答案；正确选项不能明显更长。",
      "- 选项应适合小屏阅读：优先短句，但不能为了变短牺牲关键区分点。",
      "- correctUnderstanding 写正确理解，misconception 写本题主要误区。",
      "- explanation 是用户答后看到的一句纠偏反馈：把 correctUnderstanding 和 misconception 融合成一句短解释，帮助用户形成正确理解并避开容易混淆的点。",
      "- explanation 不写逐项解析，不写“正确选项A/B/C/D”。",
      "source 使用规则：",
      "- 只能引用当前 sourceContext.blocks，不要使用整章全文或其他 unit 的 source blocks。",
      "- sourceAnchorId 必须等于 questionBrief.sourceAnchorId。",
      "",
      `source:\n${JSON.stringify(source || {}, null, 2)}`,
      "",
      `unit:\n${JSON.stringify(unit || {}, null, 2)}`,
      "",
      `questionBriefs:\n${JSON.stringify(questionBriefs || [], null, 2)}`,
      "",
      `sourceContext:\n${JSON.stringify(sourceContext || {}, null, 2)}`,
      ""
    ].join("\n")
  };
}

function buildMatchingDraftBatchMessages({ article, source, units }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：matchingDraftBatch。",
      "短角色：你在这一阶段扮演连线关系题生成器；目标是把已有 matching questionPlan 转成一题能观察关系理解的连线题。",
      "任务：按 taskBriefPlan 只生成整章各 unit 的连线匹配题。",
      "关系任务设计：",
      "- 写题前先确认：这组匹配关系能证明用户理解了什么结构、边界、流程、角色、条件、因果或适用关系。",
      "- 每道题必须围绕对应 questionPlan.relationType、questionPlan.purpose 和 practiceGoal.target 来写。",
      "- matching 只适合稳定对应关系，例如结构、流程、角色、条件、场景、因果、特征、判断依据或适用边界。",
      "- 左右项不是名词释义卡片；用户正确匹配后，应能证明他理解元素之间为什么这样对应。",
      "- 不要输出 ECD 字段、推理链、候选矩阵或批注。",
      "- 不要新增 questionPlan；不要漏掉任何 matching questionPlan。",
      "- 每个输出 unitId 必须原样对应输入。",
      "- questions 数量必须等于该 unit 的 matching questionPlans 数量。",
      "连线题规则：",
      "- 根据原文中自然存在的关系生成 2-4 对匹配项；leftItems、rightItems、pairs 数量必须一致，一一对应。",
      "- 不要为了凑满 4 对而补弱关系或虚构关系；2/3 对高价值关系优先于 4 对低价值关系。",
      "- stem 要说明要匹配的关系，不写机械的“请将左侧与右侧匹配”。",
      "- 左右项应适合小屏卡片阅读：短、清楚、可比较，但不能为了变短丢掉区分点。",
      "- explanation 是答后的一句纠偏反馈：说明这组对应关系的核心理解，并指出容易混淆的关系边界；不逐项解析每一对。",
      "source 使用规则：",
      "- 每个 unit 都带有自己的 compact source window，只引用该 unit 的 sourceContext.blocks。",
      "- sourceAnchorId 必须等于 questionPlan.sourceAnchorId。",
      "",
      `source:\n${JSON.stringify(source || {}, null, 2)}`,
      "",
      `unitDraftInputs:\n${JSON.stringify(units || [], null, 2)}`,
      ""
    ].join("\n")
  };
}

function buildUnitCopyBatchMessages({ article, source, units }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：unitCopyBatch。",
      "任务：为整章所有 unit 生成单元开场 overview 和单元完成 summary。",
      "短角色：你在这一阶段扮演单元文案编辑；目标是把当前知识点写成适合移动端卡片的开场和收尾文案。",
      "输入说明：",
      "- unitCopyInputs 只包含精简后的 unit 元信息和 practiceSignals。",
      "- 本阶段不会收到 sourceContext.blocks、完整 questionPlans 或完整题目草稿。",
      "规则：",
      "- 每个输入 unit 输出一个 units[] 对象，unitId 必须原样对应。",
      "- overview.text 是知识点开场页正文，帮助用户知道这个知识点在讲什么、为什么值得学。",
      "- overview 只铺垫当前 unit 的核心，不泄露题目答案，也不复述第一题。",
      "- summary.text 是完成当前 unit 后的一句收束反馈，只总结当前知识点，不总结整篇文章。",
      "- 可以参考 unit 的 title、shortSummary、detailSummary、why 和 practiceSignals.focusTargets 来把握重点。",
      "- 不要输出题目、题干、选项或答案。",
      "- 文案短、具体、温和，适合移动端卡片；不要写成论文摘要或长段解析。",
      "- 不输出题目，不输出 ECD 字段。",
      "",
      `source:\n${JSON.stringify(source || {}, null, 2)}`,
      "",
      `unitCopyInputs:\n${JSON.stringify(units || [], null, 2)}`,
      ""
    ].join("\n")
  };
}

function buildTaskBriefPlanMessages({ article, source, blocks, sourceContextNote, plan, unitKnowledgeMap }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：taskBriefPlan。",
      "任务：只为当前输入的单个 unit 生成 compact practiceGoals 和 questionPlans；本阶段不生成用户可见题目。",
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
      "- 如果 microKnowledgePoints 中存在清晰的结构、流程、角色、条件、特征或判断依据等对应关系，应生成 matching 计划。",
      "- matching 不是机械名词释义；它要考用户是否理解元素之间的关系。",
      "字段规则：",
      "- 本次输入的 reviewPathPlan.units 只包含当前 unit；只输出 units 数组中的这一个 unit。",
      "- 只使用当前 unit 的 unitKnowledgeMap.microKnowledgePoints；不要引用其他 unit。",
      "- 不要输出 practiceGoal.id、questionPlan.id、practiceGoalId 或 sourceAnchorId；这些稳定字段由后端 adapter 自动补齐。",
      "- practiceGoal.target 写成短句，最长约 30 个中文字，只描述用户要掌握什么。",
      "- practiceGoal.commonMisconception 写真实误区，最长约 20 个中文字。",
      "- practiceGoals 和 questionPlans 都只用 microIds 引用 unitKnowledgeMap.microKnowledgePoints；不要输出 targetIds。",
      "- 不要输出 microKnowledgePoint 的正文、定义或解释；只输出它们的 id。",
      "- questionPlans[].goalIndex 是 1-based 数字，指向同一 unit 的第几个 practiceGoal。",
      "- questionPlans[].type 为 matching 时必须填写 relationType；multiple_choice 不要填写 relationType。",
      "",
      `reviewPathPlan:\n${JSON.stringify(plan, null, 2)}`,
      "",
      `unitKnowledgeMap:\n${JSON.stringify(unitKnowledgeMap || {}, null, 2)}`,
      "",
      renderSource(source, blocks, sourceContextNote)
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
      "移动端长度上限：",
      "- title 不超过 36 字符。",
      "- summaryCard.text 不超过 96 字符。",
      "- unit.title 不超过 40 字符。",
      "- unit.nodeLabel 不超过 24 字符。",
      "- unit.shortSummary 不超过 56 字符。",
      "- unit.detailSummary 不超过 180 字符。",
      "- unit.why 不超过 96 字符。",
      "- chapterSummary.encouragementText 不超过 96 字符。",
      "- 每个 units[] 都必须是完整知识点对象，不能用 section/outline/目录项/骨架对象替代。",
      "- 每个 units[] 必须同时包含 id、order、title、nodeLabel、shortSummary、detailSummary、why、sourceAnchor。",
      "- 如果某段只能写成目录项，宁可不生成该 unit；不要输出缺字段的半成品 unit。",
      "质量规则：",
      "- 先识别文章核心命题和阅读主线，再按原文顺序切分 unit。",
      "- summaryCard 要先点核心命题，再轻量带出展开方向，不要写成目录。",
      "- unit 是可复习的独立学习对象，不是目录项、段落标题或普通摘要。",
      "- 判断一个内容是否成为 unit 时，依次检查：它是否有清晰学习对象；是否由具体 source blocks 支撑；用户掌握它后是否能形成可观察 evidence；它和相邻 unit 是依赖关系还是同一个学习对象。",
      "- 背景、例子、铺垫不自动成为 unit；但如果它承载独立概念、机制、边界、流程、模型或方法，也应成为 unit。",
      "- 不能把相关但独立的大知识点合并成一个 unit。相关不等于可合并。",
      "- layered_framework、process_steps、type_set、boundary_rule 如果有自己的原文证据和后续可观察 evidence，通常应该拆成独立 unit。",
      "- 具有独立分层结构、流程步骤、类型集合或边界规则的知识对象，如果有自己的原文证据和后续可观察 evidence，通常应作为独立 unit，不应被合并进相邻的宽泛概念 unit。",
      "- 不要把每个段落机械切成 unit；但只要某段承载独立学习对象并有 source evidence，就应保留，不因压缩数量而合并或删除。",
      "- unit 数量由文章长度、结构密度、独立学习对象数量和可观察 evidence 决定；不要使用固定范围控制产量。",
      "- 短文可以只有少量 unit；长文或结构密集文章可以有更多 unit。合并只发生在学习对象确实相同或高度依赖时，不为压缩数量而合并独立知识点。",
      "- 每个 unit 只围绕一个清晰学习对象，不混入多个独立观点。",
      "- sourceAnchor 必须能支撑该 unit 的 title、shortSummary、detailSummary 和 why；不要只挂一个附近但不能支撑学习对象的段落。",
      "- unit.nodeLabel 适合在节点浮窗中显示一到两行；通常是 4-24 个汉字或等价长度，例如“核心概念与边界”“流程步骤与作用”“模型层级与职责”。",
      "- 输出前自检：units 数组里任意一个对象缺 nodeLabel、shortSummary、detailSummary、why 或 sourceAnchor，就删除或补完整该对象后再输出。",
      "",
      renderSource(source, blocks),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildUnitKnowledgeMapMessages({ article, source, blocks, sourceContextNote, plan, compactRetry = false }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：unitKnowledgeMap。",
      "任务：为当前输入的 unit 识别有学习价值的子知识点 microKnowledgePoints；本阶段不生成题目、不选择题型、不做 selectedTasks。",
      "为什么需要这一层：",
      "- 一个 unit 是大知识点，内部可能包含多个值得用户单独理解的子知识点。",
      "- 这些子知识点是后续 ECD evidence 和题目生成的上游 inventory。",
      "拆分原则：",
      "- 本次输入可能只包含一个 unit；只为输入 plan.units[] 中出现的 unit 输出 units[]。",
      "- 对每个输入的 reviewPathPlan.units[] 都输出一个 units[] 对象。",
      "- microKnowledgePoint 是围绕该 unit 核心内容展开、值得用户单独理解的子知识点。",
      "- microKnowledgePoints 可以体现定义、边界、模型层级、机制、流程步骤、场景应用、常见误区、关键例子或关系。",
      "- 优先保留对理解该 unit 核心有帮助、能形成后续可观察理解表现、并且原文中有清晰支撑的点。",
      "- 如果多个表述服务于同一个学习点，合并为一个 micro。",
      "- micro 数量由当前 unit 的知识密度决定。",
      "- assessmentValue 只描述这个小点的考察价值，不表达题目数量。",
      "- high：缺少它会导致用户无法掌握该 unit 的核心，后续通常应进入覆盖判断。",
      "- medium：能补充重要角度、边界、误区或应用，但不是该 unit 的唯一核心。",
      "- low：有学习价值，但不一定需要直接考察。",
      "- context_only：背景、铺垫、普通例子或只帮助理解上下文，不直接形成题目。",
      "- 对分层模型、结构框架或层级体系，要把整体结构、每一层的作用、层级关系或边界分别拆出来。",
      "- 对流程、信号、角色、类型集合，要保留能形成 matching 或场景判断的关系小点。",
      "输出字段：",
      "- microId 使用稳定 id，例如 micro-<unit id>-001。",
      "- title 是短标题，可用于人工报告对比，不超过 28 字符。",
      "- summary 是知识索引句，只说明这个小点指向什么学习对象，建议 20-40 个中文字，最多 48 字符；不要粘贴原文，不展开解释。",
      "- role 只能使用 schema enum。",
      "- primaryEvidenceAngle 是可观察理解角度标签，建议 6-12 个中文字，最多 16 字符；不选择题型，不写句子。",
      "- 不要输出 sourceAnchorId 或 sourceSupport；micro 默认继承当前 unit 的 sourceAnchor。",
      ...(compactRetry
        ? [
            "重试压缩模式：",
            "- 上一次输出过长或 JSON 没闭合；这次必须保持同样的核心覆盖，但用更短索引字段。",
            "- summary 优先控制在 32 个中文字以内；primaryEvidenceAngle 控制在 12 个中文字以内。",
            "- 不输出任何解释性长句，不增加 schema 外字段。"
          ]
        : []),
      "",
      `reviewPathPlan:\n${JSON.stringify(plan, null, 2)}`,
      "",
      renderSource(source, blocks, sourceContextNote)
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
      "- “模型层级 -> 对应作用”这类分层结构知识点，通常适合 layer_role_matching。",
      "- matching 的价值来自关系本身：层级-作用、步骤-目的、信号-动作、角色-职责、类型-判断维度都比孤立名词释义更适合连线。",
      "- 如果一个 unit 内含多个同等重要的小目标，例如“核心定义”“边界误区”“层级作用”，应分别建立 assessableTargets，并让 selectedTasks 呈现这些互补角度。",
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
      renderSource(source, blocks, sourceContextNote)
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
      "- matching 应实现当前 unit 自身的关系目的；不同 unit 可以使用自己的步骤、边界、信号或角色关系。",
      "连线题规则：",
      "- question.type 只能是 matching。",
      "- 根据原文中自然存在的关系生成 2-4 对匹配项；leftItems、rightItems、pairs 数量必须一致，一一对应。",
      "- 不要为了凑满 4 对而补弱关系或虚构关系；2/3 对高价值关系优先于 4 对低价值关系。",
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
      renderSource(source, blocks, sourceContextNote)
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
      "- UI 是否能承载：选择题 4 项，连线题左右 2-4 项且数量一致。",
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

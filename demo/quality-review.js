const app = document.getElementById("quality-app");

const state = {
  input: "",
  run: null,
  selectedQuestionId: "",
  filter: "all",
  isRunning: false,
  isSaving: false,
  message: "输入文章链接或正文后，一键生成并让 AI 先完成预标注。"
};

const filters = [
  ["all", "全部"],
  ["reject", "AI reject"],
  ["fixable", "AI fixable"],
  ["low", "低置信"],
  ["source", "来源问题"],
  ["minimality", "来源过泛"],
  ["explanation", "解释问题"],
  ["context", "上下文问题"],
  ["unique", "答案不唯一"],
  ["training", "训练候选"]
];

const issueOptions = [
  "none",
  "source_not_supporting",
  "answer_not_unique",
  "explanation_wrong",
  "too_shallow",
  "weak_distractors",
  "knowledge_point_off_target",
  "coverage_gap",
  "low_confidence_bad",
  "source_context_bad",
  "structure_invalid",
  "generation_failed",
  "other"
];

const blameStageOptions = [
  "none",
  "knowledge_extraction",
  "question_generation",
  "source_context_selection",
  "quality_judge",
  "selection_policy",
  "frontend_display"
];

const optionIssueOptions = [
  "none",
  "too_obvious",
  "also_correct",
  "irrelevant",
  "not_supported_by_source",
  "wording_ambiguous",
  "too_similar_to_correct"
];

const trainingOptions = [
  "yes_positive",
  "yes_rewrite",
  "yes_negative_pattern",
  "yes_preference",
  "no_structural",
  "no_irrelevant",
  "no_insufficient_source",
  "no_low_value",
  "no_uncertain"
];

function render() {
  const rows = visibleRows();
  const selected = selectedRow(rows) || selectedRow(state.run?.reviewRows || []);
  app.innerHTML = `
    <main class="quality-workbench">
      <header class="quality-header">
        <div>
          <h1>出题质量工作台</h1>
          <p>AI 先替你完成预标注，你再检查、修正或确认。未经确认的 <strong>ai_*</strong> 字段不会作为训练金标。</p>
        </div>
        <a class="quality-link" href="./index.html">返回产品 Demo</a>
      </header>

      <section class="quality-input-grid">
        <div class="quality-input-card">
          <label for="quality-input">文章链接或正文</label>
          <textarea id="quality-input" class="quality-textarea" placeholder="粘贴微信公众号、网页链接，或直接粘贴文章正文">${escapeHtml(state.input)}</textarea>
          <div class="quality-actions">
            <button class="quality-button primary" data-action="create-run" ${state.isRunning ? "disabled" : ""}>${state.isRunning ? "正在生成和预标注..." : "一键生成并预标注"}</button>
            <button class="quality-button secondary" data-action="export" ${state.run ? "" : "disabled"}>导出 CSV</button>
            <span class="quality-message">${escapeHtml(state.message)}</span>
          </div>
        </div>
        ${renderStats()}
      </section>

      <nav class="quality-filters">
        ${filters.map(([key, label]) => `<button class="quality-filter ${state.filter === key ? "active" : ""}" data-filter="${key}">${label}</button>`).join("")}
      </nav>

      <section class="quality-layout">
        <aside class="quality-list">${renderList(rows)}</aside>
        <article class="quality-main">${selected ? renderQuestion(selected) : renderEmpty()}</article>
        <aside class="quality-side">${selected ? renderAnnotationPanel(selected) : "<h2>标注面板</h2><p class=\"quality-prose\">选择一道题后查看 AI 预标并确认。</p>"}</aside>
      </section>
    </main>
  `;
}

function renderStats() {
  const stats = state.run?.stats || {};
  return `
    <div class="quality-stats-card">
      <h2>Run 统计</h2>
      ${statRow("题目数", stats.questionCount ?? 0)}
      ${statRow("AI accept", stats.aiAccepted ?? 0)}
      ${statRow("AI fixable", stats.aiFixable ?? 0)}
      ${statRow("AI reject", stats.aiRejected ?? 0)}
      ${statRow("已人工确认", `${stats.humanVerified ?? 0} / ${stats.questionCount ?? 0}`)}
      ${statRow("训练候选", stats.trainingCandidates ?? 0)}
    </div>
  `;
}

function statRow(label, value) {
  return `<div class="quality-stat"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderList(rows) {
  if (!state.run) return "<p class=\"quality-prose\">还没有评测 run。</p>";
  if (!rows.length) return "<p class=\"quality-prose\">当前筛选没有题目。</p>";
  return rows.map((row, index) => `
    <button class="quality-list-item ${row.questionId === state.selectedQuestionId ? "active" : ""}" data-select="${escapeAttr(row.questionId)}">
      <div class="quality-list-title">${index + 1}. ${escapeHtml(row.stem || row.machineIssues || "无题目")}</div>
      <div class="quality-list-meta">
        ${chip(row.ai_status || "未预标", row.ai_status)}
        ${chip(row.human_verified === "true" ? "已确认" : "待确认")}
        ${row.confidenceLevel === "low" ? chip("低置信", "fixable") : ""}
      </div>
    </button>
  `).join("");
}

function renderQuestion(row) {
  const options = parseOptions(row.options);
  return `
    <div class="quality-list-meta">
      ${chip(row.knowledgePoint || "知识点")}
      ${row.knowledgeStructureRole ? chip(row.knowledgeStructureRole) : ""}
      ${row.knowledgeImportanceScore ? chip(`重要度 ${row.knowledgeImportanceScore}`) : ""}
      ${chip(row.questionType || "题型")}
      ${chip(`机器分 ${row.machineAverageScore || "-"}`)}
      ${row.confidenceLevel ? chip(`置信 ${row.confidenceLevel}`, row.confidenceLevel === "low" ? "fixable" : "accept") : ""}
      ${row.confidenceTier ? chip(`分层 ${row.confidenceTier}`, row.confidenceTier === "should_block" ? "reject" : row.confidenceTier === "needs_rewrite" ? "fixable" : "accept") : ""}
      ${row.memoryAngle ? chip(`角度 ${row.memoryAngle}`) : ""}
      ${row.blueprintAlignmentScore ? chip(`蓝图 ${row.blueprintAlignmentScore}`) : ""}
      ${row.memoryAngleFitScore ? chip(`动作匹配 ${row.memoryAngleFitScore}`) : ""}
      ${row.cognitiveActionFitScore ? chip(`认知动作 ${row.cognitiveActionFitScore}`) : ""}
      ${row.practiceProgressionScore ? chip(`递进 ${row.practiceProgressionScore}`) : ""}
      ${row.practiceDuplicateRiskScore ? chip(`重复风险 ${row.practiceDuplicateRiskScore}`, Number(row.practiceDuplicateRiskScore) >= 4 ? "reject" : "") : ""}
      ${row.evidenceLearningValueScore ? chip(`证据学习 ${row.evidenceLearningValueScore}`) : ""}
      ${chip(row.machineIssueCategory || "other")}
    </div>
    <h2>${escapeHtml(row.stem || "无题目")}</h2>
    <section class="quality-section">
      <h3>对应知识点</h3>
      <p class="quality-prose"><strong>${escapeHtml(row.knowledgePoint || "无")}</strong></p>
      <div class="quality-list-meta">
        ${row.knowledgeStructureRole ? chip(row.knowledgeStructureRole) : ""}
        ${row.knowledgeImportanceScore ? chip(`重要度 ${row.knowledgeImportanceScore}`) : ""}
      </div>
      <p class="quality-prose">${escapeHtml(row.knowledgeCoverageReason || "暂无覆盖理由")}</p>
      ${row.practiceBlueprint ? `<p class="quality-prose"><strong>练习蓝图：</strong>${escapeHtml(row.practiceBlueprint)}</p>` : ""}
      ${row.blueprintGoal ? `<p class="quality-prose"><strong>当前题目标：</strong>${escapeHtml(row.blueprintGoal)}</p>` : ""}
      <div class="quality-list-meta">
        ${row.blueprintItemId ? chip(`蓝图项 ${row.blueprintItemId}`) : ""}
        ${row.typeDiversityReason ? chip(`题型说明 ${row.typeDiversityReason}`) : ""}
        ${row.sourceReuseLearningReason ? chip(`来源复用 ${row.sourceReuseLearningReason}`) : ""}
      </div>
      ${row.pedagogyDiagnostics ? `<p class="quality-prose"><strong>教学诊断：</strong>${escapeHtml(row.pedagogyDiagnostics)}</p>` : ""}
    </section>
    <section class="quality-section">
      <h3>选项</h3>
      <div class="quality-options">
        ${options.map((option) => `
          <div class="quality-option ${option.id === row.correctOptionId ? "correct" : ""}">
            <div class="quality-option-id">${escapeHtml(option.id)}</div>
            <div>${escapeHtml(option.text)}</div>
          </div>
        `).join("")}
      </div>
    </section>
    <section class="quality-section">
      <h3>正确理解</h3>
      <p class="quality-prose">${escapeHtml(row.correctUnderstanding || "无")}</p>
    </section>
    <section class="quality-section">
      <h3>常见误区</h3>
      <p class="quality-prose">${escapeHtml(row.commonMisconception || "无")}</p>
    </section>
    <section class="quality-section">
      <h3>来源上下文</h3>
      <div class="quality-list-meta">
        ${row.sourcePrecisionScore ? chip(`来源精准 ${row.sourcePrecisionScore}`) : ""}
        ${row.sourceMinimalityScore ? chip(`最小证据 ${row.sourceMinimalityScore}`) : ""}
        ${row.sourceEvidenceRole ? chip(`证据角色 ${row.sourceEvidenceRole}`) : ""}
        ${row.sourceBlockId ? chip(`证据块 ${row.sourceBlockId}`) : ""}
        ${row.sourceEvidenceDiversityScore ? chip(`证据多样 ${row.sourceEvidenceDiversityScore}`) : ""}
        ${row.sourceReuseReason ? chip(`复用原因 ${row.sourceReuseReason}`) : ""}
        ${row.sourceOverlapRatio ? chip(`重叠 ${row.sourceOverlapRatio}`) : ""}
        ${row.sourceReuseCount ? chip(`段落复用 ${row.sourceReuseCount}`) : ""}
        ${row.sourceContextSelection ? chip(row.sourceContextSelection) : ""}
      </div>
      <div class="quality-source quality-prose">${escapeHtml(row.sourceSnippet || "无")}</div>
    </section>
    <section class="quality-section">
      <h3>可信度诊断</h3>
      <p class="quality-prose">${escapeHtml(row.trustDiagnostics || "暂无诊断")}</p>
      <div class="quality-list-meta">
        ${(row.confidenceReasons || "").split(";").filter(Boolean).map((reason) => chip(reason, "fixable")).join("")}
        ${(row.blockingReasons || "").split(";").filter(Boolean).map((reason) => chip(reason, "reject")).join("")}
      </div>
    </section>
    <section class="quality-section">
      <h3>AI 预标理由</h3>
      <p class="quality-prose">${escapeHtml(row.ai_reason || "暂无")}</p>
    </section>
  `;
}

function renderAnnotationPanel(row) {
  return `
    <h2>标注面板</h2>
    <div class="quality-list-meta">
      ${chip(`AI: ${row.ai_status || "-"}`, row.ai_status)}
      ${chip(`人工: ${row.human_status || "未确认"}`)}
    </div>
    <div class="quality-form-grid" data-form-question="${escapeAttr(row.questionId)}">
      ${selectField("human_status", "人工状态", row.human_status || row.ai_status, ["accept", "fixable", "reject"])}
      ${selectField("primary_issue", "主要问题", row.primary_issue || row.ai_primary_issue, issueOptions)}
      ${selectField("secondary_issue", "次要问题", row.secondary_issue || row.ai_secondary_issue, issueOptions)}
      ${selectField("blame_stage", "归因阶段", row.blame_stage || row.ai_blame_stage, blameStageOptions)}
      ${selectField("option_issue", "选项问题", row.option_issue || row.ai_option_issue, optionIssueOptions)}
      ${selectField("training_label_eligible", "训练候选", row.training_label_eligible || row.ai_training_label_eligible, trainingOptions)}
      ${scoreField("source_support", "来源支撑", row.source_support || row.ai_source_support)}
      ${scoreField("source_precision", "来源精准", row.source_precision || row.ai_source_precision)}
      ${scoreField("source_minimality", "最小充分证据", row.source_minimality || row.ai_source_minimality)}
      ${textField("source_evidence_role", "证据角色", row.source_evidence_role || row.sourceEvidenceRole)}
      ${textField("source_block_id", "证据块", row.source_block_id || row.sourceBlockId)}
      ${scoreField("source_evidence_diversity", "证据多样性", row.source_evidence_diversity || row.sourceEvidenceDiversityScore)}
      ${textField("source_reuse_reason", "复用原因", row.source_reuse_reason || row.sourceReuseReason)}
      ${textField("source_overlap_ratio", "来源重叠", row.source_overlap_ratio || row.sourceOverlapRatio)}
      ${scoreField("answer_uniqueness", "答案唯一", row.answer_uniqueness || row.ai_answer_uniqueness)}
      ${scoreField("understanding_depth", "理解深度", row.understanding_depth || row.ai_understanding_depth)}
      ${scoreField("clarity", "清晰度", row.clarity || row.ai_clarity)}
      ${scoreField("distractor_quality", "干扰项", row.distractor_quality || row.ai_distractor_quality)}
      ${scoreField("explanation_faithfulness", "解释忠实", row.explanation_faithfulness || row.ai_explanation_faithfulness)}
      ${scoreField("review_value", "复习价值", row.review_value || row.ai_review_value)}
      ${scoreField("knowledge_mainline_relevance", "知识点主线相关", row.knowledge_mainline_relevance)}
      ${scoreField("knowledge_granularity", "知识点粒度", row.knowledge_granularity)}
      ${scoreField("knowledge_review_value", "知识点复习价值", row.knowledge_review_value)}
      ${scoreField("missing_core_point", "漏掉核心点", row.missing_core_point)}
      <div class="quality-field wide">
        <label for="notes">人工备注</label>
        <textarea class="quality-textarea" data-field="notes">${escapeHtml(row.notes || "")}</textarea>
      </div>
    </div>
    <div class="quality-form-actions">
      <button class="quality-button primary" data-action="confirm-ai">确认 AI 标注</button>
      <button class="quality-button secondary" data-action="save-edit">保存修改</button>
      <button class="quality-button danger" data-action="quick-reject">标记 reject</button>
      <button class="quality-button secondary" data-action="next">下一题</button>
    </div>
  `;
}

function renderEmpty() {
  const issueRow = state.run?.reviewRows?.find((row) => row.machineIssues);
  if (issueRow) {
    return `
      <div class="quality-empty">
        <div>
          <h2>没有生成可检查题目</h2>
          <p class="quality-prose">${escapeHtml(issueRow.machineIssues)}</p>
        </div>
      </div>
    `;
  }
  return `<div class="quality-empty"><div><h2>等待评测</h2><p>输入文章链接或正文后开始。</p></div></div>`;
}

function selectField(name, label, value, options) {
  return `
    <div class="quality-field">
      <label>${label}</label>
      <select class="quality-select" data-field="${name}">
        ${options.map((option) => `<option value="${escapeAttr(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </div>
  `;
}

function scoreField(name, label, value) {
  return `
    <div class="quality-field">
      <label>${label}</label>
      <select class="quality-select" data-field="${name}">
        ${["", "1", "2", "3", "4", "5"].map((option) => `<option value="${option}" ${String(value) === option ? "selected" : ""}>${option || "-"}</option>`).join("")}
      </select>
    </div>
  `;
}

function textField(name, label, value) {
  return `
    <div class="quality-field">
      <label>${label}</label>
      <input class="quality-input" data-field="${name}" value="${escapeAttr(value || "")}" />
    </div>
  `;
}

function chip(text, kind = "") {
  return `<span class="quality-chip ${kind || ""}">${escapeHtml(text)}</span>`;
}

function visibleRows() {
  const rows = state.run?.reviewRows || [];
  return rows.filter((row) => {
    if (state.filter === "all") return true;
    if (state.filter === "reject") return row.ai_status === "reject";
    if (state.filter === "fixable") return row.ai_status === "fixable";
    if (state.filter === "low") return row.confidenceLevel === "low";
    if (state.filter === "source") return row.ai_primary_issue === "source_not_supporting" || row.machineIssueCategory === "source_not_supporting" || hasTrustReason(row, "weak_source_support");
    if (state.filter === "minimality") return Number(row.sourceMinimalityScore || 0) > 0 && Number(row.sourceMinimalityScore || 0) < 4;
    if (state.filter === "explanation") return row.ai_primary_issue === "explanation_wrong" || row.machineIssueCategory === "explanation_wrong" || hasTrustReason(row, "weak_explanation_faithfulness");
    if (state.filter === "context") return row.ai_primary_issue === "source_context_bad" || row.machineIssueCategory === "source_context_bad" || hasTrustReason(row, "weak_context_relevance");
    if (state.filter === "unique") return row.ai_primary_issue === "answer_not_unique" || row.machineIssueCategory === "answer_not_unique";
    if (state.filter === "training") return String(row.ai_training_label_eligible || row.training_label_eligible).startsWith("yes_");
    return true;
  });
}

function hasTrustReason(row, reason) {
  return String(`${row.confidenceReasons || ""};${row.blockingReasons || ""}`).split(";").includes(reason);
}

function selectedRow(rows) {
  return rows.find((row) => row.questionId === state.selectedQuestionId) || rows[0] || null;
}

function parseOptions(text) {
  return String(text || "")
    .split(/\s+\|\s+/)
    .map((item) => {
      const match = item.match(/^([^.\s]+)\.\s*(.*)$/);
      return match ? { id: match[1], text: match[2] } : { id: "", text: item };
    })
    .filter((item) => item.text);
}

async function createRun() {
  const input = state.input.trim();
  if (!input) {
    state.message = "请先输入文章链接或正文。";
    render();
    return;
  }
  state.isRunning = true;
  state.message = "正在生成章节并执行 AI 预标注，这一步可能需要几分钟。";
  render();
  try {
    const response = await fetch("/api/quality-runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parseInput(input))
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "质量工作台运行失败。");
    state.run = payload;
    state.selectedQuestionId = payload.reviewRows?.[0]?.questionId || "";
    state.message = runMessage(payload);
  } catch (error) {
    state.message = error.message;
  } finally {
    state.isRunning = false;
    render();
  }
}

function runMessage(payload) {
  const questionCount = payload.stats?.questionCount || 0;
  const firstIssue = payload.reviewRows?.find((row) => row.machineIssues)?.machineIssues || payload.results?.[0]?.message || "";
  if (!questionCount) {
    return firstIssue
      ? `没有生成可检查题目：${firstIssue}`
      : "没有生成可检查题目，请换一篇文章或检查后端配置。";
  }
  return payload.autoLabelError
    ? `生成完成，但 AI 预标注失败：${payload.autoLabelError}`
    : "生成和 AI 预标注完成，可以开始检查。";
}

async function saveAnnotation(confirmAi = false, extra = {}) {
  if (!state.run || !state.selectedQuestionId) return;
  const annotation = {
    questionId: state.selectedQuestionId,
    confirmAi,
    ...readAnnotationForm(),
    ...extra
  };
  state.isSaving = true;
  state.message = "正在保存标注...";
  render();
  try {
    const response = await fetch(`/api/quality-runs/${encodeURIComponent(state.run.id)}/annotations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(annotation)
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "保存失败。");
    state.run = payload.run;
    state.message = confirmAi ? "已确认 AI 标注。" : "已保存人工修改。";
  } catch (error) {
    state.message = error.message;
  } finally {
    state.isSaving = false;
    render();
  }
}

function readAnnotationForm() {
  const fields = {};
  document.querySelectorAll("[data-field]").forEach((element) => {
    fields[element.dataset.field] = element.value;
  });
  return fields;
}

function selectNext() {
  const rows = visibleRows();
  const currentIndex = rows.findIndex((row) => row.questionId === state.selectedQuestionId);
  const next = rows[currentIndex + 1] || rows[0];
  if (next) state.selectedQuestionId = next.questionId;
  render();
}

function exportCsv() {
  if (!state.run) return;
  window.location.href = `/api/quality-runs/${encodeURIComponent(state.run.id)}/export.csv`;
}

function parseInput(input) {
  if (/^https?:\/\//i.test(input)) {
    const host = new URL(input).hostname.toLowerCase();
    const isVideo = ["bilibili.com", "youtube.com", "youtu.be", "douyin.com", "v.douyin.com", "xiaohongshu.com"]
      .some((domain) => host === domain || host.endsWith(`.${domain}`));
    return {
      sourceType: isVideo ? "video_link" : "article_link",
      sourceUrl: input
    };
  }
  return {
    sourceType: "text",
    rawText: input
  };
}

app.addEventListener("input", (event) => {
  if (event.target.id === "quality-input") state.input = event.target.value;
});

app.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  const filter = event.target.closest("[data-filter]")?.dataset.filter;
  const select = event.target.closest("[data-select]")?.dataset.select;
  if (filter) {
    state.filter = filter;
    render();
    return;
  }
  if (select) {
    state.selectedQuestionId = select;
    render();
    return;
  }
  if (action === "create-run") createRun();
  if (action === "export") exportCsv();
  if (action === "confirm-ai") saveAnnotation(true);
  if (action === "save-edit") saveAnnotation(false);
  if (action === "quick-reject") saveAnnotation(false, {
    human_status: "reject",
    primary_issue: "other",
    human_verified: "true",
    review_decision: "edited"
  });
  if (action === "next") selectNext();
});

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

render();

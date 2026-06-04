const app = document.getElementById("cost-app");

const state = {
  input: "",
  sourceTitle: "",
  result: null,
  isRunning: false,
  error: "",
  message: "成本工作台只返回调试结果，不写入 App 章节和通知。"
};

function render() {
  app.innerHTML = `
    <main class="cost-workbench">
      <header class="cost-header">
        <div>
          <h1>成本计算工作台</h1>
          <p>用真实生成链路计算单篇章节成本，结果只留在这个页面。</p>
        </div>
        <nav class="cost-nav">
          <a href="./index.html">产品 Demo</a>
          <a href="./quality-review.html">质量工作台</a>
        </nav>
      </header>

      <section class="cost-input-band">
        <div class="cost-input-panel">
          <label for="cost-title">标题</label>
          <input id="cost-title" class="cost-input" value="${escapeAttr(state.sourceTitle)}" placeholder="可选" />
          <label for="cost-input">文章链接或正文</label>
          <textarea id="cost-input" class="cost-textarea" placeholder="粘贴文章正文，或粘贴可抓取的文章链接">${escapeHtml(state.input)}</textarea>
          <div class="cost-actions">
            <button class="cost-button primary" data-action="run" ${state.isRunning || state.input.trim().length < 24 ? "disabled" : ""}>
              ${state.isRunning ? "正在生成..." : "生成并计算成本"}
            </button>
            <button class="cost-button secondary" data-action="clear" ${state.isRunning ? "disabled" : ""}>清空</button>
            <span class="cost-message ${state.error ? "error" : ""}">${escapeHtml(state.error || state.message)}</span>
          </div>
        </div>
        ${renderSummary()}
      </section>

      ${state.result ? renderResult(state.result) : renderEmpty()}
    </main>
  `;
  updateRunButton();
}

function renderSummary() {
  const result = state.result;
  const totals = result?.costSummary?.totalsByCurrency || {};
  const totalRows = Object.values(totals);
  return `
    <aside class="cost-summary-panel">
      <h2>本次结果</h2>
      ${summaryRow("状态", result?.status || "-")}
      ${summaryRow("调用次数", result?.costSummary?.callCount ?? 0)}
      ${summaryRow("知识点", result?.knowledgePointCount ?? 0)}
      ${summaryRow("入池题", result?.questionCount ?? 0)}
      ${totalRows.length ? totalRows.map((total) => `
        <div class="cost-total">
          <span>${escapeHtml(total.currency || "-")}</span>
          <strong>${formatMoney(total.totalActualCost, total.currency)}</strong>
          <small>估算 ${formatMoney(total.totalEstimatedCost, total.currency)} · 误差 ${formatPercent(total.costErrorRate)}</small>
        </div>
      `).join("") : "<p class=\"cost-muted\">还没有成本数据。</p>"}
    </aside>
  `;
}

function summaryRow(label, value) {
  return `<div class="cost-summary-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function renderEmpty() {
  return `
    <section class="cost-empty">
      <h2>等待生成</h2>
      <p>完成后这里会显示阶段成本、真实 usage、误差率和原始调试 JSON。</p>
    </section>
  `;
}

function renderResult(result) {
  const calls = Array.isArray(result.modelUsage) ? result.modelUsage : [];
  return `
    <section class="cost-result-grid">
      <article class="cost-table-panel">
        <div class="cost-section-title">
          <div>
            <h2>${escapeHtml(result.chapterTitle || "未命名章节")}</h2>
            <p>Run ID：${escapeHtml(result.generationRunId || "-")}</p>
            ${result.costRunStorage?.latestPath ? `<p>已保存：${escapeHtml(result.costRunStorage.latestPath)}</p>` : ""}
          </div>
          <div class="cost-section-actions">
            ${result.qualitySummary ? `<span class="cost-chip">机器均分 ${escapeHtml(String(result.qualitySummary.averageQualityScore ?? "-"))}</span>` : ""}
            <button class="cost-icon-button" data-action="copy-json" type="button">复制 JSON</button>
            <button class="cost-icon-button" data-action="download-json" type="button">下载 JSON</button>
          </div>
        </div>
        <div class="cost-table-wrap">
          <table class="cost-table">
            <thead>
              <tr>
                <th>阶段</th>
                <th>模型</th>
                <th>估算 tokens</th>
                <th>实际 tokens</th>
                <th>估算成本</th>
                <th>实际成本</th>
                <th>误差</th>
              </tr>
            </thead>
            <tbody>
              ${calls.length ? calls.map(renderCallRow).join("") : "<tr><td colspan=\"7\">没有模型调用记录。</td></tr>"}
            </tbody>
          </table>
        </div>
      </article>

      <aside class="cost-detail-panel">
        <h2>合计</h2>
        ${renderTotals(result)}
      </aside>
    </section>

    <section class="cost-json-panel">
      <details>
        <summary>查看原始 usage JSON</summary>
        <pre>${escapeHtml(JSON.stringify(result.modelUsage || [], null, 2))}</pre>
      </details>
      <details>
        <summary>查看报告文本</summary>
        <pre>${escapeHtml(result.reportText || result.costSummary?.reportText || "")}</pre>
      </details>
    </section>
  `;
}

function renderCallRow(call) {
  const estimated = call.estimated || {};
  const actual = call.actual || null;
  const price = call.price || {};
  return `
    <tr>
      <td>
        <strong>${escapeHtml(stageLabel(call.stage))}</strong>
        ${call.error ? `<small class="cost-error-text">${escapeHtml(call.error)}</small>` : ""}
      </td>
      <td>
        ${escapeHtml(call.provider || "-")}<br />
        <small>${escapeHtml(call.model || "-")}</small>
      </td>
      <td>${tokenBlock(estimated)}</td>
      <td>${actual ? tokenBlock(actual) : "<span class=\"cost-muted\">provider 未返回 usage</span>"}</td>
      <td>${formatMoney(estimated.cost, estimated.currency)}</td>
      <td>${actual ? formatMoney(actual.cost, actual.currency) : "-"}</td>
      <td>${formatPercent(call.diff?.costErrorRate)}</td>
    </tr>
    <tr class="cost-price-row">
      <td colspan="7">
        价格：input ${formatPrice(price.inputPerMillion, price.currency)}/M，
        cached ${formatPrice(price.cachedInputPerMillion, price.currency)}/M，
        output ${formatPrice(price.outputPerMillion, price.currency)}/M
        ${price.priceSourceUrl ? ` · <a href="${escapeAttr(price.priceSourceUrl)}" target="_blank" rel="noreferrer">价格来源</a>` : ""}
        ${price.checkedAt ? ` · checked ${escapeHtml(price.checkedAt)}` : ""}
      </td>
    </tr>
  `;
}

function renderTotals(result) {
  const totals = Object.values(result.costSummary?.totalsByCurrency || {});
  if (!totals.length) return "<p class=\"cost-muted\">没有可汇总的成本。</p>";
  return totals.map((total) => `
    <div class="cost-total-card">
      <span>${escapeHtml(total.currency || "-")}</span>
      <strong>${formatMoney(total.totalActualCost, total.currency)}</strong>
      <dl>
        <div><dt>估算</dt><dd>${formatMoney(total.totalEstimatedCost, total.currency)}</dd></div>
        <div><dt>误差</dt><dd>${formatPercent(total.costErrorRate)}</dd></div>
        <div><dt>每题实际</dt><dd>${formatMoney(total.actualCostPerQualifiedQuestion, total.currency)}</dd></div>
      </dl>
    </div>
  `).join("");
}

function tokenBlock(block) {
  return `
    <span>in ${formatNumber(block.inputTokens)}</span>
    <span>cached ${formatNumber(block.cachedInputTokens)}</span>
    <span>out ${formatNumber(block.outputTokens)}</span>
  `;
}

async function runCost() {
  state.error = "";
  state.message = "正在生成章节并记录模型 usage...";
  state.isRunning = true;
  render();

  try {
    const response = await fetch("/api/cost-runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceType: detectSourceType(state.input),
        rawText: state.input,
        sourceTitle: state.sourceTitle
      })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message || `成本计算失败：${response.status}`);
    }
    state.result = payload;
    state.message = payload.status === "completed"
      ? "成本计算完成。"
      : (payload.message || "生成未完成，请查看阶段记录。");
  } catch (error) {
    state.error = error instanceof Error ? error.message : "成本计算失败。";
  } finally {
    state.isRunning = false;
    render();
  }
}

function detectSourceType(value) {
  return /^https?:\/\//i.test(String(value || "").trim()) ? "article_link" : "text";
}

function stageLabel(stage) {
  return {
    knowledge_points: "知识点提取",
    questions_initial: "首次出题",
    judge_initial: "首次质检",
    question_rewrite: "题目重写",
    judge_rewrite: "重写质检",
    question_supplement: "补题",
    judge_supplement: "补题质检",
    chapter_summary: "文章总结"
  }[stage] || stage || "-";
}

function formatMoney(value, currency) {
  if (!Number.isFinite(Number(value))) return "-";
  const number = Number(value);
  const prefix = currency === "USD" ? "$" : currency === "CNY" ? "¥" : "";
  const suffix = prefix ? "" : ` ${currency || ""}`.trimEnd();
  return `${prefix}${number.toFixed(6)}${suffix}`;
}

function formatPrice(value, currency) {
  if (!Number.isFinite(Number(value))) return "-";
  const prefix = currency === "USD" ? "$" : currency === "CNY" ? "¥" : "";
  return `${prefix}${Number(value).toFixed(4)}`;
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return "-";
  const number = Number(value);
  return `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function formatNumber(value) {
  if (!Number.isFinite(Number(value))) return "-";
  return new Intl.NumberFormat("zh-CN").format(Number(value));
}

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

app.addEventListener("input", (event) => {
  if (event.target?.id === "cost-input") state.input = event.target.value;
  if (event.target?.id === "cost-title") state.sourceTitle = event.target.value;
  updateRunButton();
});

app.addEventListener("click", (event) => {
  const action = event.target?.dataset?.action;
  if (action === "run") runCost();
  if (action === "copy-json") copyResultJson();
  if (action === "download-json") downloadResultJson();
  if (action === "clear") {
    state.input = "";
    state.sourceTitle = "";
    state.result = null;
    state.error = "";
    state.message = "已清空。";
    render();
  }
});

render();

function updateRunButton() {
  const button = app.querySelector("[data-action='run']");
  if (!button) return;
  button.disabled = state.isRunning || state.input.trim().length < 24;
}

async function copyResultJson() {
  if (!state.result) return;
  const json = JSON.stringify(state.result, null, 2);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(json);
    } else {
      copyTextFallback(json);
    }
    state.message = "已复制本次成本 JSON。";
  } catch {
    copyTextFallback(json);
    state.message = "已复制本次成本 JSON。";
  }
  state.error = "";
  render();
}

function downloadResultJson() {
  if (!state.result) return;
  const json = `${JSON.stringify(state.result, null, 2)}\n`;
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(state.result.generationRunId || "cost-run")}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  state.error = "";
  state.message = "已下载本次成本 JSON。";
  render();
}

function copyTextFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function safeFileName(value) {
  return String(value || "cost-run")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "cost-run";
}

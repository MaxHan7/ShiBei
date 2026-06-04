import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "../../../..");

const archivePath = path.join(repoRoot, "quality-test-set/results/archive/2026-05-15-095415.json");
const targetSample = "wechat-L6t8rmU_8exk2rPV--cUIA.md";
const sampleSlug = "meta-ai-first-pm";

const datasetPath = path.join(root, "datasets/phase-b-meta-ai-first-pm-distractor-candidates.v1.jsonl");
const reviewPath = path.join(root, "reviews/phase-b-meta-ai-first-pm-review.html");
const summaryPath = path.join(root, "analysis/phase-b-meta-ai-first-pm-setup-20260603.md");

const archive = JSON.parse(fs.readFileSync(archivePath, "utf8"));
const result = archive.results?.find((entry) => entry.file === targetSample);
if (!result?.chapter) {
  throw new Error(`Cannot find chapter for ${targetSample} in ${archivePath}`);
}

const chapter = result.chapter;
const knowledgePointsById = new Map((chapter.knowledgePoints || []).map((point) => [point.id, point]));
const reviewRowsByQuestionId = new Map(
  (archive.reviewRows || [])
    .filter((row) => row.sample === targetSample)
    .map((row) => [row.questionId, row])
);

const rows = [];
for (const question of chapter.questions || []) {
  if (!Array.isArray(question.options) || question.options.length < 2) continue;
  const correctOption = question.options.find((option) => option.id === question.correctOptionId);
  if (!correctOption) continue;
  const knowledgePoint = knowledgePointsById.get(question.knowledgePointId || question.pointId);
  const reviewRow = reviewRowsByQuestionId.get(question.id);

  for (const option of question.options) {
    if (option.id === question.correctOptionId) continue;
    rows.push({
      sample_id: `phase-b-${sampleSlug}-${question.id}-option-${option.id.toLowerCase()}`,
      task: "distractor_quality_judge_candidate",
      article_slug: sampleSlug,
      article_sample: targetSample,
      source_archive: path.relative(repoRoot, archivePath),
      question_id: question.id,
      option_id: option.id,
      candidate: option.text,
      gold_quality_label: null,
      gold_quality_label_rationale: "",
      issue_category: "",
      human_note: "",
      context: {
        article_title: chapter.title,
        knowledge_point_id: question.knowledgePointId || question.pointId || "",
        knowledge_point_title: question.pointTitle || knowledgePoint?.title || reviewRow?.knowledgePoint || "",
        knowledge_point_summary: knowledgePoint?.summary || "",
        knowledge_point_key_claim: knowledgePoint?.keyClaim || "",
        question_type: question.type || reviewRow?.questionType || "",
        stem: question.stem || "",
        correct_option_id: correctOption.id,
        correct_option_text: correctOption.text,
        options: question.options.map((item) => ({
          id: item.id,
          text: item.text,
          isCorrect: item.id === question.correctOptionId,
          isCandidate: item.id === option.id
        })),
        correct_understanding: question.correctUnderstanding || question.correct_understanding || "",
        common_misconception: question.commonMisconception || question.common_misconception || "",
        source_context: question.sourceSnippet || question.source_snippet || reviewRow?.sourceSnippet || "",
        machine_average_score: reviewRow?.machineAverageScore ?? question.qualityScore?.average ?? null,
        machine_issues: reviewRow?.machineIssues || (question.qualityIssues || []).join(", ")
      }
    });
  }
}

fs.mkdirSync(path.dirname(datasetPath), { recursive: true });
fs.mkdirSync(path.dirname(reviewPath), { recursive: true });
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(datasetPath, rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
fs.writeFileSync(reviewPath, buildHtml({ rows, datasetPath: path.relative(repoRoot, datasetPath) }));
fs.writeFileSync(summaryPath, buildSummary({ rows }));

console.log(JSON.stringify({
  datasetPath,
  reviewPath,
  summaryPath,
  rowCount: rows.length,
  questionCount: new Set(rows.map((row) => row.question_id)).size
}, null, 2));

function buildSummary({ rows }) {
  const questionCount = new Set(rows.map((row) => row.question_id)).size;
  return `# Phase B Meta AI-first PM Distractor Review Setup

Date: 2026-06-03

## Purpose

This is the first non-Hook distractor review batch for DSPy Phase B preparation. It is not an optimizer run and not a production prompt change.

## Data Source

- Source sample: \`${targetSample}\`
- Source archive: \`quality-test-set/results/archive/2026-05-15-095415.json\`
- Dataset: \`quality-test-set/results/dspy/distractors/datasets/phase-b-meta-ai-first-pm-distractor-candidates.v1.jsonl\`
- Review page: \`quality-test-set/results/dspy/distractors/reviews/phase-b-meta-ai-first-pm-review.html\`

## Counts

- Questions: ${questionCount}
- Candidate distractors: ${rows.length}
- Labels before review: all empty

## How To Review

For each candidate distractor, mark:

- \`accept\`: same context, plausible wrong option, helps distinguish the boundary.
- \`fixable\`: adjacent idea but wording, scope, or specificity needs revision.
- \`reject\`: too extreme, irrelevant, duplicate, or effectively correct.

Keep Phase B labels separate from Phase A Hook labels. This batch is for cross-article sanity before any DSPy baseline or optimizer work.
`;
}

function buildHtml({ rows, datasetPath }) {
  const data = JSON.stringify(rows);
  const datasetPathForJs = String(datasetPath).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>拾贝 DSPy Phase B 非 Hook 干扰项审查</title>
  <style>
    :root {
      --bg: #fbf7ef;
      --card: #fffdf8;
      --ink: #211f1a;
      --muted: #756d60;
      --line: #eadfcf;
      --brand: #df9550;
      --yellow: #f6d95e;
      --green: #e7f7e9;
      --green-text: #1c7d3d;
      --red: #f9e7e4;
      --red-text: #a33b2e;
      --blue: #edf2ff;
      --blue-text: #3158b8;
      --shadow: 0 18px 50px rgba(71, 49, 20, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
    }
    header {
      position: sticky;
      top: 0;
      z-index: 20;
      padding: 18px 28px;
      background: rgba(251, 247, 239, 0.94);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--line);
    }
    h1 { margin: 0; font-size: 23px; letter-spacing: 0; }
    .sub { margin-top: 7px; color: var(--muted); font-size: 14px; line-height: 1.55; max-width: 1180px; }
    .toolbar { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; align-items: center; }
    button, select, textarea { font: inherit; }
    button, .pill {
      border: 1px solid var(--line);
      background: #fffaf1;
      color: var(--ink);
      border-radius: 999px;
      padding: 9px 14px;
      cursor: pointer;
    }
    button.primary { border-color: transparent; background: var(--ink); color: white; }
    select { border: 1px solid var(--line); border-radius: 999px; padding: 9px 12px; background: #fffaf1; min-width: 220px; }
    main {
      display: grid;
      grid-template-columns: minmax(380px, 0.9fr) minmax(500px, 1.1fr);
      gap: 22px;
      padding: 24px 28px 60px;
      max-width: 1540px;
      margin: 0 auto;
    }
    .panel {
      background: rgba(255, 253, 248, 0.82);
      border: 1px solid var(--line);
      border-radius: 22px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .panel-head {
      padding: 18px 20px;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }
    .panel-title { font-size: 18px; font-weight: 850; }
    .count { color: var(--muted); font-size: 13px; line-height: 1.45; }
    .list { display: grid; gap: 14px; padding: 18px; max-height: calc(100vh - 210px); overflow: auto; }
    .sample {
      border: 1px solid var(--line);
      background: var(--card);
      border-radius: 18px;
      padding: 17px;
      cursor: pointer;
    }
    .sample.active { outline: 3px solid rgba(246, 217, 94, 0.48); }
    .sample-top { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 10px; }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 800;
      white-space: nowrap;
    }
    .badge.accept { background: var(--green); color: var(--green-text); }
    .badge.fixable { background: var(--blue); color: var(--blue-text); }
    .badge.reject { background: var(--red); color: var(--red-text); }
    .badge.unreviewed { background: #fff6d6; color: #7a5c00; }
    .qid { color: var(--muted); font-size: 13px; text-align: right; }
    .mini { color: var(--muted); font-size: 13px; line-height: 1.45; }
    .candidate { font-size: 18px; line-height: 1.45; font-weight: 850; margin-top: 10px; }
    .detail { padding: 20px; display: grid; gap: 16px; }
    .stem { font-size: 25px; font-weight: 900; line-height: 1.34; margin: 8px 0 2px; }
    .option {
      display: grid;
      grid-template-columns: 30px 1fr;
      gap: 10px;
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 12px 14px;
      margin: 8px 0;
      background: #fffefa;
      line-height: 1.45;
    }
    .option.correct { border-color: #bde8c8; background: #f4fff5; }
    .option.candidate { border-color: #d8c173; background: #fff9dc; font-size: inherit; font-weight: inherit; margin-top: 8px; }
    .letter { font-weight: 900; }
    .section h3 { margin: 0 0 8px; font-size: 15px; }
    .section p { margin: 0; color: var(--muted); line-height: 1.65; }
    .box {
      border: 1px solid var(--line);
      border-radius: 16px;
      background: #fffefa;
      padding: 14px;
    }
    .box p { color: var(--ink); }
    textarea {
      width: 100%;
      min-height: 90px;
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 12px;
      background: #fffefa;
      color: var(--ink);
      resize: vertical;
      line-height: 1.55;
    }
    .status-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .status-row button.active { background: var(--ink); color: white; border-color: var(--ink); }
    .meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .meta-item {
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #fffefa;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
      word-break: break-word;
    }
    .toast {
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      background: var(--ink);
      color: #fff;
      border-radius: 999px;
      padding: 10px 16px;
      opacity: 0;
      pointer-events: none;
      transition: opacity .2s ease;
      z-index: 99;
    }
    .toast.show { opacity: 1; }
    @media (max-width: 960px) {
      main { grid-template-columns: 1fr; padding: 16px; }
      header { padding: 16px; }
      .list { max-height: none; }
    }
  </style>
</head>
<body>
  <header>
    <h1>DSPy Phase B：非 Hook 干扰项审查</h1>
    <div class="sub">这批来自 AI-first PM 文章的历史生成结果，用来补 Phase B 的非 Hook 样本。请只判断候选干扰项：accept / fixable / reject。它不是训练集，审完后才会进入干净数据整理。</div>
    <div class="toolbar">
      <select id="filter">
        <option value="all">全部</option>
        <option value="unreviewed">未审</option>
        <option value="accept">accept</option>
        <option value="fixable">fixable</option>
        <option value="reject">reject</option>
      </select>
      <button id="copy-json" class="primary">复制当前 JSON</button>
      <button id="download-json">下载当前 JSON</button>
      <span class="pill" id="summary-pill">-</span>
    </div>
  </header>

  <main>
    <section class="panel">
      <div class="panel-head">
        <div>
          <div class="panel-title">候选干扰项</div>
          <div class="count">${datasetPath}</div>
        </div>
        <div class="count" id="count"></div>
      </div>
      <div class="list" id="list"></div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <div class="panel-title" id="detail-title">-</div>
          <div class="count" id="detail-id"></div>
        </div>
      </div>
      <div class="detail" id="detail"></div>
    </section>
  </main>
  <div class="toast" id="toast">已复制</div>

  <script>
    const rows = ${data};
    const storageKey = 'shibei-dspy-phase-b-meta-ai-first-pm-review-v1';
    let reviews = loadReviews();
    let selectedId = rows[0]?.sample_id || null;
    const els = {
      filter: document.getElementById('filter'),
      list: document.getElementById('list'),
      count: document.getElementById('count'),
      detail: document.getElementById('detail'),
      detailTitle: document.getElementById('detail-title'),
      detailId: document.getElementById('detail-id'),
      summaryPill: document.getElementById('summary-pill'),
      copy: document.getElementById('copy-json'),
      download: document.getElementById('download-json'),
      toast: document.getElementById('toast')
    };

    els.filter.addEventListener('change', render);
    els.copy.addEventListener('click', copyJson);
    els.download.addEventListener('click', downloadJson);
    render();

    function loadReviews() {
      try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); }
      catch { return {}; }
    }

    function saveReviews() {
      localStorage.setItem(storageKey, JSON.stringify(reviews));
    }

    function getReview(row) {
      return reviews[row.sample_id] || { review_status: row.gold_quality_label || 'unreviewed', note: row.human_note || '', issue_category: row.issue_category || '' };
    }

    function setReview(row, patch, options = {}) {
      reviews[row.sample_id] = { ...getReview(row), ...patch, updated_at: new Date().toISOString() };
      saveReviews();
      if (options.rerender === false) {
        renderSummary();
      } else {
        render();
      }
    }

    function filteredRows() {
      const filter = els.filter.value;
      if (filter === 'all') return rows;
      return rows.filter((row) => getReview(row).review_status === filter);
    }

    function render() {
      const visible = filteredRows();
      if (!visible.some((row) => row.sample_id === selectedId)) {
        selectedId = visible[0]?.sample_id || rows[0]?.sample_id || null;
      }
      renderList(visible);
      renderDetail(rows.find((row) => row.sample_id === selectedId) || visible[0] || rows[0]);
      renderSummary();
    }

    function renderSummary() {
      const counts = { accept: 0, fixable: 0, reject: 0, unreviewed: 0 };
      for (const row of rows) counts[getReview(row).review_status || 'unreviewed'] = (counts[getReview(row).review_status || 'unreviewed'] || 0) + 1;
      els.summaryPill.textContent = \`候选 \${rows.length} · 未审 \${counts.unreviewed || 0} · accept \${counts.accept || 0} · fixable \${counts.fixable || 0} · reject \${counts.reject || 0}\`;
    }

    function renderList(visible) {
      els.count.textContent = \`\${visible.length} / \${rows.length}\`;
      els.list.innerHTML = visible.map((row) => {
        const review = getReview(row);
        return \`<article class="sample \${row.sample_id === selectedId ? 'active' : ''}" data-id="\${escapeAttr(row.sample_id)}">
          <div class="sample-top">
            <span class="badge \${escapeAttr(review.review_status || 'unreviewed')}">\${escapeHtml(review.review_status || 'unreviewed')}</span>
            <span class="qid">\${escapeHtml(row.question_id)} · \${escapeHtml(row.option_id)}</span>
          </div>
          <div class="mini">知识点：\${escapeHtml(row.context.knowledge_point_title)}</div>
          <div class="candidate">\${escapeHtml(row.candidate)}</div>
          \${review.note ? \`<div class="mini">备注：\${escapeHtml(review.note)}</div>\` : ''}
        </article>\`;
      }).join('');
      els.list.querySelectorAll('.sample').forEach((node) => {
        node.addEventListener('click', () => {
          selectedId = node.dataset.id;
          render();
        });
      });
    }

    function renderDetail(row) {
      if (!row) {
        els.detailTitle.textContent = '-';
        els.detailId.textContent = '';
        els.detail.innerHTML = '<p class="mini">没有数据</p>';
        return;
      }
      const review = getReview(row);
      els.detailTitle.textContent = row.context.knowledge_point_title || row.question_id;
      els.detailId.textContent = row.sample_id;
      els.detail.innerHTML = \`
        <section class="section">
          <h3>题干</h3>
          <div class="stem">\${escapeHtml(row.context.stem)}</div>
        </section>
        <section class="section">
          <h3>选项</h3>
          \${row.context.options.map((option) => \`<div class="option \${option.isCorrect ? 'correct' : ''} \${option.isCandidate ? 'candidate' : ''}">
            <div class="letter">\${escapeHtml(option.id)}</div>
            <div>\${escapeHtml(option.text)}\${option.isCorrect ? '<div class="mini">正确选项</div>' : ''}\${option.isCandidate ? '<div class="mini">当前审查候选</div>' : ''}</div>
          </div>\`).join('')}
        </section>
        <section class="box">
          <h3>审查这个候选干扰项</h3>
          <div class="status-row">
            \${['accept','fixable','reject'].map((status) => \`<button data-status="\${status}" class="\${review.review_status === status ? 'active' : ''}">\${status}</button>\`).join('')}
          </div>
          <textarea id="note" placeholder="写下原因或修改方向">\${escapeHtml(review.note || '')}</textarea>
          <textarea id="issue" placeholder="issue_category，可选，例如 too_extreme_low_value / duplicate_distractor">\${escapeHtml(review.issue_category || '')}</textarea>
        </section>
        <section class="section">
          <h3>正确理解</h3>
          <p>\${escapeHtml(row.context.correct_understanding || '-')}</p>
        </section>
        <section class="section">
          <h3>常见误区</h3>
          <p>\${escapeHtml(row.context.common_misconception || '-')}</p>
        </section>
        <section class="section">
          <h3>来源上下文</h3>
          <p>\${escapeHtml(row.context.source_context || '-')}</p>
        </section>
        <section class="meta-grid">
          <div class="meta-item"><strong>文章</strong><br>\${escapeHtml(row.context.article_title)}</div>
          <div class="meta-item"><strong>机器分</strong><br>\${escapeHtml(String(row.context.machine_average_score ?? '-'))}</div>
          <div class="meta-item"><strong>题型</strong><br>\${escapeHtml(row.context.question_type || '-')}</div>
          <div class="meta-item"><strong>机器问题</strong><br>\${escapeHtml(row.context.machine_issues || '-')}</div>
        </section>
      \`;
      els.detail.querySelectorAll('[data-status]').forEach((button) => {
        button.addEventListener('click', () => setReview(row, { review_status: button.dataset.status }));
      });
      els.detail.querySelector('#note').addEventListener('input', (event) => setReview(row, { note: event.target.value }, { rerender: false }));
      els.detail.querySelector('#issue').addEventListener('input', (event) => setReview(row, { issue_category: event.target.value }, { rerender: false }));
    }

    function exportPayload() {
      return {
        meta: {
          kind: 'dspy_phase_b_non_hook_distractor_review',
          sourceDataset: '${datasetPathForJs}',
          articleSlug: '${sampleSlug}',
          generatedAt: new Date().toISOString(),
          rowCount: rows.length
        },
        rows: rows.map((row) => ({
          sample_id: row.sample_id,
          article_slug: row.article_slug,
          question_id: row.question_id,
          option_id: row.option_id,
          candidate: row.candidate,
          gold_quality_label: row.gold_quality_label,
          review: getReview(row)
        }))
      };
    }

    async function copyJson() {
      const text = JSON.stringify(exportPayload(), null, 2);
      try {
        await navigator.clipboard.writeText(text);
        showToast('已复制 JSON');
      } catch {
        const area = document.createElement('textarea');
        area.value = text;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
        showToast('已复制 JSON');
      }
    }

    function downloadJson() {
      const blob = new Blob([JSON.stringify(exportPayload(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'phase-b-meta-ai-first-pm-review.json';
      a.click();
      URL.revokeObjectURL(url);
    }

    function showToast(message) {
      els.toast.textContent = message;
      els.toast.classList.add('show');
      setTimeout(() => els.toast.classList.remove('show'), 1400);
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }
    function escapeAttr(value) { return escapeHtml(value); }
    function escapeJs(value) { return String(value ?? '').replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'"); }
  </script>
</body>
</html>`;
}

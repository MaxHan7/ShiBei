import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "../../../..");

const archivePath = path.join(repoRoot, "quality-test-set/results/archive/2026-05-15-095415.json");
const targetSample = "wechat-L6t8rmU_8exk2rPV--cUIA.md";
const articleSlug = "meta-ai-first-pm";
const datasetPath = path.join(root, "datasets/phase-b-meta-ai-first-pm-negative-candidates.v1.jsonl");
const reviewPath = path.join(root, "reviews/phase-b-meta-ai-first-pm-negative-review.html");
const summaryPath = path.join(root, "analysis/phase-b-meta-ai-first-pm-negative-setup-20260603.md");

const archive = JSON.parse(fs.readFileSync(archivePath, "utf8"));
const result = archive.results?.find((entry) => entry.file === targetSample);
if (!result?.chapter) throw new Error(`Cannot find ${targetSample}`);

const chapter = result.chapter;
const questionsById = new Map((chapter.questions || []).map((question) => [question.id, question]));
const pointsById = new Map((chapter.knowledgePoints || []).map((point) => [point.id, point]));

const seeds = [
  ["q-1", "PM岗位还在，只是旧的信息传递型 PM 会失去价值", "correct_equivalent_multiselect_risk", "reject", "和正确答案几乎等价，会造成多选风险。"],
  ["q-1", "所有 PM 都会在一年内被 AI 淘汰", "too_extreme_low_value", "reject", "极端化表达，一眼排除，不能帮助用户理解岗位定义变化。"],
  ["q-1", "PM 应该尽快学习更多 AI 工具", "adjacent_but_not_answering_stem", "fixable", "和文章主题相邻，但没有回答岗位数量/定义变化。"],
  ["q-3", "主要靠同步进度和转述材料工作的人", "correct_equivalent_multiselect_risk", "reject", "这就是信息搬运者的定义，不能作为干扰项。"],
  ["q-3", "只会用 AI 复制粘贴材料的 PM", "narrow_adjacent_but_distorted", "fixable", "方向相邻，但把问题缩窄成 AI 复制粘贴，偏离原文的组织信息搬运。"],
  ["q-3", "负责在团队之间搬运代码的程序员", "wrong_role_too_obvious", "reject", "题干问 PM，候选项变成程序员，错误太明显。"],
  ["q-4", "会议组织者", "too_generic_role_label", "fixable", "可能相邻，但太泛，不能体现信息搬运和缺少判断。"],
  ["q-4", "产品决策者", "correct_boundary_confusion", "reject", "和题干里“很少做产品决策”冲突，且接近反向正确边界。"],
  ["q-7", "产品取舍能力", "correct_equivalent_multiselect_risk", "reject", "判断力在产品语境中的近义表达，容易成为第二正确答案。"],
  ["q-7", "综合能力", "too_vague_low_learning_value", "fixable", "过泛，用户不能通过它分清判断力和其它能力。"],
  ["q-7", "工作年限", "surface_level_adjacent", "fixable", "和工龄经验相近，但太短太浅，需要更贴近旧世界评价标准。"],
  ["q-8", "更熟练地写周报", "too_narrow_low_value", "reject", "低价值流程项，一眼不是文章强调的能力。"],
  ["q-8", "判断什么该做、什么不该做的能力", "correct_equivalent_multiselect_risk", "reject", "是判断力的展开表述，不能作为干扰项。"],
  ["q-8", "更快地整理需求文档", "old_workflow_adjacent_fixable", "fixable", "是旧流程中的相邻能力，可改成更有边界感的旧 PM 能力。"],
  ["q-10-rewrite-3-1", "优先考虑 B，因为他没有大厂经验，所以更灵活", "wrong_reason_for_correct_choice", "fixable", "选择方向对但理由错，容易训练模型识别理由质量。"],
  ["q-10-rewrite-3-1", "优先考虑 A，因为传统机器学习经验更接近 AI-first", "false_causal_reason", "reject", "因果错误，且和原文 AI-first 标准相反。"],
  ["q-10-rewrite-3-1", "优先考虑 B，因为小公司的人一定比大厂更先进", "overgeneralized_stereotype", "reject", "把 AI-first 判断偷换成公司大小偏见。"],
  ["q-10-rewrite-3-1", "两者都不看，直接选薪资最低的人", "irrelevant_criterion", "reject", "无关标准，学习价值很低。"]
];

const rows = seeds.map(([questionId, candidate, draftIssueCategory, draftExpectedLabel, draftRationale], index) => {
  const question = questionsById.get(questionId);
  if (!question) throw new Error(`Missing question ${questionId}`);
  const point = pointsById.get(question.knowledgePointId || question.pointId);
  const correctOption = question.options?.find((option) => option.id === question.correctOptionId);
  return {
    sample_id: `phase-b-negative-${articleSlug}-${questionId}-${String(index + 1).padStart(2, "0")}`,
    task: "distractor_quality_judge_negative_candidate",
    article_slug: articleSlug,
    article_sample: targetSample,
    source_archive: path.relative(repoRoot, archivePath),
    question_id: questionId,
    candidate,
    draft_expected_label: draftExpectedLabel,
    draft_issue_category: draftIssueCategory,
    draft_rationale: draftRationale,
    gold_quality_label: null,
    gold_quality_label_rationale: "",
    context: {
      article_title: chapter.title,
      knowledge_point_id: question.knowledgePointId || question.pointId || "",
      knowledge_point_title: question.pointTitle || point?.title || "",
      knowledge_point_summary: point?.summary || "",
      knowledge_point_key_claim: point?.keyClaim || "",
      question_type: question.type || "",
      stem: question.stem || "",
      correct_option_id: correctOption?.id || "",
      correct_option_text: correctOption?.text || "",
      options: (question.options || []).map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: option.id === question.correctOptionId
      })),
      correct_understanding: question.correctUnderstanding || question.correct_understanding || "",
      common_misconception: question.commonMisconception || question.common_misconception || "",
      source_context: question.sourceSnippet || question.source_snippet || ""
    }
  };
});

fs.mkdirSync(path.dirname(datasetPath), { recursive: true });
fs.mkdirSync(path.dirname(reviewPath), { recursive: true });
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(datasetPath, rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
fs.writeFileSync(reviewPath, buildHtml(rows, path.relative(repoRoot, datasetPath)));
fs.writeFileSync(summaryPath, buildSummary(rows));

console.log(JSON.stringify({
  datasetPath,
  reviewPath,
  summaryPath,
  rowCount: rows.length,
  draftDistribution: rows.reduce((acc, row) => {
    acc[row.draft_expected_label] = (acc[row.draft_expected_label] || 0) + 1;
    return acc;
  }, {})
}, null, 2));

function buildSummary(rows) {
  const distribution = rows.reduce((acc, row) => {
    acc[row.draft_expected_label] = (acc[row.draft_expected_label] || 0) + 1;
    return acc;
  }, {});
  return `# Phase B Meta AI-first PM Negative/Fixable Candidate Setup

Date: 2026-06-03

## Purpose

This batch adds non-Hook fixable/reject candidates for \`DistractorQualityJudge\`. It complements the first Phase B positive batch where all 18 candidates were accepted.

## Data Source

- Article sample: \`${targetSample}\`
- Source archive: \`quality-test-set/results/archive/2026-05-15-095415.json\`
- Dataset: \`quality-test-set/results/dspy/distractors/datasets/phase-b-meta-ai-first-pm-negative-candidates.v1.jsonl\`
- Review page: \`quality-test-set/results/dspy/distractors/reviews/phase-b-meta-ai-first-pm-negative-review.html\`

## Counts

- Candidate distractors: ${rows.length}
- Draft expected distribution: ${Object.entries(distribution).map(([key, value]) => `${key} ${value}`).join(" / ")}

## Important Boundary

The \`draft_expected_label\` is only a setup hypothesis. The final gold label must come from user review. Do not mix this file into train/dev/test until review export has been saved.
`;
}

function buildHtml(rows, datasetPath) {
  const data = JSON.stringify(rows);
  const sourceDataset = datasetPath.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>拾贝 DSPy Phase B 负样本审查</title>
  <style>
    :root { --bg:#fbf7ef; --card:#fffdf8; --ink:#211f1a; --muted:#756d60; --line:#eadfcf; --yellow:#f6d95e; --green:#e7f7e9; --green-text:#1c7d3d; --red:#f9e7e4; --red-text:#a33b2e; --blue:#edf2ff; --blue-text:#3158b8; --shadow:0 18px 50px rgba(71,49,20,.08); }
    *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC","Helvetica Neue",Arial,sans-serif}
    header{position:sticky;top:0;z-index:20;padding:18px 28px;background:rgba(251,247,239,.94);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
    h1{margin:0;font-size:23px}.sub{margin-top:7px;color:var(--muted);font-size:14px;line-height:1.55;max-width:1180px}.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;align-items:center}
    button,select,textarea{font:inherit} button,.pill{border:1px solid var(--line);background:#fffaf1;color:var(--ink);border-radius:999px;padding:9px 14px;cursor:pointer} button.primary{border-color:transparent;background:var(--ink);color:white}
    select{border:1px solid var(--line);border-radius:999px;padding:9px 12px;background:#fffaf1;min-width:220px}
    main{display:grid;grid-template-columns:minmax(380px,.9fr) minmax(500px,1.1fr);gap:22px;padding:24px 28px 60px;max-width:1540px;margin:0 auto}
    .panel{background:rgba(255,253,248,.82);border:1px solid var(--line);border-radius:22px;box-shadow:var(--shadow);overflow:hidden}.panel-head{padding:18px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:14px}.panel-title{font-size:18px;font-weight:850}.count{color:var(--muted);font-size:13px;line-height:1.45}
    .list{display:grid;gap:14px;padding:18px;max-height:calc(100vh - 210px);overflow:auto}.sample{border:1px solid var(--line);background:var(--card);border-radius:18px;padding:17px;cursor:pointer}.sample.active{outline:3px solid rgba(246,217,94,.48)}.sample-top{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px}
    .badge{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;font-size:13px;font-weight:800;white-space:nowrap}.badge.accept{background:var(--green);color:var(--green-text)}.badge.fixable{background:var(--blue);color:var(--blue-text)}.badge.reject{background:var(--red);color:var(--red-text)}.badge.unreviewed{background:#fff6d6;color:#7a5c00}
    .qid{color:var(--muted);font-size:13px;text-align:right}.mini{color:var(--muted);font-size:13px;line-height:1.45}.candidate{font-size:18px;line-height:1.45;font-weight:850;margin-top:10px}.detail{padding:20px;display:grid;gap:16px}.stem{font-size:25px;font-weight:900;line-height:1.34;margin:8px 0 2px}
    .option{display:grid;grid-template-columns:30px 1fr;gap:10px;border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:8px 0;background:#fffefa;line-height:1.45}.option.correct{border-color:#bde8c8;background:#f4fff5}.option.candidate{border-color:#d8c173;background:#fff9dc}.letter{font-weight:900}
    .section h3{margin:0 0 8px;font-size:15px}.section p{margin:0;color:var(--muted);line-height:1.65}.box{border:1px solid var(--line);border-radius:16px;background:#fffefa;padding:14px}.box p{color:var(--ink)}
    textarea{width:100%;min-height:88px;border:1px solid var(--line);border-radius:14px;padding:12px;background:#fffefa;color:var(--ink);resize:vertical;line-height:1.55}.status-row{display:flex;flex-wrap:wrap;gap:8px}.status-row button.active{background:var(--ink);color:white;border-color:var(--ink)}
    .meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.meta-item{padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:#fffefa;color:var(--muted);font-size:13px;line-height:1.45;word-break:break-word}.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--ink);color:#fff;border-radius:999px;padding:10px 16px;opacity:0;pointer-events:none;transition:opacity .2s ease;z-index:99}.toast.show{opacity:1}
    @media(max-width:960px){main{grid-template-columns:1fr;padding:16px}header{padding:16px}.list{max-height:none}}
  </style>
</head>
<body>
  <header>
    <h1>DSPy Phase B：非 Hook 负样本 / 可修样本审查</h1>
    <div class="sub">这批是专门为评分器准备的负样本候选。左侧候选带有 draft 预期，但最终以你标的 accept / fixable / reject 为准。</div>
    <div class="toolbar">
      <select id="filter"><option value="all">全部</option><option value="unreviewed">未审</option><option value="accept">accept</option><option value="fixable">fixable</option><option value="reject">reject</option></select>
      <button id="copy-json" class="primary">复制当前 JSON</button>
      <button id="download-json">下载当前 JSON</button>
      <span class="pill" id="summary-pill">-</span>
    </div>
  </header>
  <main>
    <section class="panel"><div class="panel-head"><div><div class="panel-title">候选坏项 / 可修项</div><div class="count">${datasetPath}</div></div><div class="count" id="count"></div></div><div class="list" id="list"></div></section>
    <section class="panel"><div class="panel-head"><div><div class="panel-title" id="detail-title">-</div><div class="count" id="detail-id"></div></div></div><div class="detail" id="detail"></div></section>
  </main>
  <div class="toast" id="toast">已复制</div>
  <script>
    const rows=${data};
    const storageKey='shibei-dspy-phase-b-meta-ai-first-pm-negative-review-v1';
    let reviews=loadReviews(); let selectedId=rows[0]?.sample_id||null;
    const els={filter:document.getElementById('filter'),list:document.getElementById('list'),count:document.getElementById('count'),detail:document.getElementById('detail'),detailTitle:document.getElementById('detail-title'),detailId:document.getElementById('detail-id'),summaryPill:document.getElementById('summary-pill'),copy:document.getElementById('copy-json'),download:document.getElementById('download-json'),toast:document.getElementById('toast')};
    els.filter.addEventListener('change',render); els.copy.addEventListener('click',copyJson); els.download.addEventListener('click',downloadJson); render();
    function loadReviews(){try{return JSON.parse(localStorage.getItem(storageKey)||'{}')}catch{return {}}}
    function saveReviews(){localStorage.setItem(storageKey,JSON.stringify(reviews))}
    function getReview(row){return reviews[row.sample_id]||{review_status:'unreviewed',note:'',issue_category:row.draft_issue_category||''}}
    function setReview(row,patch,options={}){reviews[row.sample_id]={...getReview(row),...patch,updated_at:new Date().toISOString()};saveReviews(); if(options.rerender===false) renderSummary(); else render()}
    function filteredRows(){const f=els.filter.value; return f==='all'?rows:rows.filter(r=>getReview(r).review_status===f)}
    function render(){const visible=filteredRows(); if(!visible.some(r=>r.sample_id===selectedId)) selectedId=visible[0]?.sample_id||rows[0]?.sample_id||null; renderList(visible); renderDetail(rows.find(r=>r.sample_id===selectedId)||visible[0]||rows[0]); renderSummary()}
    function renderSummary(){const counts={accept:0,fixable:0,reject:0,unreviewed:0}; for(const row of rows){const s=getReview(row).review_status||'unreviewed'; counts[s]=(counts[s]||0)+1} els.summaryPill.textContent=\`候选 \${rows.length} · 未审 \${counts.unreviewed||0} · accept \${counts.accept||0} · fixable \${counts.fixable||0} · reject \${counts.reject||0}\`}
    function renderList(visible){els.count.textContent=\`\${visible.length} / \${rows.length}\`; els.list.innerHTML=visible.map(row=>{const review=getReview(row); return \`<article class="sample \${row.sample_id===selectedId?'active':''}" data-id="\${escapeAttr(row.sample_id)}"><div class="sample-top"><span class="badge \${escapeAttr(review.review_status||'unreviewed')}">\${escapeHtml(review.review_status||'unreviewed')}</span><span class="qid">\${escapeHtml(row.question_id)} · draft \${escapeHtml(row.draft_expected_label)}</span></div><div class="mini">知识点：\${escapeHtml(row.context.knowledge_point_title)}</div><div class="candidate">\${escapeHtml(row.candidate)}</div><div class="mini">draft issue：\${escapeHtml(row.draft_issue_category)}</div></article>\`}).join(''); els.list.querySelectorAll('.sample').forEach(n=>n.addEventListener('click',()=>{selectedId=n.dataset.id;render()}))}
    function renderDetail(row){if(!row){els.detail.innerHTML='<p class="mini">没有数据</p>';return} const review=getReview(row); els.detailTitle.textContent=row.context.knowledge_point_title||row.question_id; els.detailId.textContent=row.sample_id; els.detail.innerHTML=\`<section class="section"><h3>题干</h3><div class="stem">\${escapeHtml(row.context.stem)}</div></section><section class="section"><h3>原题选项</h3>\${row.context.options.map(o=>\`<div class="option \${o.isCorrect?'correct':''}"><div class="letter">\${escapeHtml(o.id)}</div><div>\${escapeHtml(o.text)}\${o.isCorrect?'<div class="mini">正确选项</div>':''}</div></div>\`).join('')}</section><section class="section"><h3>当前审查候选</h3><div class="option candidate"><div class="letter">?</div><div>\${escapeHtml(row.candidate)}<div class="mini">draft：\${escapeHtml(row.draft_expected_label)} · \${escapeHtml(row.draft_issue_category)}</div></div></div></section><section class="box"><h3>人工审查</h3><p class="mini">draft 理由：\${escapeHtml(row.draft_rationale)}</p><div class="status-row">\${['accept','fixable','reject'].map(s=>\`<button data-status="\${s}" class="\${review.review_status===s?'active':''}">\${s}</button>\`).join('')}</div><textarea id="note" placeholder="写下原因或修改方向">\${escapeHtml(review.note||'')}</textarea><textarea id="issue" placeholder="issue_category，可选">\${escapeHtml(review.issue_category||'')}</textarea></section><section class="section"><h3>正确理解</h3><p>\${escapeHtml(row.context.correct_understanding||'-')}</p></section><section class="section"><h3>常见误区</h3><p>\${escapeHtml(row.context.common_misconception||'-')}</p></section><section class="section"><h3>来源上下文</h3><p>\${escapeHtml(row.context.source_context||'-')}</p></section>\`; els.detail.querySelectorAll('[data-status]').forEach(b=>b.addEventListener('click',()=>setReview(row,{review_status:b.dataset.status}))); els.detail.querySelector('#note').addEventListener('input',e=>setReview(row,{note:e.target.value},{rerender:false})); els.detail.querySelector('#issue').addEventListener('input',e=>setReview(row,{issue_category:e.target.value},{rerender:false}))}
    function exportPayload(){return{meta:{kind:'dspy_phase_b_non_hook_negative_distractor_review',sourceDataset:'${sourceDataset}',articleSlug:'${articleSlug}',generatedAt:new Date().toISOString(),rowCount:rows.length},rows:rows.map(row=>({sample_id:row.sample_id,article_slug:row.article_slug,question_id:row.question_id,candidate:row.candidate,draft_expected_label:row.draft_expected_label,draft_issue_category:row.draft_issue_category,review:getReview(row)}))}}
    async function copyJson(){const text=JSON.stringify(exportPayload(),null,2);try{await navigator.clipboard.writeText(text);showToast('已复制 JSON')}catch{const a=document.createElement('textarea');a.value=text;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();showToast('已复制 JSON')}}
    function downloadJson(){const blob=new Blob([JSON.stringify(exportPayload(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='phase-b-meta-ai-first-pm-negative-review.json';a.click();URL.revokeObjectURL(url)}
    function showToast(message){els.toast.textContent=message;els.toast.classList.add('show');setTimeout(()=>els.toast.classList.remove('show'),1400)}
    function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))} function escapeAttr(v){return escapeHtml(v)}
  </script>
</body>
</html>`;
}

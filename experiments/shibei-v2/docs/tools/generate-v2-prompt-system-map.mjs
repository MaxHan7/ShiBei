import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");
const backendRoot = path.join(repoRoot, "backend/src/v2/generation");
const outputDir = path.join(repoRoot, "experiments/shibei-v2/docs/prompt-system");
const outputPath = path.join(outputDir, "v2-prompt-system-structure.html");

const promptFile = path.join(backendRoot, "prompts/buildV2PromptMessages.js");
const modelCallerFile = path.join(backendRoot, "modelPromptCaller.js");
const programFile = path.join(backendRoot, "pipeline/v2GenerationProgram.js");
const questionBriefsFile = path.join(backendRoot, "pipeline/questionBriefs.js");

const stages = [
  {
    id: "sourceMap",
    title: "Source Map",
    status: "deterministic_default",
    call: "默认不调用模型；V2_SOURCE_MAP_MODE=model 时才使用 prompt",
    builder: "buildSourceMapMessages",
    schema: "prompts/sourceMap.js",
    purpose: "把文章切成稳定 source blocks，作为所有 source anchors 的工程基础。",
    input: "article.rawText / cleanedText",
    output: "source + blocks[]",
    next: "reviewPathPlan"
  },
  {
    id: "reviewPathPlan",
    title: "Review Path Plan",
    status: "active_model",
    call: "1 call / chapter",
    builder: "buildReviewPathPlanMessages",
    schema: "prompts/reviewPathPlan.js",
    purpose: "生成整章概要、unit 切分、短/长知识点摘要、章节完成鼓励语。",
    input: "article + source + full source blocks",
    output: "chapter plan + units + source anchors",
    next: "unitKnowledgeMap"
  },
  {
    id: "unitKnowledgeMap",
    title: "Unit Knowledge Map",
    status: "active_model",
    call: "1 call / chapter plan union window",
    builder: "buildUnitKnowledgeMapMessages",
    schema: "prompts/unitKnowledgeMap.js",
    purpose: "在每个大知识点 unit 内拆出 microKnowledgePoints，防止后续漏掉小知识点。",
    input: "reviewPathPlan + selected source window",
    output: "units[].microKnowledgePoints[]",
    next: "taskBriefPlan"
  },
  {
    id: "taskBriefPlan",
    title: "Task Brief Plan",
    status: "active_model",
    call: "1 call / chapter",
    builder: "buildTaskBriefPlanMessages",
    schema: "prompts/taskBriefPlan.js",
    purpose: "把 micro knowledge 映射成 practice goals 和 question plans；ECD 是隐性思考方式，不输出重 ECD JSON。",
    input: "reviewPathPlan + unitKnowledgeMap + selected source window",
    output: "practiceGoals + questionPlans",
    next: "QuestionBriefAdapter"
  },
  {
    id: "QuestionBriefAdapter",
    title: "Question Brief Adapter",
    status: "deterministic_adapter",
    call: "0 model calls",
    builder: null,
    schema: null,
    code: "pipeline/questionBriefs.js",
    purpose: "用代码把 taskBriefPlan 和 micro evidence 压成每个 unit 的 compact questionBriefs。",
    input: "taskBriefPlan + unitKnowledgeMap + unitSourceContexts",
    output: "Map<unitId, questionBriefs[]>",
    next: "multipleChoiceDraftUnitBatch / matchingDraftBatch"
  },
  {
    id: "multipleChoiceDraftUnitBatch",
    title: "Multiple Choice Draft Unit Batch",
    status: "active_model",
    call: "N calls / units with MC briefs",
    builder: "buildMultipleChoiceDraftUnitBatchMessages",
    schema: "prompts/multipleChoiceDraftUnitBatch.js",
    purpose: "只为当前 unit 生成选择题，避免全章 MC 大 JSON 截断。",
    input: "current unit + current unit questionBriefs + current unit sourceContext",
    output: "unitId + questions[] type=multiple_choice",
    next: "mergeTypedQuestionDrafts"
  },
  {
    id: "matchingDraftBatch",
    title: "Matching Draft Batch",
    status: "active_model_conditional",
    call: "0/1 call / chapter, only if matching plans exist",
    builder: "buildMatchingDraftBatchMessages",
    schema: "prompts/matchingDraftBatch.js",
    purpose: "为天然关系结构生成连线题，允许自然 2-4 对关系。",
    input: "matching unit draft inputs + compact source windows",
    output: "units[].questions[] type=matching",
    next: "mergeTypedQuestionDrafts"
  },
  {
    id: "unitCopyBatch",
    title: "Unit Copy Batch",
    status: "active_model",
    call: "1 call / chapter",
    builder: "buildUnitCopyBatchMessages",
    schema: "prompts/unitCopyBatch.js",
    purpose: "生成单元开场 overview 和单元完成 summary。",
    input: "unit + practicePlan + generated questions + sourceContext",
    output: "overview + summary",
    next: "final reviewPath"
  },
  {
    id: "qualityJudge",
    title: "Quality Judge",
    status: "optional_disabled",
    call: "默认 0 calls；V2_ENABLE_QUALITY_JUDGE=1 时启用",
    builder: "buildQualityJudgeMessages",
    schema: "prompts/qualityJudge.js",
    purpose: "实验性诊断，不在当前默认主链路拦截题目。",
    input: "candidate reviewPath",
    output: "verdict + issues",
    next: "quality diagnostics"
  }
];

const legacyStages = [
  ["ecdPlanning", "buildEcdPlanningMessages", "prompts/ecdPlanning.js", "历史 per-unit ECD compact plan 路径；当前主链路不用。"],
  ["unitPracticePlan", "buildUnitPracticePlanMessages", "prompts/unitPracticePlan.js", "历史 per-unit practice plan 转换路径；当前主链路不用。"],
  ["questionDraftBatch", "buildQuestionDraftBatchMessages", "prompts/questionDraftBatch.js", "历史混合题型大 batch；当前主链路不用。"],
  ["multipleChoiceDraftBatch", "buildMultipleChoiceDraftBatchMessages", "prompts/multipleChoiceDraftBatch.js", "历史全章选择题大 batch；已被 unit scoped batch 替代。"],
  ["multipleChoiceDraft", "buildMultipleChoiceDraftMessages", "prompts/multipleChoiceDraft.js", "历史 per-unit 选择题路径；当前主链路不用。"],
  ["matchingDraft", "buildMatchingDraftMessages", "prompts/matchingDraft.js", "历史 per-unit 连线题路径；当前主链路不用。"],
  ["unitSummaryDraft", "buildUnitSummaryDraftMessages", "prompts/unitSummaryDraft.js", "历史 per-unit 文案路径；当前主链路不用。"]
].map(([id, builder, schema, purpose]) => ({ id, title: id, status: "legacy_or_rollback", builder, schema, purpose }));

const promptSource = await readFile(promptFile, "utf8");
const modelCallerSource = await readFile(modelCallerFile, "utf8");
const programSource = await readFile(programFile, "utf8");
const questionBriefsSource = await readFile(questionBriefsFile, "utf8");

const schemaFiles = new Map();
for (const stage of [...stages, ...legacyStages]) {
  if (!stage.schema || schemaFiles.has(stage.schema)) continue;
  schemaFiles.set(stage.schema, await readMaybe(path.join(backendRoot, stage.schema)));
}

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, renderHtml(), "utf8");
console.log(outputPath);

function renderHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Recallo V2 Prompt 系统结构图</title>
  <style>
    :root {
      --bg: #f2f5cf;
      --paper: #fdfaf2;
      --ink: #44423d;
      --muted: #7d7a70;
      --brand: #98a84e;
      --line: #dde1ac;
      --soft: #f2f1da;
      --danger: #ed765c;
      --blue: #6b8dbf;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif;
      line-height: 1.65;
    }
    main { max-width: 1320px; margin: 0 auto; padding: 32px 20px 72px; }
    h1 { margin: 0 0 8px; font-size: 32px; line-height: 1.2; }
    h2 { margin: 40px 0 14px; font-size: 23px; }
    h3 { margin: 0 0 10px; font-size: 18px; }
    .meta { color: var(--muted); font-size: 14px; }
    .card {
      background: var(--paper);
      border: 1px solid rgba(152,168,78,0.22);
      box-shadow: 0 4px 12px rgba(152,163,94,0.16);
      border-radius: 16px;
      padding: 18px;
      margin: 16px 0;
    }
    .toc {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }
    .toc a, .pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      background: var(--soft);
      color: var(--brand);
      padding: 5px 10px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
    }
    .flow {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 12px;
    }
    .flow-node {
      min-height: 150px;
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 14px;
      background: rgba(253,250,242,0.9);
      position: relative;
    }
    .flow-node::after {
      content: "→";
      position: absolute;
      right: 10px;
      top: 10px;
      color: var(--brand);
      font-weight: 800;
    }
    .flow-node:last-child::after { content: ""; }
    .status-active_model { color: var(--brand); }
    .status-active_model_conditional { color: var(--blue); }
    .status-deterministic_default, .status-deterministic_adapter { color: #8b8c42; }
    .status-optional_disabled, .status-legacy_or_rollback { color: var(--danger); }
    .stage-grid {
      display: grid;
      grid-template-columns: minmax(260px, 0.75fr) minmax(0, 1.25fr);
      gap: 16px;
    }
    @media (max-width: 900px) { .stage-grid { grid-template-columns: 1fr; } }
    dl { margin: 0; }
    dt { color: var(--muted); font-weight: 700; margin-top: 10px; }
    dd { margin: 2px 0 0; }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      background: #fff;
      border: 1px solid #ede8d8;
      border-radius: 12px;
      padding: 14px;
      overflow: auto;
      font-size: 12px;
      line-height: 1.55;
    }
    details { margin-top: 12px; }
    summary { cursor: pointer; font-weight: 800; color: var(--ink); }
    .prompt-lines {
      background: white;
      border: 1px dashed var(--line);
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 12px;
    }
    .prompt-lines ol { margin: 0 0 0 22px; padding: 0; }
    .prompt-lines li { margin: 4px 0; }
    .warning {
      border-left: 4px solid var(--danger);
      padding-left: 12px;
      color: var(--muted);
    }
    .columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }
  </style>
</head>
<body>
<main>
  <h1>Recallo V2 Prompt 系统结构图</h1>
  <div class="meta">Generated at ${escapeHtml(new Date().toISOString())} from current source files. This page is an inspection artifact, not a prompt runtime.</div>
  <div class="toc">
    <a href="#flow">主链路结构</a>
    <a href="#active-stages">当前主链路 prompt</a>
    <a href="#legacy-stages">历史/回滚 prompt</a>
    <a href="#runtime">Runtime 与 schema 映射</a>
    <a href="#code">关键编排代码</a>
  </div>

  <section id="flow" class="card">
    <h2 style="margin-top:0">当前主链路，可视化数据流</h2>
    <p class="meta">绿色是当前默认模型 stage；橄榄色是确定性代码层；蓝色是有条件调用；红色是默认停用或历史路径。</p>
    <div class="flow">
      ${stages.map(renderFlowNode).join("\n")}
    </div>
  </section>

  <section class="card">
    <h2 style="margin-top:0">一句话总览</h2>
    <div class="columns">
      <div>
        <h3>设计原则</h3>
        <p>ECD 是隐性出题思考方法：学习对象 → 可观察证据 → 合适任务 → 题目。它不应被整体输出成重 JSON。</p>
      </div>
      <div>
        <h3>技术结构</h3>
        <p>DSPy-style 金字塔：上游规划，下游 typed draft；每个模型 stage 有清晰 signature、schema、validator 和质量指标。</p>
      </div>
      <div>
        <h3>当前瘦身点</h3>
        <p>选择题已从全章大 batch 改为当前 unit scoped batch；QuestionBriefAdapter 用代码传递 compact evidence。</p>
      </div>
    </div>
  </section>

  <section id="active-stages">
    <h2>当前主链路 Prompt / Adapter 明细</h2>
    ${stages.map(renderStage).join("\n")}
  </section>

  <section id="legacy-stages">
    <h2>历史 / 回滚 Prompt 明细</h2>
    <p class="warning">这些 prompt 文件仍保留在代码中，方便回滚或对照实验；它们不是当前默认主链路的一部分。</p>
    ${legacyStages.map(renderStage).join("\n")}
  </section>

  <section id="runtime" class="card">
    <h2 style="margin-top:0">Runtime 与 Schema 映射</h2>
    <p class="meta">这里展示 <code>modelPromptCaller.js</code> 中的模型调用配置，包括每个 stage 的 schemaName 和 estimatedOutputTokens。完整源码如下。</p>
    <pre>${escapeHtml(extractConstObject(modelCallerSource, "STAGE_SCHEMAS") || modelCallerSource)}</pre>
  </section>

  <section id="code" class="card">
    <h2 style="margin-top:0">关键编排代码</h2>
    <details open>
      <summary>runV2GenerationProgram 主流程源码</summary>
      <pre>${escapeHtml(extractFunction(programSource, "runV2GenerationProgram") || programSource)}</pre>
    </details>
    <details>
      <summary>QuestionBriefAdapter 源码</summary>
      <pre>${escapeHtml(questionBriefsSource)}</pre>
    </details>
    <details>
      <summary>baseSystem 与 render helpers</summary>
      <pre>${escapeHtml([
        extractFunction(promptSource, "baseSystem"),
        extractFunction(promptSource, "renderArticle"),
        extractFunction(promptSource, "renderArticleMeta"),
        extractFunction(promptSource, "renderSource")
      ].filter(Boolean).join("\\n\\n"))}</pre>
    </details>
  </section>
</main>
</body>
</html>`;
}

function renderFlowNode(stage) {
  return `<div class="flow-node">
    <div class="pill status-${escapeAttribute(stage.status)}">${escapeHtml(stage.status)}</div>
    <h3>${escapeHtml(stage.title)}</h3>
    <p class="meta">${escapeHtml(stage.call)}</p>
    <p>${escapeHtml(stage.purpose)}</p>
  </div>`;
}

function renderStage(stage) {
  const functionSource = stage.builder ? extractFunction(promptSource, stage.builder) : "";
  const promptLines = functionSource ? extractPromptStringLines(functionSource) : [];
  const schemaSource = stage.schema ? schemaFiles.get(stage.schema) : "";
  const codeSource = stage.code ? (stage.code === "pipeline/questionBriefs.js" ? questionBriefsSource : "") : "";

  return `<article id="${escapeAttribute(stage.id)}" class="card">
    <div class="stage-grid">
      <div>
        <div class="pill status-${escapeAttribute(stage.status)}">${escapeHtml(stage.status)}</div>
        <h3>${escapeHtml(stage.title)}</h3>
        <dl>
          <dt>Stage id</dt><dd><code>${escapeHtml(stage.id)}</code></dd>
          <dt>调用方式</dt><dd>${escapeHtml(stage.call || "")}</dd>
          <dt>职责</dt><dd>${escapeHtml(stage.purpose || "")}</dd>
          <dt>输入</dt><dd>${escapeHtml(stage.input || "")}</dd>
          <dt>输出</dt><dd>${escapeHtml(stage.output || "")}</dd>
          <dt>下一步</dt><dd>${escapeHtml(stage.next || "")}</dd>
          ${stage.builder ? `<dt>Prompt builder</dt><dd><code>${escapeHtml(stage.builder)}</code></dd>` : ""}
          ${stage.schema ? `<dt>Schema file</dt><dd><code>${escapeHtml(stage.schema)}</code></dd>` : ""}
          ${stage.code ? `<dt>Code file</dt><dd><code>${escapeHtml(stage.code)}</code></dd>` : ""}
        </dl>
      </div>
      <div>
        ${promptLines.length ? `<div class="prompt-lines">
          <strong>Prompt 文案逐句预览</strong>
          <ol>${promptLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ol>
        </div>` : `<p class="meta">这个阶段没有模型 prompt；它是确定性代码层。</p>`}
        ${functionSource ? `<details open><summary>Prompt builder 源码</summary><pre>${escapeHtml(functionSource)}</pre></details>` : ""}
        ${codeSource ? `<details open><summary>Adapter 源码</summary><pre>${escapeHtml(codeSource)}</pre></details>` : ""}
        ${schemaSource ? `<details><summary>Schema / validator 源码</summary><pre>${escapeHtml(schemaSource)}</pre></details>` : ""}
      </div>
    </div>
  </article>`;
}

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  if (start === -1) return "";
  const braceStart = findFunctionBodyStart(source, start);
  if (braceStart === -1) return "";
  const end = findMatchingBrace(source, braceStart);
  return end === -1 ? "" : source.slice(start, end + 1);
}

function findFunctionBodyStart(source, functionStart) {
  const parenStart = source.indexOf("(", functionStart);
  if (parenStart === -1) return -1;
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = parenStart; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = "";
      }
      continue;
    }
    if (ch === "\"" || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "(") depth += 1;
    if (ch === ")") {
      depth -= 1;
      if (depth === 0) return source.indexOf("{", i);
    }
  }
  return -1;
}

function extractConstObject(source, name) {
  const start = source.indexOf(`const ${name} =`);
  if (start === -1) return "";
  const braceStart = source.indexOf("{", start);
  if (braceStart === -1) return "";
  const end = findMatchingBrace(source, braceStart);
  return end === -1 ? "" : source.slice(start, end + 2);
}

function findMatchingBrace(source, braceStart) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = braceStart; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = "";
      }
      continue;
    }
    if (ch === "\"" || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function extractPromptStringLines(functionSource, { expandHelpers = true } = {}) {
  const lines = [];
  const stringRegex = /"((?:[^"\\\\]|\\\\.)*)"/g;
  let match;
  while ((match = stringRegex.exec(functionSource))) {
    const value = match[1]
      .replace(/\\"/g, "\"")
      .replace(/\\n/g, "\n")
      .trim();
    if (!value) continue;
    if (value.includes(":\\n")) continue;
    if (value.startsWith("阶段：") || value.startsWith("任务：") || value.startsWith("短角色：") || value.startsWith("-") || value.endsWith("：") || /^[0-9]+\\./.test(value)) {
      lines.push(value);
    }
  }
  if (expandHelpers && functionSource.includes("multipleChoiceVisibleTextLimits()")) {
    lines.push(...extractPromptStringLines(
      extractFunction(promptSource, "multipleChoiceVisibleTextLimits"),
      { expandHelpers: false }
    ));
  }
  if (expandHelpers && functionSource.includes("matchingVisibleTextLimits()")) {
    lines.push(...extractPromptStringLines(
      extractFunction(promptSource, "matchingVisibleTextLimits"),
      { expandHelpers: false }
    ));
  }
  return lines;
}

async function readMaybe(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

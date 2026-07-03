#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const decisionFormPath = "docs/app-store-user-decision-form-zh.md";
const args = parseArgs(process.argv.slice(2));
const dryRun = args["dry-run"] === true;
const force = args.force === true;
const date = args.date || new Date().toISOString().slice(0, 10);
const outputPath = args.output || `docs/app-store-release-evidence/${date}-user-handoff.md`;

console.log("# Recallo App Store Create User Handoff");
console.log(`repoRoot=${repoRoot}`);
console.log(`source=${decisionFormPath}`);
console.log(`target=${outputPath}`);
console.log(`mode=${dryRun ? "dry-run" : "write"}`);

if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  fail("--date must use YYYY-MM-DD.");
}
if (existsSync(resolve(repoRoot, outputPath)) && !force && !dryRun) {
  fail(`Target already exists: ${outputPath}. Pass --force to overwrite.`);
}

const decisionForm = read(decisionFormPath);
const groups = parseDecisionGroups(decisionForm);
const missingGroups = groups
  .map((group) => ({
    ...group,
    missing: group.items.filter((item) => !isFinalValue(item.value))
  }))
  .filter((group) => group.missing.length > 0);

const totalFields = groups.reduce((sum, group) => sum + group.items.length, 0);
const missingFields = missingGroups.reduce((sum, group) => sum + group.missing.length, 0);
const readyFields = totalFields - missingFields;
const gitCommit = git(["rev-parse", "--short=12", "HEAD"]);
const gitBranch = git(["branch", "--show-current"]);
const statusSummary = readStatusSummary();

const markdown = renderMarkdown({
  date,
  gitCommit,
  gitBranch,
  totalFields,
  readyFields,
  missingFields,
  missingGroups,
  statusSummary
});

if (dryRun) {
  console.log("");
  console.log("Dry run passed. User handoff would be created.");
} else {
  writeFileSync(resolve(repoRoot, outputPath), markdown);
  console.log("");
  console.log("User handoff created.");
}

console.log("");
console.log("Next command:");
console.log(`open ${outputPath}`);

function renderMarkdown(values) {
  return `# Recallo App Store User Handoff - ${values.date}

> 这份交接包由 \`npm run app-store:create-user-handoff\` 从当前决策表和上架状态自动生成。它只列用户必须补齐的事项；Codex 可自动执行的回写、验证和证据记录不要求用户手动做。

| 字段 | 值 |
| --- | --- |
| 日期 | ${values.date} |
| Git commit | ${values.gitCommit} |
| Branch | ${values.gitBranch} |
| 决策字段总数 | ${values.totalFields} |
| 已完成字段 | ${values.readyFields} |
| 待用户补齐字段 | ${values.missingFields} |

## 当前状态摘要

${values.statusSummary}

## 你需要补齐的事项

${renderMissingGroups(values.missingGroups)}

## 建议直接回复模板

如果你同意快速首版方案，可以直接复制并填写这段：

\`\`\`text
采用快速首版方案。

支持邮箱：<填写邮箱>
Privacy Policy URL：<填写公开 HTTPS URL>
Support URL：<填写公开 HTTPS URL>

每日真实 AI 生成额度：每天 3 篇，按 UTC day
推荐好文不计入额度：确认
匿名用户可直接生成：确认
首版暂不做 Apple 登录，并接受匿名数据恢复边界：确认
首版不启用 IAP/订阅：确认

App Store 元数据：
App Name：Recallo
Subtitle：把文章变成练习题
Promotional Text：把文章、长文和好内容变成知识点与练习题，让阅读真正变成可以继续学习的进度。
Category：Education
Secondary Category：Productivity
Keywords：学习,知识管理,文章,AI,记忆,题库,阅读,笔记,知识点,碎片知识,练习

真机验收：<无 P0 / 有 P0；无未豁免 P1 / 有未豁免 P1>
App Store 截图：<已准备 / 未准备>
Archive 确认：<名称/图标/Bundle ID 是否正确>
App Store Connect 确认：<是否在 com.maxhan.shibei 对应 App 下提交>
\`\`\`

## 你回复后 Codex 自动执行

1. 把你的回复保存为临时文本，运行 \`npm run app-store:parse-fast-release-reply -- --input <回复文本> --acceptance-record <验收记录路径>\`，生成 \`.release/app-store-inputs/decision-values.json\` 和 \`.release/app-store-inputs/contact-values.json\`。
2. 如果你没有一次性提供所有字段，Codex 会改用 \`npm run app-store:create-fast-release-inputs\` 补齐或生成 draft。
3. 运行 \`npm run app-store:apply-decisions -- .release/app-store-inputs/decision-values.json --dry-run\`。
4. 运行 \`npm run app-store:apply-contact -- .release/app-store-inputs/contact-values.json --dry-run\`。
5. dry-run 通过后，运行正式回写命令，更新决策表、隐私政策、支持页、App Store 元数据、审核包、用户清单和 Archive runbook。
6. 运行 \`npm run app-store:create-acceptance\` 创建真机验收记录。
7. 运行 \`npm run app-store:status\`、\`npm run check:app-store-submit\`、\`npm run check:release-ios\`、\`npm run check\`。
8. 把结果写回 \`docs/app-store-release-readiness-plan-zh.md\` 和证据目录。

## 仍需用户手动完成的外部动作

- 在 Apple Developer / App Store Connect 中确认旧 bundle id 对应的 App。
- 在 Xcode 中执行 Archive 和 Upload。
- 在 App Store Connect 中选择 build、填写隐私标签、上传截图、填写年龄分级并提交审核。
- 真机或 TestFlight 上完成核心路径验收并确认没有 P0 / 未豁免 P1。
`;
}

function renderMissingGroups(groups) {
  if (groups.length === 0) {
    return "当前决策表没有待用户补齐字段。";
  }

  return groups
    .map((group) => {
      const rows = group.missing
        .map((item) => `| ${escapeTable(item.label)} | ${escapeTable(item.value)} | ${escapeTable(item.note || "")} |`)
        .join("\n");
      return `### ${group.title}

| 项目 | 当前值 | 影响 |
| --- | --- | --- |
${rows}`;
    })
    .join("\n\n");
}

function readStatusSummary() {
  const run = spawnSync("node", ["tools/app-store-status.mjs"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env
  });
  const output = `${run.stdout || ""}${run.stderr || ""}`;
  if (!output.trim()) return "- 未能读取状态摘要。";
  const lines = output.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === "## Summary");
  const end = lines.findIndex((line) => line.trim() === "## Details");
  const summaryLines = start >= 0 && end > start ? lines.slice(start + 1, end) : lines.slice(0, 20);
  return summaryLines
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("## "))
    .join("\n");
}

function parseDecisionGroups(markdown) {
  const lines = markdown.split(/\r?\n/);
  const parsedGroups = [];
  let currentSection = "未分组";

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const sectionMatch = line.match(/^##\s+\d+\.\s+(.+)$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    const separatorLine = lines[index + 1];
    if (!isTableLine(line) || !isSeparatorLine(separatorLine)) continue;

    const headers = parseTableLine(line);
    const rows = [];
    index += 2;

    while (index < lines.length && isTableLine(lines[index])) {
      const cells = parseTableLine(lines[index]);
      const row = {};
      headers.forEach((header, cellIndex) => {
        row[header] = cells[cellIndex] ?? "";
      });
      rows.push(row);
      index += 1;
    }

    const items = rows
      .filter((row) => row["最终选择"] !== undefined || row["最终值"] !== undefined || row["最终状态"] !== undefined)
      .map((row) => ({
        label: row["决策项"] || row["信息"] || row["字段"] || row["项目"],
        value: row["最终选择"] ?? row["最终值"] ?? row["最终状态"],
        note: row["备注"] || row["影响范围"] || ""
      }))
      .filter((item) => item.label);

    if (items.length > 0) {
      parsedGroups.push({ title: currentSection, items });
    }
  }

  return parsedGroups;
}

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function git(commandArgs) {
  return execFileSync("git", commandArgs, {
    cwd: repoRoot,
    encoding: "utf8"
  }).trim();
}

function isFinalValue(value) {
  if (!value) return false;
  const normalized = value.trim();
  if (!normalized) return false;
  if (/待填写|待确认|待决策|待用户|待补充/.test(normalized)) return false;
  return true;
}

function isTableLine(line) {
  return typeof line === "string" && line.trim().startsWith("|") && line.trim().endsWith("|");
}

function isSeparatorLine(line) {
  if (!isTableLine(line)) return false;
  return parseTableLine(line).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseTableLine(line) {
  return line
    .trim()
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      fail(`Unexpected positional argument: ${arg}`);
    }
    const key = arg.slice(2);
    if (["dry-run", "force"].includes(key)) {
      parsed[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      fail(`Missing value for --${key}.`);
    }
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

function escapeTable(value) {
  return String(value).replace(/\|/g, "\\|");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

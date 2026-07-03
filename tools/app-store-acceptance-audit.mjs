#!/usr/bin/env node

import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const reportOnly = process.argv.includes("--report");
const args = process.argv.slice(2).filter((arg) => arg !== "--report");
const explicitPath = args[0];
const acceptancePath = explicitPath || findLatestAcceptancePath();

console.log("# Recallo App Store Production Acceptance Audit");
console.log(`repoRoot=${repoRoot}`);
console.log(`mode=${reportOnly ? "report" : "strict"}`);
console.log(`source=${acceptancePath || "(none)"}`);

if (!acceptancePath) {
  failOrReport("No production acceptance record found. Copy docs/app-store-release-evidence/production-acceptance-template.md to YYYY-MM-DD-production-acceptance.md and fill it.");
}

const markdown = readFileSync(resolve(repoRoot, acceptancePath), "utf8");
const rows = parseMarkdownTables(markdown);
const issues = [];

const candidateFields = rows.filter((row) => row["项目"] !== undefined && row["值"] !== undefined);
const requiredCandidateFields = [
  "日期",
  "Git commit",
  "Branch",
  "iOS build number",
  "Railway deployment id",
  "验收设备",
  "iOS 版本",
  "验收人"
];

for (const fieldName of requiredCandidateFields) {
  const row = candidateFields.find((candidate) => candidate["项目"] === fieldName);
  if (!row || !isFilled(row["值"])) {
    issues.push(`候选版本信息缺失：${fieldName}`);
  }
}

const automatedChecks = rows.filter((row) => row["检查项"] !== undefined && row["结果"] !== undefined);
for (const row of automatedChecks) {
  if (!isPass(row["结果"])) {
    issues.push(`自动检查未通过：${row["检查项"]} = ${display(row["结果"])}`);
  }
}

const scenarioRows = rows.filter((row) => row["ID"] !== undefined && row["阻塞等级"] !== undefined);
for (const row of scenarioRows) {
  const severity = row["阻塞等级"];
  const result = row["结果"] ?? "";
  const id = row["ID"];
  const scenario = row["场景"] ?? row["截图"] ?? "";

  if (severity === "P0" && !isPass(result)) {
    issues.push(`P0 未通过：${id} ${scenario} = ${display(result)}`);
  }
  if (severity === "P1" && !isPass(result) && !isWaived(result)) {
    issues.push(`P1 未通过且未豁免：${id} ${scenario} = ${display(result)}`);
  }
}

const screenshotRows = rows.filter((row) => row["截图"] !== undefined && row["结果"] !== undefined);
for (const row of screenshotRows) {
  if (!isPass(row["结果"])) {
    issues.push(`截图验收未通过：${row["截图"]} = ${display(row["结果"])}`);
  }
}

const requiredFinalChecks = [
  "没有 P0",
  "没有未豁免 P1",
  "隐私政策、App Privacy 标签、审核备注一致",
  "截图来自正确 Recallo build",
  "用户已确认支持 URL、隐私 URL、每日额度数字、Apple 登录首版决策"
];

for (const label of requiredFinalChecks) {
  if (!hasCheckedFinalItem(markdown, label)) {
    issues.push(`最终结论勾选缺失：${label}`);
  }
}

if (!hasPassingConclusion(markdown)) {
  issues.push("最终结论必须明确为：通过");
}

if (issues.length > 0) {
  console.log("");
  console.log(`Production acceptance: NOT READY (${issues.length} issue${issues.length === 1 ? "" : "s"})`);
  for (const issue of issues) {
    console.log(`- ${issue}`);
  }
  if (!reportOnly) process.exit(1);
} else {
  console.log("");
  console.log("Production acceptance: READY");
}

function findLatestAcceptancePath() {
  const dir = "docs/app-store-release-evidence";
  const entries = readdirSync(resolve(repoRoot, dir), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^\d{4}-\d{2}-\d{2}-production-acceptance\.md$/.test(name))
    .sort();
  const latest = entries.at(-1);
  return latest ? `${dir}/${latest}` : "";
}

function parseMarkdownTables(markdownText) {
  const lines = markdownText.split(/\r?\n/);
  const parsedRows = [];

  for (let index = 0; index < lines.length; index += 1) {
    const headerLine = lines[index];
    const separatorLine = lines[index + 1];
    if (!isTableLine(headerLine) || !isSeparatorLine(separatorLine)) continue;

    const headers = parseTableLine(headerLine);
    index += 2;

    while (index < lines.length && isTableLine(lines[index])) {
      const cells = parseTableLine(lines[index]);
      const row = {};
      headers.forEach((header, cellIndex) => {
        row[header] = cells[cellIndex] ?? "";
      });
      parsedRows.push(row);
      index += 1;
    }
  }

  return parsedRows;
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

function isFilled(value) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 && !/待填写|待确认|待补充/.test(normalized);
}

function isPass(value) {
  return /^(PASS|Pass|pass|通过|已通过|OK|ok|无问题)$/.test(String(value ?? "").trim());
}

function isWaived(value) {
  return /豁免|waive|waived/i.test(String(value ?? ""));
}

function display(value) {
  const normalized = String(value ?? "").trim();
  return normalized || "(empty)";
}

function hasCheckedFinalItem(markdownText, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`- \\[[xX]\\] ${escaped}`);
  return pattern.test(markdownText);
}

function hasPassingConclusion(markdownText) {
  return /结论：\s*```text\s*通过\s*```/m.test(markdownText);
}

function failOrReport(message) {
  console.log("");
  console.log("Production acceptance: NOT READY (1 issue)");
  console.log(`- ${message}`);
  if (!reportOnly) process.exit(1);
  process.exit(0);
}

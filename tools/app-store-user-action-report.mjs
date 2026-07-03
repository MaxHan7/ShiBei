#!/usr/bin/env node

import { readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const decisionFormPath = "docs/app-store-user-decision-form-zh.md";
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

console.log("# Recallo App Store User Action Report");
console.log(`repoRoot=${repoRoot}`);
console.log(`source=${decisionFormPath}`);
console.log(`totalFields=${totalFields}`);
console.log(`readyFields=${readyFields}`);
console.log(`missingFields=${missingFields}`);

if (missingGroups.length > 0) {
  console.log("");
  console.log("## User-owned missing items");
  for (const group of missingGroups) {
    console.log("");
    console.log(`### ${group.title}`);
    for (const item of group.missing) {
      console.log(`- ${item.label}: ${item.value}`);
    }
  }
}

console.log("");
console.log("## Codex-owned follow-up after user input");
console.log("- 运行 `npm run app-store:create-fast-release-inputs` 生成标准决策 JSON 和联系信息 JSON。");
console.log("- 先 dry-run `app-store:apply-decisions` 和 `app-store:apply-contact`，通过后正式回写隐私政策、支持页、App Store 元数据、审核包和提交 runbook。");
console.log("- 运行 `npm run check:app-store-submit`、`npm run check:release-ios`、`npm run check`。");
console.log("- 把验证结果写回 `docs/app-store-release-readiness-plan-zh.md` 和证据目录。");

console.log("");
console.log("## JSON summary");
console.log(JSON.stringify({
  ready: missingFields === 0,
  totalFields,
  readyFields,
  missingGroups: missingGroups.map((group) => ({
    title: group.title,
    missing: group.missing
  }))
}, null, 2));

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function isFinalValue(value) {
  if (!value) return false;
  const normalized = value.trim();
  if (!normalized) return false;
  if (/待填写|待确认|待决策|待用户|待补充/.test(normalized)) return false;
  return true;
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

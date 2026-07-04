#!/usr/bin/env node

import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const reportMode = process.argv.includes("--report");

const fieldMapPath = "docs/app-store-user-input-field-map-zh.md";
const decisionFormPath = "docs/app-store-user-decision-form-zh.md";
const externalConsoleExamplePath = "docs/app-store-external-console-checks.example.json";
const latestAcceptanceRecordPath = findLatestEvidencePath(/^\d{4}-\d{2}-\d{2}-production-acceptance\.md$/);

const checks = [];

console.log("# Recallo App Store User Input Field Map Audit");
console.log(`repoRoot=${repoRoot}`);
console.log(`mode=${reportMode ? "report" : "strict"}`);
console.log(`fieldMap=${fieldMapPath}`);

const fieldMap = read(fieldMapPath);
const decisionForm = read(decisionFormPath);
const externalConsoleExample = JSON.parse(read(externalConsoleExamplePath));

const decisionFields = parseDecisionFields(decisionForm);
const jsonPaths = collectLeafPaths(externalConsoleExample);

for (const label of decisionFields) {
  addCheck(
    `decision_field:${label}`,
    fieldMap.includes(`| ${label} |`) || fieldMap.includes(`| ${label} `),
    `字段映射表必须覆盖决策表字段：${label}`
  );
}

for (const path of jsonPaths) {
  addCheck(
    `external_console_path:${path}`,
    fieldMap.includes(`\`${path}\``),
    `字段映射表必须覆盖外部控制台 JSON path：${path}`
  );
}

for (const requiredText of [
  latestAcceptanceRecordPath,
  "docs/app-store-release-evidence/screenshots/app-store/",
  "npm run check:app-store-screenshots",
  "npm run check:app-store-external-console"
]) {
  addCheck(
    `required_instruction:${requiredText}`,
    fieldMap.includes(requiredText),
    `字段映射表必须包含操作入口：${requiredText}`
  );
}

finish();

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function findLatestEvidencePath(pattern) {
  const evidenceDir = resolve(repoRoot, "docs/app-store-release-evidence");
  const files = readdirSync(evidenceDir)
    .filter((file) => pattern.test(file))
    .sort((a, b) => a.localeCompare(b));
  if (files.length === 0) {
    throw new Error(`No evidence file found matching ${pattern}`);
  }
  return `docs/app-store-release-evidence/${files.at(-1)}`;
}

function parseDecisionFields(markdown) {
  return parseMarkdownTables(markdown)
    .filter((row) => row["最终选择"] !== undefined || row["最终值"] !== undefined || row["最终状态"] !== undefined)
    .map((row) => row["决策项"] || row["信息"] || row["字段"] || row["项目"])
    .filter(Boolean)
    .filter((label) => !["Xcode 工程路径", "Scheme", "Bundle ID"].includes(label));
}

function collectLeafPaths(value, prefix = "") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const childPrefix = prefix ? `${prefix}.${key}` : key;
    return collectLeafPaths(child, childPrefix);
  });
}

function addCheck(name, ok, detail) {
  checks.push({ name, ok, detail });
}

function finish() {
  for (const check of checks) {
    console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name} - ${check.detail}`);
  }

  const failures = checks.filter((check) => !check.ok);
  console.log("");
  if (failures.length > 0) {
    console.log(`User input field map readiness: NOT READY (${failures.length} issue${failures.length === 1 ? "" : "s"})`);
    if (!reportMode) process.exit(1);
    process.exit(0);
  }

  console.log("User input field map readiness: READY");
  process.exit(0);
}

function parseMarkdownTables(markdown) {
  const lines = markdown.split(/\r?\n/);
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

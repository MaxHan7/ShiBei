#!/usr/bin/env node

import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const decisionFormPath = "docs/app-store-user-decision-form-zh.md";
const dryRun = process.argv.includes("--dry-run");
const args = process.argv.slice(2).filter((arg) => arg !== "--dry-run");
const inputPath = args[0];

if (!inputPath) {
  fail("Usage: npm run app-store:apply-decisions -- <path-to-json> [--dry-run]");
}

const inputSource = inputPath === "-" ? "stdin" : inputPath;
const inputText = inputPath === "-"
  ? readFileSync(0, "utf8")
  : readFileSync(resolve(repoRoot, inputPath), "utf8");
const input = JSON.parse(inputText);
const decisions = input.decisions;

if (!decisions || typeof decisions !== "object" || Array.isArray(decisions)) {
  fail("Decision JSON must contain an object field named `decisions`.");
}

const decisionForm = read(decisionFormPath);
const parsedRows = parseMarkdownTables(decisionForm);
const writableFields = parsedRows
  .filter((row) => row["最终选择"] !== undefined || row["最终值"] !== undefined || row["最终状态"] !== undefined)
  .map((row) => row["决策项"] || row["信息"] || row["字段"] || row["项目"])
  .filter(Boolean)
  .filter((label) => !["App Name", "Xcode 工程路径", "Scheme", "Bundle ID"].includes(label));

const missing = writableFields.filter((label) => !isFinalValue(decisions[label]));
const unknown = Object.keys(decisions).filter((label) => !writableFields.includes(label));

console.log("# Recallo App Store Apply User Decisions");
console.log(`repoRoot=${repoRoot}`);
console.log(`source=${inputSource}`);
console.log(`target=${decisionFormPath}`);
console.log(`mode=${dryRun ? "dry-run" : "write"}`);
console.log(`writableFields=${writableFields.length}`);

if (unknown.length > 0) {
  console.log("");
  console.log("## Unknown decision labels");
  for (const label of unknown) {
    console.log(`- ${label}`);
  }
}

if (missing.length > 0) {
  console.log("");
  console.log("## Missing or placeholder decision values");
  for (const label of missing) {
    console.log(`- ${label}`);
  }
  fail("Decision JSON is incomplete. Fill all missing values before applying.");
}

if (unknown.length > 0) {
  fail("Decision JSON contains unknown labels. Remove or rename them before applying.");
}

const nextDecisionForm = updateMarkdownTables(decisionForm, decisions);

if (dryRun) {
  console.log("");
  console.log("Dry run passed. Decision form would be updated.");
} else {
  writeFileSync(resolve(repoRoot, decisionFormPath), nextDecisionForm);
  console.log("");
  console.log("Decision form updated.");
}

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function isFinalValue(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  if (!normalized) return false;
  if (/待填写|待确认|待决策|待用户|待补充/.test(normalized)) return false;
  if (/^<[^>]+>$/.test(normalized)) return false;
  return true;
}

function updateMarkdownTables(markdown, valuesByLabel) {
  const lines = markdown.split(/\r?\n/);
  const output = [...lines];

  for (let index = 0; index < lines.length; index += 1) {
    const headerLine = lines[index];
    const separatorLine = lines[index + 1];
    if (!isTableLine(headerLine) || !isSeparatorLine(separatorLine)) continue;

    const headers = parseTableLine(headerLine);
    const labelColumnIndex = firstExistingIndex(headers, ["决策项", "信息", "字段", "项目"]);
    const valueColumnIndex = firstExistingIndex(headers, ["最终选择", "最终值", "最终状态"]);
    if (labelColumnIndex === -1 || valueColumnIndex === -1) continue;

    index += 2;
    while (index < lines.length && isTableLine(lines[index])) {
      const cells = parseTableLine(lines[index]);
      const label = cells[labelColumnIndex];
      const nextValue = valuesByLabel[label];
      if (nextValue !== undefined) {
        cells[valueColumnIndex] = nextValue;
        output[index] = serializeTableLine(cells);
      }
      index += 1;
    }
  }

  return output.join("\n");
}

function parseMarkdownTables(markdown) {
  const lines = markdown.split(/\r?\n/);
  const rows = [];

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
      rows.push(row);
      index += 1;
    }
  }

  return rows;
}

function firstExistingIndex(values, candidates) {
  for (const candidate of candidates) {
    const index = values.indexOf(candidate);
    if (index !== -1) return index;
  }
  return -1;
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

function serializeTableLine(cells) {
  return `| ${cells.join(" | ")} |`;
}

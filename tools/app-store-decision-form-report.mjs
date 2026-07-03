#!/usr/bin/env node

import { readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const decisionFormPath = "docs/app-store-user-decision-form-zh.md";
const decisionForm = read(decisionFormPath);

const rows = parseMarkdownTables(decisionForm);
const fields = rows
  .filter((row) => row["最终选择"] !== undefined || row["最终值"] !== undefined || row["最终状态"] !== undefined)
  .map((row) => {
    const label = row["决策项"] || row["信息"] || row["字段"] || row["项目"];
    const value = row["最终选择"] ?? row["最终值"] ?? row["最终状态"];
    return {
      label,
      value,
      ready: isFinalValue(value)
    };
  })
  .filter((field) => field.label);

const missing = fields.filter((field) => !field.ready);
const ready = fields.filter((field) => field.ready);

console.log("# Recallo App Store Decision Form Report");
console.log(`repoRoot=${repoRoot}`);
console.log(`source=${decisionFormPath}`);
console.log(`totalFields=${fields.length}`);
console.log(`readyFields=${ready.length}`);
console.log(`missingFields=${missing.length}`);

if (missing.length > 0) {
  console.log("");
  console.log("## Missing fields");
  for (const field of missing) {
    console.log(`- ${field.label}: ${field.value}`);
  }
}

console.log("");
console.log("## JSON summary");
console.log(JSON.stringify({ ready: missing.length === 0, readyFields: ready.length, missingFields: missing }, null, 2));

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

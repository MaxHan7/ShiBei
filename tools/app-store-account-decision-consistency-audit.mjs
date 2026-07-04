#!/usr/bin/env node

import { readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const reportMode = process.argv.includes("--report");

const documents = [
  {
    path: "docs/app-store-recommended-decisions-zh.md",
    required: ["首版 Apple 登录 | 快速首版暂不做", "Apple 登录列入上架后 P1"],
    forbidden: []
  },
  {
    path: "docs/app-store-user-input-field-map-zh.md",
    required: ["首版是否加入可选 Apple 登录 | 快速首版暂不做", "disabled-first-release"],
    forbidden: []
  },
  {
    path: "docs/app-store-user-action-checklist-zh.md",
    required: ["首版是否加入 Apple 登录 | 快速首版暂不做", "上架后 P1 做可选 Apple 登录"],
    forbidden: ["推荐可选加入；若赶时间可匿名首版"]
  },
  {
    path: "docs/app-store-release-evidence/2026-07-03-user-handoff.md",
    required: ["首版暂不做 Apple 登录，并接受匿名数据恢复边界：确认"],
    forbidden: ["推荐可选加入；若赶时间可匿名首版"]
  },
  {
    path: "docs/app-store-review-submission-pack-zh.md",
    required: ["快速首版匿名优先；暂不做 Apple 登录", "Anonymous-first release"],
    forbidden: ["Apple 登录是否进入首版待决策", "推荐可选加入；若赶时间可匿名首版"]
  }
];

const issues = [];
const passes = [];

for (const document of documents) {
  const content = readFileSync(resolve(repoRoot, document.path), "utf8");
  for (const requiredText of document.required) {
    if (content.includes(requiredText)) {
      passes.push(`PASS ${document.path} contains required text: ${requiredText}`);
    } else {
      issues.push(`MISSING ${document.path} required text: ${requiredText}`);
    }
  }
  for (const forbiddenText of document.forbidden) {
    if (content.includes(forbiddenText)) {
      issues.push(`FORBIDDEN ${document.path} still contains: ${forbiddenText}`);
    } else {
      passes.push(`PASS ${document.path} excludes forbidden text: ${forbiddenText}`);
    }
  }
}

console.log("# Recallo App Store Account Decision Consistency Audit");
console.log(`repoRoot=${repoRoot}`);
console.log(`mode=${reportMode ? "report" : "strict"}`);
console.log("canonicalRecommendation=快速首版暂不做 Apple 登录；接受匿名数据恢复边界；上架后 P1 做可选 Apple 登录。");
console.log("");
console.log("## Checks");
for (const line of passes) console.log(line);

if (issues.length > 0) {
  console.log("");
  console.log(`Account decision consistency: NOT READY (${issues.length} issue${issues.length === 1 ? "" : "s"})`);
  for (const issue of issues) console.log(`- ${issue}`);
  if (!reportMode) process.exit(1);
} else {
  console.log("");
  console.log("Account decision consistency: READY");
}

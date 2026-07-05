#!/usr/bin/env node

import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const reportMode = process.argv.includes("--report");

const latestHandoffPath = findLatestHandoffPath();
const documents = [
  {
    path: "docs/app-store-recommended-decisions-zh.md",
    required: ["首版 Apple 登录 | 加入可选 Apple 登录", "删除账号入口 | 必须同步做"],
    forbidden: []
  },
  {
    path: "docs/app-store-user-input-field-map-zh.md",
    required: ["首版是否加入可选 Apple 登录 | 加入可选 Apple 登录", "enabled"],
    forbidden: []
  },
  {
    path: "docs/app-store-user-action-checklist-zh.md",
    required: ["首版是否加入 Apple 登录 | 加入可选 Apple 登录", "必须同步做账号删除闭环"],
    forbidden: ["推荐可选加入；若赶时间可匿名首版"]
  },
  {
    path: "docs/app-store-user-decision-form-zh.md",
    required: ["加入可选 Apple 登录", "必须做"],
    forbidden: ["二选一：若要数据恢复更稳，做；若要最快上架，首版暂不做"]
  },
  {
    path: latestHandoffPath,
    required: ["首版需要做 Apple 登录：确认", "账号删除入口：确认同步做"],
    forbidden: ["推荐可选加入；若赶时间可匿名首版"]
  },
  {
    path: "docs/app-store-review-submission-pack-zh.md",
    required: ["可选 Apple 登录", "Account deletion is available"],
    forbidden: ["Apple 登录是否进入首版待决策", "推荐可选加入；若赶时间可匿名首版"]
  },
  {
    path: "docs/app-store-release-readiness-plan-zh.md",
    required: ["用户已确认首版加入可选 Sign in with Apple", "账号删除闭环"],
    forbidden: ["推荐可选加入", "推荐 App Store 首版目标", "倾向可选做"]
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
console.log("canonicalRecommendation=首版加入可选 Sign in with Apple；匿名仍可用；账号删除闭环必须同步完成。");
console.log(`latestHandoff=${latestHandoffPath}`);
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

function findLatestHandoffPath() {
  const evidenceDir = resolve(repoRoot, "docs/app-store-release-evidence");
  const handoffs = readdirSync(evidenceDir)
    .filter((file) => /^\d{4}-\d{2}-\d{2}-user-handoff\.md$/.test(file))
    .sort((a, b) => a.localeCompare(b));
  if (handoffs.length === 0) {
    throw new Error("No generated user handoff found in docs/app-store-release-evidence");
  }
  return `docs/app-store-release-evidence/${handoffs.at(-1)}`;
}

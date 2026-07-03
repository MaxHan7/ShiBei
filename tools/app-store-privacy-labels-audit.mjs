#!/usr/bin/env node

import { readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const reportMode = process.argv.includes("--report");

const files = {
  labelsJson: "docs/app-store-privacy-labels.json",
  labelsGuide: "docs/app-store-privacy-labels-zh.md",
  privacyMd: "docs/privacy-policy-zh.md",
  privacyHtml: "docs/privacy-policy.html",
  reviewPack: "docs/app-store-review-submission-pack-zh.md",
  metadata: "docs/app-store-metadata-zh.md"
};

const requiredDeclaredTypes = ["User Content", "Identifiers", "Usage Data", "Diagnostics"];
const requiredNotCollectedTypes = [
  "Location",
  "Contacts",
  "Photos or Videos",
  "Audio Data",
  "Health and Fitness",
  "Financial Info",
  "Advertising Data"
];
const requiredPrivacyPhrases = [
  "用户主动提交的文字",
  "匿名设备 ID",
  "APNs 推送 token",
  "学习记录",
  "服务端诊断信息",
  "第三方 AI 模型处理",
  "不会把用户提交内容用于广告追踪"
];
const requiredReviewPhrases = [
  "User Content",
  "Identifiers",
  "Usage Data",
  "Diagnostics",
  "not use submitted content for advertising tracking"
];

const issues = [];

console.log("# Recallo App Store Privacy Labels Audit");
console.log(`repoRoot=${repoRoot}`);
console.log(`mode=${reportMode ? "report" : "strict"}`);

const labels = readJson(files.labelsJson);
const contents = Object.fromEntries(
  Object.entries(files).filter(([key]) => key !== "labelsJson").map(([key, path]) => [key, read(path)])
);

checkLabelsJson(labels);
checkGuide(contents.labelsGuide);
checkPrivacyPolicy(contents.privacyMd, files.privacyMd);
checkPrivacyPolicy(contents.privacyHtml, files.privacyHtml);
checkReviewPack(contents.reviewPack);
checkMetadata(contents.metadata);

console.log("");
if (issues.length > 0) {
  console.log(`App Store privacy labels readiness: NOT READY (${issues.length} issue${issues.length === 1 ? "" : "s"})`);
  for (const issue of issues) {
    console.log(`- ${issue}`);
  }
  if (!reportMode) process.exit(1);
} else {
  console.log("App Store privacy labels readiness: READY");
}

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function checkLabelsJson(labels) {
  console.log(`checked=${files.labelsJson}`);
  if (labels.appName !== "Recallo") {
    issues.push("privacy labels JSON must use appName=Recallo");
  }
  if (labels.bundleId !== "com.maxhan.shibei") {
    issues.push("privacy labels JSON must preserve production bundle id com.maxhan.shibei");
  }
  if (labels.tracking?.usesDataForTracking !== false) {
    issues.push("privacy labels JSON must state tracking=false");
  }
  const declared = labels.collectedDataTypes ?? [];
  for (const type of requiredDeclaredTypes) {
    const entry = declared.find((item) => item.appleDataType === type);
    if (!entry) {
      issues.push(`privacy labels JSON missing declared type: ${type}`);
      continue;
    }
    if (entry.declareInAppStoreConnect !== true) {
      issues.push(`${type} must be marked declareInAppStoreConnect=true`);
    }
    if (entry.usedForTracking !== false) {
      issues.push(`${type} must be marked usedForTracking=false`);
    }
    if (!Array.isArray(entry.purposes) || entry.purposes.length === 0) {
      issues.push(`${type} must include App Store purpose mapping`);
    }
    if (!Array.isArray(entry.examples) || entry.examples.length === 0) {
      issues.push(`${type} must include Recallo examples`);
    }
  }
  const notCollected = labels.notCollectedDataTypes ?? [];
  for (const type of requiredNotCollectedTypes) {
    if (!notCollected.includes(type)) {
      issues.push(`privacy labels JSON missing not-collected type: ${type}`);
    }
  }
}

function checkGuide(text) {
  console.log(`checked=${files.labelsGuide}`);
  for (const type of requiredDeclaredTypes) {
    if (!text.includes(type)) {
      issues.push(`privacy labels guide missing declared type: ${type}`);
    }
  }
  if (/拾贝|ShiBei|Shibei/.test(text)) {
    issues.push("privacy labels guide contains old brand text");
  }
  if (/待补充|待填写|example\.com/.test(text)) {
    issues.push("privacy labels guide contains placeholder text");
  }
}

function checkPrivacyPolicy(text, path) {
  console.log(`checked=${path}`);
  for (const phrase of requiredPrivacyPhrases) {
    if (!text.includes(phrase)) {
      issues.push(`${path} missing privacy phrase: ${phrase}`);
    }
  }
}

function checkReviewPack(text) {
  console.log(`checked=${files.reviewPack}`);
  for (const phrase of requiredReviewPhrases) {
    if (!text.includes(phrase)) {
      issues.push(`${files.reviewPack} missing review/privacy phrase: ${phrase}`);
    }
  }
}

function checkMetadata(text) {
  console.log(`checked=${files.metadata}`);
  for (const type of ["User Content", "Identifiers", "Usage Data", "Diagnostics"]) {
    if (!text.includes(type)) {
      issues.push(`${files.metadata} missing privacy label type: ${type}`);
    }
  }
  if (!/Tracking\s*\n-\s*Advertising Data|Tracking/.test(text)) {
    issues.push(`${files.metadata} should explicitly say Tracking is not declared`);
  }
}

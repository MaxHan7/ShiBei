#!/usr/bin/env node

import { readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const reportMode = process.argv.includes("--report");

const files = {
  privacyHtml: "docs/privacy-policy.html",
  supportHtml: "docs/support.html",
  privacyMd: "docs/privacy-policy-zh.md",
  supportMd: "docs/support-zh.md"
};

const requiredPrivacySections = [
  "我们收集哪些信息",
  "第三方 AI 模型处理",
  "匿名设备身份和账号",
  "数据保存和删除",
  "生成额度和防滥用",
  "通知",
  "追踪和广告",
  "联系方式"
];

const requiredSupportSections = [
  "联系支持时建议提供",
  "常见问题",
  "如何删除我的数据",
  "如何关闭通知",
  "隐私政策"
];

const issues = [];
const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, read(path)])
);

console.log("# Recallo App Store Static Pages Audit");
console.log(`repoRoot=${repoRoot}`);
console.log(`mode=${reportMode ? "report" : "strict"}`);

checkPage("privacy HTML", files.privacyHtml, contents.privacyHtml, {
  title: "Recallo 隐私政策",
  requiredSections: requiredPrivacySections,
  requireEmail: true,
  requireSupportLink: false,
  requirePrivacyLink: false
});

checkPage("support HTML", files.supportHtml, contents.supportHtml, {
  title: "Recallo 支持",
  requiredSections: requiredSupportSections,
  requireEmail: true,
  requireSupportLink: false,
  requirePrivacyLink: true
});

checkMarkdown("privacy markdown", files.privacyMd, contents.privacyMd, requiredPrivacySections);
checkMarkdown("support markdown", files.supportMd, contents.supportMd, requiredSupportSections);

compareTextPresence(
  "privacy html/md both mention AI processing",
  contents.privacyHtml,
  contents.privacyMd,
  "第三方 AI 模型处理"
);
compareTextPresence(
  "support html/md both mention delete data",
  contents.supportHtml,
  contents.supportMd,
  "删除我的数据"
);

console.log("");
if (issues.length > 0) {
  console.log(`Static pages readiness: NOT READY (${issues.length} issue${issues.length === 1 ? "" : "s"})`);
  for (const issue of issues) {
    console.log(`- ${issue}`);
  }
  if (!reportMode) process.exit(1);
} else {
  console.log("Static pages readiness: READY");
}

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function checkPage(label, path, text, options) {
  console.log(`checked=${path}`);
  if (!text.includes(`<title>${options.title}</title>`)) {
    issues.push(`${label} missing expected title: ${options.title}`);
  }
  if (!text.includes("<!doctype html>")) {
    issues.push(`${label} must be a complete HTML document`);
  }
  if (!text.includes('meta name="viewport"')) {
    issues.push(`${label} missing viewport meta`);
  }
  if (!text.includes("Recallo")) {
    issues.push(`${label} missing Recallo brand`);
  }
  if (/拾贝|ShiBei|Shibei/.test(text)) {
    issues.push(`${label} contains old brand text`);
  }
  if (/fixture|Railway|JSON decode|Application failed to respond/.test(text)) {
    issues.push(`${label} contains debug/error text`);
  }
  if (/待补充|待部署|待公开|待用户|example\.com/.test(text)) {
    issues.push(`${label} contains placeholder text`);
  }
  if (options.requireEmail && !containsEmail(text)) {
    issues.push(`${label} missing real support email`);
  }
  if (options.requirePrivacyLink && !/href=["']\.\/privacy-policy\.html["']/.test(text)) {
    issues.push(`${label} missing local privacy-policy.html link`);
  }
  for (const section of options.requiredSections) {
    if (!text.includes(section)) {
      issues.push(`${label} missing required section: ${section}`);
    }
  }
}

function checkMarkdown(label, path, text, requiredSections) {
  console.log(`checked=${path}`);
  if (!text.includes("Recallo")) {
    issues.push(`${label} missing Recallo brand`);
  }
  if (/拾贝|ShiBei|Shibei/.test(text)) {
    issues.push(`${label} contains old brand text`);
  }
  if (/待补充|待部署|待公开|待用户|example\.com/.test(text)) {
    issues.push(`${label} contains placeholder text`);
  }
  for (const section of requiredSections) {
    if (!text.includes(section)) {
      issues.push(`${label} missing required section: ${section}`);
    }
  }
}

function compareTextPresence(label, html, md, phrase) {
  if (html.includes(phrase) !== md.includes(phrase)) {
    issues.push(`${label} is inconsistent for phrase: ${phrase}`);
  }
}

function containsEmail(text) {
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text);
}

#!/usr/bin/env node

import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const args = parseArgs(process.argv.slice(2));
const dryRun = args["dry-run"] === true;
const force = args.force === true;
const allowPending = args["allow-pending"] === true;
const outputDir = args["output-dir"] || ".release/app-store-inputs";

const requiredUserFields = [
  "support-email",
  "privacy-url",
  "support-url",
  "acceptance-record",
  "p0-status",
  "p1-status",
  "screenshots-status",
  "archive-confirmation",
  "asc-confirmation"
];

const missingFields = requiredUserFields.filter((field) => !isFinalValue(args[field]));
if (missingFields.length > 0 && !allowPending) {
  fail([
    "Missing required user-owned fields:",
    ...missingFields.map((field) => `- --${field}`),
    "",
    "Use --allow-pending only when you want a draft JSON that cannot pass apply-decisions yet."
  ].join("\n"));
}

const supportEmail = finalOrPending(args["support-email"], "<填写正式支持邮箱>");
const privacyPolicyUrl = finalOrPending(args["privacy-url"], "<填写公开 HTTPS 隐私政策 URL>");
const supportUrl = finalOrPending(args["support-url"], "<填写公开 HTTPS 支持页 URL>");

if (!allowPending) {
  if (!isEmail(supportEmail)) fail("--support-email must be a real email address.");
  if (!isHttpsUrl(privacyPolicyUrl)) fail("--privacy-url must be a public HTTPS URL.");
  if (!isHttpsUrl(supportUrl)) fail("--support-url must be a public HTTPS URL.");
}

const decisionValues = {
  decisions: {
    "首版价格": args.price || "免费",
    "首版是否启用 IAP/订阅": args.iap || "不启用",
    "每日真实 AI 生成额度": args["daily-generation-quota"] || "每天 5 篇，按 UTC day",
    "推荐好文是否计入额度": args["recommended-articles-quota"] || "不计入",
    "匿名用户是否可直接生成": args["anonymous-generation"] || "可以，不强制登录",
    "首版是否加入可选 Apple 登录": args["apple-login"] || "加入可选 Apple 登录",
    "如果首版暂不做 Apple 登录，是否接受匿名数据恢复边界": args["anonymous-recovery-boundary"] || "不适用：首版做 Apple 登录；匿名模式仍需说明恢复边界",
    "如果首版做 Apple 登录，是否同步做删除账号入口": args["account-deletion"] || "必须做",
    "支持邮箱": supportEmail,
    "Privacy Policy URL": privacyPolicyUrl,
    "Support URL": supportUrl,
    "Subtitle": args.subtitle || "把文章变成练习题",
    "Promotional Text": args["promotional-text"] || "把文章、长文和好内容变成知识点与练习题，让阅读真正变成可以继续学习的进度。",
    "Category": args.category || "Education",
    "Secondary Category": args["secondary-category"] || "Productivity",
    "Keywords": args.keywords || "学习,知识管理,文章,AI,记忆,题库,阅读,笔记,知识点,碎片知识,练习",
    "真机验收记录文件": finalOrPending(args["acceptance-record"], "<填写验收记录文件路径>"),
    "是否仍有 P0": finalOrPending(args["p0-status"], "<无 P0 / 有 P0>"),
    "是否仍有未豁免 P1": finalOrPending(args["p1-status"], "<无未豁免 P1 / 有未豁免 P1>"),
    "App Store 截图是否已准备": finalOrPending(args["screenshots-status"], "<已准备 / 未准备>"),
    "Archive 中 App 名称/图标是否正确": finalOrPending(args["archive-confirmation"], "<已确认 Recallo 名称、新图标、Bundle ID com.maxhan.shibei / 未确认>"),
    "App Store Connect 是否选择旧 bundle id 对应 App": finalOrPending(args["asc-confirmation"], "<已确认在 com.maxhan.shibei 对应现有 App 下提交 / 未确认>")
  }
};

const contactValues = {
  supportEmail,
  privacyPolicyUrl,
  supportUrl
};

const resolvedOutputDir = resolve(repoRoot, outputDir);
const decisionOutputPath = resolve(resolvedOutputDir, "decision-values.json");
const contactOutputPath = resolve(resolvedOutputDir, "contact-values.json");

console.log("# Recallo App Store Create Fast Release Inputs");
console.log(`repoRoot=${repoRoot}`);
console.log(`outputDir=${outputDir}`);
console.log(`mode=${dryRun ? "dry-run" : "write"}`);
console.log(`allowPending=${allowPending ? "yes" : "no"}`);

if (!dryRun) {
  mkdirSync(resolvedOutputDir, { recursive: true });
  for (const outputPath of [decisionOutputPath, contactOutputPath]) {
    if (existsSync(outputPath) && !force) {
      fail(`Target already exists: ${outputPath}. Pass --force to overwrite.`);
    }
  }
  writeFileSync(decisionOutputPath, `${JSON.stringify(decisionValues, null, 2)}\n`);
  writeFileSync(contactOutputPath, `${JSON.stringify(contactValues, null, 2)}\n`);
}

console.log("");
console.log("Generated inputs:");
console.log(`- ${outputDir}/decision-values.json`);
console.log(`- ${outputDir}/contact-values.json`);
console.log("");
console.log("Next dry-run commands:");
console.log(`npm run app-store:apply-decisions -- ${outputDir}/decision-values.json --dry-run`);
console.log(`npm run app-store:apply-contact -- ${outputDir}/contact-values.json --dry-run`);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      fail(`Unexpected positional argument: ${arg}`);
    }
    const key = arg.slice(2);
    if (["dry-run", "force", "allow-pending"].includes(key)) {
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

function finalOrPending(value, pending) {
  return isFinalValue(value) ? value.trim() : pending;
}

function isFinalValue(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  if (!normalized) return false;
  if (/待填写|待确认|待决策|待用户|待补充/.test(normalized)) return false;
  if (/^<[^>]+>$/.test(normalized)) return false;
  return true;
}

function isEmail(value) {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value);
}

function isHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

#!/usr/bin/env node

import { readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const reportOnly = process.argv.includes("--report");

const checks = [];

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function addCheck(name, ok, detail, action) {
  checks.push({ name, ok, detail, action });
}

function hasPlaceholder(text) {
  return /待补充|待部署公开 URL|待公开支持 URL|待用户提供|待用户部署/.test(text);
}

function containsHttpsURL(text) {
  return /https:\/\/[^\s<>)"']+/.test(text);
}

function containsEmail(text) {
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text);
}

const files = {
  supportHTML: "docs/support.html",
  privacyHTML: "docs/privacy-policy.html",
  metadata: "docs/app-store-metadata-zh.md",
  reviewPack: "docs/app-store-review-submission-pack-zh.md",
  userChecklist: "docs/app-store-user-action-checklist-zh.md",
  decisionForm: "docs/app-store-user-decision-form-zh.md"
};

const supportHTML = read(files.supportHTML);
const privacyHTML = read(files.privacyHTML);
const metadata = read(files.metadata);
const reviewPack = read(files.reviewPack);
const userChecklist = read(files.userChecklist);
const decisionForm = read(files.decisionForm);

console.log("# Recallo App Store Submit Readiness Guard");
console.log(`repoRoot=${repoRoot}`);
console.log(`mode=${reportOnly ? "report" : "strict"}`);

addCheck(
  "support_page_has_no_placeholder",
  !hasPlaceholder(supportHTML),
  `${files.supportHTML} must not contain pending support placeholders before App Store submission`,
  "提供正式支持/隐私联系邮箱，让 Codex 同步替换支持页和隐私政策里的邮箱占位符。"
);
addCheck(
  "privacy_page_has_no_placeholder",
  !hasPlaceholder(privacyHTML),
  `${files.privacyHTML} must not contain pending privacy/contact placeholders before App Store submission`,
  "提供正式支持/隐私联系邮箱，让 Codex 同步替换支持页和隐私政策里的邮箱占位符。"
);
addCheck(
  "support_page_has_email",
  containsEmail(supportHTML),
  `${files.supportHTML} must include a real support email`,
  "提供正式支持/隐私联系邮箱，让 Codex 同步替换支持页和隐私政策里的邮箱占位符。"
);
addCheck(
  "privacy_page_has_email",
  containsEmail(privacyHTML),
  `${files.privacyHTML} must include a real privacy/support email`,
  "提供正式支持/隐私联系邮箱，让 Codex 同步替换支持页和隐私政策里的邮箱占位符。"
);
addCheck(
  "metadata_has_privacy_url",
  /Privacy Policy URL\s*\|[^|\n]*https:\/\//.test(metadata),
  `${files.metadata} must include the final public HTTPS Privacy Policy URL`,
  "部署 docs/privacy-policy.html 和 docs/support.html，并提供最终 HTTPS Privacy Policy URL / Support URL。"
);
addCheck(
  "metadata_has_support_url",
  /Support URL\s*\|[^|\n]*https:\/\//.test(metadata),
  `${files.metadata} must include the final public HTTPS Support URL`,
  "部署 docs/privacy-policy.html 和 docs/support.html，并提供最终 HTTPS Privacy Policy URL / Support URL。"
);
addCheck(
  "metadata_has_no_url_placeholder",
  !/Privacy Policy URL\s*\|[^|\n]*(待|docs\/privacy-policy\.html)/.test(metadata)
    && !/Support URL\s*\|[^|\n]*(待|docs\/support\.html)/.test(metadata),
  `${files.metadata} must not use local file paths or pending URL placeholders for App Store URL fields`,
  "部署 docs/privacy-policy.html 和 docs/support.html，并提供最终 HTTPS Privacy Policy URL / Support URL。"
);
addCheck(
  "review_pack_has_no_pending_decisions",
  !/待确认|待决策|待用户|待补充/.test(reviewPack),
  `${files.reviewPack} must be finalized before App Store submission`,
  "填写 docs/app-store-user-decision-form-zh.md，确认价格、IAP、Apple 登录、额度、元数据、真机验收和截图状态。"
);
addCheck(
  "user_checklist_has_final_urls",
  containsHttpsURL(userChecklist) && !/Support URL[^\n]*已准备|Privacy URL[^\n]*已准备/.test(userChecklist),
  `${files.userChecklist} must be updated with final Support/Privacy URLs instead of preparation instructions`,
  "提供最终邮箱、URL 和决策表后，让 Codex 回写所有 App Store 文档并跑严格提交检查。"
);
addCheck(
  "decision_form_is_finalized",
  !/待填写|待确认|待决策|待用户|待补充/.test(decisionForm),
  `${files.decisionForm} must be filled before App Store submission`,
  "填写 docs/app-store-user-decision-form-zh.md，确认价格、IAP、Apple 登录、额度、元数据、真机验收和截图状态。"
);

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name} - ${check.detail}`);
}

const failures = checks.filter((check) => !check.ok);

if (failures.length > 0) {
  console.log("");
  console.log(`App Store submission readiness: NOT READY (${failures.length} blocker${failures.length === 1 ? "" : "s"})`);
  console.log("");
  console.log("# Next required user/Codex actions");
  const uniqueActions = [...new Set(failures.map((failure) => failure.action).filter(Boolean))];
  for (const [index, action] of uniqueActions.entries()) {
    console.log(`${index + 1}. ${action}`);
  }
  if (!reportOnly) {
    process.exit(1);
  }
} else {
  console.log("");
  console.log("App Store submission readiness: READY");
}

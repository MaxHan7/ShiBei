#!/usr/bin/env node

import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const dryRun = process.argv.includes("--dry-run");
const args = process.argv.slice(2).filter((arg) => arg !== "--dry-run");
const inputPath = args[0];

if (!inputPath) {
  fail("Usage: npm run app-store:apply-contact -- <path-to-json-or-> [--dry-run]");
}

const inputText = inputPath === "-"
  ? readFileSync(0, "utf8")
  : readFileSync(resolve(repoRoot, inputPath), "utf8");
const input = JSON.parse(inputText);
const contact = normalizeContactInfo(input);

console.log("# Recallo App Store Apply Contact Info");
console.log(`repoRoot=${repoRoot}`);
console.log(`source=${inputPath === "-" ? "stdin" : inputPath}`);
console.log(`mode=${dryRun ? "dry-run" : "write"}`);

const updates = [
  updateFile("docs/privacy-policy-zh.md", (text) => replaceAll(text, [
    [/邮箱：待补充/g, `邮箱：${contact.supportEmail}`],
    [/邮箱：[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, `邮箱：${contact.supportEmail}`]
  ])),
  updateFile("docs/privacy-policy.html", (text) => replaceAll(text, [
    [/邮箱：待补充/g, `邮箱：${contact.supportEmail}`],
    [/邮箱：[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, `邮箱：${contact.supportEmail}`]
  ])),
  updateFile("docs/support-zh.md", (text) => replaceAll(text, [
    [/支持邮箱：待补充/g, `支持邮箱：${contact.supportEmail}`],
    [/支持邮箱：[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, `支持邮箱：${contact.supportEmail}`],
    [/关于 Recallo 收集哪些信息、如何使用 AI 模型处理内容、如何保存和删除数据，请查看 `docs\/privacy-policy\.html`。/g, `关于 Recallo 收集哪些信息、如何使用 AI 模型处理内容、如何保存和删除数据，请查看 ${contact.privacyPolicyUrl}。`]
  ])),
  updateFile("docs/support.html", (text) => replaceAll(text, [
    [/支持邮箱：待补充/g, `支持邮箱：${contact.supportEmail}`],
    [/支持邮箱：[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, `支持邮箱：${contact.supportEmail}`],
    [/提交 App Store 前，请将这里替换为正式对外支持邮箱，并同步更新隐私政策、App Store 元数据和审核备注。/g, `如需帮助，请通过以上邮箱联系。`]
  ])),
  updateFile("docs/app-store-metadata-zh.md", (text) => replaceMetadataRows(text, contact)),
  updateFile("docs/app-store-review-submission-pack-zh.md", (text) => replaceReviewPack(text, contact)),
  updateFile("docs/app-store-user-action-checklist-zh.md", (text) => replaceUserChecklist(text, contact)),
  updateFile("docs/app-store-archive-submit-runbook-zh.md", (text) => replaceRunbook(text, contact)),
  updateFile("docs/app-store-url-publishing-guide-zh.md", (text) => replaceUrlGuide(text, contact))
];

for (const update of updates) {
  console.log(`${update.changed ? "UPDATE" : "UNCHANGED"} ${update.path}`);
}

if (dryRun) {
  console.log("");
  console.log("Dry run passed. Contact info would be applied.");
} else {
  for (const update of updates) {
    if (update.changed) {
      writeFileSync(resolve(repoRoot, update.path), update.nextText);
    }
  }
  console.log("");
  console.log("Contact info applied.");
}

function normalizeContactInfo(inputObject) {
  const supportEmail = String(inputObject.supportEmail ?? "").trim();
  const privacyPolicyUrl = String(inputObject.privacyPolicyUrl ?? "").trim();
  const supportUrl = String(inputObject.supportUrl ?? "").trim();

  const errors = [];
  if (!isEmail(supportEmail)) errors.push("supportEmail must be a real email address.");
  if (!isHttpsUrl(privacyPolicyUrl)) errors.push("privacyPolicyUrl must be a public HTTPS URL.");
  if (!isHttpsUrl(supportUrl)) errors.push("supportUrl must be a public HTTPS URL.");
  if (hasPlaceholder(supportEmail) || hasPlaceholder(privacyPolicyUrl) || hasPlaceholder(supportUrl)) {
    errors.push("Contact JSON must not contain placeholder values.");
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }

  return { supportEmail, privacyPolicyUrl, supportUrl };
}

function updateFile(path, updater) {
  const currentText = readFileSync(resolve(repoRoot, path), "utf8");
  const nextText = updater(currentText);
  return { path, changed: currentText !== nextText, nextText };
}

function replaceAll(text, replacements) {
  return replacements.reduce((next, [pattern, value]) => next.replace(pattern, value), text);
}

function replaceMetadataRows(text, contact) {
  return text
    .replace(
      /\| Privacy Policy URL \| [^|\n]+ \| [^|\n]+ \|/g,
      `| Privacy Policy URL | ${contact.privacyPolicyUrl} | 已确定 |`
    )
    .replace(
      /\| Support URL \| [^|\n]+ \| [^|\n]+ \|/g,
      `| Support URL | ${contact.supportUrl} | 已确定 |`
    );
}

function replaceReviewPack(text, contact) {
  const contactSection = [
    "## 11. 对外联系与 URL",
    "",
    `- Support URL：${contact.supportUrl}`,
    `- Privacy Policy URL：${contact.privacyPolicyUrl}`,
    `- 支持邮箱：${contact.supportEmail}`,
    ""
  ].join("\n");

  const withoutOldContactSection = text.replace(/\n## 11\. 对外联系与 URL[\s\S]*$/g, "");
  return `${withoutOldContactSection.trimEnd()}\n\n${contactSection}`;
}

function replaceUserChecklist(text, contact) {
  return text
    .replace(
      /\| Support URL \| App Store Connect 必填\/强建议，用于用户支持 \| [^|\n]+ \|/g,
      `| Support URL | App Store Connect 必填/强建议，用于用户支持 | ${contact.supportUrl} |`
    )
    .replace(
      /\| Privacy URL \| App Store Connect 隐私政策 URL \| [^|\n]+ \|/g,
      `| Privacy URL | App Store Connect 隐私政策 URL | ${contact.privacyPolicyUrl} |`
    )
    .replace(
      /\| 支持邮箱 \| 隐私政策和用户支持 \| [^|\n]+ \|/g,
      `| 支持邮箱 | 隐私政策和用户支持 | ${contact.supportEmail} |`
    )
    .replace(
      /3\. 你按 `docs\/app-store-url-publishing-guide-zh\.md` 部署 `docs\/privacy-policy\.html` 和 `docs\/support\.html`，并提供最终 URL 和支持邮箱。/g,
      "3. Support URL / Privacy URL / 支持邮箱已写入文档；提交前再次确认两个 URL 可公开访问。"
    );
}

function replaceRunbook(text, contact) {
  return text
    .replace(/\| Support URL \|  \|/g, `| Support URL | ${contact.supportUrl} |`)
    .replace(/\| Privacy URL \|  \|/g, `| Privacy URL | ${contact.privacyPolicyUrl} |`)
    .replace(/- \[ \] Support URL 已确定。/g, `- [x] Support URL 已确定：${contact.supportUrl}`)
    .replace(/- \[ \] Privacy URL 已确定并可公开访问。/g, `- [x] Privacy URL 已确定并可公开访问：${contact.privacyPolicyUrl}`);
}

function replaceUrlGuide(text, contact) {
  return text
    .replace(
      /\| 支持邮箱 \| `待补充` \| [^|\n]+ \|/g,
      `| 支持邮箱 | \`${contact.supportEmail}\` | 已提供，Codex 可同步回写 |`
    )
    .replace(
      /\| Privacy Policy URL \| 页面已准备，未公开部署 \| [^|\n]+ \|/g,
      `| Privacy Policy URL | ${contact.privacyPolicyUrl} | 已提供，提交前需确认公开可访问 |`
    )
    .replace(
      /\| Support URL \| 页面已准备，未公开部署 \| [^|\n]+ \|/g,
      `| Support URL | ${contact.supportUrl} | 已提供，提交前需确认公开可访问 |`
    );
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

function hasPlaceholder(value) {
  return /待|<|>|example\.com|your-domain|your-domain\.com/.test(value);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

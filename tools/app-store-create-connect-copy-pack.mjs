#!/usr/bin/env node

import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const args = parseArgs(process.argv.slice(2));
const dryRun = args["dry-run"] === true;
const force = args.force === true;
const allowPending = args["allow-pending"] === true;
const date = args.date || new Date().toISOString().slice(0, 10);
const outputPath = args.output || `docs/app-store-release-evidence/${date}-app-store-connect-copy-pack.md`;

if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  fail("--date must use YYYY-MM-DD.");
}

const metadataPath = "docs/app-store-metadata-zh.md";
const reviewPackPath = "docs/app-store-review-submission-pack-zh.md";
const decisionFormPath = "docs/app-store-user-decision-form-zh.md";
const screenshotChecklistPath = "docs/app-store-release-evidence/screenshots-checklist.md";
const privacyLabelsGuidePath = "docs/app-store-privacy-labels-zh.md";

const metadata = read(metadataPath);
const reviewPack = read(reviewPackPath);
const decisionForm = read(decisionFormPath);
const screenshotChecklist = read(screenshotChecklistPath);
const privacyLabelsGuide = read(privacyLabelsGuidePath);
const metadataRows = parseTables(metadata).find((table) => table.headers.includes("字段") && table.headers.includes("建议内容"))?.rows || [];
const decisionRows = parseTables(decisionForm).flatMap((table) => table.rows);
const reviewRows = parseTables(reviewPack).flatMap((table) => table.rows);

const appStoreFields = {
  appName: finalDecisionValue("App Name") || rowValue(metadataRows, "App Name") || "Recallo",
  subtitle: finalDecisionValue("Subtitle") || rowValue(metadataRows, "Subtitle"),
  promotionalText: finalDecisionValue("Promotional Text") || rowValue(metadataRows, "Promotional Text"),
  privacyUrl: finalDecisionValue("Privacy Policy URL") || rowValue(metadataRows, "Privacy Policy URL"),
  supportUrl: finalDecisionValue("Support URL") || rowValue(metadataRows, "Support URL"),
  category: finalDecisionValue("Category") || rowValue(metadataRows, "Category"),
  secondaryCategory: finalDecisionValue("Secondary Category") || rowValue(metadataRows, "Secondary Category"),
  price: finalDecisionValue("首版价格") || rowValue(metadataRows, "Price"),
  iap: finalDecisionValue("首版是否启用 IAP/订阅") || rowValue(metadataRows, "In-App Purchases"),
  keywords: finalDecisionValue("Keywords") || metadataKeywords(metadata) || sectionCodeBlock(reviewPack, "### 8.3 Keywords 草案")
};

const copyBlocks = {
  whatsNew: sectionBullets(metadata, "## What’s New 草案"),
  description: sectionText(metadata, "## App Store Description 可复制版本", "## 关键词草案"),
  reviewNotes: sectionCodeBlock(reviewPack, "## 2. App Review Notes 草案"),
  testFlightNotes: sectionCodeBlock(reviewPack, "## 3. TestFlight / App Store 测试说明草案"),
  privacyLabels: sectionText(privacyLabelsGuide, "## 1. 总结", "## 5. 与其他材料的一致性检查"),
  ageRating: sectionText(reviewPack, "## 6. 年龄分级预填建议", "## 7. 截图清单"),
  screenshotChecklist: sectionText(screenshotChecklist, "## 技术规格", "## 提交前总检查")
};

const blockers = collectBlockers({ appStoreFields, copyBlocks, decisionForm, metadata, reviewPack });
if (!privacyLabelsAuditReady()) {
  blockers.push("App Privacy labels audit is not ready.");
}
const markdown = renderCopyPack({ date, appStoreFields, copyBlocks, blockers });

console.log("# Recallo App Store Connect Copy Pack");
console.log(`repoRoot=${repoRoot}`);
console.log(`target=${outputPath}`);
console.log(`mode=${dryRun ? "dry-run" : "write"}`);
console.log(`allowPending=${allowPending ? "yes" : "no"}`);
console.log(`blockers=${blockers.length}`);

if (blockers.length > 0) {
  console.log("");
  console.log("## Blockers");
  for (const blocker of blockers) console.log(`- ${blocker}`);
  if (!allowPending) {
    fail("Copy pack contains pending fields. Pass --allow-pending only for a draft pack.");
  }
}

if (!dryRun) {
  const resolvedOutputPath = resolve(repoRoot, outputPath);
  if (existsSync(resolvedOutputPath) && !force) {
    fail(`Target already exists: ${outputPath}. Pass --force to overwrite.`);
  }
  writeFileSync(resolvedOutputPath, markdown);
}

console.log("");
console.log(dryRun ? "Dry run passed. Copy pack would be created." : "Copy pack created.");

function renderCopyPack(values) {
  return `# Recallo App Store Connect Copy Pack - ${values.date}

> 这份文件用于在 App Store Connect 提交页复制粘贴。它由 \`npm run app-store:create-connect-copy-pack\` 从元数据草案、审核提交包、用户决策表和截图清单生成。提交前必须确保 Blockers 为 0。

| 字段 | 值 |
| --- | --- |
| 日期 | ${values.date} |
| Git commit | ${git(["rev-parse", "--short=12", "HEAD"])} |
| Branch | ${git(["branch", "--show-current"])} |
| 工作区 | \`${repoRoot}\` |
| App | ${values.appStoreFields.appName} |
| Bundle ID | \`com.maxhan.shibei\` |

## Blockers

${values.blockers.length === 0 ? "无。" : values.blockers.map((blocker) => `- ${blocker}`).join("\n")}

## App Information

| App Store Connect 字段 | 可粘贴内容 |
| --- | --- |
| App Name | ${escapeTable(values.appStoreFields.appName)} |
| Subtitle | ${escapeTable(values.appStoreFields.subtitle)} |
| Category | ${escapeTable(values.appStoreFields.category)} |
| Secondary Category | ${escapeTable(values.appStoreFields.secondaryCategory)} |
| Price | ${escapeTable(values.appStoreFields.price)} |
| In-App Purchases | ${escapeTable(values.appStoreFields.iap)} |
| Privacy Policy URL | ${escapeTable(values.appStoreFields.privacyUrl)} |
| Support URL | ${escapeTable(values.appStoreFields.supportUrl)} |

## Version Information

### Promotional Text

${values.appStoreFields.promotionalText}

### Description

${values.copyBlocks.description}

### Keywords

\`\`\`text
${values.appStoreFields.keywords}
\`\`\`

### What's New

${values.copyBlocks.whatsNew}

## App Review

### Review Notes

\`\`\`text
${values.copyBlocks.reviewNotes}
\`\`\`

### TestFlight / Beta Test Notes

\`\`\`text
${values.copyBlocks.testFlightNotes}
\`\`\`

## App Privacy Labels

${values.copyBlocks.privacyLabels}

Source: \`${privacyLabelsGuidePath}\`. Before submitting, run \`npm run check:app-store-privacy-labels\` and fill App Store Connect > App Privacy manually from this section.

## Age Rating

${values.copyBlocks.ageRating}

## Screenshot Checklist

${values.copyBlocks.screenshotChecklist}

## Manual Submit Checklist

- [ ] App Store Connect 中选择现有 \`com.maxhan.shibei\` 对应 App，不创建新 App。
- [ ] 选择最新 Recallo build。
- [ ] 粘贴本文件里的 App Information、Version Information、Review Notes。
- [ ] 填写 App Privacy 标签并截图留证。
- [ ] 填写年龄分级并截图留证。
- [ ] 上传 6 张正式截图。
- [ ] 提交审核后，把提交时间、build number 和 App Store Connect 状态回写到 release evidence。
`;
}

function collectBlockers(values) {
  const found = [];
  for (const [field, value] of Object.entries(values.appStoreFields)) {
    if (!isFinalValue(value)) found.push(`App Store field is not finalized: ${field}`);
  }
  for (const [field, value] of Object.entries(values.copyBlocks)) {
    if (!isFinalValue(value)) found.push(`Copy block is not finalized: ${field}`);
  }
  if (/待填写|待确认|待决策|待用户|待补充/.test(values.decisionForm)) {
    found.push("User decision form still contains pending values.");
  }
  if (/docs\/privacy-policy\.html|docs\/support\.html|待部署公开 URL|待用户部署|待用户提供/.test(values.metadata)) {
    found.push("Metadata still points to local/pending support or privacy URLs.");
  }
  if (/待确认|待决策|待用户|待补充/.test(values.reviewPack)) {
    found.push("Review submission pack still contains pending decisions.");
  }
  return [...new Set(found)];
}

function privacyLabelsAuditReady() {
  try {
    execFileSync("node", ["tools/app-store-privacy-labels-audit.mjs"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: "pipe"
    });
    return true;
  } catch {
    return false;
  }
}

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function rowValue(rows, label) {
  const row = rows.find((candidate) => [candidate["字段"], candidate["决策项"], candidate["信息"], candidate["项目"]].includes(label));
  return row?.["建议内容"] || row?.["最终选择"] || row?.["最终值"] || row?.["最终状态"] || "";
}

function decisionValue(label) {
  const row = decisionRows.find((candidate) => [candidate["决策项"], candidate["信息"], candidate["字段"], candidate["项目"]].includes(label));
  return row?.["最终选择"] || row?.["最终值"] || row?.["最终状态"] || "";
}

function finalDecisionValue(label) {
  const value = decisionValue(label);
  return isFinalValue(value) ? value : "";
}

function parseTables(markdown) {
  const lines = markdown.split(/\r?\n/);
  const tables = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!isTableLine(lines[index]) || !isSeparatorLine(lines[index + 1])) continue;
    const headers = parseTableLine(lines[index]);
    const rows = [];
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
    tables.push({ headers, rows });
  }
  return tables;
}

function sectionText(markdown, startHeading, endHeading) {
  return stripCodeFence(sectionMarkdown(markdown, startHeading, endHeading)).trim();
}

function sectionMarkdown(markdown, startHeading, endHeading) {
  const start = markdown.indexOf(startHeading);
  if (start === -1) return "";
  const bodyStart = start + startHeading.length;
  const end = endHeading ? markdown.indexOf(endHeading, bodyStart) : nextHeadingIndex(markdown, bodyStart, headingLevel(startHeading));
  return (end === -1 ? markdown.slice(bodyStart) : markdown.slice(bodyStart, end)).trim();
}

function sectionCodeBlock(markdown, heading) {
  const section = sectionMarkdown(markdown, heading);
  const match = section.match(/```(?:text)?\n([\s\S]*?)\n```/);
  return (match ? match[1] : stripCodeFence(section)).trim();
}

function sectionBullets(markdown, heading) {
  const section = sectionText(markdown, heading);
  const lines = section.split(/\r?\n/);
  const bullets = [];
  for (const line of lines) {
    if (/^- /.test(line.trim())) bullets.push(line.trim());
    if (bullets.length > 0 && line.trim() === "") break;
  }
  return bullets.join("\n") || section;
}

function metadataKeywords(markdown) {
  const section = sectionText(markdown, "## 关键词草案", "## 分类建议");
  const codeBlock = section.match(/```(?:text)?\n([\s\S]*?)\n```/);
  if (codeBlock) return codeBlock[1].trim();
  const line = section
    .split(/\r?\n/)
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate.includes(",") && !candidate.includes("限制") && !candidate.includes("字符数"));
  return line || "";
}

function stripCodeFence(value) {
  return value.replace(/^```(?:text)?\n/, "").replace(/\n```$/, "").trim();
}

function headingLevel(heading) {
  const match = heading.match(/^(#{1,6})\s/);
  return match ? match[1].length : 2;
}

function nextHeadingIndex(markdown, fromIndex, maxLevel) {
  const headingPattern = new RegExp(`\\n#{1,${maxLevel}}\\s`, "g");
  headingPattern.lastIndex = fromIndex;
  const match = headingPattern.exec(markdown);
  return match ? match.index + 1 : -1;
}

function isFinalValue(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  if (!normalized) return false;
  if (/待填写|待确认|待决策|待用户|待补充|待部署|待拍|<[^>]+>/.test(normalized)) return false;
  return true;
}

function isTableLine(line) {
  return typeof line === "string" && line.trim().startsWith("|") && line.trim().endsWith("|");
}

function isSeparatorLine(line) {
  if (!isTableLine(line)) return false;
  return parseTableLine(line).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseTableLine(line) {
  return line.trim().slice(1, -1).split("|").map((cell) => cell.trim());
}

function escapeTable(value) {
  return String(value || "").replace(/\|/g, "\\|");
}

function git(commandArgs) {
  return execFileSync("git", commandArgs, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) fail(`Unexpected positional argument: ${arg}`);
    const key = arg.slice(2);
    if (["dry-run", "force", "allow-pending"].includes(key)) {
      parsed[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(`Missing value for --${key}.`);
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

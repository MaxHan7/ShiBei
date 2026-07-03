#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const productionUrl = "https://shibei-production.up.railway.app";
const xcodeProjectPath = "/Users/hanmingyu/Downloads/拾贝-prod-hardening/拾贝/拾贝.xcodeproj";
const scheme = "Recallo";
const expectedAppName = "Recallo";
const expectedBundleId = "com.maxhan.shibei";

const args = parseArgs(process.argv.slice(2));
const dryRun = args["dry-run"] === true;
const force = args.force === true;
const date = args.date || new Date().toISOString().slice(0, 10);

console.log("# Recallo App Store Create Archive Evidence");
console.log(`repoRoot=${repoRoot}`);
console.log(`mode=${dryRun ? "dry-run" : "write"}`);

if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  fail("--date must use YYYY-MM-DD.");
}

const requiredArgs = [
  "ios-build-number",
  "archive-result",
  "upload-result",
  "organizer-app-name",
  "organizer-bundle-id",
  "organizer-icon-confirmed"
];

for (const key of requiredArgs) {
  requireFilledArg(key);
}

const buildNumber = args["ios-build-number"];
const outputPath =
  args.output || `docs/app-store-release-evidence/${date}-build-${safeFileSegment(buildNumber)}-archive.md`;

console.log(`target=${outputPath}`);

if (existsSync(resolve(repoRoot, outputPath)) && !force && !dryRun) {
  fail(`Target already exists: ${outputPath}. Pass --force to overwrite.`);
}

const archiveResult = normalizeResult(args["archive-result"], "--archive-result");
const uploadResult = normalizeResult(args["upload-result"], "--upload-result");
const iconConfirmed = normalizeYesNo(args["organizer-icon-confirmed"], "--organizer-icon-confirmed");
const organizerAppName = args["organizer-app-name"].trim();
const organizerBundleId = args["organizer-bundle-id"].trim();
const appStoreConnectBuild = optionalValue("app-store-connect-build", "未填写");
const version = optionalValue("version", "未填写");
const archiveTime = optionalValue("archive-time", "未填写");
const uploadTime = optionalValue("upload-time", "未填写");
const reviewStatus = optionalValue("review-status", "未提交");
const notes = optionalValue("notes", "");

const gitCommit = git(["rev-parse", "--short=12", "HEAD"]);
const gitBranch = git(["branch", "--show-current"]);
const health = await readProductionHealth();
const deploymentId = health.version?.railway?.deploymentId || "";

const issues = [];
if (organizerAppName !== expectedAppName) {
  issues.push(`Organizer app name 应为 ${expectedAppName}，当前为 ${organizerAppName}`);
}
if (organizerBundleId !== expectedBundleId) {
  issues.push(`Organizer bundle id 应为 ${expectedBundleId}，当前为 ${organizerBundleId}`);
}
if (iconConfirmed !== "yes") {
  issues.push("Organizer 图标未确认是新版 Recallo 图标");
}
if (archiveResult !== "PASS") {
  issues.push(`Archive 结果不是 PASS：${archiveResult}`);
}
if (uploadResult !== "PASS") {
  issues.push(`Upload 结果不是 PASS：${uploadResult}`);
}
if (!deploymentId) {
  issues.push("Production health 没有返回 Railway deployment id");
}

const finalResult = issues.length === 0 ? "PASS" : archiveResult === "BLOCKED" || uploadResult === "BLOCKED" ? "BLOCKED" : "FAIL";
const markdown = renderMarkdown({
  date,
  buildNumber,
  version,
  gitCommit,
  gitBranch,
  deploymentId,
  archiveResult,
  uploadResult,
  organizerAppName,
  organizerBundleId,
  iconConfirmed,
  appStoreConnectBuild,
  archiveTime,
  uploadTime,
  reviewStatus,
  finalResult,
  issues,
  notes
});

if (dryRun) {
  console.log("");
  console.log("Dry run passed. Archive evidence would be created.");
} else {
  writeFileSync(resolve(repoRoot, outputPath), markdown);
  console.log("");
  console.log("Archive evidence created.");
}

console.log("");
console.log("Next commands:");
console.log("npm run app-store:status");
console.log(`open ${outputPath}`);

function renderMarkdown(values) {
  const issueRows =
    values.issues.length > 0
      ? values.issues.map((issue) => `- ${issue}`).join("\n")
      : "- 无。";
  const notesBlock = values.notes ? values.notes : "无。";

  return `# Recallo Archive Evidence - Build ${values.buildNumber}

| 字段 | 值 |
| --- | --- |
| 日期 | ${values.date} |
| 结果 | ${values.finalResult} |
| Git commit | ${values.gitCommit} |
| Branch | ${values.gitBranch} |
| iOS version | ${values.version} |
| iOS build number | ${values.buildNumber} |
| Xcode project | \`${xcodeProjectPath}\` |
| Xcode scheme | \`${scheme}\` |
| Expected display name | \`${expectedAppName}\` |
| Expected bundle id | \`${expectedBundleId}\` |
| Organizer app name | \`${values.organizerAppName}\` |
| Organizer bundle id | \`${values.organizerBundleId}\` |
| Organizer icon confirmed | ${values.iconConfirmed} |
| Archive result | ${values.archiveResult} |
| Upload result | ${values.uploadResult} |
| Archive time | ${values.archiveTime} |
| Upload time | ${values.uploadTime} |
| App Store Connect build | ${values.appStoreConnectBuild} |
| App Review status | ${values.reviewStatus} |
| Production URL | \`${productionUrl}\` |
| Railway deployment id | ${values.deploymentId || "未返回"} |

## Stop-Condition Check

${issueRows}

## Notes

${notesBlock}

## Manual Evidence Source

本文件记录的是用户在 Xcode Organizer 和 App Store Connect 中看到的手动结果。Codex 自动补全 git、工作区、scheme、production health 和 Railway deployment id；不会替用户伪造 Archive、Upload 或 App Store Connect 处理结果。
`;
}

async function readProductionHealth() {
  const response = await fetch(`${productionUrl}/api/health`);
  if (!response.ok) {
    fail(`Production health request failed with HTTP ${response.status}.`);
  }
  return response.json();
}

function git(commandArgs) {
  return execFileSync("git", commandArgs, {
    cwd: repoRoot,
    encoding: "utf8"
  }).trim();
}

function requireFilledArg(key) {
  const value = args[key];
  if (!isFilled(value)) {
    fail(`Missing required --${key}.`);
  }
  rejectPlaceholder(key, value);
}

function optionalValue(key, fallback) {
  const value = args[key];
  if (!isFilled(value)) return fallback;
  rejectPlaceholder(key, value);
  return value.trim();
}

function normalizeResult(value, flagName) {
  const normalized = value.trim().toUpperCase();
  if (!["PASS", "FAIL", "BLOCKED"].includes(normalized)) {
    fail(`${flagName} must be PASS, FAIL, or BLOCKED.`);
  }
  return normalized;
}

function normalizeYesNo(value, flagName) {
  const normalized = value.trim().toLowerCase();
  if (!["yes", "no"].includes(normalized)) {
    fail(`${flagName} must be yes or no.`);
  }
  return normalized;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      fail(`Unexpected positional argument: ${arg}`);
    }
    const key = arg.slice(2);
    if (["dry-run", "force"].includes(key)) {
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

function rejectPlaceholder(key, value) {
  const normalized = value.trim().toLowerCase();
  const blocked = ["tbd", "todo", "unknown", "placeholder", "待补充", "待填写", "未确认", "不知道"];
  if (blocked.includes(normalized)) {
    fail(`--${key} cannot be a placeholder value: ${value}`);
  }
}

function safeFileSegment(value) {
  return value.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
}

function isFilled(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

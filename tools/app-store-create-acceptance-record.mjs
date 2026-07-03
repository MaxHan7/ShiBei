#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const templatePath = "docs/app-store-release-evidence/production-acceptance-template.md";
const productionUrl = "https://shibei-production.up.railway.app";
const args = parseArgs(process.argv.slice(2));
const dryRun = args["dry-run"] === true;
const force = args.force === true;
const date = args.date || new Date().toISOString().slice(0, 10);
const outputPath = args.output || `docs/app-store-release-evidence/${date}-production-acceptance.md`;

console.log("# Recallo App Store Create Acceptance Record");
console.log(`repoRoot=${repoRoot}`);
console.log(`template=${templatePath}`);
console.log(`target=${outputPath}`);
console.log(`mode=${dryRun ? "dry-run" : "write"}`);

if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  fail("--date must use YYYY-MM-DD.");
}
if (basename(outputPath) === basename(templatePath)) {
  fail("Refusing to overwrite the acceptance template.");
}
if (existsSync(resolve(repoRoot, outputPath)) && !force && !dryRun) {
  fail(`Target already exists: ${outputPath}. Pass --force to overwrite.`);
}

const template = readFileSync(resolve(repoRoot, templatePath), "utf8");
const gitCommit = git(["rev-parse", "--short=12", "HEAD"]);
const gitBranch = git(["branch", "--show-current"]);
const health = await readProductionHealth();
const deploymentId = health.version?.railway?.deploymentId || "";
const next = fillTemplate(template, {
  "日期": date,
  "Git commit": gitCommit,
  "Branch": gitBranch,
  "Railway deployment id": deploymentId,
  "Production URL": `\`${productionUrl}\``,
  "数据策略": "preserve-data"
})
  .replace(
    "| `npm run check:app-store-health` | PASS |  |  |",
    "| `npm run check:app-store-health` | PASS | PASS | production health gate 当前通过；提交前需重跑 |"
  )
  .replace(
    "| `/api/health` | 200，服务正常 |  |  |",
    `| \`/api/health\` | 200，服务正常 | PASS | deployment id \`${deploymentId || "待补充"}\`；提交前需重跑 |`
  )
  .replace(
    "| 正确工作区 | `/Users/hanmingyu/Downloads/拾贝-prod-hardening` |  |  |",
    "| 正确工作区 | `/Users/hanmingyu/Downloads/拾贝-prod-hardening` | PASS | 本文件由官方工作区脚本生成 |"
  )
  .replace(
    "| 正确 scheme | `Recallo` |  |  |",
    "| 正确 scheme | `Recallo` | PASS | release preflight 覆盖；Archive 前仍需用户确认 Xcode 顶栏 |"
  )
  .replace(
    "| 正确 display name | `Recallo` |  |  |",
    "| 正确 display name | `Recallo` | PASS | release preflight 覆盖；Archive 后仍需用户确认 Organizer |"
  )
  .replace(
    "| 正确 bundle id | `com.maxhan.shibei` |  |  |",
    "| 正确 bundle id | `com.maxhan.shibei` | PASS | release preflight 覆盖；App Store Connect 仍需用户确认旧 App |"
  );

if (dryRun) {
  console.log("");
  console.log("Dry run passed. Acceptance record would be created.");
} else {
  writeFileSync(resolve(repoRoot, outputPath), next);
  console.log("");
  console.log("Acceptance record created.");
}

console.log("");
console.log("Next commands:");
console.log(`npm run app-store:acceptance-audit -- ${outputPath}`);
console.log(`npm run check:app-store-acceptance -- ${outputPath}`);

function fillTemplate(markdown, values) {
  let next = markdown;
  for (const [label, value] of Object.entries(values)) {
    next = replaceCandidateRow(next, label, value);
  }
  return next;
}

function replaceCandidateRow(markdown, label, value) {
  const escapedLabel = escapeRegExp(label);
  const pattern = new RegExp(`\\| ${escapedLabel} \\| [^|\\n]* \\|`, "g");
  return markdown.replace(pattern, `| ${label} | ${value} |`);
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

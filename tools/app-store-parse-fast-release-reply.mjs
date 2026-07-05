#!/usr/bin/env node

import { readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const args = parseArgs(process.argv.slice(2));
const inputPath = args.input || "-";
const dryRun = args["dry-run"] === true;
const force = args.force === true;
const allowPending = args["allow-pending"] === true;
const outputDir = args["output-dir"] || ".release/app-store-inputs";
const acceptanceRecord = args["acceptance-record"];

const replyText = inputPath === "-"
  ? readFileSync(0, "utf8")
  : readFileSync(resolve(repoRoot, inputPath), "utf8");

const parsed = parseReply(replyText);
if (acceptanceRecord) {
  parsed["acceptance-record"] = acceptanceRecord;
}

const generatorArgs = buildGeneratorArgs(parsed, { dryRun, force, allowPending, outputDir });

console.log("# Recallo App Store Parse Fast Release Reply");
console.log(`repoRoot=${repoRoot}`);
console.log(`source=${inputPath === "-" ? "stdin" : inputPath}`);
console.log(`outputDir=${outputDir}`);
console.log(`mode=${dryRun ? "dry-run" : "write"}`);
console.log("");
console.log("Parsed fields:");
for (const [key, value] of Object.entries(parsed)) {
  console.log(`- ${key}: ${value || "(missing)"}`);
}
console.log("");
console.log("Delegating to app-store-create-fast-release-inputs...");

const run = spawnSync(process.execPath, [
  resolve(repoRoot, "tools/app-store-create-fast-release-inputs.mjs"),
  ...generatorArgs
], {
  cwd: repoRoot,
  encoding: "utf8",
  stdio: "inherit"
});

process.exit(run.status ?? 1);

function parseReply(text) {
  const values = {};
  setIfPresent(values, "support-email", readLabeledValue(text, ["支持邮箱"]));
  setIfPresent(values, "privacy-url", readLabeledValue(text, ["Privacy Policy URL", "Privacy URL"]));
  setIfPresent(values, "support-url", readLabeledValue(text, ["Support URL"]));
  setIfPresent(values, "daily-generation-quota", readLabeledValue(text, ["每日真实 AI 生成额度"]));
  setIfPresent(values, "subtitle", readLabeledValue(text, ["Subtitle"]));
  setIfPresent(values, "promotional-text", readLabeledValue(text, ["Promotional Text"]));
  setIfPresent(values, "category", readLabeledValue(text, ["Category"]));
  setIfPresent(values, "secondary-category", readLabeledValue(text, ["Secondary Category"]));
  setIfPresent(values, "keywords", readLabeledValue(text, ["Keywords"]));
  setIfPresent(values, "screenshots-status", readLabeledValue(text, ["App Store 截图"]));
  setIfPresent(values, "archive-confirmation", readLabeledValue(text, ["Archive 确认"]));
  setIfPresent(values, "asc-confirmation", readLabeledValue(text, ["App Store Connect 确认"]));

  const quickPlan = /采用快速首版方案/.test(text);
  if (quickPlan) {
    values.price = "免费";
  }
  if (/推荐好文不计入额度[：:]\s*确认/.test(text)) {
    values["recommended-articles-quota"] = "不计入";
  }
  if (/匿名用户可直接生成[：:]\s*确认/.test(text)) {
    values["anonymous-generation"] = "可以，不强制登录";
  }
  if (/首版暂不做\s*Apple\s*登录，并接受匿名数据恢复边界[：:]\s*确认/.test(text)) {
    values["apple-login"] = "首版暂不做 Apple 登录";
    values["anonymous-recovery-boundary"] = "接受，并在说明中明确重装、换机、系统重置可能无法恢复";
    values["account-deletion"] = "不适用：首版暂不做 Apple 登录";
  }
  if (/首版需要做\s*Apple\s*登录[：:]\s*确认/.test(text)) {
    values["apple-login"] = "加入可选 Apple 登录";
    values["anonymous-recovery-boundary"] = "不适用：首版做 Apple 登录；匿名模式仍需说明恢复边界";
  }
  if (/账号删除入口[：:]\s*确认同步做/.test(text)) {
    values["account-deletion"] = "必须做";
  }
  if (/首版不启用\s*IAP\/订阅[：:]\s*确认/.test(text)) {
    values.iap = "不启用";
  }

  const acceptance = readLabeledValue(text, ["真机验收"]);
  if (acceptance) {
    values["p0-status"] = parseStatusPair(acceptance, "P0", "无 P0", "有 P0");
    values["p1-status"] = parseStatusPair(acceptance, "未豁免 P1", "无未豁免 P1", "有未豁免 P1");
  }

  return values;
}

function buildGeneratorArgs(values, options) {
  const cliArgs = ["--output-dir", options.outputDir];
  if (options.dryRun) cliArgs.push("--dry-run");
  if (options.force) cliArgs.push("--force");
  if (options.allowPending) cliArgs.push("--allow-pending");

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string" && value.trim()) {
      cliArgs.push(`--${key}`, value.trim());
    }
  }

  return cliArgs;
}

function readLabeledValue(text, labels) {
  for (const label of labels) {
    const escaped = escapeRegExp(label);
    const match = text.match(new RegExp(`^\\s*${escaped}\\s*[：:]\\s*(.+?)\\s*$`, "im"));
    if (match) {
      const value = match[1].trim();
      if (value && !/^<[^>]+>$/.test(value)) return value;
    }
  }
  return "";
}

function parseStatusPair(text, label, noValue, yesValue) {
  const compact = text.replace(/\s+/g, "");
  if (label === "P0") {
    if (/无P0/.test(compact)) return noValue;
    if (/有P0/.test(compact)) return yesValue;
  }
  if (/无未豁免P1/.test(compact)) return noValue;
  if (/有未豁免P1/.test(compact)) return yesValue;
  return "";
}

function setIfPresent(target, key, value) {
  if (value) target[key] = value;
}

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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));

const checks = [
  {
    name: "用户决策表",
    command: ["node", "tools/app-store-decision-form-report.mjs"],
    blockingWhenNotReady: true
  },
  {
    name: "用户行动分组",
    command: ["node", "tools/app-store-user-action-report.mjs"],
    blockingWhenNotReady: true
  },
  {
    name: "截图规格报告",
    command: ["node", "tools/app-store-screenshot-audit.mjs"],
    blockingWhenNotReady: true
  },
  {
    name: "提交 readiness 报告",
    command: ["node", "tools/app-store-submit-readiness-guard.mjs", "--report"],
    blockingWhenNotReady: true
  },
  {
    name: "iOS Release 预检",
    command: ["node", "tools/release-archive-preflight.mjs"],
    blockingWhenNotReady: false
  }
];

const results = checks.map(runCheck);
const blockers = results.filter((result) => result.blocked);

console.log("# Recallo App Store Release Status");
console.log(`repoRoot=${repoRoot}`);
console.log("");
console.log("## Summary");

for (const result of results) {
  const status = result.blocked ? "BLOCKED" : result.ok ? "PASS" : "WARN";
  console.log(`- ${status} ${result.name}: ${result.summary}`);
}

console.log("");
if (blockers.length > 0) {
  console.log(`Overall status: NOT READY (${blockers.length} blocking area${blockers.length === 1 ? "" : "s"})`);
  console.log("");
  console.log("## Next action");
  console.log("先运行 `npm run app-store:user-actions`，按分组补齐用户决策、URL、邮箱、截图和真机验收状态。");
} else {
  console.log("Overall status: READY FOR FINAL STRICT CHECKS");
  console.log("");
  console.log("## Next action");
  console.log("运行 `npm run check:app-store-submit`、`npm run check:app-store-screenshots`、`npm run check:release-ios`、`npm run check`。");
}

console.log("");
console.log("## Details");
for (const result of results) {
  console.log("");
  console.log(`### ${result.name}`);
  console.log(result.output.trim() || "(no output)");
}

function runCheck(check) {
  const run = spawnSync(check.command[0], check.command.slice(1), {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env
  });

  const output = `${run.stdout || ""}${run.stderr || ""}`;
  const notReady = /NOT READY|FAIL /.test(output) || hasMissingFields(output);
  const ok = run.status === 0 && !notReady;
  const blocked = check.blockingWhenNotReady && notReady;

  return {
    name: check.name,
    ok,
    blocked,
    summary: summarize(output, run.status),
    output
  };
}

function hasMissingFields(output) {
  const match = output.match(/^missingFields=(\d+)$/m);
  return match ? Number(match[1]) > 0 : false;
}

function summarize(output, status) {
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const readyLine = lines.find((line) => /Overall status:|readiness:|App Store submission readiness:/.test(line));
  if (readyLine) return readyLine;

  const totalFields = lines.find((line) => line.startsWith("totalFields="));
  const missingFields = lines.find((line) => line.startsWith("missingFields="));
  if (totalFields || missingFields) {
    return [totalFields, missingFields].filter(Boolean).join(", ");
  }

  const releasePassed = lines.find((line) => line.includes("Release archive preflight passed"));
  if (releasePassed) return releasePassed;

  const screenshotCount = lines.find((line) => line.startsWith("count="));
  if (screenshotCount) return screenshotCount;

  return status === 0 ? "command passed" : `command exited with ${status}`;
}

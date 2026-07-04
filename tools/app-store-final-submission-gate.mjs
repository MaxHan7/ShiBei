#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const reportMode = process.argv.includes("--report");
const today = new Date().toISOString().slice(0, 10);
const acceptanceRecordPath = `docs/app-store-release-evidence/${today}-production-acceptance.md`;
const externalConsoleInputPath = ".release/app-store-inputs/external-console-checks.json";
const latestUserHandoffPath = findLatestUserHandoffPath();

const checks = [
  {
    name: "用户决策表",
    reportCommand: ["node", "tools/app-store-decision-form-report.mjs"],
    strictCommand: ["node", "tools/app-store-decision-form-report.mjs"],
    readyPattern: /^missingFields=0$/m
  },
  {
    name: "用户行动分组",
    reportCommand: ["node", "tools/app-store-user-action-report.mjs"],
    strictCommand: ["node", "tools/app-store-user-action-report.mjs"],
    readyPattern: /^missingFields=0$/m
  },
  {
    name: "截图规格",
    reportCommand: ["node", "tools/app-store-screenshot-audit.mjs"],
    strictCommand: ["node", "tools/app-store-screenshot-audit.mjs", "--strict"],
    readyPattern: /Screenshot readiness: READY/
  },
  {
    name: "真机验收",
    reportCommand: ["node", "tools/app-store-acceptance-audit.mjs", "--report"],
    strictCommand: ["node", "tools/app-store-acceptance-audit.mjs"],
    readyPattern: /Production acceptance: READY/
  },
  {
    name: "生产健康",
    reportCommand: ["node", "tools/app-store-production-health-audit.mjs", "--report"],
    strictCommand: ["node", "tools/app-store-production-health-audit.mjs"],
    readyPattern: /Production health: READY/
  },
  {
    name: "公开页面",
    reportCommand: ["node", "tools/app-store-static-pages-audit.mjs", "--report"],
    strictCommand: ["node", "tools/app-store-static-pages-audit.mjs"],
    readyPattern: /Static pages readiness: READY/
  },
  {
    name: "隐私标签",
    reportCommand: ["node", "tools/app-store-privacy-labels-audit.mjs", "--report"],
    strictCommand: ["node", "tools/app-store-privacy-labels-audit.mjs"],
    readyPattern: /App Store privacy labels readiness: READY/
  },
  {
    name: "外部控制台确认",
    reportCommand: ["node", "tools/app-store-external-console-audit.mjs", "--report"],
    strictCommand: ["node", "tools/app-store-external-console-audit.mjs"],
    readyPattern: /External console readiness: READY/
  },
  {
    name: "提交材料",
    reportCommand: ["node", "tools/app-store-submit-readiness-guard.mjs", "--report"],
    strictCommand: ["node", "tools/app-store-submit-readiness-guard.mjs"],
    readyPattern: /App Store submission readiness: READY/
  },
  {
    name: "iOS Release 预检",
    reportCommand: ["node", "tools/release-archive-preflight.mjs"],
    strictCommand: ["node", "tools/release-archive-preflight.mjs"],
    readyPattern: /Release archive preflight passed\./
  }
];

const results = checks.map(runCheck);
const failures = results.filter((result) => !result.ready);

console.log("# Recallo App Store Final Submission Gate");
console.log(`repoRoot=${repoRoot}`);
console.log(`mode=${reportMode ? "report" : "strict"}`);
console.log("");
console.log("## Summary");
for (const result of results) {
  console.log(`- ${result.ready ? "PASS" : "FAIL"} ${result.name}: ${result.summary}`);
}

console.log("");
if (failures.length > 0) {
  console.log(`Final submission readiness: NOT READY (${failures.length} blocker${failures.length === 1 ? "" : "s"})`);
  console.log("");
  console.log("## Required next actions");
  for (const action of buildNextActions(failures)) {
    console.log(`- ${action}`);
  }
  console.log("");
  console.log("## Failed check details");
  for (const failure of failures) {
    console.log("");
    console.log(`### ${failure.name}`);
    console.log(firstUsefulLines(failure.output, 80));
  }
  if (!reportMode) process.exit(1);
} else {
  console.log("Final submission readiness: READY");
  console.log("");
  console.log("Next: run `npm run check`, then Archive from Xcode using `/Users/hanmingyu/Downloads/拾贝-prod-hardening/拾贝/拾贝.xcodeproj` and the `Recallo` scheme.");
}

function runCheck(check) {
  const command = reportMode ? check.reportCommand : check.strictCommand;
  const run = spawnSync(command[0], command.slice(1), {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env
  });
  const output = `${run.stdout || ""}${run.stderr || ""}`;
  const ready = run.status === 0 && check.readyPattern.test(output);
  return {
    name: check.name,
    ready,
    status: run.status,
    output,
    summary: summarize(output, run.status, check.readyPattern)
  };
}

function summarize(output, status, readyPattern) {
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const readinessLine = lines.find((line) => /readiness:|Production acceptance:|Production health:|Final submission readiness:|Release archive preflight passed|missingFields=/.test(line));
  if (readinessLine) return readinessLine;
  if (readyPattern.test(output)) return "ready";
  return status === 0 ? "command passed but readiness marker missing" : `command exited with ${status}`;
}

function firstUsefulLines(output, maxLines) {
  const lines = output.split(/\r?\n/).filter(Boolean);
  const importantStart = lines.findIndex((line) => /NOT READY|FAIL|Missing fields|User-owned missing items|Required user actions|Next required/.test(line));
  const selected = importantStart >= 0 ? lines.slice(importantStart) : lines;
  return selected.slice(0, maxLines).join("\n") || "(no output)";
}

function buildNextActions(failures) {
  const names = new Set(failures.map((failure) => failure.name));
  const actions = [];
  if (names.has("用户决策表") || names.has("用户行动分组")) {
    const handoffAction = latestUserHandoffPath
      ? `填写最新用户交接包 \`${latestUserHandoffPath}\` 里的用户回复模板`
      : "运行 `npm run app-store:create-user-handoff -- --force` 生成用户交接包后填写模板";
    actions.push(`${handoffAction}，或直接填写 \`docs/app-store-user-decision-form-zh.md\`。`);
  }
  if (names.has("公开页面") || names.has("提交材料")) {
    actions.push("提供支持邮箱、Privacy Policy URL 和 Support URL；Codex 用 `app-store:apply-contact` 回写并重跑门禁。");
  }
  if (names.has("截图规格")) {
    actions.push("把至少 1 张符合 Apple 规格的正式 App Store 截图放入 `docs/app-store-release-evidence/screenshots/app-store/`；首版仍建议补齐 6 张核心场景。");
  }
  if (names.has("真机验收")) {
    if (existsSync(resolve(repoRoot, acceptanceRecordPath))) {
      actions.push(`填写真机/TestFlight 验收记录 \`${acceptanceRecordPath}\`，补齐设备、build、截图证据、每条路径结果和最终结论。`);
    } else {
      actions.push("完成真机/TestFlight 验收记录，或运行 `npm run app-store:create-acceptance` 生成记录后填写。");
    }
  }
  if (names.has("外部控制台确认")) {
    const prefix = existsSync(resolve(repoRoot, externalConsoleInputPath))
      ? `填写已创建的 \`${externalConsoleInputPath}\``
      : `创建并填写 \`${externalConsoleInputPath}\``;
    actions.push(`${prefix}，按 \`docs/app-store-external-console-checklist-zh.md\` 回填 Apple Developer / App Store Connect 实际确认值。`);
  }
  if (names.has("iOS Release 预检")) {
    actions.push("停止 Archive，先修复 `npm run check:release-ios` 报出的工作区、bundle、图标、Release 入口或 API 配置问题。");
  }
  if (names.has("生产健康")) {
    actions.push("停止提交，先排查 production `/api/health`、Postgres、队列或 APNs production 配置。");
  }
  if (names.has("隐私标签")) {
    actions.push("先修复 `docs/app-store-privacy-labels.json`、隐私政策、审核包或元数据里的 App Privacy 不一致。");
  }
  return actions.length > 0 ? actions : ["运行 `npm run app-store:status` 查看当前阻塞项。"];
}

function findLatestUserHandoffPath() {
  const evidenceDir = resolve(repoRoot, "docs/app-store-release-evidence");
  if (!existsSync(evidenceDir)) return null;

  const handoffs = readdirSync(evidenceDir)
    .filter((name) => /^\d{4}-\d{2}-\d{2}-user-handoff\.md$/.test(name))
    .sort();

  if (handoffs.length === 0) return null;
  return `docs/app-store-release-evidence/${handoffs.at(-1)}`;
}

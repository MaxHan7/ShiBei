#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const today = new Date().toISOString().slice(0, 10);
const acceptanceRecordPath = `docs/app-store-release-evidence/${today}-production-acceptance.md`;
const externalConsoleInputPath = ".release/app-store-inputs/external-console-checks.json";
const latestUserHandoffPath = findLatestUserHandoffPath();

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
    name: "真机验收报告",
    command: ["node", "tools/app-store-acceptance-audit.mjs", "--report"],
    blockingWhenNotReady: true
  },
  {
    name: "生产健康报告",
    command: ["node", "tools/app-store-production-health-audit.mjs", "--report"],
    blockingWhenNotReady: true
  },
  {
    name: "公开页面报告",
    command: ["node", "tools/app-store-static-pages-audit.mjs", "--report"],
    blockingWhenNotReady: true
  },
  {
    name: "隐私标签报告",
    command: ["node", "tools/app-store-privacy-labels-audit.mjs", "--report"],
    blockingWhenNotReady: true
  },
  {
    name: "外部控制台确认",
    command: ["node", "tools/app-store-external-console-audit.mjs", "--report"],
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
  for (const action of buildNextActions(blockers)) {
    console.log(`- ${action}`);
  }
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
  const readyLine = lines.find((line) => /Overall status:|readiness:|App Store submission readiness:|Production acceptance:|Production health:|Static pages readiness:|App Store privacy labels readiness:|External console readiness:/.test(line));
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

function buildNextActions(blockers) {
  const blockerNames = new Set(blockers.map((blocker) => blocker.name));
  const actions = [];

  if (latestUserHandoffPath) {
    actions.push(`使用最新用户交接包 \`${latestUserHandoffPath}\` 作为当前唯一用户待办入口；只有台账或状态变化后才需要重新运行 \`npm run app-store:create-user-handoff -- --force\`。`);
  } else {
    actions.push("运行 `npm run app-store:create-user-handoff -- --force` 刷新用户交接包，作为当前唯一用户待办入口。");
  }

  if (blockerNames.has("用户决策表") || blockerNames.has("用户行动分组")) {
    actions.push("用户按交接包模板补齐价格、额度、Apple 登录、邮箱、URL、元数据、截图和验收状态；Codex 随后运行 `npm run app-store:ingest-user-reply -- --input <reply-file> --acceptance-record <acceptance-file>` 做 dry-run，确认后加 `--apply` 回写。");
  }
  if (blockerNames.has("公开页面报告") || blockerNames.has("提交 readiness 报告")) {
    actions.push("用户提供正式支持邮箱、Privacy Policy URL、Support URL；Codex 用 `npm run app-store:apply-contact -- <contact-json> --dry-run` 验证并回写公开页面和提交包。");
  }
  if (blockerNames.has("截图规格报告")) {
    actions.push("用户把至少 1 张符合规格的正式 App Store 截图放入 `docs/app-store-release-evidence/screenshots/app-store/`；首版仍建议补齐 6 张核心场景。Codex 运行 `npm run check:app-store-screenshots`。");
  }
  if (blockerNames.has("真机验收报告")) {
    if (existsSync(resolve(repoRoot, acceptanceRecordPath))) {
      actions.push(`用户填写已创建的真机/TestFlight 验收记录 \`${acceptanceRecordPath}\`；Codex 用 \`npm run check:app-store-acceptance -- ${acceptanceRecordPath}\` 做严格检查。`);
    } else {
      actions.push("用户完成真机/TestFlight 核心路径验收；Codex 运行 `npm run app-store:create-acceptance` 生成记录，并用 `npm run check:app-store-acceptance -- <record>` 做严格检查。");
    }
  }
  if (blockerNames.has("外部控制台确认")) {
    const externalConsoleAction = existsSync(resolve(repoRoot, externalConsoleInputPath))
      ? `用户填写已创建的 \`${externalConsoleInputPath}\``
      : `用户按 \`docs/app-store-external-console-checklist-zh.md\` 创建并填写 \`${externalConsoleInputPath}\``;
    actions.push(`${externalConsoleAction}；Codex 运行 \`npm run check:app-store-external-console\`。`);
  }

  actions.push("所有用户输入回写后，Codex 跑 `npm run app-store:final-gate` 预览最终缺口；严格通过 `npm run check:app-store-final`、`npm run check:release-ios`、`npm run check` 后，用户再 Archive / Upload。");
  return actions;
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

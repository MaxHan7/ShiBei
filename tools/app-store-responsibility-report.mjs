#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const today = new Date().toISOString().slice(0, 10);

const handoffPath = `docs/app-store-release-evidence/${today}-user-handoff.md`;
const decisionFormPath = "docs/app-store-user-decision-form-zh.md";
const fieldMapPath = "docs/app-store-user-input-field-map-zh.md";
const acceptancePath = `docs/app-store-release-evidence/${today}-production-acceptance.md`;
const externalConsolePath = ".release/app-store-inputs/external-console-checks.json";
const screenshotDir = "docs/app-store-release-evidence/screenshots/app-store/";

const reports = [
  runReport("状态总览", ["node", "tools/app-store-status.mjs"]),
  runReport("用户行动分组", ["node", "tools/app-store-user-action-report.mjs"]),
  runReport("截图规格", ["node", "tools/app-store-screenshot-audit.mjs"]),
  runReport("真机验收", ["node", "tools/app-store-acceptance-audit.mjs", "--report"]),
  runReport("公开页面", ["node", "tools/app-store-static-pages-audit.mjs", "--report"]),
  runReport("外部控制台", ["node", "tools/app-store-external-console-audit.mjs", "--report"]),
  runReport("最终提交门禁", ["node", "tools/app-store-final-submission-gate.mjs", "--report"])
];

const blockers = reports.filter((report) => report.blocked);
const waitingOnUser = blockers.length > 0;

console.log("# Recallo App Store Responsibility Boundary");
console.log(`repoRoot=${repoRoot}`);
console.log(`generatedAt=${new Date().toISOString()}`);
console.log("");
console.log("## Current Boundary");
console.log(waitingOnUser
  ? "status=WAITING_ON_USER_OR_EXTERNAL_APPLE_INPUT"
  : "status=CODEX_CAN_RUN_FINAL_STRICT_GATES");
console.log("");
console.log("This report answers one question: what is blocked by user-owned or Apple/Xcode-owned input, and what Codex will do automatically after that input exists.");
console.log("");

console.log("## User-owned Now");
console.log("- Fill or confirm product and review decisions in the current handoff or decision form.");
console.log(`  - Primary entry: \`${handoffPath}\``);
console.log(`  - Field map: \`${fieldMapPath}\``);
console.log(`  - Decision form: \`${decisionFormPath}\``);
console.log("- Provide a real support email plus public HTTPS Privacy Policy URL and Support URL.");
console.log(`- Add at least 1 valid App Store screenshot to \`${screenshotDir}\`; 6 core-scene screenshots remain recommended.`);
console.log(`- Fill the TestFlight/real-device acceptance record: \`${acceptancePath}\`.`);
console.log(`- Confirm Apple Developer / App Store Connect fields in \`${externalConsolePath}\`.`);
console.log("- Archive and upload from Xcode/App Store Connect only after final strict gates pass.");
console.log("");

console.log("## Codex-owned Automatically After User Input");
console.log("- Parse the user's handoff reply with `npm run app-store:ingest-user-reply -- --input <reply-file> --acceptance-record <acceptance-file>`.");
console.log("- Dry-run decision/contact rewrites, then rerun with `--apply` only after the parsed values are correct.");
console.log("- Run screenshot, acceptance, external console, static page, privacy label, final gate, iOS release, and full repository checks.");
console.log("- Regenerate App Store Connect copy pack and Archive evidence once the user completes Xcode/App Store Connect actions.");
console.log("- Update `docs/app-store-release-readiness-plan-zh.md`, write evidence files, and commit the verified changes.");
console.log("");

console.log("## Current Gate Summary");
for (const report of reports) {
  const status = report.blocked ? "BLOCKED" : report.ok ? "PASS" : "WARN";
  console.log(`- ${status} ${report.name}: ${report.summary}`);
}
console.log("");

console.log("## Existing Inputs");
for (const path of [handoffPath, acceptancePath, externalConsolePath]) {
  console.log(`- ${existsSync(resolve(repoRoot, path)) ? "EXISTS" : "MISSING"} ${path}`);
}
console.log("");

console.log("## Operational Rule");
console.log("- Codex must not claim the release is ready while any user-owned item above is missing.");
console.log("- Codex should continue autonomously only on deterministic repo work: parsing, dry-run/apply rewrites, checks, evidence, and commits.");
console.log("- User must not manually edit generated release evidence except the explicit user-input files listed above.");
console.log("");

console.log("## JSON summary");
console.log(JSON.stringify({
  readyForCodexFinalStrictGates: !waitingOnUser,
  blockingAreas: blockers.map((report) => report.name),
  userOwnedInputFiles: {
    handoffPath,
    decisionFormPath,
    fieldMapPath,
    acceptancePath,
    externalConsolePath,
    screenshotDir
  },
  codexNextCommandsAfterUserInput: [
    "npm run app-store:ingest-user-reply -- --input <reply-file> --acceptance-record <acceptance-file>",
    "npm run app-store:ingest-user-reply -- --input <reply-file> --acceptance-record <acceptance-file> --apply",
    "npm run check:app-store-screenshots",
    `npm run check:app-store-acceptance -- ${acceptancePath}`,
    "npm run check:app-store-external-console",
    "npm run app-store:final-gate",
    "npm run check:app-store-final",
    "npm run check:release-ios",
    "npm run check"
  ]
}, null, 2));

function runReport(name, command) {
  const run = spawnSync(command[0], command.slice(1), {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env
  });

  const output = `${run.stdout || ""}${run.stderr || ""}`;
  const blocked = /NOT READY|FAIL /.test(output) || hasMissingFields(output);
  const ok = run.status === 0 && !blocked;

  return {
    name,
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
  const overallLine = lines.find((line) => line.startsWith("Overall status:"));
  if (overallLine) return overallLine;

  const readyLine = lines.find((line) => /readiness:|Production acceptance:|Static pages readiness:|External console readiness:|App Store submission readiness:/.test(line));
  if (readyLine) return readyLine;

  const totalFields = lines.find((line) => line.startsWith("totalFields="));
  const missingFields = lines.find((line) => line.startsWith("missingFields="));
  if (totalFields || missingFields) {
    return [totalFields, missingFields].filter(Boolean).join(", ");
  }

  const screenshotCount = lines.find((line) => line.startsWith("count="));
  if (screenshotCount) return screenshotCount;

  return status === 0 ? "command passed" : `command exited with ${status}`;
}

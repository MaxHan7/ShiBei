#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

const health = runReport("Production health", ["node", "tools/app-store-production-health-audit.mjs", "--report"]);
const opsDiagnostics = hasDatabaseUrl
  ? runReport("Production ops diagnostics", ["npm", "--prefix", "backend", "run", "app-store:ops-diagnostics"])
  : null;

const checks = [
  {
    area: "API / DB health",
    releaseGate: "REQUIRED",
    currentEvidence: "tools/app-store-production-health-audit.mjs",
    state: health.blocked ? "BLOCKED" : "READY",
    proof: health.summary,
    next: health.blocked ? "Fix production health before Archive." : "Keep running `npm run check:app-store-health` before Archive."
  },
  {
    area: "Queue failure / backlog visibility",
    releaseGate: "REQUIRED",
    currentEvidence: "health queue fields + backend ops diagnostics",
    state: health.output.includes("queueFailed=0") ? "READY" : "CHECK",
    proof: lineOrFallback(health.output, /^queue(?:Failed|Queued|Running)=.*$/gm, "queue fields reported by health audit"),
    next: hasDatabaseUrl
      ? "Use ops diagnostics for recent jobs and stale running jobs."
      : "Set DATABASE_URL in the local shell when deeper queue diagnostics are needed."
  },
  {
    area: "APNs production configuration",
    releaseGate: "REQUIRED",
    currentEvidence: "health APNs fields + real-device acceptance",
    state: health.output.includes("apnsConfigured=true") && health.output.includes("apnsEnvironment=production") ? "READY_PENDING_DEVICE_ACCEPTANCE" : "BLOCKED",
    proof: lineOrFallback(health.output, /^apns(?:Configured|Environment)=.*$/gm, "APNs fields reported by health audit"),
    next: "User must still verify background/lock-screen delivery in the acceptance record."
  },
  {
    area: "Recommended article catalog",
    releaseGate: "REQUIRED",
    currentEvidence: "health recommendedCatalog fields",
    state: health.output.includes("recommendedCatalogArticleCount=") ? "READY" : "CHECK",
    proof: lineOrFallback(health.output, /^recommendedCatalog(?:ArticleCount|Filters)=.*$/gm, "recommended catalog fields reported by health audit"),
    next: "If covers/filter regress, rerun health audit and compare deployment commit."
  },
  {
    area: "Failure-rate and APNs delivery diagnostics",
    releaseGate: "CONDITIONAL",
    currentEvidence: "backend/scripts/app-store-production-ops-diagnostics.mjs",
    state: hasDatabaseUrl ? (opsDiagnostics?.blocked ? "CHECK" : "READY") : "AVAILABLE_REQUIRES_DATABASE_URL",
    proof: hasDatabaseUrl ? opsDiagnostics.summary : "DATABASE_URL not present in this shell; script exists and is syntax-checked by npm run check.",
    next: "Run `npm run app-store:ops-diagnostics` when investigating generation failures or notification delivery issues."
  },
  {
    area: "Backup and restore",
    releaseGate: "USER/OPS_DECISION",
    currentEvidence: "docs/app-store-production-ops-runbook-zh.md section 8",
    state: "RUNBOOK_READY_DRILL_RECOMMENDED",
    proof: "Runbook defines backup check, App-layer restore, and database restore drill steps.",
    next: "Before broader release, record one non-production restore drill evidence file."
  },
  {
    area: "Automated dashboards / external alerting",
    releaseGate: "POST_FIRST_RELEASE_ENHANCEMENT",
    currentEvidence: "Runbook thresholds + health gate + ops diagnostics",
    state: "MINIMAL_GATE_READY_FULL_ALERTING_DEFERRED",
    proof: "Current App Store gate uses deterministic checks; full dashboard/alert integrations are not required for the first controlled release.",
    next: "After first controlled release, add external alerts for health failure, stale queue, generation failure spike, APNs errors, and worker restarts."
  }
];

console.log("# Recallo App Store Ops Readiness Report");
console.log(`repoRoot=${repoRoot}`);
console.log(`generatedAt=${new Date().toISOString()}`);
console.log("");
console.log("## Summary");
console.log(`productionHealth=${health.blocked ? "NOT_READY" : "READY"}`);
console.log(`databaseDiagnostics=${hasDatabaseUrl ? "AVAILABLE_AND_RAN" : "NOT_AVAILABLE_IN_THIS_SHELL"}`);
console.log("");
console.log("## Gate Matrix");
console.log("| Area | Release gate | State | Evidence | Next action |");
console.log("| --- | --- | --- | --- | --- |");
for (const check of checks) {
  console.log(`| ${cell(check.area)} | ${cell(check.releaseGate)} | ${cell(check.state)} | ${cell(check.proof)} | ${cell(check.next)} |`);
}
console.log("");
console.log("## Current Health Snapshot");
console.log("```text");
console.log(trimForBlock(health.output, 1200));
console.log("```");

if (opsDiagnostics) {
  console.log("");
  console.log("## Current Ops Diagnostics Snapshot");
  console.log("```text");
  console.log(trimForBlock(opsDiagnostics.output, 1600));
  console.log("```");
} else {
  console.log("");
  console.log("## Ops Diagnostics Snapshot");
  console.log("`DATABASE_URL` is not set in this shell, so deep queue/APNs/quota diagnostics were not run. This is acceptable for the automated App Store report; run `npm run app-store:ops-diagnostics` from an environment with production database access when investigating incidents.");
}

console.log("");
console.log("## Existing Evidence Files");
for (const path of [
  "docs/app-store-production-ops-runbook-zh.md",
  "docs/app-store-release-evidence/2026-07-03-production-health-audit.md",
  "docs/app-store-release-evidence/2026-07-03-production-ops-runbook.md"
]) {
  console.log(`- ${existsSync(resolve(repoRoot, path)) ? "EXISTS" : "MISSING"} ${path}`);
}

function runReport(name, command) {
  const run = spawnSync(command[0], command.slice(1), {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env
  });
  const output = `${run.stdout || ""}${run.stderr || ""}`;
  const blocked = /NOT READY|FAIL /.test(output);
  return {
    name,
    blocked,
    output,
    summary: summarize(output, run.status)
  };
}

function summarize(output, status) {
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const readiness = lines.find((line) => /Production health:|Production ops diagnostics:/.test(line));
  return readiness || (status === 0 ? "command passed" : `command exited with ${status}`);
}

function lineOrFallback(output, pattern, fallback) {
  const matches = output.match(pattern);
  return matches && matches.length > 0 ? matches.join("; ") : fallback;
}

function trimForBlock(text, maxLength) {
  const trimmed = String(text || "").trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}\n... [truncated]`;
}

function cell(value) {
  return String(value || "")
    .replace(/\|/g, "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

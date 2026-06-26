#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = parseArgs(process.argv.slice(2));
const baseUrl = args["base-url"] || "https://shibei-production.up.railway.app";
const shouldRunSmoke = args.smoke === "1";
const bundleId = args["bundle-id"] || "com.maxhan.shibei";
const isProduction = args.production === "1" || new URL(baseUrl).hostname === "shibei-production.up.railway.app";
const requiredCapabilities = [
  "v2ChapterGeneration",
  "v2ReviewSessions",
  "favoriteQuestions",
  "notifications",
  "sourceAnchors"
];

const checks = [];
let health = null;
let smokeResult = { status: "skipped", detail: shouldRunSmoke ? "waiting_for_readiness_gate" : "not_requested" };

try {
  health = await fetchJson(`${baseUrl}/api/health`, 8_000);
  checks.push(check("backend_health", health?.ok === true, `GET ${baseUrl}/api/health`));
  checks.push(check("database_health", health?.database?.ok === true, "health.database.ok must be true"));
  checks.push(check("queue_visible", Boolean(health?.queue), "health.queue must be present"));
  for (const capability of requiredCapabilities) {
    checks.push(check(
      `capability_${capability}`,
      health?.capabilities?.[capability] === true,
      `health.capabilities.${capability} must be true`
    ));
  }
  if (isProduction) {
    checks.push(check("apns_configured", health?.apns?.configured === true, "health.apns.configured must be true"));
    checks.push(check("apns_production", health?.apns?.environment === "production", "health.apns.environment must be production"));
    checks.push(check("apns_bundle_id", health?.apns?.bundleId === bundleId, `health.apns.bundleId must be ${bundleId}`));
  }
} catch (error) {
  checks.push(check("backend_health", false, `${baseUrl}/api/health failed: ${error.message}`));
}

printReport({ baseUrl, health, checks, shouldRunSmoke, isProduction });

const failed = checks.filter((item) => !item.ok);
if (failed.length > 0) {
  writeEvidence({ baseUrl, health, checks, shouldRunSmoke, isProduction, smokeResult });
  console.error("");
  console.error(`Production readiness gate failed: ${failed.map((item) => item.name).join(", ")}`);
  if (failed.some((item) => item.name.startsWith("capability_"))) {
    console.error("Deploy the current root backend before running phone E2E or production smoke.");
  }
  process.exit(1);
}

if (shouldRunSmoke) {
  const exitCode = await runSmoke({ baseUrl });
  smokeResult = exitCode === 0
    ? { status: "passed", detail: "controlled_v2_queue_smoke_passed" }
    : { status: "failed", detail: `controlled_v2_queue_smoke_exit_${exitCode}` };
  writeEvidence({ baseUrl, health, checks, shouldRunSmoke, isProduction, smokeResult });
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
} else {
  writeEvidence({ baseUrl, health, checks, shouldRunSmoke, isProduction, smokeResult });
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "1";
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function check(name, ok, detail) {
  return { name, ok: Boolean(ok), detail };
}

function printReport({ baseUrl, health, checks, shouldRunSmoke, isProduction }) {
  console.log("# Shibei V2 Production Readiness Gate");
  console.log(`baseUrl=${baseUrl}`);
  console.log(`productionMode=${isProduction ? "true" : "false"}`);
  console.log(`smoke=${shouldRunSmoke ? "enabled" : "disabled"}`);
  if (health?.queue) {
    console.log(`queue=queued:${health.queue.queued ?? "?"} running:${health.queue.running ?? "?"} failed:${health.queue.failed ?? "?"} completed:${health.queue.completed ?? "?"}`);
  }
  console.log("");
  for (const item of checks) {
    console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name} - ${item.detail}`);
  }
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function runSmoke({ baseUrl }) {
  const scriptRoot = dirname(fileURLToPath(import.meta.url));
  const smokeScript = resolve(scriptRoot, "smoke-v2-queue.mjs");
  const deviceId = args["device-id"] || `smoke-v2-readiness-${Date.now()}`;
  const sourceTitle = args["source-title"] || "V2 production readiness smoke";
  const rawText = args["raw-text"] || [
    "游戏化不是简单地给产品加积分、徽章或排行榜。",
    "更重要的是理解用户动机、行为目标和反馈机制之间的关系。",
    "DMC 模型可以帮助设计者把动机、机制和组件拆开分析。"
  ].join("\n");
  const smokeArgs = [
    smokeScript,
    "--base-url",
    baseUrl,
    "--device-id",
    deviceId,
    "--source-title",
    sourceTitle,
    "--raw-text",
    rawText
  ];

  console.log("");
  console.log("# Running V2 queue smoke");
  console.log(`deviceId=${deviceId}`);

  const exitCode = await new Promise((resolvePromise) => {
    const child = spawn(process.execPath, smokeArgs, { stdio: "inherit" });
    child.on("exit", (code) => resolvePromise(code ?? 1));
    child.on("error", () => resolvePromise(1));
  });

  return exitCode;
}

function writeEvidence({ baseUrl, health, checks, shouldRunSmoke, isProduction, smokeResult }) {
  const evidence = buildEvidence({ baseUrl, health, checks, shouldRunSmoke, isProduction, smokeResult });
  if (args["json-out"]) {
    writeTextFile(args["json-out"], `${JSON.stringify(evidence, null, 2)}\n`);
  }
  if (args["markdown-out"]) {
    writeTextFile(args["markdown-out"], renderMarkdownEvidence(evidence));
  }
}

function buildEvidence({ baseUrl, health, checks, shouldRunSmoke, isProduction, smokeResult }) {
  const failed = checks.filter((item) => !item.ok).map((item) => item.name);
  return {
    generatedAt: new Date().toISOString(),
    gitSha: process.env.GITHUB_SHA || readGitSha(),
    baseUrl,
    productionMode: isProduction,
    smokeRequested: shouldRunSmoke,
    status: failed.length === 0 && smokeResult.status !== "failed" ? "passed" : "failed",
    failedChecks: failed,
    queue: health?.queue
      ? {
          queued: health.queue.queued ?? null,
          running: health.queue.running ?? null,
          failed: health.queue.failed ?? null,
          completed: health.queue.completed ?? null
        }
      : null,
    capabilities: health?.capabilities ?? null,
    apns: health?.apns
      ? {
          configured: health.apns.configured ?? null,
          environment: health.apns.environment ?? null,
          bundleId: health.apns.bundleId ?? null
        }
      : null,
    database: health?.database
      ? {
          ok: health.database.ok ?? null
        }
      : null,
    smoke: smokeResult,
    checks
  };
}

function renderMarkdownEvidence(evidence) {
  const lines = [
    "# Shibei V2 Production Readiness Evidence",
    "",
    `- Generated at: \`${evidence.generatedAt}\``,
    `- Base URL: \`${evidence.baseUrl}\``,
    `- Production mode: \`${evidence.productionMode}\``,
    `- Overall status: \`${evidence.status}\``,
    `- Smoke: \`${evidence.smoke.status}\` (${evidence.smoke.detail})`,
    ""
  ];
  if (evidence.queue) {
    lines.push(`- Queue: queued ${evidence.queue.queued}, running ${evidence.queue.running}, failed ${evidence.queue.failed}, completed ${evidence.queue.completed}`);
    lines.push("");
  }
  lines.push("## Checks", "");
  for (const item of evidence.checks) {
    lines.push(`- ${item.ok ? "PASS" : "FAIL"} \`${item.name}\` - ${item.detail}`);
  }
  if (evidence.failedChecks.length > 0) {
    lines.push("", "## Failed Checks", "");
    for (const name of evidence.failedChecks) {
      lines.push(`- \`${name}\``);
    }
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function writeTextFile(path, text) {
  const outputPath = resolve(path);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, text);
  console.log(`evidence=${outputPath}`);
}

function readGitSha() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: resolve(dirname(fileURLToPath(import.meta.url)), "../.."),
    encoding: "utf8"
  });
  if (result.status !== 0) return null;
  return result.stdout.trim() || null;
}

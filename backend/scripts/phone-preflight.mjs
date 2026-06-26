#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = parseArgs(process.argv.slice(2));
const backendRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const envPath = resolve(backendRoot, ".env");
const lanIp = args.ip || findLanIp() || "127.0.0.1";
const port = args.port || "5273";
const baseUrl = args["base-url"] || `http://${lanIp}:${port}`;
const bundleId = args["bundle-id"] || "com.maxhan.shibei";
const deviceId = args["device-id"] || "<device-id>";
const shouldCheckLocalEnv = args["require-local-env"] === "1" || isLocalBaseUrl(baseUrl);

const checks = [];

const envKeys = readEnvKeys(envPath);
if (shouldCheckLocalEnv) {
  checks.push(check(
    "local_env_file",
    envKeys.exists,
    envKeys.exists
      ? `${envPath} exists; keys=${envKeys.keys.join(",") || "(none)"}`
      : `${envPath} is missing`
  ));
  checks.push(check(
    "deepseek_key_configured",
    envKeys.keys.includes("DEEPSEEK_API_KEY") || Boolean(process.env.DEEPSEEK_API_KEY),
    "DEEPSEEK_API_KEY must be available to the worker"
  ));
  checks.push(check(
    "database_url_configured",
    envKeys.keys.includes("DATABASE_URL") || Boolean(process.env.DATABASE_URL),
    "DATABASE_URL must be available for persisted queue testing"
  ));
}

let health = null;
try {
  health = await fetchJson(`${baseUrl}/api/health`, 5_000);
  checks.push(check("backend_health", health?.ok === true, `GET ${baseUrl}/api/health`));
  checks.push(check("database_health", health?.database?.ok === true, "health.database.ok must be true"));
  checks.push(check("queue_visible", Boolean(health?.queue), "health.queue must be present"));
} catch (error) {
  checks.push(check("backend_health", false, `${baseUrl}/api/health failed: ${error.message}`));
}

const failed = checks.filter((item) => !item.ok);

console.log("# Shibei V2 Phone Preflight");
console.log(`baseUrl=${baseUrl}`);
console.log(`lanIp=${lanIp}`);
console.log(`bundleId=${bundleId}`);
if (health?.queue) {
  console.log(`queue=queued:${health.queue.queued ?? "?"} running:${health.queue.running ?? "?"} failed:${health.queue.failed ?? "?"} completed:${health.queue.completed ?? "?"}`);
}
console.log("");
for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name} - ${item.detail}`);
}
console.log("");
console.log("Launch command:");
console.log([
  "xcrun devicectl device process launch",
  `--device ${deviceId}`,
  "--terminate-existing",
  bundleId,
  "-ShibeiV2APIBaseURL",
  baseUrl
].join(" "));

if (failed.length > 0) {
  console.error("");
  console.error(`Preflight failed: ${failed.map((item) => item.name).join(", ")}`);
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) parsed[key] = "1";
    else {
      parsed[key] = value;
      index += 1;
    }
  }
  return parsed;
}

function readEnvKeys(path) {
  try {
    const keys = readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => line.split("=", 1)[0])
      .filter(Boolean);
    return { exists: true, keys };
  } catch {
    return { exists: false, keys: [] };
  }
}

function findLanIp() {
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }
  return "";
}

function isLocalBaseUrl(value) {
  try {
    const host = new URL(value).hostname;
    return host === "localhost"
      || host === "127.0.0.1"
      || host.startsWith("10.")
      || host.startsWith("192.168.")
      || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
  } catch {
    return true;
  }
}

function check(name, ok, detail) {
  return { name, ok: Boolean(ok), detail };
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 160)}`);
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

#!/usr/bin/env node

const reportMode = process.argv.includes("--report");
const urlArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const healthUrl = urlArg || "https://shibei-production.up.railway.app/api/health";
const requiredCapabilities = [
  "v2ChapterGeneration",
  "v2ReviewSessions",
  "favoriteQuestions",
  "notifications",
  "sourceAnchors"
];

console.log("# Recallo App Store Production Health Audit");
console.log(`mode=${reportMode ? "report" : "strict"}`);
console.log(`url=${healthUrl}`);

let response;
let payload;
const issues = [];

try {
  response = await fetchWithTimeout(healthUrl, 12000);
} catch (error) {
  issues.push(`health request failed: ${error.message}`);
}

if (response) {
  console.log(`httpStatus=${response.status}`);
  console.log(`contentType=${response.headers.get("content-type") || "(missing)"}`);
  if (response.status !== 200) {
    issues.push(`expected HTTP 200, got ${response.status}`);
  }

  try {
    payload = await response.json();
  } catch (error) {
    issues.push(`health response is not valid JSON: ${error.message}`);
  }
}

if (payload) {
  const version = payload.version ?? {};
  const railway = version.railway ?? {};
  const catalog = version.recommendedCatalog ?? {};
  const queue = payload.queue ?? {};
  const apns = payload.apns ?? {};
  const capabilities = payload.capabilities ?? {};

  console.log(`ok=${payload.ok === true}`);
  console.log(`service=${payload.service || "(missing)"}`);
  console.log(`nodeEnv=${version.nodeEnv || "(missing)"}`);
  console.log(`railwayEnvironment=${railway.environment || "(missing)"}`);
  console.log(`railwayDeploymentId=${railway.deploymentId || "(missing)"}`);
  console.log(`storage=${payload.storage || "(missing)"}`);
  console.log(`databaseOk=${payload.database?.ok === true}`);
  console.log(`queueQueued=${numberOrMissing(queue.queued)}`);
  console.log(`queueRunning=${numberOrMissing(queue.running)}`);
  console.log(`queueFailed=${numberOrMissing(queue.failed)}`);
  console.log(`apnsConfigured=${apns.configured === true}`);
  console.log(`apnsEnvironment=${apns.environment || "(missing)"}`);
  console.log(`recommendedCatalogArticleCount=${numberOrMissing(catalog.articleCount)}`);
  console.log(`recommendedCatalogFilters=${Array.isArray(catalog.filters) ? catalog.filters.join(",") : "(missing)"}`);

  if (payload.ok !== true) issues.push("payload.ok must be true");
  if (payload.service !== "recallo-api") issues.push(`service must be recallo-api, got ${display(payload.service)}`);
  if (version.nodeEnv !== "production") issues.push(`nodeEnv must be production, got ${display(version.nodeEnv)}`);
  if (railway.environment !== "production") {
    issues.push(`railway.environment must be production, got ${display(railway.environment)}`);
  }
  if (!isFilled(railway.deploymentId)) issues.push("railway.deploymentId is missing");
  if (payload.storage !== "postgres") issues.push(`storage must be postgres, got ${display(payload.storage)}`);
  if (payload.database?.ok !== true) issues.push("database.ok must be true");
  if (!isNonNegativeNumber(queue.queued)) issues.push("queue.queued must be a non-negative number");
  if (!isNonNegativeNumber(queue.running)) issues.push("queue.running must be a non-negative number");
  if (!isNonNegativeNumber(queue.failed)) issues.push("queue.failed must be a non-negative number");
  if (queue.failed > 0) issues.push(`queue.failed should be 0 before submission, got ${queue.failed}`);
  if (apns.configured !== true) issues.push("APNs must be configured");
  if (apns.environment !== "production") issues.push(`APNs environment must be production, got ${display(apns.environment)}`);
  if (catalog.articleCount < 6) issues.push(`recommended catalog should contain at least 6 articles, got ${display(catalog.articleCount)}`);
  if (!Array.isArray(catalog.filters) || catalog.filters.length < 3 || catalog.filters.length > 6) {
    issues.push("recommended catalog filters should be a curated list of 3-6 filters");
  }

  for (const capability of requiredCapabilities) {
    if (capabilities[capability] !== true) {
      issues.push(`capability ${capability} must be true`);
    }
  }
}

console.log("");
if (issues.length > 0) {
  console.log(`Production health: NOT READY (${issues.length} issue${issues.length === 1 ? "" : "s"})`);
  for (const issue of issues) {
    console.log(`- ${issue}`);
  }
  if (!reportMode) process.exit(1);
} else {
  console.log("Production health: READY");
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function isFilled(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function numberOrMissing(value) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "(missing)";
}

function display(value) {
  if (value === undefined || value === null || value === "") return "(missing)";
  return String(value);
}

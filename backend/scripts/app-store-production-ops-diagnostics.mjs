#!/usr/bin/env node

import pg from "pg";

const { Pool } = pg;

const args = parseArgs(process.argv.slice(2));
const reportMode = args.report || !args.strict;
const strictMode = args.strict === true;
const hours = readPositiveInt(args.hours, 24);
const staleRunningMinutes = readPositiveInt(args["stale-running-minutes"], 15);
const failedJobLimit = readNonNegativeInt(args["failed-job-limit"], 0);
const apnsFailureLimit = readNonNegativeInt(args["apns-failure-limit"], 0);
const connectionString = process.env.DATABASE_URL || "";

console.log("# Recallo App Store Production Ops Diagnostics");
console.log(`mode=${strictMode ? "strict" : "report"}`);
console.log(`windowHours=${hours}`);
console.log(`staleRunningMinutes=${staleRunningMinutes}`);

const issues = [];

if (!connectionString) {
  issues.push("DATABASE_URL is required for production ops diagnostics.");
  finish();
}

const pool = new Pool({
  connectionString,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined
});

try {
  await pool.query("SELECT 1");

  const [queue, recentJobs, failedChapters, apns, quota] = await Promise.all([
    queueSummary(),
    recentGenerationJobs(),
    recentFailedChapters(),
    apnsDeliverySummary(),
    quotaUsageSummary()
  ]);

  renderQueue(queue);
  renderRecentJobs(recentJobs);
  renderFailedChapters(failedChapters);
  renderApns(apns);
  renderQuota(quota);

  const failedJobs = queue.byStatus.failed || 0;
  if (failedJobs > failedJobLimit) {
    issues.push(`generation_jobs queue_status=failed is ${failedJobs}, limit is ${failedJobLimit}`);
  }
  if (queue.staleRunning > 0) {
    issues.push(`generation_jobs has ${queue.staleRunning} running job(s) older than ${staleRunningMinutes} minutes`);
  }
  if (apns.failed > apnsFailureLimit) {
    issues.push(`recent APNs failed deliveries are ${apns.failed}, limit is ${apnsFailureLimit}`);
  }
} catch (error) {
  issues.push(`diagnostics query failed: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  await pool.end().catch(() => {});
}

finish();

async function queueSummary() {
  const statusResult = await pool.query(
    `SELECT queue_status, COUNT(*)::int AS count
       FROM generation_jobs
      WHERE deleted_at IS NULL
      GROUP BY queue_status
      ORDER BY queue_status`
  );
  const staleResult = await pool.query(
    `SELECT COUNT(*)::int AS count
       FROM generation_jobs
      WHERE deleted_at IS NULL
        AND queue_status = 'running'
        AND updated_at < NOW() - ($1::text)::interval`,
    [`${staleRunningMinutes} minutes`]
  );
  const byStatus = {};
  for (const row of statusResult.rows) byStatus[row.queue_status] = row.count;
  return {
    byStatus,
    staleRunning: staleResult.rows[0]?.count || 0
  };
}

async function recentGenerationJobs() {
  const result = await pool.query(
    `SELECT id,
            chapter_id,
            status,
            current_stage,
            queue_status,
            attempt_count,
            max_attempts,
            updated_at,
            finished_at,
            last_error,
            error_message
       FROM generation_jobs
      WHERE deleted_at IS NULL
        AND updated_at >= NOW() - ($1::text)::interval
      ORDER BY updated_at DESC
      LIMIT 20`,
    [`${hours} hours`]
  );
  return result.rows;
}

async function recentFailedChapters() {
  const result = await pool.query(
    `SELECT status,
            chapter_json #>> '{generationMeta,failedStage}' AS failed_stage,
            chapter_json #>> '{generationMeta,failureReason}' AS failure_reason,
            COUNT(*)::int AS count
       FROM chapters
      WHERE deleted_at IS NULL
        AND updated_at >= NOW() - ($1::text)::interval
        AND (
          status LIKE 'failed%'
          OR COALESCE(chapter_json->>'status', '') LIKE 'failed%'
          OR COALESCE(chapter_json #>> '{generationMeta,failedStage}', '') <> ''
        )
      GROUP BY status, failed_stage, failure_reason
      ORDER BY count DESC, status ASC
      LIMIT 12`,
    [`${hours} hours`]
  );
  return result.rows;
}

async function apnsDeliverySummary() {
  const result = await pool.query(
    `SELECT COALESCE(notification_json->>'pushDeliveryStatus', '') AS delivery_status,
            COALESCE(notification_json->>'pushDeliveryError', '') AS delivery_error,
            COUNT(*)::int AS count
       FROM notifications
      WHERE deleted_at IS NULL
        AND updated_at >= NOW() - ($1::text)::interval
      GROUP BY delivery_status, delivery_error
      ORDER BY count DESC, delivery_status ASC
      LIMIT 20`,
    [`${hours} hours`]
  );
  const rows = result.rows;
  const failed = rows
    .filter((row) => row.delivery_status && !["sent", "no_tokens", "apns_not_configured"].includes(row.delivery_status))
    .reduce((sum, row) => sum + row.count, 0);
  return { rows, failed };
}

async function quotaUsageSummary() {
  const result = await pool.query(
    `SELECT quota_day::text AS quota_day,
            COUNT(*)::int AS count,
            COUNT(DISTINCT device_id)::int AS devices
       FROM generation_quota_claims
      WHERE created_at >= NOW() - ($1::text)::interval
      GROUP BY quota_day
      ORDER BY quota_day DESC
      LIMIT 7`,
    [`${Math.max(hours, 24 * 7)} hours`]
  );
  return result.rows;
}

function renderQueue(queue) {
  console.log("\n## Queue");
  for (const status of ["queued", "running", "completed", "failed", "cancelled"]) {
    console.log(`- ${status}: ${queue.byStatus[status] || 0}`);
  }
  console.log(`- stale running > ${staleRunningMinutes}m: ${queue.staleRunning}`);
}

function renderRecentJobs(rows) {
  console.log("\n## Recent Generation Jobs");
  if (rows.length === 0) {
    console.log("- No generation jobs in the selected window.");
    return;
  }
  console.log("| updated | job | chapter | queue | status | stage | attempts | error |");
  console.log("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const row of rows) {
    const error = sanitize(row.last_error || row.error_message || "");
    console.log(`| ${iso(row.updated_at)} | ${suffix(row.id)} | ${suffix(row.chapter_id)} | ${cell(row.queue_status)} | ${cell(row.status)} | ${cell(row.current_stage)} | ${row.attempt_count}/${row.max_attempts} | ${cell(error)} |`);
  }
}

function renderFailedChapters(rows) {
  console.log("\n## Recent Failed Chapters");
  if (rows.length === 0) {
    console.log("- No failed chapters in the selected window.");
    return;
  }
  console.log("| count | status | failed stage | failure reason |");
  console.log("| --- | --- | --- | --- |");
  for (const row of rows) {
    console.log(`| ${row.count} | ${cell(row.status)} | ${cell(row.failed_stage)} | ${cell(sanitize(row.failure_reason || ""))} |`);
  }
}

function renderApns(apns) {
  console.log("\n## APNs Delivery");
  if (apns.rows.length === 0) {
    console.log("- No notifications in the selected window.");
    return;
  }
  console.log("| count | delivery status | delivery error |");
  console.log("| --- | --- | --- |");
  for (const row of apns.rows) {
    console.log(`| ${row.count} | ${cell(row.delivery_status || "(empty)")} | ${cell(sanitize(row.delivery_error || ""))} |`);
  }
  console.log(`\nAPNs failed deliveries counted for strict mode: ${apns.failed}`);
}

function renderQuota(rows) {
  console.log("\n## Quota Claims");
  if (rows.length === 0) {
    console.log("- No quota claims in the selected window.");
    return;
  }
  console.log("| quota day | claims | devices |");
  console.log("| --- | --- | --- |");
  for (const row of rows) {
    console.log(`| ${cell(row.quota_day)} | ${row.count} | ${row.devices} |`);
  }
}

function finish() {
  console.log("");
  if (issues.length > 0) {
    console.log(`Production ops diagnostics: NOT READY (${issues.length} issue${issues.length === 1 ? "" : "s"})`);
    for (const issue of issues) console.log(`- ${issue}`);
    if (strictMode) process.exit(1);
  } else {
    console.log("Production ops diagnostics: READY");
  }
  process.exit(0);
}

function sanitize(value) {
  return String(value || "")
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted-api-key]")
    .replace(/[A-Fa-f0-9]{64,}/g, "[redacted-token]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function suffix(value) {
  const text = String(value || "");
  if (!text) return "";
  return text.length <= 12 ? text : `...${text.slice(-12)}`;
}

function iso(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function cell(value) {
  const text = String(value ?? "").replace(/\|/g, "\\|").trim();
  return text || "";
}

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "strict" || key === "report") {
      parsed[key] = true;
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

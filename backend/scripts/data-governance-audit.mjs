import "../src/env.js";
import pg from "pg";
import { initDatabase, listDeletedChapters } from "../src/db.js";

const { Pool } = pg;

const args = parseArgs(process.argv.slice(2));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const deviceId = args["device-id"] || args.device || "";
if (!deviceId) {
  console.error("Usage: node scripts/data-governance-audit.mjs --device-id <device-id>");
  process.exit(1);
}

await initDatabase();

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined
});

try {
  const counts = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM chapters WHERE device_id = $1 AND deleted_at IS NULL) AS active_chapters,
       (SELECT COUNT(*)::int FROM chapters WHERE device_id = $1 AND deleted_at IS NOT NULL) AS deleted_chapters,
       (SELECT COUNT(*)::int FROM favorite_questions WHERE device_id = $1 AND deleted_at IS NULL) AS active_favorites,
       (SELECT COUNT(*)::int FROM favorite_questions WHERE device_id = $1 AND deleted_at IS NOT NULL) AS deleted_favorites,
       (SELECT COUNT(*)::int FROM notifications WHERE device_id = $1 AND deleted_at IS NULL) AS active_notifications,
       (SELECT COUNT(*)::int FROM notifications WHERE device_id = $1 AND deleted_at IS NOT NULL) AS deleted_notifications,
       (SELECT COUNT(*)::int FROM generation_jobs WHERE device_id = $1 AND deleted_at IS NULL) AS active_generation_jobs,
       (SELECT COUNT(*)::int FROM generation_jobs WHERE device_id = $1 AND deleted_at IS NOT NULL) AS deleted_generation_jobs,
       (SELECT COUNT(*)::int FROM audit_events WHERE device_id = $1) AS audit_events`,
    [deviceId]
  );

  const deletedChapters = await listDeletedChapters(deviceId, { limit: Number(args.limit || 20) });
  const auditEvents = await pool.query(
    `SELECT action, entity_type, entity_id, metadata_json, created_at
       FROM audit_events
      WHERE device_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [deviceId, Number(args.limit || 20)]
  );

  console.log(JSON.stringify({
    deviceId,
    counts: counts.rows[0],
    deletedChapters: deletedChapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      status: chapter.status,
      deletedAt: chapter.deletedAt,
      deletedReason: chapter.deletedReason
    })),
    recentAuditEvents: auditEvents.rows.map((event) => ({
      action: event.action,
      entityType: event.entity_type,
      entityId: event.entity_id,
      metadata: event.metadata_json,
      createdAt: event.created_at?.toISOString?.() || String(event.created_at || "")
    }))
  }, null, 2));
} finally {
  await pool.end();
}

process.exit(0);

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

#!/usr/bin/env node
import pg from "pg";

const { Pool } = pg;

const reveal = process.argv.includes("--reveal");
const targetSuffix = readArg("--suffix");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined
});

try {
  const result = await pool.query(`
    SELECT
      d.id AS device_id,
      d.created_at AS device_created_at,
      d.last_seen_at AS device_last_seen_at,
      COUNT(c.id)::int AS chapter_count,
      COUNT(n.id)::int AS notification_count,
      COUNT(f.id)::int AS favorite_count,
      MAX(c.updated_at) AS latest_chapter_at
    FROM devices d
    LEFT JOIN chapters c ON c.device_id = d.id
    LEFT JOIN notifications n ON n.device_id = d.id
    LEFT JOIN favorite_questions f ON f.device_id = d.id
    GROUP BY d.id, d.created_at, d.last_seen_at
    ORDER BY MAX(c.updated_at) DESC NULLS LAST, d.last_seen_at DESC
  `);

  const rows = targetSuffix
    ? result.rows.filter((row) => String(row.device_id).endsWith(targetSuffix))
    : result.rows;

  for (const row of rows) {
    const chapters = await pool.query(
      `SELECT id, title, status, created_at, updated_at
         FROM chapters
        WHERE device_id = $1
        ORDER BY updated_at DESC
        LIMIT 5`,
      [row.device_id]
    );
    console.log(JSON.stringify({
      deviceId: reveal ? row.device_id : maskDeviceId(row.device_id),
      deviceIdSuffix: String(row.device_id).slice(-6),
      deviceCreatedAt: row.device_created_at,
      deviceLastSeenAt: row.device_last_seen_at,
      chapterCount: row.chapter_count,
      notificationCount: row.notification_count,
      favoriteCount: row.favorite_count,
      latestChapterAt: row.latest_chapter_at,
      recentChapters: chapters.rows.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        status: chapter.status,
        createdAt: chapter.created_at,
        updatedAt: chapter.updated_at
      }))
    }, null, 2));
  }
} finally {
  await pool.end();
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function maskDeviceId(value) {
  const string = String(value || "");
  if (string.length <= 10) return `***${string.slice(-6)}`;
  return `${string.slice(0, 4)}…${string.slice(-6)}`;
}

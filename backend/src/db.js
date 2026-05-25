import pg from "pg";

const { Pool } = pg;

const PROCESSING_STATUSES = [
  "submitted",
  "extracting_content",
  "generating_points",
  "generating_questions",
  "quality_checking",
  "auto_regenerating_questions"
];

const INTERRUPTED_STATUS = "failed_questions";
const INTERRUPTED_TEXT = "生成中断，请重新生成";
const INTERRUPTED_REASON = "云端服务在生成过程中重启，任务已中断，请点击重新生成。";

const connectionString = process.env.DATABASE_URL || "";

export const hasDatabase = Boolean(connectionString);

const pool = hasDatabase
  ? new Pool({
      connectionString,
      ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined
    })
  : null;

export async function initDatabase() {
  if (!pool) return { ok: false, storage: "memory" };

  await pool.query(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      chapter_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS chapters_device_created_idx
      ON chapters(device_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      chapter_id TEXT NOT NULL,
      notification_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS notifications_device_created_idx
      ON notifications(device_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS generation_jobs (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      chapter_id TEXT NOT NULL,
      status TEXT NOT NULL,
      current_stage TEXT NOT NULL,
      error_message TEXT NOT NULL DEFAULT '',
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS generation_jobs_device_chapter_idx
      ON generation_jobs(device_id, chapter_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS device_push_tokens (
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'ios',
      environment TEXT NOT NULL DEFAULT 'production',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (device_id, token)
    );

    CREATE INDEX IF NOT EXISTS device_push_tokens_device_idx
      ON device_push_tokens(device_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS favorite_questions (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      chapter_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      favorite_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (device_id, chapter_id, question_id)
    );

    CREATE INDEX IF NOT EXISTS favorite_questions_device_created_idx
      ON favorite_questions(device_id, created_at DESC);
  `);

  await markInterruptedGenerationJobs();
  return { ok: true, storage: "postgres" };
}

export async function checkDatabase() {
  if (!pool) return { ok: false };
  try {
    await pool.query("SELECT 1");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "database unavailable" };
  }
}

export async function chapterCount() {
  if (!pool) return 0;
  const result = await pool.query("SELECT COUNT(*)::int AS count FROM chapters");
  return result.rows[0]?.count || 0;
}

export async function ensureDevice(deviceId) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO devices (id)
     VALUES ($1)
     ON CONFLICT (id)
     DO UPDATE SET last_seen_at = NOW()`,
    [deviceId]
  );
}

export async function listChapters(deviceId) {
  await ensureDevice(deviceId);
  const result = await pool.query(
    `SELECT chapter_json
       FROM chapters
      WHERE device_id = $1
      ORDER BY created_at DESC`,
    [deviceId]
  );
  return result.rows.map((row) => row.chapter_json);
}

export async function getChapter(deviceId, chapterId) {
  await ensureDevice(deviceId);
  const result = await pool.query(
    `SELECT chapter_json
       FROM chapters
      WHERE device_id = $1 AND id = $2`,
    [deviceId, chapterId]
  );
  return result.rows[0]?.chapter_json || null;
}

export async function upsertChapter(deviceId, chapter) {
  await ensureDevice(deviceId);
  await pool.query(
    `INSERT INTO chapters (id, device_id, status, title, chapter_json, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
     ON CONFLICT (id)
     DO UPDATE SET
       status = EXCLUDED.status,
       title = EXCLUDED.title,
       chapter_json = EXCLUDED.chapter_json,
       updated_at = EXCLUDED.updated_at`,
    [
      chapter.id,
      deviceId,
      chapter.status || "completed",
      chapter.title || "未命名章节",
      JSON.stringify(chapter),
      chapter.createdAt || new Date().toISOString(),
      chapter.updatedAt || new Date().toISOString()
    ]
  );
  return getChapter(deviceId, chapter.id);
}

export async function deleteChapter(deviceId, chapterId) {
  await ensureDevice(deviceId);
  await pool.query("DELETE FROM favorite_questions WHERE device_id = $1 AND chapter_id = $2", [deviceId, chapterId]);
  await pool.query("DELETE FROM notifications WHERE device_id = $1 AND chapter_id = $2", [deviceId, chapterId]);
  await pool.query("DELETE FROM generation_jobs WHERE device_id = $1 AND chapter_id = $2", [deviceId, chapterId]);
  const result = await pool.query("DELETE FROM chapters WHERE device_id = $1 AND id = $2", [deviceId, chapterId]);
  return result.rowCount > 0;
}

export async function deleteDeviceData(deviceId) {
  await ensureDevice(deviceId);
  await pool.query("DELETE FROM device_push_tokens WHERE device_id = $1", [deviceId]);
  const favorites = await pool.query("DELETE FROM favorite_questions WHERE device_id = $1", [deviceId]);
  const notifications = await pool.query("DELETE FROM notifications WHERE device_id = $1", [deviceId]);
  const generationJobs = await pool.query("DELETE FROM generation_jobs WHERE device_id = $1", [deviceId]);
  const chapters = await pool.query("DELETE FROM chapters WHERE device_id = $1", [deviceId]);
  return {
    chapters: chapters.rowCount || 0,
    notifications: notifications.rowCount || 0,
    generationJobs: generationJobs.rowCount || 0,
    favorites: favorites.rowCount || 0
  };
}

export async function listFavoriteQuestions(deviceId) {
  await ensureDevice(deviceId);
  const result = await pool.query(
    `SELECT favorite_json
       FROM favorite_questions
      WHERE device_id = $1
      ORDER BY created_at DESC`,
    [deviceId]
  );
  return result.rows.map((row) => row.favorite_json);
}

export async function getFavoriteQuestion(deviceId, favoriteId) {
  await ensureDevice(deviceId);
  const result = await pool.query(
    `SELECT favorite_json
       FROM favorite_questions
      WHERE device_id = $1 AND id = $2`,
    [deviceId, favoriteId]
  );
  return result.rows[0]?.favorite_json || null;
}

export async function upsertFavoriteQuestion(deviceId, favorite) {
  await ensureDevice(deviceId);
  await pool.query(
    `INSERT INTO favorite_questions (id, device_id, chapter_id, question_id, favorite_json, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
     ON CONFLICT (device_id, chapter_id, question_id)
     DO UPDATE SET
       favorite_json = EXCLUDED.favorite_json,
       updated_at = NOW()`,
    [
      favorite.id,
      deviceId,
      favorite.chapterId,
      favorite.questionId,
      JSON.stringify(favorite),
      favorite.createdAt || new Date().toISOString()
    ]
  );
  return getFavoriteQuestion(deviceId, favorite.id);
}

export async function deleteFavoriteQuestion(deviceId, favoriteId) {
  await ensureDevice(deviceId);
  const result = await pool.query(
    "DELETE FROM favorite_questions WHERE device_id = $1 AND id = $2",
    [deviceId, favoriteId]
  );
  return result.rowCount > 0;
}

export async function upsertPushToken(deviceId, pushToken) {
  await ensureDevice(deviceId);
  await pool.query(
    `INSERT INTO device_push_tokens (device_id, token, platform, environment, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (device_id, token)
     DO UPDATE SET
       platform = EXCLUDED.platform,
       environment = EXCLUDED.environment,
       updated_at = NOW()`,
    [
      deviceId,
      pushToken.token,
      pushToken.platform || "ios",
      pushToken.environment || "production"
    ]
  );
}

export async function listPushTokens(deviceId) {
  await ensureDevice(deviceId);
  const result = await pool.query(
    `SELECT token, platform, environment
       FROM device_push_tokens
      WHERE device_id = $1
      ORDER BY updated_at DESC`,
    [deviceId]
  );
  return result.rows.map((row) => ({
    token: row.token,
    platform: row.platform,
    environment: row.environment
  }));
}

export async function listNotifications(deviceId) {
  await ensureDevice(deviceId);
  const result = await pool.query(
    `SELECT notification_json
       FROM notifications
      WHERE device_id = $1
      ORDER BY created_at DESC`,
    [deviceId]
  );
  return result.rows.map((row) => row.notification_json);
}

export async function getNotification(deviceId, notificationId) {
  await ensureDevice(deviceId);
  const result = await pool.query(
    `SELECT notification_json
       FROM notifications
      WHERE device_id = $1 AND id = $2`,
    [deviceId, notificationId]
  );
  return result.rows[0]?.notification_json || null;
}

export async function upsertNotification(deviceId, notification) {
  await ensureDevice(deviceId);
  await pool.query(
    `INSERT INTO notifications (id, device_id, chapter_id, notification_json, created_at, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, NOW())
     ON CONFLICT (id)
     DO UPDATE SET
       notification_json = EXCLUDED.notification_json,
       updated_at = NOW()`,
    [
      notification.id,
      deviceId,
      notification.chapterId,
      JSON.stringify(notification),
      notification.createdAt || new Date().toISOString()
    ]
  );
  return getNotification(deviceId, notification.id);
}

export async function deleteNotificationsForChapter(deviceId, chapterId, type = "") {
  await ensureDevice(deviceId);
  if (type) {
    await pool.query(
      `DELETE FROM notifications
        WHERE device_id = $1
          AND chapter_id = $2
          AND notification_json->>'type' = $3`,
      [deviceId, chapterId, type]
    );
    return;
  }
  await pool.query("DELETE FROM notifications WHERE device_id = $1 AND chapter_id = $2", [deviceId, chapterId]);
}

export async function startGenerationJob(deviceId, job) {
  await ensureDevice(deviceId);
  await pool.query(
    `INSERT INTO generation_jobs (id, device_id, chapter_id, status, current_stage, started_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (id)
     DO UPDATE SET
       status = EXCLUDED.status,
       current_stage = EXCLUDED.current_stage,
       error_message = '',
       finished_at = NULL,
       updated_at = NOW()`,
    [job.id, deviceId, job.chapterId, job.status, job.currentStage]
  );
}

export async function updateGenerationJob(deviceId, jobId, fields) {
  await ensureDevice(deviceId);
  await pool.query(
    `UPDATE generation_jobs
        SET status = COALESCE($3, status),
            current_stage = COALESCE($4, current_stage),
            error_message = COALESCE($5, error_message),
            finished_at = CASE WHEN $6::boolean THEN NOW() ELSE finished_at END,
            updated_at = NOW()
      WHERE device_id = $1 AND id = $2`,
    [
      deviceId,
      jobId,
      fields.status || null,
      fields.currentStage || null,
      fields.errorMessage || null,
      Boolean(fields.finished)
    ]
  );
}

async function markInterruptedGenerationJobs() {
  const result = await pool.query(
    `SELECT id, device_id, chapter_id
       FROM generation_jobs
      WHERE status = ANY($1::text[])`,
    [PROCESSING_STATUSES]
  );

  for (const row of result.rows) {
    const chapter = await getChapter(row.device_id, row.chapter_id);
    if (chapter && PROCESSING_STATUSES.includes(chapter.status)) {
      const now = new Date().toISOString();
      const meta = chapter.generationMeta || {};
      chapter.status = INTERRUPTED_STATUS;
      chapter.displayStatusText = INTERRUPTED_TEXT;
      chapter.failureReason = INTERRUPTED_REASON;
      chapter.generationMeta = {
        ...meta,
        currentStage: INTERRUPTED_STATUS,
        failedStage: meta.currentStage || INTERRUPTED_STATUS,
        failureReason: INTERRUPTED_REASON,
        stages: [
          ...((Array.isArray(meta.stages) ? meta.stages : []).slice(-8)),
          { status: INTERRUPTED_STATUS, displayStatusText: INTERRUPTED_TEXT, at: now }
        ]
      };
      chapter.updatedAt = now;
      await upsertChapter(row.device_id, chapter);
    }

    await updateGenerationJob(row.device_id, row.id, {
      status: INTERRUPTED_STATUS,
      currentStage: INTERRUPTED_STATUS,
      errorMessage: INTERRUPTED_REASON,
      finished: true
    });
  }
}

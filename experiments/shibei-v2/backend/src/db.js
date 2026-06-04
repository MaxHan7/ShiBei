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
const DEFAULT_GENERATION_JOB_LOCK_MS = readPositiveInt(process.env.GENERATION_JOB_LOCK_MS, 420_000);
const DEFAULT_GENERATION_JOB_MAX_ATTEMPTS = readPositiveInt(process.env.GENERATION_JOB_MAX_ATTEMPTS, 2);

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

    ALTER TABLE generation_jobs
      ADD COLUMN IF NOT EXISTS job_type TEXT NOT NULL DEFAULT 'create_chapter',
      ADD COLUMN IF NOT EXISTS payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS queue_status TEXT NOT NULL DEFAULT 'completed',
      ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 2,
      ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS locked_by TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_error TEXT NOT NULL DEFAULT '';

    CREATE INDEX IF NOT EXISTS generation_jobs_queue_idx
      ON generation_jobs(queue_status, available_at, updated_at);

    CREATE INDEX IF NOT EXISTS generation_jobs_lock_idx
      ON generation_jobs(queue_status, locked_until);

    CREATE TABLE IF NOT EXISTS device_push_tokens (
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'ios',
      environment TEXT NOT NULL DEFAULT 'production',
      preferred_language TEXT NOT NULL DEFAULT 'zh-Hans',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (device_id, token)
    );

    ALTER TABLE device_push_tokens
      ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'zh-Hans';

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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM device_push_tokens WHERE device_id = $1", [deviceId]);
    await client.query(
      `INSERT INTO device_push_tokens (device_id, token, platform, environment, preferred_language, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [
        deviceId,
        pushToken.token,
        pushToken.platform || "ios",
        pushToken.environment || "production",
        normalizePreferredLanguage(pushToken.preferredLanguage || pushToken.preferred_language)
      ]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listPushTokens(deviceId) {
  await ensureDevice(deviceId);
  const result = await pool.query(
    `SELECT token, platform, environment, preferred_language, created_at, updated_at
       FROM device_push_tokens
      WHERE device_id = $1
      ORDER BY updated_at DESC`,
    [deviceId]
  );
  return result.rows.map((row) => ({
    token: row.token,
    platform: row.platform,
    environment: row.environment,
    preferredLanguage: normalizePreferredLanguage(row.preferred_language),
    createdAt: row.created_at?.toISOString?.() || "",
    updatedAt: row.updated_at?.toISOString?.() || ""
  }));
}

function normalizePreferredLanguage(value = "") {
  return value === "en" ? "en" : "zh-Hans";
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

export async function enqueueGenerationJob(deviceId, job) {
  await ensureDevice(deviceId);
  const record = normalizeGenerationJobInput(job);
  await pool.query(
    `INSERT INTO generation_jobs (
       id,
       device_id,
       chapter_id,
       status,
       current_stage,
       job_type,
       payload_json,
       queue_status,
       attempt_count,
       max_attempts,
       available_at,
       locked_by,
       locked_until,
       last_error,
       started_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'queued', 0, $8, $9, '', NULL, '', NOW(), NOW())
     ON CONFLICT (id)
     DO UPDATE SET
       status = EXCLUDED.status,
       current_stage = EXCLUDED.current_stage,
       job_type = EXCLUDED.job_type,
       payload_json = EXCLUDED.payload_json,
       queue_status = 'queued',
       attempt_count = 0,
       max_attempts = EXCLUDED.max_attempts,
       available_at = EXCLUDED.available_at,
       locked_by = '',
       locked_until = NULL,
       last_error = '',
       finished_at = NULL,
       updated_at = NOW()`,
    [
      record.id,
      deviceId,
      record.chapterId,
      record.status,
      record.currentStage,
      record.jobType,
      JSON.stringify(record.payload),
      record.maxAttempts,
      record.availableAt
    ]
  );
  return getGenerationJob(deviceId, record.id);
}

export async function getGenerationJob(deviceId, jobId) {
  await ensureDevice(deviceId);
  const result = await pool.query(
    `SELECT *
       FROM generation_jobs
      WHERE device_id = $1 AND id = $2`,
    [deviceId, jobId]
  );
  return result.rows[0] ? normalizeGenerationJobRow(result.rows[0]) : null;
}

export async function claimNextGenerationJob(workerId, options = {}) {
  if (!pool) return null;
  const lockMs = readPositiveInt(options.lockMs, DEFAULT_GENERATION_JOB_LOCK_MS);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `WITH next_job AS (
         SELECT id
           FROM generation_jobs
          WHERE (
              queue_status = 'queued'
              OR (queue_status = 'running' AND locked_until IS NOT NULL AND locked_until < NOW())
            )
            AND available_at <= NOW()
          ORDER BY available_at ASC, updated_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
       )
       UPDATE generation_jobs
          SET queue_status = 'running',
              attempt_count = attempt_count + 1,
              locked_by = $1,
              locked_until = NOW() + ($2::text)::interval,
              updated_at = NOW()
        WHERE id = (SELECT id FROM next_job)
        RETURNING *`,
      [workerId, `${lockMs} milliseconds`]
    );
    await client.query("COMMIT");
    return result.rows[0] ? normalizeGenerationJobRow(result.rows[0]) : null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function completeGenerationJob(deviceId, jobId, fields = {}) {
  await ensureDevice(deviceId);
  const result = await pool.query(
    `UPDATE generation_jobs
        SET status = COALESCE($3, status),
            current_stage = COALESCE($4, current_stage),
            error_message = '',
            queue_status = 'completed',
            locked_by = '',
            locked_until = NULL,
            last_error = '',
            finished_at = NOW(),
            updated_at = NOW()
      WHERE device_id = $1 AND id = $2
      RETURNING *`,
    [
      deviceId,
      jobId,
      fields.status || null,
      fields.currentStage || fields.status || null
    ]
  );
  return result.rows[0] ? normalizeGenerationJobRow(result.rows[0]) : null;
}

export async function failGenerationJob(deviceId, jobId, fields = {}) {
  await ensureDevice(deviceId);
  const current = await getGenerationJob(deviceId, jobId);
  if (!current) return null;
  const errorMessage = String(fields.errorMessage || fields.lastError || current.lastError || "");
  const retry = fields.retry === undefined
    ? shouldRetryGenerationJob(current)
    : Boolean(fields.retry) && shouldRetryGenerationJob(current);
  const delayMs = readPositiveInt(fields.retryDelayMs, 5_000);
  const result = await pool.query(
    `UPDATE generation_jobs
        SET status = COALESCE($3, status),
            current_stage = COALESCE($4, current_stage),
            error_message = COALESCE($5, error_message),
            queue_status = $6,
            available_at = CASE WHEN $6 = 'queued' THEN NOW() + ($7::text)::interval ELSE available_at END,
            locked_by = '',
            locked_until = NULL,
            last_error = COALESCE($5, last_error),
            finished_at = CASE WHEN $6 = 'failed' THEN NOW() ELSE finished_at END,
            updated_at = NOW()
      WHERE device_id = $1 AND id = $2
      RETURNING *`,
    [
      deviceId,
      jobId,
      fields.status || null,
      fields.currentStage || fields.status || null,
      errorMessage || null,
      retry ? "queued" : "failed",
      `${delayMs} milliseconds`
    ]
  );
  return result.rows[0] ? normalizeGenerationJobRow(result.rows[0]) : null;
}

export async function getGenerationQueueSummary() {
  if (!pool) return { queued: 0, running: 0, failed: 0, completed: 0 };
  const result = await pool.query(
    `SELECT queue_status, COUNT(*)::int AS count
       FROM generation_jobs
      GROUP BY queue_status`
  );
  const summary = { queued: 0, running: 0, failed: 0, completed: 0 };
  for (const row of result.rows) {
    summary[row.queue_status] = row.count;
  }
  return summary;
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
      WHERE status = ANY($1::text[])
        AND queue_status = 'completed'`,
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

export function normalizeGenerationJobInput(job = {}) {
  return {
    id: String(job.id || ""),
    chapterId: String(job.chapterId || job.chapter_id || ""),
    status: String(job.status || "submitted"),
    currentStage: String(job.currentStage || job.current_stage || job.status || "submitted"),
    jobType: normalizeGenerationJobType(job.jobType || job.job_type),
    payload: job.payload && typeof job.payload === "object" && !Array.isArray(job.payload) ? job.payload : {},
    maxAttempts: readPositiveInt(job.maxAttempts ?? job.max_attempts, DEFAULT_GENERATION_JOB_MAX_ATTEMPTS),
    availableAt: job.availableAt || job.available_at || new Date().toISOString()
  };
}

export function normalizeGenerationJobRow(row = {}) {
  return {
    id: String(row.id || ""),
    deviceId: String(row.device_id || row.deviceId || ""),
    chapterId: String(row.chapter_id || row.chapterId || ""),
    status: String(row.status || "submitted"),
    currentStage: String(row.current_stage || row.currentStage || row.status || "submitted"),
    errorMessage: String(row.error_message || row.errorMessage || ""),
    jobType: normalizeGenerationJobType(row.job_type || row.jobType),
    payload: normalizePayloadJson(row.payload_json ?? row.payloadJson ?? row.payload),
    queueStatus: normalizeQueueStatus(row.queue_status || row.queueStatus),
    attemptCount: Number.isFinite(Number(row.attempt_count ?? row.attemptCount)) ? Number(row.attempt_count ?? row.attemptCount) : 0,
    maxAttempts: readPositiveInt(row.max_attempts ?? row.maxAttempts, DEFAULT_GENERATION_JOB_MAX_ATTEMPTS),
    availableAt: toIsoString(row.available_at ?? row.availableAt),
    lockedBy: String(row.locked_by || row.lockedBy || ""),
    lockedUntil: toIsoString(row.locked_until ?? row.lockedUntil),
    lastError: String(row.last_error || row.lastError || ""),
    startedAt: toIsoString(row.started_at ?? row.startedAt),
    finishedAt: toIsoString(row.finished_at ?? row.finishedAt),
    updatedAt: toIsoString(row.updated_at ?? row.updatedAt)
  };
}

export function shouldRetryGenerationJob(job = {}) {
  const attemptCount = Number.isFinite(Number(job.attemptCount ?? job.attempt_count))
    ? Number(job.attemptCount ?? job.attempt_count)
    : 0;
  const maxAttempts = readPositiveInt(job.maxAttempts ?? job.max_attempts, DEFAULT_GENERATION_JOB_MAX_ATTEMPTS);
  return attemptCount < maxAttempts;
}

function normalizeGenerationJobType(type) {
  return type === "regenerate_chapter" ? "regenerate_chapter" : "create_chapter";
}

function normalizeQueueStatus(status) {
  return ["queued", "running", "completed", "failed"].includes(status) ? status : "completed";
}

function normalizePayloadJson(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function toIsoString(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

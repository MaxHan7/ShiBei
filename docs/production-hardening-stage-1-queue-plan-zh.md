# 拾贝 P0 阶段 1：生成任务队列化实施计划

> 这份文档用于下一轮代码实现。目标是把“API 接收章节生成请求”和“模型生成执行”拆开，建立 Postgres-backed generation job queue 和独立 worker 最小闭环。本文是实施计划，不改变当前运行逻辑。

## 目标和边界

阶段 1 只解决 PRD-P0-001 的主体问题：生成任务无正式队列和背压。它为 PRD-P0-002 多进程协调打基础，但不要求一次性解决完整幂等和多实例状态覆盖。

必须保持：

- `POST /api/chapters` 仍快速返回 `202 submitted`。
- `POST /api/chapters/:id/regenerate` 仍快速返回 `202 submitted`，并保留原章节 id。
- `GET /api/chapters/:id` 仍是 iOS 轮询生成状态的真相来源。
- 无 `DATABASE_URL` 的本地模式继续沿用当前进程内后台生成，避免 HTML Demo 和本地开发被 Postgres 队列阻塞。

阶段 1 不做：

- 正式幂等键和重复提交去重；阶段 2 单独处理。
- attempt / feedback 并发写入；阶段 3 单独处理。
- rate limit、body size limit、CORS 收紧；阶段 4 单独处理。
- 完整 dashboards 和压测报告；阶段 5 单独处理。

## 默认设计

| 事项 | 决策 |
| --- | --- |
| 队列表 | 复用并扩展现有 `generation_jobs` 表，而不是新增第二张 queue 表。 |
| worker 入口 | 新增 `backend/src/worker.js`，通过 `npm --prefix backend run worker` 启动。 |
| API 行为 | 有 Postgres 时只入队，不在 API 进程内执行生成；无 Postgres 时保持当前后台生成回退。 |
| 并发上限 | worker 内用 `GENERATION_WORKER_CONCURRENCY` 控制，默认 `1`。 |
| 领取策略 | Postgres `FOR UPDATE SKIP LOCKED` 或条件 `UPDATE ... RETURNING`；第一版推荐 `FOR UPDATE SKIP LOCKED`。 |
| 可见性超时 | `locked_until` 过期后可被下一个 worker 重新领取。 |
| 重试次数 | `max_attempts` 默认 `2`；达到上限后写入章节失败态。 |
| 任务类型 | `create_chapter` 和 `regenerate_chapter`。 |

## 数据库改动计划

在 `backend/src/db.js` 的 `initDatabase()` 中扩展 `generation_jobs`。当前没有迁移框架，因此阶段 1 继续使用 `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 的初始化方式。

建议字段：

| 字段 | 类型 | 语义 |
| --- | --- | --- |
| `job_type` | `TEXT NOT NULL DEFAULT 'create_chapter'` | `create_chapter` 或 `regenerate_chapter`。 |
| `payload_json` | `JSONB NOT NULL DEFAULT '{}'::jsonb` | 生成输入或重生成所需最小 payload。 |
| `queue_status` | `TEXT NOT NULL DEFAULT 'queued'` | `queued`、`running`、`completed`、`failed`。 |
| `attempt_count` | `INT NOT NULL DEFAULT 0` | 已尝试执行次数。 |
| `max_attempts` | `INT NOT NULL DEFAULT 2` | 最大尝试次数。 |
| `available_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | 任务可领取时间。 |
| `locked_by` | `TEXT NOT NULL DEFAULT ''` | 当前 worker id。 |
| `locked_until` | `TIMESTAMPTZ` | worker 锁过期时间。 |
| `last_error` | `TEXT NOT NULL DEFAULT ''` | 最近一次失败摘要。 |

建议索引：

```sql
CREATE INDEX IF NOT EXISTS generation_jobs_queue_idx
  ON generation_jobs(queue_status, available_at, updated_at);

CREATE INDEX IF NOT EXISTS generation_jobs_lock_idx
  ON generation_jobs(queue_status, locked_until);
```

状态约定：

- `status` 和 `current_stage` 继续承载用户可见生成阶段。
- `queue_status` 只承载队列执行状态。
- `finished_at` 继续表示该 generation job 终止时间，completed 和 failed 都要写。

## 后端模块拆分计划

### `backend/src/db.js`

新增导出：

- `enqueueGenerationJob(deviceId, job)`：创建或更新 generation job，并写入 queue 字段。
- `claimNextGenerationJob(workerId, options)`：领取一个可执行任务。
- `completeGenerationJob(deviceId, jobId, fields)`：标记 queue completed，同时写 `status/current_stage/finished_at`。
- `failGenerationJob(deviceId, jobId, fields)`：标记失败或重新排队。
- `releaseExpiredGenerationJobs()`：可选的轻量清理，主要用于测试或 worker 启动前恢复。

领取 SQL 语义：

```sql
WITH next_job AS (
  SELECT id
    FROM generation_jobs
   WHERE queue_status = 'queued'
     AND available_at <= NOW()
     AND (locked_until IS NULL OR locked_until < NOW())
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
 RETURNING *;
```

### `backend/src/generationJobRunner.js`

新增模块，负责执行单个 job，避免 worker 直接依赖 HTTP server 路由细节。

导出：

- `runGenerationJob(job, options)`。

行为：

- `create_chapter`：使用 `payload_json` 中的原始 body 执行当前 `generateFromInput` 等价逻辑。
- `regenerate_chapter`：读取现有章节，执行当前 `regenerateFromChapter` 等价逻辑。
- 通过 `onStage` 更新章节 `generationMeta` 和 `generation_jobs.current_stage`。
- 完成后创建 App 内通知，并尝试发送 APNS。
- 失败后写入 `failedSourceResult` 等价章节结构和 notification。

注意：

- 当前 `generateFromInput`、`regenerateFromChapter`、`createMemoryNotification` 等函数在 `server.js` 内部。阶段 1 实现时应将这些生成执行相关函数抽到可复用模块，或从 `server.js` 明确导出；推荐抽到 `backend/src/chapterGeneration.js`，降低 worker 与 HTTP server 耦合。

### `backend/src/worker.js`

新增独立 worker 入口。

行为：

- 启动时调用 `initDatabase()`；如果没有 `DATABASE_URL`，打印错误并退出，避免 worker 在内存模式下假装处理队列。
- 生成 `workerId`，格式建议 `worker-${process.pid}-${Date.now()}`。
- 按 `GENERATION_WORKER_CONCURRENCY` 启动固定数量的异步循环。
- 每个循环重复领取任务；无任务时 sleep `GENERATION_WORKER_POLL_MS`，默认 `1000`。
- 单个任务使用 `GENERATION_JOB_TIMEOUT_MS` 作为整任务超时。
- 收到 `SIGINT` / `SIGTERM` 时停止领取新任务，等待当前任务结束或超时后退出。

### `backend/src/server.js`

改动点：

- `POST /api/chapters` 在有 Postgres 时只创建 submitted 章节并 enqueue job，不直接 `void runChapterGeneration(...)`。
- `POST /api/chapters/:id/regenerate` 在有 Postgres 时只重置章节并 enqueue regenerate job。
- 无 Postgres 时保留当前内存后台生成行为。
- `/api/health` 可增加 `queue` 概览字段，但不得移除既有字段。

### `backend/package.json`

新增脚本：

```json
"worker": "node src/worker.js"
```

`start` 保持 `node src/server.js`，不改变当前 Railway web 服务命令。

## 任务状态和失败策略

### 正常完成

1. worker claim job。
2. job `queue_status` 变为 `running`。
3. 章节状态随阶段更新。
4. 生成完成后章节变为 `completed` 或明确失败态。
5. job `queue_status` 变为 `completed` 或 `failed`，`finished_at` 写入。

### 可重试失败

可重试失败包括：

- 模型超时。
- provider 5xx。
- 临时网络错误。
- worker 进程崩溃导致 `locked_until` 过期。

第一版不需要精细分类所有 provider 错误，但必须保留 `last_error`。如果 `attempt_count < max_attempts`，将 `queue_status` 改回 `queued`，并设置短延迟 `available_at`。

### 终止失败

终止失败包括：

- 达到 `max_attempts`。
- 输入明确不可处理，例如视频链接、正文太短、文章链接无效。
- 缺少模型 key。

终止失败必须：

- 写章节失败态和 `failureReason`。
- 写 App 内通知。
- job `queue_status = 'failed'`。
- `finished_at = NOW()`。

## 测试计划

### 单元测试

新增 `backend/src/tests/generationJobQueue.test.js`，覆盖：

- enqueue 创建 `queued` job。
- claim 只返回一个可领取 job。
- running job 在 `locked_until` 未过期前不会被重复 claim。
- `locked_until` 过期后可被重新 claim。
- complete 写入 `queue_status = 'completed'` 和 `finished_at`。
- fail 在未达 `max_attempts` 时重新排队，在达到上限时变为 `failed`。

如果测试不方便连接真实 Postgres，第一阶段可把 SQL 构造和状态转换拆成纯函数测试；但最终验收必须在 Postgres 环境手动验证 claim 语义。

### 集成验证

有 `DATABASE_URL` 的本地或 Railway 环境：

1. 启动 API：

```bash
npm --prefix backend run dev
```

2. 启动 worker：

```bash
npm --prefix backend run worker
```

3. 创建章节：

```bash
curl -X POST http://127.0.0.1:5173/api/chapters \
  -H 'content-type: application/json' \
  -H 'X-Device-Id: queue-stage-device-1' \
  -d '{"sourceType":"text","rawText":"这里放一段超过数百字、适合提炼知识点的测试文本。"}'
```

预期：

- API 立即返回 `202 submitted`。
- worker 日志显示领取 job。
- 轮询 `GET /api/chapters/:id` 最终进入 `completed` 或明确 `failed_*`。
- `generation_jobs.queue_status` 最终为 `completed` 或 `failed`。

### 回归检查

```bash
npm --prefix backend run check
git diff --check
```

预期全部通过。

## 验收标准

阶段 1 完成必须同时满足：

1. 有 Postgres 时，API 不再在 web 进程内执行生成任务，只负责入队。
2. 独立 worker 能领取并完成 `create_chapter` 任务。
3. 独立 worker 能领取并完成 `regenerate_chapter` 任务。
4. worker 并发上限由 `GENERATION_WORKER_CONCURRENCY` 控制，默认 `1`。
5. worker 停止或崩溃后，任务不会永久卡在 `running`；`locked_until` 过期后可恢复。
6. 无 `DATABASE_URL` 时，本地开发仍能用当前后台生成路径。
7. `POST /api/chapters`、`GET /api/chapters/:id`、`POST /api/chapters/:id/regenerate` 的 iOS 可见响应结构保持兼容。
8. `docs/production-readiness-review-zh.md` 更新 PRD-P0-001 的状态和阶段 1 证据。

## Railway 部署备注

阶段 1 代码实现后，Railway 应保留 web service：

```text
npm start
```

并新增一个 worker service：

```text
npm run worker
```

两个 service 共享同一个 `DATABASE_URL` 和模型 key。第一版不要求在 `railway.json` 中直接声明 worker，因为 Railway 多服务通常在项目设置中配置；但部署文档必须记录这一点。

## 阶段 1 完成后进入

阶段 2：幂等和多进程协调。阶段 2 应在阶段 1 的队列基础上补重复提交去重、任务身份校验和双 worker 并发验证。

# 拾贝 P0 阶段 0：接口和状态基线

> 这份文档冻结当前云端原型的用户可见行为，作为后续队列化、幂等、一致性、安全和观测改造的兼容基线。阶段 0 不改变运行逻辑，只记录当前事实、不可破坏行为和最小验证清单。

## 阶段 0 结论

- 当前主路径是 `/api/chapters`：创建章节立即返回 `202 submitted`，后端在当前 Node 进程内继续执行生成。
- 当前同步调试路径是 `/api/generate` 和 `/api/regenerate`：请求会等待完整生成完成，不是 iOS 生产主入口。
- 当前持久化在配置 `DATABASE_URL` 时使用 PostgreSQL；未配置时使用进程内内存存储。
- 当前没有正式队列、独立 worker、幂等键、请求大小限制、rate limit 或生产观测。
- 后续 P0 改造必须保持 iOS 主路径的用户语义：快速提交、可轮询状态、失败可解释、可重新生成。

## 当前关键接口行为

| 接口 | 当前行为 | 成功响应 | 失败/边界 | 后续不可破坏行为 |
| --- | --- | --- | --- | --- |
| `GET /api/health` | 返回服务启动时间、存储模式、数据库探活、APNS 配置和章节数。 | `200`，`ok: true`，`storage: "postgres"` 或 `"memory"`。 | 数据库不可用时 `database.ok` 为 `false`，接口本身仍返回健康结构。 | 保留为 Railway healthcheck；后续可增加字段，但不能移除 `ok`、`service`、`storage`、`database`。 |
| `POST /api/chapters` | 读取 body，创建 submitted 章节，立即返回，再触发后台生成。 | `202`，包含 `status: "submitted"`、`chapter`、`notification: null`、`message`。 | 当前没有 body size limit；无模型 key 等生成错误会在后台落入章节失败态。 | 必须继续快速返回；后续队列化后仍由客户端轮询章节状态。 |
| `GET /api/chapters` | 按 `X-Device-Id` 列出当前设备章节。 | `200`，`{ chapters: [...] }`。 | 缺少 `X-Device-Id` 时使用默认 `demo-device`。 | 返回结构保持兼容；后续鉴权或匿名 token 不能破坏 iOS 解码。 |
| `GET /api/chapters/:id` | 按设备和章节 id 读取章节。 | `200`，`{ chapter }`。 | 不存在时 `404 chapter_not_found`。 | iOS 轮询生成状态依赖此接口；必须持续返回最新 `status`、`failureReason`、`generationMeta`。 |
| `POST /api/chapters/:id/regenerate` | 将已有章节重置为 submitted，立即返回，再后台重新生成。 | `202`，包含 submitted 章节和提示文案。 | 不存在时 `404 chapter_not_found`。 | 重生成仍应保留原章节 id 和 createdAt，避免 iOS 端丢失详情上下文。 |
| `POST /api/chapters/:id/review-session` | completed 章节可开始或恢复复习会话。 | `200`，包含 `chapter`、`reviewSession`、`currentQuestion`。 | 非 completed 章节返回 `422 chapter_not_reviewable`。 | 后续生成状态改造不能让未完成章节进入复习。 |
| `POST /api/review-sessions/:id/attempts` | 找到含该 session 的章节，记录答题并整体 upsert 章节。 | `200`，包含更新后的 `chapter`、`reviewSession`、`attempt`、`currentQuestion`。 | 找不到 session 返回 `404`；队列/题目不匹配返回 `409` 或 `422`。 | 后续一致性改造必须保持答题响应结构兼容。 |
| `POST /api/questions/:id/feedback` | 找到题目所在章节，记录反馈并可能移除题目。 | `200`，包含更新后的 `chapter`、`feedback`、`reviewSession`。 | 找不到题目返回 `404 question_not_found`。 | 后续拆表或锁策略不能丢失用户反馈语义。 |
| `POST /api/generate` / `POST /api/regenerate` | 同步执行完整生成或基于传入章节重生成，主要给 HTML Demo / 调试兼容。 | completed 时 `200`，未完成或失败时多为 `422`。 | 缺 key 时返回 `500`；生成失败返回失败章节结构。 | 不作为生产主路径；后续若保留，需明确不受队列 SLA 约束。 |

## 当前生成状态机

当前章节状态来自 `backend/src/generation/types.js` 的状态文案和 `backend/src/server.js` 的阶段更新逻辑。主路径状态流为：

```text
submitted
  -> extracting_content
  -> generating_points
  -> generating_questions
  -> quality_checking
  -> auto_regenerating_questions
  -> completed
```

失败状态可能为：

```text
failed_extract_article
failed_extract_video
failed_points
failed_questions
failed_no_qualified_questions
```

当前语义：

- `submitted`：章节已创建，后台生成尚未完成。
- `extracting_content`：服务端正在处理文本、文章链接或公众号链接。
- `generating_points`：正在清洗内容并提取知识点。
- `generating_questions`：正在生成题目。
- `quality_checking`：正在进行题目质量检查。
- `auto_regenerating_questions`：内部自动补题或重写阶段，前端仍应弱化为质量检查中。
- `completed`：章节可复习，应该有知识点、题目和可展示总结。
- `failed_*`：章节生成失败，必须有用户可理解的 `failureReason`。

## 当前失败和恢复行为

| 场景 | 当前行为 | 用户可见结果 | 后续不可破坏行为 |
| --- | --- | --- | --- |
| 内容太短 | `generateReviewChapter` 返回 `failed_points`。 | 章节失败，提示内容不足或无法提炼知识点。 | 失败必须落到章节，用户可重新生成或改输入。 |
| 文章链接无效或正文太短 | 来源提取抛出 `failed_extract_article`。 | 章节失败，提示链接不可访问或正文太短。 | 不能永久停在处理中；失败原因需保留。 |
| 视频链接 | 当前明确抛出 `failed_extract_video`。 | 提示暂未接入视频文本提取。 | 队列化后仍要快速失败并保持文案清楚。 |
| 缺少模型 API key | 同步 `/api/generate` 返回 `500`；后台生成路径会把章节写成失败态。 | 用户看到生成失败原因。 | 生产环境应在启动或健康检查层更早暴露配置问题。 |
| 模型请求超时 | 单次模型请求默认 `MODEL_REQUEST_TIMEOUT_MS=90000`；整次生成默认 `GENERATION_JOB_TIMEOUT_MS=360000`。 | 章节最终失败，提示生成超时或生成失败。 | 队列 worker 也必须有单次请求超时和整任务超时。 |
| 模型返回非 JSON | 解析失败会标注 usage 记录并抛出“模型返回内容不是可解析 JSON”。 | 章节最终失败或低质量降级。 | 失败分类需要保留并进入观测指标。 |
| 服务重启 | `initDatabase()` 会调用 `markInterruptedGenerationJobs()`，把处理中任务标记为 `failed_questions`。 | 章节显示“生成中断，请重新生成”。 | 引入 worker 后仍不能让任务永久卡在处理中。 |
| APNS 未配置 | 章节生成和 App 内通知不受影响；系统推送跳过或诊断为未配置。 | App 内可轮询；系统通知可能没有。 | 推送失败不能影响章节最终状态。 |

## 当前持久化和一致性基线

- `devices`、`chapters`、`notifications`、`generation_jobs`、`device_push_tokens`、`favorite_questions` 在服务启动时用 `CREATE TABLE IF NOT EXISTS` 初始化。
- `chapters.chapter_json` 保存章节主体、复习会话、attempts、feedbackRecords 等复合数据。
- `upsertChapter` 当前以整块 JSONB 覆盖章节内容。
- `generation_jobs` 当前用于记录生成状态和重启中断，不负责正式排队、任务领取或分布式锁。
- `generationRuns` 当前是进程内 `Map`，只保护单 Node 进程内同章节最新运行。

这意味着阶段 1 和阶段 2 可以先围绕生成任务队列化推进；阶段 3 再处理 review session 并发写入的一致性。

## 后续不可破坏行为

P0 后续阶段必须保留这些行为：

1. `POST /api/chapters` 和 `POST /api/chapters/:id/regenerate` 对 iOS 来说仍是快速提交接口。
2. `GET /api/chapters/:id` 仍是生成状态轮询的唯一真相来源。
3. 章节失败必须写入明确 `status`、`displayStatusText`、`failureReason` 和 `generationMeta`。
4. 服务重启后，用户不能看到永久卡住的处理中章节。
5. completed 之前不能开始复习会话。
6. 复习 attempt 和 feedback 的响应结构必须保持 iOS Codable 兼容。
7. 成本工作台和模型 usage 明细不能进入 iOS 主接口用户可见数据。
8. 未配置 `DATABASE_URL` 的本地内存模式仍应保留给 Demo 和开发调试，除非另有迁移计划。

## 最小验证清单

### 静态检查

```bash
npm --prefix backend run check
git diff --check
```

预期：

- `npm --prefix backend run check` 全部通过。
- `git diff --check` 无尾随空格或冲突标记。

### 接口基线验证

本地启动：

```bash
npm --prefix backend run dev
```

健康检查：

```bash
curl http://127.0.0.1:5173/api/health
```

预期：

- 返回 `ok: true`。
- `storage` 为 `memory` 或 `postgres`。

创建章节：

```bash
curl -X POST http://127.0.0.1:5173/api/chapters \
  -H 'content-type: application/json' \
  -H 'X-Device-Id: baseline-device-1' \
  -d '{"sourceType":"text","rawText":"这里放一段超过数百字、适合提炼知识点的测试文本。"}'
```

预期：

- 立即返回 `202`。
- body 包含 `status: "submitted"` 和 `chapter.id`。

轮询章节：

```bash
curl http://127.0.0.1:5173/api/chapters/CHAPTER_ID \
  -H 'X-Device-Id: baseline-device-1'
```

预期：

- 章节从处理中状态进入 `completed` 或明确 `failed_*`。
- 失败时有 `failureReason`。

### 故障验证口径

阶段 1 之前至少要保留这些人工验证口径：

- 短文本提交应进入 `failed_points`。
- `sourceType: "video_link"` 应进入 `failed_extract_video`。
- 缺少模型 key 时应进入可解释失败，而不是进程崩溃。
- 使用 Postgres 时，服务重启后未完成任务应被标记为中断。
- 非 completed 章节请求 review session 应返回 `422 chapter_not_reviewable`。

### 最小压测口径

阶段 0 不要求完成压测，但后续阶段要使用同一口径记录：

- 10 个不同 `X-Device-Id` 并发提交 `POST /api/chapters`。
- 记录提交接口 p95、最终完成率、失败原因分布、内存峰值和模型错误率。
- 阶段 5 前不得用该结果宣称生产承载能力，只作为改造前后对比基线。

## 阶段 0 审计台账更新

本阶段只补基线证据，不把任何 P0 风险标记为已缓解：

- PRD-P0-001：保持 `已识别`，阶段 1 队列化后再验证。
- PRD-P0-002：保持 `已识别`，阶段 2 多 worker 验证后再更新。
- PRD-P0-003：保持 `已识别`，阶段 3 并发写入测试后再更新。
- PRD-P0-004：保持 `已识别`，阶段 4 安全流量治理后再更新。
- PRD-P0-005：保持 `已识别`，阶段 5 观测和压测后再更新。

阶段 0 完成后，后续应进入阶段 1：生成任务队列化最小闭环实施计划，见 `docs/production-hardening-stage-1-queue-plan-zh.md`。

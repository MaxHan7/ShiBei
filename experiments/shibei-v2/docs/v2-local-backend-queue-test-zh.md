# V2 本地队列、进度持久化与重试测试说明

本文档用于在本地完整测试 V2 后端生成链路：上传文章、创建后台队列任务、持久化生成进度、失败重试、最终成功或失败展示。

## 1. 本地环境

先准备本地 PostgreSQL。可以使用 Homebrew/Postgres.app，也可以使用 Docker。数据库名建议：

```bash
createdb shibei_v2_local
```

复制环境变量模板：

```bash
cp experiments/shibei-v2/backend/.env.example experiments/shibei-v2/backend/.env
```

然后把 `.env` 里的 `DEEPSEEK_API_KEY=replace_me` 改成真实 key。

## 2. 启动后端和 worker

`src/start.js` 会在有 `DATABASE_URL` 时同时启动 HTTP server 和 generation worker。

```bash
npm --prefix experiments/shibei-v2/backend start
```

健康检查：

```bash
curl http://localhost:5273/api/health
```

期望看到：

- `storage: "postgres"`
- `database.ok: true`
- `queue.queued/running/failed/completed`

## 3. V2 入队接口

V2 使用独立入口，不改旧版 `/api/chapters`：

```http
POST /api/v2/chapters
```

请求体沿用上传文章的数据形状，例如：

```json
{
  "clientRequestId": "local-upload-001",
  "sourceType": "text",
  "sourceTitle": "游戏化体验",
  "rawText": "文章正文..."
}
```

返回体包含：

- `chapter`
- `job`
- `reused`
- `generationProgress`

`clientRequestId` 用于幂等。重复提交同一个 `clientRequestId` 时，后端应该复用同一个 pending job，而不是创建多个生成任务。

## 4. 前端进度展示规则

`generationProgress.status` 是机器状态，只给轮询和重试逻辑使用：

- `queued`
- `running`
- `retrying`
- `completed`
- `failed`

SwiftUI 不应该直接显示这些英文状态。前端应该显示：

```json
generationProgress.displayText
```

当前约定的用户可见文案包括：

- `已收到文章，准备生成`
- `正在提取原文`
- `正在梳理文章结构`
- `正在总结知识点`
- `正在拆解单元知识点`
- `正在规划复习题`
- `正在为「知识点标题」生成题目`
- `正在为单元二生成题目`
- `正在整理单元总结`
- `正在保存复习内容`
- `生成遇到临时问题，正在重试`
- `生成完成`
- `生成失败，请稍后重试`

如果有短的 `unitTitle`，后端可以显示 `正在为「{unitTitle}」生成题目`。如果标题太长或缺失，显示 `正在为单元{n}生成题目`。

## 5. 轮询方式

上传成功后，前端拿到 `chapter.id`，然后轮询：

```http
GET /api/chapters/:chapterId
```

建议 1-2 秒轮询一次。

停止条件：

- `generationProgress.status === "completed"`
- `generationProgress.status === "failed"`
- 或 chapter `status === "completed" / "failed_generation"`

## 6. 本地 smoke test

成功路径：

```bash
npm --prefix experiments/shibei-v2/backend run smoke:v2:queue -- --mode success
```

重试一次后成功：

```bash
npm --prefix experiments/shibei-v2/backend run smoke:v2:queue -- --mode retry-once
```

永久失败：

```bash
npm --prefix experiments/shibei-v2/backend run smoke:v2:queue -- --mode permanent-failure
```

脚本会打印：

- `chapterId`
- `jobId`
- `reused`
- 每次变化的 `generationProgress.status/stage/displayText/failureCode`

## 7. Simulator 连接本地 backend

iOS Simulator 通常可以直接访问 Mac 本机：

```text
http://localhost:5273
```

如果是真机数据线安装 App，通常要使用 Mac 的局域网 IP：

```text
http://192.168.x.x:5273
```

前端接入时，V2 上传流程应该调用 `/api/v2/chapters`，然后轮询 `/api/chapters/:chapterId`。

## 8. 本地验证命令

```bash
npm --prefix experiments/shibei-v2/backend run check
```

也可以只跑本次新增相关测试：

```bash
cd experiments/shibei-v2/backend
node --test \
  src/v2/generation/v2ChapterQueue.test.js \
  src/v2/generation/generationProgress.test.js \
  src/v2/generation/v2GenerationJobRunner.test.js
```

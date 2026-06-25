# 拾贝 V2 真机真实后端联调记录 - 2026-06-25

## Summary

本次记录用于证明 V2 已经具备“安装到真机并连接本地真实后端”的测试基础，但还不代表完整手机 UI 闭环已经人工验收完成。

当前已验证：

- 本地后端通过 Mac 局域网 IP 可访问。
- PostgreSQL 持久化队列可用。
- V2 生成任务可从 HTTP API 创建、由 worker 消费、持久化进度并完成。
- 真机 App 已通过 launch argument 指向本地真实后端并成功启动。

仍需人工验收：

- 在真机 UI 内执行“上传链接或正文 -> 开始生成 -> 查看生成详情页进度 -> 生成完成 -> 进入章节详情和题目流”。
- 验证首次本地网络权限弹窗、失败状态、生成失败通知详情页。

## Current iOS Data Boundary

这次记录证明真实后端生成链路已经可用，但 V2 App 还不是所有页面都完全由后端驱动。真机测试时需要按下面的边界验收，避免把 fixture 页面误判为生产就绪。

当前已经接入真实后端的部分：

- 上传页通过 `APIClient.createV2Chapter` 创建真实 `/api/v2/chapters` 任务。
- 正在生成详情页轮询 `/api/chapters/:id`，展示后端持久化的 `generationProgress`。
- 生成完成后，后端返回的 V2 chapter 会映射成 `V2ReviewChapterData`。
- 一旦存在 `backendReviewChapter`，章节详情、查看原文、单元概要、选择题、连线题、单元总结、章节总结会使用真实生成内容。
- 全部章节页可以展示生成中的章节卡片和已生成的章节卡片。

仍然是 fixture 或尚未生产化的部分：

- 主页学习路径仍使用 `V2HomeFixture.home`，节点布局、当前节点浮窗、路径进度还没有映射到真实生成章节。
- 笔记 / 收藏题仍使用 `V2ReviewFixture.savedQuestions`。
- V2 SwiftUI 原型里的答题状态目前是本地 view state；旧的后端 `review-session` API 已存在，但当前 V2 题目交互还没有把每次作答持久化到 review session。
- 正式替换线上前，不能依赖 fixture 主页路径或笔记流作为生产完成证据。

本 checkpoint 推荐人工测试路线：

1. 从上传页开始。
2. 粘贴 6000 字 MVP 限制以内的短文章链接或正文。
3. 点击开始生成。
4. 确认 App 进入正在生成详情页。
5. 关闭生成开始弹窗。
6. 观察生成详情页进度文案随真实后端轮询更新。
7. 生成完成后，从生成详情页或全部章节页进入生成出的章节详情。
8. 继续进入单元概要和题目流，检查查看原文、单元总结、章节总结是否展示真实生成内容。

## Environment

- Branch: `codex/shibei-v2-isolated-build`
- Backend base URL: `http://10.130.96.10:5273`
- iPhone device: `煎的正好的咸鱼`
- Device ID used by launch command: `00008130-000465522213803A`
- Bundle ID: `com.maxhan.shibei.v2.dev`
- APNS: not configured in local backend health; this is acceptable for local generation flow, but not for production replacement.

## Backend Health

Command:

```bash
curl http://10.130.96.10:5273/api/health
```

Observed result:

```json
{
  "ok": true,
  "service": "shibei-api",
  "storage": "postgres",
  "database": { "ok": true },
  "queue": {
    "queued": 0,
    "running": 0,
    "failed": 4,
    "completed": 4
  },
  "apns": {
    "configured": false,
    "environment": "sandbox",
    "bundleId": "com.maxhan.shibei.v2.dev"
  }
}
```

## Phone Preflight

Command:

```bash
npm --prefix experiments/shibei-v2/backend run preflight:phone -- \
  --ip 10.130.96.10 \
  --device-id 00008130-000465522213803A
```

Observed result:

```text
PASS local_env_file
PASS deepseek_key_configured
PASS database_url_configured
PASS backend_health
PASS database_health
PASS queue_visible
```

Security note: the preflight prints environment variable names only, not secret values.

## Real Queue Smoke

### Success

Command:

```bash
npm --prefix experiments/shibei-v2/backend run smoke:v2:queue -- \
  --mode success \
  --base-url http://10.130.96.10:5273 \
  --device-id phone-e2e-smoke
```

Observed progress:

```text
chapterId=chapter-1782386976216-d74f8281e504
jobId=generation-1782386976216-1a4274d4fe4c
reused=false
status=queued stage=accepted text=已收到文章，准备生成
status=running stage=planning_review_path text=正在梳理文章结构
status=running stage=mapping_knowledge text=正在总结知识点
status=running stage=planning_practice text=正在规划复习题
status=running stage=generating_questions text=正在为「游戏化核心：动机-机制-组件」生成题目
status=running stage=generating_unit_copy text=正在整理「游戏化核心：动机-机制-组件」的总结
status=completed stage=completed text=生成完成
completed
```

Generated chapter check:

```json
{
  "id": "chapter-1782386976216-d74f8281e504",
  "status": "completed",
  "title": "V2 本地队列 Smoke Test",
  "unitCount": 1,
  "questionCounts": [3],
  "hasSummaryCard": true,
  "hasChapterSummary": true,
  "sourceBlocks": 3
}
```

### Retry Once

Command:

```bash
npm --prefix experiments/shibei-v2/backend run smoke:v2:queue -- \
  --mode retry-once \
  --base-url http://10.130.96.10:5273 \
  --device-id phone-e2e-smoke
```

Observed progress:

```text
chapterId=chapter-1782387171208-0c35a8a975fe6
jobId=generation-1782387171209-e862a74d344f
reused=false
status=queued stage=accepted text=已收到文章，准备生成
status=retrying stage=retry_wait text=生成遇到临时问题，正在重试 failure=structured_output_failed
status=running stage=planning_review_path text=正在梳理文章结构
status=running stage=mapping_knowledge text=正在总结知识点
status=running stage=planning_practice text=正在规划复习题
status=running stage=generating_questions text=正在为「游戏化的常见误区」生成题目
status=running stage=generating_questions text=正在为「核心要素：动机、行为、反馈」生成题目
status=running stage=generating_questions text=正在为「DMC模型：分解游戏化设计」生成题目
status=running stage=generating_unit_copy text=正在整理「游戏化的常见误区」的总结
status=completed stage=completed text=生成完成
completed
```

### Permanent Failure

Command:

```bash
npm --prefix experiments/shibei-v2/backend run smoke:v2:queue -- \
  --mode permanent-failure \
  --base-url http://10.130.96.10:5273 \
  --device-id phone-e2e-smoke
```

Observed progress:

```text
chapterId=chapter-1782387305436-90d86dedfd6a8
jobId=generation-1782387305437-a410737518ba4
reused=false
status=queued stage=accepted text=已收到文章，准备生成
status=failed stage=failed text=缺少模型 API Key。 failure=missing_api_key
failed
```

### Article Link Success

Issue found before the fix:

- `article_link` jobs were enqueued successfully, but the V2 worker passed the URL itself into the V2 generator instead of extracting article text first.
- The model then received only the URL string as input and failed contract validation with `reviewPathPlan.units must be a non-empty array`.

Fix applied:

- The V2 worker now resolves `article_link` jobs through source extraction before calling the V2 generation program.
- The smoke script now accepts `--source-url` so the same test harness can verify link-based generation.
- A short local article fixture is available at `demo/v2-smoke-article.html` for repeatable local link tests under the MVP 6000-character limit.

Command:

```bash
npm --prefix experiments/shibei-v2/backend run smoke:v2:queue -- \
  --mode success \
  --base-url http://10.130.96.10:5273 \
  --device-id phone-link-smoke \
  --source-url http://10.130.96.10:5273/v2-smoke-article.html \
  --source-title V2短文章链接测试
```

Observed progress:

```text
chapterId=chapter-1782387664883-49850522cbf3d
jobId=generation-1782387664884-ad1c33de5af36
reused=false
status=queued stage=accepted text=已收到文章，准备生成
status=running stage=planning_review_path text=正在梳理文章结构
status=running stage=mapping_knowledge text=正在总结知识点
status=running stage=planning_practice text=正在规划复习题
status=running stage=generating_questions text=正在为「游戏化设计本质是反馈系统」生成题目
status=running stage=generating_questions text=正在为「DMC模型三层结构」生成题目
status=running stage=generating_questions text=正在为「游戏化设计的正确路径」生成题目
status=running stage=generating_unit_copy text=正在整理「游戏化设计本质是反馈系统」的总结
status=completed stage=completed text=生成完成
completed
```

Generated chapter check:

```json
{
  "status": "completed",
  "title": "游戏化设计的正确路径",
  "source": {
    "type": "text",
    "title": "V2 生成链路短文章测试",
    "url": "http://10.130.96.10:5273/v2-smoke-article.html",
    "rawTextLen": 409,
    "blocks": 5
  },
  "unitCount": 3,
  "questionCounts": [4, 3, 5],
  "hasSummaryCard": true,
  "hasChapterSummary": true
}
```

Long article note:

- The earlier WeChat golden article link extracted successfully after the worker fix, but was rejected by the current MVP input cap with `input_too_long`.
- This is expected under the current 6000-character protection policy. For phone tests, use text or a link whose extracted body is under the cap.

## Real Phone Launch

Command:

```bash
xcrun devicectl device process launch \
  --device 00008130-000465522213803A \
  --terminate-existing \
  com.maxhan.shibei.v2.dev \
  -ShibeiV2APIBaseURL http://10.130.96.10:5273
```

Observed result:

```text
Launched application with com.maxhan.shibei.v2.dev bundle identifier.
```

Process check:

```text
/private/var/containers/Bundle/Application/.../拾贝.app/拾贝
```

## Next Manual Test

On the physical phone:

1. Open 拾贝 V2.
2. Go to 上传.
3. Paste a short article URL or text under 6000 Chinese characters.
4. Tap 开始生成.
5. Confirm it opens 正在生成详情页.
6. Confirm the start dialog copy and close behavior.
7. Watch progress text update using user-facing stages, not engineering states.
8. After completion, open the generated chapter.
9. Enter questions, answer at least one multiple-choice and one matching question if present.
10. Open 查看原文 from an answered question, then return and confirm the answer state is preserved.

## Production Replacement Notes

Before replacing the same production service:

- Configure production HTTPS base URL in the iOS build.
- Configure production model key, database, worker process, retry limits, and input length limits.
- Configure APNS if generation success/failure notifications are required.
- Record old service commit, deployment version, and database backup.
- Perform rollback rehearsal from old commit/deployment/database backup.

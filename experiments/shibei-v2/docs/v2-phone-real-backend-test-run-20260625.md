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

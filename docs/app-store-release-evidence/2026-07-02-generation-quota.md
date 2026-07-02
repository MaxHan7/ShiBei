# 2026-07-02 免费每日生成额度证据

## 变更范围

- 新增服务端限额模块：`backend/src/generationQuota.js`
- 新增 Postgres 限额 claim 表和原子 claim 函数：`backend/src/db.js`
- 在 V2 真实生成队列入口接入限额：`backend/src/v2/generation/v2ChapterQueue.js`
- 在 HTTP 错误层返回稳定错误码：`backend/src/server.js`
- 新增/更新测试：
  - `backend/src/tests/generationQuota.test.js`
  - `backend/src/v2/generation/v2ChapterQueue.test.js`
- 将新测试加入日常检查：`backend/package.json`

## 产品规则验证

- 默认每日真实 AI 生成额度：3 篇。
- 额度计算口径：UTC 日期。
- 推荐好文预设章节导入不计入额度：已保持在 `/api/v2/recommended-articles/:id/import`，不经过 V2 真实生成 enqueue。
- URL 格式错误、请求 guard 失败不计入额度：限额在 `enqueueV2ChapterGeneration` 内部、创建 queue job 前执行；请求层拒绝不会进入该函数。
- job 已开始后取消，计入额度：限额 claim 发生在 pending chapter/queue job 创建前，成功 claim 后即视为本次真实生成已使用。
- 已调用模型后失败，首版计入额度：同上，queue job 创建后的失败不回滚额度。
- 并发防绕过：Postgres 使用 `pg_advisory_xact_lock(hashtext(deviceId), hashtext(quotaDay))` 在 device+day 维度串行化 claim。

## 错误码

- 超额：`quota_exceeded_daily_generation`，HTTP `429`
- 限额不可用：`generation_quota_unavailable`，HTTP `503`

用户可见文案：

- 超额：`今天的免费生成次数已经用完，请明天再试。`
- 不可用：`生成额度暂时不可用，请稍后再试。`

## 自动化验证

### Targeted Tests

命令：

```bash
node --test backend/src/tests/generationQuota.test.js backend/src/v2/generation/v2ChapterQueue.test.js
```

结果：通过，`10` tests passed。

覆盖：

- UTC 日期计算。
- 每天前三次允许，第 4 次拒绝。
- 同一 requestId 不重复扣。
- 次日重置。
- V2 enqueue 新请求扣额度。
- 复用 pending job 不重复扣。

### Full Check

命令：

```bash
npm run check
```

结果：通过。

关键结果：

- Backend route contract gate：通过。
- Recommended catalog：`9 published articles`。
- Node test：`204` tests passed。
- Recallo workspace guard：通过。
- iOS production guard：通过。
- V2 UI regression guard：通过。

## 待人工确认

- 首版每日免费真实生成额度是否保持 `3` 篇。如果需要调整，可通过 `RECALLO_DAILY_REAL_GENERATION_LIMIT` 环境变量配置。
- 是否需要在 App 内显式展示“今日剩余次数”。首版当前仅在超额时提示。

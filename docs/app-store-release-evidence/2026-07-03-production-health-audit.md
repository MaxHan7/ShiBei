# 2026-07-03 App Store 生产健康门禁证据

## 背景

App Store / TestFlight 候选包不只需要 iOS 本地检查，也需要确认线上 API 处于可提交状态。为避免提交前漏查 Railway 生产服务，本次新增可执行生产健康门禁。

## 本次新增

- `tools/app-store-production-health-audit.mjs`
- `npm run app-store:health-audit`
- `npm run check:app-store-health`
- `npm run app-store:status` 已纳入生产健康报告。

## 门禁规则

脚本会请求：

```text
https://shibei-production.up.railway.app/api/health
```

并检查：

- HTTP 状态为 200。
- `ok` 为 `true`。
- service 为 `recallo-api`。
- Node 环境为 `production`。
- Railway environment 为 `production`。
- Railway deployment id 已存在。
- storage 为 `postgres`。
- database.ok 为 `true`。
- queue 计数为非负数，且 `failed` 为 0。
- APNs 已配置，environment 为 `production`。
- 推荐好文 catalog 至少 6 篇，filter 为 3-6 个。
- 核心能力开关为 true：
  - `v2ChapterGeneration`
  - `v2ReviewSessions`
  - `favoriteQuestions`
  - `notifications`
  - `sourceAnchors`

## 验证记录

语法检查：

```bash
node --check tools/app-store-production-health-audit.mjs
```

结果：通过。

Report 模式：

```bash
npm run app-store:health-audit
```

结果：通过，输出 `Production health: READY`。

Strict 模式：

```bash
npm run check:app-store-health
```

结果：通过。

总状态：

```bash
npm run app-store:status
```

预期：生产健康报告应显示 PASS；如果未来线上服务挂掉、APNs 环境错误、数据库异常或 catalog 回退，App Store 总状态会阻塞。

## 下一步

每次 Archive / App Store Connect 提交前都运行 strict 模式，并把输出摘要写入当次 `YYYY-MM-DD-production-acceptance.md`。

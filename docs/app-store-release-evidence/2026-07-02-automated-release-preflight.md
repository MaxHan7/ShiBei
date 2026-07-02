# 自动 Release Preflight 记录

日期：2026-07-02

## 执行环境

- 工作区：`/Users/hanmingyu/Downloads/拾贝-prod-hardening`
- Branch：`codex/recallo-review-replay-mode`
- Commit：`7d74e6175a37`

## 自动检查结果

| 检查 | 命令 | 结果 | 备注 |
| --- | --- | --- | --- |
| iOS Release Archive preflight | `npm run check:release-ios` | 通过 | 正确工作区、Recallo display name/product name、生产 bundle id、生产 APNs、V2 Release 入口、生产 API URL 均通过 |
| 全量工程检查 | `npm run check` | 通过 | 204/204 tests passed；workspace guard、iOS production guard、V2 UI regression guard 通过 |
| Production health | `curl https://shibei-production.up.railway.app/api/health` | 通过 | `ok: true`，Postgres、queue、APNs capability 正常 |

## Production health 摘要

- Railway environment：`production`
- Railway deployment id：`51ae3233-4431-471e-9194-a80b5b09a900`
- APNs：已配置，environment 为 `production`
- Queue：`queued=0`，`running=0`，`failed=0`
- Recommended catalog：
  - schema：`recommended_articles_seed_1`
  - article count：9
  - filters：`全部`、`AI`、`产品`、`学习`、`商业`

## 非阻塞 warning

`npm run check:release-ios` 仍提示以下 review visibility warning：

- `Railway`：位于 `拾贝/拾贝/Localizable.xcstrings` 的旧 debug/设置文案。
- `deviceId`：位于 `拾贝/拾贝/Services/APIClient.swift` 的代码符号和 DEBUG 日志。
- `ShibeiUseLegacyRoot`：位于 `拾贝/拾贝/ContentView.swift` 的兼容旧 debug launch argument。

当前结论：

- 这些 warning 不是 Archive 阻塞项。
- 真机验收时仍需确认用户可见路径中不会出现 `Railway`、`deviceId`、旧“拾贝”或旧 debug 文案。

## 仍需用户完成

- 提供支持邮箱、Support URL、Privacy URL。
- 跑真机验收模板并记录结果。
- 准备 App Store 截图。
- 用 Xcode 在正确工作区 Archive 并上传 App Store Connect。

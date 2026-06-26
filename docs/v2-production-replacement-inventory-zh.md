# 拾贝 V2 生产替换只读盘点

更新时间：2026-06-26

## 当前仓库节点

- 当前分支：`codex/shibei-v2-isolated-build`
- 本次盘点基线：候选 PR head（最新提交与 checks 以 PR 为准）
- 最近 checkpoint：
  - `e95bede ci: require rollback evidence for railway deploy`
  - `1098dc4 ci: stabilize guarded railway deploy workflow`
  - `ebc5383 ci: add guarded railway production deploy workflow`
  - `f279e6e ci: add production gate evidence workflow`
  - `9852ccc docs: record latest v2 readiness candidate`
  - `7581069 chore: capture production readiness evidence`
  - `21c2145 docs: record stable v2 readiness ci`
  - `ce65194 fix: split notification layout for ci compiler`

## 当前线上服务

- Production API URL：`https://shibei-production.up.railway.app`
- Health check：`GET /api/health`
- 2026-06-26 只读检查结果：

```json
{
  "ok": true,
  "service": "shibei-api",
  "storage": "postgres",
  "database": { "ok": true },
  "queue": {
    "queued": 0,
    "running": 0,
    "failed": 1,
    "completed": 44
  },
  "apns": {
    "configured": true,
    "environment": "production",
    "bundleId": "com.maxhan.shibei"
  },
  "chapterCount": 41,
  "memoryChapterCount": 41
}
```

结论：

- 线上服务当前可用。
- 线上已经使用 PostgreSQL。
- 线上 APNS 已配置 production，bundle id 是 `com.maxhan.shibei`。
- 线上当前仍未暴露 V2 capability flags；`gate:production` 会在 V2 capability 检查处失败。
- 最近一次无副作用 production gate 复核结果：health/database/queue/APNS 通过，V2 capability flags 失败。
- 替换前必须记录 Railway 当前 deployment id 和数据库备份位置；当前本地没有 Railway CLI 登录态，不能直接确认或触发 Railway 生产部署。

## 当前根目录生产 App

- 项目路径：`拾贝/拾贝.xcodeproj`
- 正式 bundle id：`com.maxhan.shibei`
- 生产 API URL：`https://shibei-production.up.railway.app`
- APNS build setting：
  - Debug：`APS_ENVIRONMENT = development`
  - Release：`APS_ENVIRONMENT = production`

结论：

- 现有生产 App target 是正式用户升级路径。
- 当前 root iOS Debug 已用于 V2 真实数据开发/测试。
- Release 仍暂留旧入口，这是上线前的安全 gate；只有 production backend gate 和手机 E2E 通过后，才允许把 Release 默认入口切到 V2。
- `npm run check:ios-production` 当前通过；Release flip 后必须再运行 `npm run check:ios-production -- --require-v2-release`。

## 当前 V2 实验 App

- 项目路径：`experiments/shibei-v2/ios/拾贝.xcodeproj`
- 实验 bundle id：`com.maxhan.shibei.v2.dev`
- 默认 API：
  - `localBaseURL = http://127.0.0.1:5273`
  - `productionBaseURL = localBaseURL`
- 支持运行时覆盖：
  - launch argument：`-ShibeiV2APIBaseURL`
  - environment：`SHIBEI_V2_API_BASE_URL`

结论：

- V2 实验 App 适合手机本地真后端测试。
- V2 实验 App 不能直接作为正式更新推给旧版用户。
- 正式替换需要把 V2 UI/状态/API 逻辑迁入根目录生产 App target，或者将生产 target 的 bundle id/build setting 切换到 V2 代码。

## 当前后端部署结构

- Railway 配置文件：`railway.json`
- 根目录 backend：
  - `backend/package.json`
  - `npm start` -> `node src/start.js`
  - `npm run build` -> `playwright install --with-deps chromium`
- V2 实验 backend：
  - `experiments/shibei-v2/backend/package.json`
  - `npm start` -> `node src/start.js`
  - `npm run check` 已通过，278 个测试通过。

结论：

- 当前 Railway 默认从根目录部署，不会自动部署 `experiments/shibei-v2/backend`。
- V2 后端能力已经迁入根 `backend`，推荐继续沿用当前 Railway 服务结构，不切换到 `experiments/shibei-v2/backend`。
- 当前替换路径已经明确：把目标 Railway service 部署到当前根 backend commit，而不是更改服务外壳或部署实验 backend。
- 当前本地/PR 已新增 route contract gate：

```bash
npm --prefix backend run gate:routes
```

- route gate 已纳入 `npm --prefix backend run check` 和 root `npm run check`。
- 部署方式必须由有 Railway 权限的人执行或授权：
  1. 如果 Railway service 连接的是 `master` 分支：合并 PR 后自动部署，或在 Railway 面板执行 Deploy Latest Commit。
  2. 如果 Railway service 支持手动部署当前分支/commit：在 Railway 面板选择本 PR/commit 部署。
  3. 如果使用 CLI：需要 Railway 登录态或 `RAILWAY_TOKEN`，再执行 `railway up` 到目标 service。
  4. 如果使用 GitHub Actions：配置仓库 secret `RAILWAY_TOKEN`，手动触发 `V2 Production Railway Deploy`，输入目标 Railway service id、旧 production deployment id、数据库备份引用和确认短语。
- 不论哪种部署方式，部署后先运行无副作用 gate：

```bash
npm --prefix backend run gate:production -- --base-url https://shibei-production.up.railway.app
```

- 只有无副作用 gate 通过后，才允许运行 `--smoke` 或进行手机真实生成测试。

## 已验证的 V2 基线

- Root `npm run check` 通过：
  - backend 175 tests 通过；
  - route contract gate 通过；
  - iOS production guard 通过。
- Root iOS Debug simulator build 通过：

```bash
xcodebuild -project "拾贝/拾贝.xcodeproj" -scheme "拾贝" -destination "generic/platform=iOS Simulator" -configuration Debug CODE_SIGNING_ALLOWED=NO build
```

- Root iOS Release simulator build 通过：

```bash
xcodebuild -project "拾贝/拾贝.xcodeproj" -scheme "拾贝" -destination "generic/platform=iOS Simulator" -configuration Release CODE_SIGNING_ALLOWED=NO build
```

- GitHub Actions `V2 Production Readiness` 最新候选提交验证通过，具体 run 以 PR checks 为准：
  - `https://github.com/MaxHan7/ShiBei/pull/3`
  - 覆盖 root checks、iOS Debug simulator build、iOS Release simulator build。
  - 中间曾暴露 GitHub runner Xcode 16.4 对大 SwiftUI body 的类型检查失败，已通过拆分通知页布局收口。
- 已新增 GitHub Actions 手动证据采集入口：
  - workflow：`V2 Production Gate Evidence`
  - 默认 `smoke=false`，只跑无副作用 readiness gate。
  - gate 通过后可手动改为 `smoke=true`，产出 JSON/Markdown artifact。
- 已新增 guarded Railway production deploy 入口：
  - workflow：`V2 Production Railway Deploy`
  - 部署前必须输入目标 service id、旧 production deployment id、数据库备份引用和回滚确认短语。
  - workflow 会先产出 deployment intent artifact，再执行部署和 production gate。

## 当前生产替换阻塞项

1. **线上 Railway service 未部署到 V2-capable commit**
   - 当前 production health 可用，但缺少 V2 capability flags。
   - 不能运行 production smoke 或把手机 E2E 失败归因给客户端，直到该 gate 通过。

2. **生产数据库备份和恢复路径未记录**
   - 线上是 Postgres。
   - 替换前必须记录备份名称/快照时间和恢复方式。

3. **Release 默认入口尚未切到 V2**
   - 这是故意保留的安全 gate。
   - 只有 backend production gate、smoke、手机 E2E 通过后才允许 flip。

4. **端到端真实路径未完成**
   - 至少需要完成：上传链接/文本 -> 生成中详情页 -> progress -> completed -> 复习 -> 查看原文 -> 返回状态保留 -> 收藏题目 -> 通知/失败处理。

5. **最终签名产物未验证**
   - `xcodebuild -showBuildSettings` 的 Release 配置显示 APNS 为 production，但本地自动签名的 Release `.app` 当前仍是 development profile。
   - 当前已新增 `npm run check:ios-signing -- --app /path/to/拾贝.app`，最终 TestFlight/App Store 导出产物必须通过该检查。

## 下一步

按 `docs/superpowers/plans/2026-06-26-v2-production-launch-standard.md` 和 `docs/v2-production-deploy-runbook-zh.md` 执行：

1. 由有 Railway 权限的操作者记录当前 deployment id、连接分支/autodeploy 行为和 DB 备份/恢复路径。
2. 部署当前 V2-capable root backend commit 到目标 production service。
3. 运行无副作用 production gate。
4. gate 通过后运行 explicit production smoke。
5. 完成手机 E2E。
6. flip Release 默认入口到 V2，并运行 strict iOS production guard。
7. 生成 TestFlight/App Store 导出产物并运行 `check:ios-signing`。

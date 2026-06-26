# 拾贝 V2 生产替换只读盘点

更新时间：2026-06-26

## 当前仓库节点

- 当前分支：`codex/shibei-v2-isolated-build`
- 当前提交：`5d4a7fdf9149597def15a468ff64df13349fdfe1`
- 最近 checkpoint：
  - `5d4a7fd docs: plan v2 production replacement readiness`
  - `ffb2b42 style: continue v2 typography cleanup`
  - `16db5ef style: normalize v2 typography tokens`

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
- 替换前必须记录 Railway 当前 deployment id 和数据库备份位置；本次只读盘点没有拿到 Railway CLI 信息。

## 当前根目录生产 App

- 项目路径：`拾贝/拾贝.xcodeproj`
- 正式 bundle id：`com.maxhan.shibei`
- 生产 API URL：`https://shibei-production.up.railway.app`
- APNS build setting：
  - Debug：`APS_ENVIRONMENT = development`
  - Release：`APS_ENVIRONMENT = production`

结论：

- 现有生产 App target 是正式用户升级路径。
- V2 如果要直接替换 TestFlight/App Store 旧版，不能继续只使用 `com.maxhan.shibei.v2.dev`。

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
- 替换路径必须二选一：
  1. 把 V2 后端能力迁入根 `backend`，沿用当前 Railway 服务结构。
  2. 修改 Railway 的 build/start 路径，让同一个 service 改跑 V2 backend。
- 推荐优先评估方案 1，因为它更符合“替换同一个 service，同时尽量不改变部署外壳”的原则。

## 已验证的 V2 基线

- `npm --prefix experiments/shibei-v2/backend run check` 通过。
- `xcodebuild -project experiments/shibei-v2/ios/拾贝.xcodeproj -scheme 拾贝 -destination 'platform=iOS Simulator,name=iPhone 17' build` 通过。
- 物理手机此前可安装 V2 dev App，并通过 launch argument 指向局域网后端。

## 当前生产替换阻塞项

1. **前端正式 target 未切换**
   - V2 仍在 dev bundle。
   - 正式用户升级必须使用 `com.maxhan.shibei`。

2. **V2 production URL 未切换**
   - V2 实验 App 仍默认本地 URL。
   - Release 版本必须默认 HTTPS production URL。

3. **后端替换路径未决**
   - 需要决定 V2 后端是迁入根 `backend`，还是调整 Railway 同服务启动路径。

4. **生产数据库备份和迁移演练未完成**
   - 线上是 Postgres，替换前必须有备份和恢复路径。

5. **Release mock/fixture 边界未完成总审**
   - V2 Debug 有 mock/real 切换。
   - Release 必须默认真实 cloud API，并隐藏开发态入口。

6. **端到端真实路径未完成**
   - 至少需要完成：上传链接/文本 -> 生成中详情页 -> progress -> completed -> 复习 -> 查看原文 -> 返回状态保留。

## 下一步

按 `docs/superpowers/plans/2026-06-26-v2-production-replacement-readiness.md` 执行：

1. 完成 Checkpoint 1：补齐 Railway deployment id、生产 env key 清单、数据库备份方式。
2. 决定 backend replacement path。
3. 决定 frontend replacement path。
4. 再开始改 root production backend / root production iOS target。


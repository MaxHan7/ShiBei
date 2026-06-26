# 拾贝 V2 生产替换路径决策

更新时间：2026-06-26

## 决策结论

### 后端推荐路径

推荐采用：**把 V2 后端能力迁入根目录 `backend`，继续沿用当前 Railway production service 的部署外壳。**

原因：

- 当前 `railway.json` 在仓库根目录，Railway production service 默认执行根目录 `npm run build` 和 `npm start`。
- 根目录 `backend/src` 与 `experiments/shibei-v2/backend/src` 的主要差异是 V2 新增了 `src/v2/**`，并改动了若干共享文件：
  - `apns.js`
  - `db.js`
  - `generation/openaiClient.js`
  - `generationJobRunner.js`
  - `server.js`
  - `start.js`
  - queue/review session tests
- V2 后端不是完全独立的一套部署形态，而是在旧后端基础上扩展了 V2 合同、V2 prompt pipeline、V2 queue runner、V2 review session 和 V2 serialization。
- 保留根目录部署外壳可以降低 Railway 配置、healthcheck、production service 绑定和旧回滚路径的变化量。

不推荐直接把 Railway 同服务改成 `experiments/shibei-v2/backend` 启动路径作为第一选择。

原因：

- 这会同时改变部署路径、package 路径、working directory 和生产入口，风险集中。
- 生产根目录已有 `railway.json`、root backend 和 root iOS App 的历史上下文，直接换工作目录会让回滚和排查更绕。
- V2 实验 backend 的 README 明确是隔离开发目录；上线替换时应把成熟能力合入正式路径，而不是让实验目录长期承担 production 入口。

### 前端推荐路径

推荐采用：**把 V2 iOS UI/状态/API 逻辑迁入根目录生产 App target，继续使用正式 bundle id `com.maxhan.shibei`。**

原因：

- 当前根目录生产 App：
  - bundle id 是 `com.maxhan.shibei`
  - Release API URL 是 `https://shibei-production.up.railway.app`
  - APNS Release 环境是 `production`
- 当前 V2 实验 App：
  - bundle id 是 `com.maxhan.shibei.v2.dev`
  - 默认 API 是 `http://127.0.0.1:5273`
  - 适合本地/手机真后端测试，但不能作为旧版用户的正式更新。
- 旧版用户通过 App Store/TestFlight 更新时，需要同一个 bundle id。用 dev bundle 会变成另一款 App，不能替换旧版用户手里的 App。

不推荐把生产 bundle id 直接改到实验 project 里作为第一选择。

原因：

- 实验 project 里还有 mock/real 切换、局域网测试、debug fixture 和 V2 dev signing 的历史配置。
- 直接改实验 project 更容易把开发态入口、localhost 或 fixture 状态带进 Release。
- 根目录生产 project 已经有 production URL、production APNS、App Store 关联的配置，应以它作为正式壳。

## 后端迁入范围

第一批后端迁入应该只迁 production 必需能力：

1. `src/v2/**`
2. V2 route：
   - `POST /api/v2/chapters`
   - `GET /api/v2/chapters/:id/review-session`
   - `POST /api/v2/chapters/:id/review-session`
   - `POST /api/v2/review-sessions/:id/advance`
   - `POST /api/v2/review-sessions/:id/answer`
   - `POST /api/v2/review-sessions/:id/feedback-visibility`
   - `POST /api/v2/review-sessions/:id/source-open`
   - `POST /api/v2/review-sessions/:id/source-return`
3. V2 queue:
   - V2 idempotency key
   - V2 pending chapter creation
   - V2 worker job type
   - V2 progress update
   - V2 completion/failure notification
4. Shared database extensions:
   - `generation_jobs` V2 job types
   - V2 review session payload support
   - favorite questions support, if root backend does not already match V2
5. Shared runtime:
   - model caller changes used by V2
   - generation failure taxonomy used by V2
   - input limit guard used by V2

不要在第一批迁入：

- V2 quality experiment artifacts。
- V2 prompt-system HTML reports。
- 本地质量 run 产物。
- dev-only scripts that are not needed by production runtime, except smoke/preflight scripts if useful for release validation。

## 前端迁入范围

第一批前端迁入应该以“生产 App 壳 + V2 页面/状态”为目标：

1. V2 design system and components:
   - `V2/DesignSystem`
   - `V2/Components`
2. V2 screens:
   - home
   - upload
   - all chapters
   - chapter detail
   - generating detail
   - review flow
   - notes
   - notifications
   - profile
   - source reading
3. V2 models:
   - backend DTOs
   - review flow state models
   - UI state models
4. V2 assets:
   - V2 SVG assets and image sets
5. V2 API additions:
   - `createV2Chapter`
   - `fetchV2Chapter`
   - V2 review session endpoints
   - V2 progress mapping

必须保留或重新确认：

- `PRODUCT_BUNDLE_IDENTIFIER = com.maxhan.shibei`
- `APIClient.productionBaseURL = https://shibei-production.up.railway.app`
- Release 默认 cloud API。
- Release 不显示 mock runtime card。
- Debug 可以继续使用 local URL / launch argument 做本地测试。

## 替换前验证顺序

1. 在根 `backend` 合入 V2 后，运行：

   ```bash
   npm --prefix backend run check
   ```

2. 用非生产 DB 启动根 backend，跑 V2 queue smoke。
3. 在根生产 App target 合入 V2 前端后，运行：

   ```bash
   xcodebuild -project 拾贝/拾贝.xcodeproj -scheme 拾贝 -destination 'platform=iOS Simulator,name=iPhone 17' build
   ```

4. 用 Debug launch argument 指向本地根 backend，跑手机端到端。
5. 用 HTTPS 测试后端跑手机端到端。
6. 再进入 Railway production replacement gate。

## 当前不确定项

- Railway CLI 当前环境未检测到可用命令，因此 deployment id 还没有从 CLI 拉取。
- 生产环境变量只记录了代码需要的 key 名称，尚未从 Railway 读取真实配置清单。
- 生产数据库备份命令和恢复命令尚未记录。

这些不确定项必须在正式替换前补齐；它们不阻塞本地合入准备，但阻塞真正 deploy。


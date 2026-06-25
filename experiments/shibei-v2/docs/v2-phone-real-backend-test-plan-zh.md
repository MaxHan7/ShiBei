# 拾贝 V2 真机真实后端联调计划

## Goal

让 V2 App 可以安装到 iPhone 真机，连接真实后端生成链路，完成“上传内容 -> 后端排队生成 -> 前端展示生成进度 -> 生成完成后进入章节复习”的完整测试。

这个目标不是临时雏形。真机测试通过后，才进入服务器替换准备；替换前必须保留旧版回滚点和数据库备份。

## Architecture

开发期继续使用 `experiments/shibei-v2/` 隔离目录。iOS 端通过可配置的 API base URL 连接本地 Mac 后端或未来测试服务；后端通过持久化队列、worker、进度字段和失败通知支撑长任务生成。

设计原则：

- 真机本地测试用 Mac 局域网 IP，例如 `http://192.168.x.x:5273`。
- Simulator 测试用 `http://127.0.0.1:5273`。
- 本地 HTTP 只使用 iOS 的 local networking 例外，不打开全局 arbitrary loads。
- 生成进度前端只展示用户能理解的文案，例如“正在提取原文”“正在总结知识点”“正在为单元 2 生成题目”。
- 后端内部状态如 `queued/running/retrying` 只用于工程调试，不直接展示给用户。

## Checkpoint 0：保存当前可回溯点

**目的**：在继续真机联调前，保存当前已经通过的后端队列和 iOS 构建状态。

**当前已验证**：

- `POST /api/v2/chapters` 可以创建 V2 生成任务。
- worker 可以消费任务并持久化 `generationProgress`。
- `retry-once` smoke 可以先失败再重试成功。
- `/api/chapters/:id` 已补充返回 V2 `summaryCard / units / chapterSummary / source.blocks`。
- iOS 已新增 V2 DTO 和 mapper，可以把后端 V2 chapter 转成 `V2ReviewChapterData`。

**验证命令**：

```bash
npm --prefix experiments/shibei-v2/backend run check
xcodebuild -project experiments/shibei-v2/ios/拾贝.xcodeproj -scheme 拾贝 -destination 'platform=iOS Simulator,name=iPhone 17' build
```

## Checkpoint 1：真机本地网络配置

**目标**：iPhone 连接 Mac 上的本地后端时，不被 iOS ATS 或 local network privacy 卡住。

**实现点**：

- iOS Debug 配置允许 local networking HTTP。
- 增加 local network usage description，说明 App 会连接同一局域网内的本地开发后端。
- 保留 `-ShibeiV2APIBaseURL` launch argument 和 `SHIBEI_V2_API_BASE_URL` 环境变量。
- 真机测试时使用 Mac 局域网 IP，不使用 `127.0.0.1`。

**验收**：

- Simulator 仍可使用 `http://127.0.0.1:5273`。
- 真机可使用 `http://<Mac局域网IP>:5273`。
- 首次访问本地网络如出现系统权限弹窗，文案清楚，不让用户困惑。

## Checkpoint 2：前端生成状态完善

**目标**：真实生成任务在 App 内有完整、可理解、可恢复的展示。

**实现点**：

- 上传页点击“开始生成”后调用 `/api/v2/chapters`。
- 直接跳转到“正在生成详情页”。
- 显示生成开始弹窗。
- 弹窗关闭后继续停留在正在生成详情页。
- 全部章节页也出现正在生成中的章节卡片。
- 轮询 `/api/chapters/:id` 更新：
  - 生成详情页进度条。
  - 生成详情页状态文案。
  - 全部章节页生成中卡片文案。
- 生成完成后：
  - 后端返回的 `units/questions` 转为 `V2ReviewChapterData`。
  - 章节详情页和复习流使用真实数据。
- 生成失败后：
  - 保留失败状态和用户可理解的失败文案。
  - 后续接通知失败详情页。

**注意事项**：

- 轮询只在生成未完成时运行。
- App 切后台或离开页面后，不应产生重复任务。
- 同一上传动作使用 `clientRequestId` 防止重复创建。
- UI 不能展示 `queued/running/retrying` 这类工程状态。

## Checkpoint 3：后端队列和失败策略复核

**目标**：真实用户测试前，确认后台任务不会因为重试、重复点击或模型失败导致脏数据。

**检查项**：

- Idempotency：相同 `clientRequestId` 不重复创建同一任务。
- Retry：结构化输出失败等可恢复错误只按限制重试，不无限重试。
- Poison message：达到最大重试次数后写入 failed chapter 和 failure notification。
- Progress persistence：每个阶段更新 `generationProgress`，App 可轮询恢复。
- Input limit：当前 MVP 先限制 6000 字以内，避免 token 成本失控。

**验证命令**：

```bash
npm --prefix experiments/shibei-v2/backend run smoke:v2:queue -- --mode success
npm --prefix experiments/shibei-v2/backend run smoke:v2:queue -- --mode retry-once
npm --prefix experiments/shibei-v2/backend run smoke:v2:queue -- --mode permanent-failure
```

## Checkpoint 4：真机安装测试

**目标**：把 V2 App 安装到手机，通过本地 Mac 后端跑完整流程。

**本地后端启动**：

```bash
# 1. 查 Mac 在当前 Wi-Fi 下的局域网 IP。
ipconfig getifaddr en0

# 2. 启动 V2 backend server。
npm --prefix experiments/shibei-v2/backend run dev

# 3. 另开一个终端启动 worker。
npm --prefix experiments/shibei-v2/backend run worker

# 4. 用手机能访问的地址检查健康状态。
curl http://<Mac局域网IP>:5273/api/health

# 5. 跑真机联调前置检查。
npm --prefix experiments/shibei-v2/backend run preflight:phone -- \
  --ip <Mac局域网IP> \
  --device-id 00008130-000465522213803A
```

**模型 key 配置原则**：

- 不把 `DEEPSEEK_API_KEY` 写进 Git 仓库。
- 本地测试可以使用当前终端临时环境变量，或使用已经被 `.gitignore` 排除的本机 `experiments/shibei-v2/backend/.env`。
- 后端 `src/env.js` 会在 server 和 worker 启动时读取 `experiments/shibei-v2/backend/.env`。
- 提交前必须确认 `git status --short` 没有出现包含 key 的文件。
- `preflight:phone` 只输出环境变量名，不输出 key 值。

**Xcode 真机配置**：

1. 打开 `experiments/shibei-v2/ios/拾贝.xcodeproj`。
2. 选择连接的数据线 iPhone 设备。
3. `Product -> Scheme -> Edit Scheme -> Run -> Arguments` 增加：

```text
-ShibeiV2APIBaseURL
http://<Mac局域网IP>:5273
```

4. 首次运行时，如果 iOS 弹出“本地网络”权限弹窗，允许访问。
5. 如果之前点了拒绝，到 iOS 设置里找到拾贝 V2，打开“本地网络”权限。

**命令行真机构建 / 安装 / 启动**：

当前已验证的在线设备：

```text
设备名：煎的正好的咸鱼
设备 ID：00008130-000465522213803A
Bundle ID：com.maxhan.shibei.v2.dev
```

```bash
# 构建真机 Debug app。
xcodebuild \
  -project experiments/shibei-v2/ios/拾贝.xcodeproj \
  -scheme 拾贝 \
  -destination 'id=00008130-000465522213803A' \
  -configuration Debug \
  -allowProvisioningUpdates \
  build

# 安装到真机。
xcrun devicectl device install app \
  --device 00008130-000465522213803A \
  ~/Library/Developer/Xcode/DerivedData/拾贝-apnutwyxjhdpzlexlxqewbploaso/Build/Products/Debug-iphoneos/拾贝.app

# 用本地真实后端地址启动。
xcrun devicectl device process launch \
  --device 00008130-000465522213803A \
  --terminate-existing \
  com.maxhan.shibei.v2.dev \
  -ShibeiV2APIBaseURL http://<Mac局域网IP>:5273
```

**步骤**：

1. 确认手机和 Mac 在同一 Wi-Fi。
2. 查询 Mac 局域网 IP。
3. 启动后端 server 和 worker。
4. Xcode 选择真机设备运行 V2 App。
5. 给 App 配置 `-ShibeiV2APIBaseURL http://<Mac局域网IP>:5273`。
6. 在上传页粘贴文章链接或正文。
7. 点击“开始生成”。
8. 检查正在生成详情页是否显示真实进度。
9. 生成完成后进入章节详情和题目流。
10. 测试失败场景和重试场景。

**验收标准**：

- App 能从真机请求 `http://<Mac局域网IP>:5273/api/health` 对应的后端。
- 上传页输入为空时不创建任务，并显示用户可理解提示。
- 点击“开始生成”后进入正在生成详情页。
- 生成开始弹窗关闭后，仍停留在正在生成详情页。
- 生成详情页进度条和文案随后端 `generationProgress` 更新。
- 全部章节页出现对应的生成中章节卡片。
- 后端完成后，生成中章节转为真实章节数据，章节详情页、查看原文和复习题流使用真实后端内容。
- 失败时展示用户可理解的失败文案，后续可进入失败通知详情。

## Checkpoint 5：服务器替换前验收

**目标**：真机本地测试通过后，准备把 V2 后端替换同一个线上 service。

**必须完成**：

- 记录旧版 commit、部署版本、数据库备份位置。
- V2 backend 在正式 service 路径跑通。
- 线上环境变量配置完成：模型 key、数据库、APNS、输入长度限制、worker 并发、重试次数。
- V2 iOS build 指向正式 service HTTPS 地址。
- 完成最小回滚演练：旧 commit / 旧部署 / 数据库备份可恢复。

**不做**：

- 不长期维护 V1/V2 双 service。
- 不在未完成真机联调前直接替换线上 service。

## Current Risks

- 真机 HTTP 访问 Mac 局域网需要 ATS local networking 配置。
- 如果真机不弹 local network 权限或权限被拒，需要到 iOS 设置里检查本 App 的“本地网络”开关。
- 当前 iOS 已能映射 V2 chapter，但真实复习进度持久化仍主要沿用 fixture 状态；后续需要把 review session 也接到 V2 后端状态。
- 服务器替换前必须把本地 HTTP 切成生产 HTTPS。

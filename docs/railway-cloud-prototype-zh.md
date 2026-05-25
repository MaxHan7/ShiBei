# Railway 云端原型部署说明

这份说明用于第一版真机真实生成验证。目标是把当前 Node 后端部署成公网 HTTPS API，让 iPhone App 不再依赖 Mac 本地的 `127.0.0.1`。

## 当前边界

- 这是开发/真机验证用云端原型，不是正式 App Store 生产后端。
- 后端在 Railway 上使用 PostgreSQL 持久化章节、通知、生成任务和复习会话；本地没有 `DATABASE_URL` 时仍使用内存模式。
- 第一版不做账号、鉴权或正式异步任务队列，数据先按匿名设备 ID 隔离；外部 TestFlight 前会使用 APNs 发送生成完成/失败通知。
- iOS 不保存模型 API Key，也不直接调用大模型；生成逻辑只在服务端运行。

## Railway 项目设置

1. 在 Railway 新建项目，并连接当前仓库。
2. 项目 Root Directory 选择 `backend/`。
3. Build 使用仓库根目录 `npm run build`，该命令会安装 `backend/` 依赖并下载 Playwright Chromium。
4. Start Command 使用：

```bash
npm start
```

5. 在 Railway 项目里添加 PostgreSQL 服务，并确认后端服务能读取到 `DATABASE_URL`。
6. 环境变量至少配置一个模型 Key：

```bash
DATABASE_URL=Railway 自动注入或引用的 PostgreSQL 连接串
DEEPSEEK_API_KEY=你的 DeepSeek Key
# 或
OPENAI_API_KEY=你的 OpenAI Key
```

可选环境变量：

```bash
AI_PROVIDER=deepseek
DEEPSEEK_MODEL=deepseek-v4-flash
OPENAI_MODEL=gpt-4.1-mini
MODEL_REQUEST_TIMEOUT_MS=90000
GENERATION_JOB_TIMEOUT_MS=360000
ARTICLE_FETCH_TIMEOUT_MS=30000
WECHAT_EXTRACT_TIMEOUT_MS=60000
APNS_TEAM_ID=你的 Apple Developer Team ID
APNS_KEY_ID=你的 APNs Auth Key ID
APNS_BUNDLE_ID=com.maxhan.shibei
APNS_PRIVATE_KEY_BASE64=.p8 文件内容的 base64
APNS_ENV=production
```

`.p8` 文件可用 `base64 -i AuthKey_XXXXXXXXXX.p8 | tr -d '\n'` 转成 `APNS_PRIVATE_KEY_BASE64`。

Railway 会自动注入 `PORT`，后端会监听 `0.0.0.0:$PORT`。本地开发仍可继续使用 `npm --prefix backend run dev`。

如果部署日志里出现 Playwright/Chromium 缺失，请确认 Railway 使用的是最新提交，并且 build command 是根目录的 `npm run build`。

## 部署后验证

部署完成后，打开 Railway 生成的公网域名，先检查健康接口：

```bash
curl https://你的域名.up.railway.app/api/health
```

预期返回：

```json
{
  "ok": true,
  "service": "shibei-api",
  "storage": "postgres",
  "database": { "ok": true },
  "apns": { "configured": true },
  "chapterCount": 0
}
```

APNs 相关环境变量未配置时，`apns.configured` 会是 `false`。这不会影响章节生成和 App 内通知，但真机不会收到系统通知。

真机通知诊断接口：

```bash
curl https://你的域名.up.railway.app/api/devices/push-status \
  -H 'X-Device-Id: 你的匿名设备 ID'
```

预期至少能看到：

- `pushTokenCount > 0`：说明 App 已经把当前设备 token 上传到云端。
- `pushTokens[].environment`：Debug 安装应为 `sandbox`，TestFlight / App Store 应为 `production`。
- `recentNotifications[].pushDeliveryStatus`：最近通知的 APNs 发送状态。
- `recentNotifications[].pushDeliveryError`：Apple 返回的错误，例如 `BadDeviceToken` 或 `BadEnvironmentKeyInToken`。

如果 `/api/health` 显示 `apns.configured: true`，但 `pushTokenCount` 为 0，优先检查 iOS 是否已经授权通知并重新打开过 App。iOS 会在首次授权后、App 回到前台后、提交云端生成前后同步 token。

再用一段足够长的文本验证真实生成。创建接口会先返回 `submitted`，后台继续生成：

```bash
curl -X POST https://你的域名.up.railway.app/api/chapters \
  -H 'content-type: application/json' \
  -H 'X-Device-Id: test-device-1' \
  -d '{"sourceType":"text","rawText":"这里放一段至少数百字、适合提炼知识点的真实中文文章或笔记。"}'
```

成功标准：

- 创建接口立即返回 `status: "submitted"` 和 `chapter.id`。
- 轮询 `GET /api/chapters/:id` 时，`generationMeta.currentStage` 会从 `submitted` 前进到 `generating_points`、`generating_questions`、`quality_checking` 等阶段。
- 最终返回 `status: "completed"`，且 `chapter.knowledgePoints.length > 1`、`chapter.questions.length > 1`。
- 如果生成超时、文章提取失败或模型返回不可用，最终会进入明确失败态并写入 `failureReason`，不会永久停在 `submitted`。
- 重新部署 Railway 后，用同一个 `X-Device-Id` 再请求 `GET /api/chapters`，之前的章节仍应存在。
- 换另一个 `X-Device-Id` 请求 `GET /api/chapters`，不应看到第一个设备的章节。

如果缺少模型 Key，接口应返回可理解错误；不要把 Key 写进代码、文档或提交记录。

## iOS 真机连接

1. 用 Xcode 安装 App 到手机。
2. 打开“我的”页。
3. 在 DEBUG 的“数据源”区域，将 Railway 域名填入 `Railway 云端 API` 输入框，例如：

```text
https://你的域名.up.railway.app
```

4. 点击“保存云端地址”。
5. 点击“读取云端 API”。
6. 回到“添加”页，粘贴长文本并开始生成。

如果数据源显示“Railway 云端”，添加内容会走云端真实生成；如果仍显示“Mock 数据”，生成会是本地 mock，通常会瞬间完成且只有示例知识点和题目。

DEBUG 版本会在“我的”页显示匿名设备 ID 后 6 位。这个 ID 保存在 Keychain 中，卸载重装或点“重置”后可能变化；设备 ID 变化后，云端会把它当成一个新的匿名用户。

Release / TestFlight 版本不会显示本地 API、Mock 或 Railway 地址输入框，默认连接生产云端域名。

# Railway 云端原型部署说明

这份说明用于第一版真机真实生成验证。目标是把当前 Node 后端部署成公网 HTTPS API，让 iPhone App 不再依赖 Mac 本地的 `127.0.0.1`。

## 当前边界

- 这是开发/真机验证用云端原型，不是正式 App Store 生产后端。
- 后端仍使用内存存储，Railway 服务重启、重新部署或实例切换后，章节、通知和复习会话可能丢失。
- 第一版不做账号、鉴权、PostgreSQL、APNs 或异步任务队列。
- iOS 不保存模型 API Key，也不直接调用大模型；生成逻辑只在服务端运行。

## Railway 项目设置

1. 在 Railway 新建项目，并连接当前仓库。
2. 项目 Root Directory 选择 `backend/`。
3. Build 使用仓库根目录 `npm run build`，该命令会安装 `backend/` 依赖并下载 Playwright Chromium。
4. Start Command 使用：

```bash
npm start
```

5. 环境变量至少配置一个模型 Key：

```bash
DEEPSEEK_API_KEY=你的 DeepSeek Key
# 或
OPENAI_API_KEY=你的 OpenAI Key
```

可选环境变量：

```bash
AI_PROVIDER=deepseek
DEEPSEEK_MODEL=deepseek-v4-flash
OPENAI_MODEL=gpt-4.1-mini
```

Railway 会自动注入 `PORT`，后端会监听 `0.0.0.0:$PORT`。本地开发仍可继续使用 `npm --prefix backend run dev`。

如果部署日志里出现 Playwright/Chromium 缺失，请确认 Railway 使用的是最新提交，并且 build command 是根目录的 `npm run build`。

## 部署后验证

部署完成后，打开 Railway 生成的公网域名，先检查健康接口：

```bash
curl https://你的域名.up.railway.app/api/health
```

预期返回：

```json
{ "ok": true, "service": "shibei-api" }
```

再用一段足够长的文本验证真实生成：

```bash
curl -X POST https://你的域名.up.railway.app/api/chapters \
  -H 'content-type: application/json' \
  -d '{"sourceType":"text","rawText":"这里放一段至少数百字、适合提炼知识点的真实中文文章或笔记。"}'
```

成功标准：

- 返回 `status: "completed"`。
- `chapter.knowledgePoints.length > 1`。
- `chapter.questions.length > 1`。

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

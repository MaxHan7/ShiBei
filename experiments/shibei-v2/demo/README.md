# 拾贝真实体验 Demo

这是一个本地静态 HTML Demo，用于快速测试“粘贴真实内容 -> 生成知识点和题目 -> 做题 -> 看解释 -> 章节总结”的核心体验。

## 使用方式

现在 Demo 已接入真实后端生成接口。推荐先启动后端，再用浏览器打开本地地址：

```text
cd backend
set DEEPSEEK_API_KEY=你的 DeepSeek Key
set DEEPSEEK_MODEL=deepseek-v4-flash
npm.cmd run dev
```

如果要改用 OpenAI，也可以设置 `OPENAI_API_KEY` 和 `OPENAI_MODEL`。

然后打开：

```text
http://127.0.0.1:5273/index.html
```

内部成本计算工作台：

```text
http://127.0.0.1:5273/cost-calculator.html
```

成本工作台只调用 `POST /api/cost-runs`，用于查看单篇章节的模型 usage、估算成本、实际成本和误差率；它不保存章节、不创建通知、不进入复习队列，也不作为 iOS App 功能。生产环境默认关闭，需要显式设置 `ENABLE_COST_WORKBENCH=1` 才开放。

如果直接用 `file:///.../demo/index.html` 打开，也可以访问页面；但真实生成需要后端运行在 `http://127.0.0.1:5273`。

建议测试路径：

1. 首页空状态。
2. 点击底部中间 `+ 添加`。
3. 粘贴一段真实文章、笔记或产品理论内容，也可以点击“填入示例内容”。
4. 点击“开始生成”。
5. 关闭首页提交成功浮窗。
6. 点击“继续复习”。
7. 答题，或点击“不知道”进入解释页。
8. 在解释页点击“题目有问题”，测试反馈弹窗。
9. 点击“下一题”，直到进入章节总结。

## 当前生成方式

当前版本通过后端 `POST /api/generate` 调用核心出题系统。核心出题系统会按 PRD 流程执行内容清洗、语义分块、知识点提取、题目生成、质量检查和一次自动重写。

当前 Demo 已支持多章节本地状态、每个章节独立复习进度、生成成功/失败通知、失败章节详情、重新生成、不再提示、章节删除和章节总结后继续下一章。这些能力用于验证产品流，后续迁移到 iOS 时应按 PRD 和 Demo 行为重新用 SwiftUI 实现，而不是直接复用 HTML/CSS。

接口：

```text
POST /api/generate
```

请求：

```json
{
  "sourceType": "text",
  "rawText": "用户粘贴的真实内容"
}
```

返回章节标题、知识点、题目、解释、常见误区、来源片段和质量评分。

## 当前本地 API 雏形

除了 Demo 主要使用的 `/api/generate` 和 `/api/regenerate`，后端还保留了一组内存版章节/通知接口，用于提前对齐未来 iOS Service 层的数据形状：

```text
POST /api/cost-runs
POST /api/chapters
GET /api/chapters
GET /api/chapters/:id
POST /api/chapters/:id/regenerate
DELETE /api/chapters/:id
GET /api/notifications
POST /api/notifications/:id/read
POST /api/notifications/:id/dismiss
```

`/api/cost-runs` 是内部成本工作台接口，不属于 iOS 主接口。其余章节、通知和复习接口暂不接数据库、不做账号和鉴权，数据重启后会丢失。真实 iOS MVP 后续需要接账号、数据库、异步生成任务和 APNs 推送。

## 当前限制

这个 Demo 只用于迁移前验证真实体验，不是正式 iOS 架构：

- 没有账号系统，数据只保存在本地浏览器或本地内存。
- 没有数据库，后端内存 API 重启后数据会丢失。
- 没有真实系统推送，通知页只是本地产品流模拟。
- 成本工作台是内部调试工具，结果不会发给 iOS 主接口。
- 文章链接提取是轻量方案；公众号抓取依赖 Playwright 和平台限制，不能保证成功。
- 视频链接目前只识别并返回友好失败，不提取字幕或转写。
- 复习记录和掌握分只用于 Demo 当前本地会话，不支持跨设备同步。
- HTML/CSS 只作为交互和视觉参考，迁移到 iOS 时应使用 SwiftUI 重新实现。

## MacBook / Xcode 迁移说明

如果要把项目迁移到 MacBook 并在 Xcode 中继续开发，请先阅读：

```text
docs/macbook-xcode-migration-handoff-zh.md
```

该文档是迁移交接总入口，说明了当前项目进度、运行方式、核心系统状态、未完成事项和 Xcode 迁移建议。

## iOS 接口契约

迁移到 Xcode 前，接口和数据结构已单独收口到：

```text
docs/ios-api-data-contract-zh.md
```

后续 iOS 开发应优先按这份文档定义 Swift `Codable` 模型和 Service 层。`/api/chapters` 是未来 iOS 主入口；`/api/generate` 和 `/api/regenerate` 只作为当前 HTML Demo 与调试兼容入口保留。

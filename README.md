# 拾贝项目交接入口

拾贝是一款面向碎片知识的 AI 复习 iOS App。用户把日常看到的文字、文章链接或未来的视频链接添加进来，系统自动提取知识点、生成测试题，用户像背单词一样随时刷题复习。

## 当前状态

当前仓库还没有真实 Xcode 工程。现在已有：

- HTML Demo：验证首页、添加、章节、通知、题卡、解释页、总结页等完整产品流。
- Node 后端原型：提供本地 API、文章链接输入层和核心出题系统。
- 核心出题系统：完成内容清洗、知识点提取、题目生成、质量检查、单题重写和测试集入口。
- 质量测试集：保存真实样本、人工样本和关键 baseline 结果。
- iOS 迁移文档：收口了 SwiftUI 第一轮开发建议和 API / 数据模型契约。

## 推荐阅读顺序

1. `README.md`：当前总入口。
2. `docs/macbook-xcode-migration-handoff-zh.md`：项目交接总说明。
3. `docs/ios-api-data-contract-zh.md`：iOS 数据模型和 API 契约。
4. `docs/xcode-first-sprint-plan-zh.md`：Xcode 第一轮开发准备计划。
5. `tasks/prd-ai-knowledge-review-ios.md`：完整 PRD。
6. `demo/README.md`：HTML Demo 运行方式。
7. `quality-test-set/README.md`：题目质量测试集说明。

## 当前目录结构

```text
backend/           Node 后端、本地 API、核心出题系统
demo/              HTML 真实体验 Demo
docs/              迁移文档、API 契约、Xcode 首轮计划、fixture
quality-test-set/  真实样本、人工样本、质量测试结果
tasks/             PRD
tools/             可选辅助工具
articles/          临时抓取文章存放区
```

## 本地运行

Windows PowerShell：

```powershell
cd backend
$env:DEEPSEEK_API_KEY="你的 DeepSeek Key"
$env:DEEPSEEK_MODEL="deepseek-v4-flash"
npm.cmd run dev
```

打开：

```text
http://127.0.0.1:5173/index.html
```

检查：

```powershell
cd backend
npm.cmd run check
cd ..
node --check demo/app.js
```

质量测试：

```powershell
npm.cmd --prefix backend run quality:test
```

## 下一步建议

迁移到 MacBook 后，先不要直接做账号、数据库、APNs 或生产后端。建议第一轮：

1. 在 `ios/ShiBei/` 创建 SwiftUI 工程。
2. 按 `docs/ios-api-data-contract-zh.md` 定义 Swift `Codable` 模型。
3. 用 `docs/fixtures/ios/` 的 mock JSON 实现完整页面流。
4. 跑通首页、添加、章节、通知、题卡、解释页、总结页和来源页。
5. 再接本地 Node API。

HTML Demo 是行为参考，不是 iOS 架构参考。iOS 端应使用 SwiftUI 重新实现。

## 注意

- 不要把 API Key 写入文档、代码或提交记录。
- 当前本地 API 不接数据库，重启后内存数据会丢失。
- 公众号抓取受平台限制，失败时应允许用户改为粘贴正文。
- 视频链接目前只识别并友好失败，不提取视频正文。

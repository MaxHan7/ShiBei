# Recallo 项目交接入口

Recallo 是一款面向碎片知识的 AI 复习 iOS App。用户把日常看到的文字、文章链接或未来的视频链接添加进来，系统自动提取知识点、生成测试题，用户像背单词一样随时刷题复习。

## 当前状态

当前仓库已有 SwiftUI 工程、HTML Demo 和 Railway 云端原型。现在已有：

- HTML Demo：验证首页、添加、章节、通知、题卡、解释页、总结页等完整产品流。
- Node 后端原型：提供本地 API、文章链接输入层和核心出题系统。
- Railway 云端后端：可用 PostgreSQL 按匿名设备 ID 持久化章节、通知、生成任务和复习状态。
- 核心出题系统：完成内容清洗、知识点提取、题目生成、质量检查、单题重写和测试集入口。
- 成本计算工作台：内部 HTML 页面按单篇章节对比模型 token 估算、provider 实际 usage 和成本误差，不进入 iOS App 主接口。
- 质量测试集：保存真实样本、人工样本和关键 baseline 结果。
- iOS 迁移文档：收口了 SwiftUI 第一轮开发建议和 API / 数据模型契约。

## 推荐阅读顺序

1. `README.md`：当前总入口。
2. `docs/macbook-xcode-migration-handoff-zh.md`：项目交接总说明。
3. `docs/ios-api-data-contract-zh.md`：iOS 数据模型和 API 契约。
4. `docs/xcode-first-sprint-plan-zh.md`：Xcode 第一轮开发准备计划。
5. `docs/railway-cloud-prototype-zh.md`：Railway 云端原型部署和验证说明。
6. `docs/production-readiness-review-zh.md`：生产就绪度风险台账和整改路线图。
7. `docs/production-hardening-plan-zh.md`：P0 生产化分阶段推进计划。
8. `docs/production-hardening-stage-0-baseline-zh.md`：P0 阶段 0 接口和状态基线。
9. `docs/production-hardening-stage-1-queue-plan-zh.md`：P0 阶段 1 生成任务队列化实施计划。
10. `tasks/prd-ai-knowledge-review-ios.md`：完整 PRD。
11. `demo/README.md`：HTML Demo 运行方式。
12. `quality-test-set/README.md`：题目质量测试集说明。

## 当前目录结构

```text
backend/           Node 后端、本地 API、核心出题系统
Recallo iOS 工程/              正式 iOS App 工程；真机装包和 TestFlight 只能使用这里的 Xcode project
demo/              HTML 真实体验 Demo
docs/              迁移文档、API 契约、Xcode 首轮计划、fixture
quality-test-set/  真实样本、人工样本、质量测试结果
tasks/             PRD
tools/             可选辅助工具
articles/          临时抓取文章存放区
experiments/       历史实验区；不要用这里的 iOS 工程覆盖正式 App
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

内部成本计算工作台：

```text
http://127.0.0.1:5173/cost-calculator.html
```

该页面需要后端运行，只用于模型成本审计；生产环境默认关闭，需要显式设置 `ENABLE_COST_WORKBENCH=1`。

检查：

```powershell
cd backend
npm.cmd run check
cd ..
node --check demo/app.js
```

正式真机装包：

```bash
./tools/install-official-ios.sh
```

这个脚本只会构建并安装 `Recallo iOS 工程/Recallo.xcodeproj`，并在安装前校验 bundle id 必须是 `com.maxhan.shibei`、显示名必须是 `Recallo`。不要再用 `experiments/shibei-v2/ios/Recallo.xcodeproj` 给正式手机装包。

质量测试：

```powershell
npm.cmd --prefix backend run quality:test
```

## 下一步建议

当前阶段建议：

1. 继续用 SwiftUI mock 验收产品流。
2. 真机真实生成走 Railway 云端 API。
3. Railway 后端配置 PostgreSQL 和模型 Key。
4. iOS 通过匿名 `deviceId` 访问云端，账号系统后置。
5. 生成质量、复习体验稳定后，再补登录、APNs、生产监控和数据迁移。

HTML Demo 是行为参考，不是 iOS 架构参考。iOS 端应使用 SwiftUI 重新实现。

## 注意

- 不要把 API Key 写入文档、代码或提交记录。
- Railway 云端 API 接 PostgreSQL；本地未配置 `DATABASE_URL` 时仍使用内存模式。
- 成本工作台和模型 usage 明细只用于内部调试，不能进入 iOS App 主接口或用户可见数据。
- 公众号抓取受平台限制，失败时应允许用户改为粘贴正文。
- 视频链接目前只识别并友好失败，不提取视频正文。

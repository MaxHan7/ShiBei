# 拾贝 V2 隔离开发与最终替换计划

本文档定义 V2 从本地实验到正式替换旧版本的开发路径。它补充 PRD、design.md、component-registry 和前端实现记录，重点说明环境隔离、开发顺序、验收门槛和上线替换方式。

## 核心原则

- 开发期隔离：只修改 `experiments/shibei-v2/` 下的 iOS、backend、docs 和 demo。
- 不污染旧版：不修改根目录旧版 `拾贝/` App 和根目录 `backend/`。
- 本地优先：V2 先使用本地 backend、独立 bundle id、本地或测试数据完成闭环。
- 最终替换：V2 验收通过后，更新同一个线上 production service，不长期维护第二个云端 service。
- 可回滚：正式替换前必须记录旧版 commit、部署版本、数据库备份、环境变量和回滚步骤。

## Milestone 1：SwiftUI V2 本地闭环

- 建立 `V2DesignSystem`，包含颜色、阴影、圆角、字号、间距和动画参数。
- 将 `docs/design-assets/` 中可直接使用的资产导入 Xcode asset catalog，并按 `asset-manifest.md` 标记 asset、code component、reference only。
- 实现第一批 `V2...` 组件：底部导航、圆形按钮、主按钮、单元进度条、选择题卡、连线题卡、答后反馈面板、章节 banner、节点弹窗。
- 使用 golden samples 或本地 fixture 驱动页面，不接 production backend。
- 首个验收页面为首页学习路径：底部导航、当前章节 banner、路径节点、节点弹窗、IP 放置和安全区适配都应可在模拟器中检查。

## Milestone 2：V2 Review Path 数据契约

- 新增 V2 专用 review path schema，不把 V1 的 flat `knowledgePoints/questions` 作为主契约。
- 数据应表达章节概要、知识点单元、轻量理解题、场景应用题、连线题、题级反馈、source anchors、单元总结和章节总结。
- 进度快照必须能恢复当前页面、当前 unit、当前 card、已提交答案、红绿反馈状态、反馈气泡状态、IP 状态、已完成 step ids 和题目结果。
- iOS 先通过本地 fixture 解码并完整渲染，再接真实 generation API。

## Milestone 3：V2 Backend 与 Prompt Pipeline

- 在 `experiments/shibei-v2/backend` 内重做 V2 generation pipeline，输出完整 review path。
- prompt 链路围绕章节路径规划：文章 summary、knowledge units、轻量理解题、场景题或连线题、误区/反馈、source anchors。
- Discover 推荐文章可以映射到预生成 review path，以便用户无等待体验完整生成流程。
- V1 prompt 和多角色干扰项设计可以作为参考，但 V2 schema、prompt 输出和测试数据必须独立。

## Milestone 4：全链路测试与正式替换

- iOS 连接本地 V2 backend，跑通导入文章、生成复习路径、继续复习、查看原文、退出恢复、单元总结和章节总结。
- 用 golden samples 回归：summary 质量、知识点切分、题干自足、干扰项、答后反馈、source anchor 定位和页面渲染。
- 验证失败态：生成失败、网络失败、source anchor 缺失、恢复进度失败和空数据。
- 正式替换前冻结旧版上线信息，完成回滚演练。
- 替换时更新同一个 production service；上线后若出现严重问题，通过旧部署和备份回滚，不启用长期 V1/V2 双 service 并行。

## 开始实施顺序

1. 切到 V2 实现分支，例如 `codex/shibei-v2-isolated-build`。
2. 先完成 SwiftUI V2 design system 和核心组件。
3. 用本地 fixture 搭出主页和复习主流程骨架。
4. 定义并验证 V2 review path schema。
5. 接入实验 backend 的 V2 generation pipeline。
6. 完成端到端测试后，再制定 production service 替换步骤。

## 验收门槛

- V2 iOS build 通过。
- V2 backend `npm run check` 通过。
- Golden samples 能被 iOS 解码并完整渲染。
- 核心流程可从首页开始并完成整章复习。
- 查看原文、退出恢复、答后反馈、连线题状态机和总结页都符合 PRD。
- 替换 production service 前，旧版回滚信息完整且演练通过。

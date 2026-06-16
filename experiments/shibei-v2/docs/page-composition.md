# 拾贝 V2 Page Composition

本文档按页面记录已提供的素材、应复用的组件和关键布局逻辑。它用于防止“素材已给过但页面实现时没用上”。

## General Page Rules

- 页面标题、顶部按钮、安全区、底部导航等基础位置以组件规范和 iOS safe area 为准，不照抄 Figma 手拖绝对坐标。
- 页面中出现已登记组件时，必须优先复用 `component-registry.md` 中的组件。
- 如果 Figma 页面实例与组件 registry 有轻微偏差，优先判断是否是手拖误差；不要直接新增近似组件。
- 页面级 SVG 或截图只作为 composition 参考，不能整图渲染。

## Page Index

| Page / module | Components | Assets / references | Notes |
| --- | --- | --- | --- |
| 首页 / 学习路径 | `V2BottomNavigationBar`, `V2CurrentChapterBanner`, `V2CircleIconButton`, `V2NodePopover` | `nav-icons-32frame-source.svg`, `mascot-static.svg`, path reference assets | 路径节点可上下滚动；节点弹窗优先居中，尖角跟随节点 |
| 章节概要页 | `V2CircleIconButton`, `V2PrimaryActionButton`, `V2ChapterOverviewCardWithMascot` | `summary-mascot-body-layer.svg`, `summary-mascot-hands-layer.svg` | IP 身体、正文卡片、手部分层 |
| 知识点开场页 | `V2CircleIconButton`, `V2UnitProgressBar`, `V2PrimaryActionButton`, `V2UnitOverviewBoardCard` | `unit-overview-mascot.svg` | 白板桌腿在卡片后层，IP 指向卡片 |
| 选择题页 | `V2CircleIconButton`, `V2UnitProgressBar`, `V2QuestionOptionCard`, `V2AnswerFeedbackPanel`, `V2FeedbackActionButton` | feedback mascot layers, answer panel references | 选项文字左对齐；答后反馈允许继续看题 |
| 连线题页 | `V2CircleIconButton`, `V2UnitProgressBar`, `V2MatchingOptionCard`, `V2AnswerFeedbackPanel` | feedback mascot layers if答后反馈出现 | 第二张卡不先变蓝；正确绿后锁定，错误红后复原 |
| 上传页 | `V2BottomNavigationBar`, upload input/card components | `upload-mascot-back.svg`, `upload-mascot-front.svg`, `upload-link-icon.svg` | 输入框夹在 IP 身体和手/笔记本之间 |
| 通知页 | `V2CircleIconButton`, `V2NotificationCard` | `notification-mascot.svg`, success/failure icons | 失败 icon 视觉居中；卡片布局代码绘制 |
| 全部章节 / 资料页 | `V2BottomNavigationBar`, `V2ChapterCard`, `V2ChapterStatusTag` | `materials-mascot.svg`, `chapter-source-icon.svg` | 章节卡有未复习/复习中/已完成状态 |
| 笔记页 | `V2BottomNavigationBar`, note summary/card components | `notes-mascot.svg`, `notes-bookmark.svg`, `notes-summary-wave.svg` | 文字排版以 Figma 参考和设计规范校准 |
| 发现页 | `V2BottomNavigationBar`, `V2DiscoverChip`, `V2RecommendedArticleCard` | `discover-hero-mascot.svg`, `discover-article-thumbnail.svg` | hero banner 不整图渲染；文字和 chips 代码绘制 |
| 个人主页 | `V2CircleIconButton`, `V2ProfileStatCard`, `V2ProfileSettingRow` | profile stat / setting icon assets | 数字基线和标签文字按组件规范对齐 |
| 单元总结页 | `V2PrimaryActionButton`, `V2UnitCompletionResultBanner` | `mascot-completion.svg`, `completion-medal.svg`, `completion-grade-rays.svg` | 每个知识点最后一题后进入；继续到下一单元或章节总结 |
| 章节总结页 | `V2PrimaryActionButton`, `V2ChapterCompletionResultCard` | `chapter-completion-mascot.svg`, `chapter-completion-title-rays.svg` | 最后一个单元总结后进入；底部主按钮为页面级按钮 |

## Flow Notes

1. 首页点击开始节点进入章节概要页。
2. 上传页点击“生成复习路径”后，在本地 fixture 骨架中进入章节概要页；真实后端接入后，这里会先等待生成结果。
3. 章节概要页继续进入第一个知识点开场页。
4. 知识点开场页继续进入该知识点第一题。
5. 每道题作答后显示反馈状态和反馈浮窗，用户点击继续进入下一题。
6. 当前知识点所有题完成后进入单元总结页。
7. 如果还有下一个知识点，单元总结页继续进入下一个知识点开场页。
8. 如果这是章节最后一个知识点，单元总结页继续进入章节总结页。
9. 章节总结页可返回主页，也可查看章节详情。

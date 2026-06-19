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
| 章节详情页 | `V2CircleIconButton`, `V2ChapterDetailHeroCard`, `V2ChapterDetailSummaryCard`, `V2ChapterDetailKnowledgeCard`, `V2ChapterDetailKnowledgeExpansionPanel` | `chapter-detail-mascot.svg`, `card-bottom-wave.svg`, `chapter-detail-core-icon.svg`, `chapter-detail-knowledge-icon.svg` | 从首页 banner、资料页章节卡、章节总结弱入口进入；展示章节标题、文章核心摘要和知识点列表；卡片/文字代码绘制，IP、波形和小 icon 使用资产；知识点行右侧箭头可展开详情，展开面板插入该行下方并推动后续行下移 |
| 查看原文页 | `V2CircleIconButton`, `V2SourceArticleHeaderCard`, `V2ChapterDetailHeroActionButton`, `V2ChapterDetailHeroInfoChip`, `V2SourceArticleBodyCard` | `chapter-detail-link-action-icon.svg`, `chapter-detail-summary-action-icon.svg` | 从章节详情页、题目页或答后反馈入口进入；页面不加顶部大标题，只保留返回按钮和正文内容。顶部来源卡复用“原文链接 / 作者”胶囊组件，左侧胶囊打开 `sourceURL`，右侧只展示作者；正文按 source article blocks 渲染，尽量保留原文段落、小标题、引用和空行，不压缩成单段摘要；返回按钮回到进入该页之前的页面 |
| 章节概要页 | `V2CircleIconButton`, `V2PrimaryActionButton`, `V2ChapterOverviewCardWithMascot` | `summary-mascot-body-layer.svg`, `summary-mascot-hands-layer.svg` | IP 身体、正文卡片、手部分层 |
| 知识点开场页 | `V2CircleIconButton`, `V2UnitProgressBar`, `V2PrimaryActionButton`, `V2UnitOverviewBoardCard` | `unit-overview-mascot.svg` | 白板桌腿在卡片后层，IP 指向卡片 |
| 选择题页 | `V2CircleIconButton`, `V2QuestionFavoriteButton`, `V2UnitProgressBar`, `V2QuestionOptionCard`, `V2AnswerFeedbackPanel`, `V2FeedbackActionButton` | question favorite button states, feedback mascot layers, answer panel references | 顶部左侧返回，右侧收藏/已收藏；选项文字左对齐；答后反馈允许继续看题 |
| 连线题页 | `V2CircleIconButton`, `V2QuestionFavoriteButton`, `V2UnitProgressBar`, `V2MatchingOptionCard`, `V2AnswerFeedbackPanel` | question favorite button states, feedback mascot layers if答后反馈出现 | 顶部左侧返回，右侧收藏/已收藏；第二张卡不先变蓝；正确绿后锁定，错误红后复原 |
| 上传页 | `V2BottomNavigationBar`, upload input/card components | `upload-mascot-back.svg`, `upload-mascot-front.svg`, `upload-link-icon.svg` | 输入框夹在 IP 身体和手/笔记本之间 |
| 通知页 | `V2CircleIconButton`, `V2NotificationSummaryBanner`, `V2NotificationCard` | `notification-mascot.svg`, success/failure icons | 新版含未读数 banner；IP 压在 banner 上方；失败 icon 视觉居中；卡片布局代码绘制；成功通知进入章节详情，失败通知进入失败详情 |
| 生成失败通知详情页 | `V2CircleIconButton`, `V2NotificationFailureDetailCard` | `notification-failure-detail-mascot.svg`, `notification-failure-detail-icon.svg`, `notification-failure-reason-icon.svg` | 只用于生成失败通知；主卡 `321 x 277`，内部原因卡 `280 x 95`，重新生成按钮 `207 x 28`；点击重新生成复用生成确认弹窗流程 |
| 全部章节 / 资料页 | `V2BottomNavigationBar`, `V2GenerationStartedDialog`, `V2ChapterCard`, `V2ChapterStatusTag` | `materials-mascot.svg`, `chapter-source-icon.svg`, `generating-popup-mascot.svg`, `generating-popup-wave.svg` | 章节卡有生成中/未复习/复习中/已完成状态；点击开始生成后先切到本页显示 20% 黑遮罩和生成说明弹窗，点“知道了”后动画插入生成中卡片 |
| 笔记页 | `V2BottomNavigationBar`, note summary/card components | `notes-mascot.svg`, `notes-bookmark.svg`, `notes-summary-wave.svg` | 文字排版以 Figma 参考和设计规范校准 |
| 发现页 | `V2BottomNavigationBar`, `V2DiscoverChip`, `V2RecommendedArticleCard` | `discover-hero-mascot.svg`, `discover-article-thumbnail.svg` | hero banner 不整图渲染；文字和 chips 代码绘制 |
| 好文阅读页 | `V2CircleIconButton`, `V2SourceArticleHeaderCard`, `V2SourceArticleBodyCard`, `V2RecommendedArticleAddButton`, `V2RecommendedArticleAddPopover` | plus button reference SVG `53 x 53`, popover reference SVG `282 x 108` | 暂时复用查看原文页正文布局；页面不加顶部大标题。右下角加号按钮按 SVG 参数代码绘制。点击后页面内容上方覆盖黑色 `20%` 透明遮罩，浮窗和加号按钮位于遮罩上方；返回按钮回到发现页或进入该阅读页之前的页面 |
| 个人主页 | `V2CircleIconButton`, `V2ProfileStatCard`, `V2ProfileSettingRow` | profile stat / setting icon assets | 数字基线和标签文字按组件规范对齐 |
| 单元总结页 | `V2PrimaryActionButton`, `V2UnitCompletionResultBanner` | `mascot-completion.svg`, `completion-medal.svg`, `completion-grade-rays.svg` | 每个知识点最后一题后进入；继续到下一单元或章节总结 |
| 章节总结页 | `V2PrimaryActionButton`, `V2ChapterCompletionResultCard` | `chapter-completion-mascot.svg`, `chapter-completion-title-rays.svg` | 最后一个单元总结后进入；底部主按钮为页面级按钮 |

## Flow Notes

1. 首页点击开始节点进入章节概要页。
2. 上传页或好文阅读页点击“开始生成”后，生成的新章节先进入章节详情/生成结果预览页，不自动替换首页当前正在复习的章节。
3. 章节概要页继续进入第一个知识点开场页。
4. 知识点开场页继续进入该知识点第一题。
5. 每道题作答后显示反馈状态和反馈浮窗，用户点击继续进入下一题。
6. 当前知识点所有题完成后进入单元总结页。
7. 如果还有下一个知识点，单元总结页继续进入下一个知识点开场页。
8. 如果这是章节最后一个知识点，单元总结页继续进入章节总结页。
9. 章节总结页可返回主页，也可查看章节详情。
10. 章节详情页可从首页当前章节 banner、资料页章节卡、生成完成页和章节总结页进入；用于浏览章节标题、文章核心摘要和知识点列表。只有用户在章节详情页主动点击“开始复习/继续复习”时，才把该章节写入/替换为首页当前正在复习的章节，并进入复习流程。
11. 返回逻辑使用来源栈：普通详情/阅读页返回进入它的上一个页面；查看原文可从多个入口进入，必须回到对应入口页。题目页是例外，顶部返回按钮直接回到主页学习 tab，不沿题目流程逐级后退。

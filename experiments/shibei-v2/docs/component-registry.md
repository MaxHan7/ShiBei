# 拾贝 V2 Component Registry

本文档记录可进入 SwiftUI 组件库的组件、状态、Figma 节点和实现规则。它是 `DESIGN.md` 的详细组件附录。

## Registry Rules

- 每个组件必须有稳定 SwiftUI 名称。
- Figma variant 名称尽量和 SwiftUI enum 一致。
- 组件内部动态内容必须是真实 SwiftUI `Text` / `Image` / `Shape`，不能整图渲染。
- Figma 页面实例中的手拖偏差不应污染组件规格；以组件节点和设计规范为准。
- 如果 Figma link 读不到关键字段，状态写成 `missing / need confirmation`，不自行近似。

## SwiftUI Components

| Component | Variants / state | Source nodes / assets | Implementation rule |
| --- | --- | --- | --- |
| `V2BottomNavigationBar` | selected tab | `nav-icons-32frame-source.svg` | 自定义浮动底部导航；普通 tab icon 使用同画布资产 |
| `V2BottomNavItem` | `inactive`, `selected` | `nav-icons-32frame-source.svg` | icon + label；selected/inactive 不改变 frame |
| `V2UploadTabButton` | default, future pressed/loading | `upload-tab-button.svg` | 中间圆形上传按钮；正式实现使用独立 `60 x 60` 资产，避免各页面重复手绘产生偏差 |
| `V2CircleIconButton` | `notification`, `profile`, `back`, `sourceDocument` | `circle-button-back.svg`, `circle-button-source.svg`, notification/profile references | 圆形按钮底由代码绘制，icon 用资产或统一 path |
| `V2PrimaryActionButton` | `normal`, `disabled` | Figma `315:592` | 页面级主按钮，高度 `53`，用于章节概要、知识点开场、总结页 |
| `V2FeedbackActionButton` | `correct`, `wrong`, `disabled` | Figma `449:2343`, `449:2347` | 答后反馈浮窗内按钮，高度 `42`，不同于页面级按钮 |
| `V2UnitProgressBar` | empty, progress fraction | Figma `451:1270`, `315:636` | 代码绘制轨道和进度；外层高度包含阴影留白 |
| `V2QuestionOptionCard` | `normal`, `correct`, `wrong` | Figma `445:1499`, `445:1498`, `445:1497` | 代码绘制选项卡；无投影；状态切换 fill/border/反馈符号 |
| `V2MatchingOptionCard` | `normal`, `selected`, `correct`, `wrong`, `locked` | Figma `449:2319`, `449:2323`, `449:2327`, `449:2331`, `449:2335` | 代码绘制连线卡；五态共享尺寸、圆角、文字布局 |
| `V2AnswerFeedbackPanel` | `correct`, `wrong` | `answer-feedback-panel-reference.svg`, feedback mascot layers | 面板主体可代码绘制；IP 后层、卡片、IP 前层用 `ZStack` |
| `V2NotificationCard` | `success`, `failure` | Figma `451:1233`, `451:1234`; `notification-success-icon.svg`, `notification-failure-icon.svg` | 卡片代码绘制，状态 icon 使用资产 |
| `V2ChapterCard` | `notStarted`, `reviewing`, `completed` | Figma `451:1261` | 整章列表卡；内部状态 tag 和来源 icon 复用 |
| `V2ChapterStatusTag` | `notStarted`, `reviewing`, `completed` | Figma `451:1245`, `451:1246`, `451:1247` | 小状态标签，代码绘制 |
| `V2CurrentChapterBanner` | default | Figma `351:975`, `chapter-source-icon.svg` | 首页当前章节 banner；文字动态，右侧详情 icon |
| `V2DiscoverChip` | `inactive`, `selected` | Figma `450:1186`, `450:1187` | 发现页 filter chip，文字动态 |
| `V2RecommendedArticleCard` | default | Figma `381:1117`, `discover-article-thumbnail.svg` | 三层夹图结构，卡片和文字代码绘制 |
| `V2ProfileStatCard` | metric type | `profile-stat-reviewed.svg`, `profile-stat-streak.svg`, `profile-stat-card-reference.svg` | 数字和说明文字代码绘制；icon 使用独立资产 |
| `V2ProfileSettingRow` | notification/privacy/account | `profile-setting-notification.svg`, `profile-setting-privacy.svg`, `profile-setting-account.svg` | 设置行代码绘制，icon 独立资产 |
| `V2ChapterOverviewCardWithMascot` | default | Figma `397:1291`, summary mascot layers | IP 身体后层、正文卡片中层、手部前层 |
| `V2UnitOverviewBoardCard` | default | Figma `445:1505`, group `449:2365`, `unit-overview-mascot.svg` | 白板卡片代码绘制；桌腿在卡片后层，IP 位置按组合节点 |
| `V2NodePopover` | start/review copy | Figma `451:1280` | 弹窗优先整体居中，尖角对准节点，必要时整体微移 |
| `V2UnitCompletionResultBanner` | dynamic score/summary | Figma `451:1454`, completion assets | 单元总结页结果 banner；统计文字动态 |
| `V2ChapterCompletionResultCard` | dynamic stats/summary | Figma `451:1467`, chapter completion assets | 章节完成结果卡；标题装饰资产，文字动态 |

## Key State Machines

### Matching Question

1. 用户第一次点击左列或右列任意一张卡，只有这张卡进入 `selected` 蓝色态。
2. 用户点击第二张卡后，第二张卡不进入蓝色态。
3. 如果匹配正确，两张卡立即同时进入 `correct` 绿色短反馈态。
4. 正确短反馈结束后，两张卡同时进入 `locked` 灰色锁定态。
5. 如果匹配错误，两张卡立即同时进入 `wrong` 红色短反馈态。
6. 错误短反馈结束后，两张卡同时回到 `normal`。
7. 全部匹配项进入 `locked` 后，才允许继续下一题。

### Multiple Choice

- 未作答时所有选项为 `normal`。
- 答对后正确选项进入 `correct`。
- 答错后正确选项进入 `correct`，用户选择的错误选项进入 `wrong`。
- 选项文字左对齐。
- 答后反馈浮窗出现后，用户仍能看到题目和选项。

## Component Spec Entry Template

| Field | Required content |
| --- | --- |
| SwiftUI name | `V2...` stable component name |
| Figma source | node id(s), frame/component name |
| Variants | exact enum names and labels |
| Size | width, height, flexible rules |
| Shape | radius, custom path if any |
| Fill / border / shadow | token names and exact values |
| Typography | token or explicit size/weight/line height |
| Dynamic fields | text, numbers, progress, image |
| Asset dependencies | linked filenames from `asset-manifest.md` |
| Implementation notes | SwiftUI structure and constraints |
| Open questions | missing data or needs user confirmation |

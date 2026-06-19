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
| `V2UploadTabButton` | default, future pressed/loading | `upload-tab-button.svg` | 中间圆形上传按钮；`upload-tab-button.svg` 作为设计源，SwiftUI 按圆心、半径、描边、加号坐标和阴影参数代码绘制，避免 iOS 直接解析 SVG filter 后和 Figma 不一致 |
| `V2CircleIconButton` | `notification.normal`, `notification.unread`, `profile`, `back`, `sourceDocument` | Figma `538:1217`; `circle-button-back.svg`, `circle-button-source.svg`, `circle-button-notification.svg`, `circle-button-profile.svg` | 四个顶部圆形按钮都直接使用独立 `44 x 45` 资产；通知未读态在通知按钮资产上用代码叠加红点，不重新切一张整按钮图 |
| `V2QuestionFavoriteButton` | `normal`, `saved` | Figma `523:1229`, `523:1230`; star path `M12 2...` | 题目页右上角收藏按钮，替换原先题目页 top bar 的 `sourceDocument`；圆形底、阴影、星形 path 均由 SwiftUI 绘制，不使用截图 PNG；外框固定 `44 x 45`，星形 `24 x 24` |
| `V2PrimaryActionButton` | `normal`, `disabled` | Figma `315:592` | 页面级主按钮，高度 `53`，用于章节概要、知识点开场、总结页 |
| `V2FeedbackActionButton` | `correct`, `wrong`, `disabled` | Figma `449:2343`, `449:2347` | 答后反馈浮窗内按钮，高度 `42`，不同于页面级按钮 |
| `V2UnitProgressBar` | empty, progress fraction | Figma `451:1270`, `315:636` | 代码绘制轨道和进度；外层高度包含阴影留白 |
| `V2QuestionOptionCard` | `normal`, `correct`, `wrong` | Figma `445:1499`, `445:1498`, `445:1497` | 代码绘制选项卡；无投影；状态切换 fill/border/反馈符号 |
| `V2MatchingOptionCard` | `normal`, `selected`, `correct`, `wrong`, `locked` | Figma `449:2319`, `449:2323`, `449:2327`, `449:2331`, `449:2335`; size check `322:1059` | 代码绘制连线卡；固定 `140 x 90`、圆角 `15`、文字 `14 regular`、文本框约 `112 x 61`，五态共享尺寸和文字布局 |
| `V2AnswerFeedbackPanel` | `correct`, `wrong` | `answer-feedback-panel-reference.svg`, feedback mascot layers | 面板主体可代码绘制；IP 后层、卡片、IP 前层用 `ZStack` |
| `V2MatchingMascot` | unanswered matching state | `matching-mascot.svg` | 连线题未作答/未完成状态专属 IP 资产；完成后切换为 `V2AnswerFeedbackPanel` 内的反馈 IP 分层 |
| `V2NotificationSummaryBanner` | unread count | Figma `333:818`, `333:823`; `notification-banner-wave.svg`, `notification-mascot.svg` | 通知页顶部未读数 banner；底卡和文字代码绘制，IP 使用已有资产，浅绿色波浪使用独立 SVG 资产；层级为底卡 -> IP -> 波浪 -> 文字 |
| `V2NotificationCard` | `success`, `failure` | Figma `451:1233`, `451:1234`; `notification-success-icon.svg`, `notification-failure-icon.svg` | 卡片代码绘制，状态 icon 使用资产；成功通知点击进入章节详情，失败通知点击进入 `V2NotificationFailureDetailView` |
| `V2NotificationFailureDetailView` | generation failure | full-page ref `581:1776`; `notification-failure-detail-mascot.svg`, `notification-failure-detail-icon.svg`, `notification-failure-reason-icon.svg` | 章节生成失败通知详情页；整页 SVG 只用于读取卡片/Button/资产位置关系。页面卡片、失败原因卡和“重新生成”按钮由 SwiftUI 绘制，IP 与两个 icon 为直接资产；点击“重新生成”复用开始生成流程 |
| `V2GenerationStartedDialog` | default | generating popup ref `581:1739`; `generating-popup-mascot.svg`, `generating-popup-wave.svg` | 用户从上传页或推荐文章入口点击“开始生成”后，先自动切到全部章节页并展示 20% 黑色遮罩和居中弹窗；弹窗卡片代码绘制，IP 和底部波浪为资产。点击“知道了”后关闭遮罩和弹窗，再用动画插入 `V2ChapterCard(generating)`；若这是用户第一次生成，同步触发一次 iOS 系统通知权限请求 |
| `V2ChapterCard` | `generating`, `notStarted`, `reviewing`, `completed` | Figma `451:1261`, generating ref `581:1725` | 整章列表卡；内部状态 tag 和来源 icon 复用。`generating` 态用于用户提交链接后的生成中章节：卡片主体仍为 `321 x 136 rx=15` 和标准绿影，标题区显示进度文案（如“正在提取正文...”/“正在生成知识点...”/“正在生成题目...”），右下角不显示知识点和题目统计 |
| `V2ChapterStatusTag` | `generating`, `notStarted`, `reviewing`, `completed` | Figma `451:1245`, `451:1246`, `451:1247`, generating tag ref `581:1725` | 小状态标签，代码绘制；`generating` 为 `55 x 22 rx=11`、底色 `#FEF5F0`、文字 `#F36454`、文案“生成中” |
| `V2ChapterDetailHeroCard` | default | Figma `580:1253`; action chips `575:1567`, `575:1631`; `chapter-detail-mascot.svg`, `bg-deco-small-plant-cluster.svg` | 章节详情页顶部 hero 卡；卡片、文字、按钮和阴影代码绘制，IP 和右下叶子装饰为资产。新版 hero 卡画布 `329 x 243`，主体卡 `x=4 y=0 w=321 h=235 rx=15`，标准绿影 `dy=4 blur=2 opacity=0.2`。标题从 `x=27 y=23` 起排；标题下方两个横排胶囊仍为“查看原文 / 作者”，位置为 `x=25 y=123` 和 `x=139 y=123`，单个基础尺寸 `93 x 36 rx=10`。底部“开始复习”按钮用代码绘制，参数 `x=25 y=184 w=207 h=28 rx=10`、填充 `#A5AE66`、标准绿影、白色 `13 semibold`。按钮右侧叶子复用 `V2BgDecoSmallPlantCluster`，按 `62 x 56` 放在 `x=253 y=181`，透明度约 `0.56`，作为弱装饰，不响应点击。真实文章标题可能长于 Figma 示例，SwiftUI 中允许尾部省略但必须和 IP/书本保持安全距离 |
| `V2ChapterDetailHeroActionButton` / `V2ChapterDetailHeroInfoChip` | `sourceLink`, `authorInfo` | Figma `575:1567`, `575:1631`; `chapter-detail-link-action-icon.svg`, `chapter-detail-summary-action-icon.svg` | 章节详情页 hero 卡内的小胶囊；在新版 hero 卡内左侧胶囊固定 `x=25 y=123 w=93 h=36`；右侧胶囊起点固定 `x=139 y=123`，最小宽 `93`，按 `sourceAuthor` 文本测量增宽，最大右边界不得超过大卡右侧安全距离；两个胶囊圆角 `10`、填充 `#FDFAF2`、使用标准绿影 `dy=4 blur=2 opacity=0.2`、文字 `8 regular #767676`，icon 使用 `34 x 34` 独立资产并放在胶囊内 `x=7 y=1`；左侧触发 source article，右侧显示 `sourceAuthor`，不响应点击 |
| `V2SourceArticleHeaderCard` | default | Figma `575:1684`; reuses `V2ChapterDetailHeroActionButton` / `V2ChapterDetailHeroInfoChip` | 查看原文页顶部来源卡；主体 `321 x 143 rx=15`，标准奶白底和绿影；标题区域参考 `x=63 y=149 w=275`，SwiftUI 中换算为卡内 `x=23 y=17 w=275`；下方两个胶囊复用章节详情页同一组件，左侧“原文链接”为可点击外链按钮，右侧显示作者名且不可点击 |
| `V2SourceArticleBodyCard` | text blocks, optional highlighted source anchor | Figma `575:1684`; source article body; highlight reference SVG `291 x 86 rx=14.5 stroke #A3A568` | 查看原文页正文卡；主体 `321` 宽、奶白底、圆角 `15`、标准绿影；正文需要尽可能还原原文格式，不把原文压成单段。数据层使用 block 渲染，至少支持 heading / paragraph / quote；段落完整显示，不截断；后端接入时保留原文段落、空行、小标题和引用结构。从题目进入时根据 `sourceExcerpt/sourceAnchor` 滚动到对应 block，并用代码绘制动态高亮框：文字列宽 `275`，高亮框宽 `291`，左右各多 `8`，圆角 `14.5`，描边 `#A3A568`、线宽 `1`；不把高亮框存为 SVG 资产 |
| `V2ChapterDetailSummaryCard` | default | Figma `553:1272`; `chapter-detail-core-icon.svg` | “文章核心”摘要卡；卡片代码绘制，icon 使用 `23 x 23` 资产；正文显示完整文章核心摘要，不做四行截断，卡片高度随正文行数动态增长 |
| `V2ChapterDetailKnowledgeCard` | default | Figma `552:1261`; `chapter-detail-knowledge-icon.svg` | “知识点”列表卡；卡片、行容器和展开浮窗代码绘制，标题 icon 使用资产；行高固定 `50`，卡片高度随行数和展开内容自然增长；标题组和行内容使用统一左边线 |
| `V2ChapterDetailKnowledgeRow` | `collapsed`, `expanded` | Figma `553:1373`, `553:1444` | 章节详情页知识点行；固定 `274 x 50`、圆角 `10`、描边 `#EFE9DB`；序号圆、标题和右侧 disclosure arrow 均代码绘制；右侧箭头是按钮，展开后旋转向上并切换为主题绿色，不使用整图裁切 |
| `V2ChapterDetailKnowledgeExpansionPanel` | default | Figma `553:1444`; expansion reference SVG | 点击知识点行右侧箭头后的展开浮窗；参考画布 `282 x 129`，奶白底卡 `x=4 y=0 w=274 h=121 rx=15`，标准绿影；正文改为 `11 regular #575757`，必须完整显示，不截断；面板高度由正文自然撑开；按钮 `w=215 h=28 rx=10`、填充 `#A5AE66`、标准绿影，距离面板底部固定 `12`；浮窗插在当前知识点行下方，后续知识点自然下移；展开可轻微淡入，收起时面板应即时移除，避免淡出/上移残影和下一行卡片重叠 |
| `V2CurrentChapterBanner` | default | Figma `548:1216`, document icon SVG path | 首页当前章节 banner；主体 `346 x 88`、圆角 `15`、标签色 `#A5AE66`；标题保留两行空间并尾部省略；右侧详情 icon 与竖线为代码布局；右侧 document icon 在 SwiftUI 中按 SVG path 绘制，避免 asset catalog 对纯 stroke SVG 渲染不稳定 |
| `V2LearningPathNode` | `reviewed`, `notReviewed`, current progress overlay | Figma `313:1072`, `349:930`; `path-node-states-base.svg` | 知识点节点由 SwiftUI 绘制：`81 x 97` 椭圆、`39 x 39` icon 底圆、星形按 Figma SVG path 转为 `Shape` 并使用组件内 `25 x 24` frame 定位；星形中心约为 `(40.5, 34.75)`，不能按外层底圆自动放大；文字动态，不整图渲染 |
| `V2DiscoverChip` | `inactive`, `selected` | Figma `450:1186`, `450:1187` | 发现页 filter chip，文字动态 |
| `V2RecommendedArticleCard` | default | Figma `381:1117`, `discover-article-thumbnail.svg` | 三层夹图结构，卡片和文字代码绘制 |
| `V2RecommendedArticleReader` | default | reuse `V2SourceArticleHeaderCard`, `V2SourceArticleBodyCard` | 好文阅读页正文布局暂时复用查看原文页：顶部来源卡 + 原文正文卡。区别是右下角叠加 `V2RecommendedArticleAddButton`，用于把推荐好文加入/生成复习路径 |
| `V2RecommendedArticleAddButton` | default | plus button reference SVG `53 x 53` | 好文阅读页右下角浮动加号按钮；不保存为 SVG 资产，按参数代码绘制：外框 `53 x 53`，圆心 `(26.5,22.5)`、半径 `22.5`、填充 `#E8E9C2`、内描边 `#FEFDFD 2pt`、标准绿影、加号描边 `#98A84E 2pt round cap`；点击后显示好文加入浮窗 |
| `V2RecommendedArticleAddPopover` | default | popover reference SVG `282 x 108` | 好文阅读页点击加号后的浮窗；不保存为 SVG 资产，按参数代码绘制：外层参考画布 `282 x 108`，真实卡片 `x=4 y=0 w=274 h=100 rx=15`、奶白底、标准绿影；按钮 `x=33 y=54 w=215 h=28 rx=10`、填充 `#A5AE66`、标准绿影、白色文字“开始生成”。浮窗出现时底层加全屏黑色 `20%` 透明遮罩，遮罩位于页面内容之上、浮窗和加号按钮之下 |
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

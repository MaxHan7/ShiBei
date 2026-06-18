# 拾贝 V2 前端视觉与实现方案记录

本文档用于持续记录 V2 前端视觉还原和技术实现讨论。它不是最终 PRD，也不是实现计划；它专门沉淀每个 UI 模块的素材要求、技术方案、状态结构、动效方向和待决策点，避免后续进入编码时丢失讨论细节。

稳定后的设计规范会整理到 `design.md`。当前文档保留讨论过程、待验证方案和模块实现细节；当某个视觉规则已经确认，应同步沉淀到 `design.md` 作为 SwiftUI 实现时的设计单一事实源。

当前长期 HTML prototype 已归档到 `docs/ui-prototypes/home-components/index.html`。后续可以继续在这个文件上做 UI 堆栈实验；它用于视觉和交互认知对齐，不代表正式 SwiftUI 代码。

## 记录原则

- 只记录已经讨论过或用户明确接受的方案，不把未确认的扩展想法写成定论。
- 每个模块都尽量拆成：视觉目标、建议实现方式、需要用户提供的素材、待讨论问题。
- 对需要精准还原的视觉部分，优先记录 Figma 测量依据和导出资产要求。
- 对可以代码化的部分，记录 SwiftUI 实现方向和状态边界。

## 设计还原原则

Figma 视觉稿是 V2 前端还原的视觉基准，但不是机械抄像素。实现时需要区分“必须保持一致的设计标准”和“可以根据真机体验灵活调整的工程布局”。

当前进一步明确：页面里很多按钮、标题、卡片和 IP 的具体位置数值不是定死的。后续写 SwiftUI 时，这些位置要根据 safe area、屏幕尺寸、阅读性、触控舒适度和整体设计规范重新约束。真正稳定复用的是颜色、投影、圆角体系、IP 形象、用户提供的 SVG/PDF 素材、按钮视觉风格、组件状态和层级关系。

### 必须保持一致

以下内容属于产品视觉规范的一部分，应尽量以 Figma 或用户提供的设计标准为准，并沉淀为可复用 token 或组件参数：

- 品牌色和彩色状态：例如选中绿色、未选中深灰、禁用灰、错误红、正确绿等。
- 卡片基础色：例如当前主页卡片使用的奶白色，需要在章节卡、题目卡、反馈气泡等同类组件中保持一致或建立清晰的层级差异。
- 卡片阴影：包括 x/y 偏移、模糊半径、扩散、颜色和透明度。同一层级的卡片应使用一致阴影，不要每个页面临时调整。
- 圆角体系：例如章节卡、底部导航胶囊、节点圆圈、按钮、气泡等，需要有稳定的圆角规则。
- 图标形状：已经设计好的 tab icon、顶部 icon、节点 icon、功能 icon，应优先使用用户从 Figma 导出的 SVG/PDF 矢量资产，避免用系统图标近似替代。
- 字体层级：标题、章节名、tab label、节点文字、按钮文字等需要保持稳定字号、字重和颜色关系。
- 组件结构：例如底部导航栏的五 tab 结构、中间上传按钮凸起、节点 `icon + label + progress ring` 的结构，属于核心识别特征。

这些内容不应该因为屏幕尺寸变化而随意改变。它们更适合进入设计 token、组件样式或 asset catalog，作为后续页面统一复用的基础。

### 可以工程化调整

以下内容可以根据 iOS 真机体验、屏幕尺寸、安全区和可读性进行灵活调整，但调整时应保持设计意图不变：

- 页面垂直间距：不同 iPhone 高度下，顶部标题、章节卡片、路径节点和底部导航之间的间距可以按比例或约束调整。
- 安全区适配：底部导航必须考虑 Home Indicator 和手指点击舒适区，不能只按截图位置贴底。
- 文本换行：文章标题、知识点描述、按钮文字等需要根据真实内容长度换行或压缩，不能为了像素还原导致文字溢出。
- 触控区域：实际按钮点击区域可以大于视觉图标区域，保证可点性。
- 节点路径布局：节点数量会随章节变化，因此 S 型路径和节点坐标可以使用模板化或算法化布局，而不是固定死设计稿里的每个坐标。
- 动效节奏：点击、切换、进度填充、IP loop 等动效需要按真机性能和手感微调，不能只按静态图判断。

总结：颜色、阴影、圆角、图标形状、字体层级和组件识别结构要稳定；间距、换行、安全区、触控区域和动态布局要服务真机体验。若 Figma 参数和真机可用性冲突，优先保证真机可用性，再尽量贴近视觉稿。

## 当前页面模块拆分

主页视觉可以按可实现模块拆分，而不是只按画面层拆分：

1. 顶部导航：页面标题、通知入口、个人中心入口。
2. 当前章节卡片：当前章节说明、文章标题、章节列表或切换入口。
3. 路径节点系统：开始节点、知识点节点、当前节点、锁定节点、完成状态、分段进度环。
4. S 型虚线路径：不同数量节点之间的动态连接线。
5. IP 形象：主页陪伴形象和后续答题页状态切换。
6. 底部导航栏：五个 tab、中央上传按钮、选中/未选中状态、点击动效。
7. 背景氛围：浅绿色背景、柔光、植物/山丘等装饰元素。

## 设计一致性与 Design Tokens

主页里有一些逻辑不复杂但对整体质感很关键的基础组件，例如顶部左右两个圆形按钮、当前章节卡片、底部导航胶囊、节点容器等。它们不应该在不同页面里各自手写样式，而应该沉淀成统一的设计 token 和组件参数。

建议采用两层记录方式：

1. 当前文档继续记录讨论过程中的实现方案、素材要求和待决策点。
2. 等 Figma 参数和核心组件样式确认后，单独整理一份更正式的 `design.md` 或 V2 design tokens 文档，记录稳定视觉规范。

后续实现时也应对应到代码层：

- `ColorToken`：奶白卡片色、背景绿、选中绿、未选中灰、阴影色等。
- `ShadowToken`：卡片阴影、圆形按钮阴影、节点阴影、底部导航阴影等。
- `RadiusToken`：章节卡圆角、圆形按钮、胶囊导航、节点圆角等。
- `TypographyToken`：页面标题、章节标题、节点文字、tab label、按钮文字等。
- `SpacingToken`：卡片内边距、icon-label 间距、顶部按钮边距、安全区补偿等。
- `ComponentSpec`：顶部圆形按钮、章节卡、路径节点、底部导航、上传按钮等组件的固定视觉参数。

这样做的目的不是把所有像素都写死，而是明确哪些视觉规范必须统一。比如顶部左上角和右上角的圆形按钮，除了 icon 不同之外，按钮尺寸、圆角、底色、阴影、触控区域和与屏幕边缘的关系都应该保持一致。

后续读取新 Figma 页面时，应先做组件复用识别：

- 如果页面里出现已沉淀组件，例如 `V2CircleIconButton`、`UnitProgressBar`、`V2PrimaryActionButton`、`MascotView`，优先按组件库规范复用。
- 如果页面实例看起来像已有组件，但尺寸、色值、阴影、圆角、icon 位置或状态表现存在细微差别，应先记录并反馈差异，再决定更新组件库、建立 variant，或修正 Figma 实例。
- 不应因为某个页面实例局部复制出了轻微色差，就在开发端新增一个近似 token；近似差异要先归一或明确为新语义。

### Figma Link 组件规格收口

这里记录的是用户通过 Figma link 提供的组件规格，不是 HTML prototype 里临时出现的 SVG 或截图。后续进入 SwiftUI 时，应优先使用这些 Figma 节点作为组件规格源；完整页面 SVG / 完整卡片 SVG 仍只作为校准参考，不作为整图 UI。

| 组件规格 | Figma 节点 | 当前结论 |
| --- | --- | --- |
| 选择题选项卡 `V2QuestionOptionCard` | `445:1499` / `445:1498` / `445:1497` | 已读取 normal / correct / wrong 三态；无投影，代码绘制底卡 |
| 连线题选项卡 `V2MatchingOptionCard` | `449:2319` / `449:2323` / `449:2327` / `449:2331` / `449:2335` | 已读取 normal / selected / correct / wrong / locked 五态；状态机见连线题章节 |
| 页面主按钮 `V2PrimaryActionButton` | `315:592` | 已读取页面级按钮，`321 x 53` |
| 答后反馈按钮 `V2FeedbackActionButton` | `449:2343` / `449:2347` | 已读取 correct / wrong 两态，`321 x 42`，不同于页面级主按钮 |
| 通知卡 `V2NotificationCard` | `451:1233` / `451:1234` | 已读取 success / failure 两态；icon 用资产，卡片和文字代码绘制 |
| 章节状态 tag `V2ChapterStatusTag` | `451:1245` / `451:1246` / `451:1247` | 已读取未复习 / 复习中 / 已完成三态 |
| 章节卡 `V2ChapterCard` | `451:1261` | 已读取整张章节卡规格；内部复用状态 tag 和来源 icon |
| 单元进度条 `V2UnitProgressBar` | `451:1270` / `315:636` | 已读取空状态 / 进度状态；注意真实轨道高度约 `11` |
| 发现页 chip `V2DiscoverChip` | `450:1186` / `450:1187` | 已读取 inactive / selected 两态 |
| 推荐文章卡 `V2RecommendedArticleCard` | `381:1117` | 已读取三层夹图结构；不作为整卡 SVG |
| 首页节点弹窗 `V2NodePopover` | `451:1280` | 已读取弹窗与按钮规格；弹窗优先居中，尖角对齐节点，必要时整体微移 |
| 单元总结结果 banner | `451:1454` | 已读取 banner 内文字、勋章和装饰层级；不是新页面设计 |
| 章节完成结果卡 | `451:1467` | 已读取标题、统计、正文和装饰排版 |
| 知识点开场白板卡 | `445:1505` / `449:2365` | 已读取白板、桌腿和 IP 层级；桌腿在卡片后层 |

已确认不是缺口的资产：个人主页统计 icon 和设置 icon 已经由用户提供并归档为 `profile-stat-reviewed.svg`、`profile-stat-streak.svg`、`profile-setting-notification.svg`、`profile-setting-privacy.svg`、`profile-setting-account.svg`。后续不应再把它们列为需要用户重新提供的内容。

### 当前基础色彩 Token

V2 前端实现应避免在各个组件和 SVG 中散落硬编码色值。看起来相近的黑色、绿色、奶白色也需要统一到同一套 token，避免不同模块出现轻微色差。

当前已确认的基础 token：

- `ColorToken.iconPrimary`：`#44423D`。用于未选中导航 icon、顶部通知 icon、顶部个人主页 icon，以及同层级深色描边。
- `ColorToken.brandGreen`：`#98A84E`。用于学习 selected icon、上传加号、路径强调元素等偏品牌绿色的图形。
- `ColorToken.navSelectedText`：`#98A35E`。用于当前导航栏中 selected label。
- `ColorToken.cardCream`：`#FCF8ED`。用于底部导航栏胶囊背景。
- `ColorToken.chapterBannerCream`：`#F9F8EE`。用于首页当前章节 banner 背景。
- `ColorToken.pageGreenBackground`：`#E8EBBD`。用于章节概要页等浅绿色页面背景。
- `ColorToken.contentCardCream`：`#FDFAF2`。用于章节概要卡片、阅读/题目内容卡片候选底色。
- `ColorToken.circleButtonCream`：`#FDF9EE`。用于顶部圆形按钮底色。
- `ColorToken.uploadButtonFill`：`#E8E9C2`。用于中间上传按钮圆形底色。
- `ColorToken.primaryActionGreen`：`#A5AE66`。用于“继续”等主行动按钮。
- `ColorToken.unitProgressFill`：`#D4D89B`。用于单元内复习进度条已完成部分。
- `ColorToken.questionCardCream`：`#FFFCF4`。用于选择题题目大卡背景。
- `ColorToken.answerOptionCream`：`#FEF8F2`。用于选择题选项卡背景。
- `ColorToken.answerOptionBorder`：`#E0E5BA`。用于选择题选项卡描边。
- `ColorToken.primaryActionText`：`#FFFFFF`。用于主行动按钮文字。
- `ColorToken.decorativeLeafGreen`：`#DDE1AC`。用于页面装饰植物、IP 地面阴影等弱装饰元素。
- `ColorToken.whiteStroke`：`#FEFDFD`。用于上传按钮白色描边。
- `ColorToken.shadowGreen20`：`#98A35E33`。用于当前基础阴影色。

实现规则：

- SwiftUI 中应优先通过 token 引用这些颜色，不在每个 View 里直接写十六进制。
- SVG/PDF 资产如果自带色值，导入前需要检查是否和 token 一致；如果是 template asset，则由 SwiftUI token tint。
- 同一语义的深色描边统一使用 `iconPrimary`，不能出现多个近似黑色。
- 同一语义的选中绿色统一使用对应 token，不能因为 Figma 局部复制导致 `#98A35E`、`#98A84E` 等混用。当前两种绿色的分工先按 Figma 结果保留：label 使用 `#98A35E`，图形强调使用 `#98A84E`。

### 背景植物装饰资产

用户补充了三种背景植物/地形 SVG，后续应作为装饰资产使用，而不是用 CSS 椭圆或临时形状近似重画：

- `bg-deco-left-hill-plant.svg`：左侧/底部较大的地形植物装饰，画布 `114x85`。
- `bg-deco-right-hill-plant.svg`：右侧横向地形植物装饰，画布 `105x57`。
- `bg-deco-small-plant-cluster.svg`：小型植物丛装饰，画布 `62x56`。

这些资产属于弱装饰层，形状和颜色应保持用户提供的 SVG；页面实现时可根据布局、安全区和遮挡关系调整位置、透明度和裁切，但不要重新绘制成另一套叶子形状。

### 圆形 Icon 按钮组件

V2 中多个页面都会使用圆形 icon 按钮。它们应该沉淀成开发端组件，而不是每个页面重复手写圆形底、阴影和 icon 位置。

当前已经确认的按钮 variant：

- 左上角按钮：查看通知。
- 右上角按钮：进入个人主页或账户相关入口。
- 页面返回按钮：Figma 节点 `314:1135`。
- 查看原文/来源/详情按钮：Figma 节点 `349:887`。

这些按钮的容器视觉应一致，区别只来自内部 icon、语义和页面布局位置。按钮容器的尺寸、圆形底色、阴影、icon 尺寸、触控区域和边距应从 Figma 读取，并沉淀为同一个组件。

建议 SwiftUI 组件：

- `V2CircleIconButton`
- `V2CircleIconButton.Kind`
  - `notification`
  - `profile`
  - `back`
  - `sourceDocument`
- `V2CircleIconButton(kind: .notification, showsUnreadBadge: true)`：通知按钮未读态，来自 Figma `538:1217`。基础按钮仍复用 `circle-button-notification.svg`，红点作为通知按钮专属 overlay 由代码绘制，不把整颗按钮重新导出成新资产。

实现边界：

- 组件负责圆形底、阴影、icon 尺寸、pressed feedback 和触控热区。
- 页面负责传入 kind、action 和布局位置。
- 用户后续会单独提供这些按钮的 SVG/PDF 素材；开发端应导入为组件资产，不用 SF Symbols 或系统 icon 近似替代。
- 对已经提供完整 SVG 的按钮，不要在 HTML/SwiftUI mock 中拆成 CSS 圆底加手写 icon。之前返回按钮出现轻微不居中，就是因为用了近似手写箭头。后续应优先使用完整 SVG/PDF，或严格复刻它的圆心、clip frame、stroke、阴影和导出画布。
- 当前用户已提供完整 SVG 资产：`back`、`sourceDocument`、`notification`、`profile`。这些都应归入 `V2CircleIconButton` 组件库资产。不同 icon 的 clip frame 可能存在设计校准差异，例如 `sourceDocument` 是 `translate(10.5, 9)`，`back` 是 `translate(10.5, 8)`，开发端不应擅自把它们统一成同一个偏移。
- 通知按钮有 `normal / unread` 两态。`unread` 只增加红点，不改变圆形底、阴影、通知 icon 本身的位置和尺寸。当前会话没有可用 Figma 读取工具时，SwiftUI 先按 `8 x 8` 红点、右上角贴近按钮圆形视觉区域实现；若后续能读取 `538:1217` 或用户提供 SVG/XML，应以该节点的红点尺寸和相对位置校准。
- 所有页面顶部圆形 icon 按钮的外边缘必须和页面主内容卡片的左右边缘对齐。SwiftUI 中不要用整屏固定 `24pt` padding 放置顶部按钮；顶部栏应放进和主卡片一致的 `V2Layout.contentMaxWidth` 居中容器里。这样在 iPhone 17 等较宽设备上，返回/通知/个人按钮不会比下面卡片更靠外。
- 这部分暂不需要复杂动效，基础 pressed feedback 即可，后续如有需要再补充。

首页顶部圆形按钮当前已由用户提供 SVG 参考：

- SVG 画布：`111 x 45`，包含左右两个按钮。
- 左侧通知按钮：圆心约 `(22, 20.5)`，圆半径 `20.5`，底色 `#FDF9EE`，icon 描边 `#44423D`，描边宽度 `1.5`。
- 右侧个人主页按钮：圆心约 `(89, 20.5)`，圆半径 `20.5`，底色 `#FDF9EE`，icon 描边 `#44423D`，描边宽度 `1.5`。
- 页面级按钮当前读到的共同参数：`41 x 41` 圆形容器，icon frame `24 x 24`。
- 阴影应沿用 V2 统一阴影 token 的颜色、透明度、偏移和模糊规则；如果 Figma 局部 SVG 中的 filter 与统一 token 不一致，SwiftUI 实现时优先按统一 token 对齐，并在真机里微调视觉强弱。
- 实现时应尊重顶部 safe area，不能按截图绝对坐标硬贴状态栏。
- 章节概要页、单元总览页等页面的返回/来源按钮都复用该圆形按钮容器，只替换 icon variant。

### 当前章节 Banner

用户提供的 Figma 节点：

- 文件：`Pick The Shell`
- 节点：`548:1216`
- 节点名：当前章节 banner 精修版

这个 banner 位于首页顶部两个圆形按钮下方一点，用于显示当前正在复习的章节。它右侧有一个详情按钮，点击后进入章节详情页。

当前读取到的视觉参数：

- 参考 SVG 画布：`354 x 96`
- 卡片主体：`x=4`, `y=0`, `346 x 88`，SwiftUI 中固定高度 `88`
- 圆角：`15`
- 背景色：`#F9F8EE`
- 阴影：`DROP_SHADOW #AFBA7440, x=0, y=4, blur=4, spread=0`
- 标签文案：`当前章节`
- 标签颜色：`#A5AE66`
- 标签字号：`10`，SwiftUI 使用系统字体 Medium；标签字形在 SVG 中约落在 `x=17-55`, `y=11.6-20.8`
- 章节标题颜色：`#645B51`
- 章节标题字号：`16`，Figma 为 `Inter Regular`，SwiftUI 用系统字体 Regular
- 章节标题行高：约 `24`
- 章节标题第一行顶部约 `y=33`；SwiftUI 中文字组按 `titleLeading=13`, `eyebrowHeight=14`, `titleStackSpacing=8` 对齐。由于 SVG 中文字已转成 path，而 SwiftUI `Text` 会带系统字体 ascender 空白，标题 frame 需要做约 `-1.5pt` 的视觉上提补偿，让绿色小标题和黑色正文的 glyph 间距接近 SVG。
- 章节标题最多两行，右侧为详情按钮预留空间；标题超长时尾部省略，不让 banner 高度动态变高
- 右侧分隔线：`x=294`, `y=0.5-87.5`，`#E8EBBD`，宽 `1`
- 右侧详情按钮 icon：`24 x 24`，frame 位于 `x=310`, `y=32`，描边色 `#9EA860`，描边宽度 `1.5`

实现共识：

- SwiftUI 中建议抽象为 `CurrentChapterBanner` 组件。
- 文本必须用真实 `Text`，标题支持动态内容，但 banner 高度固定；超出两行时使用省略号。
- 横向位置应按屏幕宽度居中，并结合主页左右安全边距调整；不要在 SwiftUI View 内直接硬编码 Figma 的 `x=29`。
- banner 内部字体排布不机械复刻 Figma 读取出的绝对坐标，正式实现按移动端卡片排版规范润色：稳定左内边距、短标签标题间距、右侧为详情按钮预留独立区域。
- 这个 banner 的阴影比底部导航的统一基础阴影略偏黄、透明度更高，先独立记录为 `ShadowToken.chapterBanner`。如果后续真机上发现层级不统一，再决定是否回归统一阴影。
- 右侧详情按钮是独立 action，语义是进入章节详情页，不是章节切换入口。
- SwiftUI 中建议为右侧详情按钮保留独立触控区域；视觉 icon 可保持 `24 x 24`，触控热区可以适当放大。

## 章节概要页与继续按钮

章节概要页是用户从首页“开始”节点进入后的第一个页面。它的作用是让用户先看到整篇文章的概要，再点“继续”进入第一个知识点。

用户提供的 Figma 节点：

- 文件：`Pick The Shell`
- 节点：`397:1291`
- 节点名：`Summary`

当前可提取的稳定规范：

- 页面背景色：`ColorToken.pageGreenBackground`，当前值 `#E8EBBD`。
- 参考画布：`402 x 874`。
- 顶部返回按钮：参考位置 `x=49`, `y=71`, `width=41`, `height=41`；复用 `TopCircleButton` 容器，底色 `ColorToken.circleButtonCream`，icon 使用 `ColorToken.iconPrimary`。
- 页面标题：`章节概要`，参考中心 `x=201.5`, `y=91.5`，字号 `20`，颜色 `#575757`。
- 新版 IP 主体：参考位置 `x=12`, `y=118`, `width=377`, `height=546`。当前分层资产：`summary-mascot-body-layer.svg`。
- 新版 IP 手部/前景层：参考位置 `x=62`, `y=333`, `width=283`, `height=61`。当前分层资产：`summary-mascot-hands-layer.svg`。
- 章节概要卡片：参考位置 `x=50`, `y=354`, `width=303`, `height=212`, `radius=15`。卡片嵌入大 IP 身体中间，层级在 IP 身体之上。
- 概要卡片底色：`ColorToken.contentCardCream`，当前值 `#FDFAF2`。
- 概要卡片阴影：复用 `ShadowToken.softGreen` 体系。
- 概要正文：颜色 `#575757`，字号 `16`，行高约 `1.7`。
- 底部继续按钮：参考位置 `x=50`, `y=681`, `width=303`, `height=53`, `radius=15`。
- 继续按钮底色：`ColorToken.primaryActionGreen`，当前值 `#A5AE66`。
- 继续按钮文字：`ColorToken.primaryActionText`，当前值 `#FFFFFF`。
- 继续按钮阴影：复用 `ShadowToken.softGreen`，即 `#98A35E33 / x=0 / y=4 / blur=4 / spread=0`。
- 继续按钮宽度应与主要内容卡片对齐，正式实现中按容器约束和 safe area 计算，不固定死截图坐标。
- 标准继续按钮 Figma 节点：`315:593`。该节点读取到的默认尺寸为 `321 x 53`，圆角 `15`，文字字号 `16`，并带标准 `softGreen` 阴影。具体页面实例可以根据内容卡片宽度调整横向宽度，但高度、圆角、底色、文字层级和阴影应保持一致。
- `summary-mascot-complete-reference.svg` 只作为 HTML mock 和视觉校准参考。它包含 IP、概要卡片参考形状、参考文字路径和手部层级；正式 SwiftUI 不应把整张图作为生产素材直接渲染，否则会把动态概要文字固化。
- HTML mock 与正式 SwiftUI 采用同一套层级：`summary-mascot-body-layer.svg` 作为底层，动态概要卡片与文字作为中层，`summary-mascot-hands-layer.svg` 作为顶层。这样可以复刻 Figma 中“IP 身体在底、卡片在中、手部在上”的遮挡关系，同时保持内容可变。

建议组件：

- `ChapterSummaryView`：章节概要页。
- `V2PrimaryActionButton`：复用主行动按钮，当前用于“继续”。

实现边界：

- IP 身体、脸部、眼镜、手部属于视觉资产/插画层，可以分层导入或用临时 HTML 绘制校准。
- 概要卡片、概要正文、返回按钮和继续按钮必须是代码组件和真实文本，不能整页切图。
- `TopCircleButton(icon: .back)`：返回按钮。

实现注意：

- SVG 中大量正文已经被转成 path，不能作为正式文字资产使用。SwiftUI 中章节标题、概要正文和按钮文字都应使用真实 `Text`，保证动态内容、换行、无障碍和本地化。
- 概要正文是章节开始前的“记忆唤醒锚点”，应该概括章节核心，而不是简单罗列知识点。
- 页面装饰植物、IP 和地面阴影属于弱装饰层，不能抢概要卡片和继续按钮的视觉主层级。
- IP 形象第一版可以使用静态图；后续按主页 IP 动效方案替换为 loop 动画或状态图。
- “继续”按钮语义是推进当前线性学习流程，不用于返回、取消或二级操作。

## 上传页

用户提供的 Figma 节点：

- 文件：`Pick The Shell`
- 节点：`326:817`
- 节点名：`上传`

上传页用于让用户粘贴文章链接并生成复习内容。当前页面里最关键的不是某个绝对坐标，而是 IP 形象、输入卡片和前景手部素材之间的层级关系。

当前 Figma 读取到的稳定结构：

- 页面背景：浅绿色背景，底部有更浅的固定区域，用于承接底部导航。
- 背景装饰：复用用户提供的植物/地形 SVG 资产，不用 CSS 临时重画。
- 中部组合区域：`记笔记` group，包含 IP 后层、输入卡片和 IP 前层。
- IP 后层：`Group 68`，包含 IP 身体和脸，应处在输入卡片后方。
- 输入卡片：`Group 35`，是用户粘贴文章链接的真实交互卡片，应压在 IP 身体上方。
- IP 前层：`Group 69`，包含手、笔和笔记本，应压在输入卡片上方。
- 底部主按钮：复用 `V2PrimaryActionButton` 视觉体系，文案为“开始生成”。
- 底部导航：复用 `V2BottomNavigationBar`，不在上传页重新创建导航样式。

当前已归档素材：

- `design-assets/upload-mascot-back.svg`：上传页 IP 后层。
- `design-assets/upload-mascot-front.svg`：上传页 IP 前层，包含手、笔和笔记本。
- `design-assets/upload-link-icon.svg`：上传页链接输入框左侧 link icon。
- `design-assets/upload-page-figma-reference.png`：上传页 Figma 参考截图。

SwiftUI 中建议拆分：

- `UploadMascotBackLayer`：IP 身体后层 SVG/PDF 资产。
- `UploadLinkInputCard`：真实 SwiftUI 组件，包含标题、链接输入框、链接 icon 和占位文案。
- `UploadMascotFrontLayer`：IP 手部、笔和笔记本前层 SVG/PDF 资产。
- `V2PrimaryActionButton(title: "开始生成")`：生成按钮。
- `V2BottomNavigationBar(selected: .upload)`：底部导航。

建议渲染顺序：

```swift
ZStack {
    UploadDecorations()
    UploadMascotBackLayer().zIndex(1)
    UploadLinkInputCard().zIndex(2)
    UploadMascotFrontLayer().zIndex(3)
    UploadPrimaryActions().zIndex(4)
    V2BottomNavigationBar(selected: .upload).zIndex(5)
}
```

实现边界：

- 不要把上传页中部整体切成一张图片。只有 IP 后层、IP 前层、植物装饰这类插画资产可以用 SVG/PDF；输入卡片、输入框、按钮和文字必须是 SwiftUI 真实组件。
- 输入卡片的固定视觉关系可以先按 Figma 对齐，但后续正式实现时要考虑键盘弹起、输入内容、错误状态、生成中状态和 safe area。
- IP 前后层的位置应跟输入卡片绑定在同一个局部坐标系内，而不是分别写成屏幕绝对坐标。这样卡片位置微调时，遮挡关系不会散掉。
- 上传页使用的 IP 是新的 `mascot upload/note-taking state`，应纳入 IP 资产状态集合；它和主页 idle IP、答题反馈 IP、结算页 IP 是不同状态。
- 前层资产包含手、笔和笔记本，属于遮挡输入卡片的前景层；不要在 SwiftUI 中把手部和笔记本并入后层，否则会丢失“IP 正在拿笔记录”的空间关系。

## 通知页

用户提供的 Figma 节点：

- 文件：`Pick The Shell`
- 节点：`333:950`
- 节点名：`通知`

通知页用于展示生成成功、生成失败等系统通知。当前页面里出现了新的右上角 IP 状态，已使用用户提供的 `notification-mascot.svg`，不再复用静态首页 IP 占位。

新版通知页参考节点更新为 Figma `333:818`。这个版本在通知标题下方新增一个未读数 banner，用于提示当前有几条新通知。IP 形象仍使用 `notification-mascot.svg`，但层级应压在这个 banner 右侧上方，而不是独立漂浮在空白处。

当前已归档素材：

- `design-assets/notification-page-figma-reference.png`：通知页 Figma 参考截图。
- `design-assets/notification-mascot.svg`：通知页右上角专用 IP 形象。
- `design-assets/notification-success-icon.svg`：章节生成成功通知 icon。
- `design-assets/notification-failure-icon.svg`：章节生成失败通知 icon。

实现共识：

- 顶部返回按钮复用 `V2CircleIconButton(kind: .back)`。
- 页面标题使用统一页面标题规范，位置根据 safe area 和阅读性校正，不硬编码 Figma 手动拖拽坐标。
- 页面标题和左侧返回按钮的位置优先遵守全局页面 top bar 规范，不按 Figma 页面实例里的绝对坐标；新版通知页标题当前按同层级页面标题使用约 `22 bold`，和返回按钮中心线对齐。
- 顶部未读数 banner 抽象为 `V2NotificationSummaryBanner`，动态接收 `unreadCount`。文案结构为“你有 `N` 条新通知”，其中 `N` 是动态数字；banner 里不额外显示解释性灰色小字。banner、文字和数字由 SwiftUI 代码绘制，不整图导入。
- 新版未读数 banner 的层级来自 Figma `333:823` 和用户提供的组合 SVG：banner 底卡在最下层，通知页 IP 压在 banner 上方，浅绿色波浪装饰压在 IP 之上，文字内容位于最上层。SwiftUI 实现时拆成 `background card -> mascot -> green wave asset -> text overlay`，不要把整组导成一张图片。
- 用户提供的组合 SVG 中，banner 本体为 `321 x 82`，整体参考位置为 `x=4 y=53`；IP 资产相对 banner 左上约为 `x=178 y=-46`；浅绿色波浪被 banner 圆角 mask 裁切，已提取为 `notification-banner-wave.svg`。文字仍由 SwiftUI `Text` 动态渲染。
- 通知卡片抽象为 `NotificationCard` 组件，成功和失败只切换状态色、icon、标题、正文和点击行为。
- 通知卡片内部使用统一网格：左侧未读点 + 圆形 icon 底，中间标题/时间/正文，右侧 chevron。
- 成功状态使用绿色体系，失败状态使用红色体系。
- 本轮已读取通知卡片 variant：`success = 451:1233`，`failure = 451:1234`。卡片统一 `321 x 108`、圆角 `15`、底色 `#FDFAF2`、阴影 `0 4 4 #98A35E33`；标题 `14 Medium #212121`，正文 `12 Regular #676767`，时间 `10 Regular #737373`。
- 用户补充了通知卡原始 SVG：画布 `329 x 116`，真实卡片为 `x=4, y=0, width=321, height=108`。SwiftUI 组件以 `321 x 108` 作为卡片本体时，SVG 内部横坐标需要统一减去 `4`。
- 通知卡精确锚点：未读点 `x=18, y=50, r=3`；状态 icon 圆心 `x=61.5, y=51.5`；标题文字左起约 `x=112.8`、顶部约 `y=20.5`；正文左起约 `x=111.5`、顶部约 `y=51.3`；时间“刚刚”中心约 `x=300, y=27`；右箭头中心线约 `x=300`，箭头视觉中心 `y=54`。时间必须和右箭头共享竖直中心线，不要放进标题行 `HStack` 里随正文宽度漂移。
- 成功/失败 icon 使用已有 `notification-success-icon.svg` / `notification-failure-icon.svg` asset；卡片、文字、时间和 chevron 由 SwiftUI 绘制。
- 用户指出 Figma 中失败 icon 曾被拖歪；开发端应把状态 icon 视觉居中放在圆形底中心，而不是照抄该偏移。
- 右上 IP 属于通知页专用 mascot state，SwiftUI/Xcode 阶段应引用 `notification-mascot` 资产，不能再使用 `mascot-static` 占位。

SwiftUI 建议组件：

- `NotificationView`
- `NotificationCard`
- `NotificationStatusIcon`
- `V2CircleIconButton(kind: .back)`

## 个人主页

用户提供的 Figma 节点：

- 文件：`Pick The Shell`
- 节点：`384:1266`
- 节点名：`个人主页`

个人主页用于展示用户昵称、自我介绍、复习统计和基础设置入口。当前页面中的头像/IP 还没有专用最终素材，HTML prototype 先用已有静态 IP 占位；正式 SwiftUI 实现前应替换为用户提供的个人主页专用头像或 IP 状态。

当前已归档素材：

- `design-assets/profile-page-figma-reference.png`：个人主页 Figma 参考截图。
- `design-assets/profile-stat-reviewed.svg`：资料卡“已复习”统计 icon，独立 `32 x 32` 透明画布资产。
- `design-assets/profile-stat-streak.svg`：资料卡“连续学习”统计 icon，独立 `32 x 32` 透明画布资产。
- `design-assets/profile-stat-card-reference.svg`：单个统计卡参考 SVG，用于校准组件内部相对位置，不作为整卡切图。
- `design-assets/profile-setting-notification.svg`：设置列表“通知设置”icon，独立 `33 x 33` 透明画布资产。
- `design-assets/profile-setting-privacy.svg`：设置列表“隐私说明”icon，独立 `33 x 33` 透明画布资产。
- `design-assets/profile-setting-account.svg`：设置列表“账号说明”icon，独立 `33 x 33` 透明画布资产。

实现共识：

- 顶部返回按钮复用 `V2CircleIconButton(kind: .back)`。
- 页面标题使用统一页面标题规范，位置根据 safe area 和阅读性校正。
- 上方资料卡抽象为 `ProfileHeaderCard`，包含头像、昵称、自我介绍、两个统计卡和轻量背景装饰。
- 统计卡抽象为 `ProfileStatCard`，数字和单位由数据驱动。当前包含“已复习 / 个知识点”和“连续学习 / 天”。
- 设置列表抽象为 `ProfileSettingsCard`，每行复用 `ProfileSettingRow`，包括左侧 icon、标题和分割线。
- SwiftUI 个人主页不要再用通用 `V2InfoCard` 把 IP、统计卡和设置列表分散堆叠；应使用 `V2ProfileHeaderCard` 承载头像、昵称、自我介绍、两个统计卡和卡内装饰，设置区使用固定 `321 x 190` 的 `V2ProfileSettingsCard`。
- 个人主页标题按黄金稿使用“我的”，标题字号为 `22`，不是通用流程页 `28` 号标题。
- `ProfileStatCard` 不应按每个数字手动调 `left`。左侧 icon 和下方数字应共享一条视觉中心线，数字使用固定宽度或居中容器承载；右侧单位必须和数字放进同一行文本组，并按底部基线/视觉底部对齐。SwiftUI 推荐 `HStack(alignment: .lastTextBaseline)`，不要把数字和单位拆成两个独立绝对定位文本。
- 统计卡参考 SVG 的组件参数：卡片本体 `96 x 72`、圆角 `15`；icon `23 x 23`，相对卡片左上 `10, 9`；标题文字约从 `48, 17` 起；数字组相对左侧约 `8`，底部约距卡片底 `13`。HTML mock 已按该参考微调，正式 SwiftUI 仍应用真实 `Text` 和组件布局复刻。
- `ProfileSettingsCard` 内部行高、icon 尺寸、文字起点和分割线缩进应由组件统一决定。若 Figma 中三行有手拖导致的微小偏差，SwiftUI 以组件网格为准。
- 资料卡、统计卡、设置卡、分割线和文字都用 SwiftUI 真实组件绘制；SVG 只用于 icon 或插画资产。
- 如果 Figma 中 icon 或文字因手动拖拽产生轻微不齐，开发端按组件网格做视觉居中，不照抄偏移误差。

SwiftUI 建议组件：

- `ProfileView`
- `ProfileHeaderCard`
- `ProfileStatCard`
- `ProfileSettingsCard`
- `ProfileSettingRow`
- `V2CircleIconButton(kind: .back)`

SwiftUI 资产建议：

- 统计 icon 使用已归档的独立资产：`profileStatReviewed`、`profileStatStreak`，不要再从 `profile-stat-icons.svg` 裁切。
- 设置 icon 使用已归档的独立资产：`profileSettingNotification`、`profileSettingPrivacy`、`profileSettingAccount`，不要再从 `profile-settings-icons.svg` 裁切。
- 个人头像/IP 等待用户提供专用素材；占位素材不能进入最终组件库。

## 全部章节页

用户提供的 Figma 节点：

- 文件：`Pick The Shell`
- 节点：`388:1184`
- Figma 节点名：`上传`
- 实际页面语义：`全部章节`

注意：该 Figma 节点当前命名不准确。后续代码和文档应按 `MaterialsView` / `AllChaptersView` / `ChapterList` 命名，不沿用 `Upload`。

当前已归档素材：

- `design-assets/materials-page-figma-reference.png`：全部章节页 Figma 参考截图。
- `design-assets/materials-mascot.svg`：全部章节页顶部 IP 形象，用户直接提供。
- `design-assets/chapter-source-icon.svg`：章节卡左下角“网页文章”小图标，从 Figma 远程 asset 下载并归档。

Figma 精确读取到的结构：

- 页面标题：`全部章节`。
- 顶部统计卡：`x=45, y=172, width=321, height=82`，卡片底色 `#FDFAF2`，圆角 `15`，阴影为基础绿色投影。
- 顶部 IP：`x=198, y=104, width≈165, height=137`。
- 统计文案：`已生成 12 个章节`，按 HTML/Figma 黄金稿使用小型文案样式：普通字 `12 Regular #383838`，数字 `20 Bold #A5AE66`，整体位于统计卡内 `x=23, y=28`。不要套用个人统计卡或大号数字样式。
- 章节卡一：`x=44, y=301, width=321, height=136`，状态 `复习中`。
- 章节卡二：`x=44, y=460, width=321, height=136`，状态 `已完成`。
- 章节卡三：`x=44, y=619, width=321, height=136`，状态 `未复习`。
- 章节卡标题：`如何把AI Agent用到你的生意经`。
- 元信息：左侧 `网页文章`，右侧 `8个知识点 19道题`。
- 本轮整卡参考节点：`451:1261`。整卡 `321 x 136`、圆角 `15`、底色 `#FDFAF2`、阴影 `0 4 4 #98A35E33`。标题 `16 Medium #383838`，元信息 `11 Regular #ACACAC`。
- 整卡内状态 tag 位于左上区域，复用 `V2ChapterStatusTag`；左下来源 icon 使用 `chapter-source-icon.svg`，来源文字和右下数量信息由真实 `Text` 渲染。

章节卡状态规范：

- 本轮读取到的 `451:1245`、`451:1246`、`451:1247` 是章节状态 tag，不是整张章节卡。它们应沉淀为 `ChapterStatusPill` / `V2ChapterStatusTag`。
- `notStarted` / 未复习：tag `55 x 22`，圆角 `15`，底色 `#E9E9E9`，文字 `#878787`，`12 Regular`。
- `reviewing` / 复习中：tag `55 x 22`，圆角 `15`，底色 `#FCEDC4`，文字 `#C08D26`，`12 Regular`。
- `completed` / 已完成：tag `55 x 22`，圆角 `15`，底色 `#E8EBBD`，文字 `#98A84E`，`12 Regular`。

实现共识：

- 底部导航复用 `V2BottomNavigationBar(selected: .materials)`，并使用 `materialsSelected` 独立 vector asset 渲染选中态。不要从大 sprite 图裁切缩放。
- 顶部统计卡抽象为 `GeneratedChaptersSummaryCard`，数字由数据驱动。
- 章节列表抽象为 `ChapterList`。
- 每个章节卡抽象为 `ChapterCard`，不同状态只切换 tag 的文案、底色和文字色。
- 章节卡本体、文字、tag、元信息布局都应由 SwiftUI 真实组件绘制；IP 和背景装饰可以使用 SVG/PDF 资产。
- `chapter-source-icon.svg` 是可以精确读取并下载到的素材；后续应进入 Xcode asset catalog，不依赖 Figma 临时 URL。

SwiftUI 建议组件：

- `MaterialsView` 或 `AllChaptersView`
- `GeneratedChaptersSummaryCard`
- `ChapterList`
- `ChapterCard`
- `ChapterStatusPill`
- `V2BottomNavigationBar(selected: .materials)`

待后续确认：

- 点击章节卡后进入章节详情页，还是直接继续该章节复习。
- `reviewing` 状态是否需要展示题目级/知识点级进度。
- 是否需要支持生成失败、生成中、已归档等更多章节状态。

## 笔记页

用户提供的 Figma 节点：

- 文件：`Pick The Shell`
- 节点：`390:1231`
- 节点名：`笔记`

笔记页对应底部导航里的“笔记” tab，用于展示用户收藏过的题目。它目前是一个以收藏题目列表为核心的页面：上方是收藏统计卡和笔记页专用 IP，下面是题目卡列表。

当前已归档素材：

- `design-assets/notes-page-figma-reference.png`：笔记页 Figma 参考截图。
- `design-assets/notes-mascot.svg`：笔记页顶部专用 IP 形象。
- `design-assets/notes-summary-wave.svg`：顶部收藏统计卡底部绿色波形/mask 参考资产。
- `design-assets/notes-summary-card-reference.svg`：顶部收藏统计卡完整参考 SVG，用于校准外框、底卡、mask 和阴影范围；不作为整卡切图。
- `design-assets/notes-bookmark.svg`：收藏题目卡右上角收藏 icon，使用用户提供的精确 SVG。
- `design-assets/notes-card-reference.svg`：收藏题目卡参考 SVG，用于校准文字、tag、收藏 icon 和卡片内部坐标；不作为整卡切图。

实现共识：

- 底部导航复用 `V2BottomNavigationBar(selected: .notes)`，并使用 `notesSelected` 独立 vector asset 渲染选中态。不要从大 sprite 图裁切缩放。
- 页面标题使用统一页面标题规范。
- 顶部统计区域抽象为 `NotesSummaryCard`，展示“已收藏 N 个题目”。数字由数据驱动。
- `NotesSummaryCard` 的大卡片、文字和数字由 SwiftUI 组件绘制；底部绿色波形可以使用 `notes-summary-wave.svg`、`notes-summary-card-reference.svg` 或精确 Shape 复刻，不用椭圆近似。参考结构：外框 `329 x 90`，内部白色底卡 `x=4, y=1, 321 x 81, rx=15`，mask 区域 `x=4, y=0, 321 x 82`。
- 收藏统计文字来自 Figma 节点 `390:1377`：页面位置约 `x=68, y=202, w=131, h=24`；普通文字 `#383838`、12px、Regular；数字 `#A5AE66`、20px、Bold；整体字距约 `-0.8px`。字段间距应来自同一个文本节点中的真实空格和 styled runs，不使用额外 padding 或 `&nbsp;` 去模拟。不得在读不到数据时自行改字体、颜色或间距。
- 笔记页 IP 是独立 mascot state，命名可使用 `mascotNotes` 或 `notesMascot`；它不同于主页 idle IP、上传页 IP、答题反馈 IP 和结算页 IP。
- 收藏题目卡抽象为 `SavedQuestionCard`，包含题干、来源/章节描述、题型标签和收藏标记。
- 题目卡、标签、文字和列表布局都应由 SwiftUI 真实组件绘制；收藏标记使用 `notes-bookmark.svg` 小型资产；只有 IP、背景装饰和这类精确 icon 使用 SVG/PDF 资产。
- `SavedQuestionCard` 需要按 Figma 原始 text 节点和 `notes-card-reference.svg` 校准：题干文字盒相对卡片左上约 `18, 8`，尺寸约 `258 x 51.63`，内部垂直居中，文字为 `#383838`、16px、Medium、行高 `1.7`；来源文字盒相对约 `20, 55`，尺寸约 `213 x 19`，内部垂直居中，文字为 `#827C75`、11px、Regular、行高 `1.7`；题型标签为 `55 x 22`、圆角 `11`、底色 `#F4F2DF`，标签文字 `#5A5D2C`、12px、Regular；收藏 icon 固定在右上约 `286, 25`。不能为了“统一组件”擅自把 tag 文字加粗、把标题改成更重字重，或把颜色换成近似深色。
- 目前 HTML prototype 以固定卡片高度模拟第一版效果；正式 SwiftUI 可以先固定高度，后续如收藏题目标题出现更长文本，再扩展为自适应高度。

SwiftUI 建议组件：

- `NotesView`
- `NotesSummaryCard`
- `SavedQuestionCard`
- `QuestionTypePill`
- `V2BottomNavigationBar(selected: .notes)`

待后续确认：

- 点击收藏题目卡后进入题目详情、原题回看，还是进入对应章节位置。
- 是否需要支持按题型、文章、收藏时间筛选。
- 收藏题目为空时的空状态文案和 IP 状态。

## 发现页

用户提供的 Figma 节点：

- 文件：`Pick The Shell`
- 节点：`380:983`
- 节点名：`发现`

发现页对应底部导航里的“发现” tab，用于展示预设好的好文推荐。它承担两个角色：一是帮助新用户快速理解产品可以把文章转成复习路径；二是让用户不上传内容也能体验完整学习闭环。

当前已归档素材：

- `design-assets/discover-page-figma-reference.png`：发现页 Figma 参考截图。
- `design-assets/discover-article-thumbnail.svg`：HTML prototype 中用于推荐文章卡片右侧的临时缩略图资产。
- `design-assets/discover-hero-mascot.svg`：发现页 hero/banner 右侧专用 IP 形象。
- `design-assets/discover-hero-banner.svg`：发现页顶部 banner 的完整 Figma 参考 SVG，只用于校准结构、坐标、层级和视觉细节，不作为正式组件整图使用。
- `design-assets/discover-filter-chip-states-reference.svg`：分类 filter/chip 的 selected / inactive 参考 SVG，只用于校准圆角、描边、阴影和状态色。
- `design-assets/discover-article-card-reference.svg`：推荐文章 banner/card 的完整 Figma 参考 SVG，只用于校准卡片、封面区、tag 尺寸和阴影，不作为正式整卡素材。

实现共识：

- 底部导航复用 `V2BottomNavigationBar(selected: .discover)`。
- 页面标题使用统一页面标题规范。
- 顶部 `DiscoverHeroCard` 展示“发现好内容”和一句价值说明，右侧使用用户提供的 `discover-hero-mascot.svg` 专用 IP 资产。完整 banner SVG 只能作为校准参考；正式实现中卡片、文字和布局应由 SwiftUI 组件绘制。
- 分类筛选抽象为 `V2DiscoverChip`，包含 selected / inactive 状态。当前示例包含“全部 / AI / 产品 / 金融”。
- 推荐文章抽象为 `RecommendedArticleCard`，包含标题、来源、标签和右侧 thumbnail。
- 推荐文章卡片应使用真实文本和图片资产，不能整卡切成图；后续预设文章题目已经提前生成时，也应通过数据驱动填充。
- Figma 中的具体 y 坐标和卡片间距可作为参考；正式 SwiftUI 应根据 safe area、底部导航和内容滚动来布局。

当前发现页 banner 对齐问题复盘：

- 完整 banner 参考 SVG 的外层画布是 `329 x 143`，真实卡片只占其中 `x=4, y=53, width=321, height=82, rx=15`。IP 形象本来就从卡片上方探出，不能被卡片裁切。
- 之前 HTML prototype 把 `DiscoverHeroCard` 自身当成 `321 x 82` 的卡片，并设置了 `overflow: hidden`，因此会把 IP 头部截掉。
- 之前把文字、底部波浪和 IP 拆开后没有完全按参考 SVG 的层级还原，导致字体位置、底部装饰和视觉关系不准。
- 正确实现边界：卡片底、文字、动态文案和分类 chip 用代码组件；IP、手绘植物/波浪等不可参数化插画可以用 SVG/PDF 素材；完整 SVG 用来查错和校准，不直接作为整块 UI。
- `DiscoverHeroCard` 的文字排版不按 Figma 导出 path 的绝对坐标硬编码，但字体参数必须遵守 Figma 视觉稿，不能擅自加粗或加深颜色。节点 `380:1042` 已确认：标题 `#A5AE66`、16px、Medium、字距约 `-0.64px`；说明文字 `#575757`、10px、Regular、行高约 `19px`、字距约 `-0.24px`。布局层面可使用稳定左内边距、标题与副文案固定间距，副文案宽度避开右侧 IP 区域。
- `V2DiscoverChip` 应使用代码绘制。本轮读取到 `inactive = 450:1186`、`selected = 450:1187`；尺寸参考 `61 x 27`，圆角 `10`，描边 `#DDE1AC`，阴影 `0 4 4 #98A35E33`；未选中底色 `#FEF9F2`、文字 `#5E5E5E`；选中底色 `#929A4F`、文字 `#FEF9F2`；字号 `12 Regular`，行高约 `1.7`。文字随分类数据变化，不作为 SVG 的一部分。
- `RecommendedArticleCard` 应使用代码绘制卡片结构：整体参考尺寸 `321 x 94`，圆角 `15`，使用基础投影。Figma 参考节点：`381:1117`。
- 推荐文章卡片不是普通的左右 grid，而是三层夹图结构：底层是带圆角和投影的大矩形容器；中间层是文章封面/thumbnail 图片；顶层是左侧白底信息面板，承载标题、来源和 tags。图片被底层容器和顶层白底信息面板夹住，只在右侧露出。
- `381:1117` 读取到的关键层级参数：底层整卡为白色 `RoundedRectangle`；右侧图片层参考 `x=202`, `width=119`, `height=94`；左侧信息面板参考 `width=231`, `height=94`, 底色 `#FDFAF2`, 圆角 `15`。左侧信息面板会盖住一部分右侧图片，这不是错误，而是“夹图”结构的一部分。
- SwiftUI 实现建议使用 `ZStack(alignment: .leading)`：最底层 `RoundedRectangle` 提供圆角、裁切和阴影；中间层放 `Image` 并按卡片整体裁切；顶层放固定宽度的信息面板，面板自身也使用同一卡片圆角体系。不要用简单 `HStack` 把文字和图片割裂成两个并排区域。
- 右侧封面区是文章缩略图资产，不属于卡片组件本体；卡片组件只负责承载和裁切图片。
- 推荐文章标题参考：`#383838`、`12px`、Regular、行高约 `1.7`；来源参考：`#A3A3A3`、`10px`、Regular、行高约 `1.7`。HTML mock 曾经把标题写得偏粗偏深，后续 SwiftUI 不应沿用那个错误版本。
- `ArticleTagPill` 应沉淀为独立代码组件：参考尺寸约 `35.4 x 15.7`，圆角约 `8`，描边 `#DDE1AC`，底色 `#FEF9F2`，阴影同基础投影参数，文字色 `#5E5E5E`，字号约 `8px`。标签文字由文章数据驱动。
- 用户提供的推荐文章 banner SVG 主要用于纠正参数和排版理解；其中卡片、tag、文字都不应整图素材化。

SwiftUI 建议组件：

- `DiscoverView`
- `DiscoverHeroCard`
- `V2DiscoverChip`
- `RecommendedArticleCard`
- `ArticleTagPill`

待后续确认：

- 点击推荐文章卡片是进入文章阅读详情，还是直接进入推荐文章详情页。
- “一键生成/开始学习”入口是在卡片详情里，还是卡片本身承担主点击。
- 推荐文章卡片右侧 thumbnail 是否由每篇文章独立图片提供，或先使用统一占位资产。

## 单元总览页与顶部进度条

单元总览页是用户进入某个知识点 unit 后看到的第一个页面。它从章节概要页之后承接流程，先展示该知识点的核心总览，再进入该 unit 内的题目。

用户提供的 Figma 节点：

- 文件：`Pick The Shell`
- 节点：`315:602`
- 节点名：`Knowledge Point Preview`

当前可提取的稳定规范：

- 页面背景色：`ColorToken.pageGreenBackground`，当前值 `#E8EBBD`。
- 顶部返回按钮：复用 `TopCircleButton` 容器。
- 黄金稿顶部没有页面大标题；SwiftUI 不应自动补 `核心知识点` 或 `单元1` 之类的标题。
- 顶部右侧按钮：文档类 icon，后续使用用户单独提供的 SVG/PDF 素材；当前语义是查看原文或相关来源内容。
- 顶部进度条：轨道参考宽度 `321`，高度约 `11`，圆角 `15`。
- 本轮读取到 `UnitProgressBar` 参考节点：空状态 `451:1270`，进度状态 `315:636`。Figma 外层容器为 `321 x 43`，用于承载阴影和垂直留白；真正可见轨道约 `321 x 11`，不要把 `43` 误实现为进度条本体高度。
- 进度条轨道底色：`ColorToken.cardCream`，当前值 `#FCF8ED`。
- 进度条已完成部分：`ColorToken.unitProgressFill`，当前值 `#D4D89B`。
- 进度条阴影：复用 `ShadowToken.softGreen`，即 `#98A35E33 / x=0 / y=4 / blur=4 / spread=0`。
- 进度条本身不显示 `3 / 3` 这类数字标签；数字如果未来需要展示，应作为另一个明确设计过的组件处理。
- 知识点开场页是 unit 的第一页，动态进度条只显示很短一段。HTML 黄金稿当前使用约 `11.2%` 的初始进度，不应因为 fixture 中该 unit 有 3 道题就把进度算成 `3 / 3` 或拉满。
- 知识点总览卡片新版参考节点：`445:1505`；卡片 + IP 组合参考节点：`449:2365`。
- 知识点总览卡片：参考位置 `x=40`, `y=248`, `width=321`, `height≈241`, `radius=15`。
- 总览卡片底色：`ColorToken.contentCardCream`，当前值 `#FDFAF2`。
- 总览卡片新版不使用阴影，改用 `#929A4F / 1px` 描边。
- 总览卡片下方两条斜线是白板支架装饰，由代码绘制，不作为动态内容或独立业务组件。Figma 参考约为两条 `14.5 x 66.5` 的浅绿色斜线。
- 白板支架、白板卡片、IP 必须在 SwiftUI 里作为同一个局部 `ZStack` 的三层：支架 `zIndex(0)`，白板卡片 `zIndex(1)`，IP `zIndex(2)`。支架上端应被白板卡片压住，不能画在卡片前面。
- `449:2365` 组合参考坐标：支架约为 `left=133/240.5`, `top=492`, `size=14.5 x 66.5`；白板卡片约为 `left=40`, `top=248`, `size=321 x 241.438`；IP 约为 `left=244`, `top=423`, `size=153 x 180`。HTML mock 为了模拟“被卡片压住”的效果，代码绘制支架可以略微向上进入卡片区域，再由白板卡片遮盖。
- 新版 IP 讲解状态已归档为 `design-assets/unit-overview-mascot.svg`，用于表达“IP 指着白板讲解核心知识点”的状态。
- 正文颜色：`#575757`，字号约 `16`，行高约 `1.7`。
- 底部继续按钮：复用标准 `V2PrimaryActionButton`。

实现共识：

- SwiftUI 中建议抽象为 `UnitOverviewView`。
- 顶部进度条建议抽象为 `UnitProgressBar`，后续题卡页也复用同一组件。
- 进度条表示当前 unit 内复习状态，不表示整篇文章进度。
- 从这一页开始，进入 unit 内的页面都展示该顶部进度条。
- 点击“继续”进入当前 unit 的第一道题，或恢复到该 unit 上次中断位置。
- 顶部进度条的位置、页面标题位置、按钮位置等在 SwiftUI 中可根据 safe area 与阅读性调整；固定复用的是颜色、圆角、阴影、状态计算逻辑和用户提供的 icon 资产。
- 知识点总览文字使用真实 `Text`，不能作为图片或 SVG path 导入。
- SwiftUI 落地约束：核心知识点页必须使用 `V2UnitOverviewBoardCard` 这类白板专用组件，不应复用普通 `V2InfoCard`。该组件的布局锚点以 `321` 宽白板卡片为准居中；IP 可以向右侧溢出形成“指着白板讲解”的层级效果，不能为了让整个组合居中而把白板本身挤偏。

## 选择题题卡页

选择题题卡页是 unit 内正式答题页面之一。当前节点展示的是未作答状态的选择题页面。

用户提供的 Figma 节点：

- 文件：`Pick The Shell`
- 节点：`315:753`
- 节点名：`Select`

已识别复用组件：

- `V2CircleIconButton(kind: .back)`：顶部返回按钮。
- `V2QuestionFavoriteButton`：题目页右上角收藏按钮，包含 `normal / saved` 两态；题目页 top bar 不再使用 `V2CircleIconButton(kind: .sourceDocument)`。
- `UnitProgressBar`：顶部 unit 内复习进度条。
- `MascotView`：右下 IP 形象。
- `ShadowToken.softGreen`：题目大卡投影。

当前新增组件：

- `MultipleChoiceQuestionView`：选择题页面组合。
- `QuestionCard`：题目大卡容器。
- `ChoiceOptionCard`：单个选项卡。

当前可提取的稳定规范：

- 页面背景色：`ColorToken.pageGreenBackground`，当前值 `#E8EBBD`。
- 题目大卡：参考位置 `x=48`, `y=186`, `width=321`, `height=518`, `radius=15`。
- 题目大卡背景：`ColorToken.questionCardCream`，当前值 `#FFFCF4`。
- 题目大卡阴影：复用 `ShadowToken.softGreen`。
- 题干颜色：`#1F1B12`，字号约 `18`，行高约 `26`。
- 选项卡：参考尺寸 `270 x 71`，圆角 `15`。
- 选项卡背景：`ColorToken.answerOptionCream`，当前值 `#FEF8F2`。
- 选项卡描边：`ColorToken.answerOptionBorder`，当前值 `#E0E5BA`，宽度 `1`。
- 选项字母圆背景：当前参考 `#F3EFE7`。
- 选项字母颜色：`#575757`，字号约 `16`。
- 选项正文颜色：`#1F1B12`，字号约 `14`，行高约 `24`。
- 选项正文应左对齐，多行时也保持从左侧阅读起点开始。
- 卡片底部“查看原文”文字入口：颜色参考 `rgba(115, 121, 70, 0.55)`，字号约 `14`。
- 未作答态右下 IP：Figma `315:753` 与 HTML 黄金稿一致，整屏参考位置 `x=302`, `y=599`, `width≈92.632`, `height=136`。它的语义是“贴答题卡右下角并向右溢出”，不是贴整屏最右下角。SwiftUI 应按题卡右边缘锚定：以 `V2Layout.contentMaxWidth` 的右边为基准，IP 左边约在卡片右边内收/重叠 `67pt` 处；不要用整屏 trailing inset 来定位。注意 SwiftUI 中该 IP 位于 `V2FlowScreen` 内容区内，垂直坐标需要扣掉顶部栏内容起点；当前内容区 top 使用 `525pt`，对应整屏约 `599pt`。

实现共识：

- 选择题页顶部控件和进度条直接复用组件库，不重新创建页面专属样式。
- 题目页右上角使用收藏按钮：普通态来自 Figma `523:1229`，已收藏态来自 Figma `523:1230`。该组件不作为截图 PNG 存入资产库；圆形底、阴影、`24 x 24` 星形 SVG path 由 SwiftUI 绘制，外框固定 `44 x 45`。点击后只切换收藏状态，不承担查看章节详情/原文的职责。
- “查看原文”仍保留在题卡内部或答后反馈浮窗内部的文字按钮中；不要把题目页 top bar 右侧按钮恢复成 `sourceDocument`。
- `ChoiceOptionCard` 目前只记录未作答态。后续需要补齐 selected / correct / wrong / disabled 等状态，并检查是否仍复用同一组件。
- 选项文字长度变化时，选项卡高度可以按可读性扩展；不要为了固定高度导致文字拥挤。
- “查看原文”入口用于用户忘记上下文时回到原文，和顶部 source document 按钮的关系后续需要结合原文查看页确认。

### 答后反馈层

选择题答完后会进入答后反馈状态。当前 Figma/HTML 对齐中已经验证：IP 的身体和脸应处在反馈卡片后方，反馈卡片压住 IP 身体的一部分，IP 的手和教鞭再压到反馈卡片上方。这个层级关系是稳定视觉规则。

SwiftUI 中不要把整块反馈区域当作一张 SVG 使用。更合理的拆分是：

- `MascotBackLayer`：IP 身体、脸、地面阴影等后层素材。
- `AnswerFeedbackPanel`：SwiftUI 动态组件，绘制底部反馈卡片、短反馈文案、继续按钮和查看原文入口。
- `MascotFrontLayer`：IP 手部、教鞭等前层素材。
- `FeedbackPanelShape`：只负责奶白色面板底、尖角、描边和投影。HTML 阶段可使用 Figma 导出的 path 做 inline SVG；SwiftUI 阶段建议转为自定义 `Shape` 或 `Path`，通过状态色参数切换 correct/wrong。
- `FeedbackPanelShape` 的左右和底部边缘在 Figma 中是有意外扩并被父 frame 裁切的。SwiftUI 实现时可以用完整 path 做填充，但描边只画顶部和尖角可见路径，避免两侧和底部露出描边。

建议渲染顺序：

```swift
ZStack(alignment: .bottom) {
    QuestionPageContent()
    MascotBackLayer().zIndex(1)
    AnswerFeedbackPanel(feedbackText: feedbackText).zIndex(2)
    MascotFrontLayer().zIndex(3)
}
```

第一版可以先把 `AnswerFeedbackPanel` 的高度固定，只预留适合一到两行短反馈文案的区域。这样能先稳定 IP 和浮窗之间的遮挡关系，降低动态高度导致层级错乱的风险。如果后续测试发现模型经常生成较长的“正确理解”或反馈文案，再升级为动态高度、折叠展开或生成端文案长度约束。

反馈层里的“继续”按钮应使用 `V2FeedbackActionButton`，不直接复用页面级 `V2PrimaryActionButton` 的高度。两者共享圆角、文字层级和状态色体系，但反馈浮窗内按钮更矮：绿色反馈按钮规范为 `321 x 42`，红色反馈按钮也按同一高度收口。
反馈文案必须用真实 `Text` 渲染，不能作为 SVG path 固定进素材。
反馈层底部的“查看原文”应和“继续”主按钮对齐到同一条视觉中心线；不要让主按钮按自身宽度居中、文字按钮按屏幕中心居中，导致两者产生轻微错位。
反馈浮窗内文字排版：标题“正确理解：”和下方正文需要有段落感但不能过松，当前 SwiftUI 使用约 `9pt`。文字组、继续按钮和“查看原文”都应按面板中心线居中；当前中心 `x≈201`。垂直节奏当前为文字组中心 `y≈122`、继续按钮中心 `y≈203`、“查看原文”中心 `y≈250`，让内容整体略向下，同时保留按钮和文字入口之间的呼吸感。

答错状态使用同一套 `ChoiceOptionCard` 和 `AnswerFeedbackPanel`，只切换状态色：

- 用户选错的选项进入 `wrong` 状态，使用红色描边、浅红背景和红底白叉图标。
- 反馈卡片的上边线/向上投影、继续按钮、查看原文和关闭入口切换为红色体系。
- 错题态继续按钮参考 Figma 节点 `449:2347`：背景 `#F36454`，投影 `0 4 4 rgba(243, 100, 84, 0.2)`。Figma 读取高度约 `43.388`，实现时按反馈按钮统一高度 `42` 处理，视为手动尺寸误差。
- 反馈卡片高度、文字位置、按钮尺寸、IP 前后层级、题卡位置和进度条都不应变化。
- 如果 Figma 中答对态与答错态存在轻微坐标或尺寸差异，优先按组件复用逻辑处理，不把这些误差沉淀为新 variant。

## 连线匹配题页面

用户提供的 Figma 节点：

- 文件：`Pick The Shell`
- 节点：`317:728`
- 节点名：`连线题`

实现共识：

- 顶部标题、返回按钮、查看原文按钮和 unit 进度条直接复用题卡页标准位置，不按该 Figma 页面里的手动拖拽坐标单独写死。
- 页面主内容应使用统一内容列：unit 进度条、题干卡片和匹配选项网格共享同一左/右边界；左列选项对齐内容列左边界，右列选项对齐内容列右边界。
- 题干卡片应是动态高度：短题干保持轻量，长题干自然撑高并保持舒适内边距。
- 匹配选项卡使用两列布局，当前静态参考为每列等宽卡片；后续 SwiftUI 中应根据屏幕宽度保留最小间距和可读宽度。
- 当前 HTML mock 已补充 `MatchingOptionCard` 的五个状态样例：`normal`、`selected`、`correct`、`wrong`、`locked`。Figma 组件参考节点依次为 `449:2319`、`449:2323`、`449:2327`、`449:2331`、`449:2335`。
- 连线卡片统一尺寸 `140 x 90`、圆角 `15`、文字字号 `14`、Regular、行高 `24`，内部文本框约 `112 x 61`，状态变化只切换 fill / border / text color / shadow color。
- 题干卡片应动态高度：一行题干基准为 `321 x 67`，背景 `#FFFCF4`、圆角 `15`、阴影 `#98A35E33`、`y=4`、`blur=4`；文字为 `16 regular`、行高 `26`、颜色 `#1F1B12`、文本宽约 `267`。
- 匹配选项卡状态变化不应改变卡片尺寸、列宽和整体布局，只改变颜色、描边、反馈动画和可选性。
- `selected` 是用户只点击第一张卡后的单卡临时状态，使用浅蓝背景和蓝色描边；左右两侧都可以先点击。
- 点击第二张卡后，第二张卡不进入蓝色 `selected`，而是立即触发匹配判断。
- `correct` 是匹配正确后的短反馈态，两张被匹配卡片立即同时显示绿色描边；它不是最终完成态。
- `wrong` 是匹配错误后的短反馈态，两张被点击卡片立即同时显示红色描边/浅红底，然后恢复为可选状态。
- `locked` 是正确反馈结束后的最终态，卡片变为灰白低对比并禁用点击，表示该匹配项已经完成。
- SwiftUI 中建议把交互状态拆成 enum，例如 `MatchingOptionState.normal / selected / correct / wrong / locked`，由状态机驱动，而不是用多个独立 boolean 拼状态。
- 判断逻辑上，用户点击第二张卡后不展示蓝色过渡态；正确时两张卡直接变绿再锁定，错误时两张卡直接变红再恢复。
- SwiftUI 当前实现要求：连线题卡片必须使用 `V2MatchingOptionCard` 固定尺寸 `140 x 90`，不能用 `maxWidth` 或根据文字行数动态撑高；一行和两行文字都在卡片中垂直/水平居中。
- SwiftUI 当前实现要求：连线题未作答/未完成时保留 IP 形象，使用已沉淀资产 `V2MatchingMascot`（`matching-mascot.svg`）。完成后切换为 `V2AnswerFeedbackPanel` 内的反馈 IP 分层。
- SwiftUI 当前实现要求：连线题全部匹配完成后的解释浮窗复用 `V2AnswerFeedbackPanel`，作为贴近屏幕底部的浮层出现，不能作为普通内容插入 `ScrollView` 或题目网格下方。

## 单元总结页

单元总结页出现在用户完成某个知识点 unit 的最后一道题之后。它不是整章结束页，而是一个小阶段完成反馈页，用于让用户确认当前知识点已经完成，并继续进入下一个 unit 或最终章节总结。

用户提供的 Figma 节点：

- 文件：`Pick The Shell`
- 节点：`451:1454`
- 节点名：`Group 39`

当前读取到的顶部结果 banner 参数：

- Banner 尺寸：`321 x 107`
- Banner 背景：`#FDFAF2`
- Banner 圆角：`15`
- Banner 阴影：`DROP_SHADOW #98A35E33, x=0, y=4, blur=4, spread=0`
- 左侧勋章/奖章为独立图片层。
- 评价词示例：`烂熟于心`，颜色 `#748830`，字号约 `20`，Bold。
- 评价词两侧短线装饰为独立矢量/图片层，不和文字合并。
- 正确率行由真实文本组成：普通说明文字 `#575757`、约 `10`；正确率数字 `#788937`、约 `16`、Bold。
- 单元总结页整页设计已经在 HTML mock 中对齐过：包含单元结算态 IP、勋章/奖章、动态评价词、动态正确率、单元总结文字和底部继续按钮。当前节点只是 banner 组件参考，用于校准字距、排布、勋章和正确率文本层级；它不是在重新定义一张新页面。

流程规则：

- 完成任意 unit 的最后一道题后，下一页进入该 unit 的单元总结页。
- 单元总结页点击继续：如果还有下一个 unit，进入下一个知识点开场页；如果当前 unit 是章节最后一个 unit，进入章节总结/结算页。
- 单元总结页的正确率和评价词只统计当前 unit，不统计整章。

SwiftUI 建议：

- 页面组件：`UnitCompletionView`。
- 结果 banner 组件：`UnitCompletionResultBanner(gradeLabel: String, accuracy: Double)`。
- Banner 底卡、文字和布局由 SwiftUI 绘制；勋章和短线装饰可以使用稳定矢量资产。
- 不要把整个 banner 作为静态图片使用，因为正确率和评价词都需要动态更新。
- Banner 下方的“单元总结”正文区域应保持居中排版，作为阶段反馈文案，不采用左对齐长文阅读卡样式。
- 当前 SwiftUI 已按 HTML 黄金稿拆成 `V2UnitCompletionHero`、`V2UnitCompletionResultBanner` 和 `V2UnitCompletionSummaryCard`：IP 资产 `159 x 252`，成绩 banner `321 x 107`，总结卡 `321 x 241`，底部继续按钮使用页面级 `V2PrimaryActionButton` 且宽度 `321`。成绩 banner 内勋章使用 `completion-medal.svg`，评价词装饰使用 `completion-grade-rays.svg`；评价词、正确率和总结正文仍是动态 `Text`。按钮位置在真机预览中不应过度贴底，当前 SwiftUI 将按钮上移到比 HTML 绝对 top 更紧凑的位置，保持总结卡与按钮之间的空隙更均衡。

## 章节总结页

章节总结页出现在最后一个知识点的单元总结页之后。它回收的是整篇文章/整章层面的完成反馈，而不是单个 unit 的正确率反馈。

用户提供的 Figma 节点：

- 整页：`Pick The Shell`, node `451:1284`。
- IP + 结果卡组合：node `451:1331`。
- 结果卡独立节点：node `451:1467`。

已识别页面结构：

- 中部 IP：新的整章完成态 IP，当前资产为 `chapter-completion-mascot.svg`。
- 结果卡：代码绘制奶白卡片，包含固定标题“章节完成”、动态整章统计文案和动态章节完成总结文案。
- 标题两侧短线装饰使用 `chapter-completion-title-rays.svg`，标题本身仍然是真实动态/固定文本，不与装饰合并成图片。
- 底部主按钮：文案“返回主页”，复用页面级 `V2PrimaryActionButton`，不是答后反馈浮窗内的 `V2FeedbackActionButton`。
- 主按钮下方弱入口：`查看章节详情`，按弱文本按钮处理。

动态字段：

- `statsText`：整章统计，例如“共 7 个核心知识点，21道题目”。
- `chapterCompletionSummary`：整章完成反馈文案，例如“在了解过 hook 的原理和用法之后，你的 vibe coding 能力又更上一层楼了！”。

SwiftUI 建议：

- 页面组件：`ChapterCompletionView`。
- 结果卡组件：`V2ChapterCompletionResultCard(statsText: String, summaryText: String)`。
- IP 使用 `chapter-completion-mascot.svg` 作为直接资产；标题装饰使用 `chapter-completion-title-rays.svg`；结果卡、按钮和文字必须使用 SwiftUI 组件绘制。
- `V2ChapterCompletionResultCard` 的排版以 Figma node `451:1467` 为准：
  - 卡片：`304 x 161`、圆角 `15`、背景 `#FDFAF2`、阴影 `0 4 4 rgba(152,163,94,0.2)`。
  - 标题：区域约 `left 89 / top 14 / 112 x 33`，`24`、Bold、`#F0C559`、居中、行高 `1.7`。
  - 标题装饰：`chapter-completion-title-rays.svg`，区域约 `left 75 / top 19 / 137 x 24`，在标题文字下层。
  - 统计行：区域约 `left 63 / top 35 / 164 x 53`，`10`、Regular、`#989898`、居中、行高 `1.7`。
  - 总结正文：区域约 `left 20 / top 85 / 269 x 53`，`16`、Regular、`#575757`、居中、行高 `1.7`。
  - SwiftUI 实现优先使用系统字体匹配字号、字重、行高和颜色；除非全产品另行决定引入字体，不因该组件单独打包 Alibaba PuHuiTi。
- 当前 SwiftUI 已把章节总结从通用 `V2InfoCard + VStack + Spacer` 改为专用 `V2ChapterCompletionResultCard`：IP 资产按 `347 x 510` 放置，结果卡按 `304 x 161` 绘制，标题装饰、统计行和总结正文均用真实 `Text`/资产分层实现。底部“返回主页”与“查看章节详情”使用黄金稿的纵向节奏，不再由 `Spacer` 自由漂移。

## 底部导航栏

### 视觉目标

底部导航栏是一个自定义浮动 TabBar，而不是系统默认 TabBar。它包含五个 tab：

- 学习
- 资料
- 上传
- 发现
- 笔记

导航栏本体是奶白色圆角胶囊容器，带柔和阴影。每个 tab 是 `icon + label` 结构。中间“上传”是特殊主按钮，视觉上是圆形凸起按钮，比其它 tab 更强调。

选中态目前使用绿色，未选中态使用深灰。图标整体是统一线性风格，但不能默认用 SF Symbols 直接替代，因为设计稿里的 icon 形状需要保持一致。

### 建议实现方式

导航栏本体建议使用 SwiftUI 自定义实现：

- 外层容器用 `RoundedRectangle` 或自定义 Capsule-like shape 绘制。
- 圆角、内边距、阴影、背景色、tab 间距由代码控制。
- 中间上传按钮单独作为凸起子组件处理，而不是普通 tab 等分后简单放大。
- 当前选中 tab 由前端状态驱动，例如 `selectedTab`。
- 图标和文字颜色根据 active/inactive 状态切换。

不建议直接使用系统 `TabView` 默认样式来还原这个视觉，因为默认样式对圆角胶囊、中央凸起按钮、阴影和图标布局控制不够精细。可以保留系统 tab 切换的页面结构思想，但视觉层应该自定义。

### Icon 资产交付要求

为保证每个 tab 的 icon 和设计稿一致，建议用户从 Figma 导出每个 tab 的 vector icon 资产。优先格式：

1. SVG：便于保留原始矢量形状，也便于检查路径。
2. PDF vector asset：适合最终放进 Xcode Asset Catalog。

每个 tab 至少准备 active 和 inactive 两种状态，除非后续确认可以由同一份单色 vector 通过 SwiftUI tint 动态着色。

建议命名示例：

- `tab_learning_active.svg`
- `tab_learning_inactive.svg`
- `tab_materials_active.svg`
- `tab_materials_inactive.svg`
- `tab_upload_active.svg`
- `tab_upload_inactive.svg`
- `tab_discover_active.svg`
- `tab_discover_inactive.svg`
- `tab_notes_active.svg`
- `tab_notes_inactive.svg`

如果图标本身只是单色线性图标，后续可以考虑只导出一份 template vector，再由 SwiftUI 根据状态 tint 成绿色或深灰。但是否可行需要看 Figma icon 是否包含多色、透明度、描边差异或特殊阴影。

### Figma 交付要求

除了 SVG/PDF icon 资产，还建议提供底部导航栏对应的 Figma 节点链接，用于精准测量：

- 导航栏整体宽高。
- 距离屏幕左右和底部的间距。
- 胶囊容器圆角半径。
- 背景色和透明度。
- 阴影参数。
- 每个 tab 的中心点位置。
- icon 尺寸。
- icon 与 label 的垂直间距。
- label 字号、字重和颜色。
- 中央上传按钮的外圈尺寸、内圈尺寸、阴影和凸起高度。

结论：Figma 链接用于精准还原布局和视觉参数；SVG/PDF 资产用于保证 icon 形状一致。两者最好同时提供。

### 当前 Figma 导航栏基准参数

用户提供的 Figma 节点：

- 文件：`Pick The Shell`
- 节点：`352:950`
- 节点名：`Group 63`

当前读取到的导航栏本体参数：

- 整体节点尺寸：`349 x 86`
- 胶囊背景尺寸：`349 x 86`
- 胶囊圆角：`29`
- 胶囊底色：`#fcf8ed`
- 胶囊阴影：`DROP_SHADOW #98a35e33, x=0, y=4, blur=4, spread=0`

用户明确要求：导航栏大小、圆角、阴影需要与该 Figma 节点保持一致。这个阴影特征也可以作为当前 V2 视觉里的基础投影风格，后续同层级卡片、圆形按钮、节点等组件优先复用同一套偏移、颜色和透明度，再根据组件层级做必要微调。

当前读取到的颜色和文字参数：

- 选中绿色：`#98a35e` / icon 内部部分使用 `#98a84e`
- 未选中深灰：`#44423d`
- label 字体：`Alibaba PuHuiTi Regular`
- label 字号：`10`
- label 字距：`0`

当前读取到的中心上传按钮参数：

- 外圆尺寸：`52 x 52`
- 外圆底色：`#e8e9c2`
- 外圆描边：`#fefdfd`
- 描边宽度：`2`
- 外圆阴影：`DROP_SHADOW #98a35e33, x=0, y=4, blur=4, spread=0`
- 加号颜色：`#98a84e`
- 加号描边宽度：`2`

当前读取到的 tab 位置关系：

- 学习 icon 区域约 `32 x 32`，label 位于下方，当前为选中态绿色。
- 资料 icon 约 `20 x 17`，未选中深灰。
- 发现 icon 约 `21 x 19`，未选中深灰。
- 笔记 icon 约 `18 x 17`，未选中深灰。
- 横向中心点应以 Figma 读取到的位置为准，而不是简单做五等分 grid：学习约 `40`、资料约 `107`、上传约 `175`、发现约 `245`、笔记约 `313`。
- 四个普通 icon 的视觉中心线应和中间上传按钮加号的中心线对齐；icon 下方 label 也应按各自 tab 中心对齐。
- 当前节点里中心上传按钮已包含圆形加号按钮；如果最终版本需要显示“上传”文字，需要后续以对应 Figma 节点或用户给定视觉稿为准补齐。

导航栏实现共识：

- 主页中“学习”为 selected 状态，其余普通 tab 为 inactive 状态。
- 用户已经提供当前主页导航栏所需的真实 SVG：学习 selected、资料 inactive、上传按钮、发现 inactive、笔记 inactive。
- 用户已补充 `nav-icons-states-source.svg`，包含学习、资料、发现、笔记四个普通 tab 的 selected / inactive 两套状态源素材。
- 用户进一步补充 `nav-icons-32frame-source.svg`：四个普通 tab 的 selected / inactive 共 8 个状态都放入统一 `32 x 32` 透明 frame。这是后续正式组件库优先使用的 tab icon 状态源。
- 用户新提供 `bottom-nav-learning-reference.svg`，这是主页学习 selected 状态下的完整导航栏黄金参考：外层画布 `357 x 94`，真实胶囊 `x=4, y=0, w=349, h=86, rx=29`，icon stroke 和 label 都是最终视觉状态。
- `nav-icons-states-source.svg` 不能作为正式 tabbar 的直接渲染源。之前 HTML 使用 crop + `scale(0.55)` 截取大图，会连同 `stroke-width` 一起缩放，导致 icon 线条明显偏细，也会放大裁切框导致的位置偏移。
- 正确组件库做法：将四个普通 tab 的 selected / inactive 状态拆成独立 SVG/PDF vector asset，且每个 asset 保持同一个 `32 x 32` 透明画布；或在 SwiftUI/HTML 中使用每个 icon 的原始 path + 对应 `32 x 32` viewBox 渲染。不要把一个大 sprite 图裁切缩放后放入导航栏。
- HTML prototype 已改为在 tabbar 内使用 `nav-icons-32frame-source.svg` 对应的 native 单个 SVG icon 渲染；`nav-icons-states-source.svg` 只保留在状态展示面板里作为早期总览参考。
- 额外注意：`nav-icons-states-source.svg` 里的部分 selected 状态视觉 bbox 比 inactive 大，例如资料/发现/笔记 selected 曾被误用为 `33 x 34` 或 `29 x 32`，导致选中状态比未选中状态明显大一圈。`nav-icons-32frame-source.svg` 通过统一 frame 解决这个问题。正式 SwiftUI 应使用统一画布资产，不能再按 path bbox 自动缩放。
- 从合并 SVG 中手动提取 icon 时，不要用 path 的最小 `x/y` 当作 `viewBox` 原点；这会把资料、发现、笔记等 icon 推到 32 frame 的左侧。正确方式是使用 Figma frame 的真实 `32 x 32` 画布原点，或按 icon 视觉中心反推 frame 原点。最终 SwiftUI 更推荐使用 8 个独立导出的同画布 PDF/SVG asset，避免合并 SVG 里透明 frame 信息丢失。
- 最终 iOS 实现不应使用近似系统 icon 替代用户设计好的 icon；SwiftUI 里应使用用户导出的 SVG/PDF vector asset。
- HTML mock 可以先用于对齐布局、尺寸、色彩和状态逻辑；正式 SwiftUI 需要按这些参数重新实现，而不是直接转换 HTML。

### HTML 对齐稿记录

当前导航栏 HTML 对齐稿：

- `/Users/hanmingyu/Downloads/拾贝-v2-baseline/.superpowers/brainstorm/27932-1781136281/content/bottom-nav-figma-spec.html`

该 HTML 的角色是组件认知对齐稿，不是最终实现代码。它已经用于确认：

- 导航栏整体尺寸、圆角、底色和阴影与 Figma 节点一致。
- 学习、资料、上传、发现、笔记五个入口的视觉结构一致。
- 主页状态下学习为 selected，其余为 inactive。
- 四个普通 tab 的 icon 与 label 需要按各自中心线对齐。
- icon stroke 必须保持 Figma 原始值，例如普通 icon 多数为 `1.5`，上传加号为 `2`。不能用 CSS transform 缩放整张 SVG 来调整大小，否则 stroke 会同步缩放。
- 中间上传按钮不能简单按 SVG 画布居中，需要注意 SVG 内部圆形真实圆心。当前上传 SVG 是 `60 x 60` 画布，按钮圆心在 `y=26`，阴影占用底部空间，因此放置时应以视觉圆心对齐，而不是以 SVG 画布几何中心对齐。
- 导航栏不应使用五等分 grid 粗略布局。当前 HTML 已按 Figma 读取到的横向中心点放置：学习约 `40`、资料约 `107`、上传约 `175`、发现约 `245`、笔记约 `313`。

### SwiftUI 实现方案

底部导航栏应作为自定义 SwiftUI 组件实现，建议拆成：

- `V2BottomNavigationBar`：负责胶囊容器、整体尺寸、安全区位置、tab 布局和选中状态。
- `V2BottomNavItem`：负责普通 tab 的 icon、label、active/inactive 状态。
- `V2UploadTabButton`：负责中间上传按钮，因为它的尺寸、视觉重心和点击行为都不同于普通 tab。
- `V2Tab` enum：定义 `learning`、`materials`、`upload`、`discover`、`notes`。

视觉实现原则：

- 胶囊容器优先按 Figma 固定宽高 `349 x 86` 实现，并水平居中。不同 iPhone 宽度下，优先保持真实尺寸；如果遇到小屏放不下，再按安全边距做等比例压缩或单独适配。
- 胶囊背景、圆角、阴影使用统一 token：`#fcf8ed`、圆角 `29`、阴影 `#98a35e33 / x=0 / y=4 / blur=4`。
- 普通 tab 不建议用简单 `HStack` 五等分；应以 Figma 横向中心点为基准，或用等价的锚点布局复现中心位置。
- icon 使用用户提供的独立 SVG/PDF vector asset，不用 SF Symbols 近似替代，也不用 sprite crop/scale。
- 上传按钮以独立 `upload-tab-button.svg` 作为设计源。该 SVG 是 `60 x 60` 画布，按钮真实圆心在 `y=26`，阴影占用底部空间；SwiftUI 不再依赖 Asset Catalog 直接解析该 SVG 的 `filter/dropShadow`，而是按 SVG 参数用代码绘制圆形、描边、加号和统一阴影，避免 iOS SVG filter 渲染和 Figma/HTML 不一致。
- SwiftUI 实现时要区分“按钮画布中心”和“可见圆形中心”：Figma 导航栏里 `60 x 60` 上传按钮画布从 `y=10` 开始，可见圆形中心是 `10 + 26 = 36`；因此组件 frame 的中心应放在 `y=40`，不能把圆形中心 `y=36` 误当作 frame center。
- 上传按钮下方不显示“上传”文字；它只保留中间圆形加号入口。
- label 字体不内置 `Alibaba PuHuiTi`，正式 iOS 实现使用 iOS 系统字体，并在字号、字重、行高和颜色上尽量贴近 Figma 视觉。
- 导航栏整体位置必须尊重 iOS 安全区，不能为了贴近截图忽略 Home Indicator。实现时应基于底部 safe area，把导航栏放在视觉和触控都合适的位置。
- 选中/未选中颜色先沿用当前 Figma：selected `#98a35e` / icon `#98a84e`，inactive `#44423d`。
- 点击动效暂不在本阶段定死，后续单独讨论 pressed feedback、tab 切换动效和上传入口行为。

### 当前资产结论

- 底部导航 8 个普通 tab 状态 icon 已由用户按统一 `32 x 32` 透明 frame 重新提供，并归档为 `nav-icons-32frame-source.svg`。后续 SwiftUI/Xcode 阶段应以这一版为最终源，不再使用旧的 sprite crop / scale 方案。
- 中间上传入口当前使用单一视觉状态，并已归档为 `upload-tab-button.svg` 设计源。SwiftUI 组件 `V2UploadTabButton` 按该源文件的圆心、半径、描边、加号坐标和阴影参数绘制；如果后续需要 pressed、loading、success 等状态，再补充对应状态资产或动效说明。
- 最终 Xcode 使用的稳定资产格式仍需在进入工程前确认：可以先用 SVG 对齐，SwiftUI/Xcode 阶段优先整理成 PDF vector asset，或确认项目可稳定使用 SVG。
- 如果后续发现某个 icon 在 Figma 或 HTML 中仍有偏移，优先检查是否误用了旧 `nav-icons-states-source.svg` 或历史裁切逻辑，而不是重新绘制 icon。

### 初步状态结构

底部导航至少需要以下状态：

- active tab：当前所在页面。
- inactive tab：未选中页面。
- upload tab：中央特殊入口，视觉和交互可以独立于普通 tab。
- pressed state：点击瞬间的缩放、透明度或高亮反馈，后续单独讨论。

是否需要每个 icon 独立 active/inactive 资产，取决于 icon 是否能被统一 tint。

### 待讨论

- 点击 tab 的动效：轻微缩放、弹性回弹、颜色过渡，还是更强的路径式转场。
- 上传按钮点击后是直接打开上传页、弹出 action sheet，还是进入独立上传流程。
- 导航栏是否需要适配 iPhone 底部 Home Indicator 的安全区。
- 是否保留系统 tab 页面状态缓存行为，还是自定义路由完全接管。

## 路径节点系统

### 视觉目标

主页的核心不是普通列表，而是一条从下到上推进的学习路径。路径的第一个节点是“开始”，点击后进入整篇文章的总结页。除开始节点外，后续节点从第二个节点开始对应每一个知识点；当前设计里一个知识点就是一个单元。节点之间通过白色虚线连接，整体呈现类似 S 型的上升走向，让用户感知自己正在沿着一条章节路径推进。

节点本身需要有稳定的视觉设计，包括：

- 节点底色。
- 节点形状和比例。
- 节点阴影。
- 节点内 icon。
- 节点文字。
- 当前正在复习的知识点节点外圈进度效果。
- 锁定、当前、已完成等状态差异。

### 建议实现方式

路径节点系统建议拆成三个独立层来实现：

1. 节点组件：负责单个节点的形状、底色、阴影、icon、文字、状态表现和点击区域。
2. 路径布局：负责根据当前章节的知识点数量，计算每个节点的位置。
3. 虚线连接层：负责根据节点位置绘制节点之间的 S 型虚线连接。

不建议把节点和整条路径作为一整张静态图片切入。原因是每篇文章的知识点数量可能不同，节点之间的距离和路径长度也会变化。如果整图静态化，后续无法自然适配不同章节。

### 节点本体还原

节点本体属于需要精准还原的组件。需要从 Figma 读取或由用户提供以下信息：

- 节点宽高。
- 节点圆角或椭圆比例。
- 节点底色。
- 节点阴影参数。
- 节点内 icon 尺寸和位置。
- 节点文字字号、字重、颜色。
- icon 与文字之间的垂直间距。

节点 icon 建议和底部导航 icon 一样，由用户从 Figma 导出 SVG 或 PDF vector asset。这样可以保证星星、锁、旗帜等图标形状与设计稿一致。节点容器、阴影、圆角、进度环更适合用 SwiftUI 代码绘制。

### 节点状态

节点至少需要支持以下状态，后续可以继续细化：

- 开始节点：章节尚未开始时的主入口，点击后进入整篇文章的总结页，视觉上比普通知识点节点更像行动按钮。
- 未开始节点：已经可见但尚未进入的知识点。
- 当前节点：用户当前正在复习或上次退出时所在的知识点。
- 当前知识点节点：用户当前正在复习或上次退出时所在的知识点。如果该知识点内已经完成部分题目，外圈进度环展示完成比例。
- 已完成节点：该知识点内题目已完成。
- 锁定节点：用户还没有按顺序推进到该知识点，不能直接进入详细复习，但后续可能允许点击预览。

这些状态不应只依赖颜色变化，也应通过透明度、icon、阴影强弱或锁定标识来区分。分段进度环只用于当前正在复习的知识点节点；已完成节点和未开始节点不默认显示进度环，以避免整条路径视觉过重。具体视觉细节需要继续对照 Figma 设计稿讨论。

### 节点点击弹窗

用户点击路径节点后，会出现一个节点弹窗，展示该节点对应的知识点，并提供进入复习流程的主按钮。

用户提供的 Figma 节点：

- 文件：`Pick The Shell`
- 节点：`451:1280`
- 节点名：`Group 44`

当前读取到的视觉参数：

- 弹窗主体尺寸：约 `250 x 113`
- 弹窗主体圆角：`15`
- 弹窗背景：奶白色，正式实现复用 `ColorToken.cardCream`
- 弹窗阴影：`DROP_SHADOW #98A35E33, x=0, y=4, blur=4, spread=0`
- 底部有小尖角，指向被点击的节点
- 知识点文字：`#645B51`，字号约 `14`，行高约 `24`
- 主按钮：宽约 `215`，高 `28`，圆角 `10`，阴影复用 `ShadowToken.softGreen`
- 主按钮底色：`#A5AE66`
- 主按钮文字：白色，字号约 `12`

实现共识：

- SwiftUI 中建议抽象为 `NodeKnowledgePopover`。
- 弹窗显示的知识点是当前节点对应的知识点概括。
- `currentNodeID` 只用于决定当前复习节点、进度环和 IP 附近位置；它不等于弹窗打开状态。首页默认进入时不应自动弹出节点浮窗，避免遮挡学习路径和当前章节 banner。
- 弹窗打开状态必须由用户显式点击某个路径节点触发，并记录为独立的 `selectedNodeID` 或等价 UI state。
- 未开始节点的按钮文案使用“开始复习”；当前复习或中断后继续的节点可以使用“继续复习”。
- 点击主按钮进入该知识点的复习流程。
- 弹窗是节点上下文浮层，不替代章节详情页。
- 弹窗主体、尖角、阴影和按钮应由 SwiftUI 组件绘制，不把 Figma 的弹窗底图作为临时图片依赖。
- 弹窗本体默认目标位置应始终是屏幕左右居中，以保证阅读稳定性；不要让弹窗随着每个节点左右位置大幅横向漂移。
- 尖角要对准被点击节点的 icon 中心，而不是对准节点外框或弹窗固定位置。实现时节点布局层需要输出 `nodeIconCenter`，弹窗布局层先算出最终 `popoverFrame`，再计算 `arrowLocalX = nodeIconCenter.x - popoverFrame.minX`。
- 节点左右变化时的决策顺序：先保持 `popoverFrame` 居中并更新 `arrowLocalX`；如果尖角在圆角安全范围内仍够不到目标节点，才允许弹窗本体做最小水平位移；如果这种情况频繁出现，优先考虑加宽弹窗，而不是让弹窗跟随节点大幅移动。
- 点击节点后的纵向滚动不能只用“节点中心点是否落在某个 safe range”来近似判断。正式实现必须先拿到节点在路径滚动视窗内的真实 `CGRect`，同时推导弹窗的真实可见范围：如果节点完整显示且弹窗上方/下方都有足够空间，就不滚动；只有节点被顶部/底部裁切，或弹窗会被顶部 banner / 底部导航裁切时，才做最小必要滚动，再显示弹窗。
- 弹窗仍需要做边界修正：不能压到底部导航、顶部章节 banner 或屏幕边缘；如果 `popoverFrame` 因为边界避让或尖角可达性发生水平移动，`arrowLocalX` 必须用新 frame 重新计算。SwiftUI 中可以用自定义 `BubbleShape(arrowX:)` 或弹窗主体叠加一个 `Triangle` shape 来绘制；`arrowX` 需要限制在圆角和三角形半宽之外，避免尖角贴到卡片圆角上。

### 分段进度环

当前正在复习的知识点节点外圈可以展示分段进度环。进度环的原则已经在 PRD 中确定：一个知识点内有几道题，就将外圈平均切成几段；用户每完成一道题，就填充一段颜色，未完成部分保持灰色或低透明状态。

进度环不默认出现在所有节点上。已经完成的知识点节点、后续还没有复习的知识点节点，以及锁定节点，都不显示这圈分段进度边框。它们可以用节点本体状态、颜色、透明度、icon 或锁定标识表达完成/未开始/锁定。这样当前节点会成为视觉焦点，用户也不会被一整屏进度环干扰。

分段进度环建议用 SwiftUI 绘制，而不是使用图片资产。原因是题目数量会变化，分段数量也会变化。代码绘制可以保证不同知识点都能按实际题目数量生成对应进度。

需要注意：设计稿里的当前节点外圈不是一个普通的连续圆环，也不是 conic-gradient 那种饼状切分。它更接近一组围绕节点外侧排列的厚实弧形块，而且这些弧形块需要贴合节点本体的外轮廓。

- 每一段是独立的弧形 stroke，而不是填满整个圆盘的扇形。
- 段与段之间有明显空隙。
- 弧形段有一定厚度，视觉上像外置边框。
- 弧形段应在节点容器外侧，和节点本体之间留出呼吸空间。
- 弧形段的轨道轮廓应和节点形状一致。如果节点是竖向胶囊/圆角椭圆，进度外圈也应基于同一个胶囊轮廓向外扩展，而不是按正圆轨道绘制。
- 已完成段使用较深的绿色，未完成段使用更浅、更低透明的绿色或灰绿色。
- 弧形段可以有圆角端点或柔和端点，避免像机械切出来的硬边。

因此技术上不建议用简单 `conic-gradient`、正圆 arc 或整圆 stroke dash 直接糊成一圈。更合适的做法是：先定义节点本体 shape，再基于同一个 shape 生成一个外扩后的 progress track path，然后沿这个 track path 按题目数量切分为多个独立段。这样可以保证外圈和节点轮廓贴合，也能分别控制每段的颜色、间隔、线宽、端点和动画。

当前节点进度环可以作为节点组件的一个独立 overlay/backdrop 层：先绘制外圈弧形进度，再绘制节点本体。这样进度环不会挤压节点内部内容，也不会影响节点 icon 和文字布局。

SwiftUI 实现时需要提前规避一个问题：`Circle().trim(...)` 或简单角度 arc 很容易得到圆形轨道，无法贴合竖向胶囊节点。当前节点组件应抽象出一个统一的 `NodeShape`，例如 capsule/rounded-rect shape；节点背景、点击区域和进度 track 都基于这个 shape 派生。进度段可以通过自定义 `Shape` 或 `Canvas` 绘制，在同一条外扩胶囊路径上采样/切分，而不是单独用圆形进度条组件。

### S 型虚线连接

节点之间的白色虚线连接需要跟随节点位置生成。建议由代码绘制路径，而不是从设计稿切一整条虚线图片。

建议采用“节点布局引擎 + 样条曲线连接”的实现方式。这是更接近业界常见路径类界面的做法：先根据节点数量和容器尺寸计算节点坐标，再用平滑曲线穿过或连接这些坐标，最后将曲线以虚线样式绘制出来。

初步架构：

1. 路径数据层：根据章节生成节点数组。第一个节点是 `start`，后续节点是知识点 `unit`。
2. 模板层：使用 Figma 中验证通过的黄金路径周期，不在代码里重新推导曲线。
3. 布局层：根据节点数量、屏幕宽度、安全区、底部导航高度和节点尺寸，重复摆放路径周期，并把节点放到周期模板定义的相对位置上。
4. 绘制层：用黄金路径 SVG path 或等价 SwiftUI `Path` 绘制虚线，并把节点绘制在路径上方。

节点坐标建议采用“周期模板复用”，而不是完全自由的随机布局，也不是先手工摆节点再补曲线。也就是说，整体仍保持从下到上的 S 型节奏，但曲线形状以 Figma 黄金周期为准：

- 每个周期由一段左弧和一段右弧组成。
- 新增节点时，代码按周期重复使用已经确认的曲线小段和节点相对位置。
- 到一个周期末尾后，下一组节点从同一套曲线小段重新开始。
- 开始节点可以使用独立位置规则，作为路径入口。
- 当前节点附近需要预留进度环和点击热区，避免进度环和虚线、IP、章节卡片互相压住。
- 节点数量少时，路径可以更松、更完整；节点数量多时，路径区域变成可滚动，保持节点间距而不是强行压缩。
- 左右轨道不能贴近屏幕边缘。轨道需要为节点本体、阴影、当前节点进度环和点击热区预留安全边距。
- 节点中心应落在虚线路径上；路径画在节点后方，节点遮住中心穿过的线段，从视觉上形成节点被路径串联的关系。
- 节点之间的曲线距离应大致一致，不应出现前半段舒展、后半段突然密集的情况。
- 路径弧线应由稳定的 Figma 周期模板生成，避免逐段手写控制点造成弧度随机、某一段突然变大或变小。

当前黄金路径周期来自用户在 Figma 中验证通过的 SVG：

```svg
<svg width="232" height="643" viewBox="0 0 232 643" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M116 321.25C181.022 294.718 226.5 233.822 226.5 162.94C226.5 92.0587 181.022 31.1624 116 4.62988" stroke="#FCF8ED" stroke-width="10" stroke-dasharray="20 20"/>
  <path d="M115.5 637.44C50.4777 610.907 5 550.011 5 479.13C5 408.248 50.4777 347.352 115.5 320.819" stroke="#FCF8ED" stroke-width="10" stroke-linecap="round" stroke-dasharray="20 20"/>
</svg>
```

该 SVG 是当前路径曲线的黄金标准，不应在代码里重新调整曲率。SwiftUI 阶段可以把这两条 path 转为 `Path` 绘制，或作为矢量资产导入；后续只围绕缩放、定位、周期重复、节点中心和锚点对齐做实现。

SwiftUI 实现时，黄金路径不能为了塞进屏幕而做横纵不同的非等比缩放。例如只压缩 Y 轴会让半圆弧视觉上变扁、变鼓，和 HTML/Figma 中对齐过的弧度不一致。正式实现应优先保持路径模板的 X/Y 同比例关系；节点多时让路径内容区变高并通过纵向滚动承载，而不是压扁弧线。

用户随后提供了带节点的 Figma 黄金参考 SVG：

- 画布：`280 x 1018`，`viewBox="0 0 280 1018"`。
- 核心规则：路径起点放“开始”节点；第一个半圆弧包含 `开始 + 2 个知识点节点`；后续每个半圆弧等距放置 `2 个知识点节点`。
- 从底部往上看，参考节点中心为：
  - 开始节点：`(166, 965.001)`
  - 第一个半圆弧知识点：`(52.5, 871.501)`, `(63.5, 690.501)`
  - 第二个半圆弧知识点：`(220.5, 574.501)`, `(235.5, 385.501)`
  - 第三个半圆弧知识点：`(70.5, 253.501)`, `(70.5, 53.501)`
- SwiftUI 实现时应优先复刻这种“每个半弧两个知识点节点”的节奏，而不是根据节点数自由生成坐标。
- 如果节点数量超过当前参考长度，后续半弧继续复用同一套左右交替的模板节奏。
- 路径绘制不能按半弧整段无条件加载。最后一个半弧必须根据最后节点所在 slot 截断；例如 4 节点时路径停在 `单元3`，5 节点时路径停在 `单元4`，都不应继续露出后续虚线。
- 实现上每个半弧模板需要知道两个知识点 slot 的路径进度位置。渲染时：
  - 如果后面还有下一半弧需要连接，则当前半弧可以画到连接端点。
  - 如果当前半弧包含最后节点，则只画到最后节点对应的 slot。
  - 如果当前半弧没有节点，则不渲染。
- SwiftUI 可以用 `Path.trim(from:to:)`、拆分后的 segment path、clip/mask 或 Figma 预拆小段实现截断；不能简单把完整半弧作为图片无脑重复。

建议 SwiftUI 数据结构：

- `PathCycleTemplate`：记录模板画布尺寸、左右半弧 path、slot 列表、IP 锚点列表。
- `PathSlot`：记录 slot 类型、相对坐标、所在半弧 index、该 slot 对应的 path progress 或截断 segment id。
- `RenderedPathNode`：由章节节点数据和 `PathSlot` 匹配后生成，包含节点状态、标题、进度和最终布局坐标。
- `PathCycleLayout`：输入节点数量、容器宽度、安全区和模板，输出路径高度、每个节点位置、需要绘制的 path 段、最后一段截断位置。

推荐渲染顺序：

1. 根据章节节点数生成 `PathNode` 列表，包含 `start` 和所有知识点节点。
2. 按规则给节点分配 slot：第一个半弧 `start + 2 个 unit`，后续半弧每段 `2 个 unit`。
3. 根据最后一个节点的 slot 计算路径终点。
4. 绘制虚线路径：完整绘制前面的半弧，只把最后半弧截断到最后 slot。
5. 在路径之上绘制节点组件，节点中心对齐 slot 坐标。
6. 当前节点的进度环和 IP 锚点再基于当前节点 slot 叠加。

容易踩雷的点：

- 不要在 SwiftUI View 里硬编码 Figma 绝对坐标；坐标先归一化为模板相对坐标，再根据实际渲染尺寸换算。
- 不要对黄金路径做非等比缩放。路径可以整体平移、整体等比缩放或在滚动内容区中延展，但不能单独压缩 Y 轴或拉伸 X 轴来适配单屏。
- 不要按半弧整段无脑加载。最后一个半弧必须截断到最后节点，否则会在最后节点后露出多余虚线。
- 不要先摆节点 icon 再反推路径。路径模板和 slot 是布局单一事实源，节点只是挂在 slot 上。
- 不要把整张路径当位图导入；位图不方便按最后节点截断，也不适配不同节点数量。
- 如果使用 `Path.trim`，需要验证 trim 进度是否和视觉 slot 对齐。SVG path 的进度并不一定等于 y 轴比例。
- 如果使用 `clip/mask`，只能作为实现手段，裁切边界必须来自最后 slot，不能靠目测写一个大概 y 值。
- 节点本体要盖住路径终点；路径层级必须在节点层级下面。
- 节点数量变多时，增加滚动内容高度，不压缩节点本体、icon 或节点间距。

- 每个节点有一个连接锚点，用于决定虚线从哪里出发、连接到哪里。
- 相邻节点之间用曲线路径连接，形成从下到上的 S 型走向。
- 虚线样式、线宽、颜色、透明度、圆角端点等应从 Figma 或设计标准中读取。
- 节点数量变化时，连接线应自动适配节点位置。

HTML mock 当前仍暴露出一些需要到 SwiftUI 阶段继续校准的问题：

- 纯公式路径虽然可以保证规律性，但视觉上未必直接得到设计稿里理想的半弧节奏；后续不作为主方案。
- 曲线不能贴近屏幕边缘。左右最大振幅必须由节点宽度、阴影、当前节点进度环、点击热区和安全边距共同决定。
- 节点间距需要同时满足数学等距和视觉等距；真实 UI 中文字、节点大小、滚动窗口和顶部/底部固定区域都会影响体感。
- 当前还需要补充：周期重复时的拼接规则、IP 锚点、不同屏幕尺寸下的缩放策略。

不建议每两个节点之间都手工写死一条固定曲线，也不建议用完整路径图片。前者会导致节点数量一变就难以维护，后者无法适配不同文章长度。更稳的方案是把路径看成一个可复用组件：输入节点数组和当前布局容器，输出节点坐标和连接曲线。

### 节点数量变化的处理

不同文章会切出不同数量的知识点，因此首页路径必须适配节点数量变化。

初步原则：

- 少节点文章：路径可以完整展示在一屏内，节点间距更舒展。
- 中等节点文章：路径可以保持一屏主视图，同时允许轻微上下滚动。
- 多节点文章：路径区域应成为纵向滚动区域，节点间距保持舒适，不为了塞进一屏而压缩节点。
- 滚动边界可以承接前后章节切换，但路径内部先保证当前章节节点清晰可读。

这个方案的重点是：动态变化发生在“路径高度和节点坐标”上，而不是改变节点组件本身的视觉规范。节点大小、icon 大小、阴影、颜色、文字层级和节点间距的最低标准都应保持稳定。节点变多时，路径区域变长并上下滑动，不应该为了塞进当前屏幕而缩小节点、压缩 icon 或破坏节点间距。

实现上，主页中间的路径区域应是可滚动内容区。顶部章节卡片和底部导航可以保持固定或半固定，路径节点和虚线连接一起存在于滚动内容中。虚线不是屏幕背景，而是路径 scroll content 的一部分，跟随节点一起滚动。

SwiftUI 首页层级应按“背景 / 路径滚动窗口 / 顶部 overlay / 底部导航 overlay”组织。路径滚动窗口的可见范围从当前章节 banner 下方开始，到底部导航上方结束，并使用裁切遮罩挡住超出范围的节点和虚线。这样用户上下滑动路径时，未来节点不会从顶部标题、章节 banner 或底部导航的空隙里露出来。

默认进入首页时，如果用户已经在某个知识点中间，路径应优先滚动到当前节点附近，而不是永远停留在开始节点。这样用户一回到首页就能看到自己的当前位置。

### IP 形象与当前节点的相对位置

主页 IP 形象不应只是固定在屏幕某个绝对位置的装饰物。它应该服务路径感：随着当前正在复习的知识点节点变化，IP 出现在离当前节点最近、且视觉上最合适的空白区域。

用户给出的方向是：S 型路径在每个拐弯处通常会自然形成一块空白区域，这块区域可以用来放 IP 角色。IP 应优先放在当前节点附近的这类空白区中，让它看起来像是在陪用户走当前这一步，而不是和路径无关地站在页面某处。

实现上，路径布局层除了输出节点坐标和虚线曲线，也可以输出一组 `mascotAnchor` 候选点。不过这些候选点不应该按“每个知识点节点一个 IP 位置”生成，而应该按 S 型路径的拐弯空白区生成。

- 每个 S 型拐弯处的空白区域最多只放一个 IP 锚点。
- 一个 IP 锚点可以对应多个相邻知识点节点。
- 当前节点变化时，系统在这些稳定锚点中选择距离当前节点最近的可用锚点，而不是为每个节点实时计算一个全新位置。
- 候选点需要避开节点本体、当前节点进度环、章节卡片、底部导航和屏幕安全区。
- 如果当前节点附近的候选点会发生遮挡，可以选择次近候选点，或根据当前节点在左/右轨道的位置把 IP 放到相反侧空白区。
- 这样可以避免 IP 随着每个节点细碎移动，减少干扰阅读，也避免算法把 IP 放到视觉上不舒服的位置。

SwiftUI 当前实现必须遵守的分组规则：

- `开始 / 单元1 / 单元2` 共用第一块右侧空白区的 IP 锚点。
- `单元3 / 单元4` 共用下一块左侧空白区的 IP 锚点。
- 后续节点按每两个知识点一组继续左右交替，例如 `单元5 / 单元6` 回到右侧空白区，`单元7 / 单元8` 回到左侧空白区。
- IP 的 y 位置可以根据这一组节点的整体中心计算，但不能因为当前节点从单元1切到单元2就重新生成一个新 y；同组节点必须返回同一个稳定锚点。

因此，IP 定位应和路径布局引擎协同，而不是写死一个固定 `x/y`。当路径内容变长并进入纵向滚动时，IP 更适合作为路径滚动内容的一部分，和当前节点、虚线一起处在同一个路径坐标系里。这样用户滚动路径时，IP 与当前节点的空间关系不会断开。

### 待讨论

- 固定轨道数量如何设置：例如左/右两轨、左/中/右三轨，或根据屏幕宽度调整。
- 节点数量较少或较多时，路径高度和默认滚动位置如何确定。
- 锁定节点是否可以点击预览，以及预览浮窗如何出现。
- 当前节点外圈进度环的分段间隔、厚度和动画方式。
- IP 形象的候选锚点如何定义，以及在当前节点变化时是否需要过渡动画。
- 节点点击后进入章节总结、知识点开场页还是继续到上次退出的题目页。

## IP 形象素材与动画

### 第一阶段：静态图

主页 IP 形象可以第一阶段先使用静态透明背景图片跑通布局和路径锚点逻辑。建议用户提供：

- 透明背景 PNG。
- 最好提供 2x/3x 或足够高分辨率原图。
- 需要和主页视觉稿中的 IP 体积、位置和阴影关系一致。
- 如果 IP 自带地面阴影，需确认阴影是图片的一部分，还是由 SwiftUI 单独绘制。

静态图阶段的重点不是动画，而是确认 IP 在不同当前节点、不同路径高度、不同屏幕尺寸下的位置是否自然。

### 后续阶段：无缝 loop 动画

用户希望后续将主页 IP 做成首尾自然衔接的 loop 动画。实现难度主要取决于动画复杂度和素材格式：

1. Lottie JSON：适合矢量图形、线条、简单形变、眨眼、轻微呼吸、手部摆动等。优点是体积小、可缩放、适合循环；缺点是复杂插画质感、渐变、模糊、纹理和部分 AE 效果可能还原不稳定。
2. Rive：适合更强交互状态机，例如 idle、tap、answer-correct、answer-wrong 等多状态切换。优点是状态管理强；缺点是需要额外引入 Rive runtime，设计制作链路也要配合。
3. 透明视频：适合保留复杂插画质感、柔和阴影、逐帧手绘感或 AE 渲染效果。iOS 上可考虑 HEVC with alpha 等支持透明通道的视频方案。优点是视觉最稳定；缺点是体积更大，适配、解码和循环边界需要仔细处理。
4. PNG 序列帧：适合短小、帧数少、需要完全控制画面的动画。优点是还原稳定；缺点是体积可能较大，帧管理和内存需要控制。

当前建议路线：

- 如果 IP 动画只是眨眼、轻微呼吸、身体轻微上下浮动：优先考虑 Lottie。
- 如果后续需要 IP 有多个可切换状态，并与答题结果、点击、节点进度联动：可以评估 Rive。
- 如果 IP 插画质感复杂，且希望完全保持设计/动效稿的视觉效果：优先考虑透明视频或短序列帧。

无论采用哪种格式，loop 动画都需要用户或动效设计侧保证：

- 首帧和尾帧能自然衔接，避免循环时跳一下。
- 动画节奏轻，不抢路径节点和章节入口的注意力。
- 透明背景或可控背景，方便放在主页浅绿色背景上。
- 输出尺寸要和实际展示尺寸匹配，避免过大浪费包体或过小模糊。
- 最好同时提供静态 fallback 图，用于低电量、降级、加载前或动画失败时显示。

### 暂定结论

V2 第一轮可以先用现有小体积 MP4 完成主页 IP idle loop 动画，同时准备一张静态 PNG fallback。这样可以较快验证 IP 在路径锚点中的位置、大小、节奏和视觉存在感，不必一开始就等待 Lottie、Rive 或透明视频的完整制作链路。

这个方案先作为实验版的低成本实现路径，不代表最终动画格式已经锁死。后续如果出现背景露边、循环卡顿、耗电明显或多状态交互需求，再切换到 Lottie、Rive、透明视频或 PNG 序列帧。

### 已有 MP4 动画的处理方式

如果当前手里只有 MP4，需要注意：MP4 是栅格视频，Lottie 是矢量动画，通常不能把 MP4 直接无损转换成高质量 Lottie。更准确的路径是根据源文件情况选择：

1. 如果能拿到原始动效工程文件，例如 After Effects、Rive、Figma/插件动画源文件或分层矢量素材，应优先从源文件重新导出 Lottie，而不是从 MP4 反转。
2. 如果只有普通 MP4，且没有透明通道，无法凭转换自动恢复干净透明背景。可以继续用 MP4 播放，但需要背景和主页背景匹配；否则会看到视频矩形底。
3. 如果能拿到带透明通道的源视频或序列帧，可以考虑导出透明视频，例如 iOS 可评估 HEVC with alpha；也可以导出 PNG 序列帧作为短动画 fallback。
4. 如果动作很简单，例如 2-3 秒拿书翻页，且希望用 Lottie，最好让动效侧基于原始 IP 分层图或 AE 工程重新制作/导出 Lottie。不要把 MP4 自动转 Lottie 作为主方案。

针对当前“IP 拿书翻页、2-3 秒无缝循环”的主页 idle 动画，推荐优先级是：

1. 最佳：拿到原始分层动效文件，导出 Lottie JSON，并提供静态 PNG fallback。
2. 次选：拿到透明背景视频，转为 iOS 可播放的透明视频格式。
3. 当前 V2 实验版方案：直接使用 MP4，但要求视频背景与主页背景尽量一致，并准备静态 PNG fallback。

### V2 第一版暂定方案：直接使用小体积 MP4

当前用户手里的 IP 翻书动画是 MP4 文件，体积约 680KB，动画时长约 2-3 秒，首尾帧一致。基于这些条件，V2 第一版可以先直接使用 MP4 作为主页 IP idle loop 动画方案。

优势：

- 实现路径简单，不需要等待 Lottie 或透明视频重新导出。
- 文件体积较小，对 V2 实验版包体压力可控。
- 首尾帧一致，理论上适合循环播放。
- 可以先验证 IP 在路径锚点中的位置、大小、节奏和视觉存在感。

潜在问题：

- 普通 MP4 没有透明通道，可能出现视频矩形背景。若视频背景与主页渐变背景不完全一致，真机上可能露出边界。
- 即使首尾帧一致，播放器循环时仍可能出现轻微卡顿，需要真机验证。
- 常驻视频循环会比静态图更耗电，但单个 680KB、2-3 秒 idle 动画在 V2 第一版中风险可接受。
- 需要静音、隐藏播放控件、自动循环，并避免影响页面滚动和点击。
- 加载前或播放失败时仍应使用静态 PNG fallback。

上线前验证标准：

- 真机上看不到明显视频矩形底。
- 循环播放没有明显跳帧或停顿。
- 页面滚动和节点点击不受视频影响。
- 低电量或动画关闭场景下能降级为静态图。

后续升级条件：

- 如果背景露边明显，优先改为透明视频或序列帧。
- 如果循环卡顿明显，评估换序列帧或重新导出更适合循环播放的视频。
- 如果后续需要 IP 多状态交互，再评估 Lottie 或 Rive。

## 当前 SwiftUI V2 骨架落地状态

本节记录当前 `experiments/shibei-v2/ios/拾贝/V2/` 中已经落地的页面与组件状态。它不是最终视觉验收表，而是防止组件库资产在实现阶段再次遗漏的工程记录。

### 已接入真实资产的组件/页面

- 底部导航：`V2BottomNavigationBar` 已使用 `nav-icons-32frame-source.svg` 拆出的 8 个 `32 x 32` 普通 tab 资产；中间上传按钮使用独立 `V2UploadTabButton`，按 `upload-tab-button.svg` 的 `60 x 60` 设计源参数代码绘制，不再依赖整张导航栏 SVG 或历史裁切逻辑。
- 圆形按钮：返回、查看原文、通知、个人主页四个按钮均已使用独立 `44 x 45` asset：`circle-button-back.svg`、`circle-button-source.svg`、`circle-button-notification.svg`、`circle-button-profile.svg`。不要再用 SwiftUI 手绘 bell/profile glyph。
- 主页：已接入 `mascot-static.svg`、背景植物装饰和底部导航；路径布局已改为基于 Figma 黄金参考节点 slot 的 SwiftUI 模板，节点不再使用临时百分比坐标，路径会截断在最后一个节点处。当前 SwiftUI 已修正 IP 与“开始”节点过低导致遮挡底部导航的问题：IP 锚点会给底部导航预留空间，路径节点底部锚点也会向上避让导航栏。
- 章节概要页：已接入 `summary-mascot-body-layer.svg` 和 `summary-mascot-hands-layer.svg`，使用“IP 身体后层 / 动态概要卡片中层 / 手部前层”的 ZStack 结构。
- 核心知识点页：已接入 `unit-overview-mascot.svg`，白板卡片由 SwiftUI 绘制，桌腿在卡片后层，IP 在前层。
- 答后反馈浮窗：已接入 `mascot-feedback-back.svg` 和 `mascot-feedback-front.svg`，结构为“IP 后层 / 动态反馈卡片 / IP 前层手部”。
- 上传页：已接入 `upload-mascot-back.svg`、`upload-mascot-front.svg` 和 `upload-link-icon.svg`；SwiftUI 当前结构为 `V2UploadMascotInputGroup`，按“IP 后层 / 真实输入卡片 / IP 前层手部笔记本”的 `ZStack` 层级落地，不再把输入卡片放在 IP 组合之外。
- 通知页：已接入 `notification-mascot.svg`、`notification-success-icon.svg`、`notification-failure-icon.svg`。
- 全部章节页：已接入 `materials-mascot.svg` 和 `chapter-source-icon.svg`；章节统计卡、`V2ChapterCard`、`V2ChapterStatusTag` 已按组件库三态落地，仍需后续继续做像素级间距校准。
- 发现页：已接入 `discover-hero-mascot.svg`、`discover-article-thumbnail.svg`；`V2DiscoverHeroCard`、`V2DiscoverChip`、`V2RecommendedArticleCard` 已能在模拟器中通过底部导航进入和渲染。当前仍是组件化骨架，推荐文章卡三层夹图、文字位置和 tag 间距后续继续按 Figma 精修。
- 笔记页：已接入 `notes-mascot.svg`、`notes-bookmark.svg`、`notes-summary-wave.svg` 和三组背景植物装饰；`V2NotesSummaryCard` 已按 `notes-summary-card-reference.svg` 的 `321 x 81` 内底卡、`329 x 90` 波形 mask、收藏数字字号/位置落地；`V2SavedQuestionCard` 已按 `notes-card-reference.svg` 校准标题、来源、题型 tag 和收藏 icon 位置。题卡大标题按 Figma `390:1351` 的单行容量实现，超长标题尾部省略，不在卡片内扩成两行。当前剩余风险是长列表在底部导航下的露出/滚动策略，需要在真实收藏数量接入后继续确认。
- 个人主页：统计 icon 和设置 icon 已接入 `profile-stat-reviewed.svg`、`profile-stat-streak.svg`、`profile-setting-notification.svg`、`profile-setting-privacy.svg`、`profile-setting-account.svg`；顶部头像/IP 暂用 `mascot-static.svg` 占位，不应视为最终设计。
- 单元总结页：已接入 `mascot-completion.svg` 和 `completion-grade-rays.svg`，结果文案仍用 SwiftUI Text 动态绘制。
- 章节总结页：已接入 `chapter-completion-mascot.svg` 和 `chapter-completion-title-rays.svg`，结果文案和按钮仍用 SwiftUI 组件绘制。
- 章节详情页：已按 Figma `451:1389` 更新为新版章节说明页，包含顶部 hero 卡、文章核心摘要卡和知识点列表卡。hero 卡右侧 IP 使用 `chapter-detail-mascot.svg`，底部波浪复用 `card-bottom-wave.svg`；hero 卡标题下方新增两个横排胶囊，整卡参考 SVG 画布为 `329 x 178`，主体矩形为 `x=4 y=0 w=321 h=170 rx=15`，左胶囊为 `x=27 y=116 w=93 h=36`，右胶囊起点为 `x=141 y=116`。icon 使用 `chapter-detail-link-action-icon.svg` 和 `chapter-detail-summary-action-icon.svg`，胶囊底由 SwiftUI 绘制并保留 Figma 的圆角白底绿影；左侧胶囊是可点击的“查看原文”，右侧胶囊显示原文作者 `sourceAuthor` 且不可点击。作者胶囊不是固定宽度：最小 `93`，按作者名文本测量动态增宽，最大不超过大卡片右侧安全边界，超长作者名才尾部省略。“文章核心”和“知识点”标题 icon 以及知识点行箭头均使用用户提供的独立 SVG 资产。卡片、文字、圆角、描边/阴影由 SwiftUI 组件绘制，不把整页或整卡作为图片渲染。由于真实文章标题可能长于 Figma 示例，SwiftUI 版 hero 卡采用“IP 右移 + 标题区扩大”的适配方式，同时文本右侧和 IP/书本保持安全距离；文章核心摘要必须完整显示，摘要卡高度随正文行数动态增长，不做四行截断；知识点卡高度按当前可见行数动态计算，不用四行示例高度硬撑少量数据；摘要卡和知识点卡内部标题组/正文/行内容使用统一左边线，避免第二、第三卡片视觉起点错位。
- 查看原文页：来自 Figma `575:1684`。顶部来源卡复用章节详情页的两个胶囊组件：左侧“原文链接”为可点击外链按钮，右侧为原文作者信息展示，不可点击。正文卡不是普通说明文字，而是 `SourceArticleReader`：正式数据应尽量保留原文格式，包括段落、空行、小标题、引用或列表；SwiftUI 数据层以 block 形式渲染（heading / paragraph / quote），段落完整显示不截断。当前 fixture 先用本地 `sourceBody` 模拟完整原文；后端接入时不要只返回压缩摘要，应返回可渲染的原文结构和 source anchor。从题目页进入查看原文时，应直接滚动到对应 source anchor，并用动态线框高亮对应原文片段：参考 SVG 为 `291 x 86`、`rx=14.5`、描边 `#A3A568`、线宽 `1`；这只是参数来源，正式实现用 SwiftUI `RoundedRectangle.stroke` 绘制，宽度随文本段落高度自然变化，不保存为独立 SVG。
- 好文阅读页：当前先复用查看原文页的阅读布局，即顶部来源卡 `V2SourceArticleHeaderCard` + 正文卡 `V2SourceArticleBodyCard`。区别是右下角增加 `V2RecommendedArticleAddButton`，用于把推荐好文加入/生成复习路径。用户提供的加号 SVG 只作为参数来源：画布 `53 x 53`，圆形主体半径 `22.5`、填充 `#E8E9C2`、白色内描边 `2pt`、绿色标准阴影，加号描边 `#98A84E 2pt round cap`。正式 SwiftUI 使用 `Circle` 和 `Path` 绘制，不导入整颗 SVG。点击加号后出现 `V2RecommendedArticleAddPopover`：参考 SVG 画布 `282 x 108`，卡片本体 `x=4 y=0 w=274 h=100 rx=15`，按钮 `x=33 y=54 w=215 h=28 rx=10`，按钮文案“开始生成”。浮窗出现时，页面内容和遮罩层级为：阅读页内容 -> 全屏黑色 `20%` 透明遮罩 -> 浮窗和加号按钮。遮罩由 SwiftUI `Color.black.opacity(0.20).ignoresSafeArea()` 绘制，不需要 Figma/SVG 资产。
- 章节详情页知识点行展开态：来自 Figma `553:1444`。每一行右侧箭头是按钮，默认向下、浅绿描边；展开后旋转为向上并切换主题绿色。展开面板不是整块 SVG，正式实现用 SwiftUI 绘制：参考画布 `282 x 129`，奶白底卡 `x=4 y=0 w=274 h=121 rx=15`，标准绿影；正文从 `x≈24 y≈23` 起排，当前改为 `11 regular #575757`，必须完整显示，不做省略；面板高度由正文自然撑开。底部主按钮保留 `w=215 h=28 rx=10`、填充 `#A5AE66`、文字白色，并与面板底部保持固定 `12pt` 距离。展开面板插入当前知识点行下方，后续知识点行随布局自然下移，不使用绝对偏移硬推。
- 展开面板收起动画不要使用 `opacity + move` 的组合。问题是面板淡出/上移的同时，后续知识点行也在回流上移，会产生短暂重叠残影。SwiftUI 中采用 asymmetric transition：展开时可轻微淡入，收起时使用 `.identity` 即时移除，只让列表布局回流，避免视觉噪声。

### 仍需继续精细化的占位/风险

- 首页路径曲线：当前 SwiftUI 已使用 `path-cycle-node-placement-reference.svg` 的节点 slot 和 SVG cubic path segments 做模板化落地，并保证最后一段停在最后节点；路径保持黄金模板比例，不再为了塞进单屏单独压缩 Y 轴。路径存在于中部滚动窗口中，顶部 banner 与底部导航作为 overlay 遮挡超出可视区域的节点和虚线。
- 路径节点 icon：知识点星星已根据 Figma `313:1072` / `349:930` 的 SVG path 转为 SwiftUI `Shape`；开始节点旗帜仍用 SF Symbols，后续需要继续由 Figma 组件补齐。
- 节点进度环：当前是近似分段胶囊环，尚未完全贴合设计稿节点椭圆轮廓。
- 题目选项状态：选项卡的 normal/correct/wrong 颜色已代码化，但仍需继续和 Figma 节点 `445:1499 / 445:1498 / 445:1497` 的精确参数校准。
- 连线题选项状态：状态机已按“第二次点击不进入蓝色态”修正；视觉参数仍需继续和 `449:2319` 等五态节点校准。
- 发现页推荐文章卡：当前已用缩略图资产，但三层夹图结构仍是简化骨架，需要继续按 `381:1117` 参考校准。
- 笔记页：summary card、收藏题目卡、tag 字体和间距已按 `notes-summary-card-reference.svg`、`notes-card-reference.svg` 完成第一轮 SwiftUI 校准；后续重点转为真实数据列表的滚动边距、空状态和超长标题截断策略。
- 个人主页：顶部专属 IP/头像尚未归档为最终资产；当前只避免误用笔记页 IP。
- 上传页：当前已按分层结构接入，但输入卡片宽高、placeholder 文案、前景手部位置、生成中/失败等状态仍需继续按 Figma 校准。

### 当前页面跳转链路

SwiftUI 骨架已在 `V2RootView` 中按文档跑通以下本地 fixture 链路：

1. 首页开始节点进入章节概要页。
2. 上传页点击“生成复习路径”会切回学习流程并进入章节概要页，用于本地 fixture 验证一键生成后的闭环。
3. 章节概要继续进入第一个知识点总览页。
4. 知识点总览继续进入本知识点第一题。
5. 题目作答后显示答后反馈，继续进入下一题或单元总结页。
6. 连线题验证为：第一次点击单卡进入 `selected`；第二次点击后直接进入 `correct/wrong`；正确短反馈后锁定；全部锁定后才出现继续按钮。
7. 单元总结继续进入下一个知识点总览页；如果已经是最后一个知识点，进入章节总结页。
8. 章节总结可返回首页或进入章节详情。
9. 题目页查看原文会进入原文页，返回后恢复到原题页面。
10. 章节详情页当前用于浏览章节标题、文章核心摘要和知识点列表。若后续在该页补充继续复习/查看原文入口，应单独作为按钮组件加入，而不是恢复旧版统计 pill 布局。

当前本地 SwiftUI mock 为了方便连续验收“选择题 -> 连线题 -> 单元总结 -> 章节总结”，在 `V2ReviewFixture.completesChapterAfterCurrentFixtureUnit` 中开启了一个 fixture-only shortcut：完成 `unit-1` 后直接进入章节总结。这个开关只服务当前视觉/交互验证，不代表真实产品逻辑；正式数据接入后仍按第 7 条由 `nextUnit(after:)` 判断是否进入下一单元。

### 2026-06-16 模拟器验证记录

- `xcodebuild -project experiments/shibei-v2/ios/拾贝.xcodeproj -scheme 拾贝 -destination 'platform=iOS Simulator,name=iPhone 17' build` 已通过。
- 已安装并启动 `com.maxhan.shibei.v2.dev` 到 iPhone 17 模拟器。
- Runtime UI snapshot 验证首页存在顶部通知/个人按钮、当前章节 banner、开始/单元节点、底部五个 tab。
- 验证首页节点弹窗：首次进入首页时不出现“继续复习”浮窗；点击“单元2”后才出现节点浮窗和“继续复习”按钮。
- 验证上传页：底部导航进入“上传”，页面存在“添加知识 / 粘贴文章链接 / 播客与视频功能即将上线 / 生成复习路径”，点击“生成复习路径”后进入“章节概要”。
- 验证章节详情页：首页当前章节 banner 的详情按钮进入“章节详情”；页面显示 hero 卡、文章核心摘要卡和知识点列表卡；hero IP、底部波浪、两个标题 icon 和行箭头均来自 asset catalog，卡片和文字为 SwiftUI 绘制。
- 验证主复习链路：章节概要 -> 核心知识点 -> 选择题 -> 答后反馈 -> 连线题 -> 单元总结 -> 下一单元 -> 最后一题 -> 单元总结 -> 章节总结。
- 验证连线题状态机：完成正确匹配后，对应两张卡从可点击目标中消失，表示进入 locked；全部锁定后才出现“继续”按钮。
- 章节总结截图记录：`/var/folders/9f/cjyn13t933j8w4xc6rz6lh5h0000gn/T/screenshot_optimized_de3a2381-e82d-4cf9-97ab-1a47aadc0341.jpg`。

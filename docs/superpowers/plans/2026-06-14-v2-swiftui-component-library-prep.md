# V2 SwiftUI Component Library Preparation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在正式切 SwiftUI 前，把 V2 目前已讨论的视觉资产、设计 token、组件边界和 HTML mock 中暴露的组件库问题整理到可执行状态。

**Architecture:** Figma 负责提供稳定资产和组件参考；`design.md` 作为设计系统单一事实源；HTML mock 继续用于视觉和交互对齐，但不能成为 SwiftUI 的直接转换来源。SwiftUI 阶段按 token、组件和 asset 三层重建界面。

**Tech Stack:** Figma, SVG/PDF vector assets, HTML/CSS prototype, SwiftUI, Xcode Asset Catalog.

---

## File Map

- `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/design.md`
  - 稳定设计系统规范、token、组件规则、Figma-to-code 交付规则。
- `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/v2-frontend-implementation-notes-zh.md`
  - 讨论过程、风险、临时方案、SwiftUI 实现注意事项。
- `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/ui-prototypes/home-components/index.html`
  - 当前 HTML mock 主文件，用于视觉/交互对齐。
- `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/ui-prototypes/home-components/`
  - HTML mock 使用的临时和正式视觉资产。
- `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/design-assets/`
  - 归档给 SwiftUI/Xcode 阶段参考或导入的设计资产。

---

## Problem Summary

### P1: 多状态 icon 缺少统一画布会造成状态切换偏移

已在底部导航栏暴露：selected / inactive 如果按 path bbox 或合并 SVG 裁切，会导致 icon 变大、线宽变细或横向偏移。

当前状态：
- 底部导航已修复为 `nav-icons-32frame-source.svg` 对应的统一 `32 x 32` frame。
- 个人主页统计 icon、设置 icon 仍使用合并 SVG + 位移裁切。
- 其他小 icon 后续如果有状态切换，也可能复现同类问题。

### P2: HTML mock 中保留旧 sprite / crop DOM

当前 HTML 中历史展示区可以保留 `nav-icon-crop` 和 `nav-icons-states-source.svg` 作为旧素材解析参考，但真实页面 tabbar 不能再依赖这些旧结构。真实 tabbar 应统一由 `nativeNavIcons` / `nav-icons-32frame-source.svg` 或后续独立同画布资产驱动。

### P5: 连线题第二次点击状态机曾记录错误

旧文档中曾记录“点击第二张卡后也先进入蓝色 selected，再判断 correct/wrong”。当前确认这是错误的：第二张卡点击后不进入蓝色态，而是两张卡立即同时进入 `correct` 或 `wrong` 短反馈。

### P3: 参考 SVG、正式资产、代码组件边界容易混淆

已经多次出现：用户给 SVG 是为了校准参数，但 HTML mock 有时会把整块 UI 近似成静态资产。正式 SwiftUI 中必须区分：
- IP、装饰、勋章、封面图：可以作为资产。
- 卡片、banner、按钮、chip、题目选项、反馈面板：应由代码组件绘制。
- 完整页面或完整卡片 SVG：只作校准参考。

### P4: token 还没有完全落成组件库约束

HTML mock 有大量颜色字面量和页面局部尺寸。原型阶段可以接受，但 SwiftUI 阶段必须收敛到 token 和组件 variant。

---

## Task 1: Figma 侧补齐多状态 icon 的统一画布资产

**Owner:** 用户/Figma  
**Files Affected:** Figma 组件库；导出后进入 `design-assets/` 和 `ui-prototypes/home-components/`

- [ ] **Step 1: 底部导航 8 个普通 tab icon 确认最终资产**

  Figma 中保留 8 个独立 component 或 component variant：

  - `TabIcon/Learning/Inactive`
  - `TabIcon/Learning/Selected`
  - `TabIcon/Materials/Inactive`
  - `TabIcon/Materials/Selected`
  - `TabIcon/Discover/Inactive`
  - `TabIcon/Discover/Selected`
  - `TabIcon/Notes/Inactive`
  - `TabIcon/Notes/Selected`

  每个 component 外层 frame 必须为 `32 x 32`，不带可见 fill/stroke。icon 在 frame 内按视觉中心对齐。

- [ ] **Step 2: 个人主页统计 icon 拆成独立资产**

  当前风险源：

  - `profile-stat-icons.svg`

  需要从 Figma 拆成至少两个独立同画布资产：

  - `ProfileStatIcon/Reviewed`
  - `ProfileStatIcon/Streak`

  建议画布：保持现有视觉尺寸对应的统一 frame，例如 `23 x 23` 或 `32 x 32`，以 Figma 最终视觉为准。两个状态必须同尺寸 frame，不再通过合并 SVG 位移裁切。

- [ ] **Step 3: 个人主页设置 icon 拆成独立资产**

  当前风险源：

  - `profile-settings-icons.svg`

  需要从 Figma 拆成三个独立同画布资产：

  - `ProfileSettingIcon/Notification`
  - `ProfileSettingIcon/Help`
  - `ProfileSettingIcon/Profile`

  每个 icon 外层 frame 必须同尺寸，例如 `34 x 34`。不要让每个 icon 的可见 bbox 决定导出画布。

- [ ] **Step 4: 检查后续所有有状态的 icon**

  当前已识别需要状态/variant 的资产类型：

  - 底部导航 tab icon
  - 选择题正确/错误状态中的选项状态标识
  - 连线题 selected/correct/wrong/locked 状态
  - 通知 success/failure icon
  - 章节卡片 status tag
  - 发现页 category chip

  如果某个状态只是颜色、描边或背景变化，优先做代码组件 variant；如果状态涉及复杂图形变化，再提供同画布多状态 icon。

- [ ] **Step 5: 导出命名规范**

  导出文件建议命名：

  ```text
  tab-learning-inactive.svg
  tab-learning-selected.svg
  profile-stat-reviewed.svg
  profile-stat-streak.svg
  profile-setting-notification.svg
  profile-setting-help.svg
  profile-setting-account.svg
  ```

  后续进入 Xcode 时可以转为 PDF vector asset，asset name 保持语义命名。

---

## Task 2: Codex 侧清理 HTML mock 中的旧导航 sprite 回退

**Owner:** Codex  
**Files Affected:**
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/ui-prototypes/home-components/index.html`
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/.superpowers/brainstorm/27932-1781136281/content/bottom-nav-figma-spec.html`

- [ ] **Step 1: 删除 tabbar 原始 markup 中的 `nav-icon-crop`**

  所有实际页面 tabbar 内不再写：

  ```html
  <div class="nav-icon-crop" style="--x: ...; --y: ...;">
    <img src="nav-icons-states-source.svg" alt="" />
  </div>
  ```

  改成统一结构：

  ```html
  <div class="icon" aria-hidden="true"></div>
  ```

  由 `standardizeBottomNavigation()` 注入 `nativeNavIcons`。

- [ ] **Step 2: 保留状态展示面板，但标注为旧参考**

  `nav-icons-states-source.svg` 可以只保留在“状态源素材解析”展示区，不能出现在实际 tabbar 组件中。

- [ ] **Step 3: 检查实际 tabbar 引用**

  运行：

  ```bash
  rg -n 'nav-icon-crop|nav-icons-states-source' /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/ui-prototypes/home-components/index.html
  ```

  预期：

  - `nav-icon-crop` 只允许出现在旧素材展示面板，或完全删除。
  - `nav-icons-states-source.svg` 不应出现在任何 `<nav class="tabbar">` 内。

- [ ] **Step 4: 同步当前浏览器临时 HTML**

  ```bash
  cp /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/ui-prototypes/home-components/index.html \
     /Users/hanmingyu/Downloads/拾贝-v2-baseline/.superpowers/brainstorm/27932-1781136281/content/bottom-nav-figma-spec.html
  ```

---

## Task 3: Codex 侧把“资产 vs 组件 vs 参考图”做成文档验收表

**Owner:** Codex  
**Files Affected:**
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/design.md`
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/v2-frontend-implementation-notes-zh.md`

- [ ] **Step 1: 在 `design.md` 增加组件资产分类表**

  表格字段：

  | Item | Category | Source | SwiftUI Treatment |
  | --- | --- | --- | --- |
  | Bottom nav icons | Icon asset | Figma 32x32 frame | Xcode vector assets |
  | Mascot static | Illustration asset | SVG | Image layer |
  | Feedback panel shape | Code component shape | Figma path reference | SwiftUI Shape/Path |
  | Discover article card | Code component | SVG reference only | SwiftUI Card |

- [ ] **Step 2: 标记不能整图使用的参考 SVG**

  明确这些文件只作为校准参考：

  - `bottom-nav-learning-reference.svg`
  - `discover-hero-banner.svg`
  - `discover-article-card-reference.svg`
  - `notes-card-reference.svg`
  - `notes-summary-card-reference.svg`
  - `profile-stat-card-reference.svg`

- [ ] **Step 3: 标记可以直接作为资产使用的 SVG**

  明确这些文件可以作为图像资产：

  - `mascot-static.svg`
  - `mascot-feedback-back.svg`
  - `mascot-feedback-front.svg`
  - `notification-mascot.svg`
  - `discover-hero-mascot.svg`
  - `completion-medal.svg`
  - `bg-deco-*.svg`

---

## Task 4: Codex 侧收敛 SwiftUI 组件库候选清单

**Owner:** Codex  
**Files Affected:**
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/design.md`

- [ ] **Step 1: 建立基础组件清单**

  SwiftUI 需要优先沉淀：

  ```text
  V2BottomNavigationBar
  V2BottomNavItem
  V2UploadTabButton
  V2CircleIconButton
  V2PrimaryActionButton
  V2UnitProgressBar
  V2QuestionOption
  V2MatchingOption
  V2FeedbackPanel
  V2NotificationCard
  V2ChapterCard
  V2CurrentChapterBanner
  V2DiscoverChip
  V2RecommendedArticleCard
  V2ProfileStatCard
  V2ProfileSettingRow
  ```

- [ ] **Step 2: 为每个组件定义 variant**

  先记录核心 variant：

  ```text
  V2BottomNavItem: inactive, selected
  V2CircleIconButton: notification, profile, back, sourceDocument
  V2PrimaryActionButton: normal, correct, wrong, disabled
  V2QuestionOption: normal, selected, correct, wrong
  V2MatchingOption: normal, selected, correct, wrong, locked
  V2NotificationCard: success, failure
  V2ChapterCard: notStarted, reviewing, completed
  V2DiscoverChip: inactive, selected
  ```

- [ ] **Step 3: 标记不可复制成多组件的状态**

  例如：

  - 选择题答对/答错页面不应是两套布局，只是 `V2QuestionOption` 和 `V2FeedbackPanel` 的状态变化。
  - 通知成功/失败不应是两个不同 card 组件，只是 `V2NotificationCard(status:)`。
  - 连线题四种卡片状态不应改变尺寸和布局，只改变颜色、描边、短反馈动画和禁用状态。
  - 连线题 `selected` 只用于第一次点击后的单卡状态；第二张卡点击后不进入蓝色态，直接触发两卡同时 `correct` 或 `wrong`。

---

## Task 5: Codex 侧准备 SwiftUI Token 文件设计

**Owner:** Codex  
**Files To Create Later in iOS project:**
- `experiments/shibei-v2/ios/.../DesignSystem/V2Colors.swift`
- `experiments/shibei-v2/ios/.../DesignSystem/V2Shadows.swift`
- `experiments/shibei-v2/ios/.../DesignSystem/V2Typography.swift`
- `experiments/shibei-v2/ios/.../DesignSystem/V2Spacing.swift`

- [ ] **Step 1: 从 `design.md` 提取 ColorToken**

  第一版至少包含：

  ```swift
  enum V2Color {
      static let iconPrimary = Color(hex: "44423D")
      static let brandGreen = Color(hex: "98A84E")
      static let navSelectedText = Color(hex: "98A35E")
      static let cardCream = Color(hex: "FCF8ED")
      static let contentCardCream = Color(hex: "FDFAF2")
      static let circleButtonCream = Color(hex: "FDF9EE")
      static let primaryActionGreen = Color(hex: "A5AE66")
  }
  ```

- [ ] **Step 2: 从 `design.md` 提取 ShadowToken**

  第一版至少包含：

  ```swift
  struct V2Shadow {
      let color: Color
      let radius: CGFloat
      let x: CGFloat
      let y: CGFloat
  }
  ```

  `softGreen` 对应：`#98A35E`，opacity `0.2`，radius `4`，x `0`，y `4`。

- [ ] **Step 3: 不从 HTML 自动反推全部颜色**

  HTML 中存在大量临时颜色，不能直接全部搬进 SwiftUI。SwiftUI token 只从 `design.md` 中稳定条目生成。

---

## Task 6: Figma 侧补充组件命名和状态命名

**Owner:** 用户/Figma  
**Files Affected:** Figma 组件库

- [ ] **Step 1: 给可复用组件建立 Figma component**

  优先建立：

  ```text
  BottomNavBar
  BottomNavItem
  UploadTabButton
  CircleIconButton
  PrimaryActionButton
  UnitProgressBar
  QuestionOption
  MatchingOption
  FeedbackPanel
  NotificationCard
  ChapterCard
  DiscoverChip
  ProfileStatCard
  ```

- [ ] **Step 2: Figma variant 命名和 SwiftUI variant 对齐**

  示例：

  ```text
  MatchingOption / state=normal
  MatchingOption / state=selected
  MatchingOption / state=correct
  MatchingOption / state=wrong
  MatchingOption / state=locked
  ```

  这样后续我读取 Figma 时，可以直接映射到 SwiftUI enum。

- [ ] **Step 3: 对 Figma 中手动拖拽误差做标注**

  如果某页面只是手动拖拽导致间距不完全一致，建议在 Figma component 或旁边注释：

  ```text
  Use component spec, not this frame's absolute position.
  ```

  这样后续我不会把不该固定的坐标当成正式参数。

---

## Task 7: 进入 SwiftUI 前的验收检查

**Owner:** 用户 + Codex  
**Files Affected:** 全部设计文档和资产

- [ ] **Step 1: 资产完整性检查**

  逐项确认：

  - 底部导航 8 个普通 tab icon 已有同画布资产。
  - 上传按钮资产已确认。
  - 顶部/页面圆形按钮资产已确认。
  - IP 各状态资产已确认。
  - 个人主页统计/设置 icon 不再依赖合并 SVG 裁切。

- [ ] **Step 2: 组件边界检查**

  任意 UI 元素都必须归类为以下之一：

  ```text
  asset
  code component
  reference only
  ```

  未归类的元素暂不进入 SwiftUI 实现。

- [ ] **Step 3: HTML mock 风险检查**

  运行：

  ```bash
  rg -n 'nav-icon-crop|style="--x:|style="--y:|scale\\(' /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/ui-prototypes/home-components/index.html
  ```

  对每个结果判断：

  - 如果是临时展示面板，可以保留并注释。
  - 如果是正式组件 mock，应改成独立资产或代码组件。

- [ ] **Step 4: SwiftUI 开始条件**

  满足以下条件后再开始实现主页 SwiftUI：

  - `design.md` 中主页、导航栏、节点、banner、IP anchor、底部安全区规则已稳定。
  - `design-assets/` 中主页所需资产齐全。
  - HTML mock 中主页关键视觉已经被用户确认。
  - 明确第一轮 SwiftUI 只实现主页，不一次性实现全部页面。

---

## Suggested Execution Order

1. 用户先补 Figma 资产：个人主页统计 icon、设置 icon、底部导航 8 个独立 icon 的最终导出。
2. Codex 清理 HTML mock 旧 sprite DOM。
3. Codex 更新 `design.md` 资产分类表和 SwiftUI 组件候选清单。
4. 用户确认 Figma component / variant 命名。
5. Codex 根据最终资产准备 SwiftUI token 和主页组件落地计划。
6. 开始 SwiftUI 第一屏：主页。

---

## Open Questions

- 底部导航 8 个 icon 最终进入 Xcode 时使用 SVG 还是 PDF vector asset？
- 个人主页统计/设置 icon 是否统一使用 `32 x 32` frame，还是保持设计稿当前 `23 x 23` / `34 x 34` frame？
- 反馈面板的奶白底尖角是否最终用 SwiftUI `Shape` 绘制，还是先用一段 path asset 过渡？
- HTML mock 是否需要在进入 SwiftUI 前彻底清掉全部旧 sprite/crop 结构，还是只在文档中标注风险即可？

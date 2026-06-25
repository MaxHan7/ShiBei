# 拾贝 V2 Typography System Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make V2 typography consistent, readable, and maintainable across the iOS app by replacing scattered hard-coded font sizes with semantic type tokens and staged page-level fixes.

**Architecture:** Add a semantic typography layer in `V2DesignSystem.swift`, then migrate text usage from the highest-risk/smallest-font components outward. Each checkpoint should be visually reviewed on device or simulator before moving to the next group, because many current screens were hand-aligned to Figma and should not be blindly reflowed.

**Tech Stack:** SwiftUI, iOS Dynamic Type principles, V2 SwiftUI design system, Xcode device/simulator builds.

---

## Reference Principles

- Use semantic text roles, not raw font sizes in screen code. Apple recommends built-in text styles/Dynamic Type so text can scale while preserving hierarchy; when custom sizes are needed, they should still be wrapped in reusable semantic styles.
- Main reading text on mobile should generally sit around 16pt; 14pt can be used for secondary body. 12pt is caption/metadata. 10-11pt should be rare and only for very short utility labels. 8pt should not be used for user-facing button or content text.
- Buttons, card titles, top titles, body copy, captions, and tags need separate roles. They should not each invent their own `.system(size:)`.
- Do not solve typography by making everything larger. Fix hierarchy: title, body, caption, label, and micro text each have a clear job.
- Preserve Figma-aligned layout where possible; if a text size change causes overflow, adjust the component intentionally rather than using `minimumScaleFactor` as the default escape hatch.

## Files And Responsibilities

- Modify: `experiments/shibei-v2/ios/拾贝/V2/DesignSystem/V2DesignSystem.swift`
  - Owns canonical `V2Typography` tokens and any helper comments documenting intended usage.
- Modify: `experiments/shibei-v2/ios/拾贝/V2/Components/V2FlowComponents.swift`
  - Contains the largest number of hard-coded fonts, including chapter cards, recommended article cards, profile cards, source/action chips, and summary cards.
- Modify: `experiments/shibei-v2/ios/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift`
  - Owns review flow pages: unit/chapter summaries, chapter detail hero actions, knowledge list/expansion panel, and question-related support text.
- Modify: `experiments/shibei-v2/ios/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
  - Owns tab pages and notification/generation/failure detail typography.
- Modify: `experiments/shibei-v2/ios/拾贝/V2/Components/V2CurrentChapterBanner.swift`
  - Owns homepage current-chapter banner text.
- Modify: `experiments/shibei-v2/ios/拾贝/V2/Components/V2BottomNavigationBar.swift`
  - Owns bottom nav label text; should remain compact but accessible.
- Modify: `experiments/shibei-v2/docs/design.md`
  - Record the final typography token contract after implementation.
- Optional Test: `experiments/shibei-v2/ios/拾贝Tests/APIClientDecodingTests.swift` is not relevant; typography has no current unit-test surface. Use build + visual smoke instead.

---

## Checkpoint 0: Baseline Audit And Protection

**Purpose:** Freeze the current state and produce a measurable baseline before changing fonts.

**Files:**
- Read: `experiments/shibei-v2/ios/拾贝/V2/DesignSystem/V2DesignSystem.swift`
- Read: `experiments/shibei-v2/ios/拾贝/V2/Components/V2FlowComponents.swift`
- Read: `experiments/shibei-v2/ios/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift`
- Read: `experiments/shibei-v2/ios/拾贝/V2/Screens/Tabs/V2TabScreens.swift`

- [ ] **Step 1: Record current raw font usage**

Run:

```bash
rg -n "\.font\(|Font\.system|\.system\(size|UIFont\.systemFont" experiments/shibei-v2/ios/拾贝/V2 > /tmp/shibei-v2-font-audit-before.txt
rg -o "\.system\(size: *[0-9]+|Font\.system\(size: *[0-9]+|UIFont\.systemFont\(ofSize: *[0-9]+" experiments/shibei-v2/ios/拾贝/V2 \
  | sed -E 's/.*size: *//; s/.*ofSize: *//' \
  | sort \
  | uniq -c \
  | sort -n
```

Expected baseline should show many hard-coded sizes, including `8`, `10`, `11`, `12`, `13`, `14`, `15`, `16`, `17`, `18`, `20`, `22`, `24`.

- [ ] **Step 2: Confirm existing dirty work is either committed or intentionally carried**

Run:

```bash
git status --short
```

Expected: either clean, or only unrelated pending files that are intentionally not part of typography. If the previous generation-status fix is still dirty, commit it separately before editing typography files.

- [ ] **Step 3: Create typography checkpoint commit if needed**

If code changes from the previous task are still pending:

```bash
git add experiments/shibei-v2/backend/src/v2/generation/v2GenerationJobRunner.js \
  experiments/shibei-v2/ios/拾贝/Services/APIClient.swift \
  experiments/shibei-v2/ios/拾贝/V2/Models/V2BackendModels.swift \
  experiments/shibei-v2/ios/拾贝/V2/V2RootView.swift
git commit -m "fix: stabilize v2 generation completion state"
```

Expected: a clean checkpoint before typography work begins.

---

## Checkpoint 1: Define The Canonical Typography Tokens

**Purpose:** Add enough semantic tokens so screens stop inventing raw font sizes. This is the first “small and stable” step.

**Files:**
- Modify: `experiments/shibei-v2/ios/拾贝/V2/DesignSystem/V2DesignSystem.swift`

- [ ] **Step 1: Replace the current `V2Typography` block**

Update `V2Typography` to this contract:

```swift
enum V2Typography {
    // Screen-level chrome.
    static let screenTitle = Font.system(size: 22, weight: .bold, design: .default)
    static let pageTitle = screenTitle

    // Card and section hierarchy.
    static let sectionTitle = Font.system(size: 18, weight: .semibold, design: .default)
    static let cardTitle = Font.system(size: 16, weight: .semibold, design: .default)
    static let cardTitleLarge = Font.system(size: 18, weight: .bold, design: .default)

    // Reading content.
    static let body = Font.system(size: 16, weight: .regular, design: .default)
    static let bodyEmphasis = Font.system(size: 16, weight: .semibold, design: .default)
    static let bodySmall = Font.system(size: 14, weight: .regular, design: .default)
    static let bodySmallEmphasis = Font.system(size: 14, weight: .semibold, design: .default)

    // Component labels and metadata.
    static let label = Font.system(size: 12, weight: .medium, design: .default)
    static let labelRegular = Font.system(size: 12, weight: .regular, design: .default)
    static let caption = Font.system(size: 11, weight: .regular, design: .default)
    static let captionEmphasis = Font.system(size: 11, weight: .semibold, design: .default)
    static let micro = Font.system(size: 10, weight: .regular, design: .default)

    // Specialized reusable text.
    static let navLabel = Font.system(size: 12, weight: .semibold, design: .default)
    static let nodeLabel = Font.system(size: 18, weight: .bold, design: .default)
    static let primaryButton = Font.system(size: 16, weight: .semibold, design: .default)
}
```

- [ ] **Step 2: Build after token expansion**

Run:

```bash
xcodebuild -project experiments/shibei-v2/ios/拾贝.xcodeproj -scheme 拾贝 -destination 'platform=iOS Simulator,name=iPhone 17' build
```

Expected: build passes. No UI should change yet except if existing aliases are affected by `cardTitle` moving from 18 bold to 16 semibold. If that causes unacceptable visual drift, restore `cardTitle` to 18 bold and introduce `cardTitleStandard` separately before continuing.

- [ ] **Step 3: Commit token expansion**

```bash
git add experiments/shibei-v2/ios/拾贝/V2/DesignSystem/V2DesignSystem.swift
git commit -m "style: define v2 typography tokens"
```

---

## Checkpoint 2: Fix The Most Obvious Too-Small Text Without Reflowing Pages

**Purpose:** Remove the worst readability issues first: 8pt and unnecessary 10pt in button/card text.

**Files:**
- Modify: `experiments/shibei-v2/ios/拾贝/V2/Components/V2FlowComponents.swift`
- Modify: `experiments/shibei-v2/ios/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift`
- Modify: `experiments/shibei-v2/ios/拾贝/V2/Screens/Tabs/V2TabScreens.swift`

- [ ] **Step 1: Replace user-facing 8pt text**

Targets:

```swift
// V2FlowComponents.swift
Text("原文链接")
    .font(.system(size: 8, weight: .regular))

static let tagFont = Font.system(size: 8, weight: .regular)
```

Change:

```swift
Text("原文链接")
    .font(V2Typography.caption)

static let tagFont = V2Typography.caption
```

If the tag capsules overflow after the change, increase tag dimensions rather than shrinking text:

```swift
static let tagWidth: CGFloat = 44
static let tagHeight: CGFloat = 20
```

- [ ] **Step 2: Replace button/chip 10pt text where the component has enough width**

Targets:

```swift
// V2ReviewFlowScreens.swift
Text(title)
    .font(.system(size: 10, weight: .regular))

// V2TabScreens.swift
Text("原文链接")
    .font(.system(size: 10, weight: .regular))
```

Change:

```swift
Text(title)
    .font(V2Typography.caption)

Text("原文链接")
    .font(V2Typography.caption)
```

For dynamic width calculation in `V2ChapterDetailHeroActionContent.width(for:minWidth:maxWidth:)`, change:

```swift
let font = UIFont.systemFont(ofSize: 10, weight: .regular)
```

to:

```swift
let font = UIFont.systemFont(ofSize: 11, weight: .regular)
```

- [ ] **Step 3: Keep true micro text only where it is decorative or very short**

Allowed remaining 10pt examples:

```swift
Text(statsText)
    .font(V2Typography.micro)

Text("本单元复习")
    .font(V2Typography.micro)
```

Do not use 10pt for paragraph body, CTA text, source buttons, card titles, or tag text.

- [ ] **Step 4: Build and visually inspect high-risk pages**

Run:

```bash
xcodebuild -project experiments/shibei-v2/ios/拾贝.xcodeproj -scheme 拾贝 -destination 'platform=iOS Simulator,name=iPhone 17' build
```

Inspect:
- 章节详情页顶部 “原文链接 / 作者” 小卡片。
- 发现页好文阅读卡片 tag 是否溢出。
- 通知失败详情原文链接按钮文字是否仍居中。

- [ ] **Step 5: Commit checkpoint**

```bash
git add experiments/shibei-v2/ios/拾贝/V2/Components/V2FlowComponents.swift \
  experiments/shibei-v2/ios/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift \
  experiments/shibei-v2/ios/拾贝/V2/Screens/Tabs/V2TabScreens.swift
git commit -m "style: remove tiny v2 user-facing text"
```

---

## Checkpoint 3: Normalize Titles And Major Reading Text

**Purpose:** Ensure all top titles, card titles, question text, and primary reading text use consistent roles.

**Files:**
- Modify: `experiments/shibei-v2/ios/拾贝/V2/Components/V2FlowComponents.swift`
- Modify: `experiments/shibei-v2/ios/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift`
- Modify: `experiments/shibei-v2/ios/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
- Modify: `experiments/shibei-v2/ios/拾贝/V2/Components/V2CurrentChapterBanner.swift`

- [ ] **Step 1: Top page titles use one role**

Search:

```bash
rg -n "\.font\(\.system\(size: (22|24)" experiments/shibei-v2/ios/拾贝/V2
```

For top chrome titles, replace with:

```swift
.font(V2Typography.screenTitle)
```

Do not change intentional large decorative completion text like `章节完成` until Checkpoint 5.

- [ ] **Step 2: Question stems and option text stay readable**

For question stems/options in `V2ReviewFlowScreens.swift` and `V2FlowComponents.swift`, use:

```swift
.font(V2Typography.body)
```

For secondary explanatory text inside answer feedback:

```swift
.font(V2Typography.bodySmall)
```

Avoid moving question card text below 14pt.

- [ ] **Step 3: Card titles use `cardTitle` or `cardTitleLarge`**

Examples:

```swift
Text("章节生成失败")
    .font(V2Typography.cardTitle)

Text(headlineText)
    .font(V2ChapterCardMetrics.titleFont)
```

Update metric definitions to reference tokens:

```swift
static let titleFont = V2Typography.cardTitle
```

If a large visual card is intended, use:

```swift
static let titleFont = V2Typography.cardTitleLarge
```

- [ ] **Step 4: Build and inspect text hierarchy**

Run:

```bash
xcodebuild -project experiments/shibei-v2/ios/拾贝.xcodeproj -scheme 拾贝 -destination 'platform=iOS Simulator,name=iPhone 17' build
```

Inspect:
- 首页 banner.
- 全部章节卡片.
- 章节详情页.
- 选择题/连线题.
- 单元总结/章节总结.

- [ ] **Step 5: Commit checkpoint**

```bash
git add experiments/shibei-v2/ios/拾贝/V2
git commit -m "style: normalize v2 title and body typography"
```

---

## Checkpoint 4: Normalize Metadata, Captions, And Tags

**Purpose:** Clean up the remaining 11/12/13/14 text so each has a semantic reason.

**Files:**
- Modify: `experiments/shibei-v2/ios/拾贝/V2/Components/V2FlowComponents.swift`
- Modify: `experiments/shibei-v2/ios/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift`
- Modify: `experiments/shibei-v2/ios/拾贝/V2/Screens/Tabs/V2TabScreens.swift`

- [ ] **Step 1: Metadata uses caption or label**

Use `caption` for passive metadata:

```swift
.font(V2Typography.caption)
```

Use `label` for active labels, tags, and compact button-like text:

```swift
.font(V2Typography.label)
```

- [ ] **Step 2: Convert 13pt one-off text**

Search:

```bash
rg -n "\.system\(size: 13" experiments/shibei-v2/ios/拾贝/V2
```

Decision rule:
- If it is a title in a compact card, use `V2Typography.bodySmallEmphasis`.
- If it is metadata heading, use `V2Typography.label`.
- If it is ordinary text, use `V2Typography.bodySmall`.

- [ ] **Step 3: Convert 11pt body-like paragraphs**

Search:

```bash
rg -n "\.system\(size: 11" experiments/shibei-v2/ios/拾贝/V2
```

Decision rule:
- Paragraphs or explanations should become `bodySmall` unless the Figma component is intentionally dense.
- Very short source/metadata labels may remain `caption`.

Example:

```swift
Text(overview)
    .font(V2Typography.bodySmall)
    .lineSpacing(6)
```

- [ ] **Step 4: Build and inspect dense cards**

Run:

```bash
xcodebuild -project experiments/shibei-v2/ios/拾贝.xcodeproj -scheme 拾贝 -destination 'platform=iOS Simulator,name=iPhone 17' build
```

Inspect:
- 发现页推荐文章卡片.
- 个人主页统计卡.
- 通知卡片.
- 章节详情知识点展开卡.

- [ ] **Step 5: Commit checkpoint**

```bash
git add experiments/shibei-v2/ios/拾贝/V2
git commit -m "style: normalize v2 captions and metadata"
```

---

## Checkpoint 5: Review Completion And Special Decorative Text

**Purpose:** Keep intentionally expressive text expressive, but stop it from drifting outside the type system.

**Files:**
- Modify: `experiments/shibei-v2/ios/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift`
- Modify: `experiments/shibei-v2/ios/拾贝/V2/Components/V2FlowComponents.swift`

- [ ] **Step 1: Identify decorative large text**

Search:

```bash
rg -n "\.system\(size: (20|22|24)" experiments/shibei-v2/ios/拾贝/V2
```

Allowed decorative roles:
- Completion grade label.
- Chapter completion title.
- Profile stat number.
- Notes/chapter summary number.

- [ ] **Step 2: Add specialized tokens only if repeated**

If repeated 20/22/24 text has the same semantic role, add:

```swift
static let statNumber = Font.system(size: 20, weight: .bold, design: .default)
static let completionTitle = Font.system(size: 24, weight: .bold, design: .default)
```

Use these instead of raw `.system(size:)`.

- [ ] **Step 3: Preserve visual Figma alignment**

Do not resize expressive text just because it is large. Only replace raw font calls with semantic tokens unless there is a known readability issue.

- [ ] **Step 4: Build and visually inspect summary pages**

Run:

```bash
xcodebuild -project experiments/shibei-v2/ios/拾贝.xcodeproj -scheme 拾贝 -destination 'platform=iOS Simulator,name=iPhone 17' build
```

Inspect:
- 单元总结页.
- 章节总结页.
- 个人主页统计卡.

- [ ] **Step 5: Commit checkpoint**

```bash
git add experiments/shibei-v2/ios/拾贝/V2
git commit -m "style: tokenize v2 decorative typography"
```

---

## Checkpoint 6: Add Documentation And Guardrails

**Purpose:** Prevent future component work from reintroducing random font sizes.

**Files:**
- Modify: `experiments/shibei-v2/docs/design.md`
- Optional Create: `experiments/shibei-v2/docs/typography-audit.md`

- [ ] **Step 1: Add typography token table to design docs**

Add this table:

```markdown
## V2 Typography Tokens

| Token | Size / Weight | Intended Use |
| --- | --- | --- |
| `screenTitle` | 22 bold | Top page titles only |
| `sectionTitle` | 18 semibold | Section headers and prominent card headings |
| `cardTitle` | 16 semibold | Default card titles |
| `cardTitleLarge` | 18 bold | Large visual card titles |
| `body` | 16 regular | Main reading text, question stems, option text |
| `bodyEmphasis` | 16 semibold | Important body-level emphasis |
| `bodySmall` | 14 regular | Secondary paragraph text |
| `bodySmallEmphasis` | 14 semibold | Secondary headings and compact emphasized text |
| `label` | 12 medium | Tags, compact labels, metadata headings |
| `labelRegular` | 12 regular | Short utility labels |
| `caption` | 11 regular | Passive metadata and very short helper text |
| `captionEmphasis` | 11 semibold | Emphasized compact metadata |
| `micro` | 10 regular | Rare decorative microcopy only |
| `navLabel` | 12 semibold | Bottom navigation labels |
| `nodeLabel` | 18 bold | Learning path node number/label |
| `primaryButton` | 16 semibold | Large green primary buttons |
```

- [ ] **Step 2: Add usage rules**

Add:

```markdown
Typography rules:
- New V2 UI must use `V2Typography` tokens instead of raw `.system(size:)`.
- Do not use 8pt text for user-facing content.
- 10pt is allowed only for rare decorative microcopy or extremely short stats.
- Main reading content should be 16pt; secondary readable copy can be 14pt.
- If increasing text causes overflow, adjust component layout instead of using aggressive scaling.
- Page titles and top chrome text must use `screenTitle`.
```

- [ ] **Step 3: Add a lightweight audit command**

Add:

```markdown
Audit command:

```bash
rg -n "\.system\(size:|Font\.system\(size:|UIFont\.systemFont" experiments/shibei-v2/ios/拾贝/V2
```

Every remaining raw size must be justified as a token definition, a dynamic measurement helper, or a Figma-locked exception.
```
```

- [ ] **Step 4: Commit docs**

```bash
git add experiments/shibei-v2/docs/design.md docs/superpowers/plans/2026-06-25-v2-typography-system-normalization.md
git commit -m "docs: define v2 typography normalization plan"
```

---

## Checkpoint 7: Final Audit And Device Smoke

**Purpose:** Verify the system is genuinely normalized, not just partially patched.

**Files:**
- Read: all files under `experiments/shibei-v2/ios/拾贝/V2`

- [ ] **Step 1: Count remaining raw font sizes**

Run:

```bash
rg -n "\.system\(size:|Font\.system\(size:|UIFont\.systemFont" experiments/shibei-v2/ios/拾贝/V2
```

Expected:
- Raw font sizes remain mostly inside `V2DesignSystem.swift`.
- Any raw sizes outside design system are either dynamic measurement helpers or explicit Figma-locked exceptions.

- [ ] **Step 2: Build for simulator**

```bash
xcodebuild -project experiments/shibei-v2/ios/拾贝.xcodeproj -scheme 拾贝 -destination 'platform=iOS Simulator,name=iPhone 17' build
```

Expected: build succeeds.

- [ ] **Step 3: Build for phone if connected**

```bash
xcodebuild -project experiments/shibei-v2/ios/拾贝.xcodeproj -scheme 拾贝 -configuration Debug -destination 'id=26BD96F1-4C9A-5123-92A7-6733CAE2BE21' -derivedDataPath /tmp/shibei-v2-phone-build build
```

Expected: build succeeds.

- [ ] **Step 4: Install and inspect core screens**

```bash
xcrun devicectl device install app --device 26BD96F1-4C9A-5123-92A7-6733CAE2BE21 /tmp/shibei-v2-phone-build/Build/Products/Debug-iphoneos/拾贝.app
xcrun devicectl device process launch --device 26BD96F1-4C9A-5123-92A7-6733CAE2BE21 --terminate-existing com.maxhan.shibei.v2.dev -ShibeiV2APIBaseURL http://10.130.96.10:5273
```

Inspect:
- 首页 empty/generated.
- 全部章节 generated/generating/failed.
- 上传页.
- 发现页.
- 通知页 and 通知失败详情.
- 章节详情.
- 章节概要.
- 选择题 / 连线题 / feedback popup.
- 单元总结 / 章节总结.
- 个人主页.

- [ ] **Step 5: Final commit**

```bash
git add experiments/shibei-v2/ios/拾贝/V2 experiments/shibei-v2/docs/design.md
git commit -m "style: normalize v2 typography system"
```

---

## Self-Review

**Spec coverage:** This plan covers the user request to audit all app typography, use professional mobile typography guidance, normalize font sizes, avoid遗漏, and execute in checkpoints.

**Placeholder scan:** No `TBD`, `TODO`, or vague “handle later” steps are present. Each checkpoint includes concrete files, commands, and expected outcomes.

**Risk management:** The plan intentionally starts with token definition and the smallest readability fixes, then expands to screen groups. This reduces the risk of breaking Figma-aligned layouts.

**Known execution note:** The working tree may already contain unrelated generation-state fixes. Commit or deliberately carry those before starting Checkpoint 1 so typography changes stay reviewable.

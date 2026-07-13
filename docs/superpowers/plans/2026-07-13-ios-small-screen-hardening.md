# iOS Small Screen Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the V2 iOS UI pass App Store review on small/older iPhone screen sizes by ensuring critical buttons, sheets, feedback panels, and review flows remain visible, tappable, and scroll-recoverable.

**Architecture:** Do not write per-device layout branches. First add shared responsive layout primitives around safe areas, scrollable flow screens, and bottom actions, then migrate high-risk screens to those primitives. Validate with a fixed simulator matrix and screenshot evidence before any remote push or App Store resubmission.

**Tech Stack:** SwiftUI, iOS 26 target, Xcode simulator, XcodeBuildMCP/build_sim, existing V2 design tokens in `拾贝/拾贝/V2/DesignSystem/V2DesignSystem.swift`.

---

## Current Findings

### Project Constraints

- Current workspace: `/Users/hanmingyu/Downloads/拾贝/拾贝-lean-generation-20260711`
- Branch: `codex/lean-high-value-generation-20260711`
- App target is iPhone-only: `TARGETED_DEVICE_FAMILY = 1`
- Deployment target is iOS 26: `IPHONEOS_DEPLOYMENT_TARGET = 26.0`
- Therefore this is not mainly an "old iOS version" problem. It is a small-screen and safe-area layout problem on supported iPhone devices.

### High-Risk Patterns Found

These are not all bugs by themselves, but each pattern can hide buttons on small-height screens.

- `拾贝/拾贝/V2/DesignSystem/V2DesignSystem.swift`
  - `V2Layout.primaryActionBottomY = 600` is used as a fixed button Y coordinate in multiple review pages.
- `拾贝/拾贝/V2/Components/V2FlowComponents.swift`
  - `V2FlowScreen` reserves top chrome but does not provide a standard scroll container or bottom action safe-area slot.
- `拾贝/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift`
  - Chapter overview, unit overview, question, unit summary, and chapter completion screens use fixed `contentHeight`, fixed `offset(y:)`, and bottom overlays.
  - Question feedback uses `.overlay(alignment: .bottom)` plus `V2QuestionFeedbackMetrics.bottomLift = 72`.
- `拾贝/拾贝/V2/Components/Flow/V2QuestionComponents.swift`
  - `V2AnswerFeedbackPanel` uses fixed panel width and bottom extension; on short screens it can cover question content or fall into unsafe bottom space.
- `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
  - `V2TabScaffold` has fixed bottom padding `128` and a floating bottom nav.
  - Upload page uses `V2UploadPageMetrics.contentHeight = 600`, `groupTopPadding = 72`, and fixed mascot/card positions.
  - Generation detail/failure pages use fixed `.frame(height: 760)` style containers.
- `拾贝/拾贝/V2/Components/Generation/V2GenerationCards.swift`
  - Generation status cards use fixed card height and fixed inner Y coordinates. This is acceptable inside a scrollable container, risky if the page itself does not scroll.
- `拾贝/拾贝/V2/Screens/Home/V2HomeView.swift`
  - Learning path uses a custom responsive viewport already; it should be regression-tested but is not the first refactor target.

### Correct Strategy

Do not write code like:

```swift
if device == "iPhone SE" {
    buttonY = 520
}
```

Use shared layout rules instead:

```swift
safeAreaInset(edge: .bottom) {
    V2PrimaryActionButton(title: title, action: action)
        .padding(.horizontal, V2Layout.pageHorizontalInset)
        .padding(.bottom, V2ResponsiveLayout.bottomActionPadding(for: geometry))
}
```

And make page content scrollable when vertical space is constrained:

```swift
ScrollView(showsIndicators: false) {
    content()
        .v2PageColumn()
        .padding(.top, V2Layout.topChromeReservedHeight)
        .padding(.bottom, V2ResponsiveLayout.scrollBottomPadding)
}
```

---

## Verification Device Matrix

Use these as the App Store review hardening matrix:

| Priority | Device class | Why |
| --- | --- | --- |
| P0 | Smallest available iPhone simulator, preferably iPhone SE | Catches short-height button disappearance. |
| P0 | iPhone mini class if available | Catches modern safe-area with narrow width. |
| P1 | Standard iPhone, e.g. iPhone 16/17 | Baseline current visual quality. |
| P1 | Pro Max class | Ensures responsive changes do not make large screens sparse or awkward. |

Command to inspect available simulator device types:

```bash
xcrun simctl list devicetypes | rg "iPhone SE|iPhone 13 mini|iPhone 12 mini|iPhone 16|iPhone 17|Pro Max"
```

If iPhone SE or mini is unavailable in the installed Xcode runtime, use the smallest listed iPhone device type and note the exact model in `docs/app-store-release-evidence/small-screen-audit.md`.

---

## Files To Modify

### Shared Layout Layer

- Modify: `拾贝/拾贝/V2/DesignSystem/V2DesignSystem.swift`
  - Add responsive layout constants and helpers.
- Modify: `拾贝/拾贝/V2/Components/V2FlowComponents.swift`
  - Add a scrollable flow screen variant and a bottom action container.
- Modify: `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
  - Make tab content bottom padding derive from bottom nav height and safe-area needs.

### High-Risk Screen Layer

- Modify: `拾贝/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift`
  - Replace fixed bottom action offsets on overview/summary/completion screens.
  - Make question pages recoverable on small screens.
- Modify: `拾贝/拾贝/V2/Components/Flow/V2QuestionComponents.swift`
  - Ensure feedback panels fit within small screens and remain dismissible/tappable.
- Modify: `拾贝/拾贝/V2/Components/Generation/V2GenerationCards.swift`
  - Keep cards fixed internally, but ensure parent screens place them in scrollable content.
- Modify: `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
  - Upload, generation detail, failure detail, notifications, notes, and profile routes.

### Evidence And Guardrails

- Create: `docs/app-store-release-evidence/small-screen-audit.md`
  - Device matrix, audited flows, screenshots captured, known residual risks.
- Optional create: `tools/ios-ui-audit/README.md`
  - Manual simulator route checklist if automated UI driving is not stable enough yet.

---

## Task 1: Record Baseline Small-Screen Risks

**Files:**
- Create: `docs/app-store-release-evidence/small-screen-audit.md`

- [ ] **Step 1: Create the audit evidence file**

Add this file:

```markdown
# Small Screen App Store Review Audit

Date: 2026-07-13
Branch: codex/lean-high-value-generation-20260711

## Device Matrix

| Device | Runtime | Status | Notes |
| --- | --- | --- | --- |
| Smallest available iPhone simulator | iOS 26 | Pending | Replace with exact simulator name after first run. |
| iPhone mini class if available | iOS 26 | Pending | Replace with exact simulator name after first run. |
| Standard iPhone | iOS 26 | Pending | Replace with exact simulator name after first run. |
| Pro Max class | iOS 26 | Pending | Replace with exact simulator name after first run. |

## Flows To Verify

- Upload link empty state
- Upload link recognized state
- Upload link generation started state
- Materials tab with generating chapter card
- Generating chapter detail
- Generation failure detail
- Chapter detail
- Chapter overview
- Unit overview
- Multiple choice question before answer
- Multiple choice question after answer feedback
- Matching question before answer
- Matching question after answer feedback
- Unit summary
- Chapter summary
- Notes tab
- Profile tab

## Pass Criteria

- Primary action is visible or reachable by scrolling.
- Primary action has at least 44pt tappable height.
- Bottom navigation does not cover actionable content.
- Feedback panel can be dismissed and continued.
- Top back/source/favorite/delete controls remain visible.
- Text does not overlap adjacent controls.
- Decorative imagery may crop, but cannot cover buttons or required text.

## Findings

No findings recorded yet.
```

- [ ] **Step 2: Commit**

Run:

```bash
git add docs/app-store-release-evidence/small-screen-audit.md
git commit -m "docs: add small screen audit checklist"
```

Expected: one documentation-only commit.

---

## Task 2: Add Shared Responsive Layout Primitives

**Files:**
- Modify: `拾贝/拾贝/V2/DesignSystem/V2DesignSystem.swift`
- Modify: `拾贝/拾贝/V2/Components/V2FlowComponents.swift`

- [ ] **Step 1: Add responsive layout metrics**

In `V2DesignSystem.swift`, add a small helper near `V2Layout`:

```swift
enum V2ResponsiveLayout {
    static let minimumTapHeight: CGFloat = 44
    static let bottomActionHeight: CGFloat = 53
    static let bottomActionHorizontalPadding: CGFloat = V2Layout.pageHorizontalInset
    static let compactVerticalSpacing: CGFloat = V2Spacing.md
    static let regularVerticalSpacing: CGFloat = V2Spacing.xl
    static let scrollBottomPadding: CGFloat = 120

    static func isShortScreen(_ height: CGFloat) -> Bool {
        height <= 700
    }

    static func verticalSpacing(for height: CGFloat) -> CGFloat {
        isShortScreen(height) ? compactVerticalSpacing : regularVerticalSpacing
    }

    static func bottomActionPadding(bottomSafeArea: CGFloat) -> CGFloat {
        max(12, bottomSafeArea + 8)
    }
}
```

- [ ] **Step 2: Add a reusable bottom action container**

In `V2FlowComponents.swift`, add:

```swift
struct V2BottomActionBar<Content: View>: View {
    let bottomSafeArea: CGFloat
    @ViewBuilder let content: () -> Content

    var body: some View {
        content()
            .frame(maxWidth: V2Layout.primaryActionWidth)
            .padding(.horizontal, V2ResponsiveLayout.bottomActionHorizontalPadding)
            .padding(.top, V2Spacing.sm)
            .padding(.bottom, V2ResponsiveLayout.bottomActionPadding(bottomSafeArea: bottomSafeArea))
            .frame(maxWidth: .infinity)
            .background(
                LinearGradient(
                    colors: [
                        V2Color.pageGreenBackground.opacity(0),
                        V2Color.pageGreenBackground.opacity(0.92),
                        V2Color.pageGreenBackground
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .allowsHitTesting(false)
            )
    }
}
```

- [ ] **Step 3: Add a scrollable flow screen variant**

In `V2FlowComponents.swift`, add:

```swift
struct V2ScrollableFlowScreen<Content: View, BottomAction: View>: View {
    let title: String
    var titleFont: Font = V2Typography.pageTitle
    var titleColor: Color = V2Color.topTitle
    var backgroundColor: Color = V2Color.pageGreenBackground
    var showSourceButton: Bool = false
    var showFavoriteButton: Bool = false
    var showDeleteButton: Bool = false
    var isFavoriteSaved: Bool = false
    let onBack: () -> Void
    var onSource: () -> Void = {}
    var onFavorite: () -> Void = {}
    var onDelete: () -> Void = {}
    @ViewBuilder let content: () -> Content
    @ViewBuilder let bottomAction: () -> BottomAction

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .top) {
                backgroundColor
                    .ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    content()
                        .frame(maxWidth: .infinity, alignment: .top)
                        .padding(.top, V2Layout.topChromeReservedHeight)
                        .padding(.bottom, V2ResponsiveLayout.scrollBottomPadding)
                }

                V2TopChrome {
                    V2FlowTopBar(
                        title: title,
                        titleFont: titleFont,
                        titleColor: titleColor,
                        showSourceButton: showSourceButton,
                        showFavoriteButton: showFavoriteButton,
                        showDeleteButton: showDeleteButton,
                        isFavoriteSaved: isFavoriteSaved,
                        onBack: onBack,
                        onSource: onSource,
                        onFavorite: onFavorite,
                        onDelete: onDelete
                    )
                }
                .zIndex(20)
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                V2BottomActionBar(bottomSafeArea: geometry.safeAreaInsets.bottom) {
                    bottomAction()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .ignoresSafeArea(.keyboard, edges: .bottom)
        .v2InteractiveBackSwipe(onBack: onBack)
    }
}
```

- [ ] **Step 4: Build**

Run:

```bash
# Prefer XcodeBuildMCP build_sim in Codex Desktop.
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

Run:

```bash
git add 拾贝/拾贝/V2/DesignSystem/V2DesignSystem.swift 拾贝/拾贝/V2/Components/V2FlowComponents.swift
git commit -m "feat: add responsive flow layout primitives"
```

---

## Task 3: Harden Review Overview And Summary Screens

**Files:**
- Modify: `拾贝/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift`

- [ ] **Step 1: Replace fixed bottom action offsets on overview screens**

Convert `V2ChapterOverviewView`, `V2UnitOverviewView`, `V2UnitSummaryView`, and `V2ChapterSummaryView` from fixed `V2Layout.primaryActionBottomY` buttons to `V2ScrollableFlowScreen`.

Pattern to apply:

```swift
V2ScrollableFlowScreen(
    title: "章节概要",
    onBack: onBack
) {
    ZStack(alignment: .top) {
        // Existing mascot, card, decoration content.
    }
    .frame(maxWidth: .infinity)
    .frame(minHeight: existingContentHeight, alignment: .top)
} bottomAction: {
    V2PrimaryActionButton(title: "继续", action: onContinue)
}
```

Do not keep:

```swift
V2PrimaryActionButton(title: "继续", action: onContinue)
    .offset(y: V2Layout.primaryActionBottomY)
```

- [ ] **Step 2: Ensure decorative content can crop but not cover actions**

Any decorative image near the bottom should keep:

```swift
.allowsHitTesting(false)
```

If a decoration visually overlaps the bottom action bar on SE, move it upward through its metrics value, not an inline offset.

- [ ] **Step 3: Build and simulator-check one small device**

Run build. Then launch the app on the smallest available iPhone simulator and manually navigate:

- Chapter overview
- Unit overview
- Unit summary
- Chapter summary

Expected:

- Continue/home action visible without being covered.
- If content is too tall, scrolling exposes the action and bottom content.

- [ ] **Step 4: Update audit doc**

Add findings to `docs/app-store-release-evidence/small-screen-audit.md` under:

```markdown
## Findings

### Review overview and summary screens

- Fixed bottom offsets replaced with bottom safe-area action slot.
- Smallest tested simulator: <exact simulator name>.
- Result: <pass/fail and notes>.
```

- [ ] **Step 5: Commit**

Run:

```bash
git add 拾贝/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift docs/app-store-release-evidence/small-screen-audit.md
git commit -m "fix: keep review overview actions visible on small screens"
```

---

## Task 4: Harden Question Screens And Feedback Panels

**Files:**
- Modify: `拾贝/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift`
- Modify: `拾贝/拾贝/V2/Components/Flow/V2QuestionComponents.swift`

- [ ] **Step 1: Make feedback panel use safe-area bottom placement**

Replace hard-coded `V2QuestionFeedbackMetrics.bottomLift = 72` with a derived value.

Add:

```swift
private enum V2QuestionFeedbackMetrics {
    static let compactBottomLift: CGFloat = 16
    static let regularBottomLift: CGFloat = 72

    static func bottomLift(screenHeight: CGFloat) -> CGFloat {
        V2ResponsiveLayout.isShortScreen(screenHeight) ? compactBottomLift : regularBottomLift
    }
}
```

Wrap question pages in `GeometryReader` where needed and use:

```swift
.padding(.bottom, V2QuestionFeedbackMetrics.bottomLift(screenHeight: geometry.size.height))
```

- [ ] **Step 2: Ensure question content can scroll behind feedback**

For multiple choice and matching pages, keep the top visual layout, but ensure the answer card area can be reached when feedback is visible. If the existing fixed `contentHeight` causes clipping, convert the page body to:

```swift
ScrollView(showsIndicators: false) {
    ZStack(alignment: .top) {
        // Existing progress, question card, decorations, mascot.
    }
    .frame(maxWidth: .infinity)
    .frame(minHeight: V2MultipleChoicePageMetrics.contentHeight, alignment: .top)
    .padding(.bottom, 180)
}
```

- [ ] **Step 3: Keep feedback panel tappable and dismissible**

In `V2AnswerFeedbackPanel`, verify:

- close button has at least 44pt hit area
- continue button remains visible on SE
- source button remains visible or intentionally secondary

If close button is currently a 30pt visual frame, wrap it:

```swift
.frame(width: V2ResponsiveLayout.minimumTapHeight, height: V2ResponsiveLayout.minimumTapHeight)
```

- [ ] **Step 4: Build and simulator-check question flow**

On smallest simulator:

- Answer a multiple-choice question.
- Confirm feedback panel appears.
- Tap close.
- Reopen feedback by answering or continuing.
- Tap continue.
- Answer a matching question if available.

Expected:

- Feedback panel never hides the only continue path.
- Continue and close are tappable.
- Bottom unsafe area does not swallow buttons.

- [ ] **Step 5: Update audit doc and commit**

Run:

```bash
git add 拾贝/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift 拾贝/拾贝/V2/Components/Flow/V2QuestionComponents.swift docs/app-store-release-evidence/small-screen-audit.md
git commit -m "fix: keep question feedback usable on small screens"
```

---

## Task 5: Harden Upload And Generation Screens

**Files:**
- Modify: `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
- Modify: `拾贝/拾贝/V2/Components/Generation/V2GenerationCards.swift`

- [ ] **Step 1: Make upload page height derived**

Replace fixed upload page height:

```swift
static let contentHeight: CGFloat = 600
```

with:

```swift
static func groupTopPadding(screenHeight: CGFloat) -> CGFloat {
    V2ResponsiveLayout.isShortScreen(screenHeight) ? 28 : 72
}

static func contentMinHeight(screenHeight: CGFloat) -> CGFloat {
    V2ResponsiveLayout.isShortScreen(screenHeight) ? 500 : 600
}
```

Then in `V2UploadView`, read geometry and use:

```swift
GeometryReader { geometry in
    VStack(spacing: V2UploadPageMetrics.verticalSpacing) {
        V2UploadMascotInputGroup(...)
            .padding(.top, V2UploadPageMetrics.groupTopPadding(screenHeight: geometry.size.height))

        V2PrimaryActionButton(...)
    }
    .frame(minHeight: V2UploadPageMetrics.contentMinHeight(screenHeight: geometry.size.height), alignment: .top)
}
```

- [ ] **Step 2: Ensure upload primary action is visible**

If the upload page still hides the primary action on SE, convert the upload content to a scrollable body inside `V2TabScaffold` rather than lowering visual quality with per-device offsets.

Expected behavior:

- Empty link state: disabled button visible.
- Recognized link state: feedback line visible and button visible.
- Keyboard open: text input visible; button may scroll, but must not be permanently inaccessible.

- [ ] **Step 3: Put generation detail/failure content in scrollable container**

For generation detail and generation failure views in `V2TabScreens.swift`, replace fixed `.frame(height: 760)` page wrappers with scrollable content:

```swift
ScrollView(showsIndicators: false) {
    ZStack(alignment: .top) {
        // Existing decorations and card.
    }
    .frame(maxWidth: .infinity)
    .frame(minHeight: 620, alignment: .top)
    .padding(.bottom, V2ResponsiveLayout.scrollBottomPadding)
}
```

Keep `V2GenerationStatusCardMetrics` internally fixed for now; the parent scroll container is the first safety fix.

- [ ] **Step 4: Build and simulator-check**

On smallest simulator:

- Upload page empty state.
- Upload page with Xiaohongshu/Douyin/Bilibili link.
- Start generation.
- Open generating chapter detail.
- Open generation failure detail if mock/failure state is available.

Expected:

- Primary action visible or scroll-reachable.
- Cancel/delete action visible on generating/failure cards.
- Bottom nav does not cover actionable content.

- [ ] **Step 5: Update audit doc and commit**

Run:

```bash
git add 拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift 拾贝/拾贝/V2/Components/Generation/V2GenerationCards.swift docs/app-store-release-evidence/small-screen-audit.md
git commit -m "fix: keep upload and generation actions visible on small screens"
```

---

## Task 6: Harden Tab Scaffold Bottom Navigation Clearance

**Files:**
- Modify: `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
- Modify: `拾贝/拾贝/V2/Screens/Home/V2HomeView.swift`
- Modify: `拾贝/拾贝/V2/Components/V2BottomNavigationBar.swift`

- [ ] **Step 1: Centralize bottom nav reserved height**

In `V2BottomNavigationBar.swift`, add:

```swift
extension V2BottomNavPlacement {
    static let visualHeight: CGFloat = 94

    static func reservedScrollBottomPadding(scale: CGFloat) -> CGFloat {
        visualHeight * scale + bottomPadding + 34
    }
}
```

- [ ] **Step 2: Use derived bottom padding in tab scaffold**

In `V2TabScaffold`, replace:

```swift
.padding(.bottom, 128)
```

with:

```swift
.padding(.bottom, V2BottomNavPlacement.reservedScrollBottomPadding(scale: bottomNavScale))
```

- [ ] **Step 3: Check home path viewport**

`V2HomeView` already derives bottom navigation size. Verify it uses the same `visualHeight` constant rather than repeating `94`.

Replace repeated `94` with:

```swift
V2BottomNavPlacement.visualHeight
```

- [ ] **Step 4: Build and simulator-check tabs**

On smallest simulator:

- Home
- All chapters
- Upload
- Discover
- Notes
- Profile

Expected:

- Last content item can scroll above bottom nav.
- Bottom nav does not cover cards or buttons.

- [ ] **Step 5: Update audit doc and commit**

Run:

```bash
git add 拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift 拾贝/拾贝/V2/Screens/Home/V2HomeView.swift 拾贝/拾贝/V2/Components/V2BottomNavigationBar.swift docs/app-store-release-evidence/small-screen-audit.md
git commit -m "fix: reserve bottom navigation space across tabs"
```

---

## Task 7: Harden Chapter Detail, Notes, Notifications, And Profile

**Files:**
- Modify: `拾贝/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift`
- Modify: `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
- Modify: `拾贝/拾贝/V2/Components/Cards/V2NotesCards.swift`
- Modify: `拾贝/拾贝/V2/Components/Cards/V2ProfileCards.swift`
- Modify: `拾贝/拾贝/V2/Components/Notifications/V2NotificationComponents.swift`

- [ ] **Step 1: Chapter detail**

Verify `V2ChapterDetailView` already uses `ScrollView`. Keep it scrollable, but inspect fixed hero action placement:

```swift
static let heroPrimaryActionY: CGFloat = 184
```

If the hero card action overlaps metadata on small width, make hero metadata/action vertical stack-based inside the card instead of absolute `position`.

Minimum acceptable fix:

- The primary chapter detail action remains visible.
- Metadata chips may truncate, but cannot cover the action.

- [ ] **Step 2: Notes**

`V2NotesView` uses fixed content height and card offsets. Convert the notes list to a `VStack` under a decorative ZStack, or keep the decorative ZStack but let the card list become:

```swift
VStack(spacing: 14) {
    V2NotesSummaryCard(count: savedQuestionCount)
    ForEach(savedQuestions) { savedQuestion in
        V2SavedQuestionCard(...)
    }
}
```

Decorations should use `.allowsHitTesting(false)` and not determine list height.

- [ ] **Step 3: Notifications**

`V2NotificationsView` has `V2NotificationLayout.screenHeight` and fixed notification card positions. Convert notification rows to a vertical stack:

```swift
VStack(spacing: 12) {
    V2NotificationSummaryBanner(...)
    ForEach(notifications) { notification in
        V2NotificationCard(...)
    }
}
.v2PageColumn()
```

- [ ] **Step 4: Profile**

Profile uses `V2FlowScreen` plus a scroll view already. Verify:

- Delete account/action buttons visible on SE.
- Avatar/settings sheets have scroll or fit within safe area.
- Any destructive confirmation button remains reachable.

If not reachable, wrap sheet content in:

```swift
ScrollView(showsIndicators: false) {
    VStack(...)
        .padding(.bottom, V2ResponsiveLayout.scrollBottomPadding)
}
```

- [ ] **Step 5: Build and simulator-check**

On smallest simulator:

- Chapter detail
- Notes with at least 3 saved questions
- Notifications with at least 3 notifications
- Profile settings sheet
- Delete/reset account confirmation if available

Expected:

- All destructive and primary actions visible or scroll-reachable.
- No button hidden behind bottom nav/home indicator.

- [ ] **Step 6: Update audit doc and commit**

Run:

```bash
git add 拾贝/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift 拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift 拾贝/拾贝/V2/Components/Cards/V2NotesCards.swift 拾贝/拾贝/V2/Components/Cards/V2ProfileCards.swift 拾贝/拾贝/V2/Components/Notifications/V2NotificationComponents.swift docs/app-store-release-evidence/small-screen-audit.md
git commit -m "fix: harden secondary tabs for small screens"
```

---

## Task 8: Final Simulator Matrix Evidence

**Files:**
- Modify: `docs/app-store-release-evidence/small-screen-audit.md`
- Optional create screenshots under: `docs/app-store-release-evidence/screenshots/small-screen/`

- [ ] **Step 1: Build**

Run XcodeBuildMCP `build_sim`.

Expected:

- Build succeeds.
- Any warnings are either existing warnings or documented in the audit file.

- [ ] **Step 2: Run full device matrix**

For each available simulator in the matrix:

- Smallest iPhone
- mini-class iPhone if available
- Standard iPhone
- Pro Max

Verify all flows listed in Task 1.

- [ ] **Step 3: Capture evidence screenshots**

For each P0 device, capture at least:

- Upload recognized link state
- Generating chapter detail
- Multiple choice feedback panel
- Matching feedback panel
- Chapter detail
- Profile settings or profile main

Save screenshots to:

```text
docs/app-store-release-evidence/screenshots/small-screen/
```

Use names like:

```text
iphone-se-upload-ready.png
iphone-se-mcq-feedback.png
iphone-mini-generation-detail.png
```

- [ ] **Step 4: Update audit doc**

Add:

```markdown
## Final Result

Build: PASS
Smallest iPhone: PASS/FAIL
Mini class: PASS/FAIL or unavailable
Standard iPhone: PASS/FAIL
Pro Max: PASS/FAIL

## Residual Risks

- <exact residual issue or "None known">
```

- [ ] **Step 5: Commit**

Run:

```bash
git add docs/app-store-release-evidence/small-screen-audit.md docs/app-store-release-evidence/screenshots/small-screen
git commit -m "docs: add small screen review evidence"
```

---

## Task 9: Production Readiness Decision

**Files:**
- Modify only if needed: `docs/production-readiness-evidence/`

- [ ] **Step 1: Confirm git state**

Run:

```bash
git status --short --branch
git log --oneline -8
```

Expected:

- Worktree clean.
- Local branch ahead by the planned checkpoint commits.

- [ ] **Step 2: Decide deploy readiness**

Ready to push/deploy only if:

- Build passes.
- P0 small-screen matrix passes.
- No missing primary action on upload, generation, review question, feedback, chapter detail, profile.
- Backend feature flags/keys are unchanged.
- No unrelated files were changed.

- [ ] **Step 3: Ask before remote push**

Do not run `git push` until the user explicitly confirms remote push/deploy.

---

## Self-Review

### Spec Coverage

- The plan starts by checking the layout risks instead of guessing per-device fixes.
- The plan avoids per-device special cases and uses shared responsive layout primitives.
- The plan covers all major V2 frontend areas: upload, materials, generation, review flow, question feedback, chapter detail, notes, notifications, profile, home.
- The plan requires simulator evidence before considering production or App Store resubmission.

### Placeholder Scan

- No `TBD` or empty implementation steps remain.
- Each task lists files, concrete code patterns, verification, and commit command.

### Residual Risk

- The exact reviewer screenshots are not currently available in the repo. If the user can provide them later, compare them against this audit matrix and add a targeted task for that exact screen.
- Automated UI navigation is not yet part of this plan. Manual simulator verification is acceptable for this hardening pass; adding XCTest UI automation can be a later improvement once layout is stable.

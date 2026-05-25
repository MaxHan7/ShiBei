# Chapter Favorites Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Chapters tab so users switch between article chapters and favorite questions with a standard top-level segmented page control that supports tapping and horizontal swiping.

**Architecture:** Add a small `ChapterSection` state to `AppStore`, render a top text tab control inside `ChaptersView`, and host the existing chapter list and favorite questions page inside a SwiftUI `TabView` with `.page(indexDisplayMode: .never)`. Favorite review exits and completion now route back to the Chapters tab with `chapterSection = .favorites`.

**Tech Stack:** SwiftUI, existing `AppStore` route state, existing `FavoriteQuestionsView` and `ChapterListCard` components.

---

### Task 1: Add Chapter Section State

**Files:**
- Modify: `/Users/hanmingyu/Downloads/拾贝/拾贝/拾贝/Services/MockServices.swift`

- [x] **Step 1: Add a section enum**

Add:

```swift
enum ChapterSection: String, CaseIterable, Identifiable {
    case chapters
    case favorites

    var id: String { rawValue }
}
```

- [x] **Step 2: Add `@Published var chapterSection: ChapterSection = .chapters` to `AppStore`**

- [x] **Step 3: Route favorite entry and exits through `chapterSection = .favorites`**

Update `openFavoriteQuestions()`, `startFavoriteReview()`, `returnToFavoriteQuestions()`, and any reset path that should default to the chapters page.

### Task 2: Redesign ChaptersView

**Files:**
- Modify: `/Users/hanmingyu/Downloads/拾贝/拾贝/拾贝/Views/ChapterViews.swift`

- [x] **Step 1: Replace the inline "我的题集" card area with a top text tab control**

The control uses two labels:

```text
章节
收藏
```

Selected label is black and bold. Unselected label is muted.

- [x] **Step 2: Use `TabView(selection:)` for horizontal swiping**

Page 1 contains article chapters. Page 2 contains the existing favorites content.

- [x] **Step 3: Keep favorite empty state and review entry inside the Favorites page**

Reuse `FavoriteQuestionsView` content style without nesting an extra AppScaffold inside the Chapters page.

### Task 3: Verify Routing

**Files:**
- Modify: `/Users/hanmingyu/Downloads/拾贝/拾贝/拾贝/Views/RootView.swift` only if the old standalone route becomes unnecessary.

- [x] **Step 1: Keep standalone `.favoriteQuestions` route working for safety**

It can render the same favorites page if deep-linked by existing code.

- [x] **Step 2: Ensure favorite review "back" and last-question CTA return to the favorites section**

Expected:

```text
Favorite review -> explanation -> 回到收藏 -> Chapters tab, 收藏 selected
```

### Task 4: Build

**Files:**
- Test: `/Users/hanmingyu/Downloads/拾贝/拾贝/拾贝.xcodeproj`

- [x] **Step 1: Build iOS target**

Run:

```bash
xcodebuild -project 拾贝/拾贝.xcodeproj -scheme 拾贝 -destination 'generic/platform=iOS' build
```

Expected: `** BUILD SUCCEEDED **`.

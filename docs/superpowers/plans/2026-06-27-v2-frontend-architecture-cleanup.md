# V2 Frontend Architecture Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce recurring V2 frontend bugs by separating routing/state, mock data, design tokens, and reusable components into clearer boundaries.

**Architecture:** Keep the existing SwiftUI screens and visual design intact, but move structural responsibilities out of giant views. Each checkpoint must build on its own and avoid broad visual changes unless the checkpoint explicitly targets visual token consistency.

**Tech Stack:** SwiftUI, Xcode, existing V2 design system, existing `APIClient`, local fixture models.

---

## File Map

- `拾贝/拾贝/V2/V2RootView.swift`
  - Current app shell, route switching, backend state, generation state, notifications, favorites, and review-session orchestration.
  - Target: keep as app composition shell, then progressively move route/state helpers out.
- `拾贝/拾贝/V2/Fixtures/V2DemoContentProvider.swift`
  - New provider for demo/mock content currently embedded in views.
- `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
  - Current tab views. Target: consume injected display data instead of owning demo content.
- `拾贝/拾贝/V2/DesignSystem/V2DesignSystem.swift`
  - Current color, typography, spacing, layout tokens. Target: add missing semantic tokens before replacing raw values.
- `拾贝/拾贝/V2/Components/V2FlowComponents.swift`
  - Current large shared component file. Target: split only after token/state boundaries are stable.
- `docs/frontend/v2-frontend-architecture.md`
  - New architecture notes for future work.

## Checkpoint 1: Mock/Fixture Data Boundary

**Goal:** Prevent views from owning mock/demo data directly.

**Files:**
- Create: `拾贝/拾贝/V2/Fixtures/V2DemoContentProvider.swift`
- Modify: `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
- Modify: `docs/frontend/v2-frontend-architecture.md`

- [ ] Create `V2DemoContentProvider` with demo recommended articles and notification fixtures.
- [ ] Update `V2DiscoverView` to receive `articles` and `filters` from its initializer instead of hardcoding them in the view.
- [ ] Keep `V2RootView` as the injector for now; do not introduce a full environment service yet.
- [ ] Build with `xcodebuild -project 拾贝.xcodeproj -scheme 拾贝 -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build`.
- [ ] Commit: `refactor: isolate v2 demo content`.

## Checkpoint 2: Route State Boundary

**Goal:** Make route-stack behavior easier to reason about before changing any navigation behavior.

**Files:**
- Create: `拾贝/拾贝/V2/Navigation/V2RouteStore.swift`
- Modify: `拾贝/拾贝/V2/V2RootView.swift`

- [ ] Add a small value type that owns `currentRoute` and `stack`.
- [ ] Move `pushRoute`, `replaceRoute`, `resetToRoute`, `resetToHome`, and simple `goBack` stack mutation into that type.
- [ ] Keep special-case review/source back behavior in `V2RootView` until it can be tested separately.
- [ ] Build.
- [ ] Commit: `refactor: extract v2 route store`.

## Checkpoint 3: Generation State Boundary

**Goal:** Reduce generation-specific state scattered through `V2RootView`.

**Files:**
- Create: `拾贝/拾贝/V2/State/V2GenerationUIState.swift`
- Modify: `拾贝/拾贝/V2/V2RootView.swift`

- [ ] Group generation dialog, polling task, generation error text, and pending original-source URL into a named UI state.
- [ ] Keep API calls in `V2RootView` for this checkpoint; only group state and derived display text.
- [ ] Build.
- [ ] Commit: `refactor: group v2 generation ui state`.

## Checkpoint 4: Typography/Color Token Cleanup

**Goal:** Stop new inconsistent font/color usage from spreading.

**Files:**
- Modify: `拾贝/拾贝/V2/DesignSystem/V2DesignSystem.swift`
- Modify selected small components first:
  - `拾贝/拾贝/V2/Components/V2FlowComponents.swift`
  - `拾贝/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift`
  - `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`

- [ ] Add semantic aliases for repeated colors and fonts found in high-traffic components.
- [ ] Replace only repeated semantic uses, not Figma-specific one-off drawing values.
- [ ] Build.
- [ ] Commit: `refactor: centralize v2 text and color tokens`.

## Checkpoint 5: Component File Split

**Goal:** Make shared components easier to inspect and modify without unrelated regressions.

**Files:**
- Split from `拾贝/拾贝/V2/Components/V2FlowComponents.swift` into:
  - `拾贝/拾贝/V2/Components/Flow/V2FlowScaffold.swift`
  - `拾贝/拾贝/V2/Components/Flow/V2QuestionComponents.swift`
  - `拾贝/拾贝/V2/Components/Generation/V2GenerationCards.swift`
  - `拾贝/拾贝/V2/Components/Notifications/V2NotificationComponents.swift`
  - `拾贝/拾贝/V2/Components/Cards/V2ChapterCards.swift`
  - `拾贝/拾贝/V2/Components/Cards/V2DiscoverCards.swift`
  - `拾贝/拾贝/V2/Components/Cards/V2NotesCards.swift`
  - `拾贝/拾贝/V2/Components/Cards/V2ProfileCards.swift`

- [ ] Move code without behavior changes.
- [ ] Build after each moved group.
- [ ] Commit: `refactor: split v2 flow components`.

## Guardrails

- Do not change generated question logic.
- Do not redesign screens during architecture cleanup.
- Do not replace Figma/SVG drawing constants unless they are proven page-level layout values.
- Every checkpoint must build before commit.
- Prefer injection from `V2RootView` before introducing global environment objects.


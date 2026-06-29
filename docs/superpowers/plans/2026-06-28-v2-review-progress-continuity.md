# V2 Review Progress Continuity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make V2 review progress cumulative and legible when users freely jump between units, leave mid-unit, and later resume from either Home or the normal sequential flow.

**Architecture:** The backend V2 review session remains the source of truth for completed cards, current focus, wrong-answer replay, and jump/resume behavior. The iOS app asks the backend to focus a unit, then renders Home nodes from the returned session with separate states for current focus, partial non-current progress, completed, and unstarted.

**Tech Stack:** Node backend review session state machine, SwiftUI V2 app, existing `V2BackendReviewSession` DTOs, existing Xcode project.

---

### Task 1: Backend Session Semantics

**Files:**
- Modify: `backend/src/v2/state/reviewSessionV2.js`
- Modify: `backend/src/v2/state/reviewSessionV2.test.js`

- [x] Add `focusReviewUnitV2(reviewPath, session, { unitId })`.
  - Normalize the session.
  - Find the requested unit.
  - Set `currentCard` to that unit's first incomplete card.
  - Preserve `completedStepIds`, `questionStates`, and `needsReviewQuestionIds`.
- [x] Add `firstIncompleteCardInUnit(reviewPath, session, unit)`.
  - If `unitId:overview` is not completed, return unit overview.
  - Else return the first unit question whose `unitId:questionId` is not completed.
  - Else, if `unitId:summary` is not completed, return unit summary.
  - Else return unit summary, so reopening a completed unit is stable and reviewable.
- [x] Update normal sequential advance to skip already completed cards.
  - Advancing from a unit overview should go to first incomplete question or summary.
  - Advancing after question feedback should skip already completed later questions.
  - Advancing from a unit summary should enter the next unit at that next unit's first incomplete card.
- [x] Add backend tests:
  - Jumping to a later unit, answering one question, then focusing that unit again resumes at the first unfinished question.
  - Sequential flow reaching a partially completed later unit skips the already correct question.
  - Incorrect questions remain in `needsReviewQuestionIds` and are not counted as completed until answered correctly.

### Task 2: Backend HTTP Contract

**Files:**
- Modify: `backend/src/server.js`
- Modify: `backend/scripts/route-contract-gate.mjs`

- [x] Import `focusReviewUnitV2`.
- [x] Extend V2 review-session action routing with `focus-unit`.
- [x] For `POST /api/v2/review-sessions/:id/focus-unit`, call `focusReviewUnitV2(chapter, session, body)`.
- [x] Keep the response shape identical to existing review session actions.
- [x] Update the route contract gate so production readiness accepts the new action.

### Task 3: iOS API And Models

**Files:**
- Modify: `拾贝/拾贝/Services/APIClient.swift`
- Modify: `拾贝/拾贝/V2/Models/V2HomeModels.swift`

- [x] Add `focusV2ReviewUnit(sessionId:unitId:)`.
- [x] Add a request body model containing `unitId`.
- [x] Add `inProgress` to `V2LearningPathNodeState`.
- [x] Compute node state from:
  - `completed`: unit summary completed.
  - `current`: session current card is in this unit.
  - `inProgress`: completed question count is greater than zero or unit overview is completed.
  - `locked`: no user progress yet.
- [x] Keep `completedQuestionCount` and `totalQuestionCount` as the source for per-unit progress rings.

### Task 4: iOS Entry Behavior

**Files:**
- Modify: `拾贝/拾贝/V2/V2RootView.swift`

- [x] Change Home node taps for backend chapters:
  - Start node still opens chapter overview or current route when appropriate.
  - Unit node calls the backend `focus-unit` action, applies the returned session, and routes to `currentCard`.
- [x] Change chapter detail unit/knowledge entry to use the same focus action.
- [x] Keep the main "继续复习" button as exact current-card resume.
- [x] Preserve local fixture behavior for preview/mock mode.

### Task 5: Home Node Visual States

**Files:**
- Modify: `拾贝/拾贝/V2/Components/V2LearningPathNodeView.swift`

- [x] Keep the existing green segmented progress ring for `current`.
- [x] Add a gray segmented progress ring for `inProgress`.
- [x] Render completed nodes as the existing green completed body without an extra ring.
- [x] Render unstarted nodes as the existing gray node without a ring.
- [x] Keep visual values inside named metrics/styles, not inline in the body.

### Task 6: Verification

**Commands:**
- Run backend targeted test:
  - `cd backend && node --test src/v2/state/reviewSessionV2.test.js`
- Run backend route/check if touched:
  - `cd backend && npm run check:v2`
- Run iOS build:
  - `xcodebuild -project '拾贝/拾贝.xcodeproj' -scheme '拾贝' -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath build/DerivedData build`

**Manual smoke expectation:**
- If a user jumps to Unit 6, answers 2/5 correctly, exits, Home shows Unit 6 as current with green 2/5 ring.
- If the user later continues from an earlier unit, Unit 6 appears with a gray 2/5 ring until it becomes current again.
- When the normal flow reaches Unit 6, already correct questions are skipped.
- Wrong answers remain pending and replay after new cards until answered correctly.

### Task 7: Commit

**Files to stage:**
- `backend/src/v2/state/reviewSessionV2.js`
- `backend/src/v2/state/reviewSessionV2.test.js`
- `backend/src/server.js`
- `backend/scripts/route-contract-gate.mjs`
- `拾贝/拾贝/Services/APIClient.swift`
- `拾贝/拾贝/V2/Models/V2HomeModels.swift`
- `拾贝/拾贝/V2/V2RootView.swift`
- `拾贝/拾贝/V2/Components/V2LearningPathNodeView.swift`
- `docs/superpowers/plans/2026-06-28-v2-review-progress-continuity.md`

**Do not stage unrelated existing work:**
- `backend/package.json`
- `backend/scripts/build-recommended-article.mjs`
- `backend/src/sources/extractSourceContent.js`
- `backend/scripts/extract-recommended-candidate-text.mjs`

**Commit message:**
`feat: preserve v2 unit progress across jumps`

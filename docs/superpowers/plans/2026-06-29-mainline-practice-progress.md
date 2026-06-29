# Mainline vs Practice Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate the ordered homepage review progress from temporary unit practice so jumping into an earlier/later unit never corrupts the mainline resume point.

**Architecture:** Keep one durable mainline review session per chapter, with `currentCard`, `questionStates`, and `completedStepIds` representing only the ordered learning path. Add a separate practice route/mode for temporary unit review, with its own active card and answer states; practice may be persisted separately by the backend, but homepage node state must always derive from the mainline session unless the chapter is already completed.

**Tech Stack:** SwiftUI iOS app, Node.js V2 backend, V2 review-session JSON contract, XCTest or node:test where available.

---

## Product Rules

1. **Unfinished chapter, homepage path**
   - Mainline current node is the only node with the green current progress ring.
   - Completed units remain completed.
   - Started but not completed units must not show the old gray partial progress ring; that temporary visual conflicts with the new mainline/practice split.
   - Future locked units can still be tapped to preview the unit summary text, but the popover must not show a review button.

2. **Unfinished chapter, chapter detail knowledge list**
   - The user may enter any unit from the expanded knowledge list.
   - This is temporary practice mode.
   - Practice mode must not update homepage `currentNodeID`, mainline `currentCard`, or mainline `completedStepIds`.
   - When the user exits practice, homepage still focuses the previous mainline node.

3. **Unfinished chapter, revisiting previous units**
   - If the user is on mainline unit 3 and revisits unit 1 from homepage, this should not move the mainline back to unit 1.
   - Treat previous-unit revisit as practice unless it is the current mainline node.

4. **Completed chapter**
   - All units stay unlocked.
   - Every unit popover can show a review button.
   - Re-entering any unit after completion may update the visual focus to the last exited unit, but must not relock other units.
   - Completed chapter free review should be visually separate from unfinished mainline gating.

## Files To Touch

- Modify: `拾贝/拾贝/V2/Models/V2HomeModels.swift`
  - Add explicit node action availability, so UI does not infer button visibility from only `state`.
  - Derive locked/future nodes from mainline progress.

- Modify: `拾贝/拾贝/V2/Components/V2NodePopover.swift`
  - Support summary-only popovers with no button.
  - Keep existing button layout for actionable nodes.

- Modify: `拾贝/拾贝/V2/V2RootView.swift`
  - Route homepage current-node actions through mainline.
  - Route previous/future/manual unit jumps through practice.
  - Keep `activeLearningChapterID` and homepage `currentNodeID` tied to mainline.

- Modify: `拾贝/拾贝/Services/APIClient.swift`
  - Add practice-specific API methods if backend persistence is implemented.

- Modify: `拾贝/拾贝/V2/Models/V2BackendModels.swift`
  - Keep `practice` fields only for practice mode display, not for normal homepage resume.

- Modify: `experiments/shibei-v2/backend/src/v2/state/reviewSessionV2.js`
  - Add practice session helpers if backend persistence is implemented.
  - Ensure mainline mutation functions do not read/write practice state.

- Modify: `experiments/shibei-v2/backend/src/server.js`
  - Add practice endpoints or action mode routing.

- Test: `experiments/shibei-v2/backend/src/v2/state/reviewSessionV2.test.js`
  - Add state-machine tests for mainline vs practice separation.

## Checkpoint 1: Define Node Affordances

- [ ] Add a node affordance model in `V2HomeModels.swift`.

```swift
enum V2LearningPathNodeAction {
    case mainline
    case practice
    case previewOnly
}
```

- [ ] Add `let action: V2LearningPathNodeAction` to `V2LearningPathNodeData`.

- [ ] Derive action rules:
  - `start`: `.mainline`
  - completed chapter unit: `.practice`
  - unfinished chapter current unit: `.mainline`
  - unfinished chapter completed or started earlier unit: `.practice`
  - unfinished chapter locked future unit: `.previewOnly`

- [ ] Remove legacy partial-progress visuals from the node component:
  - `.current` keeps the green segmented progress ring.
  - `.inProgress` has no segmented ring.
  - Delete unused gray `partial` progress style constants so they cannot reappear by accident.

- [ ] Update fixture constructors so all sample nodes compile.

- [ ] Build:

```bash
xcodebuild -project 拾贝/拾贝.xcodeproj -scheme 拾贝 -destination 'generic/platform=iOS Simulator' build
```

- [ ] Commit:

```bash
git add 拾贝/拾贝/V2/Models/V2HomeModels.swift 拾贝/拾贝/V2/Fixtures/V2HomeFixture.swift
git commit -m "feat: model learning path node actions"
```

## Checkpoint 2: Fix Homepage Popover Behavior

- [ ] Update `V2NodePopover` to accept `showsActionButton: Bool`.

- [ ] Show only `node.subtitle` for `.previewOnly`.

- [ ] Keep the existing green 42pt action button for `.mainline` and `.practice`.

- [ ] In `V2HomeView`, pass `selectedNode.action != .previewOnly`.

- [ ] In `V2RootView.openNode(_:)`, ignore `.previewOnly` action if triggered defensively.

- [ ] Build and manually verify:
  - Future locked node shows only summary.
  - Current node shows continue.
  - Completed previous node shows review/continue.
  - No non-current node shows the old gray segmented progress ring.

- [ ] Commit:

```bash
git add 拾贝/拾贝/V2/Components/V2NodePopover.swift 拾贝/拾贝/V2/Screens/Home/V2HomeView.swift 拾贝/拾贝/V2/V2RootView.swift
git commit -m "fix: hide review action for locked future nodes"
```

## Checkpoint 3: Split Mainline And Practice Routing On iOS

- [ ] Add a local enum in `V2RootView.swift`.

```swift
private enum V2ReviewEntryMode {
    case mainline
    case practice(origin: V2PracticeOrigin)
}

private enum V2PracticeOrigin {
    case homeNode
    case chapterDetail
    case completedChapter
}
```

- [ ] Change `openNode(_:)`:
  - `.mainline` calls existing `startOrResumeV2ReviewSession` or mainline advance route.
  - `.practice` calls a new `startPracticeFromUnit(unitID:origin:)`.
  - `.previewOnly` only opens/closes popover and never navigates.

- [ ] Change `startReviewFromChapterDetailUnit(unitID:)` to always call practice mode for unfinished chapters.

- [ ] For completed chapters, route all unit entries as practice/free-review and keep every node unlocked.

- [ ] Make practice routes use separate `questionInteractionStates` keys so answer UI does not overwrite mainline answer UI.

- [ ] Build and manually verify:
  - Mainline unit 3 remains current after practicing unit 1 or unit 5.
  - Returning home focuses unit 3.
  - Completed chapter can enter any node.

- [ ] Commit:

```bash
git add 拾贝/拾贝/V2/V2RootView.swift
git commit -m "feat: separate practice routes from mainline review"
```

## Checkpoint 4: Backend Practice Session Contract

- [ ] Add backend tests first in `reviewSessionV2.test.js`:
  - Starting practice from unit 5 leaves `session.currentCard` unchanged.
  - Practice answer writes only `practice.questionStates`.
  - Practice advance writes only `practice.completedStepIds`.
  - Mainline advance after practice resumes the original `currentCard`.

- [ ] Implement helpers in `reviewSessionV2.js`:
  - `startPracticeFromUnitV2(reviewPath, session, { unitId })`
  - `advancePracticeCardV2(reviewPath, session)`
  - `answerPracticeQuestionV2(reviewPath, session, body)`
  - `clearPracticeV2(reviewPath, session)` if needed when leaving practice.

- [ ] Add server routes:

```text
POST /api/v2/review-sessions/:id/practice/start
POST /api/v2/review-sessions/:id/practice/advance
POST /api/v2/review-sessions/:id/practice/answer
POST /api/v2/review-sessions/:id/practice/finish
```

- [ ] Preserve existing endpoints for mainline only.

- [ ] Run backend tests:

```bash
cd experiments/shibei-v2/backend
npm test -- src/v2/state/reviewSessionV2.test.js
```

- [ ] Commit:

```bash
git add experiments/shibei-v2/backend/src/v2/state/reviewSessionV2.js experiments/shibei-v2/backend/src/v2/state/reviewSessionV2.test.js experiments/shibei-v2/backend/src/server.js
git commit -m "feat: add isolated v2 practice session state"
```

## Checkpoint 5: Wire iOS To Backend Practice APIs

- [ ] Add methods in `APIClient.swift`:
  - `startV2PracticeSession(sessionId:unitId:)`
  - `advanceV2PracticeSession(sessionId:)`
  - `answerV2PracticeQuestion(...)`
  - `finishV2PracticeSession(sessionId:)`

- [ ] In `V2RootView`, practice mode uses practice APIs, mainline mode uses existing APIs.

- [ ] Ensure `V2HomeData.init(chapter:reviewSession:)` derives `currentNodeID` from `reviewSession.currentCard`, not `reviewSession.displayCard`.

- [ ] Ensure top progress bars inside practice screens use practice completed counts, while homepage node rings use mainline counts.

- [ ] Build:

```bash
xcodebuild -project 拾贝/拾贝.xcodeproj -scheme 拾贝 -destination 'generic/platform=iOS Simulator' build
```

- [ ] Commit:

```bash
git add 拾贝/拾贝/Services/APIClient.swift 拾贝/拾贝/V2/Models/V2BackendModels.swift 拾贝/拾贝/V2/V2RootView.swift 拾贝/拾贝/V2/Models/V2HomeModels.swift
git commit -m "feat: wire isolated practice progress on iOS"
```

## Checkpoint 6: Acceptance Test On Device

- [ ] Scenario A: unfinished chapter mainline.
  - Start chapter.
  - Advance to unit 3 question 2.
  - Exit home.
  - Expected: homepage current ring is unit 3.

- [ ] Scenario B: revisit earlier unit.
  - Tap unit 1.
  - Practice one question.
  - Exit home.
  - Expected: homepage current ring is still unit 3.

- [ ] Scenario C: locked future unit.
  - Tap unit 5 from homepage before reaching it.
  - Expected: popover shows summary only, no continue button.

- [ ] Scenario D: chapter detail temporary unit.
  - Open chapter detail.
  - Enter unit 5 from knowledge list.
  - Practice one screen.
  - Exit home.
  - Expected: homepage current ring is still unit 3.

- [ ] Scenario E: completed chapter.
  - Complete a chapter.
  - Re-enter any unit.
  - Exit home.
  - Expected: all nodes remain unlocked; current focus may be the last practiced unit.

- [ ] Commit final polish if needed.

## Open Decision

The implementation can be done in two levels:

1. **Fast local-only practice mode:** iOS does not call backend for temporary unit practice. It is safer and quicker, but temporary progress is lost if the app is killed.
2. **Production practice mode:** Backend persists a separate `practice` object. This is more work, but it matches the existing model fields and is safer for real users.

Recommended path: implement Checkpoints 1-3 first to fix the visible logic quickly, then implement Checkpoints 4-5 before TestFlight if we want practice mode to survive app restarts.

# Small Screen App Store Review Audit

Date: 2026-07-13
Branch: codex/lean-high-value-generation-20260711

## Device Matrix

| Device | Runtime | Status | Notes |
| --- | --- | --- | --- |
| iPhone SE (3rd generation) | iOS 26 simulator | Pending | P0 smallest modern review target for short-height failures. |
| iPhone 13 mini | iOS 26 simulator | Pending | P0 narrow modern safe-area target. |
| iPhone 17 | iOS 26 simulator | Pending | P1 standard current iPhone baseline. |
| iPhone 17 Pro Max | iOS 26 simulator | Pending | P1 large screen regression target. |

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

### 2026-07-13: Review overview and summary action placement

- Migrated chapter overview, unit overview, unit summary, and chapter summary primary actions out of fixed Y-offset content.
- New placement uses a shared bottom safe-area action slot through `V2ScrollableFlowScreen`.
- Compile verification: `build_sim` passed with no warnings after this change.
- Device matrix visual verification: pending final simulator pass.

# Small Screen App Store Review Audit

Date: 2026-07-13
Branch: codex/lean-high-value-generation-20260711

## Device Matrix

| Device | Runtime | Status | Notes |
| --- | --- | --- | --- |
| iPhone SE (3rd generation) | iOS 26 simulator | In progress | Home/upload/materials/discover/notes/generating detail checked; URL feedback overlay issue fixed and retested. |
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

### 2026-07-13: Question feedback panel small-screen safety

- Multiple choice and matching feedback panels now reduce bottom lift on short screens instead of always using a 72pt lift.
- Feedback close button hit area now uses the shared 44pt minimum tap target.
- Feedback continue button height now uses the shared 44pt minimum tap target.
- Compile verification: `build_sim` passed with no warnings after this change.
- Device matrix visual verification: pending final simulator pass.

### 2026-07-13: Upload and generation detail short-screen layout

- Upload screen top spacing and card-to-action spacing now use responsive metrics on short screens.
- Generating chapter detail and failure detail no longer force a 760pt content height; mascot/card positions now compact on short screens.
- Updated upload text-change handling to the modern iOS `onChange` signature to keep the build warning-free.
- Compile verification: `build_sim` passed with no warnings after this change.
- Device matrix visual verification: pending final simulator pass.

### 2026-07-13: Bottom navigation clearance standardization

- Bottom navigation design size now lives in `V2BottomNavPlacement` instead of repeated `357 x 94` values.
- Tab scaffold scroll views reserve bottom space from the actual scaled navigation height plus safe area and clearance.
- Home learning path viewport now uses the same scaled navigation height as the rendered bottom navigation.
- Compile verification: `build_sim` passed with no warnings after this change.
- Device matrix visual verification: pending final simulator pass.

### 2026-07-13: iPhone SE upload recognition feedback

- Visual verification found the system URL candidate overlay could cover the source-type feedback row after typing a video link.
- Upload URL input now declares URL text content type in addition to URL keyboard/autocorrection settings.
- The upload screen now dismisses keyboard/candidate UI once link preflight reaches ready or blocked state.
- SE retest confirmed the row `将根据小红书视频生成学习内容` remains visible with the start button and bottom navigation.
- Compile verification: `build_sim` and SE `build_run_sim` passed with no warnings after this change.

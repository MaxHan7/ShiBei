# iOS Large Screen Content Width Verification

Date: 2026-07-13

Branch: `codex/lean-high-value-generation-20260711`

## Scope

This verification covers the V2 responsive content width migration for large iPhone screens. The goal was to keep the existing standard iPhone baseline while improving Pro Max visual density and side margins.

## What Changed

- Added a responsive V2 content width token:
  - standard/small screens: `321pt`
  - large-phone screens: `357pt`
- Injected the resolved width through `v2ContentWidth`.
- Migrated upload, chapter list, discover, notes, profile, generation, notification, review, unit overview, question, and chapter-detail cards to consume the responsive content width where they represent page content.
- Kept fixed illustration/dialog canvases fixed when widening would distort artwork composition.

## Verification

### Build

- `build_sim` succeeded after the design-system migration.
- `build_sim` succeeded after generation/notification migration.
- `build_sim` succeeded after review/detail migration.
- `build_sim` succeeded after final profile/card cleanup.

### Pro Max

Simulator:

- `iPhone 17 Pro Max`
- UDID: `AADC4DC0-510F-4306-9793-3447A552E7B4`

Result:

- App launched successfully.
- Home screen kept the original visual composition.
- Upload screen showed a wider centered input card and primary action, reducing excessive side margins without crowding the bottom navigation.

Screenshots:

- `/var/folders/9f/cjyn13t933j8w4xc6rz6lh5h0000gn/T/screenshot_optimized_6f1a5e23-3231-4172-83af-2263ee69375e.jpg`
- `/var/folders/9f/cjyn13t933j8w4xc6rz6lh5h0000gn/T/screenshot_optimized_9c8cab14-7470-4b61-9ce8-2e588719db8a.jpg`

### Small Screen

Simulator:

- `Recallo Audit iPhone SE 3 iOS26`
- UDID: `7F60995D-0D71-4351-A0BD-1382BE4094C2`

Result:

- App launched successfully.
- Home screen remained visible after UI settled.
- Upload screen retained visible input, primary action, and bottom navigation.
- No clipping or missing button was observed on the checked flow.

Screenshots:

- `/var/folders/9f/cjyn13t933j8w4xc6rz6lh5h0000gn/T/screenshot_optimized_90c4763f-5428-48ca-be35-e1bb89036897.jpg`
- `/var/folders/9f/cjyn13t933j8w4xc6rz6lh5h0000gn/T/screenshot_optimized_c9c0a48a-25d4-4473-9789-637b56492ac3.jpg`

## Notes

- The original default XcodeBuildMCP simulator and one listed standard-width simulator had stale CoreSimulator data directories and could not boot.
- `iPhone 16 Pro Max` iOS 18.5 was listed but was not accepted as a destination by the active build setup; validation used the iOS 26 Pro Max simulator instead.
- The standard-width visual baseline is protected by the threshold rule: screens narrower than `428pt` continue to use the existing `321pt` content width.

## Remaining Risk

- Full manual QA should still sample more deep states, especially answered feedback panels and long chapter-detail content, before App Store submission.
- The completed migration removes the most visible fixed page-width problem, but there are still fixed artwork canvases by design.

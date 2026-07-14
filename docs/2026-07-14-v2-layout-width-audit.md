# V2 Layout Width Audit

Date: 2026-07-14

## Problem

On iPhone Pro Max sized simulators, Home and Profile did not share the same visible page column. Profile cards were using the large-phone content width while the Home current-chapter banner stayed on the default standard width.

## Root Cause

The V2 design system already defines a semantic content width:

- `V2Layout.contentMaxWidth = 321`
- `V2Layout.largeContentMaxWidth = 357`
- `V2Layout.contentWidth(for:)` chooses the correct width for the active screen.

`V2TabScaffold` and `V2FlowScreen` both inject `v2ContentWidth` from `V2Layout.contentWidth(for:)`.

`V2HomeView` was a custom root screen and did not inject `v2ContentWidth`, so Home subviews that called `.v2PageContentWidth()` received the environment default `321`. This caused Home to remain narrower than Profile/Discover on Pro Max.

## Fix

`V2HomeView` now computes:

```swift
let contentWidth = V2Layout.contentWidth(for: geometry.size.width)
```

and injects:

```swift
.environment(\.v2ContentWidth, contentWidth)
```

at its root `ZStack`.

This keeps Home on the same semantic layout system as `V2TabScaffold` and `V2FlowScreen`.

## Verification

- XcodeBuildMCP build/run succeeded on iPhone 17 Pro Max.
- Home current-chapter banner visually aligns with Profile cards on iPhone 17 Pro Max.
- Discover cards continue to align with the same content column on iPhone 17 Pro Max.
- XcodeBuildMCP build/run also succeeded on iPhone 16 Pro.
- Two listed iOS 26 simulators were unavailable because their CoreSimulator data directories were missing; this was an environment issue, not an app build failure.

## Remaining Watch Item

`V2MatchingPageMetrics` still references `V2Layout.contentMaxWidth` for decorative mascot overlap. That value affects illustration placement rather than the main page/card column, so it was not changed in this fix. It should be cleaned up in a broader review-screen decoration pass.

# V2 Layout System

## Goal

V2 page layout should be driven by design-system tokens and shared scaffolds, not by page-by-page hardcoded margins. The intent is that page-level spacing can be adjusted from one place while component-internal spacing stays stable.

## Core Tokens

Source: `拾贝/拾贝/V2/DesignSystem/V2DesignSystem.swift`

- `V2Layout.pageHorizontalInset`
  - Page-level horizontal inset from the physical screen edge.
  - Use this for page containers, popover clamping, and floating page actions.
- `V2Layout.pageContentMaxWidth`
  - Maximum width of the main readable/actionable page column.
  - Most cards, progress bars, and primary buttons should align to this column.
- `V2Layout.topBarTopPadding`
  - Shared top chrome vertical placement.
- `V2Layout.topBarHeight`
  - Shared top chrome height.
- `V2Layout.floatingActionTrailingInset`
  - Page-level trailing inset for floating controls that visually align with page content.

`V2Spacing.screenMargin` remains only as a legacy alias. New page-level layout should use `V2Layout.pageHorizontalInset`.

## Shared Modifiers

- `v2PageContentWidth()`
  - Centers content and caps it to `V2Layout.pageContentMaxWidth`.
- `v2PageHorizontalInset()`
  - Applies `V2Layout.pageHorizontalInset`.
- `v2PageColumn()`
  - Applies both page content width and horizontal inset.
  - Prefer this for normal scroll content inside page scaffolds.

## Scaffold Rules

- Tab pages should use `V2TabScaffold`.
- Review-flow pages should use `V2FlowScreen`.
- Top circular buttons should be placed through `V2TopChrome` and `V2FlowTopBar`, not manually offset per page.
- Primary bottom actions should use `V2PrimaryActionButton` and align to `V2Layout.primaryActionWidth`.

## What Not To Tokenize

Do not blindly replace all numeric layout values. These should remain component-owned unless a layout bug proves otherwise:

- Figma/SVG canvas sizes.
- Mascot/IP illustration sizes and offsets.
- Card internal padding.
- Icon sizes.
- Matching/quiz grid internal spacing.
- Text offsets inside highly specific card drawings.

## New Page Checklist

When adding a new V2 page:

1. Pick the correct scaffold first: `V2TabScaffold` or `V2FlowScreen`.
2. Place scroll content inside `v2PageColumn()`.
3. Use `V2Layout.pageContentMaxWidth` for page-level cards and progress bars.
4. Use component-local `Metrics` enums for internal card spacing.
5. Avoid hardcoded page margins such as `.padding(.horizontal, 24)`.
6. If a new layout value is page-level and reusable, add it to `V2Layout` with a semantic name.


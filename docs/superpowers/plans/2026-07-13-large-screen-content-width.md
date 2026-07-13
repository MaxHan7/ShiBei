# iOS Large Screen Content Width Hardening

> **For Mingyu:** REQUIRED SUB-SKILL: Use `superpowers:execute-plan` to implement this plan.

**Goal:** Make the V2 iOS UI feel correctly composed on Pro Max and other large iPhone screens while preserving the current 15/16 Pro baseline and the small-screen fixes already completed.

## Design Decision

The current V2 UI treats `321pt` as a universal page width. That is safe on smaller and standard iPhones, but on Pro Max it makes the content column too narrow and leaves overly large side margins. The standard fix is not to hand-tune every screen, but to promote the page width into a responsive design token:

- Standard and smaller iPhones keep the existing `321pt` readable/action width.
- Large iPhones expand the main readable/action width to a controlled larger width.
- Components read the same width token instead of each carrying an unrelated hard-coded width.

This keeps the primary product baseline stable while letting large devices use their extra space with better visual density.

## Current Risk Areas

- `V2Layout.contentMaxWidth` and `primaryActionWidth` are fixed at `321pt`.
- `v2PageContentWidth()` always caps pages at `321pt`.
- Upload, generation, notes, profile, discover, chapter list, and review/detail components contain local fixed `321pt` widths.
- Some review screens calculate mascot or option positions from fixed `contentMaxWidth`, so they need a narrower, careful migration.

## Implementation Plan

1. **Audit and documentation checkpoint**
   - Record the large-screen problem and affected surfaces in this plan.
   - Confirm the active workspace and branch before editing.
   - Commit the plan document as the first checkpoint.

2. **Responsive layout token**
   - Add large-screen content width tokens in `V2DesignSystem.swift`.
   - Keep `contentMaxWidth = 321` as the standard baseline.
   - Add a large-screen width around `357pt` for Pro Max-class screens.
   - Add an environment value, `v2ContentWidth`, so shared components can use the resolved width.
   - Update `v2PageContentWidth()` and page-level helpers to read the environment width.

3. **Root layout injection**
   - Inject `v2ContentWidth` from `GeometryReader` in `V2TabScaffold`.
   - Inject the same width in `V2FlowScreen` and `V2ScrollableFlowScreen`.
   - Keep bottom nav size independent, because it is a fixed custom control.

4. **Tab and upload surfaces**
   - Update upload input group width from fixed `321pt` to `v2ContentWidth`.
   - Update primary actions and bottom action bars to use the responsive page width.
   - Update top chrome/page columns through the shared modifier.

5. **Large-screen card migration**
   - Migrate high-visibility list cards and summary cards first:
     - chapter cards
     - generated chapter summary card
     - discover hero/recommendation cards
     - notes summary card
     - profile header/card surfaces
   - Preserve internal icon/mascot sizes unless a card relies on absolute positioning tied to `321pt`.

6. **Review/detail/source surfaces**
   - Migrate safe, text-heavy review/detail cards to the responsive width.
   - Keep complex illustration overlays conservative if widening would require redesigning asset composition.
   - Prefer readable text expansion and action-width alignment over moving decorative elements.

7. **Verification**
   - Build with XcodeBuildMCP.
   - Verify at least:
     - small-screen simulator for no clipping/regression
     - standard Pro baseline for no major visual change
     - Pro Max simulator for improved side margins and content density
   - Record verification notes and any remaining risks in a docs checkpoint.

## Acceptance Criteria

- Standard Pro-class screens keep the same visual baseline.
- Pro Max-class screens no longer look like the content is unnecessarily squeezed into a narrow column.
- Small-screen fixes remain intact: buttons stay visible, scrollable content is reachable, and bottom nav does not cover actions.
- Width behavior is centralized in V2 design tokens/environment, not scattered through per-page one-off constants.
- The branch remains local until explicit user confirmation to push.

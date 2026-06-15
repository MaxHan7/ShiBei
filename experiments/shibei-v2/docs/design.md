---
version: alpha
name: Shibei V2
description: A warm, study-focused mobile design system for article review, recall, and lightweight practice.
colors:
  primary: "#98A84E"
  primary-action: "#A5AE66"
  text-primary: "#44423D"
  text-secondary: "#676767"
  page-green-background: "#E8EBBD"
  surface-cream: "#FDFAF2"
  surface-nav: "#FCF8ED"
  surface-circle-button: "#FDF9EE"
  border-soft-green: "#E0E5BA"
  feedback-correct-fill: "#F3F5D7"
  feedback-wrong-fill: "#FEF5F0"
  feedback-wrong-border: "#FD9789"
  selected-blue-border: "#94D0E9"
  locked-border: "#E4E4E4"
  decorative-leaf: "#DDE1AC"
typography:
  page-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, SF Pro Text"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0px
  card-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, SF Pro Text"
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0px
  body-large:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text"
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.55
    letterSpacing: 0px
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0px
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0px
rounded:
  sm: 10px
  md: 15px
  lg: 20px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  screen-margin: 27px
components:
  primary-action-button:
    backgroundColor: "{colors.primary-action}"
    textColor: "#FFFFFF"
    typography: "{typography.card-title}"
    rounded: "{rounded.md}"
    height: 53px
    width: 321px
  feedback-action-button:
    backgroundColor: "{colors.primary-action}"
    textColor: "#FFFFFF"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: 42px
    width: 321px
  circle-icon-button:
    backgroundColor: "{colors.surface-circle-button}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.full}"
    size: 44px
  question-option-normal:
    backgroundColor: "#FEF8F2"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    width: 270px
    height: 71px
  matching-option-normal:
    backgroundColor: "#FEF8F2"
    textColor: "#1F1B12"
    rounded: "{rounded.md}"
    width: 140px
    height: 90px
---

# Shibei V2 Design System

This file is the compact, AI-readable design source of truth for Shibei V2. It follows the Google Stitch DESIGN.md pattern: machine-readable tokens in YAML front matter, plus human-readable rationale and rules below.

Detailed Figma node audits, asset filenames, and page-by-page implementation notes are intentionally kept outside this file:

- `asset-manifest.md`: SVG/PNG/PDF source assets and how they should enter iOS.
- `component-registry.md`: SwiftUI component candidates, variants, Figma node ids, and dynamic fields.
- `page-composition.md`: page-level composition and flow.
- `v2-frontend-implementation-notes-zh.md`: exploratory notes and HTML mock decisions.

## Overview

Shibei V2 should feel warm, focused, and gently instructional. The product is not a dense enterprise tool and not a decorative landing page. It is a mobile learning companion: calm enough for repeated study, concrete enough for reading and answering questions, and playful through the mascot without becoming childish.

The visual language combines soft cream cards, muted green surfaces, hand-drawn mascot assets, and simple rounded controls. The UI should make reading and review feel approachable, while still preserving a disciplined component system.

## Colors

The palette is built around warm cream surfaces and a restrained green action color.

- **Primary Green (`#98A84E`)** is used for selected navigation icons, important route graphics, and brand emphasis.
- **Primary Action (`#A5AE66`)** is used for main action buttons such as continue, return home, and start review.
- **Text Primary (`#44423D`)** is the standard dark ink for icons and text. Avoid introducing near-black variants unless there is a clear semantic reason.
- **Page Green Background (`#E8EBBD`)** anchors the main learning pages.
- **Surface Cream (`#FDFAF2`)** is the main content card surface.
- **Soft Green Border (`#E0E5BA`)** is used for quiet outlines and unselected cards.
- **Feedback colors** are reserved for answer states: green for correct, red for wrong, blue only for temporary matching-card selection, and grey for locked matched pairs.

Do not create visually similar one-off colors in page files. If a new color is needed, add it as a token first.

## Typography

Use the native iOS system font family. Do not import a custom font for V2 unless the product direction changes.

Text must be real SwiftUI `Text`, not baked into SVG or screenshots. Long Chinese text should favor comfortable line height and predictable wrapping. Page titles should be visually consistent across screens even when Figma frames contain small hand-dragged offsets.

Typography should be quiet and readable:

- Page titles are bold and centered.
- Card titles are medium-to-bold but not oversized.
- Long explanations and summaries use generous line height.
- Navigation labels and tags stay compact.

## Layout

Layouts are mobile-first and must respect iOS safe areas. Figma absolute coordinates are references, not production constraints.

Stable rules:

- Reused controls should align consistently across pages.
- Screen margins and card widths should be component-driven.
- Primary content should not collide with the floating bottom navigation.
- Home path nodes can scroll vertically when a chapter has more nodes than fit in one viewport.
- Popovers prefer horizontal centering; their pointer moves to target a node. If the pointer cannot reach safely, the whole popover may shift slightly while preserving readability.

HTML mock files are for visual alignment only. SwiftUI should rebuild the layout with real components.

## Elevation & Depth

Depth is soft and green-tinted. Shadows should support hierarchy without making the interface feel heavy.

The current base shadow is a soft green shadow equivalent to `0 4 4 #98A35E33`. Use it for floating navigation, buttons, and cards of the same elevation. Status-specific feedback may use a state-colored shadow only when already confirmed in the component registry.

Avoid inventing page-specific shadows. If a shadow recurs, make it a token.

## Shapes

The shape language uses rounded cream surfaces and circular icon buttons.

- Small chips and compact controls use about `10px` radius.
- Cards and option cells use about `15px` radius.
- Larger panels can use `20px` or more when they are visually intended as soft containers.
- Icon buttons and node circles use full rounding.

Do not mix slightly different radii for the same component across pages because of Figma drag/copy variance.

## Components

Components are implemented in SwiftUI, not as whole SVG screenshots.

Core components include:

- `V2BottomNavigationBar`
- `V2BottomNavItem`
- `V2UploadTabButton`
- `V2CircleIconButton`
- `V2PrimaryActionButton`
- `V2FeedbackActionButton`
- `V2UnitProgressBar`
- `V2QuestionOptionCard`
- `V2MatchingOptionCard`
- `V2AnswerFeedbackPanel`
- `V2NotificationCard`
- `V2ChapterCard`
- `V2ChapterStatusTag`
- `V2CurrentChapterBanner`
- `V2DiscoverChip`
- `V2RecommendedArticleCard`
- `V2ProfileStatCard`
- `V2ProfileSettingRow`
- `V2UnitCompletionResultBanner`
- `V2ChapterCompletionResultCard`

Stateful components must use explicit variants:

- `V2QuestionOptionCard`: `normal`, `correct`, `wrong`.
- `V2MatchingOptionCard`: `normal`, `selected`, `correct`, `wrong`, `locked`.
- `V2PrimaryActionButton`: `normal`, `disabled`.
- `V2FeedbackActionButton`: `correct`, `wrong`, `disabled`.
- `V2NotificationCard`: `success`, `failure`.
- `V2ChapterCard`: `notStarted`, `reviewing`, `completed`.
- `V2DiscoverChip`: `inactive`, `selected`.

The matching interaction is strict: the first selected card turns blue; when the second card is tapped, it does not become blue. The pair immediately turns green if correct or red if wrong. Correct pairs then become locked grey after a short delay; wrong pairs return to normal after a short delay.

## Do's and Don'ts

- Do use DESIGN.md for stable visual identity, design rationale, and token-level component styling.
- Do use the component registry for exact Figma node ids, variants, and SwiftUI implementation details.
- Do keep SVG/PDF/PNG assets in the asset manifest, not inside DESIGN.md prose.
- Do preserve same-frame icon exports for multi-state icons, especially bottom navigation.
- Do rebuild buttons, cards, chips, banners, progress bars, and question options as SwiftUI components.
- Don't use full-page, full-card, or full-banner SVGs as production UI.
- Don't silently approximate missing Figma data. Mark it as missing and ask for the exact asset or node.
- Don't let HTML mock shortcuts override component-library rules.
- Don't hard-code slightly different colors, line widths, or offsets for the same semantic element.

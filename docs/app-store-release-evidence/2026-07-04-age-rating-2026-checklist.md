# 2026-07-04 Age Rating 2026 Checklist Refresh

## Scope

This evidence records a documentation-only App Store release readiness update for Recallo's age rating workflow.

## What changed

- Added the current App Store Connect age rating workflow to `docs/app-store-review-submission-pack-zh.md`.
- Clarified that the user must complete the current App Store Connect questionnaire rather than relying on old TestFlight/App Store records.
- Clarified the boundary between article URL input and unrestricted in-app web access.
- Clarified that Recallo currently has no public community UGC, while user-provided content is processed for private learning generation.
- Added evidence requirements:
  - App Store Connect age rating completion screenshot.
  - `.release/app-store-inputs/external-console-checks.json` with `appStoreConnect.ageRatingCompleted=true`.

## Official source check

Official Apple pages reviewed on 2026-07-04:

- `https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/`
- `https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/`
- `https://developer.apple.com/news/?id=ks775ehf`

Relevant conclusion: age rating is a required App Store Connect app information field, current submissions should use the updated age rating questionnaire and values, and completion remains a user-owned App Store Connect action.

## Status

READY for documentation handoff.

Still user-owned:

- Complete the age rating questionnaire inside App Store Connect.
- Save screenshot evidence.
- Set `appStoreConnect.ageRatingCompleted=true` only after completing the real console action.

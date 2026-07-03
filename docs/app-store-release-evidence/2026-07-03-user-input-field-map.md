# User Input Field Map

Date: 2026-07-03
Worktree: `/Users/hanmingyu/Downloads/拾贝-prod-hardening`

## Change

Added `docs/app-store-user-input-field-map-zh.md` as the canonical user-facing map for remaining App Store release inputs.

It lists:

- Recommended values for every field in `docs/app-store-user-decision-form-zh.md`.
- Exact JSON paths in `.release/app-store-inputs/external-console-checks.json`.
- Where each Apple Developer / App Store Connect value should be checked.
- Which production acceptance fields still require true TestFlight/device verification.
- Screenshot file names and validation command.

## Linked Entry Points

- `docs/app-store-user-action-checklist-zh.md` now links to the field map.
- `npm run app-store:create-user-handoff` now includes the field map link in generated handoff documents.
- `docs/app-store-release-evidence/2026-07-03-user-handoff.md` was regenerated.

## Validation

- `npm run app-store:create-user-handoff -- --force`

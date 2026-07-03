# User Handoff Safety Refresh

Date: 2026-07-03
Worktree: `/Users/hanmingyu/Downloads/拾贝-prod-hardening`

## Change

Updated `npm run app-store:create-user-handoff` so the generated user handoff:

- Shows a recommended order for the remaining user-owned App Store actions.
- Clearly states that Codex will handle document rewrites, dry-runs, gates, evidence, and commits after user input.
- Avoids telling the user to copy the external-console template when `.release/app-store-inputs/external-console-checks.json` already exists.
- Instead tells the user to open the existing file and continue filling missing fields, preventing accidental overwrite of partially completed Apple Developer / App Store Connect confirmations.
- Provides a direct `open` command for the existing production acceptance record.

## Validation

- `node --check tools/app-store-create-user-handoff.mjs`
- `npm run app-store:create-user-handoff -- --force`

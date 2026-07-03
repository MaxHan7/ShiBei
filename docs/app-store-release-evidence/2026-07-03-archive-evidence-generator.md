# 2026-07-03 Archive Evidence Generator

## Result

PASS

## Scope

This checkpoint adds a standard evidence generator for the manual Xcode Archive and App Store Connect upload step.

## Files

- `tools/app-store-create-archive-evidence.mjs`
- `package.json`
- `docs/app-store-archive-submit-runbook-zh.md`
- `docs/app-store-user-action-checklist-zh.md`
- `docs/app-store-release-evidence/README.md`
- `docs/app-store-release-readiness-plan-zh.md`

## Behavior

`npm run app-store:create-archive-evidence` creates:

```text
docs/app-store-release-evidence/YYYY-MM-DD-build-<build-number>-archive.md
```

The user must provide the Xcode Organizer and App Store Connect fields:

- iOS build number.
- Archive result.
- Upload result.
- Organizer app name.
- Organizer bundle id.
- Organizer icon confirmation.

The script fills:

- Git commit.
- Git branch.
- Official Xcode project path.
- Xcode scheme.
- Production URL.
- Railway deployment id from production `/api/health`.

The script refuses placeholder values such as `TBD`, `unknown`, `placeholder`, `待补充`, or `待填写`.

## Verification

| Command | Result | Notes |
| --- | --- | --- |
| `node --check tools/app-store-create-archive-evidence.mjs` | PASS | Syntax check passed. |
| `npm run app-store:create-archive-evidence -- --dry-run` | PASS | Failed intentionally with missing `--ios-build-number`; confirms required manual fields are enforced. |
| `npm run app-store:create-archive-evidence -- --dry-run --ios-build-number 42 --version 1.0.0 --archive-result PASS --upload-result PASS --organizer-app-name Recallo --organizer-bundle-id com.maxhan.shibei --organizer-icon-confirmed yes --app-store-connect-build 42` | PASS | Dry-run with complete sample fields passed. |
| `npm run app-store:create-archive-evidence -- --output /tmp/recallo-archive-evidence.md --ios-build-number 42 --version 1.0.0 --archive-result PASS --upload-result PASS --organizer-app-name Recallo --organizer-bundle-id com.maxhan.shibei --organizer-icon-confirmed yes --app-store-connect-build 42 --force` | PASS | Temporary evidence file created and inspected. |
| `git diff --check` | PASS | No whitespace errors. |
| `npm run check` | PASS | Backend tests passed; 204 tests passed. Workspace, iOS production, and V2 UI guards passed. |
| `npm run app-store:status` | PASS as report | Overall still NOT READY because user decisions, screenshots, production acceptance, contact URL/email, and final submission fields are still missing. Production health and iOS release preflight passed. |

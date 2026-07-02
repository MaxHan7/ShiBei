# Recallo App Store Release Evidence

This folder stores the evidence used to decide whether a Recallo build is ready for TestFlight expansion or App Store review.

Every release candidate must have evidence here before it is submitted.

## Naming Rules

Use stable, date-prefixed names:

- `YYYY-MM-DD-build-<build-number>-archive.md`
- `YYYY-MM-DD-health-<deployment-id>.md`
- `YYYY-MM-DD-screenshot-<scene>.png`
- `YYYY-MM-DD-recording-<scene>.mov`
- `YYYY-MM-DD-production-acceptance.md`

Examples:

- `2026-07-02-build-18-archive.md`
- `2026-07-02-health-51ae3233.md`
- `2026-07-02-screenshot-home-path.png`
- `2026-07-02-recording-generation-success.mov`

## Required Metadata

Each evidence note should include:

- Date and time.
- Git commit hash.
- Git branch.
- iOS build number.
- Xcode project path.
- Xcode scheme.
- Railway deployment id.
- Test device and iOS version.
- Test account or anonymous device id handling.
- Result: pass, fail, or blocked.
- Follow-up issue or task if failed.

## Required Evidence Before App Review

- Archive evidence: correct workspace, scheme, app icon, app name, build number, commit hash.
- Production health evidence: `/api/health` output and deployment id.
- Notification evidence: background or lock-screen APNs success and failure-path behavior.
- Generation evidence: user article generation success and failure-path handling.
- Recommended article evidence: simulated generation page and final chapter detail behavior.
- Learning evidence: progress restore, wrong-answer replay, favorite toggle, explanation/source view.
- Data evidence: update/reopen/language-change data retention checks.
- Privacy evidence: AI processing consent, privacy text, account/data deletion path.

## Storage Rule

Do not store secrets, API keys, APNs tokens, full user-submitted article text, or private user data in this folder. Redact sensitive values before saving command output.

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

## Archive Evidence Generator

After Xcode Archive and App Store Connect upload, generate the build evidence from the official workspace:

```bash
cd /Users/hanmingyu/Downloads/拾贝-prod-hardening
npm run app-store:create-archive-evidence -- \
  --ios-build-number <build-number> \
  --version <version> \
  --archive-result PASS \
  --upload-result PASS \
  --organizer-app-name Recallo \
  --organizer-bundle-id com.maxhan.shibei \
  --organizer-icon-confirmed yes
```

The generator fills git commit, branch, Xcode project path, scheme, production URL, and Railway deployment id. It refuses placeholder values such as `TBD`, `unknown`, or `待补充`.

## Fast Release Input Generator

After the user replies with the fast first-release template, create machine-readable inputs before applying changes:

```bash
cd /Users/hanmingyu/Downloads/拾贝-prod-hardening
npm run app-store:parse-fast-release-reply -- \
  --input /tmp/recallo-user-reply.txt \
  --acceptance-record docs/app-store-release-evidence/YYYY-MM-DD-production-acceptance.md
```

If the reply is incomplete or needs manual overrides, use the lower-level generator:

```bash
cd /Users/hanmingyu/Downloads/拾贝-prod-hardening
npm run app-store:create-fast-release-inputs -- \
  --support-email <support-email> \
  --privacy-url <public-privacy-policy-url> \
  --support-url <public-support-url> \
  --acceptance-record <production-acceptance-record-path> \
  --p0-status "无 P0" \
  --p1-status "无未豁免 P1" \
  --screenshots-status "已准备" \
  --archive-confirmation "已确认 Recallo 名称、新图标、Bundle ID com.maxhan.shibei" \
  --asc-confirmation "已确认在 com.maxhan.shibei 对应现有 App 下提交"
```

This writes `.release/app-store-inputs/decision-values.json` and `.release/app-store-inputs/contact-values.json`. The `.release/` folder is intentionally ignored by Git because it may contain release-specific contact information and temporary user-provided values.

## User Reply Intake Orchestrator

After the user replies with the fast first-release template, use the safe orchestrator first:

```bash
cd /Users/hanmingyu/Downloads/拾贝-prod-hardening
npm run app-store:ingest-user-reply -- \
  --input .release/recallo-user-reply.txt \
  --acceptance-record docs/app-store-release-evidence/YYYY-MM-DD-production-acceptance.md \
  --force
```

This creates ignored `.release/` JSON inputs, dry-runs all document updates, prints the release status, and checks whether the App Store Connect copy pack is ready. It does not modify tracked documents unless `--apply` is passed.

After reviewing the dry-run output:

```bash
npm run app-store:ingest-user-reply -- \
  --input .release/recallo-user-reply.txt \
  --acceptance-record docs/app-store-release-evidence/YYYY-MM-DD-production-acceptance.md \
  --force \
  --apply
```

## App Store Connect Copy Pack Generator

After user decisions, support email, Privacy URL, Support URL, screenshots, and production acceptance are finalized, generate the final App Store Connect copy/paste pack:

```bash
cd /Users/hanmingyu/Downloads/拾贝-prod-hardening
npm run app-store:create-connect-copy-pack
```

The command refuses to create a final pack while required fields are pending. For an internal draft before all blockers are resolved:

```bash
npm run app-store:create-connect-copy-pack -- --allow-pending --force --output /tmp/recallo-app-store-connect-copy-pack.md
```

Submit only from a pack whose `Blockers` section is empty.

## Storage Rule

Do not store secrets, API keys, APNs tokens, full user-submitted article text, or private user data in this folder. Redact sensitive values before saving command output.

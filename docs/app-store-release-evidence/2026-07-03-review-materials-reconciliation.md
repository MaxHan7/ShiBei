# Recallo App Review Materials Reconciliation - 2026-07-03

## Purpose

Reconcile App Store readiness section 3.5 against the current metadata, review notes, privacy documents, and screenshot checklist.

## Evidence Reviewed

- `docs/app-store-metadata-zh.md`
- `docs/app-store-review-submission-pack-zh.md`
- `docs/privacy-policy-zh.md`
- `docs/privacy-policy.html`
- `docs/app-store-release-evidence/screenshots-checklist.md`
- `tools/app-store-create-connect-copy-pack.mjs`

## Items Marked Complete As Draft Materials

- App name is `Recallo`.
- Subtitle draft exists and is under 30 characters.
- App Store description draft exists.
- Keywords draft exists and is under 100 characters.
- Review Notes draft explains the core review path, AI processing disclosure, notification purpose, account decision branches, and payment-free first version.
- TestFlight/App Store testing notes draft exists.
- App Privacy label draft exists.
- Age rating guidance exists.
- Screenshot scene checklist and technical specification exist.
- App Store Connect copy pack generator exists and can produce a draft pack; strict final pack remains blocked until URLs and decisions are filled.

## Items Still Open For User / App Store Connect

- Final public HTTPS Support URL.
- Final public HTTPS Privacy Policy URL.
- Final support email.
- Final subtitle/promotional text/category/keywords decision.
- Final App Store screenshots.
- Actual App Store Connect age rating questionnaire.
- Actual App Store Connect App Privacy labels.
- Final account decision: anonymous-first vs optional Sign in with Apple.
- Xcode Archive/App Store Connect build selection confirmation.

## Important Scope Note

The checklist marks draft materials as complete, not final App Store submission readiness. The strict submission gate remains blocked until user-provided URLs, decisions, screenshots, and acceptance evidence are available.

## Verification Commands

```bash
npm run app-store:create-connect-copy-pack -- --allow-pending --force --output /tmp/recallo-app-store-connect-copy-pack.md
npm run check:app-store-submit:report
npm run app-store:status
```

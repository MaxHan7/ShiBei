# Recallo Quota and Privacy Checklist Reconciliation - 2026-07-03

## Purpose

Reconcile App Store readiness sections 3.3 and 3.4 against current code, tests, and documentation evidence.

## Evidence Reviewed

- `backend/src/generationQuota.js`
- `backend/src/db.js`
- `backend/src/v2/generation/v2ChapterQueue.js`
- `backend/src/tests/generationQuota.test.js`
- `backend/src/v2/generation/v2ChapterQueue.test.js`
- `拾贝/拾贝/V2/Components/V2AIProcessingConsentSheet.swift`
- `拾贝/拾贝/V2/V2RootView.swift`
- `拾贝/拾贝/V2/Components/Cards/V2ProfileCards.swift`
- `docs/privacy-policy-zh.md`
- `docs/privacy-policy.html`
- `docs/app-store-review-submission-pack-zh.md`
- `docs/app-store-metadata-zh.md`
- `docs/app-store-release-evidence/2026-07-02-generation-quota.md`
- `docs/app-store-release-evidence/2026-07-02-ai-processing-consent.md`

## Quota Items Marked Complete

- Default real AI generation quota is 3 per UTC day.
- The quota limit can be configured with `RECALLO_DAILY_REAL_GENERATION_LIMIT`.
- Real generation quota claims are stored by device/day/request id.
- Postgres uses a device+day transaction lock for quota claims.
- Reused pending jobs do not double-charge the quota.
- Over-quota requests return stable error code `quota_exceeded_daily_generation` with HTTP `429`.
- User-facing over-quota copy exists.
- Tests cover UTC day calculation, 3 allowed claims, 4th rejected claim, request id reuse, next-day reset, V2 enqueue charging, and pending job reuse.
- Recommended article import stays on a separate prepared-content import path and does not enter real generation enqueue.

## Quota Items Still Open

- Dedicated operational counters for failure counts and recommended article import counts are not implemented as a standalone analytics/ops metric. This is useful but not a blocker for first App Store submission because the cost-control quota already protects real model calls.
- User must confirm whether the default daily limit remains 3.

## Privacy and AI Consent Items Marked Complete

- Privacy policy Markdown and HTML use Recallo naming.
- Privacy policy states that submitted URLs, extracted text, and necessary context may be sent to third-party AI model services.
- Privacy policy covers user content, identifiers, usage data, diagnostics, retention, deletion, and backup boundaries.
- App Review notes explain the AI processing disclosure and where it appears.
- First real AI generation is gated by `V2AIProcessingConsentSheet`.
- If the user declines the AI processing sheet, real generation is not started.
- Consent is stored locally with `@AppStorage("v2.hasAcceptedAIProcessingConsent")`.
- The privacy explanation can be reviewed from the profile privacy sheet.

## Privacy Items Still Open

- User must provide a final support email.
- User must provide final public HTTPS Privacy Policy URL and Support URL.
- User must manually fill App Store Connect App Privacy labels using the prepared draft.
- If Apple Login is added for the first App Store version, account deletion scope and App Store privacy notes must be finalized for that path.

## Commands To Re-Run

```bash
node --test backend/src/tests/generationQuota.test.js backend/src/v2/generation/v2ChapterQueue.test.js
npm run check:release-ios
npm run app-store:status
```

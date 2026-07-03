# Production Ops Runbook Evidence

Date: 2026-07-03
Scope: App Store production operations readiness

## Created

- `docs/app-store-production-ops-runbook-zh.md`
- `backend/scripts/app-store-production-ops-diagnostics.mjs`
- Root npm scripts:
  - `npm run app-store:ops-diagnostics`
  - `npm run check:app-store-ops-diagnostics`

## Covered

- User-impact-first SLI table for API health, database, queue, APNs, recommended catalog, and generation failures.
- Release-before checks:
  - `npm run app-store:status`
  - `npm run check:app-store-health`
  - `npm run check:release-ios`
- Railway/API incident response:
  - record commit/build/deployment id
  - run health audit
  - inspect Railway logs without copying secrets/user content
  - rollback criteria
  - incident evidence template
- Queue and generation failure triage:
  - `failed_input`
  - `model_calling` / timeout / 429
  - `structured_output_failed`
  - `contract_validation_failed`
  - `quality_failed`
  - unknown failures
- APNs notification triage:
  - `BadDeviceToken`
  - `BadEnvironmentKeyInToken`
  - `DeviceTokenNotForTopic`
  - `apns_not_configured`
- Backup and restore readiness:
  - publish-time backup checklist
  - App-layer soft delete restore commands
  - database restore drill steps
- Recommended article regression triage:
  - missing covers
  - filter rollback
  - missing simulated generation
- Read-only production diagnostics:
  - recent generation job queue/status/stage summary
  - recent failed chapter status/stage/reason aggregation
  - recent APNs delivery status/error aggregation
  - recent quota claim usage by day

## Still Not Claimed Complete

This does not claim full production observability automation. These remain open until implemented or explicitly deferred:

- Production dashboard for failure-rate trends.
- Automatic alerting for APNs delivery error aggregation.
- At least one non-production database restore drill evidence file.
- True-device background/lock-screen notification acceptance.

## Verification

The runbook is intentionally file/document-only. It is connected back into `docs/app-store-release-readiness-plan-zh.md` section 3.6 and the execution ledger.

# Recallo Production Stability Reconciliation - 2026-07-03

## Purpose

Reconcile App Store readiness section 3.6 against the current production health audit, deployment runbook, and backend evidence.

## Evidence Reviewed

- `tools/app-store-production-health-audit.mjs`
- `docs/app-store-release-evidence/2026-07-03-production-health-audit.md`
- `docs/v2-production-deploy-runbook-zh.md`
- `backend/src/db.js`
- `backend/src/notificationPush.js`
- `backend/src/v2/generation/generationFailures.js`
- `backend/src/v2/generation/runtimeReliability.js`

## Current Production Health Snapshot

Command:

```bash
npm run app-store:health-audit
```

Result:

- HTTP status: `200`
- `ok`: `true`
- service: `recallo-api`
- node env: `production`
- Railway environment: `production`
- Railway deployment id: `51ae3233-4431-471e-9194-a80b5b09a900`
- storage: `postgres`
- database: `ok`
- queue: `queued=0`, `running=0`, `failed=0`
- APNs: configured, environment `production`
- recommended catalog: 9 articles, filters `全部,AI,产品,学习,商业`
- production health status: `READY`

## Items Marked Complete

- `/api/health` covers database, queue, APNs, recommended catalog, and core capabilities.
- Queue queued/running/failed counts are visible to the App Store status command.
- The App Store health audit blocks if the queue has failed jobs.
- Production deploy runbook distinguishes `preserve-data` and `reset-data`.

## Items Still Open

- Railway crash/restart email alert handling still needs a concise App Store-era incident runbook.
- Generation failure-rate monitoring by failure type still needs a production dashboard/alert loop.
- APNs failures such as `BadDeviceToken`, `BadEnvironmentKeyInToken`, and config failures are recorded in send results, but still need aggregation and alerting.
- Backup restore should either be rehearsed once or documented as a direct executable recovery runbook before broad public launch.

## Scope Note

The current production health state is good enough to keep App Store readiness moving, but it is not a full observability program. The open items above should remain visible until they are backed by operational evidence.

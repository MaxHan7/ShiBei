
> recallo@0.1.0 app-store:ops-readiness-report
> node tools/app-store-ops-readiness-report.mjs

# Recallo App Store Ops Readiness Report
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
generatedAt=2026-07-04T06:42:23.187Z

## Summary
productionHealth=READY
databaseDiagnostics=NOT_AVAILABLE_IN_THIS_SHELL

## Gate Matrix
| Area | Release gate | State | Evidence | Next action |
| --- | --- | --- | --- | --- |
| API / DB health | REQUIRED | READY | Production health: READY | Keep running `npm run check:app-store-health` before Archive. |
| Queue failure / backlog visibility | REQUIRED | READY | queueQueued=0; queueRunning=0; queueFailed=0 | Set DATABASE_URL in the local shell when deeper queue diagnostics are needed. |
| APNs production configuration | REQUIRED | READY_PENDING_DEVICE_ACCEPTANCE | apnsConfigured=true; apnsEnvironment=production | User must still verify background/lock-screen delivery in the acceptance record. |
| Recommended article catalog | REQUIRED | READY | recommendedCatalogArticleCount=9; recommendedCatalogFilters=全部,AI,产品,学习,商业 | If covers/filter regress, rerun health audit and compare deployment commit. |
| Failure-rate and APNs delivery diagnostics | CONDITIONAL | AVAILABLE_REQUIRES_DATABASE_URL | DATABASE_URL not present in this shell; script exists and is syntax-checked by npm run check. | Run `npm run app-store:ops-diagnostics` when investigating generation failures or notification delivery issues. |
| Backup and restore | USER/OPS_DECISION | RUNBOOK_READY_DRILL_RECOMMENDED | Runbook defines backup check, App-layer restore, and database restore drill steps. | Before broader release, record one non-production restore drill evidence file. |
| Automated dashboards / external alerting | POST_FIRST_RELEASE_ENHANCEMENT | MINIMAL_GATE_READY_FULL_ALERTING_DEFERRED | Current App Store gate uses deterministic checks; full dashboard/alert integrations are not required for the first controlled release. | After first controlled release, add external alerts for health failure, stale queue, generation failure spike, APNs errors, and worker restarts. |

## Current Health Snapshot
```text
# Recallo App Store Production Health Audit
mode=report
url=https://shibei-production.up.railway.app/api/health
httpStatus=200
contentType=application/json; charset=utf-8
ok=true
service=recallo-api
nodeEnv=production
railwayEnvironment=production
railwayDeploymentId=51ae3233-4431-471e-9194-a80b5b09a900
storage=postgres
databaseOk=true
queueQueued=0
queueRunning=0
queueFailed=0
apnsConfigured=true
apnsEnvironment=production
recommendedCatalogArticleCount=9
recommendedCatalogFilters=全部,AI,产品,学习,商业

Production health: READY
```

## Ops Diagnostics Snapshot
`DATABASE_URL` is not set in this shell, so deep queue/APNs/quota diagnostics were not run. This is acceptable for the automated App Store report; run `npm run app-store:ops-diagnostics` from an environment with production database access when investigating incidents.

## Existing Evidence Files
- EXISTS docs/app-store-production-ops-runbook-zh.md
- EXISTS docs/app-store-release-evidence/2026-07-03-production-health-audit.md
- EXISTS docs/app-store-release-evidence/2026-07-03-production-ops-runbook.md

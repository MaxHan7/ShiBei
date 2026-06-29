# V2 Production Hardening Next Steps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring ShiBei V2 from “small controlled TestFlight ready” to a production-grade release candidate with clear safety, recovery, observability, and validation gates.

**Architecture:** Keep the current Railway + Postgres + iOS V2 architecture. Do not rebuild the system; harden the boundaries around request intake, queue operation, data recovery, monitoring, and release validation. Each checkpoint should be independently testable and committed before moving on.

**Tech Stack:** Node.js backend, Postgres, Railway, GitHub Actions, SwiftUI iOS app, APNs, existing V2 generation/review APIs.

---

## Checkpoint Overview

| Checkpoint | Priority | Outcome |
| --- | --- | --- |
| 0. Baseline checkpoint | P0 | Preserve current known-good state before hardening. |
| 1. Request safety and cost controls | P0 | Prevent oversized requests, repeated generation abuse, overly open CORS, and malformed device identity usage. |
| 2. Backup, restore, and data-governance proof | P0 | Make production data recoverable and deletion/retention rules explicit. |
| 3. Queue, worker, APNs, and model observability | P0/P1 | Make failures visible before users report them. |
| 4. True-device release validation matrix | P1 | Prove core user journeys on TestFlight/real device. |
| 5. Recommended article operations hardening | P1 | Keep the simple admin workflow but make catalog/cover/prepared content stable. |
| 6. Release candidate gate | P0 | One command/manual checklist determines whether to deploy. |

---

## Task 0: Baseline Checkpoint

**Files:**
- Read: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/docs/production-readiness-architecture-audit-2026-06-29.md`
- Read: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/docs/superpowers/plans/2026-06-29-v2-production-hardening-next-steps.md`
- No production code changes.

- [ ] **Step 1: Confirm working tree**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
git status --short --branch
```

Expected:

- Current branch is `codex/v2-article-limit-10000`.
- The only pre-existing unrelated dirty file may be `experiments/shibei-v2/ios/拾贝/Localizable.xcstrings`.
- New audit/plan docs may be uncommitted if not committed yet.

- [ ] **Step 2: Commit audit docs only**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
git add docs/production-readiness-architecture-audit-2026-06-29.md docs/superpowers/plans/2026-06-29-v2-production-hardening-next-steps.md
git commit -m "docs: add v2 production hardening audit and plan"
```

Expected:

- Commit succeeds.
- Existing unrelated localization changes remain unstaged.

- [ ] **Step 3: Run current baseline checks**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
npm --prefix backend run check
npm run check:ios-production
xcodebuild -project experiments/shibei-v2/ios/拾贝/拾贝.xcodeproj -scheme 拾贝 -destination 'generic/platform=iOS Simulator' -configuration Debug build
```

Expected:

- Backend checks pass.
- iOS production guard passes.
- Debug simulator build passes.

---

## Task 1: Request Safety And Cost Controls

**Files:**
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/backend/src/server.js`
- Create or modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/backend/src/security/requestGuards.js`
- Create or modify tests under: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/backend/src/**/__tests__` or existing backend test pattern
- Update docs: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/docs/production-hardening-plan-zh.md`

**Purpose:** This is the most urgent production hardening checkpoint. It prevents large body memory pressure, repeated generation cost spikes, open CORS misuse, and malformed anonymous device identifiers.

- [ ] **Step 1: Add a request body size limit**

Design:

- Default max body size: `1mb` for normal JSON endpoints.
- Generation endpoints may allow a larger but explicit limit if needed, for example `2mb`.
- If exceeded, return HTTP `413` with a user-safe message.
- The body size limit must happen before `Buffer.concat`.

Acceptance:

- A request larger than the limit receives `413`.
- Backend process memory does not spike from reading the full body.
- Existing iOS generation requests still work.

- [ ] **Step 2: Add rate limiting**

Design:

- Minimal MVP limiter: in-memory fixed-window or sliding-window per `deviceId + ip + routeGroup`.
- Route groups:
  - `generation`: strictest.
  - `recommended-import`: moderate.
  - `normal-api`: looser.
- On limit exceeded, return HTTP `429` with a user-safe Chinese message.
- Include a machine code like `rate_limited`.

Acceptance:

- Repeated generation attempts within the configured window are rejected.
- Normal chapter polling is not blocked.
- Backend tests cover allow and reject cases.

- [ ] **Step 3: Validate device identity format**

Design:

- Accept only expected anonymous device id format used by the app.
- Reject empty, extremely long, or obviously malicious ids.
- For high-risk endpoints such as delete, generation, favorite, review action, require a valid device id.

Acceptance:

- Missing or malformed `X-Device-Id` returns a clear 400/422.
- Existing app-generated ids continue working.

- [ ] **Step 4: Tighten CORS in production**

Design:

- In development, allow local origins needed by docs/demo.
- In production, allow only configured origins from env, for example `SHIBEI_ALLOWED_ORIGINS`.
- Native iOS requests do not depend on browser CORS.

Acceptance:

- Production no longer blindly returns `access-control-allow-origin: *`.
- Local development still works with explicit dev origins.

- [ ] **Step 5: Test and commit**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
npm --prefix backend run check
```

Expected:

- Backend tests pass.

Commit:

```bash
git add backend/src/server.js backend/src/security docs/production-hardening-plan-zh.md
git commit -m "fix: add backend request safety guards"
```

---

## Task 2: Backup, Restore, And Data Governance Proof

**Files:**
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/docs/data-governance.md`
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/docs/v2-production-deploy-runbook-zh.md`
- Modify or create: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/.github/workflows/v2-production-db-export.yml`
- Create optional script: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/backend/scripts/verify-db-backup.mjs`

**Purpose:** Production data must be recoverable before larger testing. The current soft-delete/audit work is good, but backups and restore drills are not yet proven.

- [ ] **Step 1: Decide current beta data policy**

Document one of two modes:

- `reset-data`: allowed only while all production data is internal test data.
- `preserve-data`: required once external users generate real content.

Acceptance:

- The deploy runbook states which mode applies now.
- It states when the project must switch to `preserve-data`.

- [ ] **Step 2: Define backup command**

Design:

- If Railway automatic backups/PITR are available, document how to verify backup presence.
- If not available, use `pg_dump` export through Railway/GitHub Actions.
- Every production deployment must record backup reference or explicit `reset-data` confirmation.

Acceptance:

- A non-expert operator can follow the doc and produce a backup artifact/reference.

- [ ] **Step 3: Define restore command**

Design:

- Restore into a non-production database first.
- Include exact command structure and safety warnings.
- Do not allow direct production restore without explicit rollback decision.

Acceptance:

- Restore procedure is written and executable.
- It explains how to verify restored row counts and sample chapters.

- [ ] **Step 4: Add data retention checklist**

Document:

- User source text retention.
- Generated review content retention.
- Notification retention.
- APNs token retention.
- Audit event retention.
- Backup retention after user deletion.

Acceptance:

- Privacy/account explanation in the app can be checked against this doc.

- [ ] **Step 5: Commit**

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
git add docs/data-governance.md docs/v2-production-deploy-runbook-zh.md .github/workflows/v2-production-db-export.yml backend/scripts
git commit -m "docs: define production data backup and governance flow"
```

---

## Task 3: Observability And Alerting

**Files:**
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/backend/src/server.js`
- Modify or create: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/backend/scripts/production-diagnostics.mjs`
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/backend/scripts/production-readiness-gate.mjs`
- Modify or create workflow: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/.github/workflows/v2-production-generation-diagnostics.yml`
- Update docs: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/docs/v2-production-deploy-runbook-zh.md`

**Purpose:** A production system must show problems before users complain.

- [ ] **Step 1: Define observable signals**

Required signals:

- Queue counts: queued, running, failed, completed, cancelled.
- Stale running jobs older than lock timeout.
- Recent generation failure rate.
- Worker restart logs.
- APNs configured status and recent push delivery results.
- Provider failures: timeout, 429/rate limit, structured output/contract validation.

Acceptance:

- Signals are listed in code comments or docs with owner and threshold.

- [ ] **Step 2: Extend diagnostics output**

Design:

- Keep `/api/health` lightweight.
- Add or reuse diagnostics workflow/script for deeper checks.
- Diagnostics must not expose secrets, full source text, APNs tokens, or model keys.

Acceptance:

- Running diagnostics returns enough information to distinguish DB, queue, APNs, and provider failures.

- [ ] **Step 3: Add alert thresholds**

Initial thresholds:

- Any health failure.
- Any running job locked longer than expected.
- Generation failure rate above a defined count in last N minutes.
- APNs delivery errors after configured token exists.
- Worker restart limit reached.

Acceptance:

- Thresholds are documented.
- GitHub Action or Railway logs make failures discoverable.

- [ ] **Step 4: Test and commit**

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
npm --prefix backend run check
git add backend/src/server.js backend/scripts .github/workflows docs/v2-production-deploy-runbook-zh.md
git commit -m "feat: add production diagnostics signals"
```

---

## Task 4: True-Device Release Validation Matrix

**Files:**
- Create: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/docs/testflight-v2-release-validation-zh.md`
- Optionally update: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/docs/v2-production-deploy-runbook-zh.md`

**Purpose:** The system has had many UI and state fixes. Before pushing wider, we need a repeatable real-device acceptance checklist.

- [ ] **Step 1: Write the validation matrix**

Scenarios:

1. First launch: splash then correct home state.
2. Generate from URL success.
3. Generate failure and delete failed chapter.
4. Background generation notification success.
5. Background generation notification failure.
6. Resume review from exact exited page.
7. Wrong-answer retry insertion until every question is correct once.
8. Favorite a question, restart app, verify favorite persists.
9. Recommended article import, quick fake progress, review available.
10. Notification red dot appears and clears after reading.
11. Profile name/avatar/settings/privacy/account sheets work.
12. Offline or server unavailable state is user-safe.

Acceptance:

- Each scenario has setup, steps, expected result, screenshot/recording evidence slot.

- [ ] **Step 2: Run on a real TestFlight build**

Acceptance:

- Every P0 scenario passes.
- Any failed scenario gets an issue with screenshot/video and exact device/build number.

- [ ] **Step 3: Commit validation doc**

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
git add docs/testflight-v2-release-validation-zh.md docs/v2-production-deploy-runbook-zh.md
git commit -m "docs: add v2 testflight release validation matrix"
```

---

## Task 5: Recommended Article Operations Hardening

**Files:**
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/docs/recommended-articles-admin-runbook-zh.md`
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/backend/src/v2/recommendedArticles/**`
- Modify iOS recommended article loading views if needed under: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/ios/拾贝/V2`

**Purpose:** Keep the simple “admin preloads good articles” path, but make it stable enough for users.

- [ ] **Step 1: Ensure content cleanliness**

Acceptance:

- No article body contains internal phrases such as “中文学习稿说明”.
- No developer-only notes are visible to users.
- Each article has title, author/source, category, cover, legal source URL, prepared chapter.

- [ ] **Step 2: Stabilize covers**

Design:

- Catalog should include cover metadata.
- iOS should use a stable placeholder while loading.
- Image should crop, not stretch.
- Cache should avoid visible flicker when switching tabs.

Acceptance:

- Discover page does not visibly flash blank covers after first load.
- Cover aspect ratio is preserved.

- [ ] **Step 3: Define future remote-management migration**

Document:

- Current file-based flow.
- Trigger point for remote catalog: when articles need to change without app deploy.
- Candidate architecture: Postgres table + object storage/CDN + admin import script.

- [ ] **Step 4: Test and commit**

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
npm --prefix backend run check
npm run check:ios-production
git add docs/recommended-articles-admin-runbook-zh.md backend/src/v2/recommendedArticles experiments/shibei-v2/ios/拾贝/V2
git commit -m "fix: harden recommended article operations"
```

---

## Task 6: Release Candidate Gate

**Files:**
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/backend/scripts/production-readiness-gate.mjs`
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/docs/v2-production-deploy-runbook-zh.md`
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/.github/workflows/v2-production-railway-deploy.yml`

**Purpose:** Make the final deploy decision objective.

- [ ] **Step 1: Define release candidate pass criteria**

Required:

- Backend checks pass.
- iOS production guard passes.
- iOS Release or TestFlight archive path passes.
- Live `/api/health` passes.
- Backup reference exists or reset-data is explicitly confirmed.
- Diagnostics show no stale queue jobs.
- APNs status is configured and at least one device delivery smoke has been recorded.
- True-device validation matrix P0 scenarios pass.

- [ ] **Step 2: Make the gate produce a report**

Acceptance:

- Gate writes Markdown or JSON artifact with pass/fail sections.
- Failures are actionable and do not expose secrets.

- [ ] **Step 3: Commit and tag candidate**

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
npm --prefix backend run check
npm run check:ios-production
git add backend/scripts/production-readiness-gate.mjs docs/v2-production-deploy-runbook-zh.md .github/workflows/v2-production-railway-deploy.yml
git commit -m "chore: tighten v2 release candidate gate"
```

Then, after user approval:

```bash
git tag v2-production-rc-YYYYMMDD
```

---

## Recommended Execution Order

1. Commit the audit and this plan.
2. Do Checkpoint 1 first. It is the clearest production risk and has the highest cost-control value.
3. Do Checkpoint 2 before any wider external testing.
4. Do Checkpoint 3 before relying on the system for users you cannot personally monitor.
5. Do Checkpoint 4 in parallel with the first TestFlight candidate.
6. Do Checkpoint 5 before inviting users to use Discover as an onboarding path.
7. Do Checkpoint 6 immediately before production replacement or wider TestFlight distribution.

## Stop Conditions

Pause and ask for product/owner decision if:

- Rate limit blocks normal expected user testing.
- Backup/PITR is unavailable and there is no acceptable export workaround.
- APNs works in health checks but not on real TestFlight devices.
- Recommended article copyright/source usage is unclear.
- The current anonymous device identity model becomes unacceptable for the planned user group.


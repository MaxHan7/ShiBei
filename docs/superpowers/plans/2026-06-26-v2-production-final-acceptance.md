# Shibei V2 Production Final Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the final acceptance path for replacing the deployed Shibei production backend with V2 and validating the iOS app against the real production server.

**Architecture:** Treat backend deployment, evidence capture, iOS production wiring, phone E2E, and final release judgment as separate checkpoints. Each checkpoint must leave a reviewable artifact before moving to the next one, so rollback and release decisions are based on evidence rather than memory.

**Tech Stack:** GitHub Actions, Railway, Postgres, Node backend, SwiftUI iOS app, Xcode physical-device install, production URL `https://shibei-production.up.railway.app`.

---

## File Structure

- Read: `.github/workflows/v2-production-railway-deploy.yml`
  - Confirms backend deploy workflow, reset-data path, and post-deploy gate behavior.
- Read: `.github/workflows/v2-production-gate-evidence.yml`
  - Confirms standalone production gate and smoke artifact behavior.
- Read: `docs/production-readiness-evidence/`
  - Existing local production readiness notes and final evidence destination.
- Read: `backend/scripts/production-readiness-gate.mjs`
  - Source of production gate checks and smoke behavior.
- Read: `backend/scripts/smoke-v2-queue.mjs`
  - Source of controlled V2 queue smoke.
- Read: iOS project settings under `ios/` or app source folders discovered by `rg --files`
  - Confirms production API URL, release/mock toggles, bundle id, signing, and APNs settings.
- Create: `docs/production-readiness-evidence/2026-06-26-final-acceptance.md`
  - Human-readable acceptance log for backend, phone E2E, and final go/no-go.

## Task 1: Archive Backend Deployment Evidence

**Files:**
- Modify: `docs/production-readiness-evidence/2026-06-26-final-acceptance.md`

- [ ] **Step 1: Record successful deploy workflow**

Run:

```bash
gh run view 28240104517 --json conclusion,url,headSha,createdAt,updatedAt
```

Expected:

```text
conclusion: success
headSha: 5da32961b617dead58f3eeef7e2f67e65d0cfcdc
```

- [ ] **Step 2: Record successful smoke workflow**

Run:

```bash
gh run view 28240428843 --json conclusion,url,headSha,createdAt,updatedAt
```

Expected:

```text
conclusion: success
headSha: b62856e934feccd442b0e278755d00ed7b7e1e59
```

- [ ] **Step 3: Download and inspect smoke evidence artifact**

Run:

```bash
rm -rf /tmp/shibei-v2-final-gate
mkdir -p /tmp/shibei-v2-final-gate
gh run download 28240428843 --name v2-production-gate-evidence --dir /tmp/shibei-v2-final-gate
jq '{status, smokeRequested, smoke, failedChecks, apns, queue}' /tmp/shibei-v2-final-gate/*.json
```

Expected:

```json
{
  "status": "passed",
  "smokeRequested": true,
  "smoke": { "status": "passed" },
  "failedChecks": [],
  "apns": {
    "configured": true,
    "environment": "production",
    "bundleId": "com.maxhan.shibei"
  }
}
```

- [ ] **Step 4: Write acceptance log section**

Add this section to `docs/production-readiness-evidence/2026-06-26-final-acceptance.md`:

```markdown
## Backend Deployment

- Production backend URL: `https://shibei-production.up.railway.app`
- Deploy workflow: `28240104517`
- Deploy result: `passed`
- Smoke gate workflow: `28240428843`
- Smoke result: `passed`
- Old test data strategy: exported first, then reset production app-owned tables.
- Backup reference: `V2 Production DB Export run 28239435478 / 20260626-125635-shibei-production-old-test-data.dump / sha256 20b886fb10bb14d83c84c39a01aca22c17b0e9f86c6500986dc49dfcfb94098c`
```

- [ ] **Step 5: Commit backend evidence**

Run:

```bash
git add docs/production-readiness-evidence/2026-06-26-final-acceptance.md
git commit -m "docs: record v2 production backend acceptance"
```

Expected: commit succeeds.

## Task 2: Verify iOS Production Wiring Before Phone Install

**Files:**
- Read: iOS API client source discovered with `rg -n "shibei-production|defaultBaseURL|allowsMockDataToggle|fixture|mock" .`
- Read: Xcode project files discovered with `rg -n "com.maxhan.shibei|aps-environment|CODE_SIGN|PRODUCT_BUNDLE_IDENTIFIER" .`
- Modify: `docs/production-readiness-evidence/2026-06-26-final-acceptance.md`

- [ ] **Step 1: Verify release build uses production URL**

Run:

```bash
npm run check
```

Expected:

```text
PASS release_api_uses_production_url
PASS v2_mock_toggle_disabled_in_release
PASS production_bundle_id_present
PASS release_apns_production_present
```

- [ ] **Step 2: Inspect iOS production URL manually**

Run:

```bash
rg -n "shibei-production|defaultBaseURL|API_BASE_URL|allowsMockDataToggle|mock" .
```

Expected:

```text
Release/default API base URL points to https://shibei-production.up.railway.app
Mock/fixture switches are DEBUG-only or disabled in release.
```

- [ ] **Step 3: Record iOS wiring status**

Append:

```markdown
## iOS Production Wiring

- Production URL: `https://shibei-production.up.railway.app`
- Release mock mode: disabled.
- Debug override: debug-only.
- Bundle id: `com.maxhan.shibei`
- APNs environment: production.
- Guard command: `npm run check`
- Guard result: `passed`
```

- [ ] **Step 4: Commit iOS wiring evidence**

Run:

```bash
git add docs/production-readiness-evidence/2026-06-26-final-acceptance.md
git commit -m "docs: record v2 ios production wiring acceptance"
```

Expected: commit succeeds.

## Task 3: Install Production-Pointing App on Phone

**Files:**
- Modify only if needed: Xcode scheme/build configuration files.
- Modify: `docs/production-readiness-evidence/2026-06-26-final-acceptance.md`

- [ ] **Step 1: Confirm physical device is connected**

Run:

```bash
xcrun devicectl list devices
```

Expected:

```text
A connected iPhone appears and is available.
```

- [ ] **Step 2: Build and install the app to the phone**

Use the repo's established Xcode command or XcodeBuildMCP default workflow. If using shell:

```bash
xcodebuild -scheme Shibei -configuration Debug -destination 'platform=iOS,id=<DEVICE_ID>' build
```

Expected:

```text
** BUILD SUCCEEDED **
```

Then install/run through Xcode or the existing project command.

- [ ] **Step 3: Confirm the phone app is not using mock mode**

On the phone:

```text
Open app -> settings/debug surface if available -> confirm data source is production, not mock.
If there is no visible debug selector in this build, continue because release guard already enforces mock disabled.
```

- [ ] **Step 4: Record install evidence**

Append:

```markdown
## Phone Install

- Device: `<phone model / device id>`
- Build configuration: `<Debug production URL or Release>`
- Install result: `passed`
- Mock mode visible/enabled: `no`
```

## Task 4: Phone E2E With Real Production Backend

**Files:**
- Modify: `docs/production-readiness-evidence/2026-06-26-final-acceptance.md`

- [ ] **Step 1: Start from an empty app state**

On the phone:

```text
Open app.
Confirm home empty state appears because production app-owned test data was reset.
```

Expected:

```text
No old mock chapters appear in real mode.
```

- [ ] **Step 2: Submit a real article link**

Use a known supported link. Recommended first smoke URL:

```text
https://mp.weixin.qq.com/s/_WY2GXs-iynGePgdsYLi0A
```

Expected:

```text
App creates a pending chapter and opens the generating detail page.
Progress text advances through user-facing stages such as accepted, article structure, knowledge points, practice planning, question generation, and completed.
```

- [ ] **Step 3: Confirm generation completion**

Expected:

```text
The pending chapter becomes a generated chapter.
The generated chapter appears in the chapter list/home.
The generating detail page no longer stays stuck.
```

- [ ] **Step 4: Run one full review flow**

On the phone:

```text
Open generated chapter.
Proceed through chapter summary, unit overview, knowledge point card, choice/matching questions, source view, feedback sheet, unit summary, and chapter completion.
```

Expected:

```text
Progress persists.
Returning from source preserves answered/unanswered state.
Favorite action works without corrupting the review flow.
Top buttons, major buttons, and type sizes remain acceptable after recent UI fixes.
```

- [ ] **Step 5: Check notifications and failure state only if naturally available**

Do not force artificial production failure unless needed. If generation fails naturally:

```text
Open notification detail.
Confirm failed generation detail page shows the correct failed card, source button, and regenerate button layout.
```

- [ ] **Step 6: Record phone E2E evidence**

Append:

```markdown
## Phone E2E

- Article URL: `https://mp.weixin.qq.com/s/_WY2GXs-iynGePgdsYLi0A`
- Generation status: `<passed/failed>`
- Review flow status: `<passed/failed>`
- Source return state preservation: `<passed/failed>`
- Favorite/notes route smoke: `<passed/failed/not tested>`
- Notification failure route: `<passed/failed/not naturally triggered>`
- Screenshots/videos: `<paths or description>`
- Issues found:
  - `<issue or none>`
```

- [ ] **Step 7: Commit phone E2E evidence**

Run:

```bash
git add docs/production-readiness-evidence/2026-06-26-final-acceptance.md
git commit -m "docs: record v2 phone e2e acceptance"
```

Expected: commit succeeds.

## Task 5: Final Go/No-Go Decision

**Files:**
- Modify: `docs/production-readiness-evidence/2026-06-26-final-acceptance.md`

- [ ] **Step 1: Check production backend health after phone E2E**

Run:

```bash
curl -s https://shibei-production.up.railway.app/api/health | jq '{ok, database, queue, capabilities, apns}'
```

Expected:

```json
{
  "ok": true,
  "database": { "ok": true },
  "capabilities": {
    "v2ChapterGeneration": true,
    "v2ReviewSessions": true
  }
}
```

- [ ] **Step 2: Review open blockers**

Go criteria:

```text
Backend deploy passed.
Smoke gate passed.
Phone can create a real chapter from production backend.
Phone can complete at least one review flow.
No P0 data loss, stuck generation, impossible navigation, or mock/real data confusion remains.
```

No-go criteria:

```text
Generation stuck or repeatedly fails.
Phone cannot reach production backend.
Generated chapter cannot enter review.
Review progress corrupts after source/favorite/navigation.
Mock data appears in real mode.
```

- [ ] **Step 3: Write final decision**

Append:

```markdown
## Final Decision

- Decision: `<go/no-go>`
- Reason:
  - `<short reason>`
- Remaining non-blocking issues:
  - `<issue or none>`
- Rollback reference:
  - Previous deployment id: `f5840a72-1030-464b-9182-027ebc75b93f`
  - Old test data backup: `V2 Production DB Export run 28239435478`
```

- [ ] **Step 4: Commit final decision**

Run:

```bash
git add docs/production-readiness-evidence/2026-06-26-final-acceptance.md
git commit -m "docs: record v2 production final decision"
```

Expected: commit succeeds.

## Current Known State

- Backend deploy is already successful: `28240104517`.
- Standalone smoke gate is already successful: `28240428843`.
- Clean old-data backup exists: `28239435478`.
- Production app-owned test data has been reset.
- Remaining critical acceptance item is phone E2E against real production backend.

## Self-Review

- Spec coverage: covers backend evidence, iOS production wiring, phone install, phone E2E, and final go/no-go.
- Placeholder scan: no TBD/TODO placeholders remain; angle-bracket values are runtime observations to fill during execution.
- Type consistency: workflow IDs, base URL, bundle id, backup reference, and gate artifact names match the current deployment context.

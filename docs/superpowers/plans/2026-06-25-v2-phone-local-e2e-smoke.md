# Shibei V2 Phone Local E2E Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the V2 iOS app installed on a real iPhone connect to the local V2 backend and complete one real article generation plus review-progress smoke flow.

**Architecture:** Keep production untouched. The iPhone runs the isolated V2 app, points to the Mac LAN backend through `-ShibeiV2APIBaseURL`, and the backend uses real `DATABASE_URL`, real `DEEPSEEK_API_KEY`, the V2 persisted queue, and the V2 worker. Mock/fixture mode must stay off for this smoke.

**Tech Stack:** SwiftUI iOS app, Node.js backend, Postgres via `DATABASE_URL`, local LAN HTTP on port `5273`, `xcodebuild`, `xcrun devicectl`, V2 backend smoke scripts.

---

## Scope

This plan is intentionally narrower than production replacement. It does not deploy Railway, change the root production app, or replace the production service. It only proves that a real iPhone can use the local V2 backend end to end.

Success means:

- The V2 backend health check passes from the Mac LAN URL.
- The iPhone app launches with the LAN API URL, not `127.0.0.1`.
- The user can paste an article link or text and create a V2 generation job.
- The generating chapter detail page shows backend progress.
- When generation completes, the app can open the generated chapter detail.
- The user can start review, answer at least one question, open source, return, and continue.
- Backend state reflects the answer/session progress after app refresh or relaunch.

## Current Known State

- Backend LAN URL detected by preflight: `http://10.130.96.10:5273`.
- Backend `.env` contains `DEEPSEEK_API_KEY` and `DATABASE_URL`.
- Backend health is OK and database health is OK.
- Worker process is running.
- iOS has local-network permissions in `Info.plist`.
- V2 app default still uses `http://127.0.0.1:5273`, so real iPhone must launch with `-ShibeiV2APIBaseURL http://10.130.96.10:5273`.

## Files

- Read: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/README.md`
- Read: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend/scripts/phone-preflight.mjs`
- Read: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend/scripts/smoke-v2-queue.mjs`
- Read: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/ios/拾贝/Services/APIClient.swift`
- Modify only if needed: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/ios/拾贝/V2/V2RootView.swift`
- Modify only if needed: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/ios/拾贝/Services/APIClient.swift`

## Checkpoint 0: Save Current UI Work

- [ ] **Step 1: Review current dirty files**

Run:

```bash
git -C /Users/hanmingyu/Downloads/拾贝-v2-baseline status --short
```

Expected: only intentional V2 files are dirty.

- [ ] **Step 2: Commit current V2 frontend state before smoke-specific changes**

Run:

```bash
git -C /Users/hanmingyu/Downloads/拾贝-v2-baseline add experiments/shibei-v2/ios docs/superpowers/plans/2026-06-25-v2-phone-local-e2e-smoke.md
git -C /Users/hanmingyu/Downloads/拾贝-v2-baseline commit -m "chore: checkpoint v2 phone smoke baseline"
```

Expected: commit succeeds, or reports nothing to commit if the same state was already saved.

## Checkpoint 1: Verify Backend Runtime

- [ ] **Step 1: Run phone preflight**

Run:

```bash
node /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend/scripts/phone-preflight.mjs
```

Expected:

```text
PASS local_env_file
PASS deepseek_key_configured
PASS database_url_configured
PASS backend_health
PASS database_health
PASS queue_visible
```

- [ ] **Step 2: Confirm backend server and worker are running**

Run:

```bash
ps aux | rg "experiments/shibei-v2/backend|src/server.js|src/worker.js" | rg -v rg
```

Expected: one `node src/server.js` and one `node src/worker.js`.

- [ ] **Step 3: If worker or server is missing, start both**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
npm run dev
```

In another terminal:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
npm run worker
```

Expected: server listens on `0.0.0.0:5273`; worker claims queued jobs.

## Checkpoint 2: Build And Launch The iPhone App Against LAN Backend

- [ ] **Step 1: Find connected physical device id**

Run:

```bash
xcrun devicectl list devices
```

Expected: the iPhone appears with an identifier.

- [ ] **Step 2: Build the V2 app**

Run:

```bash
xcodebuild \
  -project /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/ios/拾贝.xcodeproj \
  -scheme 拾贝 \
  -configuration Debug \
  -destination 'generic/platform=iOS' \
  build
```

Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 3: Install the built app on the iPhone**

Run:

```bash
xcrun devicectl device install app \
  --device <DEVICE_ID> \
  /Users/hanmingyu/Library/Developer/Xcode/DerivedData/拾贝-*/Build/Products/Debug-iphoneos/拾贝.app
```

Expected: install succeeds.

- [ ] **Step 4: Launch with LAN API URL**

Run:

```bash
xcrun devicectl device process launch \
  --device <DEVICE_ID> \
  --terminate-existing \
  com.maxhan.shibei.v2.dev \
  -ShibeiV2APIBaseURL \
  http://10.130.96.10:5273
```

Expected: app launches. It must not show “无法连接到服务器” when submitting generation.

## Checkpoint 3: Run Backend Queue Smoke Before Manual Phone Flow

- [ ] **Step 1: Submit a short text smoke job**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
npm run smoke:v2:queue -- --base-url http://10.130.96.10:5273 --mode success
```

Expected: progress logs eventually print `completed`.

- [ ] **Step 2: If smoke fails, inspect the failure before using the phone**

Run:

```bash
curl -s http://10.130.96.10:5273/api/health
```

Expected: database OK, queue visible. If failures increased, inspect backend/worker logs before continuing.

## Checkpoint 4: Manual iPhone E2E Smoke

- [ ] **Step 1: Confirm real mode**

On iPhone:

```text
Open V2 app -> Profile/debug area if visible -> ensure mock data is off.
```

Expected: Home should show real empty state or real generated data, not fixture learning path unless backend already has completed chapters.

- [ ] **Step 2: Submit source**

On iPhone:

```text
Tap 添加 -> paste article link or plain text -> tap 开始生成.
```

Expected:

```text
Generation started dialog appears centered.
Generating chapter detail page appears.
Progress text updates from backend.
```

- [ ] **Step 3: Wait for completion**

Expected:

```text
The generated chapter detail can be opened.
The chapter contains real title, author/source if available, knowledge units, and start review button.
```

- [ ] **Step 4: Start review**

On iPhone:

```text
Tap 开始复习 -> enter chapter overview/unit overview -> continue to first question.
```

Expected: no mock content appears unless the generated backend data itself has that text.

- [ ] **Step 5: Answer one question and verify persistence**

On iPhone:

```text
Answer first question -> feedback panel appears -> tap 查看原文 -> return -> tap 继续.
```

Expected:

```text
Answer state remains after source return.
Progress advances.
No reset to unanswered state.
```

- [ ] **Step 6: Relaunch and resume**

Run:

```bash
xcrun devicectl device process launch \
  --device <DEVICE_ID> \
  --terminate-existing \
  com.maxhan.shibei.v2.dev \
  -ShibeiV2APIBaseURL \
  http://10.130.96.10:5273
```

Expected: generated chapter remains visible and review session can resume from backend state.

## Checkpoint 5: Fix Only Blocking Issues

Only fix issues that prevent the smoke path from completing. Do not continue visual polish in this checkpoint.

- [ ] **Blocking issue type A: iPhone cannot connect**

Check:

```bash
node /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend/scripts/phone-preflight.mjs
```

Fix order:

1. Confirm Mac and iPhone are on the same network.
2. Confirm launch argument uses the current LAN IP.
3. Confirm macOS firewall allows Node.
4. Confirm backend listens on `0.0.0.0:5273`.

- [ ] **Blocking issue type B: generation stuck**

Check:

```bash
curl -s http://10.130.96.10:5273/api/health
```

Fix order:

1. Confirm worker is running.
2. Confirm `DEEPSEEK_API_KEY` is valid.
3. Confirm `DATABASE_URL` is reachable.
4. Inspect worker logs for structured output failures.

- [ ] **Blocking issue type C: answer progress does not persist**

Files to inspect:

```text
/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/ios/拾贝/V2/V2RootView.swift
/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend/src/v2/state/reviewSessionV2.js
/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend/src/server.js
```

Expected fix direction:

```text
Do not locally advance review UI if answer API fails.
Keep backend session as source of truth for completed answer state.
```

## Checkpoint 6: Record Result

- [ ] **Step 1: Save the smoke result**

Create or append:

```text
/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/docs/phone-smoke-results.md
```

Record:

```text
Date:
iPhone model:
Backend URL:
Source used:
Generation result:
Review result:
Known issues:
Decision:
```

- [ ] **Step 2: Commit smoke-path fixes and result**

Run:

```bash
git -C /Users/hanmingyu/Downloads/拾贝-v2-baseline add experiments/shibei-v2 docs/superpowers/plans/2026-06-25-v2-phone-local-e2e-smoke.md
git -C /Users/hanmingyu/Downloads/拾贝-v2-baseline commit -m "test: document v2 phone local e2e smoke path"
```

Expected: checkpoint commit exists before moving toward production replacement.

## Self-Review

- This plan does not change production service.
- This plan uses the detected LAN backend URL `http://10.130.96.10:5273`.
- This plan keeps mock mode out of the real smoke path.
- This plan checks backend, worker, DB, generation, progress, review session, answer persistence, source return, and relaunch resume.
- This plan intentionally leaves visual polish and production deployment for later checkpoints.

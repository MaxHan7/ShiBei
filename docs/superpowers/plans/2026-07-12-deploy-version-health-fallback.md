# Deploy Version Health Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/api/health` and `/api/version` reliably expose the deployed git commit and branch for production audit and rollback decisions.

**Architecture:** Keep the existing `backend/src/versionInfo.js` contract. Add narrowly scoped fallback resolution: explicit ShiBei deploy variables first, platform variables next, and local git metadata last when available.

**Tech Stack:** Node.js ESM, `node:test`, Railway runtime environment variables.

---

### Task 1: Version Metadata Fallback

**Files:**
- Modify: `backend/src/versionInfo.js`
- Modify: `backend/src/tests/versionInfo.test.js`

- [x] **Step 1: Add a failing test for non-Railway deploy variables**

Add a test proving `SHIBEI_DEPLOY_GIT_COMMIT_SHA` and `SHIBEI_DEPLOY_GIT_BRANCH` are accepted by `buildVersionInfo`.

- [x] **Step 2: Add a failing test for local git fallback**

Inject a fake `readGitInfo` function into `buildVersionInfo` and assert it fills commit and branch when environment variables are absent.

- [x] **Step 3: Implement minimal fallback logic**

Update `buildVersionInfo` to resolve `git.commit` and `git.branch` from explicit deploy variables, known platform variables, then injected/local git metadata.

- [x] **Step 4: Run focused tests**

Run: `node --test backend/src/tests/versionInfo.test.js`

- [x] **Step 5: Run production-relevant backend checks**

Run: `npm --prefix backend run check:v2`

- [x] **Step 6: Commit checkpoint**

Commit only the version metadata fallback and this plan.

### Task 2: Publish And Deploy

**Files:**
- No source edits expected.

- [ ] **Step 1: Confirm clean worktree**

Run: `git status --short --branch`

- [ ] **Step 2: Push branch to GitHub**

Run: `git push -u origin codex/lean-high-value-generation-20260711`

- [ ] **Step 3: Deploy to Railway**

Use the repository's Railway deploy path. Prefer GitHub-triggered deployment if Railway is connected to the pushed branch; otherwise run `railway up` from the same clean worktree.

- [ ] **Step 4: Verify production health**

Run the production gate and confirm `/api/health.version.git.commit` is populated.

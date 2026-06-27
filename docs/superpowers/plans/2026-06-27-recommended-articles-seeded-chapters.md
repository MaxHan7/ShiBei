# Recommended Articles Seeded Chapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Discover tab show administrator-curated articles whose review chapters are prepared before TestFlight, so users can quickly add one into their own chapter list without waiting for live generation.

**Architecture:** Use a versioned backend catalog file as the MVP admin surface. Each catalog item contains display metadata and a prepared V2 chapter artifact reference. The app fetches the catalog, filters by tags, and calls an import endpoint that clones the prepared chapter into the current device account.

**Tech Stack:** Node HTTP backend, Postgres-backed existing chapter store, SwiftUI iOS client, existing V2 chapter/review-session data contracts.

---

### Checkpoint 1: Backend Recommended Article Catalog

**Files:**
- Create: `backend/content/recommended-articles.json`
- Create: `backend/src/v2/recommended/recommendedArticles.js`
- Create: `backend/src/v2/recommended/recommendedArticles.test.js`
- Modify: `backend/src/server.js`

- [ ] Add a catalog loader that reads administrator-curated article metadata from JSON.
- [ ] Validate catalog entries with stable ids, title/source/tags, source url, and prepared chapter reference.
- [ ] Add `GET /api/v2/recommended-articles` returning `{ filters, articles }`.
- [ ] Add tests for valid catalog loading, filter derivation, and invalid entries.
- [ ] Commit: `feat: add recommended article catalog`.

### Checkpoint 2: Prepared Chapter Import

**Files:**
- Modify: `backend/src/v2/recommended/recommendedArticles.js`
- Modify: `backend/src/server.js`
- Test: `backend/src/v2/recommended/recommendedArticles.test.js`

- [ ] Add a pure function that clones a prepared chapter for a target device with a new chapter id and fresh timestamps.
- [ ] Preserve original source url/author/title and attach `recommendedArticleId` metadata for traceability.
- [ ] Add `POST /api/v2/recommended-articles/:id/import` that upserts the cloned completed chapter into the user chapter list.
- [ ] Ensure importing the same recommended article twice creates a new chapter unless a client request id is supplied later.
- [ ] Commit: `feat: import recommended article chapters`.

### Checkpoint 3: iOS Discover Integration

**Files:**
- Modify: `拾贝/拾贝/Services/APIClient.swift`
- Modify: `拾贝/拾贝/V2/Models/V2BackendModels.swift`
- Modify: `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
- Modify: `拾贝/拾贝/V2/V2RootView.swift`

- [ ] Add API models for recommended article list and import response.
- [ ] Fetch recommended articles on app refresh with fallback to the existing demo articles only in mock mode.
- [ ] Make Discover article cards open their own detail instead of a single static page.
- [ ] Make “开始生成” call import; after success, set the imported chapter active and route to chapter detail or overview.
- [ ] Keep the current filter UI, but derive filters from backend tags.
- [ ] Commit: `feat: connect discover recommendations to backend`.

### Checkpoint 4: Admin Seed Workflow

**Files:**
- Create: `backend/scripts/build-recommended-article.mjs`
- Create or update: `docs/recommended-articles-admin-runbook-zh.md`

- [ ] Add a script command that can take a source URL or raw text, run the existing V2 generation pipeline, validate the output, and write a prepared chapter artifact.
- [ ] Document the exact admin workflow: add article, generate artifact, review output HTML, commit catalog and artifact, deploy.
- [ ] Keep this offline/admin-only; no user-facing management platform in MVP.
- [ ] Commit: `docs: add recommended article admin workflow`.

### Checkpoint 5: Verification and Deployment Prep

**Files:**
- Modify only if tests reveal gaps.

- [ ] Run backend targeted tests and `npm run check:v2`.
- [ ] Run iOS build.
- [ ] Install to phone if build succeeds.
- [ ] Commit any final fixes.

---

## Self-Review

- Spec coverage: The plan covers curated Discover content, prepared chapters, fast user import, backend traceability, frontend consumption, admin workflow, and verification.
- Scope control: It intentionally does not build a full CMS/admin console in MVP. The catalog format can later be backed by a database without changing the iOS app contract.
- Main risk: A prepared chapter artifact must be a completed V2 chapter, not only a quality experiment report. The import tests must validate the chapter can start a V2 review session.

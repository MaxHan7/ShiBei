# Discover Bilingual Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the V2 Discover page language-aware and production-safe by separating stable recommendation taxonomy IDs from localized display text, adding English-facing recommendation metadata, and verifying frontend/backend behavior in Chinese and English.

**Architecture:** The backend recommendation catalog remains the source of truth. Catalog filters and article tags use stable IDs, while titles, sources, and descriptions expose localized dictionaries. The iOS app decodes both legacy and localized fields, selects display text from `AppLanguage`, and uses filter metadata to render card tags consistently.

**Tech Stack:** Node.js backend catalog/serializer/tests, SwiftUI V2 frontend, Xcode simulator verification.

---

## Scope

This iteration updates Discover list/detail presentation and recommendation metadata. It does not regenerate all prepared recommended chapters in English. Existing prepared chapters remain importable; English-native prepared recommended chapters should be planned separately if we want imported recommended chapters to be fully English without live generation.

## Files

- Modify: `backend/content/recommended-articles.json`
- Modify: `backend/src/v2/recommended/recommendedArticles.js`
- Modify: `backend/src/v2/recommended/recommendedArticles.test.js`
- Modify: `backend/src/tests/versionInfo.test.js`
- Modify: `拾贝/拾贝/V2/Models/V2BackendModels.swift`
- Modify: `拾贝/拾贝/V2/Fixtures/V2DemoContentProvider.swift`
- Modify: `拾贝/拾贝/V2/Components/Cards/V2DiscoverCards.swift`
- Modify: `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
- Optionally modify: `拾贝/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift`

## Tasks

### Task 1: Document and commit the implementation boundary

- [x] Write this plan with architecture, files, and test strategy.
- [ ] Commit the plan as the first checkpoint.

### Task 2: Backend localized catalog schema

- [ ] Add `localizedTitle`, `localizedSource`, and `localizedDescription` normalization helpers.
- [ ] Add `tagIds` normalization while preserving legacy `tags` for older clients.
- [ ] Return `localizedTitle` on filters and localized fields plus `tagIds` on articles.
- [ ] Keep `title`, `source`, `description`, and `tags` populated with Chinese/default display values for compatibility.
- [ ] Add tests proving stable filter IDs, localized labels, and legacy fallback work.

### Task 3: Recommended catalog content

- [ ] Convert existing filters from display-text IDs to stable IDs: `ai`, `product`, `learning`, `business`, `finance`.
- [ ] Convert article `tags` to `tagIds`.
- [ ] Add English metadata for at least two strong short English-facing recommendations.
- [ ] Keep Chinese metadata for all current recommendations so Chinese UI remains unchanged.
- [ ] Run the catalog checker.

### Task 4: iOS model and fallback fixture

- [ ] Extend Swift recommendation models with optional localized dictionaries and `tagIDs`.
- [ ] Add language helper methods for filter title, article title, source, description, and effective tag IDs.
- [ ] Replace fallback mock filters/articles with the same stable IDs and localized strings.
- [ ] Preserve decoding compatibility with older API responses.

### Task 5: Discover UI rendering

- [ ] Filter articles by `article.effectiveTagIDs` instead of display `tags`.
- [ ] Render filter chips with localized filter titles.
- [ ] Render card tags by mapping article tag IDs through the filter metadata, so filter and card tag labels share one source of truth.
- [ ] Render article title/source with localized helpers.
- [ ] Keep current visual layout and component metrics unchanged unless text needs safe truncation.

### Task 6: Verification

- [ ] Run backend recommendation tests.
- [ ] Run backend catalog checker.
- [ ] Run Swift build/tests or XcodeBuildMCP build on simulator.
- [ ] Verify Discover in Chinese: filter chips and card tags show Chinese labels.
- [ ] Verify Discover in English: filter chips and card tags show English labels; card title/source uses English metadata when available.
- [ ] Check that importing/opening a recommended article still works and does not crash.

## Risk Notes

- Prepared recommended chapters are currently Chinese. This iteration makes Discover browsing bilingual, but it does not make imported prepared chapters fully English.
- If English UI users import a prepared recommended chapter, the preview body may still be Chinese until we add English prepared chapters or route recommended imports through live generation with `generationLanguage=en`.
- Stable tag IDs reduce future localization bugs, but require frontend and backend to deploy together for the cleanest behavior.

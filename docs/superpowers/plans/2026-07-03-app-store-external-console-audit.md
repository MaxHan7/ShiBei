# App Store External Console Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a machine-readable App Store Connect and Apple Developer confirmation gate so external user-only setup does not rely on memory.

**Architecture:** Create one checklist document for user instructions, one JSON example for the expected confirmation shape, and one Node audit script that can run in report or strict mode. Register the audit in `app-store:status` as a blocking area and update the handoff docs so user-owned work is separate from Codex-owned work.

**Tech Stack:** Node.js ESM scripts, Markdown docs, npm scripts, existing App Store readiness command pattern.

---

### Task 1: External Console Checklist And Schema

**Files:**
- Create: `/Users/hanmingyu/Downloads/拾贝-prod-hardening/docs/app-store-external-console-checklist-zh.md`
- Create: `/Users/hanmingyu/Downloads/拾贝-prod-hardening/docs/app-store-external-console-checks.example.json`

- [ ] **Step 1: Add a concise user checklist**

Write a Markdown checklist covering Apple Developer App ID, App Store Connect app record, Privacy, screenshots, age rating, build selection, and review submission.

- [ ] **Step 2: Add a JSON example**

Write a machine-readable example with all required keys set to `"待确认"` so the audit blocks until the user creates a real input file.

### Task 2: External Console Audit Script

**Files:**
- Create: `/Users/hanmingyu/Downloads/拾贝-prod-hardening/tools/app-store-external-console-audit.mjs`
- Modify: `/Users/hanmingyu/Downloads/拾贝-prod-hardening/package.json`
- Modify: `/Users/hanmingyu/Downloads/拾贝-prod-hardening/tools/app-store-status.mjs`

- [ ] **Step 1: Implement report/strict modes**

Default input: `.release/app-store-inputs/external-console-checks.json`. Report mode exits zero and prints NOT READY; strict mode exits non-zero when incomplete.

- [ ] **Step 2: Register scripts**

Add `app-store:external-console-audit`, `check:app-store-external-console`, and syntax check coverage in `npm run check`.

- [ ] **Step 3: Add status summary**

Include “外部控制台确认” as a blocking report in `app-store:status`.

### Task 3: Documentation And Evidence

**Files:**
- Modify: `/Users/hanmingyu/Downloads/拾贝-prod-hardening/docs/app-store-user-action-checklist-zh.md`
- Modify: `/Users/hanmingyu/Downloads/拾贝-prod-hardening/docs/app-store-release-readiness-plan-zh.md`
- Create: `/Users/hanmingyu/Downloads/拾贝-prod-hardening/docs/app-store-release-evidence/2026-07-03-external-console-audit.md`

- [ ] **Step 1: Link the new checklist from user actions**

Make external console confirmation a named user-owned step.

- [ ] **Step 2: Update readiness plan status**

Record that the external console gate now exists and remains blocked until user confirmation.

- [ ] **Step 3: Save audit evidence**

Run report mode and save the output as release evidence.

### Task 4: Verification And Commits

**Files:**
- No new implementation files beyond Tasks 1-3.

- [ ] **Step 1: Run targeted checks**

Run `npm run app-store:external-console-audit`, a passing temp-input audit, `npm run app-store:status`, and `npm run check`.

- [ ] **Step 2: Commit**

Commit this checkpoint, then refresh the user handoff package and commit that refresh separately.

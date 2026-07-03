# Recallo User Handoff Refresh After Screenshot Gate Split

Date: 2026-07-03
Command:

```bash
npm run app-store:create-user-handoff -- --force
```

Result:

- Refreshed `docs/app-store-release-evidence/2026-07-03-user-handoff.md`.
- User handoff now reports `Screenshot readiness: NOT READY (1 issue)` instead of the previous `7 issues`.
- User-facing screenshot instruction now says at least 1 compliant App Store screenshot is required by the gate, while 6 core scenes remain the recommended first-release product set.
- The generated handoff labels its commit field as `生成基准 Git commit`, so later evidence commits do not imply the handoff file must recursively refresh itself just to include its own commit hash.

Next:

- User provides decisions, final email/URLs, acceptance evidence, external console confirmation, and screenshots.
- Codex runs the existing ingest/dry-run/apply/final-gate flow after user input.

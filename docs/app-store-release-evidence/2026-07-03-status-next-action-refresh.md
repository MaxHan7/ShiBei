# App Store Status Next Action Refresh - 2026-07-03

## Purpose

Keep `npm run app-store:status` aligned with the current release intake workflow.

After adding `npm run app-store:ingest-user-reply`, the status command should no longer point only to the older parse/apply sequence. It should guide Codex and the user through:

1. refresh user handoff;
2. receive the filled user reply template;
3. run the safe ingest dry-run;
4. rerun with `--apply` only after the dry-run is reviewed.

## Changed File

- `tools/app-store-status.mjs`

## Verification

```bash
node --check tools/app-store-status.mjs
npm run app-store:status | sed -n '1,35p'
```

Expected result:

- The summary still reports current user-owned blockers.
- `Next action` mentions `npm run app-store:create-user-handoff`.
- `Next action` also mentions `npm run app-store:ingest-user-reply -- --input <reply-file> --acceptance-record <acceptance-file>` and `--apply`.

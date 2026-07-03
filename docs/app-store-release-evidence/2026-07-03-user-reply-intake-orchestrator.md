# User Reply Intake Orchestrator - 2026-07-03

## Purpose

Provide one safe command for turning the user's fast App Store release reply into standard release inputs, dry-running document updates, and showing the remaining release status.

This reduces manual command stitching after the user provides support email, public URLs, App Store metadata, screenshot status, acceptance status, and Archive/App Store Connect confirmations.

## Files

- Script: `tools/app-store-ingest-user-reply.mjs`
- NPM command: `npm run app-store:ingest-user-reply`
- Generated input folder: `.release/app-store-inputs/` by default

## Default Safe Mode

The command defaults to dry-run mode:

```bash
npm run app-store:ingest-user-reply -- \
  --input .release/recallo-user-reply.txt \
  --acceptance-record docs/app-store-release-evidence/YYYY-MM-DD-production-acceptance.md \
  --force
```

Dry-run mode:

- parses the user reply;
- writes ignored `.release/` JSON inputs;
- dry-runs `app-store:apply-decisions`;
- dry-runs `app-store:apply-contact`;
- prints `app-store:status`;
- checks whether the App Store Connect copy pack can be generated.

It does not modify tracked release documents.

## Apply Mode

Only after reviewing dry-run output:

```bash
npm run app-store:ingest-user-reply -- \
  --input .release/recallo-user-reply.txt \
  --acceptance-record docs/app-store-release-evidence/YYYY-MM-DD-production-acceptance.md \
  --force \
  --apply
```

Apply mode updates:

- `docs/app-store-user-decision-form-zh.md`
- privacy/support pages
- App Store metadata
- App Review submission pack
- user checklist
- Archive runbook
- user handoff

## Verification

```bash
node --check tools/app-store-ingest-user-reply.mjs
npm run app-store:ingest-user-reply -- \
  --input .release/app-store-test-reply.txt \
  --acceptance-record docs/app-store-release-evidence/2026-07-03-production-acceptance.md \
  --output-dir .release/app-store-intake-test \
  --force
```

Expected result:

- standard decision/contact JSON is generated under `.release/app-store-intake-test`;
- decision form dry-run passes;
- contact/url dry-run reports the expected files it would update;
- tracked release documents remain unchanged in dry-run mode;
- status still shows user-owned blockers until real final fields are applied.

## Guardrails

- `--input` is required.
- `--acceptance-record` is required unless explicitly using `--allow-pending` for draft intake.
- Informational gates such as status and copy-pack check may report blockers without failing the intake; blockers are expected before final user inputs are applied.
- `.release/` remains ignored because it may contain user-provided contact information.

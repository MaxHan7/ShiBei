# App Store Connect Copy Pack Generator - 2026-07-03

## Purpose

Create one App Store Connect copy/paste pack from the existing release documents so the final submission does not require manually collecting fields from multiple files.

## Files

- Script: `tools/app-store-create-connect-copy-pack.mjs`
- NPM command: `npm run app-store:create-connect-copy-pack`
- Default output: `docs/app-store-release-evidence/YYYY-MM-DD-app-store-connect-copy-pack.md`

## Behavior

- Strict mode blocks when required App Store fields are still pending.
- Draft mode can be generated with `--allow-pending --force` for review before final URLs and decisions are filled.
- The pack includes App Information, promotional text, description, keywords, What's New, review notes, TestFlight notes, App Privacy labels, age rating guidance, screenshot checklist, and a manual submit checklist.
- Section parsing is bounded to the requested Markdown heading so code blocks from later sections cannot be copied into the wrong App Store field.

## Verification

```bash
node --check tools/app-store-create-connect-copy-pack.mjs
npm run app-store:create-connect-copy-pack -- --dry-run
npm run app-store:create-connect-copy-pack -- --allow-pending --force --output /tmp/recallo-app-store-connect-copy-pack.md
```

Expected current result:

- `node --check` passes.
- Strict dry-run fails with 5 blockers because Privacy URL, Support URL, and final user decisions are not yet filled.
- Draft generation succeeds.
- Keywords are rendered as the clean keyword line only.
- TestFlight notes render the TestFlight test instructions, not the App Privacy section.

## Current Blockers

- Privacy Policy URL is still local/pending.
- Support URL is still local/pending.
- User decision form still contains pending values.
- Metadata still points to pending/local URLs.
- Review submission pack still contains pending decisions.

## Next Use

After the user provides final support email, public Privacy URL, public Support URL, acceptance status, screenshots, and App Store Connect/Archive confirmation, run:

```bash
npm run app-store:create-connect-copy-pack
```

Only use the generated pack for App Store Connect submission when its `Blockers` section is empty.

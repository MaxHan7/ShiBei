
> recallo@0.1.0 app-store:responsibility-report
> node tools/app-store-responsibility-report.mjs

# Recallo App Store Responsibility Boundary
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
generatedAt=2026-07-04T06:42:25.408Z

## Current Boundary
status=WAITING_ON_USER_OR_EXTERNAL_APPLE_INPUT

This report answers one question: what is blocked by user-owned or Apple/Xcode-owned input, and what Codex will do automatically after that input exists.

## User-owned Now
- Fill or confirm product and review decisions in the current handoff or decision form.
  - Primary entry: `docs/app-store-release-evidence/2026-07-04-user-handoff.md`
  - Field map: `docs/app-store-user-input-field-map-zh.md`
  - Decision form: `docs/app-store-user-decision-form-zh.md`
- Provide a real support email plus public HTTPS Privacy Policy URL and Support URL.
- Add at least 1 valid App Store screenshot to `docs/app-store-release-evidence/screenshots/app-store/`; 6 core-scene screenshots remain recommended.
- Fill the TestFlight/real-device acceptance record: `docs/app-store-release-evidence/2026-07-04-production-acceptance.md`.
- Confirm Apple Developer / App Store Connect fields in `.release/app-store-inputs/external-console-checks.json`.
- Archive and upload from Xcode/App Store Connect only after final strict gates pass.

## Codex-owned Automatically After User Input
- Parse the user's handoff reply with `npm run app-store:ingest-user-reply -- --input <reply-file> --acceptance-record <acceptance-file>`.
- Dry-run decision/contact rewrites, then rerun with `--apply` only after the parsed values are correct.
- Run screenshot, acceptance, external console, static page, privacy label, final gate, iOS release, and full repository checks.
- Regenerate App Store Connect copy pack and Archive evidence once the user completes Xcode/App Store Connect actions.
- Update `docs/app-store-release-readiness-plan-zh.md`, write evidence files, and commit the verified changes.

## Current Gate Summary
- BLOCKED 状态总览: Overall status: NOT READY (7 blocking areas)
- BLOCKED 用户行动分组: totalFields=26, missingFields=22
- BLOCKED 截图规格: Screenshot readiness: NOT READY (1 issue)
- BLOCKED 真机验收: Production acceptance: NOT READY (36 issues)
- BLOCKED 公开页面: Static pages readiness: NOT READY (6 issues)
- BLOCKED 外部控制台: External console readiness: NOT READY (26 blockers)
- BLOCKED 最终提交门禁: - FAIL 截图规格: Screenshot readiness: NOT READY (1 issue)

## Existing Inputs
- EXISTS docs/app-store-release-evidence/2026-07-04-user-handoff.md
- EXISTS docs/app-store-release-evidence/2026-07-04-production-acceptance.md
- EXISTS .release/app-store-inputs/external-console-checks.json

## Operational Rule
- Codex must not claim the release is ready while any user-owned item above is missing.
- Codex should continue autonomously only on deterministic repo work: parsing, dry-run/apply rewrites, checks, evidence, and commits.
- User must not manually edit generated release evidence except the explicit user-input files listed above.

## JSON summary
{
  "readyForCodexFinalStrictGates": false,
  "blockingAreas": [
    "状态总览",
    "用户行动分组",
    "截图规格",
    "真机验收",
    "公开页面",
    "外部控制台",
    "最终提交门禁"
  ],
  "userOwnedInputFiles": {
    "handoffPath": "docs/app-store-release-evidence/2026-07-04-user-handoff.md",
    "decisionFormPath": "docs/app-store-user-decision-form-zh.md",
    "fieldMapPath": "docs/app-store-user-input-field-map-zh.md",
    "acceptancePath": "docs/app-store-release-evidence/2026-07-04-production-acceptance.md",
    "externalConsolePath": ".release/app-store-inputs/external-console-checks.json",
    "screenshotDir": "docs/app-store-release-evidence/screenshots/app-store/"
  },
  "codexNextCommandsAfterUserInput": [
    "npm run app-store:ingest-user-reply -- --input <reply-file> --acceptance-record <acceptance-file>",
    "npm run app-store:ingest-user-reply -- --input <reply-file> --acceptance-record <acceptance-file> --apply",
    "npm run check:app-store-screenshots",
    "npm run check:app-store-acceptance -- docs/app-store-release-evidence/2026-07-04-production-acceptance.md",
    "npm run check:app-store-external-console",
    "npm run app-store:final-gate",
    "npm run check:app-store-final",
    "npm run check:release-ios",
    "npm run check"
  ]
}

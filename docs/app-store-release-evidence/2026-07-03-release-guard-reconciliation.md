# Recallo Release Guard Reconciliation - 2026-07-03

## Purpose

Reconcile the App Store release readiness plan with the current automated release guards. The binary/workspace guard items in section 3.1 are now marked complete where current command output directly proves them.

## Commands Run

```bash
npm run check:release-ios
node tools/ios-production-guard.mjs
node tools/recallo-workspace-guard.mjs
node tools/v2-ui-regression-guard.mjs
```

## Verified Complete

- Official worktree is `/Users/hanmingyu/Downloads/拾贝-prod-hardening`.
- Release archive preflight passes in the official worktree.
- Xcode product path is `Recallo.app`.
- `INFOPLIST_KEY_CFBundleDisplayName` is `Recallo`.
- `PRODUCT_NAME` is `Recallo`.
- Production bundle id is `com.maxhan.shibei`.
- App icon asset catalog name is `AppIcon` and image entries are present.
- Release APNs environment is `production`.
- Release entry path uses `V2RootView`.
- Release API default base URL is production HTTPS.
- Release build cannot use the V2 mock toggle.
- Debug-only API/data source/mock scenario controls are guarded.
- Release preflight scans for visible fixture/page-missing/debug decode text.
- Workspace guard blocks staging old experiment iOS files.
- Archive evidence generator records commit/branch/project/scheme/production URL/deployment id after user Archive/Upload.

## Remaining Manual Evidence

These items still require user-side Xcode/App Store Connect or TestFlight evidence:

- Archive in Xcode Organizer shows App name `Recallo`.
- Archive in Xcode Organizer shows the new Recallo icon.
- App Store Connect build is attached to the existing `com.maxhan.shibei` app.
- True Release/TestFlight screenshots confirm no old name, old icon, old UI, debug text, fixture text, or Railway text is visible.

## Non-Blocking Warnings To Recheck On Device

`npm run check:release-ios` still reports review-visibility warnings for:

- `Railway` strings inside localized debug/settings copy.
- `deviceId` code/log references.
- `ShibeiUseLegacyRoot` compatibility launch argument in `ContentView.swift`.

These are not strict blockers because the production guard confirms the relevant controls are DEBUG-only or not user-facing in Release, but the final TestFlight acceptance pass must verify they are not visible in the app.

# 2026-07-02 Release Archive Preflight Evidence

## Summary

- Result: pass with warnings in the official worktree; fails when invoked from the old worktree.
- Command: `npm run check:release-ios`
- Worktree: `/Users/hanmingyu/Downloads/拾贝-prod-hardening`
- Branch: `codex/recallo-review-replay-mode`
- Commit: `ea6e153ea1da`

## Passed Gates

- Official worktree path includes `/拾贝-prod-hardening`.
- Current working directory is inside `/Users/hanmingyu/Downloads/拾贝-prod-hardening`.
- Git root matches script root.
- Branch is allowed for Recallo release preparation.
- Root package name is `recallo`.
- Xcode app product is `Recallo.app`.
- Xcode display name is `Recallo`.
- Xcode product name is `Recallo`.
- Bundle ID is `com.maxhan.shibei`.
- App icon asset is `AppIcon`.
- Release APNs environment is production.
- Xcode project does not reference old `拾贝.app` product.
- Release `ContentView` path enters `V2RootView`.
- Release API base URL is production.
- App icon set has image files.
- Blocking fixture/debug texts were not found:
  - `fixture 没有对应页面数据`
  - `本地 fixture`
  - `JSON decode`
  - `decode path`
  - `无法找到本地页面数据`

## Warnings To Review Before Final App Review

These warnings did not block the preflight because they may be debug-only or internal implementation details. They should still be reviewed before final App Review submission.

- `Railway` appears in `Localizable.xcstrings`.
- `deviceId` appears in API/client implementation logs and headers.
- `ShibeiUseLegacyRoot` appears as a backward-compatible debug launch argument in `ContentView.swift`.

## Negative Test

Command:

```bash
node /Users/hanmingyu/Downloads/拾贝-prod-hardening/tools/release-archive-preflight.mjs
```

Run from:

```text
/Users/hanmingyu/Downloads/拾贝
```

Expected and observed result:

- Failed with `cwd_is_inside_official_worktree`.
- This confirms the guard blocks execution when the user is positioned in the old worktree.

## Next Action

Before the final App Store submission, either prove these warnings are not release-visible or remove/rename the related strings.

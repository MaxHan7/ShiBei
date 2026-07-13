# Frontend Bilingual Hardening Record

Date: 2026-07-13

Workspace: `/Users/hanmingyu/Downloads/拾贝/拾贝-lean-generation-20260711`

Branch: `codex/lean-high-value-generation-20260711`

## Completed

- Added a unified `appLanguage` environment path in the previous checkpoint and continued using it for this hardening pass.
- Localized high-priority V2 review surfaces:
  - feedback panel labels and source buttons
  - unit completion labels
  - chapter completion card and actions
  - chapter detail section labels, source action, source metadata roles, and recommended article loading state
- Localized app chrome and core task surfaces:
  - bottom navigation labels and accessibility
  - upload page title, input placeholder, preflight status, validation messages, and submit states
  - generation card title, buttons, started dialog, generated summary count, and source chip
  - chapter status tags and source platform labels
- Localized settings/profile surfaces:
  - profile page title
  - avatar picker, avatar accessibility labels, nickname editor, save/close labels
  - AI processing consent sheet
- Localized key failure and account messages in `V2RootView`.

## Verification

- `xcodebuildmcp build_sim` succeeded after each checkpoint.
- Final build log:
  `/Users/hanmingyu/Library/Developer/XcodeBuildMCP/workspaces/workspace-ee845a8bacf4/logs/build_sim_2026-07-13T19-21-20-279Z_pid1695_9e025c5e.log`
- `git diff --check` passed.

## Residual Chinese Literal Scan

Remaining Chinese literals are not all equal severity. Current scan categories:

- Fixture/mock/demo content:
  - `V2HomeFixture.swift`
  - `V2ReviewFixture.swift`
  - `V2DemoContentProvider.swift`
  - mock notifications and mock material cards in `V2TabScreens.swift`
- Platform parsing constants:
  - Chinese platform aliases such as `抖音`, `小红书`, `B站`, `哔哩哔哩`
- Backward-compatible default properties:
  - old `title` properties on tab/status enums remain Chinese, while new UI paths use `title(language:)`
- Remaining product decision:
  - `V2HomeData` still creates synthetic node labels like `开始`, `章节概要`, `单元1`, `当前章节` at the data layer. A stricter zero-literal pass should move those into display-layer localization or store semantic node roles instead of localized strings.

## Assessment

This pass fixes the two original audit risks:

- English mode no longer depends on scattered leaf-level language reads for newly touched V2 components.
- The main user-visible V2 surfaces no longer rely on ad hoc hardcoded Chinese for upload, generation, review, chapter detail, profile, and failure flows.

The remaining synthetic node labels are the main known gap before claiming literal-zero localization coverage.

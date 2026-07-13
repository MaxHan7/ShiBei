# Frontend Bilingual UI Verification

Date: 2026-07-13
Branch: `codex/lean-high-value-generation-20260711`

## Scope Completed

- Added `AppLanguage.storageKey` and root SwiftUI locale injection.
- Reused existing `Localizable.xcstrings` and `AppLanguage` instead of creating a custom translation dictionary.
- Added V2 Profile settings entry for interface language.
- Added Chinese/English language selection sheet.
- Localized high-frequency V2 main-path UI chrome:
  - bottom navigation labels
  - profile settings rows
  - profile language sheet
  - profile stats labels
  - notification permission panel
  - account panel fixed text
  - upload card title/placeholder via String Catalog
  - generation detail/card chrome via String Catalog
  - common delete/source/failure labels via String Catalog

## Language Boundary

Frontend language preference only changes fixed App interface text. It does not translate:

- user pasted source text
- extracted source article/video content
- generated chapter titles
- generated knowledge points
- generated questions, options, or explanations
- recommended article titles/content

Backend generation output language remains a separate planned feature.

## Verification Commands

Build:

```bash
XcodeBuildMCP build_sim
```

Result: passed.

Latest build log:

```text
/Users/hanmingyu/Library/Developer/XcodeBuildMCP/workspaces/workspace-ee845a8bacf4/logs/build_sim_2026-07-13T18-27-46-147Z_pid1695_9a926149.log
```

Tests:

```bash
XcodeBuildMCP test_sim
```

Result: blocked before running test cases.

Observed error:

```text
unable to resolve module dependency: '拾贝'
/Users/hanmingyu/Downloads/拾贝/拾贝-lean-generation-20260711/拾贝/拾贝Tests/MockReviewServiceTests.swift:2
```

Assessment: this is an existing test target/module configuration blocker. The app target itself builds successfully after the localization changes.

## Remaining Hardcoded String Classification

Must continue before a full English beta:

- Review-flow fixed chrome in `V2ReviewFlowScreens.swift`:
  - unit summary labels
  - chapter completion labels
  - source article fixed labels
  - recommended-article import prompt
- Notification and notes count phrases:
  - `你有 N 条新通知`
  - `已收藏 N 个题目`
- Accessibility labels that include fixed Chinese phrases.

Acceptable for this checkpoint:

- Generated/user content displayed from backend models.
- Debug-only mock scenario labels and fixture content.
- Recommended article marketing copy, because recommended content itself needs a separate content localization decision.
- AI processing consent sheet, because that sheet is currently disabled in the active product path and should be localized together with the next privacy-review pass.

## Risks

- `Localizable.xcstrings` changed format because it was updated programmatically; Xcode build confirms the catalog is readable, but the diff is larger than ideal.
- Some direct SwiftUI string literals rely on String Catalog runtime lookup. Future code should prefer explicit `L10n.string` for strings passed through `String` variables.
- English UI is suitable for internal testing of the main path, but not yet a complete App Store English localization claim.

## Next Recommended Step

Run a simulator visual pass in both `zh-Hans` and `en` on:

1. Profile settings language sheet.
2. Upload link page.
3. Materials list with a generated chapter.
4. Generation detail page.
5. Review question page.

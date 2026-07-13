# Frontend Bilingual UI Audit

Date: 2026-07-13
Branch: `codex/lean-high-value-generation-20260711`

## Conclusion

The frontend bilingual work is not yet complete under the stricter standard of "every user-facing UI field switches cleanly between Chinese and English."

Completed foundation:

- Shared app language preference key.
- Root SwiftUI locale injection.
- V2 Profile language selector.
- First-pass String Catalog coverage for several high-frequency surfaces.

Remaining problems:

1. Some visible V2 fields still have no English catalog value.
2. Localization access is not fully standardized across V2.

## Audit Method

Command category:

- Searched V2/legacy SwiftUI text, button, text field, alert, confirmation dialog, and accessibility labels with Chinese literals.
- Checked each literal against `Localizable.xcstrings` for an `en` localization.
- Reviewed localization mechanism usage: `L10n.string`, `LocalizedStringKey`, direct `Text("...")`, and repeated `@AppStorage(AppLanguage.storageKey)`.

Result:

- Chinese literal UI occurrences scanned: 62
- Occurrences with English catalog coverage: 33
- Occurrences missing English catalog coverage: 29

## Problem 1: Missing English Coverage

These are likely to remain Chinese in English mode unless covered by String Catalog or converted to explicit localization.

### P0 Before English Beta

- `拾贝/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift`
  - `本单元学习`
  - `正确率`
  - `查看章节详情`
  - `章节完成`
  - `文章核心`
  - `知识点`
  - `知识点详情`
  - `添加为学习路径`
  - `将这篇好文生成学习路径？`
  - `将这篇好文生成学习路径`
- `拾贝/拾贝/V2/Components/Flow/V2QuestionComponents.swift`
  - `正确理解：`
- `拾贝/拾贝/V2/Components/Notifications/V2NotificationComponents.swift`
  - `你有`
  - `条新通知`
- `拾贝/拾贝/V2/Components/Cards/V2NotesCards.swift`
  - `已收藏 `
  - ` 个题目`
- `拾贝/拾贝/V2/Components/V2CurrentChapterBanner.swift`
  - `查看章节详情`

### P1

- `拾贝/拾贝/V2/Components/V2SplashView.swift`
  - `Recallo 正在启动`
- `拾贝/拾贝/V2/Screens/Home/V2HomeView.swift`
  - `还没有生成章节`
- `拾贝/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift`
  - `重新打开反馈`
- `拾贝/拾贝/V2/Components/Cards/V2ProfileCards.swift`
  - `更换头像`

### Separate Privacy/Compliance Pass

`拾贝/拾贝/V2/Components/V2AIProcessingConsentSheet.swift`

- `AI 处理说明`
- `开始生成前，请确认你了解内容会如何被处理。`
- `为了帮你把文章整理成知识点和练习题...`
- `同意并开始生成`
- `暂不生成`

This sheet is currently disabled in the active product path, but if it is restored for App Store/privacy reasons, it must be localized before English release.

### Content Decision Needed

`拾贝/拾贝/V2/Components/Cards/V2DiscoverCards.swift`

- `发现好内容`

Recommended/discover content may need a separate product decision: either localize the fixed card chrome only, or maintain separate Chinese/English recommended content feeds.

## Problem 2: Method Standardization

Current state is mixed:

- Legacy screens mostly use `store.localized(...)`.
- V2 new settings changes use `L10n.string(..., language:)`.
- Some V2 shared components use `Text(LocalizedStringKey(title))`.
- Some direct SwiftUI literals rely on String Catalog automatic lookup.
- Multiple V2 components read `@AppStorage(AppLanguage.storageKey)` directly.

This works in places, but it is not yet a clean, unified V2 localization architecture.

Recommended standard:

1. Keep `Localizable.xcstrings` as the only source of translations.
2. Add one V2-level language environment value, such as `@Environment(\.appLanguage)`, injected once at root.
3. Use `L10n.string(key, language:)` for strings passed as `String` props.
4. Use direct `Text("source language key")` only for simple local SwiftUI literals that are not passed through `String`.
5. Do not scatter `@AppStorage(AppLanguage.storageKey)` through leaf views except the settings selector.
6. For count phrases, use formatted localized keys instead of splitting text into prefix/count/suffix.

## Assessment

The current implementation is acceptable as a foundation checkpoint, but it should not be described as "frontend bilingual complete."

Before telling users or reviewers that English UI is supported, complete a second localization-hardening pass:

1. Add a V2 app language environment.
2. Replace scattered `@AppStorage` reads in leaf views.
3. Localize the P0 missing fields above.
4. Convert split count phrases to localized format strings.
5. Run a simulator visual pass in Chinese and English after the local simulator launch issue is resolved.

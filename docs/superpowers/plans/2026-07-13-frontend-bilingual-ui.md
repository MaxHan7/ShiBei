# Frontend Bilingual UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-grade Chinese/English interface language preference to the V2 iOS app while keeping generated learning content language unchanged.

**Architecture:** Reuse the existing `AppLanguage` and `Localizable.xcstrings` foundation, add a V2-visible language preference bound to `UserDefaults`, inject the selected `Locale` at the SwiftUI root, and localize the main V2 user path. Generated chapter/question/source content remains data, not UI chrome, and is not localized by this layer.

**Tech Stack:** SwiftUI, Xcode String Catalog, `@AppStorage`, `EnvironmentValues.locale`, existing V2 design system components.

---

## File Structure

- Modify `拾贝/拾贝/Localization.swift`
  - Add a shared language preference key and small display helpers.
- Modify `拾贝/拾贝/__App.swift`
  - Persist and inject the selected app locale into the root SwiftUI tree.
- Modify `拾贝/拾贝/Services/MockServices.swift`
  - Reuse the shared language preference key so legacy and V2 stay aligned.
- Modify `拾贝/拾贝/V2/Components/Cards/V2ProfileCards.swift`
  - Add a V2 language row and selection sheet using existing card/sheet patterns.
- Modify `拾贝/拾贝/V2/V2RootView.swift`
  - Localize V2-level alerts and titles that currently sit in the root coordinator.
- Modify `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
  - Localize upload/materials/generation-failure user-facing chrome on the main path.
- Modify selected V2 component files as needed:
  - `拾贝/拾贝/V2/Components/V2BottomNavigationBar.swift`
  - `拾贝/拾贝/V2/Components/Generation/V2GenerationCards.swift`
  - `拾贝/拾贝/V2/Components/Cards/V2ChapterCards.swift`
  - `拾贝/拾贝/V2/Components/Notifications/V2NotificationComponents.swift`
- Modify `拾贝/拾贝/Localizable.xcstrings`
  - Add missing `zh-Hans` and `en` string units for the V2 main path.
- Add or update tests under `拾贝/拾贝Tests`
  - Verify language persistence and key coverage where possible without UI automation.

## Tasks

### Task 1: Shared Language Preference

- [ ] Add `AppLanguage.storageKey` to `Localization.swift`.
- [ ] Update `MockServices.swift` to use `AppLanguage.storageKey` instead of a private duplicated key.
- [ ] Add `AppLanguage.interfaceSubtitle(in:)` if the language selector needs a short explanatory subtitle.
- [ ] Build with `xcodebuild -project 拾贝/拾贝.xcodeproj -scheme Recallo -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build`.
- [ ] Commit with `git commit -m "feat: share app language preference key"`.

### Task 2: Root Locale Injection

- [ ] Add `@AppStorage(AppLanguage.storageKey)` to `__App.swift`.
- [ ] Convert the stored raw value to `AppLanguage`.
- [ ] Apply `.environment(\.locale, Locale(identifier: selectedLanguage.localeIdentifier))` to `ContentView()`.
- [ ] Verify the legacy `RootView` locale injection remains compatible.
- [ ] Build.
- [ ] Commit with `git commit -m "feat: inject selected app locale"`.

### Task 3: V2 Settings Entry

- [ ] Add a language row to `V2ProfileSettingsCard`.
- [ ] Keep the visual structure aligned with existing profile setting rows; do not introduce a new card style.
- [ ] Add a `V2ProfileLanguageSelectionSheet` that lists 中文 and English using `AppLanguage.allCases`.
- [ ] Store selection through `@AppStorage(AppLanguage.storageKey)` so it updates the root locale immediately.
- [ ] Use existing typography, row height, divider, and sheet background tokens.
- [ ] Build.
- [ ] Commit with `git commit -m "feat: add V2 interface language setting"`.

### Task 4: Main V2 UI String Coverage

- [ ] Localize root coordinator strings: delete confirmation, missing route fallback, profile title, chapter detail title.
- [ ] Localize tab/page chrome: 全部章节, 添加学习内容, 粘贴文章或视频链接, 章节生成失败, 查看原文, 失败原因.
- [ ] Localize V2 bottom navigation accessibility labels.
- [ ] Localize generation card chrome: 章节正在生成, 查看章节, 取消生成, 生成完成后会通知你, 已生成 N 个章节.
- [ ] Localize profile card chrome: 通知设置, 隐私说明, 账号说明, language row, account/notification sheet fixed text.
- [ ] Keep generated chapter titles, question text, explanations, source snippets, recommended article titles, and user display names unchanged.
- [ ] Update `Localizable.xcstrings` with both `zh-Hans` and `en` values.
- [ ] Build.
- [ ] Commit with `git commit -m "feat: localize V2 main interface text"`.

### Task 5: Verification And Documentation

- [ ] Add a short verification record under `docs/quality-runs/frontend-localization/`.
- [ ] Run tests/build:
  - `xcodebuild -project 拾贝/拾贝.xcodeproj -scheme Recallo -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build`
  - `xcodebuild -project 拾贝/拾贝.xcodeproj -scheme Recallo -destination 'platform=iOS Simulator,name=iPhone 16 Pro' test`
- [ ] Review hardcoded V2 Chinese strings and classify remaining strings as:
  - user/generated content
  - debug-only
  - deferred low-frequency UI
  - must-fix before English beta
- [ ] Commit with `git commit -m "docs: record frontend localization verification"`.

## Self-Review

- This plan covers the frontend bilingual UI goal and records the backend generation-language feature separately.
- No backend generation prompt changes are included in this implementation plan.
- The language selector uses the existing profile settings pattern and does not create a parallel settings system.
- String Catalog remains the source of truth for fixed UI strings.

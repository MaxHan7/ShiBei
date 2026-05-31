import Foundation

enum AppLanguage: String, CaseIterable, Codable, Identifiable {
    case zhHans = "zh-Hans"
    case en = "en"

    var id: String { rawValue }

    var localeIdentifier: String {
        rawValue
    }

    var displayName: String {
        displayName(in: .zhHans)
    }

    func displayName(in language: AppLanguage) -> String {
        switch self {
        case .zhHans:
            L10n.string("language.zh_hans", language: language)
        case .en:
            L10n.string("language.en", language: language)
        }
    }
}

enum L10n {
    static func string(_ key: String, language: AppLanguage) -> String {
        bundle(for: language).localizedString(forKey: key, value: key, table: "Localizable")
    }

    static func format(_ key: String, language: AppLanguage, _ arguments: CVarArg...) -> String {
        String(
            format: string(key, language: language),
            locale: Locale(identifier: language.localeIdentifier),
            arguments: arguments
        )
    }

    private static func bundle(for language: AppLanguage) -> Bundle {
        let candidates = [Bundle.main, Bundle(for: LocalizationBundleMarker.self)] + Bundle.allBundles
        for candidate in candidates {
            if let path = candidate.path(forResource: language.localeIdentifier, ofType: "lproj"),
               let bundle = Bundle(path: path) {
                return bundle
            }
        }
        return .main
    }
}

private final class LocalizationBundleMarker {}

extension AppTab {
    var titleKey: String {
        switch self {
        case .home:
            "tab.home"
        case .chapters:
            "tab.chapters"
        case .add:
            "tab.add"
        case .notifications:
            "tab.notifications"
        case .profile:
            "tab.profile"
        }
    }

    func title(language: AppLanguage) -> String {
        L10n.string(titleKey, language: language)
    }
}

extension ChapterStatus {
    func displayText(language: AppLanguage) -> String {
        switch self {
        case .completed:
            L10n.string("status.completed", language: language)
        case .submitted:
            L10n.string("status.submitted", language: language)
        case .extractingContent:
            L10n.string("status.extracting_content", language: language)
        case .generatingPoints:
            L10n.string("status.generating_points", language: language)
        case .generatingQuestions, .autoRegeneratingQuestions:
            L10n.string("status.generating_questions", language: language)
        case .qualityChecking:
            L10n.string("status.quality_checking", language: language)
        case .failedExtractArticle:
            L10n.string("status.failed_extract_article", language: language)
        case .failedExtractVideo:
            L10n.string("status.failed_extract_video", language: language)
        case .failedPoints:
            L10n.string("status.failed_points", language: language)
        case .failedQuestions, .failedNoQualifiedQuestions:
            L10n.string("status.failed_questions", language: language)
        }
    }
}

extension SourceType {
    func label(language: AppLanguage) -> String {
        switch self {
        case .text:
            L10n.string("source.text", language: language)
        case .articleLink:
            L10n.string("source.article_link", language: language)
        case .wechatArticle:
            L10n.string("source.wechat_article", language: language)
        case .videoLink:
            L10n.string("source.video_link", language: language)
        }
    }
}

extension FeedbackType {
    func label(language: AppLanguage) -> String {
        switch self {
        case .answerWrong:
            L10n.string("feedback.answer_wrong", language: language)
        case .tooEasy:
            L10n.string("feedback.too_easy", language: language)
        case .unclear:
            L10n.string("feedback.unclear", language: language)
        case .unrelatedToSource:
            L10n.string("feedback.unrelated_to_source", language: language)
        }
    }
}

extension ChapterInput {
    func displayText(language: AppLanguage) -> String {
        switch sourceType {
        case .text:
            L10n.string("add.input.text", language: language)
        case .articleLink, .wechatArticle:
            L10n.string("add.input.article", language: language)
        case .videoLink:
            L10n.string("add.input.video", language: language)
        }
    }
}

extension NotificationType {
    func title(language: AppLanguage) -> String {
        switch self {
        case .generationCompleted:
            L10n.string("notifications.type.completed.title", language: language)
        case .generationFailed:
            L10n.string("notifications.type.failed.title", language: language)
        }
    }

    func body(language: AppLanguage) -> String {
        switch self {
        case .generationCompleted:
            L10n.string("notifications.type.completed.body", language: language)
        case .generationFailed:
            L10n.string("notifications.type.failed.body", language: language)
        }
    }
}

extension NotificationItem {
    func localizedTitle(language: AppLanguage) -> String {
        type.title(language: language)
    }

    func localizedBody(language: AppLanguage) -> String {
        type.body(language: language)
    }
}

extension MockScenario {
    func title(language: AppLanguage) -> String {
        switch self {
        case .emptyHome:
            L10n.string("debug.mock_scenario.empty_home.title", language: language)
        case .unreviewedChapter:
            L10n.string("debug.mock_scenario.unreviewed_chapter.title", language: language)
        case .activeReview:
            L10n.string("debug.mock_scenario.active_review.title", language: language)
        case .processingChapter:
            L10n.string("debug.mock_scenario.processing_chapter.title", language: language)
        case .failedChapter:
            L10n.string("debug.mock_scenario.failed_chapter.title", language: language)
        case .successNotification:
            L10n.string("debug.mock_scenario.success_notification.title", language: language)
        case .failedNotification:
            L10n.string("debug.mock_scenario.failed_notification.title", language: language)
        }
    }

    func subtitle(language: AppLanguage) -> String {
        switch self {
        case .emptyHome:
            L10n.string("debug.mock_scenario.empty_home.subtitle", language: language)
        case .unreviewedChapter:
            L10n.string("debug.mock_scenario.unreviewed_chapter.subtitle", language: language)
        case .activeReview:
            L10n.string("debug.mock_scenario.active_review.subtitle", language: language)
        case .processingChapter:
            L10n.string("debug.mock_scenario.processing_chapter.subtitle", language: language)
        case .failedChapter:
            L10n.string("debug.mock_scenario.failed_chapter.subtitle", language: language)
        case .successNotification:
            L10n.string("debug.mock_scenario.success_notification.subtitle", language: language)
        case .failedNotification:
            L10n.string("debug.mock_scenario.failed_notification.subtitle", language: language)
        }
    }
}

extension Chapter {
    func visibleStatusText(language: AppLanguage) -> String {
        status.displayText(language: language)
    }
}

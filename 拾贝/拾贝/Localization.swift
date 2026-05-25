import Foundation

enum AppLanguage: String, CaseIterable, Codable, Identifiable {
    case zhHans = "zh-Hans"
    case en = "en"

    var id: String { rawValue }

    var localeIdentifier: String {
        rawValue
    }

    var displayName: String {
        switch self {
        case .zhHans:
            "中文"
        case .en:
            "English"
        }
    }
}

enum L10n {
    static func string(_ key: String, language: AppLanguage) -> String {
        String(
            localized: String.LocalizationValue(key),
            table: "Localizable",
            bundle: .main,
            locale: Locale(identifier: language.localeIdentifier)
        )
    }

    static func format(_ key: String, language: AppLanguage, _ arguments: CVarArg...) -> String {
        String(
            format: string(key, language: language),
            locale: Locale(identifier: language.localeIdentifier),
            arguments: arguments
        )
    }
}

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

extension Chapter {
    func visibleStatusText(language: AppLanguage) -> String {
        status.displayText(language: language)
    }
}

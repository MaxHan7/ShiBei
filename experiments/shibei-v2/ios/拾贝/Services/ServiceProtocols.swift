import Foundation

enum AppDataMode: String, CaseIterable, Identifiable {
    case mock
    case localAPI
    case cloudAPI

    var id: String { rawValue }

    var title: String {
        title(language: .zhHans)
    }

    func title(language: AppLanguage) -> String {
        switch self {
        case .mock:
            L10n.string("debug.data_mode.mock.title", language: language)
        case .localAPI:
            L10n.string("debug.data_mode.local.title", language: language)
        case .cloudAPI:
            L10n.string("debug.data_mode.cloud.title", language: language)
        }
    }

    var subtitle: String {
        subtitle(language: .zhHans)
    }

    func subtitle(language: AppLanguage) -> String {
        switch self {
        case .mock:
            L10n.string("debug.data_mode.mock.subtitle", language: language)
        case .localAPI:
            L10n.string("debug.data_mode.local.subtitle", language: language)
        case .cloudAPI:
            L10n.string("debug.data_mode.cloud.subtitle", language: language)
        }
    }

    var apiLabel: String {
        apiLabel(language: .zhHans)
    }

    func apiLabel(language: AppLanguage) -> String {
        switch self {
        case .mock:
            L10n.string("debug.data_mode.mock.api_label", language: language)
        case .localAPI:
            L10n.string("debug.data_mode.local.api_label", language: language)
        case .cloudAPI:
            L10n.string("debug.data_mode.cloud.api_label", language: language)
        }
    }
}

protocol ChapterServicing {
    func createChapter(from input: ChapterInput) -> ChapterCreationResult
    func regenerateChapter(_ chapter: Chapter) -> ChapterCreationResult
    func deleteChapter(_ id: String, chapters: inout [Chapter], notifications: inout [NotificationItem])
}

protocol ReviewServicing {
    func startOrResumeSession(for chapter: Chapter) -> ReviewSession
    func currentQuestion(in chapter: Chapter) -> ReviewQuestion?
    func submitAttempt(chapter: Chapter, session: ReviewSession, answer: String?, result: AttemptResult) -> AttemptSubmissionResult
    func submitFeedback(chapter: Chapter, session: ReviewSession, questionId: String, type: FeedbackType) -> FeedbackSubmissionResult
}

protocol NotificationServicing {
    func markRead(_ id: String, notifications: inout [NotificationItem])
    func dismiss(_ id: String, notifications: inout [NotificationItem])
    func dismissFailure(for chapterId: String, chapters: inout [Chapter], notifications: inout [NotificationItem])
}

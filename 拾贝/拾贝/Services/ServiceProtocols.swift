import Foundation

enum AppDataMode: String, CaseIterable, Identifiable {
    case mock
    case localAPI
    case cloudAPI

    var id: String { rawValue }

    var title: String {
        switch self {
        case .mock:
            "Mock 数据"
        case .localAPI:
            "本地 API"
        case .cloudAPI:
            "Railway 云端"
        }
    }

    var subtitle: String {
        switch self {
        case .mock:
            "当前使用 SwiftUI 本地 mock state"
        case .localAPI:
            "连接 Node 本地 API，章节、复习和通知状态由后端驱动"
        case .cloudAPI:
            "连接 Railway 云端 API，用于真机真实生成验证"
        }
    }

    var apiLabel: String {
        switch self {
        case .mock:
            "Mock"
        case .localAPI:
            "本地 API"
        case .cloudAPI:
            "Railway 云端"
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
    func dismissFailure(for chapterId: String, chapters: inout [Chapter], notifications: inout [NotificationItem])
}

import Foundation

struct LocalAPIReviewService {
    var apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    func startOrResumeSession(for chapter: Chapter) async throws -> ReviewSessionResponse {
        try await apiClient.startOrResumeReviewSession(chapterId: chapter.id)
    }

    func submitAttempt(chapter: Chapter, session: ReviewSession, question: ReviewQuestion, answer: String?, result: AttemptResult) async throws -> AttemptResponse {
        try await apiClient.submitAttempt(sessionId: session.id, questionId: question.id, answer: answer, result: result)
    }

    func submitFeedback(questionId: String, type: FeedbackType) async throws -> FeedbackResponse {
        try await apiClient.submitFeedback(questionId: questionId, feedbackType: type)
    }
}

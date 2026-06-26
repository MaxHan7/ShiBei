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
        let currentItem = session.queue.indices.contains(session.currentQueueIndex)
            ? session.queue[session.currentQueueIndex]
            : nil
        let queueItemId = currentItem?.questionId == question.id ? currentItem?.id : nil
        return try await apiClient.submitAttempt(sessionId: session.id, queueItemId: queueItemId, questionId: question.id, answer: answer, result: result)
    }

    func submitFeedback(questionId: String, type: FeedbackType) async throws -> FeedbackResponse {
        try await apiClient.submitFeedback(questionId: questionId, feedbackType: type)
    }
}

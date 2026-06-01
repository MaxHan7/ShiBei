import XCTest
@testable import 拾贝

final class APIClientDecodingTests: XCTestCase {
    func testDecodesChaptersResponseShape() throws {
        let data = try fixtureData(named: "completed-chapter")
        let fixture = try JSONDecoder().decode(ChapterFixture.self, from: data)
        let responseData = try JSONEncoder().encode(ChaptersResponse(chapters: [fixture.chapter]))

        let response = try JSONDecoder().decode(ChaptersResponse.self, from: responseData)

        XCTAssertEqual(response.chapters.count, 1)
        XCTAssertEqual(response.chapters[0].id, fixture.chapter.id)
        XCTAssertEqual(response.chapters[0].knowledgePoints.count, fixture.chapter.knowledgePoints.count)
    }

    func testDecodesLegacyChapterWithoutCoreSummary() throws {
        var payload = try completedChapterPayload()
        var chapter = try XCTUnwrap(payload["chapter"] as? [String: Any])
        chapter.removeValue(forKey: "coreSummary")
        payload["chapter"] = chapter
        let data = try JSONSerialization.data(withJSONObject: payload)

        let fixture = try JSONDecoder().decode(ChapterFixture.self, from: data)

        XCTAssertEqual(fixture.chapter.coreSummary, "")
        XCTAssertEqual(fixture.chapter.id, "chapter-ai-agent-business")
    }

    func testDecodesLegacyChapterWithInvalidCoreSummaryType() throws {
        var payload = try completedChapterPayload()
        var chapter = try XCTUnwrap(payload["chapter"] as? [String: Any])
        chapter["coreSummary"] = ["legacy": true]
        payload["chapter"] = chapter
        let data = try JSONSerialization.data(withJSONObject: payload)

        let fixture = try JSONDecoder().decode(ChapterFixture.self, from: data)

        XCTAssertEqual(fixture.chapter.coreSummary, "")
        XCTAssertEqual(fixture.chapter.id, "chapter-ai-agent-business")
    }

    func testDecodesChapterResponseShape() throws {
        let data = try fixtureData(named: "failed-chapter")
        let fixture = try JSONDecoder().decode(ChapterFixture.self, from: data)
        let responseData = try JSONEncoder().encode(ChapterResponse(chapter: fixture.chapter))

        let response = try JSONDecoder().decode(ChapterResponse.self, from: responseData)

        XCTAssertEqual(response.chapter.id, fixture.chapter.id)
        XCTAssertTrue(response.chapter.status.isFailed)
    }

    func testParsesLongTextChapterInput() {
        let input = ChapterInput.parse("  这是一段足够长的普通文本，用来测试粘贴正文的添加流程。  ")

        XCTAssertEqual(input.sourceType, .text)
        XCTAssertEqual(input.rawText, "这是一段足够长的普通文本，用来测试粘贴正文的添加流程。")
        XCTAssertNil(input.sourceUrl)
        XCTAssertTrue(input.canSubmit)
    }

    func testParsesArticleURLChapterInput() {
        let input = ChapterInput.parse("https://example.com/article")

        XCTAssertEqual(input.sourceType, .articleLink)
        XCTAssertEqual(input.sourceUrl, "https://example.com/article")
        XCTAssertNil(input.rawText)
        XCTAssertTrue(input.canSubmit)
    }

    func testParsesVideoURLChapterInput() {
        let input = ChapterInput.parse("https://www.youtube.com/watch?v=abc123")

        XCTAssertEqual(input.sourceType, .videoLink)
        XCTAssertEqual(input.sourceUrl, "https://www.youtube.com/watch?v=abc123")
        XCTAssertNil(input.rawText)
        XCTAssertTrue(input.canSubmit)
    }

    func testTreatsNonHTTPURLChapterInputAsInvalidLink() {
        let input = ChapterInput.parse("ftp://example.com/article")

        XCTAssertEqual(input.sourceType, .text)
        XCTAssertEqual(input.rawText, "ftp://example.com/article")
        XCTAssertNil(input.sourceUrl)
        XCTAssertEqual(input.validationError, .invalidLinkFormat)
        XCTAssertFalse(input.canSubmit)
    }

    func testTreatsLinkLikeInputsWithoutHTTPSchemeAsInvalidLink() {
        let values = [
            "mp.weixin.qq.com/s/abc",
            "www.example.com/a",
            "http//example.com/a",
            "https:/example.com/a"
        ]

        for value in values {
            let input = ChapterInput.parse(value)

            XCTAssertEqual(input.sourceType, .text, value)
            XCTAssertEqual(input.rawText, value, value)
            XCTAssertNil(input.sourceUrl, value)
            XCTAssertEqual(input.validationError, .invalidLinkFormat, value)
            XCTAssertFalse(input.canSubmit, value)
        }
    }

    func testParsesShortTextChapterInputAsTextTooShort() {
        let input = ChapterInput.parse("短文本")

        XCTAssertEqual(input.sourceType, .text)
        XCTAssertEqual(input.rawText, "短文本")
        XCTAssertNil(input.sourceUrl)
        XCTAssertNil(input.validationError)
        XCTAssertFalse(input.canSubmit)
    }

    func testTreatsMixedTextAndURLChapterInputAsText() {
        let input = ChapterInput.parse("请学习这篇文章 https://example.com/article")

        XCTAssertEqual(input.sourceType, .text)
        XCTAssertEqual(input.rawText, "请学习这篇文章 https://example.com/article")
        XCTAssertNil(input.sourceUrl)
        XCTAssertNil(input.validationError)
    }

    func testDecodesNotificationsResponseShape() throws {
        let data = try fixtureData(named: "completed-chapter")
        let fixture = try JSONDecoder().decode(ChapterFixture.self, from: data)
        let notification = try XCTUnwrap(fixture.notification)
        let responseData = try JSONEncoder().encode(NotificationsResponse(notifications: [notification]))

        let response = try JSONDecoder().decode(NotificationsResponse.self, from: responseData)

        XCTAssertEqual(response.notifications.count, 1)
        XCTAssertEqual(response.notifications[0].chapterId, fixture.chapter.id)
    }

    func testDecodesNotificationReadResponseShape() throws {
        var notification = try completedChapterNotification()
        notification.read = true
        let responseData = try JSONEncoder().encode(NotificationMutationResponse(notification: notification))

        let response = try JSONDecoder().decode(NotificationMutationResponse.self, from: responseData)

        XCTAssertTrue(response.notification.read)
        XCTAssertFalse(response.notification.dismissed)
    }

    func testDecodesNotificationDismissResponseShape() throws {
        var notification = try completedChapterNotification()
        notification.read = true
        notification.dismissed = true
        let responseData = try JSONEncoder().encode(NotificationMutationResponse(notification: notification))

        let response = try JSONDecoder().decode(NotificationMutationResponse.self, from: responseData)

        XCTAssertTrue(response.notification.read)
        XCTAssertTrue(response.notification.dismissed)
    }

    func testDecodesSuccessfulChapterMutationResponseShape() throws {
        let data = try fixtureData(named: "completed-chapter")
        let fixture = try JSONDecoder().decode(ChapterFixture.self, from: data)
        let responseData = try JSONEncoder().encode(
            ChapterMutationResponse(status: .completed, chapter: fixture.chapter, notification: fixture.notification, message: "")
        )

        let response = try JSONDecoder().decode(ChapterMutationResponse.self, from: responseData)

        XCTAssertEqual(response.status, .completed)
        XCTAssertEqual(response.chapter.id, fixture.chapter.id)
        XCTAssertEqual(response.notification?.chapterId, fixture.chapter.id)
    }

    func testDecodesFailedChapterMutationResponseShape() throws {
        let data = try fixtureData(named: "failed-chapter")
        let fixture = try JSONDecoder().decode(ChapterFixture.self, from: data)
        let notification = NotificationItem(
            id: "notification-failed",
            chapterId: fixture.chapter.id,
            type: .generationFailed,
            title: "生成失败",
            body: "点击查看原因",
            read: false,
            dismissed: false,
            createdAt: "2026-05-17T00:00:00Z"
        )
        let responseData = try JSONEncoder().encode(
            ChapterMutationResponse(status: fixture.chapter.status, chapter: fixture.chapter, notification: notification, message: fixture.chapter.failureReason)
        )

        let response = try JSONDecoder().decode(ChapterMutationResponse.self, from: responseData)

        XCTAssertTrue(response.chapter.status.isFailed)
        XCTAssertEqual(response.notification?.type, .generationFailed)
    }

    func testEncodesTextChapterCreateRequestShape() throws {
        let input = ChapterInput.parse("这是一段足够长的输入内容，用于生成一个新的复习章节。")
        let data = try JSONEncoder().encode(ChapterCreateRequest(input: input))
        let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        XCTAssertEqual(payload?["sourceType"] as? String, "text")
        XCTAssertEqual(payload?["rawText"] as? String, input.rawText)
        XCTAssertNil(payload?["sourceUrl"])
    }

    func testEncodesArticleLinkChapterCreateRequestShape() throws {
        let input = ChapterInput.parse("https://example.com/article")
        let data = try JSONEncoder().encode(ChapterCreateRequest(input: input))
        let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        XCTAssertEqual(payload?["sourceType"] as? String, "article_link")
        XCTAssertNil(payload?["rawText"])
        XCTAssertEqual(payload?["sourceUrl"] as? String, "https://example.com/article")
    }

    func testEncodesVideoLinkChapterCreateRequestShape() throws {
        let input = ChapterInput.parse("https://www.youtube.com/watch?v=abc123")
        let data = try JSONEncoder().encode(ChapterCreateRequest(input: input))
        let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        XCTAssertEqual(payload?["sourceType"] as? String, "video_link")
        XCTAssertNil(payload?["rawText"])
        XCTAssertEqual(payload?["sourceUrl"] as? String, "https://www.youtube.com/watch?v=abc123")
    }

    func testDecodesChapterDeletionResponseShape() throws {
        let responseData = try JSONEncoder().encode(ChapterDeletionResponse(deleted: true, chapterId: "chapter-1"))

        let response = try JSONDecoder().decode(ChapterDeletionResponse.self, from: responseData)

        XCTAssertTrue(response.deleted)
        XCTAssertEqual(response.chapterId, "chapter-1")
    }

    func testDecodesReviewSessionResponseShape() throws {
        var fixture = try completedChapterFixture()
        let active = try activeReviewSessionFixture()
        fixture.chapter.reviewSession = active.reviewSession
        let question = try XCTUnwrap(fixture.chapter.questions.first { $0.id == active.currentQuestionId })
        let responseData = try JSONEncoder().encode(
            ReviewSessionResponse(chapter: fixture.chapter, reviewSession: active.reviewSession, currentQuestion: question)
        )

        let response = try JSONDecoder().decode(ReviewSessionResponse.self, from: responseData)

        XCTAssertEqual(response.chapter.id, fixture.chapter.id)
        XCTAssertEqual(response.reviewSession?.id, active.reviewSession.id)
        XCTAssertEqual(response.currentQuestion?.id, active.currentQuestionId)
    }

    func testDecodesAttemptResponseWithActiveSessionShape() throws {
        var fixture = try completedChapterFixture()
        let active = try activeReviewSessionFixture()
        fixture.chapter.reviewSession = active.reviewSession
        let attempt = try XCTUnwrap(active.reviewSession.attempts.first)
        let question = try XCTUnwrap(fixture.chapter.questions.first { $0.id == active.currentQuestionId })
        let responseData = try JSONEncoder().encode(
            AttemptResponse(chapter: fixture.chapter, reviewSession: active.reviewSession, attempt: attempt, currentQuestion: question)
        )

        let response = try JSONDecoder().decode(AttemptResponse.self, from: responseData)

        XCTAssertEqual(response.reviewSession.status, .active)
        XCTAssertEqual(response.attempt.id, attempt.id)
        XCTAssertNotNil(response.currentQuestion)
    }

    func testDecodesAttemptResponseWithCompletedSessionShape() throws {
        var fixture = try completedChapterFixture()
        var active = try activeReviewSessionFixture()
        active.reviewSession.status = .completed
        active.reviewSession.completedAt = "2026-05-17T00:00:00Z"
        fixture.chapter.reviewSession = active.reviewSession
        let attempt = try XCTUnwrap(active.reviewSession.attempts.first)
        let responseData = try JSONEncoder().encode(
            AttemptResponse(chapter: fixture.chapter, reviewSession: active.reviewSession, attempt: attempt, currentQuestion: nil)
        )

        let response = try JSONDecoder().decode(AttemptResponse.self, from: responseData)

        XCTAssertEqual(response.reviewSession.status, .completed)
        XCTAssertNil(response.currentQuestion)
    }

    func testDecodesFeedbackResponseShape() throws {
        var fixture = try completedChapterFixture()
        let active = try activeReviewSessionFixture()
        fixture.chapter.reviewSession = active.reviewSession
        let question = try XCTUnwrap(fixture.chapter.questions.first)
        let feedback = QuestionFeedback(
            id: "feedback-1",
            questionId: question.id,
            knowledgePointId: question.knowledgePointId,
            chapterId: fixture.chapter.id,
            reviewSessionId: active.reviewSession.id,
            feedbackType: .unclear,
            severity: "severe",
            actionTaken: "removed_from_pool",
            invalidatedAttemptId: active.reviewSession.attempts.first?.id ?? "",
            createdAt: "2026-05-17T00:00:00Z"
        )
        let responseData = try JSONEncoder().encode(
            FeedbackResponse(chapter: fixture.chapter, feedback: feedback, reviewSession: active.reviewSession)
        )

        let response = try JSONDecoder().decode(FeedbackResponse.self, from: responseData)

        XCTAssertEqual(response.feedback.feedbackType, .unclear)
        XCTAssertTrue(response.feedback.feedbackType.isSevere)
        XCTAssertEqual(response.reviewSession?.id, active.reviewSession.id)
    }

    private func fixtureData(named name: String) throws -> Data {
        let url = try XCTUnwrap(
            Bundle.main.url(forResource: name, withExtension: "json")
                ?? Bundle(for: Self.self).url(forResource: name, withExtension: "json")
        )
        return try Data(contentsOf: url)
    }

    private func completedChapterPayload() throws -> [String: Any] {
        let data = try fixtureData(named: "completed-chapter")
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    private func completedChapterFixture() throws -> ChapterFixture {
        let data = try fixtureData(named: "completed-chapter")
        return try JSONDecoder().decode(ChapterFixture.self, from: data)
    }

    private func completedChapterNotification() throws -> NotificationItem {
        let fixture = try completedChapterFixture()
        return try XCTUnwrap(fixture.notification)
    }

    private func activeReviewSessionFixture() throws -> ActiveReviewSessionFixture {
        let data = try fixtureData(named: "active-review-session")
        return try JSONDecoder().decode(ActiveReviewSessionFixture.self, from: data)
    }
}

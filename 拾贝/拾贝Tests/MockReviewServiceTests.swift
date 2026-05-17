import XCTest
@testable import 拾贝

final class MockReviewServiceTests: XCTestCase {
    func testCorrectAnswerAddsMasteryAndCompletesSingleQuestionChapter() {
        let service = MockReviewService()
        var chapter = makeChapter(pointCount: 1, questionsPerPoint: 1)
        let session = service.startOrResumeSession(for: chapter)
        chapter.reviewSession = session

        let result = service.submitAttempt(
            chapter: chapter,
            session: session,
            answer: "B",
            result: .correct
        )

        XCTAssertEqual(result.attempt.masteryScoreBefore, 50)
        XCTAssertEqual(result.attempt.masteryScoreAfter, 65)
        XCTAssertEqual(result.session.status, .completed)
        XCTAssertEqual(result.session.masteredThisRoundPointIds, ["point-1"])
    }

    func testIncorrectAnswerSchedulesReinforcementAfterThreeOtherQuestions() {
        let service = MockReviewService()
        var chapter = makeChapter(pointCount: 5, questionsPerPoint: 2)
        let session = service.startOrResumeSession(for: chapter)
        chapter.reviewSession = session

        let result = service.submitAttempt(
            chapter: chapter,
            session: session,
            answer: "A",
            result: .incorrect
        )

        XCTAssertEqual(result.attempt.masteryScoreAfter, 30)
        XCTAssertEqual(result.session.reinforcementQueue, ["point-1"])
        XCTAssertTrue(result.session.queue[4].isReinforcement)
        XCTAssertEqual(result.session.queue[4].pointId, "point-1")
    }

    func testUnknownAnswerUsesSameReinforcementPathAsIncorrect() {
        let service = MockReviewService()
        var chapter = makeChapter(pointCount: 4, questionsPerPoint: 2)
        let session = service.startOrResumeSession(for: chapter)
        chapter.reviewSession = session

        let result = service.submitAttempt(
            chapter: chapter,
            session: session,
            answer: nil,
            result: .unknown
        )

        XCTAssertEqual(result.attempt.masteryScoreAfter, 30)
        XCTAssertEqual(result.session.reinforcementQueue, ["point-1"])
        XCTAssertTrue(result.session.queue.contains { $0.isReinforcement && $0.pointId == "point-1" })
    }

    func testCorrectReinforcementRemovesFutureReinforcementAndCompletesWhenAllPointsMastered() {
        let service = MockReviewService()
        var chapter = makeChapter(pointCount: 2, questionsPerPoint: 2)
        var session = service.startOrResumeSession(for: chapter)
        chapter.reviewSession = session

        var first = service.submitAttempt(chapter: chapter, session: session, answer: "A", result: .incorrect).chapter
        session = first.reviewSession!

        first.reviewSession!.currentQueueIndex = 1
        let second = service.submitAttempt(chapter: first, session: first.reviewSession!, answer: "B", result: .correct).chapter

        var beforeReinforcement = second
        beforeReinforcement.reviewSession!.currentQueueIndex = 2
        let reinforced = service.submitAttempt(
            chapter: beforeReinforcement,
            session: beforeReinforcement.reviewSession!,
            answer: "B",
            result: .correct
        )

        XCTAssertEqual(reinforced.attempt.masteryScoreAfter, 40)
        XCTAssertTrue(reinforced.attempt.isReinforcement)
        XCTAssertTrue(reinforced.session.reinforcementQueue.isEmpty)
        XCTAssertEqual(reinforced.session.status, .completed)
    }

    func testSevereFeedbackInvalidatesAttemptAndRemovesQuestion() {
        let service = MockReviewService()
        var chapter = makeChapter(pointCount: 2, questionsPerPoint: 2)
        let session = service.startOrResumeSession(for: chapter)
        chapter.reviewSession = session
        let attempted = service.submitAttempt(chapter: chapter, session: session, answer: "A", result: .incorrect).chapter

        let result = service.submitFeedback(
            chapter: attempted,
            session: attempted.reviewSession!,
            questionId: "question-1-1",
            type: .answerWrong
        )

        XCTAssertTrue(result.chapter.removedQuestionIds.contains("question-1-1"))
        XCTAssertEqual(result.chapter.reviewSession?.attempts.first?.invalidatedByFeedback, true)
        XCTAssertEqual(result.chapter.reviewSession?.masteryByPointId["point-1"], 50)
    }

    private func makeChapter(pointCount: Int, questionsPerPoint: Int) -> Chapter {
        let now = "2026-05-17T00:00:00.000Z"
        let chapterId = "chapter-test"
        let source = ChapterSource(
            type: .text,
            title: "测试章节",
            url: "",
            accountOrDomain: "",
            rawInput: "测试内容",
            extractedText: "测试内容",
            chapterId: chapterId
        )
        let points = (1...pointCount).map { index in
            KnowledgePoint(
                id: "point-\(index)",
                chapterId: chapterId,
                title: "知识点 \(index)",
                summary: "摘要 \(index)",
                keyClaim: "主张 \(index)",
                knowledgeType: .method,
                sourceSnippet: "来源 \(index)",
                sourceQuote: "来源 \(index)",
                testabilityScore: 5,
                masteryScore: 50,
                answeredCount: 0,
                lastReviewedAt: nil,
                lastDecayAppliedAt: nil,
                createdAt: now,
                updatedAt: now
            )
        }
        let questions = points.flatMap { point in
            (1...questionsPerPoint).map { questionIndex in
                ReviewQuestion(
                    id: "question-\(point.id.split(separator: "-").last!)-\(questionIndex)",
                    chapterId: chapterId,
                    knowledgePointId: point.id,
                    pointId: point.id,
                    pointTitle: point.title,
                    type: .multipleChoice,
                    stem: "题干",
                    options: [
                        QuestionOption(id: "A", text: "错误"),
                        QuestionOption(id: "B", text: "正确")
                    ],
                    correctOptionId: "B",
                    correctUnderstanding: "正确理解",
                    commonMisconception: "常见误区",
                    sourceSnippet: point.sourceSnippet,
                    sourceQuote: point.sourceQuote,
                    difficulty: "medium",
                    qualityScore: nil,
                    qualityIssues: []
                )
            }
        }

        return Chapter(
            id: chapterId,
            title: "测试章节",
            status: .completed,
            displayStatusText: "已生成",
            failureReason: "",
            source: source,
            sourceType: .text,
            sourceText: source.extractedText,
            knowledgePoints: points,
            filteredKnowledgePoints: [],
            questions: questions,
            qualitySummary: nil,
            generationMeta: nil,
            reviewSession: nil,
            masteredPoints: 0,
            removedQuestionIds: [],
            downgradedQuestionIds: [],
            feedbackRecords: [],
            dismissedFromNotifications: false,
            createdAt: now,
            updatedAt: now
        )
    }
}

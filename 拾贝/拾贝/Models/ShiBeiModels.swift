import Foundation

enum ChapterStatus: String, Codable {
    case submitted
    case extractingContent = "extracting_content"
    case generatingPoints = "generating_points"
    case generatingQuestions = "generating_questions"
    case qualityChecking = "quality_checking"
    case autoRegeneratingQuestions = "auto_regenerating_questions"
    case completed
    case failedExtractArticle = "failed_extract_article"
    case failedExtractVideo = "failed_extract_video"
    case failedPoints = "failed_points"
    case failedQuestions = "failed_questions"
    case failedNoQualifiedQuestions = "failed_no_qualified_questions"

    var isProcessing: Bool {
        switch self {
        case .submitted, .extractingContent, .generatingPoints, .generatingQuestions, .qualityChecking, .autoRegeneratingQuestions:
            true
        default:
            false
        }
    }

    var isFailed: Bool {
        switch self {
        case .failedExtractArticle, .failedExtractVideo, .failedPoints, .failedQuestions, .failedNoQualifiedQuestions:
            true
        default:
            false
        }
    }

    var displayText: String {
        switch self {
        case .completed:
            "已生成"
        case .submitted:
            "已提交"
        case .extractingContent:
            "正在提取正文"
        case .generatingPoints:
            "正在生成知识点"
        case .generatingQuestions:
            "正在生成题目"
        case .qualityChecking:
            "正在检查题目质量"
        case .autoRegeneratingQuestions:
            "正在重新生成题目"
        case .failedExtractArticle:
            "文章正文提取失败"
        case .failedExtractVideo:
            "当前暂未接入视频文本提取"
        case .failedPoints:
            "暂时没能提取出可复习知识点"
        case .failedQuestions, .failedNoQualifiedQuestions:
            "暂时没能生成可复习题目"
        }
    }
}

enum SourceType: String, Codable {
    case text
    case articleLink = "article_link"
    case wechatArticle = "wechat_article"
    case videoLink = "video_link"

    var label: String {
        switch self {
        case .text:
            "粘贴文字"
        case .articleLink:
            "网页文章"
        case .wechatArticle:
            "公众号文章"
        case .videoLink:
            "视频链接"
        }
    }
}

enum KnowledgeType: String, Codable {
    case concept
    case judgment
    case method
    case scenario
    case counterexample
    case comparison
    case step
}

enum QuestionType: String, Codable {
    case multipleChoice = "multiple_choice"
    case trueFalse = "true_false"
    case scenarioJudgment = "scenario_judgment"
}

enum ReviewSessionStatus: String, Codable {
    case active
    case completed
    case abandoned
}

enum AttemptResult: String, Codable {
    case correct
    case incorrect
    case unknown
}

enum FeedbackType: String, Codable, Identifiable, CaseIterable {
    case answerWrong = "answer_wrong"
    case tooEasy = "too_easy"
    case unclear
    case unrelatedToSource = "unrelated_to_source"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .answerWrong:
            "答案不准"
        case .unclear:
            "题目看不懂"
        case .unrelatedToSource:
            "和来源无关"
        case .tooEasy:
            "太简单"
        }
    }

    var isSevere: Bool {
        self != .tooEasy
    }
}

enum NotificationType: String, Codable {
    case generationCompleted = "generation_completed"
    case generationFailed = "generation_failed"
}

struct ChapterSource: Codable, Hashable {
    var type: SourceType
    var title: String
    var url: String
    var accountOrDomain: String
    var rawInput: String
    var extractedText: String
    var chapterId: String
}

struct KnowledgePoint: Codable, Identifiable, Hashable {
    var id: String
    var chapterId: String
    var title: String
    var summary: String
    var keyClaim: String
    var knowledgeType: KnowledgeType
    var sourceSnippet: String
    var sourceQuote: String
    var testabilityScore: Int
    var masteryScore: Int
    var answeredCount: Int
    var lastReviewedAt: String?
    var lastDecayAppliedAt: String?
    var createdAt: String
    var updatedAt: String
}

struct QuestionOption: Codable, Identifiable, Hashable {
    var id: String
    var text: String
}

struct QualitySummary: Codable, Hashable {
    var averageQualityScore: Double?
    var questionCoverageRate: Double?
}

struct GenerationMeta: Codable, Hashable {
    var currentStage: String?
    var qualifiedQuestionCount: Int?
    var failedStage: String?
    var failureReason: String?
}

struct ReviewQuestion: Codable, Identifiable, Hashable {
    var id: String
    var chapterId: String
    var knowledgePointId: String
    var pointId: String
    var pointTitle: String
    var type: QuestionType
    var stem: String
    var options: [QuestionOption]
    var correctOptionId: String
    var correctUnderstanding: String
    var commonMisconception: String
    var sourceSnippet: String
    var sourceQuote: String?
    var difficulty: String
    var qualityScore: [String: Double]?
    var qualityIssues: [String]
    var confidenceLevel: String? = nil

    var sourceText: String {
        sourceQuote ?? sourceSnippet
    }
}

struct ReviewQueueItem: Codable, Identifiable, Hashable {
    var id: String
    var pointId: String
    var questionId: String
    var isReinforcement: Bool
}

struct ReviewAttempt: Codable, Identifiable, Hashable {
    var id: String
    var reviewSessionId: String
    var chapterId: String
    var knowledgePointId: String
    var questionId: String
    var answer: String
    var result: AttemptResult
    var isReinforcement: Bool
    var masteryScoreBefore: Int
    var masteryScoreAfter: Int
    var invalidatedByFeedback: Bool
    var skippedDueToQuestionFeedback: Bool
    var answeredAt: String
}

struct ReviewSession: Codable, Identifiable, Hashable {
    var id: String
    var chapterId: String
    var status: ReviewSessionStatus
    var queue: [ReviewQueueItem]
    var reinforcementQueue: [String]
    var currentQueueIndex: Int
    var attempts: [ReviewAttempt]
    var masteryByPointId: [String: Int]
    var answeredPointIds: [String]
    var masteredThisRoundPointIds: [String]
    var skippedPointIds: [String]
    var createdAt: String
    var updatedAt: String
    var completedAt: String?
}

struct QuestionFeedback: Codable, Identifiable, Hashable {
    var id: String
    var questionId: String
    var knowledgePointId: String
    var chapterId: String
    var reviewSessionId: String
    var feedbackType: FeedbackType
    var severity: String
    var actionTaken: String
    var invalidatedAttemptId: String
    var createdAt: String
}

struct FeedbackSheetContext: Identifiable, Equatable {
    let questionId: String

    var id: String {
        questionId
    }
}

struct NotificationItem: Codable, Identifiable, Hashable {
    var id: String
    var chapterId: String
    var type: NotificationType
    var title: String
    var body: String
    var read: Bool
    var dismissed: Bool
    var createdAt: String
}

struct Chapter: Codable, Identifiable, Hashable {
    var id: String
    var title: String
    var status: ChapterStatus
    var displayStatusText: String
    var failureReason: String
    var source: ChapterSource
    var sourceType: SourceType
    var sourceText: String
    var knowledgePoints: [KnowledgePoint]
    var filteredKnowledgePoints: [KnowledgePoint]
    var questions: [ReviewQuestion]
    var qualitySummary: QualitySummary?
    var generationMeta: GenerationMeta?
    var reviewSession: ReviewSession?
    var masteredPoints: Int
    var removedQuestionIds: [String]
    var downgradedQuestionIds: [String]
    var feedbackRecords: [QuestionFeedback]
    var dismissedFromNotifications: Bool
    var createdAt: String
    var updatedAt: String

    var visibleStatusText: String {
        displayStatusText.isEmpty ? status.displayText : displayStatusText
    }

    var reviewableQuestions: [ReviewQuestion] {
        questions.filter { !removedQuestionIds.contains($0.id) }
    }
}

struct ChapterFixture: Codable {
    var chapter: Chapter
    var notification: NotificationItem?
}

struct ActiveReviewSessionFixture: Codable {
    var chapterId: String
    var reviewSession: ReviewSession
    var currentQuestionId: String
}

struct EmptyStateFixture: Codable {
    var chapters: [Chapter]
    var notifications: [NotificationItem]
    var activeHomeChapterId: String?
}

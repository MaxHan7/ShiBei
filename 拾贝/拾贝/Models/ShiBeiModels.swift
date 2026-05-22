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
            "正在检查题目质量"
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
    var structureRole: String? = nil
    var importanceScore: Int? = nil
    var coverageReason: String? = nil
    var sourceSnippet: String
    var sourceQuote: String
    var sourceOrder: Int?
    var sourceStartOffset: Int?
    var sourceEndOffset: Int?
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

struct TrustDiagnostics: Codable, Hashable {
    var answerGroundingScore: Double?
    var explanationFaithfulnessScore: Double?
    var contextRelevanceScore: Double?
    var misconceptionSupportScore: Double?
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
    var sourceOrder: Int?
    var sourceStartOffset: Int?
    var sourceEndOffset: Int?
    var difficulty: String
    var qualityScore: [String: Double]?
    var qualityIssues: [String]
    var trustDiagnostics: TrustDiagnostics? = nil
    var confidenceReasons: [String]? = nil
    var blockingReasons: [String]? = nil
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
    var coreSummary: String?
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

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case status
        case displayStatusText
        case failureReason
        case source
        case sourceType
        case sourceText
        case coreSummary
        case knowledgePoints
        case filteredKnowledgePoints
        case questions
        case qualitySummary
        case generationMeta
        case reviewSession
        case masteredPoints
        case removedQuestionIds
        case downgradedQuestionIds
        case feedbackRecords
        case dismissedFromNotifications
        case createdAt
        case updatedAt
    }

    init(
        id: String,
        title: String,
        status: ChapterStatus,
        displayStatusText: String,
        failureReason: String,
        source: ChapterSource,
        sourceType: SourceType,
        sourceText: String,
        coreSummary: String? = nil,
        knowledgePoints: [KnowledgePoint],
        filteredKnowledgePoints: [KnowledgePoint],
        questions: [ReviewQuestion],
        qualitySummary: QualitySummary?,
        generationMeta: GenerationMeta?,
        reviewSession: ReviewSession?,
        masteredPoints: Int,
        removedQuestionIds: [String],
        downgradedQuestionIds: [String],
        feedbackRecords: [QuestionFeedback],
        dismissedFromNotifications: Bool,
        createdAt: String,
        updatedAt: String
    ) {
        self.id = id
        self.title = title
        self.status = status
        self.displayStatusText = displayStatusText
        self.failureReason = failureReason
        self.source = source
        self.sourceType = sourceType
        self.sourceText = sourceText
        self.coreSummary = coreSummary
        self.knowledgePoints = knowledgePoints
        self.filteredKnowledgePoints = filteredKnowledgePoints
        self.questions = questions
        self.qualitySummary = qualitySummary
        self.generationMeta = generationMeta
        self.reviewSession = reviewSession
        self.masteredPoints = masteredPoints
        self.removedQuestionIds = removedQuestionIds
        self.downgradedQuestionIds = downgradedQuestionIds
        self.feedbackRecords = feedbackRecords
        self.dismissedFromNotifications = dismissedFromNotifications
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        title = try container.decode(String.self, forKey: .title)
        status = try container.decode(ChapterStatus.self, forKey: .status)
        displayStatusText = try container.decode(String.self, forKey: .displayStatusText)
        failureReason = try container.decode(String.self, forKey: .failureReason)
        source = try container.decode(ChapterSource.self, forKey: .source)
        sourceType = try container.decode(SourceType.self, forKey: .sourceType)
        sourceText = try container.decode(String.self, forKey: .sourceText)
        coreSummary = container.decodeLossyOptionalString(forKey: .coreSummary)
        knowledgePoints = try container.decode([KnowledgePoint].self, forKey: .knowledgePoints)
        filteredKnowledgePoints = try container.decode([KnowledgePoint].self, forKey: .filteredKnowledgePoints)
        questions = try container.decode([ReviewQuestion].self, forKey: .questions)
        qualitySummary = try container.decodeIfPresent(QualitySummary.self, forKey: .qualitySummary)
        generationMeta = try container.decodeIfPresent(GenerationMeta.self, forKey: .generationMeta)
        reviewSession = try container.decodeIfPresent(ReviewSession.self, forKey: .reviewSession)
        masteredPoints = try container.decode(Int.self, forKey: .masteredPoints)
        removedQuestionIds = try container.decode([String].self, forKey: .removedQuestionIds)
        downgradedQuestionIds = try container.decode([String].self, forKey: .downgradedQuestionIds)
        feedbackRecords = try container.decode([QuestionFeedback].self, forKey: .feedbackRecords)
        dismissedFromNotifications = try container.decode(Bool.self, forKey: .dismissedFromNotifications)
        createdAt = try container.decode(String.self, forKey: .createdAt)
        updatedAt = try container.decode(String.self, forKey: .updatedAt)
    }
}

private extension KeyedDecodingContainer {
    func decodeLossyOptionalString(forKey key: Key) -> String? {
        (try? decodeIfPresent(String.self, forKey: key)) ?? ""
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

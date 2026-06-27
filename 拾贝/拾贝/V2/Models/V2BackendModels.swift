import Foundation

struct V2CreateChapterRequest: Encodable {
    let clientRequestId: String
    let sourceType: String
    let sourceUrl: String?
    let sourceTitle: String?
    let rawText: String?
}

struct V2CreateChapterResponse: Decodable {
    let status: String
    let chapter: V2BackendChapter
    let generationProgress: V2BackendGenerationProgress?
    let job: V2BackendGenerationJob?
    let reused: Bool?
    let message: String?
}

struct V2BackendChapterResponse: Decodable {
    let chapter: V2BackendChapter
}

struct V2BackendChaptersResponse: Decodable {
    let chapters: [V2BackendChapter]
}

struct V2RecommendedArticlesResponse: Decodable {
    let filters: [V2RecommendedArticleFilter]
    let articles: [V2RecommendedArticleItem]
}

struct V2RecommendedArticleDetailResponse: Decodable {
    let article: V2RecommendedArticleItem
    let chapter: V2BackendChapter
}

struct V2RecommendedArticleFilter: Decodable, Identifiable, Equatable {
    let id: String
    let title: String
}

struct V2RecommendedArticleItem: Decodable, Identifiable, Equatable {
    let id: String
    let title: String
    let source: String
    let sourceUrl: String?
    let sourceAuthor: String?
    let tags: [String]
    let description: String?
    let hasPreparedChapter: Bool?
}

struct V2ReviewSessionResponse: Decodable {
    let chapter: V2BackendChapter
    let reviewSession: V2BackendReviewSession?
}

struct V2BackendGenerationJob: Decodable, Equatable {
    let id: String?
    let status: String?
}

struct V2BackendGenerationProgress: Decodable, Equatable {
    let jobId: String?
    let chapterId: String?
    let status: String?
    let stage: String?
    let stageGroup: String?
    let displayText: String?
    let progress: Double?
    let retryCount: Int?
    let userVisible: Bool?
    let unitIndex: Int?
    let unitTitle: String?
    let attempt: Int?
    let maxAttempts: Int?
    let canRetry: Bool?
    let failureCode: String?
    let failureMessage: String?

    var isFinished: Bool {
        status == "completed" || status == "failed"
    }

    var displayTextOrFallback: String {
        if let mappedText = userFacingStageText {
            return mappedText
        }
        if let displayText, !displayText.isEmpty {
            return displayText.v2TruncatedProgressText(maxCharacters: 12)
        }
        switch status {
        case "completed": return "生成完成"
        case "failed": return "生成失败"
        default: return "正在生成"
        }
    }

    private var userFacingStageText: String? {
        switch status {
        case "completed":
            return "生成完成"
        case "failed":
            return "生成失败"
        case "retrying":
            return "正在重试生成"
        default:
            break
        }

        switch stage {
        case "accepted":
            return "准备生成"
        case "extracting_source":
            return "正在提取原文"
        case "planning_review_path":
            return "正在分析文章"
        case "mapping_knowledge":
            return "正在整理知识点"
        case "planning_practice":
            return "正在设计练习"
        case "generating_questions":
            return "正在生成题目"
        case "generating_unit_copy", "finalizing":
            return "正在整理结果"
        case "retry_wait":
            return "正在重试生成"
        default:
            break
        }

        switch stageGroup {
        case "intake":
            return "准备生成"
        case "source":
            return "正在提取原文"
        case "planning":
            return "正在分析文章"
        case "knowledge":
            return "正在整理知识点"
        case "practice":
            return "正在设计练习"
        case "questions":
            return "正在生成题目"
        case "copy", "saving":
            return "正在整理结果"
        case "retry":
            return "正在重试生成"
        default:
            return nil
        }
    }
}

extension String {
    var v2ISO8601Date: Date? {
        V2ISO8601DateParsers.fractional.date(from: self)
            ?? V2ISO8601DateParsers.standard.date(from: self)
    }

    func v2TruncatedProgressText(maxCharacters: Int) -> String {
        guard count > maxCharacters else {
            return self
        }
        return String(prefix(maxCharacters)) + "..."
    }
}

private enum V2ISO8601DateParsers {
    static let fractional: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    static let standard = ISO8601DateFormatter()
}

struct V2BackendChapter: Decodable, Equatable {
    let schemaVersion: String?
    let id: String
    let title: String
    let status: String
    let displayStatusText: String?
    let failureReason: String?
    let source: V2BackendSource?
    let summaryCard: V2BackendSummaryCard?
    let units: [V2BackendUnit]?
    let chapterSummary: V2BackendChapterSummary?
    let generationProgress: V2BackendGenerationProgress?
    let v2ReviewSession: V2BackendReviewSession?
}

extension V2BackendChapter: Identifiable {}

extension V2BackendChapter {
    func replacingReviewSession(_ reviewSession: V2BackendReviewSession?) -> V2BackendChapter {
        V2BackendChapter(
            schemaVersion: schemaVersion,
            id: id,
            title: title,
            status: status,
            displayStatusText: displayStatusText,
            failureReason: failureReason,
            source: source,
            summaryCard: summaryCard,
            units: units,
            chapterSummary: chapterSummary,
            generationProgress: generationProgress,
            v2ReviewSession: reviewSession
        )
    }
}

struct V2BackendReviewSession: Codable, Equatable {
    let schemaVersion: String
    let id: String
    let chapterId: String
    let status: String
    let currentCard: V2BackendReviewCard
    let questionStates: [String: V2BackendQuestionState]
    let completedStepIds: [String]
    let sourceRoute: V2BackendSourceRoute?
    let createdAt: String
    let updatedAt: String
    let completedAt: String?
}

struct V2BackendReviewCard: Codable, Equatable {
    let type: String
    let chapterId: String
    let unitId: String?
    let questionId: String?
}

struct V2BackendQuestionState: Codable, Equatable {
    let status: String
    let result: String?
    let selectedOptionId: String?
    let matchedPairs: [V2BackendMatchedPair]
    let lockedPairIds: [String]
    let feedbackVisible: Bool
    let answeredAt: String?
}

struct V2BackendMatchedPair: Codable, Equatable {
    let leftId: String
    let rightId: String
}

struct V2BackendSourceRoute: Codable, Equatable {
    let entry: String?
    let sourceAnchorId: String?
    let returnCard: V2BackendReviewCard?
    let openedAt: String?
}

struct V2AnswerQuestionRequest: Encodable {
    let unitId: String
    let questionId: String
    let result: String
    let selectedOptionId: String?
    let matchedPairs: [V2BackendMatchedPair]
    let lockedPairIds: [String]
}

struct V2FeedbackVisibilityRequest: Encodable {
    let questionId: String
    let visible: Bool
}

struct V2SourceOpenRequest: Encodable {
    let sourceAnchorId: String?
    let entry: String
}

struct V2BackendSource: Decodable, Equatable {
    let type: String?
    let title: String?
    let author: String?
    let account: String?
    let accountOrDomain: String?
    let url: String?
    let rawText: String?
    let cleanedText: String?
    let rawInput: String?
    let extractedText: String?
    let blocks: [V2BackendSourceBlock]?
}

struct V2BackendSourceBlock: Decodable, Equatable {
    let id: String
    let type: String?
    let text: String
}

struct V2BackendSummaryCard: Decodable, Equatable {
    let text: String?
    let note: String?
}

struct V2BackendChapterSummary: Decodable, Equatable {
    let title: String?
    let statsText: String?
    let encouragementText: String?
}

struct V2BackendUnit: Decodable, Equatable {
    let id: String
    let order: Int?
    let title: String
    let nodeLabel: String?
    let shortSummary: String?
    let detailSummary: String?
    let why: String?
    let sourceAnchor: V2BackendSourceAnchor?
    let overview: V2BackendUnitOverview?
    let questions: [V2BackendQuestion]?
    let summary: V2BackendUnitSummary?
}

struct V2BackendSourceAnchor: Decodable, Equatable {
    let id: String?
    let label: String?
    let blockIds: [String]?
    let quote: String?
}

struct V2BackendUnitOverview: Decodable, Equatable {
    let text: String?
}

struct V2BackendUnitSummary: Decodable, Equatable {
    let title: String?
    let text: String?
}

struct V2BackendQuestion: Decodable, Equatable {
    let id: String
    let type: String
    let stem: String?
    let options: [V2BackendOption]?
    let correctOptionId: String?
    let leftItems: [V2BackendOption]?
    let rightItems: [V2BackendOption]?
    let pairs: [V2BackendPair]?
    let explanation: String?
    let sourceAnchorId: String?
}

struct V2BackendOption: Decodable, Equatable {
    let id: String
    let text: String
}

struct V2BackendPair: Decodable, Equatable {
    let leftId: String
    let rightId: String
}

extension V2BackendChapter {
    var progress: V2BackendGenerationProgress? {
        generationProgress
    }

    var questionCount: Int {
        (units ?? []).reduce(0) { $0 + ($1.questions?.count ?? 0) }
    }

    var sourceLabel: String {
        if isWechatSource {
            return "微信公众号"
        }

        switch source?.type {
        case "article_link":
            return "网页文章"
        case "video_link":
            return "视频"
        default:
            return "粘贴文字"
        }
    }

    private var isWechatSource: Bool {
        if source?.type == "wechat_article" {
            return true
        }

        guard let rawURL = source?.url ?? source?.rawInput,
              let host = URL(string: rawURL)?.host?.lowercased() else {
            return false
        }
        return host == "mp.weixin.qq.com"
    }

    func toReviewChapterData() -> V2ReviewChapterData? {
        guard let units, !units.isEmpty else {
            return nil
        }

        let sourceBlocks = sourceBodyBlocks()
        return V2ReviewChapterData(
            title: title,
            overview: summaryCard?.text ?? "",
            sourceTitle: source?.title ?? title,
            sourceAuthor: sourceDisplayAuthor,
            sourceURL: source?.url ?? "",
            sourceBody: sourceBlocks,
            units: units.enumerated().map { index, unit in
                unit.toReviewUnitData(index: index, sourceBlocks: sourceBlocks)
            }
        )
    }

    private var sourceDisplayAuthor: String {
        let candidates = [
            source?.author,
            source?.accountOrDomain,
            source?.account,
            source?.title,
            source?.url.flatMap { URL(string: $0)?.host?.replacingOccurrences(of: "www.", with: "") }
        ]
        return candidates
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .first { !$0.isEmpty } ?? "未知来源"
    }

    private func sourceBodyBlocks() -> [V2SourceArticleBlock] {
        if let blocks = source?.blocks, !blocks.isEmpty {
            return blocks.map { block in
                V2SourceArticleBlock(
                    id: block.id,
                    kind: block.kind,
                    text: block.text
                )
            }
        }

        let body = source?.cleanedText ?? source?.extractedText ?? source?.rawText ?? source?.rawInput ?? ""
        let paragraphs = body
            .components(separatedBy: CharacterSet.newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        return paragraphs.enumerated().map { index, text in
            V2SourceArticleBlock(
                id: "source-paragraph-\(index + 1)",
                kind: .paragraph,
                text: text
            )
        }
    }
}

private extension V2BackendSourceBlock {
    var kind: V2SourceArticleBlock.Kind {
        switch type {
        case "heading", "title":
            return .heading
        case "quote":
            return .quote
        default:
            return .paragraph
        }
    }
}

private extension V2BackendUnit {
    func toReviewUnitData(index: Int, sourceBlocks: [V2SourceArticleBlock]) -> V2ReviewUnitData {
        V2ReviewUnitData(
            id: id,
            title: title,
            overview: overview?.text ?? detailSummary ?? shortSummary ?? "",
            questions: (questions ?? []).map { question in
                question.toReviewQuestionData(unitTitle: title, sourceExcerpt: sourceExcerpt(in: sourceBlocks, for: question))
            },
            completionMessage: summary?.text ?? ""
        )
    }

    private func sourceExcerpt(in sourceBlocks: [V2SourceArticleBlock], for question: V2BackendQuestion) -> String {
        if let quote = sourceAnchor?.quote, !quote.isEmpty {
            return quote
        }
        guard let blockIds = sourceAnchor?.blockIds, !blockIds.isEmpty else {
            return detailSummary ?? shortSummary ?? ""
        }
        let selected = sourceBlocks.filter { blockIds.contains($0.id) }.map(\.text)
        return selected.joined(separator: "\n")
    }
}

private extension V2BackendQuestion {
    func toReviewQuestionData(unitTitle: String, sourceExcerpt: String) -> V2ReviewQuestionData {
        let kind: V2QuestionKind = type == "matching" ? .matching : .multipleChoice
        let optionTexts = options?.map(\.text) ?? []
        let correctIndex = options?.firstIndex { $0.id == correctOptionId }

        return V2ReviewQuestionData(
            id: id,
            kind: kind,
            title: kind == .matching ? "连线理解" : "理解练习",
            prompt: stem ?? "",
            options: optionTexts,
            correctOptionIndex: correctIndex,
            matchingPairs: matchingPairs,
            feedback: explanation ?? "",
            sourceAnchorId: sourceAnchorId,
            sourceExcerpt: sourceExcerpt
        )
    }

    private var matchingPairs: [V2MatchingPairData] {
        guard let leftItems, let rightItems, let pairs else {
            return []
        }
        let leftById = Dictionary(uniqueKeysWithValues: leftItems.map { ($0.id, $0.text) })
        let rightById = Dictionary(uniqueKeysWithValues: rightItems.map { ($0.id, $0.text) })
        return pairs.enumerated().compactMap { index, pair in
            guard let left = leftById[pair.leftId],
                  let right = rightById[pair.rightId] else {
                return nil
            }
            return V2MatchingPairData(id: "pair-\(index + 1)", left: left, right: right)
        }
    }
}

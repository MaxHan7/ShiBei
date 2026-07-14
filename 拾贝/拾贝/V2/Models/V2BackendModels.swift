import Foundation

struct V2CreateChapterRequest: Encodable {
    let clientRequestId: String
    let sourceType: String
    let sourceUrl: String?
    let sourceTitle: String?
    let rawText: String?
    let generationLanguage: String
}

struct SourcePreflightRequest: Encodable {
    let input: String
    let fetchMetadata: Bool
}

struct SourcePreflightResponse: Decodable, Equatable {
    let ok: Bool
    let inputKind: String
    let sourceType: String
    let platform: String?
    let platformLabel: String?
    let provider: String?
    let canGenerate: Bool
    let title: String?
    let durationSeconds: Double?
    let maxDurationSeconds: Double?
    let reasonCode: String?
    let userMessage: String
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
    let localizedTitle: [String: String]?

    func title(language: AppLanguage) -> String {
        localizedRecommendedText(localizedTitle, language: language, fallback: title)
    }
}

struct V2RecommendedArticleItem: Decodable, Identifiable, Equatable {
    let id: String
    let title: String
    let localizedTitle: [String: String]?
    let source: String
    let localizedSource: [String: String]?
    let sourceUrl: String?
    let sourceAuthor: String?
    let coverImageUrl: String?
    let tags: [String]
    let tagIDs: [String]?
    let description: String?
    let localizedDescription: [String: String]?
    let hasPreparedChapter: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case localizedTitle
        case source
        case localizedSource
        case sourceUrl
        case sourceAuthor
        case coverImageUrl
        case tags
        case tagIDs = "tagIds"
        case description
        case localizedDescription
        case hasPreparedChapter
    }

    var effectiveTagIDs: [String] {
        let ids = (tagIDs ?? []).map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        if !ids.isEmpty {
            return ids
        }
        return tags.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
    }

    func title(language: AppLanguage) -> String {
        localizedRecommendedText(localizedTitle, language: language, fallback: title)
    }

    func source(language: AppLanguage) -> String {
        localizedRecommendedText(localizedSource, language: language, fallback: source)
    }

    func description(language: AppLanguage) -> String? {
        let fallback = description ?? ""
        let value = localizedRecommendedText(localizedDescription, language: language, fallback: fallback)
        return value.isEmpty ? nil : value
    }
}

private func localizedRecommendedText(
    _ values: [String: String]?,
    language: AppLanguage,
    fallback: String
) -> String {
    if let text = values?[language.rawValue]?.trimmingCharacters(in: .whitespacesAndNewlines),
       !text.isEmpty {
        return text
    }
    if let text = values?[AppLanguage.zhHans.rawValue]?.trimmingCharacters(in: .whitespacesAndNewlines),
       !text.isEmpty {
        return text
    }
    if let text = values?[AppLanguage.en.rawValue]?.trimmingCharacters(in: .whitespacesAndNewlines),
       !text.isEmpty {
        return text
    }
    if let text = values?.values.first?.trimmingCharacters(in: .whitespacesAndNewlines),
       !text.isEmpty {
        return text
    }
    return fallback
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
        displayTextOrFallback(language: .zhHans)
    }

    func displayTextOrFallback(language: AppLanguage) -> String {
        if let mappedText = userFacingStageText {
            return mappedText(language)
        }
        if let displayText, !displayText.isEmpty {
            return displayText.v2TruncatedProgressText(maxCharacters: 12)
        }
        switch status {
        case "completed": return L10n.string("generation.progress.completed", language: language)
        case "failed": return L10n.string("generation.progress.failed", language: language)
        default: return L10n.string("generation.progress.generating", language: language)
        }
    }

    private var userFacingStageText: ((AppLanguage) -> String)? {
        switch status {
        case "completed":
            return { L10n.string("generation.progress.completed", language: $0) }
        case "failed":
            return { L10n.string("generation.progress.failed", language: $0) }
        case "retrying":
            return { L10n.string("generation.progress.retrying", language: $0) }
        default:
            break
        }

        switch stage {
        case "accepted":
            return { L10n.string("generation.progress.accepted", language: $0) }
        case "extracting_source":
            return { L10n.string("generation.progress.extracting_source", language: $0) }
        case "planning_review_path":
            return { L10n.string("generation.progress.planning", language: $0) }
        case "mapping_knowledge":
            return { L10n.string("generation.progress.knowledge", language: $0) }
        case "planning_practice":
            return { L10n.string("generation.progress.practice", language: $0) }
        case "generating_questions":
            return { L10n.string("generation.progress.questions", language: $0) }
        case "generating_unit_copy", "finalizing":
            return { L10n.string("generation.progress.finalizing", language: $0) }
        case "retry_wait":
            return { L10n.string("generation.progress.retrying", language: $0) }
        default:
            break
        }

        switch stageGroup {
        case "intake":
            return { L10n.string("generation.progress.accepted", language: $0) }
        case "source":
            return { L10n.string("generation.progress.extracting_source", language: $0) }
        case "planning":
            return { L10n.string("generation.progress.planning", language: $0) }
        case "knowledge":
            return { L10n.string("generation.progress.knowledge", language: $0) }
        case "practice":
            return { L10n.string("generation.progress.practice", language: $0) }
        case "questions":
            return { L10n.string("generation.progress.questions", language: $0) }
        case "copy", "saving":
            return { L10n.string("generation.progress.finalizing", language: $0) }
        case "retry":
            return { L10n.string("generation.progress.retrying", language: $0) }
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
    let v2ReviewCompletedAt: String?
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
            v2ReviewSession: reviewSession,
            v2ReviewCompletedAt: v2ReviewCompletedAt
        )
    }

    var hasCompletedV2ReviewOnce: Bool {
        if let completedAt = v2ReviewCompletedAt?.trimmingCharacters(in: .whitespacesAndNewlines),
           !completedAt.isEmpty {
            return true
        }
        return v2ReviewSession?.completedAt != nil
    }
}

struct V2BackendReviewSession: Codable, Equatable {
    let schemaVersion: String
    let id: String
    let chapterId: String
    let status: String
    let currentCard: V2BackendReviewCard
    let activeCard: V2BackendReviewCard?
    let questionStates: [String: V2BackendQuestionState]
    let activeQuestionStates: [String: V2BackendQuestionState]?
    let completedStepIds: [String]
    let mode: String?
    let practice: V2BackendPracticeSession?
    let sourceRoute: V2BackendSourceRoute?
    let createdAt: String
    let updatedAt: String
    let completedAt: String?

    var displayCard: V2BackendReviewCard {
        activeCard ?? currentCard
    }

    var displayQuestionStates: [String: V2BackendQuestionState] {
        activeQuestionStates ?? questionStates
    }
}

struct V2BackendPracticeSession: Codable, Equatable {
    let id: String
    let mode: String
    let startUnitId: String
    let status: String
    let currentCard: V2BackendReviewCard
    let questionStates: [String: V2BackendQuestionState]
    let completedStepIds: [String]
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

struct V2FocusUnitRequest: Encodable {
    let unitId: String
}

struct V2PracticeStartRequest: Encodable {
    let unitId: String
}

struct V2ReplayFromUnitRequest: Encodable {
    let unitId: String
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
    let platform: String?
    let url: String?
    let rawText: String?
    let cleanedText: String?
    let rawInput: String?
    let extractedText: String?
    let blocks: [V2BackendSourceBlock]?
    let contentBasis: V2BackendSourceContentBasis?

    init(
        type: String? = nil,
        title: String? = nil,
        author: String? = nil,
        account: String? = nil,
        accountOrDomain: String? = nil,
        platform: String? = nil,
        url: String? = nil,
        rawText: String? = nil,
        cleanedText: String? = nil,
        rawInput: String? = nil,
        extractedText: String? = nil,
        blocks: [V2BackendSourceBlock]? = nil,
        contentBasis: V2BackendSourceContentBasis? = nil
    ) {
        self.type = type
        self.title = title
        self.author = author
        self.account = account
        self.accountOrDomain = accountOrDomain
        self.platform = platform
        self.url = url
        self.rawText = rawText
        self.cleanedText = cleanedText
        self.rawInput = rawInput
        self.extractedText = extractedText
        self.blocks = blocks
        self.contentBasis = contentBasis
    }
}

struct V2BackendSourceBlock: Decodable, Equatable {
    let id: String
    let type: String?
    let text: String
    let sourceRole: String?
    let startSeconds: Double?
    let endSeconds: Double?
}

struct V2BackendSourceContentBasis: Decodable, Equatable {
    let basis: String?
    let message: String?
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
        sourceLabel(language: .zhHans)
    }

    func sourceLabel(language: AppLanguage) -> String {
        let sourceURL = Self.firstNonEmpty(source?.url, source?.rawInput)
        return Self.sourceLabel(
            type: source?.type,
            platform: source?.platform,
            url: sourceURL,
            language: language
        )
    }

    static func sourceLabel(type: String?, platform: String?, url: String?) -> String {
        sourceLabel(type: type, platform: platform, url: url, language: .zhHans)
    }

    static func sourceLabel(type: String?, platform: String?, url: String?, language: AppLanguage) -> String {
        if isWechatSource(type: type, url: url) {
            return L10n.string("source.wechat_article", language: language)
        }

        let normalizedType = type?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let normalizedPlatform = normalizedVideoPlatform(platform) ?? inferredVideoPlatform(from: url)
        if normalizedType == "video_link" || normalizedPlatform != nil {
            return videoSourceLabel(for: normalizedPlatform, language: language)
        }

        if normalizedType == "article_link" || isHTTPURL(url) {
            return L10n.string("source.article_link", language: language)
        }

        return L10n.string("source.text", language: language)
    }

    private var isWechatSource: Bool {
        Self.isWechatSource(type: source?.type, url: Self.firstNonEmpty(source?.url, source?.rawInput))
    }

    private static func isWechatSource(type: String?, url: String?) -> Bool {
        if type == "wechat_article" {
            return true
        }

        guard let host = host(from: url) else {
            return false
        }
        return host == "mp.weixin.qq.com"
    }

    private static func videoSourceLabel(for platform: String?) -> String {
        videoSourceLabel(for: platform, language: .zhHans)
    }

    private static func videoSourceLabel(for platform: String?, language: AppLanguage) -> String {
        switch platform {
        case "douyin":
            return L10n.string("source.video.douyin", language: language)
        case "xiaohongshu":
            return L10n.string("source.video.xiaohongshu", language: language)
        case "youtube":
            return L10n.string("source.video.youtube", language: language)
        case "bilibili":
            return L10n.string("source.video.bilibili", language: language)
        case "direct_video_file":
            return L10n.string("source.video.file", language: language)
        case "generic_web":
            return L10n.string("source.video.web", language: language)
        default:
            return L10n.string("source.video", language: language)
        }
    }

    private static func normalizedVideoPlatform(_ platform: String?) -> String? {
        let value = platform?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? ""
        switch value {
        case "":
            return nil
        case "douyin", "抖音":
            return "douyin"
        case "xiaohongshu", "xhs", "redbook", "red_book", "小红书":
            return "xiaohongshu"
        case "youtube", "yt", "youtu.be":
            return "youtube"
        case "bilibili", "bili", "b站", "哔哩哔哩":
            return "bilibili"
        case "direct_video_file", "video_file":
            return "direct_video_file"
        case "generic_web", "web_video":
            return "generic_web"
        default:
            return value
        }
    }

    private static func inferredVideoPlatform(from url: String?) -> String? {
        guard let host = host(from: url) else {
            return nil
        }

        if host == "v.douyin.com" || host.hasSuffix(".douyin.com") || host == "douyin.com" {
            return "douyin"
        }
        if host == "xiaohongshu.com" || host.hasSuffix(".xiaohongshu.com") || host == "xhslink.com" || host.hasSuffix(".xhslink.com") {
            return "xiaohongshu"
        }
        if host == "youtu.be" || host == "youtube.com" || host.hasSuffix(".youtube.com") {
            return "youtube"
        }
        if host == "b23.tv" || host == "bilibili.com" || host.hasSuffix(".bilibili.com") {
            return "bilibili"
        }

        return nil
    }

    private static func isHTTPURL(_ url: String?) -> Bool {
        guard let url, let scheme = URL(string: url)?.scheme?.lowercased() else {
            return false
        }
        return scheme == "http" || scheme == "https"
    }

    private static func host(from url: String?) -> String? {
        guard let rawURL = url?.trimmingCharacters(in: .whitespacesAndNewlines),
              !rawURL.isEmpty else {
            return nil
        }
        if let host = URL(string: rawURL)?.host?.lowercased() {
            return host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
        }
        if let firstURL = firstHTTPURLString(in: rawURL),
           let host = URL(string: firstURL)?.host?.lowercased() {
            return host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
        }
        return nil
    }

    private static func firstHTTPURLString(in value: String) -> String? {
        guard let matchRange = value.range(
            of: #"https?://\S+"#,
            options: [.regularExpression, .caseInsensitive]
        ) else {
            return nil
        }

        return String(value[matchRange]).trimmingCharacters(in: CharacterSet(charactersIn: ".,;:!?，。；：！？)]}）】》」』\"'"))
    }

    private static func firstNonEmpty(_ values: String?...) -> String? {
        values.first { value in
            value?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
        } ?? nil
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
            contentBasis: source?.contentBasis?.toReviewContentBasis(),
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
                    text: block.text,
                    sourceRole: block.sourceRole,
                    startSeconds: block.startSeconds,
                    endSeconds: block.endSeconds
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

private extension V2BackendSourceContentBasis {
    func toReviewContentBasis() -> V2SourceContentBasis? {
        guard let basis, let message, !basis.isEmpty, !message.isEmpty else {
            return nil
        }
        return V2SourceContentBasis(basis: basis, message: message)
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

import Foundation

enum V2AppRoute: Equatable {
    case notifications
    case notificationFailureDetail
    case profile
    case generatingChapterDetail
    case chapterDetail
    case sourceArticle
    case recommendedArticle
    case chapterOverview
    case unitOverview(unitID: String)
    case question(unitID: String, questionID: String)
    case savedQuestion(index: Int)
    case savedBackendQuestion(favoriteID: String)
    case unitSummary(unitID: String)
    case chapterSummary
}

enum V2QuestionKind {
    case multipleChoice
    case matching
}

enum V2QuestionOptionState {
    case normal
    case correct
    case wrong
}

enum V2MatchingOptionState {
    case normal
    case selected
    case correct
    case wrong
    case locked
}

enum V2MatchingSide: Equatable {
    case left
    case right
}

struct V2MatchingSelection: Equatable {
    let side: V2MatchingSide
    let pairID: String
}

struct V2MultipleChoiceInteractionState: Equatable {
    var selectedIndex: Int?
    var isFavoriteSaved = false
    var feedbackPanelVisible = true
}

struct V2MatchingInteractionState: Equatable {
    var selected: V2MatchingSelection?
    var leftStates: [String: V2MatchingOptionState] = [:]
    var rightStates: [String: V2MatchingOptionState] = [:]
    var isFavoriteSaved = false
    var feedbackPanelVisible = true
}

struct V2QuestionInteractionState: Equatable {
    var multipleChoice = V2MultipleChoiceInteractionState()
    var matching = V2MatchingInteractionState()
}

enum V2ChapterReviewStatus {
    case generating
    case notStarted
    case reviewing
    case completed

    var title: String {
        switch self {
        case .generating: "生成中"
        case .notStarted: "未复习"
        case .reviewing: "复习中"
        case .completed: "已完成"
        }
    }

    var foregroundColor: V2ColorValue {
        switch self {
        case .generating: V2ColorValue(hex: 0x469CFF)
        case .notStarted: V2ColorValue(hex: 0x878787)
        case .reviewing: V2ColorValue(hex: 0xC08D26)
        case .completed: V2ColorValue(hex: 0x98A84E)
        }
    }

    var backgroundColor: V2ColorValue {
        switch self {
        case .generating: V2ColorValue(hex: 0xC7E1FF)
        case .notStarted: V2ColorValue(hex: 0xE9E9E9)
        case .reviewing: V2ColorValue(hex: 0xFCEDC4)
        case .completed: V2ColorValue(hex: 0xE8EBBD)
        }
    }
}

struct V2ColorValue: Equatable {
    let hex: UInt
}

struct V2ReviewChapterData {
    let title: String
    let overview: String
    let sourceTitle: String
    let sourceAuthor: String
    let sourceURL: String
    let sourceBody: [V2SourceArticleBlock]
    let units: [V2ReviewUnitData]
}

struct V2SourceArticleBlock: Identifiable, Equatable {
    enum Kind: Equatable {
        case heading
        case paragraph
        case quote
    }

    let id: String
    let kind: Kind
    let text: String
}

struct V2ReviewUnitData: Identifiable, Equatable {
    let id: String
    let title: String
    let overview: String
    let questions: [V2ReviewQuestionData]
    let completionMessage: String
}

struct V2ReviewQuestionData: Identifiable, Equatable {
    let id: String
    let kind: V2QuestionKind
    let title: String
    let prompt: String
    let options: [String]
    let correctOptionIndex: Int?
    let matchingPairs: [V2MatchingPairData]
    let feedback: String
    let sourceExcerpt: String
}

struct V2MatchingPairData: Identifiable, Equatable {
    let id: String
    let left: String
    let right: String
}

struct V2SavedQuestionData: Identifiable, Equatable {
    let id: String
    let unitID: String
    let questionID: String
    let title: String
    let source: String
    let type: String
}

struct V2SavedQuestionDisplayItem: Identifiable, Equatable {
    let id: String
    let chapterID: String
    let chapterTitle: String
    let unitID: String
    let unitTitle: String
    let questionID: String
    let title: String
    let source: String
    let type: String
}

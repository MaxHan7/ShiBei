import Foundation

enum V2AppRoute: Equatable {
    case notifications
    case profile
    case chapterDetail
    case sourceArticle
    case recommendedArticle
    case chapterOverview
    case unitOverview(unitID: String)
    case question(unitID: String, questionID: String)
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

struct V2ReviewChapterData {
    let title: String
    let overview: String
    let sourceTitle: String
    let units: [V2ReviewUnitData]
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

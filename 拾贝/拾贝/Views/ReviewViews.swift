import SwiftUI

struct ReviewView: View {
    @ObservedObject var store: AppStore
    @State private var selectedOptionId: String?
    @State private var revealedCorrectOptionId: String?

    var body: some View {
        AppScaffold(store: store, title: "", showsTopBar: false, showsTabBar: false) {
            if store.isFavoriteReviewActive, let question = store.currentFavoriteQuestion() {
                FavoriteReviewContent(store: store, question: question)
            } else if let question = store.currentQuestion(), let chapter = store.selectedChapter, let session = chapter.reviewSession {
                VStack(spacing: 0) {
                    ReviewTopBar(store: store, chapter: chapter, session: session)
                    ScrollView {
                        VStack(spacing: 30) {
                            ProgressBar(progress: ReviewProgressSnapshot(chapter: chapter, session: session).ratio)
                            SBCard {
                                StatusPill(text: store.localizedFormat("review.point_prefix", question.pointTitle))
                                Text(question.stem)
                                    .font(.system(size: 23, weight: .bold))
                                    .lineSpacing(4)
                                VStack(spacing: 12) {
                                    ForEach(question.options) { option in
                                        OptionButton(
                                            option: option,
                                            correctOptionId: revealedCorrectOptionId,
                                            selectedOptionId: selectedOptionId
                                        ) {
                                            guard selectedOptionId == nil, !store.isSubmittingReview else { return }
                                            selectedOptionId = option.id
                                            revealedCorrectOptionId = question.correctOptionId
                                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                                                Task {
                                                    await store.submitAttempt(answer: option.id, result: option.id == question.correctOptionId ? .correct : .incorrect)
                                                    selectedOptionId = nil
                                                    revealedCorrectOptionId = nil
                                                }
                                            }
                                        }
                                    }
                                    Button {
                                        guard selectedOptionId == nil, !store.isSubmittingReview else { return }
                                        revealedCorrectOptionId = question.correctOptionId
                                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                                            Task {
                                                await store.submitAttempt(answer: nil, result: .unknown)
                                                revealedCorrectOptionId = nil
                                            }
                                        }
                                    } label: {
                                        Text(store.localized("review.forgot"))
                                            .font(.system(size: 15, weight: .medium))
                                            .foregroundStyle(ShiBeiTheme.muted)
                                            .frame(maxWidth: .infinity, minHeight: 44)
                                            .contentShape(Rectangle())
                                    }
                                    .buttonStyle(.plain)
                                    .disabled(selectedOptionId != nil || store.isSubmittingReview)
                                    .opacity(selectedOptionId != nil || store.isSubmittingReview ? 0.45 : 1)
                                    .padding(.top, 2)
                                }
                            }
                        }
                        .padding(24)
                        .padding(.bottom, 110)
                    }
                }
            } else {
                SummaryView(store: store)
            }
        }
    }

}

private struct FavoriteReviewContent: View {
    @ObservedObject var store: AppStore
    let question: ReviewQuestion
    @State private var selectedOptionId: String?
    @State private var revealedCorrectOptionId: String?

    var body: some View {
        VStack(spacing: 0) {
            FavoriteReviewTopBar(store: store)
            ScrollView {
                VStack(spacing: 30) {
                    ProgressBar(progress: favoriteProgress)
                    SBCard {
                        StatusPill(text: store.localizedFormat("review.point_prefix", question.pointTitle))
                        Text(question.stem)
                            .font(.system(size: 23, weight: .bold))
                            .lineSpacing(4)
                        VStack(spacing: 12) {
                            ForEach(question.options) { option in
                                OptionButton(
                                    option: option,
                                    correctOptionId: revealedCorrectOptionId,
                                    selectedOptionId: selectedOptionId
                                ) {
                                    guard selectedOptionId == nil else { return }
                                    selectedOptionId = option.id
                                    revealedCorrectOptionId = question.correctOptionId
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                                        store.submitFavoriteAttempt(question: question)
                                        selectedOptionId = nil
                                        revealedCorrectOptionId = nil
                                    }
                                }
                            }
                            Button {
                                guard selectedOptionId == nil else { return }
                                revealedCorrectOptionId = question.correctOptionId
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                                    store.submitFavoriteAttempt(question: question)
                                    revealedCorrectOptionId = nil
                                }
                            } label: {
                                Text(store.localized("review.forgot"))
                                    .font(.system(size: 15, weight: .medium))
                                    .foregroundStyle(ShiBeiTheme.muted)
                                    .frame(maxWidth: .infinity, minHeight: 44)
                                    .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .disabled(selectedOptionId != nil)
                            .opacity(selectedOptionId != nil ? 0.45 : 1)
                            .padding(.top, 2)
                        }
                    }
                }
                .padding(24)
                .padding(.bottom, 110)
            }
        }
    }

    private var favoriteProgress: Double {
        guard !store.favoriteReviewQuestionIds.isEmpty else { return 0 }
        return Double(store.favoriteReviewIndex + 1) / Double(store.favoriteReviewQuestionIds.count)
    }
}

private struct FavoriteReviewTopBar: View {
    @ObservedObject var store: AppStore

    var body: some View {
        HStack {
            Button {
                store.exitReviewToHome()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 18, weight: .bold))
                    .frame(width: 42, height: 42)
            }
            .accessibilityLabel(store.localized("review.close"))
            Spacer()
            VStack(spacing: 4) {
                Text(store.localized("favorites.review_title"))
                    .font(.system(size: 20, weight: .bold))
                Text("\(store.favoriteReviewIndex + 1) / \(max(1, store.favoriteReviewQuestionIds.count))")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(ShiBeiTheme.muted)
            }
            Spacer()
            Color.clear.frame(width: 42, height: 42)
        }
        .padding(.horizontal, 18)
        .frame(height: 66)
    }
}

private struct ReviewTopBar: View {
    @ObservedObject var store: AppStore
    let chapter: Chapter
    let session: ReviewSession

    private var progress: ReviewProgressSnapshot {
        ReviewProgressSnapshot(chapter: chapter, session: session)
    }

    var body: some View {
        HStack {
            Button {
                store.exitReviewToHome()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 18, weight: .bold))
                    .frame(width: 42, height: 42)
            }
            .accessibilityLabel(store.localized("review.close"))
            Spacer()
            VStack(spacing: 4) {
                Text(store.localized("review.in_progress"))
                    .font(.system(size: 20, weight: .bold))
                Text("\(progress.completed) / \(progress.total)")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(ShiBeiTheme.muted)
            }
            Spacer()
            Color.clear.frame(width: 42, height: 42)
        }
        .padding(.horizontal, 18)
        .frame(height: 66)
    }
}

private struct ReviewProgressSnapshot {
    let completed: Int
    let total: Int

    var ratio: Double {
        guard total > 0 else { return 0 }
        return Double(completed) / Double(total)
    }

    init(chapter: Chapter, session: ReviewSession) {
        let reviewableQuestionIds = Set(chapter.reviewableQuestions.map(\.id))
        let queuePointIds = Set(session.queue.compactMap { item -> String? in
            guard !session.skippedPointIds.contains(item.pointId),
                  reviewableQuestionIds.contains(item.questionId) else {
                return nil
            }
            return item.pointId
        })
        let fallbackPointIds = Set(chapter.reviewableQuestions.map(\.knowledgePointId))
            .subtracting(session.skippedPointIds)
        let requiredPointIds = queuePointIds.isEmpty ? fallbackPointIds : queuePointIds

        total = max(1, requiredPointIds.count)
        completed = requiredPointIds.filter { session.masteredThisRoundPointIds.contains($0) }.count
    }
}

private struct OptionButton: View {
    let option: QuestionOption
    let correctOptionId: String?
    let selectedOptionId: String?
    let action: () -> Void

    private var isCorrect: Bool {
        correctOptionId == option.id
    }

    private var isWrong: Bool {
        selectedOptionId == option.id && correctOptionId != nil && !isCorrect
    }

    var body: some View {
        Button(action: action) {
            HStack(alignment: .top, spacing: 12) {
                Text(isCorrect ? "✓" : option.id)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(isCorrect ? .white : ShiBeiTheme.primary)
                    .frame(width: 26, height: 26)
                    .background(isCorrect ? ShiBeiTheme.success : .clear)
                    .clipShape(Circle())
                Text(option.text)
                    .font(.system(size: 16))
                    .foregroundStyle(isWrong ? Color(red: 0.545, green: 0.102, blue: 0.071) : ShiBeiTheme.text)
                    .multilineTextAlignment(.leading)
                    .lineSpacing(3)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(16)
            .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
            .background(isCorrect ? Color(red: 0.914, green: 0.973, blue: 0.937) : isWrong ? Color(red: 1, green: 0.941, blue: 0.933) : .white)
            .overlay(
                RoundedRectangle(cornerRadius: ShiBeiTheme.radius, style: .continuous)
                    .stroke(isCorrect ? ShiBeiTheme.success.opacity(0.35) : isWrong ? Color.red.opacity(0.35) : ShiBeiTheme.line, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: ShiBeiTheme.radius, style: .continuous))
            .shadow(color: .black.opacity(0.04), radius: 10, y: 5)
        }
        .disabled(correctOptionId != nil)
    }
}

struct ExplanationView: View {
    @ObservedObject var store: AppStore

    var body: some View {
        let question = store.lastAnsweredQuestion ?? store.currentQuestion()
        AppScaffold(store: store, title: "", showsTopBar: false, showsTabBar: false) {
            if let question {
                VStack(spacing: 0) {
                    if store.isFavoriteExplanationActive {
                        FavoriteReviewTopBar(store: store)
                    } else if let chapter = store.selectedChapter {
                        ReviewTopBar(store: store, chapter: chapter, session: chapter.reviewSession ?? emptySession)
                    }
                    ScrollView {
                        VStack(spacing: 18) {
                            HStack {
                                Spacer()
                                Button {
                                    Task {
                                        await store.toggleFavoriteQuestion(question)
                                    }
                                } label: {
                                    Image(systemName: store.isFavoriteQuestion(question) ? "star.fill" : "star")
                                        .font(.system(size: 22, weight: .semibold))
                                        .foregroundStyle(store.isFavoriteQuestion(question) ? ShiBeiTheme.yellow : ShiBeiTheme.text)
                                        .frame(width: 44, height: 44)
                                        .background(ShiBeiTheme.card)
                                        .clipShape(Circle())
                                        .shadow(color: .black.opacity(0.05), radius: 10, y: 5)
                                }
                                .accessibilityLabel(store.isFavoriteQuestion(question) ? store.localized("favorites.remove") : store.localized("favorites.add"))
                            }
                            VStack(spacing: 10) {
                                Text(question.correctOptionId)
                                    .font(.system(size: 34, weight: .black))
                                    .frame(width: 76, height: 76)
                                    .background(ShiBeiTheme.yellow)
                                    .clipShape(Circle())
                                Text(store.localized("review.correct_answer"))
                                    .foregroundStyle(ShiBeiTheme.muted)
                            }
                            ExplanationCard(title: store.localized("explanation.correct_understanding"), systemImage: "asterisk", text: question.correctUnderstanding)
                            ExplanationCard(title: store.localized("explanation.common_misconception"), systemImage: "exclamationmark", text: "• \(question.commonMisconception)")
                            ExplanationCard(title: store.localized("explanation.source_snippet"), systemImage: "text.quote", text: question.sourceText, warm: true)
                            VStack(spacing: 12) {
                                Button {
                                    store.openSource(returnTo: .explanation, focusText: question.sourceText)
                                } label: {
                                    Label(store.localized("explanation.view_full_source"), systemImage: "link")
                                        .font(.system(size: 15, weight: .semibold))
                                        .padding(.horizontal, 18)
                                        .padding(.vertical, 11)
                                        .background(ShiBeiTheme.primary.opacity(0.1))
                                        .clipShape(Capsule())
                                }

                                if !store.isFavoriteExplanationActive {
                                    Button(store.localized("explanation.report_problem")) {
                                        store.selectedFeedbackQuestionId = question.id
                                        store.feedbackSheetContext = FeedbackSheetContext(questionId: question.id)
                                    }
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(ShiBeiTheme.muted)
                                }
                            }
                            .foregroundStyle(ShiBeiTheme.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.top, 8)
                        }
                        .padding(24)
                        .padding(.bottom, 120)
                    }
                    VStack {
                        PrimaryButton(title: continueTitle, systemImage: "arrow.right") {
                            store.nextQuestion()
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 30)
                    .background(
                        LinearGradient(colors: [ShiBeiTheme.surface.opacity(0), ShiBeiTheme.surface], startPoint: .top, endPoint: .bottom)
                    )
                }
            }
        }
    }

    private var emptySession: ReviewSession {
        ReviewSession(id: "", chapterId: "", status: .active, queue: [], reinforcementQueue: [], currentQueueIndex: 0, attempts: [], masteryByPointId: [:], answeredPointIds: [], masteredThisRoundPointIds: [], skippedPointIds: [], createdAt: "", updatedAt: "", completedAt: nil)
    }

    private var continueTitle: String {
        if store.isFavoriteExplanationActive {
            return store.favoriteReviewIndex >= store.favoriteReviewQuestionIds.count - 1 ? store.localized("favorites.back_to_entry") : store.localized("home.action.continue_review")
        }
        return store.selectedChapter?.reviewSession?.status == .completed ? store.localized("explanation.view_summary") : store.localized("home.action.continue_review")
    }
}

private struct ExplanationCard: View {
    let title: String
    let systemImage: String
    let text: String
    var warm = false

    var body: some View {
        SBCard(padding: 20) {
            HStack {
                Image(systemName: systemImage)
                Text(title)
                    .font(.system(size: 18, weight: .bold))
            }
            VStack(alignment: .leading, spacing: 10) {
                ForEach(Array(paragraphs.enumerated()), id: \.offset) { _, paragraph in
                    Text(paragraph)
                        .font(.system(size: 15))
                        .foregroundStyle(ShiBeiTheme.muted)
                        .lineSpacing(5)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
        .background(warm ? Color(red: 1, green: 0.969, blue: 0.910) : .clear)
    }

    private var paragraphs: [String] {
        let normalized = text
            .replacingOccurrences(of: "\r\n", with: "\n")
            .replacingOccurrences(of: "\r", with: "\n")
        let blocks = normalized
            .components(separatedBy: "\n\n")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        return blocks.isEmpty ? [text] : blocks
    }
}

struct FeedbackSheet: View {
    @ObservedObject var store: AppStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 18) {
            if store.latestFeedbackMessage.isEmpty {
                Text(store.localized("feedback.title"))
                    .font(.system(size: 22, weight: .bold))
                ForEach(FeedbackType.allCases) { type in
                    Button {
                        Task {
                            await store.submitFeedback(type)
                        }
                    } label: {
                        HStack {
                            Text(type.label(language: store.appLanguage))
                            Spacer()
                            Image(systemName: "arrow.right")
                        }
                        .font(.system(size: 16))
                        .foregroundStyle(ShiBeiTheme.text)
                        .frame(minHeight: 44)
                    }
                    .disabled(store.isSubmittingReview)
                    Divider()
                }
            } else {
                Image(systemName: "checkmark")
                    .font(.system(size: 28, weight: .bold))
                    .frame(width: 56, height: 56)
                    .background(ShiBeiTheme.yellow)
                    .clipShape(Circle())
                Text(store.localized("feedback.received"))
                    .font(.system(size: 22, weight: .bold))
                Text(store.localizedLatestFeedbackMessage)
                    .foregroundStyle(ShiBeiTheme.muted)
                PrimaryButton(title: store.localized("home.action.continue_review")) {
                    dismiss()
                    store.continueAfterFeedback()
                }
            }
        }
        .padding(24)
        .background(ShiBeiTheme.card)
    }
}

struct SummaryView: View {
    @ObservedObject var store: AppStore

    var body: some View {
        AppScaffold(store: store, title: store.localized("summary.title"), showsTabBar: false, leadingAction: { store.showSelectedChapterDetail() }) {
            if let chapter = store.selectedChapter {
                ScrollView {
                    VStack(spacing: 22) {
                        VStack(spacing: 10) {
                            Image(systemName: "checkmark")
                                .font(.system(size: 28, weight: .bold))
                                .frame(width: 56, height: 56)
                                .background(ShiBeiTheme.yellow)
                                .clipShape(Circle())
                            Text(store.localized("summary.completed"))
                                .foregroundStyle(ShiBeiTheme.textSoft)
                        }
                        SBCard {
                            StatusPill(text: store.localized("home.status.current"))
                            Text(chapter.title)
                                .font(.system(size: 16))
                            Text(chapter.sourceType.label(language: store.appLanguage))
                                .foregroundStyle(ShiBeiTheme.muted)
                            HStack {
                                VStack {
                                    Text("\(chapter.knowledgePoints.count)")
                                        .font(.system(size: 28, weight: .bold))
                                        .foregroundStyle(ShiBeiTheme.primary)
                                    Text(store.localized("global.knowledge_points"))
                                        .foregroundStyle(ShiBeiTheme.muted)
                                }
                                Spacer()
                                VStack {
                                    Text("\(chapter.questions.count)")
                                        .font(.system(size: 28, weight: .bold))
                                        .foregroundStyle(ShiBeiTheme.primary)
                                    Text(store.localized("global.questions"))
                                        .foregroundStyle(ShiBeiTheme.muted)
                                }
                            }
                        }
                        ArticleCoreCard(chapter: chapter, language: store.appLanguage)
                        VStack(alignment: .leading, spacing: 12) {
                            Text(store.localized("chapter.knowledge_points"))
                                .font(.system(size: 18, weight: .bold))
                            ForEach(Array(chapter.knowledgePoints.prefix(4).enumerated()), id: \.element.id) { index, point in
                                KnowledgePointRow(index: index, point: point)
                            }
                        }
                        if let next = store.nextReviewableChapter(after: chapter.id) {
                            PrimaryButton(title: store.localized("summary.next_chapter"), systemImage: "arrow.right") {
                                Task {
                                    await store.startOrResumeReview(for: next)
                                }
                            }
                        }
                        Button(store.localized("summary.back_to_chapters")) {
                            store.selectedTab = .chapters
                            store.route = .chapters
                        }
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(ShiBeiTheme.muted)
                    }
                    .padding(24)
                }
            }
        }
    }
}

struct ArticleCoreCard: View {
    let chapter: Chapter
    var language: AppLanguage = .zhHans

    var body: some View {
        SBCard(padding: 20) {
            VStack(alignment: .leading, spacing: 12) {
                Text(L10n.string("article_core.title", language: language))
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(ShiBeiTheme.text)
                Text(articleCoreText)
                    .font(.system(size: 15))
                    .foregroundStyle(ShiBeiTheme.muted)
                    .lineSpacing(5)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private var articleCoreText: String {
        let coreSummary = chapter.coreSummary?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !coreSummary.isEmpty {
            return coreSummary
        }

        let sourceText = chapter.sourceText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !sourceText.isEmpty {
            return clippedSummary(sourceText)
        }

        let claims = chapter.knowledgePoints
            .prefix(3)
            .map { point in
                let claim = point.keyClaim.trimmingCharacters(in: .whitespacesAndNewlines)
                return claim.isEmpty ? point.summary.trimmingCharacters(in: .whitespacesAndNewlines) : claim
            }
            .filter { !$0.isEmpty }

        if !claims.isEmpty {
            return claims.joined(separator: " ")
        }

        return L10n.string("article_core.fallback", language: language)
    }

    private func clippedSummary(_ text: String) -> String {
        let normalized = text
            .replacingOccurrences(of: "\n", with: " ")
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard normalized.count > 180 else { return normalized }
        return String(normalized.prefix(180)).trimmingCharacters(in: .whitespacesAndNewlines) + "..."
    }
}

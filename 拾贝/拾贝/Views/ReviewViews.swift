import SwiftUI

struct ReviewView: View {
    @ObservedObject var store: AppStore
    @State private var selectedOptionId: String?
    @State private var revealedCorrectOptionId: String?

    var body: some View {
        AppScaffold(store: store, title: "", showsTopBar: false, showsTabBar: false) {
            if let question = store.currentQuestion(), let chapter = store.selectedChapter, let session = chapter.reviewSession {
                VStack(spacing: 0) {
                    ReviewTopBar(store: store, session: session)
                    ScrollView {
                        VStack(spacing: 30) {
                            ProgressBar(progress: reviewProgress(chapter: chapter, session: session))
                            SBCard {
                                StatusPill(text: "知识点：\(question.pointTitle)")
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
                                }
                            }
                        }
                        .padding(24)
                        .padding(.bottom, 110)
                    }
                    VStack {
                        SecondaryButton(title: "? 不知道") {
                            guard !store.isSubmittingReview else { return }
                            revealedCorrectOptionId = question.correctOptionId
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                                Task {
                                    await store.submitAttempt(answer: nil, result: .unknown)
                                    revealedCorrectOptionId = nil
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 30)
                    .background(
                        LinearGradient(colors: [ShiBeiTheme.surface.opacity(0), ShiBeiTheme.surface], startPoint: .top, endPoint: .bottom)
                    )
                }
            } else {
                SummaryView(store: store)
            }
        }
    }

    private func reviewProgress(chapter: Chapter, session: ReviewSession) -> Double {
        let required = max(1, chapter.knowledgePoints.count)
        return Double(session.masteredThisRoundPointIds.count) / Double(required)
    }
}

private struct ReviewTopBar: View {
    @ObservedObject var store: AppStore
    let session: ReviewSession

    var body: some View {
        HStack {
            Button {
                store.route = .chapterDetail
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 18, weight: .bold))
                    .frame(width: 42, height: 42)
            }
            .accessibilityLabel("关闭复习")
            Spacer()
            VStack(spacing: 4) {
                Text("复习中")
                    .font(.system(size: 20, weight: .bold))
                Text("\(min(session.currentQueueIndex + 1, max(1, session.queue.count))) / \(max(1, session.queue.count))")
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
                    .frame(maxWidth: .infinity, alignment: .leading)
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
                    ReviewTopBar(store: store, session: store.selectedChapter?.reviewSession ?? emptySession)
                    ScrollView {
                        VStack(spacing: 18) {
                            VStack(spacing: 10) {
                                Text(question.correctOptionId)
                                    .font(.system(size: 34, weight: .black))
                                    .frame(width: 76, height: 76)
                                    .background(ShiBeiTheme.yellow)
                                    .clipShape(Circle())
                                Text("正确答案")
                                    .foregroundStyle(ShiBeiTheme.muted)
                            }
                            ExplanationCard(title: "正确理解", systemImage: "asterisk", text: question.correctUnderstanding)
                            ExplanationCard(title: "常见误区", systemImage: "exclamationmark", text: "• \(question.commonMisconception)")
                            ExplanationCard(title: "来源片段", systemImage: "text.quote", text: question.sourceText, warm: true)
                            HStack {
                                Button("查看完整来源") {
                                    store.route = .source
                                }
                                Spacer()
                                Button("题目有问题") {
                                    store.selectedFeedbackQuestionId = question.id
                                    store.feedbackSheetContext = FeedbackSheetContext(questionId: question.id)
                                }
                            }
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(ShiBeiTheme.primary)
                            .padding(.top, 10)
                        }
                        .padding(24)
                        .padding(.bottom, 120)
                    }
                    VStack {
                        PrimaryButton(title: "继续复习", systemImage: "arrow.right") {
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
            Text(text)
                .font(.system(size: 15))
                .foregroundStyle(ShiBeiTheme.muted)
                .lineSpacing(5)
        }
        .background(warm ? Color(red: 1, green: 0.969, blue: 0.910) : .clear)
    }
}

struct FeedbackSheet: View {
    @ObservedObject var store: AppStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 18) {
            if store.latestFeedbackMessage.isEmpty {
                Text("这道题哪里有问题？")
                    .font(.system(size: 22, weight: .bold))
                ForEach(FeedbackType.allCases) { type in
                    Button {
                        Task {
                            await store.submitFeedback(type)
                        }
                    } label: {
                        HStack {
                            Text(type.label)
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
                Text("已收到")
                    .font(.system(size: 22, weight: .bold))
                Text(store.latestFeedbackMessage)
                    .foregroundStyle(ShiBeiTheme.muted)
                PrimaryButton(title: "继续复习") {
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
        AppScaffold(store: store, title: "章节总结", showsTabBar: false, leadingAction: { store.route = .chapterDetail }) {
            if let chapter = store.selectedChapter {
                ScrollView {
                    VStack(spacing: 22) {
                        VStack(spacing: 10) {
                            Image(systemName: "checkmark")
                                .font(.system(size: 28, weight: .bold))
                                .frame(width: 56, height: 56)
                                .background(ShiBeiTheme.yellow)
                                .clipShape(Circle())
                            Text("本章复习完成")
                                .foregroundStyle(ShiBeiTheme.textSoft)
                        }
                        SBCard {
                            StatusPill(text: "当前章节")
                            Text(chapter.title)
                                .font(.system(size: 16))
                            Text(chapter.sourceType.label)
                                .foregroundStyle(ShiBeiTheme.muted)
                            HStack {
                                VStack {
                                    Text("\(chapter.knowledgePoints.count)")
                                        .font(.system(size: 28, weight: .bold))
                                        .foregroundStyle(ShiBeiTheme.primary)
                                    Text("知识点")
                                        .foregroundStyle(ShiBeiTheme.muted)
                                }
                                Spacer()
                                VStack {
                                    Text("\(chapter.questions.count)")
                                        .font(.system(size: 28, weight: .bold))
                                        .foregroundStyle(ShiBeiTheme.primary)
                                    Text("题目")
                                        .foregroundStyle(ShiBeiTheme.muted)
                                }
                            }
                        }
                        VStack(alignment: .leading, spacing: 12) {
                            Text("本章知识点")
                                .font(.system(size: 18, weight: .bold))
                            ForEach(Array(chapter.knowledgePoints.prefix(4).enumerated()), id: \.element.id) { index, point in
                                KnowledgePointRow(index: index, point: point)
                            }
                        }
                        if let next = store.nextReviewableChapter(after: chapter.id) {
                            PrimaryButton(title: "继续下一章", systemImage: "arrow.right") {
                                Task {
                                    await store.startOrResumeReview(for: next)
                                }
                            }
                        }
                        Button("回到章节") {
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

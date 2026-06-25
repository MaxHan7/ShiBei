import SwiftUI
import UserNotifications

struct V2RootView: View {
    @AppStorage("v2.hasRequestedGenerationNotificationPermission")
    private var hasRequestedGenerationNotificationPermission = false

    @State private var selectedTab: V2HomeTab = .learning
    @State private var route: V2AppRoute?
    @State private var routeStack: [V2AppRoute] = []
    @State private var showsGenerationStartedDialog = false
    @State private var showsGeneratingChapterCard = false
    @State private var questionInteractionStates: [String: V2QuestionInteractionState] = [:]
    @State private var backendChapter: V2BackendChapter?
    @State private var backendReviewChapter: V2ReviewChapterData?
    @State private var generationPollingTask: Task<Void, Never>?
    @State private var generationErrorText = ""

    private let apiClient = APIClient()

    var body: some View {
        ZStack {
            currentView

            if showsGenerationStartedDialog {
                Color.black
                    .opacity(0.2)
                    .ignoresSafeArea()
                    .transition(.opacity)
                    .zIndex(100)

                V2GenerationStartedDialog {
                    dismissGenerationStartedDialog()
                }
                .transition(.scale(scale: 0.98).combined(with: .opacity))
                .zIndex(101)
            }
        }
    }

    @ViewBuilder
    private var currentView: some View {
        if let route {
            routeView(route)
        } else {
            tabView
        }
    }

    @ViewBuilder
    private var tabView: some View {
        switch selectedTab {
        case .learning:
            V2HomeView(
                data: V2HomeFixture.home,
                selectedTab: $selectedTab,
                onOpenNotifications: { pushRoute(.notifications) },
                onOpenProfile: { pushRoute(.profile) },
                onOpenChapterDetail: { pushRoute(.chapterDetail) },
                onOpenNode: openNode
            )
        case .materials:
            V2MaterialsView(
                selectedTab: $selectedTab,
                showsGeneratingChapterCard: showsGeneratingChapterCard,
                generatingChapterTitle: backendChapter?.title ?? "正在生成新的章节",
                generatingProgressText: generationDisplayText,
                openGeneratingChapter: { pushRoute(.generatingChapterDetail) },
                openChapter: { pushRoute(.chapterDetail) }
            )
        case .upload:
            V2UploadView(
                selectedTab: $selectedTab,
                onGenerate: startV2Generation
            )
        case .discover:
            V2DiscoverView(selectedTab: $selectedTab) {
                pushRoute(.recommendedArticle)
            }
        case .notes:
            V2NotesView(
                selectedTab: $selectedTab,
                onOpenSavedQuestion: openSavedQuestion
            )
        }
    }

    @ViewBuilder
    private func routeView(_ route: V2AppRoute) -> some View {
        switch route {
        case .notifications:
            V2NotificationView(
                onBack: goBack,
                onOpenSuccess: { pushRoute(.chapterDetail) },
                onOpenFailure: { pushRoute(.notificationFailureDetail) }
            )
        case .notificationFailureDetail:
            V2NotificationFailureDetailView(
                onBack: goBack,
                onRegenerate: showGeneratedChapterDetail
            )
        case .profile:
            V2ProfileView(onBack: goBack)
        case .generatingChapterDetail:
            V2GeneratingChapterDetailView(
                progress: backendChapter?.progress?.progress ?? 0,
                statusText: generationDisplayText,
                onBack: goBack,
                onSource: openSource
            )
        case .chapterDetail:
            V2ChapterDetailView(
                onBack: goBack,
                onContinue: continueFromChapterDetail,
                onSource: openSource
            )
        case .sourceArticle:
            V2SourceArticleView(chapter: activeChapter, question: sourceQuestion, onBack: goBack)
        case .recommendedArticle:
            V2RecommendedArticleDetailView(
                onBack: goBack,
                onGenerate: showGeneratedChapterDetail
            )
        case .chapterOverview:
            V2ChapterOverviewView(
                chapter: activeChapter,
                onBack: goBack,
                onContinue: openFirstUnit
            )
        case .unitOverview(let unitID):
            if let unit = activeUnit(id: unitID) {
                V2UnitOverviewView(
                    unit: unit,
                    progress: progressIndex(unitID: unitID),
                    onBack: goBack,
                    onContinue: { openFirstQuestion(in: unitID) }
                )
            } else {
                V2MissingRouteView(onBack: goBack)
            }
        case .question(let unitID, let questionID):
            if let question = activeQuestion(unitID: unitID, questionID: questionID) {
                let progress = progressIndex(unitID: unitID, questionID: questionID)
                let unitTitle = unitDisplayTitle(id: unitID) ?? question.title
                switch question.kind {
                case .multipleChoice:
                    V2MultipleChoiceQuestionView(
                        question: question,
                        unitTitle: unitTitle,
                        progress: progress,
                        state: multipleChoiceStateBinding(unitID: unitID, questionID: questionID),
                        onBack: goBack,
                        onSource: openSource,
                        onContinue: { continueAfterQuestion(unitID: unitID, questionID: questionID) }
                    )
                case .matching:
                    V2MatchingQuestionView(
                        question: question,
                        unitTitle: unitTitle,
                        progress: progress,
                        state: matchingStateBinding(unitID: unitID, questionID: questionID),
                        onBack: goBack,
                        onSource: openSource,
                        onContinue: { continueAfterQuestion(unitID: unitID, questionID: questionID) }
                    )
                }
            } else {
                V2MissingRouteView(onBack: goBack)
            }
        case .savedQuestion(let index):
            if let savedQuestion = V2ReviewFixture.savedQuestion(at: index),
               let question = V2ReviewFixture.question(for: savedQuestion) {
                let progress = (current: min(index + 1, V2ReviewFixture.savedQuestions.count), total: V2ReviewFixture.savedQuestions.count)
                let unitTitle = V2ReviewFixture.unitDisplayTitle(id: savedQuestion.unitID) ?? question.title
                switch question.kind {
                case .multipleChoice:
                    V2MultipleChoiceQuestionView(
                        question: question,
                        unitTitle: unitTitle,
                        progress: progress,
                        state: multipleChoiceStateBinding(key: savedQuestionStateKey(index: index)),
                        onBack: goBack,
                        onSource: openSource,
                        onContinue: { continueAfterSavedQuestion(index: index) }
                    )
                case .matching:
                    V2MatchingQuestionView(
                        question: question,
                        unitTitle: unitTitle,
                        progress: progress,
                        state: matchingStateBinding(key: savedQuestionStateKey(index: index)),
                        onBack: goBack,
                        onSource: openSource,
                        onContinue: { continueAfterSavedQuestion(index: index) }
                    )
                }
            } else {
                V2MissingRouteView(onBack: goBack)
            }
        case .unitSummary(let unitID):
            if let unit = activeUnit(id: unitID) {
                V2UnitSummaryView(
                    unit: unit,
                    onBack: goBack,
                    onContinue: { continueAfterUnit(unitID: unitID) }
                )
            } else {
                V2MissingRouteView(onBack: goBack)
            }
        case .chapterSummary:
            V2ChapterSummaryView(
                chapter: activeChapter,
                onBack: goBack,
                onHome: { resetToHome(tab: .learning) },
                onDetail: { pushRoute(.chapterDetail) }
            )
        }
    }

    private var sourceQuestion: V2ReviewQuestionData? {
        guard let sourceRoute = routeStack.last else {
            return nil
        }

        switch sourceRoute {
        case .question(let unitID, let questionID):
            return activeQuestion(unitID: unitID, questionID: questionID)
        case .savedQuestion(let index):
            guard let savedQuestion = V2ReviewFixture.savedQuestion(at: index) else {
                return nil
            }
            return V2ReviewFixture.question(for: savedQuestion)
        default:
            return nil
        }
    }

    private func openNode(_ node: V2LearningPathNodeData) {
        selectedTab = .learning
        if node.kind == .start {
            resetToRoute(.chapterOverview, tab: .learning)
        } else {
            resetToRoute(.unitOverview(unitID: node.id), tab: .learning)
        }
    }

    private func openSavedQuestion(index: Int) {
        selectedTab = .notes
        routeStack.removeAll()
        questionInteractionStates.removeValue(forKey: savedQuestionStateKey(index: index))
        route = .savedQuestion(index: index)
    }

    private func openFirstUnit() {
        replaceRoute(.unitOverview(unitID: activeFirstUnitID))
    }

    private func openFirstQuestion(in unitID: String) {
        guard let questionID = firstQuestionID(in: unitID) else {
            replaceRoute(.unitSummary(unitID: unitID))
            return
        }
        replaceRoute(.question(unitID: unitID, questionID: questionID))
    }

    private func continueAfterQuestion(unitID: String, questionID: String) {
        questionInteractionStates.removeValue(forKey: questionStateKey(unitID: unitID, questionID: questionID))

        if let nextQuestion = nextQuestion(after: questionID, in: unitID) {
            replaceRoute(.question(unitID: unitID, questionID: nextQuestion.id))
        } else {
            replaceRoute(.unitSummary(unitID: unitID))
        }
    }

    private func questionStateKey(unitID: String, questionID: String) -> String {
        "review::\(unitID)::\(questionID)"
    }

    private func savedQuestionStateKey(index: Int) -> String {
        "notes::saved-question::\(index)"
    }

    private func continueAfterSavedQuestion(index: Int) {
        questionInteractionStates.removeValue(forKey: savedQuestionStateKey(index: index))

        let nextIndex = index + 1
        if V2ReviewFixture.savedQuestions.indices.contains(nextIndex) {
            questionInteractionStates.removeValue(forKey: savedQuestionStateKey(index: nextIndex))
            replaceRoute(.savedQuestion(index: nextIndex))
        } else {
            resetToHome(tab: .notes)
        }
    }

    private func questionInteractionBinding(
        unitID: String,
        questionID: String
    ) -> Binding<V2QuestionInteractionState> {
        questionInteractionBinding(key: questionStateKey(unitID: unitID, questionID: questionID))
    }

    private func questionInteractionBinding(key: String) -> Binding<V2QuestionInteractionState> {
        return Binding(
            get: {
                questionInteractionStates[key, default: V2QuestionInteractionState()]
            },
            set: { newValue in
                questionInteractionStates[key] = newValue
            }
        )
    }

    private func multipleChoiceStateBinding(key: String) -> Binding<V2MultipleChoiceInteractionState> {
        let interaction = questionInteractionBinding(key: key)
        return Binding(
            get: {
                interaction.wrappedValue.multipleChoice
            },
            set: { newValue in
                var rootState = interaction.wrappedValue
                rootState.multipleChoice = newValue
                interaction.wrappedValue = rootState
            }
        )
    }

    private func multipleChoiceStateBinding(
        unitID: String,
        questionID: String
    ) -> Binding<V2MultipleChoiceInteractionState> {
        multipleChoiceStateBinding(key: questionStateKey(unitID: unitID, questionID: questionID))
    }

    private func matchingStateBinding(key: String) -> Binding<V2MatchingInteractionState> {
        let interaction = questionInteractionBinding(key: key)
        return Binding(
            get: {
                interaction.wrappedValue.matching
            },
            set: { newValue in
                var rootState = interaction.wrappedValue
                rootState.matching = newValue
                interaction.wrappedValue = rootState
            }
        )
    }

    private func matchingStateBinding(
        unitID: String,
        questionID: String
    ) -> Binding<V2MatchingInteractionState> {
        matchingStateBinding(key: questionStateKey(unitID: unitID, questionID: questionID))
    }

    private func continueAfterUnit(unitID: String) {
        if let nextUnit = nextUnit(after: unitID) {
            replaceRoute(.unitOverview(unitID: nextUnit.id))
        } else {
            replaceRoute(.chapterSummary)
        }
    }

    private func continueFromChapterDetail() {
        let currentNodeID = V2HomeFixture.home.currentNodeID
        selectedTab = .learning
        routeStack.removeAll()
        if activeUnit(id: currentNodeID) != nil {
            replaceRoute(.unitOverview(unitID: currentNodeID))
        } else {
            openFirstUnit()
        }
    }

    private var activeChapter: V2ReviewChapterData {
        backendReviewChapter ?? V2ReviewFixture.chapter
    }

    private var activeFirstUnitID: String {
        activeChapter.units.first?.id ?? ""
    }

    private var generationDisplayText: String {
        if !generationErrorText.isEmpty {
            return generationErrorText
        }
        return backendChapter?.progress?.displayTextOrFallback ?? "正在提交生成任务..."
    }

    private func activeUnit(id: String) -> V2ReviewUnitData? {
        activeChapter.units.first { $0.id == id }
    }

    private func activeQuestion(unitID: String, questionID: String) -> V2ReviewQuestionData? {
        activeUnit(id: unitID)?.questions.first { $0.id == questionID }
    }

    private func unitDisplayTitle(id: String) -> String? {
        guard let index = activeChapter.units.firstIndex(where: { $0.id == id }) else {
            return nil
        }
        return "单元\(index + 1)"
    }

    private func firstQuestionID(in unitID: String) -> String? {
        activeUnit(id: unitID)?.questions.first?.id
    }

    private func nextQuestion(after questionID: String, in unitID: String) -> V2ReviewQuestionData? {
        guard let questions = activeUnit(id: unitID)?.questions,
              let index = questions.firstIndex(where: { $0.id == questionID }),
              questions.indices.contains(index + 1) else {
            return nil
        }
        return questions[index + 1]
    }

    private func nextUnit(after unitID: String) -> V2ReviewUnitData? {
        if backendReviewChapter == nil,
           V2ReviewFixture.completesChapterAfterCurrentFixtureUnit,
           unitID == "unit-1" {
            return nil
        }

        guard let index = activeChapter.units.firstIndex(where: { $0.id == unitID }),
              activeChapter.units.indices.contains(index + 1) else {
            return nil
        }
        return activeChapter.units[index + 1]
    }

    private func progressIndex(unitID: String, questionID: String? = nil) -> (current: Int, total: Int) {
        let total = activeChapter.units.reduce(0) { $0 + $1.questions.count }
        var current = 1

        for unit in activeChapter.units {
            if unit.id == unitID {
                if let questionID,
                   let questionIndex = unit.questions.firstIndex(where: { $0.id == questionID }) {
                    current += questionIndex
                }
                return (current, max(total, 1))
            }
            current += unit.questions.count
        }

        return (current, max(total, 1))
    }

    private func startV2Generation(sourceText: String) {
        let trimmed = sourceText.trimmingCharacters(in: .whitespacesAndNewlines)
        let localTestFallback = [
            "游戏化不是简单地给产品加积分、徽章或排行榜。",
            "更重要的是理解用户动机、行为目标和反馈机制之间的关系。",
            "DMC 模型可以帮助设计者把动机、机制和组件拆开分析。"
        ].joined(separator: "\n")

        selectedTab = .materials
        routeStack.removeAll()
        route = .generatingChapterDetail
        showsGeneratingChapterCard = false
        backendChapter = nil
        backendReviewChapter = nil
        generationErrorText = ""
        generationPollingTask?.cancel()

        withAnimation(.easeOut(duration: 0.18)) {
            showsGenerationStartedDialog = true
        }

        Task {
            do {
                let response = try await apiClient.createV2Chapter(sourceText: trimmed.isEmpty ? localTestFallback : trimmed)
                await MainActor.run {
                    applyBackendChapter(response.chapter)
                }
                startGenerationPolling(chapterID: response.chapter.id)
            } catch {
                await MainActor.run {
                    generationErrorText = error.localizedDescription
                    showsGeneratingChapterCard = true
                }
            }
        }
    }

    private func startGenerationPolling(chapterID: String) {
        generationPollingTask?.cancel()
        generationPollingTask = Task {
            for _ in 0..<240 {
                if Task.isCancelled {
                    return
                }

                do {
                    let chapter = try await apiClient.fetchV2Chapter(id: chapterID)
                    await MainActor.run {
                        applyBackendChapter(chapter)
                    }
                    if chapter.progress?.isFinished == true || chapter.status == "completed" || chapter.status == "failed_generation" {
                        return
                    }
                } catch {
                    await MainActor.run {
                        generationErrorText = error.localizedDescription
                    }
                }

                try? await Task.sleep(nanoseconds: 1_250_000_000)
            }
        }
    }

    private func applyBackendChapter(_ chapter: V2BackendChapter) {
        backendChapter = chapter
        if let reviewChapter = chapter.toReviewChapterData() {
            backendReviewChapter = reviewChapter
        }
        if chapter.progress?.status == "completed" || chapter.status == "completed" {
            showsGeneratingChapterCard = false
        }
    }

    private func showGeneratedChapterDetail() {
        selectedTab = .materials
        routeStack.removeAll()
        route = .generatingChapterDetail
        showsGeneratingChapterCard = false
        withAnimation(.easeOut(duration: 0.18)) {
            showsGenerationStartedDialog = true
        }
    }

    private func dismissGenerationStartedDialog() {
        let shouldRequestNotificationPermission = !hasRequestedGenerationNotificationPermission
        if shouldRequestNotificationPermission {
            hasRequestedGenerationNotificationPermission = true
        }

        withAnimation(.easeOut(duration: 0.16)) {
            showsGenerationStartedDialog = false
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.18) {
            withAnimation(.spring(response: 0.42, dampingFraction: 0.86)) {
                showsGeneratingChapterCard = true
            }
        }

        if shouldRequestNotificationPermission {
            Task {
                try? await Task.sleep(nanoseconds: 350_000_000)
                await requestGenerationNotificationPermissionIfNeeded()
            }
        }
    }

    private func requestGenerationNotificationPermissionIfNeeded() async {
        let status = await PushNotificationService.authorizationStatus()
        switch status {
        case .notDetermined:
            _ = try? await PushNotificationService.requestAuthorizationAndRegister()
        case .authorized, .provisional, .ephemeral:
            await PushNotificationService.registerIfAuthorized()
        case .denied:
            break
        @unknown default:
            break
        }
    }

    private func openSource() {
        pushRoute(.sourceArticle)
    }

    private func pushRoute(_ nextRoute: V2AppRoute) {
        if let route {
            routeStack.append(route)
        }
        route = nextRoute
    }

    private func replaceRoute(_ nextRoute: V2AppRoute) {
        route = nextRoute
    }

    private func resetToRoute(_ nextRoute: V2AppRoute, tab: V2HomeTab? = nil) {
        if let tab {
            selectedTab = tab
        }
        routeStack.removeAll()
        route = nextRoute
    }

    private func resetToHome(tab: V2HomeTab? = nil) {
        if let tab {
            selectedTab = tab
        }
        routeStack.removeAll()
        route = nil
    }

    private func goBack() {
        guard let route else {
            routeStack.removeAll()
            return
        }

        if case .question = route {
            resetToHome(tab: .learning)
            return
        }

        if case .savedQuestion = route {
            resetToHome(tab: .notes)
            return
        }

        self.route = routeStack.popLast()
    }
}

private struct V2MissingRouteView: View {
    let onBack: () -> Void

    var body: some View {
        V2FlowScreen(title: "页面缺失", onBack: onBack) {
            V2InfoCard {
                Text("这个本地 fixture 暂时没有对应页面数据。")
                    .font(V2Typography.body)
                    .foregroundStyle(V2Color.textSecondary)
            }
            .padding(.horizontal, V2Spacing.screenMargin)
            .padding(.top, 28)
        }
    }
}

struct V2RootView_Previews: PreviewProvider {
    static var previews: some View {
        V2RootView()
            .previewDevice("iPhone 17")
            .previewDisplayName("V2 Root - iPhone 17")
    }
}

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
                showsGeneratingChapterCard: showsGeneratingChapterCard
            ) {
                pushRoute(.chapterDetail)
            }
        case .upload:
            V2UploadView(
                selectedTab: $selectedTab,
                onGenerate: showGeneratedChapterDetail
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
        case .chapterDetail:
            V2ChapterDetailView(
                onBack: goBack,
                onContinue: continueFromChapterDetail,
                onSource: openSource
            )
        case .sourceArticle:
            V2SourceArticleView(question: sourceQuestion, onBack: goBack)
        case .recommendedArticle:
            V2RecommendedArticleDetailView(
                onBack: goBack,
                onGenerate: showGeneratedChapterDetail
            )
        case .chapterOverview:
            V2ChapterOverviewView(
                chapter: V2ReviewFixture.chapter,
                onBack: goBack,
                onContinue: openFirstUnit
            )
        case .unitOverview(let unitID):
            if let unit = V2ReviewFixture.unit(id: unitID) {
                V2UnitOverviewView(
                    unit: unit,
                    progress: V2ReviewFixture.progressIndex(unitID: unitID),
                    onBack: goBack,
                    onContinue: { openFirstQuestion(in: unitID) }
                )
            } else {
                V2MissingRouteView(onBack: goBack)
            }
        case .question(let unitID, let questionID):
            if let question = V2ReviewFixture.question(unitID: unitID, questionID: questionID) {
                let progress = V2ReviewFixture.progressIndex(unitID: unitID, questionID: questionID)
                let unitTitle = V2ReviewFixture.unitDisplayTitle(id: unitID) ?? question.title
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
            if let unit = V2ReviewFixture.unit(id: unitID) {
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
                chapter: V2ReviewFixture.chapter,
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
            return V2ReviewFixture.question(unitID: unitID, questionID: questionID)
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
        replaceRoute(.unitOverview(unitID: V2ReviewFixture.firstUnitID))
    }

    private func openFirstQuestion(in unitID: String) {
        guard let questionID = V2ReviewFixture.firstQuestionID(in: unitID) else {
            replaceRoute(.unitSummary(unitID: unitID))
            return
        }
        replaceRoute(.question(unitID: unitID, questionID: questionID))
    }

    private func continueAfterQuestion(unitID: String, questionID: String) {
        questionInteractionStates.removeValue(forKey: questionStateKey(unitID: unitID, questionID: questionID))

        if let nextQuestion = V2ReviewFixture.nextQuestion(after: questionID, in: unitID) {
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
        if let nextUnit = V2ReviewFixture.nextUnit(after: unitID) {
            replaceRoute(.unitOverview(unitID: nextUnit.id))
        } else {
            replaceRoute(.chapterSummary)
        }
    }

    private func continueFromChapterDetail() {
        let currentNodeID = V2HomeFixture.home.currentNodeID
        selectedTab = .learning
        routeStack.removeAll()
        if V2ReviewFixture.unit(id: currentNodeID) != nil {
            replaceRoute(.unitOverview(unitID: currentNodeID))
        } else {
            openFirstUnit()
        }
    }

    private func showGeneratedChapterDetail() {
        selectedTab = .materials
        routeStack.removeAll()
        route = nil
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

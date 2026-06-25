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
    @State private var v2ReviewSession: V2BackendReviewSession?
    @State private var generationPollingTask: Task<Void, Never>?
    @State private var generationErrorText = ""
    @State private var isSubmittingGeneration = false

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
                generatedChapter: backendReviewChapter,
                openGeneratingChapter: { pushRoute(.generatingChapterDetail) },
                openChapter: { pushRoute(.chapterDetail) }
            )
        case .upload:
            V2UploadView(
                selectedTab: $selectedTab,
                isGenerating: isGenerationBusy,
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
                isCompleted: backendReviewChapter != nil,
                onBack: goBack,
                onSource: openSource,
                onOpenChapter: { replaceRoute(.chapterDetail) }
            )
        case .chapterDetail:
            V2ChapterDetailView(
                chapter: activeChapter,
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
        guard usesBackendReviewChapter else {
            advanceLocalAfterQuestion(unitID: unitID, questionID: questionID)
            return
        }

        Task {
            await persistBackendAnswerAndContinue(unitID: unitID, questionID: questionID)
        }
    }

    private func advanceLocalAfterQuestion(unitID: String, questionID: String) {
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
        if usesBackendReviewChapter {
            Task {
                await startOrResumeBackendReviewFromChapterDetail()
            }
            return
        }

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

    private var isGenerationBusy: Bool {
        if isSubmittingGeneration {
            return true
        }
        guard let chapter = backendChapter else {
            return false
        }
        return chapter.status != "completed" && chapter.status != "failed_generation"
    }

    private var usesBackendReviewChapter: Bool {
        backendReviewChapter != nil && backendChapter?.status == "completed"
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
        guard !trimmed.isEmpty else {
            return
        }

        selectedTab = .materials
        routeStack.removeAll()
        route = .generatingChapterDetail
        showsGeneratingChapterCard = false
        backendChapter = nil
        backendReviewChapter = nil
        v2ReviewSession = nil
        questionInteractionStates.removeAll()
        generationErrorText = ""
        isSubmittingGeneration = true
        generationPollingTask?.cancel()
        let clientRequestId = "ios-v2-\(UUID().uuidString)"

        withAnimation(.easeOut(duration: 0.18)) {
            showsGenerationStartedDialog = true
        }

        Task {
            do {
                let response = try await apiClient.createV2Chapter(
                    sourceText: trimmed,
                    clientRequestId: clientRequestId
                )
                await MainActor.run {
                    isSubmittingGeneration = false
                    applyBackendChapter(response.chapter)
                }
                startGenerationPolling(chapterID: response.chapter.id)
            } catch {
                await MainActor.run {
                    isSubmittingGeneration = false
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
                        await MainActor.run {
                            generationPollingTask = nil
                        }
                        return
                    }
                } catch {
                    await MainActor.run {
                        generationErrorText = error.localizedDescription
                    }
                }

                try? await Task.sleep(nanoseconds: 1_250_000_000)
            }
            await MainActor.run {
                generationPollingTask = nil
            }
        }
    }

    private func applyBackendChapter(_ chapter: V2BackendChapter) {
        backendChapter = chapter
        if let reviewChapter = chapter.toReviewChapterData() {
            backendReviewChapter = reviewChapter
        }
        if let session = chapter.v2ReviewSession {
            v2ReviewSession = session
            hydrateLocalQuestionStates(from: session)
        }
        if chapter.progress?.status == "completed" || chapter.status == "completed" {
            showsGeneratingChapterCard = false
            isSubmittingGeneration = false
            if route == .generatingChapterDetail {
                generationErrorText = ""
            }
        } else if chapter.status == "failed_generation" {
            showsGeneratingChapterCard = true
            isSubmittingGeneration = false
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
        if usesBackendReviewChapter {
            Task {
                await openBackendSourceRouteIfPossible()
            }
        }
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

        if case .sourceArticle = route, usesBackendReviewChapter {
            Task {
                await returnFromBackendSourceRouteIfPossible()
            }
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

    @MainActor
    private func startOrResumeBackendReviewFromChapterDetail() async {
        guard let chapterID = backendChapter?.id else {
            openFirstUnit()
            return
        }

        do {
            let response = try await apiClient.startOrResumeV2ReviewSession(chapterId: chapterID)
            applyV2ReviewSessionResponse(response)
            selectedTab = .learning
            routeStack.removeAll()
            replaceRoute(route(for: response.reviewSession?.currentCard) ?? .unitOverview(unitID: activeFirstUnitID))
        } catch {
            generationErrorText = error.localizedDescription
            openFirstUnit()
        }
    }

    @MainActor
    private func persistBackendAnswerAndContinue(unitID: String, questionID: String) async {
        guard let payload = backendAnswerPayload(unitID: unitID, questionID: questionID) else {
            advanceLocalAfterQuestion(unitID: unitID, questionID: questionID)
            return
        }

        do {
            guard let session = try await ensureV2ReviewSession() else {
                advanceLocalAfterQuestion(unitID: unitID, questionID: questionID)
                return
            }

            let answerResponse = try await apiClient.answerV2Question(
                sessionId: session.id,
                unitId: unitID,
                questionId: questionID,
                result: payload.result,
                selectedOptionId: payload.selectedOptionId,
                matchedPairs: payload.matchedPairs,
                lockedPairIds: payload.lockedPairIds
            )
            applyV2ReviewSessionResponse(answerResponse)

            if let updatedSession = answerResponse.reviewSession {
                let advanceResponse = try await apiClient.advanceV2ReviewSession(sessionId: updatedSession.id)
                applyV2ReviewSessionResponse(advanceResponse)
            }
        } catch {
            generationErrorText = error.localizedDescription
        }

        advanceLocalAfterQuestion(unitID: unitID, questionID: questionID)
    }

    @MainActor
    private func ensureV2ReviewSession() async throws -> V2BackendReviewSession? {
        if let v2ReviewSession {
            return v2ReviewSession
        }

        guard let chapterID = backendChapter?.id else {
            return nil
        }

        let response = try await apiClient.startOrResumeV2ReviewSession(chapterId: chapterID)
        applyV2ReviewSessionResponse(response)
        return response.reviewSession
    }

    private func applyV2ReviewSessionResponse(_ response: V2ReviewSessionResponse) {
        applyBackendChapter(response.chapter)
        if let session = response.reviewSession {
            v2ReviewSession = session
            hydrateLocalQuestionStates(from: session)
        }
    }

    private func route(for card: V2BackendReviewCard?) -> V2AppRoute? {
        guard let card else {
            return nil
        }

        switch card.type {
        case "chapter_overview":
            return .chapterOverview
        case "unit_overview":
            return card.unitId.map { .unitOverview(unitID: $0) }
        case "question", "question_feedback":
            guard let unitID = card.unitId, let questionID = card.questionId else {
                return nil
            }
            return .question(unitID: unitID, questionID: questionID)
        case "unit_summary":
            return card.unitId.map { .unitSummary(unitID: $0) }
        case "chapter_summary":
            return .chapterSummary
        default:
            return nil
        }
    }

    private func backendAnswerPayload(
        unitID: String,
        questionID: String
    ) -> (
        result: String,
        selectedOptionId: String?,
        matchedPairs: [V2BackendMatchedPair],
        lockedPairIds: [String]
    )? {
        guard let question = activeQuestion(unitID: unitID, questionID: questionID) else {
            return nil
        }

        let key = questionStateKey(unitID: unitID, questionID: questionID)
        let interaction = questionInteractionStates[key, default: V2QuestionInteractionState()]

        switch question.kind {
        case .multipleChoice:
            guard let selectedIndex = interaction.multipleChoice.selectedIndex else {
                return nil
            }
            return (
                result: selectedIndex == question.correctOptionIndex ? "correct" : "wrong",
                selectedOptionId: optionID(for: selectedIndex),
                matchedPairs: [],
                lockedPairIds: []
            )
        case .matching:
            let lockedPairIds = question.matchingPairs
                .filter {
                    interaction.matching.leftStates[$0.id] == .locked
                        && interaction.matching.rightStates[$0.id] == .locked
                }
                .map(\.id)
            let isCorrect = lockedPairIds.count == question.matchingPairs.count && !question.matchingPairs.isEmpty
            let matchedPairs = lockedPairIds.map {
                V2BackendMatchedPair(leftId: $0, rightId: $0)
            }
            return (
                result: isCorrect ? "correct" : "wrong",
                selectedOptionId: nil,
                matchedPairs: matchedPairs,
                lockedPairIds: lockedPairIds
            )
        }
    }

    private func optionID(for index: Int) -> String? {
        ["A", "B", "C", "D", "E", "F"].indices.contains(index) ? ["A", "B", "C", "D", "E", "F"][index] : nil
    }

    private func hydrateLocalQuestionStates(from session: V2BackendReviewSession) {
        for (questionID, backendState) in session.questionStates {
            guard let unitID = unitID(containingQuestionID: questionID),
                  let question = activeQuestion(unitID: unitID, questionID: questionID) else {
                continue
            }

            let key = questionStateKey(unitID: unitID, questionID: questionID)
            var interaction = questionInteractionStates[key, default: V2QuestionInteractionState()]

            switch question.kind {
            case .multipleChoice:
                if let selectedOptionId = backendState.selectedOptionId,
                   let selectedIndex = optionIndex(for: selectedOptionId) {
                    interaction.multipleChoice.selectedIndex = selectedIndex
                }
                interaction.multipleChoice.feedbackPanelVisible = backendState.feedbackVisible
            case .matching:
                if backendState.status == "answered", backendState.result == "correct" {
                    for pair in question.matchingPairs {
                        interaction.matching.leftStates[pair.id] = .locked
                        interaction.matching.rightStates[pair.id] = .locked
                    }
                }
                interaction.matching.feedbackPanelVisible = backendState.feedbackVisible
            }

            questionInteractionStates[key] = interaction
        }
    }

    private func optionIndex(for optionID: String) -> Int? {
        ["A", "B", "C", "D", "E", "F"].firstIndex(of: optionID)
    }

    private func unitID(containingQuestionID questionID: String) -> String? {
        activeChapter.units.first { unit in
            unit.questions.contains { $0.id == questionID }
        }?.id
    }

    @MainActor
    private func openBackendSourceRouteIfPossible() async {
        do {
            guard let session = try await ensureV2ReviewSession() else {
                return
            }
            let response = try await apiClient.openV2SourceFromReview(sessionId: session.id, sourceAnchorId: nil)
            applyV2ReviewSessionResponse(response)
        } catch {
            generationErrorText = error.localizedDescription
        }
    }

    @MainActor
    private func returnFromBackendSourceRouteIfPossible() async {
        guard let session = v2ReviewSession else {
            return
        }

        do {
            let response = try await apiClient.returnFromV2SourceToReview(sessionId: session.id)
            applyV2ReviewSessionResponse(response)
        } catch {
            generationErrorText = error.localizedDescription
        }
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

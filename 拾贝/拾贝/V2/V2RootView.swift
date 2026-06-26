import SwiftUI
import UserNotifications

struct V2RootView: View {
    @AppStorage("v2.hasRequestedGenerationNotificationPermission")
    private var hasRequestedGenerationNotificationPermission = false
    @AppStorage("v2.usesMockData")
    private var usesMockData = false

    @State private var selectedTab: V2HomeTab = .learning
    @State private var route: V2AppRoute?
    @State private var routeStack: [V2AppRoute] = []
    @State private var showsGenerationStartedDialog = false
    @State private var showsGeneratingChapterCard = false
    @State private var questionInteractionStates: [String: V2QuestionInteractionState] = [:]
    @State private var backendChapters: [V2BackendChapter] = []
    @State private var backendChapter: V2BackendChapter?
    @State private var backendReviewChapter: V2ReviewChapterData?
    @State private var v2ReviewSession: V2BackendReviewSession?
    @State private var backendNotifications: [NotificationItem] = []
    @State private var backendFavoriteQuestions: [FavoriteQuestionRecord] = []
    @State private var generationPollingTask: Task<Void, Never>?
    @State private var generationErrorText = ""
    @State private var isSubmittingGeneration = false
    @State private var hasLoadedInitialBackendChapter = false

    private let apiClient: APIClient
    private let allowsMockDataToggle: Bool

    init(apiClient: APIClient = APIClient(), allowsMockDataToggle: Bool? = nil) {
        self.apiClient = apiClient
        #if DEBUG
        self.allowsMockDataToggle = allowsMockDataToggle ?? true
        #else
        self.allowsMockDataToggle = false
        #endif
    }

    private var usesFixtures: Bool {
        allowsMockDataToggle && usesMockData
    }

    var body: some View {
        ZStack(alignment: .top) {
            currentView
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)

            if showsGenerationStartedDialog {
                Color.black
                    .opacity(0.2)
                    .ignoresSafeArea()
                    .transition(.opacity)
                    .zIndex(100)

                GeometryReader { geometry in
                    V2GenerationStartedDialog {
                        dismissGenerationStartedDialog()
                    }
                    .position(
                        x: geometry.size.width / 2,
                        y: geometry.size.height / 2
                    )
                }
                .ignoresSafeArea()
                .transition(.scale(scale: 0.98).combined(with: .opacity))
                .zIndex(101)
            }
        }
        .task(id: usesFixtures) {
            await loadLatestBackendChapterIfNeeded()
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
                data: activeHomeData,
                selectedTab: $selectedTab,
                onOpenNotifications: { pushRoute(.notifications) },
                onOpenProfile: { pushRoute(.profile) },
                onOpenChapterDetail: { pushRoute(.chapterDetail) },
                onOpenNode: openNode
            )
        case .materials:
            V2MaterialsView(
                selectedTab: $selectedTab,
                usesMockData: usesFixtures,
                backendChapters: backendChapters,
                showsGeneratingChapterCard: showsGeneratingChapterCard,
                generatingChapterTitle: backendChapter?.title ?? "正在生成新的章节",
                generatingProgressText: generationDisplayText,
                generatedChapter: backendReviewChapter,
                openGeneratingChapter: openGeneratingChapter(id:),
                openChapter: openBackendChapter
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
                usesMockData: usesFixtures,
                savedQuestions: backendSavedQuestionItems,
                onOpenSavedQuestion: openSavedQuestion,
                onOpenBackendSavedQuestion: openBackendSavedQuestion
            )
        }
    }

    @ViewBuilder
    private func routeView(_ route: V2AppRoute) -> some View {
        switch route {
        case .notifications:
            V2NotificationView(
                usesMockData: usesFixtures,
                notifications: backendNotifications,
                onBack: goBack,
                onOpenSuccess: { pushRoute(.chapterDetail) },
                onOpenFailure: { pushRoute(.notificationFailureDetail) }
            )
        case .notificationFailureDetail:
            V2NotificationFailureDetailView(
                onBack: goBack,
                onSource: openSource,
                onRegenerate: showGeneratedChapterDetail
            )
        case .profile:
            V2ProfileView(
                usesMockData: $usesMockData,
                allowsMockDataToggle: allowsMockDataToggle,
                onBack: goBack
            )
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
            if let chapter = activeChapter {
                V2ChapterDetailView(
                    chapter: chapter,
                    onBack: goBack,
                    onContinue: continueFromChapterDetail,
                    onSource: openSource
                )
            } else {
                V2MissingRouteView(onBack: goBack)
            }
        case .sourceArticle:
            if let chapter = activeChapter {
                V2SourceArticleView(chapter: chapter, question: sourceQuestion, onBack: goBack)
            } else {
                V2MissingRouteView(onBack: goBack)
            }
        case .recommendedArticle:
            V2RecommendedArticleDetailView(
                onBack: goBack,
                onGenerate: showGeneratedChapterDetail
            )
        case .chapterOverview:
            if let chapter = activeChapter {
                V2ChapterOverviewView(
                    chapter: chapter,
                    onBack: goBack,
                    onContinue: openFirstUnit
                )
            } else {
                V2MissingRouteView(onBack: goBack)
            }
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
                        onFavoriteChange: { isSaved in
                            toggleBackendFavorite(questionID: questionID, isSaved: isSaved)
                        },
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
                        onFavoriteChange: { isSaved in
                            toggleBackendFavorite(questionID: questionID, isSaved: isSaved)
                        },
                        onContinue: { continueAfterQuestion(unitID: unitID, questionID: questionID) }
                    )
                }
            } else {
                V2MissingRouteView(onBack: goBack)
            }
        case .savedQuestion(let index):
            if let savedQuestion = V2ReviewFixture.savedQuestion(at: index),
               let question = V2ReviewFixture.question(for: savedQuestion) {
                let progress = (current: 0, total: 1)
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
        case .savedBackendQuestion(let savedQuestion):
            if let question = activeQuestion(unitID: savedQuestion.unitID, questionID: savedQuestion.questionID) {
                let progress = (current: 0, total: 1)
                switch question.kind {
                case .multipleChoice:
                    V2MultipleChoiceQuestionView(
                        question: question,
                        unitTitle: savedQuestion.unitTitle,
                        progress: progress,
                        state: multipleChoiceStateBinding(
                            key: backendSavedQuestionStateKey(questionID: savedQuestion.questionID),
                            favoriteOverride: isBackendQuestionFavorite(chapterID: savedQuestion.chapterID, questionID: savedQuestion.questionID)
                        ),
                        onBack: goBack,
                        onSource: openSource,
                        onFavoriteChange: { isSaved in
                            toggleBackendFavorite(chapterID: savedQuestion.chapterID, questionID: savedQuestion.questionID, isSaved: isSaved)
                        },
                        onContinue: { continueAfterBackendSavedQuestion(savedQuestion) }
                    )
                case .matching:
                    V2MatchingQuestionView(
                        question: question,
                        unitTitle: savedQuestion.unitTitle,
                        progress: progress,
                        state: matchingStateBinding(
                            key: backendSavedQuestionStateKey(questionID: savedQuestion.questionID),
                            favoriteOverride: isBackendQuestionFavorite(chapterID: savedQuestion.chapterID, questionID: savedQuestion.questionID)
                        ),
                        onBack: goBack,
                        onSource: openSource,
                        onFavoriteChange: { isSaved in
                            toggleBackendFavorite(chapterID: savedQuestion.chapterID, questionID: savedQuestion.questionID, isSaved: isSaved)
                        },
                        onContinue: { continueAfterBackendSavedQuestion(savedQuestion) }
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
            if let chapter = activeChapter {
                V2ChapterSummaryView(
                    chapter: chapter,
                    onBack: goBack,
                    onHome: { resetToHome(tab: .learning) },
                    onDetail: { pushRoute(.chapterDetail) }
                )
            } else {
                V2MissingRouteView(onBack: goBack)
            }
        }
    }

    private var sourceQuestion: V2ReviewQuestionData? {
        reviewQuestion(for: routeStack.last)
    }

    private func reviewQuestion(for sourceRoute: V2AppRoute?) -> V2ReviewQuestionData? {
        guard let sourceRoute else {
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
        case .savedBackendQuestion(let savedQuestion):
            return activeQuestion(unitID: savedQuestion.unitID, questionID: savedQuestion.questionID)
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
        guard usesFixtures else {
            return
        }
        selectedTab = .notes
        routeStack.removeAll()
        questionInteractionStates.removeValue(forKey: savedQuestionStateKey(index: index))
        route = .savedQuestion(index: index)
    }

    private func openBackendSavedQuestion(favoriteID: String) {
        guard let savedQuestion = backendSavedQuestionItem(id: favoriteID),
              selectBackendChapter(id: savedQuestion.chapterID) else {
            return
        }
        selectedTab = .notes
        routeStack.removeAll()
        questionInteractionStates.removeValue(forKey: backendSavedQuestionStateKey(questionID: savedQuestion.questionID))
        route = .savedBackendQuestion(item: savedQuestion)
    }

    private func openGeneratingChapter(id: String?) {
        guard let id, selectBackendChapter(id: id) else {
            pushRoute(.generatingChapterDetail)
            return
        }
        selectedTab = .materials
        pushRoute(.generatingChapterDetail)
    }

    private func openBackendChapter(id: String) {
        guard selectBackendChapter(id: id) else {
            pushRoute(.chapterDetail)
            return
        }
        selectedTab = .materials
        if backendReviewChapter != nil {
            pushRoute(.chapterDetail)
        } else {
            pushRoute(.generatingChapterDetail)
        }
    }

    @discardableResult
    private func selectBackendChapter(id: String) -> Bool {
        guard let chapter = backendChapters.first(where: { $0.id == id }) else {
            return false
        }
        applyBackendChapter(chapter)
        return true
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

    private func backendSavedQuestionStateKey(questionID: String) -> String {
        "notes::backend-saved-question::\(questionID)"
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

    private func continueAfterBackendSavedQuestion(_ currentQuestion: V2SavedQuestionDisplayItem) {
        questionInteractionStates.removeValue(forKey: backendSavedQuestionStateKey(questionID: currentQuestion.questionID))

        let savedQuestions = backendSavedQuestionItems
        guard let currentIndex = savedQuestions.firstIndex(where: { $0.questionID == currentQuestion.questionID }) else {
            resetToHome(tab: .notes)
            return
        }

        let nextIndex = currentIndex + 1
        guard savedQuestions.indices.contains(nextIndex) else {
            resetToHome(tab: .notes)
            return
        }

        let nextQuestion = savedQuestions[nextIndex]
        guard selectBackendChapter(id: nextQuestion.chapterID) else {
            resetToHome(tab: .notes)
            return
        }
        questionInteractionStates.removeValue(forKey: backendSavedQuestionStateKey(questionID: nextQuestion.questionID))
        replaceRoute(.savedBackendQuestion(item: nextQuestion))
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

    private func multipleChoiceStateBinding(
        key: String,
        favoriteOverride: Bool? = nil
    ) -> Binding<V2MultipleChoiceInteractionState> {
        let interaction = questionInteractionBinding(key: key)
        return Binding(
            get: {
                var state = interaction.wrappedValue.multipleChoice
                if let favoriteOverride {
                    state.isFavoriteSaved = favoriteOverride
                }
                return state
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
        let favoriteOverride = usesFixtures ? nil : isBackendQuestionFavorite(questionID: questionID)
        return multipleChoiceStateBinding(
            key: questionStateKey(unitID: unitID, questionID: questionID),
            favoriteOverride: favoriteOverride
        )
    }

    private func matchingStateBinding(
        key: String,
        favoriteOverride: Bool? = nil
    ) -> Binding<V2MatchingInteractionState> {
        let interaction = questionInteractionBinding(key: key)
        return Binding(
            get: {
                var state = interaction.wrappedValue.matching
                if let favoriteOverride {
                    state.isFavoriteSaved = favoriteOverride
                }
                return state
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
        let favoriteOverride = usesFixtures ? nil : isBackendQuestionFavorite(questionID: questionID)
        return matchingStateBinding(
            key: questionStateKey(unitID: unitID, questionID: questionID),
            favoriteOverride: favoriteOverride
        )
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

    private var activeChapter: V2ReviewChapterData? {
        backendReviewChapter ?? (usesFixtures ? V2ReviewFixture.chapter : nil)
    }

    private var activeHomeData: V2HomeData {
        if usesFixtures {
            return V2HomeFixture.home
        }
        guard usesBackendReviewChapter else {
            return V2HomeFixture.empty
        }

        guard let activeChapter else {
            return V2HomeFixture.empty
        }
        return V2HomeData(chapter: activeChapter)
    }

    private var activeFirstUnitID: String {
        activeChapter?.units.first?.id ?? ""
    }

    private var backendSavedQuestionItems: [V2SavedQuestionDisplayItem] {
        backendFavoriteQuestions.compactMap { record in
            backendSavedQuestionItem(record: record)
        }
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
        return !isTerminalGenerationStatus(chapter.status)
    }

    private var usesBackendReviewChapter: Bool {
        !usesFixtures && backendReviewChapter != nil && backendChapter?.status == "completed"
    }

    private func activeUnit(id: String) -> V2ReviewUnitData? {
        activeChapter?.units.first { $0.id == id }
    }

    private func activeQuestion(unitID: String, questionID: String) -> V2ReviewQuestionData? {
        activeUnit(id: unitID)?.questions.first { $0.id == questionID }
    }

    private func unitDisplayTitle(id: String) -> String? {
        guard let activeChapter,
              let index = activeChapter.units.firstIndex(where: { $0.id == id }) else {
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

        guard let activeChapter,
              let index = activeChapter.units.firstIndex(where: { $0.id == unitID }),
              activeChapter.units.indices.contains(index + 1) else {
            return nil
        }
        return activeChapter.units[index + 1]
    }

    private func progressIndex(unitID: String, questionID: String? = nil) -> (current: Int, total: Int) {
        guard let activeChapter else {
            return (1, 1)
        }
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
                    if chapter.progress?.isFinished == true || isTerminalGenerationStatus(chapter.status) {
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

    @MainActor
    private func loadLatestBackendChapterIfNeeded() async {
        guard !usesFixtures, !hasLoadedInitialBackendChapter else {
            return
        }
        hasLoadedInitialBackendChapter = true

        do {
            backendNotifications = (try? await apiClient.fetchNotifications()) ?? []
            backendFavoriteQuestions = (try? await apiClient.fetchFavoriteQuestions()) ?? []
            let chapters = try await apiClient.fetchV2Chapters()
            backendChapters = chapters
            guard let latestChapter = chapters.first else {
                return
            }
            applyBackendChapter(latestChapter)
            if !isTerminalGenerationStatus(latestChapter.status) {
                startGenerationPolling(chapterID: latestChapter.id)
            }
        } catch {
            generationErrorText = error.localizedDescription
        }
    }

    private func applyBackendChapter(_ chapter: V2BackendChapter) {
        let previousChapterID = backendChapter?.id
        backendChapter = chapter
        upsertBackendChapter(chapter)
        if previousChapterID != chapter.id {
            generationErrorText = ""
        }
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
            generationErrorText = ""
        } else if isFailedGenerationStatus(chapter.status) || chapter.progress?.status == "failed" {
            showsGeneratingChapterCard = true
            isSubmittingGeneration = false
        }
    }

    private func upsertBackendChapter(_ chapter: V2BackendChapter) {
        if let index = backendChapters.firstIndex(where: { $0.id == chapter.id }) {
            backendChapters[index] = chapter
        } else {
            backendChapters.insert(chapter, at: 0)
        }
    }

    private func isTerminalGenerationStatus(_ status: String) -> Bool {
        status == "completed" || isFailedGenerationStatus(status)
    }

    private func isFailedGenerationStatus(_ status: String) -> Bool {
        status == "failed_generation" || status == "failed_input"
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
        let sourceAnchorId = reviewQuestion(for: route)?.sourceAnchorId ?? sourceQuestion?.sourceAnchorId
        if usesBackendReviewChapter {
            Task {
                await openBackendSourceRouteIfPossible(sourceAnchorId: sourceAnchorId)
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

        if case .savedBackendQuestion = route {
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
        activeChapter?.units.first { unit in
            unit.questions.contains { $0.id == questionID }
        }?.id
    }

    private func isBackendQuestionFavorite(questionID: String) -> Bool {
        guard let chapterID = backendChapter?.id else {
            return false
        }
        return isBackendQuestionFavorite(chapterID: chapterID, questionID: questionID)
    }

    private func isBackendQuestionFavorite(chapterID: String, questionID: String) -> Bool {
        backendFavoriteRecord(chapterID: chapterID, questionID: questionID) != nil
    }

    private func backendFavoriteRecord(chapterID: String, questionID: String) -> FavoriteQuestionRecord? {
        backendFavoriteQuestions.first { record in
            record.chapterId == chapterID && record.questionId == questionID
        }
    }

    private func toggleBackendFavorite(questionID: String, isSaved: Bool) {
        guard let chapterID = backendChapter?.id else {
            return
        }
        toggleBackendFavorite(chapterID: chapterID, questionID: questionID, isSaved: isSaved)
    }

    private func toggleBackendFavorite(chapterID: String, questionID: String, isSaved: Bool) {
        guard !usesFixtures else {
            return
        }

        let previous = backendFavoriteQuestions

        if isSaved {
            guard backendFavoriteRecord(chapterID: chapterID, questionID: questionID) == nil else {
                return
            }
            let localRecord = FavoriteQuestionRecord(
                id: "local-\(chapterID)-\(questionID)",
                chapterId: chapterID,
                questionId: questionID,
                createdAt: Date.nowISO8601
            )
            backendFavoriteQuestions.insert(localRecord, at: 0)

            Task {
                do {
                    let saved = try await apiClient.createFavoriteQuestion(chapterId: chapterID, questionId: questionID)
                    await MainActor.run {
                        backendFavoriteQuestions.removeAll { record in
                            record.chapterId == chapterID && record.questionId == questionID
                        }
                        backendFavoriteQuestions.insert(saved, at: 0)
                    }
                } catch {
                    await MainActor.run {
                        backendFavoriteQuestions = previous
                        generationErrorText = error.localizedDescription
                    }
                }
            }
        } else {
            guard let existing = backendFavoriteRecord(chapterID: chapterID, questionID: questionID) else {
                return
            }
            backendFavoriteQuestions.removeAll { $0.id == existing.id }

            Task {
                do {
                    _ = try await apiClient.deleteFavoriteQuestion(id: existing.id)
                } catch {
                    await MainActor.run {
                        backendFavoriteQuestions = previous
                        generationErrorText = error.localizedDescription
                    }
                }
            }
        }
    }

    private func backendSavedQuestionItem(id: String) -> V2SavedQuestionDisplayItem? {
        guard let record = backendFavoriteQuestions.first(where: { $0.id == id }) else {
            return nil
        }
        return backendSavedQuestionItem(record: record)
    }

    private func backendSavedQuestionItem(record: FavoriteQuestionRecord) -> V2SavedQuestionDisplayItem? {
        guard let chapter = backendChapters.first(where: { $0.id == record.chapterId }),
              let reviewChapter = chapter.toReviewChapterData() else {
            return nil
        }

        for (unitIndex, unit) in reviewChapter.units.enumerated() {
            guard let question = unit.questions.first(where: { $0.id == record.questionId }) else {
                continue
            }

            return V2SavedQuestionDisplayItem(
                id: record.id,
                chapterID: record.chapterId,
                chapterTitle: reviewChapter.title,
                unitID: unit.id,
                unitTitle: "单元\(unitIndex + 1)",
                questionID: question.id,
                title: question.prompt.isEmpty ? question.title : question.prompt,
                source: reviewChapter.title,
                type: question.kind == .matching ? "连线题" : "选择题"
            )
        }

        return nil
    }

    @MainActor
    private func openBackendSourceRouteIfPossible(sourceAnchorId: String?) async {
        do {
            guard let session = try await ensureV2ReviewSession() else {
                return
            }
            let response = try await apiClient.openV2SourceFromReview(sessionId: session.id, sourceAnchorId: sourceAnchorId)
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

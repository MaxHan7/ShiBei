import SwiftUI
import UserNotifications

struct V2RootView: View {
    @AppStorage("v2.hasSeenGenerationStartedEducation")
    private var hasSeenGenerationStartedEducation = false
    @AppStorage("v2.hasRequestedGenerationNotificationPermission")
    private var hasRequestedGenerationNotificationPermission = false
    @AppStorage("v2.usesMockData")
    private var usesMockData = false
    @AppStorage("v2.activeLearningChapterID")
    private var activeLearningChapterID = ""

    @State private var selectedTab: V2HomeTab = .learning
    @State private var routeStore = V2RouteStore()
    @State private var showsDeleteChapterConfirmation = false
    @State private var questionInteractionStates: [String: V2QuestionInteractionState] = [:]
    @State private var backendChapters: [V2BackendChapter] = []
    @State private var backendChapter: V2BackendChapter?
    @State private var backendReviewChapter: V2ReviewChapterData?
    @State private var v2ReviewSession: V2BackendReviewSession?
    @State private var backendNotifications: [NotificationItem] = []
    @State private var backendFavoriteQuestions: [FavoriteQuestionRecord] = []
    @State private var recommendedArticleFilters = V2DemoContentProvider.recommendedArticleFilters
    @State private var recommendedArticles = V2DemoContentProvider.recommendedArticles
    @State private var recommendedArticleChapters: [String: V2BackendChapter] = [:]
    @State private var loadingRecommendedArticleIDs: Set<String> = []
    @State private var importingRecommendedArticleIDs: Set<String> = []
    @State private var generationPollingTask: Task<Void, Never>?
    @State private var hasLoadedInitialBackendChapter = false
    @State private var showsStartupSplash = true
    @State private var generationState = V2GenerationState()

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

    private var hasUnreadNotifications: Bool {
        backendNotifications.contains { !$0.dismissed && !$0.read }
    }

    var body: some View {
        ZStack(alignment: .top) {
            currentView
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)

            if showsStartupSplash {
                V2SplashView()
                    .transition(.opacity)
                    .zIndex(200)
            }

            if generationState.showsStartedDialog {
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
            await runStartupSequence()
        }
        .alert("删除章节", isPresented: $showsDeleteChapterConfirmation) {
            Button("取消", role: .cancel) {}
            Button("删除", role: .destructive) {
                Task {
                    await deleteSelectedBackendChapter()
                }
            }
        } message: {
            Text("删除后，这个章节和它的生成任务都会被移除。")
        }
        .onReceive(NotificationCenter.default.publisher(for: .shiBeiDidRegisterForRemoteNotifications)) { notification in
            guard let token = notification.userInfo?["deviceToken"] as? String else { return }
            Task {
                await registerPushToken(token)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .shiBeiDidReceiveRemoteNotificationResponse)) { notification in
            Task {
                await openRemoteNotification(userInfo: notification.userInfo ?? [:])
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .shiBeiDidFailRemoteNotificationRegistration)) { notification in
            let message = notification.userInfo?["message"] as? String ?? "无法注册系统通知"
            generationState.errorText = message
        }
    }

    @ViewBuilder
    private var currentView: some View {
        if let route = routeStore.current {
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
                showsUnreadNotificationBadge: hasUnreadNotifications,
                onOpenNotifications: { pushRoute(.notifications) },
                onOpenProfile: { pushRoute(.profile) },
                onOpenChapterDetail: openActiveLearningChapterDetail,
                onOpenNode: openNode
            )
        case .materials:
            V2MaterialsView(
                selectedTab: $selectedTab,
                usesMockData: usesFixtures,
                backendChapters: backendChapters,
                generatedChapterCount: generatedChapterCount,
                showsGeneratingChapterCard: generationState.showsChapterCard,
                generatingChapterTitle: backendChapter?.title ?? "正在生成新的章节",
                generatingChapterStatus: isActiveGenerationFailed ? .failed : .generating,
                generatingProgressText: generationDisplayText,
                generatedChapter: backendReviewChapter,
                openGeneratingChapter: openGeneratingChapter(id:),
                openChapter: openBackendChapter
            )
        case .upload:
            V2UploadView(
                selectedTab: $selectedTab,
                isSubmittingGeneration: generationState.isSubmitting,
                onGenerate: startV2Generation
            )
        case .discover:
            V2DiscoverView(
                selectedTab: $selectedTab,
                filters: recommendedArticleFilters,
                articles: recommendedArticles,
                openArticle: openRecommendedArticle
            )
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
                onOpenSuccess: { notification in
                    openNotification(notification, route: .chapterDetail)
                },
                onOpenFailure: { notification in
                    openNotification(notification, route: .generationFailureDetail)
                }
            )
        case .generationFailureDetail:
            V2GenerationFailureDetailView(
                title: "章节详情",
                failureReason: activeGenerationFailureReason,
                onBack: goBack,
                onSource: openSource,
                onDelete: { showsDeleteChapterConfirmation = true }
            )
        case .profile:
            V2ProfileView(
                usesMockData: $usesMockData,
                allowsMockDataToggle: allowsMockDataToggle,
                reviewedCount: profileReviewedKnowledgeCountText,
                streakDays: profileStreakDaysText,
                onBack: goBack
            )
        case .generatingChapterDetail:
            if isActiveGenerationFailed {
                V2GenerationFailureDetailView(
                    title: "章节详情",
                    failureReason: activeGenerationFailureReason,
                    onBack: goBack,
                    onSource: openSource,
                    onDelete: { showsDeleteChapterConfirmation = true }
                )
                .id("generating-detail-failed")
            } else {
                V2GeneratingChapterDetailView(
                    progress: backendChapter?.progress?.progress ?? 0,
                    statusText: generationDisplayText,
                    isCompleted: backendChapter?.toReviewChapterData() != nil,
                    onBack: goBack,
                    onSource: openSource,
                    onOpenChapter: { replaceRoute(.chapterDetail) },
                    onDelete: { showsDeleteChapterConfirmation = true }
                )
                .id("generating-detail-running")
            }
        case .chapterDetail:
            if let chapter = activeChapter {
                V2ChapterDetailView(
                    chapter: chapter,
                    primaryActionTitle: chapterDetailPrimaryActionTitle,
                    onBack: goBack,
                    onContinue: continueFromChapterDetail,
                    onSource: openSource,
                    onDelete: { showsDeleteChapterConfirmation = true }
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
        case .recommendedArticle(let articleID):
            if let article = recommendedArticle(id: articleID) {
                V2RecommendedArticleDetailView(
                    article: article,
                    chapter: recommendedArticleReviewChapter(id: articleID),
                    isLoading: loadingRecommendedArticleIDs.contains(articleID),
                    isImporting: importingRecommendedArticleIDs.contains(articleID),
                    onBack: goBack,
                    onLoad: { loadRecommendedArticleDetailIfNeeded(articleID: articleID) },
                    onGenerate: { importRecommendedArticle(id: articleID) }
                )
            } else {
                V2MissingRouteView(onBack: goBack)
            }
        case .chapterOverview:
            if let chapter = activeChapter {
                V2ChapterOverviewView(
                    chapter: chapter,
                    onBack: goBack,
                    onContinue: continueAfterChapterOverview
                )
            } else {
                V2MissingRouteView(onBack: goBack)
            }
        case .unitOverview(let unitID):
            if let unit = activeUnit(id: unitID) {
                V2UnitOverviewView(
                    unit: unit,
                    unitTitle: unitDisplayTitle(id: unitID) ?? unit.title,
                    progress: progressIndex(unitID: unitID),
                    onBack: goBack,
                    onContinue: { continueAfterUnitOverview(unitID: unitID) }
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
                        onAnswerReady: {
                            persistBackendAnswerProgress(unitID: unitID, questionID: questionID)
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
                        onAnswerReady: {
                            persistBackendAnswerProgress(unitID: unitID, questionID: questionID)
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
                    onHome: completeChapterReviewAndReturnHome,
                    onDetail: { pushRoute(.chapterDetail) }
                )
            } else {
                V2MissingRouteView(onBack: goBack)
            }
        }
    }

    private var sourceQuestion: V2ReviewQuestionData? {
        reviewQuestion(for: routeStore.previous)
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
        guard selectActiveLearningChapter() else {
            return
        }
        selectedTab = .learning
        if node.kind == .start {
            resetToRoute(.chapterOverview, tab: .learning)
        } else if node.id == v2ReviewSession?.currentCard.unitId,
                  let currentRoute = route(for: v2ReviewSession?.currentCard) {
            resetToRoute(currentRoute, tab: .learning)
        } else if usesBackendReviewChapter {
            Task {
                await replayBackendReviewFromUnit(unitID: node.id)
            }
        } else {
            resetToRoute(.unitOverview(unitID: node.id), tab: .learning)
        }
    }

    private func openActiveLearningChapterDetail() {
        guard selectActiveLearningChapter() else {
            return
        }
        pushRoute(.chapterDetail)
    }

    private func openSavedQuestion(index: Int) {
        guard usesFixtures else {
            return
        }
        selectedTab = .notes
        questionInteractionStates.removeValue(forKey: savedQuestionStateKey(index: index))
        routeStore.reset(to: .savedQuestion(index: index))
    }

    private func openBackendSavedQuestion(favoriteID: String) {
        guard let savedQuestion = backendSavedQuestionItem(id: favoriteID),
              selectBackendChapter(id: savedQuestion.chapterID) else {
            return
        }
        selectedTab = .notes
        questionInteractionStates.removeValue(forKey: backendSavedQuestionStateKey(questionID: savedQuestion.questionID))
        routeStore.reset(to: .savedBackendQuestion(item: savedQuestion))
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

    private func openRecommendedArticle(_ article: V2RecommendedArticleItem) {
        pushRoute(.recommendedArticle(articleID: article.id))
        loadRecommendedArticleDetailIfNeeded(articleID: article.id)
    }

    private func recommendedArticle(id: String) -> V2RecommendedArticleItem? {
        recommendedArticles.first { $0.id == id }
    }

    private func recommendedArticleReviewChapter(id: String) -> V2ReviewChapterData? {
        if usesFixtures {
            return V2ReviewFixture.chapter
        }
        return recommendedArticleChapters[id]?.toReviewChapterData()
    }

    private func loadRecommendedArticleDetailIfNeeded(articleID: String) {
        guard !usesFixtures,
              recommendedArticleChapters[articleID] == nil,
              !loadingRecommendedArticleIDs.contains(articleID) else {
            return
        }

        loadingRecommendedArticleIDs.insert(articleID)
        Task {
            do {
                let response = try await apiClient.fetchRecommendedArticleDetail(id: articleID)
                await MainActor.run {
                    mergeRecommendedArticle(response.article)
                    recommendedArticleChapters[articleID] = response.chapter
                    loadingRecommendedArticleIDs.remove(articleID)
                }
            } catch {
                await MainActor.run {
                    loadingRecommendedArticleIDs.remove(articleID)
                    generationState.errorText = error.localizedDescription
                }
            }
        }
    }

    private func importRecommendedArticle(id articleID: String) {
        guard !usesFixtures else {
            showGeneratedChapterDetail()
            return
        }
        guard !importingRecommendedArticleIDs.contains(articleID) else {
            return
        }

        importingRecommendedArticleIDs.insert(articleID)
        Task {
            do {
                let response = try await apiClient.importRecommendedArticle(id: articleID)
                await MainActor.run {
                    importingRecommendedArticleIDs.remove(articleID)
                    mergeRecommendedArticle(response.article)
                    recommendedArticleChapters[articleID] = response.chapter
                    applyBackendChapter(response.chapter)
                    activeLearningChapterID = response.chapter.id
                    selectedTab = .materials
                    generationState.resetAfterDelete()
                    routeStore.reset(to: .chapterDetail)
                }
            } catch {
                await MainActor.run {
                    importingRecommendedArticleIDs.remove(articleID)
                    generationState.errorText = error.localizedDescription
                }
            }
        }
    }

    private func mergeRecommendedArticle(_ article: V2RecommendedArticleItem) {
        if let index = recommendedArticles.firstIndex(where: { $0.id == article.id }) {
            recommendedArticles[index] = article
        } else {
            recommendedArticles.insert(article, at: 0)
        }
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

    private func continueAfterChapterOverview() {
        guard usesBackendReviewChapter else {
            openFirstUnit()
            return
        }

        Task {
            await advanceBackendReviewAndRoute(fallback: .unitOverview(unitID: activeFirstUnitID))
        }
    }

    private func continueAfterUnitOverview(unitID: String) {
        guard usesBackendReviewChapter else {
            openFirstQuestion(in: unitID)
            return
        }

        let fallback: V2AppRoute = firstQuestionID(in: unitID)
            .map { .question(unitID: unitID, questionID: $0) }
            ?? .unitSummary(unitID: unitID)

        Task {
            await advanceBackendReviewAndRoute(fallback: fallback)
        }
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
        if let practice = v2ReviewSession?.practice {
            return "review-practice::\(v2ReviewSession?.id ?? "session")::\(practice.id)::\(unitID)::\(questionID)"
        }
        return "review::\(v2ReviewSession?.id ?? "local")::\(unitID)::\(questionID)"
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
        guard usesBackendReviewChapter else {
            advanceLocalAfterUnit(unitID: unitID)
            return
        }

        Task {
            await advanceBackendReviewAndRoute(fallback: routeAfterUnitSummary(unitID: unitID))
        }
    }

    private func advanceLocalAfterUnit(unitID: String) {
        if let nextUnit = nextUnit(after: unitID) {
            replaceRoute(.unitOverview(unitID: nextUnit.id))
        } else {
            replaceRoute(.chapterSummary)
        }
    }

    private func routeAfterUnitSummary(unitID: String) -> V2AppRoute {
        if let nextUnit = nextUnit(after: unitID) {
            return .unitOverview(unitID: nextUnit.id)
        }
        return .chapterSummary
    }

    private func completeChapterReviewAndReturnHome() {
        guard usesBackendReviewChapter else {
            resetToHome(tab: .learning)
            return
        }

        Task {
            await advanceBackendReviewAndRoute(fallback: .chapterSummary, resetHomeOnCompletion: true)
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
        routeStore.clearStack()
        if activeUnit(id: currentNodeID) != nil {
            replaceRoute(.unitOverview(unitID: currentNodeID))
        } else {
            openFirstUnit()
        }
    }

    private var activeChapter: V2ReviewChapterData? {
        backendReviewChapter ?? (usesFixtures ? V2ReviewFixture.chapter : nil)
    }

    private var chapterDetailPrimaryActionTitle: String {
        guard !usesFixtures,
              backendChapter?.status == "completed",
              let session = v2ReviewSession ?? backendChapter?.v2ReviewSession,
              session.completedAt == nil else {
            return "开始复习"
        }
        return "继续复习"
    }

    private var activeHomeData: V2HomeData {
        if usesFixtures {
            return V2HomeFixture.home
        }
        guard let activeLearningReviewChapter,
              let activeLearningBackendChapter else {
            return V2HomeFixture.empty
        }
        return V2HomeData(
            chapter: activeLearningReviewChapter,
            reviewSession: activeLearningBackendChapter.v2ReviewSession
        )
    }

    private var activeLearningBackendChapter: V2BackendChapter? {
        if let chapter = backendChapters.first(where: { $0.id == activeLearningChapterID }),
           isHomeLearningCandidate(chapter) {
            return chapter
        }

        return backendChapters.first(where: isHomeLearningCandidate)
    }

    private func isHomeLearningCandidate(_ chapter: V2BackendChapter) -> Bool {
        guard chapter.status == "completed",
              chapter.toReviewChapterData() != nil else {
            return false
        }
        return chapter.v2ReviewSession?.completedAt == nil
    }

    private var activeLearningReviewChapter: V2ReviewChapterData? {
        activeLearningBackendChapter?.toReviewChapterData()
    }

    @discardableResult
    private func selectActiveLearningChapter() -> Bool {
        guard let chapter = activeLearningBackendChapter else {
            return false
        }
        applyBackendChapter(chapter)
        return true
    }

    private var generatedChapterCount: Int {
        let completedBackendCount = backendChapters.filter { $0.status == "completed" }.count
        if usesFixtures {
            return max(completedBackendCount, 1)
        }
        return completedBackendCount
    }

    private var profileReviewedKnowledgeCountText: String {
        if usesFixtures {
            return "35"
        }
        return String(profileReviewedKnowledgeCount)
    }

    private var profileStreakDaysText: String {
        if usesFixtures {
            return "7"
        }
        return String(profileLearningStreakDays)
    }

    private var profileReviewedKnowledgeCount: Int {
        backendChapters.reduce(0) { total, chapter in
            total + reviewedKnowledgeCount(in: chapter)
        }
    }

    private func reviewedKnowledgeCount(in chapter: V2BackendChapter) -> Int {
        let units = chapter.units ?? []
        guard !units.isEmpty, let session = chapter.v2ReviewSession else {
            return 0
        }

        if session.completedAt != nil {
            return units.count
        }

        let unitIds = Set(units.map(\.id))
        let reviewedUnitIds = Set(
            session.completedStepIds.compactMap { stepId -> String? in
                guard let separatorIndex = stepId.firstIndex(of: ":") else {
                    return nil
                }
                let unitId = String(stepId[..<separatorIndex])
                return unitIds.contains(unitId) ? unitId : nil
            }
        )
        return reviewedUnitIds.count
    }

    private var profileLearningStreakDays: Int {
        let calendar = Calendar.current
        let activeDays = Set(
            backendChapters.compactMap { chapter -> Date? in
                guard let session = chapter.v2ReviewSession else {
                    return nil
                }
                return (session.completedAt ?? session.updatedAt).v2ISO8601Date
                    ?? session.createdAt.v2ISO8601Date
            }
            .map { calendar.startOfDay(for: $0) }
        )

        guard !activeDays.isEmpty else {
            return 0
        }

        var streak = 0
        var day = calendar.startOfDay(for: Date())
        while activeDays.contains(day) {
            streak += 1
            guard let previousDay = calendar.date(byAdding: .day, value: -1, to: day) else {
                break
            }
            day = previousDay
        }

        return streak
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
        if !generationState.errorText.isEmpty {
            return generationState.errorText
        }
        return backendChapter?.progress?.displayTextOrFallback ?? "正在提交生成任务..."
    }

    private var isActiveGenerationFailed: Bool {
        guard let chapter = backendChapter else {
            return false
        }
        return isFailedGenerationStatus(chapter.status) || chapter.progress?.status == "failed"
    }

    private var activeGenerationFailureReason: String {
        let reason = backendChapter?.failureReason
            ?? backendChapter?.progress?.failureMessage
            ?? generationState.errorText
        guard !reason.isEmpty else {
            return "生成失败，请删除后重新上传。"
        }
        return userFacingGenerationFailureReason(reason)
    }

    private func userFacingGenerationFailureReason(_ reason: String) -> String {
        let lowercasedReason = reason.lowercased()
        let internalMarkers = [
            "payload.",
            "sourceanchor",
            "blockids",
            "schema",
            "json",
            "contract",
            "playwright",
            "api key",
            "openai_api_key",
            "deepseek_api_key"
        ]
        if internalMarkers.contains(where: { lowercasedReason.contains($0) }) {
            return "生成时遇到结构处理异常。可以删除章节后重新生成。"
        }
        if lowercasedReason.contains("timeout") || reason.contains("超时") {
            return "生成服务响应超时，请稍后重试。"
        }
        if reason.contains("HTTP 403") || reason.contains("HTTP 401") {
            return "这个链接暂时无法公开访问。可以换一个链接，或稍后重试。"
        }
        if reason.contains("HTTP 404") {
            return "没有找到这篇文章。可以检查链接是否正确。"
        }
        return reason
    }

    private var canOpenActiveSource: Bool {
        guard let activeChapter else {
            return false
        }
        return !activeChapter.sourceBody.isEmpty
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
        routeStore.reset(to: .generatingChapterDetail)
        backendChapter = nil
        backendReviewChapter = nil
        v2ReviewSession = nil
        questionInteractionStates.removeAll()
        let originalSourceURLString = URL(string: trimmed)?.scheme?.hasPrefix("http") == true ? trimmed : ""
        generationState.prepareForSubmission(originalSourceURLString: originalSourceURLString)
        generationPollingTask?.cancel()
        let clientRequestId = "ios-v2-\(UUID().uuidString)"

        if hasSeenGenerationStartedEducation {
            generationState.showsChapterCard = true
        } else {
            withAnimation(.easeOut(duration: 0.18)) {
                generationState.showsStartedDialog = true
            }
        }

        Task {
            do {
                let response = try await apiClient.createV2Chapter(
                    sourceText: trimmed,
                    clientRequestId: clientRequestId
                )
                await MainActor.run {
                    generationState.finishSubmitting()
                    applyBackendChapter(response.chapter)
                }
                startGenerationPolling(chapterID: response.chapter.id)
            } catch {
                await MainActor.run {
                    generationState.markError(error.localizedDescription)
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
                        await refreshBackendNotifications()
                        return
                    }
                } catch {
                    await MainActor.run {
                        generationState.errorText = error.localizedDescription
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
    private func runStartupSequence() async {
        async let minimumDisplayDuration: Void = sleepStartupSplashMinimumDuration()
        await loadLatestBackendChapterIfNeeded()
        await minimumDisplayDuration

        guard showsStartupSplash else {
            return
        }

        withAnimation(.easeOut(duration: 0.25)) {
            showsStartupSplash = false
        }
    }

    private func sleepStartupSplashMinimumDuration() async {
        try? await Task.sleep(nanoseconds: 650_000_000)
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
            if let recommendedResponse = try? await apiClient.fetchRecommendedArticles() {
                recommendedArticleFilters = recommendedResponse.filters
                recommendedArticles = recommendedResponse.articles
            }
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
            generationState.errorText = error.localizedDescription
        }
    }

    private func applyBackendChapter(_ chapter: V2BackendChapter) {
        let previousChapterID = backendChapter?.id
        backendChapter = chapter
        upsertBackendChapter(chapter)
        if previousChapterID != chapter.id {
            generationState.clearError()
            backendReviewChapter = nil
            v2ReviewSession = nil
        }
        if let reviewChapter = chapter.toReviewChapterData() {
            backendReviewChapter = reviewChapter
        }
        if let session = chapter.v2ReviewSession {
            v2ReviewSession = session
            hydrateLocalQuestionStates(from: session)
        }
        if chapter.progress?.status == "completed" || chapter.status == "completed" {
            generationState.showsChapterCard = false
            generationState.finishSubmitting()
            generationState.clearError()
        } else if isFailedGenerationStatus(chapter.status) || chapter.progress?.status == "failed" {
            generationState.showsChapterCard = true
            generationState.finishSubmitting()
            generationState.clearError()
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
        status == "failed_generation" || status == "failed_input" || status == "failed_questions" || status == "failed"
    }

    @MainActor
    private func deleteSelectedBackendChapter() async {
        guard let chapterID = backendChapter?.id else {
            resetToHome(tab: .materials)
            return
        }

        generationPollingTask?.cancel()
        generationPollingTask = nil

        do {
            _ = try await apiClient.deleteChapter(id: chapterID)
            backendChapters.removeAll { $0.id == chapterID }
            backendNotifications.removeAll { $0.chapterId == chapterID }
            backendFavoriteQuestions.removeAll { $0.chapterId == chapterID }
            if activeLearningChapterID == chapterID {
                activeLearningChapterID = ""
            }
            backendChapter = backendChapters.first
            backendReviewChapter = backendChapter?.toReviewChapterData()
            v2ReviewSession = backendChapter?.v2ReviewSession
            generationState.resetAfterDelete()
            resetToHome(tab: .materials)
        } catch {
            generationState.errorText = error.localizedDescription
        }
    }

    private func showGeneratedChapterDetail() {
        selectedTab = .materials
        routeStore.reset(to: .generatingChapterDetail)
        if hasSeenGenerationStartedEducation {
            generationState.showsChapterCard = true
        } else {
            generationState.showsChapterCard = false
            withAnimation(.easeOut(duration: 0.18)) {
                generationState.showsStartedDialog = true
            }
        }
    }

    private func dismissGenerationStartedDialog() {
        hasSeenGenerationStartedEducation = true
        let shouldRequestNotificationPermission = !hasRequestedGenerationNotificationPermission
        if shouldRequestNotificationPermission {
            hasRequestedGenerationNotificationPermission = true
        }

        withAnimation(.easeOut(duration: 0.16)) {
            generationState.showsStartedDialog = false
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.18) {
            withAnimation(.spring(response: 0.42, dampingFraction: 0.86)) {
                generationState.showsChapterCard = true
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

    @MainActor
    private func refreshBackendNotifications() async {
        guard !usesFixtures else { return }
        backendNotifications = (try? await apiClient.fetchNotifications()) ?? backendNotifications
    }

    private func registerPushToken(_ token: String) async {
        guard !usesFixtures else { return }

        do {
            _ = try await apiClient.registerPushToken(
                token,
                environment: .current,
                preferredLanguage: .zhHans
            )
        } catch {
            await MainActor.run {
                generationState.errorText = error.localizedDescription
            }
        }
    }

    private func openRemoteNotification(userInfo: [AnyHashable: Any]) async {
        await refreshBackendNotifications()

        let notificationID = userInfo["notificationId"] as? String
        let chapterID = userInfo["chapterId"] as? String
        let notificationType = userInfo["type"] as? String
        let notification = backendNotifications.first {
            (notificationID != nil && $0.id == notificationID) ||
            (chapterID != nil && $0.chapterId == chapterID)
        }

        if let notification {
            await MainActor.run {
                openNotification(
                    notification,
                    route: notification.type == .generationFailed ? .generationFailureDetail : .chapterDetail
                )
            }
            return
        }

        if let chapterID {
            await openNotificationChapter(chapterID: chapterID)
            await MainActor.run {
                resetToRoute(notificationType == "generation_failed" ? .generationFailureDetail : .chapterDetail, tab: .materials)
            }
        }
    }

    private func openNotification(_ notification: NotificationItem, route targetRoute: V2AppRoute) {
        Task {
            await dismissOpenedNotification(notification)
            await openNotificationChapter(chapterID: notification.chapterId)
            await MainActor.run {
                pushRoute(targetRoute)
            }
        }
    }

    @MainActor
    private func dismissOpenedNotification(_ notification: NotificationItem) async {
        if let index = backendNotifications.firstIndex(where: { $0.id == notification.id }) {
            backendNotifications[index].read = true
            backendNotifications[index].dismissed = true
        }

        guard !usesFixtures, !notification.dismissed else { return }

        do {
            let updated = try await apiClient.dismissNotification(id: notification.id)
            if let index = backendNotifications.firstIndex(where: { $0.id == updated.id }) {
                backendNotifications[index] = updated
            }
        } catch {
            generationState.errorText = error.localizedDescription
        }
    }

    private func openNotificationChapter(chapterID: String) async {
        guard !chapterID.isEmpty, backendChapter?.id != chapterID else { return }

        do {
            let chapter = try await apiClient.fetchV2Chapter(id: chapterID)
            await MainActor.run {
                applyBackendChapter(chapter)
            }
        } catch {
            await MainActor.run {
                generationState.errorText = error.localizedDescription
            }
        }
    }

    private func openSource() {
        guard canOpenActiveSource else {
            return
        }

        let sourceAnchorId = reviewQuestion(for: routeStore.current)?.sourceAnchorId ?? sourceQuestion?.sourceAnchorId
        if usesBackendReviewChapter {
            Task {
                await openBackendSourceRouteIfPossible(sourceAnchorId: sourceAnchorId)
            }
        }
        pushRoute(.sourceArticle)
    }

    private func pushRoute(_ nextRoute: V2AppRoute) {
        routeStore.push(nextRoute)
    }

    private func replaceRoute(_ nextRoute: V2AppRoute) {
        routeStore.replace(with: nextRoute)
    }

    private func resetToRoute(_ nextRoute: V2AppRoute, tab: V2HomeTab? = nil) {
        if let tab {
            selectedTab = tab
        }
        routeStore.reset(to: nextRoute)
    }

    private func resetToHome(tab: V2HomeTab? = nil) {
        if let tab {
            selectedTab = tab
        }
        routeStore.resetToRoot()
    }

    private func goBack() {
        guard let route = routeStore.current else {
            routeStore.clearStack()
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

        routeStore.pop()
    }

    @MainActor
    private func startOrResumeBackendReviewFromChapterDetail() async {
        guard let chapterID = backendChapter?.id else {
            openFirstUnit()
            return
        }

        do {
            let response = try await apiClient.startOrResumeV2ReviewSession(chapterId: chapterID)
            activeLearningChapterID = chapterID
            applyV2ReviewSessionResponse(response)
            selectedTab = .learning
            routeStore.clearStack()
            replaceRoute(route(for: response.reviewSession?.displayCard) ?? .unitOverview(unitID: activeFirstUnitID))
        } catch {
            generationState.errorText = error.localizedDescription
            openFirstUnit()
        }
    }

    @MainActor
    private func replayBackendReviewFromUnit(unitID: String) async {
        guard let chapterID = backendChapter?.id else {
            resetToRoute(.unitOverview(unitID: unitID), tab: .learning)
            return
        }

        do {
            let response = try await apiClient.replayV2ReviewSessionFromUnit(chapterId: chapterID, unitId: unitID)
            activeLearningChapterID = chapterID
            applyV2ReviewSessionResponse(response)
            selectedTab = .learning
            routeStore.clearStack()
            replaceRoute(route(for: response.reviewSession?.displayCard) ?? .unitOverview(unitID: unitID))
        } catch {
            generationState.errorText = error.localizedDescription
            resetToRoute(.unitOverview(unitID: unitID), tab: .learning)
        }
    }

    @MainActor
    private func advanceBackendReviewAndRoute(
        fallback: V2AppRoute,
        resetHomeOnCompletion: Bool = false
    ) async {
        do {
            guard let session = try await ensureV2ReviewSession() else {
                routeToReviewCard(fallback)
                return
            }

            let response = try await apiClient.advanceV2ReviewSession(sessionId: session.id)
            applyV2ReviewSessionResponse(response)

            if resetHomeOnCompletion, response.reviewSession?.completedAt != nil {
                resetToHome(tab: .learning)
                return
            }

            routeToReviewCard(route(for: response.reviewSession?.displayCard) ?? fallback)
        } catch {
            generationState.errorText = error.localizedDescription
            routeToReviewCard(fallback)
        }
    }

    @MainActor
    private func persistBackendAnswerProgress(unitID: String, questionID: String) {
        guard usesBackendReviewChapter,
              let payload = backendAnswerPayload(unitID: unitID, questionID: questionID) else {
            return
        }

        Task {
            do {
                guard let session = try await ensureV2ReviewSession() else {
                    return
                }
                let response = try await apiClient.answerV2Question(
                    sessionId: session.id,
                    unitId: unitID,
                    questionId: questionID,
                    result: payload.result,
                    selectedOptionId: payload.selectedOptionId,
                    matchedPairs: payload.matchedPairs,
                    lockedPairIds: payload.lockedPairIds
                )
                await MainActor.run {
                    applyV2ReviewSessionResponse(
                        response,
                        preservingCurrentCardIfMovedPastAnswerFor: (unitID: unitID, questionID: questionID)
                    )
                }
            } catch {
                await MainActor.run {
                    generationState.errorText = error.localizedDescription
                }
            }
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
                questionInteractionStates.removeValue(forKey: questionStateKey(unitID: unitID, questionID: questionID))
                routeToReviewCard(route(for: advanceResponse.reviewSession?.displayCard) ?? localRouteAfterQuestion(unitID: unitID, questionID: questionID))
                return
            }
        } catch {
            generationState.errorText = error.localizedDescription
        }

        advanceLocalAfterQuestion(unitID: unitID, questionID: questionID)
    }

    private func routeToReviewCard(_ route: V2AppRoute) {
        selectedTab = .learning
        replaceRoute(route)
    }

    private func localRouteAfterQuestion(unitID: String, questionID: String) -> V2AppRoute {
        if let nextQuestion = nextQuestion(after: questionID, in: unitID) {
            return .question(unitID: unitID, questionID: nextQuestion.id)
        }
        return .unitSummary(unitID: unitID)
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

    private func applyV2ReviewSessionResponse(
        _ response: V2ReviewSessionResponse,
        preservingCurrentCardIfMovedPastAnswerFor answeredQuestion: (unitID: String, questionID: String)? = nil
    ) {
        var responseSession = response.reviewSession ?? response.chapter.v2ReviewSession
        if let answeredQuestion,
           let currentCard = v2ReviewSession?.currentCard,
           shouldPreserveCurrentCard(
               currentCard,
               insteadOfAnswerSaveFor: answeredQuestion
           ),
           let session = responseSession {
            responseSession = V2BackendReviewSession(
                schemaVersion: session.schemaVersion,
                id: session.id,
                chapterId: session.chapterId,
                status: session.status,
                currentCard: currentCard,
                activeCard: session.activeCard,
                questionStates: session.questionStates,
                activeQuestionStates: session.activeQuestionStates,
                completedStepIds: session.completedStepIds,
                mode: session.mode,
                practice: session.practice,
                sourceRoute: session.sourceRoute,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                completedAt: session.completedAt
            )
        }
        let chapterWithSession = response.chapter.replacingReviewSession(responseSession)
        applyBackendChapter(chapterWithSession)
        if let session = responseSession {
            v2ReviewSession = session
            hydrateLocalQuestionStates(from: session)
        }
    }

    private func shouldPreserveCurrentCard(
        _ currentCard: V2BackendReviewCard,
        insteadOfAnswerSaveFor answeredQuestion: (unitID: String, questionID: String)
    ) -> Bool {
        guard currentCard.type == "question" || currentCard.type == "question_feedback" else {
            return true
        }
        return currentCard.unitId != answeredQuestion.unitID
            || currentCard.questionId != answeredQuestion.questionID
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
        for (questionID, backendState) in session.displayQuestionStates {
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
                        generationState.errorText = error.localizedDescription
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
                        generationState.errorText = error.localizedDescription
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
            generationState.errorText = error.localizedDescription
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
            generationState.errorText = error.localizedDescription
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
            .v2PageColumn()
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

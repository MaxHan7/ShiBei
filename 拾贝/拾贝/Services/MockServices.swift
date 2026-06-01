import Foundation

@MainActor
final class AppStore: ObservableObject {
    @Published var chapters: [Chapter]
    @Published var notifications: [NotificationItem]
    @Published var selectedTab: AppTab = .home
    @Published var selectedChapterId: String?
    @Published var route: AppRoute = .home
    @Published var chapterDetailReturnRoute: AppRoute = .chapters
    @Published var knowledgeListReturnRoute: AppRoute = .chapterDetail
    @Published var showingSubmittedToast = false
    @Published var showingNotificationEducation = false
    @Published var hasShownNotificationEducation = false
    @Published var showingDeleteConfirmation = false
    @Published var feedbackSheetContext: FeedbackSheetContext?
    @Published var selectedFeedbackQuestionId: String?
    @Published var latestFeedbackMessage = ""
    @Published var lastAnsweredQuestion: ReviewQuestion?
    @Published var favoriteQuestions: [FavoriteQuestionRecord] = []
    @Published var chapterSection: ChapterSection = .chapters
    @Published var favoriteReviewQuestionIds: [String] = []
    @Published var favoriteReviewRecords: [FavoriteQuestionRecord] = []
    @Published var favoriteReviewIndex = 0
    @Published var favoriteReviewActive = false
    @Published var sourceFocusText: String?
    @Published var dataMode: AppDataMode = .mock
    @Published var dataSourceMessage = ""
    @Published var cloudAPIBaseURLString: String
    @Published var anonymousDeviceId: String
    @Published var appLanguage: AppLanguage = .zhHans
    @Published var isBootstrapping = true
    @Published var isLoadingLocalAPI = false
    @Published var isWritingChapter = false
    @Published var isSubmittingReview = false
    @Published var isLoadingPushDiagnostics = false
    @Published var pushDiagnosticSummary = ""

    let chapterService: any ChapterServicing
    let reviewService: any ReviewServicing
    let notificationService: any NotificationServicing
    private let apiClient: APIClient
    private let localAPIChapterService: LocalAPIChapterService
    private let localAPIReviewService: LocalAPIReviewService
    private let localAPINotificationService: LocalAPINotificationService
    private let cloudAPIBaseURLKey = "cloudAPIBaseURLString"
    private let appLanguageKey = "appLanguage"
    private let favoriteQuestionsKey = "favoriteQuestions"
    private let deviceIdentityStore: DeviceIdentityStore
    private var generationPollTasks: [String: Task<Void, Never>] = [:]
    private var notificationObservers: [NSObjectProtocol] = []
    private var latestFeedbackWasSevere = false

    init(
        chapterService: any ChapterServicing = MockChapterService(),
        reviewService: any ReviewServicing = MockReviewService(),
        notificationService: any NotificationServicing = MockNotificationService(),
        apiClient: APIClient = APIClient(),
        deviceIdentityStore: DeviceIdentityStore = .shared
    ) {
        #if DEBUG
        let state = Self.makeDefaultState()
        #else
        let state = MockState(chapters: [], notifications: [], selectedChapterId: nil)
        #endif
        let deviceId = deviceIdentityStore.currentDeviceId()
        chapters = state.chapters
        notifications = state.notifications
        selectedChapterId = state.selectedChapterId
        self.chapterService = chapterService
        self.reviewService = reviewService
        self.notificationService = notificationService
        self.deviceIdentityStore = deviceIdentityStore
        self.apiClient = APIClient(baseURL: apiClient.baseURL, session: apiClient.session, decoder: apiClient.decoder, deviceId: deviceId)
        localAPIChapterService = LocalAPIChapterService(apiClient: self.apiClient)
        localAPIReviewService = LocalAPIReviewService(apiClient: self.apiClient)
        localAPINotificationService = LocalAPINotificationService(apiClient: self.apiClient)
        anonymousDeviceId = deviceId
        favoriteQuestions = Self.loadFavoriteQuestions(key: favoriteQuestionsKey)
        if let savedLanguage = UserDefaults.standard.string(forKey: appLanguageKey),
           let language = AppLanguage(rawValue: savedLanguage) {
            appLanguage = language
        }
        #if DEBUG
        cloudAPIBaseURLString = UserDefaults.standard.string(forKey: cloudAPIBaseURLKey) ?? ""
        dataMode = .mock
        dataSourceMessage = localized("debug.message.mock_ready")
        #else
        cloudAPIBaseURLString = APIClient.productionBaseURL.absoluteString
        dataMode = .cloudAPI
        dataSourceMessage = localized("debug.message.connecting_cloud")
        #endif
        installPushNotificationObservers()
    }

    func setAppLanguage(_ language: AppLanguage) {
        appLanguage = language
        UserDefaults.standard.set(language.rawValue, forKey: appLanguageKey)
        dataSourceMessage = dataMode == .mock ? localized("debug.message.mock_ready") : localized("debug.message.sync_complete")
        Task {
            await syncPushTokenIfAuthorized()
        }
    }

    func localized(_ key: String) -> String {
        L10n.string(key, language: appLanguage)
    }

    func localizedFormat(_ key: String, _ arguments: CVarArg...) -> String {
        String(
            format: L10n.string(key, language: appLanguage),
            locale: Locale(identifier: appLanguage.localeIdentifier),
            arguments: arguments
        )
    }

    func reviewPrimaryActionTitle(for chapter: Chapter) -> String {
        if chapter.status.isFailed || chapter.status.isProcessing {
            return localized("home.action.view_chapter")
        }
        if chapter.reviewSession?.status == .active {
            return localized("home.action.continue_review")
        }
        return localized("home.action.start_review")
    }

    var localizedDataSourceMessage: String {
        dataSourceMessage
    }

    var localizedLatestFeedbackMessage: String {
        latestFeedbackMessage
    }

    deinit {
        notificationObservers.forEach(NotificationCenter.default.removeObserver)
    }

    private static func makeDefaultState() -> MockState {
        let fixtureLoader = FixtureLoader()
        let completed = fixtureLoader.loadChapterFixture(named: "completed-chapter")
        let failed = fixtureLoader.loadChapterFixture(named: "failed-chapter")
        var loadedChapters = [completed.chapter, failed.chapter]
        loadedChapters.append(MockChapterFactory.processingChapter())
        loadedChapters.append(MockChapterFactory.nextChapter())

        return MockState(
            chapters: loadedChapters,
            notifications: [completed.notification, failed.notification].compactMap { $0 },
            selectedChapterId: completed.chapter.id
        )
    }

    private static func loadFavoriteQuestions(key: String) -> [FavoriteQuestionRecord] {
        guard let data = UserDefaults.standard.data(forKey: key) else { return [] }
        return (try? JSONDecoder().decode([FavoriteQuestionRecord].self, from: data)) ?? []
    }

    var activeHomeChapter: Chapter? {
        chapters.first { $0.status.isProcessing }
            ?? chapters.first { $0.reviewSession?.status == .active }
            ?? chapters.first { $0.id == selectedChapterId && $0.status == .completed && $0.reviewSession?.status == .completed }
            ?? chapters.first { $0.status == .completed && $0.reviewSession?.completedAt == nil }
    }

    var reviewedKnowledgePointCount: Int {
        chapters.reduce(0) { total, chapter in
            total + reviewedKnowledgePointCount(in: chapter)
        }
    }

    var reviewedCount: Int {
        reviewedKnowledgePointCount
    }

    var submissionTargetTitle: String {
        if dataMode == .mock, apiClient(for: .cloudAPI) != nil {
            return AppDataMode.cloudAPI.title
        }
        return dataMode.title
    }

    var isBetaAccount: Bool {
        true
    }

    var selectedChapter: Chapter? {
        guard let selectedChapterId else { return activeHomeChapter }
        return chapters.first { $0.id == selectedChapterId }
    }

    var favoriteQuestionCount: Int {
        favoriteDisplayItems.count
    }

    var hasFavoriteQuestions: Bool {
        favoriteQuestionCount > 0
    }

    var favoriteDisplayItems: [FavoriteQuestionDisplayItem] {
        favoriteQuestions.compactMap { record in
            guard let question = question(for: record.questionId, in: record.chapterId) else { return nil }
            return FavoriteQuestionDisplayItem(
                record: record,
                question: question,
                chapterTitle: chapters.first { $0.id == record.chapterId }?.title ?? localized("favorites.unknown_chapter")
            )
        }
    }

    var favoriteKnowledgePointDisplayItems: [FavoriteKnowledgePointDisplayItem] {
        var groups: [String: FavoriteKnowledgePointDisplayItem] = [:]
        var orderedKeys: [String] = []

        for record in favoriteQuestions {
            guard let question = question(for: record.questionId, in: record.chapterId) else { continue }
            let key = "\(record.chapterId)::\(question.knowledgePointId)"
            if var item = groups[key] {
                item.records.append(record)
                item.questions.append(question)
                groups[key] = item
            } else {
                orderedKeys.append(key)
                groups[key] = FavoriteKnowledgePointDisplayItem(
                    id: key,
                    pointTitle: question.pointTitle,
                    records: [record],
                    questions: [question]
                )
            }
        }

        return orderedKeys.compactMap { groups[$0] }
    }

    var isFavoriteReviewActive: Bool {
        route == .review && favoriteReviewActive
    }

    var isFavoriteExplanationActive: Bool {
        route == .explanation && favoriteReviewActive
    }

    var visibleNotifications: [NotificationItem] {
        notifications.filter { !$0.dismissed }
    }

    func selectChapter(_ chapter: Chapter, returnTo returnRoute: AppRoute = .chapters) {
        selectedChapterId = chapter.id
        chapterDetailReturnRoute = rootReturnRoute(for: returnRoute)
        chapterSection = .chapters
        selectedTab = .chapters
        route = .chapterDetail
        Task {
            await refreshSelectedChapterFromAPI()
        }
    }

    func isFavoriteQuestion(_ question: ReviewQuestion) -> Bool {
        favoriteQuestions.contains { $0.chapterId == question.chapterId && $0.questionId == question.id }
    }

    func toggleFavoriteQuestion(_ question: ReviewQuestion) async {
        let previous = favoriteQuestions
        if let existing = favoriteRecord(for: question) {
            favoriteQuestions.removeAll { $0.id == existing.id }
            if dataMode == .mock {
                persistFavoriteQuestions()
            } else {
                do {
                    guard let client = activeAPIClient else {
                        favoriteQuestions = previous
                        dataSourceMessage = missingAPIMessage(for: dataMode)
                        return
                    }
                    _ = try await client.deleteFavoriteQuestion(id: existing.id)
                } catch {
                    favoriteQuestions = previous
                    dataSourceMessage = localizedFormat("debug.message.favorite_remove_failed", userFacingErrorMessage(error))
                }
            }
        } else {
            let localRecord = FavoriteQuestionRecord(
                id: "\(question.chapterId)-\(question.id)",
                chapterId: question.chapterId,
                questionId: question.id,
                createdAt: Date.nowISO8601
            )
            favoriteQuestions.insert(localRecord, at: 0)
            if dataMode == .mock {
                persistFavoriteQuestions()
            } else {
                do {
                    guard let client = activeAPIClient else {
                        favoriteQuestions = previous
                        dataSourceMessage = missingAPIMessage(for: dataMode)
                        return
                    }
                    let saved = try await client.createFavoriteQuestion(chapterId: question.chapterId, questionId: question.id)
                    favoriteQuestions.removeAll { $0.chapterId == question.chapterId && $0.questionId == question.id }
                    favoriteQuestions.insert(saved, at: 0)
                } catch {
                    favoriteQuestions = previous
                    dataSourceMessage = localizedFormat("debug.message.favorite_add_failed", userFacingErrorMessage(error))
                }
            }
        }
        if !favoriteReviewActive {
            favoriteReviewQuestionIds.removeAll { id in
                favoriteQuestion(forRecordId: id) == nil
            }
            if favoriteReviewIndex >= favoriteReviewQuestionIds.count {
                favoriteReviewIndex = max(0, favoriteReviewQuestionIds.count - 1)
            }
        }
    }

    private func favoriteRecord(for question: ReviewQuestion) -> FavoriteQuestionRecord? {
        favoriteQuestions.first { $0.chapterId == question.chapterId && $0.questionId == question.id }
    }

    func openFavoriteQuestions() {
        chapterDetailReturnRoute = .chapters
        chapterSection = .favorites
        selectedTab = .chapters
        route = .chapters
    }

    func startFavoriteReview(from recordId: String? = nil) {
        startFavoriteReview(records: favoriteQuestions, from: recordId)
    }

    func startFavoriteReview(records inputRecords: [FavoriteQuestionRecord], from recordId: String? = nil) {
        let records = inputRecords.filter { record in
            question(for: record.questionId, in: record.chapterId) != nil
        }
        guard !records.isEmpty else {
            openFavoriteQuestions()
            return
        }
        let ids = records.map(\.id)
        favoriteReviewQuestionIds = ids
        favoriteReviewRecords = records
        if let recordId, let index = ids.firstIndex(of: recordId) {
            favoriteReviewIndex = index
        } else {
            favoriteReviewIndex = 0
        }
        favoriteReviewActive = true
        lastAnsweredQuestion = nil
        if let question = currentFavoriteQuestion() {
            selectedChapterId = question.chapterId
        }
        chapterSection = .favorites
        selectedTab = .chapters
        route = .review
    }

    func currentFavoriteQuestion() -> ReviewQuestion? {
        if favoriteReviewRecords.indices.contains(favoriteReviewIndex) {
            let record = favoriteReviewRecords[favoriteReviewIndex]
            return question(for: record.questionId, in: record.chapterId)
        }
        guard favoriteReviewQuestionIds.indices.contains(favoriteReviewIndex) else { return nil }
        return favoriteQuestion(forRecordId: favoriteReviewQuestionIds[favoriteReviewIndex])
    }

    func favoriteQuestionChapterTitle(_ question: ReviewQuestion) -> String {
        chapters.first { $0.id == question.chapterId }?.title ?? localized("favorites.unknown_chapter")
    }

    func submitFavoriteAttempt(question: ReviewQuestion) {
        selectedChapterId = question.chapterId
        lastAnsweredQuestion = question
        route = .explanation
    }

    func returnToFavoriteQuestions() {
        favoriteReviewQuestionIds = []
        favoriteReviewRecords = []
        favoriteReviewIndex = 0
        favoriteReviewActive = false
        lastAnsweredQuestion = nil
        chapterSection = .favorites
        selectedTab = .chapters
        route = .chapters
    }

    private func persistFavoriteQuestions() {
        if let data = try? JSONEncoder().encode(favoriteQuestions) {
            UserDefaults.standard.set(data, forKey: favoriteQuestionsKey)
        }
    }

    private func favoriteQuestion(forRecordId recordId: String) -> ReviewQuestion? {
        guard let record = favoriteQuestions.first(where: { $0.id == recordId })
                ?? favoriteReviewRecords.first(where: { $0.id == recordId }) else { return nil }
        return question(for: record.questionId, in: record.chapterId)
    }

    private func question(for questionId: String, in chapterId: String) -> ReviewQuestion? {
        chapters.first { $0.id == chapterId }?.questions.first { $0.id == questionId }
    }

    func bootstrapForCurrentEnvironment() async {
        isBootstrapping = true
        #if DEBUG
        isBootstrapping = false
        return
        #else
        guard dataMode == .cloudAPI else {
            isBootstrapping = false
            return
        }
        await loadCloudAPIReadOnly()
        isBootstrapping = false
        await syncPushTokenIfAuthorized()
        #endif
    }

    func syncPushTokenIfAuthorized() async {
        guard apiClient(for: .cloudAPI) != nil else { return }
        await PushNotificationService.registerIfAuthorized()
    }

    private func installPushNotificationObservers() {
        let center = NotificationCenter.default
        notificationObservers.append(center.addObserver(
            forName: .shiBeiDidRegisterForRemoteNotifications,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let token = notification.userInfo?["deviceToken"] as? String else { return }
            Task { @MainActor in
                await self?.registerPushToken(token)
            }
        })
        notificationObservers.append(center.addObserver(
            forName: .shiBeiDidFailRemoteNotificationRegistration,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            let rawMessage = notification.userInfo?["message"] as? String
            Task { @MainActor in
                guard let self else { return }
                let message = rawMessage ?? self.localized("push.message.registration_failed")
                self.dataSourceMessage = self.localizedFormat("push.message.registration_failed_with_error", message)
            }
        })
        notificationObservers.append(center.addObserver(
            forName: .shiBeiDidReceiveRemoteNotificationResponse,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            Task { @MainActor in
                await self?.openRemoteNotification(userInfo: notification.userInfo ?? [:])
            }
        })
    }

    private func registerPushToken(_ token: String) async {
        guard let client = apiClient(for: .cloudAPI) ?? activeAPIClient else {
            dataSourceMessage = localized("push.message.token_sync_unavailable")
            return
        }
        do {
            let response = try await client.registerPushToken(token, environment: .current, preferredLanguage: appLanguage)
            dataSourceMessage = response.apnsConfigured == false
                ? localized("push.message.enabled_pending_config")
                : localized("push.message.enabled")
        } catch {
            dataSourceMessage = localizedFormat("push.message.token_sync_failed", userFacingErrorMessage(error))
        }
    }

    func loadPushDiagnostics() async {
        guard let client = apiClient(for: .cloudAPI) ?? activeAPIClient else {
            pushDiagnosticSummary = localized("push.diagnostic.invalid_cloud")
            return
        }
        isLoadingPushDiagnostics = true
        defer { isLoadingPushDiagnostics = false }
        await syncPushTokenIfAuthorized()
        do {
            let status = try await client.fetchPushStatus()
            pushDiagnosticSummary = pushDiagnosticText(from: status)
        } catch {
            pushDiagnosticSummary = localizedFormat("push.diagnostic.failed", userFacingErrorMessage(error))
        }
    }

    var pushDiagnosticCopyText: String {
        """
        deviceId: \(anonymousDeviceId)
        cloud: \(cloudAPIBaseURLString.isEmpty ? APIClient.productionBaseURL.absoluteString : cloudAPIBaseURLString)
        dataMode: \(dataMode.rawValue)
        message: \(pushDiagnosticSummary)
        """
    }

    private func pushDiagnosticText(from status: PushStatusResponse) -> String {
        let apns = status.apns.configured ? localized("push.diagnostic.apns_configured") : localized("push.diagnostic.apns_unconfigured")
        let environment = status.apns.environment ?? "unknown"
        let tokenEnvironments = status.pushTokens.map { $0.environment.rawValue }.joined(separator: ", ")
        let tokens = status.pushTokenCount == 0
            ? localized("push.diagnostic.no_tokens")
            : localizedFormat("push.diagnostic.token_count", status.pushTokenCount, tokenEnvironments)
        let latestTokenUpdatedAt = status.pushTokens.map(\.updatedAt).max() ?? ""
        let currentTokenNotifications = latestTokenUpdatedAt.isEmpty
            ? status.recentNotifications
            : status.recentNotifications.filter { !$0.pushAttemptedAt.isEmpty && $0.pushAttemptedAt >= latestTokenUpdatedAt }
        let latest = currentTokenNotifications.first
        let latestText: String
        if let latest {
            let delivery = localizedPushDeliveryStatus(latest.pushDeliveryStatus)
            let error = latest.pushDeliveryError.isEmpty ? "" : localizedFormat("push.diagnostic.latest_error_suffix", latest.pushDeliveryError)
            latestText = localizedFormat("push.diagnostic.latest", delivery, error)
        } else {
            latestText = localized("push.diagnostic.latest_none")
        }
        return localizedFormat("push.diagnostic.summary", apns, environment, tokens, latestText)
    }

    private func localizedPushDeliveryStatus(_ status: String) -> String {
        switch status {
        case "sent":
            localized("push.diagnostic.delivery_sent")
        case "failed":
            localized("push.diagnostic.delivery_failed")
        case "no_tokens":
            localized("push.diagnostic.delivery_no_tokens")
        case "apns_not_configured":
            localized("push.diagnostic.delivery_apns_not_configured")
        case "":
            localized("push.diagnostic.delivery_not_attempted")
        default:
            status
        }
    }

    private func openRemoteNotification(userInfo: [AnyHashable: Any]) async {
        let chapterId = (userInfo["chapterId"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let notificationId = (userInfo["notificationId"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let type = (userInfo["type"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !chapterId.isEmpty else { return }

        dataMode = .cloudAPI
        selectedChapterId = chapterId
        chapterDetailReturnRoute = .notifications
        chapterSection = .chapters
        selectedTab = .chapters
        route = .chapterDetail

        if let client = apiClient(for: .cloudAPI) {
            do {
                async let fetchedChapter = client.fetchChapter(id: chapterId)
                async let fetchedNotifications = client.fetchNotifications()
                upsertChapter(try await fetchedChapter)
                notifications = try await fetchedNotifications
            } catch {
                dataSourceMessage = localizedFormat("push.message.open_failed", userFacingErrorMessage(error))
            }
        }

        guard !notificationId.isEmpty, let service = activeNotificationService else { return }
        do {
            let updated = type == NotificationType.generationCompleted.rawValue
                ? try await service.dismiss(id: notificationId)
                : try await service.markRead(id: notificationId)
            upsertNotification(updated)
        } catch {
            dataSourceMessage = localizedFormat("push.message.sync_status_failed", userFacingErrorMessage(error))
        }
    }

    func returnFromChapterDetail() {
        navigateToRootRoute(chapterDetailReturnRoute)
    }

    func showSelectedChapterDetail() {
        chapterSection = .chapters
        selectedTab = .chapters
        route = .chapterDetail
    }

    func openKnowledgeList(returnTo route: AppRoute = .chapterDetail) {
        knowledgeListReturnRoute = route
        selectedTab = .chapters
        self.route = .knowledgeList
    }

    func returnFromKnowledgeList() {
        route = knowledgeListReturnRoute
    }

    func exitReviewToHome() {
        if favoriteReviewActive {
            returnToFavoriteQuestions()
            return
        }
        selectedTab = .home
        route = .home
    }

    func showCompletedSummary(for chapter: Chapter) {
        selectedChapterId = chapter.id
        selectedTab = .home
        route = .summary
    }

    private func navigateToRootRoute(_ rootRoute: AppRoute) {
        switch rootReturnRoute(for: rootRoute) {
        case .home:
            selectedTab = .home
            route = .home
        case .notifications:
            selectedTab = .notifications
            route = .notifications
        case .profile:
            selectedTab = .profile
            route = .profile
        case .add:
            selectedTab = .add
            route = .add
        default:
            selectedTab = .chapters
            route = .chapters
        }
    }

    private func rootReturnRoute(for route: AppRoute) -> AppRoute {
        switch route {
        case .home, .notifications, .profile, .add:
            route
        default:
            .chapters
        }
    }

    func openSource(returnTo route: AppRoute = .chapterDetail, focusText: String? = nil) {
        sourceFocusText = focusText?.trimmingCharacters(in: .whitespacesAndNewlines)
        self.route = route == .explanation ? .reviewSource : .source
    }

    func returnFromSource() {
        route = route == .reviewSource ? .explanation : .chapterDetail
    }

    func openNotification(_ notification: NotificationItem) async {
        switch dataMode {
        case .mock:
            notificationService.markRead(notification.id, notifications: &notifications)
            if notification.type == .generationCompleted {
                notificationService.dismiss(notification.id, notifications: &notifications)
            }
        case .localAPI, .cloudAPI:
            notificationService.markRead(notification.id, notifications: &notifications)
            if notification.type == .generationCompleted {
                notificationService.dismiss(notification.id, notifications: &notifications)
            }
        }
        selectedChapterId = notification.chapterId
        chapterDetailReturnRoute = .notifications
        selectedTab = .chapters
        route = .chapterDetail
        await refreshSelectedChapterFromAPI()

        guard let notificationService = activeNotificationService else { return }
        do {
            let updated = notification.type == .generationCompleted
                ? try await notificationService.dismiss(id: notification.id)
                : try await notificationService.markRead(id: notification.id)
            upsertNotification(updated)
            dataSourceMessage = notification.type == .generationCompleted
                ? localizedFormat("notifications.message.archived", dataMode.apiLabel(language: appLanguage))
                : localizedFormat("notifications.message.marked_read", dataMode.apiLabel(language: appLanguage))
        } catch {
            dataSourceMessage = localizedFormat("notifications.message.update_failed", userFacingErrorMessage(error))
        }
    }

    func dismissNotification(_ notification: NotificationItem) async {
        switch dataMode {
        case .mock:
            notificationService.dismiss(notification.id, notifications: &notifications)
        case .localAPI, .cloudAPI:
            notificationService.dismiss(notification.id, notifications: &notifications)
            do {
                guard let notificationService = activeNotificationService else {
                    dataSourceMessage = missingAPIMessage(for: dataMode)
                    return
                }
                let updated = try await notificationService.dismiss(id: notification.id)
                upsertNotification(updated)
                dataSourceMessage = localizedFormat("notifications.message.removed", dataMode.apiLabel(language: appLanguage))
            } catch {
                dataSourceMessage = localizedFormat("notifications.message.remove_failed", userFacingErrorMessage(error))
            }
        }
    }

    func clearReadNotifications() async {
        let readNotifications = visibleNotifications.filter(\.read)
        guard !readNotifications.isEmpty else { return }
        for notification in readNotifications {
            await dismissNotification(notification)
        }
    }

    func createChapter(from input: String) async -> Bool {
        let parsedInput = ChapterInput.parse(input)
        guard parsedInput.canSubmit else {
            return false
        }
        let targetMode = submissionModeForCreate()
        let shouldReplaceMockState = dataMode == .mock && targetMode == .cloudAPI
        #if DEBUG
        print("[ShiBei] AppStore.createChapter start target=\(targetMode.rawValue), sourceType=\(parsedInput.sourceType.rawValue), canSubmit=\(parsedInput.canSubmit), device=\(anonymousDeviceId.suffix(6))")
        #endif
        isWritingChapter = true
        defer { isWritingChapter = false }

        do {
            let created: ChapterCreationResult
            switch targetMode {
            case .mock:
                dataSourceMessage = localized("debug.message.using_mock_generation")
                created = chapterService.createChapter(from: parsedInput)
            case .localAPI, .cloudAPI:
                guard let client = apiClient(for: targetMode) else {
                    dataSourceMessage = missingAPIMessage(for: targetMode)
                    #if DEBUG
                    print("[ShiBei] AppStore.createChapter missing valid API client for target=\(targetMode.rawValue), cloudURL=\(cloudAPIBaseURLString)")
                    #endif
                    return false
                }
                if targetMode == .cloudAPI {
                    await syncPushTokenIfAuthorized()
                }
                dataSourceMessage = localizedFormat("debug.message.submit_to_api", targetMode.apiLabel(language: appLanguage))
                let chapterService = LocalAPIChapterService(apiClient: client)
                created = try await chapterService.createChapter(from: parsedInput)
                if targetMode == .cloudAPI {
                    await syncPushTokenIfAuthorized()
                }
                dataSourceMessage = localizedFormat("debug.message.accepted_generating", targetMode.apiLabel(language: appLanguage))
                #if DEBUG
                print("[ShiBei] AppStore.createChapter accepted chapter=\(created.chapter.id), status=\(created.chapter.status.rawValue)")
                #endif
            }
            if shouldReplaceMockState {
                clearCurrentStateForCloudSubmission()
            }
            dataMode = targetMode
            await applyCreatedChapter(created)
            if targetMode != .mock, created.chapter.status.isProcessing {
                startGenerationPolling(for: created.chapter.id, mode: targetMode)
            }
            return true
        } catch {
            dataSourceMessage = localizedFormat("debug.message.submit_failed", targetMode.apiLabel(language: appLanguage), userFacingErrorMessage(error))
            #if DEBUG
            print("[ShiBei] AppStore.createChapter failed target=\(targetMode.rawValue), error=\(error.localizedDescription)")
            #endif
            return false
        }
    }

    private func applyCreatedChapter(_ created: ChapterCreationResult) async {
        upsertChapter(created.chapter)
        if let notification = created.notification {
            upsertNotification(notification)
        }
        selectedChapterId = created.chapter.id
        selectedTab = .home
        route = .home
        if await shouldShowNotificationEducation() {
            showingNotificationEducation = true
        } else {
            showingSubmittedToast = true
        }
    }

    private func shouldShowNotificationEducation() async -> Bool {
        guard !hasShownNotificationEducation else {
            return false
        }
        let status = await PushNotificationService.authorizationStatus()
        return status == .notDetermined
    }

    func finishNotificationEducation() async {
        hasShownNotificationEducation = true
        showingNotificationEducation = false
        showingSubmittedToast = true
        do {
            let granted = try await PushNotificationService.requestAuthorizationAndRegister()
            if granted {
                await syncPushTokenIfAuthorized()
            }
            dataSourceMessage = granted ? localized("push.message.enabled_generation") : localized("push.message.denied_in_app")
        } catch {
            dataSourceMessage = localizedFormat("push.message.permission_failed", userFacingErrorMessage(error))
        }
    }

    func applyMockScenario(_ scenario: MockScenario) {
        let fixtureLoader = FixtureLoader()
        let completed = fixtureLoader.loadChapterFixture(named: "completed-chapter")
        let active = fixtureLoader.loadActiveReviewSessionFixture(named: "active-review-session")

        let state: MockState
        switch scenario {
        case .emptyHome:
            state = MockState(chapters: [], notifications: [], selectedChapterId: nil)
        case .unreviewedChapter:
            var chapter = completed.chapter
            chapter.reviewSession = nil
            chapter.masteredPoints = 0
            state = MockState(chapters: [chapter, MockChapterFactory.nextChapter()], notifications: [], selectedChapterId: chapter.id)
        case .activeReview:
            var chapter = completed.chapter
            chapter.reviewSession = active.reviewSession
            state = MockState(chapters: [chapter, MockChapterFactory.nextChapter()], notifications: [], selectedChapterId: chapter.id)
        case .processingChapter:
            let chapter = MockChapterFactory.processingChapter()
            state = MockState(chapters: [chapter, completed.chapter], notifications: [], selectedChapterId: chapter.id)
        case .failedChapter:
            let chapter = MockChapterFactory.failedQuestionsChapter()
            let notification = MockNotificationFactory.failedNotification(for: chapter)
            state = MockState(chapters: [chapter, completed.chapter], notifications: [notification], selectedChapterId: chapter.id)
        case .successNotification:
            state = MockState(chapters: [completed.chapter, MockChapterFactory.nextChapter()], notifications: [completed.notification].compactMap { $0 }, selectedChapterId: completed.chapter.id)
        case .failedNotification:
            let chapter = MockChapterFactory.failedQuestionsChapter()
            let notification = MockNotificationFactory.failedNotification(for: chapter)
            state = MockState(chapters: [chapter, completed.chapter], notifications: [notification], selectedChapterId: chapter.id)
        }

        chapters = state.chapters
        notifications = state.notifications
        selectedChapterId = state.selectedChapterId
        selectedTab = scenario.targetTab
        route = scenario.targetRoute
        chapterDetailReturnRoute = .chapters
        showingSubmittedToast = false
        showingNotificationEducation = false
        showingDeleteConfirmation = false
        feedbackSheetContext = nil
        selectedFeedbackQuestionId = nil
        latestFeedbackMessage = ""
        latestFeedbackWasSevere = false
        lastAnsweredQuestion = nil
        favoriteReviewQuestionIds = []
        favoriteReviewRecords = []
        favoriteReviewIndex = 0
        favoriteReviewActive = false
        chapterSection = .chapters
        dataMode = .mock
        dataSourceMessage = localized("debug.message.mock_scenario_applied")
        isWritingChapter = false
        isSubmittingReview = false
        cancelGenerationPolling()
    }

    func resetToMockData() {
        let state = Self.makeDefaultState()
        chapters = state.chapters
        notifications = state.notifications
        selectedChapterId = state.selectedChapterId
        selectedTab = .home
        route = .home
        chapterDetailReturnRoute = .chapters
        dataMode = .mock
        dataSourceMessage = localized("debug.message.mock_ready")
        showingSubmittedToast = false
        showingNotificationEducation = false
        showingDeleteConfirmation = false
        feedbackSheetContext = nil
        selectedFeedbackQuestionId = nil
        latestFeedbackMessage = ""
        latestFeedbackWasSevere = false
        lastAnsweredQuestion = nil
        favoriteReviewQuestionIds = []
        favoriteReviewRecords = []
        favoriteReviewIndex = 0
        favoriteReviewActive = false
        chapterSection = .chapters
        isWritingChapter = false
        isSubmittingReview = false
        cancelGenerationPolling()
    }

    func loadLocalAPIReadOnly() async {
        await loadAPIReadOnly(mode: .localAPI)
    }

    func loadCloudAPIReadOnly() async {
        await loadAPIReadOnly(mode: .cloudAPI)
    }

    func saveCloudAPIBaseURL(_ value: String) {
        let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
        cloudAPIBaseURLString = normalized
        UserDefaults.standard.set(normalized, forKey: cloudAPIBaseURLKey)
        dataSourceMessage = normalized.isEmpty ? localized("debug.message.enter_cloud_url") : localized("debug.message.cloud_url_saved")
    }

    func resetAnonymousDeviceIdentity() {
        anonymousDeviceId = deviceIdentityStore.resetDeviceId()
        dataSourceMessage = localized("debug.message.device_reset")
        if dataMode != .mock {
            chapters = []
            notifications = []
            selectedChapterId = nil
            route = .home
            chapterDetailReturnRoute = .chapters
        }
    }

    private func loadAPIReadOnly(mode: AppDataMode) async {
        isLoadingLocalAPI = true
        dataSourceMessage = localizedFormat("debug.message.reading_api", mode.apiLabel(language: appLanguage))
        guard let client = apiClient(for: mode) else {
            dataMode = .mock
            dataSourceMessage = missingAPIMessage(for: mode)
            isLoadingLocalAPI = false
            return
        }
        do {
            let (chapters, notifications, favorites) = try await fetchAPIState(client: client)
            applyAPIState(chapters: chapters, notifications: notifications, favorites: favorites, mode: mode)
            selectedChapterId = activeHomeChapter?.id ?? chapters.first?.id
            selectedTab = .home
            route = .home
            dataMode = mode
            dataSourceMessage = localizedFormat("debug.message.read_api_success", mode.apiLabel(language: appLanguage), chapters.count, notifications.count)
        } catch {
            dataSourceMessage = localizedFormat("debug.message.read_api_failed", mode.apiLabel(language: appLanguage), userFacingErrorMessage(error))
        }
        isLoadingLocalAPI = false
    }

    func deleteMyDeviceData() async -> Bool {
        isWritingChapter = true
        defer { isWritingChapter = false }

        do {
            switch dataMode {
            case .mock:
                clearCurrentStateForCloudSubmission()
                persistFavoriteQuestions()
                dataSourceMessage = localized("debug.message.local_data_deleted")
            case .localAPI, .cloudAPI:
                guard let client = activeAPIClient else {
                    dataSourceMessage = missingAPIMessage(for: dataMode)
                    return false
                }
                _ = try await client.deleteDeviceData()
                clearCurrentStateForCloudSubmission()
                dataSourceMessage = localized("debug.message.my_data_deleted")
            }
            selectedTab = .home
            route = .home
            showingSubmittedToast = false
            showingNotificationEducation = false
            showingDeleteConfirmation = false
            feedbackSheetContext = nil
            selectedFeedbackQuestionId = nil
            latestFeedbackMessage = ""
            latestFeedbackWasSevere = false
            lastAnsweredQuestion = nil
            favoriteReviewQuestionIds = []
            favoriteReviewRecords = []
            favoriteReviewIndex = 0
            favoriteReviewActive = false
            chapterSection = .chapters
            return true
        } catch {
            dataSourceMessage = localizedFormat("debug.message.delete_data_failed", userFacingErrorMessage(error))
            return false
        }
    }

    func regenerateSelectedChapter() async {
        guard let chapter = selectedChapter else { return }
        isWritingChapter = true
        defer { isWritingChapter = false }

        do {
            let result: ChapterCreationResult
            switch dataMode {
            case .mock:
                result = chapterService.regenerateChapter(chapter)
            case .localAPI, .cloudAPI:
                guard let chapterService = activeChapterService else {
                    dataSourceMessage = missingAPIMessage(for: dataMode)
                    return
                }
                dataSourceMessage = localizedFormat("debug.message.request_regenerate", dataMode.apiLabel(language: appLanguage))
                result = try await chapterService.regenerateChapter(chapter)
                dataSourceMessage = localizedFormat("debug.message.regenerated", dataMode.apiLabel(language: appLanguage), result.chapter.visibleStatusText(language: appLanguage))
            }
            upsertChapter(result.chapter)
            if dataMode != .mock, result.chapter.status.isProcessing {
                startGenerationPolling(for: result.chapter.id, mode: dataMode)
            }
            notifications.removeAll { $0.chapterId == chapter.id && $0.type == .generationFailed }
            if let notification = result.notification {
                notifications.insert(notification, at: 0)
            }
            selectedTab = .home
            route = .home
            showingSubmittedToast = true
        } catch {
            dataSourceMessage = localizedFormat("debug.message.regenerate_failed", userFacingErrorMessage(error))
        }
    }

    func deleteSelectedChapter() async {
        guard let selectedChapterId else { return }
        isWritingChapter = true
        defer { isWritingChapter = false }

        do {
            switch dataMode {
            case .mock:
                chapterService.deleteChapter(selectedChapterId, chapters: &chapters, notifications: &notifications)
                favoriteQuestions.removeAll { $0.chapterId == selectedChapterId }
                persistFavoriteQuestions()
            case .localAPI, .cloudAPI:
                guard let chapterService = activeChapterService else {
                    dataSourceMessage = missingAPIMessage(for: dataMode)
                    return
                }
                dataSourceMessage = localizedFormat("debug.message.request_delete", dataMode.apiLabel(language: appLanguage))
                _ = try await chapterService.deleteChapter(selectedChapterId)
                chapters.removeAll { $0.id == selectedChapterId }
                notifications.removeAll { $0.chapterId == selectedChapterId }
                favoriteQuestions.removeAll { $0.chapterId == selectedChapterId }
                generationPollTasks[selectedChapterId]?.cancel()
                generationPollTasks[selectedChapterId] = nil
                dataSourceMessage = localizedFormat("debug.message.deleted_chapter", dataMode.apiLabel(language: appLanguage))
            }
            self.selectedChapterId = activeHomeChapter?.id ?? chapters.first?.id
            returnFromChapterDetail()
        } catch {
            dataSourceMessage = localizedFormat("debug.message.delete_failed", userFacingErrorMessage(error))
        }
    }

    func dismissFailureNotification() async {
        guard let chapter = selectedChapter else { return }
        switch dataMode {
        case .mock:
            notificationService.dismissFailure(for: chapter.id, chapters: &chapters, notifications: &notifications)
        case .localAPI, .cloudAPI:
            guard let notification = notifications.first(where: { $0.chapterId == chapter.id && $0.type == .generationFailed && !$0.dismissed }) else {
                notificationService.dismissFailure(for: chapter.id, chapters: &chapters, notifications: &notifications)
                returnFromChapterDetail()
                return
            }
            do {
                guard let notificationService = activeNotificationService else {
                    dataSourceMessage = missingAPIMessage(for: dataMode)
                    return
                }
                let updated = try await notificationService.dismiss(id: notification.id)
                upsertNotification(updated)
                dataSourceMessage = localizedFormat("notifications.message.failure_hidden", dataMode.apiLabel(language: appLanguage))
            } catch {
                dataSourceMessage = localizedFormat("notifications.message.failure_hide_failed", userFacingErrorMessage(error))
            }
        }
        returnFromChapterDetail()
    }

    func startOrResumeReview(for chapter: Chapter? = nil) async {
        let target = chapter ?? selectedChapter ?? activeHomeChapter
        guard let target, target.status == .completed else { return }
        selectedChapterId = target.id
        if route != .chapterDetail {
            chapterDetailReturnRoute = rootReturnRoute(for: route)
        }
        isSubmittingReview = true
        defer { isSubmittingReview = false }

        do {
            switch dataMode {
            case .mock:
                updateChapter(target.id) { chapter in
                    chapter.reviewSession = reviewService.startOrResumeSession(for: chapter)
                }
            case .localAPI, .cloudAPI:
                guard let reviewService = activeReviewService else {
                    dataSourceMessage = missingAPIMessage(for: dataMode)
                    return
                }
                dataSourceMessage = localizedFormat("debug.message.restore_review_session", dataMode.apiLabel(language: appLanguage))
                let response = try await reviewService.startOrResumeSession(for: target)
                upsertChapter(response.chapter)
                dataSourceMessage = localizedFormat("debug.message.review_session_ready", dataMode.apiLabel(language: appLanguage))
            }
            route = .review
        } catch {
            dataSourceMessage = localizedFormat("debug.message.start_review_failed", userFacingErrorMessage(error))
        }
    }

    func submitAttempt(answer: String?, result: AttemptResult) async {
        guard let chapter = selectedChapter, let session = chapter.reviewSession, let question = currentQuestion() else { return }
        isSubmittingReview = true
        defer { isSubmittingReview = false }
        lastAnsweredQuestion = question

        do {
            let updated: AttemptSubmissionResult
            switch dataMode {
            case .mock:
                updated = reviewService.submitAttempt(chapter: chapter, session: session, answer: answer, result: result)
            case .localAPI, .cloudAPI:
                guard let reviewService = activeReviewService else {
                    dataSourceMessage = missingAPIMessage(for: dataMode)
                    return
                }
                dataSourceMessage = localized("debug.message.submitting_answer")
                let response = try await reviewService.submitAttempt(chapter: chapter, session: session, question: question, answer: answer, result: result)
                updated = AttemptSubmissionResult(chapter: response.chapter, session: response.reviewSession, attempt: response.attempt)
                dataSourceMessage = localizedFormat("debug.message.answer_synced", dataMode.apiLabel(language: appLanguage))
            }
            upsertChapter(updated.chapter)
            if updated.session.status == .completed {
                route = .explanation
            } else if result == .correct && updated.attempt.isReinforcement {
                route = .review
            } else {
                route = .explanation
            }
        } catch {
            dataSourceMessage = localizedFormat("debug.message.answer_submit_failed", userFacingErrorMessage(error))
        }
    }

    func nextQuestion() {
        if favoriteReviewActive {
            pruneInvalidFavoriteReviewItems()
            guard !favoriteReviewQuestionIds.isEmpty else {
                returnToFavoriteQuestions()
                return
            }
            if favoriteReviewIndex >= favoriteReviewQuestionIds.count - 1 {
                returnToFavoriteQuestions()
            } else {
                favoriteReviewIndex += 1
                lastAnsweredQuestion = nil
                while favoriteReviewQuestionIds.indices.contains(favoriteReviewIndex),
                      currentFavoriteQuestion() == nil {
                    favoriteReviewQuestionIds.remove(at: favoriteReviewIndex)
                    if favoriteReviewRecords.indices.contains(favoriteReviewIndex) {
                        favoriteReviewRecords.remove(at: favoriteReviewIndex)
                    }
                }
                if let question = currentFavoriteQuestion() {
                    selectedChapterId = question.chapterId
                    route = .review
                } else {
                    returnToFavoriteQuestions()
                }
            }
            return
        }
        guard let chapter = selectedChapter, let session = chapter.reviewSession else { return }
        if session.status == .completed {
            route = .summary
            return
        }
        if reviewService.currentQuestion(in: chapter) == nil {
            dataSourceMessage = localized("debug.message.review_queue_empty")
        } else {
            route = .review
        }
    }

    private func pruneInvalidFavoriteReviewItems() {
        let paired = zip(favoriteReviewQuestionIds, favoriteReviewRecords).filter { _, record in
            question(for: record.questionId, in: record.chapterId) != nil
        }
        favoriteReviewQuestionIds = paired.map(\.0)
        favoriteReviewRecords = paired.map(\.1)
        if favoriteReviewIndex >= favoriteReviewQuestionIds.count {
            favoriteReviewIndex = max(0, favoriteReviewQuestionIds.count - 1)
        }
    }

    func submitFeedback(_ type: FeedbackType) async {
        guard let questionId = selectedFeedbackQuestionId,
              let chapter = selectedChapter,
              let session = chapter.reviewSession else { return }
        isSubmittingReview = true
        defer { isSubmittingReview = false }

        do {
            switch dataMode {
            case .mock:
                let result = reviewService.submitFeedback(chapter: chapter, session: session, questionId: questionId, type: type)
                upsertChapter(result.chapter)
                latestFeedbackWasSevere = type.isSevere
                latestFeedbackMessage = type.isSevere ? localized("feedback.message.removed") : localized("feedback.message.received")
            case .localAPI, .cloudAPI:
                guard let reviewService = activeReviewService else {
                    dataSourceMessage = missingAPIMessage(for: dataMode)
                    return
                }
                dataSourceMessage = localized("debug.message.submitting_feedback")
                let response = try await reviewService.submitFeedback(questionId: questionId, type: type)
                upsertChapter(response.chapter)
                latestFeedbackWasSevere = response.feedback.feedbackType.isSevere
                latestFeedbackMessage = response.feedback.feedbackType.isSevere ? localized("feedback.message.removed") : localized("feedback.message.received")
                dataSourceMessage = localizedFormat("debug.message.feedback_synced", dataMode.apiLabel(language: appLanguage))
            }
        } catch {
            dataSourceMessage = localizedFormat("debug.message.feedback_submit_failed", userFacingErrorMessage(error))
        }
    }

    func continueAfterFeedback() {
        feedbackSheetContext = nil
        if latestFeedbackWasSevere {
            nextQuestion()
        }
        latestFeedbackMessage = ""
        latestFeedbackWasSevere = false
        selectedFeedbackQuestionId = nil
    }

    func nextReviewableChapter(after chapterId: String) -> Chapter? {
        chapters.first { chapter in
            chapter.id != chapterId
                && chapter.status == .completed
                && !chapter.questions.isEmpty
                && chapter.reviewSession?.completedAt == nil
        }
    }

    func currentQuestion() -> ReviewQuestion? {
        guard let chapter = selectedChapter else { return nil }
        return reviewService.currentQuestion(in: chapter)
    }

    func refreshActiveHomeChapterFromAPI() async {
        guard dataMode != .mock,
              let chapter = activeHomeChapter,
              chapter.status.isProcessing else { return }
        selectedChapterId = chapter.id
        await refreshSelectedChapterFromAPI()
    }

    func refreshVisibleProcessingChapterFromAPI() async {
        guard dataMode != .mock else { return }
        if let selectedChapter, selectedChapter.status.isProcessing {
            await refreshSelectedChapterFromAPI()
            return
        }
        await refreshActiveHomeChapterFromAPI()
    }

    func refreshSelectedChapterFromAPI() async {
        guard dataMode != .mock,
              let selectedChapterId,
              let client = activeAPIClient else { return }
        do {
            let chapter = try await client.fetchChapter(id: selectedChapterId)
            upsertChapter(chapter)
            if chapter.status.isProcessing {
                startGenerationPolling(for: chapter.id, mode: dataMode)
            }
            if let latestNotifications = try? await client.fetchNotifications() {
                notifications = latestNotifications
            }
            dataSourceMessage = localizedFormat("debug.message.chapter_refreshed", dataMode.apiLabel(language: appLanguage), chapter.visibleStatusText(language: appLanguage))
        } catch {
            await handleMissingOrFailedAPIChapter(error, chapterId: selectedChapterId, mode: dataMode)
        }
    }

    func refreshSelectedChapterUntilResolved() async {
        while !Task.isCancelled {
            guard let chapter = selectedChapter, chapter.status.isProcessing else { return }
            await refreshSelectedChapterFromAPI()
            guard let updated = selectedChapter, updated.status.isProcessing else { return }
            do {
                try await Task.sleep(nanoseconds: 3_000_000_000)
            } catch {
                return
            }
        }
    }

    private func upsertChapter(_ chapter: Chapter) {
        if let index = chapters.firstIndex(where: { $0.id == chapter.id }) {
            chapters[index] = chapter
        } else {
            chapters.insert(chapter, at: 0)
        }
    }

    private func upsertNotification(_ notification: NotificationItem) {
        if let index = notifications.firstIndex(where: { $0.id == notification.id }) {
            notifications[index] = notification
        } else {
            notifications.insert(notification, at: 0)
        }
    }

    private func reviewedKnowledgePointCount(in chapter: Chapter) -> Int {
        chapter.lifetimeMasteredPointCount
    }

    private func submissionModeForCreate() -> AppDataMode {
        if dataMode == .mock, apiClient(for: .cloudAPI) != nil {
            return .cloudAPI
        }
        return dataMode
    }

    private func clearCurrentStateForCloudSubmission() {
        cancelGenerationPolling()
        chapters = []
        notifications = []
        favoriteQuestions = []
        favoriteReviewQuestionIds = []
        favoriteReviewRecords = []
        favoriteReviewIndex = 0
        favoriteReviewActive = false
        chapterSection = .chapters
        selectedChapterId = nil
    }

    private func startGenerationPolling(for chapterId: String, mode: AppDataMode) {
        guard let client = apiClient(for: mode) else { return }
        generationPollTasks[chapterId]?.cancel()
        let modeLabel = mode.apiLabel(language: appLanguage)
        generationPollTasks[chapterId] = Task { [weak self, client, mode, modeLabel] in
            for _ in 0..<240 {
                do {
                    try await Task.sleep(nanoseconds: 2_000_000_000)
                } catch {
                    return
                }
                if Task.isCancelled { return }
                do {
                    let chapter = try await client.fetchChapter(id: chapterId)
                    let latestNotifications = try? await client.fetchNotifications()
                    await MainActor.run {
                        guard let self else { return }
                        self.upsertChapter(chapter)
                        if let latestNotifications {
                            self.notifications = latestNotifications
                        }
                        if chapter.status.isProcessing {
                            self.dataSourceMessage = self.localizedFormat("debug.message.generation_in_progress", modeLabel, chapter.visibleStatusText(language: self.appLanguage))
                        } else {
                            self.dataSourceMessage = self.localizedFormat("debug.message.generation_finished", modeLabel, chapter.visibleStatusText(language: self.appLanguage))
                            self.generationPollTasks[chapterId] = nil
                        }
                    }
                    if !chapter.status.isProcessing { return }
                } catch {
                    await self?.handleMissingOrFailedAPIChapter(error, chapterId: chapterId, mode: mode)
                }
            }
            await MainActor.run {
                self?.generationPollTasks[chapterId] = nil
            }
        }
    }

    private func fetchAPIState(client: APIClient) async throws -> ([Chapter], [NotificationItem], [FavoriteQuestionRecord]) {
        async let fetchedChapters = client.fetchChapters()
        async let fetchedNotifications = client.fetchNotifications()
        async let fetchedFavorites = client.fetchFavoriteQuestions()
        return try await (fetchedChapters, fetchedNotifications, fetchedFavorites)
    }

    private func applyAPIState(chapters: [Chapter], notifications: [NotificationItem], favorites: [FavoriteQuestionRecord], mode: AppDataMode) {
        self.chapters = chapters
        self.notifications = notifications
        self.favoriteQuestions = favorites
        cancelGenerationPolling()
        chapters.filter { $0.status.isProcessing }.forEach { startGenerationPolling(for: $0.id, mode: mode) }
    }

    private func handleMissingOrFailedAPIChapter(_ error: Error, chapterId: String, mode: AppDataMode) async {
        if case APIClientError.httpStatus(404) = error {
            generationPollTasks[chapterId]?.cancel()
            generationPollTasks[chapterId] = nil
            await refreshAPIStateAfterMissingChapter(chapterId: chapterId, mode: mode)
            return
        }
        dataSourceMessage = localizedFormat("debug.message.refresh_generation_failed", userFacingErrorMessage(error))
    }

    private func refreshAPIStateAfterMissingChapter(chapterId: String, mode: AppDataMode) async {
        guard let client = apiClient(for: mode) else {
            markChapterAsCloudExpired(chapterId)
            return
        }
        do {
            let staleChapter = chapters.first { $0.id == chapterId }
            let (latestChapters, latestNotifications, latestFavorites) = try await fetchAPIState(client: client)
            applyAPIState(chapters: latestChapters, notifications: latestNotifications, favorites: latestFavorites, mode: mode)
            dataMode = mode
            if latestChapters.contains(where: { $0.id == chapterId }) {
                selectedChapterId = chapterId
                dataSourceMessage = localizedFormat("debug.message.resynced_chapter", mode.apiLabel(language: appLanguage))
                return
            }
            if latestChapters.isEmpty {
                selectedChapterId = nil
                selectedTab = .home
                route = .home
                dataSourceMessage = localizedFormat("debug.message.no_chapters", mode.apiLabel(language: appLanguage))
                return
            }
            if let staleChapter {
                upsertChapter(expiredCloudChapter(from: staleChapter))
                selectedChapterId = chapterId
                dataSourceMessage = localized("debug.message.cloud_record_expired")
            }
        } catch {
            markChapterAsCloudExpired(chapterId)
            dataSourceMessage = localized("debug.message.cloud_record_expired")
        }
    }

    private func markChapterAsCloudExpired(_ chapterId: String) {
        updateChapter(chapterId) { chapter in
            chapter = expiredCloudChapter(from: chapter)
        }
        dataSourceMessage = localized("debug.message.cloud_record_expired")
    }

    private func expiredCloudChapter(from chapter: Chapter) -> Chapter {
        var expired = chapter
        expired.status = .failedQuestions
        expired.displayStatusText = localized("debug.message.cloud_record_expired_status")
        expired.failureReason = localized("debug.message.cloud_record_expired_reason")
        expired.generationMeta = GenerationMeta(
            currentStage: ChapterStatus.failedQuestions.rawValue,
            qualifiedQuestionCount: chapter.generationMeta?.qualifiedQuestionCount,
            failedStage: ChapterStatus.failedQuestions.rawValue,
            failureReason: localized("debug.message.cloud_record_expired")
        )
        expired.updatedAt = Date.nowISO8601
        return expired
    }

    private func cancelGenerationPolling() {
        generationPollTasks.values.forEach { $0.cancel() }
        generationPollTasks.removeAll()
    }

    private func missingAPIMessage(for mode: AppDataMode) -> String {
        switch mode {
        case .mock:
            localized("debug.message.local_mock")
        case .localAPI:
            localized("debug.message.local_unavailable")
        case .cloudAPI:
            localized("debug.message.cloud_unavailable")
        }
    }

    private func userFacingErrorMessage(_ error: Error) -> String {
        if case APIClientError.decoding = error {
            return localized("error.decode_failed")
        }
        if case APIClientError.httpStatus(let statusCode) = error {
            if statusCode == 404 { return localized("error.not_found") }
            if statusCode == 422 { return localized("error.unprocessable") }
            if statusCode >= 500 { return localized("error.server_busy") }
        }
        if case APIClientError.invalidResponse = error {
            return localized("error.invalid_response")
        }
        if case APIClientError.serverMessage(let message) = error {
            return message
        }
        let nsError = error as NSError
        if nsError.domain == NSURLErrorDomain {
            return localized("error.network_failed")
        }
        return localized("error.generic_failed")
    }

    private func updateChapter(_ id: String, mutate: (inout Chapter) -> Void) {
        guard let index = chapters.firstIndex(where: { $0.id == id }) else { return }
        mutate(&chapters[index])
        chapters[index].updatedAt = Date.nowISO8601
    }

    private func apiClient(for mode: AppDataMode) -> APIClient? {
        switch mode {
        case .mock:
            return nil
        case .localAPI:
            return APIClient(
                baseURL: apiClient.baseURL,
                session: apiClient.session,
                decoder: apiClient.decoder,
                deviceId: anonymousDeviceId
            )
        case .cloudAPI:
            guard let url = URL(string: cloudAPIBaseURLString),
                  url.scheme == "https",
                  url.host?.isEmpty == false else {
                return nil
            }
            return APIClient(baseURL: url, deviceId: anonymousDeviceId)
        }
    }

    private var activeAPIClient: APIClient? {
        apiClient(for: dataMode)
    }

    private var activeChapterService: LocalAPIChapterService? {
        activeAPIClient.map(LocalAPIChapterService.init(apiClient:))
    }

    private var activeReviewService: LocalAPIReviewService? {
        activeAPIClient.map(LocalAPIReviewService.init(apiClient:))
    }

    private var activeNotificationService: LocalAPINotificationService? {
        activeAPIClient.map(LocalAPINotificationService.init(apiClient:))
    }
}

struct MockState {
    var chapters: [Chapter]
    var notifications: [NotificationItem]
    var selectedChapterId: String?
}

enum MockScenario: String, CaseIterable, Identifiable {
    case emptyHome
    case unreviewedChapter
    case activeReview
    case processingChapter
    case failedChapter
    case successNotification
    case failedNotification

    var id: String { rawValue }

    var title: String {
        title(language: .zhHans)
    }

    var subtitle: String {
        subtitle(language: .zhHans)
    }

    var targetTab: AppTab {
        switch self {
        case .successNotification, .failedNotification:
            .notifications
        case .failedChapter, .processingChapter:
            .chapters
        default:
            .home
        }
    }

    var targetRoute: AppRoute {
        switch self {
        case .successNotification, .failedNotification:
            .notifications
        case .failedChapter, .processingChapter:
            .chapterDetail
        default:
            .home
        }
    }
}

enum AppTab: String, CaseIterable, Identifiable {
    case home
    case chapters
    case add
    case notifications
    case profile

    var id: String { rawValue }

    var title: String {
        title(language: .zhHans)
    }

    var systemImage: String {
        switch self {
        case .home: "house"
        case .chapters: "list.bullet"
        case .add: "plus"
        case .notifications: "bell"
        case .profile: "person.crop.circle"
        }
    }

    var selectedSystemImage: String {
        switch self {
        case .home: "house.fill"
        case .chapters: "list.bullet.rectangle.fill"
        case .add: "plus"
        case .notifications: "bell.fill"
        case .profile: "person.crop.circle.fill"
        }
    }

    var outlineAssetName: String {
        switch self {
        case .home: "TabHomeOutline"
        case .chapters: "TabChaptersOutline"
        case .add: "AddTabIcon"
        case .notifications: "TabNotificationsOutline"
        case .profile: "TabProfileOutline"
        }
    }

    var filledAssetName: String {
        switch self {
        case .home: "TabHomeFilled"
        case .chapters: "TabChaptersFilled"
        case .add: "AddTabIcon"
        case .notifications: "TabNotificationsFilled"
        case .profile: "TabProfileFilled"
        }
    }
}

enum AppRoute {
    case home
    case add
    case chapters
    case notifications
    case profile
    case chapterDetail
    case favoriteQuestions
    case knowledgeList
    case source
    case reviewSource
    case review
    case explanation
    case summary
}

enum ChapterSection: String, CaseIterable, Identifiable {
    case chapters
    case favorites

    var id: String { rawValue }
}

struct ChapterCreationResult {
    var chapter: Chapter
    var notification: NotificationItem?
}

struct AttemptSubmissionResult {
    var chapter: Chapter
    var session: ReviewSession
    var attempt: ReviewAttempt
}

struct FeedbackSubmissionResult {
    var chapter: Chapter
    var message: String
}

final class FixtureLoader {
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        return decoder
    }()

    func loadChapterFixture(named name: String) -> ChapterFixture {
        do {
            let data = try loadData(named: name)
            return try decoder.decode(ChapterFixture.self, from: data)
        } catch {
            fatalError("Unable to load fixture \(name): \(error)")
        }
    }

    func loadActiveReviewSessionFixture(named name: String) -> ActiveReviewSessionFixture {
        do {
            let data = try loadData(named: name)
            return try decoder.decode(ActiveReviewSessionFixture.self, from: data)
        } catch {
            fatalError("Unable to load fixture \(name): \(error)")
        }
    }

    private func loadData(named name: String) throws -> Data {
        guard let url = Bundle.main.url(forResource: name, withExtension: "json") else {
            throw CocoaError(.fileNoSuchFile)
        }
        return try Data(contentsOf: url)
    }
}

final class MockChapterService: ChapterServicing {
    func createChapter(from input: ChapterInput) -> ChapterCreationResult {
        let chapter = MockChapterFactory.chapterFromInput(input)
        let notification = NotificationItem(
            id: "notification-\(UUID().uuidString)",
            chapterId: chapter.id,
            type: .generationCompleted,
            title: "generation_completed",
            body: chapter.title,
            read: false,
            dismissed: false,
            createdAt: Date.nowISO8601
        )
        return ChapterCreationResult(chapter: chapter, notification: notification)
    }

    func regenerateChapter(_ chapter: Chapter) -> ChapterCreationResult {
        let regenerated = MockChapterFactory.regeneratedChapter(from: chapter)
        let notification = NotificationItem(
            id: "notification-\(UUID().uuidString)",
            chapterId: regenerated.id,
            type: .generationCompleted,
            title: "generation_completed",
            body: regenerated.title,
            read: false,
            dismissed: false,
            createdAt: Date.nowISO8601
        )
        return ChapterCreationResult(chapter: regenerated, notification: notification)
    }

    func deleteChapter(_ id: String, chapters: inout [Chapter], notifications: inout [NotificationItem]) {
        chapters.removeAll { $0.id == id }
        notifications.removeAll { $0.chapterId == id }
    }
}

final class MockNotificationService: NotificationServicing {
    func markRead(_ id: String, notifications: inout [NotificationItem]) {
        guard let index = notifications.firstIndex(where: { $0.id == id }) else { return }
        notifications[index].read = true
    }

    func dismiss(_ id: String, notifications: inout [NotificationItem]) {
        guard let index = notifications.firstIndex(where: { $0.id == id }) else { return }
        notifications[index].read = true
        notifications[index].dismissed = true
    }

    func dismissFailure(for chapterId: String, chapters: inout [Chapter], notifications: inout [NotificationItem]) {
        if let chapterIndex = chapters.firstIndex(where: { $0.id == chapterId }) {
            chapters[chapterIndex].dismissedFromNotifications = true
        }
        for index in notifications.indices where notifications[index].chapterId == chapterId && notifications[index].type == .generationFailed {
            notifications[index].dismissed = true
            notifications[index].read = true
        }
    }
}

final class MockReviewService: ReviewServicing {
    private let initialMastery = 50
    private let reinforcementGap = 3
    private let schemaVersion = 2
    private let maxReinforcementsPerQuestion = 2

    func startOrResumeSession(for chapter: Chapter) -> ReviewSession {
        if let session = chapter.reviewSession, session.status == .active {
            return migrateSessionIfNeeded(session, chapter: chapter)
        }
        return ReviewSession(
            schemaVersion: schemaVersion,
            id: "session-\(UUID().uuidString)",
            chapterId: chapter.id,
            status: .active,
            queue: buildQueue(for: chapter),
            reinforcementQueue: [],
            currentQueueIndex: 0,
            attempts: [],
            masteryByPointId: Dictionary(uniqueKeysWithValues: chapter.knowledgePoints.map { ($0.id, $0.masteryScore) }),
            answeredPointIds: [],
            masteredThisRoundPointIds: [],
            completedQueueItemIds: [],
            correctQuestionIds: [],
            needsReviewQuestionIds: [],
            skippedPointIds: [],
            createdAt: Date.nowISO8601,
            updatedAt: Date.nowISO8601,
            completedAt: nil
        )
    }

    func currentQuestion(in chapter: Chapter) -> ReviewQuestion? {
        guard let session = chapter.reviewSession, session.status == .active else { return nil }
        guard session.queue.indices.contains(session.currentQueueIndex) else { return nil }
        let item = session.queue[session.currentQueueIndex]
        guard isQueueItemAvailable(item, in: chapter, session: session) else { return nil }
        return chapter.questions.first { $0.id == item.questionId }
    }

    func submitAttempt(chapter: Chapter, session: ReviewSession, answer: String?, result: AttemptResult) -> AttemptSubmissionResult {
        var chapter = chapter
        var session = session
        let item = session.queue[session.currentQueueIndex]
        let pointId = item.pointId
        let scoreBefore = session.masteryByPointId[pointId] ?? initialMastery
        let scoreAfter = min(100, max(0, scoreBefore + scoreDelta(for: result, isReinforcement: item.isReinforcement)))
        let attempt = ReviewAttempt(
            id: "attempt-\(UUID().uuidString)",
            reviewSessionId: session.id,
            chapterId: chapter.id,
            knowledgePointId: pointId,
            questionId: item.questionId,
            queueItemId: item.id,
            answer: answer ?? "",
            result: result,
            isReinforcement: item.isReinforcement,
            masteryScoreBefore: scoreBefore,
            masteryScoreAfter: scoreAfter,
            invalidatedByFeedback: false,
            skippedDueToQuestionFeedback: false,
            answeredAt: Date.nowISO8601
        )

        session.attempts.append(attempt)
        session.masteryByPointId[pointId] = scoreAfter
        appendUnique(pointId, to: &session.answeredPointIds)
        appendUnique(item.id, to: &session.completedQueueItemIds)

        if result == .correct {
            appendUnique(item.questionId, to: &session.correctQuestionIds)
            session.needsReviewQuestionIds.removeAll { $0 == item.questionId }
            session.reinforcementQueue.removeAll { $0 == item.questionId }
            removeFutureReinforcement(forQuestionId: item.questionId, session: &session)
        } else {
            scheduleReinforcement(for: item, chapter: chapter, session: &session)
        }
        recalculateRoundMastery(chapter: chapter, session: &session)

        if let nextIndex = nextAvailableQueueIndex(in: chapter, session: session, startIndex: session.currentQueueIndex + 1) {
            session.currentQueueIndex = nextIndex
        }
        if isComplete(chapter: chapter, session: session) {
            session.status = .completed
            session.completedAt = Date.nowISO8601
        }
        session.updatedAt = Date.nowISO8601
        chapter.reviewSession = session
        updateLifetimeMasteredPoints(for: &chapter, session: session)
        return AttemptSubmissionResult(chapter: chapter, session: session, attempt: attempt)
    }

    func submitFeedback(chapter: Chapter, session: ReviewSession, questionId: String, type: FeedbackType) -> FeedbackSubmissionResult {
        var chapter = chapter
        var session = session
        guard let question = chapter.questions.first(where: { $0.id == questionId }) else {
            return FeedbackSubmissionResult(chapter: chapter, message: "question_not_found")
        }

        let severe = type.isSevere
        var invalidatedAttemptId = ""
        var actionTaken = "downranked_for_user"
        if severe {
            appendUnique(questionId, to: &chapter.removedQuestionIds)
            actionTaken = "removed_from_pool"
            if let attemptIndex = session.attempts.lastIndex(where: { $0.questionId == questionId && !$0.invalidatedByFeedback }) {
                let attempt = session.attempts[attemptIndex]
                session.attempts[attemptIndex].invalidatedByFeedback = true
                session.attempts[attemptIndex].skippedDueToQuestionFeedback = true
                session.masteryByPointId[attempt.knowledgePointId] = attempt.masteryScoreBefore
                invalidatedAttemptId = attempt.id
            }
            session.queue = session.queue.enumerated()
                .filter { index, item in
                    index == session.currentQueueIndex || item.questionId != questionId
                }
                .map(\.element)
            session.completedQueueItemIds.removeAll { id in
                guard let item = session.queue.first(where: { $0.id == id }) else { return true }
                return item.questionId == questionId
            }
            session.correctQuestionIds.removeAll { $0 == questionId }
            session.needsReviewQuestionIds.removeAll { $0 == questionId }
            session.reinforcementQueue.removeAll { $0 == questionId }
            if pickQuestion(for: question.knowledgePointId, in: chapter) == nil {
                appendUnique(question.knowledgePointId, to: &session.skippedPointIds)
                session.answeredPointIds.removeAll { $0 == question.knowledgePointId }
                session.masteredThisRoundPointIds.removeAll { $0 == question.knowledgePointId }
                actionTaken = "skipped_for_session"
            }
            recalculateRoundMastery(chapter: chapter, session: &session)
        } else {
            appendUnique(questionId, to: &chapter.downgradedQuestionIds)
        }

        let feedback = QuestionFeedback(
            id: "feedback-\(UUID().uuidString)",
            questionId: questionId,
            knowledgePointId: question.knowledgePointId,
            chapterId: chapter.id,
            reviewSessionId: session.id,
            feedbackType: type,
            severity: severe ? "severe" : "light",
            actionTaken: actionTaken,
            invalidatedAttemptId: invalidatedAttemptId,
            createdAt: Date.nowISO8601
        )
        chapter.feedbackRecords.append(feedback)
        chapter.reviewSession = session
        updateLifetimeMasteredPoints(for: &chapter, session: session)
        let message = severe ? "feedback_removed" : "feedback_received"
        return FeedbackSubmissionResult(chapter: chapter, message: message)
    }

    private func scoreDelta(for result: AttemptResult, isReinforcement: Bool) -> Int {
        if result == .correct {
            return isReinforcement ? 10 : 15
        }
        return isReinforcement ? -15 : -20
    }

    private func scheduleReinforcement(for answeredItem: ReviewQueueItem, chapter: Chapter, session: inout ReviewSession) {
        removeFutureReinforcement(forQuestionId: answeredItem.questionId, session: &session)
        let nextAttempt = (answeredItem.reinforcementAttempt ?? 0) + 1
        guard nextAttempt <= maxReinforcementsPerQuestion else {
            appendUnique(answeredItem.questionId, to: &session.needsReviewQuestionIds)
            session.reinforcementQueue.removeAll { $0 == answeredItem.questionId }
            return
        }
        appendUnique(answeredItem.questionId, to: &session.reinforcementQueue)
        let item = ReviewQueueItem(
            id: "reinforce-\(UUID().uuidString)",
            pointId: answeredItem.pointId,
            questionId: answeredItem.questionId,
            isReinforcement: true,
            reinforcementAttempt: nextAttempt
        )
        let index = reinforcementInsertIndex(for: answeredItem.pointId, chapter: chapter, session: session)
        session.queue.insert(item, at: index)
    }

    private func reinforcementInsertIndex(for pointId: String, chapter: Chapter, session: ReviewSession) -> Int {
        var seenOtherQuestions = 0
        var index = session.currentQueueIndex + 1
        while index < session.queue.count {
            let item = session.queue[index]
            if isQueueItemAvailable(item, in: chapter, session: session), item.pointId != pointId {
                seenOtherQuestions += 1
                if seenOtherQuestions >= reinforcementGap {
                    return index + 1
                }
            }
            index += 1
        }
        return session.queue.count
    }

    private func removeFutureReinforcement(forQuestionId questionId: String, session: inout ReviewSession) {
        session.queue = session.queue.enumerated().filter { index, item in
            index <= session.currentQueueIndex || !(item.isReinforcement && item.questionId == questionId)
        }.map(\.element)
    }

    private func nextAvailableQueueIndex(in chapter: Chapter, session: ReviewSession, startIndex: Int) -> Int? {
        guard startIndex < session.queue.count else { return nil }
        for index in startIndex..<session.queue.count {
            if isQueueItemAvailable(session.queue[index], in: chapter, session: session) {
                return index
            }
        }
        return nil
    }

    private func isQueueItemAvailable(_ item: ReviewQueueItem, in chapter: Chapter, session: ReviewSession) -> Bool {
        !session.skippedPointIds.contains(item.pointId)
            && !chapter.removedQuestionIds.contains(item.questionId)
            && !session.completedQueueItemIds.contains(item.id)
            && chapter.questions.contains { $0.id == item.questionId }
    }

    private func pickQuestion(for pointId: String, in chapter: Chapter, excluding questionId: String = "") -> ReviewQuestion? {
        let candidates = chapter.questions
            .filter { $0.knowledgePointId == pointId && !chapter.removedQuestionIds.contains($0.id) }
            .sorted { lhs, rhs in
                if (lhs.sourceOrder ?? Int.max) != (rhs.sourceOrder ?? Int.max) {
                    return (lhs.sourceOrder ?? Int.max) < (rhs.sourceOrder ?? Int.max)
                }
                if (lhs.sourceStartOffset ?? Int.max) != (rhs.sourceStartOffset ?? Int.max) {
                    return (lhs.sourceStartOffset ?? Int.max) < (rhs.sourceStartOffset ?? Int.max)
                }
                return lhs.id < rhs.id
            }
        return candidates.first { $0.id != questionId } ?? candidates.first
    }

    private func isComplete(chapter: Chapter, session: ReviewSession) -> Bool {
        let required = requiredQueueItems(chapter: chapter, session: session)
        return !required.isEmpty && required.allSatisfy { session.completedQueueItemIds.contains($0.id) }
    }

    private func currentMasteredCount(chapter: Chapter, session: ReviewSession) -> Int {
        var session = session
        recalculateRoundMastery(chapter: chapter, session: &session)
        return session.masteredThisRoundPointIds.count
    }

    private func updateLifetimeMasteredPoints(for chapter: inout Chapter, session: ReviewSession) {
        let currentCount = currentMasteredCount(chapter: chapter, session: session)
        chapter.masteredPoints = min(
            chapter.knowledgePoints.count,
            max(chapter.masteredPoints, currentCount)
        )
    }

    private func requiredQueueItems(chapter: Chapter, session: ReviewSession) -> [ReviewQueueItem] {
        session.queue.filter { item in
            !session.skippedPointIds.contains(item.pointId)
                && !chapter.removedQuestionIds.contains(item.questionId)
                && chapter.questions.contains { $0.id == item.questionId }
        }
    }

    private func recalculateRoundMastery(chapter: Chapter, session: inout ReviewSession) {
        let mainItemsByPoint = Dictionary(grouping: session.queue.filter { item in
            !item.isReinforcement
                && !session.skippedPointIds.contains(item.pointId)
                && !chapter.removedQuestionIds.contains(item.questionId)
                && chapter.questions.contains { $0.id == item.questionId }
        }, by: \.pointId)
        session.masteredThisRoundPointIds = mainItemsByPoint.compactMap { pointId, items in
            items.allSatisfy { session.correctQuestionIds.contains($0.questionId) } ? pointId : nil
        }
    }

    private func migrateSessionIfNeeded(_ session: ReviewSession, chapter: Chapter) -> ReviewSession {
        var migrated = session
        if migrated.schemaVersion < schemaVersion {
            migrated.schemaVersion = schemaVersion
            migrated.queue = buildQueue(for: chapter)
            migrated.reinforcementQueue = []
            migrated.completedQueueItemIds = []
            migrated.correctQuestionIds = []
            migrated.needsReviewQuestionIds = []
            for attempt in migrated.attempts where !attempt.invalidatedByFeedback && attempt.result == .correct {
                appendUnique(attempt.questionId, to: &migrated.correctQuestionIds)
            }
            for item in migrated.queue where migrated.correctQuestionIds.contains(item.questionId) {
                appendUnique(item.id, to: &migrated.completedQueueItemIds)
            }
        } else {
            let queuedQuestionIds = Set(migrated.queue.filter { !$0.isReinforcement }.map(\.questionId))
            for question in reviewableQuestions(in: chapter) where !queuedQuestionIds.contains(question.id) {
                migrated.queue.append(ReviewQueueItem(
                    id: "queue-\(UUID().uuidString)",
                    pointId: question.knowledgePointId,
                    questionId: question.id,
                    isReinforcement: false,
                    reinforcementAttempt: 0
                ))
            }
        }
        recalculateRoundMastery(chapter: chapter, session: &migrated)
        if let nextIndex = nextAvailableQueueIndex(in: chapter, session: migrated, startIndex: 0) {
            migrated.currentQueueIndex = nextIndex
        }
        return migrated
    }

    private func buildQueue(for chapter: Chapter) -> [ReviewQueueItem] {
        reviewableQuestions(in: chapter).map { question in
            ReviewQueueItem(
                id: "queue-\(UUID().uuidString)",
                pointId: question.knowledgePointId,
                questionId: question.id,
                isReinforcement: false,
                reinforcementAttempt: 0
            )
        }
    }

    private func reviewableQuestions(in chapter: Chapter) -> [ReviewQuestion] {
        let orderedPointIds = chapter.knowledgePoints.sorted { lhs, rhs in
            if (lhs.sourceOrder ?? Int.max) != (rhs.sourceOrder ?? Int.max) {
                return (lhs.sourceOrder ?? Int.max) < (rhs.sourceOrder ?? Int.max)
            }
            if (lhs.sourceStartOffset ?? Int.max) != (rhs.sourceStartOffset ?? Int.max) {
                return (lhs.sourceStartOffset ?? Int.max) < (rhs.sourceStartOffset ?? Int.max)
            }
            return lhs.id < rhs.id
        }
        let pointOrder = Dictionary(uniqueKeysWithValues: orderedPointIds.enumerated().map { ($0.element.id, $0.offset) })
        return chapter.questions
            .filter { !chapter.removedQuestionIds.contains($0.id) }
            .sorted { lhs, rhs in
                let lhsPointOrder = pointOrder[lhs.knowledgePointId] ?? Int.max
                let rhsPointOrder = pointOrder[rhs.knowledgePointId] ?? Int.max
                if lhsPointOrder != rhsPointOrder { return lhsPointOrder < rhsPointOrder }
                if (lhs.sourceOrder ?? Int.max) != (rhs.sourceOrder ?? Int.max) {
                    return (lhs.sourceOrder ?? Int.max) < (rhs.sourceOrder ?? Int.max)
                }
                if (lhs.sourceStartOffset ?? Int.max) != (rhs.sourceStartOffset ?? Int.max) {
                    return (lhs.sourceStartOffset ?? Int.max) < (rhs.sourceStartOffset ?? Int.max)
                }
                return lhs.id < rhs.id
            }
    }
}

enum MockChapterFactory {
    static func processingChapter() -> Chapter {
        var chapter = baseChapter(id: "chapter-processing-demo", title: "一篇正在处理的长文章", sourceType: .articleLink)
        chapter.status = .generatingQuestions
        chapter.displayStatusText = "正在生成题目"
        chapter.questions = []
        return chapter
    }

    static func nextChapter() -> Chapter {
        var chapter = baseChapter(id: "chapter-next-demo", title: "AI 产品机会速记", sourceType: .text)
        chapter.knowledgePoints[0].title = "垂直场景比通用工具更容易落地"
        chapter.questions[0].stem = "为什么垂直 AI 产品更容易在早期验证价值？"
        return chapter
    }

    static func failedQuestionsChapter() -> Chapter {
        var chapter = baseChapter(id: "chapter-failed-questions-demo", title: "一篇知识点已提取但题目失败的文章", sourceType: .articleLink)
        chapter.status = .failedNoQualifiedQuestions
        chapter.displayStatusText = "暂时没能生成可复习题目"
        chapter.failureReason = "已经提取出知识点，但两次题目质量检查都没有题目达标。你可以重新生成题目，或先查看已提取的知识点。"
        chapter.questions = []
        chapter.qualitySummary = QualitySummary(averageQualityScore: 0, questionCoverageRate: 0)
        chapter.generationMeta = GenerationMeta(currentStage: "failed_no_qualified_questions", qualifiedQuestionCount: 0, failedStage: "quality_checking", failureReason: chapter.failureReason)
        return chapter
    }

    static func chapterFromInput(_ input: ChapterInput) -> Chapter {
        let content = input.rawText ?? input.sourceUrl ?? ""
        let titleSeed = input.sourceUrl.flatMap { URL(string: $0)?.host } ?? content
        let title = titleSeed.trimmingCharacters(in: .whitespacesAndNewlines).prefix(18)
        var chapter = baseChapter(id: "chapter-\(UUID().uuidString)", title: title.isEmpty ? "新添加的知识" : "\(title)", sourceType: input.sourceType)
        chapter.source.url = input.sourceUrl ?? ""
        chapter.source.accountOrDomain = input.sourceUrl.flatMap { URL(string: $0)?.host } ?? ""
        chapter.source.rawInput = content
        chapter.source.extractedText = input.sourceType == .text ? content : "链接内容会由本地 API 提取，mock 模式使用示例正文。"
        chapter.sourceText = chapter.source.extractedText
        return chapter
    }

    static func regeneratedChapter(from chapter: Chapter) -> Chapter {
        var regenerated = baseChapter(id: chapter.id, title: chapter.title, sourceType: chapter.sourceType)
        regenerated.source = chapter.source
        regenerated.sourceText = chapter.sourceText
        regenerated.createdAt = chapter.createdAt
        regenerated.updatedAt = Date.nowISO8601
        return regenerated
    }

    private static func baseChapter(id: String, title: String, sourceType: SourceType) -> Chapter {
        let now = Date.nowISO8601
        let source = ChapterSource(
            type: sourceType,
            title: title,
            url: sourceType == .text ? "" : "https://example.com/article",
            accountOrDomain: sourceType == .text ? "" : "example.com",
            rawInput: title,
            extractedText: "真正的进步不是问 AI 更多问题，而是把任务、边界和交付说清楚。",
            chapterId: id
        )
        let point = KnowledgePoint(
            id: "\(id)-kp-1",
            chapterId: id,
            title: "把任务和边界说清楚",
            summary: "使用 AI 前先明确任务、边界、资料范围和交付格式。",
            keyClaim: "AI 的价值来自执行明确任务，而不是一次性回答零散问题。",
            knowledgeType: .method,
            sourceSnippet: "真正的进步不是问 AI 更多问题，而是把任务、边界和交付说清楚。",
            sourceQuote: "真正的进步不是问 AI 更多问题，而是把任务、边界和交付说清楚。",
            testabilityScore: 5,
            masteryScore: 50,
            answeredCount: 0,
            lastReviewedAt: nil,
            lastDecayAppliedAt: nil,
            createdAt: now,
            updatedAt: now
        )
        let question = ReviewQuestion(
            id: "\(id)-q-1",
            chapterId: id,
            knowledgePointId: point.id,
            pointId: point.id,
            pointTitle: point.title,
            type: .scenarioJudgment,
            stem: "团队想让 AI 帮忙处理一项重复任务，哪种做法最符合这条知识点？",
            options: [
                QuestionOption(id: "A", text: "先让 AI 自由发挥，之后再看结果是否可用"),
                QuestionOption(id: "B", text: "先写清任务目标、边界、资料范围和交付格式"),
                QuestionOption(id: "C", text: "直接替换所有人工检查环节"),
                QuestionOption(id: "D", text: "不断更换工具，直到某个工具表现更好")
            ],
            correctOptionId: "B",
            correctUnderstanding: "AI 要进入真实工作流，关键是让任务目标、边界和交付要求足够清楚。",
            commonMisconception: "常见误区是把 AI 当成自由问答工具。",
            sourceSnippet: point.sourceSnippet,
            sourceQuote: point.sourceQuote,
            difficulty: "medium",
            qualityScore: ["average": 4.7],
            qualityIssues: []
        )
        return Chapter(
            id: id,
            title: title,
            status: .completed,
            displayStatusText: "已生成",
            failureReason: "",
            source: source,
            sourceType: sourceType,
            sourceText: source.extractedText,
            knowledgePoints: [point],
            filteredKnowledgePoints: [],
            questions: [question],
            qualitySummary: QualitySummary(averageQualityScore: 4.7, questionCoverageRate: 100),
            generationMeta: GenerationMeta(currentStage: "completed", qualifiedQuestionCount: 1, failedStage: nil, failureReason: nil),
            reviewSession: nil,
            masteredPoints: 0,
            removedQuestionIds: [],
            downgradedQuestionIds: [],
            feedbackRecords: [],
            dismissedFromNotifications: false,
            createdAt: now,
            updatedAt: now
        )
    }
}

enum MockNotificationFactory {
    static func failedNotification(for chapter: Chapter) -> NotificationItem {
        NotificationItem(
            id: "notification-\(chapter.id)",
            chapterId: chapter.id,
            type: .generationFailed,
            title: "generation_failed",
            body: chapter.title,
            read: false,
            dismissed: false,
            createdAt: Date.nowISO8601
        )
    }
}

private func appendUnique(_ value: String, to list: inout [String]) {
    if !list.contains(value) {
        list.append(value)
    }
}

extension Date {
    static var nowISO8601: String {
        ISO8601DateFormatter().string(from: Date())
    }
}

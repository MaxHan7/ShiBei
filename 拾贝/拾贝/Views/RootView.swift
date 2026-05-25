import SwiftUI

struct RootView: View {
    @ObservedObject var store: AppStore

    var body: some View {
        ZStack {
            if usesFullScreenRoute {
                currentScreen
            } else {
                tabRoot
            }
            if store.showingSubmittedToast {
                SubmittedToast(language: store.appLanguage) {
                    store.showingSubmittedToast = false
                }
                .transition(.opacity)
            }
        }
        .environment(\.locale, Locale(identifier: store.appLanguage.localeIdentifier))
        .animation(.easeInOut(duration: 0.18), value: store.showingSubmittedToast)
        .alert(store.localized("delete_chapter.alert.title"), isPresented: $store.showingDeleteConfirmation) {
            Button(store.localized("global.cancel"), role: .cancel) {}
            Button(store.localized("delete_chapter.alert.action"), role: .destructive) {
                Task {
                    await store.deleteSelectedChapter()
                }
            }
        } message: {
            Text(store.localized("delete_chapter.alert.message"))
        }
        .sheet(item: $store.feedbackSheetContext) { _ in
            FeedbackSheet(store: store)
                .presentationDetents([.height(340)])
        }
        .sheet(isPresented: $store.showingNotificationEducation) {
            NotificationEducationSheet(language: store.appLanguage) {
                Task {
                    await store.finishNotificationEducation()
                }
            }
            .presentationDetents([.height(330)])
            .presentationBackground(ShiBeiTheme.card)
            .presentationDragIndicator(.hidden)
        }
        .task {
            await store.bootstrapForCurrentEnvironment()
        }
    }

    private var usesFullScreenRoute: Bool {
        switch store.route {
        case .review, .explanation, .summary, .reviewSource:
            true
        default:
            false
        }
    }

    private var selectedTab: Binding<AppTab> {
        Binding {
            store.selectedTab
        } set: { tab in
            store.selectedTab = tab
            store.route = rootRoute(for: tab)
        }
    }

    private var tabRoot: some View {
        TabView(selection: selectedTab) {
            tabContent(for: .home)
                .tabItem {
                    tabLabel(for: .home)
                }
                .tag(AppTab.home)

            tabContent(for: .chapters)
                .tabItem {
                    tabLabel(for: .chapters)
                }
                .tag(AppTab.chapters)

            tabContent(for: .add)
                .tabItem {
                    addTabLabel
                }
                .tag(AppTab.add)

            tabContent(for: .notifications)
                .tabItem {
                    tabLabel(for: .notifications)
                }
                .tag(AppTab.notifications)

            tabContent(for: .profile)
                .tabItem {
                    tabLabel(for: .profile)
                }
                .tag(AppTab.profile)
        }
        .tint(ShiBeiTheme.yellow)
    }

    private func tabLabel(for tab: AppTab) -> some View {
        Label {
            Text(tab.title(language: store.appLanguage))
        } icon: {
            Image(store.selectedTab == tab ? tab.filledAssetName : tab.outlineAssetName)
                .renderingMode(.template)
                .font(.system(size: 20, weight: .regular))
        }
    }

    private var addTabLabel: some View {
        Image("AddTabIcon")
            .renderingMode(.original)
            .accessibilityLabel(store.localized("add.title"))
    }

    @ViewBuilder
    private var currentScreen: some View {
        switch store.route {
        case .home:
            HomeView(store: store)
        case .add:
            AddKnowledgeView(store: store)
        case .chapters:
            ChaptersView(store: store)
        case .notifications:
            NotificationsView(store: store)
        case .profile:
            ProfileView(store: store)
        case .chapterDetail:
            ChapterDetailView(store: store)
        case .favoriteQuestions:
            FavoriteQuestionsView(store: store)
        case .knowledgeList:
            KnowledgeListView(store: store)
        case .source:
            SourceView(store: store)
        case .reviewSource:
            SourceView(store: store)
        case .review:
            ReviewView(store: store)
        case .explanation:
            ExplanationView(store: store)
        case .summary:
            SummaryView(store: store)
        }
    }

    @ViewBuilder
    private func tabContent(for tab: AppTab) -> some View {
        switch tab {
        case .home:
            HomeView(store: store)
        case .chapters:
            chaptersTabContent
        case .add:
            AddKnowledgeView(store: store)
        case .notifications:
            NotificationsView(store: store)
        case .profile:
            ProfileView(store: store)
        }
    }

    @ViewBuilder
    private var chaptersTabContent: some View {
        switch store.route {
        case .chapterDetail:
            ChapterDetailView(store: store)
        case .favoriteQuestions:
            FavoriteQuestionsView(store: store)
        case .knowledgeList:
            KnowledgeListView(store: store)
        case .source:
            SourceView(store: store)
        case .reviewSource:
            SourceView(store: store)
        default:
            ChaptersView(store: store)
        }
    }

    private func rootRoute(for tab: AppTab) -> AppRoute {
        switch tab {
        case .home:
            .home
        case .chapters:
            .chapters
        case .add:
            .add
        case .notifications:
            .notifications
        case .profile:
            .profile
        }
    }
}

private struct NotificationEducationSheet: View {
    let language: AppLanguage
    let continueAction: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "bell.badge")
                .font(.system(size: 28, weight: .semibold))
                .frame(width: 58, height: 58)
                .foregroundStyle(ShiBeiTheme.text)
                .background(ShiBeiTheme.yellow)
                .clipShape(Circle())
            Text(L10n.string("notification_education.title", language: language))
                .font(.system(size: 22, weight: .bold))
            Text(L10n.string("notification_education.body", language: language))
                .font(.system(size: 15))
                .foregroundStyle(ShiBeiTheme.muted)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
            PrimaryButton(title: L10n.string("notification_education.action", language: language), systemImage: "arrow.right", action: continueAction)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(ShiBeiTheme.card)
    }
}

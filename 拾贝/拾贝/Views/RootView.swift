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
                SubmittedToast {
                    store.showingSubmittedToast = false
                }
                .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.18), value: store.showingSubmittedToast)
        .alert("删除这个章节？", isPresented: $store.showingDeleteConfirmation) {
            Button("取消", role: .cancel) {}
            Button("删除章节", role: .destructive) {
                Task {
                    await store.deleteSelectedChapter()
                }
            }
        } message: {
            Text("删除后，本章节的复习进度、反馈记录和通知都会一起移除。")
        }
        .sheet(item: $store.feedbackSheetContext) { _ in
            FeedbackSheet(store: store)
                .presentationDetents([.height(340)])
        }
        .sheet(isPresented: $store.showingNotificationEducation) {
            NotificationEducationSheet {
                store.finishNotificationEducation()
            }
            .presentationDetents([.height(330)])
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
            Text(tab.title)
        } icon: {
            Image(store.selectedTab == tab ? tab.filledAssetName : tab.outlineAssetName)
                .renderingMode(.template)
                .font(.system(size: 20, weight: .regular))
        }
    }

    private var addTabLabel: some View {
        Image("AddTabIcon")
            .renderingMode(.original)
            .accessibilityLabel("添加知识")
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
    let continueAction: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "bell.badge")
                .font(.system(size: 28, weight: .semibold))
                .frame(width: 58, height: 58)
                .foregroundStyle(ShiBeiTheme.text)
                .background(ShiBeiTheme.yellow)
                .clipShape(Circle())
            Text("生成完成后提醒你")
                .font(.system(size: 22, weight: .bold))
            Text("拾贝会在章节生成完成或失败时提醒你。当前阶段先使用应用内通知页和提交提示，不会触发系统权限弹窗。")
                .font(.system(size: 15))
                .foregroundStyle(ShiBeiTheme.muted)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
            PrimaryButton(title: "开启通知", systemImage: "arrow.right", action: continueAction)
        }
        .padding(24)
        .background(ShiBeiTheme.card)
    }
}

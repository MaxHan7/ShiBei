import SwiftUI

struct V2RootView: View {
    @State private var selectedTab: V2HomeTab = .learning
    @State private var route: V2AppRoute?
    @State private var sourceReturnRoute: V2AppRoute?

    var body: some View {
        currentView
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
                onOpenNotifications: { route = .notifications },
                onOpenProfile: { route = .profile },
                onOpenChapterDetail: { route = .chapterDetail },
                onOpenNode: openNode
            )
        case .materials:
            V2MaterialsView(selectedTab: $selectedTab) {
                route = .chapterDetail
            }
        case .upload:
            V2UploadView(
                selectedTab: $selectedTab,
                onGenerate: {
                    selectedTab = .learning
                    route = .chapterOverview
                }
            )
        case .discover:
            V2DiscoverView(selectedTab: $selectedTab) {
                route = .recommendedArticle
            }
        case .notes:
            V2NotesView(selectedTab: $selectedTab)
        }
    }

    @ViewBuilder
    private func routeView(_ route: V2AppRoute) -> some View {
        switch route {
        case .notifications:
            V2NotificationView(onBack: closeRoute)
        case .profile:
            V2ProfileView(onBack: closeRoute)
        case .chapterDetail:
            V2ChapterDetailView(
                onBack: closeRoute,
                onContinue: continueFromChapterDetail,
                onSource: openSource
            )
        case .sourceArticle:
            V2SourceArticleView(question: sourceQuestion, onBack: closeSource)
        case .recommendedArticle:
            V2RecommendedArticleDetailView(
                onBack: closeRoute,
                onGenerate: {
                    selectedTab = .learning
                    self.route = .chapterOverview
                }
            )
        case .chapterOverview:
            V2ChapterOverviewView(
                chapter: V2ReviewFixture.chapter,
                onBack: closeRoute,
                onContinue: openFirstUnit
            )
        case .unitOverview(let unitID):
            if let unit = V2ReviewFixture.unit(id: unitID) {
                V2UnitOverviewView(
                    unit: unit,
                    progress: V2ReviewFixture.progressIndex(unitID: unitID),
                    onBack: closeRoute,
                    onContinue: { openFirstQuestion(in: unitID) }
                )
            } else {
                V2MissingRouteView(onBack: closeRoute)
            }
        case .question(let unitID, let questionID):
            if let question = V2ReviewFixture.question(unitID: unitID, questionID: questionID) {
                let progress = V2ReviewFixture.progressIndex(unitID: unitID, questionID: questionID)
                switch question.kind {
                case .multipleChoice:
                    V2MultipleChoiceQuestionView(
                        question: question,
                        progress: progress,
                        onBack: closeRoute,
                        onSource: openSource,
                        onContinue: { continueAfterQuestion(unitID: unitID, questionID: questionID) }
                    )
                case .matching:
                    V2MatchingQuestionView(
                        question: question,
                        progress: progress,
                        onBack: closeRoute,
                        onSource: openSource,
                        onContinue: { continueAfterQuestion(unitID: unitID, questionID: questionID) }
                    )
                }
            } else {
                V2MissingRouteView(onBack: closeRoute)
            }
        case .unitSummary(let unitID):
            if let unit = V2ReviewFixture.unit(id: unitID) {
                V2UnitSummaryView(
                    unit: unit,
                    onBack: closeRoute,
                    onContinue: { continueAfterUnit(unitID: unitID) }
                )
            } else {
                V2MissingRouteView(onBack: closeRoute)
            }
        case .chapterSummary:
            V2ChapterSummaryView(
                chapter: V2ReviewFixture.chapter,
                onBack: closeRoute,
                onHome: {
                    selectedTab = .learning
                    self.route = nil
                },
                onDetail: { self.route = .chapterDetail }
            )
        }
    }

    private var sourceQuestion: V2ReviewQuestionData? {
        guard case let .question(unitID, questionID) = sourceReturnRoute else {
            return nil
        }
        return V2ReviewFixture.question(unitID: unitID, questionID: questionID)
    }

    private func openNode(_ node: V2LearningPathNodeData) {
        selectedTab = .learning
        if node.kind == .start {
            route = .chapterOverview
        } else {
            route = .unitOverview(unitID: node.id)
        }
    }

    private func openFirstUnit() {
        route = .unitOverview(unitID: V2ReviewFixture.firstUnitID)
    }

    private func openFirstQuestion(in unitID: String) {
        guard let questionID = V2ReviewFixture.firstQuestionID(in: unitID) else {
            route = .unitSummary(unitID: unitID)
            return
        }
        route = .question(unitID: unitID, questionID: questionID)
    }

    private func continueAfterQuestion(unitID: String, questionID: String) {
        if let nextQuestion = V2ReviewFixture.nextQuestion(after: questionID, in: unitID) {
            route = .question(unitID: unitID, questionID: nextQuestion.id)
        } else {
            route = .unitSummary(unitID: unitID)
        }
    }

    private func continueAfterUnit(unitID: String) {
        if let nextUnit = V2ReviewFixture.nextUnit(after: unitID) {
            route = .unitOverview(unitID: nextUnit.id)
        } else {
            route = .chapterSummary
        }
    }

    private func continueFromChapterDetail() {
        let currentNodeID = V2HomeFixture.home.currentNodeID
        if V2ReviewFixture.unit(id: currentNodeID) != nil {
            route = .unitOverview(unitID: currentNodeID)
        } else {
            openFirstUnit()
        }
    }

    private func openSource() {
        sourceReturnRoute = route
        route = .sourceArticle
    }

    private func closeSource() {
        route = sourceReturnRoute
        sourceReturnRoute = nil
    }

    private func closeRoute() {
        route = nil
        sourceReturnRoute = nil
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

#Preview {
    V2RootView()
}

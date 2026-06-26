import CoreGraphics

enum V2HomeTab: CaseIterable, Identifiable {
    case learning
    case materials
    case upload
    case discover
    case notes

    var id: Self { self }

    var title: String {
        switch self {
        case .learning: "学习"
        case .materials: "资料"
        case .upload: ""
        case .discover: "发现"
        case .notes: "笔记"
        }
    }

    var inactiveAssetName: String? {
        switch self {
        case .learning: "V2NavLearningInactive"
        case .materials: "V2NavMaterialsInactive"
        case .upload: nil
        case .discover: "V2NavDiscoverInactive"
        case .notes: "V2NavNotesInactive"
        }
    }

    var selectedAssetName: String? {
        switch self {
        case .learning: "V2NavLearningSelected"
        case .materials: "V2NavMaterialsSelected"
        case .upload: nil
        case .discover: "V2NavDiscoverSelected"
        case .notes: "V2NavNotesSelected"
        }
    }
}

enum V2LearningPathNodeKind {
    case start
    case unit
}

enum V2LearningPathNodeState {
    case start
    case completed
    case current
    case locked
}

struct V2CurrentChapterData {
    let eyebrow: String
    let title: String
}

struct V2LearningPathNodeData: Identifiable, Equatable {
    let id: String
    let title: String
    let subtitle: String
    let kind: V2LearningPathNodeKind
    let state: V2LearningPathNodeState
    let completedQuestionCount: Int
    let totalQuestionCount: Int
    let position: CGPoint
}

struct V2HomeData {
    let currentChapter: V2CurrentChapterData
    let nodes: [V2LearningPathNodeData]
    let currentNodeID: V2LearningPathNodeData.ID

    init(
        currentChapter: V2CurrentChapterData,
        nodes: [V2LearningPathNodeData],
        currentNodeID: V2LearningPathNodeData.ID
    ) {
        self.currentChapter = currentChapter
        self.nodes = nodes
        self.currentNodeID = currentNodeID
    }

    init(chapter: V2ReviewChapterData) {
        let startNode = V2LearningPathNodeData(
            id: "start",
            title: "开始",
            subtitle: "章节概要",
            kind: .start,
            state: .start,
            completedQuestionCount: 0,
            totalQuestionCount: 0,
            position: CGPoint(x: 0.66, y: 0.88)
        )

        let unitNodes = chapter.units.enumerated().map { index, unit in
            V2LearningPathNodeData(
                id: unit.id,
                title: "单元\(index + 1)",
                subtitle: unit.title,
                kind: .unit,
                state: index == 0 ? .current : .locked,
                completedQuestionCount: 0,
                totalQuestionCount: unit.questions.count,
                position: CGPoint(x: 0, y: 0)
            )
        }

        self.currentChapter = V2CurrentChapterData(
            eyebrow: "当前章节",
            title: chapter.title
        )
        self.nodes = [startNode] + unitNodes
        self.currentNodeID = unitNodes.first?.id ?? startNode.id
    }

    var isEmpty: Bool {
        nodes.isEmpty
    }

    var initialViewportAnchorNodeID: V2LearningPathNodeData.ID {
        guard let currentIndex = nodes.firstIndex(where: { $0.id == currentNodeID }) else {
            return currentNodeID
        }

        let lastBottomEligibleIndex = max(0, nodes.count - 3)
        let anchorIndex = min(currentIndex, lastBottomEligibleIndex)
        return nodes[anchorIndex].id
    }
}

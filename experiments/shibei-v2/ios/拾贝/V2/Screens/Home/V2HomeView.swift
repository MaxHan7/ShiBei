import SwiftUI

struct V2HomeView: View {
    let data: V2HomeData
    @Binding var selectedTab: V2HomeTab
    let onOpenNotifications: () -> Void
    let onOpenProfile: () -> Void
    let onOpenChapterDetail: () -> Void
    let onOpenNode: (V2LearningPathNodeData) -> Void

    @State private var selectedNodeID: V2LearningPathNodeData.ID?

    var body: some View {
        GeometryReader { geometry in
            let pathArea = V2HomePathArea(geometry: geometry, data: data)
            let bottomNavScale = min(1, geometry.size.width / 357)

            ZStack(alignment: .top) {
                V2Color.pageGreenBackground
                    .ignoresSafeArea()

                backgroundDecorations(in: geometry.size)

                VStack(spacing: 0) {
                    topBar
                        .padding(.top, 22)
                        .padding(.horizontal, V2Spacing.screenMargin)

                    V2CurrentChapterBanner(chapter: data.currentChapter) {
                        onOpenChapterDetail()
                    }
                    .padding(.top, 30)
                    .padding(.horizontal, V2Spacing.screenMargin)

                    ZStack {
                        V2LearningPathCurve(points: pathArea.curvePoints)
                            .stroke(
                                Color.white.opacity(0.95),
                                style: StrokeStyle(lineWidth: 7, lineCap: .round, lineJoin: .round, dash: [12, 16])
                            )
                            .allowsHitTesting(false)

                        mascot(in: pathArea)

                        ForEach(data.nodes) { node in
                            V2LearningPathNodeView(node: node) {
                                withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
                                    selectedNodeID = node.id
                                }
                            }
                            .position(pathArea.center(for: node))
                        }

                        if let selectedNode = selectedNode(in: data),
                           let popover = pathArea.popoverPlacement(for: selectedNode) {
                            V2NodePopover(
                                node: selectedNode,
                                pointerX: popover.pointerX
                            ) {
                                onOpenNode(selectedNode)
                            }
                            .position(popover.center)
                            .transition(.scale(scale: 0.96).combined(with: .opacity))
                            .zIndex(4)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: pathArea.height)
                    .padding(.top, 10)

                    Spacer(minLength: 96)
                }

                VStack {
                    Spacer()

                    V2BottomNavigationBar(selectedTab: $selectedTab)
                        .scaleEffect(bottomNavScale, anchor: .bottom)
                        .frame(width: 357 * bottomNavScale, height: 94 * bottomNavScale)
                        .padding(.bottom, max(geometry.safeAreaInsets.bottom, 12))
                }
                .zIndex(20)
                .allowsHitTesting(true)
            }
        }
    }

    private var topBar: some View {
        ZStack {
            Text("学习路径")
                .font(V2Typography.pageTitle)
                .foregroundStyle(V2Color.textPrimary)

            HStack {
                V2CircleIconButton(kind: .notification, action: onOpenNotifications)
                Spacer()
                V2CircleIconButton(kind: .profile, action: onOpenProfile)
            }
        }
        .frame(height: 52)
    }

    private func selectedNode(in data: V2HomeData) -> V2LearningPathNodeData? {
        let id = selectedNodeID ?? data.currentNodeID
        return data.nodes.first { $0.id == id }
    }

    private func mascot(in pathArea: V2HomePathArea) -> some View {
        let anchor = pathArea.mascotAnchor(for: data.currentNodeID)

        return Image("V2MascotStatic")
            .resizable()
            .renderingMode(.original)
            .scaledToFit()
            .frame(width: 118, height: 172)
            .position(anchor)
            .opacity(0.98)
            .allowsHitTesting(false)
            .zIndex(1)
    }

    private func backgroundDecorations(in size: CGSize) -> some View {
        ZStack {
            Image("V2BgDecoLeftHillPlant")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 150)
                .opacity(0.62)
                .position(x: 52, y: size.height * 0.50)

            Image("V2BgDecoRightHillPlant")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 150)
                .opacity(0.62)
                .position(x: size.width - 44, y: size.height * 0.54)
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }
}

private struct V2HomePathArea {
    let geometry: GeometryProxy
    let data: V2HomeData

    var width: CGFloat { geometry.size.width }
    private var layout: V2PathCycleLayout {
        V2PathCycleLayout(nodeCount: data.nodes.count, containerWidth: width, minimumHeight: max(520, geometry.size.height - 260))
    }

    var height: CGFloat {
        layout.height
    }

    var nodeCenters: [CGPoint] {
        data.nodes.map(center(for:))
    }

    var curvePoints: [CGPoint] {
        layout.points
    }

    func center(for node: V2LearningPathNodeData) -> CGPoint {
        guard let index = data.nodes.firstIndex(where: { $0.id == node.id }) else {
            return CGPoint(x: width / 2, y: height / 2)
        }
        return layout.point(at: index)
    }

    func mascotAnchor(for nodeID: V2LearningPathNodeData.ID) -> CGPoint {
        guard let index = data.nodes.firstIndex(where: { $0.id == nodeID }) else {
            return CGPoint(x: width * 0.68, y: height * 0.48)
        }
        return layout.mascotAnchor(forNodeIndex: index)
    }

    func popoverPlacement(for node: V2LearningPathNodeData) -> (center: CGPoint, pointerX: CGFloat)? {
        let nodeCenter = center(for: node)
        let popoverWidth: CGFloat = 272
        let centeredX = width / 2
        let halfWidth = popoverWidth / 2
        let minX = halfWidth + V2Spacing.screenMargin
        let maxX = width - halfWidth - V2Spacing.screenMargin
        let popoverX = min(max(centeredX, minX), maxX)
        let popoverY = max(106, nodeCenter.y - 142)
        let popoverLeft = popoverX - halfWidth
        return (CGPoint(x: popoverX, y: popoverY), nodeCenter.x - popoverLeft)
    }
}

private struct V2PathCycleLayout {
    let nodeCount: Int
    let containerWidth: CGFloat
    let minimumHeight: CGFloat

    private let template = V2PathCycleTemplate()

    var height: CGFloat {
        let maxDistance = slots.map(\.y).max() ?? 0
        return max(minimumHeight, maxDistance * template.verticalScale + 128)
    }

    var points: [CGPoint] {
        guard nodeCount > 0 else { return [] }
        return (0..<nodeCount).map(point(at:))
    }

    private var slots: [CGPoint] {
        guard nodeCount > 0 else { return [] }
        return (0..<nodeCount).map(template.slot(at:))
    }

    func point(at index: Int) -> CGPoint {
        let slot = template.slot(at: index)
        let xScale = min(1.22, max(0.92, (containerWidth - 56) / template.size.width))
        let xOffset = (containerWidth - template.size.width * xScale) / 2
        return CGPoint(
            x: xOffset + slot.x * xScale,
            y: height - 64 - slot.y * template.verticalScale
        )
    }

    func mascotAnchor(forNodeIndex index: Int) -> CGPoint {
        let group = template.mascotGroup(forNodeIndex: index)
        let groupPoints = group.map(point(at:))
        let averageY = groupPoints.map(\.y).reduce(0, +) / CGFloat(max(groupPoints.count, 1))
        let anchorX = template.isRightMascotGroup(forNodeIndex: index) ? containerWidth * 0.72 : containerWidth * 0.28
        let anchorY = min(height - 106, max(126, averageY + 36))
        return CGPoint(x: anchorX, y: anchorY)
    }
}

private struct V2PathCycleTemplate {
    let size = CGSize(width: 280, height: 1018)
    let topInset: CGFloat = 30
    let verticalScale: CGFloat = 0.76

    private let referenceSlots: [CGPoint] = [
        CGPoint(x: 166, y: 965.001),
        CGPoint(x: 52.5, y: 871.501),
        CGPoint(x: 63.5, y: 690.501),
        CGPoint(x: 220.5, y: 574.501),
        CGPoint(x: 235.5, y: 385.501),
        CGPoint(x: 70.5, y: 253.501),
        CGPoint(x: 70.5, y: 53.501)
    ]

    private var startY: CGFloat {
        referenceSlots[0].y
    }

    func slot(at index: Int) -> CGPoint {
        if index < referenceSlots.count {
            return normalized(referenceSlots[index])
        }

        let repeatedUnitIndex = max(1, index)
        let patternIndex = ((repeatedUnitIndex - 1) % 4) + 3
        let cycle = CGFloat((repeatedUnitIndex - 3) / 4 + 1)
        let reference = referenceSlots[min(patternIndex, referenceSlots.count - 1)]
        let shifted = CGPoint(x: reference.x, y: reference.y - 636 * cycle)
        return normalized(shifted)
    }

    func mascotGroup(forNodeIndex index: Int) -> Range<Int> {
        if index <= 2 {
            return 0..<min(3, max(index + 1, 1))
        }
        let lower = 3 + ((index - 3) / 2) * 2
        return lower..<min(lower + 2, max(index + 1, lower + 1))
    }

    func isRightMascotGroup(forNodeIndex index: Int) -> Bool {
        if index <= 2 {
            return true
        }
        return ((index - 3) / 2).isMultiple(of: 2)
    }

    private func normalized(_ point: CGPoint) -> CGPoint {
        CGPoint(
            x: point.x,
            y: max(0, startY - point.y)
        )
    }
}

private struct V2LearningPathCurve: Shape {
    let points: [CGPoint]

    func path(in rect: CGRect) -> Path {
        guard let first = points.first else { return Path() }

        var path = Path()
        path.move(to: first)

        guard points.count > 1 else {
            return path
        }

        for index in 0..<(points.count - 1) {
            let previous = index > 0 ? points[index - 1] : points[index]
            let current = points[index]
            let next = points[index + 1]
            let following = index + 2 < points.count ? points[index + 2] : next
            let tension: CGFloat = 0.92

            let control1 = CGPoint(
                x: current.x + (next.x - previous.x) * tension / 6,
                y: current.y + (next.y - previous.y) * tension / 6
            )
            let control2 = CGPoint(
                x: next.x - (following.x - current.x) * tension / 6,
                y: next.y - (following.y - current.y) * tension / 6
            )
            path.addCurve(to: next, control1: control1, control2: control2)
        }

        return path
    }
}

#Preview {
    V2HomeView(
        data: V2HomeFixture.home,
        selectedTab: .constant(.learning),
        onOpenNotifications: {},
        onOpenProfile: {},
        onOpenChapterDetail: {},
        onOpenNode: { _ in }
    )
}

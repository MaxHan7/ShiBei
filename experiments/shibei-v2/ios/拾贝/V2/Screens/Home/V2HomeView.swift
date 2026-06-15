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
            let bottomNavScale = min(1, (geometry.size.width - V2Spacing.screenMargin * 2) / 357)

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
                        V2LearningPathCurve(points: pathArea.nodeCenters)
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
        let currentNode = data.nodes.first { $0.id == data.currentNodeID }
        let currentCenter = currentNode.map { pathArea.center(for: $0) } ?? CGPoint(x: pathArea.width * 0.65, y: pathArea.height * 0.48)
        let mascotX = min(pathArea.width - 72, max(70, currentCenter.x + 128))
        let mascotY = min(pathArea.height - 104, max(120, currentCenter.y + 34))

        return Image("V2MascotStatic")
            .resizable()
            .renderingMode(.original)
            .scaledToFit()
            .frame(width: 118, height: 172)
            .position(x: mascotX, y: mascotY)
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
    var height: CGFloat {
        max(520, geometry.size.height - 260)
    }

    var nodeCenters: [CGPoint] {
        data.nodes.map(center(for:))
    }

    func center(for node: V2LearningPathNodeData) -> CGPoint {
        CGPoint(
            x: width * node.position.x,
            y: height * node.position.y
        )
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

private struct V2LearningPathCurve: Shape {
    let points: [CGPoint]

    func path(in rect: CGRect) -> Path {
        guard let first = points.first else { return Path() }

        var path = Path()
        path.move(to: first)

        for pair in zip(points, points.dropFirst()) {
            let start = pair.0
            let end = pair.1
            let verticalDelta = end.y - start.y
            let horizontalDelta = end.x - start.x
            let control1 = CGPoint(
                x: start.x + horizontalDelta * 0.22,
                y: start.y + verticalDelta * 0.42
            )
            let control2 = CGPoint(
                x: end.x - horizontalDelta * 0.22,
                y: end.y - verticalDelta * 0.42
            )
            path.addCurve(to: end, control1: control1, control2: control2)
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

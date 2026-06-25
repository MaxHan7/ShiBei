import SwiftUI

struct V2HomeView: View {
    let data: V2HomeData
    @Binding var selectedTab: V2HomeTab
    let onOpenNotifications: () -> Void
    let onOpenProfile: () -> Void
    let onOpenChapterDetail: () -> Void
    let onOpenNode: (V2LearningPathNodeData) -> Void

    @State private var selectedNodeID: V2LearningPathNodeData.ID?
    @State private var pendingNodeSelectionID: V2LearningPathNodeData.ID?
    @State private var nodeViewportFrames: [V2LearningPathNodeData.ID: CGRect] = [:]
    @State private var pathContentMinY: CGFloat?
    @State private var didApplyInitialPathScroll = false

    var body: some View {
        GeometryReader { geometry in
            let bottomNavScale = min(1, geometry.size.width / 357)
            let pathViewport = V2HomePathViewportMetrics(
                screenHeight: geometry.size.height,
                bottomNavScale: bottomNavScale,
                safeAreaInsets: geometry.safeAreaInsets
            )
            let pathArea = V2HomePathArea(
                geometry: geometry,
                data: data,
                viewportHeight: pathViewport.height
            )

            ZStack(alignment: .top) {
                V2Color.pageGreenBackground
                    .ignoresSafeArea()

                backgroundDecorations(in: geometry.size)

                if data.isEmpty {
                    emptyState(in: geometry.size)
                        .zIndex(40)
                } else {
                    VStack(spacing: 0) {
                        Color.clear
                            .frame(height: pathViewport.top)

                        pathScrollViewport(pathArea: pathArea)
                            .frame(height: pathViewport.height)
                            .clipped()

                        Spacer(minLength: 0)
                    }
                    .zIndex(5)
                }

                topOverlay
                    .zIndex(30)

                VStack {
                    Spacer()

                    V2BottomNavigationBar(selectedTab: $selectedTab)
                        .scaleEffect(bottomNavScale, anchor: .bottom)
                        .frame(width: 357 * bottomNavScale, height: 94 * bottomNavScale)
                        .padding(.bottom, V2BottomNavPlacement.bottomPadding)
                }
                .zIndex(20)
                .allowsHitTesting(true)
            }
        }
    }

    private var topOverlay: some View {
        VStack(spacing: 0) {
            V2TopChrome {
                topBar
            }

            if !data.isEmpty {
                V2CurrentChapterBanner(chapter: data.currentChapter) {
                    onOpenChapterDetail()
                }
                .v2PageContentWidth()
                .padding(.top, 30)
            }
        }
    }

    private func pathScrollViewport(pathArea: V2HomePathArea) -> some View {
        ScrollViewReader { proxy in
            ScrollView(.vertical, showsIndicators: false) {
                pathContent(pathArea: pathArea, proxy: proxy)
                    .frame(maxWidth: .infinity)
                    .frame(height: pathArea.height)
            }
            .coordinateSpace(name: V2HomePathViewportCoordinateSpace.name)
            .scrollContentBackground(.hidden)
            .onPreferenceChange(V2NodeViewportFramePreferenceKey.self) { frames in
                nodeViewportFrames = frames
            }
            .onPreferenceChange(V2PathContentMinYPreferenceKey.self) { minY in
                pathContentMinY = minY
            }
            .opacity(didApplyInitialPathScroll ? 1 : 0)
            .onAppear {
                scrollToInitialCurrentNode(with: proxy)
            }
            .onChange(of: data.currentNodeID) { _, _ in
                scrollToCurrentNode(with: proxy, animated: true)
            }
        }
    }

    private func pathContent(pathArea: V2HomePathArea, proxy: ScrollViewProxy) -> some View {
        ZStack(alignment: .topLeading) {
            scrollAnchorLayer(pathArea: pathArea)

            ZStack {
                GeometryReader { contentGeometry in
                    Color.clear.preference(
                        key: V2PathContentMinYPreferenceKey.self,
                        value: contentGeometry.frame(
                            in: .named(V2HomePathViewportCoordinateSpace.name)
                        ).minY
                    )
                }
                .frame(width: 1, height: 1)
                .allowsHitTesting(false)

                V2LearningPathCurve(layout: pathArea.pathLayout)
                    .stroke(
                        Color.white.opacity(0.95),
                        style: StrokeStyle(lineWidth: 7, lineCap: .round, lineJoin: .round, dash: [12, 16])
                    )
                    .allowsHitTesting(false)

                mascot(in: pathArea)

                ForEach(data.nodes) { node in
                    V2LearningPathNodeView(node: node) {
                        revealAndSelect(node, pathArea: pathArea, with: proxy)
                    }
                    .background {
                        GeometryReader { nodeGeometry in
                            Color.clear.preference(
                                key: V2NodeViewportFramePreferenceKey.self,
                                value: [
                                    node.id: nodeGeometry.frame(
                                        in: .named(V2HomePathViewportCoordinateSpace.name)
                                    )
                                ]
                            )
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
            .frame(width: pathArea.width, height: pathArea.height, alignment: .topLeading)
        }
        .frame(width: pathArea.width, height: pathArea.height, alignment: .topLeading)
    }

    private func revealAndSelect(
        _ node: V2LearningPathNodeData,
        pathArea: V2HomePathArea,
        with proxy: ScrollViewProxy
    ) {
        pendingNodeSelectionID = node.id
        selectedNodeID = nil

        let scrollAnchorID = scrollAnchorIDForReveal(
            node,
            pathArea: pathArea
        )

        if let scrollAnchorID {
            withAnimation(.easeOut(duration: 0.22)) {
                proxy.scrollTo(scrollAnchorID, anchor: .top)
            }
        }

        let revealDelay = scrollAnchorID == nil ? 0.04 : 0.24
        DispatchQueue.main.asyncAfter(deadline: .now() + revealDelay) {
            guard pendingNodeSelectionID == node.id else {
                return
            }
            withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
                selectedNodeID = node.id
            }
        }
    }

    private func currentViewportFrame(
        for node: V2LearningPathNodeData,
        in pathArea: V2HomePathArea
    ) -> CGRect? {
        if let measuredFrame = nodeViewportFrames[node.id] {
            return measuredFrame
        }

        if let pathContentMinY {
            let center = pathArea.center(for: node)
            return CGRect(
                x: center.x - V2HomePopoverMetrics.nodeHitFrameSize.width / 2,
                y: center.y + pathContentMinY - V2HomePopoverMetrics.nodeHitFrameSize.height / 2,
                width: V2HomePopoverMetrics.nodeHitFrameSize.width,
                height: V2HomePopoverMetrics.nodeHitFrameSize.height
            )
        }

        return nil
    }

    private func scrollAnchorIDForReveal(
        _ node: V2LearningPathNodeData,
        pathArea: V2HomePathArea
    ) -> String? {
        let safeRange = V2HomePopoverMetrics.nodeSafeRange(in: pathArea.viewportHeight)

        guard let currentViewportFrame = currentViewportFrame(for: node, in: pathArea) else {
            return V2HomePathArea.preferredPopoverAnchorID(for: node.id)
        }

        if V2HomePopoverMetrics.canRevealWithoutScrolling(
            nodeFrame: currentViewportFrame,
            viewportHeight: pathArea.viewportHeight
        ) {
            return nil
        }

        let currentViewportCenterY = currentViewportFrame.midY

        if currentViewportCenterY < safeRange.lowerBound - V2HomePopoverMetrics.scrollTolerance {
            return V2HomePathArea.upperSafePopoverAnchorID(for: node.id)
        }

        if currentViewportCenterY > safeRange.upperBound + V2HomePopoverMetrics.scrollTolerance {
            return V2HomePathArea.lowerSafePopoverAnchorID(for: node.id)
        }

        return nil
    }

    private func scrollToInitialCurrentNode(with proxy: ScrollViewProxy) {
        guard !data.isEmpty else {
            didApplyInitialPathScroll = true
            return
        }

        DispatchQueue.main.async {
            var transaction = Transaction()
            transaction.disablesAnimations = true

            withTransaction(transaction) {
                scrollToCurrentNode(with: proxy, animated: false)
                didApplyInitialPathScroll = true
            }
        }
    }

    private func scrollToCurrentNode(with proxy: ScrollViewProxy, animated: Bool) {
        guard !data.isEmpty else {
            return
        }

        let scrollAction = {
            proxy.scrollTo(
                V2HomePathArea.initialCurrentNodeAnchorID(
                    for: data.initialViewportAnchorNodeID
                ),
                anchor: .top
            )
        }

        if animated {
            withAnimation(.easeOut(duration: 0.2)) {
                scrollAction()
            }
        } else {
            scrollAction()
        }
    }

    private func scrollAnchorLayer(pathArea: V2HomePathArea) -> some View {
        let anchors = pathArea.scrollAnchors

        return VStack(spacing: 0) {
            ForEach(Array(anchors.enumerated()), id: \.element.id) { index, anchor in
                let previousY = index == 0 ? 0 : anchors[index - 1].y
                let gap = max(0, anchor.y - previousY)

                Color.clear
                    .frame(height: gap)

                Color.clear
                    .frame(width: 1, height: 1)
                    .id(anchor.id)
            }

            let usedHeight = anchors.last?.y ?? 0
            Color.clear
                .frame(height: max(0, pathArea.height - usedHeight - 1))
        }
        .frame(width: pathArea.width, height: pathArea.height, alignment: .top)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private var topBar: some View {
        HStack {
            V2CircleIconButton(kind: .notification, action: onOpenNotifications)
            Spacer()
            V2CircleIconButton(kind: .profile, action: onOpenProfile)
        }
        .frame(height: V2Layout.topBarHeight)
    }

    private func emptyState(in size: CGSize) -> some View {
        let scale = min(1, size.width / 402)

        return Image("V2HomeEmptyStateIllustration")
            .resizable()
            .renderingMode(.original)
            .scaledToFit()
            .frame(width: 253 * scale, height: 387 * scale)
            .position(
                x: size.width / 2,
                y: V2HomeEmptyStateMetrics.centerY(in: size.height, scale: scale)
            )
            .allowsHitTesting(false)
            .accessibilityLabel("还没有生成章节")
    }

    private func selectedNode(in data: V2HomeData) -> V2LearningPathNodeData? {
        guard let id = selectedNodeID else {
            return nil
        }
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

private enum V2HomeEmptyStateMetrics {
    static let figmaCanvasHeight: CGFloat = 874
    static let figmaImageTopY: CGFloat = 360.5
    static let imageHeight: CGFloat = 387

    static func centerY(in screenHeight: CGFloat, scale: CGFloat) -> CGFloat {
        let figmaCenterY = figmaImageTopY + imageHeight / 2
        return min(
            screenHeight - 226 * scale,
            figmaCenterY * min(1, screenHeight / figmaCanvasHeight)
        )
    }
}

private struct V2HomePathViewportMetrics {
    let top: CGFloat
    let height: CGFloat

    init(screenHeight: CGFloat, bottomNavScale: CGFloat, safeAreaInsets: EdgeInsets) {
        let topBarTop = V2Layout.topBarTopPadding
        let topBarHeight = V2Layout.topBarHeight
        let bannerTopGap: CGFloat = 30
        let bannerHeight: CGFloat = 88
        let visibleGapBelowBanner: CGFloat = 0
        let bottomNavigationHeight = 94 * bottomNavScale
        let bottomNavigationBottomPadding = V2BottomNavPlacement.bottomPadding
        let bottomSafeGap: CGFloat = 0

        top = topBarTop + topBarHeight + bannerTopGap + bannerHeight + visibleGapBelowBanner
        let bottom = screenHeight - bottomNavigationHeight - bottomNavigationBottomPadding - bottomSafeGap
        height = max(180, bottom - top)
    }
}

private struct V2HomePathArea {
    let geometry: GeometryProxy
    let data: V2HomeData
    let viewportHeight: CGFloat

    var width: CGFloat { geometry.size.width }
    private var layout: V2PathCycleLayout {
        V2PathCycleLayout(
            nodeCount: data.nodes.count,
            containerWidth: width,
            minimumHeight: max(520, geometry.size.height - 260),
            viewportHeight: viewportHeight
        )
    }

    var height: CGFloat {
        layout.height
    }

    var nodeCenters: [CGPoint] {
        data.nodes.map(center(for:))
    }

    var pathLayout: V2PathCycleLayout {
        layout
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
        let popoverY = nodeCenter.y - V2HomePopoverMetrics.centerOffsetFromNode
        let popoverLeft = popoverX - halfWidth
        return (CGPoint(x: popoverX, y: popoverY), nodeCenter.x - popoverLeft)
    }

    func popoverAnchorY(for node: V2LearningPathNodeData) -> CGFloat {
        max(0, center(for: node).y - V2HomePopoverMetrics.preferredNodeCenterY)
    }

    var scrollAnchors: [V2ScrollAnchor] {
        data.nodes
            .flatMap { node in
                [
                    V2ScrollAnchor(
                        id: Self.centerAnchorID(for: node.id),
                        y: center(for: node).y
                    ),
                    V2ScrollAnchor(
                        id: Self.initialCurrentNodeAnchorID(for: node.id),
                        y: initialCurrentNodeAnchorY(for: node)
                    ),
                    V2ScrollAnchor(
                        id: Self.upperSafePopoverAnchorID(for: node.id),
                        y: popoverAnchorY(
                            for: node,
                            targetViewportCenterY: V2HomePopoverMetrics.nodeSafeRange(
                                in: viewportHeight
                            ).lowerBound
                        )
                    ),
                    V2ScrollAnchor(
                        id: Self.preferredPopoverAnchorID(for: node.id),
                        y: popoverAnchorY(for: node)
                    ),
                    V2ScrollAnchor(
                        id: Self.lowerSafePopoverAnchorID(for: node.id),
                        y: popoverAnchorY(
                            for: node,
                            targetViewportCenterY: V2HomePopoverMetrics.nodeSafeRange(
                                in: viewportHeight
                            ).upperBound
                        )
                    )
                ]
            }
            .sorted { lhs, rhs in
                if lhs.y == rhs.y {
                    return lhs.id < rhs.id
                }
                return lhs.y < rhs.y
            }
    }

    static func centerAnchorID(for nodeID: V2LearningPathNodeData.ID) -> String {
        "center-anchor-\(nodeID)"
    }

    func initialCurrentNodeAnchorY(for node: V2LearningPathNodeData) -> CGFloat {
        max(
            0,
            center(for: node).y - V2HomeInitialViewportMetrics.currentNodeCenterY(
                in: viewportHeight
            )
        )
    }

    func popoverAnchorY(
        for node: V2LearningPathNodeData,
        targetViewportCenterY: CGFloat
    ) -> CGFloat {
        max(0, center(for: node).y - targetViewportCenterY)
    }

    static func initialCurrentNodeAnchorID(for nodeID: V2LearningPathNodeData.ID) -> String {
        "initial-current-node-anchor-\(nodeID)"
    }

    static func upperSafePopoverAnchorID(for nodeID: V2LearningPathNodeData.ID) -> String {
        "popover-upper-safe-anchor-\(nodeID)"
    }

    static func preferredPopoverAnchorID(for nodeID: V2LearningPathNodeData.ID) -> String {
        "popover-preferred-anchor-\(nodeID)"
    }

    static func lowerSafePopoverAnchorID(for nodeID: V2LearningPathNodeData.ID) -> String {
        "popover-lower-safe-anchor-\(nodeID)"
    }
}

private struct V2ScrollAnchor: Identifiable {
    let id: String
    let y: CGFloat
}

private struct V2PathCycleLayout {
    let nodeCount: Int
    let containerWidth: CGFloat
    let minimumHeight: CGFloat
    let viewportHeight: CGFloat

    private let template = V2PathCycleTemplate()
    
    private var metrics: V2PathCycleLayoutMetrics {
        V2PathCycleLayoutMetrics(viewportHeight: viewportHeight)
    }

    var height: CGFloat {
        let maxDistance = slots.map(\.y).max() ?? 0
        return max(
            minimumHeight,
            maxDistance * template.verticalScale + metrics.topContentReserve + metrics.bottomContentReserve
        )
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
        let xScale = template.horizontalScale
        let xOffset = (containerWidth - template.size.width * xScale) / 2
        return CGPoint(
            x: xOffset + slot.x * xScale,
            y: height - metrics.bottomContentReserve - slot.y * template.verticalScale
        )
    }

    func mascotAnchor(forNodeIndex index: Int) -> CGPoint {
        let group = template.mascotGroup(forNodeIndex: index, nodeCount: nodeCount)
        let groupPoints = group.map(point(at:))
        let averageY = groupPoints.map(\.y).reduce(0, +) / CGFloat(max(groupPoints.count, 1))
        let anchorX = template.isRightMascotGroup(forNodeIndex: index) ? containerWidth * 0.72 : containerWidth * 0.28
        let bottomNavigationReserve: CGFloat = 190
        let maxAnchorY = max(126, height - bottomNavigationReserve)
        let anchorY = min(maxAnchorY, max(126, averageY - 44))
        return CGPoint(x: anchorX, y: anchorY)
    }

    func connectionPath() -> Path {
        guard nodeCount > 1 else { return Path() }

        let lastReferencePoint = template.referenceSlot(at: nodeCount - 1)
        return template.connectionPath(
            stoppingAtReferenceY: lastReferencePoint.y,
            transform: transformReferencePoint(_:)
        )
    }

    private func transformReferencePoint(_ point: CGPoint) -> CGPoint {
        let xScale = template.horizontalScale
        let xOffset = (containerWidth - template.size.width * xScale) / 2
        let yOffset = height - metrics.bottomContentReserve - template.startY * template.verticalScale
        return CGPoint(
            x: xOffset + point.x * xScale,
            y: yOffset + point.y * template.verticalScale
        )
    }
}

private struct V2PathCycleLayoutMetrics {
    let viewportHeight: CGFloat

    // This reserve is not just visual breathing room. It is the scroll headroom
    // required to move an upper node down into the "popover-safe" anchor zone
    // before we reveal the floating card.
    var topContentReserve: CGFloat {
        V2HomePopoverMetrics.preferredNodeCenterY
    }

    // Lower nodes need enough content below them so a tap can lift them upward
    // into the same popover-safe anchor zone. Without this dynamic reserve,
    // bottom-edge nodes clamp too low and only upper nodes feel correct.
    var bottomContentReserve: CGFloat {
        max(126, viewportHeight - V2HomePopoverMetrics.preferredNodeCenterY + 12)
    }
}

private enum V2HomeInitialViewportMetrics {
    // V2LearningPathNodeView uses a 128 x 150 hit frame. The initial viewport
    // should show the current node near the lower edge without clipping that
    // full interaction frame.
    static let nodeFrameHeight: CGFloat = 150
    static let bottomVisibleMargin: CGFloat = 8

    static func currentNodeCenterY(in viewportHeight: CGFloat) -> CGFloat {
        let lowerTarget = viewportHeight - nodeFrameHeight / 2 - bottomVisibleMargin
        return max(nodeFrameHeight / 2, lowerTarget)
    }
}

private enum V2HomePopoverMetrics {
    static let estimatedCardHeight: CGFloat = 128
    static let triangleHeight: CGFloat = 21
    static let topVisibleMargin: CGFloat = 0
    static let bottomVisibleMargin: CGFloat = 0
    static let nodeBottomVisibilityMargin: CGFloat = 72
    static let scrollTolerance: CGFloat = 4
    static let nodeHitFrameSize = CGSize(width: 128, height: 150)

    // Used only as a fallback when the current viewport coordinate has not
    // been measured yet. Normal taps use nodeSafeRange(in:) to minimize motion.
    static let preferredNodeCenterY: CGFloat = 252

    // Fixed geometric relation between node center and popover center.
    // With the current popover size and pointer geometry, this keeps the
    // pointer aligned above the node at a stable visual distance.
    static let centerOffsetFromNode: CGFloat = 142

    static func nodeSafeRange(in viewportHeight: CGFloat) -> ClosedRange<CGFloat> {
        let halfCardHeight = estimatedCardHeight / 2
        let minimumCenterY = centerOffsetFromNode + halfCardHeight + topVisibleMargin

        // Only scroll when the popover would be clipped or the tapped node
        // would sit under the bottom navigation. If the card already fits, a
        // centered node should not move just to reach a prettier resting spot.
        let maximumCenterY = max(
            minimumCenterY,
            viewportHeight - nodeBottomVisibilityMargin
        )
        return minimumCenterY...maximumCenterY
    }

    static func canRevealWithoutScrolling(
        nodeFrame: CGRect,
        viewportHeight: CGFloat
    ) -> Bool {
        let tolerance = scrollTolerance
        let nodeFullyVisible = nodeFrame.minY >= -tolerance
            && nodeFrame.maxY <= viewportHeight + tolerance

        let popoverCenterY = nodeFrame.midY - centerOffsetFromNode
        let popoverTop = popoverCenterY - estimatedCardHeight / 2
        let popoverBottom = popoverCenterY + estimatedCardHeight / 2 + triangleHeight
        let popoverFullyVisible = popoverTop >= topVisibleMargin - tolerance
            && popoverBottom <= viewportHeight - bottomVisibleMargin + tolerance

        return nodeFullyVisible && popoverFullyVisible
    }
}

private enum V2HomePathViewportCoordinateSpace {
    static let name = "V2HomePathViewportCoordinateSpace"
}

private struct V2PathContentMinYPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat?

    static func reduce(value: inout CGFloat?, nextValue: () -> CGFloat?) {
        value = nextValue() ?? value
    }
}

private struct V2NodeViewportFramePreferenceKey: PreferenceKey {
    static var defaultValue: [V2LearningPathNodeData.ID: CGRect] = [:]

    static func reduce(
        value: inout [V2LearningPathNodeData.ID: CGRect],
        nextValue: () -> [V2LearningPathNodeData.ID: CGRect]
    ) {
        value.merge(nextValue(), uniquingKeysWith: { _, new in new })
    }
}

private struct V2PathCycleTemplate {
    let size = CGSize(width: 280, height: 1018)
    let topInset: CGFloat = 30
    let horizontalScale: CGFloat = 1
    let verticalScale: CGFloat = 1

    private let referenceSlots: [CGPoint] = [
        CGPoint(x: 166, y: 965.001),
        CGPoint(x: 52.5, y: 871.501),
        CGPoint(x: 63.5, y: 690.501),
        CGPoint(x: 220.5, y: 574.501),
        CGPoint(x: 235.5, y: 385.501),
        CGPoint(x: 70.5, y: 253.501),
        CGPoint(x: 70.5, y: 53.501)
    ]

    var startY: CGFloat {
        referenceSlots[0].y
    }

    func referenceSlot(at index: Int) -> CGPoint {
        if index < referenceSlots.count {
            return referenceSlots[index]
        }

        let repeatedUnitIndex = max(1, index)
        let patternIndex = ((repeatedUnitIndex - 1) % 4) + 3
        let cycle = CGFloat((repeatedUnitIndex - 3) / 4 + 1)
        let reference = referenceSlots[min(patternIndex, referenceSlots.count - 1)]
        return CGPoint(x: reference.x, y: reference.y - 636 * cycle)
    }

    func slot(at index: Int) -> CGPoint {
        normalized(referenceSlot(at: index))
    }

    func mascotGroup(forNodeIndex index: Int, nodeCount: Int) -> Range<Int> {
        if index <= 2 {
            return 0..<max(1, min(3, nodeCount))
        }

        let lower = 3 + ((index - 3) / 2) * 2
        return lower..<max(lower + 1, min(lower + 2, nodeCount))
    }

    func isRightMascotGroup(forNodeIndex index: Int) -> Bool {
        if index <= 2 {
            return true
        }

        let groupIndex = 1 + ((index - 3) / 2)
        return groupIndex.isMultiple(of: 2)
    }

    private func normalized(_ point: CGPoint) -> CGPoint {
        CGPoint(
            x: point.x,
            y: max(0, startY - point.y)
        )
    }

    func connectionPath(
        stoppingAtReferenceY stopY: CGFloat,
        transform: (CGPoint) -> CGPoint
    ) -> Path {
        var path = Path()
        let segments = connectionSegments
        guard let first = segments.first else { return path }

        path.move(to: transform(first.start))

        for segment in segments {
            if stopY <= segment.end.y {
                add(segment, to: &path, transform: transform)
            } else if stopY < segment.start.y {
                let partial = segment.trimmed(toReferenceY: stopY)
                add(partial, to: &path, transform: transform)
                break
            } else {
                break
            }
        }

        return path
    }

    // Source: design-assets/path-cycle-node-placement-reference.svg.
    // The route is the Figma-approved repeated half-arc template, not a
    // point-to-point interpolation between node centers.
    private var connectionSegments: [V2CubicPathSegment] {
        [
            V2CubicPathSegment(
                start: CGPoint(x: 147.5, y: 954.811),
                control1: CGPoint(x: 110.452, y: 939.694),
                control2: CGPoint(x: 79.7497, y: 913.42),
                end: CGPoint(x: 60.1886, y: 880.501)
            ),
            V2CubicPathSegment(
                start: CGPoint(x: 60.1886, y: 880.501),
                control1: CGPoint(x: 45.4179, y: 855.643),
                control2: CGPoint(x: 37, y: 826.996),
                end: CGPoint(x: 37, y: 796.501)
            ),
            V2CubicPathSegment(
                start: CGPoint(x: 37, y: 796.501),
                control1: CGPoint(x: 37, y: 759.224),
                control2: CGPoint(x: 49.578, y: 724.709),
                end: CGPoint(x: 70.962, y: 696.501)
            ),
            V2CubicPathSegment(
                start: CGPoint(x: 70.962, y: 696.501),
                control1: CGPoint(x: 90.2394, y: 671.072),
                control2: CGPoint(x: 116.673, y: 650.769),
                end: CGPoint(x: 147.5, y: 638.19)
            ),
            V2CubicPathSegment(
                start: CGPoint(x: 148, y: 638.621),
                control1: CGPoint(x: 213.022, y: 612.089),
                control2: CGPoint(x: 258.5, y: 551.193),
                end: CGPoint(x: 258.5, y: 480.311)
            ),
            V2CubicPathSegment(
                start: CGPoint(x: 258.5, y: 480.311),
                control1: CGPoint(x: 258.5, y: 409.43),
                control2: CGPoint(x: 213.022, y: 348.533),
                end: CGPoint(x: 148, y: 322.001)
            ),
            V2CubicPathSegment(
                start: CGPoint(x: 149.5, y: 321.621),
                control1: CGPoint(x: 84.4777, y: 295.089),
                control2: CGPoint(x: 39, y: 234.193),
                end: CGPoint(x: 39, y: 163.311)
            ),
            V2CubicPathSegment(
                start: CGPoint(x: 39, y: 163.311),
                control1: CGPoint(x: 39, y: 92.4298),
                control2: CGPoint(x: 84.4777, y: 31.5335),
                end: CGPoint(x: 149.5, y: 5.00098)
            )
        ]
    }

    private func add(
        _ segment: V2CubicPathSegment,
        to path: inout Path,
        transform: (CGPoint) -> CGPoint
    ) {
        path.addCurve(
            to: transform(segment.end),
            control1: transform(segment.control1),
            control2: transform(segment.control2)
        )
    }
}

private struct V2CubicPathSegment {
    let start: CGPoint
    let control1: CGPoint
    let control2: CGPoint
    let end: CGPoint

    func trimmed(toReferenceY y: CGFloat) -> V2CubicPathSegment {
        let t = parameter(forReferenceY: y)
        let p01 = lerp(start, control1, t)
        let p12 = lerp(control1, control2, t)
        let p23 = lerp(control2, end, t)
        let p012 = lerp(p01, p12, t)
        let p123 = lerp(p12, p23, t)
        let p0123 = lerp(p012, p123, t)
        return V2CubicPathSegment(start: start, control1: p01, control2: p012, end: p0123)
    }

    private func parameter(forReferenceY y: CGFloat) -> CGFloat {
        var lower: CGFloat = 0
        var upper: CGFloat = 1

        for _ in 0..<24 {
            let mid = (lower + upper) / 2
            let midY = point(at: mid).y
            if midY > y {
                lower = mid
            } else {
                upper = mid
            }
        }

        return (lower + upper) / 2
    }

    private func point(at t: CGFloat) -> CGPoint {
        let p01 = lerp(start, control1, t)
        let p12 = lerp(control1, control2, t)
        let p23 = lerp(control2, end, t)
        let p012 = lerp(p01, p12, t)
        let p123 = lerp(p12, p23, t)
        return lerp(p012, p123, t)
    }

    private func lerp(_ a: CGPoint, _ b: CGPoint, _ t: CGFloat) -> CGPoint {
        CGPoint(
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t
        )
    }
}

private struct V2LearningPathCurve: Shape {
    let layout: V2PathCycleLayout

    func path(in rect: CGRect) -> Path {
        layout.connectionPath()
    }
}

struct V2HomeView_Previews: PreviewProvider {
    static var previews: some View {
        V2HomeView(
            data: V2HomeFixture.home,
            selectedTab: .constant(.learning),
            onOpenNotifications: {},
            onOpenProfile: {},
            onOpenChapterDetail: {},
            onOpenNode: { _ in }
        )
        .previewDevice("iPhone 17")
        .previewDisplayName("V2 Home - iPhone 17")
    }
}

import SwiftUI

struct V2LearningPathNodeView: View {
    let node: V2LearningPathNodeData
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                if node.state == .current {
                    V2SegmentedNodeProgress(
                        completed: node.completedQuestionCount,
                        total: node.totalQuestionCount
                    )
                    .frame(width: 112, height: 140)
                }

                nodeBody
            }
            .frame(width: 128, height: 150)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(node.title)
    }

    @ViewBuilder
    private var nodeBody: some View {
        switch node.kind {
        case .start:
            VStack(spacing: 10) {
                ZStack {
                    Circle()
                        .fill(V2LearningPathStartNodeMetrics.circleFill)
                        .frame(
                            width: V2LearningPathStartNodeMetrics.circleDiameter,
                            height: V2LearningPathStartNodeMetrics.circleDiameter
                        )
                        .overlay {
                            Circle()
                                .stroke(
                                    V2LearningPathStartNodeMetrics.circleStrokeFill,
                                    lineWidth: V2LearningPathStartNodeMetrics.circleStrokeWidth
                                )
                        }
                        .v2Shadow()

                    V2LearningPathStartFlagShape()
                        .fill(V2LearningPathStartNodeMetrics.flagFill)
                        .frame(
                            width: V2LearningPathStartNodeMetrics.flagWidth,
                            height: V2LearningPathStartNodeMetrics.flagHeight
                        )
                }

                Text(node.title)
                    .font(V2Typography.nodeLabel)
                    .foregroundStyle(V2Color.primary)
            }
        case .unit:
            ZStack(alignment: .topLeading) {
                Ellipse()
                    .fill(unitStyle.bodyFill)
                    .frame(width: V2LearningPathUnitNodeMetrics.bodyWidth, height: V2LearningPathUnitNodeMetrics.bodyHeight)
                    .shadow(
                        color: unitStyle.shadowColor,
                        radius: V2LearningPathUnitNodeMetrics.shadowRadius,
                        x: 0,
                        y: V2LearningPathUnitNodeMetrics.shadowY
                    )

                Circle()
                    .fill(unitStyle.iconBackgroundFill)
                    .frame(
                        width: V2LearningPathUnitNodeMetrics.iconBackgroundDiameter,
                        height: V2LearningPathUnitNodeMetrics.iconBackgroundDiameter
                    )
                    .position(V2LearningPathUnitNodeMetrics.iconCenter)

                V2LearningPathStarShape()
                    .fill(unitStyle.starFill)
                    .frame(width: V2LearningPathUnitNodeMetrics.starWidth, height: V2LearningPathUnitNodeMetrics.starHeight)
                    .position(V2LearningPathUnitNodeMetrics.starCenter)

                Text(node.title)
                    .font(V2LearningPathUnitNodeMetrics.labelFont)
                    .foregroundStyle(unitStyle.labelFill)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
                    .frame(width: V2LearningPathUnitNodeMetrics.labelWidth, height: V2LearningPathUnitNodeMetrics.labelHeight)
                    .position(V2LearningPathUnitNodeMetrics.labelCenter)
            }
            .frame(width: V2LearningPathUnitNodeMetrics.bodyWidth, height: V2LearningPathUnitNodeMetrics.bodyHeight)
        }
    }

    private var unitStyle: V2LearningPathUnitNodeStyle {
        switch node.state {
        case .start:
            .reviewed
        case .completed, .current:
            .reviewed
        case .locked:
            .notReviewed
        }
    }
}

private enum V2LearningPathStartNodeMetrics {
    // Source: path-node-states-base.svg. The start node is a 90pt circle
    // with an 8pt cream stroke inside a 98pt shadow canvas.
    static let circleDiameter: CGFloat = 90
    static let circleStrokeWidth: CGFloat = 8
    static let circleFill = Color(hex: 0x98A35E)
    static let circleStrokeFill = Color(hex: 0xFEF8E8)
    static let flagWidth: CGFloat = 31
    static let flagHeight: CGFloat = 34
    static let flagFill = Color(hex: 0xFDFDFF)
}

private struct V2LearningPathStartFlagShape: Shape {
    func path(in rect: CGRect) -> Path {
        let sourceWidth: CGFloat = 27.13
        let sourceHeight: CGFloat = 33.79
        let scale = min(rect.width / sourceWidth, rect.height / sourceHeight)
        let offsetX = rect.midX - sourceWidth * scale / 2
        let offsetY = rect.midY - sourceHeight * scale / 2

        func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: offsetX + x * scale, y: offsetY + y * scale)
        }

        var path = Path()
        path.move(to: point(0, 1.969))
        path.addLine(to: point(0, 31.501))
        path.addCurve(
            to: point(3.622, 31.501),
            control1: point(0.987, 33.789),
            control2: point(3.402, 33.36)
        )
        path.addLine(to: point(3.622, 20.016))
        path.addCurve(
            to: point(14.407, 20.169),
            control1: point(3.622, 18.039),
            control2: point(9.708, 19.778)
        )
        path.addCurve(
            to: point(27, 17.391),
            control1: point(27, 21.219),
            control2: point(28.815, 19.411)
        )
        path.addLine(to: point(22.061, 10.829))
        path.addCurve(
            to: point(26.012, 3.929),
            control1: point(23.158, 9.735),
            control2: point(24.695, 6.554)
        )
        path.addCurve(
            to: point(25.354, 0.648),
            control1: point(27.563, 0.838),
            control2: point(28.056, -0.304)
        )
        path.addCurve(
            to: point(12.891, 0.647),
            control1: point(22.651, 1.6),
            control2: point(17.44, 2.912)
        )
        path.addCurve(
            to: point(0, 1.969),
            control1: point(6.961, -2.304),
            control2: point(2.744, 0)
        )
        path.closeSubpath()
        return path
    }
}

private struct V2SegmentedNodeProgress: View {
    let completed: Int
    let total: Int

    private var segmentCount: Int {
        max(total, 1)
    }

    var body: some View {
        Canvas { context, size in
            let segments = V2SegmentedNodeProgressGeometry.segments(
                in: size,
                count: segmentCount
            )

            for segment in segments {
                let color = segment.index < completed
                    ? V2SegmentedNodeProgressMetrics.completedColor
                    : V2SegmentedNodeProgressMetrics.pendingColor

                context.stroke(
                    segment.path,
                    with: .color(color),
                    style: StrokeStyle(
                        lineWidth: V2SegmentedNodeProgressMetrics.lineWidth,
                        lineCap: .round,
                        lineJoin: .round
                    )
                )
            }
        }
        .allowsHitTesting(false)
    }
}

private enum V2SegmentedNodeProgressMetrics {
    static let lineWidth: CGFloat = 8
    static let ellipseWidth: CGFloat = 108
    static let ellipseHeight: CGFloat = 126
    static let sampleCount: Int = 360
    static let gapLength: CGFloat = 13
    static let completedColor = Color(hex: 0x9EA860)
    static let pendingColor = Color(hex: 0xDCE1B1).opacity(0.72)

    // Starts the progress rhythm on the lower-left side, matching the
    // hand-drawn node reference more closely than a top-centered circular ring.
    static let startAngle: CGFloat = -.pi * 0.88
}

private struct V2SegmentedNodeProgressSegment {
    let index: Int
    let path: Path
}

private enum V2SegmentedNodeProgressGeometry {
    static func segments(
        in size: CGSize,
        count: Int
    ) -> [V2SegmentedNodeProgressSegment] {
        let sample = sampledEllipse(in: size)
        guard sample.totalLength > 0 else {
            return []
        }

        let segmentLength = sample.totalLength / CGFloat(max(count, 1))
        let gapLength = count <= 1
            ? 0
            : min(V2SegmentedNodeProgressMetrics.gapLength, segmentLength * 0.38)

        return (0..<max(count, 1)).map { index in
            let start = CGFloat(index) * segmentLength + gapLength / 2
            let end = CGFloat(index + 1) * segmentLength - gapLength / 2
            return V2SegmentedNodeProgressSegment(
                index: index,
                path: sample.path(from: start, to: end)
            )
        }
    }

    private static func sampledEllipse(in size: CGSize) -> V2SegmentedNodeProgressSample {
        let rect = CGRect(
            x: (size.width - V2SegmentedNodeProgressMetrics.ellipseWidth) / 2,
            y: (size.height - V2SegmentedNodeProgressMetrics.ellipseHeight) / 2,
            width: V2SegmentedNodeProgressMetrics.ellipseWidth,
            height: V2SegmentedNodeProgressMetrics.ellipseHeight
        )
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let radiusX = rect.width / 2
        let radiusY = rect.height / 2
        let pointCount = max(V2SegmentedNodeProgressMetrics.sampleCount, 24)
        let startAngle = V2SegmentedNodeProgressMetrics.startAngle

        let points = (0...pointCount).map { index in
            let progress = CGFloat(index) / CGFloat(pointCount)
            let angle = startAngle + progress * 2 * .pi
            return CGPoint(
                x: center.x + cos(angle) * radiusX,
                y: center.y + sin(angle) * radiusY
            )
        }

        return V2SegmentedNodeProgressSample(points: points)
    }
}

private struct V2SegmentedNodeProgressSample {
    let points: [CGPoint]
    let cumulativeLengths: [CGFloat]
    let totalLength: CGFloat

    init(points: [CGPoint]) {
        self.points = points

        var cumulativeLengths: [CGFloat] = [0]
        cumulativeLengths.reserveCapacity(points.count)

        for index in 1..<points.count {
            let previous = points[index - 1]
            let current = points[index]
            let distance = hypot(current.x - previous.x, current.y - previous.y)
            cumulativeLengths.append((cumulativeLengths.last ?? 0) + distance)
        }

        self.cumulativeLengths = cumulativeLengths
        self.totalLength = cumulativeLengths.last ?? 0
    }

    func path(from rawStart: CGFloat, to rawEnd: CGFloat) -> Path {
        let start = max(0, min(rawStart, totalLength))
        let end = max(start, min(rawEnd, totalLength))

        var path = Path()
        path.move(to: point(at: start))

        guard points.count > 1 else {
            return path
        }

        for index in 1..<points.count {
            let pointLength = cumulativeLengths[index]
            guard pointLength > start else {
                continue
            }

            if pointLength >= end {
                path.addLine(to: point(at: end))
                break
            }

            path.addLine(to: points[index])
        }

        return path
    }

    private func point(at length: CGFloat) -> CGPoint {
        guard points.count > 1 else {
            return points.first ?? .zero
        }

        if length <= 0 {
            return points[0]
        }

        if length >= totalLength {
            return points[points.count - 1]
        }

        guard let upperIndex = cumulativeLengths.firstIndex(where: { $0 >= length }) else {
            return points[points.count - 1]
        }

        let lowerIndex = max(0, upperIndex - 1)
        let lowerLength = cumulativeLengths[lowerIndex]
        let upperLength = cumulativeLengths[upperIndex]
        let localProgress = upperLength == lowerLength
            ? 0
            : (length - lowerLength) / (upperLength - lowerLength)
        let lowerPoint = points[lowerIndex]
        let upperPoint = points[upperIndex]

        return CGPoint(
            x: lowerPoint.x + (upperPoint.x - lowerPoint.x) * localProgress,
            y: lowerPoint.y + (upperPoint.y - lowerPoint.y) * localProgress
        )
    }
}

private struct V2LearningPathUnitNodeStyle {
    let bodyFill: Color
    let shadowColor: Color
    let iconBackgroundFill: Color
    let starFill: Color
    let labelFill: Color

    static let reviewed = V2LearningPathUnitNodeStyle(
        bodyFill: Color(hex: 0xFCF8ED),
        shadowColor: Color(hex: 0x98A35E).opacity(0.20),
        iconBackgroundFill: Color(hex: 0xF1F1D7),
        starFill: Color(hex: 0x9EA860),
        labelFill: Color(hex: 0x1F1B12)
    )

    static let notReviewed = V2LearningPathUnitNodeStyle(
        bodyFill: .white,
        shadowColor: Color(hex: 0xADADAD).opacity(0.20),
        iconBackgroundFill: Color(hex: 0xEBEBEB),
        starFill: Color(hex: 0xB1B1B1),
        labelFill: Color(hex: 0x1F1B12).opacity(0.49)
    )
}

private enum V2LearningPathUnitNodeMetrics {
    // Source: Figma Pick The Shell nodes 313:1072 and 349:930.
    static let bodyWidth: CGFloat = 81
    static let bodyHeight: CGFloat = 97
    static let shadowRadius: CGFloat = 4
    static let shadowY: CGFloat = 4
    static let iconBackgroundDiameter: CGFloat = 39
    static let starWidth: CGFloat = 25
    static let starHeight: CGFloat = 24
    static let iconCenter = CGPoint(x: 40.5, y: 34.5)
    static let starCenter = CGPoint(x: 40.5, y: 34.75)
    static let labelWidth: CGFloat = 37
    static let labelHeight: CGFloat = 14
    static let labelCenter = CGPoint(x: 40.5, y: 72)
    static let labelFont = Font.system(size: 12, weight: .regular, design: .default)
}

private struct V2LearningPathStarShape: Shape {
    func path(in rect: CGRect) -> Path {
        let sourceWidth: CGFloat = 25
        let sourceHeight: CGFloat = 24
        let scale = min(rect.width / sourceWidth, rect.height / sourceHeight)
        let offsetX = rect.midX - sourceWidth * scale / 2
        let offsetY = rect.midY - sourceHeight * scale / 2

        func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: offsetX + x * scale, y: offsetY + y * scale)
        }

        var path = Path()
        path.move(to: point(10.8454, 0.813142))
        path.addCurve(
            to: point(13.512, 0.813143),
            control1: point(11.404, -0.270504),
            control2: point(12.9534, -0.270504)
        )
        path.addLine(to: point(16.2048, 6.03722))
        path.addCurve(
            to: point(17.2965, 6.83037),
            control1: point(16.4226, 6.4596),
            control2: point(16.8275, 6.75383)
        )
        path.addLine(to: point(23.097, 7.77708))
        path.addCurve(
            to: point(23.9211, 10.3131),
            control1: point(24.3003, 7.97346),
            control2: point(24.7791, 9.44704)
        )
        path.addLine(to: point(19.7848, 14.4885))
        path.addCurve(
            to: point(19.3678, 15.7719),
            control1: point(19.4504, 14.8261),
            control2: point(19.2957, 15.3022)
        )
        path.addLine(to: point(20.2599, 21.581))
        path.addCurve(
            to: point(18.1026, 23.1484),
            control1: point(20.4449, 22.786),
            control2: point(19.1914, 23.6968)
        )
        path.addLine(to: point(12.8534, 20.5048))
        path.addCurve(
            to: point(11.504, 20.5048),
            control1: point(12.429, 20.2911),
            control2: point(11.9284, 20.2911)
        )
        path.addLine(to: point(6.25483, 23.1484))
        path.addCurve(
            to: point(4.09752, 21.581),
            control1: point(5.16598, 23.6968),
            control2: point(3.91247, 22.786)
        )
        path.addLine(to: point(4.98961, 15.7719))
        path.addCurve(
            to: point(4.57263, 14.4885),
            control1: point(5.06174, 15.3022),
            control2: point(4.90705, 14.8261)
        )
        path.addLine(to: point(0.436365, 10.3131))
        path.addCurve(
            to: point(1.26038, 7.77708),
            control1: point(-0.421633, 9.44704),
            control2: point(0.0571644, 7.97346)
        )
        path.addLine(to: point(7.06091, 6.83037))
        path.addCurve(
            to: point(8.15259, 6.03722),
            control1: point(7.52989, 6.75383),
            control2: point(7.93487, 6.4596)
        )
        path.addLine(to: point(10.8454, 0.813142))
        path.closeSubpath()
        return path
    }
}

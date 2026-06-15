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
                        .fill(V2Color.primary)
                        .frame(width: 76, height: 76)
                        .overlay(Circle().stroke(V2Color.surfaceNav, lineWidth: 8))
                        .v2Shadow()
                    Image(systemName: "flag.fill")
                        .font(.system(size: 28, weight: .semibold))
                        .foregroundStyle(.white)
                }

                Text(node.title)
                    .font(V2Typography.nodeLabel)
                    .foregroundStyle(V2Color.primary)
            }
        case .unit:
            VStack(spacing: 9) {
                ZStack {
                    RoundedRectangle(cornerRadius: 44, style: .continuous)
                        .fill(V2Color.surfaceNav)
                        .frame(width: 86, height: 112)
                        .v2Shadow()

                    VStack(spacing: 14) {
                        ZStack {
                            Circle()
                                .fill(iconBackground)
                                .frame(width: 42, height: 42)
                            Image(systemName: "star.fill")
                                .font(.system(size: 24, weight: .bold))
                                .foregroundStyle(iconColor)
                        }

                        Text(node.title)
                            .font(V2Typography.nodeLabel)
                            .foregroundStyle(node.state == .locked ? V2Color.textMuted : V2Color.textPrimary)
                    }
                    .offset(y: 3)
                }
            }
        }
    }

    private var iconBackground: Color {
        switch node.state {
        case .locked:
            Color(hex: 0xE7E7E7)
        default:
            Color(hex: 0xEEF0CD)
        }
    }

    private var iconColor: Color {
        switch node.state {
        case .locked:
            V2Color.nodeLockedIcon
        default:
            V2Color.primary
        }
    }
}

private struct V2SegmentedNodeProgress: View {
    let completed: Int
    let total: Int

    private var segmentCount: Int {
        max(total, 1)
    }

    var body: some View {
        ZStack {
            ForEach(0..<segmentCount, id: \.self) { index in
                Capsule()
                    .fill(index < completed ? V2Color.primary : V2Color.borderSoftGreen.opacity(0.72))
                    .frame(width: 34, height: 7)
                    .rotationEffect(.degrees(Double(index) / Double(segmentCount) * 360 + 8))
                    .offset(
                        x: cos(angle(for: index)) * 50,
                        y: sin(angle(for: index)) * 61
                    )
            }
        }
    }

    private func angle(for index: Int) -> Double {
        (Double(index) / Double(segmentCount) * 2 * .pi) - (.pi / 2)
    }
}

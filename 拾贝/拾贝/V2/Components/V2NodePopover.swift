import SwiftUI

struct V2NodePopover: View {
    let node: V2LearningPathNodeData
    let pointerX: CGFloat
    let showsActionButton: Bool
    let action: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: contentSpacing) {
                Text(node.subtitle)
                    .font(V2Typography.bodyEmphasis)
                    .foregroundStyle(V2Color.textPrimary)
                    .lineLimit(2)

                if showsActionButton {
                    Button(action: action) {
                        Text(node.kind == .start ? "复习" : "继续复习")
                            .font(V2Typography.bodyEmphasis)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 42)
                            .background(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .fill(V2Color.primaryAction)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, V2NodePopoverMetrics.horizontalPadding)
            .padding(.vertical, verticalPadding)
            .frame(width: V2NodePopoverMetrics.width)
            .frame(minHeight: cardMinHeight, alignment: .center)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(V2Color.surfaceCream)
                    .v2Shadow()
            )
            .overlay(alignment: .bottomLeading) {
                V2Triangle()
                    .fill(V2Color.surfaceCream)
                    .frame(width: 28, height: 21)
                    .offset(x: clampedPointerX, y: 20)
                    .v2Shadow(V2Shadow.subtleGreen)
            }
        }
        .frame(
            width: V2NodePopoverMetrics.width,
            height: V2NodePopoverMetrics.actionCardHeight,
            alignment: .bottom
        )
    }

    private var contentSpacing: CGFloat {
        showsActionButton ? V2NodePopoverMetrics.actionContentSpacing : 0
    }

    private var verticalPadding: CGFloat {
        showsActionButton
            ? V2NodePopoverMetrics.actionVerticalPadding
            : V2NodePopoverMetrics.previewVerticalPadding
    }

    private var cardMinHeight: CGFloat {
        showsActionButton
            ? V2NodePopoverMetrics.actionCardHeight
            : V2NodePopoverMetrics.previewCardHeight
    }

    private var clampedPointerX: CGFloat {
        min(
            max(pointerX - V2NodePopoverMetrics.pointerHalfWidth, V2NodePopoverMetrics.pointerMinX),
            V2NodePopoverMetrics.pointerMaxX
        )
    }
}

private enum V2NodePopoverMetrics {
    static let width: CGFloat = 272
    static let actionCardHeight: CGFloat = 128
    static let previewCardHeight: CGFloat = 104
    static let horizontalPadding: CGFloat = 26
    static let actionVerticalPadding: CGFloat = 22
    static let previewVerticalPadding: CGFloat = 26
    static let actionContentSpacing: CGFloat = 18
    static let pointerHalfWidth: CGFloat = 14
    static let pointerMinX: CGFloat = 18
    static let pointerMaxX: CGFloat = 226
}

private struct V2Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.midX, y: rect.maxY))
        path.closeSubpath()
        return path
    }
}

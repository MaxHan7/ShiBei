import SwiftUI

struct V2NodePopover: View {
    let node: V2LearningPathNodeData
    let pointerX: CGFloat
    let showsActionButton: Bool
    let action: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 18) {
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
            .padding(.horizontal, 24)
            .padding(.vertical, 22)
            .frame(width: 272)
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
        .frame(width: 272)
    }

    private var clampedPointerX: CGFloat {
        min(max(pointerX - 14, 18), 226)
    }
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

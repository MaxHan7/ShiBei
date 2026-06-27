import SwiftUI

struct V2CurrentChapterBanner: View {
    let chapter: V2CurrentChapterData
    let action: () -> Void

    var body: some View {
        GeometryReader { proxy in
            let width = proxy.size.width
            let titleWidth = max(120, width - Metrics.trailingActionWidth - Metrics.titleLeading - Metrics.titleTrailingGap)

            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: Metrics.cornerRadius, style: .continuous)
                    .fill(Metrics.backgroundFill)
                    .shadow(
                        color: Metrics.shadowColor,
                        radius: Metrics.shadowRadius,
                        x: 0,
                        y: Metrics.shadowY
                    )

                VStack(alignment: .leading, spacing: Metrics.titleStackSpacing) {
                    Text(chapter.eyebrow)
                        .font(Metrics.eyebrowFont)
                        .foregroundStyle(Metrics.eyebrowFill)
                        .lineLimit(1)
                        .frame(height: Metrics.eyebrowHeight, alignment: .topLeading)

                    Text(chapter.title)
                        .font(Metrics.titleFont)
                        .foregroundStyle(Metrics.titleFill)
                        .lineLimit(2, reservesSpace: true)
                        .truncationMode(.tail)
                        .lineSpacing(Metrics.titleLineSpacing)
                        .frame(width: titleWidth, height: Metrics.titleHeight, alignment: .leading)
                        .offset(y: Metrics.titleVerticalAdjustment)
                        .clipped()
                }
                .position(
                    x: Metrics.titleLeading + titleWidth / 2,
                    y: Metrics.textGroupCenterY
                )

                Rectangle()
                    .fill(Metrics.dividerFill)
                    .frame(width: Metrics.dividerWidth, height: Metrics.dividerHeight)
                    .position(x: width - Metrics.trailingActionWidth, y: Metrics.height / 2)

                Button(action: action) {
                    V2ChapterSourceDocumentIcon()
                        .frame(width: Metrics.iconSize, height: Metrics.iconSize)
                        .frame(width: Metrics.actionHitSize, height: Metrics.actionHitSize)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .position(x: width - Metrics.iconTrailing - Metrics.iconSize / 2, y: Metrics.iconCenterY)
                .accessibilityLabel("查看章节详情")
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: Metrics.height)
    }
}

private enum Metrics {
    // Source: Figma Pick The Shell node 548:1216.
    static let height: CGFloat = 88
    static let cornerRadius: CGFloat = 15
    static let backgroundFill = Color(hex: 0xF9F8EE)
    static let shadowColor = Color(hex: 0xAFBA74).opacity(0.25)
    static let shadowRadius: CGFloat = 4
    static let shadowY: CGFloat = 4

    static let titleLeading: CGFloat = 13
    static let titleTrailingGap: CGFloat = 6
    static let titleStackSpacing: CGFloat = 8
    static let textGroupCenterY: CGFloat = 46.5
    static let eyebrowHeight: CGFloat = 14
    static let titleHeight: CGFloat = 48
    // The SVG text is converted to paths. Native Text has extra ascender
    // padding, so lift the title frame slightly to match the path bbox gap.
    static let titleVerticalAdjustment: CGFloat = -1.5
    static let titleLineSpacing: CGFloat = 3
    static let eyebrowFont = V2Typography.microEmphasis
    static let titleFont = Font.system(size: 16, weight: .regular, design: .default)
    static let eyebrowFill = V2Color.primaryAction
    static let titleFill = Color(hex: 0x645B51)

    static let trailingActionWidth: CGFloat = 56
    static let dividerWidth: CGFloat = 1
    static let dividerHeight: CGFloat = 87
    static let dividerFill = V2Color.pageGreenBackground
    static let iconSize: CGFloat = 24
    static let actionHitSize: CGFloat = 44
    static let iconTrailing: CGFloat = 16
    static let iconCenterY: CGFloat = 44
}

private struct V2ChapterSourceDocumentIcon: View {
    var body: some View {
        Canvas { context, size in
            let scale = min(size.width, size.height) / 24
            let offset = CGPoint(
                x: (size.width - 24 * scale) / 2,
                y: (size.height - 24 * scale) / 2
            )

            func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
                CGPoint(x: offset.x + x * scale, y: offset.y + y * scale)
            }

            var document = Path()
            document.move(to: point(7, 21))
            document.addCurve(
                to: point(5, 19),
                control1: point(5.89543, 21),
                control2: point(5, 20.1046)
            )
            document.addLine(to: point(5, 3))
            document.addLine(to: point(14, 3))
            document.addLine(to: point(19, 8))
            document.addLine(to: point(19, 19))
            document.addCurve(
                to: point(17, 21),
                control1: point(19, 20.1046),
                control2: point(18.1046, 21)
            )
            document.addLine(to: point(7, 21))

            var foldedCorner = Path()
            foldedCorner.move(to: point(13, 3))
            foldedCorner.addLine(to: point(13, 9))
            foldedCorner.addLine(to: point(19, 9))

            var firstLine = Path()
            firstLine.move(to: point(9, 13))
            firstLine.addLine(to: point(15, 13))

            var secondLine = Path()
            secondLine.move(to: point(9, 17))
            secondLine.addLine(to: point(15, 17))

            let stroke = StrokeStyle(lineWidth: 1.5 * scale, lineCap: .round, lineJoin: .round)
            let color = Color(hex: 0x9EA860)
            context.stroke(document, with: .color(color), style: stroke)
            context.stroke(foldedCorner, with: .color(color), style: stroke)
            context.stroke(firstLine, with: .color(color), style: stroke)
            context.stroke(secondLine, with: .color(color), style: stroke)
        }
        .accessibilityHidden(true)
    }
}

import SwiftUI

struct V2GeneratingChapterDetailCard: View {
    let progress: CGFloat
    let statusText: String
    let isCompleted: Bool
    let onSource: () -> Void
    let onOpenChapter: () -> Void
    let onDelete: () -> Void

    private var accentColor: Color {
        Color(hex: 0xADD3FF)
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()

            V2GeneratingClockBadge()
            .frame(width: 34, height: 34)
            .offset(x: 23, y: 21)

            Text("章节正在生成")
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(V2Color.topTitle)
                .frame(width: 118, alignment: .leading)
                .frame(minHeight: 39, alignment: .leading)
                .offset(x: 59, y: 18)

            V2GeneratingSourceLinkChip(accent: accentColor, action: onSource)
                .offset(x: 186, y: 20)

            V2GeneratingProgressBar(progress: progress)
                .frame(width: 272, height: 43)
                .offset(x: 23, y: 63)

            Text(statusText)
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(Color(hex: 0x736D78))
                .lineLimit(1)
                .frame(width: 283, alignment: .leading)
                .frame(minHeight: 27, alignment: .leading)
                .offset(x: 20, y: 144)

            if isCompleted {
                Button(action: onOpenChapter) {
                    Text("查看章节")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 280, height: 42)
                        .background(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(V2Color.primaryAction)
                                .shadow(color: V2Color.primaryAction.opacity(0.28), radius: 3, x: 0, y: 4)
                        )
                }
                .buttonStyle(.plain)
                .offset(x: 23, y: 221)
            } else {
                Button(action: onDelete) {
                    Text("取消生成")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color(hex: 0x6E7378))
                        .frame(width: 280, height: 42)
                        .background(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(V2Color.surfaceCream)
                                .shadow(color: accentColor.opacity(0.24), radius: 3, x: 0, y: 4)
                        )
                }
                .buttonStyle(.plain)
                .offset(x: 23, y: 221)
            }
        }
        .frame(width: V2Layout.contentMaxWidth, height: 302)
    }
}

struct V2GeneratingProgressBar: View {
    let progress: CGFloat

    private var clampedProgress: CGFloat {
        min(max(progress, 0), 1)
    }

    var body: some View {
        GeometryReader { geometry in
            let trackWidth = max(0, geometry.size.width - 8)

            ZStack(alignment: .topLeading) {
                Capsule()
                    .fill(V2Color.surfaceNav)
                    .frame(width: trackWidth, height: 11)
                    .shadow(color: Color(hex: 0xADD3FF).opacity(0.2), radius: 2, x: 0, y: 4)
                    .offset(x: 4, y: 16)

                Capsule()
                    .fill(Color(hex: 0xADD3FF))
                    .frame(width: max(11, trackWidth * clampedProgress), height: 11)
                    .offset(x: 4, y: 16)
            }
        }
    }
}

private struct V2GeneratingClockBadge: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(Color(hex: 0xADD3FF))

            Circle()
                .fill(V2Color.surfaceCream)
                .frame(width: 18, height: 18)

            Path { path in
                path.move(to: CGPoint(x: 16, y: 13))
                path.addLine(to: CGPoint(x: 16, y: 18))
                path.addLine(to: CGPoint(x: 21, y: 18))
            }
            .stroke(
                Color(hex: 0xADD3FF),
                style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round)
            )
        }
        .accessibilityHidden(true)
    }
}

private struct V2GeneratingSourceLinkChip: View {
    private static let width: CGFloat = 132

    var accent: Color = Color(hex: 0xADD3FF)
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(accent)
                        .frame(width: 23, height: 23)

                    V2GeneratingLinkIcon()
                        .stroke(
                            V2Color.surfaceCream,
                            style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round)
                        )
                        .frame(width: 12, height: 12)
                }
                .frame(width: 34, height: 34)

                Text("查看原文")
                    .font(V2Typography.labelRegular)
                    .foregroundStyle(Color(hex: 0x767676))
                    .lineLimit(1)
                    .layoutPriority(1)
            }
            .padding(.leading, 12)
            .padding(.trailing, 14)
            .frame(width: Self.width, alignment: .leading)
            .frame(minHeight: 44, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(V2Color.surfaceCream)
                    .shadow(color: accent.opacity(0.2), radius: 2, x: 0, y: 4)
            )
        }
        .buttonStyle(.plain)
        .frame(width: Self.width, height: 44, alignment: .topLeading)
        .accessibilityLabel("查看原文")
    }
}

private struct V2GeneratingLinkIcon: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let scaleX = rect.width / 12
        let scaleY = rect.height / 12

        func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: rect.minX + x * scaleX, y: rect.minY + y * scaleY)
        }

        path.move(to: point(4.36, 7.20))
        path.addLine(to: point(7.33, 3.93))
        path.move(to: point(3.10, 5.31))
        path.addLine(to: point(1.99, 6.53))
        path.addCurve(to: point(2.13, 9.65), control1: point(1.17, 7.43), control2: point(1.23, 8.83))
        path.addCurve(to: point(5.25, 9.50), control1: point(3.04, 10.47), control2: point(4.43, 10.40))
        path.addLine(to: point(6.37, 8.28))
        path.move(to: point(5.33, 2.86))
        path.addLine(to: point(6.44, 1.63))
        path.addCurve(to: point(9.56, 1.49), control1: point(7.27, 0.73), control2: point(8.66, 0.66))
        path.addCurve(to: point(9.71, 4.60), control1: point(10.47, 2.31), control2: point(10.53, 3.71))
        path.addLine(to: point(8.60, 5.83))

        return path
    }
}

struct V2ChapterStatusTag: View {
    let status: V2ChapterReviewStatus

    var body: some View {
        Text(status.title)
            .font(.system(size: 12, weight: .regular))
            .foregroundStyle(Color(hex: status.foregroundColor.hex))
            .frame(width: 55, height: 22)
            .background(
                Capsule()
                    .fill(Color(hex: status.backgroundColor.hex))
            )
    }
}

struct V2GenerationStartedDialog: View {
    let onAcknowledge: () -> Void

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
                .frame(width: 321, height: 142)
                .offset(x: 4, y: 24)

            Image("V2GeneratingPopupWave")
                .resizable()
                .renderingMode(.original)
                .frame(width: 321, height: 82)
                .offset(x: 4, y: 84)

            Image("V2GeneratingPopupMascot")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 118, height: 141)
                .offset(x: 197, y: 0)
                .allowsHitTesting(false)

            Text("章节正在生成中，\n完成后会通知你")
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(V2Color.topTitle)
                .lineSpacing(8)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .frame(width: 115, height: 42, alignment: .leading)
                .offset(x: 34, y: 62)

            Button(action: onAcknowledge) {
                Text("知道了")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(V2Color.primaryAction)
                    .frame(width: 80, height: 32)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .offset(x: 124, y: 130)
        }
        .frame(width: 329, height: 174)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("章节正在生成中，完成后会通知你")
    }
}

struct V2GeneratedChaptersSummaryCard: View {
    let count: Int

    var body: some View {
        ZStack(alignment: .topLeading) {
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text("已生成 ")
                    .font(V2GeneratedChaptersSummaryCardMetrics.textFont)
                    .foregroundStyle(Color(hex: 0x383838))

                Text("\(count)")
                    .font(V2GeneratedChaptersSummaryCardMetrics.numberFont)
                    .foregroundStyle(V2Color.primaryAction)

                Text(" 个章节")
                    .font(V2GeneratedChaptersSummaryCardMetrics.textFont)
                    .foregroundStyle(Color(hex: 0x383838))
            }
            .frame(
                width: V2GeneratedChaptersSummaryCardMetrics.copyWidth,
                height: V2GeneratedChaptersSummaryCardMetrics.copyHeight,
                alignment: .leading
            )
            .offset(x: V2GeneratedChaptersSummaryCardMetrics.copyX, y: V2GeneratedChaptersSummaryCardMetrics.copyY)
        }
        .frame(maxWidth: .infinity, minHeight: 82, maxHeight: 82, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
    }
}

private enum V2GeneratedChaptersSummaryCardMetrics {
    static let copyX: CGFloat = 23
    static let copyY: CGFloat = 28
    static let copyWidth: CGFloat = 150
    static let copyHeight: CGFloat = 24
    static let textFont = Font.system(size: 12, weight: .regular, design: .default)
    static let numberFont = Font.system(size: 20, weight: .bold, design: .default)
}

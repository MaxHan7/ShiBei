import SwiftUI

struct V2ProfileSettingRow: View {
    let title: String
    let assetName: String

    var body: some View {
        HStack(spacing: 14) {
            Image(assetName)
                .resizable()
                .renderingMode(.original)
                .frame(width: 33, height: 33)

            Text(title)
                .font(V2Typography.label)
                .foregroundStyle(V2Color.topTitle)

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(V2Color.textMuted.opacity(0.72))
        }
        .frame(height: 56)
        .padding(.leading, 24)
        .padding(.trailing, 24)
        .contentShape(Rectangle())
    }
}

struct V2UnitOverviewBoardCard: View {
    let overview: String

    var body: some View {
        ZStack(alignment: .topLeading) {
            V2UnitBoardLeg(rotation: 13)
                .offset(x: 94, y: 238)
                .zIndex(0)

            V2UnitBoardLeg(rotation: -13)
                .offset(x: 204, y: 238)
                .zIndex(0)

            RoundedRectangle(cornerRadius: V2UnitOverviewBoardMetrics.cardRadius, style: .continuous)
                .fill(V2Color.surfaceCream)
                .overlay(
                    RoundedRectangle(cornerRadius: V2UnitOverviewBoardMetrics.cardRadius, style: .continuous)
                        .stroke(Color(hex: 0x929A4F), lineWidth: 1)
                )
                .frame(width: V2UnitOverviewBoardMetrics.cardWidth, height: V2UnitOverviewBoardMetrics.cardHeight)
                .zIndex(1)

            VStack(alignment: .leading, spacing: V2UnitOverviewBoardMetrics.labelBottomSpacing) {
                Text("核心知识点：")
                    .font(V2UnitOverviewBoardMetrics.bodyFont)
                    .foregroundStyle(V2Color.topTitle)

                Text(overview)
                    .font(V2UnitOverviewBoardMetrics.bodyFont)
                    .foregroundStyle(V2Color.topTitle)
                    .lineSpacing(V2UnitOverviewBoardMetrics.lineSpacing)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(width: V2UnitOverviewBoardMetrics.textWidth, alignment: .topLeading)
            .offset(x: V2UnitOverviewBoardMetrics.textX, y: V2UnitOverviewBoardMetrics.textY)
            .zIndex(2)

            Image("V2UnitOverviewMascot")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: V2UnitOverviewBoardMetrics.mascotWidth, height: V2UnitOverviewBoardMetrics.mascotHeight)
                .offset(x: V2UnitOverviewBoardMetrics.mascotX, y: V2UnitOverviewBoardMetrics.mascotY)
                .zIndex(3)
        }
        .frame(width: V2UnitOverviewBoardMetrics.stageWidth, height: V2UnitOverviewBoardMetrics.stageHeight, alignment: .topLeading)
    }
}

private struct V2UnitBoardLeg: View {
    let rotation: Double

    var body: some View {
        Capsule()
            .fill(V2Color.decorativeLeaf)
            .frame(width: 10, height: 72)
            .rotationEffect(.degrees(rotation), anchor: .top)
    }
}

private enum V2UnitOverviewBoardMetrics {
    static let cardWidth: CGFloat = 321
    static let cardHeight: CGFloat = 241
    static let cardRadius: CGFloat = 15
    static let stageWidth: CGFloat = 321
    static let stageHeight: CGFloat = 355
    static let textX: CGFloat = 29
    static let textY: CGFloat = 27
    static let textWidth: CGFloat = 263
    static let labelBottomSpacing: CGFloat = 27
    static let bodyFont = Font.system(size: 16, weight: .regular, design: .default)
    static let lineSpacing: CGFloat = 11.2
    static let mascotX: CGFloat = 204
    static let mascotY: CGFloat = 187
    static let mascotWidth: CGFloat = 153
    static let mascotHeight: CGFloat = 180
}

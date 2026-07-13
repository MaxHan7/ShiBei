import SwiftUI

struct V2ProfileSettingRow: View {
    let title: String
    let subtitle: String?
    let assetName: String?
    let systemImageName: String?

    init(
        title: String,
        subtitle: String? = nil,
        assetName: String? = nil,
        systemImageName: String? = nil
    ) {
        self.title = title
        self.subtitle = subtitle
        self.assetName = assetName
        self.systemImageName = systemImageName
    }

    var body: some View {
        HStack(spacing: 14) {
            icon

            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(V2Typography.label)
                    .foregroundStyle(V2Color.topTitle)

                if let subtitle {
                    Text(subtitle)
                        .font(V2Typography.caption)
                        .foregroundStyle(V2Color.textMuted)
                        .lineLimit(1)
                }
            }

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

    @ViewBuilder
    private var icon: some View {
        if let assetName {
            Image(assetName)
                .resizable()
                .renderingMode(.original)
                .frame(width: 33, height: 33)
        } else if let systemImageName {
            Image(systemName: systemImageName)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(V2Color.topTitle.opacity(0.78))
                .frame(width: 33, height: 33)
                .background(V2Color.surfaceCream)
                .clipShape(Circle())
                .v2Shadow(V2Shadow.subtleGreen)
        }
    }
}

struct V2UnitOverviewBoardCard: View {
    let overview: String
    @Environment(\.v2ContentWidth) private var contentWidth

    var body: some View {
        let width = contentWidth

        ZStack(alignment: .topLeading) {
            V2UnitBoardLeg(rotation: 13)
                .offset(x: 94, y: 238)
                .zIndex(0)

            V2UnitBoardLeg(rotation: -13)
                .offset(x: width - 117, y: 238)
                .zIndex(0)

            RoundedRectangle(cornerRadius: V2UnitOverviewBoardMetrics.cardRadius, style: .continuous)
                .fill(V2Color.surfaceCream)
                .overlay(
                    RoundedRectangle(cornerRadius: V2UnitOverviewBoardMetrics.cardRadius, style: .continuous)
                        .stroke(Color(hex: 0x929A4F), lineWidth: 1)
                )
                .frame(width: width, height: V2UnitOverviewBoardMetrics.cardHeight)
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
            .frame(width: width - 58, alignment: .topLeading)
            .offset(x: V2UnitOverviewBoardMetrics.textX, y: V2UnitOverviewBoardMetrics.textY)
            .zIndex(2)

            Image("V2UnitOverviewMascot")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: V2UnitOverviewBoardMetrics.mascotWidth, height: V2UnitOverviewBoardMetrics.mascotHeight)
                .offset(x: width - 117, y: V2UnitOverviewBoardMetrics.mascotY)
                .zIndex(3)
        }
        .frame(width: width, height: V2UnitOverviewBoardMetrics.stageHeight, alignment: .topLeading)
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
    static let cardHeight: CGFloat = 241
    static let cardRadius: CGFloat = 15
    static let stageHeight: CGFloat = 355
    static let textX: CGFloat = 29
    static let textY: CGFloat = 27
    static let labelBottomSpacing: CGFloat = 27
    static let bodyFont = Font.system(size: 16, weight: .regular, design: .default)
    static let lineSpacing: CGFloat = 11.2
    static let mascotY: CGFloat = 187
    static let mascotWidth: CGFloat = 153
    static let mascotHeight: CGFloat = 180
}

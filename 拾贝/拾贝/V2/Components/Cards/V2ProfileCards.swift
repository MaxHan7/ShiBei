import SwiftUI

struct V2ProfileHeaderCard: View {
    let name: String
    let bio: String
    let reviewedCount: String
    let streakDays: String

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: V2ProfileHeaderMetrics.cornerRadius, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()

            Circle()
                .fill(Color(hex: 0xEEF0C7))
                .frame(width: 78, height: 78)
                .overlay {
                    Image("V2MascotStatic")
                        .resizable()
                        .renderingMode(.original)
                        .scaledToFit()
                        .frame(width: 78)
                        .scaleEffect(0.8, anchor: .top)
                        .offset(y: 7)
                }
                .clipShape(Circle())
                .offset(x: 24, y: 16)

            Text(name)
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(V2Color.textPrimary)
                .lineLimit(1)
                .offset(x: 127, y: 29)

            Text(bio)
                .font(.system(size: 12, weight: .regular))
                .foregroundStyle(V2Color.topTitle.opacity(0.72))
                .lineLimit(1)
                .offset(x: 127, y: 64)

            HStack(spacing: 13) {
                V2ProfileStatCard(
                    title: "已复习",
                    value: reviewedCount,
                    unit: "个知识点",
                    assetName: "V2ProfileStatReviewed"
                )
                V2ProfileStatCard(
                    title: "连续学习",
                    value: streakDays,
                    unit: "天",
                    assetName: "V2ProfileStatStreak"
                )
            }
            .frame(width: V2ProfileHeaderMetrics.statGroupWidth)
            .offset(x: 24, y: 124)

            Image("V2BgDecoSmallPlantCluster")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 60)
                .opacity(0.86)
                .offset(x: 241, y: 170)
        }
        .frame(width: V2ProfileHeaderMetrics.cardWidth, height: V2ProfileHeaderMetrics.cardHeight)
    }
}

private enum V2ProfileHeaderMetrics {
    static let cardWidth: CGFloat = 321
    static let cardHeight: CGFloat = 226
    static let cornerRadius: CGFloat = 15
    static let statGroupWidth: CGFloat = cardWidth - 48
    static let statCardWidth: CGFloat = (statGroupWidth - 13) / 2
    static let statCardHeight: CGFloat = 82
}

struct V2ProfileStatCard: View {
    let title: String
    let value: String
    let unit: String
    let assetName: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(assetName)
                    .resizable()
                    .renderingMode(.original)
                    .frame(width: 32, height: 32)

                Text(title)
                    .font(V2Typography.labelRegular)
                    .foregroundStyle(V2Color.topTitle.opacity(0.72))
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
            }

            HStack(alignment: .lastTextBaseline, spacing: 5) {
                Text(value)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(V2Color.textPrimary)
                    .monospacedDigit()

                Text(unit)
                    .font(V2Typography.labelRegular)
                    .foregroundStyle(V2Color.topTitle.opacity(0.72))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .lineLimit(1)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(
            width: V2ProfileHeaderMetrics.statCardWidth,
            height: V2ProfileHeaderMetrics.statCardHeight,
            alignment: .leading
        )
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
    }
}

struct V2ProfileSettingsCard: View {
    var body: some View {
        VStack(spacing: 0) {
            V2ProfileSettingRow(title: "通知设置", assetName: "V2ProfileSettingNotification")
            V2ProfileSettingDivider()
            V2ProfileSettingRow(title: "隐私说明", assetName: "V2ProfileSettingPrivacy")
            V2ProfileSettingDivider()
            V2ProfileSettingRow(title: "账号说明", assetName: "V2ProfileSettingAccount")
        }
        .padding(.top, 10)
        .padding(.bottom, 10)
        .frame(width: 321, height: 190)
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
    }
}

private struct V2ProfileSettingDivider: View {
    var body: some View {
        Rectangle()
            .fill(Color(hex: 0xECE9DC))
            .frame(height: 1)
            .padding(.leading, 72)
            .padding(.trailing, 29)
    }
}

import SwiftUI

struct V2DiscoverChip: View {
    let title: String
    let isSelected: Bool

    var body: some View {
        Text(title)
            .font(.system(size: 12, weight: .regular))
            .foregroundStyle(isSelected ? Color(hex: 0xFEF9F2) : Color(hex: 0x5E5E5E))
            .frame(width: 61, height: 27)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(isSelected ? Color(hex: 0x929A4F) : Color(hex: 0xFEF9F2))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(V2Color.decorativeLeaf, lineWidth: 1)
                    )
                    .v2Shadow()
            )
    }
}

struct V2DiscoverFilterBar: View {
    let filters: [V2RecommendedArticleFilter]
    let selectedFilterID: String
    let onSelect: (V2RecommendedArticleFilter) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: V2DiscoverFilterBarMetrics.chipSpacing) {
                ForEach(filters) { filter in
                    Button {
                        onSelect(filter)
                    } label: {
                        V2DiscoverChip(
                            title: filter.title,
                            isSelected: selectedFilterID == filter.id
                        )
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("筛选：\(filter.title)")
                    .accessibilityAddTraits(selectedFilterID == filter.id ? .isSelected : [])
                }
            }
            .padding(.trailing, V2DiscoverFilterBarMetrics.trailingScrollComfort)
        }
        .frame(height: V2DiscoverFilterBarMetrics.height)
    }
}

private enum V2DiscoverFilterBarMetrics {
    static let height: CGFloat = 34
    static let chipSpacing: CGFloat = V2Spacing.sm + V2Spacing.xs / 2
    static let trailingScrollComfort: CGFloat = V2Spacing.md
}

struct V2DiscoverHeroCard: View {
    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .frame(width: V2DiscoverHeroCardMetrics.cardWidth, height: V2DiscoverHeroCardMetrics.cardHeight)
                .offset(y: V2DiscoverHeroCardMetrics.cardY)
                .v2Shadow()

            Image("V2DiscoverHeroWave")
                .resizable()
                .renderingMode(.original)
                .frame(width: V2DiscoverHeroCardMetrics.waveWidth, height: V2DiscoverHeroCardMetrics.waveHeight)
                .offset(x: V2DiscoverHeroCardMetrics.waveX, y: V2DiscoverHeroCardMetrics.cardY)
                .allowsHitTesting(false)

            Image("V2DiscoverHeroMascot")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: V2DiscoverHeroCardMetrics.mascotWidth, height: V2DiscoverHeroCardMetrics.mascotHeight)
                .offset(x: V2DiscoverHeroCardMetrics.mascotX, y: V2DiscoverHeroCardMetrics.mascotY)
                .allowsHitTesting(false)

            Text("发现好内容")
                .font(.system(size: 16, weight: .medium))
                .tracking(-0.64)
                .foregroundStyle(V2Color.primaryAction)
                .lineLimit(1)
                .frame(width: V2DiscoverHeroCardMetrics.titleWidth, height: V2DiscoverHeroCardMetrics.titleHeight, alignment: .leading)
                .offset(x: V2DiscoverHeroCardMetrics.textX, y: V2DiscoverHeroCardMetrics.titleY)

            Text("将知识一键变成复习路径，\n让“收藏“变成记住")
                .font(V2Typography.labelRegular)
                .tracking(-0.24)
                .foregroundStyle(V2Color.topTitle)
                .lineSpacing(5)
                .lineLimit(2)
                .frame(width: V2DiscoverHeroCardMetrics.subtitleWidth, height: V2DiscoverHeroCardMetrics.subtitleHeight, alignment: .topLeading)
                .offset(x: V2DiscoverHeroCardMetrics.textX, y: V2DiscoverHeroCardMetrics.subtitleY)
        }
        .frame(maxWidth: .infinity)
        .frame(height: V2DiscoverHeroCardMetrics.heroHeight)
    }
}

private enum V2DiscoverHeroCardMetrics {
    static let cardWidth: CGFloat = 321
    static let cardHeight: CGFloat = 82
    static let heroHeight: CGFloat = 114
    static let cardY: CGFloat = 32
    static let waveWidth: CGFloat = 329
    static let waveHeight: CGFloat = 90
    static let waveX: CGFloat = -4
    static let textX: CGFloat = 19
    static let titleY: CGFloat = 43
    static let titleWidth: CGFloat = 131
    static let titleHeight: CGFloat = 24
    static let subtitleY: CGFloat = 72
    static let subtitleWidth: CGFloat = 167
    static let subtitleHeight: CGFloat = 41
    static let mascotX: CGFloat = 195
    static let mascotY: CGFloat = -21
    static let mascotWidth: CGFloat = 113
    static let mascotHeight: CGFloat = 136
}

struct V2ArticleTagPill: View {
    let title: String

    var body: some View {
        Text(title)
            .font(V2RecommendedArticleCardMetrics.tagFont)
            .foregroundStyle(Color(hex: 0x5E5E5E))
            .frame(
                width: V2RecommendedArticleCardMetrics.tagWidth,
                height: V2RecommendedArticleCardMetrics.tagHeight
            )
            .background(
                Capsule()
                    .fill(Color(hex: 0xFEF9F2))
                    .overlay(
                        Capsule()
                            .stroke(V2Color.decorativeLeaf, lineWidth: 1)
                    )
                    .v2Shadow()
            )
    }
}

struct V2RecommendedArticleCard: View {
    let title: String
    let source: String
    let coverImageUrl: String?
    let tags: [String]
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            GeometryReader { proxy in
                let infoWidth = min(V2RecommendedArticleCardMetrics.infoWidth, max(0, proxy.size.width * 0.72))

                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: V2RecommendedArticleCardMetrics.cornerRadius, style: .continuous)
                        .fill(V2Color.surfaceCream)
                        .v2Shadow()

                    V2RecommendedArticleCoverImage(urlString: coverImageUrl)
                        .frame(width: V2RecommendedArticleCardMetrics.coverWidth, height: V2RecommendedArticleCardMetrics.cardHeight)
                        .frame(maxWidth: .infinity, alignment: .trailing)

                    RoundedRectangle(cornerRadius: V2RecommendedArticleCardMetrics.cornerRadius, style: .continuous)
                        .fill(V2Color.surfaceCream)
                        .frame(width: infoWidth, height: V2RecommendedArticleCardMetrics.cardHeight)

                    ZStack(alignment: .topLeading) {
                        Text(title)
                            .font(V2RecommendedArticleCardMetrics.titleFont)
                            .foregroundStyle(Color(hex: 0x383838))
                            .lineLimit(2)
                            .truncationMode(.tail)
                            .lineSpacing(4)
                            .frame(
                                width: V2RecommendedArticleCardMetrics.titleWidth,
                                height: V2RecommendedArticleCardMetrics.titleHeight,
                                alignment: .topLeading
                            )
                            .offset(x: V2RecommendedArticleCardMetrics.titleX, y: V2RecommendedArticleCardMetrics.titleY)

                        Text(source)
                            .font(V2RecommendedArticleCardMetrics.sourceFont)
                            .foregroundStyle(Color(hex: 0xA3A3A3))
                            .lineLimit(1)
                            .frame(
                                width: V2RecommendedArticleCardMetrics.titleWidth,
                                height: V2RecommendedArticleCardMetrics.sourceHeight,
                                alignment: .topLeading
                            )
                            .offset(x: V2RecommendedArticleCardMetrics.sourceX, y: V2RecommendedArticleCardMetrics.sourceY)

                        HStack(spacing: V2RecommendedArticleCardMetrics.tagSpacing) {
                            ForEach(tags.prefix(3), id: \.self) { tag in
                                V2ArticleTagPill(title: tag)
                            }
                        }
                        .offset(x: V2RecommendedArticleCardMetrics.tagsX, y: V2RecommendedArticleCardMetrics.tagsY)
                    }
                    .frame(width: infoWidth, height: V2RecommendedArticleCardMetrics.cardHeight, alignment: .topLeading)
                }
                .clipShape(RoundedRectangle(cornerRadius: V2RecommendedArticleCardMetrics.cornerRadius, style: .continuous))
            }
            .frame(height: V2RecommendedArticleCardMetrics.cardHeight)
        }
        .buttonStyle(.plain)
    }
}

private struct V2RecommendedArticleCoverImage: View {
    let urlString: String?

    var body: some View {
        Group {
            if let urlString,
               let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    case .failure, .empty:
                        fallbackImage
                    @unknown default:
                        fallbackImage
                    }
                }
            } else {
                fallbackImage
            }
        }
        .clipped()
    }

    private var fallbackImage: some View {
        Image("V2DiscoverArticleThumbnail")
            .resizable()
            .renderingMode(.original)
            .scaledToFill()
    }
}

private enum V2RecommendedArticleCardMetrics {
    static let cardHeight: CGFloat = 124
    static let infoWidth: CGFloat = 236
    static let coverWidth: CGFloat = 126
    static let cornerRadius: CGFloat = 15
    static let titleX: CGFloat = 24
    static let titleY: CGFloat = 16
    static let titleWidth: CGFloat = 167
    static let titleHeight: CGFloat = 42
    static let titleFont = V2Typography.bodySmallEmphasis
    static let sourceX: CGFloat = 24
    static let sourceY: CGFloat = 66
    static let sourceHeight: CGFloat = 19
    static let sourceFont = V2Typography.caption
    static let tagsX: CGFloat = 21
    static let tagsY: CGFloat = 92
    static let tagSpacing: CGFloat = 8.6
    static let tagFont = V2Typography.caption
    static let tagWidth: CGFloat = 44
    static let tagHeight: CGFloat = 20
}

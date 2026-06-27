import SwiftUI

struct V2NotesSummaryCard: View {
    let count: Int

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .frame(width: V2NotesSummaryCardMetrics.cardWidth, height: V2NotesSummaryCardMetrics.cardFillHeight)
                .offset(y: V2NotesSummaryCardMetrics.cardFillY)
                .v2Shadow()

            Image("V2NotesSummaryWave")
                .resizable()
                .renderingMode(.original)
                .frame(width: V2NotesSummaryCardMetrics.waveWidth, height: V2NotesSummaryCardMetrics.waveHeight)
                .offset(x: V2NotesSummaryCardMetrics.waveX, y: V2NotesSummaryCardMetrics.waveY)
                .allowsHitTesting(false)

            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text("已收藏 ")
                    .font(V2NotesSummaryCardMetrics.textFont)
                    .foregroundStyle(Color(hex: 0x383838))
                Text("\(count)")
                    .font(V2NotesSummaryCardMetrics.numberFont)
                    .foregroundStyle(V2Color.primaryAction)
                Text(" 个题目")
                    .font(V2NotesSummaryCardMetrics.textFont)
                    .foregroundStyle(Color(hex: 0x383838))
            }
            .tracking(-0.8)
            .frame(width: V2NotesSummaryCardMetrics.copyWidth, height: V2NotesSummaryCardMetrics.copyHeight, alignment: .leading)
            .offset(x: V2NotesSummaryCardMetrics.copyX, y: V2NotesSummaryCardMetrics.copyY)
        }
        .frame(width: V2NotesSummaryCardMetrics.cardWidth, height: V2NotesSummaryCardMetrics.componentHeight, alignment: .topLeading)
    }
}

private enum V2NotesSummaryCardMetrics {
    static let cardWidth: CGFloat = 321
    static let cardFillHeight: CGFloat = 81
    static let cardFillY: CGFloat = 1
    static let componentHeight: CGFloat = 90
    static let waveWidth: CGFloat = 329
    static let waveHeight: CGFloat = 90
    static let waveX: CGFloat = -4
    static let waveY: CGFloat = 0
    static let copyX: CGFloat = 23
    static let copyY: CGFloat = 30
    static let copyWidth: CGFloat = 131
    static let copyHeight: CGFloat = 24
    static let textFont = Font.system(size: 12, weight: .regular)
    static let numberFont = Font.system(size: 20, weight: .bold)
}

struct V2QuestionTypePill: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.system(size: 12, weight: .regular))
            .foregroundStyle(Color(hex: 0x5A5D2C))
            .frame(width: 55, height: 22)
            .background(
                Capsule()
                    .fill(Color(hex: 0xF4F2DF))
            )
    }
}

struct V2SavedQuestionCard: View {
    let title: String
    let source: String
    let type: String

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()

            Text(title)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(Color(hex: 0x383838))
                .lineLimit(1)
                .truncationMode(.tail)
                .frame(
                    width: V2SavedQuestionCardMetrics.titleWidth,
                    height: V2SavedQuestionCardMetrics.titleHeight,
                    alignment: .leading
                )
                .offset(x: V2SavedQuestionCardMetrics.titleX, y: V2SavedQuestionCardMetrics.titleY)

            Text(source)
                .font(.system(size: 11, weight: .regular))
                .foregroundStyle(Color(hex: 0x827C75))
                .lineLimit(1)
                .frame(
                    width: V2SavedQuestionCardMetrics.sourceWidth,
                    height: V2SavedQuestionCardMetrics.sourceHeight,
                    alignment: .leading
                )
                .offset(x: V2SavedQuestionCardMetrics.sourceX, y: V2SavedQuestionCardMetrics.sourceY)

            V2QuestionTypePill(title: type)
                .offset(x: V2SavedQuestionCardMetrics.typeX, y: V2SavedQuestionCardMetrics.typeY)

            Image("V2NotesBookmark")
                .resizable()
                .renderingMode(.original)
                .frame(width: 12, height: 18)
                .offset(x: V2SavedQuestionCardMetrics.bookmarkX, y: V2SavedQuestionCardMetrics.bookmarkY)
        }
        .frame(maxWidth: .infinity)
        .frame(height: V2SavedQuestionCardMetrics.cardHeight)
    }
}

private enum V2SavedQuestionCardMetrics {
    static let cardHeight: CGFloat = 136
    static let titleX: CGFloat = 18
    static let titleY: CGFloat = 8
    static let titleWidth: CGFloat = 258
    static let titleHeight: CGFloat = 51.63
    static let sourceX: CGFloat = 20
    static let sourceY: CGFloat = 55
    static let sourceWidth: CGFloat = 213
    static let sourceHeight: CGFloat = 19
    static let typeX: CGFloat = 18
    static let typeY: CGFloat = 92
    static let bookmarkX: CGFloat = 286
    static let bookmarkY: CGFloat = 25
}

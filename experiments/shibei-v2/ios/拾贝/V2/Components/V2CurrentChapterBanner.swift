import SwiftUI

struct V2CurrentChapterBanner: View {
    let chapter: V2CurrentChapterData
    let action: () -> Void

    var body: some View {
        HStack(alignment: .center, spacing: V2Spacing.md) {
            VStack(alignment: .leading, spacing: 7) {
                Text(chapter.eyebrow)
                    .font(V2Typography.label)
                    .foregroundStyle(V2Color.primary)

                Text(chapter.title)
                    .font(.system(size: 22, weight: .medium))
                    .foregroundStyle(V2Color.textSecondary)
                    .lineLimit(2)
                    .lineSpacing(5)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: V2Spacing.sm)

            Button(action: action) {
                Image("V2ChapterSourceIcon")
                    .resizable()
                    .renderingMode(.original)
                    .frame(width: 24, height: 24)
                    .padding(6)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("查看章节详情")
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 16)
        .frame(maxWidth: .infinity, minHeight: 96)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
    }
}

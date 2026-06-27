import SwiftUI

struct V2ChapterCard: View {
    let title: String
    let status: V2ChapterReviewStatus
    let source: String
    let knowledgeCount: Int
    let questionCount: Int
    let generationProgressText: String?

    init(
        title: String,
        status: V2ChapterReviewStatus,
        source: String,
        knowledgeCount: Int,
        questionCount: Int,
        generationProgressText: String? = nil
    ) {
        self.title = title
        self.status = status
        self.source = source
        self.knowledgeCount = knowledgeCount
        self.questionCount = questionCount
        self.generationProgressText = generationProgressText
    }

    private var isGenerating: Bool {
        status == .generating
    }

    private var headlineText: String {
        if isGenerating {
            return generationProgressText ?? "正在生成知识点..."
        }
        return title
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: 12) {
                V2ChapterStatusTag(status: status)
                Spacer(minLength: 12)
            }

            Text(headlineText)
                .font(V2ChapterCardMetrics.titleFont)
                .foregroundStyle(Color(hex: 0x383838))
                .lineSpacing(V2ChapterCardMetrics.titleLineSpacing)
                .lineLimit(2)
                .truncationMode(.tail)
                .frame(
                    maxWidth: .infinity,
                    minHeight: V2ChapterCardMetrics.titleBlockHeight,
                    maxHeight: V2ChapterCardMetrics.titleBlockHeight,
                    alignment: .topLeading
                )
                .padding(.top, V2ChapterCardMetrics.titleTopSpacing)

            Spacer(minLength: 0)

            HStack(alignment: .center, spacing: 6) {
                V2ChapterSourceDocumentIcon()
                    .frame(width: 20, height: 20)

                Text(source)
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(Color(hex: 0xACACAC))

                Spacer()

                if !isGenerating {
                    Text("\(knowledgeCount)个知识点  \(questionCount)道题")
                        .font(.system(size: 11, weight: .regular))
                        .foregroundStyle(Color(hex: 0xACACAC))
                }
            }
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 16)
        .frame(maxWidth: .infinity, minHeight: 136, maxHeight: 136, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
    }
}

private struct V2ChapterSourceDocumentIcon: View {
    var body: some View {
        V2ChapterSourceDocumentShape()
            .stroke(
                Color(hex: 0xACACAC),
                style: StrokeStyle(lineWidth: 1, lineCap: .round, lineJoin: .round)
            )
            .frame(width: 10, height: 12)
            .frame(width: 20, height: 20)
    }
}

private struct V2ChapterSourceDocumentShape: Shape {
    func path(in rect: CGRect) -> Path {
        let sourceWidth: CGFloat = 9.4816
        let sourceHeight: CGFloat = 11.588
        let scale = min(rect.width / sourceWidth, rect.height / sourceHeight)
        let offsetX = rect.midX - sourceWidth * scale / 2
        let offsetY = rect.midY - sourceHeight * scale / 2

        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: offsetX + x * scale, y: offsetY + y * scale)
        }

        var path = Path()
        path.move(to: p(2, 11.588))
        path.addCurve(to: p(0, 9.588), control1: p(0.8954, 11.588), control2: p(0, 10.693))
        path.addLine(to: p(0, 0))
        path.addLine(to: p(6.0952, 0))
        path.addLine(to: p(9.4814, 3.219))
        path.addLine(to: p(9.4814, 9.588))
        path.addCurve(to: p(7.4814, 11.588), control1: p(9.4814, 10.693), control2: p(8.586, 11.588))
        path.closeSubpath()

        path.move(to: p(5.2676, 0))
        path.addLine(to: p(5.2676, 4.214))
        path.addLine(to: p(9.4816, 4.214))

        path.move(to: p(2.1074, 6.32))
        path.addLine(to: p(6.3214, 6.32))

        path.move(to: p(2.1074, 9.48))
        path.addLine(to: p(6.3214, 9.48))

        return path
    }
}

private enum V2ChapterCardMetrics {
    static let titleFont = Font.system(size: 16, weight: .medium)
    static let titleLineSpacing: CGFloat = 4
    static let titleBlockHeight: CGFloat = 42
    static let titleTopSpacing: CGFloat = 12
}

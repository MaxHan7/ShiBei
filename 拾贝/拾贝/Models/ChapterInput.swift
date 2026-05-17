import Foundation

struct ChapterInput: Equatable {
    var sourceType: SourceType
    var rawText: String?
    var sourceUrl: String?
    var sourceTitle: String?

    var displayText: String {
        switch sourceType {
        case .text:
            "将作为粘贴文字生成"
        case .articleLink, .wechatArticle:
            "将作为网页文章生成"
        case .videoLink:
            "视频链接会尝试生成，失败时展示原因"
        }
    }

    var canSubmit: Bool {
        switch sourceType {
        case .text:
            (rawText ?? "").count >= 24
        case .articleLink, .wechatArticle, .videoLink:
            sourceUrl?.isEmpty == false
        }
    }

    static func parse(_ value: String) -> ChapterInput {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if let url = URL(string: trimmed),
           let scheme = url.scheme?.lowercased(),
           scheme == "http" || scheme == "https",
           let host = url.host?.lowercased(),
           !host.isEmpty {
            return ChapterInput(
                sourceType: isVideoHost(host) ? .videoLink : .articleLink,
                rawText: nil,
                sourceUrl: trimmed,
                sourceTitle: nil
            )
        }
        return ChapterInput(sourceType: .text, rawText: trimmed, sourceUrl: nil, sourceTitle: nil)
    }

    private static func isVideoHost(_ host: String) -> Bool {
        [
            "bilibili.com",
            "youtube.com",
            "youtu.be",
            "douyin.com",
            "v.douyin.com",
            "xiaohongshu.com"
        ].contains { domain in
            host == domain || host.hasSuffix(".\(domain)")
        }
    }
}

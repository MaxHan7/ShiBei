import Foundation

struct ChapterInput: Equatable {
    var sourceType: SourceType
    var rawText: String?
    var sourceUrl: String?
    var sourceTitle: String?

    var displayText: String {
        displayText(language: .zhHans)
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

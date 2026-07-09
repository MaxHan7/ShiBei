import Foundation

enum ChapterInputValidationError: Equatable {
    case invalidLinkFormat
}

struct ChapterInput: Equatable {
    var sourceType: SourceType
    var rawText: String?
    var sourceUrl: String?
    var sourceTitle: String?
    var validationError: ChapterInputValidationError? = nil

    var displayText: String {
        displayText(language: .zhHans)
    }

    var canSubmit: Bool {
        guard validationError == nil else {
            return false
        }
        switch sourceType {
        case .text:
            return (rawText ?? "").count >= 24
        case .articleLink, .wechatArticle, .videoLink:
            return sourceUrl?.isEmpty == false
        }
    }

    static func parse(_ value: String) -> ChapterInput {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if let urlString = firstHTTPURLString(in: trimmed),
           let url = URL(string: urlString),
           let scheme = url.scheme?.lowercased(),
           scheme == "http" || scheme == "https",
           let host = url.host?.lowercased(),
           !host.isEmpty {
            let sourceType: SourceType
            if isWechatArticleHost(host) {
                sourceType = .wechatArticle
            } else {
                sourceType = isVideoHost(host) || isDirectVideoFile(url) ? .videoLink : .articleLink
            }
            return ChapterInput(
                sourceType: sourceType,
                rawText: nil,
                sourceUrl: urlString,
                sourceTitle: nil,
                validationError: nil
            )
        }
        if looksLikeInvalidLink(trimmed) {
            return ChapterInput(
                sourceType: .text,
                rawText: trimmed,
                sourceUrl: nil,
                sourceTitle: nil,
                validationError: .invalidLinkFormat
            )
        }
        return ChapterInput(sourceType: .text, rawText: trimmed, sourceUrl: nil, sourceTitle: nil)
    }

    private static func firstHTTPURLString(in value: String) -> String? {
        guard let matchRange = value.range(
            of: #"https?://\S+"#,
            options: [.regularExpression, .caseInsensitive]
        ) else {
            return nil
        }

        return String(value[matchRange]).trimmingCharacters(in: trailingURLPunctuation)
    }

    private static let trailingURLPunctuation = CharacterSet(charactersIn: ".,;:!?，。；：！？)]}）】》」』\"'")

    private static func looksLikeInvalidLink(_ value: String) -> Bool {
        guard !value.isEmpty else {
            return false
        }

        let nonEmptyLines = value
            .components(separatedBy: .newlines)
            .filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        guard nonEmptyLines.count <= 1,
              value.rangeOfCharacter(from: .whitespacesAndNewlines) == nil else {
            return false
        }

        let lowercased = value.lowercased()
        if lowercased.hasPrefix("http") || lowercased.hasPrefix("www.") {
            return true
        }
        if lowercased.contains("://") {
            return true
        }

        return lowercased.range(
            of: #"^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$"#,
            options: .regularExpression
        ) != nil
    }

    private static func isVideoHost(_ host: String) -> Bool {
        [
            "bilibili.com",
            "b23.tv",
            "youtube.com",
            "m.youtube.com",
            "youtu.be",
            "youtube-nocookie.com",
            "douyin.com",
            "v.douyin.com",
            "xiaohongshu.com",
            "xhslink.com"
        ].contains { domain in
            host == domain || host.hasSuffix(".\(domain)")
        }
    }

    private static func isDirectVideoFile(_ url: URL) -> Bool {
        let path = url.path.lowercased()
        return [".mp4", ".mov", ".m4v", ".webm", ".m3u8"].contains { path.hasSuffix($0) }
    }

    private static func isWechatArticleHost(_ host: String) -> Bool {
        host == "mp.weixin.qq.com"
    }
}

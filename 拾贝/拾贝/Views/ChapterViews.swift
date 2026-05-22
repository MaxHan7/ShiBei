import SwiftUI

struct ChaptersView: View {
    @ObservedObject var store: AppStore

    var body: some View {
        AppScaffold(store: store, title: "全部章节") {
            ScrollView {
                if store.chapters.isEmpty {
                    VStack(spacing: 10) {
                        Spacer(minLength: 260)
                        Text("还没有章节")
                            .font(.system(size: 24, weight: .bold))
                        Text("点击底部 + 添加复习内容\n支持文章/视频链接或粘贴文字")
                            .font(.system(size: 15))
                            .foregroundStyle(ShiBeiTheme.muted)
                            .multilineTextAlignment(.center)
                    }
                } else {
                    VStack(spacing: 16) {
                        ForEach(store.chapters) { chapter in
                            Button {
                                store.selectChapter(chapter)
                            } label: {
                                ChapterListCard(chapter: chapter)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(24)
                    .padding(.bottom, 120)
                }
            }
        }
    }
}

private struct ChapterListCard: View {
    let chapter: Chapter

    var body: some View {
        SBCard {
            HStack(alignment: .top) {
                StatusPill(text: chapter.visibleStatusText, isDanger: chapter.status.isFailed)
                Spacer()
                VStack(alignment: .trailing, spacing: 6) {
                    if let reviewStatus = ChapterReviewDisplayStatus(chapter: chapter) {
                        ReviewStatusChip(status: reviewStatus)
                    }
                    Text(chapter.createdAt.relativeLabel)
                        .font(.system(size: 14))
                        .foregroundStyle(ShiBeiTheme.muted)
                }
            }
            Text(chapter.title)
                .font(.system(size: 16))
                .foregroundStyle(ShiBeiTheme.text)
                .lineLimit(2)
            HStack {
                Text(chapter.sourceType.label)
                Spacer()
                Text("\(chapter.knowledgePoints.count) 个知识点 · \(chapter.questions.count) 道题")
            }
            .font(.system(size: 14))
            .foregroundStyle(ShiBeiTheme.muted)
        }
    }
}

private enum ChapterReviewDisplayStatus {
    case waiting
    case inProgress
    case completed

    init?(chapter: Chapter) {
        guard chapter.status == .completed, !chapter.knowledgePoints.isEmpty, !chapter.reviewableQuestions.isEmpty else {
            return nil
        }

        if chapter.reviewSession?.status == .completed || chapter.reviewSession?.completedAt != nil {
            self = .completed
        } else if chapter.reviewSession?.status == .active
                    || chapter.masteredPoints > 0
                    || chapter.reviewSession?.attempts.isEmpty == false
                    || chapter.reviewSession?.masteredThisRoundPointIds.isEmpty == false {
            self = .inProgress
        } else {
            self = .waiting
        }
    }

    var text: String {
        switch self {
        case .waiting:
            "待复习"
        case .inProgress:
            "复习中"
        case .completed:
            "已完成"
        }
    }

    var foreground: Color {
        switch self {
        case .waiting:
            ShiBeiTheme.textSoft
        case .inProgress:
            ShiBeiTheme.primary
        case .completed:
            Color(red: 0.13, green: 0.48, blue: 0.29)
        }
    }

    var background: Color {
        switch self {
        case .waiting:
            Color(red: 0.965, green: 0.949, blue: 0.918)
        case .inProgress:
            ShiBeiTheme.yellowPale
        case .completed:
            Color(red: 0.914, green: 0.969, blue: 0.925)
        }
    }
}

private struct ReviewStatusChip: View {
    let status: ChapterReviewDisplayStatus

    var body: some View {
        Text(status.text)
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(status.foreground)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(status.background)
            .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
            .accessibilityLabel("复习状态：\(status.text)")
    }
}

struct NotificationsView: View {
    @ObservedObject var store: AppStore

    var body: some View {
        AppScaffold(store: store, title: "通知") {
            ScrollView {
                if store.visibleNotifications.isEmpty {
                    VStack {
                        Spacer(minLength: 280)
                        Text("暂时没有通知")
                            .font(.system(size: 24, weight: .bold))
                    }
                } else {
                    VStack(spacing: 14) {
                        if store.visibleNotifications.contains(where: \.read) {
                            HStack {
                                Spacer()
                                Button {
                                    Task {
                                        await store.clearReadNotifications()
                                    }
                                } label: {
                                    Label("清空已读", systemImage: "checkmark.circle")
                                        .font(.system(size: 14, weight: .semibold))
                                }
                                .foregroundStyle(ShiBeiTheme.primary)
                            }
                        }
                        ForEach(store.visibleNotifications) { notification in
                            Button {
                                Task {
                                    await store.openNotification(notification)
                                }
                            } label: {
                                SBCard {
                                    HStack(spacing: 8) {
                                        if !notification.read {
                                            Circle()
                                                .fill(ShiBeiTheme.yellow)
                                                .frame(width: 8, height: 8)
                                                .accessibilityHidden(true)
                                        }
                                        StatusPill(text: notification.title, isDanger: notification.type == .generationFailed)
                                        Spacer()
                                        if notification.read {
                                            Text("已读")
                                                .font(.system(size: 12, weight: .semibold))
                                                .foregroundStyle(ShiBeiTheme.muted.opacity(0.72))
                                        }
                                    }
                                    Text(store.chapters.first(where: { $0.id == notification.chapterId })?.title ?? notification.body)
                                        .font(.system(size: 16, weight: notification.read ? .regular : .semibold))
                                        .foregroundStyle(notification.read ? ShiBeiTheme.muted : ShiBeiTheme.text)
                                    Text(notification.body)
                                        .font(.system(size: 14))
                                        .foregroundStyle(ShiBeiTheme.muted)
                                }
                            }
                            .buttonStyle(.plain)
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    Task {
                                        await store.dismissNotification(notification)
                                    }
                                } label: {
                                    Label("移除", systemImage: "trash")
                                }
                            }
                        }
                    }
                    .padding(24)
                    .padding(.bottom, 120)
                }
            }
        }
    }
}

struct ChapterDetailView: View {
    @ObservedObject var store: AppStore

    var body: some View {
        AppScaffold(
            store: store,
            title: "章节详情",
            leadingAction: { store.returnFromChapterDetail() },
            trailing: {
                Button("删除") {
                    store.showingDeleteConfirmation = true
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(ShiBeiTheme.text)
            }
        ) {
            if let chapter = store.selectedChapter {
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        Text(chapter.title)
                            .font(.system(size: 25, weight: .bold))
                            .lineSpacing(2)
                        sourceLines(for: chapter)
                        Text("\(chapter.knowledgePoints.count) 个知识点 · \(chapter.questions.count) 道题")
                            .foregroundStyle(ShiBeiTheme.muted)
                        Text("状态：\(chapter.visibleStatusText)")
                            .foregroundStyle(ShiBeiTheme.muted)

                        ArticleCoreCard(chapter: chapter)

                        if chapter.status.isFailed {
                            FailedChapterCard(store: store, chapter: chapter)
                        } else if chapter.status.isProcessing {
                            ProcessingCard(store: store, chapter: chapter)
                        } else {
                            PrimaryButton(title: "开始复习") {
                                Task {
                                    await store.startOrResumeReview(for: chapter)
                                }
                            }
                        }

                        VStack(alignment: .leading, spacing: 12) {
                            Text("本章知识点")
                                .font(.system(size: 18, weight: .bold))
                            ForEach(Array(chapter.knowledgePoints.prefix(6).enumerated()), id: \.element.id) { index, point in
                                KnowledgePointRow(index: index, point: point)
                            }
                            if chapter.knowledgePoints.count > 6 {
                                Button("查看全部 \(chapter.knowledgePoints.count) 个") {
                                    store.route = .knowledgeList
                                }
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(ShiBeiTheme.primary)
                                .frame(maxWidth: .infinity)
                            }
                        }
                        .padding(.top, 12)
                    }
                    .padding(24)
                    .padding(.bottom, 120)
                }
            }
        }
        .task(id: store.selectedChapterId) {
            await store.refreshSelectedChapterFromAPI()
        }
    }

    @ViewBuilder
    private func sourceLines(for chapter: Chapter) -> some View {
        HStack {
            Image(systemName: "doc.text")
            Text("来源：\(chapter.sourceType.label)")
        }
        .font(.system(size: 14))
        .foregroundStyle(ShiBeiTheme.muted)

        if !chapter.source.accountOrDomain.isEmpty {
            HStack {
                Image(systemName: "person.text.rectangle")
                Text(chapter.source.accountOrDomain)
            }
            .font(.system(size: 14))
            .foregroundStyle(ShiBeiTheme.muted)
        }

        Button {
            store.openSource(returnTo: .chapterDetail)
        } label: {
            HStack {
                Image(systemName: "link")
                Text(chapter.source.url.isEmpty ? "查看输入内容" : "查看提取正文和原链接")
            }
            .font(.system(size: 14))
            .foregroundStyle(ShiBeiTheme.primary)
        }
    }
}

private struct FailedChapterCard: View {
    @ObservedObject var store: AppStore
    let chapter: Chapter

    var body: some View {
        SBCard {
            VStack(spacing: 12) {
                Image(systemName: "exclamationmark")
                    .font(.system(size: 28, weight: .bold))
                    .frame(width: 56, height: 56)
                    .background(ShiBeiTheme.yellow)
                    .clipShape(Circle())
                Text(chapter.visibleStatusText)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(ShiBeiTheme.error)
                Text(chapter.failureReason)
                    .font(.system(size: 15))
                    .foregroundStyle(ShiBeiTheme.muted)
                    .multilineTextAlignment(.center)
                PrimaryButton(
                    title: store.isWritingChapter ? "正在提交" : chapter.status == .failedExtractVideo || chapter.status == .failedExtractArticle ? "重试" : "重新生成",
                    disabled: store.isWritingChapter
                ) {
                    Task {
                        await store.regenerateSelectedChapter()
                    }
                }
                if !chapter.knowledgePoints.isEmpty {
                    SecondaryButton(title: "查看全部 \(chapter.knowledgePoints.count) 个知识点") {
                        store.route = .knowledgeList
                    }
                }
                Button("不再提示") {
                    Task {
                        await store.dismissFailureNotification()
                    }
                }
                .font(.system(size: 14))
                .foregroundStyle(ShiBeiTheme.muted)
            }
            .frame(maxWidth: .infinity)
        }
    }
}

private struct ProcessingCard: View {
    @ObservedObject var store: AppStore
    let chapter: Chapter

    var body: some View {
        SBCard {
            VStack(spacing: 14) {
                ProgressView()
                    .tint(ShiBeiTheme.primary)
                Text(chapter.visibleStatusText)
                    .font(.system(size: 18, weight: .bold))
                SecondaryButton(title: "刷新状态", systemImage: "arrow.clockwise") {
                    Task {
                        await store.refreshSelectedChapterFromAPI()
                    }
                }
            }
            .frame(maxWidth: .infinity)
        }
        .task(id: chapter.id) {
            await store.refreshSelectedChapterUntilResolved()
        }
    }
}

struct KnowledgeListView: View {
    @ObservedObject var store: AppStore

    var body: some View {
        AppScaffold(store: store, title: "本章知识点", leadingAction: { store.route = .chapterDetail }) {
            ScrollView {
                if let chapter = store.selectedChapter {
                    VStack(spacing: 12) {
                        ForEach(Array(chapter.knowledgePoints.enumerated()), id: \.element.id) { index, point in
                            KnowledgePointRow(index: index, point: point, showsSummary: true)
                        }
                    }
                    .padding(24)
                    .padding(.bottom, 120)
                }
            }
        }
    }
}

struct SourceView: View {
    @ObservedObject var store: AppStore

    var body: some View {
        AppScaffold(store: store, title: "来源内容", leadingAction: { store.returnFromSource() }) {
            ScrollViewReader { proxy in
                ScrollView {
                if let chapter = store.selectedChapter {
                    let sourceText = chapter.sourceText.isEmpty ? chapter.source.extractedText : chapter.sourceText
                    let sourceBlocks = SourceTextBlock.makeBlocks(from: sourceText)
                    let focusedBlockId = SourceTextBlock.bestMatch(in: sourceBlocks, focusText: store.sourceFocusText)
                    VStack(spacing: 18) {
                        SBCard {
                            StatusPill(text: chapter.sourceType.label)
                            Text(chapter.source.title)
                                .font(.system(size: 16))
                            if !chapter.source.accountOrDomain.isEmpty {
                                Text("来源：\(chapter.source.accountOrDomain)")
                                    .foregroundStyle(ShiBeiTheme.muted)
                            }
                            if !chapter.source.url.isEmpty {
                                Text(chapter.source.url)
                                    .font(.system(size: 14))
                                    .foregroundStyle(ShiBeiTheme.muted)
                                Link("打开原文链接", destination: URL(string: chapter.source.url) ?? URL(string: "https://example.com")!)
                                    .font(.system(size: 16, weight: .medium))
                                    .frame(maxWidth: .infinity, minHeight: 56)
                                    .foregroundStyle(.white)
                                    .background(ShiBeiTheme.primary)
                                    .clipShape(RoundedRectangle(cornerRadius: ShiBeiTheme.radius, style: .continuous))
                            }
                        }
                        SBCard {
                            VStack(alignment: .leading, spacing: 14) {
                                ForEach(sourceBlocks) { block in
                                    SourceTextBlockView(block: block, isFocused: block.id == focusedBlockId)
                                        .id(block.id)
                                }
                            }
                        }
                    }
                    .padding(24)
                    .padding(.bottom, 120)
                    .task(id: focusedBlockId) {
                        guard let focusedBlockId else { return }
                        try? await Task.sleep(for: .milliseconds(180))
                        withAnimation(.easeInOut(duration: 0.28)) {
                            proxy.scrollTo(focusedBlockId, anchor: .center)
                        }
                    }
                }
                }
            }
        }
    }
}

private struct SourceTextBlock: Identifiable, Hashable {
    let id: String
    let text: String

    static func makeBlocks(from sourceText: String) -> [SourceTextBlock] {
        let paragraphs = sourceText
            .components(separatedBy: CharacterSet.newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        let sourceBlocks = (paragraphs.isEmpty ? [sourceText.trimmingCharacters(in: .whitespacesAndNewlines)] : paragraphs)
            .flatMap { splitLongBlock($0) }
        return sourceBlocks.enumerated().map { index, text in
            SourceTextBlock(id: "source-block-\(index)", text: text)
        }
    }

    private static func splitLongBlock(_ text: String) -> [String] {
        guard text.count > 700 else { return [text] }
        let sentences = text
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .matches(of: /[^。！？!?；;]+[。！？!?；;]?/)
            .map { String($0.output).trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        guard !sentences.isEmpty else { return [text] }

        var blocks: [String] = []
        var current = ""
        for sentence in sentences {
            let next = current + sentence
            if next.count > 520, !current.isEmpty {
                blocks.append(current)
                current = sentence
            } else {
                current = next
            }
        }
        if !current.isEmpty {
            blocks.append(current)
        }
        return blocks
    }

    static func bestMatch(in blocks: [SourceTextBlock], focusText: String?) -> String? {
        guard let focusText = focusText?.trimmingCharacters(in: .whitespacesAndNewlines), !focusText.isEmpty else { return nil }
        let normalizedFocus = normalized(focusText)
        if normalizedFocus.isEmpty { return nil }

        if let exact = blocks.first(where: { normalized($0.text).contains(normalizedFocus) || normalizedFocus.contains(normalized($0.text)) }) {
            return exact.id
        }

        let focusKeywords = keywords(from: focusText)
        guard !focusKeywords.isEmpty else { return nil }
        let scored = blocks.map { block in
            let normalizedBlock = normalized(block.text)
            let score = focusKeywords.reduce(0) { partial, keyword in
                partial + (normalizedBlock.contains(keyword) ? 1 : 0)
            }
            return (block: block, score: score)
        }
        guard let best = scored.max(by: { $0.score < $1.score }), best.score >= max(2, min(5, focusKeywords.count / 5)) else {
            return nil
        }
        return best.block.id
    }

    private static func normalized(_ text: String) -> String {
        text.replacingOccurrences(of: "\\s+", with: "", options: .regularExpression)
    }

    private static func keywords(from text: String) -> [String] {
        let cleaned = text.replacingOccurrences(of: "[，。！？；：、,.!?;:()\\[\\]{}\"'“”‘’|/\\\\-]", with: " ", options: .regularExpression)
        let parts = cleaned.components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }
        var terms: [String] = parts.filter { $0.range(of: "[A-Za-z0-9]", options: .regularExpression) != nil && $0.count >= 3 }
        for part in parts where part.range(of: "[\\u4e00-\\u9fff]", options: .regularExpression) != nil {
            let chars = part.filter { String($0).range(of: "[\\u4e00-\\u9fff]", options: .regularExpression) != nil }
            let array = Array(chars)
            guard array.count >= 2 else { continue }
            for index in 0..<(array.count - 1) {
                terms.append(String(array[index...index + 1]))
            }
            if array.count >= 3 {
                for index in 0..<(array.count - 2) {
                    terms.append(String(array[index...index + 2]))
                }
            }
        }
        return Array(Set(terms)).prefix(80).map(\.self)
    }
}

private struct SourceTextBlockView: View {
    let block: SourceTextBlock
    let isFocused: Bool

    var body: some View {
        Text(block.text)
            .font(.system(size: 15))
            .foregroundStyle(ShiBeiTheme.muted)
            .lineSpacing(5)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(isFocused ? 12 : 0)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(isFocused ? Color(red: 1, green: 0.961, blue: 0.843) : .clear)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(isFocused ? ShiBeiTheme.yellow.opacity(0.8) : .clear, lineWidth: 1)
            )
    }
}

extension String {
    var relativeLabel: String {
        guard let date = ISO8601DateFormatter().date(from: self) else { return "" }
        let interval = Date().timeIntervalSince(date)
        if interval < 60 { return "刚刚" }
        if interval < 3600 { return "\(Int(interval / 60)) 分钟前" }
        if interval < 86400 { return "\(Int(interval / 3600)) 小时前" }
        return "\(Int(interval / 86400)) 天前"
    }
}

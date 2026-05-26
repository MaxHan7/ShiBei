import SwiftUI

struct ChaptersView: View {
    @ObservedObject var store: AppStore

    var body: some View {
        AppScaffold(store: store, title: "", showsTopBar: false) {
            VStack(spacing: 0) {
                ChapterSectionTabs(store: store)
                TabView(selection: sectionSelection) {
                    ChapterListContent(store: store)
                        .tag(ChapterSection.chapters)
                    FavoriteQuestionsContent(store: store)
                        .tag(ChapterSection.favorites)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .animation(.easeInOut(duration: 0.18), value: store.chapterSection)
        }
    }

    private var sectionSelection: Binding<ChapterSection> {
        Binding {
            store.chapterSection
        } set: { section in
            store.chapterSection = section
        }
    }
}

private struct ChapterSectionTabs: View {
    @ObservedObject var store: AppStore

    var body: some View {
        HStack(spacing: 34) {
            sectionButton(.chapters, title: store.localized("chapters.title"))
            sectionButton(.favorites, title: store.localized("favorites.title"))
        }
        .frame(maxWidth: .infinity)
        .frame(height: 64)
        .background(ShiBeiTheme.surface.opacity(0.94))
    }

    private func sectionButton(_ section: ChapterSection, title: String) -> some View {
        let isSelected = store.chapterSection == section
        return Button {
            store.chapterSection = section
        } label: {
            VStack(spacing: 6) {
                Text(title)
                    .font(.system(size: 20, weight: isSelected ? .bold : .semibold))
                    .foregroundStyle(isSelected ? ShiBeiTheme.text : ShiBeiTheme.faint)
                Capsule()
                    .fill(isSelected ? ShiBeiTheme.text : Color.clear)
                    .frame(width: 22, height: 3)
            }
            .frame(width: 110, height: 44)
        }
        .buttonStyle(.plain)
    }
}

private struct ChapterListContent: View {
    @ObservedObject var store: AppStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if store.chapters.isEmpty {
                    VStack(spacing: 10) {
                        Spacer(minLength: 120)
                        Text(store.localized("chapters.empty.title"))
                            .font(.system(size: 24, weight: .bold))
                        Text(store.localized("home.empty.subtitle"))
                            .font(.system(size: 15))
                            .foregroundStyle(ShiBeiTheme.muted)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                } else {
                    ForEach(store.chapters) { chapter in
                        Button {
                            store.chapterSection = .chapters
                            store.selectChapter(chapter)
                        } label: {
                            ChapterListCard(chapter: chapter, language: store.appLanguage)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 10)
            .padding(.bottom, 120)
        }
    }
}

private struct FavoriteQuestionsContent: View {
    @ObservedObject var store: AppStore

    var body: some View {
        VStack(spacing: 0) {
            if store.favoriteKnowledgePointDisplayItems.isEmpty {
                Text(store.localized("favorites.empty_title"))
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(ShiBeiTheme.muted)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 10) {
                        ForEach(store.favoriteKnowledgePointDisplayItems) { item in
                            Button {
                                store.startFavoriteReview(records: item.records)
                            } label: {
                                FavoriteKnowledgePointPreviewCard(item: item, language: store.appLanguage)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 10)
                    .padding(.bottom, 120)
                }
            }
        }
    }
}

private struct ChapterListCard: View {
    let chapter: Chapter
    let language: AppLanguage

    var body: some View {
        SBCard {
            HStack(alignment: .top) {
                if chapter.status.isProcessing {
                    StatusPill(text: chapter.visibleStatusText(language: language), isDanger: false)
                } else if chapter.status.isFailed {
                    StatusPill(text: L10n.string("home.status.failed", language: language), isDanger: true)
                } else if let reviewStatus = ChapterReviewDisplayStatus(chapter: chapter) {
                    ReviewStatusChip(status: reviewStatus, language: language)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 6) {
                    Text(chapter.createdAt.relativeLabel(language: language))
                        .font(.system(size: 14))
                        .foregroundStyle(ShiBeiTheme.muted)
                }
            }
            Text(chapter.title)
                .font(.system(size: 16))
                .foregroundStyle(ShiBeiTheme.text)
                .lineLimit(2)
            HStack {
                Text(chapter.sourceType.label(language: language))
                Spacer()
                Text(L10n.format("chapter.counts", language: language, chapter.knowledgePoints.count, chapter.questions.count))
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

        if chapter.hasCompletedReviewOnce {
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

    func text(language: AppLanguage) -> String {
        switch self {
        case .waiting:
            L10n.string("review_status.waiting", language: language)
        case .inProgress:
            L10n.string("review_status.in_progress", language: language)
        case .completed:
            L10n.string("review_status.completed", language: language)
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
    let language: AppLanguage

    var body: some View {
        Text(status.text(language: language))
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(status.foreground)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(status.background)
            .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
            .accessibilityLabel(L10n.format("review_status.accessibility", language: language, status.text(language: language)))
    }
}

struct NotificationsView: View {
    @ObservedObject var store: AppStore

    var body: some View {
        AppScaffold(store: store, title: store.localized("notifications.title")) {
            ScrollView {
                if store.visibleNotifications.isEmpty {
                    VStack {
                        Spacer(minLength: 280)
                        Text(store.localized("notifications.empty"))
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
                                    Label(store.localized("notifications.clear_read"), systemImage: "checkmark.circle")
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
                                            Text(store.localized("notifications.read"))
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
                                    Label(store.localized("global.remove"), systemImage: "trash")
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

struct FavoriteQuestionsView: View {
    @ObservedObject var store: AppStore

    var body: some View {
        AppScaffold(
            store: store,
            title: store.localized("favorites.title"),
            leadingAction: { store.returnFromChapterDetail() }
        ) {
            FavoriteQuestionsContent(store: store)
        }
    }
}

private struct FavoriteKnowledgePointPreviewCard: View {
    let item: FavoriteKnowledgePointDisplayItem
    let language: AppLanguage

    var body: some View {
        SBCard(padding: 18) {
            HStack(alignment: .top, spacing: 12) {
                Circle()
                    .fill(ShiBeiTheme.yellow)
                    .frame(width: 6, height: 6)
                    .padding(.top, 7)

                VStack(alignment: .leading, spacing: 7) {
                    Text(item.pointTitle)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(ShiBeiTheme.text)
                        .lineSpacing(3)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Text(String(
                        format: L10n.string("favorites.card_subtitle", language: language),
                        locale: Locale(identifier: language.localeIdentifier),
                        item.questionCount
                    ))
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(ShiBeiTheme.muted)
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(ShiBeiTheme.faint)
            }
        }
    }
}

struct ChapterDetailView: View {
    @ObservedObject var store: AppStore

    var body: some View {
        AppScaffold(
            store: store,
            title: store.localized("chapter_detail.title"),
            leadingAction: { store.returnFromChapterDetail() },
            trailing: {
                Button(store.localized("global.delete")) {
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
                            .multilineTextAlignment(.leading)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .fixedSize(horizontal: false, vertical: true)
                        sourceLines(for: chapter)
                        Text(store.localizedFormat("chapter.counts", chapter.knowledgePoints.count, chapter.questions.count))
                            .foregroundStyle(ShiBeiTheme.muted)
                        if chapter.status.isProcessing || chapter.status.isFailed {
                            Text(store.localizedFormat("chapter.status_line", chapter.visibleStatusText(language: store.appLanguage)))
                                .foregroundStyle(ShiBeiTheme.muted)
                        }

                        ArticleCoreCard(chapter: chapter, language: store.appLanguage)

                        if chapter.status.isFailed {
                            FailedChapterCard(store: store, chapter: chapter)
                        } else if chapter.status.isProcessing {
                            ProcessingCard(store: store, chapter: chapter)
                        } else {
                            PrimaryButton(title: store.reviewPrimaryActionTitle(for: chapter)) {
                                Task {
                                    await store.startOrResumeReview(for: chapter)
                                }
                            }
                        }

                        VStack(alignment: .leading, spacing: 12) {
                            Text(store.localized("chapter.knowledge_points"))
                                .font(.system(size: 18, weight: .bold))
                                .frame(maxWidth: .infinity, alignment: .leading)
                            ForEach(Array(chapter.knowledgePoints.prefix(6).enumerated()), id: \.element.id) { index, point in
                                KnowledgePointRow(index: index, point: point)
                            }
                            if !chapter.knowledgePoints.isEmpty {
                                Button(store.localizedFormat("chapter.view_all_points", chapter.knowledgePoints.count)) {
                                    store.openKnowledgeList(returnTo: .chapterDetail)
                                }
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(ShiBeiTheme.primary)
                                .frame(maxWidth: .infinity)
                            }
                        }
                        .padding(.top, 12)
                        .frame(maxWidth: .infinity, alignment: .leading)
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
            Text(store.localizedFormat("chapter.source_line", chapter.sourceType.label(language: store.appLanguage)))
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
                Text(chapter.source.url.isEmpty ? store.localized("chapter.view_input") : store.localized("chapter.view_extracted_source"))
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
                Text(chapter.visibleStatusText(language: store.appLanguage))
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(ShiBeiTheme.error)
                Text(chapter.failureReason)
                    .font(.system(size: 15))
                    .foregroundStyle(ShiBeiTheme.muted)
                    .multilineTextAlignment(.center)
                PrimaryButton(
                    title: store.isWritingChapter ? store.localized("global.submitting") : chapter.status == .failedExtractVideo || chapter.status == .failedExtractArticle ? store.localized("global.retry") : store.localized("chapter.regenerate"),
                    disabled: store.isWritingChapter
                ) {
                    Task {
                        await store.regenerateSelectedChapter()
                    }
                }
                if !chapter.knowledgePoints.isEmpty {
                    SecondaryButton(title: store.localizedFormat("chapter.view_all_knowledge_points", chapter.knowledgePoints.count)) {
                        store.openKnowledgeList(returnTo: .chapterDetail)
                    }
                }
                Button(store.localized("notifications.dismiss_hint")) {
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
                Text(chapter.visibleStatusText(language: store.appLanguage))
                    .font(.system(size: 18, weight: .bold))
                SecondaryButton(title: store.localized("chapter.refresh_status"), systemImage: "arrow.clockwise") {
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
        AppScaffold(store: store, title: store.localized("chapter.knowledge_points"), leadingAction: { store.returnFromKnowledgeList() }) {
            ScrollView {
                if let chapter = store.selectedChapter {
                    VStack(spacing: 12) {
                        ForEach(Array(chapter.knowledgePoints.enumerated()), id: \.element.id) { index, point in
                            KnowledgePointRow(index: index, point: point, showsSummary: true)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
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
        AppScaffold(store: store, title: store.localized("source.title"), leadingAction: { store.returnFromSource() }) {
            ScrollViewReader { proxy in
                ScrollView {
                if let chapter = store.selectedChapter {
                    let sourceText = chapter.sourceText.isEmpty ? chapter.source.extractedText : chapter.sourceText
                    let sourceBlocks = SourceTextBlock.makeBlocks(from: sourceText)
                    let focusedBlockId = SourceTextBlock.bestMatch(in: sourceBlocks, focusText: store.sourceFocusText)
                    VStack(spacing: 18) {
                        SBCard {
                            StatusPill(text: chapter.sourceType.label(language: store.appLanguage))
                            Text(chapter.source.title)
                                .font(.system(size: 16))
                            if !chapter.source.accountOrDomain.isEmpty {
                                Text(store.localizedFormat("chapter.source_line", chapter.source.accountOrDomain))
                                    .foregroundStyle(ShiBeiTheme.muted)
                            }
                            if !chapter.source.url.isEmpty {
                                Text(chapter.source.url)
                                    .font(.system(size: 14))
                                    .foregroundStyle(ShiBeiTheme.muted)
                                Link(store.localized("source.open_original"), destination: URL(string: chapter.source.url) ?? URL(string: "https://example.com")!)
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
        relativeLabel(language: .zhHans)
    }

    func relativeLabel(language: AppLanguage) -> String {
        guard let date = ISO8601DateFormatter().date(from: self) else { return "" }
        let interval = Date().timeIntervalSince(date)
        if interval < 60 { return L10n.string("time.just_now", language: language) }
        if interval < 3600 { return L10n.format("time.minutes_ago", language: language, Int(interval / 60)) }
        if interval < 86400 { return L10n.format("time.hours_ago", language: language, Int(interval / 3600)) }
        return L10n.format("time.days_ago", language: language, Int(interval / 86400))
    }
}

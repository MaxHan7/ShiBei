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
            HStack {
                StatusPill(text: chapter.visibleStatusText, isDanger: chapter.status.isFailed)
                Spacer()
                Text(chapter.createdAt.relativeLabel)
                    .font(.system(size: 14))
                    .foregroundStyle(ShiBeiTheme.muted)
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
                    VStack(spacing: 16) {
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
                                    }
                                    Text(store.chapters.first(where: { $0.id == notification.chapterId })?.title ?? notification.body)
                                        .font(.system(size: 16, weight: notification.read ? .regular : .semibold))
                                        .foregroundStyle(ShiBeiTheme.text)
                                    Text(notification.body)
                                        .font(.system(size: 14))
                                        .foregroundStyle(ShiBeiTheme.muted)
                                }
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

struct ChapterDetailView: View {
    @ObservedObject var store: AppStore

    var body: some View {
        AppScaffold(
            store: store,
            title: "章节详情",
            leadingAction: { store.route = .chapters },
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

                        if chapter.status.isFailed {
                            FailedChapterCard(store: store, chapter: chapter)
                        } else if chapter.status.isProcessing {
                            ProcessingCard(chapter: chapter)
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
            store.route = .source
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
    let chapter: Chapter

    var body: some View {
        SBCard {
            VStack(spacing: 14) {
                ProgressView()
                    .tint(ShiBeiTheme.primary)
                Text(chapter.visibleStatusText)
                    .font(.system(size: 18, weight: .bold))
            }
            .frame(maxWidth: .infinity)
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
        AppScaffold(store: store, title: "来源内容", leadingAction: { store.route = .chapterDetail }) {
            ScrollView {
                if let chapter = store.selectedChapter {
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
                            Text(chapter.sourceText.isEmpty ? chapter.source.extractedText : chapter.sourceText)
                                .font(.system(size: 15))
                                .foregroundStyle(ShiBeiTheme.muted)
                                .lineSpacing(5)
                        }
                    }
                    .padding(24)
                    .padding(.bottom, 120)
                }
            }
        }
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

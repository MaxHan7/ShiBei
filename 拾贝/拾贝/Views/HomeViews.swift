import SwiftUI
import UIKit

struct HomeView: View {
    @ObservedObject var store: AppStore

    var body: some View {
        AppScaffold(store: store, title: "首页") {
            if let chapter = store.activeHomeChapter {
                HomeChapterContent(store: store, chapter: chapter)
            } else {
                EmptyHomeContent()
            }
        }
        .task(id: store.activeHomeChapter?.id) {
            await store.refreshActiveHomeChapterFromAPI()
        }
    }
}

private struct EmptyHomeContent: View {
    var body: some View {
        VStack(spacing: 10) {
            Spacer()
            Text("每天捡起一枚知识贝壳")
                .font(.system(size: 24, weight: .bold))
            Text("点击底部 + 添加复习内容\n支持文章/视频链接或粘贴文字")
                .font(.system(size: 15))
                .foregroundStyle(ShiBeiTheme.muted)
                .multilineTextAlignment(.center)
                .lineSpacing(5)
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 80)
    }
}

private struct HomeChapterContent: View {
    @ObservedObject var store: AppStore
    let chapter: Chapter

    private var progress: Int {
        chapter.reviewSession.map { session in
            chapter.knowledgePoints.map(\.id).filter { session.masteredThisRoundPointIds.contains($0) }.count
        } ?? chapter.masteredPoints
    }

    private var total: Int {
        max(1, chapter.knowledgePoints.count)
    }

    private var isReviewCompleted: Bool {
        chapter.reviewSession?.status == .completed
    }

    private var statusText: String {
        if chapter.status.isFailed {
            return "生成失败"
        }
        if chapter.status.isProcessing {
            return chapter.visibleStatusText
        }
        if isReviewCompleted {
            return "本章已完成"
        }
        return "当前章节"
    }

    private var primaryButtonTitle: String {
        if chapter.status.isFailed || chapter.status.isProcessing {
            return "查看章节"
        }
        if isReviewCompleted {
            return "查看总结"
        }
        if chapter.reviewSession?.status == .active {
            return "继续复习"
        }
        return "开始复习"
    }

    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: 4) {
                Text("已掌握知识点")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(ShiBeiTheme.textSoft)
                Text("\(store.reviewedKnowledgePointCount)")
                    .font(.system(size: 80, weight: .black))
                    .tracking(-4)
                    .foregroundStyle(ShiBeiTheme.primary)
            }
            .padding(.top, 58)
            .padding(.bottom, 32)

            VStack(spacing: 32) {
                SBCard {
                    StatusPill(text: statusText, isDanger: chapter.status.isFailed)
                    Text(chapter.title)
                        .font(.system(size: 16))
                        .lineLimit(2)
                    VStack(spacing: 8) {
                        HStack {
                            Text("已复习 \(progress)/\(total) 个知识点")
                                .foregroundStyle(ShiBeiTheme.muted)
                            Spacer()
                            Text("\(Int((Double(progress) / Double(total)) * 100))%")
                                .font(.system(size: 16, weight: .bold))
                        }
                        ProgressBar(progress: Double(progress) / Double(total))
                    }
                }

                PrimaryButton(
                    title: primaryButtonTitle,
                    systemImage: "arrow.right"
                ) {
                    if chapter.status.isFailed || chapter.status.isProcessing {
                        store.selectChapter(chapter, returnTo: .home)
                    } else if isReviewCompleted {
                        store.showCompletedSummary(for: chapter)
                    } else {
                        Task {
                            await store.startOrResumeReview(for: chapter)
                        }
                    }
                }
            }
            .padding(.horizontal, 24)
            Spacer()
        }
    }
}

struct AddKnowledgeView: View {
    @ObservedObject var store: AppStore
    @State private var input = ""
    @FocusState private var isInputFocused: Bool

    private var chapterInput: ChapterInput {
        ChapterInput.parse(input)
    }

    private func dismissInput() {
        isInputFocused = false
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }

    var body: some View {
        AppScaffold(store: store, title: "添加知识") {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("在此处粘贴您想学习的内容。")
                        .font(.system(size: 15))
                        .foregroundStyle(ShiBeiTheme.muted)

                    SBCard {
                        HStack(spacing: 12) {
                            Image(systemName: "pencil")
                                .frame(width: 34, height: 34)
                                .background(ShiBeiTheme.yellowPale)
                                .clipShape(Circle())
                            Text("输入内容")
                                .font(.system(size: 17, weight: .semibold))
                        }
                        TextEditor(text: $input)
                            .focused($isInputFocused)
                            .onTapGesture {
                                isInputFocused = true
                            }
                            .frame(minHeight: 210)
                            .scrollContentBackground(.hidden)
                            .overlay(alignment: .topLeading) {
                                if input.isEmpty {
                                    Text("粘贴文字 / 文章链接 / 视频链接...")
                                        .foregroundStyle(ShiBeiTheme.faint)
                                        .padding(.top, 8)
                                        .padding(.leading, 5)
                                }
                            }
                        Divider().background(ShiBeiTheme.lineSoft)
                        HStack {
                            Image(systemName: "link")
                            Image(systemName: "square.and.arrow.up")
                            Spacer()
                            Text("\(input.count)/5000")
                                .foregroundStyle(ShiBeiTheme.faint)
                        }
                        if !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            HStack(spacing: 6) {
                                Image(systemName: chapterInput.sourceType == .text ? "doc.text" : "link")
                                Text(chapterInput.displayText)
                            }
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(ShiBeiTheme.textSoft)
                        }
                    }

                    PrimaryButton(
                        title: store.isWritingChapter ? "正在生成" : "开始生成",
                        systemImage: store.isWritingChapter ? "hourglass" : "sparkle",
                        disabled: !chapterInput.canSubmit || store.isWritingChapter
                    ) {
                        let submittedInput = input
                        print("[ShiBei] AddKnowledgeView tapped generate. inputCount=\(submittedInput.count), canSubmit=\(chapterInput.canSubmit), target=\(store.submissionTargetTitle)")
                        dismissInput()
                        Task {
                            if await store.createChapter(from: submittedInput) {
                                input = ""
                            }
                        }
                    }

                    if !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !chapterInput.canSubmit {
                        Text("正文至少需要 24 个字；链接需要以 http:// 或 https:// 开头。")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(ShiBeiTheme.error)
                            .frame(maxWidth: .infinity, alignment: .center)
                    }

                    HStack(spacing: 6) {
                        Image(systemName: store.submissionTargetTitle == AppDataMode.cloudAPI.title ? "cloud" : "shippingbox")
                        Text("提交到：\(store.submissionTargetTitle)")
                    }
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(ShiBeiTheme.textSoft)
                    .frame(maxWidth: .infinity)

                    Text(store.dataSourceMessage)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(store.dataSourceMessage.contains("失败") || store.dataSourceMessage.contains("请先") ? ShiBeiTheme.error : ShiBeiTheme.muted)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)

                    HStack(spacing: 6) {
                        Image(systemName: "lock.square")
                        Text("内容仅用于生成复习，不会公开")
                    }
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(ShiBeiTheme.textSoft)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(ShiBeiTheme.yellowPale)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .frame(maxWidth: .infinity)

                    Button("填入示例内容") {
                        dismissInput()
                        input = "真正的进步不是问 AI 更多问题，而是把任务、边界、资料范围和交付格式说清楚，让 AI 在可控范围内进入真实工作流。"
                    }
                    .font(.system(size: 14))
                    .foregroundStyle(ShiBeiTheme.muted)
                    .frame(maxWidth: .infinity)
                }
                .padding(24)
                .padding(.bottom, 120)
            }
            .scrollDismissesKeyboard(.interactively)
            .safeAreaInset(edge: .bottom) {
                if isInputFocused {
                    HStack {
                        Spacer()
                        Button {
                            dismissInput()
                        } label: {
                            Label("收起键盘", systemImage: "keyboard.chevron.compact.down")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(ShiBeiTheme.text)
                                .padding(.horizontal, 14)
                                .frame(height: 44)
                                .background(ShiBeiTheme.card)
                                .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                                .shadow(color: .black.opacity(0.08), radius: 10, y: 4)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 8)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .animation(.easeInOut(duration: 0.16), value: isInputFocused)
        }
    }
}

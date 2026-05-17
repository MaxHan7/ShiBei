# iOS Mock Fixtures

这个目录给 Xcode 第一轮 SwiftUI mock 开发使用。JSON 字段应和 `docs/ios-api-data-contract-zh.md` 保持一致。

文件说明：

- `empty-state.json`：无章节、无通知。
- `completed-chapter.json`：已生成章节，含知识点和题目。
- `failed-chapter.json`：失败章节，含失败原因和来源。
- `active-review-session.json`：复习中 session，含 attempt 和强化队列。
- `chapter-summary.json`：章节完成状态，用于总结页。

这些 fixture 不是生产数据，也不是后端测试结果；它们只用于 iOS 页面和 ViewModel 的本地 mock。

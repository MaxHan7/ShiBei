import Foundation

struct LocalAPIChapterService {
    var apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    func createChapter(from input: ChapterInput) async throws -> ChapterCreationResult {
        try await apiClient.createChapter(input: input)
    }

    func regenerateChapter(_ chapter: Chapter) async throws -> ChapterCreationResult {
        try await apiClient.regenerateChapter(id: chapter.id)
    }

    func deleteChapter(_ id: String) async throws -> ChapterDeletionResponse {
        try await apiClient.deleteChapter(id: id)
    }
}

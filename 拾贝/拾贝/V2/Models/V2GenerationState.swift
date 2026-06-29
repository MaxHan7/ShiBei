struct V2GenerationState {
    var showsStartedDialog = false
    var showsChapterCard = false
    var errorText = ""
    var isSubmitting = false
    var pendingOriginalSourceURLString = ""

    mutating func prepareForSubmission(originalSourceURLString: String) {
        showsChapterCard = false
        errorText = ""
        isSubmitting = true
        pendingOriginalSourceURLString = originalSourceURLString
    }

    mutating func finishSubmitting() {
        isSubmitting = false
    }

    mutating func markError(_ message: String) {
        errorText = message
        showsChapterCard = true
        isSubmitting = false
    }

    mutating func clearError() {
        errorText = ""
    }

    mutating func resetAfterDelete() {
        showsStartedDialog = false
        showsChapterCard = false
        errorText = ""
        isSubmitting = false
        pendingOriginalSourceURLString = ""
    }
}

struct V2RecommendedArticleGenerationSimulation: Equatable {
    let chapterID: String
    var progress: Double
    var statusText: String
}

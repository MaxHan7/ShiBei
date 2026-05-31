import Foundation

struct APIClient {
    #if DEBUG
    static let localBaseURL = URL(string: "http://127.0.0.1:5173")!
    static let defaultBaseURL = APIClient.localBaseURL
    #else
    static let defaultBaseURL = APIClient.productionBaseURL
    #endif
    static let productionBaseURL = URL(string: "https://shibei-production.up.railway.app")!

    var baseURL: URL
    var session: URLSession
    var decoder: JSONDecoder
    var deviceId: String

    init(
        baseURL: URL = APIClient.defaultBaseURL,
        session: URLSession = .shared,
        decoder: JSONDecoder = JSONDecoder(),
        deviceId: String = DeviceIdentityStore.shared.currentDeviceId()
    ) {
        self.baseURL = baseURL
        self.session = session
        self.decoder = decoder
        self.deviceId = deviceId
    }

    func fetchChapters() async throws -> [Chapter] {
        let response: ChaptersResponse = try await get("/api/chapters")
        return response.chapters
    }

    func fetchChapter(id: String) async throws -> Chapter {
        let response: ChapterResponse = try await get("/api/chapters/\(id)")
        return response.chapter
    }

    func fetchNotifications() async throws -> [NotificationItem] {
        let response: NotificationsResponse = try await get("/api/notifications")
        return response.notifications
    }

    func fetchFavoriteQuestions() async throws -> [FavoriteQuestionRecord] {
        let response: FavoriteQuestionsResponse = try await get("/api/favorites/questions")
        return response.favorites
    }

    func createFavoriteQuestion(chapterId: String, questionId: String) async throws -> FavoriteQuestionRecord {
        let request = FavoriteQuestionRequest(chapterId: chapterId, questionId: questionId)
        let response: FavoriteQuestionMutationResponse = try await send("/api/favorites/questions", method: "POST", body: request, acceptsFailureBody: false)
        return response.favorite
    }

    func deleteFavoriteQuestion(id: String) async throws -> FavoriteQuestionDeletionResponse {
        let encodedId = id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? id
        return try await send("/api/favorites/questions/\(encodedId)", method: "DELETE", body: EmptyRequest(), acceptsFailureBody: false)
    }

    func markNotificationRead(id: String) async throws -> NotificationItem {
        let response: NotificationMutationResponse = try await send("/api/notifications/\(id)/read", method: "POST", body: EmptyRequest(), acceptsFailureBody: false)
        return response.notification
    }

    func dismissNotification(id: String) async throws -> NotificationItem {
        let response: NotificationMutationResponse = try await send("/api/notifications/\(id)/dismiss", method: "POST", body: EmptyRequest(), acceptsFailureBody: false)
        return response.notification
    }

    func createChapter(input: ChapterInput) async throws -> ChapterCreationResult {
        let request = ChapterCreateRequest(input: input)
        let response: ChapterMutationResponse = try await send("/api/chapters", method: "POST", body: request, acceptsFailureBody: true)
        return ChapterCreationResult(chapter: response.chapter, notification: response.notification)
    }

    func regenerateChapter(id: String) async throws -> ChapterCreationResult {
        let response: ChapterMutationResponse = try await send("/api/chapters/\(id)/regenerate", method: "POST", body: EmptyRequest(), acceptsFailureBody: true)
        return ChapterCreationResult(chapter: response.chapter, notification: response.notification)
    }

    func deleteChapter(id: String) async throws -> ChapterDeletionResponse {
        try await send("/api/chapters/\(id)", method: "DELETE", body: EmptyRequest(), acceptsFailureBody: false)
    }

    func startOrResumeReviewSession(chapterId: String) async throws -> ReviewSessionResponse {
        try await send("/api/chapters/\(chapterId)/review-session", method: "POST", body: EmptyRequest(), acceptsFailureBody: false)
    }

    func fetchReviewSession(chapterId: String) async throws -> ReviewSessionResponse {
        try await get("/api/chapters/\(chapterId)/review-session")
    }

    func submitAttempt(sessionId: String, queueItemId: String?, questionId: String, answer: String?, result: AttemptResult) async throws -> AttemptResponse {
        let request = AttemptRequest(queueItemId: queueItemId, questionId: questionId, answer: answer ?? "", result: result)
        return try await send("/api/review-sessions/\(sessionId)/attempts", method: "POST", body: request, acceptsFailureBody: false)
    }

    func submitFeedback(questionId: String, feedbackType: FeedbackType) async throws -> FeedbackResponse {
        let request = FeedbackRequest(feedbackType: feedbackType)
        return try await send("/api/questions/\(questionId)/feedback", method: "POST", body: request, acceptsFailureBody: false)
    }

    func deleteDeviceData() async throws -> DeviceDataDeletionResponse {
        try await send("/api/device-data", method: "DELETE", body: EmptyRequest(), acceptsFailureBody: false)
    }

    func registerPushToken(_ token: String, environment: PushTokenEnvironment, preferredLanguage: AppLanguage) async throws -> PushTokenRegistrationResponse {
        let request = PushTokenRequest(token: token, environment: environment, preferredLanguage: preferredLanguage.rawValue)
        return try await send("/api/devices/push-token", method: "POST", body: request, acceptsFailureBody: false)
    }

    func fetchPushStatus() async throws -> PushStatusResponse {
        try await get("/api/devices/push-status")
    }

    private func get<Response: Decodable>(_ path: String) async throws -> Response {
        let url = baseURL.appending(path: path)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "accept")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        #if DEBUG
        print("[ShiBei] API GET \(url.absoluteString) device=\(deviceId.suffix(6))")
        #endif

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }
        #if DEBUG
        print("[ShiBei] API GET status=\(httpResponse.statusCode) path=\(path)")
        #endif
        guard (200..<300).contains(httpResponse.statusCode) else {
            throw APIClientError.httpStatus(httpResponse.statusCode)
        }
        return try decode(Response.self, from: data, path: path)
    }

    private func send<Request: Encodable, Response: Decodable>(
        _ path: String,
        method: String,
        body: Request,
        acceptsFailureBody: Bool
    ) async throws -> Response {
        let url = baseURL.appending(path: path)
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "accept")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        #if DEBUG
        print("[ShiBei] API \(method) \(url.absoluteString) device=\(deviceId.suffix(6))")
        #endif
        if method != "DELETE" {
            request.setValue("application/json", forHTTPHeaderField: "content-type")
            request.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }
        #if DEBUG
        print("[ShiBei] API \(method) status=\(httpResponse.statusCode) path=\(path)")
        #endif
        if (200..<300).contains(httpResponse.statusCode) || (acceptsFailureBody && httpResponse.statusCode == 422) {
            return try decode(Response.self, from: data, path: path)
        }
        if let serverError = try? decoder.decode(APIErrorResponse.self, from: data) {
            throw APIClientError.serverMessage(serverError.message)
        }
        throw APIClientError.httpStatus(httpResponse.statusCode)
    }

    private func decode<Response: Decodable>(_ type: Response.Type, from data: Data, path: String) throws -> Response {
        do {
            return try decoder.decode(type, from: data)
        } catch let error as DecodingError {
            let message = Self.describeDecodingError(error)
            #if DEBUG
            print("[ShiBei] API decode failed path=\(path): \(message)")
            #endif
            throw APIClientError.decoding(message)
        } catch {
            #if DEBUG
            print("[ShiBei] API decode failed path=\(path): \(error.localizedDescription)")
            #endif
            throw error
        }
    }

    private static func describeDecodingError(_ error: DecodingError) -> String {
        switch error {
        case .typeMismatch(let type, let context):
            "Field \(codingPathDescription(context.codingPath)) type mismatch. Expected \(type)."
        case .valueNotFound(let type, let context):
            "Field \(codingPathDescription(context.codingPath)) is missing a value. Expected \(type)."
        case .keyNotFound(let key, let context):
            "Field \(codingPathDescription(context.codingPath + [key])) is missing."
        case .dataCorrupted(let context):
            "Field \(codingPathDescription(context.codingPath)) data corrupted: \(context.debugDescription)"
        @unknown default:
            "API response could not be decoded."
        }
    }

    private static func codingPathDescription(_ path: [CodingKey]) -> String {
        guard !path.isEmpty else { return "<root>" }
        return path.map { key in
            if let intValue = key.intValue {
                return "[\(intValue)]"
            }
            return key.stringValue
        }.joined(separator: ".")
    }
}

enum APIClientError: LocalizedError {
    case invalidResponse
    case httpStatus(Int)
    case serverMessage(String)
    case decoding(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            "Invalid API response."
        case .httpStatus(let statusCode):
            "API request failed: HTTP \(statusCode)."
        case .serverMessage(let message):
            message
        case .decoding(let message):
            "API response is incompatible: \(message)"
        }
    }
}

struct EmptyRequest: Codable {}

enum PushTokenEnvironment: String, Codable {
    case sandbox
    case production

    static var current: PushTokenEnvironment {
        let value = Bundle.main.object(forInfoDictionaryKey: "ShiBeiAPNSEnvironment") as? String
        switch value?.lowercased() {
        case "development", "sandbox":
            return .sandbox
        case "production":
            return .production
        default:
            return .production
        }
    }
}

struct PushTokenRequest: Codable {
    var token: String
    var platform: String = "ios"
    var environment: PushTokenEnvironment
    var preferredLanguage: String
}

struct PushTokenRegistrationResponse: Codable {
    struct RegisteredToken: Codable {
        var platform: String
        var environment: PushTokenEnvironment
    }

    var ok: Bool
    var pushToken: RegisteredToken?
    var apnsConfigured: Bool?
}

struct PushStatusResponse: Codable {
    struct APNSSummary: Codable {
        var configured: Bool
        var environment: String?
        var bundleId: String?
    }

    struct Token: Codable {
        var tokenTail: String
        var platform: String
        var environment: PushTokenEnvironment
        var updatedAt: String
    }

    struct RecentNotification: Codable {
        var id: String
        var type: String
        var title: String
        var pushAttemptedAt: String
        var pushDeliveryStatus: String
        var pushDeliveryError: String
        var pushAttemptCount: Int
        var createdAt: String
    }

    var ok: Bool
    var apns: APNSSummary
    var pushTokenCount: Int
    var pushTokens: [Token]
    var recentNotifications: [RecentNotification]
}

struct ChapterCreateRequest: Codable {
    var sourceType: String
    var rawText: String?
    var sourceUrl: String?
    var sourceTitle: String?

    init(input: ChapterInput) {
        sourceType = input.sourceType.rawValue
        rawText = input.rawText
        sourceUrl = input.sourceUrl
        sourceTitle = input.sourceTitle
    }
}

struct AttemptRequest: Codable {
    var queueItemId: String?
    var questionId: String
    var answer: String
    var result: AttemptResult
}

struct FeedbackRequest: Codable {
    var feedbackType: FeedbackType
}

struct ChaptersResponse: Codable {
    var chapters: [Chapter]
}

struct ChapterResponse: Codable {
    var chapter: Chapter
}

struct NotificationsResponse: Codable {
    var notifications: [NotificationItem]
}

struct FavoriteQuestionsResponse: Codable {
    var favorites: [FavoriteQuestionRecord]
}

struct FavoriteQuestionRequest: Codable {
    var chapterId: String
    var questionId: String
}

struct FavoriteQuestionMutationResponse: Codable {
    var favorite: FavoriteQuestionRecord
}

struct FavoriteQuestionDeletionResponse: Codable {
    var deleted: Bool
    var favoriteId: String
}

struct NotificationMutationResponse: Codable {
    var notification: NotificationItem
}

struct ChapterMutationResponse: Codable {
    var status: ChapterStatus?
    var chapter: Chapter
    var notification: NotificationItem?
    var message: String?
}

struct ChapterDeletionResponse: Codable {
    var deleted: Bool
    var chapterId: String
}

struct DeviceDataDeletionResponse: Codable {
    struct Deleted: Codable {
        var chapters: Int
        var notifications: Int
        var generationJobs: Int
        var favorites: Int?
    }

    var ok: Bool
    var deleted: Deleted
}

struct APIErrorResponse: Codable {
    var errorCode: String?
    var message: String
}

struct ReviewSessionResponse: Codable {
    var chapter: Chapter
    var reviewSession: ReviewSession?
    var currentQuestion: ReviewQuestion?
}

struct AttemptResponse: Codable {
    var chapter: Chapter
    var reviewSession: ReviewSession
    var attempt: ReviewAttempt
    var currentQuestion: ReviewQuestion?
}

struct FeedbackResponse: Codable {
    var chapter: Chapter
    var feedback: QuestionFeedback
    var reviewSession: ReviewSession?
}

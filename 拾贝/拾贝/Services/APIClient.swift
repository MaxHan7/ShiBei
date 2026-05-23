import Foundation

struct APIClient {
    static let localBaseURL = URL(string: "http://127.0.0.1:5173")!
    static let productionBaseURL = URL(string: "https://shibei-production.up.railway.app")!

    var baseURL: URL
    var session: URLSession
    var decoder: JSONDecoder
    var deviceId: String

    init(
        baseURL: URL = APIClient.localBaseURL,
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

    func submitAttempt(sessionId: String, questionId: String, answer: String?, result: AttemptResult) async throws -> AttemptResponse {
        let request = AttemptRequest(questionId: questionId, answer: answer ?? "", result: result)
        return try await send("/api/review-sessions/\(sessionId)/attempts", method: "POST", body: request, acceptsFailureBody: false)
    }

    func submitFeedback(questionId: String, feedbackType: FeedbackType) async throws -> FeedbackResponse {
        let request = FeedbackRequest(feedbackType: feedbackType)
        return try await send("/api/questions/\(questionId)/feedback", method: "POST", body: request, acceptsFailureBody: false)
    }

    func deleteDeviceData() async throws -> DeviceDataDeletionResponse {
        try await send("/api/device-data", method: "DELETE", body: EmptyRequest(), acceptsFailureBody: false)
    }

    func registerPushToken(_ token: String, environment: PushTokenEnvironment) async throws -> PushTokenRegistrationResponse {
        let request = PushTokenRequest(token: token, environment: environment)
        return try await send("/api/devices/push-token", method: "POST", body: request, acceptsFailureBody: false)
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
            "字段 \(codingPathDescription(context.codingPath)) 类型不匹配，期望 \(type)。"
        case .valueNotFound(let type, let context):
            "字段 \(codingPathDescription(context.codingPath)) 缺少值，期望 \(type)。"
        case .keyNotFound(let key, let context):
            "字段 \(codingPathDescription(context.codingPath + [key])) 缺失。"
        case .dataCorrupted(let context):
            "字段 \(codingPathDescription(context.codingPath)) 数据损坏：\(context.debugDescription)"
        @unknown default:
            "API 返回数据无法解析。"
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
            "API 返回格式不正确。"
        case .httpStatus(let statusCode):
            "API 请求失败：HTTP \(statusCode)。"
        case .serverMessage(let message):
            message
        case .decoding(let message):
            "API 返回格式不兼容：\(message)"
        }
    }
}

struct EmptyRequest: Codable {}

enum PushTokenEnvironment: String, Codable {
    case sandbox
    case production

    static var current: PushTokenEnvironment {
        #if DEBUG
        .sandbox
        #else
        .production
        #endif
    }
}

struct PushTokenRequest: Codable {
    var token: String
    var platform: String = "ios"
    var environment: PushTokenEnvironment
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

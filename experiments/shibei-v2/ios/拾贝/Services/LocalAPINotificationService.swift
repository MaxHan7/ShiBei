import Foundation

struct LocalAPINotificationService {
    var apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    func markRead(id: String) async throws -> NotificationItem {
        try await apiClient.markNotificationRead(id: id)
    }

    func dismiss(id: String) async throws -> NotificationItem {
        try await apiClient.dismissNotification(id: id)
    }
}

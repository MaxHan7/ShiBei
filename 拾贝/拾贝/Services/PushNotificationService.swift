import Foundation
import UIKit
import UserNotifications

extension Notification.Name {
    static let shiBeiDidRegisterForRemoteNotifications = Notification.Name("shiBeiDidRegisterForRemoteNotifications")
    static let shiBeiDidReceiveRemoteNotificationResponse = Notification.Name("shiBeiDidReceiveRemoteNotificationResponse")
    static let shiBeiDidFailRemoteNotificationRegistration = Notification.Name("shiBeiDidFailRemoteNotificationRegistration")
}

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        NotificationCenter.default.post(
            name: .shiBeiDidRegisterForRemoteNotifications,
            object: nil,
            userInfo: ["deviceToken": token]
        )
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(
            name: .shiBeiDidFailRemoteNotificationRegistration,
            object: nil,
            userInfo: ["message": error.localizedDescription]
        )
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .list, .sound]
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        NotificationCenter.default.post(
            name: .shiBeiDidReceiveRemoteNotificationResponse,
            object: nil,
            userInfo: response.notification.request.content.userInfo
        )
    }
}

enum PushNotificationService {
    static func authorizationStatus() async -> UNAuthorizationStatus {
        await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
    }

    static func requestAuthorizationAndRegister() async throws -> Bool {
        let center = UNUserNotificationCenter.current()
        let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
        if granted {
            await MainActor.run {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
        return granted
    }

    static func registerIfAuthorized() async {
        let status = await authorizationStatus()
        guard status == .authorized || status == .provisional || status == .ephemeral else { return }
        await MainActor.run {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
}

import Foundation
import Security

struct DeviceIdentityStore {
    static let shared = DeviceIdentityStore()

    private let service: String
    private let account: String

    init(service: String = "com.shibei.app.device-identity", account: String = "anonymous-device-id") {
        self.service = service
        self.account = account
    }

    func currentDeviceId() -> String {
        if let existing = readDeviceId(), !existing.isEmpty {
            return existing
        }
        let created = UUID().uuidString.lowercased()
        saveDeviceId(created)
        return created
    }

    func resetDeviceId() -> String {
        deleteDeviceId()
        let created = UUID().uuidString.lowercased()
        saveDeviceId(created)
        return created
    }

    private func readDeviceId() -> String? {
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess,
              let data = item as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }
        return value
    }

    private func saveDeviceId(_ value: String) {
        let data = Data(value.utf8)
        var query = baseQuery()
        query[kSecValueData as String] = data

        let status = SecItemAdd(query as CFDictionary, nil)
        if status == errSecDuplicateItem {
            SecItemUpdate(baseQuery() as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        }
    }

    private func deleteDeviceId() {
        SecItemDelete(baseQuery() as CFDictionary)
    }

    private func baseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
    }
}

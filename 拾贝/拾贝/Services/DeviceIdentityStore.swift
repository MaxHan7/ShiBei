import Foundation
import Security

struct DeviceIdentityStore {
    static let shared = DeviceIdentityStore()

    private let service: String
    private let account: String
    private let defaultsKey: String

    init(
        service: String = "com.shibei.app.device-identity",
        account: String = "anonymous-device-id",
        defaultsKey: String = "anonymousDeviceIdBackup"
    ) {
        self.service = service
        self.account = account
        self.defaultsKey = defaultsKey
    }

    func currentDeviceId() -> String {
        if let existing = readDeviceId(), !existing.isEmpty {
            saveDeviceIdBackup(existing)
            return existing
        }
        if let backup = readDeviceIdBackup(), !backup.isEmpty {
            saveDeviceId(backup)
            saveDeviceIdBackup(backup)
            return backup
        }
        let created = UUID().uuidString.lowercased()
        saveDeviceId(created)
        saveDeviceIdBackup(created)
        return created
    }

    func resetDeviceId() -> String {
        deleteDeviceId()
        deleteDeviceIdBackup()
        let created = UUID().uuidString.lowercased()
        saveDeviceId(created)
        saveDeviceIdBackup(created)
        return created
    }

    private func readDeviceIdBackup() -> String? {
        UserDefaults.standard.string(forKey: defaultsKey)
    }

    private func saveDeviceIdBackup(_ value: String) {
        UserDefaults.standard.set(value, forKey: defaultsKey)
    }

    private func deleteDeviceIdBackup() {
        UserDefaults.standard.removeObject(forKey: defaultsKey)
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

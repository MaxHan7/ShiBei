import XCTest
@testable import 拾贝

final class DeviceIdentityStoreTests: XCTestCase {
    func testCurrentDeviceIdIsStableAcrossReads() {
        let store = DeviceIdentityStore(service: "com.shibei.tests.\(UUID().uuidString)", account: "device")

        let first = store.currentDeviceId()
        let second = store.currentDeviceId()

        XCTAssertFalse(first.isEmpty)
        XCTAssertEqual(first, second)
    }

    func testResetDeviceIdCreatesNewValue() {
        let store = DeviceIdentityStore(service: "com.shibei.tests.\(UUID().uuidString)", account: "device")

        let first = store.currentDeviceId()
        let reset = store.resetDeviceId()

        XCTAssertFalse(reset.isEmpty)
        XCTAssertNotEqual(first, reset)
        XCTAssertEqual(store.currentDeviceId(), reset)
    }
}

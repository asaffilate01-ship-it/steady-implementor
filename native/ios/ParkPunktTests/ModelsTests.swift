import XCTest
@testable import ParkPunkt

final class ModelsTests: XCTestCase {
    func testAvailabilityNeverGoesNegative() throws {
        let site = ParkingSite(id: UUID(), name: "Test", address: "Street", lat: 0, lng: 0, capacity: 10, occupied: 12, priceCentsPerHour: 300, operatorName: nil)
        XCTAssertEqual(site.available, 0)
    }
}

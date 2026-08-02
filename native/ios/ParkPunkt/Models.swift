import Foundation

struct ParkingSite: Codable, Identifiable, Sendable {
    let id: UUID
    let name: String
    let address: String
    let lat: Double
    let lng: Double
    let capacity: Int
    let occupied: Int
    let priceCentsPerHour: Int
    let operatorName: String?

    enum CodingKeys: String, CodingKey {
        case id, name, address, lat, lng, capacity, occupied
        case priceCentsPerHour = "price_cents_per_hour"
        case operatorName = "operator_name"
    }

    var available: Int { max(0, capacity - occupied) }
    var hourlyPrice: String { (Double(priceCentsPerHour) / 100).formatted(.currency(code: "EUR")) }
}

struct TariffQuote: Codable, Sendable {
    let totalCents: Int
    let parkingCents: Int
    let serviceFeeCents: Int
    let chargeableMinutes: Int
    let cappedByDailyCap: Bool

    enum CodingKeys: String, CodingKey {
        case totalCents = "total_cents"
        case parkingCents = "parking_cents"
        case serviceFeeCents = "service_fee_cents"
        case chargeableMinutes = "chargeable_minutes"
        case cappedByDailyCap = "capped_by_daily_cap"
    }

    var total: String { (Double(totalCents) / 100).formatted(.currency(code: "EUR")) }
}

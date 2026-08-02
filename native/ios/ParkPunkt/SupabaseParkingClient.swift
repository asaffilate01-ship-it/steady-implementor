import Foundation

struct NativeConfiguration: Sendable {
    let supabaseURL: URL
    let publishableKey: String

    static func fromBundle(_ bundle: Bundle = .main) -> NativeConfiguration {
        guard
            let rawURL = bundle.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
            let url = URL(string: rawURL),
            let key = bundle.object(forInfoDictionaryKey: "SUPABASE_PUBLISHABLE_KEY") as? String,
            !key.isEmpty
        else { fatalError("Copy Config.example.xcconfig to Config.xcconfig and set publishable Supabase values") }
        return NativeConfiguration(supabaseURL: url, publishableKey: key)
    }
}

actor SupabaseParkingClient {
    private let configuration: NativeConfiguration
    private let session: URLSession
    private let decoder = JSONDecoder()

    init(configuration: NativeConfiguration, session: URLSession = .shared) {
        self.configuration = configuration
        self.session = session
    }

    func listSites() async throws -> [ParkingSite] {
        let fields = "id,name,address,lat,lng,capacity,occupied,price_cents_per_hour,operator_name"
        var components = URLComponents(url: configuration.supabaseURL.appending(path: "rest/v1/sites"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "select", value: fields),
            URLQueryItem(name: "order", value: "name.asc")
        ]
        return try await send(URLRequest(url: components.url!))
    }

    func quote(siteID: UUID, minutes: Int) async throws -> TariffQuote {
        var request = URLRequest(url: configuration.supabaseURL.appending(path: "rest/v1/rpc/quote_parking_tariff"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "_site_id": siteID.uuidString,
            "_minutes": minutes,
            "_reservation": false
        ])
        return try await send(request)
    }

    private func send<T: Decodable>(_ input: URLRequest) async throws -> T {
        var request = input
        request.setValue(configuration.publishableKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(configuration.publishableKey)", forHTTPHeaderField: "authorization")
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            throw URLError(.badServerResponse)
        }
        return try decoder.decode(T.self, from: data)
    }
}

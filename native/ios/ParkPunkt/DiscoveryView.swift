import SwiftUI

@MainActor
final class DiscoveryModel: ObservableObject {
    @Published var sites: [ParkingSite] = []
    @Published var loading = false
    @Published var error: String?
    private let client: SupabaseParkingClient

    init(client: SupabaseParkingClient) { self.client = client }

    func load() async {
        loading = true
        defer { loading = false }
        do { sites = try await client.listSites(); error = nil }
        catch { self.error = "Live parking could not be loaded. \(error.localizedDescription)" }
    }
}

struct DiscoveryView: View {
    @StateObject private var model: DiscoveryModel

    init(client: SupabaseParkingClient) {
        _model = StateObject(wrappedValue: DiscoveryModel(client: client))
    }

    var body: some View {
        NavigationStack {
            Group {
                if model.loading && model.sites.isEmpty { ProgressView("Finding parking…") }
                else if let error = model.error, model.sites.isEmpty {
                    ContentUnavailableView("Parking unavailable", systemImage: "wifi.exclamationmark", description: Text(error))
                } else {
                    List(model.sites) { site in
                        VStack(alignment: .leading, spacing: 5) {
                            HStack { Text(site.name).font(.headline); Spacer(); Text(site.hourlyPrice).bold() }
                            Text(site.address).font(.subheadline).foregroundStyle(.secondary)
                            Text("\(site.available) spaces available").font(.caption).foregroundStyle(site.available > 0 ? .green : .red)
                        }.accessibilityElement(children: .combine)
                    }.refreshable { await model.load() }
                }
            }
            .navigationTitle("ParkPunkt")
            .task { if model.sites.isEmpty { await model.load() } }
        }
    }
}

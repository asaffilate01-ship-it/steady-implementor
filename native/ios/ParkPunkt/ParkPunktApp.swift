import SwiftUI

@main
struct ParkPunktApp: App {
    var body: some Scene {
        WindowGroup {
            DiscoveryView(client: SupabaseParkingClient(configuration: .fromBundle()))
        }
    }
}

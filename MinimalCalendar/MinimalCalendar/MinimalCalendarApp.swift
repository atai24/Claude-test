import SwiftUI

@main
struct MinimalCalendarApp: App {
    @StateObject private var viewModel = CalendarViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(viewModel)
        }
    }
}

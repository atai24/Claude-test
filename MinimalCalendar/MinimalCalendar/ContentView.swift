import SwiftUI

struct ContentView: View {
    @EnvironmentObject var viewModel: CalendarViewModel
    @State private var showingAddEvent = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                CalendarGridView()
                Divider()
                EventListView(showingAddEvent: $showingAddEvent)
            }
            .navigationTitle("Calendar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingAddEvent = true
                    } label: {
                        Image(systemName: "plus")
                            .fontWeight(.medium)
                    }
                }
            }
            .sheet(isPresented: $showingAddEvent) {
                AddEventView(initialDate: viewModel.selectedDate)
            }
        }
    }
}

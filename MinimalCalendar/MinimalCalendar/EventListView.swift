import SwiftUI

struct EventListView: View {
    @EnvironmentObject var viewModel: CalendarViewModel
    @Binding var showingAddEvent: Bool
    @State private var editingEvent: Event?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Selected date label
            Text(viewModel.selectedDate, format: .dateTime.weekday(.wide).month(.wide).day())
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.secondary)
                .padding(.horizontal)
                .padding(.top, 14)
                .padding(.bottom, 8)

            if viewModel.eventsForSelectedDate.isEmpty {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "calendar")
                        .font(.system(size: 30))
                        .foregroundColor(.secondary.opacity(0.4))
                    Text("No events")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                Spacer()
            } else {
                List {
                    ForEach(viewModel.eventsForSelectedDate) { event in
                        EventRow(event: event)
                            .contentShape(Rectangle())
                            .onTapGesture { editingEvent = event }
                            .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                    }
                    .onDelete(perform: viewModel.deleteEvent)
                }
                .listStyle(.plain)
            }
        }
        .sheet(item: $editingEvent) { event in
            AddEventView(initialDate: viewModel.selectedDate, editingEvent: event)
        }
    }
}

struct EventRow: View {
    let event: Event

    var body: some View {
        HStack(spacing: 12) {
            Text(event.date, format: .dateTime.hour().minute())
                .font(.system(size: 12, weight: .medium, design: .monospaced))
                .foregroundColor(.accentColor)
                .frame(width: 48, alignment: .leading)

            VStack(alignment: .leading, spacing: 2) {
                Text(event.title)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.primary)

                if !event.notes.isEmpty {
                    Text(event.notes)
                        .font(.system(size: 13))
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
}

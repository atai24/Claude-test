import Foundation
import Combine

class CalendarViewModel: ObservableObject {
    @Published var selectedDate: Date = Date()
    @Published var events: [Event] = []
    @Published var currentMonth: Date = Date()

    private let saveKey = "MinimalCalendarEvents"

    init() {
        loadEvents()
    }

    var eventsForSelectedDate: [Event] {
        events
            .filter { Calendar.current.isDate($0.date, inSameDayAs: selectedDate) }
            .sorted { $0.date < $1.date }
    }

    func datesInCurrentMonth() -> [Date?] {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month], from: currentMonth)
        guard let firstDay = calendar.date(from: components),
              let range = calendar.range(of: .day, in: .month, for: firstDay) else {
            return []
        }
        // Offset for first weekday (0 = Sunday)
        let firstWeekday = calendar.component(.weekday, from: firstDay) - 1
        var dates: [Date?] = Array(repeating: nil, count: firstWeekday)
        for day in range {
            if let date = calendar.date(byAdding: .day, value: day - 1, to: firstDay) {
                dates.append(date)
            }
        }
        return dates
    }

    func hasEvents(on date: Date) -> Bool {
        events.contains { Calendar.current.isDate($0.date, inSameDayAs: date) }
    }

    func addEvent(_ event: Event) {
        events.append(event)
        saveEvents()
    }

    func updateEvent(_ event: Event) {
        guard let index = events.firstIndex(where: { $0.id == event.id }) else { return }
        events[index] = event
        saveEvents()
    }

    func deleteEvent(at offsets: IndexSet) {
        let dayEvents = eventsForSelectedDate
        for index in offsets {
            if let idx = events.firstIndex(where: { $0.id == dayEvents[index].id }) {
                events.remove(at: idx)
            }
        }
        saveEvents()
    }

    func previousMonth() {
        currentMonth = Calendar.current.date(byAdding: .month, value: -1, to: currentMonth) ?? currentMonth
    }

    func nextMonth() {
        currentMonth = Calendar.current.date(byAdding: .month, value: 1, to: currentMonth) ?? currentMonth
    }

    private func saveEvents() {
        if let encoded = try? JSONEncoder().encode(events) {
            UserDefaults.standard.set(encoded, forKey: saveKey)
        }
    }

    private func loadEvents() {
        guard let data = UserDefaults.standard.data(forKey: saveKey),
              let decoded = try? JSONDecoder().decode([Event].self, from: data) else { return }
        events = decoded
    }
}

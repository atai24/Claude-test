import Foundation

struct Event: Identifiable, Codable {
    let id: UUID
    var title: String
    var date: Date
    var notes: String

    init(id: UUID = UUID(), title: String, date: Date, notes: String = "") {
        self.id = id
        self.title = title
        self.date = date
        self.notes = notes
    }
}

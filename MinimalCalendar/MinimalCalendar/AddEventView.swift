import SwiftUI

struct AddEventView: View {
    @EnvironmentObject var viewModel: CalendarViewModel
    @Environment(\.dismiss) private var dismiss

    let initialDate: Date
    var editingEvent: Event?

    @State private var title: String
    @State private var date: Date
    @State private var notes: String

    init(initialDate: Date, editingEvent: Event? = nil) {
        self.initialDate = initialDate
        self.editingEvent = editingEvent
        _title = State(initialValue: editingEvent?.title ?? "")
        _date = State(initialValue: editingEvent?.date ?? initialDate)
        _notes = State(initialValue: editingEvent?.notes ?? "")
    }

    private var isEditing: Bool { editingEvent != nil }
    private var isSaveDisabled: Bool { title.trimmingCharacters(in: .whitespaces).isEmpty }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Event title", text: $title)
                }

                Section {
                    DatePicker("Date & Time", selection: $date)
                        .datePickerStyle(.compact)
                }

                Section {
                    TextField("Notes", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle(isEditing ? "Edit Event" : "New Event")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        save()
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .disabled(isSaveDisabled)
                }
            }
        }
    }

    private func save() {
        let trimmedTitle = title.trimmingCharacters(in: .whitespaces)
        let trimmedNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        if let editing = editingEvent {
            viewModel.updateEvent(Event(id: editing.id, title: trimmedTitle, date: date, notes: trimmedNotes))
        } else {
            viewModel.addEvent(Event(title: trimmedTitle, date: date, notes: trimmedNotes))
        }
    }
}

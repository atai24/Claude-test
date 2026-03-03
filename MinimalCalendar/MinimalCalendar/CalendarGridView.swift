import SwiftUI

struct CalendarGridView: View {
    @EnvironmentObject var viewModel: CalendarViewModel

    private let dayLabels = ["S", "M", "T", "W", "T", "F", "S"]
    private let columns = Array(repeating: GridItem(.flexible()), count: 7)

    var body: some View {
        VStack(spacing: 10) {
            // Month navigation header
            HStack {
                Button(action: viewModel.previousMonth) {
                    Image(systemName: "chevron.left")
                        .foregroundColor(.primary)
                        .padding(.horizontal, 4)
                }
                Spacer()
                Text(viewModel.currentMonth, format: .dateTime.month(.wide).year())
                    .font(.system(size: 15, weight: .semibold))
                Spacer()
                Button(action: viewModel.nextMonth) {
                    Image(systemName: "chevron.right")
                        .foregroundColor(.primary)
                        .padding(.horizontal, 4)
                }
            }
            .padding(.horizontal)

            // Weekday header row
            LazyVGrid(columns: columns, spacing: 6) {
                ForEach(dayLabels.indices, id: \.self) { index in
                    Text(dayLabels[index])
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.horizontal)

            // Date cells
            LazyVGrid(columns: columns, spacing: 6) {
                ForEach(Array(viewModel.datesInCurrentMonth().enumerated()), id: \.offset) { _, date in
                    if let date {
                        DayCell(date: date)
                    } else {
                        Color.clear.frame(height: 40)
                    }
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 12)
    }
}

struct DayCell: View {
    @EnvironmentObject var viewModel: CalendarViewModel
    let date: Date

    private var isSelected: Bool {
        Calendar.current.isDate(date, inSameDayAs: viewModel.selectedDate)
    }

    private var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }

    private var hasEvents: Bool {
        viewModel.hasEvents(on: date)
    }

    var body: some View {
        Button {
            viewModel.selectedDate = date
        } label: {
            VStack(spacing: 3) {
                Text(date, format: .dateTime.day())
                    .font(.system(size: 15, weight: isSelected || isToday ? .semibold : .regular))
                    .foregroundColor(isSelected ? .white : isToday ? .accentColor : .primary)
                    .frame(width: 34, height: 34)
                    .background(
                        Circle()
                            .fill(isSelected ? Color.accentColor : Color.clear)
                    )

                Circle()
                    .fill(isSelected ? Color.white.opacity(0.9) : Color.accentColor)
                    .frame(width: 4, height: 4)
                    .opacity(hasEvents ? 1 : 0)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

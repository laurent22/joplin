import SwiftUI

// MARK: - Selection color
private let notesYellow = Color(red: 1.0, green: 0.839, blue: 0.039)

// MARK: - Section grouping

private enum NoteGroup: Hashable {
    case today
    case yesterday
    case previous7Days
    case previous30Days
    case month(year: Int, month: Int)   // for older notes

    var title: String {
        switch self {
        case .today:          return "Today"
        case .yesterday:      return "Yesterday"
        case .previous7Days:  return "Previous 7 Days"
        case .previous30Days: return "Previous 30 Days"
        case .month(let year, let month):
            var comps = DateComponents()
            comps.year = year; comps.month = month; comps.day = 1
            let date = Calendar.current.date(from: comps) ?? Date()
            let sameYear = Calendar.current.component(.year, from: date) ==
                           Calendar.current.component(.year, from: Date())
            let fmt = DateFormatter()
            fmt.dateFormat = sameYear ? "MMMM" : "MMMM yyyy"
            return fmt.string(from: date)
        }
    }

    // Sort order — lower = more recent
    var order: Int {
        switch self {
        case .today:          return 0
        case .yesterday:      return 1
        case .previous7Days:  return 2
        case .previous30Days: return 3
        case .month:          return 4
        }
    }
}

private func group(for note: Note) -> NoteGroup {
    let cal = Calendar.current
    let d   = note.updatedTime
    if cal.isDateInToday(d)     { return .today }
    if cal.isDateInYesterday(d) { return .yesterday }
    let days = cal.dateComponents([.day], from: d, to: Date()).day ?? 0
    if days < 7  { return .previous7Days }
    if days < 30 { return .previous30Days }
    let y = cal.component(.year,  from: d)
    let m = cal.component(.month, from: d)
    return .month(year: y, month: m)
}

private func rowDate(_ note: Note) -> String {
    let cal = Calendar.current
    let d   = note.updatedTime
    if cal.isDateInToday(d) {
        let f = DateFormatter(); f.dateFormat = "HH:mm"
        return f.string(from: d)
    }
    if cal.isDateInYesterday(d) { return "Yesterday" }
    let days = cal.dateComponents([.day], from: d, to: Date()).day ?? 0
    if days < 7 {
        let f = DateFormatter(); f.dateFormat = "EEEE"   // "Monday"
        return f.string(from: d)
    }
    // Older: show short date
    let f = DateFormatter(); f.dateStyle = .short; f.timeStyle = .none
    return f.string(from: d)
}

// MARK: - Main view

struct NoteListView: View {
    @EnvironmentObject var appState: AppState
    @FocusState private var searchFocused: Bool

    // Group and sort notes
    private var grouped: [(group: NoteGroup, notes: [Note])] {
        let byGroup = Dictionary(grouping: appState.notes, by: { group(for: $0) })
        return byGroup
            .sorted { a, b in
                if a.key.order != b.key.order { return a.key.order < b.key.order }
                // Within .month groups sort by date desc
                if case .month(let ay, let am) = a.key, case .month(let by, let bm) = b.key {
                    return (ay, am) > (by, bm)
                }
                return false
            }
            .map { (group: $0.key, notes: $0.value) }
    }

    var body: some View {
        VStack(spacing: 0) {

            // MARK: Search bar
            HStack(spacing: 6) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                    .font(.system(size: 12))
                TextField("Search", text: Binding(
                    get: { appState.searchText },
                    set: { appState.search($0) }
                ))
                .textFieldStyle(.plain)
                .font(.system(size: 13))
                .focused($searchFocused)

                if !appState.searchText.isEmpty {
                    Button {
                        appState.clearSearch()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(.quaternary)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .padding(.horizontal, 12)
            .padding(.vertical, 8)

            Divider()

            // MARK: Note list
            if appState.notes.isEmpty {
                emptyState
            } else if !appState.searchText.isEmpty {
                // Flat list for search results
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 0) {
                        ForEach(appState.notes) { note in
                            noteRow(note)
                        }
                    }
                    .padding(.vertical, 6)
                    .padding(.horizontal, 6)
                }
            } else {
                // Grouped list
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 0, pinnedViews: []) {
                        ForEach(grouped, id: \.group) { section in
                            // Section header
                            Text(section.group.title)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(.secondary)
                                .padding(.horizontal, 16)
                                .padding(.top, 14)
                                .padding(.bottom, 4)

                            // Rows
                            ForEach(section.notes) { note in
                                noteRow(note)
                            }
                        }
                    }
                    .padding(.bottom, 6)
                    .padding(.horizontal, 6)
                }
            }
        }
        .toolbar {
            // Placeholder keeps the toolbar column divider visible.
            // Replace with real items as features are added.
            ToolbarItem(placement: .primaryAction) {
                Color.clear.frame(width: 1, height: 22)
            }
        }
        .navigationTitle(navigationTitle)
        .onChange(of: appState.isFocusingSearch) { _, focused in
            if focused { searchFocused = true; appState.isFocusingSearch = false }
        }
    }

    // Shared row builder used in both flat and grouped lists
    @ViewBuilder
    private func noteRow(_ note: Note) -> some View {
        NoteRowView(note: note, dateString: rowDate(note))
            .onTapGesture { appState.selectNote(note) }
            .contextMenu {
                Button("Delete Note", role: .destructive) { appState.deleteNote(note) }
            }
    }

    private var navigationTitle: String {
        if !appState.searchText.isEmpty { return "Search Results" }
        return appState.selectedFolder?.title ?? "All Notes"
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: appState.searchText.isEmpty ? "note.text" : "magnifyingglass")
                .font(.system(size: 40))
                .foregroundStyle(.quaternary)
            Text(appState.searchText.isEmpty ? "No Notes" : "No Results")
                .font(.headline)
                .foregroundStyle(.secondary)
            if appState.searchText.isEmpty {
                Button("Create a Note") { appState.createNote() }
                    .buttonStyle(.borderedProminent)
            }
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Note Row

struct NoteRowView: View {
    // Observes AppState directly so this view re-renders when selectedNoteID
    // changes, bypassing LazyVStack's identity-based caching that would otherwise
    // skip the update when the note id hasn't changed.
    @EnvironmentObject var appState: AppState

    let note: Note
    let dateString: String

    private var isSelected: Bool { appState.selectedNoteID == note.id }

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {

            // Line 1 — title
            HStack(spacing: 4) {
                if note.isTodo {
                    Image(systemName: note.todoCompleted ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(note.todoCompleted ? Color.orange : Color.secondary)
                        .font(.system(size: 13))
                }
                Text(note.title.isEmpty ? "Untitled" : note.title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
            }

            // Line 2 — date + preview on one line
            let subtitle = note.preview.isEmpty
                ? dateString
                : "\(dateString)  \(note.preview)"
            Text(subtitle)
                .font(.system(size: 12))
                .foregroundStyle(isSelected ? Color.primary.opacity(0.75) : Color.secondary)
                .lineLimit(1)
                .truncationMode(.tail)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isSelected ? notesYellow : Color.clear)
        )
    }
}

#Preview {
    NoteListView()
        .environmentObject(AppState())
}

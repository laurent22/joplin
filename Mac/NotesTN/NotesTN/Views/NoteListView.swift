import SwiftUI
import AppKit

// MARK: - Palette (Figma "Notes TN" tokens used by the note list)

func dynamicColor(light: UInt32, dark: UInt32) -> Color {
    func rgb(_ hex: UInt32) -> NSColor {
        NSColor(srgbRed: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255, blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
    }
    return Color(nsColor: NSColor(name: nil) { appearance in
        appearance.bestMatch(from: [.aqua, .darkAqua]) == .darkAqua ? rgb(dark) : rgb(light)
    })
}

private enum ListPalette {
    static let surface = dynamicColor(light: 0xFFFFFF, dark: 0x222626)
    static let rowSelectedFocused = dynamicColor(light: 0xFFE381, dark: 0x9E8422)
    static let rowSelectedUnfocused = dynamicColor(light: 0xDCDCDC, dark: 0x464646)
    static let separator = dynamicColor(light: 0xE6E6E6, dark: 0x383B3B)
    static let placeholder = dynamicColor(light: 0xE8E8E8, dark: 0x3A3A3A)
    static let headerTitle = dynamicColor(light: 0x4D4D4D, dark: 0xE8E9E9)
    static let headerSubtitle = dynamicColor(light: 0x7F7F7F, dark: 0x909292)
    static let notice = dynamicColor(light: 0x272727, dark: 0xDDDEDE)
    static let match = Color(red: 0xFC / 255, green: 0xB8 / 255, blue: 0x27 / 255)
}

// MARK: - Sorting (saved per notebook)

private enum NoteSortField: String, CaseIterable {
    case dateEdited, dateCreated, title

    var title: String {
        switch self {
        case .dateEdited: return "Date Edited"
        case .dateCreated: return "Date Created"
        case .title: return "Title"
        }
    }
}

private struct NoteSort: Equatable {
    var field: NoteSortField = .dateEdited
    var newestFirst = true

    private static func key(_ scope: String) -> String { "noteSort.\(scope)" }

    static func load(scope: String) -> NoteSort {
        guard let raw = UserDefaults.standard.string(forKey: key(scope)) else { return NoteSort() }
        let parts = raw.split(separator: ":")
        return NoteSort(field: NoteSortField(rawValue: String(parts.first ?? "")) ?? .dateEdited, newestFirst: parts.last != "asc")
    }

    func save(scope: String) {
        UserDefaults.standard.set("\(field.rawValue):\(newestFirst ? "desc" : "asc")", forKey: Self.key(scope))
    }

    func date(_ note: Note) -> Date { field == .dateCreated ? note.createdTime : note.updatedTime }

    func sorted(_ notes: [Note]) -> [Note] {
        notes.sorted { a, b in
            if field == .title {
                let order = a.displayTitle.localizedStandardCompare(b.displayTitle)
                return newestFirst ? order == .orderedAscending : order == .orderedDescending
            }
            return newestFirst ? date(a) > date(b) : date(a) < date(b)
        }
    }
}

private extension Note {
    var displayTitle: String { title.isEmpty ? "Untitled" : title }
}

// MARK: - Date sections

private enum NoteGroup: Hashable {
    case today, yesterday, previous7Days, previous30Days
    case month(Int)   // current year only
    case year(Int)

    var title: String {
        switch self {
        case .today: return "Today"
        case .yesterday: return "Yesterday"
        case .previous7Days: return "Previous 7 Days"
        case .previous30Days: return "Previous 30 Days"
        case .month(let month): return monthFormatter.monthSymbols[month - 1]
        case .year(let year): return String(year)
        }
    }

    init(_ date: Date) {
        let cal = Calendar.current
        if cal.isDateInToday(date) { self = .today; return }
        if cal.isDateInYesterday(date) { self = .yesterday; return }
        let days = cal.dateComponents([.day], from: cal.startOfDay(for: date), to: cal.startOfDay(for: Date())).day ?? 0
        if days < 7 { self = .previous7Days; return }
        if days <= 30 { self = .previous30Days; return }
        let year = cal.component(.year, from: date)
        self = year == cal.component(.year, from: Date()) ? .month(cal.component(.month, from: date)) : .year(year)
    }
}

// Formatters are cached at file scope: DateFormatter.init costs milliseconds and
// rowDate runs per visible row per render.
private let monthFormatter = DateFormatter()
private let timeFormatter: DateFormatter = {
    let f = DateFormatter(); f.dateStyle = .none; f.timeStyle = .short; return f
}()
private let weekdayFormatter: DateFormatter = {
    let f = DateFormatter(); f.dateFormat = "EEEE"; return f
}()
private let shortDateFormatter: DateFormatter = {
    let f = DateFormatter(); f.dateStyle = .short; f.timeStyle = .none; return f
}()

private func rowDate(_ date: Date) -> String {
    let cal = Calendar.current
    if cal.isDateInToday(date) { return timeFormatter.string(from: date) }
    if cal.isDateInYesterday(date) { return "Yesterday" }
    let days = cal.dateComponents([.day], from: cal.startOfDay(for: date), to: cal.startOfDay(for: Date())).day ?? 0
    if days < 7 { return weekdayFormatter.string(from: date) }
    return shortDateFormatter.string(from: date)
}

private struct NoteSection: Identifiable {
    let title: String?
    let notes: [Note]
    var id: String { title ?? "" }
}

// MARK: - Main view

struct NoteListView: View {
    @EnvironmentObject var appState: AppState
    @FocusState private var isListFocused: Bool
    @State private var sort = NoteSort()
    @State private var isConfirmingDeleteAll = false
    @State private var permanentlyDeleting: Note?
    @State private var permanentlyDeletingFolder: Folder?

    // Keyed off the fetched results, not the typed text, so the list doesn't draw
    // search rows over the notebook's notes during the search debounce.
    private var isSearching: Bool { !appState.searchResultsQuery.isEmpty }
    private var sortScope: String { appState.selectedFolderID ?? "all" }
    private var displayedNotes: [Note] { appState.isTrashSelected ? appState.trashedNotes : appState.notes }

    private var sections: [NoteSection] {
        if appState.isTrashSelected {
            return [NoteSection(title: nil, notes: appState.trashedNotes)]
        }
        if isSearching {
            let query = appState.searchResultsQuery
            let hits = appState.notes.filter { $0.title.localizedCaseInsensitiveContains(query) }.prefix(4)
            let rest = appState.notes.filter { note in !hits.contains { $0.id == note.id } }
            // A lone "Notes" header is how Notes shows No Results.
            let notesSection = rest.isEmpty && !hits.isEmpty ? [] : [NoteSection(title: "Notes", notes: rest)]
            return (hits.isEmpty ? [] : [NoteSection(title: "Top Hits", notes: Array(hits))]) + notesSection
        }
        let pinned = sort.sorted(appState.notes.filter(\.isPinned))
        let unpinned = sort.sorted(appState.notes.filter { !$0.isPinned })
        var result = pinned.isEmpty ? [] : [NoteSection(title: "Pinned", notes: pinned)]
        if sort.field == .title {
            if !unpinned.isEmpty { result.append(NoteSection(title: pinned.isEmpty ? nil : "Notes", notes: unpinned)) }
            return result
        }
        var groups: [(NoteGroup, [Note])] = []
        for note in unpinned {
            let group = NoteGroup(sort.date(note))
            if let last = groups.indices.last, groups[last].0 == group {
                groups[last].1.append(note)
            } else {
                groups.append((group, [note]))
            }
        }
        return result + groups.map { NoteSection(title: $0.0.title, notes: $0.1) }
    }

    private var orderedNotes: [Note] { sections.flatMap(\.notes) }

    private var title: String {
        if isSearching { return "Search" }
        if appState.isTrashSelected { return "Trash" }
        return appState.selectedFolder?.title ?? "All Notes"
    }

    private var subtitle: String {
        let count = displayedNotes.count
        if isSearching { return count == 0 ? "No Results" : "Found \(count) note\(count == 1 ? "" : "s")" }
        return count == 0 ? "No notes" : "\(count) note\(count == 1 ? "" : "s")"
    }

    private var selectedNote: Note? {
        displayedNotes.first { $0.id == appState.selectedNoteID }
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    if appState.isTrashSelected { trashNotice }
                    if appState.isTrashSelected && !appState.trashedFolders.isEmpty {
                        sectionHeader("Notebooks")
                        ForEach(appState.trashedFolders) { trashedFolderRow($0) }
                        sectionHeader("Notes")
                    }
                    ForEach(sections) { section in
                        if let title = section.title { sectionHeader(title) }
                        ForEach(Array(section.notes.enumerated()), id: \.element.id) { index, note in
                            row(note, next: section.notes.indices.contains(index + 1) ? section.notes[index + 1] : nil)
                                .id(note.id)
                        }
                        Spacer().frame(height: 18)
                    }
                }
                .padding(.bottom, 10)
            }
            .overlay {
                if displayedNotes.isEmpty && !isSearching && !(appState.isTrashSelected && !appState.trashedFolders.isEmpty) {
                    Text("No Notes")
                        .font(.system(size: 24))
                        .foregroundStyle(.tertiary)
                }
            }
            .focusable()
            .focused($isListFocused)
            .focusEffectDisabled()
            .onMoveCommand { direction in
                moveSelection(direction)
                if let id = appState.selectedNoteID { proxy.scrollTo(id) }
            }
            .onDeleteCommand { deleteSelected() }
        }
        .background(ListPalette.surface)
        .toolbar { toolbarContent }
        .onAppear {
            sort = NoteSort.load(scope: sortScope)
            selectFirstIfNeeded()
        }
        .onChange(of: sortScope) { _, scope in
            sort = NoteSort.load(scope: scope)
            selectFirstIfNeeded()
        }
        .onChange(of: appState.isTrashSelected) { _, _ in selectFirstIfNeeded() }
        .onChange(of: appState.trashedNotes) { _, _ in selectFirstIfNeeded() }
        .onChange(of: appState.notes) { _, _ in selectFirstIfNeeded() }
        // Notes opens the first result of each new search.
        .onChange(of: appState.searchResultsQuery) { _, query in
            if !query.isEmpty { appState.selectNote(orderedNotes.first) }
        }
        .alert(
            "Delete this notebook permanently?",
            isPresented: Binding(get: { permanentlyDeletingFolder != nil }, set: { if !$0 { permanentlyDeletingFolder = nil } })
        ) {
            Button("Cancel", role: .cancel) {}
            Button("Delete") {
                if let permanentlyDeletingFolder { appState.permanentlyDeleteFolder(permanentlyDeletingFolder) }
            }
            .keyboardShortcut(.defaultAction)
        } message: {
            Text("You can’t undo this action.")
        }
        .alert("Delete all notes in the Trash?", isPresented: $isConfirmingDeleteAll) {
            Button("Cancel", role: .cancel) {}
            Button("Delete All") { appState.emptyTrash() }
                .keyboardShortcut(.defaultAction)
        } message: {
            Text("You can’t undo this action.")
        }
        .alert(
            "Delete this note permanently?",
            isPresented: Binding(get: { permanentlyDeleting != nil }, set: { if !$0 { permanentlyDeleting = nil } })
        ) {
            Button("Cancel", role: .cancel) {}
            Button("Delete") {
                if let permanentlyDeleting { removing(permanentlyDeleting) { appState.permanentlyDeleteNote($0) } }
            }
            .keyboardShortcut(.defaultAction)
        } message: {
            Text("You can’t undo this action.")
        }
    }

    // MARK: Toolbar

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .navigation) {
            VStack(alignment: .leading, spacing: 0) {
                Text(title)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(ListPalette.headerTitle)
                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundStyle(ListPalette.headerSubtitle)
            }
            .lineLimit(1)
            .padding(.leading, 12)
        }
        .sharedBackgroundVisibility(.hidden)

        ToolbarSpacer(.flexible)

        ToolbarItem {
            optionsMenu
        }
    }

    private var optionsMenu: some View {
        Menu {
            if appState.isTrashSelected {
                Button { if let selectedNote { removing(selectedNote) { appState.restoreNote($0) } } } label: {
                    Label("Restore", systemImage: "arrow.uturn.backward")
                }
                .disabled(selectedNote == nil)
                Button { permanentlyDeleting = selectedNote } label: {
                    Label("Delete Permanently", systemImage: "trash.slash")
                }
                .disabled(selectedNote == nil)
                Divider()
                Button { isConfirmingDeleteAll = true } label: {
                    Label("Delete All", systemImage: "trash")
                }
                .disabled(appState.trashedNotes.isEmpty && appState.trashedFolders.isEmpty)
            } else {
                if !isSearching {
                    Menu {
                        Picker("Sort By", selection: sortBinding(\.field)) {
                            ForEach(NoteSortField.allCases, id: \.self) { Text($0.title).tag($0) }
                        }
                        .pickerStyle(.inline)
                        .labelsHidden()
                        Divider()
                        Picker("Order", selection: sortBinding(\.newestFirst)) {
                            Text("Newest First").tag(true)
                            Text("Oldest First").tag(false)
                        }
                        .pickerStyle(.inline)
                        .labelsHidden()
                    } label: {
                        Label("Sort By", systemImage: "arrow.up.arrow.down")
                    }
                    Divider()
                }
                pinButton(selectedNote)
                    .disabled(selectedNote == nil)
                Button { if let selectedNote { removing(selectedNote) { appState.deleteNote($0) } } } label: {
                    Label("Delete", systemImage: "trash")
                }
                .disabled(selectedNote == nil)
            }
        } label: {
            Label("List Options", systemImage: "ellipsis")
        }
        .menuIndicator(.hidden)
        .help("List Options")
    }

    private func sortBinding<Value>(_ keyPath: WritableKeyPath<NoteSort, Value>) -> Binding<Value> {
        Binding(
            get: { sort[keyPath: keyPath] },
            set: {
                sort[keyPath: keyPath] = $0
                sort.save(scope: sortScope)
            }
        )
    }

    private func pinButton(_ note: Note?) -> some View {
        Button { if let note { appState.togglePin(note) } } label: {
            if note?.isPinned == true {
                Label("Unpin Note", systemImage: "pin.slash")
            } else {
                Label("Pin Note", systemImage: "pin")
            }
        }
    }

    // MARK: Rows

    private var trashNotice: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Deleted notes are removed permanently after 90 days, which may require Notes TN to be open.")
                .font(.system(size: 12))
                .foregroundStyle(ListPalette.notice)
                .lineSpacing(1)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 16)
                .padding(.top, 6)
                .padding(.bottom, 6)
            ListPalette.separator.frame(height: 1)
            Spacer().frame(height: 10)
        }
    }

    private func sectionHeader(_ title: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(.primary)
                .padding(.leading, 16)
                .padding(.top, 9)
                .frame(height: 39, alignment: .top)
            ListPalette.separator.frame(height: 1)
            Spacer().frame(height: 10)
        }
    }

    private func row(_ note: Note, next: Note?) -> some View {
        let isSelected = appState.selectedNoteID == note.id
        let showsSeparator = next != nil && !isSelected && appState.selectedNoteID != next?.id
        return NoteRowView(
            note: note,
            date: rowDate(sort.field == .dateCreated && !appState.isTrashSelected ? note.createdTime : note.updatedTime),
            query: appState.searchResultsQuery,
            folderTitle: isSearching ? folderTitle(note) : nil,
            selection: isSelected ? (isListFocused ? .focused : .unfocused) : nil,
            showsSeparator: showsSeparator
        )
        .padding(.horizontal, 10)
        .onTapGesture {
            appState.selectNote(note)
            isListFocused = true
        }
        .contextMenu {
            if appState.isTrashSelected {
                Button { removing(note) { appState.restoreNote($0) } } label: { Label("Restore", systemImage: "arrow.uturn.backward") }
                Button { permanentlyDeleting = note } label: { Label("Delete Permanently", systemImage: "trash.slash") }
            } else {
                pinButton(note)
                Divider()
                Button { removing(note) { appState.deleteNote($0) } } label: { Label("Delete", systemImage: "trash") }
            }
        }
    }

    private func trashedFolderRow(_ folder: Folder) -> some View {
        Label(folder.title, systemImage: "folder")
            .font(.system(size: 13, weight: .bold))
            .padding(.horizontal, 26)
            .frame(maxWidth: .infinity, minHeight: 32, alignment: .leading)
            .contentShape(Rectangle())
            .contextMenu {
                Button { appState.restoreFolder(folder) } label: { Label("Restore", systemImage: "arrow.uturn.backward") }
                Button { permanentlyDeletingFolder = folder } label: { Label("Delete Permanently", systemImage: "trash.slash") }
            }
    }

    private func folderTitle(_ note: Note) -> String {
        appState.folders.first { $0.id == note.folderId }?.title ?? "Notes"
    }

    // Notes always shows a note when the list has one (after switching notebooks or
    // deleting the open note).
    private func selectFirstIfNeeded() {
        guard !isSearching, !orderedNotes.contains(where: { $0.id == appState.selectedNoteID }) else { return }
        appState.selectNote(orderedNotes.first)
    }

    private func moveSelection(_ direction: MoveCommandDirection) {
        let notes = orderedNotes
        guard !notes.isEmpty else { return }
        let index = notes.firstIndex { $0.id == appState.selectedNoteID }
        switch direction {
        case .up: appState.selectNote(notes[max((index ?? 0) - 1, 0)])
        case .down: appState.selectNote(notes[min((index ?? -1) + 1, notes.count - 1)])
        default: break
        }
    }

    private func deleteSelected() {
        guard let selectedNote else { return }
        if appState.isTrashSelected {
            permanentlyDeleting = selectedNote
        } else {
            removing(selectedNote) { appState.deleteNote($0) }
        }
    }

    // Deleting, restoring or permanently deleting the open note moves to the note
    // that took its place, as in Notes, rather than back to the top.
    private func removing(_ note: Note, _ action: (Note) -> Void) {
        let wasSelected = appState.selectedNoteID == note.id
        let index = orderedNotes.firstIndex { $0.id == note.id }
        action(note)
        guard wasSelected, let index else { return }
        let remaining = orderedNotes
        if !remaining.contains(where: { $0.id == appState.selectedNoteID }) {
            appState.selectNote(remaining.isEmpty ? nil : remaining[min(index, remaining.count - 1)])
        }
    }
}

// MARK: - Note Row

/// Figma component "Note Row": Standard (56 pt) or Search (68 pt, adds the notebook line).
struct NoteRowView: View {
    enum Selection { case focused, unfocused }

    let note: Note
    let date: String
    let query: String
    let folderTitle: String?
    let selection: Selection?
    let showsSeparator: Bool

    private var isSearchRow: Bool { folderTitle != nil }

    private var thumbnailURL: URL? {
        note.firstImageResourceId.flatMap { DatabaseManager.shared.resourceLocalFileURL(id: $0) }
    }

    var body: some View {
        HStack(alignment: .top, spacing: 0) {
            VStack(alignment: .leading, spacing: isSearchRow ? 3 : 0) {
                Text(highlighted(note.displayTitle))
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(.primary)
                    .frame(height: 16)
                HStack(spacing: 6) {
                    Text(date)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.primary)
                        .layoutPriority(1)
                    Text(highlighted(preview))
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
                .frame(height: 15)
                if let folderTitle {
                    Label(folderTitle, systemImage: "folder")
                        .labelStyle(FolderLineLabelStyle())
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                        .padding(.top, 2)
                        .frame(height: 17, alignment: .top)
                }
            }
            .lineLimit(1)
            .truncationMode(.tail)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, isSearchRow ? 7 : 12)

            if let thumbnailURL {
                AsyncImage(url: thumbnailURL) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    ListPalette.placeholder
                }
                .frame(width: isSearchRow ? 52 : 44, height: isSearchRow ? 52 : 44)
                .clipShape(RoundedRectangle(cornerRadius: 4))
                .overlay(RoundedRectangle(cornerRadius: 4).strokeBorder(ListPalette.separator, lineWidth: 1))
                .padding(.top, isSearchRow ? 7 : 6)
                .padding(.leading, 18)
                .padding(.trailing, -16)
            }
        }
        .padding(.horizontal, 26)
        .frame(height: isSearchRow ? 68 : 56, alignment: .top)
        .background(alignment: .bottom) {
            if showsSeparator {
                ListPalette.separator
                    .frame(height: 1)
                    .padding(.leading, 25)
                    .padding(.trailing, 6)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(selection == .focused ? ListPalette.rowSelectedFocused : selection == .unfocused ? ListPalette.rowSelectedUnfocused : Color.clear)
        )
        .contentShape(Rectangle())
    }

    // Search rows start the preview at the first match, as Notes does.
    private var preview: String {
        guard !note.preview.isEmpty else { return "No additional text" }
        let text = isSearchRow ? note.plainText : note.preview
        guard isSearchRow, let match = text.range(of: query, options: .caseInsensitive),
              text.distance(from: text.startIndex, to: match.lowerBound) > 12 else { return text }
        let start = text.index(match.lowerBound, offsetBy: -12)
        let wordStart = text[start...].firstIndex(of: " ").map { text.index(after: $0) } ?? start
        return "…" + text[min(wordStart, match.lowerBound)...]
    }

    // Matches are drawn in the accent colour, with no background.
    private func highlighted(_ text: String) -> AttributedString {
        guard !query.isEmpty else { return AttributedString(text) }
        var result = AttributedString()
        var start = text.startIndex
        while start < text.endIndex, let match = text.range(of: query, options: .caseInsensitive, range: start..<text.endIndex) {
            result += AttributedString(String(text[start..<match.lowerBound]))
            var matched = AttributedString(String(text[match]))
            matched.foregroundColor = ListPalette.match
            result += matched
            start = match.upperBound
        }
        if start < text.endIndex { result += AttributedString(String(text[start...])) }
        return result
    }
}

private struct FolderLineLabelStyle: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 5) {
            configuration.icon.font(.system(size: 11))
            configuration.title
        }
    }
}

#Preview {
    NoteListView()
        .environmentObject(AppState())
}

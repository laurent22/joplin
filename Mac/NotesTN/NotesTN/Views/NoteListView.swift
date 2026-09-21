import SwiftUI

// Used to look up the note displayed right after a given one (for divider
// hiding around the selected row — see noteRow's `nextNote` param) without an
// out-of-bounds crash at the end of a list.
private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

private extension View {
    // .searchFocused requires macOS 15 — this app's deployment target is 14, so
    // wrap it behind an availability check. On macOS 14 the ⌘F "Find…" command
    // just won't be able to move focus into the native search field; everything
    // else about search still works.
    @ViewBuilder
    func searchFieldFocused(_ isFocused: FocusState<Bool>.Binding) -> some View {
        if #available(macOS 15.0, *) {
            self.searchFocused(isFocused)
        } else {
            self
        }
    }
}

private let noteListSearchPlacement: SearchFieldPlacement = .toolbar

// MARK: - Selection colors
// Brand yellow palette — see AppColors.swift for the full set shared with
// EditorView.swift/SidebarView.swift and Android's Color.kt.

// MARK: - Section grouping

private enum NoteGroup: Hashable {
    case today
    case yesterday
    case previous7Days
    case previous30Days
    case month(month: Int)   // current year only, e.g. "March"
    case year(Int)           // older than the current year, grouped whole — no month breakdown

    var title: String {
        switch self {
        case .today:          return "Today"
        case .yesterday:      return "Yesterday"
        case .previous7Days:  return "Previous 7 Days"
        case .previous30Days: return "Previous 30 Days"
        case .month(let month):
            var comps = DateComponents()
            comps.year = Calendar.current.component(.year, from: Date())
            comps.month = month; comps.day = 1
            let date = Calendar.current.date(from: comps) ?? Date()
            return monthFormatter.string(from: date)
        case .year(let year):
            return String(year)
        }
    }

    // Sort order — lower = more recent. .month/.year additionally need the tie-break
    // in `grouped`'s sort below, since many notes share the same case with a different
    // month/year.
    var order: Int {
        switch self {
        case .today:          return 0
        case .yesterday:      return 1
        case .previous7Days:  return 2
        case .previous30Days: return 3
        case .month:          return 4
        case .year:           return 5
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
    let y = cal.component(.year, from: d)
    if y == cal.component(.year, from: Date()) {
        return .month(month: cal.component(.month, from: d))
    }
    return .year(y)
}

// Formatters are cached at file scope — DateFormatter.init costs milliseconds, and
// rowDate runs per visible row per list render (which happens per keystroke while
// typing, since the list observes AppState). Allocating fresh formatters there was
// a measurable slice of the list's lag.
private let monthFormatter: DateFormatter = {
    let f = DateFormatter(); f.dateFormat = "MMMM"; return f
}()
private let timeFormatter: DateFormatter = {
    let f = DateFormatter(); f.dateFormat = "HH:mm"; return f
}()
private let weekdayFormatter: DateFormatter = {
    let f = DateFormatter(); f.dateFormat = "EEEE"; return f
}()
private let shortDateFormatter: DateFormatter = {
    let f = DateFormatter(); f.dateStyle = .short; f.timeStyle = .none; return f
}()

private func rowDate(_ note: Note) -> String {
    let cal = Calendar.current
    let d   = note.updatedTime
    if cal.isDateInToday(d) {
        return timeFormatter.string(from: d)
    }
    if cal.isDateInYesterday(d) { return "Yesterday" }
    let days = cal.dateComponents([.day], from: d, to: Date()).day ?? 0
    if days < 7 {
        return weekdayFormatter.string(from: d)   // "Monday"
    }
    // Older: show short date
    return shortDateFormatter.string(from: d)
}

// MARK: - Main view

struct NoteListView: View {
    @EnvironmentObject var appState: AppState
    // Pairs with the native `.searchable` toolbar search field below (see
    // .searchFocused).
    @FocusState private var isSearchFieldFocused: Bool
    @State private var showEmptyTrashConfirm = false

    private var displayedNotes: [Note] {
        appState.isTrashSelected ? appState.trashedNotes : appState.notes
    }

    // Pinning only applies to live notes — pulled out of their date group into their
    // own section (first, like Apple Notes) so a note doesn't appear twice.
    private var pinnedNotes: [Note] {
        guard !appState.isTrashSelected else { return [] }
        return displayedNotes.filter { $0.isPinned }.sorted { $0.updatedTime > $1.updatedTime }
    }

    // Group and sort notes
    private var grouped: [(group: NoteGroup, notes: [Note])] {
        let unpinned = appState.isTrashSelected ? displayedNotes : displayedNotes.filter { !$0.isPinned }
        let byGroup = Dictionary(grouping: unpinned, by: { group(for: $0) })
        return byGroup
            .sorted { a, b in
                if a.key.order != b.key.order { return a.key.order < b.key.order }
                // Within .month/.year groups sort by recency desc
                if case .month(let am) = a.key, case .month(let bm) = b.key {
                    return am > bm
                }
                if case .year(let ay) = a.key, case .year(let by) = b.key {
                    return ay > by
                }
                return false
            }
            .map { (group: $0.key, notes: $0.value) }
    }

    // Shared toolbar content — factored out so it can be chained directly after
    // .searchable below (see body).
    @ToolbarContentBuilder
    private var noteListToolbarContent: some ToolbarContent {
        ToolbarItem(placement: .primaryAction) {
            if appState.isTrashSelected && (!appState.trashedNotes.isEmpty || !appState.trashedFolders.isEmpty) {
                Button("Empty Trash", role: .destructive) { showEmptyTrashConfirm = true }
            } else {
                // Moved here from EditorView.swift's NoteEditorView. Not shown while
                // viewing Trash — notes can't be created there.
                if !appState.isTrashSelected {
                    Button { appState.createNote() } label: {
                        Image(systemName: "square.and.pencil")
                    }
                    .foregroundStyle(Color.secondary)
                    .help("New Note (⌘N)")
                }
            }
        }
    }

    var body: some View {
        mainContent
            .searchable(
                text: Binding(get: { appState.searchText }, set: { appState.search($0) }),
                placement: noteListSearchPlacement,
                prompt: "Search"
            )
            // Enter key — opens/previews the first result. Typing alone (the
            // binding above) only re-filters the list now.
            .onSubmit(of: .search) {
                appState.submitSearch()
            }
            .searchFieldFocused($isSearchFieldFocused)
            .toolbar { noteListToolbarContent }
            .confirmationDialog(
                "Permanently delete everything in Trash?",
                isPresented: $showEmptyTrashConfirm,
                titleVisibility: .visible
            ) {
                Button("Empty Trash", role: .destructive) { appState.emptyTrash() }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This can't be undone.")
            }
            .navigationTitle(navigationTitle)
            .onChange(of: appState.isFocusingSearch) { _, focused in
                guard focused else { return }
                isSearchFieldFocused = true
                appState.isFocusingSearch = false
            }
    }

    // The header/divider/note-list column.
    private var mainContent: some View {
        VStack(spacing: 0) {

            // MARK: Header — current notebook (or "All Notes") + its note count,
            // replacing the old in-content search bar now that search lives in the
            // native toolbar search field (see .searchable below).
            VStack(alignment: .leading, spacing: 2) {
                Text(navigationTitle)
                    .font(.system(size: 20, weight: .bold))
                Text("\(displayedNotes.count) note\(displayedNotes.count == 1 ? "" : "s")")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 10)

            Divider()

            // MARK: Note list
            if displayedNotes.isEmpty && !(appState.isTrashSelected && !appState.trashedFolders.isEmpty) {
                emptyState
            } else if !appState.searchText.isEmpty {
                // Flat list for search results
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 0) {
                        ForEach(Array(displayedNotes.enumerated()), id: \.element.id) { index, note in
                            noteRow(note, nextNote: displayedNotes[safe: index + 1])
                        }
                    }
                    .padding(.vertical, 6)
                    .padding(.horizontal, 6)
                }
                .refreshable { await forceResync() }
            } else {
                // Grouped list
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 0, pinnedViews: []) {
                        if !pinnedNotes.isEmpty {
                            sectionHeader("Pinned", firstNoteID: pinnedNotes.first?.id)
                            ForEach(Array(pinnedNotes.enumerated()), id: \.element.id) { index, note in
                                noteRow(note, nextNote: pinnedNotes[safe: index + 1])
                            }
                        }
                        if appState.isTrashSelected && !appState.trashedFolders.isEmpty {
                            sectionHeader("Notebooks")
                            ForEach(appState.trashedFolders) { folder in
                                trashedFolderRow(folder)
                            }
                        }
                        ForEach(grouped, id: \.group) { section in
                            sectionHeader(section.group.title, firstNoteID: section.notes.first?.id)

                            // Rows
                            ForEach(Array(section.notes.enumerated()), id: \.element.id) { index, note in
                                noteRow(note, nextNote: section.notes[safe: index + 1])
                            }
                        }
                    }
                    .padding(.bottom, 6)
                    .padding(.horizontal, 6)
                }
                .refreshable { await forceResync() }
            }
        }
        // Outer +8pt left/right inset around the entire note list column (header,
        // divider, section headers, rows) — on top of whatever horizontal padding each
        // child already has internally, which is untouched.
        .padding(.horizontal, 8)
    }

    // Pull-to-refresh (works as a Mac trackpad/mouse gesture too, since .refreshable
    // is cross-platform). AppState.syncNow(force:) is fire-and-forget (kicks off its
    // own Task internally) rather than async, so this just polls isSyncing to know
    // when to end the refresh spinner.
    private func forceResync() async {
        appState.syncNow(force: true)
        while appState.isSyncing {
            // Bail out if the refresh gesture's task is cancelled (view re-keyed,
            // navigation, etc.) — Task.sleep then throws immediately and try? swallows
            // it, which turned this loop into a hot spin on the main actor for the
            // rest of the sync.
            if Task.isCancelled { return }
            try? await Task.sleep(nanoseconds: 100_000_000)
        }
    }

    // Shared row builder used in both flat and grouped lists. `nextNote` is
    // whichever note is displayed directly below this one (nil at the end of
    // a list/section) — needed so the trailing divider, which sits physically
    // between this row and the next, can be hidden if either neighbor is the
    // selected note. Otherwise the divider would draw straight across the
    // selected row's rounded, inset highlight background.
    // Section header (e.g. "Today", "Yesterday", "Pinned") — title first, then a
    // divider below it separating the header from its rows. Title and divider are
    // both inset 10pt here on top of the container's own 6pt horizontal padding, for
    // the same 16pt-from-the-view's-edge inset the note rows/dividers use (see noteRow
    // below), so they line up with note titles. Header size is 13pt (note row title)
    // x 1.2 per the yellow-palette-era spec.
    @ViewBuilder
    private func sectionHeader(_ title: String, firstNoteID: String? = nil) -> some View {
        Text(title)
            .font(.system(size: 15.6, weight: .semibold))
            .foregroundStyle(.primary)
            .padding(.horizontal, 10)
            .padding(.top, 32)
            .padding(.bottom, 12)
        // Same visual-conflict-with-selection fix as the row dividers (noteRow below):
        // hidden via opacity (never conditionally removed, to avoid a layout jump) when
        // the section's first note is the selected one, since that note's own selection
        // background would otherwise sit right up against this divider.
        Divider()
            .opacity(firstNoteID != nil && appState.selectedNoteID == firstNoteID ? 0 : 1)
            .padding(.leading, 10)
    }

    @ViewBuilder
    private func noteRow(_ note: Note, nextNote: Note?) -> some View {
        NoteRowView(note: note, dateString: rowDate(note))
            .onTapGesture { appState.selectNote(note) }
            .contextMenu {
                if appState.isTrashSelected {
                    Button("Restore") { appState.restoreNote(note) }
                    Button("Delete Permanently", role: .destructive) { appState.permanentlyDeleteNote(note) }
                } else {
                    Button(note.isPinned ? "Unpin Note" : "Pin Note") { appState.togglePin(note) }
                    Button("Delete Note", role: .destructive) { appState.deleteNote(note) }
                }
            }

        // Always rendered (never conditionally included) so its layout footprint
        // never changes — conditionally adding/removing the Divider() itself
        // shifted every row below by its height, making row text visibly jump
        // by ~1px whenever selection changed. Made invisible instead via
        // opacity when either neighboring row is selected.
        //
        // The divider sits in the same LazyVStack as the rows, so it already gets the
        // container's 6pt horizontal padding. The text block's left edge is now at
        // 6 (container) + 10 (NoteRowView's own row padding) + 16 (the text block's
        // own padding) = 32pt from the list edge, so the divider needs 26pt leading
        // here (6 + 26 = 32) to line up with it. Trailing stays at the row's original
        // 10pt, matching the row's own right inset (not the text block, which doesn't
        // border the row's trailing edge — the thumbnail can sit there instead).
        Divider()
            .padding(.leading, 26)
            .padding(.trailing, 10)
            .opacity(appState.selectedNoteID != note.id && appState.selectedNoteID != nextNote?.id ? 1 : 0)
    }

    @ViewBuilder
    private func trashedFolderRow(_ folder: Folder) -> some View {
        Text(folder.title)
            .font(.system(size: 13, weight: .semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
            .contextMenu {
                Button("Restore") { appState.restoreFolder(folder) }
                Button("Delete Permanently", role: .destructive) { appState.permanentlyDeleteFolder(folder) }
            }
    }

    private var navigationTitle: String {
        if appState.isTrashSelected { return "Trash" }
        if !appState.searchText.isEmpty { return "Search Results" }
        return appState.selectedFolder?.title ?? "All Notes"
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: appState.searchText.isEmpty ? "note.text" : "magnifyingglass")
                .font(.system(size: 40))
                .foregroundStyle(.quaternary)
            Text(appState.searchText.isEmpty ? (appState.isTrashSelected ? "Trash Is Empty" : "No Notes") : "No Results")
                .font(.headline)
                .foregroundStyle(.secondary)
            if appState.searchText.isEmpty && !appState.isTrashSelected {
                Button("Create a Note") { appState.createNote() }
                    .buttonStyle(.borderedProminent)
                    .tint(Color.secondary)
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
    @Environment(\.colorScheme) private var colorScheme

    let note: Note
    let dateString: String
    // The text block gets 16pt more than the thumbnail's implicit inset (just the
    // row's own outer 10pt padding below), intentionally — see the divider math in
    // NoteListView's noteRow(_:nextNote:).
    var textHorizontalPadding: CGFloat = 16

    private var isSelected: Bool { appState.selectedNoteID == note.id }

    // Mirrors Apple Notes' list row thumbnail — square, rounded, first image only.
    // Size/corner radius match Android's NoteRow thumbnail (56.dp / 14.dp) so the same
    // note looks the same across both apps.
    private var thumbnailURL: URL? {
        note.firstImageResourceId.flatMap { DatabaseManager.shared.resourceLocalFileURL(id: $0) }
    }

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {

                // Line 1 — title
                HStack(spacing: 4) {
                    if note.isTodo {
                        Image(systemName: note.todoCompleted ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(note.todoCompleted ? Color.orange : Color.secondary)
                            .font(.system(size: 13))
                    }
                    Text(searchHighlighted(note.title.isEmpty ? "Untitled" : note.title, query: appState.searchText, scheme: colorScheme))
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                }

                // Line 2 — timestamp (same color as the title) + preview (gray).
                // In search results the matched text in the preview is highlighted
                // (appState.searchText is only non-empty while a search is active, so
                // this is a no-op for the normal grouped list).
                Group {
                    if note.preview.isEmpty {
                        Text(dateString)
                    } else {
                        Text(dateString) + Text(searchHighlighted("  \(note.preview)", query: appState.searchText, scheme: colorScheme)).foregroundStyle(.secondary)
                    }
                }
                .font(.system(size: 12))
                .foregroundStyle(.primary)
                .lineLimit(1)
                .truncationMode(.tail)
            }
            // Padding around just the title/metadata/preview text block — horizontal
            // only (top/bottom untouched). The thumbnail and the row's own outer padding
            // (below) are untouched, so the divider and selection background positions/
            // sizing logic stay as they were.
            .padding(.horizontal, textHorizontalPadding)
            .frame(maxWidth: .infinity, alignment: .leading)

            if let thumbnailURL {
                AsyncImage(url: thumbnailURL) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color.clear
                }
                .frame(width: 44, height: 44)
                .clipShape(RoundedRectangle(cornerRadius: 7))
                // Row's own shared vertical padding (below, on the whole HStack) is 8pt —
                // this -2pt counters 2 of those 8, netting a 6pt effective gap for the
                // thumbnail specifically, without touching the text block's 8pt.
                .padding(.vertical, -2)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(
                    isSelected ? (appState.isSidebarFocused ? AppColors.noteRowSelectedActiveBackground(colorScheme) : AppColors.noteRowSelectedInactiveBackground(colorScheme)) : Color.clear
                )
        )
    }
}

#Preview {
    NoteListView()
        .environmentObject(AppState())
}

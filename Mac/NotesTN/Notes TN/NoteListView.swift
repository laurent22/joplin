import SwiftUI
import UIKit

// iOS/iPadOS-only. Duplicated from the Mac target's NoteListView.swift (same pattern
// already used for EditorView.swift) so iPhone/iPad note-list behavior can diverge
// from Mac's without #if os(...) branching in a shared file.

// Used to look up the note displayed right after a given one (for divider
// hiding around the selected row — see noteRow's `nextNote` param) without an
// out-of-bounds crash at the end of a list.
private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

private extension View {
    // iPad's note list is a List(selection:) now (see mainContent) purely so
    // NavigationSplitView can push to the editor column when the window is
    // narrowed and the columns collapse — the same mechanism iPhone's
    // phoneNoteList already relies on. This strips List's own chrome (insets,
    // separator, tap-highlight background) off each row so the existing
    // hand-built row/divider/section-header look (noteRow, sectionHeader,
    // trashedFolderRow below) renders unchanged.
    func plainListRow() -> some View {
        listRowInsets(EdgeInsets())
            .listRowSeparator(.hidden)
            .listRowBackground(Color.clear)
    }
}

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
            return phoneMonthFormatter.string(from: date)
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
// a measurable slice of the list's lag. Same fix as Mac's NoteListView.swift.
// (phone-prefixed so they don't collide with PadNoteListView.swift's copies — both
// files compile into the same iOS target at file scope.)
private let phoneMonthFormatter: DateFormatter = {
    let f = DateFormatter(); f.dateFormat = "MMMM"; return f
}()
private let phoneTimeFormatter: DateFormatter = {
    let f = DateFormatter(); f.dateFormat = "HH:mm"; return f
}()
private let phoneWeekdayFormatter: DateFormatter = {
    let f = DateFormatter(); f.dateFormat = "EEEE"; return f
}()
private let phoneShortDateFormatter: DateFormatter = {
    let f = DateFormatter(); f.dateStyle = .short; f.timeStyle = .none; return f
}()

private func rowDate(_ note: Note) -> String {
    let cal = Calendar.current
    let d   = note.updatedTime
    if cal.isDateInToday(d) {
        return phoneTimeFormatter.string(from: d)
    }
    if cal.isDateInYesterday(d) { return "Yesterday" }
    let days = cal.dateComponents([.day], from: d, to: Date()).day ?? 0
    if days < 7 {
        return phoneWeekdayFormatter.string(from: d)   // "Monday"
    }
    // Older: show short date
    return phoneShortDateFormatter.string(from: d)
}

// MARK: - Main view

struct NoteListView: View {
    @EnvironmentObject var appState: AppState
    @State private var showEmptyTrashConfirm = false

    // iPhone gets its own bottom search bar with a "New Note" button next to it (see
    // phoneSearchBar). iPad's search field lives in EditorView.swift instead (see
    // tabletSearchField there) — NavigationSplitView keeps each column's toolbar
    // items above that column's own space, and this app's 3-column layout doesn't
    // reliably dock a .searchable(placement: .toolbar) attached here into the
    // toolbar at all (it silently rendered inline under the title instead).
    // Checked via UIDevice's idiom (not horizontalSizeClass) since the requirement
    // is specifically "iPhone", not "any compact width" (e.g. iPad Split View).
    private var isPhoneIdiom: Bool { UIDevice.current.userInterfaceIdiom == .phone }
    @FocusState private var isPhoneSearchFocused: Bool

    // NavigationSplitView only auto-pushes from the note-list column to the editor
    // column on iPhone's compact layout when that column is backed by a List with a
    // selection: binding (same mechanism as SidebarView's sidebarSelectionIOS) — the
    // plain ScrollView/LazyVStack used on iPad has no such binding, which is why
    // tapping a note there never advanced to the editor. iPhone gets its own List-backed
    // row rendering (see noteRowPhone/mainContent) driven by this binding; iPad's
    // ScrollView rendering is untouched.
    private var noteSelectionIOS: Binding<String?> {
        Binding<String?>(
            get: { appState.selectedNoteID },
            set: { newValue in
                guard let id = newValue, let note = displayedNotes.first(where: { $0.id == id }) else {
                    appState.selectNote(nil)
                    return
                }
                appState.selectNote(note)
            }
        )
    }

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

    // Shared toolbar content. iPad's New Note button lives in EditorView.swift's own
    // toolbar (detail column) — NavigationSplitView renders each column's toolbar
    // items above that column's own space, and the red-boxed mockup wants both the
    // search field and New Note together above the editor pane, at the trailing
    // edge, not above the note list.
    @ToolbarContentBuilder
    private var noteListToolbarContent: some ToolbarContent {
        ToolbarItem(placement: .primaryAction) {
            if appState.isTrashSelected && (!appState.trashedNotes.isEmpty || !appState.trashedFolders.isEmpty) {
                Button("Empty Trash", role: .destructive) { showEmptyTrashConfirm = true }
            }
            // else: nothing — New Note button comes from EditorView.swift's own
            // toolbar on both iPhone and iPad now.
        }
    }

    var body: some View {
        Group {
            if isPhoneIdiom {
                mainContent
                    .safeAreaInset(edge: .bottom) { phoneSearchBar }
                    .toolbar { noteListToolbarContent }
            } else {
                // iPad: search field lives in EditorView.swift now (see
                // tabletSearchField there).
                mainContent
                    .toolbar { noteListToolbarContent }
            }
        }
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
            // iPad's own search field lives in EditorView.swift, which has its own
            // identical onChange handler for isTabletSearchFocused.
            guard focused, isPhoneIdiom else { return }
            isPhoneSearchFocused = true
            appState.isFocusingSearch = false
        }
    }

    // The header/divider/note-list column, shared by both the phone and iPad
    // layouts above — only how search + "New Note" are presented around it differs.
    private var mainContent: some View {
        VStack(spacing: 0) {

            // MARK: Header — just the note count. The title itself (e.g. "All Notes")
            // is skipped here on both iPhone and iPad — the nav bar already shows it
            // (see .navigationTitle below), so rendering it again here was a duplicate.
            VStack(alignment: .leading, spacing: 2) {
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
            } else if isPhoneIdiom {
                phoneNoteList
            } else if !appState.searchText.isEmpty {
                // Flat list for search results — List(selection:) instead of
                // ScrollView/LazyVStack (see noteSelectionIOS/plainListRow above) so
                // NavigationSplitView can push to the editor column when this app's
                // window is narrowed on iPad and the columns collapse. Visuals are
                // unchanged; List's own chrome is stripped per-row.
                List(selection: noteSelectionIOS) {
                    ForEach(Array(displayedNotes.enumerated()), id: \.element.id) { index, note in
                        noteRow(note, nextNote: displayedNotes[safe: index + 1])
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .padding(.horizontal, 6)
                .refreshable { await forceResync() }
            } else {
                // Grouped list — same List(selection:) treatment as above.
                List(selection: noteSelectionIOS) {
                    if !pinnedNotes.isEmpty {
                        sectionHeader("Pinned", firstNoteID: pinnedNotes.first?.id)
                        ForEach(Array(pinnedNotes.enumerated()), id: \.element.id) { index, note in
                            noteRow(note, nextNote: pinnedNotes[safe: index + 1])
                        }
                    }
                    if appState.isTrashSelected && !appState.trashedFolders.isEmpty {
                        sectionHeader("Notebooks")
                        ForEach(appState.trashedFolders) { folder in
                            trashedFolderRow(folder).plainListRow()
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
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .padding(.horizontal, 6)
                .refreshable { await forceResync() }
            }
        }
        // Outer +8pt left/right inset around the entire note list column (header,
        // divider, section headers, rows) — on top of whatever horizontal padding each
        // child already has internally, which is untouched. iPhone only: skipped, so
        // the insetGrouped list's own gray grouped background can extend to both
        // screen edges (the individual cards below still keep their own inset).
        .padding(.horizontal, isPhoneIdiom ? 0 : 8)
    }

    // Pull-to-refresh. AppState.syncNow(force:) is fire-and-forget (kicks off its own
    // Task internally) rather than async, so this just polls isSyncing to know when
    // to end the refresh spinner.
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

    // iPhone-only note list — a real List(selection:) (see noteSelectionIOS above),
    // needed so NavigationSplitView can push to the editor column on tap. iPad keeps
    // the existing custom ScrollView/LazyVStack rendering (ForEach branch above)
    // untouched. Visuals are simpler here (standard List separators/insets instead of
    // the custom dividers/selection background used elsewhere) — acceptable since the
    // immediate goal is restoring the ability to open a note at all on iPhone.
    @ViewBuilder
    private var phoneNoteList: some View {
        List(selection: noteSelectionIOS) {
            if !appState.searchText.isEmpty {
                ForEach(displayedNotes) { note in noteRowPhone(note) }
            } else {
                if !pinnedNotes.isEmpty {
                    Section("Pinned") {
                        ForEach(pinnedNotes) { note in noteRowPhone(note) }
                    }
                }
                if appState.isTrashSelected && !appState.trashedFolders.isEmpty {
                    Section("Notebooks") {
                        ForEach(appState.trashedFolders) { folder in trashedFolderRow(folder) }
                    }
                }
                ForEach(grouped, id: \.group) { section in
                    Section(section.group.title) {
                        ForEach(section.notes) { note in noteRowPhone(note) }
                    }
                }
            }
        }
        // .insetGrouped — iOS's native rounded-card-per-section list style — matches
        // Android's NoteListScreen.kt card-per-section look (Surface + RoundedCornerShape
        // per group) without needing to hand-build card backgrounds/corner shapes here.
        // iPad keeps the plain ScrollView rendering above, untouched. This whole
        // phoneNoteList view is only ever invoked when isPhoneIdiom is true.
        .listStyle(.insetGrouped)
        .refreshable { await forceResync() }
    }

    @ViewBuilder
    private func noteRowPhone(_ note: Note) -> some View {
        // textHorizontalPadding: 0 — equalizes the text block's left inset with the
        // thumbnail's (which only ever gets the row's own outer padding), per request.
        NoteRowView(note: note, dateString: rowDate(note), textHorizontalPadding: 0)
            .tag(note.id)
            .contextMenu {
                if appState.isTrashSelected {
                    Button("Restore") { appState.restoreNote(note) }
                    Button("Delete Permanently", role: .destructive) { appState.permanentlyDeleteNote(note) }
                } else {
                    Button(note.isPinned ? "Unpin Note" : "Pin Note") { appState.togglePin(note) }
                    Button("Delete Note", role: .destructive) { appState.deleteNote(note) }
                }
            }
    }

    // iPhone-only bottom bar: a custom search field (standing in for the native
    // .searchable field Mac/iPad use) plus a trailing button that's "New Note"
    // (square.and.pencil) while search is inactive, swapping to "Cancel" in the same
    // spot the moment the field gains focus or has text — mirroring where the native
    // search field's own Cancel button would sit, since .searchable's system-drawn
    // Cancel button can't be hooked into directly to place a custom control beside it.
    @ViewBuilder
    private var phoneSearchBar: some View {
        HStack(spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Search", text: Binding(get: { appState.searchText }, set: { appState.search($0) }))
                    .focused($isPhoneSearchFocused)
                    .submitLabel(.search)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color.gray.opacity(0.15), in: Capsule())

            if isPhoneSearchFocused || !appState.searchText.isEmpty {
                Button {
                    appState.search("")
                    isPhoneSearchFocused = false
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 15, weight: .semibold))
                        .frame(width: 44, height: 44)
                        .background(Color.gray.opacity(0.15), in: Circle())
                }
                .buttonStyle(.plain)
            } else {
                Button {
                    appState.createNote()
                } label: {
                    Image(systemName: "square.and.pencil")
                        .font(.system(size: 17, weight: .semibold))
                        .frame(width: 44, height: 44)
                        .background(Color.gray.opacity(0.15), in: Circle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
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
    // Wrapped in an explicit VStack (one List row instead of two bare sibling views)
    // — a bare Divider() placed directly as its own top-level row inside a List loses
    // the vertical-stack context it needs to know its own orientation, and renders as
    // a vertical line instead of a horizontal one. Nesting it in a VStack fixes that.
    private func sectionHeader(_ title: String, firstNoteID: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.system(size: 15.6, weight: .semibold))
                .foregroundStyle(.primary)
                .padding(.horizontal, 10)
                .padding(.top, 32)
                .padding(.bottom, 12)
            // Same visual-conflict-with-selection fix as the row dividers (noteRow
            // below): hidden via opacity (never conditionally removed, to avoid a
            // layout jump) when the section's first note is the selected one, since
            // that note's own selection background would otherwise sit right up
            // against this divider.
            Divider()
                .opacity(firstNoteID != nil && appState.selectedNoteID == firstNoteID ? 0 : 1)
                .padding(.leading, 10)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .plainListRow()
    }

    // Selection is now driven by List(selection: noteSelectionIOS) (see mainContent) —
    // the row's own onTapGesture from the pre-List ScrollView/LazyVStack days is gone;
    // .tag(note.id) is what tells the List which row a given selection value maps to.
    // Wrapped in a VStack (see sectionHeader's doc comment above) so the trailing
    // Divider renders horizontally instead of vertical.
    private func noteRow(_ note: Note, nextNote: Note?) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            NoteRowView(note: note, dateString: rowDate(note))
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
            // The divider sits in the same container as the row, so it already gets
            // the container's 6pt horizontal padding. The text block's left edge is
            // now at 6 (container) + 10 (NoteRowView's own row padding) + 16 (the text
            // block's own padding) = 32pt from the list edge, so the divider needs
            // 26pt leading here (6 + 26 = 32) to line up with it. Trailing stays at
            // the row's original 10pt, matching the row's own right inset (not the
            // text block, which doesn't border the row's trailing edge — the
            // thumbnail can sit there instead).
            Divider()
                .padding(.leading, 26)
                .padding(.trailing, 10)
                .opacity(appState.selectedNoteID != note.id && appState.selectedNoteID != nextNote?.id ? 1 : 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .tag(note.id)
        .plainListRow()
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
    // iPad/Mac (default 16): the text block gets 16pt more than the thumbnail's
    // implicit inset (just the row's own outer 10pt padding below), intentionally —
    // see the divider math in NoteListView's noteRow(_:nextNote:). iPhone's
    // noteRowPhone passes 0 instead, so the text lines up with the thumbnail's edge
    // (equal left/right padding), since that card layout has no such divider to align.
    var textHorizontalPadding: CGFloat = 16

    private var isSelected: Bool { appState.selectedNoteID == note.id }

    // iPad only — keep the selected row in the "active" dark-yellow/white look at all
    // times, instead of dimming to gray once focus leaves the sidebar (which is what
    // happens on Mac, and what happened here too before this: tapping into a note to
    // edit moves focus to the editor, appState.isSidebarFocused becomes false, and the
    // row fell back to noteRowSelectedInactiveBackground).
    private var isPadIdiom: Bool { UIDevice.current.userInterfaceIdiom == .pad }
    private var isActiveHighlighted: Bool { isPadIdiom && isSelected }

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
                        .foregroundStyle(isActiveHighlighted ? .white : .primary)
                        .lineLimit(1)
                }

                // Line 2 — timestamp (same color as the title) + preview (gray, unless
                // isActiveHighlighted — see isPadIdiom above — in which case both go
                // white for contrast against the vivid-yellow background). In search
                // results the matched preview text is highlighted (searchText is only
                // non-empty while searching, so this is a no-op otherwise).
                Group {
                    if note.preview.isEmpty {
                        Text(dateString)
                    } else {
                        Text(dateString) + Text(searchHighlighted("  \(note.preview)", query: appState.searchText, scheme: colorScheme)).foregroundStyle(isActiveHighlighted ? .white : .secondary)
                    }
                }
                .font(.system(size: 12))
                .foregroundStyle(isActiveHighlighted ? .white : .primary)
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
                // ThumbnailImage (not AsyncImage) — decodes straight to thumbnail
                // size on a background queue and caches the result; AsyncImage
                // decoded the full-size original per row, per scroll-in, with no
                // caching for file:// URLs. See ThumbnailImage.swift.
                ThumbnailImage(url: thumbnailURL)
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
                    isActiveHighlighted
                        ? AppColors.vividYellow
                        : (isSelected ? (appState.isSidebarFocused ? AppColors.noteRowSelectedActiveBackground(colorScheme) : AppColors.noteRowSelectedInactiveBackground(colorScheme)) : Color.clear)
                )
        )
    }
}

#Preview {
    NoteListView()
        .environmentObject(AppState())
}

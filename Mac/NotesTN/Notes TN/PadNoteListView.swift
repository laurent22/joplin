import SwiftUI

// iPad-only. Fresh rebuild (per request). Date-grouping logic (NoteGroup/group(for:)/
// rowDate) ported from Mac's NoteListView.swift for the same section titles/ordering
// (Today/Yesterday/Previous 7 Days/Previous 30 Days/month/year) — duplicated here
// rather than shared, per the "no shared view code between iPhone/iPad" direction.
// .listStyle(.plain) + native Section headers gives flat rows with default
// separators/dividers between them (like Mac), not iPhone's card-per-section
// .insetGrouped look.
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
            return padMonthFormatter.string(from: date)
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
// (pad-prefixed so they don't collide with NoteListView.swift's copies — both files
// compile into the same iOS target at file scope.)
private let padMonthFormatter: DateFormatter = {
    let f = DateFormatter(); f.dateFormat = "MMMM"; return f
}()
private let padTimeFormatter: DateFormatter = {
    let f = DateFormatter(); f.dateFormat = "HH:mm"; return f
}()
private let padWeekdayFormatter: DateFormatter = {
    let f = DateFormatter(); f.dateFormat = "EEEE"; return f
}()
private let padShortDateFormatter: DateFormatter = {
    let f = DateFormatter(); f.dateStyle = .short; f.timeStyle = .none; return f
}()

private func rowDate(_ note: Note) -> String {
    let cal = Calendar.current
    let d   = note.updatedTime
    if cal.isDateInToday(d) {
        return padTimeFormatter.string(from: d)
    }
    if cal.isDateInYesterday(d) { return "Yesterday" }
    let days = cal.dateComponents([.day], from: d, to: Date()).day ?? 0
    if days < 7 {
        return padWeekdayFormatter.string(from: d)   // "Monday"
    }
    // Older: show short date
    return padShortDateFormatter.string(from: d)
}

struct PadNoteListView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.colorScheme) private var colorScheme
    // Passed down from PadContentView (read above NavigationSplitView there) rather
    // than read locally via @Environment here — this column's own width is narrow
    // even when all 3 columns are visible on a full-size iPad, so a local read
    // always reported .compact regardless of the actual window size.
    var windowSizeClass: UserInterfaceSizeClass?

    private var displayedNotes: [Note] {
        appState.isTrashSelected ? appState.trashedNotes : appState.notes
    }

    // Pinning only applies to live notes — pulled out of their date group into their
    // own section (first, like Apple Notes) so a note doesn't appear twice.
    private var pinnedNotes: [Note] {
        guard !appState.isTrashSelected else { return [] }
        return displayedNotes.filter { $0.isPinned }.sorted { $0.updatedTime > $1.updatedTime }
    }

    private var grouped: [(group: NoteGroup, notes: [Note])] {
        let unpinned = appState.isTrashSelected ? displayedNotes : displayedNotes.filter { !$0.isPinned }
        let byGroup = Dictionary(grouping: unpinned, by: { group(for: $0) })
        return byGroup
            .sorted { a, b in
                if a.key.order != b.key.order { return a.key.order < b.key.order }
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

    // Binding<String?> — same reasoning as PadSidebarView's selection: the optional
    // overload is what NavigationSplitView needs to push the detail column forward
    // on tap when columns are collapsed.
    private var selection: Binding<String?> {
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

    private var navigationTitle: String {
        if appState.isTrashSelected { return "Trash" }
        return appState.selectedFolder?.title ?? "All Notes"
    }

    // Section headers ("Today", "Pinned", etc.) — matches the note title's style/color
    // (system default Section headers are small and gray) but 2pt bigger: .headline
    // resolves to 17pt semibold, so this is 19pt semibold, .primary instead of gray.
    // A divider now sits right below the title, same edge-to-edge/default position as
    // the first note row's own divider (see noteRow's isFirstInSection).
    private func sectionHeader(_ title: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 19, weight: .semibold))
                // .foregroundStyle(.primary) alone wasn't enough — List section headers
                // apply their own muted/secondary tint by default that can override it;
                // .foregroundColor + .textCase(nil) (no forced uppercasing) reliably wins.
                .foregroundColor(.primary)
                .textCase(nil)
            Divider()
        }
    }

    // Row text/dividers sit 16px to the right of the section title's own leading
    // edge (the title's default List-header inset renders at ~16px already, so rows
    // need 32px total to read as 16px further indented than it) — except the
    // section's first divider, which keeps its default, edge-to-edge position per
    // earlier request. .listRowInsets alone didn't visibly move the system-drawn
    // separator here, so the system separator is hidden entirely and a manual
    // Divider is drawn instead, giving direct control over its inset.
    private let rowIndent: CGFloat = 32

    // Mirrors Apple Notes' list row thumbnail — square, rounded, first image only.
    // Same 44x44 / 7pt-corner-radius as Mac's NoteListView.swift (NoteRowView), so a
    // note looks the same across platforms. Uses DatabaseManager.resourceLocalFileURL
    // (a plain file:// URL for AsyncImage/URLSession, which reads via the app's own
    // process-level sandbox access — NOT the WKWebView-only restriction that needed
    // the notestn:// scheme handler for in-editor images) rather than
    // resourceLocalUrl, so this didn't need any of that fix to already work.
    private func thumbnailURL(for note: Note) -> URL? {
        note.firstImageResourceId.flatMap { DatabaseManager.shared.resourceLocalFileURL(id: $0) }
    }

    // Hides a row's own divider (drawn at its bottom, which visually also serves as
    // the row below it's top divider) when either this row or the next row is
    // selected — otherwise the divider would visibly cut across the yellow
    // selection highlight or the highlight of the row right after it.
    @ViewBuilder
    private func noteRow(_ note: Note, nextNoteIsSelected: Bool = false) -> some View {
        let isSelected = appState.selectedNoteID == note.id
        let hideDivider = isSelected || nextNoteIsSelected
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center, spacing: 12) {
                VStack(alignment: .leading) {
                    Text(searchHighlighted(note.title.isEmpty ? "Untitled" : note.title, query: appState.searchText, scheme: colorScheme))
                        .font(.headline)
                        .foregroundStyle(.primary)
                    // Timestamp matches the title's color; preview keeps its own
                    // (unchanged) secondary color — set per-segment since they're
                    // concatenated into one Text. In search results the matched preview
                    // text is highlighted (searchText is only non-empty while searching).
                    Group {
                        if note.preview.isEmpty {
                            Text(rowDate(note))
                                .foregroundColor(.primary)
                        } else {
                            Text(rowDate(note))
                                .foregroundColor(.primary)
                            + Text(searchHighlighted("  \(note.preview)", query: appState.searchText, scheme: colorScheme))
                                .foregroundColor(.secondary)
                        }
                    }
                    .font(.subheadline)
                    .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                if let thumbnailURL = thumbnailURL(for: note) {
                    // ThumbnailImage (not AsyncImage) — decodes straight to thumbnail
                    // size on a background queue and caches the result; AsyncImage
                    // decoded the full-size original per row, per scroll-in, with no
                    // caching for file:// URLs. See ThumbnailImage.swift.
                    ThumbnailImage(url: thumbnailURL)
                        .frame(width: 44, height: 44)
                        .clipShape(RoundedRectangle(cornerRadius: 7))
                }
            }
            .padding(.leading, rowIndent)
            .padding(.trailing, 16)
            .padding(.vertical, 8)

            // Every row's divider — 32px leading, 16px trailing, matching the row
            // text's own padding above. Fully transparent when it would touch a
            // selected cell (this row or the next one).
            Divider()
                .padding(.leading, rowIndent)
                .padding(.trailing, 16)
                .opacity(hideDivider ? 0 : 1)
        }
        .tag(note.id)
        .listRowInsets(EdgeInsets())
        .listRowSeparator(.hidden)
        // Dark yellow instead of the system's default gray/blue selection tint, per
        // request — .listRowBackground replaces the row's default (including its
        // selected-state) background entirely. Rounded via a shape (16px) instead of
        // a plain Color, with a little horizontal inset so the corners are visible
        // rather than clipped by the list's own edge.
        .listRowBackground(
            RoundedRectangle(cornerRadius: 16)
                .fill(isSelected ? AppColors.noteRowSelectedActiveBackground(colorScheme) : Color.clear)
                .padding(.horizontal, 8)
        )
        .disablingCellFocusRing()
        // Long press — Pin/Unpin + Delete (or, when viewing Trash, Restore/Delete
        // Permanently instead).
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

    var body: some View {
        if windowSizeClass == .compact {
            list
                // Only when the split view has collapsed to a single visible column
                // (Split View / Slide Over, or a portrait compact-width iPad) — in
                // that mode the editor column (which normally hosts search) isn't
                // reachable while browsing the list, so this is the only place a
                // search field can live.
                .searchable(
                    text: Binding(get: { appState.searchText }, set: { appState.search($0) }),
                    placement: .toolbar,
                    prompt: "Search"
                )
                // Enter key — opens/previews the first result. Typing alone (the
                // binding above) only re-filters the list now.
                .onSubmit(of: .search) {
                    appState.submitSearch()
                }
        } else {
            list
        }
    }

    private var list: some View {
        List(selection: selection) {
            // Note count — a subtitle under the current notebook's nav title, not a
            // real row, so no separators above/below it and not selectable/tappable
            // like the real rows below it.
            Text("\(displayedNotes.count) note\(displayedNotes.count == 1 ? "" : "s")")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .selectionDisabled()
                .listRowSeparator(.hidden)

            if !pinnedNotes.isEmpty {
                Section {
                    ForEach(Array(pinnedNotes.enumerated()), id: \.element.id) { index, note in
                        let nextIsSelected = index + 1 < pinnedNotes.count
                            && appState.selectedNoteID == pinnedNotes[index + 1].id
                        noteRow(note, nextNoteIsSelected: nextIsSelected)
                    }
                } header: {
                    sectionHeader("Pinned")
                }
            }
            if appState.isTrashSelected && !appState.trashedFolders.isEmpty {
                Section {
                    ForEach(appState.trashedFolders) { folder in
                        Text(folder.title)
                    }
                } header: {
                    sectionHeader("Notebooks")
                }
            }
            ForEach(grouped, id: \.group) { section in
                Section {
                    ForEach(Array(section.notes.enumerated()), id: \.element.id) { index, note in
                        let nextIsSelected = index + 1 < section.notes.count
                            && appState.selectedNoteID == section.notes[index + 1].id
                        noteRow(note, nextNoteIsSelected: nextIsSelected)
                    }
                } header: {
                    sectionHeader(section.group.title)
                }
            }
        }
        .listStyle(.plain)
        .navigationTitle(navigationTitle)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    appState.createNote()
                } label: {
                    Image(systemName: "square.and.pencil")
                }
            }
        }
        // Pull-to-refresh — a normal incremental sync (force: false), not a full
        // resync. syncNow(force: true) resets the delta cursor and re-pulls/
        // overwrites everything from scratch (same heavy operation as the "Force
        // Resync" menu item) — too much for a quick pull-to-refresh, which should
        // just check for and apply whatever changed since the last sync.
        // syncNow(force:) is fire-and-forget, so this just polls isSyncing to know
        // when to end the pull-to-refresh spinner.
        .refreshable {
            await checkForUpdates()
        }
    }

    private func checkForUpdates() async {
        appState.syncNow()
        while appState.isSyncing {
            // Bail out if the refresh gesture's task is cancelled (view re-keyed,
            // navigation, etc.) — Task.sleep then throws immediately and try? swallows
            // it, which turned this loop into a hot spin on the main actor for the
            // rest of the sync.
            if Task.isCancelled { return }
            try? await Task.sleep(nanoseconds: 100_000_000)
        }
    }
}

#Preview {
    PadNoteListView()
        .environmentObject(AppState())
}

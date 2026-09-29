import SwiftUI
#if os(macOS)
import AppKit
#else
import UIKit
#endif
import Combine

@MainActor
final class AppState: ObservableObject {

    // MARK: - Published state

    @Published var folders: [Folder] = []
    @Published var notes: [Note] = []
    @Published var trashedNotes: [Note] = []
    @Published var trashedFolders: [Folder] = []
    @Published var isTrashSelected: Bool = false
    @Published var selectedFolderID: String? = nil     // nil = "All Notes"
    @Published var selectedNoteID: String? = nil
    // Set by createNote to the new note's id, cleared by consumePendingFocus once the
    // editor has taken the cursor. A new note is the one case where the editor should
    // grab focus on Mac without the user clicking into it.
    @Published var pendingFocusNoteID: String? = nil
    // True while the sidebar (notebooks list) has keyboard focus. Read by the iOS
    // note list; the Mac note list tracks its own focus.
    @Published var isSidebarFocused: Bool = false
    @Published var searchText: String = ""
    // The query the current `notes` were fetched for ("" when not searching). The Mac
    // list opens the first result whenever it changes.
    @Published private(set) var searchResultsQuery = ""
    @Published var isFocusingSearch: Bool = false
    @Published var isShowingJoplinLogin: Bool = false
    @Published private(set) var isSyncing: Bool = false
    // Kept across launches so Settings can still say the last sync failed.
    @Published var syncError: String? = UserDefaults.standard.string(forKey: "lastSyncError")
    @Published private(set) var lastSyncDate: Date? = UserDefaults.standard.object(forKey: "lastSyncDate") as? Date
    @Published var isConfirmingLogout = false
    @Published var isConfirmingForceResync = false
    @Published var isShowingNewNotebook = false
    @Published var sidebarVisibility: NavigationSplitViewVisibility = .all
    @Published var isToolbarHidden = false

    // MARK: - Derived

    var selectedNote: Note? {
        notes.first { $0.id == selectedNoteID } ?? trashedNotes.first { $0.id == selectedNoteID }
    }

    var selectedFolder: Folder? {
        folders.first { $0.id == selectedFolderID }
    }

    private let db = DatabaseManager.shared
    private let selectedNoteKey = "lastSelectedNoteID"
    private let selectedFolderKey = "lastSelectedFolderID"
    private let isTrashSelectedKey = "lastIsTrashSelected"
    private let syncEngine = JoplinSyncEngine()
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Init

    init() {
        loadAll()
        restoreFolderSelection()
        restoreSelection()
        purgeExpiredTrash()
        loadAll()

        // Fires once immediately with whatever account state already exists (so an
        // already-logged-in user gets synced on launch), and again any time a login
        // happens later — JoplinAccountStore is a singleton, so this sees every login
        // regardless of where it happened.
        JoplinAccountStore.shared.$account
            .sink { [weak self] account in
                if account != nil { self?.syncNow() }
            }
            .store(in: &cancellables)

        // Joplin Cloud sessions are fixed at 12 hours with no renewal (see
        // SessionModel.ts server-side) — re-checking on resume gives a session that
        // died while the app was backgrounded a chance to be silently replaced (see
        // syncNow's .unauthorized handling) before the user notices.
        #if os(macOS)
        let didBecomeActiveNotification = NSApplication.didBecomeActiveNotification
        #else
        let didBecomeActiveNotification = UIApplication.didBecomeActiveNotification
        #endif
        NotificationCenter.default.publisher(for: didBecomeActiveNotification)
            .sink { [weak self] _ in
                guard JoplinAccountStore.shared.account != nil else { return }
                self?.syncNow()
            }
            .store(in: &cancellables)

        #if os(macOS)
        // An attachment edited in its own app (Word, Preview, …) has been flagged for
        // re-upload — see AttachmentEditWatcher. Reload so the corrected card size
        // shows, then push the new bytes.
        NotificationCenter.default.publisher(for: AttachmentEditWatcher.didDetectEdit)
            .sink { [weak self] _ in
                self?.loadAll()
                self?.syncNow()
            }
            .store(in: &cancellables)
        #endif
    }

    // MARK: - Joplin Cloud sync (pull + push, see JoplinSyncEngine)

    // Set when syncNow() is called while a sync is already running (e.g. the
    // debounced push after an edit lands mid pull-to-refresh) — without this, that
    // call used to just no-op and the edit's dirty note/resource would sit unpushed
    // until something else happened to trigger another sync. Rerun once the current
    // sync finishes instead of dropping it.
    private var syncRerunRequested = false
    private var syncRerunForce = false

    func syncNow(force: Bool = false) {
        guard !isSyncing else {
            syncRerunRequested = true
            syncRerunForce = syncRerunForce || force
            return
        }
        guard let account = JoplinAccountStore.shared.account else {
            syncError = "Not logged in to Joplin Cloud."
            return
        }
        isSyncing = true
        syncError = nil
        Task {
            await runSync(account: account, force: force, allowRelogin: true)
            // Logged out while this ran: its cursor and status belong to the old account.
            guard JoplinAccountStore.shared.account != nil else {
                isSyncing = false
                syncRerunRequested = false
                resetSyncStatus()
                return
            }
            isSyncing = false
            lastSyncDate = Date()
            UserDefaults.standard.set(lastSyncDate, forKey: "lastSyncDate")
            UserDefaults.standard.set(syncError, forKey: "lastSyncError")
            if syncRerunRequested {
                syncRerunRequested = false
                let force = syncRerunForce
                syncRerunForce = false
                // A logout during the sync cancels the queued rerun.
                if JoplinAccountStore.shared.account != nil { syncNow(force: force) }
            }
        }
    }

    /// Split out from syncNow so a `.unauthorized` outcome can trigger one silent
    /// re-login + retry (allowRelogin guards against looping if the fresh session is
    /// somehow also rejected — e.g. the password changed server-side since we last saved
    /// it). Joplin Cloud sessions are fixed at 12 hours with no renewal, so this is the
    /// only way to recover without asking the user to type their password in again.
    private func runSync(account: JoplinAccount, force: Bool, allowRelogin: Bool) async {
        switch await syncEngine.sync(sessionId: account.sessionId, force: force) {
        case .success:
            loadAll()
        case .unauthorized:
            // Logged out mid-sync: don't log back in with the saved password.
            guard JoplinAccountStore.shared.account != nil else { return }
            guard allowRelogin else {
                syncError = "Your Joplin Cloud session expired. Log in again to keep syncing."
                return
            }
            switch await JoplinCloudApi.login(email: account.email, password: account.password) {
            case .success(let result):
                let refreshed = JoplinAccount(
                    email: account.email,
                    sessionId: result.sessionId,
                    userId: result.userId,
                    password: account.password
                )
                JoplinAccountStore.shared.save(refreshed)
                await runSync(account: refreshed, force: force, allowRelogin: false)
            case .failure:
                syncError = "Your Joplin Cloud session expired. Log in again to keep syncing."
            }
        case .failure(let message):
            syncError = message
        }
    }

    /// Log Out: forgets this account's sync position and status, so logging in to
    /// another account pulls its notes from the start.
    func resetSyncStatus() {
        syncError = nil
        lastSyncDate = nil
        for key in ["lastSyncError", "lastSyncDate", "joplin_sync_delta_cursor"] {
            UserDefaults.standard.removeObject(forKey: key)
        }
    }

    // MARK: - Push debounce

    private var pushDebounceTask: Task<Void, Never>?

    /// Schedules a push shortly after a local edit, mirroring the editor's own
    /// local-save debounce so we're not opening a network request on every keystroke.
    /// A no-op when logged out — otherwise every edit before ever logging in would
    /// surface a spurious "Not logged in" sync error.
    private func schedulePushDebounce() {
        guard JoplinAccountStore.shared.account != nil else { return }
        pushDebounceTask?.cancel()
        pushDebounceTask = Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            guard !Task.isCancelled else { return }
            // Re-checked after the sleep: a logout during the 2s window would
            // otherwise surface a spurious "Not logged in" sync error.
            guard JoplinAccountStore.shared.account != nil else { return }
            syncNow()
        }
    }

    // Restores the previously selected notebook/All Notes/Trash, so the app always
    // reopens on whatever view was active when it last quit. Called before
    // restoreSelection() so `notes`/`trashedNotes` are already scoped to the
    // restored folder by the time a note gets restored within it.
    private func restoreFolderSelection() {
        if UserDefaults.standard.bool(forKey: isTrashSelectedKey) {
            isTrashSelected = true
        } else if let saved = UserDefaults.standard.string(forKey: selectedFolderKey),
                  folders.contains(where: { $0.id == saved }) {
            selectedFolderID = saved
        }
        loadNotes()
    }

    // Restores the previously selected note, falling back to the first note.
    // Only called once at launch — subsequent loadNotes() calls leave selection intact.
    // Reads from trashedNotes instead of notes when restoreFolderSelection() (called
    // just before this) restored Trash as the active view, otherwise this could pick
    // a note from the wrong list and leave the note list/editor showing mismatched
    // content on launch.
    private func restoreSelection() {
        let candidates = isTrashSelected ? trashedNotes : notes
        guard !candidates.isEmpty else { return }
        let saved = UserDefaults.standard.string(forKey: selectedNoteKey)
        if let saved, candidates.contains(where: { $0.id == saved }) {
            selectedNoteID = saved
        } else {
            selectedNoteID = candidates.first?.id
        }
    }

    // MARK: - Load

    // Assignments below are gated behind an inequality check: loadAll() runs after
    // every sync (including the 2s-debounced push while typing), and re-assigning an
    // identical array still fires objectWillChange — re-rendering the entire window
    // (sidebar counts, every visible note row, editor chrome) for nothing.
    func loadAll() {
        let freshFolders = db.fetchFolders()
        if freshFolders != folders { folders = freshFolders }
        let freshTrashedFolders = db.fetchTrashedFolders()
        if freshTrashedFolders != trashedFolders { trashedFolders = freshTrashedFolders }
        loadNotes()
    }

    func loadNotes() {
        let freshNotes: [Note]
        if !searchText.isEmpty {
            freshNotes = db.searchNotes(query: searchText)
        } else {
            freshNotes = db.fetchNotes(folderId: selectedFolderID)
        }
        if freshNotes != notes { notes = freshNotes }
        if searchResultsQuery != searchText { searchResultsQuery = searchText }
        // Trashed notes are only visible while Trash is selected — skipping the fetch
        // otherwise avoids loading every trashed note's full body on every call (this
        // runs after each sync). selectTrash() re-runs loadNotes(), so the array is
        // always fresh by the time Trash is actually shown.
        if isTrashSelected {
            let freshTrashed = db.fetchTrashedNotes()
            if freshTrashed != trashedNotes { trashedNotes = freshTrashed }
        }
    }

    // MARK: - Folder actions

    func selectFolder(_ folder: Folder?) {
        isTrashSelected = false
        selectedFolderID = folder?.id
        selectedNoteID = nil
        // Persisted so the app reopens on this notebook/All Notes next launch —
        // see restoreFolderSelection().
        UserDefaults.standard.set(folder?.id, forKey: selectedFolderKey)
        UserDefaults.standard.set(false, forKey: isTrashSelectedKey)
        loadNotes()
    }

    func selectTrash() {
        // selectedFolderID is left untouched here — SidebarView routes the Trash row
        // through the same List(selection:) binding as every other row (via a sentinel
        // tag), so it's already been set correctly by the time this runs.
        isTrashSelected = true
        selectedNoteID = nil
        // Persisted so the app reopens in Trash next launch — see restoreFolderSelection().
        UserDefaults.standard.set(true, forKey: isTrashSelectedKey)
        // trashedNotes is only kept fresh while Trash is selected (see loadNotes) —
        // refresh it now that it's about to be shown.
        loadNotes()
    }

    func createFolder(title: String = "New Notebook") {
        let folder = Folder(title: title)
        // New folder, never seen by Joplin Cloud yet — dirty so it gets pushed, not
        // synced since the server doesn't know about it.
        db.saveFolder(folder, dirty: true, synced: false)
        loadAll()
        selectFolder(folder)
        schedulePushDebounce()
    }

    func renameFolder(_ folder: Folder, to title: String) {
        guard !title.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        var updated = folder
        updated.title = title
        updated.updatedTime = Date()
        // Preserve whatever synced state the folder already had — only is_dirty
        // changes here; INSERT OR REPLACE would otherwise reset is_synced to 0.
        db.saveFolder(updated, dirty: true, synced: db.folderSyncedFlag(id: folder.id))
        loadAll()
        schedulePushDebounce()
    }

    /// Soft delete: moves the notebook and every note inside it to Trash (matches real
    /// Joplin's own delete-to-trash behavior). Reversible via restoreFolder() until
    /// someone permanently deletes it, or 90 days pass (see purgeExpiredTrash()).
    func deleteFolder(_ folder: Folder) {
        let now = Date()
        var updated = folder
        updated.deletedTime = now
        updated.updatedTime = now
        db.saveFolder(updated, dirty: true, synced: db.folderSyncedFlag(id: folder.id))
        for note in db.fetchNotes(folderId: folder.id) {
            var updatedNote = note
            updatedNote.deletedTime = now
            updatedNote.updatedTime = now
            db.saveNote(updatedNote, dirty: true, synced: db.noteSyncedFlag(id: note.id))
        }
        if selectedFolderID == folder.id {
            selectedFolderID = nil
            selectedNoteID = nil
        }
        loadAll()
        schedulePushDebounce()
    }

    /// Un-trashes the notebook and every trashed note inside it.
    func restoreFolder(_ folder: Folder) {
        let now = Date()
        var updated = folder
        updated.deletedTime = nil
        updated.updatedTime = now
        db.saveFolder(updated, dirty: true, synced: db.folderSyncedFlag(id: folder.id))
        for note in db.fetchTrashedNotes().filter({ $0.folderId == folder.id }) {
            var updatedNote = note
            updatedNote.deletedTime = nil
            updatedNote.updatedTime = now
            db.saveNote(updatedNote, dirty: true, synced: db.noteSyncedFlag(id: note.id))
        }
        loadAll()
        schedulePushDebounce()
    }

    /// Unrecoverable: hard-deletes the notebook, every note inside it, and their
    /// resources, queuing remote deletes for anything Joplin Cloud already knew about.
    func permanentlyDeleteFolder(_ folder: Folder) {
        permanentlyDeleteFolderNow(folder)
        if selectedFolderID == folder.id {
            selectedFolderID = nil
            selectedNoteID = nil
        }
        loadAll()
        schedulePushDebounce()
    }

    // MARK: - Note actions

    func selectNote(_ note: Note?) {
        selectedNoteID = note?.id
        UserDefaults.standard.set(note?.id, forKey: selectedNoteKey)
    }

    func createNote() {
        // A new, empty note can't match the search, so it would never be shown. End
        // the search first, as Notes does.
        if !searchText.isEmpty {
            searchDebounceTask?.cancel()
            searchText = ""
        }
        // Joplin has no "notebook-less note" concept — every real client always
        // resolves to a concrete folder id before saving. A note pushed with
        // parent_id = "" (which is what "All Notes" selected means locally) doesn't
        // show up in Joplin's per-notebook views. Fall back to an existing folder, or
        // create one, rather than ever pushing an empty parent_id.
        let folderId = selectedFolderID ?? ensureAnyFolder()
        // No placeholder title: a new note opens empty, showing the editor's own
        // "Title" placeholder with the cursor already in it, so the first thing typed
        // is the title. The note list shows "Untitled" until there is one.
        let note = Note(
            folderId: folderId,
            title: "",
            body: ""
        )
        // New note, never seen by Joplin Cloud yet — dirty so it gets pushed, not
        // synced since the server doesn't know about it.
        db.saveNote(note, dirty: true, synced: false)
        loadAll()
        selectedNoteID = note.id
        UserDefaults.standard.set(note.id, forKey: selectedNoteKey)
        // Mac only: put the cursor in the new note's empty title. Opening an existing
        // note deliberately leaves focus where it was (usually the list, for arrow-key
        // browsing), so this is a one-shot signal rather than "focus on open". iOS and
        // iPadOS focus the editor whenever a note opens and ignore this.
        pendingFocusNoteID = note.id
        schedulePushDebounce()
    }

    /// True once, for the note this signal was raised for — see createNote.
    func consumePendingFocus(noteID: String) -> Bool {
        guard pendingFocusNoteID == noteID else { return false }
        pendingFocusNoteID = nil
        return true
    }

    /// Returns an existing folder's id, or creates a default one if there are none.
    private func ensureAnyFolder() -> String {
        if let existing = db.fetchFolders().first { return existing.id }
        let folder = Folder(title: "Notes")
        db.saveFolder(folder, dirty: true, synced: false)
        return folder.id
    }

    func saveNote(_ note: Note) {
        let previousBody = notes.first(where: { $0.id == note.id })?.body
        var updated = note
        updated.updatedTime = Date()
        // Preserve whatever synced state the note already had — only is_dirty changes
        // here; INSERT OR REPLACE would otherwise reset is_synced to 0.
        db.saveNote(updated, dirty: true, synced: db.noteSyncedFlag(id: note.id))
        // An image removed from the body (but the note itself kept) leaves an orphaned
        // resource behind — clean it up the same way a deleted note's resources are
        // cleaned up below. The regex scan runs over both full bodies, so the cheap
        // contains() pre-check skips it entirely for image-less notes — this runs on
        // every autosave tick (i.e. while typing).
        if let previousBody,
           previousBody.contains("data-resource-id") || updated.body.contains("data-resource-id") {
            unlinkRemovedResources(noteId: note.id, oldBody: previousBody, newBody: updated.body)
        }
        // Update the one changed row in place instead of re-fetching the whole folder
        // (which loaded every note's full body per keystroke, and also silently
        // replaced active search results with the unfiltered folder list). The list
        // deliberately keeps its current order while editing — it re-sorts by
        // updated_time on the next loadNotes() (folder switch, sync, launch), so the
        // row being edited doesn't jump to the top under the cursor mid-typing.
        if let idx = notes.firstIndex(where: { $0.id == updated.id }) {
            notes[idx] = updated
        } else if let idx = trashedNotes.firstIndex(where: { $0.id == updated.id }) {
            trashedNotes[idx] = updated
        } else {
            loadNotes()
        }
        schedulePushDebounce()
    }

    /// Soft delete: moves the note to Trash (matches real Joplin's own delete-to-trash
    /// behavior). Reversible via restoreNote() until someone permanently deletes it, or
    /// 90 days pass (see purgeExpiredTrash()). Resources are left alone — they're only
    /// cleaned up once the note is actually gone for good.
    func deleteNote(_ note: Note) {
        let now = Date()
        var updated = note
        updated.deletedTime = now
        updated.updatedTime = now
        db.saveNote(updated, dirty: true, synced: db.noteSyncedFlag(id: note.id))
        if selectedNoteID == note.id {
            selectedNoteID = nil
        }
        loadAll()
        schedulePushDebounce()
    }

    /// Un-trashes the note, leaving its notebook assignment untouched.
    func restoreNote(_ note: Note) {
        // The note leaves the Trash list, so it shouldn't stay open there.
        if isTrashSelected && selectedNoteID == note.id { selectedNoteID = nil }
        var updated = note
        updated.deletedTime = nil
        updated.updatedTime = Date()
        db.saveNote(updated, dirty: true, synced: db.noteSyncedFlag(id: note.id))
        loadAll()
        schedulePushDebounce()
    }

    /// Toggles the note's pinned state (see Note.isPinned's doc comment on how this
    /// syncs via application_data).
    func togglePin(_ note: Note) {
        var updated = note
        updated.isPinned.toggle()
        updated.updatedTime = Date()
        db.saveNote(updated, dirty: true, synced: db.noteSyncedFlag(id: note.id))
        loadAll()
        schedulePushDebounce()
    }

    /// Unrecoverable: hard-deletes the note and cleans up any resources it referenced
    /// that no other note still links to, queuing a remote delete for anything Joplin
    /// Cloud already knew about.
    func permanentlyDeleteNote(_ note: Note) {
        permanentlyDeleteNoteNow(note)
        if selectedNoteID == note.id {
            selectedNoteID = nil
        }
        loadAll()
        schedulePushDebounce()
    }

    /// Permanently deletes everything currently in Trash — notebooks first (each one
    /// cascades its own notes), then any note trashed individually whose notebook wasn't.
    func emptyTrash() {
        for folder in trashedFolders { permanentlyDeleteFolderNow(folder) }
        for note in db.fetchTrashedNotes() { permanentlyDeleteNoteNow(note) }
        selectedNoteID = nil
        loadAll()
        schedulePushDebounce()
    }

    // Matches Joplin's own default trash retention period.
    private static let trashRetentionSeconds: TimeInterval = 90 * 24 * 60 * 60

    /// Sweeps Trash for anything past the 90-day retention window and permanently
    /// deletes it — mirrors Joplin's own default auto-purge. Runs once at launch (see
    /// init), before the first sync, so a stale trashed item doesn't sit around forever
    /// just because the app wasn't opened for a while.
    private func purgeExpiredTrash() {
        let cutoff = Date().addingTimeInterval(-Self.trashRetentionSeconds)
        for folder in db.fetchTrashedFolders() {
            guard let deletedTime = folder.deletedTime else { continue }
            if deletedTime < cutoff { permanentlyDeleteFolderNow(folder) }
        }
        for note in db.fetchTrashedNotes() {
            guard let deletedTime = note.deletedTime else { continue }
            if deletedTime < cutoff { permanentlyDeleteNoteNow(note) }
        }
    }

    /// Core shared by permanentlyDeleteFolder/emptyTrash/purgeExpiredTrash — the public
    /// permanentlyDeleteFolder() wraps this with UI-state cleanup.
    private func permanentlyDeleteFolderNow(_ folder: Folder) {
        if db.folderSyncedFlag(id: folder.id) { db.queueDelete(id: folder.id, itemType: "folder") }
        // Every note in this folder, trashed or not — a permanent folder delete cascades
        // regardless of a note's own trash state.
        let notesInFolder = (db.fetchNotes(folderId: folder.id) + db.fetchTrashedNotes().filter { $0.folderId == folder.id })
        var seen = Set<String>()
        for note in notesInFolder where seen.insert(note.id).inserted {
            if db.noteSyncedFlag(id: note.id) { db.queueDelete(id: note.id, itemType: "note") }
            unlinkRemovedResources(noteId: note.id, oldBody: note.body, newBody: "")
        }
        db.deleteFolder(id: folder.id)
    }

    /// Core shared by permanentlyDeleteNote/emptyTrash/purgeExpiredTrash.
    private func permanentlyDeleteNoteNow(_ note: Note) {
        if db.noteSyncedFlag(id: note.id) { db.queueDelete(id: note.id, itemType: "note") }
        db.deleteNote(id: note.id)
        unlinkRemovedResources(noteId: note.id, oldBody: note.body, newBody: "")
    }

    private static let resourceIdRegex = try! NSRegularExpression(pattern: "data-resource-id=\"([0-9a-fA-F]{32})\"")

    private func extractResourceIds(_ html: String) -> Set<String> {
        let range = NSRange(html.startIndex..<html.endIndex, in: html)
        var ids = Set<String>()
        Self.resourceIdRegex.enumerateMatches(in: html, range: range) { match, _, _ in
            guard let match, let idRange = Range(match.range(at: 1), in: html) else { return }
            ids.insert(String(html[idRange]))
        }
        return ids
    }

    /// Unlinks any resource referenced in [oldBody] but not [newBody] from [noteId], and
    /// if that leaves the resource unreferenced by any note, deletes it locally and
    /// queues a remote delete if Joplin Cloud already knew about it. Called with
    /// newBody = "" to cascade every resource a deleted note referenced.
    private func unlinkRemovedResources(noteId: String, oldBody: String, newBody: String) {
        let removed = extractResourceIds(oldBody).subtracting(extractResourceIds(newBody))
        for resourceId in removed {
            db.unlinkNoteResource(noteId: noteId, resourceId: resourceId)
            if !db.isResourceReferenced(id: resourceId) {
                if db.resourceSyncedFlag(id: resourceId) { db.queueDelete(id: resourceId, itemType: "resource") }
                db.deleteResource(id: resourceId)
            }
        }
    }

    // MARK: - Search

    private var searchDebounceTask: Task<Void, Never>?

    // While typing: re-filters the results list (the Mac list then opens the first
    // result, see NoteListView). The actual query is debounced: searchNotes is an unindexed LIKE scan over
    // every note's title and full body, so running it synchronously per keystroke
    // made the search field itself hitch on larger databases. Clearing the field
    // refreshes immediately (fetchNotes by folder is cheap and it feels snappier).
    func search(_ query: String) {
        // Search covers every note, so the sidebar moves to All Notes (as in Notes).
        if searchText.isEmpty && !query.isEmpty {
            // A trashed note mustn't stay open once Trash is left (it would turn editable).
            if isTrashSelected { selectedNoteID = nil }
            isTrashSelected = false
            selectedFolderID = nil
        }
        searchText = query
        searchDebounceTask?.cancel()
        guard !query.isEmpty else {
            loadNotes()
            return
        }
        searchDebounceTask = Task {
            try? await Task.sleep(nanoseconds: 250_000_000)
            guard !Task.isCancelled else { return }
            loadNotes()
        }
    }

    // Called when the search field is submitted (Enter key) — opens the first
    // result in the detail/editor view. Mac + iPad only, per request — iPhone
    // keeps today's behavior (results list updates, nothing auto-opens).
    // iPhone's compact single-column layout means the note list itself IS the
    // screen while searching; auto-pushing to the editor there would yank the
    // user away from the results they're scanning, which doesn't apply on
    // Mac/iPad's multi-column layouts.
    func submitSearch() {
        // Flush any pending debounced query first (see search(_:)) so the first
        // result auto-selected below comes from the text as submitted, not from
        // however far the debounce had gotten.
        searchDebounceTask?.cancel()
        loadNotes()
        // Mac: NoteListView opens the first result (its Top Hits order) itself.
        #if os(iOS)
        if UIDevice.current.userInterfaceIdiom == .pad {
            autoSelectFirstSearchResult()
        }
        #endif
    }

    private func autoSelectFirstSearchResult() {
        guard !searchText.isEmpty else { return }
        selectedNoteID = notes.first?.id
    }
}

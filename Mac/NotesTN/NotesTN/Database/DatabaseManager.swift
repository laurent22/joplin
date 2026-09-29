import Foundation
import SQLite3

/// Synchronous SQLite wrapper.
/// Schema mirrors Joplin's exactly so sync can be layered on later.
///
/// NOTE: despite the old comment this used to have, this is NOT called
/// exclusively from @MainActor — JoplinSyncEngine is a Swift `actor`, so its
/// calls into here run on its own executor/thread, concurrently with any
/// @MainActor UI code (e.g. a sidebar note count) also calling in. That
/// mismatch caused real sqlite3 mutex-misuse crashes. `lock` below serializes
/// every actual sqlite3 call through the two low-level primitives
/// (exec/withStatement) that every other method in this file routes through —
/// an NSRecursiveLock (not a plain DispatchQueue.sync) specifically so a
/// method that calls another DatabaseManager method internally on the same
/// thread can't deadlock against itself.
final class DatabaseManager {
    static let shared = DatabaseManager()

    private var db: OpaquePointer?
    private let lock = NSRecursiveLock()

    private init() {
        openDatabase()
        runMigrations()
    }

    deinit {
        sqlite3_close(db)
    }

    // MARK: - Setup

    private func openDatabase() {
        guard let appSupport = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)
            .first else {
            print("[DB] Could not find Application Support directory")
            return
        }

        let dbDir = appSupport.appendingPathComponent("NotesTN", isDirectory: true)
        try? FileManager.default.createDirectory(at: dbDir, withIntermediateDirectories: true)

        let dbURL = dbDir.appendingPathComponent("notes.db")
        if sqlite3_open(dbURL.path, &db) != SQLITE_OK {
            print("[DB] Error opening database: \(String(cString: sqlite3_errmsg(db)))")
        } else {
            print("[DB] Database opened at \(dbURL.path)")
        }

        // WAL mode for better concurrent read performance
        exec("PRAGMA journal_mode=WAL;")
        exec("PRAGMA foreign_keys=ON;")
    }

    private func runMigrations() {
        // Joplin-compatible schema (subset — full schema added when sync is implemented)
        let schema = """
        CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT "",
            created_time INTEGER NOT NULL,
            updated_time INTEGER NOT NULL,
            is_dirty INTEGER NOT NULL DEFAULT 0,
            is_synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS folders_title ON folders (title);
        CREATE INDEX IF NOT EXISTS folders_updated_time ON folders (updated_time);

        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            parent_id TEXT NOT NULL DEFAULT "",
            title TEXT NOT NULL DEFAULT "",
            body TEXT NOT NULL DEFAULT "",
            created_time INTEGER NOT NULL,
            updated_time INTEGER NOT NULL,
            is_conflict INTEGER NOT NULL DEFAULT 0,
            is_todo INTEGER NOT NULL DEFAULT 0,
            todo_due INTEGER NOT NULL DEFAULT 0,
            todo_completed INTEGER NOT NULL DEFAULT 0,
            source TEXT NOT NULL DEFAULT "",
            source_application TEXT NOT NULL DEFAULT "com.ikuteam.NotesTN",
            is_dirty INTEGER NOT NULL DEFAULT 0,
            is_synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS notes_parent_id ON notes (parent_id);
        CREATE INDEX IF NOT EXISTS notes_updated_time ON notes (updated_time);
        CREATE INDEX IF NOT EXISTS notes_is_todo ON notes (is_todo);

        CREATE TABLE IF NOT EXISTS resources (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT "",
            mime TEXT NOT NULL DEFAULT "",
            filename TEXT NOT NULL DEFAULT "",
            file_size INTEGER NOT NULL DEFAULT 0,
            created_time INTEGER NOT NULL,
            updated_time INTEGER NOT NULL,
            is_dirty INTEGER NOT NULL DEFAULT 0,
            is_synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS resources_updated_time ON resources (updated_time);

        CREATE TABLE IF NOT EXISTS note_resources (
            note_id TEXT NOT NULL,
            resource_id TEXT NOT NULL,
            PRIMARY KEY (note_id, resource_id)
        );

        CREATE TABLE IF NOT EXISTS pending_deletes (
            id TEXT PRIMARY KEY,
            item_type TEXT NOT NULL
        )
        """

        // Execute each statement separately
        let statements = schema.components(separatedBy: ";").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        for stmt in statements {
            exec(stmt)
        }

        // Adds is_dirty/is_synced to databases created before push sync existed. Checked
        // first (rather than just always running ALTER TABLE) so this doesn't log a
        // benign "duplicate column" error on every single launch once already applied.
        addColumnIfMissing(table: "folders", column: "is_dirty", definition: "INTEGER NOT NULL DEFAULT 0")
        addColumnIfMissing(table: "folders", column: "is_synced", definition: "INTEGER NOT NULL DEFAULT 0")
        addColumnIfMissing(table: "notes", column: "is_dirty", definition: "INTEGER NOT NULL DEFAULT 0")
        addColumnIfMissing(table: "notes", column: "is_synced", definition: "INTEGER NOT NULL DEFAULT 0")
        // 0 = not trashed (matches Joplin's own deleted_time convention) — mapped to/from
        // Note.deletedTime / Folder.deletedTime's Date? at the app layer.
        addColumnIfMissing(table: "folders", column: "deleted_time", definition: "INTEGER NOT NULL DEFAULT 0")
        addColumnIfMissing(table: "notes", column: "deleted_time", definition: "INTEGER NOT NULL DEFAULT 0")
        // Not a native Joplin column — mirrors the pinned flag we stash in each note's
        // application_data on the server (see JoplinItemSerializer/Parser).
        addColumnIfMissing(table: "notes", column: "is_pinned", definition: "INTEGER NOT NULL DEFAULT 0")
        addColumnIfMissing(table: "resources", column: "is_dirty", definition: "INTEGER NOT NULL DEFAULT 0")
        let resourcesSyncColumnAdded = addColumnIfMissing(table: "resources", column: "is_synced", definition: "INTEGER NOT NULL DEFAULT 0")
        if resourcesSyncColumnAdded {
            // Existing rows predate this column and could be either pulled-from-server
            // or locally-inserted-but-never-pushed — we can't tell which after the fact.
            // Default to "already synced" (safer: guarantees a later removal queues a
            // remote delete) rather than "dirty" (which would just re-push identical
            // bytes the server likely already has for most rows).
            exec("UPDATE resources SET is_synced = 1")
        }

        // Ensure resources directory exists
        if let dir = resourcesDirectory {
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        }
    }

    /// Returns whether the column was actually added (false if it already existed).
    @discardableResult
    private func addColumnIfMissing(table: String, column: String, definition: String) -> Bool {
        var exists = false
        withStatement("PRAGMA table_info(\(table))") { stmt in
            while sqlite3_step(stmt) == SQLITE_ROW {
                if string(stmt, 1) == column { exists = true }
            }
        }
        if !exists { exec("ALTER TABLE \(table) ADD COLUMN \(column) \(definition)") }
        return !exists
    }

    // MARK: - Resources directory

    var resourcesDirectory: URL? {
        guard let appSupport = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)
            .first else { return nil }
        return appSupport
            .appendingPathComponent("NotesTN", isDirectory: true)
            .appendingPathComponent("resources", isDirectory: true)
    }

    // MARK: - Folders

    func fetchFolders() -> [Folder] {
        let sql = "SELECT id, title, created_time, updated_time, deleted_time FROM folders WHERE deleted_time = 0 ORDER BY title ASC"
        var folders: [Folder] = []

        withStatement(sql) { stmt in
            while sqlite3_step(stmt) == SQLITE_ROW {
                folders.append(folderFromRow(stmt))
            }
        }
        return folders
    }

    /// Every trashed notebook, most-recently-deleted first.
    func fetchTrashedFolders() -> [Folder] {
        var folders: [Folder] = []
        withStatement("SELECT id, title, created_time, updated_time, deleted_time FROM folders WHERE deleted_time != 0 ORDER BY deleted_time DESC") { stmt in
            while sqlite3_step(stmt) == SQLITE_ROW {
                folders.append(folderFromRow(stmt))
            }
        }
        return folders
    }

    private func folderFromRow(_ stmt: OpaquePointer) -> Folder {
        Folder(
            id: string(stmt, 0),
            title: string(stmt, 1),
            createdTime: date(stmt, 2),
            updatedTime: date(stmt, 3),
            deletedTime: optionalDate(stmt, 4)
        )
    }

    /// Nil if the folder doesn't exist locally yet. Used by sync to decide whether a
    /// pulled remote item is newer than what's already stored.
    func folderUpdatedTime(id: String) -> Int64? {
        var result: Int64?
        withStatement("SELECT updated_time FROM folders WHERE id = ?") { stmt in
            bind(stmt, 1, id)
            if sqlite3_step(stmt) == SQLITE_ROW { result = sqlite3_column_int64(stmt, 0) }
        }
        return result
    }

    /// Whether Joplin Cloud already knows about this folder (came from a pull, or was
    /// pushed successfully at least once). False for a folder that only exists locally
    /// — used to decide whether deleting it needs a remote delete queued too.
    func folderSyncedFlag(id: String) -> Bool {
        var result = false
        withStatement("SELECT is_synced FROM folders WHERE id = ?") { stmt in
            bind(stmt, 1, id)
            if sqlite3_step(stmt) == SQLITE_ROW { result = int(stmt, 0) != 0 }
        }
        return result
    }

    /// [dirty] = has local changes not yet pushed to Joplin Cloud. [synced] = Joplin
    /// Cloud already knows about this id. Both are written explicitly on every save
    /// (rather than defaulted) because INSERT OR REPLACE re-creates the whole row —
    /// any column left out would silently reset to its table default.
    func saveFolder(_ folder: Folder, dirty: Bool, synced: Bool) {
        let sql = """
        INSERT OR REPLACE INTO folders (id, title, created_time, updated_time, is_dirty, is_synced, deleted_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        withStatement(sql) { stmt in
            bind(stmt, 1, folder.id)
            bind(stmt, 2, folder.title)
            bind(stmt, 3, folder.createdTime)
            bind(stmt, 4, folder.updatedTime)
            sqlite3_bind_int(stmt, 5, dirty ? 1 : 0)
            sqlite3_bind_int(stmt, 6, synced ? 1 : 0)
            sqlite3_bind_int64(stmt, 7, folder.deletedTime.map { Int64($0.timeIntervalSince1970 * 1000) } ?? 0)
            sqlite3_step(stmt)
        }
    }

    func markFolderSynced(id: String) {
        withStatement("UPDATE folders SET is_dirty = 0, is_synced = 1 WHERE id = ?") { stmt in
            bind(stmt, 1, id)
            sqlite3_step(stmt)
        }
    }

    func fetchDirtyFolders() -> [Folder] {
        var folders: [Folder] = []
        withStatement("SELECT id, title, created_time, updated_time, deleted_time FROM folders WHERE is_dirty = 1") { stmt in
            while sqlite3_step(stmt) == SQLITE_ROW {
                folders.append(folderFromRow(stmt))
            }
        }
        return folders
    }

    func deleteFolder(id: String) {
        // Also delete all notes in the folder
        withStatement("DELETE FROM notes WHERE parent_id = ?") { stmt in
            bind(stmt, 1, id)
            sqlite3_step(stmt)
        }
        withStatement("DELETE FROM folders WHERE id = ?") { stmt in
            bind(stmt, 1, id)
            sqlite3_step(stmt)
        }
    }

    // MARK: - Notes

    func fetchNotes(folderId: String? = nil) -> [Note] {
        let sql: String
        if folderId != nil {
            sql = """
            SELECT id, parent_id, title, body, created_time, updated_time,
                   is_todo, todo_completed, deleted_time, is_pinned
            FROM notes
            WHERE parent_id = ? AND is_conflict = 0 AND deleted_time = 0
            ORDER BY updated_time DESC
            """
        } else {
            sql = """
            SELECT id, parent_id, title, body, created_time, updated_time,
                   is_todo, todo_completed, deleted_time, is_pinned
            FROM notes
            WHERE is_conflict = 0 AND deleted_time = 0
            ORDER BY updated_time DESC
            """
        }

        var notes: [Note] = []
        withStatement(sql) { stmt in
            if let folderId {
                bind(stmt, 1, folderId)
            }
            while sqlite3_step(stmt) == SQLITE_ROW {
                notes.append(noteFromRow(stmt))
            }
        }
        return notes
    }

    /// Count of live notes in a folder — used for the sidebar's per-notebook count.
    /// A plain COUNT(*) instead of fetchNotes(folderId:).count, which materialized
    /// every note's full HTML body just to count rows (the sidebar re-renders on
    /// every AppState publish, so that cost ran per folder per keystroke).
    func noteCount(folderId: String) -> Int {
        var count = 0
        withStatement("SELECT COUNT(*) FROM notes WHERE parent_id = ? AND is_conflict = 0 AND deleted_time = 0") { stmt in
            bind(stmt, 1, folderId)
            if sqlite3_step(stmt) == SQLITE_ROW { count = Int(sqlite3_column_int64(stmt, 0)) }
        }
        return count
    }

    /// Counts for the sidebar's All Notes and Trash rows.
    func noteCount(trashed: Bool) -> Int {
        var count = 0
        let sql = trashed
            ? "SELECT COUNT(*) FROM notes WHERE deleted_time != 0"
            : "SELECT COUNT(*) FROM notes WHERE is_conflict = 0 AND deleted_time = 0"
        withStatement(sql) { stmt in
            if sqlite3_step(stmt) == SQLITE_ROW { count = Int(sqlite3_column_int64(stmt, 0)) }
        }
        return count
    }

    /// Every trashed note across all notebooks, most-recently-deleted first.
    func fetchTrashedNotes() -> [Note] {
        var notes: [Note] = []
        withStatement("""
            SELECT id, parent_id, title, body, created_time, updated_time,
                   is_todo, todo_completed, deleted_time, is_pinned
            FROM notes
            WHERE deleted_time != 0
            ORDER BY deleted_time DESC
            """) { stmt in
            while sqlite3_step(stmt) == SQLITE_ROW {
                notes.append(noteFromRow(stmt))
            }
        }
        return notes
    }

    private func noteFromRow(_ stmt: OpaquePointer) -> Note {
        Note(
            id: string(stmt, 0),
            folderId: string(stmt, 1),
            title: string(stmt, 2),
            body: string(stmt, 3),
            createdTime: date(stmt, 4),
            updatedTime: date(stmt, 5),
            isTodo: int(stmt, 6) != 0,
            todoCompleted: int(stmt, 7) != 0,
            deletedTime: optionalDate(stmt, 8),
            isPinned: int(stmt, 9) != 0
        )
    }

    /// Single note by id (live or trashed), or nil if it doesn't exist.
    func fetchNote(id: String) -> Note? {
        var note: Note?
        withStatement("""
            SELECT id, parent_id, title, body, created_time, updated_time,
                   is_todo, todo_completed, deleted_time, is_pinned
            FROM notes WHERE id = ?
            """) { stmt in
            bind(stmt, 1, id)
            if sqlite3_step(stmt) == SQLITE_ROW { note = noteFromRow(stmt) }
        }
        return note
    }

    /// Nil if the note doesn't exist locally yet. Used by sync to decide whether a
    /// pulled remote item is newer than what's already stored.
    func noteUpdatedTime(id: String) -> Int64? {
        var result: Int64?
        withStatement("SELECT updated_time FROM notes WHERE id = ?") { stmt in
            bind(stmt, 1, id)
            if sqlite3_step(stmt) == SQLITE_ROW { result = sqlite3_column_int64(stmt, 0) }
        }
        return result
    }

    /// Whether Joplin Cloud already knows about this note (came from a pull, or was
    /// pushed successfully at least once). False for a note that only exists locally
    /// — used to decide whether deleting it needs a remote delete queued too.
    func noteSyncedFlag(id: String) -> Bool {
        var result = false
        withStatement("SELECT is_synced FROM notes WHERE id = ?") { stmt in
            bind(stmt, 1, id)
            if sqlite3_step(stmt) == SQLITE_ROW { result = int(stmt, 0) != 0 }
        }
        return result
    }

    /// [dirty] = has local changes not yet pushed to Joplin Cloud. [synced] = Joplin
    /// Cloud already knows about this id. Both are written explicitly on every save
    /// (rather than defaulted) because INSERT OR REPLACE re-creates the whole row —
    /// any column left out would silently reset to its table default.
    func saveNote(_ note: Note, dirty: Bool, synced: Bool) {
        let sql = """
        INSERT OR REPLACE INTO notes
            (id, parent_id, title, body, created_time, updated_time,
             is_todo, todo_completed, source_application, is_dirty, is_synced, deleted_time, is_pinned)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, "com.ikuteam.NotesTN", ?, ?, ?, ?)
        """
        withStatement(sql) { stmt in
            bind(stmt, 1, note.id)
            bind(stmt, 2, note.folderId)
            bind(stmt, 3, note.title)
            bind(stmt, 4, note.body)
            bind(stmt, 5, note.createdTime)
            bind(stmt, 6, note.updatedTime)
            sqlite3_bind_int(stmt, 7, note.isTodo ? 1 : 0)
            sqlite3_bind_int(stmt, 8, note.todoCompleted ? 1 : 0)
            sqlite3_bind_int(stmt, 9, dirty ? 1 : 0)
            sqlite3_bind_int(stmt, 10, synced ? 1 : 0)
            sqlite3_bind_int64(stmt, 11, note.deletedTime.map { Int64($0.timeIntervalSince1970 * 1000) } ?? 0)
            sqlite3_bind_int(stmt, 12, note.isPinned ? 1 : 0)
            sqlite3_step(stmt)
        }
    }

    func markNoteSynced(id: String) {
        withStatement("UPDATE notes SET is_dirty = 0, is_synced = 1 WHERE id = ?") { stmt in
            bind(stmt, 1, id)
            sqlite3_step(stmt)
        }
    }

    func fetchDirtyNotes() -> [Note] {
        var notes: [Note] = []
        withStatement("""
            SELECT id, parent_id, title, body, created_time, updated_time, is_todo, todo_completed, deleted_time, is_pinned
            FROM notes
            WHERE is_dirty = 1
            """) { stmt in
            while sqlite3_step(stmt) == SQLITE_ROW {
                notes.append(noteFromRow(stmt))
            }
        }
        return notes
    }

    func deleteNote(id: String) {
        withStatement("DELETE FROM notes WHERE id = ?") { stmt in
            bind(stmt, 1, id)
            sqlite3_step(stmt)
        }
    }

    // MARK: - Pending remote deletes

    func queueDelete(id: String, itemType: String) {
        withStatement("INSERT OR REPLACE INTO pending_deletes (id, item_type) VALUES (?, ?)") { stmt in
            bind(stmt, 1, id)
            bind(stmt, 2, itemType)
            sqlite3_step(stmt)
        }
    }

    /// Pairs of (id, itemType) — itemType is "note" or "folder".
    func fetchPendingDeletes() -> [(id: String, itemType: String)] {
        var result: [(id: String, itemType: String)] = []
        withStatement("SELECT id, item_type FROM pending_deletes") { stmt in
            while sqlite3_step(stmt) == SQLITE_ROW {
                result.append((id: string(stmt, 0), itemType: string(stmt, 1)))
            }
        }
        return result
    }

    func clearPendingDelete(id: String) {
        withStatement("DELETE FROM pending_deletes WHERE id = ?") { stmt in
            bind(stmt, 1, id)
            sqlite3_step(stmt)
        }
    }

    /// True if [id] is queued for a remote delete that hasn't been pushed yet — used by
    /// pull's upsert functions to avoid resurrecting an item we've already permanently
    /// deleted locally but haven't told the server about (pull runs before push, so the
    /// server still has its old copy at that point).
    func hasPendingDelete(id: String) -> Bool {
        var exists = false
        withStatement("SELECT 1 FROM pending_deletes WHERE id = ? LIMIT 1") { stmt in
            bind(stmt, 1, id)
            exists = sqlite3_step(stmt) == SQLITE_ROW
        }
        return exists
    }

    func searchNotes(query: String) -> [Note] {
        let sql = """
        SELECT id, parent_id, title, body, created_time, updated_time,
               is_todo, todo_completed, deleted_time, is_pinned
        FROM notes
        WHERE is_conflict = 0 AND deleted_time = 0
          AND (title LIKE ? OR body LIKE ?)
        ORDER BY updated_time DESC
        LIMIT 200
        """
        let pattern = "%\(query)%"
        var notes: [Note] = []

        withStatement(sql) { stmt in
            bind(stmt, 1, pattern)
            bind(stmt, 2, pattern)
            while sqlite3_step(stmt) == SQLITE_ROW {
                notes.append(noteFromRow(stmt))
            }
        }
        return notes
    }

    // MARK: - Resources

    /// URL for an already-synced resource (image src the editor can load), or nil if
    /// it hasn't been downloaded yet. Used to rewrite Joplin's `:/resourceId` links,
    /// and (on iOS) also called directly by the two local-image-insertion call sites
    /// in Notes TN/EditorView.swift, so there's one source of truth for the URL
    /// format per platform.
    ///
    /// Mac: a plain file:// URL — Mac's WKWebView already has read access to
    /// resourcesDirectory via loadFileURL's allowingReadAccessTo (see EditorView),
    /// since $HOME happens to cover both the app bundle and Application Support.
    ///
    /// iOS: a "notestn://resource/<filename>" URL instead — iOS keeps the app bundle
    /// and Application Support in separate sandbox containers with no shared
    /// ancestor, so allowingReadAccessTo can't cover both; a WKURLSchemeHandler
    /// (ImageResourceSchemeHandler in Notes TN/EditorView.swift) serves this scheme's
    /// bytes directly instead of relying on file:// access.
    func resourceLocalUrl(id: String) -> String? {
        guard let filename = resourceFilename(id: id) else { return nil }
        #if os(iOS)
        return "notestn://resource/\(filename)"
        #else
        guard let dir = resourcesDirectory else { return nil }
        return dir.appendingPathComponent(filename).absoluteString
        #endif
    }

    /// Title / MIME / size for a resource, or nil if it isn't stored locally. Used to
    /// fill in an attachment card's metadata — Joplin's Markdown link carries only the
    /// name and id, so size and type have to come from the resources table.
    func resourceMeta(id: String) -> (title: String, mime: String, size: Int)? {
        var result: (String, String, Int)?
        withStatement("SELECT title, mime, file_size FROM resources WHERE id = ?") { stmt in
            bind(stmt, 1, id)
            if sqlite3_step(stmt) == SQLITE_ROW {
                result = (string(stmt, 0), string(stmt, 1), Int(sqlite3_column_int64(stmt, 2)))
            }
        }
        return result
    }

    func resourceExists(id: String) -> Bool {
        var exists = false
        withStatement("SELECT 1 FROM resources WHERE id = ?") { stmt in
            bind(stmt, 1, id)
            exists = sqlite3_step(stmt) == SQLITE_ROW
        }
        return exists
    }

    /// Local file:// URL for an already-synced resource — for contexts needing an
    /// actual file URL (e.g. the note list's thumbnail), unlike [resourceLocalUrl]
    /// which returns an absoluteString for the editor's WKWebView.
    func resourceLocalFileURL(id: String) -> URL? {
        guard let filename = resourceFilename(id: id), let dir = resourcesDirectory else { return nil }
        return dir.appendingPathComponent(filename)
    }

    // Resource id → filename cache backing resourceLocalUrl/resourceLocalFileURL,
    // which the note list's row thumbnails hit per visible row per render. A
    // resource's filename is derived from its id ("<id>.<ext>") and never changes,
    // so cached hits can't go stale; entries are still removed on deleteResource
    // and refreshed on saveResource for hygiene. Guarded by `lock` like all other
    // DB state (UI reads on the main actor race the sync engine's actor otherwise).
    private var resourceFilenameCache: [String: String] = [:]

    private func resourceFilename(id: String) -> String? {
        lock.lock()
        if let cached = resourceFilenameCache[id] {
            lock.unlock()
            return cached
        }
        lock.unlock()
        var filename: String?
        withStatement("SELECT filename FROM resources WHERE id = ?") { stmt in
            bind(stmt, 1, id)
            if sqlite3_step(stmt) == SQLITE_ROW { filename = string(stmt, 0) }
        }
        if let filename, !filename.isEmpty {
            lock.lock()
            resourceFilenameCache[id] = filename
            lock.unlock()
            return filename
        }
        return nil
    }

    /// [dirty] = has local bytes not yet pushed to Joplin Cloud. [synced] = Joplin Cloud
    /// already knows about this id. Same explicit-write rule as saveNote/saveFolder.
    func saveResource(_ resource: Resource, dirty: Bool, synced: Bool) {
        let sql = """
        INSERT OR REPLACE INTO resources
            (id, title, mime, filename, file_size, created_time, updated_time, is_dirty, is_synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        let now = Date()
        withStatement(sql) { stmt in
            bind(stmt, 1, resource.id)
            bind(stmt, 2, resource.title)
            bind(stmt, 3, resource.mimeType)
            bind(stmt, 4, resource.filename)
            sqlite3_bind_int64(stmt, 5, Int64(resource.fileSize))
            bind(stmt, 6, now)
            bind(stmt, 7, now)
            sqlite3_bind_int(stmt, 8, dirty ? 1 : 0)
            sqlite3_bind_int(stmt, 9, synced ? 1 : 0)
            sqlite3_step(stmt)
        }
        lock.lock()
        resourceFilenameCache[resource.id] = resource.filename
        lock.unlock()
        // Link resource to note
        withStatement("INSERT OR IGNORE INTO note_resources (note_id, resource_id) VALUES (?, ?)") { stmt in
            bind(stmt, 1, resource.noteId)
            bind(stmt, 2, resource.id)
            sqlite3_step(stmt)
        }
    }

    /// Records that a resource's bytes changed on disk (the user edited the file in
    /// its own app): update the stored size and flag it dirty so the next sync
    /// re-uploads the blob. Deliberately narrow — saveResource would rewrite the whole
    /// row and reset its synced flag.
    func markResourceEdited(id: String, fileSize: Int) {
        withStatement("UPDATE resources SET is_dirty = 1, file_size = ?, updated_time = ? WHERE id = ?") { stmt in
            sqlite3_bind_int64(stmt, 1, Int64(fileSize))
            bind(stmt, 2, Date())
            bind(stmt, 3, id)
            sqlite3_step(stmt)
        }
    }

    /// Updates the size shown on every attachment card pointing at this resource, so a
    /// card doesn't keep advertising the old size after the file was edited. Notes are
    /// marked dirty so the corrected body syncs too.
    func updateAttachmentCardSizes(resourceId: String, fileSize: Int) {
        let marker = "data-resource-id=\"\(resourceId)\""
        for note in fetchNotes() where note.body.contains(marker) {
            guard let updated = Self.replacingCardSize(in: note.body, resourceId: resourceId, size: fileSize),
                  updated != note.body else { continue }
            var edited = note
            edited.body = updated
            edited.updatedTime = Date()
            saveNote(edited, dirty: true, synced: noteSyncedFlag(id: note.id))
        }
    }

    /// Rewrites data-size on the attachment card for [resourceId] within [html].
    private static func replacingCardSize(in html: String, resourceId: String, size: Int) -> String? {
        let pattern = "(<div class=\"pm-attachment\"[^>]*data-resource-id=\"\(resourceId)\"[^>]*data-size=\")[0-9]+(\")"
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
        let range = NSRange(html.startIndex..<html.endIndex, in: html)
        return regex.stringByReplacingMatches(in: html, range: range, withTemplate: "$1\(size)$2")
    }

    func resourceSyncedFlag(id: String) -> Bool {
        var result = false
        withStatement("SELECT is_synced FROM resources WHERE id = ?") { stmt in
            bind(stmt, 1, id)
            if sqlite3_step(stmt) == SQLITE_ROW { result = int(stmt, 0) != 0 }
        }
        return result
    }

    func markResourceSynced(id: String) {
        withStatement("UPDATE resources SET is_dirty = 0, is_synced = 1 WHERE id = ?") { stmt in
            bind(stmt, 1, id)
            sqlite3_step(stmt)
        }
    }

    func fetchDirtyResources() -> [Resource] {
        var resources: [Resource] = []
        withStatement("SELECT id, title, mime, filename, file_size FROM resources WHERE is_dirty = 1") { stmt in
            while sqlite3_step(stmt) == SQLITE_ROW {
                resources.append(Resource(
                    id: string(stmt, 0),
                    title: string(stmt, 1),
                    mimeType: string(stmt, 2),
                    filename: string(stmt, 3),
                    fileSize: Int(sqlite3_column_int64(stmt, 4)),
                    noteId: ""
                ))
            }
        }
        return resources
    }

    /// Removes just the note<->resource link, without touching the resource row itself
    /// — used when an image is removed from a note's body but the note stays alive.
    func unlinkNoteResource(noteId: String, resourceId: String) {
        withStatement("DELETE FROM note_resources WHERE note_id = ? AND resource_id = ?") { stmt in
            bind(stmt, 1, noteId)
            bind(stmt, 2, resourceId)
            sqlite3_step(stmt)
        }
    }

    func isResourceReferenced(id: String) -> Bool {
        var exists = false
        withStatement("SELECT 1 FROM note_resources WHERE resource_id = ? LIMIT 1") { stmt in
            bind(stmt, 1, id)
            exists = sqlite3_step(stmt) == SQLITE_ROW
        }
        return exists
    }

    func deleteResource(id: String) {
        lock.lock()
        resourceFilenameCache.removeValue(forKey: id)
        lock.unlock()
        // Remove file from disk
        if let dir = resourcesDirectory {
            // Find filename first
            var filename = ""
            withStatement("SELECT filename FROM resources WHERE id = ?") { stmt in
                bind(stmt, 1, id)
                if sqlite3_step(stmt) == SQLITE_ROW { filename = string(stmt, 0) }
            }
            if !filename.isEmpty {
                try? FileManager.default.removeItem(at: dir.appendingPathComponent(filename))
            }
        }
        withStatement("DELETE FROM note_resources WHERE resource_id = ?") { stmt in
            bind(stmt, 1, id); sqlite3_step(stmt)
        }
        withStatement("DELETE FROM resources WHERE id = ?") { stmt in
            bind(stmt, 1, id); sqlite3_step(stmt)
        }
    }

    // MARK: - SQLite helpers

    private func exec(_ sql: String) {
        lock.lock()
        defer { lock.unlock() }
        var error: UnsafeMutablePointer<CChar>?
        if sqlite3_exec(db, sql, nil, nil, &error) != SQLITE_OK {
            if let e = error { print("[DB] exec error: \(String(cString: e))") }
        }
    }

    private func withStatement(_ sql: String, block: (OpaquePointer) -> Void) {
        lock.lock()
        defer { lock.unlock() }
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK, let stmt else {
            print("[DB] prepare error for: \(sql)")
            return
        }
        defer { sqlite3_finalize(stmt) }
        block(stmt)
    }

    // Typed column readers
    private func string(_ stmt: OpaquePointer, _ col: Int32) -> String {
        guard let cstr = sqlite3_column_text(stmt, col) else { return "" }
        return String(cString: cstr)
    }

    private func int(_ stmt: OpaquePointer, _ col: Int32) -> Int64 {
        sqlite3_column_int64(stmt, col)
    }

    private func date(_ stmt: OpaquePointer, _ col: Int32) -> Date {
        // Joplin stores timestamps as milliseconds since epoch
        let ms = sqlite3_column_int64(stmt, col)
        return Date(timeIntervalSince1970: Double(ms) / 1000.0)
    }

    /// Same as date(_:_:), but 0 (the "not trashed" sentinel) maps to nil instead of
    /// the 1970 epoch — used for deleted_time only.
    private func optionalDate(_ stmt: OpaquePointer, _ col: Int32) -> Date? {
        let ms = sqlite3_column_int64(stmt, col)
        return ms == 0 ? nil : Date(timeIntervalSince1970: Double(ms) / 1000.0)
    }

    // Matches sqlite3.h's SQLITE_TRANSIENT, which doesn't import into Swift (it's a
    // C function-pointer cast macro). Tells SQLite to copy the text immediately.
    private static let sqliteTransient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

    // Typed binders
    private func bind(_ stmt: OpaquePointer, _ col: Int32, _ value: String) {
        // SQLITE_TRANSIENT (not nil/SQLITE_STATIC) is required here: the previous
        // `(value as NSString).utf8String` + nil destructor told SQLite the buffer
        // would stay valid until the statement was finalized, but the bridged
        // NSString is a temporary with no such guarantee under ARC — if it was
        // deallocated before sqlite3_step, garbage or truncated text was written.
        // Binding the Swift String directly gives a pointer valid for the call, and
        // SQLITE_TRANSIENT makes SQLite copy it before returning.
        sqlite3_bind_text(stmt, col, value, -1, Self.sqliteTransient)
    }

    private func bind(_ stmt: OpaquePointer, _ col: Int32, _ value: Date) {
        sqlite3_bind_int64(stmt, col, Int64(value.timeIntervalSince1970 * 1000))
    }
}

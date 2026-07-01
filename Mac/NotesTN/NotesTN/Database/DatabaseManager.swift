import Foundation
import SQLite3

/// Synchronous SQLite wrapper. Called exclusively from @MainActor (AppState),
/// so no additional locking is needed for Phase 1.
/// Schema mirrors Joplin's exactly so sync can be layered on later.
final class DatabaseManager {
    static let shared = DatabaseManager()

    private var db: OpaquePointer?

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
            updated_time INTEGER NOT NULL
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
            source_application TEXT NOT NULL DEFAULT "com.ikuteam.NotesTN"
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
            updated_time INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS resources_updated_time ON resources (updated_time);

        CREATE TABLE IF NOT EXISTS note_resources (
            note_id TEXT NOT NULL,
            resource_id TEXT NOT NULL,
            PRIMARY KEY (note_id, resource_id)
        )
        """

        // Execute each statement separately
        let statements = schema.components(separatedBy: ";").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        for stmt in statements {
            exec(stmt)
        }

        // Ensure resources directory exists
        if let dir = resourcesDirectory {
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        }
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
        let sql = "SELECT id, title, created_time, updated_time FROM folders ORDER BY title ASC"
        var folders: [Folder] = []

        withStatement(sql) { stmt in
            while sqlite3_step(stmt) == SQLITE_ROW {
                folders.append(Folder(
                    id: string(stmt, 0),
                    title: string(stmt, 1),
                    createdTime: date(stmt, 2),
                    updatedTime: date(stmt, 3)
                ))
            }
        }
        return folders
    }

    func saveFolder(_ folder: Folder) {
        let sql = """
        INSERT OR REPLACE INTO folders (id, title, created_time, updated_time)
        VALUES (?, ?, ?, ?)
        """
        withStatement(sql) { stmt in
            bind(stmt, 1, folder.id)
            bind(stmt, 2, folder.title)
            bind(stmt, 3, folder.createdTime)
            bind(stmt, 4, folder.updatedTime)
            sqlite3_step(stmt)
        }
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
                   is_todo, todo_completed
            FROM notes
            WHERE parent_id = ? AND is_conflict = 0
            ORDER BY updated_time DESC
            """
        } else {
            sql = """
            SELECT id, parent_id, title, body, created_time, updated_time,
                   is_todo, todo_completed
            FROM notes
            WHERE is_conflict = 0
            ORDER BY updated_time DESC
            """
        }

        var notes: [Note] = []
        withStatement(sql) { stmt in
            if let folderId {
                bind(stmt, 1, folderId)
            }
            while sqlite3_step(stmt) == SQLITE_ROW {
                notes.append(Note(
                    id: string(stmt, 0),
                    folderId: string(stmt, 1),
                    title: string(stmt, 2),
                    body: string(stmt, 3),
                    createdTime: date(stmt, 4),
                    updatedTime: date(stmt, 5),
                    isTodo: int(stmt, 6) != 0,
                    todoCompleted: int(stmt, 7) != 0
                ))
            }
        }
        return notes
    }

    func saveNote(_ note: Note) {
        let sql = """
        INSERT OR REPLACE INTO notes
            (id, parent_id, title, body, created_time, updated_time,
             is_todo, todo_completed, source_application)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, "com.ikuteam.NotesTN")
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
            sqlite3_step(stmt)
        }
    }

    func deleteNote(id: String) {
        withStatement("DELETE FROM notes WHERE id = ?") { stmt in
            bind(stmt, 1, id)
            sqlite3_step(stmt)
        }
    }

    func searchNotes(query: String) -> [Note] {
        let sql = """
        SELECT id, parent_id, title, body, created_time, updated_time,
               is_todo, todo_completed
        FROM notes
        WHERE is_conflict = 0
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
                notes.append(Note(
                    id: string(stmt, 0),
                    folderId: string(stmt, 1),
                    title: string(stmt, 2),
                    body: string(stmt, 3),
                    createdTime: date(stmt, 4),
                    updatedTime: date(stmt, 5),
                    isTodo: int(stmt, 6) != 0,
                    todoCompleted: int(stmt, 7) != 0
                ))
            }
        }
        return notes
    }

    // MARK: - Resources

    func saveResource(_ resource: Resource) {
        let sql = """
        INSERT OR REPLACE INTO resources
            (id, title, mime, filename, file_size, created_time, updated_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
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
            sqlite3_step(stmt)
        }
        // Link resource to note
        withStatement("INSERT OR IGNORE INTO note_resources (note_id, resource_id) VALUES (?, ?)") { stmt in
            bind(stmt, 1, resource.noteId)
            bind(stmt, 2, resource.id)
            sqlite3_step(stmt)
        }
    }

    func deleteResource(id: String) {
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
        var error: UnsafeMutablePointer<CChar>?
        if sqlite3_exec(db, sql, nil, nil, &error) != SQLITE_OK {
            if let e = error { print("[DB] exec error: \(String(cString: e))") }
        }
    }

    private func withStatement(_ sql: String, block: (OpaquePointer) -> Void) {
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

    // Typed binders
    private func bind(_ stmt: OpaquePointer, _ col: Int32, _ value: String) {
        sqlite3_bind_text(stmt, col, (value as NSString).utf8String, -1, nil)
    }

    private func bind(_ stmt: OpaquePointer, _ col: Int32, _ value: Date) {
        sqlite3_bind_int64(stmt, col, Int64(value.timeIntervalSince1970 * 1000))
    }
}

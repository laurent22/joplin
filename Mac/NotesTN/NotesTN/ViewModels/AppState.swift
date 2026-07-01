import SwiftUI

@MainActor
final class AppState: ObservableObject {

    // MARK: - Published state

    @Published var folders: [Folder] = []
    @Published var notes: [Note] = []
    @Published var selectedFolderID: String? = nil     // nil = "All Notes"
    @Published var selectedNoteID: String? = nil
    @Published var searchText: String = ""
    @Published var isFocusingSearch: Bool = false

    // MARK: - Derived

    var selectedNote: Note? {
        notes.first { $0.id == selectedNoteID }
    }

    var selectedFolder: Folder? {
        folders.first { $0.id == selectedFolderID }
    }

    private let db = DatabaseManager.shared
    private let selectedNoteKey = "lastSelectedNoteID"

    // MARK: - Init

    init() {
        loadAll()
        restoreSelection()
    }

    // Restores the previously selected note, falling back to the first note.
    // Only called once at launch — subsequent loadNotes() calls leave selection intact.
    private func restoreSelection() {
        guard !notes.isEmpty else { return }
        let saved = UserDefaults.standard.string(forKey: selectedNoteKey)
        if let saved, notes.contains(where: { $0.id == saved }) {
            selectedNoteID = saved
        } else {
            selectedNoteID = notes.first?.id
        }
    }

    // MARK: - Load

    func loadAll() {
        folders = db.fetchFolders()
        loadNotes()
    }

    func loadNotes() {
        if !searchText.isEmpty {
            notes = db.searchNotes(query: searchText)
        } else {
            notes = db.fetchNotes(folderId: selectedFolderID)
        }
    }

    // MARK: - Folder actions

    func selectFolder(_ folder: Folder?) {
        selectedFolderID = folder?.id
        selectedNoteID = nil
        loadNotes()
    }

    func createFolder(title: String = "New Notebook") {
        let folder = Folder(title: title)
        db.saveFolder(folder)
        loadAll()
        selectedFolderID = folder.id
    }

    func renameFolder(_ folder: Folder, to title: String) {
        guard !title.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        var updated = folder
        updated.title = title
        updated.updatedTime = Date()
        db.saveFolder(updated)
        loadAll()
    }

    func deleteFolder(_ folder: Folder) {
        db.deleteFolder(id: folder.id)
        if selectedFolderID == folder.id {
            selectedFolderID = nil
            selectedNoteID = nil
        }
        loadAll()
    }

    // MARK: - Note actions

    func selectNote(_ note: Note?) {
        selectedNoteID = note?.id
        UserDefaults.standard.set(note?.id, forKey: selectedNoteKey)
    }

    func createNote() {
        let note = Note(
            folderId: selectedFolderID ?? "",
            title: "New Note",
            body: ""
        )
        db.saveNote(note)
        loadNotes()
        selectedNoteID = note.id
        UserDefaults.standard.set(note.id, forKey: selectedNoteKey)
    }

    func saveNote(_ note: Note) {
        var updated = note
        updated.updatedTime = Date()
        db.saveNote(updated)
        // Refresh list without losing selection
        notes = db.fetchNotes(folderId: selectedFolderID)
    }

    func deleteNote(_ note: Note) {
        db.deleteNote(id: note.id)
        if selectedNoteID == note.id {
            selectedNoteID = nil
        }
        loadNotes()
    }

    // MARK: - Search

    func search(_ query: String) {
        searchText = query
        loadNotes()
    }

    func clearSearch() {
        searchText = ""
        loadNotes()
    }
}

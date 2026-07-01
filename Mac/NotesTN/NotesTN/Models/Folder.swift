import Foundation

struct Folder: Identifiable, Hashable, Equatable {
    // Joplin-compatible: 32-char lowercase hex, no hyphens
    let id: String
    var title: String
    var createdTime: Date
    var updatedTime: Date

    init(
        id: String = Folder.generateId(),
        title: String = "",
        createdTime: Date = Date(),
        updatedTime: Date = Date()
    ) {
        self.id = id
        self.title = title
        self.createdTime = createdTime
        self.updatedTime = updatedTime
    }

    static func generateId() -> String {
        UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
    }
}

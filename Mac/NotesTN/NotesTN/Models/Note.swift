import Foundation

struct Note: Identifiable, Hashable, Equatable {
    // Joplin-compatible: 32-char lowercase hex, no hyphens
    let id: String
    var folderId: String      // maps to parent_id in Joplin schema
    var title: String
    var body: String          // stored as HTML; convert to Markdown at sync time
    var createdTime: Date
    var updatedTime: Date
    var isTodo: Bool
    var todoCompleted: Bool

    init(
        id: String = Note.generateId(),
        folderId: String = "",
        title: String = "",
        body: String = "",
        createdTime: Date = Date(),
        updatedTime: Date = Date(),
        isTodo: Bool = false,
        todoCompleted: Bool = false
    ) {
        self.id = id
        self.folderId = folderId
        self.title = title
        self.body = body
        self.createdTime = createdTime
        self.updatedTime = updatedTime
        self.isTodo = isTodo
        self.todoCompleted = todoCompleted
    }

    // Joplin uses 32-char lowercase hex IDs
    static func generateId() -> String {
        UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
    }

    // Plain-text preview extracted from HTML body
    var preview: String {
        guard !body.isEmpty else { return "" }
        // Strip HTML tags
        let noTags = body.replacingOccurrences(of: "<[^>]+>", with: " ", options: .regularExpression)
        // Collapse whitespace and newlines
        let collapsed = noTags
            .components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .joined(separator: " ")
            // Decode common HTML entities
            .replacingOccurrences(of: "&amp;", with: "&")
            .replacingOccurrences(of: "&lt;", with: "<")
            .replacingOccurrences(of: "&gt;", with: ">")
            .replacingOccurrences(of: "&nbsp;", with: " ")
            .replacingOccurrences(of: "&#39;", with: "'")
            .replacingOccurrences(of: "&quot;", with: "\"")
            .trimmingCharacters(in: .whitespaces)
        return String(collapsed.prefix(160))
    }
}

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
    var deletedTime: Date?   // nil = not trashed
    // Not a native Joplin field (standard Joplin has no pinned-note concept) — stored
    // in the note's own application_data JSON, a real Joplin field meant for exactly
    // this kind of app-specific custom state, so it round-trips safely through Joplin
    // Cloud sync. See JoplinItemSerializer/JoplinItemParser.
    var isPinned: Bool

    init(
        id: String = Note.generateId(),
        folderId: String = "",
        title: String = "",
        body: String = "",
        createdTime: Date = Date(),
        updatedTime: Date = Date(),
        isTodo: Bool = false,
        todoCompleted: Bool = false,
        deletedTime: Date? = nil,
        isPinned: Bool = false
    ) {
        self.id = id
        self.folderId = folderId
        self.title = title
        self.body = body
        self.createdTime = createdTime
        self.updatedTime = updatedTime
        self.isTodo = isTodo
        self.todoCompleted = todoCompleted
        self.deletedTime = deletedTime
        self.isPinned = isPinned
    }

    // Joplin uses 32-char lowercase hex IDs
    static func generateId() -> String {
        UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
    }

    // Both `preview` and `firstImageResourceId` run regexes over the entire HTML
    // body. The note list reads them per visible row per render (and the whole list
    // re-renders on every AppState publish, i.e. every keystroke autosave), so the
    // results are cached per (id, updatedTime) — any edit bumps updatedTime, which
    // changes the key and naturally invalidates the entry. NSCache is thread-safe
    // and evicts automatically under memory pressure.
    private static let previewCache = NSCache<NSString, NSString>()
    private static let firstImageCache = NSCache<NSString, NSString>()

    private var derivedCacheKey: NSString {
        "\(id)-\(updatedTime.timeIntervalSince1970)" as NSString
    }

    // Plain-text preview extracted from HTML body
    var preview: String {
        guard !body.isEmpty else { return "" }
        let key = derivedCacheKey
        if let cached = Self.previewCache.object(forKey: key) { return cached as String }
        let computed = computePreview()
        Self.previewCache.setObject(computed as NSString, forKey: key)
        return computed
    }

    private func computePreview() -> String {
        String(plainText.prefix(160))
    }

    // The whole body as plain text — for search snippets, which need to find a match
    // past the preview's first 160 characters. Not cached; only search rows read it.
    var plainText: String {
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
        return collapsed
    }

    // Resource id of the first image in the body, or nil if there is none — used
    // for the note list's thumbnail (mirrors Apple Notes' list row thumbnail).
    // Cached like `preview` above ("" = cached "no image").
    var firstImageResourceId: String? {
        let key = derivedCacheKey
        if let cached = Self.firstImageCache.object(forKey: key) {
            return cached.length == 0 ? nil : cached as String
        }
        let computed = computeFirstImageResourceId()
        Self.firstImageCache.setObject((computed ?? "") as NSString, forKey: key)
        return computed
    }

    private func computeFirstImageResourceId() -> String? {
        guard let imgRange = body.range(of: "<img\\b[^>]*>", options: .regularExpression) else { return nil }
        let imgTag = String(body[imgRange])

        // Locally-inserted/pasted images carry this explicitly (see
        // EditorView.handleImagePick/copyDataUriIntoResources → EditorCoordinator
        // .insertImage → the ProseMirror image node's data-resource-id attribute).
        if let idRange = imgTag.range(of: "data-resource-id=\"([^\"]*)\"", options: .regularExpression) {
            let attr = String(imgTag[idRange])
            let value = attr
                .replacingOccurrences(of: "data-resource-id=\"", with: "")
                .replacingOccurrences(of: "\"", with: "")
            if !value.isEmpty { return value }
        }

        // Images pulled from Joplin Cloud never get that attribute — MarkdownToHtml
        // .convert and JoplinSyncEngine's rewriteResourceLinks both just rewrite `src`
        // to a local file:// URL, no data-resource-id. Every resource is saved locally
        // as "<resourceId>.<ext>" (see DatabaseManager.saveResource), so recover the id
        // from the src path's last component instead of requiring the attribute.
        if let srcRange = imgTag.range(of: "src=\"[^\"]*/[0-9a-fA-F]{32}\\.[A-Za-z0-9]+\"", options: .regularExpression),
           let idRange = imgTag[srcRange].range(of: "[0-9a-fA-F]{32}", options: .regularExpression) {
            return String(imgTag[idRange])
        }

        return nil
    }
}

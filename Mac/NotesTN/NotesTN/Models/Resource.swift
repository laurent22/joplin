import Foundation

struct Resource: Identifiable {
    let id: String
    let title: String
    let mimeType: String
    let filename: String
    let fileSize: Int
    let noteId: String  // which note owns this resource (for note_resources table)
}

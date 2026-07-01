import SwiftUI
import WebKit
import AppKit
import UniformTypeIdentifiers

// MARK: - Selection State (mirrors JS SelectionState)

struct EditorSelectionState {
    var bold = false
    var italic = false
    var code = false
    var strikethrough = false
    var inCode = false
    var inBlockquote = false
    var inBulletList = false
    var inOrderedList = false
    var inTaskList = false
    var inCheckedTask = false
    var headingLevel = 0   // 0 = paragraph
    var hasLink = false
    var linkHref: String? = nil
}

// MARK: - Editor Coordinator (owns WKWebView, bridges Swift ↔ JS)

@MainActor
final class EditorCoordinator: NSObject, ObservableObject, WKScriptMessageHandler, WKNavigationDelegate {

    // MARK: Published
    @Published var selectionState = EditorSelectionState()
    @Published var isReady = false

    // The webview — set by RichTextEditorView.makeNSView
    weak var webView: WKWebView?

    // Called when the JS side sends us a message.
    // WKScriptMessage is @MainActor in macOS 14 SDK; no nonisolated needed.
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any],
              let type = body["type"] as? String else { return }
        handle(type: type, body: body)
    }

    private func handle(type: String, body: [String: Any]) {
        switch type {
        case "ready":
            isReady = true

        case "contentChanged":
            if let html = body["html"] as? String {
                onContentChanged?(html)
            }

        case "selectionChanged":
            if let s = body["selectionState"] as? [String: Any] {
                selectionState = EditorSelectionState(
                    bold: s["bold"] as? Bool ?? false,
                    italic: s["italic"] as? Bool ?? false,
                    code: s["code"] as? Bool ?? false,
                    strikethrough: s["strikethrough"] as? Bool ?? false,
                    inCode: s["inCode"] as? Bool ?? false,
                    inBlockquote: s["inBlockquote"] as? Bool ?? false,
                    inBulletList: s["inBulletList"] as? Bool ?? false,
                    inOrderedList: s["inOrderedList"] as? Bool ?? false,
                    inTaskList: s["inTaskList"] as? Bool ?? false,
                    inCheckedTask: s["inCheckedTask"] as? Bool ?? false,
                    headingLevel: s["headingLevel"] as? Int ?? 0,
                    hasLink: s["hasLink"] as? Bool ?? false,
                    linkHref: s["linkHref"] as? String
                )
            }

        case "imageRequested":
            // User pasted an image — open the resource picker (handled in NoteEditorView)
            onImageRequested?()

        case "openUrl":
            if let urlString = body["url"] as? String,
               let url = URL(string: urlString) {
                NSWorkspace.shared.open(url)
            }

        case "log":
            if let msg = body["message"] as? String {
                print("[Editor JS] \(msg)")
            }

        default:
            break
        }
    }

    // MARK: Callbacks set by NoteEditorView
    var onContentChanged: ((String) -> Void)?
    var onImageRequested: (() -> Void)?

    // MARK: Commands → JS

    func setContent(_ html: String) {
        guard let wv = webView else { return }
        // JSONEncoder handles bare String top-level values safely.
        // NSJSONSerialization throws an ObjC NSException (not a Swift Error) for
        // bare strings, which bypasses try? and corrupts SwiftUI's run loop state,
        // freezing the entire UI after the first note is selected.
        guard let data = try? JSONEncoder().encode(html),
              let jsonStr = String(data: data, encoding: .utf8) else { return }
        wv.evaluateJavaScript("window.NativeEditor?.setContent(\(jsonStr))")
    }

    func execCommand(_ command: String, value: Any? = nil) {
        guard let wv = webView else { return }

        let js: String
        if let value,
           let data = try? JSONSerialization.data(withJSONObject: value),
           let json = String(data: data, encoding: .utf8) {
            js = "window.NativeEditor?.execCommand('\(command)', \(json))"
        } else {
            js = "window.NativeEditor?.execCommand('\(command)')"
        }

        // Return first-responder to the WKWebView BEFORE sending the JS command.
        // Without this, macOS steals focus for the toolbar button that was clicked,
        // and ProseMirror has no active selection when the command arrives.
        wv.window?.makeFirstResponder(wv)
        wv.evaluateJavaScript(js)
    }

    func focus() {
        guard let wv = webView else { return }
        // Move AppKit first-responder to the WKWebView, then focus ProseMirror.
        wv.window?.makeFirstResponder(wv)
        wv.evaluateJavaScript("window.NativeEditor?.focus()")
    }

    // MARK: WKNavigationDelegate — open links in default browser

    nonisolated func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        if navigationAction.navigationType == .linkActivated,
           let url = navigationAction.request.url {
            decisionHandler(.cancel)
            NSWorkspace.shared.open(url)
            return
        }
        decisionHandler(.allow)
    }

    // MARK: Image insertion

    func insertImage(src: String, alt: String? = nil, resourceId: String? = nil) {
        var value: [String: Any] = ["src": src]
        if let alt { value["alt"] = alt }
        if let resourceId { value["resourceId"] = resourceId }
        execCommand("image", value: value)
    }
}

// MARK: - WKWebView with strict hit-testing

/// WKWebView's internal subviews (NSScrollView, input-delegate views, etc.) don't
/// clip their hit-test areas to the WKWebView's own bounds. On macOS, this causes
/// the editor to absorb mouse events that are physically outside its frame — including
/// events on the SwiftUI toolbar above it and on the note-list column to the left.
/// Overriding hitTest here ensures only points actually inside this view are handled.
final class EditorWebView: WKWebView {
    override func hitTest(_ point: NSPoint) -> NSView? {
        guard bounds.contains(point) else { return nil }
        return super.hitTest(point)
    }
}

// MARK: - WKWebView NSViewRepresentable

struct RichTextEditorView: NSViewRepresentable {
    @ObservedObject var coordinator: EditorCoordinator

    func makeNSView(context: Context) -> EditorWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(coordinator, name: "editorMessage")

        let wv = EditorWebView(frame: .zero, configuration: config)
        wv.setValue(false, forKey: "drawsBackground") // transparent — body bg handles color
        wv.navigationDelegate = coordinator
        coordinator.webView = wv

        // Load editor.html from the app bundle.
        // allowingReadAccessTo must cover BOTH the bundle directory (editor.html,
        // editor.bundle.js) AND ~/Library/Application Support/NotesTN/resources/
        // (user image attachments). The home directory is the common ancestor for
        // debug builds (bundle is under ~/Library/Developer/Xcode/DerivedData).
        if let htmlURL = Bundle.main.url(forResource: "editor", withExtension: "html", subdirectory: nil) {
            let accessRoot = FileManager.default.homeDirectoryForCurrentUser
            wv.loadFileURL(htmlURL, allowingReadAccessTo: accessRoot)
        } else {
            let fallback = "<html><body><p style='color:red'>editor.html not found in bundle</p></body></html>"
            wv.loadHTMLString(fallback, baseURL: nil)
        }

        return wv
    }

    func updateNSView(_ nsView: EditorWebView, context: Context) {
        // State updates driven by coordinator callbacks — nothing needed here
    }

    static func dismantleNSView(_ nsView: EditorWebView, coordinator: ()) {
        // Remove the message handler to break the retain cycle:
        // WKUserContentController holds a strong ref to EditorCoordinator,
        // so we must remove it when the view is destroyed.
        nsView.configuration.userContentController.removeScriptMessageHandler(forName: "editorMessage")
    }
}

// MARK: - Editor Shell

struct EditorView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            if let note = appState.selectedNote {
                NoteEditorView(note: note)
                    .id(note.id)
            } else {
                emptyState
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "square.and.pencil")
                .font(.system(size: 48))
                .foregroundStyle(.quaternary)
            Text("Select or create a note")
                .foregroundStyle(.secondary)
            Button("New Note") { appState.createNote() }
                .keyboardShortcut("n", modifiers: .command)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.windowBackground)
    }
}

// MARK: - Note Editor

struct NoteEditorView: View {
    @EnvironmentObject var appState: AppState

    @StateObject private var editorCoordinator = EditorCoordinator()
    @State private var title: String
    @State private var isShowingImagePicker = false
    private let noteID: String
    private let initialBody: String
    private let saveDebounce = Debouncer(delay: 0.5)

    init(note: Note) {
        self.noteID = note.id
        self.initialBody = note.body
        _title = State(initialValue: note.title)
    }

    var body: some View {
        VStack(spacing: 0) {

            // MARK: Toolbar
            EditorToolbarView(
                coordinator: editorCoordinator,
                onInsertImage: { isShowingImagePicker = true }
            )
            .padding(.horizontal, 16)
            .padding(.vertical, 11)
            .background(.windowBackground)

            Divider()

            VStack(alignment: .leading, spacing: 0) {
                // Title
                TextField("Title", text: $title)
                    .font(.system(size: 22, weight: .bold))
                    .textFieldStyle(.plain)
                    .padding(.horizontal, 24)
                    .padding(.top, 20)
                    .padding(.bottom, 8)
                    .onChange(of: title) { _, _ in schedulesTitleSave() }
                    .onSubmit { editorCoordinator.focus() }

                // Rich text editor (WKWebView)
                RichTextEditorView(coordinator: editorCoordinator)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .frame(maxWidth: 760)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(.windowBackground)
        .toolbar {
            ToolbarItem(placement: .destructiveAction) {
                Button { appState.createNote() } label: {
                    Image(systemName: "square.and.pencil")
                }
                .help("New Note (⌘N)")
            }
        }
        .onAppear {
            setupCallbacks()
        }
        .onChange(of: editorCoordinator.isReady) { _, ready in
            if ready { editorCoordinator.setContent(initialBody) }
        }
        // Image picker
        .fileImporter(
            isPresented: $isShowingImagePicker,
            allowedContentTypes: [.image],
            allowsMultipleSelection: false
        ) { result in
            handleImagePick(result: result)
        }
    }

    // MARK: Setup

    private func setupCallbacks() {
        editorCoordinator.onContentChanged = { html in
            guard let note = self.appState.notes.first(where: { $0.id == self.noteID }) else { return }
            var updated = note
            updated.body = html
            updated.title = self.title
            self.appState.saveNote(updated)
        }
        editorCoordinator.onImageRequested = {
            isShowingImagePicker = true
        }
    }

    // MARK: Save

    private func schedulesTitleSave() {
        saveDebounce.call {
            guard let note = self.appState.notes.first(where: { $0.id == self.noteID }) else { return }
            var updated = note
            updated.title = self.title
            self.appState.saveNote(updated)
        }
    }

    // MARK: Image handling

    private func handleImagePick(result: Result<[URL], Error>) {
        guard case .success(let urls) = result, let url = urls.first else { return }

        let resourceId = Note.generateId()
        guard let resourcesDir = DatabaseManager.shared.resourcesDirectory else { return }

        let ext = url.pathExtension.isEmpty ? "png" : url.pathExtension
        let destURL = resourcesDir.appendingPathComponent("\(resourceId).\(ext)")

        do {
            try FileManager.default.copyItem(at: url, to: destURL)
        } catch {
            print("[Editor] Failed to copy image: \(error)")
            return
        }

        // Save to DB and insert into editor
        let mimeType = UTType(filenameExtension: ext)?.preferredMIMEType ?? "image/png"
        DatabaseManager.shared.saveResource(Resource(
            id: resourceId,
            title: url.lastPathComponent,
            mimeType: mimeType,
            filename: "\(resourceId).\(ext)",
            fileSize: (try? destURL.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? 0,
            noteId: noteID
        ))

        // file:// URL that WKWebView can load (local access granted via loadFileURL)
        editorCoordinator.insertImage(
            src: destURL.absoluteString,
            alt: url.deletingPathExtension().lastPathComponent,
            resourceId: resourceId
        )
    }
}

// MARK: - Toolbar

struct EditorToolbarView: View {
    @ObservedObject var coordinator: EditorCoordinator
    var onInsertImage: () -> Void

    var body: some View {
        HStack(spacing: 2) {
            // Paragraph / Headings picker
            Menu {
                Button("Paragraph") { coordinator.execCommand("paragraph") }
                Divider()
                ForEach(1...6, id: \.self) { level in
                    Button("Heading \(level)") { coordinator.execCommand("heading\(level)") }
                }
                Divider()
                Button("Code Block") { coordinator.execCommand("codeBlock") }
            } label: {
                Image(systemName: "textformat")
                    .frame(width: 26, height: 22)
                    .contentShape(Rectangle())
            }
            .menuStyle(.borderlessButton)
            .frame(width: 36)

            Divider().frame(height: 16)

            // Inline marks
            FormatToggleButton(icon: "bold", tooltip: "Bold (⌘B)", isActive: coordinator.selectionState.bold) {
                coordinator.execCommand("bold")
            }
            FormatToggleButton(icon: "italic", tooltip: "Italic (⌘I)", isActive: coordinator.selectionState.italic) {
                coordinator.execCommand("italic")
            }
            FormatToggleButton(icon: "strikethrough", tooltip: "Strikethrough", isActive: coordinator.selectionState.strikethrough) {
                coordinator.execCommand("strikethrough")
            }
            FormatToggleButton(icon: "chevron.left.forwardslash.chevron.right", tooltip: "Inline Code (⌘`)", isActive: coordinator.selectionState.code) {
                coordinator.execCommand("code")
            }

            Divider().frame(height: 16)

            // Block formatting
            FormatToggleButton(icon: "quote.opening", tooltip: "Blockquote", isActive: coordinator.selectionState.inBlockquote) {
                coordinator.execCommand("blockquote")
            }

            Divider().frame(height: 16)

            // Lists
            FormatToggleButton(icon: "list.bullet", tooltip: "Bullet List", isActive: coordinator.selectionState.inBulletList) {
                coordinator.execCommand("bulletList")
            }
            FormatToggleButton(icon: "list.number", tooltip: "Numbered List", isActive: coordinator.selectionState.inOrderedList) {
                coordinator.execCommand("orderedList")
            }
            FormatToggleButton(icon: "checklist", tooltip: "Task List", isActive: coordinator.selectionState.inTaskList) {
                coordinator.execCommand("taskList")
            }

            Divider().frame(height: 16)

            // Indent / outdent
            FormatButton(icon: "decrease.indent", tooltip: "Outdent (⇧Tab)") {
                coordinator.execCommand("outdent")
            }
            FormatButton(icon: "increase.indent", tooltip: "Indent (Tab)") {
                coordinator.execCommand("indent")
            }

            Divider().frame(height: 16)

            // Insert
            FormatButton(icon: "photo", tooltip: "Insert Image") {
                onInsertImage()
            }
            FormatButton(icon: "tablecells", tooltip: "Insert Table") {
                coordinator.execCommand("table", value: ["rows": 3, "cols": 3])
            }
            FormatButton(icon: "minus", tooltip: "Horizontal Rule") {
                coordinator.execCommand("horizontalRule")
            }
            FormatButton(icon: "arrowtriangle.right.square", tooltip: "Toggle Block") {
                coordinator.execCommand("toggle")
            }

            Divider().frame(height: 16)

            // Link
            FormatToggleButton(icon: "link", tooltip: "Insert Link", isActive: coordinator.selectionState.hasLink) {
                if coordinator.selectionState.hasLink {
                    coordinator.execCommand("link")  // removes link
                } else {
                    // TODO: show link input panel — for now use a simple prompt
                    showLinkInput()
                }
            }

            Spacer()

            // Undo/redo
            FormatButton(icon: "arrow.uturn.backward", tooltip: "Undo (⌘Z)") {
                coordinator.execCommand("undo")
            }
            FormatButton(icon: "arrow.uturn.forward", tooltip: "Redo (⌘⇧Z)") {
                coordinator.execCommand("redo")
            }
        }
        .contentShape(Rectangle())  // entire toolbar row is event-opaque; gaps between buttons don't fall through
    }

    private func showLinkInput() {
        // Simple NSAlert-based link input for now
        let alert = NSAlert()
        alert.messageText = "Insert Link"
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")

        let input = NSTextField(frame: NSRect(x: 0, y: 0, width: 300, height: 24))
        input.placeholderString = "https://example.com"
        alert.accessoryView = input

        alert.window.initialFirstResponder = input
        let response = alert.runModal()
        if response == .alertFirstButtonReturn {
            let href = input.stringValue.trimmingCharacters(in: .whitespaces)
            if !href.isEmpty {
                coordinator.execCommand("link", value: ["href": href])
            }
        }
    }
}

// MARK: - Format buttons

struct FormatButton: View {
    let icon: String
    let tooltip: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .frame(width: 26, height: 22)
                .contentShape(Rectangle())  // full frame is clickable, not just icon pixels
        }
        .buttonStyle(.borderless)
        .help(tooltip)
        .foregroundStyle(.secondary)
    }
}

struct FormatToggleButton: View {
    let icon: String
    let tooltip: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .frame(width: 26, height: 22)
                .background(isActive ? Color.accentColor.opacity(0.15) : Color.clear)
                .cornerRadius(4)
                .contentShape(Rectangle())  // full frame is clickable
        }
        .buttonStyle(.borderless)
        .help(tooltip)
        .foregroundStyle(isActive ? Color.accentColor : Color.secondary)
    }
}

// MARK: - Debouncer

final class Debouncer {
    private let delay: TimeInterval
    private var workItem: DispatchWorkItem?

    init(delay: TimeInterval) { self.delay = delay }

    func call(action: @escaping () -> Void) {
        workItem?.cancel()
        let item = DispatchWorkItem(block: action)
        workItem = item
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: item)
    }
}

#Preview {
    EditorView()
        .environmentObject(AppState())
}

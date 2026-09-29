import SwiftUI
import WebKit
import AppKit
// QuickLookUI, not QuickLook: on macOS the panel API (QLPreviewPanel,
// QLPreviewPanelDataSource, QLPreviewItem) ships in QuickLookUI, part of the Quartz
// umbrella. QuickLook alone is the iOS controller API and leaves those undefined here.
import QuickLookUI
import UniformTypeIdentifiers

// MARK: - Selection State (mirrors JS SelectionState)

struct EditorSelectionState {
    var bold = false
    var italic = false
    var code = false
    var strikethrough = false
    var highlight = false
    var inCode = false
    var inBlockquote = false
    var inBulletList = false
    var inOrderedList = false
    var inTaskList = false
    var inCheckedTask = false
    var inTable = false    // drives the toolbar's table menu
    var headingLevel = 0   // 0 = paragraph
    var hasLink = false
    var linkHref: String? = nil
}

enum EditorPickerKind { case image, attachment }

// MARK: - Editor Coordinator (owns WKWebView, bridges Swift ↔ JS)

@MainActor
final class EditorCoordinator: NSObject, ObservableObject, WKScriptMessageHandler, WKNavigationDelegate {

    // MARK: Published
    @Published var selectionState = EditorSelectionState()
    @Published var isReady = false
    @Published var isFocused = false
    // Requests shared by the toolbar, the menu bar (MacCommands) and the web view.
    @Published var pickerRequest: EditorPickerKind?
    @Published var isShowingAddLink = false
    @Published var isShowingMarkdownSource = false
    @Published var isShowingFind = false
    @Published var isShowingReplace = false
    @Published var isShowingTrashedEditAlert = false
    // Bumped by every ⌘F so an already-open find field takes focus again.
    @Published var findFocusRequest = 0
    var linkInitialURL = ""
    var linkInitialName = ""
    // False for the placeholder coordinator the empty editor uses to draw a disabled toolbar.
    var hasNote = true
    var readOnly = false

    // The last content this editor is known to hold — written by setContent (what we
    // pushed in) and by the contentChanged message (what the user typed). Lets
    // NoteEditorView tell a sync-pulled external change (DB body differs from this →
    // refresh the editor) from the echo of its own autosave (identical → ignore),
    // without re-keying/reloading the WKWebView.
    var lastKnownTitle: String = ""
    var lastKnownBody: String = ""

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
                let title = body["title"] as? String ?? ""
                lastKnownTitle = title
                lastKnownBody = html
                onContentChanged?(title, html)
            }

        case "selectionChanged":
            if let s = body["selectionState"] as? [String: Any] {
                selectionState = EditorSelectionState(
                    bold: s["bold"] as? Bool ?? false,
                    italic: s["italic"] as? Bool ?? false,
                    code: s["code"] as? Bool ?? false,
                    strikethrough: s["strikethrough"] as? Bool ?? false,
                    highlight: s["highlight"] as? Bool ?? false,
                    inCode: s["inCode"] as? Bool ?? false,
                    inBlockquote: s["inBlockquote"] as? Bool ?? false,
                    inBulletList: s["inBulletList"] as? Bool ?? false,
                    inOrderedList: s["inOrderedList"] as? Bool ?? false,
                    inTaskList: s["inTaskList"] as? Bool ?? false,
                    inCheckedTask: s["inCheckedTask"] as? Bool ?? false,
                    inTable: s["inTable"] as? Bool ?? false,
                    headingLevel: s["headingLevel"] as? Int ?? 0,
                    hasLink: s["hasLink"] as? Bool ?? false,
                    linkHref: s["linkHref"] as? String
                )
            }

        case "imageRequested":
            // User pasted an image — JS sends its raw "data:...;base64,..." URI in
            // `html` (see the paste handler in Mac/EditorBundle/src/index.ts).
            if let dataUri = body["html"] as? String {
                onImageRequested?(dataUri)
            }

        case "openUrl":
            if let urlString = body["url"] as? String,
               let url = URL(string: urlString) {
                NSWorkspace.shared.open(url)
            }

        case "openMaps":
            // A detected address (see the data detectors in EditorBundle) — let the
            // user pick which maps app to open it in.
            if let address = body["url"] as? String {
                presentMapsChooser(address: address)
            }

        case "openAttachment":
            // Attachment card tapped — preview the file in QuickLook, the system's
            // own previewer, rather than handing it to another app.
            if let resourceId = body["resourceId"] as? String,
               let url = DatabaseManager.shared.resourceLocalFileURL(id: resourceId),
               FileManager.default.fileExists(atPath: url.path) {
                AttachmentPreview.show(url: url)
            }

        case "editAttachment":
            // Double-click — open the file in its own app so it can be edited, and
            // start watching it so the change syncs back.
            if let resourceId = body["resourceId"] as? String,
               let url = DatabaseManager.shared.resourceLocalFileURL(id: resourceId),
               FileManager.default.fileExists(atPath: url.path) {
                // The first click of the double click may already have opened the
                // preview panel; close it so it isn't left behind the editing app.
                AttachmentPreview.hide()
                AttachmentEditWatcher.shared.watch(resourceId: resourceId, url: url)
                NSWorkspace.shared.open(url)
            }

        case "focusChanged":
            isFocused = body["focused"] as? Bool ?? false

        case "findResult":
            onFindResult?(body["count"] as? Int ?? 0, body["index"] as? Int ?? 0)

        case "log":
            if let msg = body["message"] as? String {
                print("[Editor JS] \(msg)")
            }

        default:
            break
        }
    }

    // Shared by Mac + iOS builds of the two maps apps' universal-link search URLs.
    // Universal links open the app if installed, otherwise the website — no per-app
    // URL scheme / installed-check needed.
    static func mapsURL(forApp app: String, address: String) -> URL? {
        let query = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? address
        switch app {
        case "google": return URL(string: "https://www.google.com/maps/search/?api=1&query=\(query)")
        case "waze":   return URL(string: "https://waze.com/ul?q=\(query)")
        default:       return nil
        }
    }

    /// NSAlert chooser (Google Maps / Waze) for a detected address, then opens the pick.
    private func presentMapsChooser(address: String) {
        let alert = NSAlert()
        alert.messageText = "Open address in"
        alert.informativeText = address
        alert.addButton(withTitle: "Google Maps")
        alert.addButton(withTitle: "Waze")
        alert.addButton(withTitle: "Cancel")
        let app: String?
        switch alert.runModal() {
        case .alertFirstButtonReturn:  app = "google"
        case .alertSecondButtonReturn: app = "waze"
        default:                       app = nil
        }
        if let app, let url = Self.mapsURL(forApp: app, address: address) {
            NSWorkspace.shared.open(url)
        }
    }

    // MARK: Callbacks set by NoteEditorView
    var onContentChanged: ((String, String) -> Void)?
    var onImageRequested: ((String) -> Void)?
    // In-note find progress: (total matches, 1-based current index; 0 = none).
    var onFindResult: ((Int, Int) -> Void)?

    // MARK: In-note find

    /// caseSensitive is true once Replace is showing, so a replace only rewrites the
    /// exact-case text that was highlighted (see the find plugin in EditorBundle).
    func find(_ query: String, caseSensitive: Bool = false) {
        guard let wv = webView,
              let data = try? JSONEncoder().encode(query),
              let json = String(data: data, encoding: .utf8) else { return }
        wv.evaluateJavaScript("window.NativeEditor?.find(\(json), \(caseSensitive))")
    }

    func findNext() { webView?.evaluateJavaScript("window.NativeEditor?.findNext()") }
    func findPrevious() { webView?.evaluateJavaScript("window.NativeEditor?.findPrevious()") }
    func endFind() { webView?.evaluateJavaScript("window.NativeEditor?.endFind()") }

    func highlightSearch(_ query: String) {
        guard let wv = webView, let json = Self.jsonString(query) else { return }
        wv.evaluateJavaScript("window.NativeEditor?.highlightSearch(\(json))")
    }

    func setDisplay(tint: NotesTint, scale: CGFloat) {
        webView?.evaluateJavaScript("window.NativeEditor?.setDisplay('\(tint.rawValue)', \(scale))")
    }

    func setDateLine(_ text: String) {
        guard let wv = webView, let json = Self.jsonString(text) else { return }
        wv.evaluateJavaScript("window.NativeEditor?.setDateLine(\(json))")
    }

    /// Opens the Add Link sheet with the Name field filled from the current selection.
    func requestAddLink() {
        linkInitialURL = selectionState.linkHref ?? ""
        webView?.evaluateJavaScript("window.NativeEditor?.getSelectedText()") { [weak self] result, _ in
            MainActor.assumeIsolated {
                self?.linkInitialName = result as? String ?? ""
                self?.isShowingAddLink = true
            }
        }
    }

    func insertLink(href: String, name: String) {
        guard let wv = webView, let hrefJSON = Self.jsonString(href), let nameJSON = Self.jsonString(name) else { return }
        wv.window?.makeFirstResponder(wv)
        wv.evaluateJavaScript("window.NativeEditor?.insertLink(\(hrefJSON), \(nameJSON))")
    }

    func openFind(replace: Bool = false) {
        if replace && !readOnly { isShowingReplace = true }
        isShowingFind = true
        findFocusRequest += 1
    }

    private static func jsonString(_ value: String) -> String? {
        guard let data = try? JSONEncoder().encode(value) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func replaceCurrent(_ replacement: String) { evaluateReplace("replaceCurrent", replacement) }
    func replaceAll(_ replacement: String) { evaluateReplace("replaceAll", replacement) }

    private func evaluateReplace(_ method: String, _ replacement: String) {
        guard let wv = webView,
              let data = try? JSONEncoder().encode(replacement),
              let json = String(data: data, encoding: .utf8) else { return }
        wv.evaluateJavaScript("window.NativeEditor?.\(method)(\(json))")
    }

    // MARK: Commands → JS

    func setContent(title: String, body: String) {
        guard let wv = webView else { return }
        lastKnownTitle = title
        lastKnownBody = body
        // JSONEncoder handles bare String top-level values safely.
        // NSJSONSerialization throws an ObjC NSException (not a Swift Error) for
        // bare strings, which bypasses try? and corrupts SwiftUI's run loop state,
        // freezing the entire UI after the first note is selected.
        guard let titleData = try? JSONEncoder().encode(title),
              let titleJSON = String(data: titleData, encoding: .utf8),
              let bodyData = try? JSONEncoder().encode(body),
              let bodyJSON = String(data: bodyData, encoding: .utf8) else { return }
        wv.evaluateJavaScript("window.NativeEditor?.setContent(\(titleJSON), \(bodyJSON))")
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

    // MARK: Native toolbar inset (content flowing under the translucent toolbar)

    /// Pushes the note's content down by `points` inside the WebView's own scrollable
    /// area (see build.mjs's --native-toolbar-inset), so text
    /// starts right below the toolbar visually but can still scroll further up
    /// underneath its translucent material instead of hard-clipping flush against it.
    /// The WKWebView itself extends full-height under the toolbar (see
    /// RichTextEditorView's .ignoresSafeArea below) — this is what keeps the *content*
    /// looking like it starts in the same place it used to.
    func setTopInset(_ points: CGFloat) {
        guard let wv = webView else { return }
        wv.evaluateJavaScript("document.documentElement.style.setProperty('--native-toolbar-inset', '\(points)px')")
    }

    // MARK: WKNavigationDelegate — content process recovery

    // WebKit can kill the editor page's content process (memory pressure, long
    // background stretches). Without this, the editor silently turns blank/broken
    // and stays that way until the app is relaunched. Reloading re-runs the page,
    // which re-fires the JS "ready" message — isReady flipping back to true makes
    // NoteEditorView push the current content back in via its onChange(of: isReady).
    nonisolated func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        MainActor.assumeIsolated {
            isReady = false
            webView.reload()
        }
    }

    // MARK: WKNavigationDelegate — open links in default browser

    nonisolated func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        // WebKit always calls navigation delegate methods on the main thread, so it's
        // safe to assume isolation here — navigationAction's properties are main-actor
        // isolated in the current SDK even though this delegate method itself isn't.
        MainActor.assumeIsolated {
            if navigationAction.navigationType == .linkActivated,
               let url = navigationAction.request.url {
                decisionHandler(.cancel)
                NSWorkspace.shared.open(url)
                return
            }
            decisionHandler(.allow)
        }
    }

    // MARK: Image insertion

    /// Inserts a file attachment card (see the `attachment` node in the editor schema).
    func insertAttachment(resourceId: String, title: String, size: Int, mime: String) {
        execCommand("attachment", value: [
            "resourceId": resourceId,
            "title": title,
            "size": size,
            "mime": mime,
        ])
    }

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
    weak var coordinator: EditorCoordinator?

    private static let editingKeys: Set<NSEvent.SpecialKey> = [.delete, .backspace, .deleteForward, .carriageReturn, .newline, .enter, .tab]

    // A trashed note is read-only; typing into it asks to restore it, as in Notes.
    override func keyDown(with event: NSEvent) {
        if let coordinator, coordinator.readOnly,
           event.modifierFlags.intersection([.command, .control]).isEmpty,
           event.specialKey == nil || Self.editingKeys.contains(event.specialKey!), event.keyCode != 53,
           let characters = event.characters, !characters.isEmpty {
            coordinator.isShowingTrashedEditAlert = true
            return
        }
        super.keyDown(with: event)
    }

    // Edit > Find (the system submenu) drives the in-note find bar.
    @objc override func performTextFinderAction(_ sender: Any?) {
        guard let coordinator, let tag = (sender as? NSValidatedUserInterfaceItem)?.tag,
              let action = NSTextFinder.Action(rawValue: tag) else { return }
        switch action {
        case .showFindInterface: coordinator.openFind()
        case .showReplaceInterface: coordinator.openFind(replace: true)
        case .nextMatch: coordinator.isShowingFind ? coordinator.findNext() : coordinator.openFind()
        case .previousMatch: coordinator.isShowingFind ? coordinator.findPrevious() : coordinator.openFind()
        case .hideFindInterface:
            coordinator.isShowingFind = false
            coordinator.focus()
        default: break
        }
    }

    @objc func performFindPanelAction(_ sender: Any?) {
        performTextFinderAction(sender)
    }

    override func validateUserInterfaceItem(_ item: NSValidatedUserInterfaceItem) -> Bool {
        if item.action == #selector(performTextFinderAction(_:)) || item.action == #selector(performFindPanelAction(_:)) {
            return coordinator?.hasNote == true
        }
        return super.validateUserInterfaceItem(item)
    }
    override func hitTest(_ point: NSPoint) -> NSView? {
        // `point` arrives in the superview's coordinate space, not our own — must
        // convert before comparing against `bounds`, or this check is meaningless
        // whenever our frame origin isn't (0, 0) in the superview (the normal case).
        let localPoint = superview?.convert(point, to: self) ?? point
        guard bounds.contains(localPoint) else { return nil }
        return super.hitTest(point)
    }

    // MARK: QuickLook panel control
    //
    // QLPreviewPanel is shared app-wide and picks its controller by walking the
    // responder chain for the first object that accepts control. This web view is
    // the first responder whenever an attachment card is clicked, so it answers on
    // the panel's behalf and points it at AttachmentPreview. Simple types (images,
    // PDFs, text) often render even with no controller, but the out-of-process
    // previewers for Office documents don't, which is why a .docx opened nothing
    // at all before this. Apple's documented pattern, and it also gives the panel
    // somewhere to hand key events back to.

    override func acceptsPreviewPanelControl(_ panel: QLPreviewPanel!) -> Bool { true }

    override func beginPreviewPanelControl(_ panel: QLPreviewPanel!) {
        panel.dataSource = AttachmentPreview.shared
    }

    override func endPreviewPanelControl(_ panel: QLPreviewPanel!) {
        panel.dataSource = nil
    }
}


// MARK: - WKWebView NSViewRepresentable

struct RichTextEditorView: NSViewRepresentable {
    @ObservedObject var coordinator: EditorCoordinator
    var readOnly: Bool = false

    func makeNSView(context: Context) -> EditorWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.add(coordinator, name: "editorMessage")

        let wv = EditorWebView(frame: .zero, configuration: config)
        wv.setValue(false, forKey: "drawsBackground") // transparent — body bg handles color
        wv.navigationDelegate = coordinator
        wv.coordinator = coordinator
        coordinator.webView = wv
        coordinator.readOnly = readOnly
        #if DEBUG
        // Lets Safari's Develop menu attach to this WKWebView (Develop > [device name] >
        // NotesTN) for real console errors/breakpoints — debug builds only.
        if #available(macOS 13.3, *) { wv.isInspectable = true }
        #endif

        // Load editor.html from the app bundle.
        // allowingReadAccessTo must cover BOTH the bundle directory (editor.html,
        // editor.bundle.js) AND ~/Library/Application Support/NotesTN/resources/
        // (user image attachments). The home directory is the common ancestor for
        // debug builds (bundle is under ~/Library/Developer/Xcode/DerivedData).
        if let htmlURL = Bundle.main.url(forResource: "editor", withExtension: "html", subdirectory: nil) {
            let accessRoot = FileManager.default.homeDirectoryForCurrentUser
            // ?readonly=1 disables ProseMirror's contentEditable entirely for a trashed
            // note opened from Trash — see EditorBundle/src/index.ts. Appended via
            // URLComponents since htmlURL is a file:// URL (query strings are still
            // valid there and WKWebView preserves them for location.search).
            var components = URLComponents(url: htmlURL, resolvingAgainstBaseURL: false)
            components?.queryItems = [URLQueryItem(name: "platform", value: "mac")]
            if readOnly { components?.queryItems?.append(URLQueryItem(name: "readonly", value: "1")) }
            wv.loadFileURL(components?.url ?? htmlURL, allowingReadAccessTo: accessRoot)
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
    // Drives the disabled toolbar shown when no note is open.
    @StateObject private var placeholderCoordinator: EditorCoordinator = {
        let coordinator = EditorCoordinator()
        coordinator.hasNote = false
        return coordinator
    }()
    @State private var isShowingFormatPopover = false

    var body: some View {
        Group {
            if let note = appState.selectedNote {
                NoteEditorView(note: note, readOnly: appState.isTrashSelected)
                    // Read-only is baked into the web view, so a restored note gets a new one.
                    .id("\(note.id)-\(appState.isTrashSelected)")
            } else {
                Color(nsColor: .textBackgroundColor)
                    .ignoresSafeArea()
                    .toolbar {
                        EditorToolbar(coordinator: placeholderCoordinator, isShowingFormatPopover: $isShowingFormatPopover)
                    }
            }
        }
    }
}

// MARK: - Note Editor

struct NoteEditorView: View {
    @EnvironmentObject var appState: AppState

    @StateObject private var editorCoordinator = EditorCoordinator()
    // Which picker the single .fileImporter below is currently standing in for.
    // pickerKind is set before opening and left alone afterwards, so it's still valid
    // when the completion handler runs.
    @State private var pickerKind: EditorPickerKind = .image
    @State private var isShowingPicker = false
    // A picked file waiting on the "this is a large file" confirmation below.
    @State private var oversizeAttachment: URL?
    @State private var isShowingFormatPopover = false
    @State private var findQuery = ""
    @State private var findCount = 0
    @State private var findCurrent = 0
    @State private var replaceText = ""
    // Captured below (see the GeometryReader background) from the safe area the
    // native window toolbar reserves — pushed into the WebView's own content via
    // editorCoordinator.setTopInset so it can flow its full height underneath the
    // toolbar's translucent material instead of hard-clipping flush against it.
    @State private var toolbarInset: CGFloat = 0
    @AppStorage(NotesTint.storageKey) private var tint: NotesTint = .yellow
    @AppStorage(NoteTextSize.storageKey) private var textSizeIndex = NoteTextSize.defaultIndex
    private let noteID: String
    private let initialTitle: String
    private let initialBody: String
    private let readOnly: Bool

    init(note: Note, readOnly: Bool = false) {
        self.noteID = note.id
        self.initialTitle = note.title
        self.initialBody = note.body
        self.readOnly = readOnly
    }

    var body: some View {
        dialogs(editorContent)
    }

    private var editorContent: some View {
        VStack(spacing: 0) {
            if editorCoordinator.isShowingFind {
                EditorFindBar(
                    query: $findQuery,
                    replacement: $replaceText,
                    showReplace: $editorCoordinator.isShowingReplace,
                    current: findCurrent,
                    count: findCount,
                    canReplace: !readOnly,
                    focusRequest: editorCoordinator.findFocusRequest,
                    onNext: { editorCoordinator.findNext() },
                    onPrevious: { editorCoordinator.findPrevious() },
                    onReplace: { editorCoordinator.replaceCurrent(replaceText) },
                    onReplaceAll: { editorCoordinator.replaceAll(replaceText) },
                    onClose: {
                        editorCoordinator.isShowingFind = false
                        editorCoordinator.focus()
                    }
                )
            }

            // Title now lives inside the shared ProseMirror doc (see
            // Mac/EditorBundle's `pm-title` node), so it scrolls together with
            // the body instead of sitting in a separate native field above it.
            // .ignoresSafeArea lets this extend its full height underneath the native
            // toolbar's translucent material — toolbarInset (captured below) tells the
            // WebView's own content to leave the same visual gap it used to via CSS
            // padding instead, so text still starts in the same place but can keep
            // scrolling up underneath the toolbar instead of hard-clipping against it.
            RichTextEditorView(coordinator: editorCoordinator, readOnly: readOnly)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .ignoresSafeArea(edges: editorCoordinator.isShowingFind ? [] : .top)
        }
        .background(
            // Reads the safe area the native toolbar reserves — measured on this
            // (non-ignoring) VStack, not on RichTextEditorView itself, since a view
            // that's ignoring a safe area no longer reports an inset for that edge.
            GeometryReader { proxy in
                Color.clear
                    .onAppear { toolbarInset = proxy.safeAreaInsets.top }
                    .onChange(of: proxy.safeAreaInsets.top) { _, newValue in toolbarInset = newValue }
            }
        )
        .onChange(of: toolbarInset) { _, _ in pushTopInset() }
        .onChange(of: editorCoordinator.isShowingFind) { _, showing in
            pushTopInset()
            if showing {
                editorCoordinator.find(findQuery, caseSensitive: editorCoordinator.isShowingReplace)
            } else {
                endFind()
            }
        }
        .background(Color(nsColor: .textBackgroundColor))
        .focusedSceneObject(editorCoordinator)
        .toolbar {
            EditorToolbar(coordinator: editorCoordinator, isShowingFormatPopover: $isShowingFormatPopover)
        }
        .onAppear {
            editorCoordinator.readOnly = readOnly
            setupCallbacks()
        }
        .onChange(of: findQuery) { _, q in
            guard editorCoordinator.isShowingFind else { return }
            editorCoordinator.find(q, caseSensitive: editorCoordinator.isShowingReplace)
        }
        // Toggling Replace changes how matches are found (exact case while replacing),
        // so re-run the search against the current query.
        .onChange(of: editorCoordinator.isShowingReplace) { _, replacing in
            guard editorCoordinator.isShowingFind else { return }
            editorCoordinator.find(findQuery, caseSensitive: replacing)
        }
        .onChange(of: editorCoordinator.isReady) { _, ready in
            // Reads the note fresh from AppState (falling back to the values captured
            // at init) — isReady also re-fires after a content-process-terminate
            // reload (see EditorCoordinator.webViewWebContentProcessDidTerminate),
            // by which time the init-time snapshot may be stale.
            guard ready else { return }
            pushTopInset()
            pushDisplay()
            let note = currentNote
            editorCoordinator.setContent(title: note?.title ?? initialTitle, body: note?.body ?? initialBody)
            pushDateLine()
            reapplyHighlights()
            // A just-created note starts with the cursor in its empty title, so typing
            // names it straight away (see AppState.createNote). setContent leaves the
            // selection at the very start of the document, which is the title, so this
            // only has to take focus. Existing notes keep focus wherever it was.
            if let id = note?.id, appState.consumePendingFocus(noteID: id), !readOnly {
                DispatchQueue.main.async { editorCoordinator.focus() }
            }
        }
        // A sync pull that updates the currently open note used to leave the editor
        // showing the old content (it was only ever set once per note id) — the list
        // preview and the editor would disagree until the note was reopened or the
        // app relaunched, and the next autosave would overwrite the pulled remote
        // edit with the stale editor content. lastKnown* filtering keeps this from
        // reacting to the echo of the editor's own autosaves.
        .onChange(of: currentNote?.updatedTime) { _, _ in
            guard editorCoordinator.isReady, let note = currentNote else { return }
            pushDateLine()
            if note.title != editorCoordinator.lastKnownTitle || note.body != editorCoordinator.lastKnownBody {
                editorCoordinator.setContent(title: note.title, body: note.body)
                reapplyHighlights()
            }
        }
        .onChange(of: tint) { _, _ in pushDisplay() }
        .onChange(of: textSizeIndex) { _, _ in pushDisplay() }
        .onChange(of: appState.searchText) { _, query in
            guard editorCoordinator.isReady, !editorCoordinator.isShowingFind else { return }
            editorCoordinator.highlightSearch(query)
        }
        .onChange(of: editorCoordinator.pickerRequest) { _, request in
            guard let request, !readOnly else { return }
            editorCoordinator.pickerRequest = nil
            pickerKind = request
            isShowingPicker = true
        }
    }

    private func dialogs(_ content: some View) -> some View {
        content
        // ONE file importer for both the image and attachment pickers, switching its
        // allowed types on pickerKind. Two .fileImporter modifiers stacked on the same
        // view is a SwiftUI trap — the second one often never presents.
        .fileImporter(
            isPresented: $isShowingPicker,
            allowedContentTypes: pickerKind == .image ? [.image] : [.item],
            allowsMultipleSelection: false
        ) { result in
            switch pickerKind {
            case .image: handleImagePick(result: result)
            case .attachment: handleAttachmentPick(result: result)
            }
        }
        .alert(
            "Attach this large file?",
            isPresented: Binding(
                get: { oversizeAttachment != nil },
                set: { if !$0 { oversizeAttachment = nil } }
            )
        ) {
            Button("Cancel", role: .cancel) { oversizeAttachment = nil }
            Button("Attach") {
                if let url = oversizeAttachment { attachFile(at: url) }
                oversizeAttachment = nil
            }
            .keyboardShortcut(.defaultAction)
        } message: {
            Text("This file is over 20 MB. It will be uploaded to Joplin Cloud and downloaded onto your other devices.")
        }
        .alert("Notes in the Trash can’t be edited.", isPresented: $editorCoordinator.isShowingTrashedEditAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Restore") {
                // Opens the restored note in its notebook so it can be edited straight away.
                guard let note = trashedNote else { return }
                appState.restoreNote(note)
                appState.selectFolder(appState.folders.first { $0.id == note.folderId })
                appState.selectNote(note)
            }
            .keyboardShortcut(.defaultAction)
        } message: {
            Text("To edit this note, you’ll need to restore it.")
        }
        .sheet(isPresented: $editorCoordinator.isShowingAddLink) {
            AddLinkSheet(initialURL: editorCoordinator.linkInitialURL, initialName: editorCoordinator.linkInitialName) { url, name in
                editorCoordinator.insertLink(href: url, name: name)
            }
        }
        .sheet(isPresented: $editorCoordinator.isShowingMarkdownSource) {
            MarkdownSourceView(markdown: markdownSource)
        }
    }

    private var markdownSource: String {
        let body: String = HtmlToMarkdown.convert(editorCoordinator.lastKnownBody)
        return "# " + editorCoordinator.lastKnownTitle + "\n\n" + body
    }

    private func pushTopInset() {
        // With the find bar open the web view sits below it rather than under the toolbar.
        editorCoordinator.setTopInset(editorCoordinator.isShowingFind ? 0 : toolbarInset)
    }

    // setContent rebuilds the editor state, which drops find and search matches.
    private func reapplyHighlights() {
        if editorCoordinator.isShowingFind {
            editorCoordinator.find(findQuery, caseSensitive: editorCoordinator.isShowingReplace)
        } else if !appState.searchText.isEmpty {
            editorCoordinator.highlightSearch(appState.searchText)
        }
    }

    private func pushDisplay() {
        editorCoordinator.setDisplay(tint: tint, scale: NoteTextSize.scale(forIndex: textSizeIndex))
    }

    private func pushDateLine() {
        guard let note = currentNote else { return }
        editorCoordinator.setDateLine(editorDateLine(note.updatedTime))
    }

    private var trashedNote: Note? {
        appState.trashedNotes.first { $0.id == noteID }
    }

    /// The freshest copy of this view's note in AppState (live or trashed) — the
    /// init-time title/body snapshot goes stale as soon as the user types or a sync
    /// pulls a newer version.
    private var currentNote: Note? {
        appState.notes.first { $0.id == noteID } ?? trashedNote
    }

    // MARK: Setup

    private func setupCallbacks() {
        // Title now arrives from the same combined callback as the body (see
        // Mac/EditorBundle's `pm-title` node) — one save path instead of the old
        // separate immediate-body-save / debounced-title-save paths.
        editorCoordinator.onContentChanged = { title, html in
            // Falls back to the DB copy when the note isn't in appState.notes — it can
            // legitimately be missing (e.g. an active search whose results no longer
            // include it after this very edit); returning here silently dropped the
            // user's keystrokes.
            guard var updated = self.appState.notes.first(where: { $0.id == self.noteID })
                ?? DatabaseManager.shared.fetchNote(id: self.noteID) else { return }
            updated.title = title
            updated.body = html
            self.appState.saveNote(updated)
        }
        editorCoordinator.onImageRequested = { dataUri in
            guard let resource = copyDataUriIntoResources(dataUri: dataUri, noteId: noteID),
                  let dir = DatabaseManager.shared.resourcesDirectory else { return }
            // file:// URL that WKWebView can load (local access granted via loadFileURL)
            editorCoordinator.insertImage(
                src: dir.appendingPathComponent(resource.filename).absoluteString,
                alt: resource.title,
                resourceId: resource.id
            )
        }
        editorCoordinator.onFindResult = { count, index in
            findCount = count
            findCurrent = index
        }
    }

    // MARK: Find

    private func endFind() {
        editorCoordinator.isShowingReplace = false
        findQuery = ""
        replaceText = ""
        findCount = 0
        findCurrent = 0
        editorCoordinator.endFind()
        if !appState.searchText.isEmpty { editorCoordinator.highlightSearch(appState.searchText) }
    }

    // MARK: Attachment handling

    /// Files at or above this size prompt for confirmation first — every attachment is
    /// uploaded to Joplin Cloud and downloaded onto every other device.
    private static let largeAttachmentBytes = 20 * 1_000_000

    private func handleAttachmentPick(result: Result<[URL], Error>) {
        guard case .success(let urls) = result, let url = urls.first else { return }
        let size = (try? url.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? 0
        if size >= Self.largeAttachmentBytes {
            oversizeAttachment = url   // ask first (see the confirmationDialog above)
        } else {
            attachFile(at: url)
        }
    }

    /// True for anything the system recognises as an image (PNG, JPEG, HEIC, GIF, TIFF
    /// and the rest), read from the file's own content type where possible and from its
    /// extension otherwise.
    private func isImageFile(_ url: URL) -> Bool {
        if let type = (try? url.resourceValues(forKeys: [.contentTypeKey]))?.contentType {
            return type.conforms(to: .image)
        }
        return UTType(filenameExtension: url.pathExtension)?.conforms(to: .image) ?? false
    }

    /// Copies the file into the resources directory, records it as a Resource so sync
    /// picks it up, and inserts the attachment card.
    private func attachFile(at url: URL) {
        // An image picked with the paperclip goes in as an image rather than a file
        // card: it's the same resource either way, and seeing the picture is more
        // useful than a card naming it.
        if isImageFile(url) {
            insertImageFile(at: url)
            return
        }

        let resourceId = Note.generateId()
        guard let resourcesDir = DatabaseManager.shared.resourcesDirectory else { return }

        let ext = url.pathExtension.isEmpty ? "bin" : url.pathExtension
        let filename = "\(resourceId).\(ext)"
        let destURL = resourcesDir.appendingPathComponent(filename)
        do {
            try FileManager.default.copyItem(at: url, to: destURL)
        } catch {
            print("[Editor] Failed to copy attachment: \(error)")
            return
        }

        let size = (try? destURL.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? 0
        let mimeType = UTType(filenameExtension: ext)?.preferredMIMEType ?? "application/octet-stream"
        let displayName = url.lastPathComponent
        // New resource, never seen by Joplin Cloud yet — dirty so it gets pushed, not
        // synced since the server doesn't know about it.
        DatabaseManager.shared.saveResource(Resource(
            id: resourceId,
            title: displayName,
            mimeType: mimeType,
            filename: filename,
            fileSize: size,
            noteId: noteID
        ), dirty: true, synced: false)

        editorCoordinator.insertAttachment(
            resourceId: resourceId,
            title: displayName,
            size: size,
            mime: mimeType
        )
    }

    // MARK: Image handling

    private func handleImagePick(result: Result<[URL], Error>) {
        guard case .success(let urls) = result, let url = urls.first else { return }
        insertImageFile(at: url)
    }

    /// Copies an image into the resources directory, records it as a Resource so sync
    /// picks it up, and inserts it into the note. Shared by the image button and by the
    /// paperclip when what was picked turns out to be an image.
    private func insertImageFile(at url: URL) {
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
        // New resource, never seen by Joplin Cloud yet — dirty so it gets pushed, not
        // synced since the server doesn't know about it.
        DatabaseManager.shared.saveResource(Resource(
            id: resourceId,
            title: url.lastPathComponent,
            mimeType: mimeType,
            filename: "\(resourceId).\(ext)",
            fileSize: (try? destURL.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? 0,
            noteId: noteID
        ), dirty: true, synced: false)

        // file:// URL that WKWebView can load (local access granted via loadFileURL)
        editorCoordinator.insertImage(
            src: destURL.absoluteString,
            alt: url.deletingPathExtension().lastPathComponent,
            resourceId: resourceId
        )
    }

    /// Counterpart to handleImagePick for the paste-from-clipboard path — the editor
    /// bundle hands us a raw "data:image/png;base64,..." URI (see the paste handler in
    /// Mac/EditorBundle/src/index.ts) instead of a picked file URL, since there's no
    /// system picker involved.
    private func copyDataUriIntoResources(dataUri: String, noteId: String) -> Resource? {
        guard let commaIndex = dataUri.firstIndex(of: ","),
              let dir = DatabaseManager.shared.resourcesDirectory else { return nil }

        let header = dataUri[dataUri.index(dataUri.startIndex, offsetBy: "data:".count)..<commaIndex]
        let mimeType = String(header.split(separator: ";").first ?? "image/png")
        let base64 = String(dataUri[dataUri.index(after: commaIndex)...])
        guard let bytes = Data(base64Encoded: base64) else { return nil }

        let ext = UTType(mimeType: mimeType)?.preferredFilenameExtension ?? "png"
        let resourceId = Note.generateId()
        let filename = "\(resourceId).\(ext)"
        do {
            try bytes.write(to: dir.appendingPathComponent(filename))
        } catch {
            print("[Editor] Failed to write pasted image: \(error)")
            return nil
        }

        let resource = Resource(
            id: resourceId,
            title: filename,
            mimeType: mimeType,
            filename: filename,
            fileSize: bytes.count,
            noteId: noteId
        )
        // New resource, never seen by Joplin Cloud yet — dirty so it gets pushed, not
        // synced since the server doesn't know about it.
        DatabaseManager.shared.saveResource(resource, dirty: true, synced: false)
        return resource
    }
}

// MARK: - Attachment editing (watch for changes made in other apps)

/// Watches attachment files that were opened for editing, so a change made in Word (or
/// any other app) gets re-uploaded to Joplin Cloud instead of sitting in the local copy
/// forever.
///
/// Detection compares modification date + size whenever the app comes back to the
/// foreground, rather than watching the file descriptor. Editors like Word save
/// atomically — writing a temp file and renaming it over the original — which replaces
/// the inode and makes a descriptor watch miss the change completely. Returning to the
/// app after saving is also exactly when the note should catch up.
///
/// Mac only: it lives in this file (rather than Sync/, which is shared with the iOS
/// target) because it depends on AppKit, and because editing attachments is a desktop
/// feature — mobile is preview-only.
///
/// Known limitation: tracking is in-memory and starts at the double click, so it only
/// covers files opened for editing in the current app session. Edit an attachment and
/// quit Notes TN before switching back to it, or reopen the file later from the other
/// app's Recents, and the change stays on disk and is never uploaded, while the
/// resource still looks synced. Closing that gap needs a check of every local resource
/// file against its recorded size at launch, which is a bigger change than this one.
@MainActor
final class AttachmentEditWatcher {
    static let shared = AttachmentEditWatcher()

    /// Posted once an edited attachment has been flagged for upload, so AppState can
    /// start a sync — it owns the sync engine, this type deliberately doesn't.
    static let didDetectEdit = Notification.Name("AttachmentEditWatcherDidDetectEdit")

    private struct Snapshot {
        let url: URL
        var modified: Date?
        var size: Int
    }

    private var watched: [String: Snapshot] = [:]   // resourceId → last known state

    private init() {
        NotificationCenter.default.addObserver(
            forName: NSApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { _ in
            MainActor.assumeIsolated { AttachmentEditWatcher.shared.checkForEdits() }
        }
    }

    /// Starts tracking a resource's file, recording its current state so a later change
    /// can be spotted. Called when an attachment is opened for editing.
    func watch(resourceId: String, url: URL) {
        watched[resourceId] = Snapshot(
            url: url,
            modified: Self.modificationDate(of: url),
            size: Self.fileSize(of: url)
        )
    }

    /// Re-checks every tracked file; anything that changed is flagged for upload.
    func checkForEdits() {
        guard !watched.isEmpty else { return }
        var didChange = false

        for (resourceId, snapshot) in watched {
            // A missing file is left alone — dropping the resource over a local mishap
            // would delete it from every other device too.
            guard FileManager.default.fileExists(atPath: snapshot.url.path) else { continue }
            let modified = Self.modificationDate(of: snapshot.url)
            let size = Self.fileSize(of: snapshot.url)
            guard modified != snapshot.modified || size != snapshot.size else { continue }

            DatabaseManager.shared.markResourceEdited(id: resourceId, fileSize: size)
            DatabaseManager.shared.updateAttachmentCardSizes(resourceId: resourceId, fileSize: size)
            watched[resourceId] = Snapshot(url: snapshot.url, modified: modified, size: size)
            didChange = true
        }

        if didChange {
            NotificationCenter.default.post(name: Self.didDetectEdit, object: nil)
        }
    }

    private static func modificationDate(of url: URL) -> Date? {
        (try? url.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate
    }

    private static func fileSize(of url: URL) -> Int {
        (try? url.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? 0
    }
}

// MARK: - Attachment preview (QuickLook)

/// Presents an attachment in QuickLook — the same preview you get from Space in
/// Finder. QLPreviewPanel is a shared, app-wide panel that pulls its items from a
/// data source, so this singleton holds the URL being previewed and acts as that
/// source. Using the system panel rather than opening the file in another app keeps
/// the preview lightweight and read-only.
final class AttachmentPreview: NSObject, QLPreviewPanelDataSource {
    /// fileprivate, not private: EditorWebView hands this to the panel when QuickLook
    /// asks the responder chain who's controlling it (see its beginPreviewPanelControl).
    fileprivate static let shared = AttachmentPreview()
    private var url: URL?

    static func show(url: URL) {
        shared.url = url
        guard let panel = QLPreviewPanel.shared() else { return }
        // The data source is also set by EditorWebView.beginPreviewPanelControl when
        // the panel picks its controller; setting it here as well keeps the first
        // frame right if the panel is already open with a different file.
        panel.dataSource = shared
        if panel.isVisible {
            panel.reloadData()
        } else {
            panel.makeKeyAndOrderFront(nil)
        }
    }

    /// Closes the panel if it's showing one of our attachments — used when a double
    /// click turns a preview into an edit.
    static func hide() {
        guard shared.url != nil, let panel = QLPreviewPanel.shared(), panel.isVisible else { return }
        shared.url = nil
        panel.orderOut(nil)
    }

    func numberOfPreviewItems(in panel: QLPreviewPanel!) -> Int { url == nil ? 0 : 1 }

    func previewPanel(_ panel: QLPreviewPanel!, previewItemAt index: Int) -> QLPreviewItem! {
        url as NSURL?
    }
}

// MARK: - Date line

// .long + .short gives "28 September 2026 at 12:21", with the locale's own connector.
private let editorDateFormatter: DateFormatter = {
    let f = DateFormatter(); f.dateStyle = .long; f.timeStyle = .short; return f
}()

func editorDateLine(_ date: Date) -> String {
    editorDateFormatter.string(from: date)
}

// MARK: - Toolbar

/// The editor column's toolbar: New Note, then one group (Aa, Checklist, Table,
/// Attach, More). The search field comes from ContentView's .searchable, which macOS
/// places after these.
struct EditorToolbar: ToolbarContent {
    @EnvironmentObject var appState: AppState
    @ObservedObject var coordinator: EditorCoordinator
    @Binding var isShowingFormatPopover: Bool

    private var canEdit: Bool { coordinator.hasNote && !coordinator.readOnly }
    private var state: EditorSelectionState { coordinator.selectionState }

    var body: some ToolbarContent {
        // Not .navigation: macOS puts that right after the list column's title.
        ToolbarItem {
            Button { appState.createNote() } label: {
                Label("New Note", systemImage: "square.and.pencil")
            }
            .help("New Note")
            .disabled(appState.isTrashSelected)
        }

        ToolbarSpacer(.flexible)

        ToolbarItemGroup {
            Button { isShowingFormatPopover = true } label: {
                Label("Format", systemImage: "textformat")
            }
            .help("Format")
            .disabled(!canEdit || coordinator.isShowingFind || !(coordinator.isFocused || isShowingFormatPopover))
            .popover(isPresented: $isShowingFormatPopover, arrowEdge: .bottom) {
                FormatPopover(coordinator: coordinator, isPresented: $isShowingFormatPopover)
            }

            Button { coordinator.execCommand("taskList") } label: {
                Label("Checklist", systemImage: "checklist")
            }
            .help("Checklist")
            .disabled(!canEdit || coordinator.isShowingFind || state.inTable)

            TableMenu(coordinator: coordinator)
                .disabled(!canEdit || coordinator.isShowingFind)

            Menu {
                Button("Insert Image…") { coordinator.pickerRequest = .image }
                Button("Attach File…") { coordinator.pickerRequest = .attachment }
                    .keyboardShortcut("a", modifiers: [.command, .shift])
            } label: {
                Label("Attach", systemImage: "paperclip")
            }
            .menuIndicator(.hidden)
            .help("Attach")
            .disabled(!canEdit)

            Menu {
                Button("Show Markdown Source") { coordinator.isShowingMarkdownSource = true }
                    .keyboardShortcut("u", modifiers: [.command, .option])
                Divider()
                Button("Add Link…") { coordinator.requestAddLink() }
                    .keyboardShortcut("k", modifiers: .command)
                Divider()
                Button("Find…") { coordinator.openFind() }
                    .keyboardShortcut("f", modifiers: .command)
            } label: {
                Label("More", systemImage: "ellipsis")
            }
            .menuIndicator(.hidden)
            .help("More")
            .disabled(!canEdit)
        }

        ToolbarSpacer(.flexible)
    }
}

/// The toolbar's table control: inserts a table, or inside one offers the row and
/// column actions. Every item runs a prosemirror-tables command through the shared
/// bundle (see commands.ts), which is also what decides whether an action applies.
struct TableMenu: View {
    @ObservedObject var coordinator: EditorCoordinator

    var body: some View {
        if coordinator.selectionState.inTable {
            Menu {
                Button("Add Row Above") { coordinator.execCommand("rowBefore") }
                Button("Add Row Below") { coordinator.execCommand("rowAfter") }
                Button("Delete Row") { coordinator.execCommand("deleteRow") }
                Divider()
                Button("Add Column Before") { coordinator.execCommand("columnBefore") }
                Button("Add Column After") { coordinator.execCommand("columnAfter") }
                Button("Delete Column") { coordinator.execCommand("deleteColumn") }
                Divider()
                Button("Delete Table") { coordinator.execCommand("deleteTable") }
            } label: {
                Label("Table", systemImage: "tablecells")
            }
            .menuIndicator(.hidden)
            .help("Table")
        } else {
            Button {
                coordinator.execCommand("table", value: ["rows": 3, "cols": 3])
            } label: {
                Label("Table", systemImage: "tablecells")
            }
            .help("Table")
        }
    }
}

// MARK: - Format popover

/// The Aa popover (Figma component Editor/Format Popover): inline styles and indent
/// on top, then the paragraph styles, each drawn in its own style.
private struct FormatPopover: View {
    @ObservedObject var coordinator: EditorCoordinator
    @AppStorage(NotesTint.storageKey) private var tint: NotesTint = .yellow
    @Binding var isPresented: Bool

    private struct Style {
        let title: String
        let command: String
        let font: Font
        let isCurrent: (EditorSelectionState) -> Bool
        var isChip = false
    }

    private static let styles: [Style] = [
        Style(title: "Title", command: "heading1", font: .system(size: 21, weight: .semibold)) { $0.headingLevel == 1 },
        Style(title: "Heading", command: "heading2", font: .system(size: 16, weight: .bold)) { $0.headingLevel == 2 || $0.headingLevel == 3 },
        Style(title: "Subheading", command: "heading4", font: .system(size: 13, weight: .bold)) { $0.headingLevel >= 4 },
        Style(title: "Body", command: "paragraph", font: .system(size: 13)) { isBody($0) },
        Style(title: "Monostyled", command: "code", font: .system(size: 13, design: .monospaced)) { $0.code },
        Style(title: "Code Block", command: "codeBlock", font: .system(size: 13, design: .monospaced), isCurrent: { $0.inCode }, isChip: true),
        Style(title: "• Bulleted List", command: "bulletList", font: .system(size: 13)) { $0.inBulletList },
        Style(title: "1. Numbered List", command: "orderedList", font: .system(size: 13)) { $0.inOrderedList },
    ]
    private static let blockQuote = Style(title: "| Block Quote", command: "blockquote", font: .system(size: 13)) { $0.inBlockquote }

    static let ink = dynamicColor(light: 0x424242, dark: 0xFFFFFF)

    static func isBody(_ state: EditorSelectionState) -> Bool {
        state.headingLevel == 0 && !state.code && !state.inCode && !state.inBulletList && !state.inOrderedList && !state.inBlockquote
    }

    var body: some View {
        let state = coordinator.selectionState
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 0) {
                markButton("bold", "Bold", state.bold, "bold")
                markButton("italic", "Italic", state.italic, "italic")
                markButton("strikethrough", "Strikethrough", state.strikethrough, "strikethrough")
                markButton("highlighter", "Highlight", state.highlight, "highlight")
                PopoverSeparator()
                    .frame(width: 1, height: 18)
                    .padding(.leading, 3)
                    .padding(.trailing, 5)
                markButton("decrease.indent", "Decrease Indent", false, "outdent", width: 26)
                markButton("increase.indent", "Increase Indent", false, "indent", width: 26)
            }
            .padding(.leading, 2)
            .frame(height: 39)

            PopoverSeparator().frame(height: 1).padding(.horizontal, 7)
            VStack(alignment: .leading, spacing: 0) {
                ForEach(Self.styles, id: \.title) { styleRow($0, state: state) }
            }
            .padding(.top, 7)
            .padding(.bottom, 6)
            PopoverSeparator().frame(height: 1).padding(.horizontal, 7)
            styleRow(Self.blockQuote, state: state)
                .padding(.vertical, 7)
        }
        .foregroundStyle(Self.ink)
        .frame(width: 179)
    }

    private func markButton(_ symbol: String, _ help: String, _ isActive: Bool, _ command: String, width: CGFloat = 28) -> some View {
        Button { coordinator.execCommand(command) } label: {
            Image(systemName: symbol)
                .font(.system(size: 14, weight: .medium))
                .frame(width: width, height: 26)
                .foregroundStyle(isActive ? tint.accent : Self.ink)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .help(help)
    }

    private func styleRow(_ style: Style, state: EditorSelectionState) -> some View {
        Button {
            coordinator.execCommand(style.command)
            isPresented = false
        } label: {
            HStack(spacing: 0) {
                Image(systemName: "checkmark")
                    .font(.system(size: 11))
                    .padding(.leading, 16)
                    .frame(width: 36, alignment: .leading)
                    .opacity(style.isCurrent(state) ? 1 : 0)
                Text(style.title)
                    .font(style.font)
                    .padding(.horizontal, style.isChip ? 5 : 0)
                    .padding(.vertical, style.isChip ? 2 : 0)
                    .background(style.isChip ? RoundedRectangle(cornerRadius: 4).fill(Color.primary.opacity(0.09)) : nil)
                    .padding(.leading, style.isChip ? -5 : 0)
                Spacer(minLength: 0)
            }
            .frame(height: 29)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

private struct PopoverSeparator: View {
    var body: some View { Rectangle().fill(Color(white: 0xAA / 255)) }
}

// MARK: - Find bar

/// In-note find bar (⌘F): a search field with the match count, previous/next, Done
/// and the Replace checkbox, plus a replace row when that's on. Laid out as the
/// Figma Editor/Find Bar component (Notes' own find bar).
struct EditorFindBar: View {
    @Binding var query: String
    @Binding var replacement: String
    @Binding var showReplace: Bool
    let current: Int
    let count: Int
    let canReplace: Bool
    let focusRequest: Int
    var onNext: () -> Void
    var onPrevious: () -> Void
    var onReplace: () -> Void
    var onReplaceAll: () -> Void
    var onClose: () -> Void

    var body: some View {
        VStack(spacing: 6) {
            HStack(spacing: 8) {
                FindField(text: $query, count: query.isEmpty ? nil : count, focusRequest: focusRequest, onNext: onNext, onPrevious: onPrevious, onCancel: onClose)
                ControlGroup {
                    // ⌘G / ⇧⌘G while the field has focus: Edit > Find stops at its field editor.
                    Button(action: onPrevious) { Image(systemName: "chevron.left") }
                        .keyboardShortcut("g", modifiers: [.command, .shift])
                        .help("Previous")
                    Button(action: onNext) { Image(systemName: "chevron.right") }
                        .keyboardShortcut("g", modifiers: .command)
                        .help("Next")
                }
                .fixedSize()
                .disabled(count == 0)
                Button("Done", action: onClose)
                if canReplace {
                    Toggle("Replace", isOn: $showReplace)
                        .toggleStyle(.checkbox)
                        .padding(.leading, -2)
                }
            }
            if showReplace && canReplace {
                HStack(spacing: 8) {
                    TextField("Replace", text: $replacement)
                        .textFieldStyle(.roundedBorder)
                        .controlSize(.regular)
                        .font(.system(size: 11))
                        .onSubmit(onReplace)
                    HStack(spacing: 6) {
                        Button(action: onReplace) { Text("Replace").frame(maxWidth: .infinity) }
                            .frame(width: 68)
                        Button(action: onReplaceAll) { Text("All").frame(maxWidth: .infinity) }
                            .frame(width: 40)
                    }
                    .disabled(count == 0)
                    Spacer(minLength: 0)
                        .frame(width: 36)
                }
            }
        }
        .controlSize(.small)
        .padding(.horizontal, 7)
        .padding(.vertical, 5)
        .background(dynamicColor(light: 0xFDFDFD, dark: 0x212525))
        .overlay(alignment: .bottom) { Divider() }
    }
}

/// NSSearchField with the match count drawn inside it, left of the clear button.
private struct FindField: NSViewRepresentable {
    @Binding var text: String
    let count: Int?
    let focusRequest: Int
    var onNext: () -> Void
    var onPrevious: () -> Void
    var onCancel: () -> Void

    func makeNSView(context: Context) -> NSSearchField {
        let field = NSSearchField()
        field.delegate = context.coordinator
        field.controlSize = .regular
        field.font = .systemFont(ofSize: NSFont.smallSystemFontSize)
        field.sendsSearchStringImmediately = true
        field.focusRingType = .exterior
        let countLabel = NSTextField(labelWithString: "")
        countLabel.font = .systemFont(ofSize: 13)
        countLabel.textColor = .secondaryLabelColor
        countLabel.translatesAutoresizingMaskIntoConstraints = false
        field.addSubview(countLabel)
        NSLayoutConstraint.activate([
            countLabel.centerYAnchor.constraint(equalTo: field.centerYAnchor),
            countLabel.trailingAnchor.constraint(equalTo: field.trailingAnchor, constant: -20),
        ])
        context.coordinator.countLabel = countLabel
        DispatchQueue.main.async { field.window?.makeFirstResponder(field) }
        return field
    }

    func updateNSView(_ field: NSSearchField, context: Context) {
        context.coordinator.parent = self
        if field.stringValue != text { field.stringValue = text }
        if context.coordinator.focusRequest != focusRequest {
            context.coordinator.focusRequest = focusRequest
            DispatchQueue.main.async {
                field.window?.makeFirstResponder(field)
                field.selectText(nil)
            }
        }
        context.coordinator.countLabel?.stringValue = count.map(String.init) ?? ""
    }

    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

    final class Coordinator: NSObject, NSSearchFieldDelegate {
        var parent: FindField
        var focusRequest: Int
        weak var countLabel: NSTextField?

        init(parent: FindField) {
            self.parent = parent
            focusRequest = parent.focusRequest
        }

        func controlTextDidChange(_ obj: Notification) {
            guard let field = obj.object as? NSSearchField else { return }
            parent.text = field.stringValue
        }

        func control(_ control: NSControl, textView: NSTextView, doCommandBy selector: Selector) -> Bool {
            switch selector {
            case #selector(NSResponder.insertNewline(_:)):
                NSApp.currentEvent?.modifierFlags.contains(.shift) == true ? parent.onPrevious() : parent.onNext()
                return true
            case #selector(NSResponder.insertBacktab(_:)): parent.onPrevious(); return true
            case #selector(NSResponder.cancelOperation(_:)): parent.onCancel(); return true
            default: return false
            }
        }
    }
}

// MARK: - Add Link sheet

private struct AddLinkSheet: View {
    let initialURL: String
    let initialName: String
    var onAdd: (String, String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var url = ""
    @State private var name = ""

    private var trimmedURL: String { url.trimmingCharacters(in: .whitespacesAndNewlines) }

    // "example.com" would otherwise be saved as a relative link that opens nothing.
    // Joplin note links (":/id"), anchors and paths, and URLs with a scheme stay as typed.
    private var linkURL: String {
        let url = trimmedURL
        let lower = url.lowercased()
        let keeps = [":/", "#", "/"].contains { url.hasPrefix($0) }
            || lower.contains("://")
            || ["mailto:", "tel:", "file:", "joplin:"].contains { lower.hasPrefix($0) }
        if keeps { return url }
        let isEmail = url.range(of: "^[^\\s/:@]+@[^\\s/@]+\\.[^\\s/@]+$", options: .regularExpression) != nil
        return (isEmail ? "mailto:" : "https://") + url
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Add Link")
                .font(.system(size: 13, weight: .bold))
                .frame(maxWidth: .infinity)
                .padding(.bottom, 16)
            Text("Link To")
                .foregroundStyle(.secondary)
                .padding(.leading, 10)
                .padding(.bottom, 9)
            TextField("Enter a URL", text: $url, axis: .vertical)
                .lineLimit(3, reservesSpace: true)
                .textFieldStyle(.roundedBorder)
                .padding(.bottom, 19)
            Text("Name")
                .foregroundStyle(.secondary)
                .padding(.leading, 10)
                .padding(.bottom, 11)
            TextField("", text: $name)
                .textFieldStyle(.roundedBorder)
                .controlSize(.large)
                .overlay(alignment: .trailing) {
                    if !name.isEmpty {
                        Button { name = "" } label: {
                            Image(systemName: "xmark.circle.fill").foregroundStyle(.tertiary)
                        }
                        .buttonStyle(.plain)
                        .padding(.trailing, 12)
                        .help("Clear")
                    }
                }
                .padding(.bottom, 27)
            HStack(spacing: 8) {
                Spacer()
                Button("Cancel") { dismiss() }
                    .keyboardShortcut(.cancelAction)
                    .frame(width: 74)
                Button {
                    onAdd(linkURL, name)
                    dismiss()
                } label: {
                    Text("OK").frame(maxWidth: .infinity)
                }
                .keyboardShortcut(.defaultAction)
                .frame(width: 74)
                .disabled(trimmedURL.isEmpty)
            }
        }
        .padding(20)
        .frame(width: 420)
        .onAppear {
            url = initialURL
            name = initialName
        }
    }
}

// MARK: - Markdown source viewer

/// Read-only view of a note's Markdown source (what HtmlToMarkdown produces from the
/// current editor HTML). A debugging aid for tracing HTML rendering issues back to
/// their stored/synced Markdown.
private struct MarkdownSourceView: View {
    let markdown: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 14) {
            Text("Markdown Source")
                .font(.system(size: 13, weight: .bold))
            ScrollView {
                Text(markdown.isEmpty ? "(empty)" : markdown)
                    .font(.system(size: 12, design: .monospaced))
                    .lineSpacing(3)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
            }
            .background(RoundedRectangle(cornerRadius: 6).fill(dynamicColor(light: 0xFFFFFF, dark: 0x202326)))
            .overlay(RoundedRectangle(cornerRadius: 6).strokeBorder(Color(nsColor: .separatorColor)))
            .padding(.bottom, 2)
            HStack(spacing: 8) {
                Spacer()
                Button {
                    NSPasteboard.general.clearContents()
                    NSPasteboard.general.setString(markdown, forType: .string)
                } label: {
                    Text("Copy").frame(maxWidth: .infinity)
                }
                .frame(width: 74)
                Button { dismiss() } label: {
                    Text("Done").frame(maxWidth: .infinity)
                }
                .keyboardShortcut(.defaultAction)
                .frame(width: 74)
            }
        }
        .padding(20)
        .frame(width: 560, height: 440)
    }
}

#Preview {
    EditorView()
        .environmentObject(AppState())
}

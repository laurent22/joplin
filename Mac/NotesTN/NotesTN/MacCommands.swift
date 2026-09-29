import SwiftUI

struct MacCommands: Commands {
    @ObservedObject var appState: AppState
    @ObservedObject var accountStore: JoplinAccountStore
    @FocusedObject private var editor: EditorCoordinator?
    @Environment(\.openWindow) private var openWindow

    private var mainWindow: NSWindow? {
        NSApp.windows.first { $0.isVisible && $0.identifier?.rawValue.hasPrefix("main") == true }
    }

    // The sheets and alerts these items raise live on the main window; after ⌘W
    // closed it, reopen it first so they appear now rather than on the next reopen.
    private func inMainWindow(_ action: () -> Void) {
        if mainWindow == nil { openWindow(id: "main") }
        action()
    }

    private var editableEditor: EditorCoordinator? {
        guard let editor, !editor.readOnly else { return nil }
        return editor
    }

    var body: some Commands {
        CommandGroup(after: .appSettings) {
            Divider()
            if let account = accountStore.account {
                Button {} label: { Label("Logged in as \(account.email)", systemImage: "person.crop.circle") }
                    .disabled(true)
                Group {
                    Button { appState.syncNow() } label: { Label("Sync Now", systemImage: "arrow.clockwise") }
                        .keyboardShortcut("r", modifiers: .command)
                    Button { inMainWindow { appState.isConfirmingForceResync = true } } label: { Label("Force Resync…", systemImage: "arrow.triangle.2.circlepath") }
                    Button { inMainWindow { appState.isConfirmingLogout = true } } label: { Label("Log Out of Joplin Cloud…", systemImage: "rectangle.portrait.and.arrow.right") }
                }
                .disabled(appState.isSyncing)
            } else {
                Button { inMainWindow { appState.isShowingJoplinLogin = true } } label: { Label("Log In to Joplin Cloud…", systemImage: "person.crop.circle") }
            }
        }

        CommandGroup(replacing: .newItem) {
            Button { inMainWindow { appState.createNote() } } label: { Label("New Note", systemImage: "square.and.pencil") }
                .keyboardShortcut("n", modifiers: .command)
                .disabled(appState.isTrashSelected)
            Button { inMainWindow { appState.isShowingNewNotebook = true } } label: { Label("New Notebook", systemImage: "folder.badge.plus") }
                .keyboardShortcut("n", modifiers: [.command, .shift])
        }
        CommandGroup(replacing: .importExport) {}
        CommandGroup(replacing: .printItem) {
            Divider()
            let note = appState.isTrashSelected ? nil : appState.selectedNote
            Button {
                if let note { appState.togglePin(note) }
            } label: {
                Label(note?.isPinned == true ? "Unpin Note" : "Pin Note", systemImage: note?.isPinned == true ? "pin.slash" : "pin")
            }
            .disabled(note == nil)
        }

        CommandGroup(after: .pasteboard) {
            Divider()
            Button { editableEditor?.pickerRequest = .attachment } label: { Label("Attach File…", systemImage: "paperclip") }
                .keyboardShortcut("a", modifiers: [.command, .shift])
                .disabled(editableEditor == nil)
            Button { editableEditor?.pickerRequest = .image } label: { Label("Insert Image…", systemImage: "photo") }
                .disabled(editableEditor == nil)
            Button { editableEditor?.requestAddLink() } label: { Label("Add Link…", systemImage: "link") }
                .keyboardShortcut("k", modifiers: .command)
                .disabled(editableEditor == nil)
        }

        CommandGroup(replacing: .textFormatting) {
            formatMenu
        }

        CommandGroup(replacing: .sidebar) {}
        // Replaces ToolbarCommands, whose Hide Toolbar carries ⌥⌘T (Format > Table's
        // shortcut here, as in Notes), and keeps these two items first in View.
        CommandGroup(replacing: .toolbar) {
            Button {
                appState.sidebarVisibility = appState.sidebarVisibility == .all ? .doubleColumn : .all
            } label: {
                Label(appState.sidebarVisibility == .all ? "Hide Notebooks" : "Show Notebooks", systemImage: "sidebar.left")
            }
            .keyboardShortcut("s", modifiers: [.command, .control])
            Button {
                editor?.isShowingMarkdownSource = true
            } label: {
                Label("Show Markdown Source", systemImage: "doc.plaintext")
            }
            .keyboardShortcut("u", modifiers: [.command, .option])
            .disabled(editor == nil)
            Divider()
            Button(appState.isToolbarHidden ? "Show Toolbar" : "Hide Toolbar") {
                guard let window = mainWindow else { return }
                window.toggleToolbarShown(nil)
                appState.isToolbarHidden = window.toolbar?.isVisible == false
            }
        }
    }

    @ViewBuilder
    private var formatMenu: some View {
        let state = editor?.selectionState ?? EditorSelectionState()
        let isBody = state.headingLevel == 0 && !state.code && !state.inCode && !state.inBulletList && !state.inOrderedList && !state.inBlockquote
        Group {
            styleToggle("Title", isOn: state.headingLevel == 1, command: "heading1", key: "t")
            styleToggle("Heading", isOn: state.headingLevel == 2 || state.headingLevel == 3, command: "heading2", key: "h")
            styleToggle("Subheading", isOn: state.headingLevel >= 4, command: "heading4", key: "j")
            styleToggle("Body", isOn: isBody, command: "paragraph", key: "b")
            styleToggle("Monostyled", isOn: state.code, command: "code", key: "m")
            styleToggle("Code Block", isOn: state.inCode, command: "codeBlock")
            styleToggle("Bulleted List", isOn: state.inBulletList, command: "bulletList", key: "7")
            styleToggle("Numbered List", isOn: state.inOrderedList, command: "orderedList", key: "9")
            styleToggle("Block Quote", isOn: state.inBlockquote, command: "blockquote", key: "'", modifiers: .command)
        }
        Divider()
        Toggle(isOn: commandBinding(state.inTaskList, "taskList")) {
            Label("Checklist", systemImage: "checklist")
        }
        .keyboardShortcut("l", modifiers: [.command, .shift])
        .disabled(editableEditor == nil || state.inTable)
        Divider()
        Button {
            editableEditor?.execCommand("table", value: ["rows": 3, "cols": 3])
        } label: {
            Label("Table", systemImage: "tablecells")
        }
        .keyboardShortcut("t", modifiers: [.command, .option])
        .disabled(editableEditor == nil || state.inTable)
        Button("Insert Horizontal Rule") { editableEditor?.execCommand("horizontalRule") }
            .disabled(editableEditor == nil)
        Divider()
        Menu {
            Toggle("Bold", isOn: commandBinding(state.bold, "bold"))
                .keyboardShortcut("b", modifiers: .command)
            Toggle("Italic", isOn: commandBinding(state.italic, "italic"))
                .keyboardShortcut("i", modifiers: .command)
            Toggle("Strikethrough", isOn: commandBinding(state.strikethrough, "strikethrough"))
            Toggle("Highlight", isOn: commandBinding(state.highlight, "highlight"))
        } label: {
            Label("Text", systemImage: "textformat")
        }
        .disabled(editableEditor == nil)
        Menu {
            Button("Increase") { editableEditor?.execCommand("indent") }
                .keyboardShortcut("]", modifiers: .command)
            Button("Decrease") { editableEditor?.execCommand("outdent") }
                .keyboardShortcut("[", modifiers: .command)
        } label: {
            Label("Indentation", systemImage: "increase.indent")
        }
        .disabled(editableEditor == nil)
    }

    private func styleToggle(_ title: String, isOn: Bool, command: String, key: KeyEquivalent? = nil, modifiers: EventModifiers = [.command, .shift]) -> some View {
        // Radio-style: picking the current style again leaves it applied.
        Toggle(title, isOn: Binding(get: { isOn }, set: { _ in if !isOn { editableEditor?.execCommand(command) } }))
            .keyboardShortcut(key.map { KeyboardShortcut($0, modifiers: modifiers) })
            .disabled(editableEditor == nil)
    }

    private func commandBinding(_ isOn: Bool, _ command: String) -> Binding<Bool> {
        Binding(get: { isOn }, set: { _ in editableEditor?.execCommand(command) })
    }
}

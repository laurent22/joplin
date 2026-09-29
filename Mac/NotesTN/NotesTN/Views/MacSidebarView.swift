import SwiftUI

private enum SidebarPalette {
    static let label = dynamicColor(light: 0x191918, dark: 0xF1F5F5)
    static let count = dynamicColor(light: 0xB9B9B9, dark: 0x5E6161)
    static let selectionUnfocused = dynamicColor(light: 0xEFEFEF, dark: 0x2B2E2E)
    static let selectionInactiveWindow = dynamicColor(light: 0xF7F7F7, dark: 0x252828)
}

// Row tags: real folder ids are 32-char hex, so these can't collide.
private let allNotesTag = "__all__"
private let trashTag = "__trash__"

struct MacSidebarView: View {
    @EnvironmentObject var appState: AppState
    @FocusState private var isFocused: Bool
    @Environment(\.appearsActive) private var appearsActive
    @AppStorage(NotesTint.storageKey) private var tint: NotesTint = .yellow
    @FocusState private var isRenameFieldFocused: Bool
    @State private var renamingFolderID: String?
    @State private var renameText = ""
    @State private var deletingFolder: Folder?

    private let db = DatabaseManager.shared

    // While searching, Notes shows All Notes selected (search covers every note);
    // picking a notebook ends the search.
    private var selection: Binding<String> {
        Binding(
            get: {
                if !appState.searchText.isEmpty { return allNotesTag }
                if appState.isTrashSelected { return trashTag }
                return appState.selectedFolderID ?? allNotesTag
            },
            set: { tag in
                if !appState.searchText.isEmpty { appState.search("") }
                switch tag {
                case trashTag: appState.selectTrash()
                case allNotesTag: appState.selectFolder(nil)
                default: appState.selectFolder(appState.folders.first { $0.id == tag })
                }
            }
        )
    }

    private var orderedTags: [String] { [allNotesTag, trashTag] + appState.folders.map(\.id) }

    // The selection is drawn here, not by List(selection:): the native capsule uses the
    // app's built-in accent colour, so it can't follow Settings > Tint.
    var body: some View {
        List {
            row("All Notes", systemImage: "note.text", count: db.noteCount(trashed: false), tag: allNotesTag)
            row("Trash", systemImage: "trash", count: db.noteCount(trashed: true), tag: trashTag)

            Section("Notebooks") {
                ForEach(appState.folders) { folder in
                    if renamingFolderID == folder.id {
                        Label {
                            TextField("", text: $renameText)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 145)
                                .padding(.leading, -5)
                                .focused($isRenameFieldFocused)
                                .onSubmit { commitRename(folder) }
                                .onExitCommand { renamingFolderID = nil }
                                .onChange(of: isRenameFieldFocused) { _, focused in
                                    if !focused { commitRename(folder) }
                                }
                        } icon: {
                            Image(systemName: "folder")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(labelColor(isSelected: selection.wrappedValue == folder.id))
                        }
                        .listRowBackground(selectionPill(isSelected: selection.wrappedValue == folder.id))
                    } else {
                        row(folder.title, systemImage: "folder", count: db.noteCount(folderId: folder.id), tag: folder.id)
                            .contextMenu {
                                Button { startRename(folder) } label: { Label("Rename Notebook", systemImage: "pencil") }
                                Button { deletingFolder = folder } label: { Label("Delete Notebook", systemImage: "trash") }
                                Divider()
                                Button { appState.isShowingNewNotebook = true } label: { Label("New Notebook", systemImage: "folder.badge.plus") }
                            }
                    }
                }
            }
        }
        .listStyle(.sidebar)
        .focusable()
        .focusEffectDisabled()
        .focused($isFocused)
        .onMoveCommand { direction in
            guard let index = orderedTags.firstIndex(of: selection.wrappedValue) else { return }
            switch direction {
            case .up where index > 0: selection.wrappedValue = orderedTags[index - 1]
            case .down where index < orderedTags.count - 1: selection.wrappedValue = orderedTags[index + 1]
            default: break
            }
        }
        .onChange(of: isFocused) { _, focused in appState.isSidebarFocused = focused }
        .toolbar {
            ToolbarItem {
                Button { appState.isShowingNewNotebook = true } label: {
                    Label("New Notebook", systemImage: "folder.badge.plus")
                }
                .help("New Notebook")
            }
        }
        .alert(
            "Are you sure you want to delete this notebook?",
            isPresented: Binding(get: { deletingFolder != nil }, set: { if !$0 { deletingFolder = nil } })
        ) {
            Button("Cancel", role: .cancel) {}
            // Notes draws this as the accent default button, not a red destructive one.
            Button("Delete") {
                if let deletingFolder { appState.deleteFolder(deletingFolder) }
            }
            .keyboardShortcut(.defaultAction)
        } message: {
            Text("The notebook, its sub-notebooks and their notes will be moved to the Trash.")
        }
    }

    // A custom label rather than .badge: the design's count is Regular 13 on the label's
    // line, and the selected row keeps an accent label while the sidebar isn't focused.
    private func row(_ title: String, systemImage: String, count: Int, tag: String) -> some View {
        let isSelected = selection.wrappedValue == tag
        let labelColor = labelColor(isSelected: isSelected)
        return HStack(spacing: 0) {
            Label {
                Text(title)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(labelColor)
            } icon: {
                Image(systemName: systemImage)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(labelColor)
            }
            Spacer(minLength: 8)
            Text(verbatim: "\(count)")
                .font(.system(size: 13))
                .foregroundStyle(isSelected && isFocused && appearsActive ? Color.white : SidebarPalette.count)
        }
        .lineLimit(1)
        .contentShape(Rectangle())
        .onTapGesture {
            selection.wrappedValue = tag
            isFocused = true
        }
        .listRowBackground(selectionPill(isSelected: isSelected))
    }

    private func selectionPill(isSelected: Bool) -> some View {
        let fill: Color
        if !isSelected {
            fill = .clear
        } else if !appearsActive {
            fill = SidebarPalette.selectionInactiveWindow
        } else {
            fill = isFocused ? tint.accent : SidebarPalette.selectionUnfocused
        }
        return RoundedRectangle(cornerRadius: 8)
            .fill(fill)
            .padding(.horizontal, 10)
    }

    private func labelColor(isSelected: Bool) -> Color {
        guard isSelected else { return SidebarPalette.label }
        if !appearsActive { return tint.accentTextInactive }
        return isFocused ? .white : tint.accentText
    }

    private func startRename(_ folder: Folder) {
        renameText = folder.title
        renamingFolderID = folder.id
        DispatchQueue.main.async { isRenameFieldFocused = true }
    }

    private func commitRename(_ folder: Folder) {
        guard renamingFolderID == folder.id else { return }
        renamingFolderID = nil
        appState.renameFolder(folder, to: renameText)
    }
}

struct NewNotebookSheet: View {
    var onCreate: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var name = "New Notebook"
    @FocusState private var isNameFocused: Bool

    private var trimmedName: String { name.trimmingCharacters(in: .whitespaces) }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("New Notebook")
                .font(.system(size: 13, weight: .bold))
            HStack(spacing: 0) {
                Text("Name:")
                    .frame(width: 51, alignment: .leading)
                TextField("", text: $name)
                    .textFieldStyle(.roundedBorder)
                    .labelsHidden()
                    .frame(width: 310)
                    .focused($isNameFocused)
                    .onSubmit(create)
            }
            HStack(spacing: 8) {
                Spacer()
                Button { dismiss() } label: { Text("Cancel").frame(maxWidth: .infinity) }
                    .keyboardShortcut(.cancelAction)
                    .frame(width: 80)
                Button(action: create) { Text("OK").frame(maxWidth: .infinity) }
                    .keyboardShortcut(.defaultAction)
                    .frame(width: 80)
                    .disabled(trimmedName.isEmpty)
            }
        }
        .padding(20)
        .frame(width: 401)
        .onAppear { isNameFocused = true }
    }

    private func create() {
        guard !trimmedName.isEmpty else { return }
        onCreate(trimmedName)
        dismiss()
    }
}

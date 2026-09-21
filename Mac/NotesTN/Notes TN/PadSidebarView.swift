import SwiftUI
import UIKit

// iPad-only. Fresh rebuild (per request) — a plain, default-styled List, no custom
// row backgrounds/highlight colors/height tweaks. Not shared with iPhone (which keeps
// using the existing SidebarView.swift) or Mac (its own SidebarView.swift). Goal for
// now is just validating the 3-column NavigationSplitView's resize/collapse behavior
// with real data — visual polish is a follow-up once that's confirmed working.
private let allNotesSentinel = "__all__"
private let trashSentinel = "__trash__"

struct PadSidebarView: View {
    @EnvironmentObject var appState: AppState
    @ObservedObject private var joplinAccountStore = JoplinAccountStore.shared

    @State private var isAddingFolder = false
    @State private var newFolderName: String = ""
    @FocusState private var isAddingFolderFieldFocused: Bool
    @State private var showLogoutConfirm = false

    // Long-press (contextMenu) Rename — swaps the row for an inline text field,
    // same pattern as Mac's SidebarView.swift but using .onSubmit/@FocusState
    // instead of onCommit/onExitCommandCompat (macOS-only).
    @State private var renamingFolderID: String?
    @State private var renameText: String = ""
    @FocusState private var isRenameFieldFocused: Bool
    @State private var folderPendingDelete: Folder?

    // Binding<String?> — the optional-selection List(selection:) overload is what
    // NavigationSplitView needs to detect a row tap and push the content column
    // forward when columns are collapsed (narrow window).
    private var selection: Binding<String?> {
        Binding<String?>(
            get: {
                if appState.isTrashSelected { return trashSentinel }
                return appState.selectedFolderID ?? allNotesSentinel
            },
            set: { newValue in
                switch newValue {
                case trashSentinel: appState.selectTrash()
                case allNotesSentinel, nil: appState.selectFolder(nil)
                default:
                    let folder = appState.folders.first { $0.id == newValue }
                    appState.selectFolder(folder)
                }
            }
        )
    }

    // Currently-selected row's tag — used to pick which row gets the highlighted
    // background below.
    private var selectedTag: String {
        if appState.isTrashSelected { return trashSentinel }
        return appState.selectedFolderID ?? allNotesSentinel
    }

    // Gray selection highlight (50% lighter than plain gray — i.e. brightness 0.75,
    // not 0.25) with 16px rounded corners, matching the note list's selection style —
    // small horizontal inset so the corners are visible instead of clipped by the
    // list's edge. Color(white:) is a fixed grayscale value that doesn't adapt to
    // dark mode on its own, so it's wrapped in a dynamic UIColor with a separate,
    // appropriately-dark value for dark mode instead.
    private static let selectionGray = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark ? UIColor(white: 0.3, alpha: 1) : UIColor(white: 0.9, alpha: 1)
    })

    private func rowBackground(_ tag: String) -> some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(selectedTag == tag ? Self.selectionGray : Color.clear)
            .padding(.horizontal, 8)
    }

    // Black in light mode, light gray in dark mode — same dynamic-UIColor approach as
    // selectionGray above, since Color.black alone doesn't adapt on its own.
    private static let counterColor = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark ? UIColor(white: 0.9, alpha: 1) : UIColor.black
    })

    // Queries the database directly instead of filtering appState.notes — that array
    // is scoped to whichever folder is currently selected, so counting against it
    // would show 0 for every notebook except the selected one. Same approach as
    // Mac's SidebarView.swift.
    // Uses the dedicated COUNT(*) query — the old fetchNotes(folderId:).count
    // materialized every note's full HTML body per folder, per sidebar render (and
    // the sidebar re-renders on every AppState publish, i.e. every keystroke).
    private func noteCount(for folder: Folder) -> Int {
        DatabaseManager.shared.noteCount(folderId: folder.id)
    }

    var body: some View {
        List(selection: selection) {
            Section {
                Label("All Notes", systemImage: "note.text")
                    .tag(allNotesSentinel)
                    .listRowBackground(rowBackground(allNotesSentinel))
                Label("Trash", systemImage: "trash")
                    .tag(trashSentinel)
                    .listRowBackground(rowBackground(trashSentinel))
            }
            Section("Notebooks") {
                ForEach(appState.folders) { folder in
                    if renamingFolderID == folder.id {
                        HStack {
                            Image(systemName: "folder")
                                .foregroundStyle(.secondary)
                            TextField("Notebook name", text: $renameText)
                                .focused($isRenameFieldFocused)
                                .submitLabel(.done)
                                .onSubmit {
                                    appState.renameFolder(folder, to: renameText)
                                    renamingFolderID = nil
                                }
                        }
                    } else {
                        HStack {
                            Label(folder.title, systemImage: "folder")
                            Spacer()
                            Text("\(noteCount(for: folder))")
                                .font(.system(size: 11))
                                .foregroundStyle(Self.counterColor)
                        }
                        .tag(folder.id)
                        .listRowBackground(rowBackground(folder.id))
                        .contextMenu {
                            Button {
                                renameText = folder.title
                                renamingFolderID = folder.id
                                isRenameFieldFocused = true
                            } label: {
                                Label("Rename", systemImage: "pencil")
                            }
                            Button(role: .destructive) {
                                folderPendingDelete = folder
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                    }
                }
                if isAddingFolder {
                    HStack {
                        Image(systemName: "folder.badge.plus")
                            .foregroundStyle(.secondary)
                        TextField("Notebook name", text: $newFolderName)
                            .focused($isAddingFolderFieldFocused)
                            .submitLabel(.done)
                            .onSubmit {
                                let name = newFolderName.trimmingCharacters(in: .whitespaces)
                                if !name.isEmpty {
                                    appState.createFolder(title: name)
                                }
                                newFolderName = ""
                                isAddingFolder = false
                                isAddingFolderFieldFocused = false
                            }
                    }
                }
            }
        }
        // Same list style the note list already uses (PadNoteListView). Without it this
        // List defaults to the sidebar style inside NavigationSplitView, and on iPadOS
        // that style paints a persistent tinted outline around the selected row, which
        // stacked on top of the row background we draw ourselves. The note list, being
        // .plain, never showed that. Rows keep their own selection highlight either way.
        .listStyle(.plain)
        .navigationTitle("Notes TN")
        // Syncing spinner — same appState.isSyncing signal + placement Mac/iPhone's
        // SidebarView.swift already uses; iPad had no visual feedback for this at all
        // before, making a running (or silently failed) sync look like nothing was
        // happening.
        .safeAreaInset(edge: .top) {
            // Always rendered, hidden via opacity — conditionally inserting the
            // spinner changed the safe-area inset, shifting the entire sidebar down
            // and back up every time the 2s-debounced background push ran (i.e.
            // periodically while typing). Same fix as Mac/iPhone's SidebarView.swift.
            ProgressView()
                .controlSize(.small)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .opacity(appState.isSyncing ? 1 : 0)
        }
        // Bottom-left: create a new notebook. Bottom-right: connect to Joplin Cloud /
        // force resync, behind a single icon (a Menu) rather than several separate
        // buttons.
        .safeAreaInset(edge: .bottom) {
            HStack {
                Button {
                    isAddingFolder = true
                    isAddingFolderFieldFocused = true
                } label: {
                    Image(systemName: "folder.badge.plus")
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .padding(.leading, 8)

                Spacer()

                Menu {
                    if let account = joplinAccountStore.account {
                        Text("Signed in as \(account.email)")
                        Button {
                            appState.syncNow(force: true)
                        } label: {
                            Label("Force Resync", systemImage: "arrow.triangle.2.circlepath")
                        }
                        Button(role: .destructive) {
                            showLogoutConfirm = true
                        } label: {
                            Label("Log Out", systemImage: "rectangle.portrait.and.arrow.right")
                        }
                    } else {
                        Button {
                            appState.isShowingJoplinLogin = true
                        } label: {
                            Label("Log In to Joplin Cloud…", systemImage: "person.crop.circle.badge.plus")
                        }
                    }
                } label: {
                    Image(systemName: "person.crop.circle")
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .padding(.trailing, 8)
            }
        }
        .confirmationDialog(
            "Log out of Joplin Cloud on this device? Your local notes stay put.",
            isPresented: $showLogoutConfirm,
            titleVisibility: .visible
        ) {
            Button("Log Out", role: .destructive) { joplinAccountStore.clear() }
            Button("Cancel", role: .cancel) {}
        }
        .confirmationDialog(
            "Delete \"\(folderPendingDelete?.title ?? "")\"? Its notes move to Trash.",
            isPresented: Binding(get: { folderPendingDelete != nil }, set: { if !$0 { folderPendingDelete = nil } }),
            titleVisibility: .visible
        ) {
            Button("Delete Notebook", role: .destructive) {
                if let folder = folderPendingDelete { appState.deleteFolder(folder) }
                folderPendingDelete = nil
            }
            Button("Cancel", role: .cancel) { folderPendingDelete = nil }
        }
    }
}

#Preview {
    PadSidebarView()
        .environmentObject(AppState())
}

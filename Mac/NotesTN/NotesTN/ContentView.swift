import SwiftUI
import AppKit

// Mac only. NavigationSplitView's `ideal:` width is only a hint for the very first
// layout pass — but macOS's own window-state restoration ("Resume") separately
// remembers and re-applies the whole window's last saved layout (including the
// NavigationSplitView's NSSplitView divider positions) on every launch, AFTER that
// initial layout, silently overriding our `ideal:` value.
//
// A previous attempt reached into the NSSplitView directly and forced a divider
// position — that fought the `.balanced` style's own layout math and ended up
// resizing the WRONG divider (the sidebar/content one), shrinking the sidebar
// instead. Reaching into live AppKit layout state like that is too fragile.
//
// The standard, supported fix is simpler: opt the window itself out of state
// restoration via `NSWindow.isRestorable = false`. With nothing saved to restore,
// NavigationSplitView always falls back to its `ideal:` starting widths — no divider
// manipulation needed. Side effect: the window's position/size also won't be
// remembered across launches anymore (this is an all-or-nothing switch, not
// divider-specific) — flagging this in case it matters later.
private struct WindowRestorationDisabler: NSViewRepresentable {
    func makeNSView(context: Context) -> NSView {
        let marker = NSView(frame: .zero)
        DispatchQueue.main.async { [weak marker] in
            marker?.window?.isRestorable = false
        }
        return marker
    }

    func updateNSView(_ nsView: NSView, context: Context) {}
}

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @FocusState private var isSearchFieldFocused: Bool

    // Persists whether the sidebar is shown across launches.
    private static let sidebarVisibilityKey = "sidebarExpanded"

    var body: some View {
        NavigationSplitView(columnVisibility: $appState.sidebarVisibility) {
            MacSidebarView()
                .navigationSplitViewColumnWidth(min: 180, ideal: 228, max: 320)
        } content: {
            NoteListView()
                .background(WindowRestorationDisabler())
                .navigationSplitViewColumnWidth(min: 220, ideal: 280, max: 420)
        } detail: {
            EditorView()
        }
        .navigationSplitViewStyle(.balanced)
        .sheet(isPresented: $appState.isShowingNewNotebook) {
            NewNotebookSheet { appState.createFolder(title: $0) }
        }
        .searchable(
            text: Binding(get: { appState.searchText }, set: { appState.search($0) }),
            placement: .toolbar,
            prompt: "Search"
        )
        .searchFocused($isSearchFieldFocused)
        // Enter opens the first result.
        .onSubmit(of: .search) { appState.submitSearch() }
        .onChange(of: appState.isFocusingSearch) { _, focused in
            guard focused else { return }
            isSearchFieldFocused = true
            appState.isFocusingSearch = false
        }
        // ⌥⌘F searches all notes, as in Notes (⌘F is find in the open note).
        .background(
            Button("") { isSearchFieldFocused = true }
                .keyboardShortcut("f", modifiers: [.command, .option])
                .opacity(0)
        )
        .onAppear {
            DispatchQueue.main.async {
                appState.isToolbarHidden = NSApp.keyWindow?.toolbar?.isVisible == false
            }
            if UserDefaults.standard.object(forKey: Self.sidebarVisibilityKey) != nil {
                appState.sidebarVisibility = UserDefaults.standard.bool(forKey: Self.sidebarVisibilityKey) ? .all : .doubleColumn
            }
        }
        .onChange(of: appState.sidebarVisibility) { _, newValue in
            UserDefaults.standard.set(newValue == .all, forKey: Self.sidebarVisibilityKey)
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}

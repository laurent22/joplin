import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @State private var columnVisibility = NavigationSplitViewVisibility.all

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            SidebarView()
                .navigationSplitViewColumnWidth(min: 180, ideal: 220, max: 280)
        } content: {
            NoteListView()
                .navigationSplitViewColumnWidth(min: 220, ideal: 280, max: 360)
        } detail: {
            EditorView()
        }
        .navigationSplitViewStyle(.balanced)
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}

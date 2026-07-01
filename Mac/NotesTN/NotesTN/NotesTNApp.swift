import SwiftUI

@main
struct NotesTNApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .frame(minWidth: 800, minHeight: 500)
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified(showsTitle: false))
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("New Note") {
                    appState.createNote()
                }
                .keyboardShortcut("n", modifiers: .command)

                Button("New Notebook") {
                    appState.createFolder()
                }
                .keyboardShortcut("n", modifiers: [.command, .shift])
            }

            CommandGroup(after: .pasteboard) {
                Divider()
                Button("Find…") {
                    appState.isFocusingSearch = true
                }
                .keyboardShortcut("f", modifiers: .command)
            }
        }
    }
}

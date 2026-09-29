import SwiftUI

@main
struct NotesTNApp: App {
    @StateObject private var appState = AppState()

    @ObservedObject private var joplinAccountStore = JoplinAccountStore.shared

    #if os(macOS)
    init() {
        // No Show Tab Bar / Merge All Windows items; Notes TN has one window.
        NSWindow.allowsAutomaticWindowTabbing = false
    }

    var body: some Scene {
        WindowGroup(id: "main") {
            ContentView()
                .frame(minWidth: 800, minHeight: 500)
                .sheet(isPresented: $appState.isShowingJoplinLogin) {
                    LoginView()
                }
                .accountAlerts(isConfirmingLogout: $appState.isConfirmingLogout, isConfirmingForceResync: $appState.isConfirmingForceResync)
                // Last, so the account alerts above can read it too.
                .environmentObject(appState)
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified(showsTitle: false))
        .commands {
            TextFormattingCommands()
            MacCommands(appState: appState, accountStore: joplinAccountStore)
        }

        Settings {
            SettingsView()
                .environmentObject(appState)
                .navigationTitle("Notes TN Settings")
        }
        .windowResizability(.contentSize)
    }
    #else
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .sheet(isPresented: $appState.isShowingJoplinLogin) {
                    LoginView()
                }
        }
        .commands {
            CommandGroup(after: .appInfo) {
                if let account = joplinAccountStore.account {
                    // Disabled — informational only, since there's no separate
                    // Settings/Preferences window to show this (see Android's Settings
                    // screen, which shows the same thing as a non-interactive row).
                    Button("Signed in as \(account.email)") {}
                        .disabled(true)
                    // ⌘R — a normal (non-force) sync: push local changes, pull whatever's
                    // new on the server. Matches Android/iOS's pull-to-refresh. "Force
                    // Resync" below is the heavier full re-download/re-render and is
                    // menu-only on purpose, so it isn't triggered by muscle memory.
                    Button("Refresh") {
                        appState.syncNow()
                    }
                    .keyboardShortcut("r", modifiers: .command)

                    Button("Force Resync") {
                        appState.syncNow(force: true)
                    }
                } else {
                    Button("Log In to Joplin Cloud…") {
                        appState.isShowingJoplinLogin = true
                    }
                }
            }

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
    #endif
}

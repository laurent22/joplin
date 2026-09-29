import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var appState: AppState
    @ObservedObject private var accountStore = JoplinAccountStore.shared
    @State private var isConfirmingLogout = false
    @State private var isConfirmingForceResync = false
    @State private var isShowingLogin = false

    private var isSignedIn: Bool { accountStore.account != nil }

    var body: some View {
        Grid(alignment: .leadingFirstTextBaseline, horizontalSpacing: 7, verticalSpacing: 0) {
            GridRow {
                label("Joplin Cloud:")
                VStack(alignment: .leading, spacing: 8) {
                    if let account = accountStore.account {
                        Text(account.email)
                        Button("Log Out…") { isConfirmingLogout = true }
                            .disabled(appState.isSyncing)
                    } else {
                        Text("Not logged in")
                            .foregroundStyle(.secondary)
                        Button("Log In…") { isShowingLogin = true }
                    }
                }
            }

            Divider()
                .gridCellUnsizedAxes(.horizontal)
                .padding(.top, 15)
                .padding(.bottom, 16)

            GridRow {
                label("Sync:")
                VStack(alignment: .leading, spacing: 8) {
                    VStack(alignment: .leading, spacing: 2) {
                        syncStatus
                        if isSignedIn, !appState.isSyncing, let error = appState.syncError {
                            Text(error)
                                .font(.system(size: 11))
                                .foregroundStyle(.secondary)
                        }
                    }
                    Button("Sync Now") { appState.syncNow() }
                        .disabled(!isSignedIn || appState.isSyncing)
                    Button("Force Resync…") { isConfirmingForceResync = true }
                        .disabled(!isSignedIn || appState.isSyncing)
                    Text("Downloads and converts every note again, even ones that haven’t changed. Use it if a note looks out of date.")
                        .font(.system(size: 11))
                        .padding(.top, -2)
                        .foregroundStyle(isSignedIn && !appState.isSyncing ? .secondary : .tertiary)
                        .frame(width: 360, alignment: .leading)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 18)
        .padding(.bottom, 20)
        .frame(width: 548, alignment: .leading)
        .fixedSize(horizontal: false, vertical: true)
        .accountAlerts(isConfirmingLogout: $isConfirmingLogout, isConfirmingForceResync: $isConfirmingForceResync)
        .sheet(isPresented: $isShowingLogin) { LoginView() }
    }

    private func label(_ text: String) -> some View {
        Text(text)
            .frame(width: 130, alignment: .trailing)
    }

    @ViewBuilder
    private var syncStatus: some View {
        if !isSignedIn {
            Text("Log in to sync your notes.")
                .foregroundStyle(.secondary)
        } else if appState.isSyncing {
            Text("Syncing…")
        } else if let date = appState.lastSyncDate {
            if appState.syncError != nil {
                Label {
                    Text("Last sync failed \(relativeSyncTime(date))")
                } icon: {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.yellow)
                }
            } else {
                Text("Last synced \(relativeSyncTime(date))")
            }
        } else {
            Text("Not synced yet")
                .foregroundStyle(.secondary)
        }
    }
}

private let syncTimeFormatter: DateFormatter = {
    let f = DateFormatter(); f.dateStyle = .none; f.timeStyle = .short; return f
}()
private let syncDayFormatter: DateFormatter = {
    let f = DateFormatter(); f.setLocalizedDateFormatFromTemplate("d MMMM"); return f
}()

private func relativeSyncTime(_ date: Date) -> String {
    let time = syncTimeFormatter.string(from: date)
    let calendar = Calendar.current
    if calendar.isDateInToday(date) { return "today at \(time)" }
    if calendar.isDateInYesterday(date) { return "yesterday at \(time)" }
    return "on \(syncDayFormatter.string(from: date)) at \(time)"
}

// Shared by the main window (driven from the app menu) and the Settings window, so
// each alert attaches as a sheet to whichever window asked for it.
extension View {
    func accountAlerts(isConfirmingLogout: Binding<Bool>, isConfirmingForceResync: Binding<Bool>) -> some View {
        modifier(AccountAlerts(isConfirmingLogout: isConfirmingLogout, isConfirmingForceResync: isConfirmingForceResync))
    }
}

private struct AccountAlerts: ViewModifier {
    @EnvironmentObject var appState: AppState
    @Binding var isConfirmingLogout: Bool
    @Binding var isConfirmingForceResync: Bool

    func body(content: Content) -> some View {
        content
            .alert("Log out of Joplin Cloud?", isPresented: $isConfirmingLogout) {
                Button("Cancel", role: .cancel) {}
                Button("Log Out") {
                    JoplinAccountStore.shared.clear()
                    appState.resetSyncStatus()
                }
                    .keyboardShortcut(.defaultAction)
            } message: {
                Text("Your notes stay on this Mac.")
            }
            .alert("Force a full resync?", isPresented: $isConfirmingForceResync) {
                Button("Cancel", role: .cancel) {}
                Button("Resync") { appState.syncNow(force: true) }
                    .keyboardShortcut(.defaultAction)
            } message: {
                Text("Notes TN downloads and converts every note again, even ones that haven’t changed. This can take a while.")
            }
    }
}

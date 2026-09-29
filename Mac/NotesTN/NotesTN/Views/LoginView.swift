import SwiftUI

/// Phase 1 of Joplin Cloud sync: login only. Presented as a sheet from the app's
/// menu bar command (see NotesTNApp.swift). Item sync is a later phase.
struct LoginView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var store = JoplinAccountStore.shared

    @State private var email = ""
    @State private var password = ""
    @State private var isLoggingIn = false
    @State private var errorMessage: String?
    @State private var loginTask: Task<Void, Never>?

    #if os(macOS)
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Log In to Joplin Cloud")
                .font(.system(size: 13, weight: .bold))
                .frame(maxWidth: .infinity)
                .padding(.bottom, 16)

            Text("Email")
                .foregroundStyle(.secondary)
                .padding(.leading, 10)
                .padding(.bottom, 9)
            TextField("", text: $email)
                .textContentType(.username)
                .controlSize(.large)
                .padding(.bottom, 17)

            Text("Password")
                .foregroundStyle(.secondary)
                .padding(.leading, 10)
                .padding(.bottom, 9)
            SecureField("", text: $password)
                .textContentType(.password)
                .controlSize(.large)
                .onSubmit(logIn)
                .padding(.bottom, 9)

            VStack(alignment: .leading, spacing: 4) {
                Text("Use your Joplin Cloud account. Your notes sync to your other devices.")
                if let errorMessage {
                    Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                }
            }
            .font(.system(size: 11))
            .foregroundStyle(.secondary)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, 10)
            .padding(.bottom, 20)

            HStack(spacing: 8) {
                Spacer()
                Button("Cancel") { cancel() }
                    .keyboardShortcut(.cancelAction)
                    .frame(width: 74)
                Button {
                    logIn()
                } label: {
                    if isLoggingIn {
                        ProgressView()
                            .controlSize(.small)
                    } else {
                        Text("Log In")
                            .frame(maxWidth: .infinity)
                    }
                }
                .keyboardShortcut(.defaultAction)
                .frame(width: 74)
                .disabled(isLoggingIn || email.isEmpty || password.isEmpty)
            }
        }
        .textFieldStyle(.roundedBorder)
        .padding(20)
        .frame(width: 360)
    }
    #else
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Log In to Joplin Cloud")
                .font(.title2)
                .bold()

            TextField("Email", text: $email)
                .textFieldStyle(.roundedBorder)
                .textContentType(.username)

            SecureField("Password", text: $password)
                .textFieldStyle(.roundedBorder)
                .textContentType(.password)
                .onSubmit(logIn)

            if let errorMessage {
                Text(errorMessage)
                    .foregroundStyle(.red)
                    .font(.callout)
            }

            HStack {
                Spacer()
                Button("Cancel") { cancel() }
                    .keyboardShortcut(.cancelAction)
                Button {
                    logIn()
                } label: {
                    if isLoggingIn {
                        ProgressView()
                            .controlSize(.small)
                            .frame(width: 16, height: 16)
                    } else {
                        Text("Log In")
                    }
                }
                .keyboardShortcut(.defaultAction)
                .disabled(isLoggingIn || email.isEmpty || password.isEmpty)
            }
        }
        .padding(24)
        .frame(width: 360)
    }
    #endif

    private func cancel() {
        loginTask?.cancel()
        dismiss()
    }

    private func logIn() {
        errorMessage = nil
        isLoggingIn = true
        let email = self.email.trimmingCharacters(in: .whitespacesAndNewlines)
        let password = self.password

        loginTask = Task {
            let result = await JoplinCloudApi.login(email: email, password: password)
            // Cancelled mid-request: don't sign in behind the user's back.
            guard !Task.isCancelled else { return }
            isLoggingIn = false
            switch result {
            case .success(let session):
                store.save(JoplinAccount(email: email, sessionId: session.sessionId, userId: session.userId, password: password))
                dismiss()
            case .failure(let error):
                errorMessage = error.localizedDescription
            }
        }
    }
}

#Preview {
    LoginView()
}

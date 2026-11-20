# Threat model

Joplin is a note-taking app (desktop, mobile, CLI) with Joplin Server, a multi-user sync and sharing server. See also SECURITY.md.

## Untrusted input

Note content (from shared notebooks, sync targets, imports or the web clipper), imported files, sync data, requests to the localhost Data API from web pages, and HTTP requests to Joplin Server.

In the desktop app, the note viewer is an iframe inside a window with Node integration, so escaping it means code execution.

## Severity

- **Critical**: code execution from viewing, importing or syncing content. Access to another user's data on Joplin Server. Recovering plaintext or keys from encrypted data.
- **High**: contained script execution in the note viewer. Data API token bypass. Privilege escalation on Joplin Server. Path traversal in an importer.
- **Medium**: attacks needing significant user interaction beyond opening a note.
- **Low**: hardening with no demonstrated impact.

## Out of scope

- Denial of service, including crashes and hangs from crafted input.
- Physical access or an already compromised machine.
- Unencrypted local data, and DLL sideloading.
- Links in notes that open local files (intended, with a confirmation dialog).
- What a malicious plugin can do once installed. Plugins are not reviewed and run with full access to the app and the machine. This is known and being addressed separately. Still in scope: getting a plugin installed or updated without the user's consent, and untrusted content reaching plugin-only APIs.
- Build and release tooling: `packages/tools`, `packages/doc-builder`, `packages/generate-plugin-doc`, `packages/generator-joplin`, `packages/plugin-repo-cli`.

## Reports

Include a proof of concept that has actually been run against the current code. Theoretical issues without a working reproduction will be closed.

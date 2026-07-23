# Booz Allen Hamilton Rebrand Identity Matrix

This file is the canonical mapping for the BAH Joplin fork identity.

## Product Display Names

- Desktop: `Booz Allen Notes`
- Mobile: `Booz Allen Notes`
- CLI: `bah-notes`
- Server: `Booz Allen Notes Server`
- Browser extension: `Booz Allen Notes Web Clipper`

## Technical Identifiers

- Desktop app ID: `com.boozallen.bahnotes-desktop`
- Desktop AUMID (runtime): `com.boozallen.bahnotes-desktop`
- Android package / namespace: `com.boozallen.bahnotes`
- iOS bundle identifier: `com.boozallen.bahnotes`
- iOS share extension bundle identifier: `com.boozallen.bahnotes.ShareExtension`
- iOS app group: `group.com.boozallen.bahnotes`

## Protocol and Callback Schemes

- Legacy: `joplin://`
- New: `bahnotes://`
- x-callback URL name: `com.boozallen.bahnotes.x-callback-url`

## Namespace and Distribution

- Fork repository URL: `https://github.com/boozallen/bah-joplin`
- Docker server repository: `boozallen/bah-joplin-server`
- Docker transcribe repository: `boozallen/bah-joplin-transcribe`

## Domain and Endpoint Map

- Product website: `https://notes.boozallen.com`
- Help/docs: `https://notes.boozallen.com/help`
- Download page: `https://notes.boozallen.com/download`
- Web app endpoint: `https://app.notes.boozallen.com`
- Sync server endpoint pattern: `https://api.notes.boozallen.com`

## Signing and Publisher Metadata

- Windows publisher name: `Booz Allen Hamilton`
- Linux package maintainer: `Booz Allen Hamilton <no-reply@boozallen.com>`
- Apple team/provider variables: keep existing `APPLE_ASC_PROVIDER` secret model, but scoped to BAH signing account.

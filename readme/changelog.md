# Joplin changelog

## [v1.0.81](https://github.com/laurent22/joplin/releases/tag/v1.0.81) - 2018-03-28T08:13:58Z

- New: Dropbox synchronisation
- New: Czech translation
- Fixes [#318](https://github.com/laurent22/joplin/issues/#318): Display full links in editor
- Resolves [#329](https://github.com/laurent22/joplin/issues/#329): Add link to E2EE doc

## [v1.0.79](https://github.com/laurent22/joplin/releases/tag/v1.0.79) - 2018-03-23T18:00:11Z

- New: Resolves [#144](https://github.com/laurent22/joplin/issues/#144), Resolves [#311](https://github.com/laurent22/joplin/issues/#311): Highlight search results and search in real time. Associated Ctrl+F with searching.
- New: Resolves [#73](https://github.com/laurent22/joplin/issues/#73): Show modified date next to note in editor
- New: Danish translation
- Improved: Fixes [#318](https://github.com/laurent22/joplin/issues/#318), Fixes [#317](https://github.com/laurent22/joplin/issues/#317): ENEX: Improved handling and rendering of plain text links. Improved detection and import of resources. Improved import of tables.
- Updated: Resolves [#307](https://github.com/laurent22/joplin/issues/#307): Use blue colour for sidebar, to be consistent with mobile app and logo
- Updated: Translations

## [v1.0.78](https://github.com/laurent22/joplin/releases/tag/v1.0.78) - 2018-03-17T15:27:18Z

- Improved: Handle deletion of resources that are not linked to any note

## [v1.0.77](https://github.com/laurent22/joplin/releases/tag/v1.0.77) - 2018-03-16T15:12:35Z

Note: This fixes an invalid database upgrade in the previous version.

- New: Resolves [#237](https://github.com/laurent22/joplin/issues/#237): Export to PDF and print option
- New: Resolves [#154](https://github.com/laurent22/joplin/issues/#154): No longer used resources are automatically deleted after approximately 24h
- Improved: Resolves [#298](https://github.com/laurent22/joplin/issues/#298): Removed extraneous first characters from auto-title
- Improved: Made WebDAV options dynamics so that changing username or password doesn't require restarting the app
- Fix: Fixes [#291](https://github.com/laurent22/joplin/issues/#291): Crash with empty backtick
- Fix: Fixes [#292](https://github.com/laurent22/joplin/issues/#292): Improved auto-update feature and fixed incorrect notifications
- Fix: Signed executables on Windows
- Updated Russian, German, Portuguese, Spanish and French translations. Many thanks to the translators!

## [v1.0.72](https://github.com/laurent22/joplin/releases/tag/v1.0.72) - 2018-03-14T09:44:35Z

- New: Allow exporting only selected notes or notebook
- New: Resolves [#266](https://github.com/laurent22/joplin/issues/#266): Allow setting text editor font family
- New: Display icon next to resources and allow downloading them from Electron client
- Improved: Optimised sync when dealing with many items, in particular when using Nextcloud or WebDAV
- Improved: Display last sync error unless it's a timeout or network error
- Improved: Fixes [#268](https://github.com/laurent22/joplin/issues/#268): Improve error message for invalid flags
- Fix: Fixes [#271](https://github.com/laurent22/joplin/issues/#271): Sort by created time was not respected

## [v1.0.70](https://github.com/laurent22/joplin/releases/tag/v1.0.70) - 2018-02-28T20:04:30Z

- New: Resolves [#97](https://github.com/laurent22/joplin/issues/#97): Export to JEX format or RAW format
- New: Import JEX and RAW format
- New: Resolves [#52](https://github.com/laurent22/joplin/issues/#52): Import Markdown files or directory
- New: Allow sorting notes by various fields
- New: Resolves [#243](https://github.com/laurent22/joplin/issues/#243): Added black and white tray icon for macOS
- Fix: [#247](https://github.com/laurent22/joplin/issues/#247): Unreadable error messages when checking for updates
- Fix: Fixed sync interval sorting order
- Fix: [#256](https://github.com/laurent22/joplin/issues/#256): Check that no other instance of Joplin is running before launching a new one

## [v1.0.67](https://github.com/laurent22/joplin/releases/tag/v1.0.67) - 2018-02-19T22:51:08Z

- Fixed: [#217](https://github.com/laurent22/joplin/issues/#217): Display a message when the note has no content and only the note viewer is visible
- Fixed: [#240](https://github.com/laurent22/joplin/issues/#240): Tags should be handled in a case-insensitive way
- Fixed: [#241](https://github.com/laurent22/joplin/issues/#241): Ignore response for certain WebDAV calls to improve compatibility with some services.
- Updated: French and Español translation

## [v1.0.66](https://github.com/laurent22/joplin/releases/tag/v1.0.66) - 2018-02-18T23:09:09Z

- Fixed: Local items were no longer being deleted via sync.
- Improved: More debug information when WebDAV sync target does not work.
- Improved: Compatibility with some WebDAV services (Seafile in particular)

## [v1.0.65](https://github.com/laurent22/joplin/releases/tag/v1.0.65) - 2018-02-17T20:02:25Z

- New: Added several keyboard shortcuts
- New: Convert new lines in tables to BR tags, and added support for HTML tags in Markdown viewers
- Fixed: Confirmation message boxes, and release notes text
- Fixed: Issue with items not being decrypted immediately when they are created due to a sync conflict.
- Updated: Translations

## [v1.0.64](https://github.com/laurent22/joplin/releases/tag/v1.0.64) - 2018-02-16T00:58:20Z

Still more fixes and improvements to get v1 as stable as possible before adding new features.

IMPORTANT: If you use Nextcloud it is recommended to sync all your notes before installing this release (see below).

- Fixed: Nextcloud sync target ID (which was incorrectly set to WebDAV sync ID). As a result items that have been created since this bug will be re-synced with Nextcloud. This sync will not duplicate or delete any item but is necessary to preserve data integrity. IF YOU HAVE NOTES IN CONFLICT AFTER SYNC: Close the app completely and restart it to make sure all the lists are visually up-to-date. The notes in conflict most likely can be ignored - they are just duplicate of the real ones. To be safe, check the content but most likely they can simply be deleted.
- Improved: Provide Content-Length header for WebDAV for better compatibility with more servers
- Fixed: Allow copy and paste from config and encryption screen on macOS
- Fixed: [#201](https://github.com/laurent22/joplin/issues/#201), [#216](https://github.com/laurent22/joplin/issues/#216): Make sure only one update check can run at a time, and improved modal dialog boxes

## [v1.0.63](https://github.com/laurent22/joplin/releases/tag/v1.0.63) - 2018-02-14T19:40:36Z

- Improved the way settings are changed. Should also fixed issue with sync context being accidentally broken.
- Improved WebDAV driver compatibility with some services (eg. Seafile)

## [v1.0.62](https://github.com/laurent22/joplin/releases/tag/v1.0.62) - 2018-02-12T20:19:58Z

- Fixes [#205](https://github.com/laurent22/joplin/issues/#205): Importing Evernote notes while on import page re-imports previous import
- Fixes [#209](https://github.com/laurent22/joplin/issues/#209): Items with non-ASCII characters end up truncated on Nextcloud
- Added Basque translation, fixed issue with handling invalid translations. Updated translation FR.

## [v0.10.61](https://github.com/laurent22/joplin/releases/tag/v0.10.61) - 2018-02-08T18:27:39Z

- New: Display message when creating new note or to-do so that it doesn't look like the previous note content got deleted.
- New: Also support $ as delimiter for Katex expressions
- New: Added sync config check to config screens
- New: Allowing opening and saving resource images
- New: Toolbar button to set tags
- Update: Improved request repeating mechanism
- Fix: Make sure alarms and resources are attached to right note when creating new note
- Fix: Use mutex when saving model to avoid race conditions when decrypting and syncing at the same time

## [v0.10.60](https://github.com/laurent22/joplin/releases/tag/v0.10.60) - 2018-02-06T13:09:56Z

- New: WebDAV synchronisation target
- New: Support for math typesetting [Katex](https://khan.github.io/KaTeX/)
- New: Tray icon for Windows and macOS
- Fixed: Don't allow adding notes to conflict notebook
- Updated: Russian translation
- Updated: French translation
- New: List missing master keys in encryption screen
- Fixed: Attaching images in Linux was no longer working
- Fixed crash in macOS

## [v0.10.54](https://github.com/laurent22/joplin/releases/tag/v0.10.54) - 2018-01-31T20:21:30Z

- Optimised Nextcloud functionality so that it is faster and consumes less resources
- Fixed Nextcloud sync issue when processing many items.
- Fixed: Handle case where file is left half-uploaded on Nextcloud instance (possibly an ocloud.de issue only)
- Fixed: Allow decryption of other items to continue even if an item cannot be decrypted
- Add Content-Size header for WebDAV, which is required by some services
- Fixed auto-title when title is manually entered first
- Improved auto-update process to avoid random crashes
- New: Allow focusing either title or body when creating a new note or to-do
- Fixed crash when having invalid UTF-8 string in text editor

## [v0.10.52](https://github.com/laurent22/joplin/releases/tag/v0.10.52) - 2018-01-31T19:25:18Z

- Optimised Nextcloud functionality so that it is faster and consumes less resources
- Fixed Nextcloud sync issue when processing many items.
- Fixed: Handle case where file is left half-uploaded on Nextcloud instance (possibly an ocloud.de issue only)
- Fixed: Allow decryption of other items to continue even if an item cannot be decrypted
- Add Content-Size header for WebDAV, which is required by some services
- Fixed auto-title when title is manually entered first
- Improved auto-update process to avoid random crashes
- New: Allow focusing either title or body when creating a new note or to-do

## [v0.10.51](https://github.com/laurent22/joplin/releases/tag/v0.10.51) - 2018-01-28T18:47:02Z

- Added Nextcloud support (Beta)
- Upgraded Electron to 1.7.11 to fix security vulnerability
- Fixed checkbox issue in config screen
- Fixed detection of encrypted item

## [v0.10.48](https://github.com/laurent22/joplin/releases/tag/v0.10.48) - 2018-01-23T11:19:51Z

- Improved and optimised file system sync target when many items are present.
- Fixes [#155](https://github.com/laurent22/joplin/issues/#155): Caret alignment issue with Russian text
- Dutch translation (Thanks @tcassaert)
- Removed certain log statements so that sensitive info doesn't end up in logs
- Fix: Handle case where resource blob is missing during sync

## [v0.10.47](https://github.com/laurent22/joplin/releases/tag/v0.10.47) - 2018-01-16T17:27:17Z

- Improved the way new note are created, and automatically add a title. Made saving and loading notes more reliable.
- Fix: race condition when a note is being uploaded while it's being modified in the text editor
- Fixes [#129](https://github.com/laurent22/joplin/issues/#129): Tags are case insensitive
- Schedule sync only after 30 seconds
- Schedule sync after enabling or disabling encryption
- Display sync items being fetched
- Fixed logic of what note is used when right-clicking one or more notes
- Fix: Don't scroll back to top when note is reloaded via sync
- Display URL for links
- Fix: Move prompt to top to avoid issue with date picker being hidden
- Fixed table font size and family
- Fixed logic to save, and make sure scheduled save always happen even when changing note
- Fixed OneDrive sync when resync is requested
- Fixes [#85](https://github.com/laurent22/joplin/issues/#85): Don't record deleted_items entries for folders deleted via sync
- Updated translations

## [v0.10.43](https://github.com/laurent22/joplin/releases/tag/v0.10.43) - 2018-01-08T10:12:10Z

- Fixed saving and loading of settings, which could affect synchronisation

## [v0.10.41](https://github.com/laurent22/joplin/releases/tag/v0.10.41) - 2018-01-05T20:38:12Z

- Added End-To-End Encryption support (E2EE)

## [v0.10.40](https://github.com/laurent22/joplin/releases/tag/v0.10.40) - 2018-01-02T23:16:57Z

- Fixed undo in text editor
- Updated German translation
- Added Russian, Japanese and Chinese translations

## [v0.10.39](https://github.com/laurent22/joplin/releases/tag/v0.10.39) - 2017-12-11T21:19:44Z

- Fixes [#55](https://github.com/laurent22/joplin/issues/#55): Added support for HTML tags found in ENEX files: colgroup, col, ins, kbd, address, caption, var, area, map
- Resolve [#7](https://github.com/laurent22/joplin/issues/#7): Show storage location in Options screen
- Fixes [#84](https://github.com/laurent22/joplin/issues/#84): Fields losing focus in Config screen
- Fixes [#86](https://github.com/laurent22/joplin/issues/#86): App icon missing on Linux
- Fixes [#87](https://github.com/laurent22/joplin/issues/#87): Show warningn when deleting notebook that contains notes.
- Fixes [#3](https://github.com/laurent22/joplin/issues/#3): Paths with '.' would cause JSX compilation to fail

## [v0.10.38](https://github.com/laurent22/joplin/releases/tag/v0.10.38) - 2017-12-08T10:12:06Z

- Dialog to export sync status
- Enabled support for filesystem sync
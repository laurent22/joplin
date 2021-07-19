# Joplin Android app changelog

## [android-v2.2.1](https://github.com/laurent22/joplin/releases/tag/android-v2.2.1) (Pre-release) - 2021-07-13T17:37:38Z

- New: Added improved editor (beta)
- Improved: Disable backup to Google Drive (#5114 by Roman Musin)
- Improved: Interpret only valid search filters (#5103) (#3871 by [@JackGruber](https://github.com/JackGruber))
- Improved: Removed old editor code (e01a175)

## [android-v2.1.4](https://github.com/laurent22/joplin/releases/tag/android-v2.1.4) - 2021-07-03T08:31:36Z

- Fixed: Fixes #5133: Items keep being uploaded to Joplin Server after a note has been shared.
- Fixed: Fixed issue where untitled notes where created after a note had been shared and synced

## [android-v2.1.3](https://github.com/laurent22/joplin/releases/tag/android-v2.1.3) - 2021-06-27T13:34:12Z

- New: Add support for X-API-MIN-VERSION header (51f3c00)
- Improved: Activate Joplin Server optimisations (3d03321)
- Improved: Also allow disabling TLS errors for Joplin Cloud to go around error UNABLE_TO_GET_ISSUER_CERT_LOCALLY (118a2f9)
- Fixed: Fixed search when the index contains non-existing notes (5ecac21)
- Fixed: Fixed version number on config screen (65e9268)

## [android-v2.1.2](https://github.com/laurent22/joplin/releases/tag/android-v2.1.2) (Pre-release) - 2021-06-20T18:36:23Z

- Fixed: Fixed error that could prevent a revision from being created, and that would prevent the revision service from processing the rest of the notes (#5051)
- Fixed: Fixed issue when trying to sync an item associated with a share that no longer exists (5bb68ba)

## [android-v2.1.1](https://github.com/laurent22/joplin/releases/tag/android-v2.1.1) (Pre-release) - 2021-06-19T16:42:57Z

- New: Add version number to log (525ab01)
- New: Added feature flags to disable Joplin Server sync optimisations by default, so that it still work with server 2.0 (326fef4)
- Improved: Allow enabling and disabling feature flags (5b368e3)
- Improved: Allow uploading items in batch when synchronising with Joplin Server (0222c0f)
- Improved: Improved first sync speed when synchronising with Joplin Server (4dc1210)
- Improved: Mask auth token and password in log (0d33955)
- Improved: Optimise first synchronisation, when items have never been synced before (15ce5cd)
- Improved: Update Mermaid: 8.8.4 -&gt; 8.10.2 (#5092 by Helmut K. C. Tessarek)

## [android-v2.0.4](https://github.com/laurent22/joplin/releases/tag/android-v2.0.4) - 2021-06-16T12:15:56Z

- Improved: Prevent sync process from being stuck when the download state of a resource is invalid (5c6fd93)

## [android-v2.0.3](https://github.com/laurent22/joplin/releases/tag/android-v2.0.3) (Pre-release) - 2021-06-16T09:48:58Z

- Improved: Verbose mode for synchronizer (4bbb3d1)

## [android-v2.0.2](https://github.com/laurent22/joplin/releases/tag/android-v2.0.2) - 2021-06-15T20:03:21Z

- Improved: Conflict notes will now populate a new field with the ID of the conflict note. (#5049 by [@Ahmad45123](https://github.com/Ahmad45123))
- Improved: Filter out form elements from note body to prevent potential XSS (thanks to Dmytro Vdovychinskiy for the PoC) (feaecf7)
- Improved: Focus note editor where tapped instead of scrolling to the end (#4998) (#4216 by Roman Musin)
- Improved: Improve search with Asian scripts (#5018) (#4613 by [@mablin7](https://github.com/mablin7))
- Fixed: Fixed and improved alarm notifications (#4984) (#4912 by Roman Musin)
- Fixed: Fixed opening URLs that contain non-alphabetical characters (#4494)
- Fixed: Fixed user content URLs when sharing note via Joplin Server (2cf7067)
- Fixed: Inline Katex gets broken when editing in Rich Text editor (#5052) (#5025 by [@Subhra264](https://github.com/Subhra264))
- Fixed: Items are filtered in the API search (#5017) (#5007 by [@JackGruber](https://github.com/JackGruber))
- Fixed: Wrong field removed in API search (#5066 by [@JackGruber](https://github.com/JackGruber))

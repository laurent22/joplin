# Joplin Android app changelog

## [android-v2.6.1](https://github.com/laurent22/joplin/releases/tag/android-v2.6.1) (Pre-release) - 2021-11-02T20:49:53Z

- Improved: Upgraded React Native from 0.64 to 0.66 (66e79cc)
- Fixed: Fixed potential infinite loop when Joplin Server session is invalid (c5569ef)

## [android-v2.5.5](https://github.com/laurent22/joplin/releases/tag/android-v2.5.5) (Pre-release) - 2021-10-31T11:03:16Z

- New: Add padding around beta text editor (365e152)
- Improved: Capitalise first word of sentence in beta editor (4128be9)
- Fixed: Do not render very large code blocks to prevent app from freezing (#5593)

## [android-v2.5.3](https://github.com/laurent22/joplin/releases/tag/android-v2.5.3) (Pre-release) - 2021-10-28T21:47:18Z

- New: Add support for public-private key pairs and improved master password support (#5438)
- New: Added mechanism to migrate default settings to new values (72db8e4)
- Improved: Ensure that shared notebook children are not deleted when shared, unshared and shared again, and a conflict happens (ccf9882)
- Improved: Improve delete dialog message (#5481) (#4701 by Helmut K. C. Tessarek)
- Improved: Improved Joplin Server configuration check to better handle disabled accounts (72c1235)
- Improved: Improved handling of expired sessions when using Joplin Server (33249ca)
- Fixed: Certain attachments were not being automatically deleted (#932)
- Fixed: Fixed logic of setting master password in Encryption screen (#5585)

## [android-v2.4.3](https://github.com/laurent22/joplin/releases/tag/android-v2.4.3) - 2021-09-29T18:47:24Z

- Fixed: Fix default sync target (4b39d30)

## [android-v2.4.2](https://github.com/laurent22/joplin/releases/tag/android-v2.4.2) (Pre-release) - 2021-09-22T17:02:37Z

- Improved: Allow disabling any master key, including default or active one (9407efd)
- Improved: Update Mermaid 8.10.2 -&gt; 8.12.1 and fix gitGraph crash (#5448) (#5295 by Helmut K. C. Tessarek)
- Fixed: Misinterpreted search term after filter in quotation marks (#5445) (#5444 by [@JackGruber](https://github.com/JackGruber))

## [android-v2.4.1](https://github.com/laurent22/joplin/releases/tag/android-v2.4.1) (Pre-release) - 2021-08-30T13:37:34Z

- New: Add a way to disable a master key (7faa58e)
- New: Add support for single master password, to simplify handling of multiple encryption keys (ce89ee5)
- New: Added "None" sync target to allow disabling synchronisation (f5f05e6)
- Improved: Do not display master key upgrade warnings for new master keys (70efadd)
- Improved: Improved sync locks so that they do not prevent upgrading a sync target (06ed58b)
- Improved: Show the used tags first in the tagging dialog (#5315 by [@JackGruber](https://github.com/JackGruber))
- Fixed: Fixed crash when a required master key does not exist (#5391)

## [android-v2.3.4](https://github.com/laurent22/joplin/releases/tag/android-v2.3.4) (Pre-release) - 2021-08-15T13:27:57Z

- Fixed: Bump hightlight.js to v11.2 (#5278) (#5245 by Roman Musin)

## [android-v2.3.3](https://github.com/laurent22/joplin/releases/tag/android-v2.3.3) (Pre-release) - 2021-08-12T20:46:15Z

- Improved: Improved E2EE usability by making its state a property of the sync target (#5276)

## [android-v2.2.5](https://github.com/laurent22/joplin/releases/tag/android-v2.2.5) (Pre-release) - 2021-08-11T10:54:38Z

- Revert "Plugins: Add ability to make dialogs fit the application window (#5219)" as it breaks several plugin webviews.
- Revert "Resolves #4810, Resolves #4610: Fix AWS S3 sync error and upgrade framework to v3 (#5212)" due to incompatibility with some AWS providers.
- Improved: Upgraded React Native to v0.64 (afb7e1a)

## [android-v2.2.3](https://github.com/laurent22/joplin/releases/tag/android-v2.2.3) (Pre-release) - 2021-08-09T18:48:29Z

- Improved: Ensure that timestamps are not changed when sharing or unsharing a note (cafaa9c)
- Improved: Fix AWS S3 sync error and upgrade framework to v3 (#5212) (#4810 by Lee Matos)
- Improved: Handles OneDrive throttling responses and sets User-Agent based on Microsoft best practices (#5246) (#5244 by [@alec](https://github.com/alec))
- Improved: Make sync icon spin in the right direction (#5275) (#4588 by Lee Matos)
- Fixed: Fixed issue with orphaned resource being created in case of a resource conflict (#5223)

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

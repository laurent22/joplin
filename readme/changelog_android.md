# Joplin Android app changelog

## [android-v2.11.8](https://github.com/laurent22/joplin/releases/tag/android-v2.11.8) (Pre-release) - 2023-05-07T17:24:48Z

- Improved: Disable Hermes engine (e9e9986)
- Fixed: Fix voice typing (d5eeb12)

## [android-v2.11.7](https://github.com/laurent22/joplin/releases/tag/android-v2.11.7) (Pre-release) - 2023-05-07T14:29:08Z

- Fixed crash when starting voice typing.

## [android-v2.11.6](https://github.com/laurent22/joplin/releases/tag/android-v2.11.6) (Pre-release) - 2023-05-07T13:53:31Z

- Disabled Hermes engine

## [android-v2.11.5](https://github.com/laurent22/joplin/releases/tag/android-v2.11.5) (Pre-release) - 2023-05-07T12:14:21Z

- Improved: Improved Vosk support (beta, fr only) (#8131)
- Improved: Updated packages react-native-share (v8.2.2), reselect (v4.1.8), sharp (v0.32.0)

## [android-v2.11.4](https://github.com/laurent22/joplin/releases/tag/android-v2.11.4) (Pre-release) - 2023-05-03T11:57:27Z

- New: Add support for offline speech to text (Beta - FR only) (#8115)
- Improved: Updated packages @react-native-community/netinfo (v9.3.9), aws, react-native-document-picker (v8.2.0), react-native-paper (v5.5.2), react-native-safe-area-context (v4.5.1), sass (v1.60.0)
- Fixed: Fixed sync crash (#8056) (#8017 by Arun Kumar)
- Fixed: Fixes issue where the note body is not updated after attaching a file (991c120)

## [android-v2.11.2](https://github.com/laurent22/joplin/releases/tag/android-v2.11.2) (Pre-release) - 2023-04-09T12:04:06Z

- Improved: Resolve #8022: Editor syntax highlighting was broken (#8023) (#8022 by Henry Heino)
- Improved: Updated packages @react-native-community/netinfo (v9.3.8)
- Fixed: Removed `MasterKey` from Sync Status report (#8026) (#7940 by Arun Kumar)
- Security: Prevent bypassing fingerprint lock on certain devices (6b72f86)

## [android-v2.11.1](https://github.com/laurent22/joplin/releases/tag/android-v2.11.1) (Pre-release) - 2023-04-08T08:49:19Z

- New: Add log info for biometrics feature (efdbaeb)
- New: Add setting to enable/disable the markdown toolbar (#7929 by Henry Heino)
- Fixed: Encode the non-ASCII characters in OneDrive URI (#7868) (#7851 by Self Not Found)
- Fixed: Fix OneDrive sync attempting to call method on `null` variable (#7987) (#7986 by Henry Heino)
- Updated packages @lezer/highlight (v1.1.4), fs-extra (v11.1.1), jsdom (v21.1.1), markdown-it-multimd-table (v4.2.1), nanoid (v3.3.6), node-persist (v3.1.3), nodemon (v2.0.22), react-native-document-picker (v8.1.4), react-native-image-picker (v5.3.1), react-native-paper (v5.4.1), react-native-share (v8.2.1), sass (v1.59.3), sqlite3 (v5.1.6), turndown (v7.1.2), yargs (v17.7.1)

## [android-v2.10.9](https://github.com/laurent22/joplin/releases/tag/android-v2.10.9) (Pre-release) - 2023-03-22T18:40:57Z

- Improved: Mark biometrics feature as beta and ensure no call is made if it is not enabled (e44a934)

## [android-v2.10.8](https://github.com/laurent22/joplin/releases/tag/android-v2.10.8) (Pre-release) - 2023-02-28T18:09:21Z

- Improved: Stop synchronization with unsupported WebDAV providers (#7819) (#7661 by [@julien](https://github.com/julien))
- Fixed: Custom sort order not synchronized (#7729) (#6956 by Tao Klerks)
- Fixed: Fix camera attachment (#7775) (#7675 by [@vikneshwar](https://github.com/vikneshwar))
- Fixed: Fixed duplicate sharing issue (#7799) (#7791 by [@jd1378](https://github.com/jd1378))
- Fixed: Fixed error when sharing a file (#7801) (#6942 by [@jd1378](https://github.com/jd1378))
- Fixed: Fixed issue where app would close after sharing a file (#7791)
- Fixed: Hide main content while biometric is enabled and not authenticated (#7781) (#7762 by [@pedr](https://github.com/pedr))
- Fixed: Sharing pictures to Joplin creates recurring duplications (#7807) (#7791 by [@jd1378](https://github.com/jd1378))

## [android-v2.10.6](https://github.com/laurent22/joplin/releases/tag/android-v2.10.6) (Pre-release) - 2023-02-10T16:22:28Z

- Improved: Add create sub-notebook feature (#7728) (#1044 by [@carlosngo](https://github.com/carlosngo))
- Fixed: Fix double-scroll issue in long notes (#7701) (#7700 by Henry Heino)
- Fixed: Fix startup error (#7688) (#7687 by Henry Heino)
- Fixed: Sharing file to Joplin does not work (#7691)

## [android-v2.10.5](https://github.com/laurent22/joplin/releases/tag/android-v2.10.5) (Pre-release) - 2023-01-21T14:21:23Z

- Improved: Improve dialogue spacing in Fountain renderer (#7628) (#7627 by [@Elleo](https://github.com/Elleo))
- Improved: Improve filesystem sync performance (#7637) (#6942 by [@jd1378](https://github.com/jd1378))
- Fixed: Fixes non-working alarms (138bc81)

## [android-v2.10.4](https://github.com/laurent22/joplin/releases/tag/android-v2.10.4) (Pre-release) - 2023-01-14T17:30:34Z

- New: Add support for multiple profiles (6bb52d5)
- Improved: Configurable editor font size (#7596 by Henry Heino)
- Improved: Confirm closing settings with unsaved changes (#7566 by Henry Heino)
- Improved: Upgrade to React Native 0.69 (7e29804)
- Improved: Upgrade to React Native 0.70 (4bdb3d0)
- Fixed: Fixed biometics prompt on new devices (9eff7e6)
- Fixed: Fixed issue when floating keyboard is visible (#7593) (#6682 by Henry Heino)
- Fixed: Remove gray line around text editor (#7595) (#7594 by Henry Heino)

## [android-v2.10.3](https://github.com/laurent22/joplin/releases/tag/android-v2.10.3) (Pre-release) - 2023-01-05T11:29:06Z

- New: Add support for locking the app using biometrics (f10d9f7)
- Improved: Make the new text editor the default one (f5ef318)
- Fixed: Fixed proxy timeout setting UI (275c80a)
- Fixed: Settings save button visible even when no settings have been changed (#7503)

## [android-v2.10.2](https://github.com/laurent22/joplin/releases/tag/android-v2.10.2) (Pre-release) - 2023-01-02T17:44:15Z

- New: Add support for realtime search (767213c)
- Fixed: Enable autocorrect with spellcheck (#7532) (#6175 by Henry Heino)

## [android-v2.10.1](https://github.com/laurent22/joplin/releases/tag/android-v2.10.1) (Pre-release) - 2022-12-29T13:55:48Z

- Improved: Switch license to AGPL-3.0 (faf0a4e)
- Improved: Tag search case insensitive (#7368 by [@JackGruber](https://github.com/JackGruber))
- Improved: Update Mermaid: 9.1.7 to 9.2.2 (#7330 by Helmut K. C. Tessarek)
- Improved: Upgrade to react-native 0.68.5 (e2d59ee)
- Fixed: Could not attach images to notes anymore (#7471)
- Fixed: Fix CodeMirror syntax highlighting (#7386 by Henry Heino)
- Fixed: Fix attaching multiple files (#7196) (#7195 by Self Not Found)
- Fixed: Update CodeMirror (#7262) (#7253 by Henry Heino)
- Security: Fix XSS when a specially crafted string is passed to the renderer (762b4e8)

## [android-v2.9.8](https://github.com/laurent22/joplin/releases/tag/android-v2.9.8) (Pre-release) - 2022-11-01T15:45:36Z

- Updated translations

## [android-v2.9.7](https://github.com/laurent22/joplin/releases/tag/android-v2.9.7) (Pre-release) - 2022-10-30T10:25:01Z

- Fixed: Fixed notebook icons alignment (ea6b7ca)
- Fixed: Fixed crash when attaching a file.

## [android-v2.9.6](https://github.com/laurent22/joplin/releases/tag/android-v2.9.6) (Pre-release) - 2022-10-23T16:23:25Z

- New: Add monochrome icon (#6954 by Tom Bursch)
- Fixed: Fix file system sync issues (#6943 by [@jd1378](https://github.com/jd1378))
- Fixed: Fix note attachment issue (#6932 by [@jd1378](https://github.com/jd1378))
- Fixed: Fixed notebook icon spacing (633c9ac)
- Fixed: Support non-ASCII characters in OneDrive (#6916) (#6838 by Self Not Found)

## [android-v2.9.5](https://github.com/laurent22/joplin/releases/tag/android-v2.9.5) (Pre-release) - 2022-10-11T13:52:00Z

- Improved: Disable multi-highlighting to fix context menu (9b348fd)
- Improved: Display icon for all notebooks if at least one notebook has an icon (ec97dd8)

## [android-v2.9.3](https://github.com/laurent22/joplin/releases/tag/android-v2.9.3) (Pre-release) - 2022-10-07T11:12:56Z

- Improved: Convert empty bolded regions to bold-italic regions in beta editor (#6807) (#6808 by Henry Heino)
- Improved: Increase the attachment size limit to 200MB (#6848 by Self Not Found)
- Improved: Show client ID in log (#6897 by Self Not Found)
- Improved: Supports attaching multiple files to a note at once (#6831 by Self Not Found)
- Improved: Update Mermaid 8.13.9 to 9.1.7 (#6849 by Helmut K. C. Tessarek)
- Fixed: Double/triple-tap selection doesn't show context menu  (#6803) (#6802 by Henry Heino)
- Fixed: Fix multiple webview instances (#6841 by Henry Heino)
- Fixed: Fix resources sync when proxy is set (#6817) (#6688 by Self Not Found)
- Fixed: Fixed crash when trying to move note to notebook (#6898)

## [android-v2.9.2](https://github.com/laurent22/joplin/releases/tag/android-v2.9.2) (Pre-release) - 2022-09-01T11:14:58Z

- New: Add Markdown toolbar (#6753 by Henry Heino)
- New: Add long-press tooltips (#6758 by Henry Heino)
- Improved: Enable spellcheck by default on beta editor (#6778 by Henry Heino)
- Improved: Setting to disable spellcheck in beta editor (#6780 by Henry Heino)
- Fixed: Don't reload the application on screen rotation (#6737) (#6732 by Henry Heino)
- Fixed: Fix default font in beta editor (#6760) (#6759 by Henry Heino)
- Fixed: Fix side menu width on wide screen devices (#6662 by Tolulope Malomo)
- Fixed: Fixed Android filesystem sync (resources) (#6789) (#6779 by [@jd1378](https://github.com/jd1378))
- Fixed: Fixed handling of normal paths in filesystem sync (#6792) (#6791 by [@jd1378](https://github.com/jd1378))

## [android-v2.9.1](https://github.com/laurent22/joplin/releases/tag/android-v2.9.1) (Pre-release) - 2022-08-12T17:14:49Z

- New: Add alt text/roles to some buttons to improve accessibility (#6616 by Henry Heino)
- New: Add keyboard-activatable markdown commands (e.g. bold, italicize) on text editor (#6707 by Henry Heino)
- Improved: Ctrl+F search support in beta editor (#6587 by Henry Heino)
- Improved: Improve syntax highlighting on mobile beta editor (#6684 by Henry Heino)
- Improved: Removes whitespace above navigation component (#6597 by [@tmclo](https://github.com/tmclo))
- Fixed: Do not encrypt non-owned note if it was not shared encrypted (#6645)
- Fixed: Fix checklist continuation in beta editor (#6577) (#6576 by Henry Heino)
- Fixed: Fixed android filesystem sync (#6395) (#5779 by [@jd1378](https://github.com/jd1378))
- Fixed: Note links with HTML notation did not work (#6515)
- Fixed: Scroll selection into view in beta editor when window resizes (#6610) (#5949 by Henry Heino)

## [android-v2.8.1](https://github.com/laurent22/joplin/releases/tag/android-v2.8.1) (Pre-release) - 2022-05-18T13:35:01Z

- Improved: Allow filtering tags in tag dialog (#6221 by [@shinglyu](https://github.com/shinglyu))
- Improved: Automatically start sync after setting the sync parameters (ff066ba)
- Improved: Color of Date-Time text changed to match theme (#6279 by Ayush Srivastava)
- Improved: Handle invalid revision patches (#6209)
- Improved: Improve error message when revision metadata cannot be decoded, to improve debugging (a325bf6)
- Improved: Make search engine filter keywords case insensitive (#6267) (#6266 by [@JackGruber](https://github.com/JackGruber))
- Improved: Sort sync target options (814a5a0)
- Fixed: "Move Note" dropdown menu can be very narrow (#6306) (#3564 by Ayush Srivastava)
- Fixed: Cursor hard to see in dark mode (#6307) (#5987 by Henry Heino)
- Fixed: Ensure that note revision markup type is set correctly (#6261)
- Fixed: Error when pressing undo or redo button while editor is closed (#6426) (#6328 by Tolulope Malomo)
- Fixed: Long path in "Export profile" prevents tapping OK button (#6359) (#6026 by Tolulope Malomo)
- Fixed: Prevent multiline note titles (#6144) (#5482 by [@Daeraxa](https://github.com/Daeraxa))
- Fixed: Support inserting attachments from Beta Editor (#6325) (#6324 by Henry Heino)
- Fixed: The camera button remains clickable after taking a photo bug (#6222 by [@shinglyu](https://github.com/shinglyu))

## [android-v2.7.2](https://github.com/laurent22/joplin/releases/tag/android-v2.7.2) (Pre-release) - 2022-02-12T12:51:29Z

- New: Add additional time format HH.mm (#6086 by [@vincentjocodes](https://github.com/vincentjocodes))
- Improved: Do not duplicate resources when duplicating a note (721d008)
- Improved: Make heading 4, 5 and 6 styling more consistent (fca5875)
- Improved: Show login prompt for OneDrive (#5933 by Jonathan Heard)
- Improved: Update Mermaid 8.13.5 -&gt; 8.13.9 and Katex dependencies (#6039 by Helmut K. C. Tessarek)
- Fixed: Shared resource was not encrypted with correct encryption key (#6092)

## [android-v2.6.9](https://github.com/laurent22/joplin/releases/tag/android-v2.6.9) - 2021-12-20T14:58:42Z

- Fixed: Fixed issue where synchroniser would try to update a shared folder that is not longer accessible (667d642)

## [android-v2.6.8](https://github.com/laurent22/joplin/releases/tag/android-v2.6.8) - 2021-12-17T10:15:00Z

- Improved: Update Mermaid: 8.12.1 -&gt; 8.13.5 (#5831 by Helmut K. C. Tessarek)
- Fixed: Links in flowchart Mermaid diagrams (#5830) (#5801 by Helmut K. C. Tessarek)

## [android-v2.6.5](https://github.com/laurent22/joplin/releases/tag/android-v2.6.5) (Pre-release) - 2021-12-13T09:41:18Z

- Fixed: Fixed "Invalid lock client type" error when migrating sync target (e0e93c4)

## [android-v2.6.4](https://github.com/laurent22/joplin/releases/tag/android-v2.6.4) (Pre-release) - 2021-12-01T11:38:49Z

- Improved: Also duplicate resources when duplicating a note (c0a8c33)
- Improved: Improved S3 sync error handling and reliability, and upgraded S3 SDK (#5312 by Lee Matos)
- Fixed: Alarm setting buttons were no longer visible (#5777)
- Fixed: Alarms were not being triggered in some cases (#5798) (#5216 by Roman Musin)
- Fixed: Fixed opening attachments (6950c40)
- Fixed: Handle duplicate attachments when the parent notebook is shared (#5796)

## [android-v2.6.3](https://github.com/laurent22/joplin/releases/tag/android-v2.6.3) (Pre-release) - 2021-11-21T16:59:46Z

- New: Add date format YYYY/MM/DD (#5759 by Helmut K. C. Tessarek)
- New: Add support for faster built-in sync locks (#5662)
- New: Add support for sharing notes when E2EE is enabled (#5529)
- New: Added support for notebook icons (e97bb78)
- Improved: Improved error message when synchronising with Joplin Server (#5754)
- Improved: Makes it impossible to have multiple instances of the app open (#5587 by Filip Stanis)
- Improved: Remove non-OSS dependencies (#5735 by [@muelli](https://github.com/muelli))
- Fixed: Fixed issue that could cause application to needlessly lock the sync target (0de6e9e)
- Fixed: Fixed issue with parts of HTML notes not being displayed in some cases (#5687)
- Fixed: Sharing multiple notebooks via Joplin Server with the same user results in an error (#5721)

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

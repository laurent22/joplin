# Joplin iOS Changelog

## [ios-v12.14.8](https://github.com/laurent22/joplin/releases/tag/ios-v12.14.8) - 2024-05-08T13:40:01Z

- Fixed: Fix Dropbox sync for large file collections (#10411) (#10396 by Henry Heino)
- Fixed: Fixed app for iOS 12 (966fe38)

## [ios-v12.14.7](https://github.com/laurent22/joplin/releases/tag/ios-v12.14.7) - 2024-05-07T16:24:05Z

- New: Add Privacy manifest file (#10406 by Henry Heino)
- Fixed: Allow pasting URLs copied from the share sheet (#10048) (#10047 by Henry Heino)
- Fixed: Fix Dropbox sync (#10400) (#10396 by Henry Heino)

## [ios-v13.0.1](https://github.com/laurent22/joplin/releases/tag/ios-v13.0.1) - 2024-04-20T10:38:22Z

- New: Add support for plugin panels and dialogs (#10121 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Improved: Add trash folder (#9671) (#483)
- Improved: Added empty trash option on long pressing the trash folder (#10120) (#10092 by [@Sidd-R](https://github.com/Sidd-R))
- Improved: Allow installing recommended plugins (#10223) (#10154 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Improved: Allow marking a plugin as mobile-only or desktop-only (#10229) (#10206 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Improved: Allow marking items as "ignored" in sync status  (#10261) (#10245 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Improved: Avoid unnecessary requests if Joplin Cloud credentials are empty (#10256 by [@pedr](https://github.com/pedr))
- Improved: Bump @codemirror/view version. (#10174 by [@itzTheMeow](https://github.com/itzTheMeow))
- Improved: Change Joplin Cloud login process to allow MFA via browser (#9776 by [@pedr](https://github.com/pedr))
- Improved: Default to tab indentation for consistency with desktop platforms (#10242 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Improved: Display a message when Joplin Cloud user don't have access to email to note feature (#10322 by [@pedr](https://github.com/pedr))
- Improved: Display recommended plugin alert (#10281) (#10207 by [@DarkFalc0n](https://github.com/DarkFalc0n))
- Improved: Do not repeat failed requests with ENOTFOUND error (#6173)
- Improved: Fix conflicts notebook doesn't work with the trash feature (#10104) (#10073 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Improved: Improve focus handling (00084c5)
- Improved: Log user actions (deletions) (#9585) (#9465 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Improved: Make tables horizontally scrollable (#10161 by [@wljince007](https://github.com/wljince007))
- Improved: Plugin API: Improve support for the Kanban and similar plugins (#10247 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Improved: Show plugin versions in settings (#10289) (#10288 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Improved: Show sync version and client id in More Info (#10254 by Self Not Found)
- Improved: Support accepting Joplin Cloud shares (#10300 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Improved: Support description banners on plugin-registered settings screens (#10286 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Improved: Support importing from JEX files (#10269 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Improved: Update farsi/persian translation fa.po (#10181 by [@mimeyn](https://github.com/mimeyn))
- Improved: Upgrade CodeMirror 6 packages (#10032) (#10031 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Fixed: Allow pasting URLs copied from the share sheet (#10048) (#10047 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Fixed: Email to note address not presented in configuration screen before synchronisation (#10293) (#10292 by [@pedr](https://github.com/pedr))
- Fixed: Fix "new note" button is shown in the trash notebook (#10227) (#10188 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Fixed: Fix clicking on a link results in a blank screen (#10168) (#10166 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Fixed: Fix dropdowns invisible when opening settings by clicking "synchronize" (#10271) (#10270 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Fixed: Fix error on retry or ignore attachment too large error (#10314) (#10313 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Fixed: Fix note editor's settings and plugins updated on every keystroke (#10116 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Fixed: Fix plugin API memory leak (#10115 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Fixed: Fix shared data lost if Joplin is closed immediately after receiving a share (#10171) (#10170 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Fixed: Fix trash folder sometimes has wrong icon (#10173) (#10172 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Fixed: Improve note editor performance when quickly entering text (#10134) (#10130 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Fixed: New note button crashes app when there are no notebooks (#10087) (#10065 by [@Sidd-R](https://github.com/Sidd-R))
- Fixed: Plugin API: Fix crash when a plugin registers an enum setting with no default (#10263 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Fixed: Plugin API: Fix error when calling `plugins.dataDir` (#10262 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Fixed: Plugins: Fix event listener memory leak when disabling/uninstalling plugins (#10280 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Fixed: Plugins: Fix warning after reloading plugins (#10165 by [@personalizedrefrigerator](https://github.com/personalizedrefrigerator))
- Fixed: Shows only the real folders in the dropdown of parent folders. (#10147) (#10143 by [@Sidd-R](https://github.com/Sidd-R))

## [ios-v12.14.6](https://github.com/laurent22/joplin/releases/tag/ios-v12.14.6) - 2024-03-01T18:04:47Z

- Improved: Immediately sort notes after toggling a checkbox (5820f63)
- Fixed: Fix auto-indentation in some types of code blocks (#9972) (#9971 by Henry Heino)
- Fixed: Fix white flash when editing notes in dark mode (#9987) (#8557 by Henry Heino)
- Fixed: Note editor: Support older WebView versions (#9986) (#9521 by Henry Heino)
- Fixed: Sort notebooks in a case-insensitive way (#9996)

## [ios-v12.14.5](https://github.com/laurent22/joplin/releases/tag/ios-v12.14.5) - 2024-02-19T10:46:51Z

- Improved: Migrate profile in preparation for trash feature (115eb5d)
- Improved: Updated packages tar-stream (v3.1.7)

## [ios-v12.14.4](https://github.com/laurent22/joplin/releases/tag/ios-v12.14.4) - 2024-02-09T12:47:39Z

- Improved: Improve search engine error handling when preparing text for search (#9871 by Henry Heino)
- Improved: Updated packages @js-draw/material-icons (v1.16.1), @react-native-community/netinfo (v11.2.1), @react-native-community/slider (v4.5.0), async-mutex (v0.4.1), follow-redirects (v1.15.5), js-draw (v1.16.1), moment (v2.30.1), react-native-document-picker (v9.1.0), react-native-localize (v3.0.6), react-native-paper (v5.11.7), react-native-safe-area-context (v4.8.2), react-native-share (v10.0.2), react-native-webview (v13.6.4), sass (v1.69.7), sharp (v0.33.2), sqlite3 (v5.1.7)
- Fixed: Correctly search HTML-entity encoded text (#9694)
- Fixed: Fix deeply-nested subnotebook titles invisible in the folder dropdown (#9906) (#9858 by Henry Heino)
- Fixed: Fix share to Joplin when only "All notes" has been opened (#9876) (#9863 by Henry Heino)
- Fixed: Increase space available for Notebook icon (#9877) (#9475 by [@pedr](https://github.com/pedr))

## [ios-v12.14.3](https://github.com/laurent22/joplin/releases/tag/ios-v12.14.3) - 2024-02-02T23:14:00Z

- New: Add support for showing only lines of log that contain a filter (#9728 by Henry Heino)
- Improved: Allow note viewer to extend to the edge of the screen while pinch zooming (#9820) (#9819 by Henry Heino)
- Improved: Allow setting a minimum app version on the sync target (#9778)
- Improved: Display an error if a resource cannot be downloaded (cbf7e24)
- Improved: Do not allow switching the sync target if not all resources are downloaded (#9263)
- Improved: Don't log OneDrive `Authorization` tokens (#9707) (#9706 by Henry Heino)
- Improved: Hide advanced settings by default (#9730 by Henry Heino)
- Improved: Removed ability to search by note ID to fix issue with certain plugins (#9769)
- Improved: Updated packages @js-draw/material-icons (v1.15.0), follow-redirects (v1.15.4), fs-extra (v11.2.0), js-draw (v1.15.0), react, react-native-device-info (v10.12.0), react-native-image-picker (v7.1.0), react-native-paper (v5.11.6), react-native-vector-icons (v10.0.3), sharp (v0.33.1)
- Fixed: Fix crash on opening settings on some devices (#9806) (#7974 by Henry Heino)
- Fixed: Clear "Some items cannot be synchronised" banner after situation is resolved (#9157)
- Fixed: Detect faster left-right swipes to open the sidemenu (#9802) (#9142 by Henry Heino)
- Fixed: Fix AWS S3 sync error (#9696) (#8891 by Henry Heino)
- Fixed: Fix broken synchronisation link in welcome notes (#9804) (#9799 by Henry Heino)
- Fixed: Fix note editor errors/logs not sent to Joplin's logs (#9808) (#9807 by Henry Heino)
- Fixed: Fix synchronization happens every 10 seconds even if nothing has changed (#9814) (#9800 by Henry Heino)

## [ios-v12.14.2](https://github.com/laurent22/joplin/releases/tag/ios-v12.14.2) - 2024-01-06T12:46:08Z

- Improved: Fix table-of-contents links to headings with duplicate content (#9610) (#9594 by Henry Heino)
- Improved: Improve sync by reducing how often note list is sorted (f95ee68)
- Improved: Render mermaid diagrams in dark mode when Joplin is in dark mode (#9631) (#3201 by Henry Heino)
- Improved: Updated packages deprecated-react-native-prop-types (v5), react-native-get-random-values (v1.10.0), react-native-paper (v5.11.4)

## [ios-v12.14.1](https://github.com/laurent22/joplin/releases/tag/ios-v12.14.1) - 2023-12-29T22:23:50Z

- Improved: CodeMirror 6 markdown editor: Support highlighting more languages (#9563) (#9562 by Henry Heino)
- Improved: Don't attach empty drawings when a user exits without saving (#9386) (#9377 by Henry Heino)
- Improved: Handle Dropbox payload_too_large error (f267d88)
- Improved: Make backspace delete auto-matching brackets (#9527) (#9526 by Henry Heino)
- Improved: Optimise synchronisation by making delta call return whole items (5341501)
- Improved: Updated packages @react-native-community/datetimepicker (v7.6.2), @react-native-community/netinfo (v9.5.0), @react-native-community/slider (v4.4.4), @rmp135/sql-ts (v1.18.1), @testing-library/react-native (v12.3.3), highlight.js (v11.9.0), mermaid (v10.6.1), nanoid (v3.3.7), nodemon (v3.0.2), punycode (v2.3.1), react, react-native-image-picker (v7.0.3), react-native-localize (v3.0.4), react-native-paper (v5.11.3), react-native-vector-icons (v10.0.2), react-native-webview (v13.6.3), style-to-js (v1.1.9), tesseract.js (v5.0.3), ts-loader (v9.5.1)
- Fixed: #9361: Fix to-dos options toggle don't toggle a rerender in  (#9364) (#9361 by [@pedr](https://github.com/pedr))
- Fixed: Fix Beta Editor diff highlighting (#9525) (#9524 by Henry Heino)
- Fixed: Fix KaTeX rendering (#9456) (#9455 by Henry Heino)
- Fixed: Fix code block borders in headers of Beta Markdown editor (#9523) (#9522 by Henry Heino)
- Fixed: Fix cursor location on opening the editor and attachments inserted in wrong location (#9536) (#9532 by Henry Heino)
- Fixed: Fix editor scrollbar on iOS (#9531) (#9322 by Henry Heino)
- Fixed: Fix font for the inbox email address not using the theme color (#9503) (#9500 by [@pedr](https://github.com/pedr))
- Fixed: Fix inline code at beginning of line in table breaks formatting (#9478) (#9477 by Henry Heino)
- Fixed: Fix list renumbering and enable multiple selections (#9506) (#9200 by Henry Heino)
- Fixed: Fix new note/to-do buttons not visible on app startup in some cases (#9329) (#9328 by Henry Heino)
- Fixed: Fix note editor crash when trying to edit text quickly after opening a note (#9581) (#9502 by Henry Heino)
- Fixed: Fix tooltips don't disappear on some devices (upgrade to js-draw 1.13.2) (#9401) (#9374 by Henry Heino)
- Fixed: Sidebar is not dismissed when creating a note (#9376)

## [ios-v12.13.10](https://github.com/laurent22/joplin/releases/tag/ios-v12.13.10) - 2023-12-01T12:07:57Z

- Improved: Drawing: Revert recent changes to input system (#9426) (#9427 by Henry Heino)

## [ios-v12.13.9](https://github.com/laurent22/joplin/releases/tag/ios-v12.13.9) - 2023-11-30T17:56:37Z

- Improved: Don't attach empty drawings when a user exits without saving (#9386) (#9377 by Henry Heino)
- Fixed: Fix tooltips don't disappear on some devices (upgrade to js-draw 1.13.2) (#9401) (#9374 by Henry Heino)

## [ios-v12.13.8](https://github.com/laurent22/joplin/releases/tag/ios-v12.13.8) - 2023-11-26T12:54:44Z

- Fixed: Fix to-dos options toggle don't toggle a rerender (#9364) (#9361 by [@pedr](https://github.com/pedr))
- Fixed: Fix new note/to-do buttons not visible on app startup in some cases (#9329) (#9328 by Henry Heino)
- Fixed: Sidebar is not dismissed when creating a note (#9376)

## [ios-v12.13.7](https://github.com/laurent22/joplin/releases/tag/ios-v12.13.7) - 2023-11-16T13:37:03Z

- Improved: Add more space between settings title and description (#9270) (#9258 by Henry Heino)
- Improved: Fade settings screen icons (#9268) (#9260 by Henry Heino)
- Improved: Implement settings search (#9320) (#9294 by Henry Heino)
- Improved: Improve image editor load performance (#9281 by Henry Heino)
- Improved: Update js-draw to version 1.11.2 (#9120) (#9195 by Henry Heino)
- Improved: Updated packages @testing-library/react-native (v12.3.1), mermaid (v10.5.1), react-native-safe-area-context (v4.7.4), react-native-vector-icons (v10.0.1), sass (v1.69.5)
- Fixed: Allow showing dropdowns in landscape mode (#9309) (#9271 by Henry Heino)
- Fixed: Config screen: Fix section list scroll (#9267) (#9259 by Henry Heino)
- Fixed: Disable notebook list side menu in config screen (#9311) (#9308 by Henry Heino)
- Fixed: Fix encryption when a resource doesn't have an associated file (#9222) (#9123 by Henry Heino)
- Fixed: Fix settings save confirmation not shown when navigating to encryption/profile/log screens (#9313) (#9312 by Henry Heino)
- Fixed: Restore scroll position when returning to the note viewer from the editor or camera (#9324) (#9321 by Henry Heino)

## [ios-v12.13.5](https://github.com/laurent22/joplin/releases/tag/ios-v12.13.5) - 2023-11-10T13:20:09Z

- Improved: Add a "Retry all" button when multiple resources could not be downloaded (#9158)
- Improved: Settings screen: Create separate pages for each screen (#8567 by Henry Heino)
- Improved: Updated packages @react-native-community/datetimepicker (v7.6.1), deprecated-react-native-prop-types (v4.2.3), react-native-safe-area-context (v4.7.3)
- Fixed: Disable selection match highlighting (#9202) (#9201 by Henry Heino)
- Fixed: Fix OneDrive sync crash on throttle (#9143) (#8561 by Henry Heino)
- Fixed: Fix fast search (#9191) (#9159 by Henry Heino)
- Fixed: Fix search highlighting (#9206) (#9207 by Henry Heino)
- Fixed: Image editor resets on theme change (#9190) (#9188 by Henry Heino)

## [ios-v12.13.4](https://github.com/laurent22/joplin/releases/tag/ios-v12.13.4) - 2023-10-31T20:38:31Z

- Improved: Image editor: Allow loading from save when the image editor is reloaded in the background (#9135) (#9134 by Henry Heino)
- Improved: Updated packages sass (v1.68.0)

## [ios-v12.13.3](https://github.com/laurent22/joplin/releases/tag/ios-v12.13.3) - 2023-10-30T22:21:13Z

- Improved: Allow searching by note ID or using a callback URL (3667bf3)
- Improved: Updated packages @react-native-community/datetimepicker (v7.6.0), react-native-device-info (v10.11.0), react-native-webview (v13.6.2)
- Fixed: Beta editor: Fix image timestamps not updated after editing (#9176) (#9175 by Henry Heino)

## [ios-v12.13.2](https://github.com/laurent22/joplin/releases/tag/ios-v12.13.2) - 2023-10-24T18:40:49Z

- New: Add share button to log screen (#8364 by Henry Heino)
- New: Add support for drawing pictures (#7588 by Henry Heino)
- Improved: Allow modifying a resource metadata only when synchronising (#9114)
- Improved: Apply correct size to images imported from ENEX files (#8684)
- Improved: Bump mermaid version to 10.4.0 to support new chart types (#8890) (#8728 by [@oj-lappi](https://github.com/oj-lappi))
- Improved: Enable ignoreTlsErrors and custom certificates for S3 sync (#8980 by Jens Böttge)
- Improved: Fix random crash due to sidebar animation (#8792) (#8791 by Henry Heino)
- Improved: Improved handling of invalid sync info (#6978)
- Improved: Remember whether "All notes", a notebook or a tag was opened when re-opening the app (#8021)
- Improved: Support for plural translations (#9033)
- Improved: Updated packages @bam.tech/react-native-image-resizer (v3.0.7), @react-native-community/datetimepicker (v7.5.0), @react-native-community/geolocation (v3.1.0), @react-native-community/slider (v4.4.3), @testing-library/jest-native (v5.4.3), @testing-library/react-native (v12.3.0), compare-versions (v6.1.0), dayjs (v1.11.10), deprecated-react-native-prop-types (v4.2.1), follow-redirects (v1.15.3), glob (v10.3.6), katex (v0.16.9), markdown-it (v13.0.2), markdown-it-multimd-table (v4.2.3), nodemon (v3.0.1), react, react-native-device-info (v10.9.0), react-native-dropdownalert (v5), react-native-exit-app (v2), react-native-gesture-handler (v2.12.1), react-native-image-picker (v5.7.0), react-native-modal-datetime-picker (v17.1.0), react-native-paper (v5.10.6), react-native-safe-area-context (v4.7.2), react-native-share (v9.4.1), react-native-url-polyfill (v2), react-native-vector-icons (v10), react-native-webview (v13.6.0), react-native-zip-archive (v6.1.0), react-redux (v8.1.3), sass (v1.67.0), sharp (v0.32.6), sprintf-js (v1.1.3), tar (v6.2.0), url (v0.11.3), uuid (v9.0.1)
- Fixed: Fix complex queries that contain quotes or filters (#8050)
- Fixed: Fix icon after react-native-vector-icon upgrade (0e0c1d8)
- Fixed: Fix not all dropdown items focusable with VoiceOver (#8714) (#8707 by Henry Heino)
- Fixed: Fix search engine ranking algorithm (f504cf1)
- Fixed: Fix sidebar folder icon (cd55a9a)
- Fixed: Fix sync issue with Stackstorage (#2153)
- Fixed: Fix unordered list button creates checklists (#8957) (#8956 by Henry Heino)
- Fixed: Fix writing UTF-8 data to a file replaces non-ASCII characters with ?s (#9076) (#9069 by Henry Heino)
- Fixed: Fixed code block not default line wrap in pdf view (#8626) (#8517 by [@wljince007](https://github.com/wljince007))
- Fixed: Fixed issues related to sharing notes on read-only notebooks (1c7d22e)
- Fixed: Hide the keyboard when showing the attach dialog (#8911) (#8774 by Henry Heino)
- Fixed: Improve list toggle logic (#9103) (#9066 by Henry Heino)
- Fixed: Prevent accessibility tools from focusing the notes list when it's invisible (#8799) (#8798 by Henry Heino)
- Fixed: Prevent application from being stuck when importing an invalid ENEX file (#8699)

## [ios-v12.12.3](https://github.com/laurent22/joplin/releases/tag/ios-v12.12.3) - 2023-09-11T20:05:19Z

- Improved: Add screen reader labels to search/note actions buttons (#8797) (#8796 by Henry Heino)
- Improved: Improve accessibility of side menu (#8839 by Henry Heino)
- Fixed: Revert to `react-native-sidemenu-updated` for navigation drawers (#8820) (#8791 by Henry Heino)

## [ios-v12.12.2](https://github.com/laurent22/joplin/releases/tag/ios-v12.12.2) - 2023-09-01T22:13:36Z

- New: Add JEX export (#8428 by Henry Heino)
- New: Add support for Joplin Cloud email to note functionality (#8460 by [@pedr](https://github.com/pedr))
- New: Add support for share permissions (#8491)
- Improved: Add an option to disable the image resizing prompt (#8575) (#8566 by [@hubert](https://github.com/hubert))
- Improved: Add option to autodetect theme (#8498) (#8490 by Henry Heino)
- Improved: Updated packages @react-native-community/datetimepicker (v7.4.1), @react-native-community/geolocation (v3.0.6), @react-native-community/netinfo (v9.4.1), @rmp135/sql-ts (v1.18.0), @testing-library/react-native (v12.1.3), buildTools, clean-html (v2), dayjs (v1.11.9), domhandler (v5), gettext-parser (v7.0.1), glob (v10.3.3), highlight.js (v11.8.0), jsdom (v22.1.0), react-native-device-info (v10.7.0), react-native-document-picker (v9), react-native-drawer-layout (v3.2.1), react-native-gesture-handler (v2.12.0), react-native-get-random-values (v1.9.0), react-native-image-picker (v5.6.0), react-native-localize (v3.0.2), react-native-modal-datetime-picker (v15.0.1), react-native-paper (v5.9.1), react-native-reanimated (v3.2.0), react-native-safe-area-context (v4.6.4), react-redux (v8.1.2), sass (v1.63.6), sharp (v0.32.4), standard (v17.1.0), ts-loader (v9.4.4), url (v0.11.1), word-wrap (v1.2.5)
- Improved: Upgrade react-native-webview to v12 (9ceb7b9)
- Improved: Upgrade to React Native 0.71 (e740914)
- Improved: WebDAV: Show a more descriptive error message when the password is empty (#8477) (#8466 by Henry Heino)
- Fixed: Do not log data shared with the app (#8495) (#8211 by Henry Heino)
- Fixed: Fixed link modal position on devices with notch (#8029) (#8027 by [@Letty](https://github.com/Letty))
- Fixed: Fixed text update issue when attaching a file to an empty note (78f3f1c)
- Fixed: Hide markdown toolbar completely when low on vertical space (#8688) (#8687 by Henry Heino)
- Fixed: Preserve image rotation (and other metadata) when resizing (#8669) (#8310 by Henry Heino)
- Fixed: Show warning if some items could not be decrypted (#8481) (#8381 by Henry Heino)
- Fixed: Unrevert #7953: Migrate to react-native-drawer-layout (#8379) (#7918 by Henry Heino)
- Security: Prevent XSS when passing specially encoded string to a link (57b4198)

## [ios-v12.11.5](https://github.com/laurent22/joplin/releases/tag/ios-v12.11.5) - 2023-06-25T14:05:43Z

- Improved: Auto-detect language on start (e48d55c)
- Improved: Updated packages @react-native-community/datetimepicker (v7), aws, buildTools, domutils (v3.1.0), react-native-document-picker (v8.2.1), react-native-reanimated (v3.1.0), react-native-safe-area-context (v4.5.3), tar (v6.1.15)
- Improved: Upgrade E2EE encryption method to AES-256 (#7686)
- Improved: When resetting the master password, also create a new master key with that password (e647775)
- Fixed: Allow certain HTML anchor tags (#8286)
- Fixed: Fix sharing data with the app (#8285)
- Fixed: Improve selection of active E2EE key (#8254)

## [ios-v12.11.3](https://github.com/laurent22/joplin/releases/tag/ios-v12.11.3) - 2023-05-29T12:27:45Z

- Improved: Implement parenting of notebooks (#7980) (#8193 by [@jcgurango](https://github.com/jcgurango))
- Fixed: Fixed broken domain detection (192bfb5)
- Fixed: Fixed regression in biometric check (b19f1a1)

## [ios-v12.11.2](https://github.com/laurent22/joplin/releases/tag/ios-v12.11.2) - 2023-05-27T15:31:26Z

- New: Add log info for biometrics feature (efdbaeb)
- New: Add setting to enable/disable the markdown toolbar (#7929 by Henry Heino)
- Improved: Disable Hermes engine (e9e9986)
- Improved: Mark biometrics feature as beta and ensure no call is made if it is not enabled (e44a934)
- Improved: Editor syntax highlighting was broken (#8023) (#8022 by Henry Heino)
- Improved: Sync as soon as the app starts, and immediately after changing a note (3eb44d2)
- Improved: Tells whether Hermes engine is enabled or not (5ecae17)
- Improved: Translate Welcome notes (#8154)
- Improved: Updated packages @lezer/highlight (v1.1.4), @react-native-community/netinfo (v9.3.9), @react-native-community/push-notification-ios (v1.11.0), aws, fs-extra (v11.1.1), jsdom (v21.1.2), markdown-it-multimd-table (v4.2.2), nanoid (v3.3.6), node-persist (v3.1.3), nodemon (v2.0.22), react-native-document-picker (v8.2.0), react-native-image-picker (v5.3.1), react-native-paper (v5.8.0), react-native-safe-area-context (v4.5.2), react-native-share (v8.2.2), reselect (v4.1.8), sass (v1.62.1), sharp (v0.32.1), sqlite3 (v5.1.6), tar (v6.1.14), turndown (v7.1.2), yargs (v17.7.2)
- Fixed: Encode the non-ASCII characters in OneDrive URI (#7868) (#7851 by Self Not Found)
- Fixed: Fix "Download interrupted" error (b023f58)
- Fixed: Fix OneDrive sync attempting to call method on `null` variable (#7987) (#7986 by Henry Heino)
- Fixed: Fixed sync crash  (#8056) (#8017 by Arun Kumar)
- Fixed: Fixes issue where the note body is not updated after attaching a file (991c120)
- Fixed: Removed `MasterKey` from Sync Status report (#8026) (#7940 by Arun Kumar)
- Fixed: Use react-native-drawer-layout instead of react-native-side-menu-updated (#7953) (#7918 by [@jcgurango](https://github.com/jcgurango))
- Security: Disable SVG tag support in editor to prevent XSS (caf6606)
- Security: Prevent XSS by sanitizing certain HTML attributes (9e90d90)
- Security: Prevent bypassing fingerprint lock on certain devices (6b72f86)

## [ios-v12.10.5](https://github.com/laurent22/joplin/releases/tag/ios-v12.10.5) - 2023-03-06T14:43:37Z

- Improved: Stop synchronization with unsupported WebDAV providers (#7819) (#7661 by [@julien](https://github.com/julien))
- Fixed: Custom sort order not synchronized (#7729) (#6956 by Tao Klerks)
- Fixed: Fix camera attachment (#7775) (#7675 by [@vikneshwar](https://github.com/vikneshwar))
- Fixed: Fix double-scroll issue in long notes (#7701) (#7700 by Henry Heino)
- Fixed: Fix startup error (#7688) (#7687 by Henry Heino)
- Fixed: Fixed sharing file (ed0edcb)
- Fixed: Hide main content while biometric is enabled and not authenticated (#7781) (#7762 by [@pedr](https://github.com/pedr))
- Fixed: Sharing pictures to Joplin creates recurring duplications (#7791)

## [ios-v12.10.2](https://github.com/laurent22/joplin/releases/tag/ios-v12.10.2) - 2023-01-20T17:41:13Z

- New: Add support for locking the app using biometrics (f10d9f7)
- New: Add support for multiple profiles (6bb52d5)
- New: Add support for realtime search (767213c)
- Improved: Configurable editor font size (#7596 by Henry Heino)
- Improved: Confirm closing settings with unsaved changes (#7566 by Henry Heino)
- Improved: Improve dialogue spacing in Fountain renderer (#7628) (#7627 by [@Elleo](https://github.com/Elleo))
- Improved: Make the new text editor the default one (f5ef318)
- Improved: Upgrade to React Native 0.70 (4bdb3d0)
- Fixed: Enable autocorrect with spellcheck (#7532) (#6175 by Henry Heino)
- Fixed: Fix Dropdown accessibility (#7564) (#7553 by Henry Heino)
- Fixed: Fixed issue when floating keyboard is visible (#7593) (#6682 by Henry Heino)
- Fixed: Fixed proxy timeout setting UI (275c80a)
- Fixed: Remove gray line around text editor (#7595) (#7594 by Henry Heino)
- Fixed: Settings save button visible even when no settings have been changed (#7503)

## [ios-v12.10.1](https://github.com/laurent22/joplin/releases/tag/ios-v12.10.1) - 2022-12-28T15:08:39Z

- Improved: Switch license to AGPL-3.0 (faf0a4e)
- Improved: Tag search case insensitive (#7368 by [@JackGruber](https://github.com/JackGruber))
- Improved: Update Mermaid: 9.1.7 to 9.2.2 (#7330 by Helmut K. C. Tessarek)
- Improved: Upgrade to react-native 0.68.5 (e2d59ee)
- Fixed: Fix CodeMirror syntax highlighting (#7386 by Henry Heino)
- Fixed: Fix attaching multiple files (#7196) (#7195 by Self Not Found)
- Fixed: Note viewer inertial scroll is slower than native inertial scrolling (#7470) (#7469 by Henry Heino)
- Fixed: Update CodeMirror (#7262) (#7253 by Henry Heino)
- Security: Fix XSS when a specially crafted string is passed to the renderer (a2de167)

## [ios-v12.9.2](https://github.com/laurent22/joplin/releases/tag/ios-v12.9.2) - 2022-12-22T12:42:26Z

- Fixed: Could not attach images to notes anymore (#7471)

## [ios-v12.9.1](https://github.com/laurent22/joplin/releases/tag/ios-v12.9.1) - 2022-12-04T18:03:02Z

- New: Add Markdown toolbar (#6753 by Henry Heino)
- New: Add alt text/roles to some buttons to improve accessibility (#6616 by Henry Heino)
- New: Add keyboard-activatable markdown commands (e.g. bold, italicize) (#6707 by Henry Heino)
- New: Add long-press tooltips (#6758 by Henry Heino)
- New: Add note bar (#6772 by Tolulope Malomo)
- Improved: Convert empty bolded regions to bold-italic regions in beta editor (#6807) (#6808 by Henry Heino)
- Improved: Ctrl+F search support in beta editor (#6587 by Henry Heino)
- Improved: Disable multi-highlighting to fix context menu (9b348fd)
- Improved: Display icon for all notebooks if at least one notebook has an icon (ec97dd8)
- Improved: Enable long-press menu (#6738 by Henry Heino)
- Improved: Improve syntax highlighting on mobile beta editor (#6684 by Henry Heino)
- Improved: Increase the attachment size limit to 200MB (#6848 by Self Not Found)
- Improved: Removes whitespace above navigation component (#6597 by [@tom](https://github.com/tom))
- Improved: Respect system accessibility font size in rendered markdown (#6686) (#6685 by Henry Heino)
- Improved: Setting to disable spellcheck in beta editor (#6780 by Henry Heino)
- Improved: Show client ID in log (#6897 by Self Not Found)
- Improved: Supports attaching multiple files to a note at once (#6831 by Self Not Found)
- Improved: Translation: Update zh_TW (#6727 by Kevin Hsu)
- Improved: Update Mermaid 8.13.9 to 9.1.7 (#6849 by Helmut K. C. Tessarek)
- Fixed: Add button to reduce space below markdown toolbar (#6823) (#6805 by Henry Heino)
- Fixed: Do not encrypt non-owned note if it was not shared encrypted (#6645)
- Fixed: Fix checklist continuation in beta editor (#6577) (#6576 by Henry Heino)
- Fixed: Fix default font in beta editor (#6760) (#6759 by Henry Heino)
- Fixed: Fix multiple webview instances (#6841 by Henry Heino)
- Fixed: Fix occasional overscroll when opening the keyboard (#6700) (#6636 by Henry Heino)
- Fixed: Fix resources sync when proxy is set (#6817) (#6688 by Self Not Found)
- Fixed: Fix side menu width on wide screen devices (#6662 by Tolulope Malomo)
- Fixed: Fixed crash when trying to move note to notebook (#6898)
- Fixed: Fixed notebook icon spacing (633c9ac)
- Fixed: Fixed notebook icons alignment (ea6b7ca)
- Fixed: Note links with HTML notation did not work (#6515)
- Fixed: Scroll selection into view in beta editor when window resizes (#6610) (#5949 by Henry Heino)
- Fixed: Support non-ASCII characters in OneDrive (#6916) (#6838 by Self Not Found)
- Security: Fix XSS when a specially crafted string is passed to the renderer (762b4e8)

## [ios-v12.8.1](https://github.com/laurent22/joplin/releases/tag/ios-v12.8.1) - 2022-06-06T10:56:27Z

- Improved: Automatically start sync after setting the sync parameters (ff066ba)
- Improved: Color of Date-Time text changed to match theme (#6279 by Ayush Srivastava)
- Improved: Make search engine filter keywords case insensitive (#6267) (#6266 by [@JackGruber](https://github.com/JackGruber))
- Improved: Sort sync target options (814a5a0)
- Fixed: "Move Note" dropdown menu can be very narrow (#6306) (#3564 by Ayush Srivastava)
- Fixed: Error when pressing undo or redo button while editor is closed (#6426) (#6328 by Tolulope Malomo)
- Fixed: IOS and Dropbox synchronisation not working on iOS 15 (#6375)
- Fixed: Remove white border around Beta Editor (#6326) (#6318 by Henry Heino)
- Fixed: Support inserting attachments from Beta Editor (#6325) (#6324 by Henry Heino)

## [ios-v12.7.2](https://github.com/laurent22/joplin/releases/tag/ios-v12.7.2) - 2022-04-15T11:07:27Z

- Improved: Allow filtering tags in tag dialog (#6221 by [@shinglyu](https://github.com/shinglyu))
- Improved: Handle invalid revision patches (#6209)
- Improved: Improve error message when revision metadata cannot be decoded, to improve debugging (a325bf6)
- Fixed: Ensure that note revision markup type is set correctly (#6261)
- Fixed: IOS and Dropbox synchronisation not working on iOS 15 (#6375)
- Fixed: The camera button remains clickable after taking a photo bug (#6222 by [@shinglyu](https://github.com/shinglyu))

## [ios-v12.7.1](https://github.com/laurent22/joplin/releases/tag/ios-v12.7.1) - 2022-02-14T14:10:49Z

- New: Add additional time format HH.mm (#6086 by [@vincentjocodes](https://github.com/vincentjocodes))
- Improved: Do no duplicate resources when duplicating a note (721d008)
- Improved: Make heading 4, 5 and 6 styling more consistent (fca5875)
- Improved: Show login prompt for OneDrive (#5933 by Jonathan Heard)
- Improved: Update Mermaid 8.13.5 -&gt; 8.13.9 and Katex dependencies (#6039 by Helmut K. C. Tessarek)
- Fixed: Fixed issue where synchroniser would try to update a shared folder that is not longer accessible (667d642)
- Fixed: Prevent multiline note titles (#6144) (#5482 by [@Daeraxa](https://github.com/Daeraxa))
- Fixed: Shared resource was not encrypted with correct encryption key (#6092)

## [ios-v12.6.2](https://github.com/laurent22/joplin/releases/tag/ios-v12.6.2) - 2021-12-17T09:59:16Z

- New: Add date format YYYY/MM/DD (#5759 by Helmut K. C. Tessarek)
- New: Add support for faster built-in sync locks (#5662)
- New: Add support for sharing notes when E2EE is enabled (#5529)
- New: Added support for notebook icons (e97bb78)
- Improved: Also duplicate resources when duplicating a note (c0a8c33)
- Improved: Improved S3 sync error handling and reliability, and upgraded S3 SDK (#5312 by Lee Matos)
- Improved: Improved error message when synchronising with Joplin Server (#5754)
- Improved: Ping joplinapp.org domain instead of Google when doing the WiFi connection check (#5705)
- Improved: Set min supported iOS version to 13.0 (298e85f)
- Improved: Update Mermaid: 8.12.1 -&gt; 8.13.5 (#5831 by Helmut K. C. Tessarek)
- Improved: Upgraded React Native from 0.64 to 0.66 (66e79cc)
- Fixed: Alarm setting buttons were no longer visible (#5777)
- Fixed: Fixed "Invalid lock client type" error when migrating sync target (e0e93c4)
- Fixed: Fixed iOS 12 crash that prevents the app from starting (#5671)
- Fixed: Fixed issue that could cause application to needlessly lock the sync target (0de6e9e)
- Fixed: Fixed issue with parts of HTML notes not being displayed in some cases (#5687)
- Fixed: Handle duplicate attachments when the parent notebook is shared (#5796)
- Fixed: Links in flowchart Mermaid diagrams (#5830) (#5801 by Helmut K. C. Tessarek)
- Fixed: Sharing multiple notebooks via Joplin Server with the same user results in an error (#5721)

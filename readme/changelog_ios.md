# Joplin iOS app changelog

## [ios-v12.11.4](https://github.com/laurent22/joplin/releases/tag/ios-v12.11.4) - 2023-06-25T13:05:29Z

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

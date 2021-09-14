# Joplin changelog

## [v1.0.241](https://github.com/laurent22/joplin/releases/tag/v1.0.241) - 2020-09-04T18:06:00Z

This release will ask you to upgrade your sync target and, once it is done, only the latest clients will be able to sync with this sync target. So please make sure you upgrade your other clients too (mobile, cli, etc.).

This version also includes an update to the search engine and as a result starting the app the first might be SLOW, as the search engine indexes all your notes. It might take from a few seconds to several minutes depending on how large your note collection is. This is a one off operation.

- New: Add mechanism to lock and upgrade sync targets ([#3524](https://github.com/laurent22/joplin/issues/3524))
- New: Add version info to error screen
- New: Added KeymapService to manage keyboard shortcuts ([#3252](https://github.com/laurent22/joplin/issues/3252) by Anjula Karunarathne)
- New: Added attach file to menu bar ([#3540](https://github.com/laurent22/joplin/issues/3540) by [@R3dError](https://github.com/R3dError))
- New: Add search filters ([#3213](https://github.com/laurent22/joplin/issues/3213)) ([#1877](https://github.com/laurent22/joplin/issues/1877) by Naveen M V)
- Security: Apply latest package security updates
- Improved: Add support for OneDrive for Business ([#3433](https://github.com/laurent22/joplin/issues/3433)) ([#1266](https://github.com/laurent22/joplin/issues/1266) by [@jonath92](https://github.com/jonath92))
- Improved: Codemirror: clean up list indent code ([#3581](https://github.com/laurent22/joplin/issues/3581) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Enable CodeMirror keybindings ([#3545](https://github.com/laurent22/joplin/issues/3545) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Fix AppImage Icon ([#3570](https://github.com/laurent22/joplin/issues/3570)) ([#3529](https://github.com/laurent22/joplin/issues/3529) by [@Jesssullivan](https://github.com/Jesssullivan))
- Improved: Hide completed to-dos in GotoAnything ([#3580](https://github.com/laurent22/joplin/issues/3580))
- Improved: Implement scroll-past-end on CodeMirror editor ([#3589](https://github.com/laurent22/joplin/issues/3589) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Show full folder name in mouse-over pop-up text ([#3590](https://github.com/laurent22/joplin/issues/3590)) ([#3569](https://github.com/laurent22/joplin/issues/3569) by Allan Jacquet-Cretides)
- Improved: Toggle Editor rather than setting split mode on search ([#3561](https://github.com/laurent22/joplin/issues/3561) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fixed copy, cut and paste in Rich Text editor ([#3565](https://github.com/laurent22/joplin/issues/3565))
- Fixed: Fixed scrolling issue when editing while searching in CodeMirror ([#3593](https://github.com/laurent22/joplin/issues/3593) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fixed sync fetching issue ([#3599](https://github.com/laurent22/joplin/issues/3599)) ([#3591](https://github.com/laurent22/joplin/issues/3591) by [@alexchee](https://github.com/alexchee))
- Fixed: Fixed vim mode issue where status bar was not visible ([#3606](https://github.com/laurent22/joplin/issues/3606) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Modify the CodeMirror linter plugin to fix katex ([#3582](https://github.com/laurent22/joplin/issues/3582)) ([#3560](https://github.com/laurent22/joplin/issues/3560) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fixed Katex font rendering ([#3664](https://github.com/laurent22/joplin/issues/3664))
- Fixed: Fix links within Mermaid documents ([#3618](https://github.com/laurent22/joplin/issues/3618))

## [v1.0.239](https://github.com/laurent22/joplin/releases/tag/v1.0.239) - 2020-09-01T21:56:36Z

IMPORTANT: This pre-release will ask you to upgrade your sync target and, once it is done, only the latest clients will be able to sync with this sync target. Currently that includes the desktop app (v1.0.234+) and Android app (v1.0.337+). It means if you are using these two clients you'll be fine. However if you are using the iOS or CLI clients you might want to wait till these clients are updated. Any issue with the sync target upgrade, please post on the forum.

This version also includes an update to the search engine and as a result starting the app the first might be SLOW, as the search engine indexes all your notes. It might take from a few seconds to several minutes depending on how large your note collection is.

Regression fixes:

- Fixes [#3645](https://github.com/laurent22/joplin/issues/3645): Improved handling of startup errors, and prevent window from being invisible when upgrading sync target
- Fixed OneDrive synchronisation ([#3674](https://github.com/laurent22/joplin/issues/3674))

Main changes:

- New: Add mechanism to lock and upgrade sync targets ([#3524](https://github.com/laurent22/joplin/issues/3524))
- New: Add version info to error screen
- New: Added KeymapService to manage keyboard shortcuts ([#3252](https://github.com/laurent22/joplin/issues/3252) by Anjula Karunarathne)
- New: Added attach file to menu bar ([#3540](https://github.com/laurent22/joplin/issues/3540) by [@R3dError](https://github.com/R3dError))
- New: Add search filters ([#3213](https://github.com/laurent22/joplin/issues/3213)) ([#1877](https://github.com/laurent22/joplin/issues/1877) by Naveen M V)
- Security: Apply latest package security updates
- Improved: Add support for OneDrive for Business ([#3433](https://github.com/laurent22/joplin/issues/3433)) ([#1266](https://github.com/laurent22/joplin/issues/1266) by [@jonath92](https://github.com/jonath92))
- Improved: Codemirror: clean up list indent code ([#3581](https://github.com/laurent22/joplin/issues/3581) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Enable CodeMirror keybindings ([#3545](https://github.com/laurent22/joplin/issues/3545) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Fix AppImage Icon ([#3570](https://github.com/laurent22/joplin/issues/3570)) ([#3529](https://github.com/laurent22/joplin/issues/3529) by [@Jesssullivan](https://github.com/Jesssullivan))
- Improved: Hide completed to-dos in GotoAnything ([#3580](https://github.com/laurent22/joplin/issues/3580))
- Improved: Implement scroll-past-end on CodeMirror editor ([#3589](https://github.com/laurent22/joplin/issues/3589) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Show full folder name in mouse-over pop-up text ([#3590](https://github.com/laurent22/joplin/issues/3590)) ([#3569](https://github.com/laurent22/joplin/issues/3569) by Allan Jacquet-Cretides)
- Improved: Toggle Editor rather than setting split mode on search ([#3561](https://github.com/laurent22/joplin/issues/3561) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fixed copy, cut and paste in Rich Text editor ([#3565](https://github.com/laurent22/joplin/issues/3565))
- Fixed: Fixed scrolling issue when editing while searching in CodeMirror ([#3593](https://github.com/laurent22/joplin/issues/3593) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fixed sync fetching issue ([#3599](https://github.com/laurent22/joplin/issues/3599)) ([#3591](https://github.com/laurent22/joplin/issues/3591) by [@alexchee](https://github.com/alexchee))
- Fixed: Fixed vim mode issue where status bar was not visible ([#3606](https://github.com/laurent22/joplin/issues/3606) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Modify the CodeMirror linter plugin to fix katex ([#3582](https://github.com/laurent22/joplin/issues/3582)) ([#3560](https://github.com/laurent22/joplin/issues/3560) by [@CalebJohn](https://github.com/CalebJohn))

## [v1.0.237](https://github.com/laurent22/joplin/releases/tag/v1.0.237) - 2020-08-29T15:38:04Z

IMPORTANT: This pre-release will ask you to upgrade your sync target and, once it is done, only the latest clients will be able to sync with this sync target. Currently that includes the desktop app (v1.0.234+) and Android app (v1.0.337+). It means if you are using these two clients you'll be fine. However if you are using the iOS or CLI clients you might want to wait till these clients are updated. Any issue with the sync target upgrade, please post on the forum.

This version also includes an update to the search engine and as a result starting the app the first might be SLOW, as the search engine indexes all your notes. It might take from a few seconds to several minutes depending on how large your note collection is.

Regression fixes:

- Linux: Fixes [#3645](https://github.com/laurent22/joplin/issues/3645): Prevent lock when restarting app
- Fixed OneDrive synchronisation ([#3674](https://github.com/laurent22/joplin/issues/3674))

Main changes:

- New: Add mechanism to lock and upgrade sync targets ([#3524](https://github.com/laurent22/joplin/issues/3524))
- New: Add version info to error screen
- New: Added KeymapService to manage keyboard shortcuts ([#3252](https://github.com/laurent22/joplin/issues/3252) by Anjula Karunarathne)
- New: Added attach file to menu bar ([#3540](https://github.com/laurent22/joplin/issues/3540) by [@R3dError](https://github.com/R3dError))
- New: Add search filters ([#3213](https://github.com/laurent22/joplin/issues/3213)) ([#1877](https://github.com/laurent22/joplin/issues/1877) by Naveen M V)
- Security: Apply latest package security updates
- Improved: Add support for OneDrive for Business ([#3433](https://github.com/laurent22/joplin/issues/3433)) ([#1266](https://github.com/laurent22/joplin/issues/1266) by [@jonath92](https://github.com/jonath92))
- Improved: Codemirror: clean up list indent code ([#3581](https://github.com/laurent22/joplin/issues/3581) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Enable CodeMirror keybindings ([#3545](https://github.com/laurent22/joplin/issues/3545) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Fix AppImage Icon ([#3570](https://github.com/laurent22/joplin/issues/3570)) ([#3529](https://github.com/laurent22/joplin/issues/3529) by [@Jesssullivan](https://github.com/Jesssullivan))
- Improved: Hide completed to-dos in GotoAnything ([#3580](https://github.com/laurent22/joplin/issues/3580))
- Improved: Implement scroll-past-end on CodeMirror editor ([#3589](https://github.com/laurent22/joplin/issues/3589) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Show full folder name in mouse-over pop-up text ([#3590](https://github.com/laurent22/joplin/issues/3590)) ([#3569](https://github.com/laurent22/joplin/issues/3569) by Allan Jacquet-Cretides)
- Improved: Toggle Editor rather than setting split mode on search ([#3561](https://github.com/laurent22/joplin/issues/3561) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fixed copy, cut and paste in Rich Text editor ([#3565](https://github.com/laurent22/joplin/issues/3565))
- Fixed: Fixed scrolling issue when editing while searching in CodeMirror ([#3593](https://github.com/laurent22/joplin/issues/3593) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fixed sync fetching issue ([#3599](https://github.com/laurent22/joplin/issues/3599)) ([#3591](https://github.com/laurent22/joplin/issues/3591) by [@alexchee](https://github.com/alexchee))
- Fixed: Fixed vim mode issue where status bar was not visible ([#3606](https://github.com/laurent22/joplin/issues/3606) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Modify the CodeMirror linter plugin to fix katex ([#3582](https://github.com/laurent22/joplin/issues/3582)) ([#3560](https://github.com/laurent22/joplin/issues/3560) by [@CalebJohn](https://github.com/CalebJohn))

## [v1.0.236](https://github.com/laurent22/joplin/releases/tag/v1.0.236) - 2020-08-28T09:16:54Z

IMPORTANT: This pre-release will ask you to upgrade your sync target and, once it is done, only the latest clients will be able to sync with this sync target. Currently that includes the desktop app (v1.0.234+) and Android app (v1.0.337+). It means if you are using these two clients you'll be fine. However if you are using the iOS or CLI clients you might want to wait till these clients are updated. Any issue with the sync target upgrade, please post on the forum.

This version also includes an update to the search engine and as a result starting the app the first might be SLOW, as the search engine indexes all your notes. It might take from a few seconds to several minutes depending on how large your note collection is.

Regression fixes:

- Fixed OneDrive synchronisation ([#3674](https://github.com/laurent22/joplin/issues/3674))

Main changes:

- New: Add mechanism to lock and upgrade sync targets ([#3524](https://github.com/laurent22/joplin/issues/3524))
- New: Add version info to error screen
- New: Added KeymapService to manage keyboard shortcuts ([#3252](https://github.com/laurent22/joplin/issues/3252) by Anjula Karunarathne)
- New: Added attach file to menu bar ([#3540](https://github.com/laurent22/joplin/issues/3540) by [@R3dError](https://github.com/R3dError))
- New: Add search filters ([#3213](https://github.com/laurent22/joplin/issues/3213)) ([#1877](https://github.com/laurent22/joplin/issues/1877) by Naveen M V)
- Security: Apply latest package security updates
- Improved: Add support for OneDrive for Business ([#3433](https://github.com/laurent22/joplin/issues/3433)) ([#1266](https://github.com/laurent22/joplin/issues/1266) by [@jonath92](https://github.com/jonath92))
- Improved: Codemirror: clean up list indent code ([#3581](https://github.com/laurent22/joplin/issues/3581) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Enable CodeMirror keybindings ([#3545](https://github.com/laurent22/joplin/issues/3545) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Fix AppImage Icon ([#3570](https://github.com/laurent22/joplin/issues/3570)) ([#3529](https://github.com/laurent22/joplin/issues/3529) by [@Jesssullivan](https://github.com/Jesssullivan))
- Improved: Hide completed to-dos in GotoAnything ([#3580](https://github.com/laurent22/joplin/issues/3580))
- Improved: Implement scroll-past-end on CodeMirror editor ([#3589](https://github.com/laurent22/joplin/issues/3589) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Show full folder name in mouse-over pop-up text ([#3590](https://github.com/laurent22/joplin/issues/3590)) ([#3569](https://github.com/laurent22/joplin/issues/3569) by Allan Jacquet-Cretides)
- Improved: Toggle Editor rather than setting split mode on search ([#3561](https://github.com/laurent22/joplin/issues/3561) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fixed copy, cut and paste in Rich Text editor ([#3565](https://github.com/laurent22/joplin/issues/3565))
- Fixed: Fixed scrolling issue when editing while searching in CodeMirror ([#3593](https://github.com/laurent22/joplin/issues/3593) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fixed sync fetching issue ([#3599](https://github.com/laurent22/joplin/issues/3599)) ([#3591](https://github.com/laurent22/joplin/issues/3591) by [@alexchee](https://github.com/alexchee))
- Fixed: Fixed vim mode issue where status bar was not visible ([#3606](https://github.com/laurent22/joplin/issues/3606) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Modify the CodeMirror linter plugin to fix katex ([#3582](https://github.com/laurent22/joplin/issues/3582)) ([#3560](https://github.com/laurent22/joplin/issues/3560) by [@CalebJohn](https://github.com/CalebJohn))

## [v1.0.235](https://github.com/laurent22/joplin/releases/tag/v1.0.235) - 2020-08-18T22:08:01Z

Important: This pre-release will ask you to upgrade your sync target and, once it is done, only the latest clients will be able to sync with this sync target. Currently that includes the desktop app (v1.0.234+) and Android app (v1.0.337+). It means if you are using these two clients you'll be fine. However if you are using the iOS or CLI clients you might want to wait till these clients are updated. Any issue with the sync target upgrade, please post on the forum.

This version also includes an update to the search engine and as a result starting the app the first might be SLOW, as the search engine indexes all your notes. It might take from a few seconds to several minutes depending on how large your note collection is

- New: Add mechanism to lock and upgrade sync targets ([#3524](https://github.com/laurent22/joplin/issues/3524))
- New: Add version info to error screen
- New: Added KeymapService to manage keyboard shortcuts ([#3252](https://github.com/laurent22/joplin/issues/3252) by Anjula Karunarathne)
- New: Added attach file to menu bar ([#3540](https://github.com/laurent22/joplin/issues/3540) by [@R3dError](https://github.com/R3dError))
- New: Add search filters ([#3213](https://github.com/laurent22/joplin/issues/3213)) ([#1877](https://github.com/laurent22/joplin/issues/1877) by Naveen M V)
- Security: Apply latest package security updates
- Improved: Add support for OneDrive for Business ([#3433](https://github.com/laurent22/joplin/issues/3433)) ([#1266](https://github.com/laurent22/joplin/issues/1266) by [@jonath92](https://github.com/jonath92))
- Improved: Codemirror: clean up list indent code ([#3581](https://github.com/laurent22/joplin/issues/3581) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Enable CodeMirror keybindings ([#3545](https://github.com/laurent22/joplin/issues/3545) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Fix AppImage Icon ([#3570](https://github.com/laurent22/joplin/issues/3570)) ([#3529](https://github.com/laurent22/joplin/issues/3529) by [@Jesssullivan](https://github.com/Jesssullivan))
- Improved: Hide completed to-dos in GotoAnything ([#3580](https://github.com/laurent22/joplin/issues/3580))
- Improved: Implement scroll-past-end on CodeMirror editor ([#3589](https://github.com/laurent22/joplin/issues/3589) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Show full folder name in mouse-over pop-up text ([#3590](https://github.com/laurent22/joplin/issues/3590)) ([#3569](https://github.com/laurent22/joplin/issues/3569) by Allan Jacquet-Cretides)
- Improved: Toggle Editor rather than setting split mode on search ([#3561](https://github.com/laurent22/joplin/issues/3561) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fixed copy, cut and paste in Rich Text editor ([#3565](https://github.com/laurent22/joplin/issues/3565))
- Fixed: Fixed scrolling issue when editing while searching in CodeMirror ([#3593](https://github.com/laurent22/joplin/issues/3593) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fixed sync fetching issue ([#3599](https://github.com/laurent22/joplin/issues/3599)) ([#3591](https://github.com/laurent22/joplin/issues/3591) by [@alexchee](https://github.com/alexchee))
- Fixed: Fixed vim mode issue where status bar was not visible ([#3606](https://github.com/laurent22/joplin/issues/3606) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Modify the CodeMirror linter plugin to fix katex ([#3582](https://github.com/laurent22/joplin/issues/3582)) ([#3560](https://github.com/laurent22/joplin/issues/3560) by [@CalebJohn](https://github.com/CalebJohn))

## [v1.0.234](https://github.com/laurent22/joplin/releases/tag/v1.0.234) - 2020-08-17T23:13:02Z

Important: This pre-release will ask you to upgrade your sync target and, once it is done, only the latest clients will be able to sync with this sync target. Currently that includes the desktop app (v1.0.234+) and Android app (v1.0.337+). It means if you are using these two clients you'll be fine. However if you are using the iOS or CLI clients you might want to wait till these clients are updated. Any issue with the sync target upgrade, please post on the forum.

This version also includes an update to the search engine and as a result starting the app the first might be SLOW, as the search engine indexes all your notes. It might take from a few seconds to several minutes depending on how large your note collection is.

- New: Add mechanism to lock and upgrade sync targets ([#3524](https://github.com/laurent22/joplin/issues/3524))
- New: Add support for media player for video and audio files
- New: Add version info to error screen
- New: Added KeymapService to manage keyboard shortcuts ([#3252](https://github.com/laurent22/joplin/issues/3252) by Anjula Karunarathne)
- New: Added attach file to menu bar ([#3540](https://github.com/laurent22/joplin/issues/3540) by [@R3dError](https://github.com/R3dError))
- New: Add search filters ([#3213](https://github.com/laurent22/joplin/issues/3213)) ([#1877](https://github.com/laurent22/joplin/issues/1877) by Naveen M V)
- Security: Apply latest package security updates
- Improved: Add support for OneDrive for Business ([#3433](https://github.com/laurent22/joplin/issues/3433)) ([#1266](https://github.com/laurent22/joplin/issues/1266) by [@jonath92](https://github.com/jonath92))
- Improved: Codemirror: clean up list indent code ([#3581](https://github.com/laurent22/joplin/issues/3581) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Enable CodeMirror keybindings ([#3545](https://github.com/laurent22/joplin/issues/3545) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Fix AppImage Icon ([#3570](https://github.com/laurent22/joplin/issues/3570)) ([#3529](https://github.com/laurent22/joplin/issues/3529) by [@Jesssullivan](https://github.com/Jesssullivan))
- Improved: Hide completed to-dos in GotoAnything ([#3580](https://github.com/laurent22/joplin/issues/3580))
- Improved: Implement scroll-past-end on CodeMirror editor ([#3589](https://github.com/laurent22/joplin/issues/3589) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Show full folder name in mouse-over pop-up text ([#3590](https://github.com/laurent22/joplin/issues/3590)) ([#3569](https://github.com/laurent22/joplin/issues/3569) by Allan Jacquet-Cretides)
- Improved: Toggle Editor rather than setting split mode on search ([#3561](https://github.com/laurent22/joplin/issues/3561) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fixed copy, cut and paste in Rich Text editor ([#3565](https://github.com/laurent22/joplin/issues/3565))
- Fixed: Fixed scrolling issue when editing while searching in CodeMirror ([#3593](https://github.com/laurent22/joplin/issues/3593) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fixed sync fetching issue ([#3599](https://github.com/laurent22/joplin/issues/3599)) ([#3591](https://github.com/laurent22/joplin/issues/3591) by [@alexchee](https://github.com/alexchee))
- Fixed: Fixed vim mode issue where status bar was not visible ([#3606](https://github.com/laurent22/joplin/issues/3606) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Modify the CodeMirror linter plugin to fix katex ([#3582](https://github.com/laurent22/joplin/issues/3582)) ([#3560](https://github.com/laurent22/joplin/issues/3560) by [@CalebJohn](https://github.com/CalebJohn))

## [v1.0.233](https://github.com/laurent22/joplin/releases/tag/v1.0.233) - 2020-08-01T14:51:15Z

- New: Add support for AWS S3 synchronisation (Beta) ([#2815](https://github.com/laurent22/joplin/issues/2815) by [@alexchee](https://github.com/alexchee))
- Security: Fixed a path traversal vulnerability in clipper server API that could allow an attacker to read or write an arbitrary file (CVE-2020-15844). Vulnerability found by [Benjamin Harris](mailto:ben@mayhem.sg).
- Improved: Improved GotoAnything speed and made it safer
- Improved: Enable searching in editor rather than the viewer for CodeMirror ([#3360](https://github.com/laurent22/joplin/issues/3360) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Enforce that whitespace check for unindent checks the begining of a ([#3515](https://github.com/laurent22/joplin/issues/3515) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Load more CodeMirror modes for syntax highlighting ([#3401](https://github.com/laurent22/joplin/issues/3401) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Split Codemirror setOptions into different effects ([#3522](https://github.com/laurent22/joplin/issues/3522) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fix filename when exporting notebook as Markdown ([#3473](https://github.com/laurent22/joplin/issues/3473))
- Fixed: Fixed alarms on macOS
- Fixed: Improve Markdown rendering in CodeMirror, in particular for math expressions ([#3448](https://github.com/laurent22/joplin/issues/3448)) ([#3440](https://github.com/laurent22/joplin/issues/3440) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Crash when applying tags to multiple notes from within another tag ([#3481](https://github.com/laurent22/joplin/issues/3481))
- Fixed: Fixed regression when moving note to notebook from menu ([#3482](https://github.com/laurent22/joplin/issues/3482))
- Fixed: Editor window was no longer being resized with the main window ([#3503](https://github.com/laurent22/joplin/issues/3503))
- Fixed: Fixed attachments being out of order when importing Enex file
- Fixed: Fixed save issue in Rich Text editor when making a change to a note and quickly switching to a different notebook
- Fixed: Fixed style caching ([#3449](https://github.com/laurent22/joplin/issues/3449))
- Fixed: In some cases, changes made to an attachment would not be saved. Also added banner to show that an attachment is being edited ([#3407](https://github.com/laurent22/joplin/issues/3407))
- Fixed: Note links would be broken after saving a note in Rich Text editor ([#3510](https://github.com/laurent22/joplin/issues/3510))
- Fixed: Regression: Fix sort tags alphabetically in side-menu ([#3489](https://github.com/laurent22/joplin/issues/3489) by Vaidotas Šimkus)
- Fixed: Regression: Fixed adding a new sub-notebook to a notebook
- Fixed: Revealing file in Windows did not work ([#3366](https://github.com/laurent22/joplin/issues/3366))
- Fixed: Undoing changes multiple time on an existing note could result in a blank note ([#3534](https://github.com/laurent22/joplin/issues/3534))
- Fixed: Fixed potential crash when notebook does not have a title
- Fixed: Fixed toolbar button state when going from setting screen to main screen

## [v1.0.232](https://github.com/laurent22/joplin/releases/tag/v1.0.232) - 2020-07-28T22:34:40Z

This release is to remove the hierarchical/nested tags feature for now, as it has a performance issue.

- New: Add support for AWS S3 synchronisation (Beta) ([#2815](https://github.com/laurent22/joplin/issues/2815) by [@alexchee](https://github.com/alexchee))
- Security: Fixed a path traversal vulnerability in clipper server API that could allow an attacker to read or write an arbitrary file (CVE-2020-15844). Vulnerability found by [Benjamin Harris](mailto:ben@mayhem.sg).
- Improved: Improved GotoAnything speed and made it safer
- Improved: Enable searching in editor rather than the viewer for CodeMirror ([#3360](https://github.com/laurent22/joplin/issues/3360) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Enforce that whitespace check for unindent checks the begining of a ([#3515](https://github.com/laurent22/joplin/issues/3515) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Load more CodeMirror modes for syntax highlighting ([#3401](https://github.com/laurent22/joplin/issues/3401) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Split Codemirror setOptions into different effects ([#3522](https://github.com/laurent22/joplin/issues/3522) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fix filename when exporting notebook as Markdown ([#3473](https://github.com/laurent22/joplin/issues/3473))
- Fixed: Fixed alarms on macOS
- Fixed: Improve Markdown rendering in CodeMirror, in particular for math expressions ([#3448](https://github.com/laurent22/joplin/issues/3448)) ([#3440](https://github.com/laurent22/joplin/issues/3440) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Crash when applying tags to multiple notes from within another tag ([#3481](https://github.com/laurent22/joplin/issues/3481))
- Fixed: Fixed regression when moving note to notebook from menu ([#3482](https://github.com/laurent22/joplin/issues/3482))
- Fixed: Api: Fixes nested tag API to handle calls with no 'fields' query key ([#3539](https://github.com/laurent22/joplin/issues/3539) by Vaidotas Šimkus)
- Fixed: Editor window was no longer being resized with the main window ([#3503](https://github.com/laurent22/joplin/issues/3503))
- Fixed: Fixed attachments being out of order when importing Enex file
- Fixed: Fixed save issue in Rich Text editor when making a change to a note and quickly switching to a different notebook
- Fixed: Fixed style caching ([#3449](https://github.com/laurent22/joplin/issues/3449))
- Fixed: In some cases, changes made to an attachment would not be saved. Also added banner to show that an attachment is being edited ([#3407](https://github.com/laurent22/joplin/issues/3407))
- Fixed: Note links would be broken after saving a note in Rich Text editor ([#3510](https://github.com/laurent22/joplin/issues/3510))
- Fixed: Regression: Fix sort tags alphabetically in side-menu ([#3489](https://github.com/laurent22/joplin/issues/3489) by Vaidotas Šimkus)
- Fixed: Regression: Fixed adding a new sub-notebook to a notebook
- Fixed: Revealing file in Windows did not work ([#3366](https://github.com/laurent22/joplin/issues/3366))
- Fixed: Undoing changes multiple time on an existing note could result in a blank note ([#3534](https://github.com/laurent22/joplin/issues/3534))

## [v1.0.227](https://github.com/laurent22/joplin/releases/tag/v1.0.227) - 2020-07-07T20:44:54Z

- New: Add approximate reading time to note statistics ([#3373](https://github.com/laurent22/joplin/issues/3373) by [@cadolphs](https://github.com/cadolphs))
- Improved: Codemirror: Remove cancelled keys in favour of explicit keymaps ([#3417](https://github.com/laurent22/joplin/issues/3417) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Manually refresh codemirror whenever the window size changes ([#3388](https://github.com/laurent22/joplin/issues/3388) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Refactored command system
- Fixed: Fix link color for dark theme ([#3391](https://github.com/laurent22/joplin/issues/3391) by Helmut K. C. Tessarek)
- Fixed: Fixed custom order when note title is changed ([#3412](https://github.com/laurent22/joplin/issues/3412))
- Fixed: Fixed import of checkboxes in ENEX files ([#3402](https://github.com/laurent22/joplin/issues/3402))
- Fixed: Only de-duplicate imported notebook titles when needed ([#2331](https://github.com/laurent22/joplin/issues/2331))
- Fixed: Prevent code highlighting from freezing the app in some cases ([#3281](https://github.com/laurent22/joplin/issues/3281))
- Fixed: WYSIWYG: Fix undo issue
- Fixed: Fixed GotoAnything rendering issue with HTML notes
- Fixed: Fixed regression which could cause a crash after deleting a notebook ([#3461](https://github.com/laurent22/joplin/issues/3461))
- Fixed: WYSIWYG: Fixed inserting date time and other content inside header

## [v1.0.226](https://github.com/laurent22/joplin/releases/tag/v1.0.226) - 2020-07-04T10:21:26Z

- Improved: Codemirror: Remove cancelled keys in favour of explicit keymaps ([#3417](https://github.com/laurent22/joplin/issues/3417) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Manually refresh codemirror whenever the window size changes ([#3388](https://github.com/laurent22/joplin/issues/3388) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Refactored command system
- Fixed: Fix link color for dark theme ([#3391](https://github.com/laurent22/joplin/issues/3391) by Helmut K. C. Tessarek)
- Fixed: Fixed custom order when note title is changed ([#3412](https://github.com/laurent22/joplin/issues/3412))
- Fixed: Fixed import of checkboxes in ENEX files ([#3402](https://github.com/laurent22/joplin/issues/3402))
- Fixed: Only de-duplicate imported notebook titles when needed ([#2331](https://github.com/laurent22/joplin/issues/2331))
- Fixed: Prevent code highlighting from freezing the app in some cases ([#3281](https://github.com/laurent22/joplin/issues/3281))
- Fixed: WYSIWYG: Fix undo issue

## [v1.0.224](https://github.com/laurent22/joplin/releases/tag/v1.0.224) - 2020-06-20T22:26:08Z

- Fixed regression in v1.0.223

## [v1.0.223](https://github.com/laurent22/joplin/releases/tag/v1.0.223) - 2020-06-20T11:51:27Z

- Improved: API: Improved error handling on service end-point
- Fixed: API: Fixed externalEditWatcher/noteIsWatched call, fixed tests

## [v1.0.221](https://github.com/laurent22/joplin/releases/tag/v1.0.221) - 2020-06-20T01:44:20Z

- New: API: Add support for external editing from API
- New: Add default filename for jex export ([#3034](https://github.com/laurent22/joplin/issues/3034) by [@CalebJohn](https://github.com/CalebJohn))
- New: Add swapLineUp and swapLineDown keys to Code Mirror editor ([#3363](https://github.com/laurent22/joplin/issues/3363) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Do not expand the left notebook when following a link to a note
- Improved: Reduce database logging statements
- Improved: Remove auto-indent for in note html/xml for Code Mirror ([#3374](https://github.com/laurent22/joplin/issues/3374) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fix getLineSpan logic and list token regex logic ([#3365](https://github.com/laurent22/joplin/issues/3365) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fixed various bugs related to the import of ENEX files as HTML
- Fixed: Prevent desktop.ini file from breaking sync lock ([#3381](https://github.com/laurent22/joplin/issues/3381))

## [v1.0.220](https://github.com/laurent22/joplin/releases/tag/v1.0.220) - 2020-06-13T18:26:22Z

- Improved: Improved escaping of Markdown titles in links ([#3333](https://github.com/laurent22/joplin/issues/3333))
- Improved: Refactored themes to allow using the same ones in both desktop and mobile version
- Fixed: Fixed issue with setting filename for edited attachments
- Fixed: Prevent notebook to be the parent of itself ([#3334](https://github.com/laurent22/joplin/issues/3334))

## [v1.0.218](https://github.com/laurent22/joplin/releases/tag/v1.0.218) - 2020-06-07T10:43:34Z

- Fixed: Fixed regression when applying theme for Ace Editor ([#3338](https://github.com/laurent22/joplin/issues/3338)) ([#3337](https://github.com/laurent22/joplin/issues/3337) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Regression: Fixed issue with note being needlessly reloaded in WYSIWYG editor

## [v1.0.217](https://github.com/laurent22/joplin/releases/tag/v1.0.217) - 2020-06-06T15:17:27Z

- New: Add option to choose Code Mirror as code editor ([#3284](https://github.com/laurent22/joplin/issues/3284) by [@CalebJohn](https://github.com/CalebJohn))
- New: Translation: Add bahasa indonesia (id_ID.po) ([#3246](https://github.com/laurent22/joplin/issues/3246) by [@ffadilaputra](https://github.com/ffadilaputra))
- Improved: Add support for editable resources ([#3305](https://github.com/laurent22/joplin/issues/3305)) ([#279](https://github.com/laurent22/joplin/issues/279))
- Improved: Add support for system keychain to save sensitive settings ([#3207](https://github.com/laurent22/joplin/issues/3207)) ([#2773](https://github.com/laurent22/joplin/issues/2773))
- Improved: Add way to manually order notes by dragging them ([#3235](https://github.com/laurent22/joplin/issues/3235)) ([#51](https://github.com/laurent22/joplin/issues/51))
- Improved: Create new notes with minimum set of properties to prevent a few minor bugs
- Improved: Dev fix: Only disable editor toolbar in preview mode
- Improved: Unindent empty list markup on Enter ([#2772](https://github.com/laurent22/joplin/issues/2772)) ([#2614](https://github.com/laurent22/joplin/issues/2614) by Shotaro Yamada)
- Improved: Upload attachments > 4 MB when using OneDrive ([#3195](https://github.com/laurent22/joplin/issues/3195)) ([#173](https://github.com/laurent22/joplin/issues/173) by [@TheOnlyTrueJonathanHeard](https://github.com/TheOnlyTrueJonathanHeard))
- Fixed: Always make the first item selected in Goto Anything ([#3181](https://github.com/laurent22/joplin/issues/3181)) ([#3170](https://github.com/laurent22/joplin/issues/3170) by 叡山电车)
- Fixed: Attaching an image, then cancelling the resize dialog, would crash the app ([#3324](https://github.com/laurent22/joplin/issues/3324))
- Fixed: Disable editor toolbar when editor is not in focus ([#3286](https://github.com/laurent22/joplin/issues/3286))
- Fixed: Disable middle-clicking external URLs, as they would open inside the application ([#3287](https://github.com/laurent22/joplin/issues/3287))
- Fixed: Fix styling of note title in exported PDF and print ([#3227](https://github.com/laurent22/joplin/issues/3227))
- Fixed: Fixed date popup dialog overflow issue inside info dialog
- Fixed: Fixed issue with accentuated letters in GotoAnything  ([#3183](https://github.com/laurent22/joplin/issues/3183)) ([#3171](https://github.com/laurent22/joplin/issues/3171) by 叡山电车)
- Fixed: Fixed issue with invalid image paths when config path contains spaces ([#3267](https://github.com/laurent22/joplin/issues/3267))
- Fixed: Fixed note list context menu ([#3331](https://github.com/laurent22/joplin/issues/3331))
- Fixed: Fixed portable app issue with resource paths
- Fixed: Fixed shortcut to focus Note List when editor is in focus ([#3298](https://github.com/laurent22/joplin/issues/3298))
- Fixed: Make GotoAnyting work with East Asian charactors ([#3180](https://github.com/laurent22/joplin/issues/3180)) ([#3153](https://github.com/laurent22/joplin/issues/3153) by 叡山电车)
- Fixed: Prevent drag and dropping of text in editor as it can lead to data loss ([#3302](https://github.com/laurent22/joplin/issues/3302))

## [v1.0.216](https://github.com/laurent22/joplin/releases/tag/v1.0.216) - 2020-05-24T14:21:01Z

This release includes a rewrite of the note editor component in order to allow further improvements (which were no longer possible) and to make it easier to maintain both WYSIWYG editors and regular editor.

A new button "Code View" has been added to switch between the WYSIWYG editor and the Markdown editor.

The note-specific toolbar has also been moved next to the title field for now because it wasn't practical to leave it with the editor-specific toolbar (and also not logical). It might be tweaked or moved later on once we have a clearer idea of what we want to do.

Finally, the tag bar has been moved to the top of the note editor pane. Again this was in part necessary after the refactoring, but also more logical since the tags are relevant to the note, but not to the note content. So it makes more sense to have the editor toolbar right next to the editor content, without the tag bar in between, as before.

- New: Add + to access 'Zoom In', allows to use the numpad ([#2630](https://github.com/laurent22/joplin/issues/2630) by Helmut K. C. Tessarek)
- New: Add option to "Reveal file in folder" when right-clicking on image
- New: Added support for basic search
- New: WYSIWYG: Added localisation support
- New: WYSIWYG: Added support for scroll restore
- New: Added more info on how to switch to Markdown editor
- New: Add support for system theme auto-switching ([#2665](https://github.com/laurent22/joplin/issues/2665))
- Security: Filter SVG element event attributes to prevent XSS vulnerability ([#3143](https://github.com/laurent22/joplin/issues/3143))
- Improved: Made sidebar chevrons consistent
- Improved: Add note history (back/forward buttons) ([#2819](https://github.com/laurent22/joplin/issues/2819)) ([#2409](https://github.com/laurent22/joplin/issues/2409) by Naveen M V)
- Improved: Moved note-related toolbar button next to tag bar
- Improved: Switch to Font Awesome as icon library ([#3137](https://github.com/laurent22/joplin/issues/3137))
- Improved: Upgraded to Electron 8.2.5
- Improved: WYSIWYG: Allow pasting images in editor
- Improved: Handle compositionend event in TinyMCE ([#3164](https://github.com/laurent22/joplin/issues/3164) by Shotaro Yamada)
- Improved: Improve automatic title generation ([#2955](https://github.com/laurent22/joplin/issues/2955)) ([#2915](https://github.com/laurent22/joplin/issues/2915) by anirudh murali)
- Improved: Remove colour gradient from sidebar and replaced expand icons with chrevrons
- Improved: Started resource fetcher service when a note has been decrypted
- Improved: Support Windows tiles ([#3063](https://github.com/laurent22/joplin/issues/3063) by Giacomo Rossetto)
- Improved: WYSIWYG: Enable context menu on resources, links and text
- Improved: WYSIWYG: Handle "Paste as text" when pressing Ctrl+Shift+V
- Improved: WYSIWYG: Handle drag and drop of notes and files
- Improved: Themes switched for more appealing text highlighting ([#3192](https://github.com/laurent22/joplin/issues/3192)) ([#2883](https://github.com/laurent22/joplin/issues/2883) by [@infinity052](https://github.com/infinity052))
- Fixed: Fix undo issue when loading new note
- Fixed: Fixed inserting templates into existing notes ([#3259](https://github.com/laurent22/joplin/issues/3259))
- Fixed: Fixed issue with the editor showing previous note when it should show nothing
- Fixed: Fixed two way scrolling issue in Markdown editor
- Fixed: Fixed infinite rendering loop, which would cause the app to crash (white window) ([#3200](https://github.com/laurent22/joplin/issues/3200))
- Fixed: Markdown editor would not scroll in sync with viewer in some cases ([#3228](https://github.com/laurent22/joplin/issues/3228))
- Fixed: Sync would fail in some cases due to a database error ([#3234](https://github.com/laurent22/joplin/issues/3234))
- Fixed: Better handling of missing table field bug on Linux ([#3088](https://github.com/laurent22/joplin/issues/3088))
- Fixed: Disable or enable menu items depending on the current view ([#2467](https://github.com/laurent22/joplin/issues/2467))
- Fixed: Fix focus after exiting GotoAnything ([#3075](https://github.com/laurent22/joplin/issues/3075)) ([#3066](https://github.com/laurent22/joplin/issues/3066) by Mohammed Rabeeh)
- Fixed: Fix format of geolocation data ([#2673](https://github.com/laurent22/joplin/issues/2673) by [@mic704b](https://github.com/mic704b))
- Fixed: Fix issue where last used filename was displayed when exporting directory
- Fixed: Fixed KaTeX font issue in exported PDF and HTML ([#3089](https://github.com/laurent22/joplin/issues/3089) by [@kowalskidev](https://github.com/kowalskidev))
- Fixed: Fixed background color on large Mermaid graphs ([#3111](https://github.com/laurent22/joplin/issues/3111)) ([#3109](https://github.com/laurent22/joplin/issues/3109) by Rahul Mohata)
- Fixed: Fixed note toolbar layout
- Fixed: Fixed order of notebooks in "Move to notebook" dialog ([#3084](https://github.com/laurent22/joplin/issues/3084)) ([#3052](https://github.com/laurent22/joplin/issues/3052) by Siddhant Sehgal)
- Fixed: Fixed regression with Ace Editor (switching layout had bugs)
- Fixed: Fixed regression with Ace Editor list indentation, and cleaned up code
- Fixed: Fixed regression with local search (could not be closed anymore)
- Fixed: Fixed the Goto Anything item list overflow ([#3096](https://github.com/laurent22/joplin/issues/3096)) ([#3095](https://github.com/laurent22/joplin/issues/3095) by Rahul Mohata)
- Fixed: Fixed various bugs and regressions following note editor refactoring
- Fixed: Long URIs break Note Info dialog ([#3136](https://github.com/laurent22/joplin/issues/3136)) ([#3131](https://github.com/laurent22/joplin/issues/3131) by Mohammed Rabeeh)
- Fixed: Prevent Goto Anything from freezing when inputting special characters ([#3093](https://github.com/laurent22/joplin/issues/3093))
- Fixed: WYSIWYG: Fix CODE element style
- Fixed: WYSIWYG: Fixed clicking a link within a checkbox label
- Fixed: WYSIWYG: Fixed undo issue when pasting text
- Fixed: Fix notebook associated with note  when doing search, and expand correct notebook ([#3219](https://github.com/laurent22/joplin/issues/3219))
- Fixed: Make sidebar resizable when note list is not displayed ([#2895](https://github.com/laurent22/joplin/issues/2895)) ([#2865](https://github.com/laurent22/joplin/issues/2865) by anirudh murali)
- Fixed: WYSIWYG: Fixed UI translation issue for certain languages
- Fixed: Word/character counter includes Markdown syntax and HTML tags ([#3037](https://github.com/laurent22/joplin/issues/3037)) ([#3009](https://github.com/laurent22/joplin/issues/3009) by [@RedDocMD](https://github.com/RedDocMD))

## [v1.0.214](https://github.com/laurent22/joplin/releases/tag/v1.0.214) - 2020-05-21T17:15:15Z

This release includes a rewrite of the note editor component in order to allow further improvements (which were no longer possible) and to make it easier to maintain both WYSIWYG editors and regular editor.

A new button "Code View" has been added to switch between the WYSIWYG editor and the Markdown editor.

The note-specific toolbar has also been moved next to the title field for now because it wasn't practical to leave it with the editor-specific toolbar (and also not logical). It might be tweaked or moved later on once we have a clearer idea of what we want to do.

Finally, the tag bar has been moved to the top of the note editor pane. Again this was in part necessary after the refactoring, but also more logical since the tags are relevant to the note, but not to the note content. So it makes more sense to have the editor toolbar right next to the editor content, without the tag bar in between, as before.

- New: Add + to access 'Zoom In', allows to use the numpad ([#2630](https://github.com/laurent22/joplin/issues/2630) by Helmut K. C. Tessarek)
- New: Add option to "Reveal file in folder" when right-clicking on image
- New: Added support for basic search
- New: WYSIWYG: Added localisation support
- New: WYSIWYG: Added support for scroll restore
- New: Added more info on how to switch to Markdown editor
- New: Add support for system theme auto-switching ([#2665](https://github.com/laurent22/joplin/issues/2665))
- Security: Filter SVG element event attributes to prevent XSS vulnerability ([#3143](https://github.com/laurent22/joplin/issues/3143))
- Improved: Made sidebar chevrons consistent
- Improved: Add note history (back/forward buttons) ([#2819](https://github.com/laurent22/joplin/issues/2819)) ([#2409](https://github.com/laurent22/joplin/issues/2409) by Naveen M V)
- Improved: Moved note-related toolbar button next to tag bar
- Improved: Switch to Font Awesome as icon library ([#3137](https://github.com/laurent22/joplin/issues/3137))
- Improved: Upgraded to Electron 8.2.5
- Improved: WYSIWYG: Allow pasting images in editor
- Improved: Handle compositionend event in TinyMCE ([#3164](https://github.com/laurent22/joplin/issues/3164) by Shotaro Yamada)
- Improved: Improve automatic title generation ([#2955](https://github.com/laurent22/joplin/issues/2955)) ([#2915](https://github.com/laurent22/joplin/issues/2915) by anirudh murali)
- Improved: Remove colour gradient from sidebar and replaced expand icons with chrevrons
- Improved: Started resource fetcher service when a note has been decrypted
- Improved: Support Windows tiles ([#3063](https://github.com/laurent22/joplin/issues/3063) by Giacomo Rossetto)
- Improved: WYSIWYG: Enable context menu on resources, links and text
- Improved: WYSIWYG: Handle "Paste as text" when pressing Ctrl+Shift+V
- Improved: WYSIWYG: Handle drag and drop of notes and files
- Improved: Themes switched for more appealing text highlighting ([#3192](https://github.com/laurent22/joplin/issues/3192)) ([#2883](https://github.com/laurent22/joplin/issues/2883) by [@infinity052](https://github.com/infinity052))
- Fixed: Fixed issue with the editor showing previous note when it should show nothing
- Fixed: Fixed two way scrolling issue in Markdown editor
- Fixed: Fixed infinite rendering loop, which would cause the app to crash (white window) ([#3200](https://github.com/laurent22/joplin/issues/3200))
- Fixed: Markdown editor would not scroll in sync with viewer in some cases ([#3228](https://github.com/laurent22/joplin/issues/3228))
- Fixed: Sync would fail in some cases due to a database error ([#3234](https://github.com/laurent22/joplin/issues/3234))
- Fixed: Better handling of missing table field bug on Linux ([#3088](https://github.com/laurent22/joplin/issues/3088))
- Fixed: Disable or enable menu items depending on the current view ([#2467](https://github.com/laurent22/joplin/issues/2467))
- Fixed: Fix focus after exiting GotoAnything ([#3075](https://github.com/laurent22/joplin/issues/3075)) ([#3066](https://github.com/laurent22/joplin/issues/3066) by Mohammed Rabeeh)
- Fixed: Fix format of geolocation data ([#2673](https://github.com/laurent22/joplin/issues/2673) by [@mic704b](https://github.com/mic704b))
- Fixed: Fix issue where last used filename was displayed when exporting directory
- Fixed: Fixed KaTeX font issue in exported PDF and HTML ([#3089](https://github.com/laurent22/joplin/issues/3089) by [@kowalskidev](https://github.com/kowalskidev))
- Fixed: Fixed background color on large Mermaid graphs ([#3111](https://github.com/laurent22/joplin/issues/3111)) ([#3109](https://github.com/laurent22/joplin/issues/3109) by Rahul Mohata)
- Fixed: Fixed note toolbar layout
- Fixed: Fixed order of notebooks in "Move to notebook" dialog ([#3084](https://github.com/laurent22/joplin/issues/3084)) ([#3052](https://github.com/laurent22/joplin/issues/3052) by Siddhant Sehgal)
- Fixed: Fixed regression with Ace Editor (switching layout had bugs)
- Fixed: Fixed regression with Ace Editor list indentation, and cleaned up code
- Fixed: Fixed regression with local search (could not be closed anymore)
- Fixed: Fixed the Goto Anything item list overflow ([#3096](https://github.com/laurent22/joplin/issues/3096)) ([#3095](https://github.com/laurent22/joplin/issues/3095) by Rahul Mohata)
- Fixed: Fixed various bugs and regressions following note editor refactoring
- Fixed: Long URIs break Note Info dialog ([#3136](https://github.com/laurent22/joplin/issues/3136)) ([#3131](https://github.com/laurent22/joplin/issues/3131) by Mohammed Rabeeh)
- Fixed: Prevent Goto Anything from freezing when inputting special characters ([#3093](https://github.com/laurent22/joplin/issues/3093))
- Fixed: WYSIWYG: Fix CODE element style
- Fixed: WYSIWYG: Fixed clicking a link within a checkbox label
- Fixed: WYSIWYG: Fixed undo issue when pasting text
- Fixed: Fix notebook associated with note  when doing search, and expand correct notebook ([#3219](https://github.com/laurent22/joplin/issues/3219))
- Fixed: Make sidebar resizable when note list is not displayed ([#2895](https://github.com/laurent22/joplin/issues/2895)) ([#2865](https://github.com/laurent22/joplin/issues/2865) by anirudh murali)
- Fixed: WYSIWYG: Fixed UI translation issue for certain languages
- Fixed: Word/character counter includes Markdown syntax and HTML tags ([#3037](https://github.com/laurent22/joplin/issues/3037)) ([#3009](https://github.com/laurent22/joplin/issues/3009) by [@RedDocMD](https://github.com/RedDocMD))

## [v1.0.212](https://github.com/laurent22/joplin/releases/tag/v1.0.212) - 2020-05-21T07:48:39Z

This release includes a rewrite of the note editor component in order to allow further improvements (which were no longer possible) and to make it easier to maintain both WYSIWYG editors and regular editor.

A new button "Code View" has been added to switch between the WYSIWYG editor and the Markdown editor.

The note-specific toolbar has also been moved next to the title field for now because it wasn't practical to leave it with the editor-specific toolbar (and also not logical). It might be tweaked or moved later on once we have a clearer idea of what we want to do.

Finally, the tag bar has been moved to the top of the note editor pane. Again this was in part necessary after the refactoring, but also more logical since the tags are relevant to the note, but not to the note content. So it makes more sense to have the editor toolbar right next to the editor content, without the tag bar in between, as before.

- New: Add + to access 'Zoom In', allows to use the numpad ([#2630](https://github.com/laurent22/joplin/issues/2630) by Helmut K. C. Tessarek)
- New: Add option to "Reveal file in folder" when right-clicking on image
- New: Added support for basic search
- New: WYSIWYG: Added localisation support
- New: WYSIWYG: Added support for scroll restore
- New: Added more info on how to switch to Markdown editor
- Security: Filter SVG element event attributes to prevent XSS vulnerability ([#3143](https://github.com/laurent22/joplin/issues/3143))
- Improved: Made sidebar chevrons consistent
- Improved: Add note history (back/forward buttons) ([#2819](https://github.com/laurent22/joplin/issues/2819)) ([#2409](https://github.com/laurent22/joplin/issues/2409) by Naveen M V)
- Improved: Moved note-related toolbar button next to tag bar
- Improved: Switch to Font Awesome as icon library ([#3137](https://github.com/laurent22/joplin/issues/3137))
- Improved: Upgraded to Electron 8.2.5
- Improved: WYSIWYG: Allow pasting images in editor
- Improved: Handle compositionend event in TinyMCE ([#3164](https://github.com/laurent22/joplin/issues/3164) by Shotaro Yamada)
- Improved: Improve automatic title generation ([#2955](https://github.com/laurent22/joplin/issues/2955)) ([#2915](https://github.com/laurent22/joplin/issues/2915) by anirudh murali)
- Improved: Remove colour gradient from sidebar and replaced expand icons with chrevrons
- Improved: Started resource fetcher service when a note has been decrypted
- Improved: Support Windows tiles ([#3063](https://github.com/laurent22/joplin/issues/3063) by Giacomo Rossetto)
- Improved: WYSIWYG: Enable context menu on resources, links and text
- Improved: WYSIWYG: Handle "Paste as text" when pressing Ctrl+Shift+V
- Improved: WYSIWYG: Handle drag and drop of notes and files
- Improved: Themes switched for more appealing text highlighting ([#3192](https://github.com/laurent22/joplin/issues/3192)) ([#2883](https://github.com/laurent22/joplin/issues/2883) by [@infinity052](https://github.com/infinity052))
- Fixed: Fixed issue with the editor showing previous note when it should show nothing
- Fixed: Fixed two way scrolling issue in Markdown editor
- Fixed: Fixed infinite rendering loop, which would cause the app to crash (white window) ([#3200](https://github.com/laurent22/joplin/issues/3200))
- Fixed: Markdown editor would not scroll in sync with viewer in some cases ([#3228](https://github.com/laurent22/joplin/issues/3228))
- Fixed: Sync would fail in some cases due to a database error ([#3234](https://github.com/laurent22/joplin/issues/3234))
- Fixed: Better handling of missing table field bug on Linux ([#3088](https://github.com/laurent22/joplin/issues/3088))
- Fixed: Disable or enable menu items depending on the current view ([#2467](https://github.com/laurent22/joplin/issues/2467))
- Fixed: Fix focus after exiting GotoAnything ([#3075](https://github.com/laurent22/joplin/issues/3075)) ([#3066](https://github.com/laurent22/joplin/issues/3066) by Mohammed Rabeeh)
- Fixed: Fix format of geolocation data ([#2673](https://github.com/laurent22/joplin/issues/2673) by [@mic704b](https://github.com/mic704b))
- Fixed: Fix issue where last used filename was displayed when exporting directory
- Fixed: Fixed KaTeX font issue in exported PDF and HTML ([#3089](https://github.com/laurent22/joplin/issues/3089) by [@kowalskidev](https://github.com/kowalskidev))
- Fixed: Fixed background color on large Mermaid graphs ([#3111](https://github.com/laurent22/joplin/issues/3111)) ([#3109](https://github.com/laurent22/joplin/issues/3109) by Rahul Mohata)
- Fixed: Fixed note toolbar layout
- Fixed: Fixed order of notebooks in "Move to notebook" dialog ([#3084](https://github.com/laurent22/joplin/issues/3084)) ([#3052](https://github.com/laurent22/joplin/issues/3052) by Siddhant Sehgal)
- Fixed: Fixed regression with Ace Editor (switching layout had bugs)
- Fixed: Fixed regression with Ace Editor list indentation, and cleaned up code
- Fixed: Fixed regression with local search (could not be closed anymore)
- Fixed: Fixed the Goto Anything item list overflow ([#3096](https://github.com/laurent22/joplin/issues/3096)) ([#3095](https://github.com/laurent22/joplin/issues/3095) by Rahul Mohata)
- Fixed: Fixed various bugs and regressions following note editor refactoring
- Fixed: Long URIs break Note Info dialog ([#3136](https://github.com/laurent22/joplin/issues/3136)) ([#3131](https://github.com/laurent22/joplin/issues/3131) by Mohammed Rabeeh)
- Fixed: Prevent Goto Anything from freezing when inputting special characters ([#3093](https://github.com/laurent22/joplin/issues/3093))
- Fixed: WYSIWYG: Fix CODE element style
- Fixed: WYSIWYG: Fixed clicking a link within a checkbox label
- Fixed: WYSIWYG: Fixed undo issue when pasting text
- Fixed: Fix notebook associated with note  when doing search, and expand correct notebook ([#3219](https://github.com/laurent22/joplin/issues/3219))
- Fixed: Make sidebar resizable when note list is not displayed ([#2895](https://github.com/laurent22/joplin/issues/2895)) ([#2865](https://github.com/laurent22/joplin/issues/2865) by anirudh murali)
- Fixed: WYSIWYG: Fixed UI translation issue for certain languages
- Fixed: Word/character counter includes Markdown syntax and HTML tags ([#3037](https://github.com/laurent22/joplin/issues/3037)) ([#3009](https://github.com/laurent22/joplin/issues/3009) by [@RedDocMD](https://github.com/RedDocMD))

## [v1.0.211](https://github.com/laurent22/joplin/releases/tag/v1.0.211) - 2020-05-20T08:59:16Z

This release includes a rewrite of the note editor component in order to allow further improvements (which were no longer possible) and to make it easier to maintain both WYSIWYG editors and regular editor.

A new button "Code View" has been added to switch between the WYSIWYG editor and the Markdown editor.

The note-specific toolbar has also been moved next to the title field for now because it wasn't practical to leave it with the editor-specific toolbar (and also not logical). It might be tweaked or moved later on once we have a clearer idea of what we want to do.

Finally, the tag bar has been moved to the top of the note editor pane. Again this was in part necessary after the refactoring, but also more logical since the tags are relevant to the note, but not to the note content. So it makes more sense to have the editor toolbar right next to the editor content, without the tag bar in between, as before.

- New: Add + to access 'Zoom In', allows to use the numpad ([#2630](https://github.com/laurent22/joplin/issues/2630) by Helmut K. C. Tessarek)
- New: Add option to "Reveal file in folder" when right-clicking on image
- New: Added support for basic search
- New: WYSIWYG: Added localisation support
- New: WYSIWYG: Added support for scroll restore
- New: Added more info on how to switch to Markdown editor
- Security: Filter SVG element event attributes to prevent XSS vulnerability ([#3143](https://github.com/laurent22/joplin/issues/3143))
- Improved: Add note history (back/forward buttons) ([#2819](https://github.com/laurent22/joplin/issues/2819)) ([#2409](https://github.com/laurent22/joplin/issues/2409) by Naveen M V)
- Improved: Moved note-related toolbar button next to tag bar
- Improved: Switch to Font Awesome as icon library ([#3137](https://github.com/laurent22/joplin/issues/3137))
- Improved: Upgraded to Electron 8.2.5
- Improved: WYSIWYG: Allow pasting images in editor
- Improved: Handle compositionend event in TinyMCE ([#3164](https://github.com/laurent22/joplin/issues/3164) by Shotaro Yamada)
- Improved: Improve automatic title generation ([#2955](https://github.com/laurent22/joplin/issues/2955)) ([#2915](https://github.com/laurent22/joplin/issues/2915) by anirudh murali)
- Improved: Remove colour gradient from sidebar and replaced expand icons with chrevrons
- Improved: Started resource fetcher service when a note has been decrypted
- Improved: Support Windows tiles ([#3063](https://github.com/laurent22/joplin/issues/3063) by Giacomo Rossetto)
- Improved: WYSIWYG: Enable context menu on resources, links and text
- Improved: WYSIWYG: Handle "Paste as text" when pressing Ctrl+Shift+V
- Improved: WYSIWYG: Handle drag and drop of notes and files
- Improved: Themes switched for more appealing text highlighting ([#3192](https://github.com/laurent22/joplin/issues/3192)) ([#2883](https://github.com/laurent22/joplin/issues/2883) by [@infinity052](https://github.com/infinity052))
- Fixed: Fixed infinite rendering loop, which would cause the app to crash (white window) ([#3200](https://github.com/laurent22/joplin/issues/3200))
- Fixed: Markdown editor would not scroll in sync with viewer in some cases ([#3228](https://github.com/laurent22/joplin/issues/3228))
- Fixed: Sync would fail in some cases due to a database error ([#3234](https://github.com/laurent22/joplin/issues/3234))
- Fixed: Better handling of missing table field bug on Linux ([#3088](https://github.com/laurent22/joplin/issues/3088))
- Fixed: Disable or enable menu items depending on the current view ([#2467](https://github.com/laurent22/joplin/issues/2467))
- Fixed: Fix focus after exiting GotoAnything ([#3075](https://github.com/laurent22/joplin/issues/3075)) ([#3066](https://github.com/laurent22/joplin/issues/3066) by Mohammed Rabeeh)
- Fixed: Fix format of geolocation data ([#2673](https://github.com/laurent22/joplin/issues/2673) by [@mic704b](https://github.com/mic704b))
- Fixed: Fix issue where last used filename was displayed when exporting directory
- Fixed: Fixed KaTeX font issue in exported PDF and HTML ([#3089](https://github.com/laurent22/joplin/issues/3089) by [@kowalskidev](https://github.com/kowalskidev))
- Fixed: Fixed background color on large Mermaid graphs ([#3111](https://github.com/laurent22/joplin/issues/3111)) ([#3109](https://github.com/laurent22/joplin/issues/3109) by Rahul Mohata)
- Fixed: Fixed note toolbar layout
- Fixed: Fixed order of notebooks in "Move to notebook" dialog ([#3084](https://github.com/laurent22/joplin/issues/3084)) ([#3052](https://github.com/laurent22/joplin/issues/3052) by Siddhant Sehgal)
- Fixed: Fixed regression with Ace Editor (switching layout had bugs)
- Fixed: Fixed regression with Ace Editor list indentation, and cleaned up code
- Fixed: Fixed regression with local search (could not be closed anymore)
- Fixed: Fixed the Goto Anything item list overflow ([#3096](https://github.com/laurent22/joplin/issues/3096)) ([#3095](https://github.com/laurent22/joplin/issues/3095) by Rahul Mohata)
- Fixed: Fixed various bugs and regressions following note editor refactoring
- Fixed: Long URIs break Note Info dialog ([#3136](https://github.com/laurent22/joplin/issues/3136)) ([#3131](https://github.com/laurent22/joplin/issues/3131) by Mohammed Rabeeh)
- Fixed: Prevent Goto Anything from freezing when inputting special characters ([#3093](https://github.com/laurent22/joplin/issues/3093))
- Fixed: WYSIWYG: Fix CODE element style
- Fixed: WYSIWYG: Fixed clicking a link within a checkbox label
- Fixed: WYSIWYG: Fixed undo issue when pasting text
- Fixed: Fix notebook associated with note  when doing search, and expand correct notebook ([#3219](https://github.com/laurent22/joplin/issues/3219))
- Fixed: Make sidebar resizable when note list is not displayed ([#2895](https://github.com/laurent22/joplin/issues/2895)) ([#2865](https://github.com/laurent22/joplin/issues/2865) by anirudh murali)
- Fixed: WYSIWYG: Fixed UI translation issue for certain languages
- Fixed: Word/character counter includes Markdown syntax and HTML tags ([#3037](https://github.com/laurent22/joplin/issues/3037)) ([#3009](https://github.com/laurent22/joplin/issues/3009) by [@RedDocMD](https://github.com/RedDocMD))

## [v1.0.209](https://github.com/laurent22/joplin/releases/tag/v1.0.209) - 2020-05-17T18:32:51Z

This release includes a rewrite of the note editor component in order to allow further improvements (which were no longer possible) and to make it easier to maintain both WYSIWYG editors and regular editor.

A new button "Code View" has been added to switch between the WYSIWYG editor and the Markdown editor.

The note-specific toolbar has also been moved next to the title field for now because it wasn't practical to leave it with the editor-specific toolbar (and also not logical). It might be tweaked or moved later on once we have a clearer idea of what we want to do.

Finally, the tag bar has been moved to the top of the note editor pane. Again this was in part necessary after the refactoring, but also more logical since the tags are relevant to the note, but not to the note content. So it makes more sense to have the editor toolbar right next to the editor content, without the tag bar in between, as before.

- New: Add + to access 'Zoom In', allows to use the numpad ([#2630](https://github.com/laurent22/joplin/issues/2630) by Helmut K. C. Tessarek)
- New: Add option to "Reveal file in folder" when right-clicking on image
- New: Added support for basic search
- New: WYSIWYG: Added localisation support
- New: WYSIWYG: Added support for scroll restore
- New: Added more info on how to switch to Markdown editor
- Security: Filter SVG element event attributes to prevent XSS vulnerability ([#3143](https://github.com/laurent22/joplin/issues/3143))
- Improved: Add note history (back/forward buttons) ([#2819](https://github.com/laurent22/joplin/issues/2819)) ([#2409](https://github.com/laurent22/joplin/issues/2409) by Naveen M V)
- Improved: Moved note-related toolbar button next to tag bar
- Improved: Switch to Font Awesome as icon library ([#3137](https://github.com/laurent22/joplin/issues/3137))
- Improved: Upgraded to Electron 8.2.5
- Improved: WYSIWYG: Allow pasting images in editor
- Improved: Handle compositionend event in TinyMCE ([#3164](https://github.com/laurent22/joplin/issues/3164) by Shotaro Yamada)
- Improved: Improve automatic title generation ([#2955](https://github.com/laurent22/joplin/issues/2955)) ([#2915](https://github.com/laurent22/joplin/issues/2915) by anirudh murali)
- Improved: Remove colour gradient from sidebar and replaced expand icons with chrevrons
- Improved: Started resource fetcher service when a note has been decrypted
- Improved: Support Windows tiles ([#3063](https://github.com/laurent22/joplin/issues/3063) by Giacomo Rossetto)
- Improved: WYSIWYG: Enable context menu on resources, links and text
- Improved: WYSIWYG: Handle "Paste as text" when pressing Ctrl+Shift+V
- Improved: WYSIWYG: Handle drag and drop of notes and files
- Fixed: Better handling of missing table field bug on Linux ([#3088](https://github.com/laurent22/joplin/issues/3088))
- Fixed: Disable or enable menu items depending on the current view ([#2467](https://github.com/laurent22/joplin/issues/2467))
- Fixed: Fix focus after exiting GotoAnything ([#3075](https://github.com/laurent22/joplin/issues/3075)) ([#3066](https://github.com/laurent22/joplin/issues/3066) by Mohammed Rabeeh)
- Fixed: Fix format of geolocation data ([#2673](https://github.com/laurent22/joplin/issues/2673) by [@mic704b](https://github.com/mic704b))
- Fixed: Fix issue where last used filename was displayed when exporting directory
- Fixed: Fixed KaTeX font issue in exported PDF and HTML ([#3089](https://github.com/laurent22/joplin/issues/3089) by [@kowalskidev](https://github.com/kowalskidev))
- Fixed: Fixed background color on large Mermaid graphs ([#3111](https://github.com/laurent22/joplin/issues/3111)) ([#3109](https://github.com/laurent22/joplin/issues/3109) by Rahul Mohata)
- Fixed: Fixed note toolbar layout
- Fixed: Fixed order of notebooks in "Move to notebook" dialog ([#3084](https://github.com/laurent22/joplin/issues/3084)) ([#3052](https://github.com/laurent22/joplin/issues/3052) by Siddhant Sehgal)
- Fixed: Fixed regression with Ace Editor (switching layout had bugs)
- Fixed: Fixed regression with Ace Editor list indentation, and cleaned up code
- Fixed: Fixed regression with local search (could not be closed anymore)
- Fixed: Fixed the Goto Anything item list overflow ([#3096](https://github.com/laurent22/joplin/issues/3096)) ([#3095](https://github.com/laurent22/joplin/issues/3095) by Rahul Mohata)
- Fixed: Fixed various bugs and regressions following note editor refactoring
- Fixed: Long URIs break Note Info dialog ([#3136](https://github.com/laurent22/joplin/issues/3136)) ([#3131](https://github.com/laurent22/joplin/issues/3131) by Mohammed Rabeeh)
- Fixed: Prevent Goto Anything from freezing when inputting special characters ([#3093](https://github.com/laurent22/joplin/issues/3093))
- Fixed: WYSIWYG: Fix CODE element style
- Fixed: WYSIWYG: Fixed clicking a link within a checkbox label
- Fixed: WYSIWYG: Fixed undo issue when pasting text
- Fixed: Fix notebook associated with note  when doing search, and expand correct notebook ([#3219](https://github.com/laurent22/joplin/issues/3219))
- Fixed: Make sidebar resizable when note list is not displayed ([#2895](https://github.com/laurent22/joplin/issues/2895)) ([#2865](https://github.com/laurent22/joplin/issues/2865) by anirudh murali)
- Fixed: WYSIWYG: Fixed UI translation issue for certain languages
- Fixed: Word/character counter includes Markdown syntax and HTML tags ([#3037](https://github.com/laurent22/joplin/issues/3037)) ([#3009](https://github.com/laurent22/joplin/issues/3009) by [@RedDocMD](https://github.com/RedDocMD))

## [v1.0.207](https://github.com/laurent22/joplin/releases/tag/v1.0.207) - 2020-05-10T16:37:35Z

This release includes a rewrite of the note editor component in order to allow further improvements (which were no longer possible) and to make it easier to maintain both WYSIWYG editors and regular editor.

A new button "Code View" has been added to switch between the WYSIWYG editor and the Markdown editor.

The note-specific toolbar has also been moved next to the title field for now because it wasn't practical to leave it with the editor-specific toolbar (and also not logical). It might be tweaked or moved later on once we have a clearer idea of what we want to do.

Finally, the tag bar has been moved to the top of the note editor pane. Again this was in part necessary after the refactoring, but also more logical since the tags are relevant to the note, but not to the note content. So it makes more sense to have the editor toolbar right next to the editor content, without the tag bar in between, as before.

- New: Add + to access 'Zoom In', allows to use the numpad ([#2630](https://github.com/laurent22/joplin/issues/2630) by Helmut K. C. Tessarek)
- New: Add option to "Reveal file in folder" when right-clicking on image
- New: Added support for basic search
- New: WYSIWYG: Added localisation support
- New: WYSIWYG: Added support for scroll restore
- Improved: Handle compositionend event in TinyMCE ([#3164](https://github.com/laurent22/joplin/issues/3164) by Shotaro Yamada)
- Improved: Improve automatic title generation ([#2955](https://github.com/laurent22/joplin/issues/2955)) ([#2915](https://github.com/laurent22/joplin/issues/2915) by anirudh murali)
- Improved: Remove colour gradient from sidebar and replaced expand icons with chrevrons
- Improved: Started resource fetcher service when a note has been decrypted
- Improved: Support Windows tiles ([#3063](https://github.com/laurent22/joplin/issues/3063) by Giacomo Rossetto)
- Improved: WYSIWYG: Enable context menu on resources, links and text
- Improved: WYSIWYG: Handle "Paste as text" when pressing Ctrl+Shift+V
- Improved: WYSIWYG: Handle drag and drop of notes and files
- Fixed: Better handling of missing table field bug on Linux ([#3088](https://github.com/laurent22/joplin/issues/3088))
- Fixed: Disable or enable menu items depending on the current view ([#2467](https://github.com/laurent22/joplin/issues/2467))
- Fixed: Fix focus after exiting GotoAnything ([#3075](https://github.com/laurent22/joplin/issues/3075)) ([#3066](https://github.com/laurent22/joplin/issues/3066) by Mohammed Rabeeh)
- Fixed: Fix format of geolocation data ([#2673](https://github.com/laurent22/joplin/issues/2673) by [@mic704b](https://github.com/mic704b))
- Fixed: Fix issue where last used filename was displayed when exporting directory
- Fixed: Fixed KaTeX font issue in exported PDF and HTML ([#3089](https://github.com/laurent22/joplin/issues/3089) by [@kowalskidev](https://github.com/kowalskidev))
- Fixed: Fixed background color on large Mermaid graphs ([#3111](https://github.com/laurent22/joplin/issues/3111)) ([#3109](https://github.com/laurent22/joplin/issues/3109) by Rahul Mohata)
- Fixed: Fixed note toolbar layout
- Fixed: Fixed order of notebooks in "Move to notebook" dialog ([#3084](https://github.com/laurent22/joplin/issues/3084)) ([#3052](https://github.com/laurent22/joplin/issues/3052) by Siddhant Sehgal)
- Fixed: Fixed regression with Ace Editor (switching layout had bugs)
- Fixed: Fixed regression with Ace Editor list indentation, and cleaned up code
- Fixed: Fixed regression with local search (could not be closed anymore)
- Fixed: Fixed the Goto Anything item list overflow ([#3096](https://github.com/laurent22/joplin/issues/3096)) ([#3095](https://github.com/laurent22/joplin/issues/3095) by Rahul Mohata)
- Fixed: Fixed various bugs and regressions following note editor refactoring
- Fixed: Long URIs break Note Info dialog ([#3136](https://github.com/laurent22/joplin/issues/3136)) ([#3131](https://github.com/laurent22/joplin/issues/3131) by Mohammed Rabeeh)
- Fixed: Prevent Goto Anything from freezing when inputting special characters ([#3093](https://github.com/laurent22/joplin/issues/3093))
- Fixed: WYSIWYG: Fix CODE element style
- Fixed: WYSIWYG: Fixed clicking a link within a checkbox label
- Fixed: WYSIWYG: Fixed undo issue when pasting text
- Security: Filter SVG element event attributes to prevent XSS vulnerability ([#3143](https://github.com/laurent22/joplin/issues/3143))

## [v1.0.201](https://github.com/laurent22/joplin/releases/tag/v1.0.201) - 2020-04-15T22:55:13Z

- Improved: Search in title and body by default when using Goto Anything
- Improved: Disable prompt dialog OK button when input is empty ([#2905](https://github.com/laurent22/joplin/issues/2905)) ([#2799](https://github.com/laurent22/joplin/issues/2799) by Siddhant Sehgal)
- Improved: Disable BASE html tag, which can break certain plugins such as Katex
- Fixed: In some cases, notes with Katex code were not exported correctly as PDF ([#3058](https://github.com/laurent22/joplin/issues/3058))
- Fixed: Trying to fix resource path issue in WYSIWYG editor ([#2968](https://github.com/laurent22/joplin/issues/2968))
- Fixed: Fixed Katex rendering issue when greater than symbol appears in markup ([#3033](https://github.com/laurent22/joplin/issues/3033))

## [v1.0.200](https://github.com/laurent22/joplin/releases/tag/v1.0.200) - 2020-04-12T12:17:46Z

This is to fix a few regressions in previous release.

- New: Add more log statements to attempt to fix [#2968](https://github.com/laurent22/joplin/issues/2968)
- Improved: Update zh_TW.po ([#3020](https://github.com/laurent22/joplin/issues/3020) by Ethan Chen)
- Improved: Update sv.po ([#3013](https://github.com/laurent22/joplin/issues/3013) by [@abolishallprivateproperty](https://github.com/abolishallprivateproperty))
- Fixed: Fix Go To Anything closing when clicking inside the modal ([#3029](https://github.com/laurent22/joplin/issues/3029)) ([#3028](https://github.com/laurent22/joplin/issues/3028) by Anjula Karunarathne)
- Fixed: Fix JEX export ([#3026](https://github.com/laurent22/joplin/issues/3026) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fixes todo mouse hover behaviour ([#2831](https://github.com/laurent22/joplin/issues/2831)) ([#2830](https://github.com/laurent22/joplin/issues/2830) by Siddhant Sehgal)
- Fixed: Fixes selection in text editor after applying formatting ([#2737](https://github.com/laurent22/joplin/issues/2737)) ([#2736](https://github.com/laurent22/joplin/issues/2736) by [@Rishgod](https://github.com/Rishgod))
- Fixed: Title auto-update didn't work anymore ([#3019](https://github.com/laurent22/joplin/issues/3019))

## [v1.0.199](https://github.com/laurent22/joplin/releases/tag/v1.0.199) - 2020-04-10T18:41:58Z

- New: Added new Aritim-Dark theme ([#2997](https://github.com/laurent22/joplin/issues/2997) by [@TobiasDev](https://github.com/TobiasDev))
- New: WYSIWYG: Added support for code blocks edition and creation
- New: WYSIWYG: Added support for tables
- New: WYSIWYG: Apply theme to toolbar
- New: WYSIWYG: Better handling of links on macOS and inside Katex block
- New: WYSIWYG: Do not display target list in link dialog
- New: WYSIWYG: Handle internal note links
- New: WYSIWYG: Handle resource download mode
- New: WYSIWYG: Improved documentation on what plugins are compatible with WYSIWYG editor
- New: WYSIWYG: Preserve HTML code in Markdown when editing from wysiwyg editor
- New: Add "Retry All" option to synchronisation page ([#2688](https://github.com/laurent22/joplin/issues/2688))
- New: Add friendly default filenames to export options ([#2749](https://github.com/laurent22/joplin/issues/2749) by [@CalebJohn](https://github.com/CalebJohn))
- New: Add message box to ask confirmation when resizing image
- Improved: Clear provisional flag as soon as note is modified to avoid data loss ([#2681](https://github.com/laurent22/joplin/issues/2681))
- Improved: Close `Goto Anything` modal on outside click ([#2940](https://github.com/laurent22/joplin/issues/2940) by Siddhant Sehgal)
- Improved: Moved all themes out into their own .js theme files ([#2951](https://github.com/laurent22/joplin/issues/2951) by [@TobiasDev](https://github.com/TobiasDev))
- Improved: Resource screen improvements ([#2850](https://github.com/laurent22/joplin/issues/2850)) ([#2639](https://github.com/laurent22/joplin/issues/2639))
- Improved: Right-click to move note to notebook ([#2566](https://github.com/laurent22/joplin/issues/2566)) ([#2296](https://github.com/laurent22/joplin/issues/2296) by Siddhant Sehgal)
- Improved: Update it_IT.po ([#2978](https://github.com/laurent22/joplin/issues/2978) by [@abonte](https://github.com/abonte))
- Improved: Update ko.po ([#2986](https://github.com/laurent22/joplin/issues/2986) by [@xmlangel](https://github.com/xmlangel))
- Improved: Update nb_NO.po ([#2973](https://github.com/laurent22/joplin/issues/2973) by Mats Estensen)
- Improved: Update zh_CN.po ([#2971](https://github.com/laurent22/joplin/issues/2971) by [@troilus](https://github.com/troilus))
- Improved: Wait for note to be saved before closing the app
- Fixed: Fixed iOS and macOS icons and created script to automate icon creation ([#2604](https://github.com/laurent22/joplin/issues/2604))
- Fixed: Fixed regression when drag and dropping files
- Fixed: Fixed styling issues with rendered Markdown
- Fixed: Prevent decryption loop when a resource cannot be decrypted ([#2257](https://github.com/laurent22/joplin/issues/2257))
- Fixed: When modifying a conflicted note, it would disappear from the view ([#2709](https://github.com/laurent22/joplin/issues/2709))

## [v1.0.197](https://github.com/laurent22/joplin/releases/tag/v1.0.197) - 2020-03-30T17:21:22Z

- New: Added support for checkboxes and fixed various issues with WYSIWYG editor
- New: Added Vietnamese translation
- Improved: Go To Anything by body ([#2686](https://github.com/laurent22/joplin/issues/2686)) ([#2683](https://github.com/laurent22/joplin/issues/2683) by Anjula Karunarathne)
- Improved: Cleaning up the install / update script ([#2719](https://github.com/laurent22/joplin/issues/2719) by Brandon Wulf)
- Fixed: MD importer handle special chars in linked image name ([#2346](https://github.com/laurent22/joplin/issues/2346)) ([#2334](https://github.com/laurent22/joplin/issues/2334) by [@bart](https://github.com/bart))
- Fixed: Prevent title overflow on small windows ([#2918](https://github.com/laurent22/joplin/issues/2918)) ([#2917](https://github.com/laurent22/joplin/issues/2917) by anirudh murali)
- Fixed: Fixed top margin of toolbar ([#2828](https://github.com/laurent22/joplin/issues/2828)) ([#2824](https://github.com/laurent22/joplin/issues/2824) by Siddhant Sehgal)

## [v1.0.195](https://github.com/laurent22/joplin/releases/tag/v1.0.195) - 2020-03-22T19:56:12Z

- New: Added experimental WYSIWYG editor ([#2556](https://github.com/laurent22/joplin/issues/2556)) ([#176](https://github.com/laurent22/joplin/issues/176))
- New: Added way to upgrade master key encryption and sync target encryption
- New: Add button to About box to copy Joplin's information to the clipboard ([#2711](https://github.com/laurent22/joplin/issues/2711) by Helmut K. C. Tessarek)
- New: Api: Add support for "tags" property for note PUT request ([#2649](https://github.com/laurent22/joplin/issues/2649)) ([#941](https://github.com/laurent22/joplin/issues/941) by [@jyuvaraj03](https://github.com/jyuvaraj03))
- New: Add global shortcut to show/hide Joplin ([#2653](https://github.com/laurent22/joplin/issues/2653) by Helmut K. C. Tessarek)
- Improved: Fast notebook deletion ([#2730](https://github.com/laurent22/joplin/issues/2730)) ([#2703](https://github.com/laurent22/joplin/issues/2703) by [@RedDocMD](https://github.com/RedDocMD))
- Improved: Enhance notelist focus behaviour ([#2520](https://github.com/laurent22/joplin/issues/2520) by [@mic704b](https://github.com/mic704b))
- Improved: Indent lists by pressing tab when caret is after bullet ([#2713](https://github.com/laurent22/joplin/issues/2713)) ([#498](https://github.com/laurent22/joplin/issues/498) by Shotaro Yamada)
- Fixed: Expand notebook tree when clicking on notebook in search results ([#2620](https://github.com/laurent22/joplin/issues/2620)) ([#2616](https://github.com/laurent22/joplin/issues/2616) by Mohammed Rabeeh)
- Fixed: Remember last selected note ([#2809](https://github.com/laurent22/joplin/issues/2809)) ([#2803](https://github.com/laurent22/joplin/issues/2803) by Naveen M V)
- Fixed: Fix menu bar shortcut (Alt+E) while editing a note (Win) ([#2776](https://github.com/laurent22/joplin/issues/2776) by [@nullpointer666](https://github.com/nullpointer666))
- Fixed: Fix integration test harness issues. ([#2723](https://github.com/laurent22/joplin/issues/2723) by [@mic704b](https://github.com/mic704b))
- Fixed: Fix calls to non-existent function ([#2675](https://github.com/laurent22/joplin/issues/2675) by [@mic704b](https://github.com/mic704b))
- Fixed: Fix format of note timestamps ([#2672](https://github.com/laurent22/joplin/issues/2672) by [@mic704b](https://github.com/mic704b))
- Fixed: Fix show-all-notes update bugs. ([#2642](https://github.com/laurent22/joplin/issues/2642) by [@mic704b](https://github.com/mic704b))
- Fixed: Fix issue with tag not being displayed below note when it is created
- Fixed: Fix button label wrapping in toolbar ([#2708](https://github.com/laurent22/joplin/issues/2708)) ([#2700](https://github.com/laurent22/joplin/issues/2700) by Anjula Karunarathne)
- Fixed: Fixed renaming tag issue ([#2618](https://github.com/laurent22/joplin/issues/2618))

## [v1.0.194](https://github.com/laurent22/joplin/releases/tag/v1.0.194) - 2020-03-14T00:00:32Z

The main purpose of this pre-release is to allow evaluating the WYSIWYG editor.

- New: Added experimental WYSIWYG editor ([#2556](https://github.com/laurent22/joplin/issues/2556)) ([#176](https://github.com/laurent22/joplin/issues/176))
- New: Added way to upgrade master key encryption and sync target encryption
- New: Add button to About box to copy Joplin's information to the clipboard ([#2711](https://github.com/laurent22/joplin/issues/2711) by Helmut K. C. Tessarek)
- New: Api: Add support for "tags" property for note PUT request ([#2649](https://github.com/laurent22/joplin/issues/2649)) ([#941](https://github.com/laurent22/joplin/issues/941) by [@jyuvaraj03](https://github.com/jyuvaraj03))
- Improved: Enhance notelist focus behaviour ([#2520](https://github.com/laurent22/joplin/issues/2520) by [@mic704b](https://github.com/mic704b))
- Improved: Indent lists by pressing tab when caret is after bullet ([#2713](https://github.com/laurent22/joplin/issues/2713)) ([#498](https://github.com/laurent22/joplin/issues/498) by Shotaro Yamada)
- Fixed: Expand notebook tree when clicking on notebook in search results ([#2620](https://github.com/laurent22/joplin/issues/2620)) ([#2616](https://github.com/laurent22/joplin/issues/2616) by Mohammed Rabeeh)

## [v1.0.193](https://github.com/laurent22/joplin/releases/tag/v1.0.193) - 2020-03-08T08:58:53Z

- New: Added concept of provisional note to simplify creation and handling of newly created notes
- New: Add word counter feature to notes ([#2444](https://github.com/laurent22/joplin/issues/2444)) ([#160](https://github.com/laurent22/joplin/issues/160) by [@jdrobertso](https://github.com/jdrobertso))
- New: Added zoom controls to the application menu ([#2162](https://github.com/laurent22/joplin/issues/2162))
- New: Added Mermaid diagrams support ([#2001](https://github.com/laurent22/joplin/issues/2001))
- New: Add "add or remove tags" for multiple notes. ([#2386](https://github.com/laurent22/joplin/issues/2386)) ([#539](https://github.com/laurent22/joplin/issues/539) by [@mic704b](https://github.com/mic704b))
- New: Added new date format YYYY.MM.DD ([#2318](https://github.com/laurent22/joplin/issues/2318) by XSAkos)
- New: Added new, more secure encryption methods, so that they can be switched to at a later time
- Fixed: Handle invalid UTF-8 data when encrypting ([#2591](https://github.com/laurent22/joplin/issues/2591))
- New: Add more context to encryption errors
- Security: Fixed potential Arbitrary File Read via XSS (Reported by [Javier Olmedo](https://github.com/JavierOlmedo), fixed by Laurent Cozic)
- Security: Changed default encryption method to CCM
- Security: Change geolocation service to freegeoip.app to improve privacy ([#2503](https://github.com/laurent22/joplin/issues/2503) by Helmut K. C. Tessarek)
- Improved: Improve code css for Solarized Dark ([#2626](https://github.com/laurent22/joplin/issues/2626) by [@rajprakash](https://github.com/rajprakash))
- Improved: Empty note body has 0 line count ([#2623](https://github.com/laurent22/joplin/issues/2623) by [@jdrobertso](https://github.com/jdrobertso))
- Improved: Use asar packing to improve performances ([#2531](https://github.com/laurent22/joplin/issues/2531) by [@R-L-T-Y](https://github.com/R-L-T-Y))
- Improved: Implement "show all notes" ([#2472](https://github.com/laurent22/joplin/issues/2472)) ([#262](https://github.com/laurent22/joplin/issues/262) by [@mic704b](https://github.com/mic704b))
- Improved: Create a screen that list all the resouces ([#2189](https://github.com/laurent22/joplin/issues/2189)) ([#592](https://github.com/laurent22/joplin/issues/592) by Georg Grab)
- Improved: Ensure tabs act like tabs and spaces act like spaces in editor. ([#2508](https://github.com/laurent22/joplin/issues/2508) by [@mic704b](https://github.com/mic704b))
- Improved: Update Electron to 7.1.12 ([#2500](https://github.com/laurent22/joplin/issues/2500) by Helmut K. C. Tessarek)
- Improved: Support export of multiple notes to PDF files. ([#2468](https://github.com/laurent22/joplin/issues/2468) by [@mic704b](https://github.com/mic704b))
- Improved: Use current year in About box (in the copyright text) ([#2466](https://github.com/laurent22/joplin/issues/2466) by Helmut K. C. Tessarek)
- Improved: Show master instead of HEAD as branch in about box ([#2465](https://github.com/laurent22/joplin/issues/2465) by Helmut K. C. Tessarek)
- Improved: Sort tags in drop-down list (when adding tags) ([#2453](https://github.com/laurent22/joplin/issues/2453) by Helmut K. C. Tessarek)
- Improved: Support scrolling in the note list using keys (eg page up, page down) ([#2404](https://github.com/laurent22/joplin/issues/2404) by [@mic704b](https://github.com/mic704b))
- Improved: Do not select pasted text no matter the paste method ([#2431](https://github.com/laurent22/joplin/issues/2431) by [@mic704b](https://github.com/mic704b))
- Improved: Support list creation on multi-line selections ([#2408](https://github.com/laurent22/joplin/issues/2408)) ([#1014](https://github.com/laurent22/joplin/issues/1014) by [@mic704b](https://github.com/mic704b))
- Improved: Allow --no-sandbox flag to go around AppImage limitation ([#2436](https://github.com/laurent22/joplin/issues/2436) by Vaidotas Simkus)
- Improved: Reset time fields when duplicating a note ([#2428](https://github.com/laurent22/joplin/issues/2428) by Andrey Dolgov)
- Improved: Improved Note search bar UI ([#2329](https://github.com/laurent22/joplin/issues/2329) by [@mic704b](https://github.com/mic704b))
- Improved: Emphasise note title ([#2311](https://github.com/laurent22/joplin/issues/2311) by [@mic704b](https://github.com/mic704b))
- Improved: Support "select all" in the note list ([#2403](https://github.com/laurent22/joplin/issues/2403) by [@mic704b](https://github.com/mic704b))
- Improved: More info for "unknown profile version" error message ([#2361](https://github.com/laurent22/joplin/issues/2361) by [@mic704b](https://github.com/mic704b))
- Improved: Handle Thai language in search ([#2387](https://github.com/laurent22/joplin/issues/2387)) ([#2279](https://github.com/laurent22/joplin/issues/2279) by Kirtan Purohit)
- Improved: Improve appearance of note Info dialog
- Fixed: Fix issue with disappearing button labels in toolbar ([#2619](https://github.com/laurent22/joplin/issues/2619)) ([#2615](https://github.com/laurent22/joplin/issues/2615) by [@anjulalk](https://github.com/anjulalk))
- Fixed: Fix window dimensions and position when the application starts ([#2514](https://github.com/laurent22/joplin/issues/2514)) ([#2476](https://github.com/laurent22/joplin/issues/2476) by Daulet Amirkhanov)
- Fixed: Improved detection of selected text when applying formatting ([#2582](https://github.com/laurent22/joplin/issues/2582)) ([#2573](https://github.com/laurent22/joplin/issues/2573) by [@Rishgod](https://github.com/Rishgod))
- Fixed: Speed up WebDAV and Nextcloud Sync on Linux ([#2577](https://github.com/laurent22/joplin/issues/2577)) ([#1023](https://github.com/laurent22/joplin/issues/1023) by [@WisdomCode](https://github.com/WisdomCode))
- Fixed: Fix to update tag list when note is deleted. ([#2554](https://github.com/laurent22/joplin/issues/2554) by [@mic704b](https://github.com/mic704b))
- Fixed: Fix Resources menu item on macOS ([#2530](https://github.com/laurent22/joplin/issues/2530) by Helmut K. C. Tessarek)
- Fixed: Fixed search bar text not visible in dark mode
- Fixed: Better handling of rare error in WebDAV server ([#2485](https://github.com/laurent22/joplin/issues/2485))
- Fixed: Fixed note renderer asset caching issue
- Fixed: Add new Katex fonts to improve rendering ([#2478](https://github.com/laurent22/joplin/issues/2478)) ([#2477](https://github.com/laurent22/joplin/issues/2477) by Helmut K. C. Tessarek)
- Fixed: Fix `.desktop` file & force refresh ([#2479](https://github.com/laurent22/joplin/issues/2479) by Brandon Wulf)
- Fixed: Fixed incorect location format ([#2480](https://github.com/laurent22/joplin/issues/2480) by [@anjulalk](https://github.com/anjulalk))
- Fixed: Fix importing of very large attachments (150MB+) from Evernote ENEX files
- Fixed: Fix to update the note list if the selected tag is deleted. ([#2398](https://github.com/laurent22/joplin/issues/2398) by [@mic704b](https://github.com/mic704b))
- Fixed: Fix alignment of checkboxes and other list items in rendered note ([#2277](https://github.com/laurent22/joplin/issues/2277))
- Fixed: Fix slow rendering and memory leak issues with Katex notes ([#2357](https://github.com/laurent22/joplin/issues/2357))
- Fixed: Fix rendering of certain letters in Katex. Fixed printing when note contains Katex code ([#2374](https://github.com/laurent22/joplin/issues/2374))
- Fixed: Fix markdown export ([#2463](https://github.com/laurent22/joplin/issues/2463)) ([#2455](https://github.com/laurent22/joplin/issues/2455) by [@mic704b](https://github.com/mic704b))
- Fixed: Fix escaping of title when generating a markdown link ([#2456](https://github.com/laurent22/joplin/issues/2456)) ([#2085](https://github.com/laurent22/joplin/issues/2085) by Helmut K. C. Tessarek)
- Fixed: Fix rendering of tabs in code blocks ([#2446](https://github.com/laurent22/joplin/issues/2446)) ([#2330](https://github.com/laurent22/joplin/issues/2330) by [@mic704b](https://github.com/mic704b))
- Fixed: Do not show "could not print" warning dialog after cancelling print. ([#2410](https://github.com/laurent22/joplin/issues/2410)) ([#2407](https://github.com/laurent22/joplin/issues/2407) by [@mic704b](https://github.com/mic704b))
- Fixed: Fixes long lines warpped ([#2447](https://github.com/laurent22/joplin/issues/2447) by Amit singh)
- Fixed: Ensure the main window is hidden when Joplin starts ([#2432](https://github.com/laurent22/joplin/issues/2432)) ([#2365](https://github.com/laurent22/joplin/issues/2365) by 0xCLOVER)
- Fixed: Fix hang when selecting tag when multiple notes are selected (also for search) ([#2372](https://github.com/laurent22/joplin/issues/2372) by [@mic704b](https://github.com/mic704b))
- Fixed: Apply userstyle again when exporting to PDF or printing ([#2324](https://github.com/laurent22/joplin/issues/2324))
- Fixed: Fixed update message box
- Fixed: Fix identification of note in pdf export from main menu. ([#2323](https://github.com/laurent22/joplin/issues/2323) by [@mic704b](https://github.com/mic704b))
- Fixed: Fixed bad table rendering with multitable ([#2352](https://github.com/laurent22/joplin/issues/2352))
- Fixed: Fixed issues with Katex and MultiMd table plugin ([#2339](https://github.com/laurent22/joplin/issues/2339))
- Fixed: Fix Linux installation script ([#2333](https://github.com/laurent22/joplin/issues/2333) by Carl Bordum Hansen)

## [v1.0.192](https://github.com/laurent22/joplin/releases/tag/v1.0.192) - 2020-03-06T23:27:52Z

More fixes following latest pre-release.

- Security: Changed default encryption method to CCM
- Fixed: Handle invalid UTF-8 data when encrypting ([#2591](https://github.com/laurent22/joplin/issues/2591))
- Fixed: Fixed top margin issue on note rendering
- Fixed: Fixed issue with style embeded in notes

## [v1.0.190](https://github.com/laurent22/joplin/releases/tag/v1.0.190) - 2020-03-06T01:22:22Z

Fix more regressions from previous pre-release.

- Fixed: Fixed sanitize function so that it does not break HTML ([#2667](https://github.com/laurent22/joplin/issues/2667))
- Fixed: Templates when creating note were broken ([#2660](https://github.com/laurent22/joplin/issues/2660))

## [v1.0.189](https://github.com/laurent22/joplin/releases/tag/v1.0.189) - 2020-03-04T17:27:15Z

Fixed issue from previous pre-release 1.0.187.

- New: Add more context to encryption errors
- Improved: Improve code css for Solarized Dark ([#2626](https://github.com/laurent22/joplin/issues/2626) by [@rajprakash](https://github.com/rajprakash))
- Improved: Empty note body has 0 line count ([#2623](https://github.com/laurent22/joplin/issues/2623) by [@jdrobertso](https://github.com/jdrobertso))
- Fixed: Fix creation of new notes ([#2656](https://github.com/laurent22/joplin/issues/2656))
- Fixed: Improved Mermaid rendering on small viewports ([#2638](https://github.com/laurent22/joplin/issues/2638))
- Fixed: Fixed auto-title feature ([#2652](https://github.com/laurent22/joplin/issues/2652))
- Fixed: HTML code within Markdown was rendered incorrectly in some cases ([#2640](https://github.com/laurent22/joplin/issues/2640))

## [v1.0.187](https://github.com/laurent22/joplin/releases/tag/v1.0.187) - 2020-03-01T12:31:06Z

- New: Added concept of provisional note to simplify creation and handling of newly created notes
- New: Add word counter feature to notes ([#2444](https://github.com/laurent22/joplin/issues/2444)) ([#160](https://github.com/laurent22/joplin/issues/160) by [@jdrobertso](https://github.com/jdrobertso))
- New: Added zoom controls to the application menu ([#2162](https://github.com/laurent22/joplin/issues/2162))
- New: Added Mermaid diagrams support ([#2001](https://github.com/laurent22/joplin/issues/2001))
- New: Add "add or remove tags" for multiple notes. ([#2386](https://github.com/laurent22/joplin/issues/2386)) ([#539](https://github.com/laurent22/joplin/issues/539) by [@mic704b](https://github.com/mic704b))
- New: Added new date format YYYY.MM.DD ([#2318](https://github.com/laurent22/joplin/issues/2318) by XSAkos)
- New: Added new, more secure encryption methods, so that they can be switched to at a later time
- Security: Fixed potential Arbitrary File Read via XSS (Reported by [Javier Olmedo](https://github.com/JavierOlmedo), fixed by Laurent Cozic)
- Improved: Change geolocation service to freegeoip.app to improve privacy ([#2503](https://github.com/laurent22/joplin/issues/2503) by Helmut K. C. Tessarek)
- Improved: Use asar packing to improve performances ([#2531](https://github.com/laurent22/joplin/issues/2531) by [@R-L-T-Y](https://github.com/R-L-T-Y))
- Improved: Implement "show all notes" ([#2472](https://github.com/laurent22/joplin/issues/2472)) ([#262](https://github.com/laurent22/joplin/issues/262) by [@mic704b](https://github.com/mic704b))
- Improved: Create a screen that list all the resouces ([#2189](https://github.com/laurent22/joplin/issues/2189)) ([#592](https://github.com/laurent22/joplin/issues/592) by Georg Grab)
- Improved: Ensure tabs act like tabs and spaces act like spaces in editor. ([#2508](https://github.com/laurent22/joplin/issues/2508) by [@mic704b](https://github.com/mic704b))
- Improved: Update Electron to 7.1.12 ([#2500](https://github.com/laurent22/joplin/issues/2500) by Helmut K. C. Tessarek)
- Improved: Support export of multiple notes to PDF files. ([#2468](https://github.com/laurent22/joplin/issues/2468) by [@mic704b](https://github.com/mic704b))
- Improved: Use current year in About box (in the copyright text) ([#2466](https://github.com/laurent22/joplin/issues/2466) by Helmut K. C. Tessarek)
- Improved: Show master instead of HEAD as branch in about box ([#2465](https://github.com/laurent22/joplin/issues/2465) by Helmut K. C. Tessarek)
- Improved: Sort tags in drop-down list (when adding tags) ([#2453](https://github.com/laurent22/joplin/issues/2453) by Helmut K. C. Tessarek)
- Improved: Support scrolling in the note list using keys (eg page up, page down) ([#2404](https://github.com/laurent22/joplin/issues/2404) by [@mic704b](https://github.com/mic704b))
- Improved: Do not select pasted text no matter the paste method ([#2431](https://github.com/laurent22/joplin/issues/2431) by [@mic704b](https://github.com/mic704b))
- Improved: Support list creation on multi-line selections ([#2408](https://github.com/laurent22/joplin/issues/2408)) ([#1014](https://github.com/laurent22/joplin/issues/1014) by [@mic704b](https://github.com/mic704b))
- Improved: Allow --no-sandbox flag to go around AppImage limitation ([#2436](https://github.com/laurent22/joplin/issues/2436) by Vaidotas Simkus)
- Improved: Reset time fields when duplicating a note ([#2428](https://github.com/laurent22/joplin/issues/2428) by Andrey Dolgov)
- Improved: Improved Note search bar UI ([#2329](https://github.com/laurent22/joplin/issues/2329) by [@mic704b](https://github.com/mic704b))
- Improved: Emphasise note title ([#2311](https://github.com/laurent22/joplin/issues/2311) by [@mic704b](https://github.com/mic704b))
- Improved: Support "select all" in the note list ([#2403](https://github.com/laurent22/joplin/issues/2403) by [@mic704b](https://github.com/mic704b))
- Improved: More info for "unknown profile version" error message ([#2361](https://github.com/laurent22/joplin/issues/2361) by [@mic704b](https://github.com/mic704b))
- Improved: Handle Thai language in search ([#2387](https://github.com/laurent22/joplin/issues/2387)) ([#2279](https://github.com/laurent22/joplin/issues/2279) by Kirtan Purohit)
- Improved: Improve appearance of note Info dialog
- Fixed: Fix issue with disappearing button labels in toolbar ([#2619](https://github.com/laurent22/joplin/issues/2619)) ([#2615](https://github.com/laurent22/joplin/issues/2615) by [@anjulalk](https://github.com/anjulalk))
- Fixed: Fix window dimensions and position when the application starts ([#2514](https://github.com/laurent22/joplin/issues/2514)) ([#2476](https://github.com/laurent22/joplin/issues/2476) by Daulet Amirkhanov)
- Fixed: Improved detection of selected text when applying formatting ([#2582](https://github.com/laurent22/joplin/issues/2582)) ([#2573](https://github.com/laurent22/joplin/issues/2573) by [@Rishgod](https://github.com/Rishgod))
- Fixed: Speed up WebDAV and Nextcloud Sync on Linux ([#2577](https://github.com/laurent22/joplin/issues/2577)) ([#1023](https://github.com/laurent22/joplin/issues/1023) by [@WisdomCode](https://github.com/WisdomCode))
- Fixed: Fix to update tag list when note is deleted. ([#2554](https://github.com/laurent22/joplin/issues/2554) by [@mic704b](https://github.com/mic704b))
- Fixed: Fix Resources menu item on macOS ([#2530](https://github.com/laurent22/joplin/issues/2530) by Helmut K. C. Tessarek)
- Fixed: Fixed search bar text not visible in dark mode
- Fixed: Better handling of rare error in WebDAV server ([#2485](https://github.com/laurent22/joplin/issues/2485))
- Fixed: Fixed note renderer asset caching issue
- Fixed: Add new Katex fonts to improve rendering ([#2478](https://github.com/laurent22/joplin/issues/2478)) ([#2477](https://github.com/laurent22/joplin/issues/2477) by Helmut K. C. Tessarek)
- Fixed: Fix `.desktop` file & force refresh ([#2479](https://github.com/laurent22/joplin/issues/2479) by Brandon Wulf)
- Fixed: Fixed incorect location format ([#2480](https://github.com/laurent22/joplin/issues/2480) by [@anjulalk](https://github.com/anjulalk))
- Fixed: Fix importing of very large attachments (150MB+) from Evernote ENEX files
- Fixed: Fix to update the note list if the selected tag is deleted. ([#2398](https://github.com/laurent22/joplin/issues/2398) by [@mic704b](https://github.com/mic704b))
- Fixed: Fix alignment of checkboxes and other list items in rendered note ([#2277](https://github.com/laurent22/joplin/issues/2277))
- Fixed: Fix slow rendering and memory leak issues with Katex notes ([#2357](https://github.com/laurent22/joplin/issues/2357))
- Fixed: Fix rendering of certain letters in Katex. Fixed printing when note contains Katex code ([#2374](https://github.com/laurent22/joplin/issues/2374))
- Fixed: Fix markdown export ([#2463](https://github.com/laurent22/joplin/issues/2463)) ([#2455](https://github.com/laurent22/joplin/issues/2455) by [@mic704b](https://github.com/mic704b))
- Fixed: Fix escaping of title when generating a markdown link ([#2456](https://github.com/laurent22/joplin/issues/2456)) ([#2085](https://github.com/laurent22/joplin/issues/2085) by Helmut K. C. Tessarek)
- Fixed: Fix rendering of tabs in code blocks ([#2446](https://github.com/laurent22/joplin/issues/2446)) ([#2330](https://github.com/laurent22/joplin/issues/2330) by [@mic704b](https://github.com/mic704b))
- Fixed: Do not show "could not print" warning dialog after cancelling print. ([#2410](https://github.com/laurent22/joplin/issues/2410)) ([#2407](https://github.com/laurent22/joplin/issues/2407) by [@mic704b](https://github.com/mic704b))
- Fixed: Fixes long lines warpped ([#2447](https://github.com/laurent22/joplin/issues/2447) by Amit singh)
- Fixed: Ensure the main window is hidden when Joplin starts ([#2432](https://github.com/laurent22/joplin/issues/2432)) ([#2365](https://github.com/laurent22/joplin/issues/2365) by 0xCLOVER)
- Fixed: Fix hang when selecting tag when multiple notes are selected (also for search) ([#2372](https://github.com/laurent22/joplin/issues/2372) by [@mic704b](https://github.com/mic704b))
- Fixed: Apply userstyle again when exporting to PDF or printing ([#2324](https://github.com/laurent22/joplin/issues/2324))
- Fixed: Fixed update message box
- Fixed: Fix identification of note in pdf export from main menu. ([#2323](https://github.com/laurent22/joplin/issues/2323) by [@mic704b](https://github.com/mic704b))
- Fixed: Fixed bad table rendering with multitable ([#2352](https://github.com/laurent22/joplin/issues/2352))
- Fixed: Fixed issues with Katex and MultiMd table plugin ([#2339](https://github.com/laurent22/joplin/issues/2339))
- Fixed: Fix Linux installation script ([#2333](https://github.com/laurent22/joplin/issues/2333) by Carl Bordum Hansen)

## [v1.0.179](https://github.com/laurent22/joplin/releases/tag/v1.0.179) - 2020-01-24T22:42:41Z

- New: Added new, more secure encryption methods, so that they can be switched to at a later time
- Improved: Improve appearance of note Info dialog
- Fixed: Apply userstyle again when exporting to PDF or printing ([#2324](https://github.com/laurent22/joplin/issues/2324))
- Fixed: Fixed update message box
- Fixed: Fix identification of note in pdf export from main menu. ([#2323](https://github.com/laurent22/joplin/issues/2323) by mic704b)
- Fixed: Undefined text was being displayed on top of notes in revision viewer ([#2352](https://github.com/laurent22/joplin/issues/2352))
- Fixed: Fixed issues with Katex and MultiMd table plugin ([#2339](https://github.com/laurent22/joplin/issues/2339))
- Fixed: Fix Linux installation script ([#2333](https://github.com/laurent22/joplin/issues/2333) by [@carlbordum](https://github.com/carlbordum))

## [v1.0.178](https://github.com/laurent22/joplin/releases/tag/v1.0.178) - 2020-01-20T19:06:45Z

- New: Add ability to search by folder or tag title
- New: Add option to disable auto-matching braces ([#2251](https://github.com/laurent22/joplin/issues/2251))
- New: Display selected tags under a note title ([#2217](https://github.com/laurent22/joplin/issues/2217))
- New: Add external editor actions to the note context menu. ([#2214](https://github.com/laurent22/joplin/issues/2214))
- Improved: When importing MD files create resources for local linked files ([#2262](https://github.com/laurent22/joplin/issues/2262))
- Improved: Update Electron to 7.1.9 ([#2314](https://github.com/laurent22/joplin/issues/2314))
- Improved: Show completed date in note properties ([#2292](https://github.com/laurent22/joplin/issues/2292))
- Improved: Maintain selection when non-selected note is deleted ([#2290](https://github.com/laurent22/joplin/issues/2290))
- Improved: Don't count completed to-dos in note counts when they are not shown ([#2288](https://github.com/laurent22/joplin/issues/2288))
- Improved: Replace note links with relative paths in MD Exporter ([#2161](https://github.com/laurent22/joplin/issues/2161))
- Fixed: Fix pdf export when mouse over non-selected note in notelist. ([#2255](https://github.com/laurent22/joplin/issues/2255)) ([#2254](https://github.com/laurent22/joplin/issues/2254))
- Fixed: Fixed regression in HTML note rendering
- Fixed: Fixed export to HTML, PDF and printing

## [v1.0.177](https://github.com/laurent22/joplin/releases/tag/v1.0.177) - 2019-12-30T14:40:40Z

This is to test the Electron framework upgrade and the switch to a separate note renderer. If you find any bug please report on the forum or GitHub tracker.

- New: Allow exporting a note as HTML
- Improved: Extract note renderer to separate package ([#2206](https://github.com/laurent22/joplin/issues/2206))
- Improved: Better handling of resource download errors, and added resource info to sync status screen
- Improved: Update Katex to 0.11.1 ([#2201](https://github.com/laurent22/joplin/issues/2201))
- Improved: Improved Nextcloud API error handling
- Improved: Updated OneDrive login to remove webview dependency
- Improved: Decrypt notes that are meant to be shared
- Improved: Make it easier to view early errors when the app starts
- Improved: Upgrade to Electron 7
- Improved: Render note using iframe instead of deprecated webview
- Fixed: Fix Goto Anything scrolling issue ([#2199](https://github.com/laurent22/joplin/issues/2199)) ([#2122](https://github.com/laurent22/joplin/issues/2122))
- Fixed: Prevent app from crashing when pressing focus shortcut from search bar ([#2157](https://github.com/laurent22/joplin/issues/2157))
- Fixed: Handle WebDAV servers that do not return a last modified date (fixes mail.ru) ([#2091](https://github.com/laurent22/joplin/issues/2091))
- Fixed: Fix notifications on Windows 7 ([#2144](https://github.com/laurent22/joplin/issues/2144))

## [v1.0.176](https://github.com/laurent22/joplin/releases/tag/v1.0.176) - 2019-12-14T10:36:44Z

- New: Add ability to share a note publicly using Nextcloud ([#2173](https://github.com/laurent22/joplin/issues/2173))
- Improved: Allow for custom Joplin theme and Ace editor styles ([#2099](https://github.com/laurent22/joplin/issues/2099))

## [v1.0.175](https://github.com/laurent22/joplin/releases/tag/v1.0.175) - 2019-12-08T11:48:47Z

- New: Add warning message when user tries to upload a file 10MB or larger ([#2102](https://github.com/laurent22/joplin/issues/2102)) ([#2097](https://github.com/laurent22/joplin/issues/2097))
- Improved: Improved text editor syntax highlighting ([#2100](https://github.com/laurent22/joplin/issues/2100))
- Improved: Improved logging during sync to allow finding bugs more easily
- Improved: Allow Electron debugging flag  ([#2084](https://github.com/laurent22/joplin/issues/2084))
- Improved: Updated application icons
- Fixed: Restaured translations that had been accidentally deleted ([#2126](https://github.com/laurent22/joplin/issues/2126))
- Fixed: Fixed warning boxes in solarized theme ([#1826](https://github.com/laurent22/joplin/issues/1826))
- Fixed: Prevent sync from happening if target dir could not be created, in local sync ([#2117](https://github.com/laurent22/joplin/issues/2117))
- Fixed: Handle rare case when notebook has a parent that no longer exists, which causes a crash when sorting ([#2088](https://github.com/laurent22/joplin/issues/2088))

## [v1.0.174](https://github.com/laurent22/joplin/releases/tag/v1.0.174) - 2019-11-12T18:20:58Z

- Improved: Show note count by default
- Fixed: Do not crash when a notebook parent does not exist ([#2079](https://github.com/laurent22/joplin/issues/2079))
- Fixed: Fix scaling of inline svg resource icons ([#2075](https://github.com/laurent22/joplin/issues/2075))

## [v1.0.173](https://github.com/laurent22/joplin/releases/tag/v1.0.173) - 2019-11-11T08:33:35Z

- New: Add new setting to show note counts for folders and tags ([#2006](https://github.com/laurent22/joplin/issues/2006))
- New: Add keyboard modes to editor (vim, emacs) ([#2056](https://github.com/laurent22/joplin/issues/2056)) ([#1298](https://github.com/laurent22/joplin/issues/1298))
- New: Added link resource icon ([#2035](https://github.com/laurent22/joplin/issues/2035))
- New: Add `<kbd>` tag support ([#2044](https://github.com/laurent22/joplin/issues/2044)) ([#2043](https://github.com/laurent22/joplin/issues/2043))
- New: Add Nord theme ([#2004](https://github.com/laurent22/joplin/issues/2004)) ([#1903](https://github.com/laurent22/joplin/issues/1903))
- New: Add menu item to toggle note list ([#1991](https://github.com/laurent22/joplin/issues/1991)) ([#1988](https://github.com/laurent22/joplin/issues/1988))
- New: Add context menu and menu item to create sub-notebook ([#1984](https://github.com/laurent22/joplin/issues/1984))
- New: Add typographer support ([#1987](https://github.com/laurent22/joplin/issues/1987))
- Improved: Set user-agent header to Joplin/1.0 ([#2064](https://github.com/laurent22/joplin/issues/2064)) ([#2042](https://github.com/laurent22/joplin/issues/2042))
- Improved: Prevent window from being shown on startup when it should be hidden in tray ([#2031](https://github.com/laurent22/joplin/issues/2031))
- Improved: Allow selecting what views should be available from the Layout button ([#2028](https://github.com/laurent22/joplin/issues/2028)) ([#1900](https://github.com/laurent22/joplin/issues/1900))
- Improved: Fill X primary selection from the editor on text selection ([#2029](https://github.com/laurent22/joplin/issues/2029)) ([#215](https://github.com/laurent22/joplin/issues/215))
- Improved: Allow custom CSS when printing ([#2014](https://github.com/laurent22/joplin/issues/2014)) ([#1918](https://github.com/laurent22/joplin/issues/1918))
- Improved: Update Markdown plugins: toc-done-right, anchor ([#2005](https://github.com/laurent22/joplin/issues/2005)) ([#1953](https://github.com/laurent22/joplin/issues/1953))
- Improved: Handle WebDAV server with empty XML namespaces ([#2002](https://github.com/laurent22/joplin/issues/2002))
- Improved: Stop watching external edits when closing editor ([#1981](https://github.com/laurent22/joplin/issues/1981))
- Improved: Allow apps to work with read-only profile
- Fixed: Fix handling of URLs that contain single quotes ([#2030](https://github.com/laurent22/joplin/issues/2030))
- Fixed: Prevent horizontal scrolling on Linux when a scrollbar is present in note list ([#2062](https://github.com/laurent22/joplin/issues/2062)) ([#1570](https://github.com/laurent22/joplin/issues/1570))
- Fixed: Fix TOC with special characters ([#2052](https://github.com/laurent22/joplin/issues/2052))
- Fixed: Stop print command from resetting theme ([#1999](https://github.com/laurent22/joplin/issues/1999)) ([#1790](https://github.com/laurent22/joplin/issues/1790))
- Fixed: Fixed attachment markup when importing ENEX files as HTML so that it works in mobile too
- Fixed: Api: Fixed error handling when getting resources of a note that does not exist ([#2018](https://github.com/laurent22/joplin/issues/2018))
- Fixed: Fix scrolling issue when clicking on internal link ([#1867](https://github.com/laurent22/joplin/issues/1867))
- Fixed: Open links in external browser from revision view ([#2008](https://github.com/laurent22/joplin/issues/2008))

## [v1.0.170](https://github.com/laurent22/joplin/releases/tag/v1.0.170) - 2019-10-13T22:13:04Z

- New: Added support for chemical equations using mhchem for Katex
- New: Add option to set page dimensions when printing ([#1976](https://github.com/laurent22/joplin/issues/1976))
- New: Add checkmark to menu item, if Dev Tools are on ([#1949](https://github.com/laurent22/joplin/issues/1949))
- New: Added Dracula theme ([#1924](https://github.com/laurent22/joplin/issues/1924)) ([#1863](https://github.com/laurent22/joplin/issues/1863))
- New: Added concept of sync version and client ID to allow upgrading sync targets
- Improved: Truncate update changelog when it's too long ([#1967](https://github.com/laurent22/joplin/issues/1967)) ([#1222](https://github.com/laurent22/joplin/issues/1222))
- Improved: Support italic in span tags ([#1966](https://github.com/laurent22/joplin/issues/1966))
- Improved: Allow a sync client to lock a sync target, so that migration operations can be performed on it
- Improved: Give correct mime type to more file types
- Improved: Api: Allow getting the resources of a note ([#1956](https://github.com/laurent22/joplin/issues/1956))
- Improved: Set cancel as the default in dangerous operations ([#1934](https://github.com/laurent22/joplin/issues/1934)) ([#1662](https://github.com/laurent22/joplin/issues/1662))
- Improved: Hide some toolbar buttons when editor hidden ([#1940](https://github.com/laurent22/joplin/issues/1940)) ([#1896](https://github.com/laurent22/joplin/issues/1896))
- Improved: Larger search bar ([#1933](https://github.com/laurent22/joplin/issues/1933)) ([#917](https://github.com/laurent22/joplin/issues/917))
- Improved: Use profile temp dir when exporting files ([#1932](https://github.com/laurent22/joplin/issues/1932))
- Improved: Code button now detects multiline ([#1915](https://github.com/laurent22/joplin/issues/1915))
- Fixed: Prevent note content from being deleted when using certain external editors (in particular Typora) ([#1854](https://github.com/laurent22/joplin/issues/1854))
- Fixed: Display error message when notes cannot be exported ([#1970](https://github.com/laurent22/joplin/issues/1970))
- Fixed: Note view was not reloaded after viewing revisions ([#1819](https://github.com/laurent22/joplin/issues/1819))
- Fixed: Fixed alarms that would trigger immediately when they were set too far in future ([#1829](https://github.com/laurent22/joplin/issues/1829))
- Fixed: Text input context menu was not working in Windows ([#1703](https://github.com/laurent22/joplin/issues/1703))
- Fixed: App would crash if trying to index a note that has not been decrypted yet ([#1938](https://github.com/laurent22/joplin/issues/1938))

## [v1.0.169](https://github.com/laurent22/joplin/releases/tag/v1.0.169) - 2019-09-27T18:35:13Z

- New: Add support for Deepin desktop environment in install script ([#1884](https://github.com/laurent22/joplin/issues/1884))
- Improved: Improves deletion fail-safe so it is based on percentage of notes deleted. And display warning on sidebar.
- Improved: Log last requests in case of a sync error

## [v1.0.168](https://github.com/laurent22/joplin/releases/tag/v1.0.168) - 2019-09-25T21:21:38Z

- New: Import Evernote notes as HTML ([#1887](https://github.com/laurent22/joplin/issues/1887))
- New: Added fail-safe to prevent data from being wiped out when the sync target is empty
- Improved: Also allow importing TXT files with markdown
- Improved: Cleaned up and improved config screen design, move all screens under same one, and added section buttons
- Fixed: Fixed broken menu bar
- Fixed: Fixed import of notes that contain links with hashes
- Fixed: Support non-alphabetical characters in note link anchors ([#1870](https://github.com/laurent22/joplin/issues/1870))

## [v1.0.167](https://github.com/laurent22/joplin/releases/tag/v1.0.167) - 2019-09-10T08:48:37Z

- Fixed: Fixed link issue following last update

## [v1.0.166](https://github.com/laurent22/joplin/releases/tag/v1.0.166) - 2019-09-09T17:35:54Z

Note that on Windows the code signing certificate has been renewed, which some times triggers warnings when installing the application.

- New: Add support for anchor hashes in note links ([#1490](https://github.com/laurent22/joplin/issues/1490))
- Improved: Only support checkboxes that start with a dash ([#1832](https://github.com/laurent22/joplin/issues/1832))
- Improved: Apply current locale to date and time ([#1822](https://github.com/laurent22/joplin/issues/1822))
- Improved: Update template prompt font and sort templates ([#1806](https://github.com/laurent22/joplin/issues/1806))
- Fixed: Do not scroll text when search is open and user type in note ([#1833](https://github.com/laurent22/joplin/issues/1833))
- Fixed: Fixed cropped content issue when printing or exporting to PDF ([#1815](https://github.com/laurent22/joplin/issues/1815))
- Fixed: Fix typo on encryption options screen ([#1823](https://github.com/laurent22/joplin/issues/1823))
- Fixed: Use correct date format for templates ([#1810](https://github.com/laurent22/joplin/issues/1810)) ([#1803](https://github.com/laurent22/joplin/issues/1803))

## [v1.0.165](https://github.com/laurent22/joplin/releases/tag/v1.0.165) - 2019-08-14T21:46:29Z

- New: Added support for Fountain screenwriting language
- New: Add solarized themes to desktop client ([#1733](https://github.com/laurent22/joplin/issues/1733))
- New: Added support for templates ([#1647](https://github.com/laurent22/joplin/issues/1647))
- New: Added markup language to property dialog
- New: Add support for cinnamon to install script ([#1738](https://github.com/laurent22/joplin/issues/1738))
- Improved: Better handling of adding the title to print and export to PDF ([#1744](https://github.com/laurent22/joplin/issues/1744))
- Improved: Improved bold formatting support in Enex import ([#1708](https://github.com/laurent22/joplin/issues/1708))
- Improved: Create fileURLs via drag and drop ([#1653](https://github.com/laurent22/joplin/issues/1653))
- Improved: No longer crash if certain theme properties are not set
- Improved: Make translation files smaller by not including untranslated strings. Also add percentage translated to config screen. ([#1459](https://github.com/laurent22/joplin/issues/1459))
- Improved: Only repeat failed requests up to 3 times during sync
- Improved: Upgraded packages to fix security issue
- Improved: Make depthColor theme property optional
- Improved: Optimised loading of multiple items
- Improved: Disable Markdown actions for HTML notes
- Improved: Footnote, toc-done-right, anchor ([#1741](https://github.com/laurent22/joplin/issues/1741))
- Fixed: Fixed Back button icon on Config screen
- Fixed: Fixed note order when dragging a note outside a notebook ([#1732](https://github.com/laurent22/joplin/issues/1732))
- Fixed: Fixed race condition when loading a note while another one is still loading. Improved performance when loading large note.

## [v1.0.161](https://github.com/laurent22/joplin/releases/tag/v1.0.161) - 2019-07-13T18:30:00Z

- Improved: Show git branch and hash in About dialog ([#1692](https://github.com/laurent22/joplin/issues/1692))
- Improved: Better logging in case of error while indexing search
- Improved: When doing local search do not split query into words
- Improved: For Ubuntu users, added unity to if condition for desktop icon creation ([#1683](https://github.com/laurent22/joplin/issues/1683))
- Improved: Cache code blocks in notes to speed up rendering ([#1649](https://github.com/laurent22/joplin/issues/1649))
- Improved: Optimised resource download queue by exiting early if resources are already downloaded
- Fixed: Keep back button when opening a note link from the search results ([#1727](https://github.com/laurent22/joplin/issues/1727))
- Fixed: Improved note selection and scrolling when moving a note to a different notebook ([#1724](https://github.com/laurent22/joplin/issues/1724))
- Fixed: Import Evernote audio files correctly ([#1723](https://github.com/laurent22/joplin/issues/1723))
- Fixed: Fixed issue with certain commands being repeated in some cases ([#1720](https://github.com/laurent22/joplin/issues/1720))
- Fixed: Set note title to correct size when zoom is enabled ([#1704](https://github.com/laurent22/joplin/issues/1704))
- Fixed: Hide toolbar button text when it is below a certain size ([#1699](https://github.com/laurent22/joplin/issues/1699))
- Fixed: When deleting resource from sync target also delete associated data blob ([#1694](https://github.com/laurent22/joplin/issues/1694))
- Fixed: Add override for ACE editor shortcut `Ctrl+K` ([#1705](https://github.com/laurent22/joplin/issues/1705)) ([#1342](https://github.com/laurent22/joplin/issues/1342))
- Fixed: Only log master key ID
- Fixed: Preserve user timestamps when adding note via API ([#1676](https://github.com/laurent22/joplin/issues/1676))
- Fixed: Fix line break issue when importing certain notes from Evernotes ([#1672](https://github.com/laurent22/joplin/issues/1672))
- Fixed: Fixed issue with issue with watching file on Linux ([#1659](https://github.com/laurent22/joplin/issues/1659))
- Fixed: Disable certain menu items when no note or multiple notes are selected, and fixed menu item to set tag ([#1664](https://github.com/laurent22/joplin/issues/1664))

## [v1.0.160](https://github.com/laurent22/joplin/releases/tag/v1.0.160) - 2019-06-15T00:21:40Z

- New: Highlight notebooks based on depth ([#1634](https://github.com/laurent22/joplin/issues/1634))
- New: Added menu item to format inline code ([#1641](https://github.com/laurent22/joplin/issues/1641))
- Improved: Added shortcut for tags (`Cmd+Opt+T` / `Ctrl+Alt+T`) ([#1638](https://github.com/laurent22/joplin/issues/1638))
- Fixed: Allow opening external editor on new notes ([#1443](https://github.com/laurent22/joplin/issues/1443))

## [v1.0.159](https://github.com/laurent22/joplin/releases/tag/v1.0.159) - 2019-06-08T00:00:19Z

- New: Added option to open development tools, to make it easier to create custom CSS
- Improved: Improved tag dialog to make it easier to add and remove tags ([#1589](https://github.com/laurent22/joplin/issues/1589))
- Improved: Speed up synchronisation by allowing multiple connections when downloading items ([#1633](https://github.com/laurent22/joplin/issues/1633))
- Improved: Better handling of items that cannot be decrypted, including those that cause crashes
- Improved: Upgrade TOC plugin version to 4.0.0 to fix various issues ([#1603](https://github.com/laurent22/joplin/issues/1603))
- Improved: Improve how font size is applied ([#1601](https://github.com/laurent22/joplin/issues/1601))
- Improved: Improved workflow of downloading and decrypting data during sync
- Fixed: Fix icon path and directory in Linux install script ([#1612](https://github.com/laurent22/joplin/issues/1612))
- Fixed: Handle multiple lines in attributes when importing Enex files ([#1583](https://github.com/laurent22/joplin/issues/1583))
- Fixed: Fix issue with revisions being needlessly created when decrypting notes

## [v1.0.158](https://github.com/laurent22/joplin/releases/tag/v1.0.158) - 2019-05-27T19:01:18Z

- Improved: Enable more options on multimd-table plugin ([#1586](https://github.com/laurent22/joplin/issues/1586))
- Improved: Improved config screen with dark theme
- Improved: Make bold text more visible ([#1575](https://github.com/laurent22/joplin/issues/1575))
- Fixed: Fix internal note links ([#1587](https://github.com/laurent22/joplin/issues/1587))
- Fixed: Fixed empty separators in menu

## [v1.0.157](https://github.com/laurent22/joplin/releases/tag/v1.0.157) - 2019-05-26T17:55:53Z

- New: Added Persian translation ([#1539](https://github.com/laurent22/joplin/issues/1539))
- New: Allow downloading attachments on demand or automatically ([#1527](https://github.com/laurent22/joplin/issues/1527)) ([#1481](https://github.com/laurent22/joplin/issues/1481))
- Improved: Make bold text more visible ([#1575](https://github.com/laurent22/joplin/issues/1575))
- Improved: Add number of characters removed and added in revision list
- Improved: Remove tags from Welcome item due to issue with cleaning them up afterwards
- Improved: Handle missing resource blob when setting resource size
- Improved: Gray out checkboxes that have been ticked inside notes
- Improved: Put back "Fetched items" message during sync
- Improved: When opening a note using Goto Anything, open all its parent notebooks too
- Fixed: Clears search when clicking on a notebook. ([#1504](https://github.com/laurent22/joplin/issues/1504)) ([#1186](https://github.com/laurent22/joplin/issues/1186))
- Fixed: Default sort order for notebooks should be title and ascending ([#1541](https://github.com/laurent22/joplin/issues/1541))
- Fixed: Added backticks to auto-wrapping quotes. ([#1534](https://github.com/laurent22/joplin/issues/1534)) ([#1426](https://github.com/laurent22/joplin/issues/1426))
- Fixed: Prevent app from trying to upload resource it has not downloaded yet

## [v1.0.153](https://github.com/laurent22/joplin/releases/tag/v1.0.153) - 2019-05-15T06:27:29Z

This release only adds additional logging for the note history feature.

## [v1.0.152](https://github.com/laurent22/joplin/releases/tag/v1.0.152) - 2019-05-13T09:08:07Z

Same as v1.0.151 but with a fix to the migration issue, that was in turns affecting synchronisation.

- New: Support for note history ([#1415](https://github.com/laurent22/joplin/issues/1415)) ([#712](https://github.com/laurent22/joplin/issues/712))
- Improved: Save size of a resource to the database; and added mechanism to run non-database migrations
- Improved: Improved note deletion dialog ([#1502](https://github.com/laurent22/joplin/issues/1502))
- Fixed: Allow resources greater than 10 MB but they won't be synced on mobile ([#371](https://github.com/laurent22/joplin/issues/371))
- Fixed: Improved handling of images when using external editor, so that it works in Atom, VSCode and Typora ([#1425](https://github.com/laurent22/joplin/issues/1425))
- Fixed: Some images were not being displayed
- Fixed: Resets the undo manager when creating new notes ([#1495](https://github.com/laurent22/joplin/issues/1495)) ([#355](https://github.com/laurent22/joplin/issues/355))
- Fixed: Prevents notes with no title to break after synchronize ([#1472](https://github.com/laurent22/joplin/issues/1472))

## [v1.0.151](https://github.com/laurent22/joplin/releases/tag/v1.0.151) - 2019-05-12T15:14:32Z

Same as v1.0.150 but with a small fix to set the resources file size.

- New: Support for note history ([#1415](https://github.com/laurent22/joplin/issues/1415)) ([#712](https://github.com/laurent22/joplin/issues/712))
- Improved: Save size of a resource to the database; and added mechanism to run non-database migrations
- Improved: Improved note deletion dialog ([#1502](https://github.com/laurent22/joplin/issues/1502))
- Fixed: Allow resources greater than 10 MB but they won't be synced on mobile ([#371](https://github.com/laurent22/joplin/issues/371))
- Fixed: Improved handling of images when using external editor, so that it works in Atom, VSCode and Typora ([#1425](https://github.com/laurent22/joplin/issues/1425))
- Fixed: Some images were not being displayed
- Fixed: Resets the undo manager when creating new notes ([#1495](https://github.com/laurent22/joplin/issues/1495)) ([#355](https://github.com/laurent22/joplin/issues/355))
- Fixed: Prevents notes with no title to break after synchronize ([#1472](https://github.com/laurent22/joplin/issues/1472))

## [v1.0.150](https://github.com/laurent22/joplin/releases/tag/v1.0.150) - 2019-05-12T11:27:48Z

- New: Support for note history ([#1415](https://github.com/laurent22/joplin/issues/1415)) ([#712](https://github.com/laurent22/joplin/issues/712))
- Improved: Save size of a resource to the database; and added mechanism to run non-database migrations
- Improved: Improved note deletion dialog ([#1502](https://github.com/laurent22/joplin/issues/1502))
- Fixed: Allow resources greater than 10 MB but they won't be synced on mobile ([#371](https://github.com/laurent22/joplin/issues/371))
- Fixed: Improved handling of images when using external editor, so that it works in Atom, VSCode and Typora ([#1425](https://github.com/laurent22/joplin/issues/1425))
- Fixed: Some images were not being displayed
- Fixed: Resets the undo manager when creating new notes ([#1495](https://github.com/laurent22/joplin/issues/1495)) ([#355](https://github.com/laurent22/joplin/issues/355))
- Fixed: Prevents notes with no title to break after synchronize ([#1472](https://github.com/laurent22/joplin/issues/1472))

## [v1.0.148](https://github.com/laurent22/joplin/releases/tag/v1.0.148) - 2019-05-08T19:12:24Z

This is to test the revision service. It is not yet recommended to upgrade as the corresponding mobile apps have not been released to the stores yet (the Android APK is available though).

- Improved: Make sure a revision is saved if a note has not been modified for over a week
- Improved: Do not save a revision if there is already a recent one that exists
- Improved: Make sure user timestamp is preserved with revision information
- Fixed: Fixed note history sort order.
- Fixed: Make sure a revision is not empty before saving it

## [v1.0.145](https://github.com/laurent22/joplin/releases/tag/v1.0.145) - 2019-05-03T09:16:53Z

- Improved: Display better error message when trying to sync with a new sync target from an old version of Joplin
- Improved: UI updates to sidebar and header, changing icon sizes and animations ([#1463](https://github.com/laurent22/joplin/issues/1463))
- Fixed: Update chokidar to fix blank screen when returning from external editor ([#1479](https://github.com/laurent22/joplin/issues/1479))
- Fixed: Fixes [#1476](https://github.com/laurent22/joplin/issues/1476): Import lists and sub-lists from Enex files with correct indentation ([#1476](https://github.com/laurent22/joplin/issues/1476))
- Fixed: Remove message "Processing a path that has already been done" as this is not an error ([#1353](https://github.com/laurent22/joplin/issues/1353))

## [v1.0.143](https://github.com/laurent22/joplin/releases/tag/v1.0.143) - 2019-04-22T10:51:38Z

- Improved support for Japanese, Chinese, Korean search queries (also applies to Goto Anything)
- Fixes [#1433](https://github.com/laurent22/joplin/issues/1433): Some resources could incorrectly be deleted even though they are still present in a note. Also added additional verifications to make sure resources that are still linked to a note are not accidentally deleted.
- Fix: Goto Anything results were displayed lowercase
- Fix: Clear selected Notes when switching Notebook ([#1387](https://github.com/laurent22/joplin/issues/1387))
- Fixes [#1405](https://github.com/laurent22/joplin/issues/1405): Handle invalid resource tags that contain no data when importing ENEX
- Fix: Updated Electron and Chokidar to try to fix external editor crashing app
- Fixes [#423](https://github.com/laurent22/joplin/issues/423): Make sure links are clickable when exporting to PDF
- Fixes [#1427](https://github.com/laurent22/joplin/issues/1427): Support checkoxes behind bullets
- Fixes [#1417](https://github.com/laurent22/joplin/issues/1417): Clipper: Sort the folders in the same order as the desktop app
- Fixes [#1425](https://github.com/laurent22/joplin/issues/1425) (probably): Fix display of images when using VSCode as external editor
- Change shortcuts for 'Print' and 'Goto Anything' ([#1420](https://github.com/laurent22/joplin/issues/1420))
- Add option to use soft breaks for markdown rendering ([#1408](https://github.com/laurent22/joplin/issues/1408))

## [v1.0.142](https://github.com/laurent22/joplin/releases/tag/v1.0.142) - 2019-04-02T16:44:51Z

- New: Allow toggling markdown plugins and added several new plugins ([#1347](https://github.com/laurent22/joplin/issues/1347))
- New: Added Goto Anything dialog (Ctrl+P or Cmd+P)
- Improved: macOS: make the menu more like a macOS menu ([#1348](https://github.com/laurent22/joplin/issues/1348))
- Improved search - when clearing search, stay on current item. When clicking on notebook name, jump to note within notebook. Improved toolbar layout.
- Fixed: The side bar was being refreshed too frequently.
- Fixed: Order of notebooks with sub-notebooks was sometimes incorrect when sorting
- Fixes [#1334](https://github.com/laurent22/joplin/issues/1334) (maybe): Upgraded chokidar which it seems was randomly making Electron 4 crash (maybe due to fsevent package)
- Fixes [#1329](https://github.com/laurent22/joplin/issues/1329): Could not edit created and updated time anymore
- Fixes [#1326](https://github.com/laurent22/joplin/issues/1326): Restored inline code styling
- Fixes [#1325](https://github.com/laurent22/joplin/issues/1325): Fixed nested checkbox indentation
- fix sub pixel rendering for desktop ([#1378](https://github.com/laurent22/joplin/issues/1378))

## [v1.0.140](https://github.com/laurent22/joplin/releases/tag/v1.0.140) - 2019-03-10T20:59:58Z

- Resolves [#1105](https://github.com/laurent22/joplin/issues/1105): Added support for macro persistence for Katex
- Resolves [#206](https://github.com/laurent22/joplin/issues/206): Added support for sorting notebooks by title or last modified
- Fixed: Windows 32-bit version should now work again.
- Improved: Rewritten Markdown rendering system to make it easier to add new features. Fixed a few minor rendering bugs doing so.

## [v1.0.139](https://github.com/laurent22/joplin/releases/tag/v1.0.139) - 2019-03-09T10:06:48Z

This pre-release is mainly for testing the new rendering engine.

## [v1.0.138](https://github.com/laurent22/joplin/releases/tag/v1.0.138) - 2019-03-03T17:23:00Z

This is only for testing the Arabic translation.

## [v1.0.137](https://github.com/laurent22/joplin/releases/tag/v1.0.137) - 2019-03-03T01:12:51Z

To test Windows 32-bit build.

## [v1.0.135](https://github.com/laurent22/joplin/releases/tag/v1.0.135) - 2019-02-27T23:36:57Z

Note: this is the same as v132 but with a fix for the resizeable column bug, and for PDF export and printing.

- New: Experimental support for Mermaid graphs (This is **not** yet supported on mobile).
- New: Allow resizing sidebar columns.
- New: Resolves [#1198](https://github.com/laurent22/joplin/issues/1198): In search results, give more weight to more recent notes and less to completed to-dos
- Add shortcut to start a sync ([#1231](https://github.com/laurent22/joplin/issues/1231))
- Change notebook icon in toolbar and search result ([#1252](https://github.com/laurent22/joplin/issues/1252))
- When deleting notebook or tag, display name ([#1253](https://github.com/laurent22/joplin/issues/1253))
- API: Resolves [#1148](https://github.com/laurent22/joplin/issues/1148): Added support for search end-point and improved error handling
- Security: Updated a few packages to fix CVE-2018-16469
- Security: Updated parse-url package to fix CVE-2018-3774
- Various bug fixes and improvement following previous release.
- Fixes [#1251](https://github.com/laurent22/joplin/issues/1251): Handle Show Uncompleted Tasks option when selecting a tag

## [v1.0.134](https://github.com/laurent22/joplin/releases/tag/v1.0.134) - 2019-02-27T10:21:44Z

Note: this is the same as v132 but with a fix for the resizeable column bug.

- New: Experimental support for Mermaid graphs (This is **not** yet supported on mobile).
- New: Allow resizing sidebar columns.
- New: Resolves [#1198](https://github.com/laurent22/joplin/issues/1198): In search results, give more weight to more recent notes and less to completed to-dos
- Add shortcut to start a sync ([#1231](https://github.com/laurent22/joplin/issues/1231))
- Change notebook icon in toolbar and search result ([#1252](https://github.com/laurent22/joplin/issues/1252))
- When deleting notebook or tag, display name ([#1253](https://github.com/laurent22/joplin/issues/1253))
- API: Resolves [#1148](https://github.com/laurent22/joplin/issues/1148): Added support for search end-point and improved error handling
- Security: Updated a few packages to fix CVE-2018-16469
- Security: Updated parse-url package to fix CVE-2018-3774
- Various bug fixes and improvement following previous release.
- Fixes [#1251](https://github.com/laurent22/joplin/issues/1251): Handle Show Uncompleted Tasks option when selecting a tag

## [v1.0.132](https://github.com/laurent22/joplin/releases/tag/v1.0.132) - 2019-02-26T23:02:05Z

- New: Experimental support for Mermaid graphs (This is **not** yet supported on mobile).
- New: Allow resizing sidebar columns.
- New: Resolves [#1198](https://github.com/laurent22/joplin/issues/1198): In search results, give more weight to more recent notes and less to completed to-dos
- Add shortcut to start a sync ([#1231](https://github.com/laurent22/joplin/issues/1231))
- Change notebook icon in toolbar and search result ([#1252](https://github.com/laurent22/joplin/issues/1252))
- When deleting notebook or tag, display name ([#1253](https://github.com/laurent22/joplin/issues/1253))
- API: Resolves [#1148](https://github.com/laurent22/joplin/issues/1148): Added support for search end-point and improved error handling
- Security: Updated a few packages to fix CVE-2018-16469
- Security: Updated parse-url package to fix CVE-2018-3774
- Various bug fixes and improvement following previous release.
- Fixes [#1251](https://github.com/laurent22/joplin/issues/1251): Handle Show Uncompleted Tasks option when selecting a tag

## [v1.0.127](https://github.com/laurent22/joplin/releases/tag/v1.0.127) - 2019-02-14T23:12:48Z

This big release aims at improving the overall usability of the application and to make it more accessible to newcomers.

- New: Added Welcome notes the first time the app is launched to give an overview of Joplin and its features.
- New: Allow selecting editor path with dialog window
- New: Record last selected note IDs and restore it when opening notebook
- New: Resolves [#1041](https://github.com/laurent22/joplin/issues/1041): Added button to go back to previous note after clicking link
- New: Restore scroll position when switching notes
- New: When selecting multiple notes, display possible actions as buttons
- Fixed importing ENEX file when note incorrectly contains a reminder tag
- Fixes [#1142](https://github.com/laurent22/joplin/issues/1142): Disallow dropping notes on sidebar Notebook header
- Fixes [#1161](https://github.com/laurent22/joplin/issues/1161): Display highlighted text and other background colours and images when exporting to PDF or printing
- Fixes [#1200](https://github.com/laurent22/joplin/issues/1200): Note list was hidden when minimizing and maximizing window
- Fixed: Do not display tags that are not associated with any note
- Improved: Added 'Insert date time' option to menu
- Improved: Added a few more shortcuts for macOS and other platforms
- Improved: Added Usage link next to search box
- Improved: Allow using macOS App bundle as external editor, and improved error handling
- Improved: Better handle search queries that include dashes
- Improved: Delete note using keyboard
- Improved: Fixes [#1196](https://github.com/laurent22/joplin/issues/1196): Optimised loading speed of notes when switching from one to another (2-3 times faster)
- Improved: Group config options into sections
- Improved: Improve how new notes are created to make it more reliable
- Improved: Improve styling and layout of notes in note viewer
- Improved: Keep synchronise button and status at bottom of side bar
- Improved: Made confirmation buttons sticky on Config screen
- Improved: Select notes in note list using arrow keys
- Improved: Toggle todo checkbox using SPACE key
- Improved: Use arrow to move between sidebar items, and added shortcuts to focus different elements
- Improved: Use ENTER and ESCAPE to go to next search result or to close search bar
- Improved: Use SPACE to collapse or expand a folder in sidebar
- Improved: When deleting note, display title or number of notes
- Improved: Highlight row backgroung in table
- Improved: Printing page - checkboxes and background colours and images are now printed correctly
- Improved: Add styling to the scrollbars in text editor and viewer ([#1204](https://github.com/laurent22/joplin/issues/1204))
- Updated translations and added Turkish language (thanks Zorbey Doğangüneş)
- API: Allow specifying item ID for any item

## [v1.0.126](https://github.com/laurent22/joplin/releases/tag/v1.0.126) - 2019-02-09T19:46:16Z

- New: Added Welcome notes the first time the app is launched to give an overview of Joplin and its features.
- New: Allow selecting editor path with dialog window
- New: Record last selected note IDs and restore it when opening notebook
- New: Resolves [#1041](https://github.com/laurent22/joplin/issues/1041): Added button to go back to previous note after clicking link
- New: Restore scroll position when switching notes
- New: When selecting multiple notes, display possible actions as buttons
- Fixed importing ENEX file when note incorrectly contains a reminder tag
- Fixes [#1142](https://github.com/laurent22/joplin/issues/1142): Disallow dropping notes on sidebar Notebook header
- Fixes [#1161](https://github.com/laurent22/joplin/issues/1161): Display highlighted text and other background colours and images when exporting to PDF or printing
- Improved: Added 'Insert date time' option to menu
- Improved: Added a few more shortcuts for macOS and other platforms
- Improved: Added Usage link next to search box
- Improved: Allow using macOS App bundle as external editor, and improved error handling
- Improved: Better handle search queries that include dashes
- Improved: Delete note using keyboard
- Improved: Fixes [#1196](https://github.com/laurent22/joplin/issues/1196): Optimised loading speed of notes when switching from one to another (2-3 times faster)
- Improved: Group config options into sections
- Improved: Improve how new notes are created to make it more reliable
- Improved: Improve styling and layout of notes in note viewer
- Improved: Keep synchronise button and status at bottom of side bar
- Improved: Made confirmation buttons sticky on Config screen
- Improved: Move up and down in note list using arrow keys
- Improved: Toggle todo checkbox using SPACE key
- Improved: Use arrow to move between sidebar items, and added shortcuts to focus different elements
- Improved: Use ENTER and ESCAPE to go to next search result or to close search bar
- Improved: Use SPACE to collapse or expand a folder in sidebar
- Improved: When deleting note, display title or number of notes
- API: Allow specifying item ID for any item

## [v1.0.125](https://github.com/laurent22/joplin/releases/tag/v1.0.125) - 2019-01-26T18:14:33Z

- New: Added support for pre-releases - in the options you can now choose to receive pre-releases too.
- New: Added version info to auto-update dialog
- New: Resolves [#1099](https://github.com/laurent22/joplin/issues/1099): Show Markdown images in external editor
- Improved: Better multi-language support in search engine. Should now work better with languages like Russian, French, Chinese, Japanese or Korean, as well as any language with accents.
- Improved: Search keyword highlighting
- Improved local search by highlighting even partial matches
- Fixes [#1126](https://github.com/laurent22/joplin/issues/1126): Open Katex link in external browser instead of inside app
- Fixes [#769](https://github.com/laurent22/joplin/issues/769): Disable META tags in Markdown viewers
- Improved: Handle ESC key press to cancel the NotePropertiesDialog ([#1125](https://github.com/laurent22/joplin/issues/1125))
- Fixes [#1137](https://github.com/laurent22/joplin/issues/1137): Fixed regression on SeaFile sync

## [v1.0.120](https://github.com/laurent22/joplin/releases/tag/v1.0.120) - 2019-01-10T21:42:53Z

- New: Adds functionality to toggle the notebooks and tags on the sidebar. ([#1002](https://github.com/laurent22/joplin/issues/1002))
- Resolves [#1059](https://github.com/laurent22/joplin/issues/1059): Fixed behaviour of export to PDF and print
- Fix window manager icon on linux ([#1110](https://github.com/laurent22/joplin/issues/1110))
- Fixed file url issue ([#1054](https://github.com/laurent22/joplin/issues/1054))
- Fixed keyword highlighting bug
- Fix markdown code for checked checkbox ([#1113](https://github.com/laurent22/joplin/issues/1113))
- Apply zoom and editorfont updates without needing to restart ([#1109](https://github.com/laurent22/joplin/issues/1109))
- Updated many translations

## [v1.0.119](https://github.com/laurent22/joplin/releases/tag/v1.0.119) - 2018-12-18T12:40:22Z

Important: This release might be slow on startup due to the need to index all the notes, especially if you have many of them with lots of content. The best is simply to wait for it even if it takes several minutes. This is just a one off and afterwards startup time will be the same as before.

- New: Fast full text search engine. Works with multiple terms, support for prefixes, can restrict search to either note title or body. See https://joplin.cozic.net/#searching for more info.
- New: Search within current note (Ctrl+F).
- New: Add separate editor font size option ([#1027](https://github.com/laurent22/joplin/issues/1027))
- Changed: Changed global search shortcut to F6.
- Fixes [#808](https://github.com/laurent22/joplin/issues/808) (maybe): Added fix for Nginx 404 error issue.
- Fixed: Prevent sync infinite loop under some rare conditions (only happens when manually modifying files on sync target, which should not be done anyway).
- Fixes [#476](https://github.com/laurent22/joplin/issues/476) (maybe): Trying to fix notification flood. Added more log statements in case something goes wrong.
- Fixes [#1039](https://github.com/laurent22/joplin/issues/1039): Always print or export to PDF using light theme
- Fixes [#1033](https://github.com/laurent22/joplin/issues/1033): Handle hard break when rendering Markdown to HTML

## [v1.0.118](https://github.com/laurent22/joplin/releases/tag/v1.0.118) - 2019-01-11T08:34:13Z

Important: This release might be slow on startup due to the need to index all the notes, especially if you have many of them with lots of content. The best is simply to wait for it even if it takes several minutes. This is just a one off and afterwards startup time will be the same as before.

- New: Fast full text search engine. Works with multiple terms, support for prefixes, can restrict search to either note title or body. See https://joplin.cozic.net/#searching for more info.
- New: Search within current note (Ctrl+F).
- New: Add separate editor font size option ([#1027](https://github.com/laurent22/joplin/issues/1027))
- Changed: Changed global search shortcut to F6.
- Fixes [#808](https://github.com/laurent22/joplin/issues/808) (maybe): Added fix for Nginx 404 error issue.
- Fixed: Prevent sync infinite loop under some rare conditions (only happens when manually modifying files on sync target, which should not be done anyway).
- Fixes [#476](https://github.com/laurent22/joplin/issues/476) (maybe): Trying to fix notification flood. Added more log statements in case something goes wrong.
- Fixes [#1039](https://github.com/laurent22/joplin/issues/1039): Always print or export to PDF using light theme
- Fixes [#1033](https://github.com/laurent22/joplin/issues/1033): Handle hard break when rendering Markdown to HTML

## [v1.0.117](https://github.com/laurent22/joplin/releases/tag/v1.0.117) - 2018-11-24T12:05:24Z

- New: Resolves [#996](https://github.com/laurent22/joplin/issues/996): Allow editing multiple notes in external editor
- New: Resolves [#846](https://github.com/laurent22/joplin/issues/846): Set resource path to correct relative path so that for example images show up in Markdown viewers.
- Fixes [#906](https://github.com/laurent22/joplin/issues/906): Fixed text editor path issue on Windows
- Fixes [#968](https://github.com/laurent22/joplin/issues/968): Export resources specified with a title
- Fixes [#995](https://github.com/laurent22/joplin/issues/995): Disabled tag bar for now until performance issues are resolved.

## [v1.0.116](https://github.com/laurent22/joplin/releases/tag/v1.0.116) - 2018-11-20T19:09:24Z

This is mostly a bug fix release following the recent v115 release.

- Fixes [#933](https://github.com/laurent22/joplin/issues/933): Handle internal links from HTML and from MD.
- Fixes [#979](https://github.com/laurent22/joplin/issues/979): Fixed regression that was causing bottom of notes to be partially hidden.
- Fixes [#992](https://github.com/laurent22/joplin/issues/992): Allow non-ASCII chars when exporting MD and handle duplicate filenames
- Fixes [#985](https://github.com/laurent22/joplin/issues/985): Add missing syntax highlighting for dark theme
- Fixes [#991](https://github.com/laurent22/joplin/issues/991): Add dark theme to note properties dialog

## [v1.0.115](https://github.com/laurent22/joplin/releases/tag/v1.0.115) - 2018-11-16T16:52:02Z

This is a rather large release which includes many of the pull requests that were submitted during Hacktoberfest, plus some extra improvements and bug fixes. Many thanks to all the contributors!

- New: Adds functionality to display tags under the open note. ([#893](https://github.com/laurent22/joplin/issues/893))
- New: Joplin desktop Dark Mode ([#921](https://github.com/laurent22/joplin/issues/921))
- New: Add support for custom css across all notes ([#925](https://github.com/laurent22/joplin/issues/925))
- New: Show note title in pdf export ([#890](https://github.com/laurent22/joplin/issues/890)) ([#937](https://github.com/laurent22/joplin/issues/937))
- New: Display number of resources being fetched in side bar
- New: Export notes to JSON ([#912](https://github.com/laurent22/joplin/issues/912), issues/912). ([#927](https://github.com/laurent22/joplin/issues/927))
- New: Further (invisible) changes on how resources are downloaded to prepare for better resource handling.
- Fix: Resolves [#918](https://github.com/laurent22/joplin/issues/918): Skip properties that are on sync target but not handled by local client
- Fix: Fixes [#952](https://github.com/laurent22/joplin/issues/952): Upgraded Katex lib to fix bug
- Fix: Fixes [#953](https://github.com/laurent22/joplin/issues/953) (maybe): Improved the way internal links to notes are loaded to make it more reliable
- Fix: Fix image fetching error for URLs that contain query parameters.
- API: Allow setting the ID of newly created notes.
- Renewed code signing certificate.

## [v1.0.114](https://github.com/laurent22/joplin/releases/tag/v1.0.114) - 2018-10-24T20:14:10Z

- Fixes [#832](https://github.com/laurent22/joplin/issues/832): Enex import: Don't add extra line breaks at the beginning of list item when it contains a block element
- Fixes [#798](https://github.com/laurent22/joplin/issues/798): Enable Select All shortcut in macOS
- API: Fixed handling of PUT method and log errors to file
- Api: Fixes [#843](https://github.com/laurent22/joplin/issues/843): Fixed regression that was preventing resource metadata from being downloaded
- Fixes [#847](https://github.com/laurent22/joplin/issues/847): Prevent view from scrolling to top when clicking checkbox and editor not visible
- Resolves [#751](https://github.com/laurent22/joplin/issues/751): Allow switching between todo and note when multiple notes are selected
- Fixed potential crash that can happen if editor is not ready
- Prevent URLs added via A tag from being opened inside app
- Fixes [#853](https://github.com/laurent22/joplin/issues/853): Replace characters to equivalent US-ASCII ones when exporting files
- Improved the way resources are loaded to prepare to allow making downloading resources optional, and to make sync faster
- Fixes [#312](https://github.com/laurent22/joplin/issues/312) (maybe): Removed power saving feature, which wasn\'t doing anything and added a possible fix to the UI freezing issue on Linux
- Improved: Handle internal anchors
- Improved Linux install script

## [v1.0.111](https://github.com/laurent22/joplin/releases/tag/v1.0.111) - 2018-09-30T20:15:09Z

This is mainly a release to fix a bug related to the new IMG tag support.

- Electron: Resolves [#820](https://github.com/laurent22/joplin/issues/820): Allow dragging and dropping a note in another note to create a link
- Electron: Fixes resources being incorrectly auto-deleted when inside an IMG tag
- API: Allow downloading a resource data via `/resources/:id/file`

## [v1.0.110](https://github.com/laurent22/joplin/releases/tag/v1.0.110) - 2018-09-29T12:29:21Z

This is a release only to get the new API out. If you do not need the functionalities of this API or you don't know what it is, you can probably skip this version.

## [v1.0.109](https://github.com/laurent22/joplin/releases/tag/v1.0.109) - 2018-09-27T18:01:41Z

- New: Allow loading image resources in IMG html tags. For example, this is now possible: `<img src=":/a92ac34387ff467a8c839d201dcd39aa" width="50"/>`
- Security: Fixed security issue by enabling contextIsolation and proxying IPC messages via preload script. Thank you Yaroslav Lobachevski for discovering the issue.
- Fixes [#801](https://github.com/laurent22/joplin/issues/801): Replaced freegeoip which is no longer free with ip-api to enable again geo-location for notes.
- Fixes [#802](https://github.com/laurent22/joplin/issues/802): Scale note text correctly when using zoom
- Fixes [#805](https://github.com/laurent22/joplin/issues/805): Fixed app freezing when opening note in external editor and then creating new note
- Clipper: Fixes [#809](https://github.com/laurent22/joplin/issues/809): Saves full URL with note, including query parameters
- Clipper: Resolves [#681](https://github.com/laurent22/joplin/issues/681): Allow adding tags from Web Clipper
- Clipper: Fixes [#672](https://github.com/laurent22/joplin/issues/672): Make sure selected notebook is saved and restored correctly
- Clipper: Fixes [#817](https://github.com/laurent22/joplin/issues/817): Added support for PICTURE tags, which will fix issues with certain pages from which images were not being imported
- Clipper: Fixed importing certain images with sources that contain brackets
- Improved: Mostly an invisible change at this point, but the REST API has been refactored to allow adding more calls and to support third-party applications.

## [v1.0.108](https://github.com/laurent22/joplin/releases/tag/v1.0.108) - 2018-09-29T18:49:29Z

To test the latest security fix only. Won't be released officially.

## [v1.0.107](https://github.com/laurent22/joplin/releases/tag/v1.0.107) - 2018-09-16T19:51:07Z

- New: Resolves [#755](https://github.com/laurent22/joplin/issues/755): Added note properties dialog box to view and edit created time, updated time, source URL and geolocation
- Added Dutch (Netherlands) translation
- Added Romanian translation
- Fixes [#718](https://github.com/laurent22/joplin/issues/718): Allow recursively importing Markdown folder
- Fix [#764](https://github.com/laurent22/joplin/issues/764): Fix equation tag positioning
- Fixes [#710](https://github.com/laurent22/joplin/issues/710): Don't unwatch file when it is temporarily deleted
- Resolves [#781](https://github.com/laurent22/joplin/issues/781): Allow creating notebooks with duplicate titles to allow two notebooks with same name to exist under different parents
- Fixes [#799](https://github.com/laurent22/joplin/issues/799): Handle restricted_content error for Dropbox (skip files that cannot be uploaded to copyright or other Dropbox t&c violation)
- Provided script to install on Ubuntu (with icon)

## [v1.0.106](https://github.com/laurent22/joplin/releases/tag/v1.0.106) - 2018-09-08T15:23:40Z

Note: this release is no longer signed to avoid issues with renewing certificates. If you get a warning or the application cannot be installed, please report on the forum on GitHub.

- Resolves [#761](https://github.com/laurent22/joplin/issues/761): Highlight single tick code segments
- Resolves [#714](https://github.com/laurent22/joplin/issues/714): Allow starting application minimised in the tray icon
- Fixes [#759](https://github.com/laurent22/joplin/issues/759): Add border around code block when exporting to PDF
- Fixes [#697](https://github.com/laurent22/joplin/issues/697): Focus search text input after clearing search
- Fixes [#709](https://github.com/laurent22/joplin/issues/709): Now that HTML is supported in notes, remove BR tag replacement hack to fix newline issues.

## [v1.0.105](https://github.com/laurent22/joplin/releases/tag/v1.0.105) - 2018-09-05T11:29:36Z

- Resolves [#679](https://github.com/laurent22/joplin/issues/679): Drag a note on a tag to associate the tag.
- Resolves [#427](https://github.com/laurent22/joplin/issues/427): Import source-url from Enex files
- Resolves [#594](https://github.com/laurent22/joplin/issues/594): Enable support for SVG graphics
- New: replace the resource icon (for internal links) with the Joplin icon (from ForkAwesome)
- Update: Upgraded Katex to support new features
- Update: Improve speed of loading notes that include many resources, and prevent UI from freezing
- Fixes [#653](https://github.com/laurent22/joplin/issues/653): Don't detect horizontal rule as bullet list item
- Fixes [#113](https://github.com/laurent22/joplin/issues/113): Upgraded Ace Editor to try to fix Korean input issue (to be confirmed)

## [v1.0.104](https://github.com/laurent22/joplin/releases/tag/v1.0.104) - 2018-06-28T20:25:36Z

- New: Allow HTML in Markdown documents in a secure way.
- New: Resolves [#619](https://github.com/laurent22/joplin/issues/619): Context menu to cut, copy and paste. Also added menu to copy link in web view
- New: Resolves [#612](https://github.com/laurent22/joplin/issues/612): Allow duplicating a note
- New: Web Clipper: Support 'author' property
- Improved: Resolves [#647](https://github.com/laurent22/joplin/issues/647): Allow specifying text editor path and arguments in setting
- Improved: Optimised encryption and decryption of items so that it doesn't freeze the UI, especially on mobile
- Improved: Set PDF default file name
- Improved: Resolves [#644](https://github.com/laurent22/joplin/issues/644): Added support for .markdown extension when importing files
- Fixes [#634](https://github.com/laurent22/joplin/issues/634): Press ESC to dismiss dialog in non-English languages
- Fixes [#639](https://github.com/laurent22/joplin/issues/639): Make sure text wraps when printing or exporting as PDF
- Fixes [#646](https://github.com/laurent22/joplin/issues/646): Mentioned that TLS settings must be saved before checking sync config

## [v1.0.103](https://github.com/laurent22/joplin/releases/tag/v1.0.103) - 2018-06-21T19:38:13Z

- New: Resolves [#611](https://github.com/laurent22/joplin/issues/611): Allow opening and editing note in external editor
- New: [#628](https://github.com/laurent22/joplin/issues/628): Adds a shortcut to insert the date and time.
- New: Fixes [#343](https://github.com/laurent22/joplin/issues/343), Fixes [#191](https://github.com/laurent22/joplin/issues/191): Added options to specify custom TLS certificates
- New: Fixes [#343](https://github.com/laurent22/joplin/issues/343), Fixes [#191](https://github.com/laurent22/joplin/issues/191): Added options to ignore TLS cert errors to allow self-signed certificates on desktop and CLI
- Fixes [#626](https://github.com/laurent22/joplin/issues/626): Auto-completion for indented items
- Fixes [#632](https://github.com/laurent22/joplin/issues/632): Handle restricted_content error in Dropbox
- Fix: Revert [#554](https://github.com/laurent22/joplin/issues/554) to try to fix [#624](https://github.com/laurent22/joplin/issues/624): WebDAV error when syncing with SeaFile

## [v1.0.101](https://github.com/laurent22/joplin/releases/tag/v1.0.101) - 2018-06-17T18:35:11Z

This is a bug-fix release following v100 with the following fixes:

- Fixes [#623](https://github.com/laurent22/joplin/issues/623): Improved handling of text selection and fixed infinite loop (white screen bug)
- Fixes [#593](https://github.com/laurent22/joplin/issues/593): Resource should not be auto-deleted if they've never been linked to any note
- Fixes [#630](https://github.com/laurent22/joplin/issues/630): PDF export in context menu

## [v1.0.100](https://github.com/laurent22/joplin/releases/tag/v1.0.100) - 2018-06-14T17:41:43Z

- New: Added toolbar buttons for formatting text.
- New: Added Traditional Chinese and Catalan translations
- Fixed: Handle Nginx DAV PROPFIND responses correctly
- Fixes [#597](https://github.com/laurent22/joplin/issues/597): Also import sub-notebooks when importing JEX data
- Fixes [#600](https://github.com/laurent22/joplin/issues/600): Improved resuming of long sync operations so that it doesn't needlessly re-download the items from the beginning
- Fix: Try to display more info when there is a Dropbox API error

## [v1.0.99](https://github.com/laurent22/joplin/releases/tag/v1.0.99) - 2018-06-10T13:18:23Z

Note: This is the same as 1.0.97, but with a fix for the Linux version, which could not start anymore.

If you're using the web clipper, make sure to also update it!

- Updated: Auto-delete resources only after 10 days to handle some edge cases
- Clipper: Cleaner and more consistent clipper REST API, to facilitate third-party access
- Clipper: Fixes [#569](https://github.com/laurent22/joplin/issues/569): Make clipper service available on localhost only
- Clipper: Fixes [#573](https://github.com/laurent22/joplin/issues/573): Better handling of certain code blocks

## [v1.0.97](https://github.com/laurent22/joplin/releases/tag/v1.0.97) - 2018-06-09T19:23:34Z

If you're using the web clipper, make sure to also update it!

- Updated: Auto-delete resources only after 10 days to handle some edge cases
- Clipper: Cleaner and more consistent clipper REST API, to facilitate third-party access
- Clipper: Fixes [#569](https://github.com/laurent22/joplin/issues/569): Make clipper service available on localhost only
- Clipper: Fixes [#573](https://github.com/laurent22/joplin/issues/573): Better handling of certain code blocks

## [v1.0.96](https://github.com/laurent22/joplin/releases/tag/v1.0.96) - 2018-05-26T16:36:39Z

This release is mainly to fix various issues with the recently released Web Clipper.

- Clipper: Allow selecting folder to add the note to
- Clipper: Fixed issue when taking screenshot
- Clipper: Added Firefox extension

## [v1.0.95](https://github.com/laurent22/joplin/releases/tag/v1.0.95) - 2018-05-25T13:04:30Z

- New: A web clipper is now available - it allows saving web pages and screenshots from your browser to Joplin. To start using it, go to Options > Web Clipper Options. Note that this feature is a beta release so there might still be some issues. Feedback is welcome.
- Fix: Identify another Dropbox missing auth error, to allow resetting the token
- Fixes [#531](https://github.com/laurent22/joplin/issues/531): Get WebDAV to work with certain servers that require a trailing slash on directories

## [v1.0.94](https://github.com/laurent22/joplin/releases/tag/v1.0.94) - 2018-05-21T20:52:59Z

- New: Allow copying path of resources
- New: Adds functionality to allow for renaming of tags.
- Improved: Evernote import
- Fixes [#536](https://github.com/laurent22/joplin/issues/536): Allow changing sync target file path
- Fixes [#535](https://github.com/laurent22/joplin/issues/535): Note preview was not always updated when it should
- Fixes [#491](https://github.com/laurent22/joplin/issues/491): Handle non-standard ports and better handling of fetchBlob errors
- Fixes [#528](https://github.com/laurent22/joplin/issues/528): Set translation in bridge functions too
- Fixes [#527](https://github.com/laurent22/joplin/issues/527): Remove empty section separators from menus
- Fix: Added styles to fix margin bottom for  nested lists

## [v1.0.93](https://github.com/laurent22/joplin/releases/tag/v1.0.93) - 2018-05-14T11:36:01Z

- New: A portable version is now available. To install it simply copy the file "JoplinPortable.exe" to your USB device. See the documentation for more information - https://joplin.cozic.net/#desktop-applications
- Improved: Made import of ENEX files more robust and accurate
- Improved: Auto-update process should be more reliable.
- Fixed: Made sync-after-save interval longer to made synchronisations less frequent.

## [v1.0.91](https://github.com/laurent22/joplin/releases/tag/v1.0.91) - 2018-05-10T14:48:04Z

Same as v1.0.90 but with a fix for [#510](https://github.com/laurent22/joplin/issues/510) 

- New: Resolves [#345](https://github.com/laurent22/joplin/issues/345): Option to hide completed todos
- New: Resolves [#200](https://github.com/laurent22/joplin/issues/200), Resolves [#416](https://github.com/laurent22/joplin/issues/416): Allow attaching images by pasting them in. Allow attaching files by drag and dropping them. Insert attachment at cursor position.
- Improved: Resolves [#443](https://github.com/laurent22/joplin/issues/443): Various optimisations to make dealing with large notes easier and make Katex re-rendering faster
- Fixes [#481](https://github.com/laurent22/joplin/issues/481): Keyboard shortcuts were not working when text editor had focus in macOS
- Fixed: Tag display
- Security: Resolves [#500](https://github.com/laurent22/joplin/issues/500): Fixed XSS security vulnerability

## [v1.0.89](https://github.com/laurent22/joplin/releases/tag/v1.0.89) - 2018-05-09T13:05:05Z

- New: Resolves [#122](https://github.com/laurent22/joplin/issues/122): Added support for sub-notebooks. Please see doc for more info: https://joplin.cozic.net/#sub-notebooks
- Improved: Export/Import links to notes
- Fixes [#480](https://github.com/laurent22/joplin/issues/480): Ignore invalid flag automatically passed by macOS
- Fixes [#61](https://github.com/laurent22/joplin/issues/61): Handle path that ends with slash for file system sync

## [v1.0.85](https://github.com/laurent22/joplin/releases/tag/v1.0.85) - 2018-05-01T21:08:24Z

Note: This is the same as v84 but with the note creation bug fixed.

- New: Windows 32-bit support
- New: Button to toggle the sidebar
- Improved: Better handling of resources that are incorrectly flagged as encrypted
- Improved: Various changes to make PortableApps format work
- Improved: Resolves [#430](https://github.com/laurent22/joplin/issues/430): Support lowercase "x" in Markdown checkboxes
- Fixes [#346](https://github.com/laurent22/joplin/issues/346): Make sure links have an address when exporting to PDF
- Fixes [#355](https://github.com/laurent22/joplin/issues/355): Set undo state properly when loading new note to prevent overwriting content of one note with another
- Fixes [#363](https://github.com/laurent22/joplin/issues/363): indentation and rendering of lists
- Fixes [#470](https://github.com/laurent22/joplin/issues/470): Make it clear that spaces in URLs are invalid.
- Fixes [#434](https://github.com/laurent22/joplin/issues/434): Handle Katex block mode

## [v1.0.83](https://github.com/laurent22/joplin/releases/tag/v1.0.83) - 2018-04-04T19:43:58Z

- Fixes [#365](https://github.com/laurent22/joplin/issues/365): Cannot paste in Dropbox screen

## [v1.0.82](https://github.com/laurent22/joplin/releases/tag/v1.0.82) - 2018-03-31T19:16:31Z

- Updated translations

## [v1.0.81](https://github.com/laurent22/joplin/releases/tag/v1.0.81) - 2018-03-28T08:13:58Z

- New: Dropbox synchronisation
- New: Czech translation
- Fixes [#318](https://github.com/laurent22/joplin/issues/318): Display full links in editor
- Resolves [#329](https://github.com/laurent22/joplin/issues/329): Add link to E2EE doc

## [v1.0.79](https://github.com/laurent22/joplin/releases/tag/v1.0.79) - 2018-03-23T18:00:11Z

- New: Resolves [#144](https://github.com/laurent22/joplin/issues/144), Resolves [#311](https://github.com/laurent22/joplin/issues/311): Highlight search results and search in real time. Associated Ctrl+F with searching.
- New: Resolves [#73](https://github.com/laurent22/joplin/issues/73): Show modified date next to note in editor
- New: Danish translation
- Improved: Fixes [#318](https://github.com/laurent22/joplin/issues/318), Fixes [#317](https://github.com/laurent22/joplin/issues/317): ENEX: Improved handling and rendering of plain text links. Improved detection and import of resources. Improved import of tables.
- Updated: Resolves [#307](https://github.com/laurent22/joplin/issues/307): Use blue colour for sidebar, to be consistent with mobile app and logo
- Updated: Translations

## [v1.0.78](https://github.com/laurent22/joplin/releases/tag/v1.0.78) - 2018-03-17T15:27:18Z

- Improved: Handle deletion of resources that are not linked to any note

## [v1.0.77](https://github.com/laurent22/joplin/releases/tag/v1.0.77) - 2018-03-16T15:12:35Z

Note: This fixes an invalid database upgrade in the previous version.

- New: Resolves [#237](https://github.com/laurent22/joplin/issues/237): Export to PDF and print option
- New: Resolves [#154](https://github.com/laurent22/joplin/issues/154): No longer used resources are automatically deleted after approximately 24h
- Improved: Resolves [#298](https://github.com/laurent22/joplin/issues/298): Removed extraneous first characters from auto-title
- Improved: Made WebDAV options dynamics so that changing username or password doesn't require restarting the app
- Fix: Fixes [#291](https://github.com/laurent22/joplin/issues/291): Crash with empty backtick
- Fix: Fixes [#292](https://github.com/laurent22/joplin/issues/292): Improved auto-update feature and fixed incorrect notifications
- Fix: Signed executables on Windows
- Updated Russian, German, Portuguese, Spanish and French translations. Many thanks to the translators!

## [v1.0.72](https://github.com/laurent22/joplin/releases/tag/v1.0.72) - 2018-03-14T09:44:35Z

- New: Allow exporting only selected notes or notebook
- New: Resolves [#266](https://github.com/laurent22/joplin/issues/266): Allow setting text editor font family
- New: Display icon next to resources and allow downloading them from Electron client
- Improved: Optimised sync when dealing with many items, in particular when using Nextcloud or WebDAV
- Improved: Display last sync error unless it's a timeout or network error
- Improved: Fixes [#268](https://github.com/laurent22/joplin/issues/268): Improve error message for invalid flags
- Fix: Fixes [#271](https://github.com/laurent22/joplin/issues/271): Sort by created time was not respected

## [v1.0.70](https://github.com/laurent22/joplin/releases/tag/v1.0.70) - 2018-02-28T20:04:30Z

- New: Resolves [#97](https://github.com/laurent22/joplin/issues/97): Export to JEX format or RAW format
- New: Import JEX and RAW format
- New: Resolves [#52](https://github.com/laurent22/joplin/issues/52): Import Markdown files or directory
- New: Allow sorting notes by various fields
- New: Resolves [#243](https://github.com/laurent22/joplin/issues/243): Added black and white tray icon for macOS
- Fix: [#247](https://github.com/laurent22/joplin/issues/247): Unreadable error messages when checking for updates
- Fix: Fixed sync interval sorting order
- Fix: [#256](https://github.com/laurent22/joplin/issues/256): Check that no other instance of Joplin is running before launching a new one

## [v1.0.67](https://github.com/laurent22/joplin/releases/tag/v1.0.67) - 2018-02-19T22:51:08Z

- Fixed: [#217](https://github.com/laurent22/joplin/issues/217): Display a message when the note has no content and only the note viewer is visible
- Fixed: [#240](https://github.com/laurent22/joplin/issues/240): Tags should be handled in a case-insensitive way
- Fixed: [#241](https://github.com/laurent22/joplin/issues/241): Ignore response for certain WebDAV calls to improve compatibility with some services.
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
- Fixed: [#201](https://github.com/laurent22/joplin/issues/201), [#216](https://github.com/laurent22/joplin/issues/216): Make sure only one update check can run at a time, and improved modal dialog boxes

## [v1.0.63](https://github.com/laurent22/joplin/releases/tag/v1.0.63) - 2018-02-14T19:40:36Z

- Improved the way settings are changed. Should also fixed issue with sync context being accidentally broken.
- Improved WebDAV driver compatibility with some services (eg. Seafile)

## [v1.0.62](https://github.com/laurent22/joplin/releases/tag/v1.0.62) - 2018-02-12T20:19:58Z

- Fixes [#205](https://github.com/laurent22/joplin/issues/205): Importing Evernote notes while on import page re-imports previous import
- Fixes [#209](https://github.com/laurent22/joplin/issues/209): Items with non-ASCII characters end up truncated on Nextcloud
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
- Fixes [#155](https://github.com/laurent22/joplin/issues/155): Caret alignment issue with Russian text
- Dutch translation (Thanks @tcassaert)
- Removed certain log statements so that sensitive info doesn't end up in logs
- Fix: Handle case where resource blob is missing during sync

## [v0.10.47](https://github.com/laurent22/joplin/releases/tag/v0.10.47) - 2018-01-16T17:27:17Z

- Improved the way new note are created, and automatically add a title. Made saving and loading notes more reliable.
- Fix: race condition when a note is being uploaded while it's being modified in the text editor
- Fixes [#129](https://github.com/laurent22/joplin/issues/129): Tags are case insensitive
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
- Fixes [#85](https://github.com/laurent22/joplin/issues/85): Don't record deleted_items entries for folders deleted via sync
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

- Fixes [#55](https://github.com/laurent22/joplin/issues/55): Added support for HTML tags found in ENEX files: colgroup, col, ins, kbd, address, caption, var, area, map
- Resolve [#7](https://github.com/laurent22/joplin/issues/7): Show storage location in Options screen
- Fixes [#84](https://github.com/laurent22/joplin/issues/84): Fields losing focus in Config screen
- Fixes [#86](https://github.com/laurent22/joplin/issues/86): App icon missing on Linux
- Fixes [#87](https://github.com/laurent22/joplin/issues/87): Show warningn when deleting notebook that contains notes.
- Fixes [#3](https://github.com/laurent22/joplin/issues/3): Paths with '.' would cause JSX compilation to fail

## [v0.10.38](https://github.com/laurent22/joplin/releases/tag/v0.10.38) - 2017-12-08T10:12:06Z

- Dialog to export sync status
- Enabled support for filesystem sync

## [v0.10.37](https://github.com/laurent22/joplin/releases/tag/v0.10.37) - 2017-12-07T19:38:05Z

- Better handling of items that cannot be synchronised (for example, if they exceed the max file size supported by the target)
- Added Synchronisation Status screen
- Improved Enex support:
    - Better handling of notes containing entire web pages (such as when imported via Web Clipper)
    - Support for `<img>` tags
    - Support for various other tags
    - Improved importing web pages that contain tables within tables. In which case the outer tables (which are usually the website layout) are rendered as regular text block and only the inner tables are actually rendered as tables.
     - Fixed many other minor warnings and errors
- Allow setting installation directory in Windows

## [v0.10.36](https://github.com/laurent22/joplin/releases/tag/v0.10.36) - 2017-12-05T09:34:40Z

- All: Improved synchronisation when sync target has unreliable timestamps
- All: Fixed display issue - when items were modified during sync it could result in blank rows being displayed in note lists.

## [v0.10.35](https://github.com/laurent22/joplin/releases/tag/v0.10.35) - 2017-12-02T15:56:08Z

- All: Fixed sync issue and database migration issue

## [v0.10.34](https://github.com/laurent22/joplin/releases/tag/v0.10.34) - 2017-12-02T14:50:28Z

- All: fixed database creation error
- All: Improved Evernote import for blockquotes and sup tags
- CLI: Fixed crash when inputting command without closed quote
- CLI: Allow Backspace key to delete items on macOS
- Electron: Fixed header font sizes
- Electron: Fix [#33](https://github.com/laurent22/joplin/issues/33): Allow copy and paste in OneDrive login
- Electron: Fixes [#32](https://github.com/laurent22/joplin/issues/32): Error when manually input alarm date
- Electron: Allow attaching multiple files
- All: Allow attaching files of unknown mime type
- All: Added error for OneDrive for Business

## [v0.10.33](https://github.com/laurent22/joplin/releases/tag/v0.10.33) - 2017-12-02T13:20:39Z

- Improved Evernote import for blockquotes and sup tags

## [v0.10.31](https://github.com/laurent22/joplin/releases/tag/v0.10.31) - 2017-12-01T09:56:44Z

- Fixes [#22](https://github.com/laurent22/joplin/issues/22) - keyboard cursor jumps while typing.

## [v0.10.30](https://github.com/laurent22/joplin/releases/tag/v0.10.30) - 2017-11-30T20:28:16Z

- Added Spanish locale (thank you Erick Rodríguez Ponce)
- Fixed copy/cut/paste issue in macOS
- Fixed checkbox issue in Option screen.

## [v0.10.28](https://github.com/laurent22/joplin/releases/tag/v0.10.28) - 2017-11-30T01:07:46Z

- Added toolbar to set alarms and attach files
- Fixed Evernote import of certain images
- Fixed note update issue

## [v0.10.26](https://github.com/laurent22/joplin/releases/tag/v0.10.26) - 2017-11-29T16:02:17Z

- Added support for alarms (notifications)
- Fixed scrolling issue for long notes
- Improved OneDrive login and possibly fixed rare error

## [v0.10.25](https://github.com/laurent22/joplin/releases/tag/v0.10.25) - 2017-11-24T14:27:49Z

- Allow multi-selection on note lists
- Allow drag and drop of notes
- Hide invalid characters (non-breaking spaces) in editor


## [v0.10.23](https://github.com/laurent22/joplin/releases/tag/v0.10.23) - 2017-11-21T19:38:41Z



## [v0.10.22](https://github.com/laurent22/joplin/releases/tag/v0.10.22) - 2017-11-20T21:45:57Z



## [v0.10.21](https://github.com/laurent22/joplin/releases/tag/v0.10.21) - 2017-11-18T00:53:15Z



## [v0.10.20](https://github.com/laurent22/joplin/releases/tag/v0.10.20) - 2017-11-17T17:18:25Z



## [v0.10.19](https://github.com/laurent22/joplin/releases/tag/v0.10.19) - 2017-11-20T18:59:48Z


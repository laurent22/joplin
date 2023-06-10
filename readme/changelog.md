# Joplin changelog

## [v2.11.9](https://github.com/laurent22/joplin/releases/tag/v2.11.9) (Pre-release) - 2023-06-06T16:23:27Z

- Improved: Add support for AVIF image format ([#8175](https://github.com/laurent22/joplin/issues/8175))
- Improved: Improved word count when em-dash is used ([#8083](https://github.com/laurent22/joplin/issues/8083))
- Improved: Fix white screen issue ([8b578c5](https://github.com/laurent22/joplin/commit/8b578c5))
- Improved: Updated packages aws, buildTools, tar (v6.1.15)
- Fixed: "New note" buttons so large they occlude Search ([#8249](https://github.com/laurent22/joplin/issues/8249)) ([#8159](https://github.com/laurent22/joplin/issues/8159) by Rio Sinnott)

## [v2.11.6](https://github.com/laurent22/joplin/releases/tag/v2.11.6) (Pre-release) - 2023-05-31T20:13:08Z

- Improved: When resetting the master password, also create a new master key with that password ([e647775](https://github.com/laurent22/joplin/commit/e647775))
- Fixed: Don't display "obsolete encryption method" message if the key is disabled ([#8025](https://github.com/laurent22/joplin/issues/8025)) ([#7933](https://github.com/laurent22/joplin/issues/7933) by [@gitstart](https://github.com/gitstart))
- Fixed: Improve selection of active E2EE key ([#8254](https://github.com/laurent22/joplin/issues/8254))
- Fixed: Improve sidebar workaround for Linux w/Intel GPU ([#8126](https://github.com/laurent22/joplin/issues/8126)) ([#7506](https://github.com/laurent22/joplin/issues/7506) by Calum Lind)
- Fixed: Preserve Table Alignment When Editing a Note With the Rich Text Editor  ([#8214](https://github.com/laurent22/joplin/issues/8214)) ([#6431](https://github.com/laurent22/joplin/issues/6431) by Christopher O'Toole)

## [v2.11.5](https://github.com/laurent22/joplin/releases/tag/v2.11.5) (Pre-release) - 2023-05-28T00:41:40Z

- Improved: Updated packages jsdom (v21.1.2), markdown-it-multimd-table (v4.2.2), react-select (v5.7.3), sass (v1.62.1), sharp (v0.32.1), tar (v6.1.14), yargs (v17.7.2)
- Fixed: Fix slow startup time ([#8087](https://github.com/laurent22/joplin/issues/8087))
- Security: Disable SVG tag support in editor to prevent XSS ([caf6606](https://github.com/laurent22/joplin/commit/caf6606)) (Vulnerability discovered by [RyotaK](https://ryotak.net/))
- Security: Prevent XSS by sanitizing certain HTML attributes ([9e90d90](https://github.com/laurent22/joplin/commit/9e90d90)) (Vulnerability discovered by [RyotaK](https://ryotak.net/))

## [v2.10.19](https://github.com/laurent22/joplin/releases/tag/v2.10.19) - 2023-05-17T12:25:41Z

- Improved: Improved handling of items with duplicate IDs when synchronising with Joplin Cloud or Server ([d4c43a8](https://github.com/laurent22/joplin/commit/d4c43a8))
- Security: Fixed possible XSS injection (CVE-2023-33726) ([b26bc9e](https://github.com/laurent22/joplin/commit/b26bc9e)) (Discovery and PoC by [@maple3142](https://twitter.com/maple3142))
- Security: Prevent XSS and potential RCE when using a special HTML tag (CVE-2023-33727) ([19bdda2](https://github.com/laurent22/joplin/commit/19bdda2)) (Discovery and PoC by [Yaniv Nizry](https://twitter.com/YNizry) ([SonarSource](https://www.sonarsource.com/)))

## [v2.11.4](https://github.com/laurent22/joplin/releases/tag/v2.11.4) (Pre-release) - 2023-05-16T10:02:21Z

- Fixed: Fix slow startup time ([#8087](https://github.com/laurent22/joplin/issues/8087))

## [v2.11.3](https://github.com/laurent22/joplin/releases/tag/v2.11.3) (Pre-release) - 2023-05-16T09:09:57Z

- Improved: Add support for `--safe-mode` command line flag ([#7919](https://github.com/laurent22/joplin/issues/7919)) ([#7889](https://github.com/laurent22/joplin/issues/7889) by Arun Kumar)
- Improved: Added export graph button for Mermaid ([#7958](https://github.com/laurent22/joplin/issues/7958)) ([#6101](https://github.com/laurent22/joplin/issues/6101) by Arun Kumar)
- Improved: Auto-detect locale on startup ([052a829](https://github.com/laurent22/joplin/commit/052a829))
- Improved: Cache code blocks in notes to speed up rendering ([#7867](https://github.com/laurent22/joplin/issues/7867))
- Improved: Compress installer to reduce size ([#8068](https://github.com/laurent22/joplin/issues/8068)) ([#8028](https://github.com/laurent22/joplin/issues/8028) by Arun Kumar)
- Improved: Improved handling of items with duplicate IDs ([a0b707c](https://github.com/laurent22/joplin/commit/a0b707c))
- Improved: Remove custom PDF viewer to reduce application size ([#8028](https://github.com/laurent22/joplin/issues/8028))
- Improved: Translate Welcome notes ([#8154](https://github.com/laurent22/joplin/issues/8154))
- Improved: Updated packages aws, fs-extra (v11.1.1), jsdom (v21.1.1), markdown-it-multimd-table (v4.2.1), nanoid (v3.3.6), node-persist (v3.1.3), react-select (v5.7.2), reselect (v4.1.8), sass (v1.60.0), sharp (v0.32.0), sqlite3 (v5.1.6), style-loader (v3.3.2), styled-components (v5.3.9), turndown (v7.1.2), yargs (v17.7.1)
- Fixed: Application cannot be installed on Windows 10 in some cases ([#8149](https://github.com/laurent22/joplin/issues/8149))
- Fixed: Do not allow update for plugins incompatible with current version ([#7936](https://github.com/laurent22/joplin/issues/7936)) ([#4801](https://github.com/laurent22/joplin/issues/4801) by [@julien](https://github.com/julien))
- Fixed: Encode the non-ASCII characters in OneDrive URI ([#7868](https://github.com/laurent22/joplin/issues/7868)) ([#7851](https://github.com/laurent22/joplin/issues/7851) by Self Not Found)
- Fixed: Enter Key No Longer Saves and Closes The Tag Dialog ([#8072](https://github.com/laurent22/joplin/issues/8072))
- Fixed: Fix OneDrive sync attempting to call method on `null` variable ([#7987](https://github.com/laurent22/joplin/issues/7987)) ([#7986](https://github.com/laurent22/joplin/issues/7986) by Henry Heino)
- Fixed: Fix issue where search bar can randomly lose focus while searching ([489d677](https://github.com/laurent22/joplin/commit/489d677))
- Fixed: Fix note list blank space display problems ([#7888](https://github.com/laurent22/joplin/issues/7888)) ([#4124](https://github.com/laurent22/joplin/issues/4124) by Arun Kumar)
- Fixed: Fixed Linux tag display issues ([#8002](https://github.com/laurent22/joplin/issues/8002)) ([#8000](https://github.com/laurent22/joplin/issues/8000) by Arun Kumar)
- Fixed: Fixed icon when note is dragged across notebooks ([#7924](https://github.com/laurent22/joplin/issues/7924)) ([#7881](https://github.com/laurent22/joplin/issues/7881) by Arun Kumar)
- Fixed: Fixed issue with text disappearing within plugin-created zones when searching for text ([0c8de68](https://github.com/laurent22/joplin/commit/0c8de68))
- Fixed: Fixes crash when using multiple profiles along with certain plugins ([#8143](https://github.com/laurent22/joplin/issues/8143))
- Fixed: Removed `MasterKey` from Sync Status report ([#8026](https://github.com/laurent22/joplin/issues/8026)) ([#7940](https://github.com/laurent22/joplin/issues/7940) by Arun Kumar)
- Fixed: Skip the resources which haven't been downloaded yet when exporting ([#7843](https://github.com/laurent22/joplin/issues/7843)) ([#7831](https://github.com/laurent22/joplin/issues/7831) by Self Not Found)
- Fixed: With Custom Sort, new notes appear at bottom and later randomly "pop" to the top ([#7765](https://github.com/laurent22/joplin/issues/7765)) ([#7741](https://github.com/laurent22/joplin/issues/7741) by Tao Klerks)
- Security: Fixed possible XSS injection ([b26bc9e](https://github.com/laurent22/joplin/commit/b26bc9e)) (Discovery and PoC by [@maple3142](https://twitter.com/maple3142))
- Security: Prevent XSS and potential RCE when using a special HTML tag ([19bdda2](https://github.com/laurent22/joplin/commit/19bdda2)) (Discovery and PoC by [Yaniv Nizry](https://twitter.com/YNizry) ([SonarSource](https://www.sonarsource.com/)))

## [v2.10.18](https://github.com/laurent22/joplin/releases/tag/v2.10.18) - 2023-05-09T13:27:43Z

- Fixed: Application cannot be installed on Windows 10 in some cases ([#8149](https://github.com/laurent22/joplin/issues/8149))

## [v2.10.17](https://github.com/laurent22/joplin/releases/tag/v2.10.17) - 2023-05-08T17:27:28Z

- Fixed: Enter Key No Longer Saves and Closes The Tag Dialog ([#8072](https://github.com/laurent22/joplin/issues/8072))
- Fixed: Fixes crash when using multiple profiles along with certain plugins ([#8143](https://github.com/laurent22/joplin/issues/8143))

## [v2.10.16](https://github.com/laurent22/joplin/releases/tag/v2.10.16) - 2023-04-27T09:27:45Z

- Improved: Revert to "normal" package compression ([2e2feab](https://github.com/laurent22/joplin/commit/2e2feab))

## [v2.10.15](https://github.com/laurent22/joplin/releases/tag/v2.10.15) (Pre-release) - 2023-04-26T22:02:16Z

- Improved: Remove custom PDF viewer to reduce application size ([#8028](https://github.com/laurent22/joplin/issues/8028))
- Improved: Compress installer to reduce size ([#8068](https://github.com/laurent22/joplin/issues/8068)) ([#8028](https://github.com/laurent22/joplin/issues/8028))

## [v2.10.13](https://github.com/laurent22/joplin/releases/tag/v2.10.13) (Pre-release) - 2023-04-03T16:53:46Z

- Fixed: Encode the non-ASCII characters in OneDrive URI ([#7868](https://github.com/laurent22/joplin/issues/7868)) ([#7851](https://github.com/laurent22/joplin/issues/7851) by Self Not Found)
- Fixed: Fix OneDrive sync attempting to call method on `null` variable ([#7987](https://github.com/laurent22/joplin/issues/7987)) ([#7986](https://github.com/laurent22/joplin/issues/7986) by Henry Heino)
- Fixed: Fixed display of installed plugins in About box ([376e4eb](https://github.com/laurent22/joplin/commit/376e4eb))

## [v2.10.12](https://github.com/laurent22/joplin/releases/tag/v2.10.12) (Pre-release) - 2023-03-23T12:17:13Z

- Improved: Adjusted New Note and New to-do buttons' breakpoints to happen earlier ([#7961](https://github.com/laurent22/joplin/issues/7961) by [@julien](https://github.com/julien))

## [v2.10.11](https://github.com/laurent22/joplin/releases/tag/v2.10.11) (Pre-release) - 2023-03-17T10:54:02Z

- Fixed: Fixes text wrap on new buttons ([#7938](https://github.com/laurent22/joplin/issues/7938) by [@julien](https://github.com/julien))
- Fixed: List enabled plugins only in About Joplin and in alphabetical order ([#7923](https://github.com/laurent22/joplin/issues/7923)) ([#7920](https://github.com/laurent22/joplin/issues/7920) by [@julien](https://github.com/julien))

## [v2.10.10](https://github.com/laurent22/joplin/releases/tag/v2.10.10) (Pre-release) - 2023-03-13T23:16:37Z

- Fixed: Fix issue where search bar can randomly lose focus while searching ([bd42914](https://github.com/laurent22/joplin/commit/bd42914))
- Fixed: Fixed height when controls are on a single row ([#7912](https://github.com/laurent22/joplin/issues/7912)) ([#7907](https://github.com/laurent22/joplin/issues/7907) by [@julien](https://github.com/julien))

## [v2.10.9](https://github.com/laurent22/joplin/releases/tag/v2.10.9) (Pre-release) - 2023-03-12T16:16:45Z

- Improved: Always show new note buttons (Regression) ([#7850](https://github.com/laurent22/joplin/issues/7850) by [@julien](https://github.com/julien))
- Improved: Made note list controls responsive ([#7884](https://github.com/laurent22/joplin/issues/7884)) ([#7848](https://github.com/laurent22/joplin/issues/7848) by [@julien](https://github.com/julien))
- Improved: Paste as Text only working on hotkeys on Windows ([#7886](https://github.com/laurent22/joplin/issues/7886)) ([#7880](https://github.com/laurent22/joplin/issues/7880) by [@pedr](https://github.com/pedr))
- Fixed: Drag-dropping notes to top or bottom, in custom sort, is finicky ([#7777](https://github.com/laurent22/joplin/issues/7777)) ([#7776](https://github.com/laurent22/joplin/issues/7776) by Tao Klerks)
- Fixed: Linux notebook display bug ([#7897](https://github.com/laurent22/joplin/issues/7897)) ([#7506](https://github.com/laurent22/joplin/issues/7506) by Arun Kumar)

## [v2.10.8](https://github.com/laurent22/joplin/releases/tag/v2.10.8) (Pre-release) - 2023-02-26T12:53:55Z

- Improved: Note background does not change when theme automatically updated via system ([d1e545a](https://github.com/laurent22/joplin/commit/d1e545a))
- Fixed: Fixed clipping certain pages that contain images within links ([92cf5ab](https://github.com/laurent22/joplin/commit/92cf5ab))

## [v2.10.7](https://github.com/laurent22/joplin/releases/tag/v2.10.7) (Pre-release) - 2023-02-24T10:56:20Z

- New: Add a link to twitter inside the help menu ([#7796](https://github.com/laurent22/joplin/issues/7796) by [@pedr](https://github.com/pedr))
- Improved: Added "Move Line Up" and "Move Line Down" shortcuts ([#7755](https://github.com/laurent22/joplin/issues/7755)) ([#7692](https://github.com/laurent22/joplin/issues/7692) by [@Polaris66](https://github.com/Polaris66))
- Improved: Stop synchronization with unsupported WebDAV providers ([#7819](https://github.com/laurent22/joplin/issues/7819)) ([#7661](https://github.com/laurent22/joplin/issues/7661) by [@julien](https://github.com/julien))
- Fixed: Make note sort update logic use correct prior sort and drop-grouping ([#7737](https://github.com/laurent22/joplin/issues/7737)) ([#7731](https://github.com/laurent22/joplin/issues/7731) by Tao Klerks)
- Fixed: Markdown + Front Matter export fails when tag(s) lost ([#7820](https://github.com/laurent22/joplin/issues/7820)) ([#7782](https://github.com/laurent22/joplin/issues/7782) by [@pedr](https://github.com/pedr))

## [v2.10.6](https://github.com/laurent22/joplin/releases/tag/v2.10.6) (Pre-release) - 2023-02-20T14:00:05Z

- New: Add 'Paste as text' to the Context menu of the Rich Text Editor ([#7769](https://github.com/laurent22/joplin/issues/7769) by [@pedr](https://github.com/pedr))
- New: Add a menu option to reset the application layout ([#7786](https://github.com/laurent22/joplin/issues/7786) by [@pedr](https://github.com/pedr))
- Improved: Allow 'Paste as Text' on the Rich Text Editor ([#7751](https://github.com/laurent22/joplin/issues/7751) by [@pedr](https://github.com/pedr))
- Improved: Disable custom PDF viewer by default ([#7506](https://github.com/laurent22/joplin/issues/7506))
- Improved: Fix copy text with no selection ([#7641](https://github.com/laurent22/joplin/issues/7641)) ([#7602](https://github.com/laurent22/joplin/issues/7602) by Betty Alagwu)
- Improved: Improve dialogue spacing in Fountain renderer ([#7628](https://github.com/laurent22/joplin/issues/7628)) ([#7627](https://github.com/laurent22/joplin/issues/7627) by [@Elleo](https://github.com/Elleo))
- Improved: New design for "New note" and "New todo" buttons ([#7780](https://github.com/laurent22/joplin/issues/7780) by [@julien](https://github.com/julien))
- Improved: Remove auto-matching for greater than character ([#7669](https://github.com/laurent22/joplin/issues/7669) by Self Not Found)
- Improved: Show installed plugins in Help - About Joplin ([#7711](https://github.com/laurent22/joplin/issues/7711)) ([#6143](https://github.com/laurent22/joplin/issues/6143) by [@julien](https://github.com/julien))
- Fixed: App freezes and displays fatal error when text provided in the search bar is too long ([#7764](https://github.com/laurent22/joplin/issues/7764)) ([#7634](https://github.com/laurent22/joplin/issues/7634) by [@pedr](https://github.com/pedr))
- Fixed: Certain plugins could create invalid settings, which could result in a crash ([#7621](https://github.com/laurent22/joplin/issues/7621))
- Fixed: Clicking on Save saves changes when updating a link ([#7753](https://github.com/laurent22/joplin/issues/7753)) ([#7658](https://github.com/laurent22/joplin/issues/7658) by [@julien](https://github.com/julien))
- Fixed: Ctrl-X behaviour when no text is selected ([#7778](https://github.com/laurent22/joplin/issues/7778)) ([#7662](https://github.com/laurent22/joplin/issues/7662) by [@melsonic](https://github.com/melsonic))
- Fixed: Custom sort order not synchronized ([#7729](https://github.com/laurent22/joplin/issues/7729)) ([#6956](https://github.com/laurent22/joplin/issues/6956) by Tao Klerks)
- Fixed: Fix highlighting in GotoAnything dialogue ([#7592](https://github.com/laurent22/joplin/issues/7592) by [@andy1631](https://github.com/andy1631))
- Fixed: Fix open files with non-ASCII characters in path ([#7679](https://github.com/laurent22/joplin/issues/7679)) ([#7678](https://github.com/laurent22/joplin/issues/7678) by Self Not Found)
- Fixed: Fix text editor text highlighting when used with special IME methods ([#7630](https://github.com/laurent22/joplin/issues/7630)) ([#7565](https://github.com/laurent22/joplin/issues/7565) by [@light](https://github.com/light))
- Fixed: Markdown editor not surrounding highlighted text with backticks ([#7697](https://github.com/laurent22/joplin/issues/7697)) ([#7694](https://github.com/laurent22/joplin/issues/7694) by Helmut K. C. Tessarek)
- Fixed: Mermaid images are incorrectly sized when exported as PNG ([#7546](https://github.com/laurent22/joplin/issues/7546)) ([#7521](https://github.com/laurent22/joplin/issues/7521) by Adarsh Singh)
- Fixed: Note editor scrolls back to top when editing certain notes ([#7617](https://github.com/laurent22/joplin/issues/7617))

## [v2.10.5](https://github.com/laurent22/joplin/releases/tag/v2.10.5) - 2023-01-16T15:00:53Z

- Fixed: Api: Fixes [#6862](https://github.com/laurent22/joplin/issues/6862) set todo related fields when adding or changing a todo ([#7395](https://github.com/laurent22/joplin/issues/7395) by [@Wartijn](https://github.com/Wartijn))
- Fixed: Fixed crash when loading certain plugins ([#7598](https://github.com/laurent22/joplin/issues/7598))
- Fixed: Fixes crash when changing note time from properties dialog ([6b9a270](https://github.com/laurent22/joplin/commit/6b9a270))
- Fixed: Hyperlink insertion no longer works in Markdown editor ([#7605](https://github.com/laurent22/joplin/issues/7605))
- Fixed: Optimise sidebar rendering speed ([#7610](https://github.com/laurent22/joplin/issues/7610))
- Fixed: Try to replace the external link with internal link when attachment file is pasted in Markdown editor ([#6865](https://github.com/laurent22/joplin/issues/6865)) ([#6211](https://github.com/laurent22/joplin/issues/6211) by Self Not Found)

## [v2.10.4](https://github.com/laurent22/joplin/releases/tag/v2.10.4) (Pre-release) - 2023-01-05T13:09:20Z

- Fixed: Fixed certain plugins that were using the sqlite3 database ([a43ce33](https://github.com/laurent22/joplin/commit/a43ce33))
- Fixed: Plugin API DirectoryPath edit problems when path contain spaces ([#7018](https://github.com/laurent22/joplin/issues/7018))

## [v2.10.3](https://github.com/laurent22/joplin/releases/tag/v2.10.3) (Pre-release) - 2022-12-31T15:53:23Z

- Improved: Resolve [#6254](https://github.com/laurent22/joplin/issues/6254): &lt;details&gt; elements remain closed when exporting to PDF ([#7515](https://github.com/laurent22/joplin/issues/7515)) ([#6254](https://github.com/laurent22/joplin/issues/6254) by Hitarth Thummar)
- Improved: Switch license to AGPL-3.0 ([faf0a4e](https://github.com/laurent22/joplin/commit/faf0a4e))
- Fixed: Fixed crash when closing PDF ([#7528](https://github.com/laurent22/joplin/issues/7528))
- Fixed: Fixes import of tasklists from enex files ([#7344](https://github.com/laurent22/joplin/issues/7344)) ([#7329](https://github.com/laurent22/joplin/issues/7329) by [@Wartijn](https://github.com/Wartijn))
- Fixed: Press Enter to select a tag ([#7493](https://github.com/laurent22/joplin/issues/7493))
- Fixed: Profile paths that contain special characters can break note rendering ([#7449](https://github.com/laurent22/joplin/issues/7449)) ([#7434](https://github.com/laurent22/joplin/issues/7434) by [@Wartijn](https://github.com/Wartijn))
- Fixed: Random crash when searching ([#7499](https://github.com/laurent22/joplin/issues/7499))
- Fixed: Search field doesn't get focus when pressing Ctrl+F ([#7529](https://github.com/laurent22/joplin/issues/7529)) ([#7520](https://github.com/laurent22/joplin/issues/7520) by Betty Alagwu)

## [v2.10.2](https://github.com/laurent22/joplin/releases/tag/v2.10.2) (Pre-release) - 2022-12-18T18:05:08Z

- Improved: Update Mermaid: 9.1.7 to 9.2.2 ([#7330](https://github.com/laurent22/joplin/issues/7330) by Helmut K. C. Tessarek)
- Fixed: Fix pasting plain text ([#7045](https://github.com/laurent22/joplin/issues/7045)) ([#7036](https://github.com/laurent22/joplin/issues/7036) by Self Not Found)
- Fixed: Open callback URLs from within the application ([#7354](https://github.com/laurent22/joplin/issues/7354))

## [v2.9.17](https://github.com/laurent22/joplin/releases/tag/v2.9.17) - 2022-11-15T10:28:37Z

- Fixed: Switching a note using Sidebar is slow and grayed out ([#6430](https://github.com/laurent22/joplin/issues/6430)) ([#6416](https://github.com/laurent22/joplin/issues/6416) by Kenichi Kobayashi)
- Security: Fix XSS when a specially crafted string is passed to the renderer ([762b4e8](https://github.com/laurent22/joplin/commit/762b4e8)) (PoC by [@Alise](https://github.com/a1ise))

## [v2.9.12](https://github.com/laurent22/joplin/releases/tag/v2.9.12) (Pre-release) - 2022-11-01T17:06:05Z

- Improved: Display the plugin name in dialog boxes created by plugins ([#6979](https://github.com/laurent22/joplin/issues/6979))
- Improved: Regression: Plugin CSS files were no longer being loaded correctly ([99a61f1](https://github.com/laurent22/joplin/commit/99a61f1))
- Improved: Remove unnecessary PDF viewer messages ([db4c6ea](https://github.com/laurent22/joplin/commit/db4c6ea))
- Fixed: Fix exporting resources to md and md + frontmatter ([#6768](https://github.com/laurent22/joplin/issues/6768)) ([#6721](https://github.com/laurent22/joplin/issues/6721) by [@SFulpius](https://github.com/SFulpius))
- Fixed: Fixed crash when setting spellchecker language to en-IN ([ae17801](https://github.com/laurent22/joplin/commit/ae17801))
- Fixed: Fixed sidebar tag header click ([5b80fbc](https://github.com/laurent22/joplin/commit/5b80fbc))
- Fixed: Fixes an error when importing a shortcut map and canceling the dialog ([#6975](https://github.com/laurent22/joplin/issues/6975) by Ahmed Azzam)

## [v2.9.11](https://github.com/laurent22/joplin/releases/tag/v2.9.11) (Pre-release) - 2022-10-23T16:09:58Z

- New: Add PDF full screen viewer ([#6821](https://github.com/laurent22/joplin/issues/6821) by [@asrient](https://github.com/asrient))
- New: Add support for multi-language spell check ([#6617](https://github.com/laurent22/joplin/issues/6617))
- New: Add zoom feature on PDF viewer ([#6748](https://github.com/laurent22/joplin/issues/6748) by [@asrient](https://github.com/asrient))
- New: Added PDF viewer options ([#6800](https://github.com/laurent22/joplin/issues/6800) by [@asrient](https://github.com/asrient))
- New: Plugins: Add support for media links in plugin manifest.json ([#6672](https://github.com/laurent22/joplin/issues/6672) by [@Retrove](https://github.com/Retrove))
- Improved: Bundle default plugins with desktop application ([#6679](https://github.com/laurent22/joplin/issues/6679) by Mayank Bondre)
- Improved: Display default notebook icons when at least one notebook has an icon ([7974df9](https://github.com/laurent22/joplin/commit/7974df9))
- Improved: Install default plugins on first app start ([#6585](https://github.com/laurent22/joplin/issues/6585) by Mayank Bondre)
- Improved: PDF scroll persistence ([#6747](https://github.com/laurent22/joplin/issues/6747) by [@asrient](https://github.com/asrient))
- Fixed: Avoid reloading loaded plugin scripts ([#6742](https://github.com/laurent22/joplin/issues/6742)) ([#6719](https://github.com/laurent22/joplin/issues/6719) by [@SeptemberHX](https://github.com/SeptemberHX))
- Fixed: Fix resources sync when proxy is set ([#6817](https://github.com/laurent22/joplin/issues/6817)) ([#6688](https://github.com/laurent22/joplin/issues/6688) by Self Not Found)
- Fixed: Fixed file and directory paths in plugin setting dialogs ([#6692](https://github.com/laurent22/joplin/issues/6692))
- Fixed: Fixed names of imported duplicate notebooks ([#6704](https://github.com/laurent22/joplin/issues/6704))

## [v2.9.4](https://github.com/laurent22/joplin/releases/tag/v2.9.4) (Pre-release) - 2022-08-18T16:52:26Z

- Fixed macOS release

## [v2.9.3](https://github.com/laurent22/joplin/releases/tag/v2.9.3) (Pre-release) - 2022-08-18T13:11:09Z

- Fixed Linux release

## [v2.9.2](https://github.com/laurent22/joplin/releases/tag/v2.9.2) (Pre-release) - 2022-08-12T18:12:12Z

- Improved: Allow electron flag to disable smooth scrolling ([#6712](https://github.com/laurent22/joplin/issues/6712) by [@joserebelo](https://github.com/joserebelo))
- Improved: New Embedded Pdf Viewer ([#6681](https://github.com/laurent22/joplin/issues/6681) by [@asrient](https://github.com/asrient))
- Fixed: Do not encrypt non-owned note if it was not shared encrypted ([#6645](https://github.com/laurent22/joplin/issues/6645))
- Fixed: Fixed broken image links ([#6590](https://github.com/laurent22/joplin/issues/6590)) ([#6570](https://github.com/laurent22/joplin/issues/6570) by [@SFulpius](https://github.com/SFulpius))
- Fixed: Play flac files ([#6666](https://github.com/laurent22/joplin/issues/6666)) ([#6434](https://github.com/laurent22/joplin/issues/6434) by [@SFulpius](https://github.com/SFulpius))

## [v2.9.1](https://github.com/laurent22/joplin/releases/tag/v2.9.1) (Pre-release) - 2022-07-11T09:59:32Z

- New: Plugins: Added joplin.versionInfo method ([3b35ab6](https://github.com/laurent22/joplin/commit/3b35ab6))
- Improved: Add support for proxy ([#6537](https://github.com/laurent22/joplin/issues/6537)) ([#164](https://github.com/laurent22/joplin/issues/164) by Jason Williams)
- Improved: Checkbox don't function while checkbox format button hidden from toolbar ([#6567](https://github.com/laurent22/joplin/issues/6567)) ([#6172](https://github.com/laurent22/joplin/issues/6172) by [@SFulpius](https://github.com/SFulpius))
- Improved: Update to Electron 18 ([#6496](https://github.com/laurent22/joplin/issues/6496) by [@alexmo1997](https://github.com/alexmo1997))
- Fixed: Allow styling note list items using custom CSS ([#6542](https://github.com/laurent22/joplin/issues/6542)) ([#5178](https://github.com/laurent22/joplin/issues/5178) by Kenichi Kobayashi)
- Fixed: App can crash with certain combinations of plugins ([#6506](https://github.com/laurent22/joplin/issues/6506))
- Fixed: Search field focus is stolen on layout change ([#6514](https://github.com/laurent22/joplin/issues/6514))
- Fixed: Search field would not clear as expected ([#6557](https://github.com/laurent22/joplin/issues/6557))
- Security: Fixes XSS in GotoAnything dialog (Vulnerability found by [@ly1g3](https://github.com/ly1g3) CVE-2022-35131) ([e797ebb](https://github.com/laurent22/joplin/commit/e797ebb))

## [v2.8.8](https://github.com/laurent22/joplin/releases/tag/v2.8.8) - 2022-05-17T14:48:06Z

- Improved: Remove plugin backoff handler for now ([7ec3a7b](https://github.com/laurent22/joplin/commit/7ec3a7b))
- Fixed: Dropbox login button is not visible in dark mode ([#6513](https://github.com/laurent22/joplin/issues/6513)) ([#6503](https://github.com/laurent22/joplin/issues/6503) by [@Retrove](https://github.com/Retrove))

## [v2.8.7](https://github.com/laurent22/joplin/releases/tag/v2.8.7) (Pre-release) - 2022-05-06T11:34:27Z

- Improved: Sort sync target options ([814a5a0](https://github.com/laurent22/joplin/commit/814a5a0))
- Fixed: Make undo/redo menu items translatable ([#6435](https://github.com/laurent22/joplin/issues/6435))
- Fixed: Sync config was lost when switching profiles ([#6459](https://github.com/laurent22/joplin/issues/6459))

## [v2.8.6](https://github.com/laurent22/joplin/releases/tag/v2.8.6) (Pre-release) - 2022-05-03T10:08:25Z

- Improved: Disable crash detection handler for now ([47c3ee0](https://github.com/laurent22/joplin/commit/47c3ee0))

## [v2.8.5](https://github.com/laurent22/joplin/releases/tag/v2.8.5) (Pre-release) - 2022-04-27T13:51:50Z

- New: Plugins: Add support for file and directory selector in Settings API ([fc09598](https://github.com/laurent22/joplin/commit/fc09598))
- Improved: Ask to start in safe mode when the application has crashed ([d9a4a9c](https://github.com/laurent22/joplin/commit/d9a4a9c))
- Improved: More permissive plugin back-off rules ([22ae50c](https://github.com/laurent22/joplin/commit/22ae50c))
- Fixed: Fixed color of links within list in Markdown editor ([#6447](https://github.com/laurent22/joplin/issues/6447) by Hieu-Thi Luong)
- Fixed: Fixed getting geolocation for new notes ([86179bd](https://github.com/laurent22/joplin/commit/86179bd))
- Security: Fixed disallowed tag XSS ([774c207](https://github.com/laurent22/joplin/commit/774c207)) (Discovered by @hexodotsh)

## [v2.8.4](https://github.com/laurent22/joplin/releases/tag/v2.8.4) (Pre-release) - 2022-04-19T18:00:09Z

- New: Multi-profiles: Added profile ID in CSS root class so that different profiles can have different styles ([fd9fe5c](https://github.com/laurent22/joplin/commit/fd9fe5c))
- Improved: Enabled plugin throttling logic to prevent certain plugins from freezing the app ([b716755](https://github.com/laurent22/joplin/commit/b716755))
- Improved: Multi-profiles: Improve performance when switching notes, when multiple plugins are loaded ([#6394](https://github.com/laurent22/joplin/issues/6394))
- Improved: Multi-profiles: Assign an ID to profiles and remove path ([b4a6e17](https://github.com/laurent22/joplin/commit/b4a6e17))
- Improved: Multi-profiles: Automatically restart the app when switching profiles on Linux ([1797e84](https://github.com/laurent22/joplin/commit/1797e84))
- Improved: Multi-profiles: Share UI layout between profiles ([a111531](https://github.com/laurent22/joplin/commit/a111531))
- Improved: Multi-profiles: Share custom CSS between profiles ([0cdef66](https://github.com/laurent22/joplin/commit/0cdef66))
- Improved: Multi-profiles: Share plugins between profiles ([510df43](https://github.com/laurent22/joplin/commit/510df43))
- Improved: Multi-profiles: Locale was not being preserved when creating a new profile ([#6411](https://github.com/laurent22/joplin/issues/6411))
- Improved: Performance improvement when switching note while plugins are running ([#6409](https://github.com/laurent22/joplin/issues/6409)) ([#5770](https://github.com/laurent22/joplin/issues/5770) by Kenichi Kobayashi)
- Fixed: Editor context menu was broken (regression) ([#6422](https://github.com/laurent22/joplin/issues/6422)) ([#6126](https://github.com/laurent22/joplin/issues/6126) by [@asrient](https://github.com/asrient))
- Fixed: Opening a file with ctrl-click in the editor results in a 'network error' dialogue ([#6145](https://github.com/laurent22/joplin/issues/6145))

## [v2.8.2](https://github.com/laurent22/joplin/releases/tag/v2.8.2) (Pre-release) - 2022-04-14T11:35:45Z

- New: Add support for multiple profiles ([#6385](https://github.com/laurent22/joplin/issues/6385)) ([#591](https://github.com/laurent22/joplin/issues/591))
- New: Allow saving a Mermaid graph as a PNG or SVG via context menu ([#6126](https://github.com/laurent22/joplin/issues/6126)) ([#6100](https://github.com/laurent22/joplin/issues/6100) by [@asrient](https://github.com/asrient))
- New: Support for Joplin Cloud recursive linked notes ([9d9420a](https://github.com/laurent22/joplin/commit/9d9420a))
- Improved: Don’t unpin app from taskbar on update ([#6271](https://github.com/laurent22/joplin/issues/6271)) ([#4155](https://github.com/laurent22/joplin/issues/4155) by Daniel Aleksandersen)
- Improved: Make search engine filter keywords case insensitive ([#6267](https://github.com/laurent22/joplin/issues/6267)) ([#6266](https://github.com/laurent22/joplin/issues/6266) by [@JackGruber](https://github.com/JackGruber))
- Improved: Plugins: Add support for "categories" manifest field ([#6109](https://github.com/laurent22/joplin/issues/6109)) ([#5867](https://github.com/laurent22/joplin/issues/5867) by Mayank Bondre)
- Improved: Plugins: Allow updating a resource via the data API ([74273cd](https://github.com/laurent22/joplin/commit/74273cd))
- Improved: Automatically start sync after setting the sync parameters ([ff066ba](https://github.com/laurent22/joplin/commit/ff066ba))
- Improved: Improve E2EE usability when accidentally creating multiple keys ([#6399](https://github.com/laurent22/joplin/issues/6399)) ([#6338](https://github.com/laurent22/joplin/issues/6338))
- Improved: Improved handling of ENTER and ESCAPE keys in dialogs ([#6194](https://github.com/laurent22/joplin/issues/6194))
- Fixed: Fixed color of published note on Light theme ([21706fa](https://github.com/laurent22/joplin/commit/21706fa))
- Fixed: Fixed creation of empty notebooks when importing directory of files ([#6274](https://github.com/laurent22/joplin/issues/6274)) ([#6197](https://github.com/laurent22/joplin/issues/6197) by [@Retrove](https://github.com/Retrove))
- Fixed: Fixes right click menu on Markdown Editor ([#6132](https://github.com/laurent22/joplin/issues/6132) by [@bishoy-magdy](https://github.com/bishoy-magdy))
- Fixed: Scroll jumps when typing if heavy scripts or many large elements are used ([#6383](https://github.com/laurent22/joplin/issues/6383)) ([#6074](https://github.com/laurent22/joplin/issues/6074) by Kenichi Kobayashi)

## [v2.7.15](https://github.com/laurent22/joplin/releases/tag/v2.7.15) - 2022-03-17T13:03:23Z

- Improved: Handle invalid revision patches ([#6209](https://github.com/laurent22/joplin/issues/6209))
- Fixed: Clicking on folder button was no longer jumping to the right folder ([#5584](https://github.com/laurent22/joplin/issues/5584))
- Fixed: Ensure that note revision markup type is set correctly ([#6261](https://github.com/laurent22/joplin/issues/6261))
- Fixed: Fixed Tags Order ([#6136](https://github.com/laurent22/joplin/issues/6136)) ([#5686](https://github.com/laurent22/joplin/issues/5686) by [@OmGole](https://github.com/OmGole))
- Fixed: Undo and redo on note title did not work in some cases ([#6214](https://github.com/laurent22/joplin/issues/6214))

## [v2.7.14](https://github.com/laurent22/joplin/releases/tag/v2.7.14) - 2022-02-27T11:30:53Z

- Improved: Improve error message when revision metadata cannot be decoded, to improve debugging ([a325bf6](https://github.com/laurent22/joplin/commit/a325bf6))
- Fixed: Prevent certain errors from stopping the revision service ([#5531](https://github.com/laurent22/joplin/issues/5531))
- Fixed: Note export could fail in some cases (regression) ([#6203](https://github.com/laurent22/joplin/issues/6203))

## [v2.7.13](https://github.com/laurent22/joplin/releases/tag/v2.7.13) - 2022-02-24T17:42:12Z

- Fixed: Fixed search marker background color in Markdown editor ([440618e](https://github.com/laurent22/joplin/commit/440618e))
- Updated translations

## [v2.7.12](https://github.com/laurent22/joplin/releases/tag/v2.7.12) (Pre-release) - 2022-02-14T15:06:14Z

- Fixed: Exported JEX notebook should not contain share metadata ([#6129](https://github.com/laurent22/joplin/issues/6129))

## [v2.7.11](https://github.com/laurent22/joplin/releases/tag/v2.7.11) (Pre-release) - 2022-02-12T13:00:02Z

- Improved: Resize custom icon down to 256px when it is too large ([064891d](https://github.com/laurent22/joplin/commit/064891d))
- Updated translations

## [v2.7.10](https://github.com/laurent22/joplin/releases/tag/v2.7.10) (Pre-release) - 2022-02-11T18:19:09Z

Important: If you use custom notebook icons and sync with the mobile app, make sure also install the latest 2.7 mobile app.

- New: Add additional time format HH.mm ([#6086](https://github.com/laurent22/joplin/issues/6086) by [@vincentjocodes](https://github.com/vincentjocodes))
- New: Add support for custom notebook icons ([#6110](https://github.com/laurent22/joplin/issues/6110))
- Improved: Fixed sync scroll issue ([#6059](https://github.com/laurent22/joplin/issues/6059)) ([#5808](https://github.com/laurent22/joplin/issues/5808) by Caleb John)
- Improved: Make heading 4, 5 and 6 styling more consistent ([fca5875](https://github.com/laurent22/joplin/commit/fca5875))
- Improved: Update Mermaid 8.13.5 -&gt; 8.13.9 and Katex dependencies ([#6039](https://github.com/laurent22/joplin/issues/6039) by Helmut K. C. Tessarek)
- Fixed: Add "Other applications" import menu item ([#6118](https://github.com/laurent22/joplin/issues/6118)) ([#6108](https://github.com/laurent22/joplin/issues/6108) by Helmut K. C. Tessarek)
- Fixed: Global search focuses text in notes so that edits overwrite highlighted text ([#6040](https://github.com/laurent22/joplin/issues/6040)) ([#6035](https://github.com/laurent22/joplin/issues/6035) by Caleb John)
- Fixed: Login field was sometimes disabled on Sync Wizard dialog ([#6075](https://github.com/laurent22/joplin/issues/6075))
- Fixed: Scroll position is not remembered (regression) ([#6043](https://github.com/laurent22/joplin/issues/6043)) ([#6042](https://github.com/laurent22/joplin/issues/6042) by Kenichi Kobayashi)
- Fixed: Shared resource was not encrypted with correct encryption key ([#6092](https://github.com/laurent22/joplin/issues/6092))

## [v2.7.8](https://github.com/laurent22/joplin/releases/tag/v2.7.8) (Pre-release) - 2022-01-19T09:35:27Z

- Improved: Disable plugin throttling for now ([6bb0318](https://github.com/laurent22/joplin/commit/6bb0318))
- Fixed [#6035](https://github.com/laurent22/joplin/issues/6035): Revert "Desktop: Fixes [#5850](https://github.com/laurent22/joplin/issues/5850): Editor loses cursor focus when Ctrl+F search is closed ([#5919](https://github.com/laurent22/joplin/issues/5919))"

## [v2.7.7](https://github.com/laurent22/joplin/releases/tag/v2.7.7) (Pre-release) - 2022-01-18T14:05:07Z

- Improved: Disable plugin throttling mechanism for now ([c6b6712](https://github.com/laurent22/joplin/commit/c6b6712))
- Fixed: Fixes alt text not appearing in html ([#6017](https://github.com/laurent22/joplin/issues/6017)) ([#5803](https://github.com/laurent22/joplin/issues/5803) by Mayank Bondre)

## [v2.7.6](https://github.com/laurent22/joplin/releases/tag/v2.7.6) (Pre-release) - 2022-01-17T17:08:28Z

- New: Plugins: Add support for joplin.workspace.filterEditorContextMenu to allow dynamically setting editor menu items depending on context ([960863f](https://github.com/laurent22/joplin/commit/960863f))
- New: Plugins: Add utility functions joplin.data.itemType() and joplin.data.resourcePath() ([27b62bf](https://github.com/laurent22/joplin/commit/27b62bf))
- New: Plugins: Added "openItem" command ([83c0c48](https://github.com/laurent22/joplin/commit/83c0c48))
- New: Plugins: Added ModelType type ([c423551](https://github.com/laurent22/joplin/commit/c423551))
- New: Plugins: Added revealResourceFile command ([6e6432b](https://github.com/laurent22/joplin/commit/6e6432b))
- New: Plugins: Adds `joplin.workspace.onResourceChange` ([2660ff3](https://github.com/laurent22/joplin/commit/2660ff3))
- Improved: Adjusted styling to make it more consistent across app ([d031a04](https://github.com/laurent22/joplin/commit/d031a04))
- Improved: Better handling of bold text to simplify customisation ([#5732](https://github.com/laurent22/joplin/issues/5732) by Hieu-Thi Luong)
- Improved: Clickable tags in Tag Bar ([#5956](https://github.com/laurent22/joplin/issues/5956) by Kenichi Kobayashi)
- Improved: Do no duplicate resources when duplicating a note ([721d008](https://github.com/laurent22/joplin/commit/721d008))
- Improved: Expand search field when clicking on search button ([#5893](https://github.com/laurent22/joplin/issues/5893))
- Improved: Focus notebook title when opening Notebook dialog ([3117133](https://github.com/laurent22/joplin/commit/3117133))
- Improved: Plugins: Throttle plugins that make too many API calls ([#5895](https://github.com/laurent22/joplin/issues/5895))
- Improved: Prevent Desktop Environments to launch a new window ([#5984](https://github.com/laurent22/joplin/issues/5984) by Felipe Kinoshita)
- Improved: Right click on image to copy it to clipboard ([297b992](https://github.com/laurent22/joplin/commit/297b992))
- Improved: Show login prompt for OneDrive ([#5933](https://github.com/laurent22/joplin/issues/5933) by Jonathan Heard)
- Improved: Use same notebook dialog when creating a new notebook too ([#5934](https://github.com/laurent22/joplin/issues/5934))
- Fixed: Add back text editor commands to Command Palette ([#5707](https://github.com/laurent22/joplin/issues/5707))
- Fixed: Cannot jump if local search count is one ([#5894](https://github.com/laurent22/joplin/issues/5894)) ([#5549](https://github.com/laurent22/joplin/issues/5549) by Kenichi Kobayashi)
- Fixed: Editor loses cursor focus when Ctrl+F search is closed ([#5919](https://github.com/laurent22/joplin/issues/5919)) ([#5850](https://github.com/laurent22/joplin/issues/5850) by Kenichi Kobayashi)
- Fixed: Fix white space in the bottom of Add Tag Prompt dialog ([#5998](https://github.com/laurent22/joplin/issues/5998) by Krishna Kumar)
- Fixed: Fix wording "Check for updates" in settings ([#5832](https://github.com/laurent22/joplin/issues/5832) by Helmut K. C. Tessarek)
- Fixed: Fixed issue where synchroniser would try to update a shared folder that is not longer accessible ([667d642](https://github.com/laurent22/joplin/commit/667d642))
- Fixed: Fixed order of editor search buttons ([6bc70ed](https://github.com/laurent22/joplin/commit/6bc70ed))
- Fixed: Fixed search icon when note list is resized ([#5974](https://github.com/laurent22/joplin/issues/5974)) ([#5916](https://github.com/laurent22/joplin/issues/5916) by Krishna Kumar)
- Fixed: Note list buttons do not reappear after changing app layout ([#5994](https://github.com/laurent22/joplin/issues/5994)) ([#5953](https://github.com/laurent22/joplin/issues/5953) by [@asrient](https://github.com/asrient))
- Fixed: Scroll jump when checkbox is toggled in Viewer ([#5941](https://github.com/laurent22/joplin/issues/5941)) ([#5890](https://github.com/laurent22/joplin/issues/5890) by Kenichi Kobayashi)
- Fixed: Scroll jumps when images are rendered in Markdown Editor ([#5929](https://github.com/laurent22/joplin/issues/5929)) ([#5918](https://github.com/laurent22/joplin/issues/5918) by Kenichi Kobayashi)
- Fixed: Scrolling was out of sync when a Multi Markdown Table was being used ([#5815](https://github.com/laurent22/joplin/issues/5815)) ([#5808](https://github.com/laurent22/joplin/issues/5808) by Caleb John)
- Fixed: Show error on sync if S3 region is not set ([#5923](https://github.com/laurent22/joplin/issues/5923)) ([#5875](https://github.com/laurent22/joplin/issues/5875) by [@shinglyu](https://github.com/shinglyu))
- Fixed: Update menu item labels when the language changes ([#5927](https://github.com/laurent22/joplin/issues/5927))
- Fixed: Default sort order lost on exit ([#6022](https://github.com/laurent22/joplin/issues/6022)) ([#5968](https://github.com/laurent22/joplin/issues/5968) by Kenichi Kobayashi)
- Fixed: Scroll positions are not preserved when layout changes ([#6021](https://github.com/laurent22/joplin/issues/6021)) ([#5981](https://github.com/laurent22/joplin/issues/5981) by Kenichi Kobayashi)
- Security: Fixes [#6004](https://github.com/laurent22/joplin/issues/6004): Prevent XSS in Goto Anything ([#6004](https://github.com/laurent22/joplin/issues/6004))

## [v2.6.10](https://github.com/laurent22/joplin/releases/tag/v2.6.10) - 2021-12-19T11:31:16Z

- Fixed: Fixed export of HTML files on Linux ([#5873](https://github.com/laurent22/joplin/issues/5873))
- Fixed: Fixed exporting notes that contain Mermaid diagrams as PDF or HTML ([#5879](https://github.com/laurent22/joplin/issues/5879))
- Fixed: Markdown search no longer scrolls to result ([#5876](https://github.com/laurent22/joplin/issues/5876)) ([#5872](https://github.com/laurent22/joplin/issues/5872) by Kenichi Kobayashi)

## [v2.6.9](https://github.com/laurent22/joplin/releases/tag/v2.6.9) - 2021-12-17T11:57:32Z

- Update translations

## [v2.6.7](https://github.com/laurent22/joplin/releases/tag/v2.6.7) (Pre-release) - 2021-12-16T10:47:23Z

- New: Added detailed tooltip for 'Toggle Sort Order Field' button ([#5854](https://github.com/laurent22/joplin/issues/5854) by Kenichi Kobayashi)
- Fixed (Regression): Scroll positions are preserved ([#5826](https://github.com/laurent22/joplin/issues/5826)) ([#5708](https://github.com/laurent22/joplin/issues/5708) by Kenichi Kobayashi)

## [v2.6.6](https://github.com/laurent22/joplin/releases/tag/v2.6.6) (Pre-release) - 2021-12-13T12:31:43Z

- Improved: Changed note sort buttons to 3px radius ([#5771](https://github.com/laurent22/joplin/issues/5771) by [@Daeraxa](https://github.com/Daeraxa))
- Improved: Update Mermaid: 8.12.1 -&gt; 8.13.5 ([#5831](https://github.com/laurent22/joplin/issues/5831) by Helmut K. C. Tessarek)
- Fixed: Links in flowchart Mermaid diagrams ([#5830](https://github.com/laurent22/joplin/issues/5830)) ([#5801](https://github.com/laurent22/joplin/issues/5801) by Helmut K. C. Tessarek)

## [v2.6.5](https://github.com/laurent22/joplin/releases/tag/v2.6.5) (Pre-release) - 2021-12-13T10:07:04Z

- Fixed: Fixed "Invalid lock client type" error when migrating sync target ([e0e93c4](https://github.com/laurent22/joplin/commit/e0e93c4))

## [v2.6.4](https://github.com/laurent22/joplin/releases/tag/v2.6.4) (Pre-release) - 2021-12-09T19:53:43Z

- New: Add date format YYYY/MM/DD ([#5759](https://github.com/laurent22/joplin/issues/5759) by Helmut K. C. Tessarek)
- Improved: Allow flags for native wayland ([#5804](https://github.com/laurent22/joplin/issues/5804) by [@stephanoskomnenos](https://github.com/stephanoskomnenos))
- Improved: Also duplicate resources when duplicating a note ([c0a8c33](https://github.com/laurent22/joplin/commit/c0a8c33))
- Improved: Improved S3 sync error handling and reliability, and upgraded S3 SDK ([#5312](https://github.com/laurent22/joplin/issues/5312) by Lee Matos)
- Improved: Improved error message when synchronising with Joplin Server ([#5754](https://github.com/laurent22/joplin/issues/5754))
- Improved: When exporting as HTML, pack all images, styles and scripts inside the HTML file ([98ed2be](https://github.com/laurent22/joplin/commit/98ed2be))
- Fixed: Fixed sharing notebook when recipient is not allowed to share ([1bb7bbb](https://github.com/laurent22/joplin/commit/1bb7bbb))
- Fixed: Handle duplicate attachments when the parent notebook is shared ([#5796](https://github.com/laurent22/joplin/issues/5796))
- Fixed: Opening a file with ctrl and click leads to an error in the Rich Text editor ([#5693](https://github.com/laurent22/joplin/issues/5693))
- Fixed: Rich text editor flashing white when switching notes/editor ([#5793](https://github.com/laurent22/joplin/issues/5793)) ([#5311](https://github.com/laurent22/joplin/issues/5311) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Sync wizard is displayed incorrectly in dev mode ([#5749](https://github.com/laurent22/joplin/issues/5749)) ([#5373](https://github.com/laurent22/joplin/issues/5373) by [@Rishabhraghwendra18](https://github.com/Rishabhraghwendra18))

## [v2.6.2](https://github.com/laurent22/joplin/releases/tag/v2.6.2) (Pre-release) - 2021-11-18T12:19:12Z

- New: Sort Order Buttons and Per-Notebook Sort Order ([#5437](https://github.com/laurent22/joplin/issues/5437) by Kenichi Kobayashi)
- New: Added support for notebook icons ([e97bb78](https://github.com/laurent22/joplin/commit/e97bb78))
- New: Implements Sync-Scroll for Markdown Editor and Viewer ([#5512](https://github.com/laurent22/joplin/issues/5512)) ([#2242](https://github.com/laurent22/joplin/issues/2242) by Kenichi Kobayashi)
- New: Add support for encrypted notebooks via Joplin Server ([#5529](https://github.com/laurent22/joplin/issues/5529))
- New: Add shortcut for bulleted list ([#5698](https://github.com/laurent22/joplin/issues/5698) by Helmut K. C. Tessarek)
- New: Add support for faster Joplin Server built-in sync locks ([#5662](https://github.com/laurent22/joplin/issues/5662))
- New: Add support for more style of highlighted texts when importing ENEX files ([89179c2](https://github.com/laurent22/joplin/commit/89179c2))
- Improved: Allow showing passwords in Master Password dialog ([79d97f2](https://github.com/laurent22/joplin/commit/79d97f2))
- Improved: Fixed and improve laggy scroll in text editor ([#5606](https://github.com/laurent22/joplin/issues/5606)) ([#4827](https://github.com/laurent22/joplin/issues/4827) by Kenichi Kobayashi)
- Improved: Improved error message when a file cannot be uploaded or downloaded ([567ba06](https://github.com/laurent22/joplin/commit/567ba06))
- Improved: Make code blocks horizontally scrollable on note viewer ([#5740](https://github.com/laurent22/joplin/issues/5740))
- Improved: Plugins: Allow posting messages from plugin to webview ([#5569](https://github.com/laurent22/joplin/issues/5569) by [@agerardin](https://github.com/agerardin))
- Fixed: Currently opened note is not updated after sync (5582) ([#5711](https://github.com/laurent22/joplin/issues/5711)) ([#5582](https://github.com/laurent22/joplin/issues/5582) by Kenichi Kobayashi)
- Fixed: Fixed button to upgrade a master key ([725c79d](https://github.com/laurent22/joplin/commit/725c79d))
- Fixed: Fixed issue that could cause application to needlessly lock the sync target ([0de6e9e](https://github.com/laurent22/joplin/commit/0de6e9e))
- Fixed: Fixed issue with parts of HTML notes not being displayed in some cases ([#5687](https://github.com/laurent22/joplin/issues/5687))
- Fixed: Long resource filenames were being incorrectly cut ([#5653](https://github.com/laurent22/joplin/issues/5653))
- Fixed: Message in search box dialog was not readable in dark mode ([#5666](https://github.com/laurent22/joplin/issues/5666))
- Fixed: OneDrive login screen was not readable in dark mode ([#5726](https://github.com/laurent22/joplin/issues/5726))
- Fixed: Plugin secure settings would be lost if keychain is not enabled ([#5720](https://github.com/laurent22/joplin/issues/5720))
- Fixed: Sharing multiple notebooks via Joplin Server with the same user results in an error ([#5721](https://github.com/laurent22/joplin/issues/5721))
- Fixed: Text was unreadable in dark mode when dropping a note on Rich Text editor ([#5710](https://github.com/laurent22/joplin/issues/5710))

## [v2.5.12](https://github.com/laurent22/joplin/releases/tag/v2.5.12) - 2021-11-08T11:07:11Z

- Fixed regression: Long resource filenames were being incorrectly cut when exporting as Markdown ([#5653](https://github.com/laurent22/joplin/issues/5653))

## [v2.5.10](https://github.com/laurent22/joplin/releases/tag/v2.5.10) - 2021-11-01T08:22:42Z

- Fixed: Fixed crash on certain Linux distributions when importing or exporting a file ([6012783](https://github.com/laurent22/joplin/commit/6012783))
- Fixed: Fixed potential infinite loop when Joplin Server session is invalid ([c5569ef](https://github.com/laurent22/joplin/commit/c5569ef))

## [v2.5.8](https://github.com/laurent22/joplin/releases/tag/v2.5.8) - 2021-10-31T11:38:03Z

- Improved: Enable safe mode for Markdown editor too ([#5593](https://github.com/laurent22/joplin/issues/5593))
- Fixed: Do not render very large code blocks to prevent app from freezing ([#5593](https://github.com/laurent22/joplin/issues/5593))

## [v2.5.7](https://github.com/laurent22/joplin/releases/tag/v2.5.7) (Pre-release) - 2021-10-29T14:47:33Z

- Improved: Upgrade to Electron 15.1.3 ([9704b29](https://github.com/laurent22/joplin/commit/9704b29))

## [v2.5.6](https://github.com/laurent22/joplin/releases/tag/v2.5.6) (Pre-release) - 2021-10-28T22:03:09Z

- New: Added mechanism to migrate default settings to new values ([72db8e4](https://github.com/laurent22/joplin/commit/72db8e4))
- Improved: Improved Joplin Server configuration check to better handle disabled accounts ([72c1235](https://github.com/laurent22/joplin/commit/72c1235))
- Improved: Improved handling of expired sessions when using Joplin Server ([ace1118](https://github.com/laurent22/joplin/commit/ace1118))
- Improved: Improved master password state handling in Encryption screen ([7d62df8](https://github.com/laurent22/joplin/commit/7d62df8))
- Fixed: Fixed Goto Anything scrolling for long lists ([22e5c3a](https://github.com/laurent22/joplin/commit/22e5c3a))

## [v2.5.4](https://github.com/laurent22/joplin/releases/tag/v2.5.4) (Pre-release) - 2021-10-19T10:10:54Z

- New: Add support for public-private key pairs and improved master password support ([#5438](https://github.com/laurent22/joplin/issues/5438))
- New: Add Markdown + Front Matter exporter/importer ([#5465](https://github.com/laurent22/joplin/issues/5465)) ([#5224](https://github.com/laurent22/joplin/issues/5224) by [@CalebJohn](https://github.com/CalebJohn))
- New: Add support for callback URLs ([#5416](https://github.com/laurent22/joplin/issues/5416)) ([#5168](https://github.com/laurent22/joplin/issues/5168) by Roman Musin)
- Improved: Allows a shared notebook recipient to leave the notebook ([7354548](https://github.com/laurent22/joplin/commit/7354548))
- Improved: Ensure that shared notebook children are not deleted when shared, unshared and shared again, and a conflict happens ([ccf9882](https://github.com/laurent22/joplin/commit/ccf9882))
- Improved: Improved share error handling ([9bff2d1](https://github.com/laurent22/joplin/commit/9bff2d1))
- Improved: Laggy scrolling in Markdown viewer ([#5496](https://github.com/laurent22/joplin/issues/5496)) ([#4827](https://github.com/laurent22/joplin/issues/4827) by Kenichi Kobayashi)
- Improved: Mentioned on share dialog that it may take a few minutes for all notes to appear on the recipient device ([852c6f2](https://github.com/laurent22/joplin/commit/852c6f2))
- Fixed: Bright background around code block insertion dialog in dark mode ([#5491](https://github.com/laurent22/joplin/issues/5491)) ([#5310](https://github.com/laurent22/joplin/issues/5310) by [@Rishabhraghwendra18](https://github.com/Rishabhraghwendra18))
- Fixed: Certain attachments were not being automatically deleted ([#932](https://github.com/laurent22/joplin/issues/932))
- Fixed: Exclude disabled commands from Goto Anything ([#5421](https://github.com/laurent22/joplin/issues/5421))
- Fixed: Fixed running out of memory when importing large ENEX files ([#5543](https://github.com/laurent22/joplin/issues/5543))
- Fixed: Fixed share dialog button sizes ([1fee83d](https://github.com/laurent22/joplin/commit/1fee83d))

## [v2.4.12](https://github.com/laurent22/joplin/releases/tag/v2.4.12) - 2021-10-13T17:24:34Z

- Fixed: Fixed running out of memory when importing large ENEX files ([#5543](https://github.com/laurent22/joplin/issues/5543))

## [v2.5.1](https://github.com/laurent22/joplin/releases/tag/v2.5.1) (Pre-release) - 2021-10-02T09:51:58Z

- Improved: Upgrade Electron from v10 to v14 ([4a7746b](https://github.com/laurent22/joplin/commit/4a7746b))

## [v2.4.9](https://github.com/laurent22/joplin/releases/tag/v2.4.9) - 2021-09-29T19:08:58Z

- Improved: Allow importing certain corrupted ENEX files ([f144dae](https://github.com/laurent22/joplin/commit/f144dae))
- Improved: Improved accepting a folder share ([8ada059](https://github.com/laurent22/joplin/commit/8ada059))
- Improved: Make exported HTML more readable on mobile ([b1d0c15](https://github.com/laurent22/joplin/commit/b1d0c15))
- Fixed: Fix default sync target ([4b39d30](https://github.com/laurent22/joplin/commit/4b39d30))

## [v2.4.8](https://github.com/laurent22/joplin/releases/tag/v2.4.8) (Pre-release) - 2021-09-22T19:01:46Z

- Fixed: Fixed Sync Wizard logo images on Windows ([da88475](https://github.com/laurent22/joplin/commit/da88475))
- Improved: Improved plugin search and installing new plugins from China ([#5161](https://github.com/laurent22/joplin/issues/5161))

## [v2.4.7](https://github.com/laurent22/joplin/releases/tag/v2.4.7) (Pre-release) - 2021-09-19T12:53:22Z

- New: MacOS: Added Cmd+Backspace shortcut to delete line ([#5478](https://github.com/laurent22/joplin/issues/5478) by Helmut K. C. Tessarek)
- Improved: Display 0/0 when no search results are found in editor ([#5360](https://github.com/laurent22/joplin/issues/5360)) ([#5299](https://github.com/laurent22/joplin/issues/5299) by Nikhil Gautam)
- Improved: Do not escape content when copying from Rich Text editor ([#5440](https://github.com/laurent22/joplin/issues/5440))
- Improved: Fire resize event whenever the layout changes ([#5344](https://github.com/laurent22/joplin/issues/5344)) ([#5233](https://github.com/laurent22/joplin/issues/5233) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Linux: Installer: properly quote variables ([#5476](https://github.com/laurent22/joplin/issues/5476) by [@a1346054](https://github.com/a1346054))
- Improved: Support for user-data-dir flag ([#5467](https://github.com/laurent22/joplin/issues/5467) by [@Marph](https://github.com/Marph))
- Improved: Sync deleted items first to allow fixing oversized accounts ([43c594b](https://github.com/laurent22/joplin/commit/43c594b))
- Improved: Update Mermaid 8.10.2 -&gt; 8.12.1 and fix gitGraph crash ([#5448](https://github.com/laurent22/joplin/issues/5448)) ([#5295](https://github.com/laurent22/joplin/issues/5295) by Helmut K. C. Tessarek)
- Fixed: Editor max width was not always applied in Rich Text editor ([#5461](https://github.com/laurent22/joplin/issues/5461))
- Fixed: Misinterpreted search term after filter in quotation marks ([#5445](https://github.com/laurent22/joplin/issues/5445)) ([#5444](https://github.com/laurent22/joplin/issues/5444) by [@JackGruber](https://github.com/JackGruber))
- Fixed: Plugin onNoteSelectionChange() is triggered twice after a search ([#5449](https://github.com/laurent22/joplin/issues/5449)) ([#5447](https://github.com/laurent22/joplin/issues/5447) by Kenichi Kobayashi)
- Fixed: Underline was not applied when using Cmd+U in Rich Text editor ([#5480](https://github.com/laurent22/joplin/issues/5480))

## [v2.4.6](https://github.com/laurent22/joplin/releases/tag/v2.4.6) (Pre-release) - 2021-09-09T18:57:17Z

- New: Plugins: Add support for enabledConditions when creating menu item from command ([9260b2a](https://github.com/laurent22/joplin/commit/9260b2a))
- Fixed: Fix handling of disabled master keys when enabling E2EE ([267c321](https://github.com/laurent22/joplin/commit/267c321))

## [v2.4.5](https://github.com/laurent22/joplin/releases/tag/v2.4.5) (Pre-release) - 2021-09-06T18:03:28Z

- New: Linux: Add Centos 7 for no sandbox ([#5401](https://github.com/laurent22/joplin/issues/5401) by [@geant44](https://github.com/geant44))
- Improved: Allow disabling any master key, including default or active one ([9407efd](https://github.com/laurent22/joplin/commit/9407efd))
- Improved: Api: Add support for "events" end point to retrieve info about latest note changes ([#5199](https://github.com/laurent22/joplin/issues/5199))
- Improved: Load themes as CSS variables for use in custom themes and internal components ([478d4ac](https://github.com/laurent22/joplin/commit/478d4ac))
- Improved: Sort plugin results according to recommended property, and display Recommended tag ([d97ba57](https://github.com/laurent22/joplin/commit/d97ba57))
- Fixed: Handle invalid search index in Goto Anything ([#5417](https://github.com/laurent22/joplin/issues/5417))
- Fixed: Plugins: Fixed import API ([736bbbd](https://github.com/laurent22/joplin/commit/736bbbd))

## [v2.4.4](https://github.com/laurent22/joplin/releases/tag/v2.4.4) (Pre-release) - 2021-08-30T16:02:51Z

- New: Add support for single master password, to simplify handling of multiple encryption keys ([ce89ee5](https://github.com/laurent22/joplin/commit/ce89ee5))

## [v2.4.3](https://github.com/laurent22/joplin/releases/tag/v2.4.3) (Pre-release) - 2021-08-28T15:27:32Z

- Improved: Display link to browse plugins when repository cannot be reached ([#5161](https://github.com/laurent22/joplin/issues/5161))
- Fixed: Fixed crash when a required master key does not exist ([#5391](https://github.com/laurent22/joplin/issues/5391))

## [v2.4.2](https://github.com/laurent22/joplin/releases/tag/v2.4.2) (Pre-release) - 2021-08-27T17:13:21Z

- Improved: Allow specific deprecated plugins to still work ([f19c4ab](https://github.com/laurent22/joplin/commit/f19c4ab))
- Improved: Disable inline code background in vim mode ([#5370](https://github.com/laurent22/joplin/issues/5370)) ([#5364](https://github.com/laurent22/joplin/issues/5364) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Do not display master key upgrade warnings for new master keys ([70efadd](https://github.com/laurent22/joplin/commit/70efadd))
- Improved: Various improvements to Markdown import and export ([#5290](https://github.com/laurent22/joplin/issues/5290) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: "Move to notebook" would break with empty input ([#5346](https://github.com/laurent22/joplin/issues/5346))
- Fixed: Prevent it from crashing with too long search queries ([#5380](https://github.com/laurent22/joplin/issues/5380))

## [v2.4.1](https://github.com/laurent22/joplin/releases/tag/v2.4.1) (Pre-release) - 2021-08-21T11:52:30Z

- New: Add Sync Wizard dialog ([fe4900d](https://github.com/laurent22/joplin/commit/fe4900d))
- New: Add a way to disable a master key ([7faa58e](https://github.com/laurent22/joplin/commit/7faa58e))
- New: Added "None" sync target to allow disabling synchronisation ([f5f05e6](https://github.com/laurent22/joplin/commit/f5f05e6))
- Improved: Improved sync locks so that they do not prevent upgrading a sync target ([06ed58b](https://github.com/laurent22/joplin/commit/06ed58b))
- Improved: Place code-block background in the back in Markdown editor ([#5322](https://github.com/laurent22/joplin/issues/5322) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Plugins: Improved support for fitToContent webview property ([#5298](https://github.com/laurent22/joplin/issues/5298)) ([#5288](https://github.com/laurent22/joplin/issues/5288) by [@Ahmad45123](https://github.com/Ahmad45123))
- Improved: Removes markdown inline code padding ([#5331](https://github.com/laurent22/joplin/issues/5331) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Split code block class in two ([#5359](https://github.com/laurent22/joplin/issues/5359) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Add more specific classes for CodeMirror elements ([#5333](https://github.com/laurent22/joplin/issues/5333)) ([#5327](https://github.com/laurent22/joplin/issues/5327) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fixed file paths when exporting as HTML ([#5325](https://github.com/laurent22/joplin/issues/5325))
- Fixed: GotoAnything is not working on first try ([#5184](https://github.com/laurent22/joplin/issues/5184))

## [v2.3.5](https://github.com/laurent22/joplin/releases/tag/v2.3.5) - 2021-08-17T06:43:30Z

- Improved: Allow setting a max width for the editor content ([8063c94](https://github.com/laurent22/joplin/commit/8063c94))
- Improved: Improved Markdown editor code styling, and add CSS classes for code ([#5314](https://github.com/laurent22/joplin/issues/5314)) ([#5297](https://github.com/laurent22/joplin/issues/5297) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Bump hightlight.js to v11.2 ([#5278](https://github.com/laurent22/joplin/issues/5278)) ([#5245](https://github.com/laurent22/joplin/issues/5245) by Roman Musin)
- Fixed (Regression): Fixed file paths when exporting as HTML ([#5325](https://github.com/laurent22/joplin/issues/5325))

## [v2.3.3](https://github.com/laurent22/joplin/releases/tag/v2.3.3) - 2021-08-14T09:19:40Z

CAUTION: This release will ask you to upgrade your sync target, whether it's Dropbox, OneDrive, Joplin Cloud, etc. Once it is done, only apps version 2.3+ will be able to sync with it, so make sure you are ready to upgrade all your apps before installing this version.

- Improved: Improved E2EE usability by making its state a property of the sync target ([#5276](https://github.com/laurent22/joplin/issues/5276))

## [v2.2.7](https://github.com/laurent22/joplin/releases/tag/v2.2.7) - 2021-08-11T11:03:26Z

- Revert "Plugins: Add ability to make dialogs fit the application window ([#5219](https://github.com/laurent22/joplin/issues/5219))" as it breaks several plugin webviews.
- Revert "Resolves [#4810](https://github.com/laurent22/joplin/issues/4810), Resolves [#4610](https://github.com/laurent22/joplin/issues/4610): Fix AWS S3 sync error and upgrade framework to v3 ([#5212](https://github.com/laurent22/joplin/issues/5212))" due to incompatibility with some AWS providers.

## [v2.2.6](https://github.com/laurent22/joplin/releases/tag/v2.2.6) (Pre-release) - 2021-08-09T19:29:20Z

- Improved: Fix AWS S3 sync error and upgrade framework to v3 ([#5212](https://github.com/laurent22/joplin/issues/5212)) ([#4810](https://github.com/laurent22/joplin/issues/4810) by Lee Matos)
- Improved: Handles OneDrive throttling responses and sets User-Agent based on Microsoft best practices ([#5246](https://github.com/laurent22/joplin/issues/5246)) ([#5244](https://github.com/laurent22/joplin/issues/5244) by [@alec](https://github.com/alec))
- Improved: Plugins: Hide note list menu items for commands that are disabled ([#5270](https://github.com/laurent22/joplin/issues/5270) by [@Ahmad45123](https://github.com/Ahmad45123))
- Improved: Prevent plugins from crashing the application ([#5273](https://github.com/laurent22/joplin/issues/5273))

## [v2.2.5](https://github.com/laurent22/joplin/releases/tag/v2.2.5) (Pre-release) - 2021-08-07T10:35:24Z

- Improved: Remove template feature (replaced by template plugin) ([e9d5901](https://github.com/laurent22/joplin/commit/e9d5901))

## [v2.2.4](https://github.com/laurent22/joplin/releases/tag/v2.2.4) (Pre-release) - 2021-08-05T16:42:48Z

IMPORTANT: If you are a plugin developer or if, as a user, you notice a plugin that no longer works, please read this post: https://discourse.joplinapp.org/t/19278

- New: Plugins: Add ability to make dialogs fit the application window ([#5219](https://github.com/laurent22/joplin/issues/5219) by [@Ahmad45123](https://github.com/Ahmad45123))
- New: Plugins: Add support for loading application chrome and note CSS from the plugin ([07d2a60](https://github.com/laurent22/joplin/commit/07d2a60))
- New: Turn old plugin deprecation notices into errors ([7f00e4e](https://github.com/laurent22/joplin/commit/7f00e4e))
- Improved: Converted Clipper notification to a modal dialog that shows up in all screens ([fb9ec10](https://github.com/laurent22/joplin/commit/fb9ec10))
- Improved: GotoAnything sometimes is not working on first try ([#5184](https://github.com/laurent22/joplin/issues/5184))
- Improved: Increase space between paragraphs in viewer and Rich Text editor to match Markdown editor ([#5256](https://github.com/laurent22/joplin/issues/5256))
- Fixed: Disable "Dropped file type is not supported" notification in Rich Text editor ([#5268](https://github.com/laurent22/joplin/issues/5268))
- Fixed: Do not export share properties ([#5232](https://github.com/laurent22/joplin/issues/5232))
- Fixed: Fixed header spacing (regression) ([d3cd843](https://github.com/laurent22/joplin/commit/d3cd843))
- Fixed: Fixed issue with orphaned resource being created in case of a resource conflict ([#5223](https://github.com/laurent22/joplin/issues/5223))
- Fixed: Fixed plugin state when it has been deleted outside the app ([#5253](https://github.com/laurent22/joplin/issues/5253))
- Fixed: Fixed recipient list colors in Share Notebook dialog ([#5258](https://github.com/laurent22/joplin/issues/5258))
- Fixed: Fixed share note color in note list ([#5259](https://github.com/laurent22/joplin/issues/5259))
- Fixed: Focus is lost while searching in all notes ([#5208](https://github.com/laurent22/joplin/issues/5208))
- Fixed: Import highlighted text from ENEX files ([#5213](https://github.com/laurent22/joplin/issues/5213))
- Fixed: Katex code could be broken after editing it in Rich Text editor ([#5241](https://github.com/laurent22/joplin/issues/5241))

## [v2.2.2](https://github.com/laurent22/joplin/releases/tag/v2.2.2) (Pre-release) - 2021-07-19T10:28:35Z

Attention: The default font size has been changed in the Markdown editor. You can change it back in Config > Appearance > Editor font size.

- Improved: Ensure that timestamps are not changed when sharing or unsharing a note ([cafaa9c](https://github.com/laurent22/joplin/commit/cafaa9c))
- Improved: Make Markdown editor styling closer to view styling ([#5174](https://github.com/laurent22/joplin/issues/5174))
- Improved: Make sure clipper authorisation notification is displayed, even when in config screen ([b2de27b](https://github.com/laurent22/joplin/commit/b2de27b))

## [v2.1.9](https://github.com/laurent22/joplin/releases/tag/v2.1.9) - 2021-07-19T10:28:43Z

- Improved: Ensure that timestamps are not changed when sharing or unsharing a note ([cafaa9c](https://github.com/laurent22/joplin/commit/cafaa9c))
- Improved: Make sure clipper authorisation notification is displayed, even when in config screen ([b2de27b](https://github.com/laurent22/joplin/commit/b2de27b))

## [v2.2.1](https://github.com/laurent22/joplin/releases/tag/v2.2.1) (Pre-release) - 2021-07-09T17:38:25Z

- New: Add keyboard shortcuts for inserting lists in Rich Text editor ([#5137](https://github.com/laurent22/joplin/issues/5137) by Philipp Keck)
- New: Plugins: Add support for gotoAnything command so that it can be called from plugins ([00b39e4](https://github.com/laurent22/joplin/commit/00b39e4))
- Improved: Interpret only valid search filters ([#5103](https://github.com/laurent22/joplin/issues/5103)) ([#3871](https://github.com/laurent22/joplin/issues/3871) by [@JackGruber](https://github.com/JackGruber))
- Fixed: Empty note list panel does not scale with the note content panel ([#5141](https://github.com/laurent22/joplin/issues/5141)) ([#4524](https://github.com/laurent22/joplin/issues/4524) by Siddharth Magadum)
- Fixed: Fix double-paste also on Linux ([#5143](https://github.com/laurent22/joplin/issues/5143)) ([#4243](https://github.com/laurent22/joplin/issues/4243) by Philipp Keck)
- Fixed: Joplin crashes when trying to Change application layout ([#5134](https://github.com/laurent22/joplin/issues/5134)) ([#5111](https://github.com/laurent22/joplin/issues/5111) by [@mablin7](https://github.com/mablin7))
- Fixed: Plugins: Fix type of PostMessageHandler ([#5138](https://github.com/laurent22/joplin/issues/5138) by [@thejohnfreeman](https://github.com/thejohnfreeman))

## [v2.1.8](https://github.com/laurent22/joplin/releases/tag/v2.1.8) - 2021-07-03T08:25:16Z

- Fixes [#5133](https://github.com/laurent22/joplin/issues/5133): Items keep being uploaded to Joplin Server after a note has been shared.
- Fixed issue where untitled notes where created after a note had been shared and synced

## [v2.1.7](https://github.com/laurent22/joplin/releases/tag/v2.1.7) - 2021-06-26T19:48:55Z

- New: Add support for Joplin Server X-API-MIN-VERSION header ([51f3c00](https://github.com/laurent22/joplin/commit/51f3c00))
- Improved: Activate Joplin Server optimisations ([3d03321](https://github.com/laurent22/joplin/commit/3d03321))
- Fixed: Fixed search when the index contains non-existing notes ([5ecac21](https://github.com/laurent22/joplin/commit/5ecac21))
- Fixed: Notes would appear to be in the wrong notebook after having been shared ([9693187](https://github.com/laurent22/joplin/commit/9693187))

## [v2.1.5](https://github.com/laurent22/joplin/releases/tag/v2.1.5) (Pre-release) - 2021-06-23T15:08:52Z

- New: Plugins: Add support for read and writing text, HTML and images from/to clipboard ([50ecdc2](https://github.com/laurent22/joplin/commit/50ecdc2))
- Improved: Web Clipper now must request authorisation before accessing the application data ([67d9977](https://github.com/laurent22/joplin/commit/67d9977))
- Improved: Also allow disabling TLS errors for Joplin Cloud to go around error UNABLE_TO_GET_ISSUER_CERT_LOCALLY ([118a2f9](https://github.com/laurent22/joplin/commit/118a2f9))
- Improved: Apply monospace font to code dialog in Rich Text editor ([#4905](https://github.com/laurent22/joplin/issues/4905))
- Fixed: Handle special type of code block when importing ENEX files ([#4965](https://github.com/laurent22/joplin/issues/4965))
- Fixed: Fixed error that could prevent a revision from being created, and that would prevent the revision service from processing the rest of the notes ([#5051](https://github.com/laurent22/joplin/issues/5051))
- Fixed: Fixed issue when trying to sync an item associated with a share that no longer exists ([5bb68ba](https://github.com/laurent22/joplin/commit/5bb68ba))
- Fixed: Fixed note history line count information (Regression) ([caabdbd](https://github.com/laurent22/joplin/commit/caabdbd))
- Fixed: Fixed readability of links in notification banners ([#4983](https://github.com/laurent22/joplin/issues/4983))

## [v2.1.3](https://github.com/laurent22/joplin/releases/tag/v2.1.3) (Pre-release) - 2021-06-19T16:32:51Z

- Improved: Optimise first synchronisation, when items have never been synced before ([15ce5cd](https://github.com/laurent22/joplin/commit/15ce5cd))
- Improved: Allow uploading items in batch when synchronising with Joplin Server ([0222c0f](https://github.com/laurent22/joplin/commit/0222c0f))
- Improved: Improved first sync speed when synchronising with Joplin Server ([4dc1210](https://github.com/laurent22/joplin/commit/4dc1210))
- Improved: Mask auth token and password in log ([0d33955](https://github.com/laurent22/joplin/commit/0d33955))
- Improved: Added feature flags to disable Joplin Server sync optimisations by default, so that it still work with server 2.0 ([326fef4](https://github.com/laurent22/joplin/commit/326fef4))
- Improved: Update Mermaid: 8.8.4 -&gt; 8.10.2 ([#5092](https://github.com/laurent22/joplin/issues/5092) by Helmut K. C. Tessarek)
- Fixed: Plugins: Fixed saving secure settings to the keychain, and added way to store plugin settings to settings.json ([ab9bbcb](https://github.com/laurent22/joplin/commit/ab9bbcb))

## [v2.0.11](https://github.com/laurent22/joplin/releases/tag/v2.0.11) - 2021-06-16T17:55:49Z

- Improved: Prevent sync process from being stuck when the download state of a resource is invalid ([5c6fd93](https://github.com/laurent22/joplin/commit/5c6fd93))
- Fixed: Prevent app from crashing when loading a setting value that has been removed ([[#5086](https://github.com/laurent22/joplin/issues/5086)](https://github.com/laurent22/joplin/issues/5086))

## [v2.0.10](https://github.com/laurent22/joplin/releases/tag/v2.0.10) - 2021-06-16T07:58:29Z

- Fixed: Ensure resources are decrypted when sharing a notebook with Joplin Server ([#5080](https://github.com/laurent22/joplin/issues/5080))
- Fixed: Fixed user content URLs when sharing note via Joplin Server ([2cf7067](https://github.com/laurent22/joplin/commit/2cf7067))

## [v2.0.9](https://github.com/laurent22/joplin/releases/tag/v2.0.9) (Pre-release) - 2021-06-12T09:30:30Z

- Improved: Conflict notes will now populate a new field with the ID of the conflict note. ([#5049](https://github.com/laurent22/joplin/issues/5049) by [@Ahmad45123](https://github.com/Ahmad45123))
- Improved: Expose prompt to plugins as a command ([#5058](https://github.com/laurent22/joplin/issues/5058) by Nishant Mittal)
- Improved: Filter out form elements from note body to prevent potential XSS (thanks to [@chinskiy](https://github.com/chinskiy) for the PoC) ([feaecf7](https://github.com/laurent22/joplin/commit/feaecf7))
- Fixed: Wrong field removed in API search ([#5066](https://github.com/laurent22/joplin/issues/5066) by [@JackGruber](https://github.com/JackGruber))

## [v2.0.8](https://github.com/laurent22/joplin/releases/tag/v2.0.8) (Pre-release) - 2021-06-10T16:15:08Z

- New: Add "Retry all" button to sync status screen for items that could not be uploaded ([ca487ad](https://github.com/laurent22/joplin/commit/ca487ad))
- New: Add Joplin Cloud sync target ([21ea325](https://github.com/laurent22/joplin/commit/21ea325))
- New: MacOS: add 'Hide Others' and 'Show All' menu items ([#5024](https://github.com/laurent22/joplin/issues/5024) by Helmut K. C. Tessarek)
- Improved: Allow passing arguments to commands in command palette ([00dc1d8](https://github.com/laurent22/joplin/commit/00dc1d8))
- Improved: Allow restoring a deleted note from note history using command palette ([5fd6571](https://github.com/laurent22/joplin/commit/5fd6571))
- Improved: Improve search with Asian scripts ([#5018](https://github.com/laurent22/joplin/issues/5018)) ([#4613](https://github.com/laurent22/joplin/issues/4613) by [@mablin7](https://github.com/mablin7))
- Improved: Improved Joplin Server error handling ([95d7ccc](https://github.com/laurent22/joplin/commit/95d7ccc))
- Improved: Plugins: Support executing CodeMirror commands from plugins when using execCommand ([#5012](https://github.com/laurent22/joplin/issues/5012) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Recreate http agent when the protocol changes ([#5016](https://github.com/laurent22/joplin/issues/5016) by Roman Musin)
- Fixed: Certain resource paths could be corrupted when saved from the Rich Text editor ([#5034](https://github.com/laurent22/joplin/issues/5034))
- Fixed: Ctrl+Clicking links in Rich Text editor was broken (regression) ([e8a02c2](https://github.com/laurent22/joplin/commit/e8a02c2))
- Fixed: Incorrect list renumbering ([#4914](https://github.com/laurent22/joplin/issues/4914)) ([#4877](https://github.com/laurent22/joplin/issues/4877) by Austin Doupnik)
- Fixed: Inline Katex gets broken when editing in Rich Text editor ([#5052](https://github.com/laurent22/joplin/issues/5052)) ([#5025](https://github.com/laurent22/joplin/issues/5025) by [@Subhra264](https://github.com/Subhra264))
- Fixed: Items are filtered in the API search ([#5017](https://github.com/laurent22/joplin/issues/5017)) ([#5007](https://github.com/laurent22/joplin/issues/5007) by [@JackGruber](https://github.com/JackGruber))

## [v2.0.4](https://github.com/laurent22/joplin/releases/tag/v2.0.4) (Pre-release) - 2021-06-02T12:54:17Z

- Improved: Download plugins from GitHub release ([8f6a475](https://github.com/laurent22/joplin/commit/8f6a475))
- Fixed: Count tags based on showCompletedTodos setting ([#4957](https://github.com/laurent22/joplin/issues/4957)) ([#4411](https://github.com/laurent22/joplin/issues/4411) by [@JackGruber](https://github.com/JackGruber))
- Fixed: Fixes panels overflowing window ([#4991](https://github.com/laurent22/joplin/issues/4991)) ([#4864](https://github.com/laurent22/joplin/issues/4864) by [@mablin7](https://github.com/mablin7))

## [v2.0.2](https://github.com/laurent22/joplin/releases/tag/v2.0.2) (Pre-release) - 2021-05-21T18:07:48Z

- New: Add Share Notebook menu item ([6f2f241](https://github.com/laurent22/joplin/commit/6f2f241))
- New: Add classnames to DOM elements for theming purposes ([#4933](https://github.com/laurent22/joplin/issues/4933) by [@ajilderda](https://github.com/ajilderda))
- Improved: Allow unsharing a note ([f7d164b](https://github.com/laurent22/joplin/commit/f7d164b))
- Improved: Displays error info when Joplin Server fails ([3f0586e](https://github.com/laurent22/joplin/commit/3f0586e))
- Improved: Handle too large items for Joplin Server ([d29624c](https://github.com/laurent22/joplin/commit/d29624c))
- Improved: Import SVG as images when importing ENEX files ([#4968](https://github.com/laurent22/joplin/issues/4968))
- Improved: Import linked local files when importing Markdown files ([#4966](https://github.com/laurent22/joplin/issues/4966)) ([#4433](https://github.com/laurent22/joplin/issues/4433) by [@JackGruber](https://github.com/JackGruber))
- Improved: Improved usability when plugin repository cannot be connected to ([#4462](https://github.com/laurent22/joplin/issues/4462))
- Improved: Made sync more reliable by making it skip items that time out, and improved sync status screen ([15fe119](https://github.com/laurent22/joplin/commit/15fe119))
- Improved: Pass custom CSS property to all export handlers and renderers ([bd08041](https://github.com/laurent22/joplin/commit/bd08041))
- Improved: Regression: It was no longer possible to add list items in an empty note ([6577f4f](https://github.com/laurent22/joplin/commit/6577f4f))
- Improved: Regression: Pasting plain text in Rich Text editor was broken ([9e9bf63](https://github.com/laurent22/joplin/commit/9e9bf63))
- Fixed: Fixed issue with empty panels being created by plugins ([#4926](https://github.com/laurent22/joplin/issues/4926))
- Fixed: Fixed pasting HTML in Rich Text editor, and improved pasting plain text ([2226b79](https://github.com/laurent22/joplin/commit/2226b79))
- Fixed: Improved importing Evernote notes that contain codeblocks ([#4965](https://github.com/laurent22/joplin/issues/4965))
- Fixed: Prevent cursor from jumping to top of page when pasting image ([#4591](https://github.com/laurent22/joplin/issues/4591))

## [v2.0.1](https://github.com/laurent22/joplin/releases/tag/v2.0.1) (Pre-release) - 2021-05-15T13:22:58Z

- New: Add support for sharing notebooks with Joplin Server ([#4772](https://github.com/laurent22/joplin/issues/4772))
- New: Add new date format YYMMDD ([#4954](https://github.com/laurent22/joplin/issues/4954) by Helmut K. C. Tessarek)
- New: Added button to skip an application update ([a31b402](https://github.com/laurent22/joplin/commit/a31b402))
- Fixed: Display proper error message when JEX file is corrupted ([#4958](https://github.com/laurent22/joplin/issues/4958))
- Fixed: Show or hide completed todos in search results based on user settings ([#4951](https://github.com/laurent22/joplin/issues/4951)) ([#4581](https://github.com/laurent22/joplin/issues/4581) by [@JackGruber](https://github.com/JackGruber))
- Fixed: Solve "Resource Id not provided" error ([#4943](https://github.com/laurent22/joplin/issues/4943)) ([#4891](https://github.com/laurent22/joplin/issues/4891) by [@Subhra264](https://github.com/Subhra264))

## [v1.8.5](https://github.com/laurent22/joplin/releases/tag/v1.8.5) - 2021-05-10T11:58:14Z

- Fixed: Fixed pasting of text and images from Word on Windows ([#4916](https://github.com/laurent22/joplin/issues/4916))
- Security: Filter out NOSCRIPT tags that could be used to cause an XSS (CVE-2021-33295) (found by [Jubair Rehman Yousafzai](https://twitter.com/newfolderj)) ([9c20d59](https://github.com/laurent22/joplin/commit/9c20d59))

## [v1.8.4](https://github.com/laurent22/joplin/releases/tag/v1.8.4) (Pre-release) - 2021-05-09T18:05:05Z

- Improved: Improve display of release notes for new versions ([f76f99b](https://github.com/laurent22/joplin/commit/f76f99b))
- Fixed: Ensure that image paths that contain spaces are pasted correctly in the Rich Text editor ([#4916](https://github.com/laurent22/joplin/issues/4916))
- Fixed: Make sure sync startup operations are cleared after startup ([#4919](https://github.com/laurent22/joplin/issues/4919))
- Security: Apply npm audit security fixes ([0b67446](https://github.com/laurent22/joplin/commit/0b67446))
# Joplin changelog

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
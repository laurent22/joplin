# Joplin changelog

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

## [v1.8.3](https://github.com/laurent22/joplin/releases/tag/v1.8.3) (Pre-release) - 2021-05-04T10:38:16Z

- New: Add "id" and "due" search filters ([#4898](https://github.com/laurent22/joplin/issues/4898) by [@JackGruber](https://github.com/JackGruber))
- New: Add synchronization tools to clear local sync state or data ([a6caa35](https://github.com/laurent22/joplin/commit/a6caa35))
- Improved: Bump KaTeX to 0.13.3 ([#4902](https://github.com/laurent22/joplin/issues/4902) by Roman Musin)
- Improved: Skip empty lines while converting selection to list ([#4832](https://github.com/laurent22/joplin/issues/4832)) ([#4813](https://github.com/laurent22/joplin/issues/4813) by Adarsh Singh)
- Fixed: Added RTL support for Markdown editor and Preview. ([#4822](https://github.com/laurent22/joplin/issues/4822)) ([#3991](https://github.com/laurent22/joplin/issues/3991) by Ahmad Mamdouh)
- Fixed: Create own copy of images while pasting ([#4852](https://github.com/laurent22/joplin/issues/4852)) ([#4767](https://github.com/laurent22/joplin/issues/4767) by Nishant Mittal)
- Fixed: Disable WebDAV response caching ([#4887](https://github.com/laurent22/joplin/issues/4887)) ([#4706](https://github.com/laurent22/joplin/issues/4706) by Roman Musin)
- Fixed: Plugin ghost panel and resizing issues ([#4865](https://github.com/laurent22/joplin/issues/4865)) ([#4529](https://github.com/laurent22/joplin/issues/4529) by [@mablin7](https://github.com/mablin7))

## [v1.8.2](https://github.com/laurent22/joplin/releases/tag/v1.8.2) (Pre-release) - 2021-04-25T10:50:51Z

- New: Add "duplicate line" command in Markdown editor ([#4873](https://github.com/laurent22/joplin/issues/4873) by [@CalebJohn](https://github.com/CalebJohn))
- New: Add an option to renew the API token ([#4811](https://github.com/laurent22/joplin/issues/4811) by Helmut K. C. Tessarek)
- New: Add button to copy note ID in Note Properties dialog ([#4749](https://github.com/laurent22/joplin/issues/4749) by Abdallah Ahmed)
- New: Add plugin info when the app crashes
- New: Add support for safe mode, which temporarily disables note rendering and plugins ([#4727](https://github.com/laurent22/joplin/issues/4727))
- Improved: Also duplicate the tags when the note is duplicated ([#4876](https://github.com/laurent22/joplin/issues/4876)) ([#3157](https://github.com/laurent22/joplin/issues/3157) by [@JackGruber](https://github.com/JackGruber))
- Improved: ENTER key no longer submits dialogs when a textarea is focused. ([#4777](https://github.com/laurent22/joplin/issues/4777)) ([#4766](https://github.com/laurent22/joplin/issues/4766) by [@Ahmad45123](https://github.com/Ahmad45123))
- Improved: Fixed editor focus issue when running command from palette ([#4812](https://github.com/laurent22/joplin/issues/4812)) ([#4759](https://github.com/laurent22/joplin/issues/4759) by [@Aksh-Konda](https://github.com/Aksh-Konda))
- Improved: Note list is empty if search field is cleared ([#4739](https://github.com/laurent22/joplin/issues/4739)) ([#4736](https://github.com/laurent22/joplin/issues/4736) by Apoorva Shukla)
- Improved: Show notebook and note title in the title bar ([#4390](https://github.com/laurent22/joplin/issues/4390)) ([#3695](https://github.com/laurent22/joplin/issues/3695) by [@asrient](https://github.com/asrient))
- Improved: Disappearing text in markdown editor ([#4750](https://github.com/laurent22/joplin/issues/4750)) ([#4781](https://github.com/laurent22/joplin/issues/4781) by Adarsh Singh)
- Fixed: Copying code block from Rich Text editor results in two copies of the text ([#4669](https://github.com/laurent22/joplin/issues/4669))
- Fixed: Ensure that invalid plugin settings do not crash the application ([#4562](https://github.com/laurent22/joplin/issues/4562))
- Fixed: File-Links with German Umlauts don't work ([#4804](https://github.com/laurent22/joplin/issues/4804)) ([#4043](https://github.com/laurent22/joplin/issues/4043) by [@Subhra264](https://github.com/Subhra264))
- Fixed: Fixed cursor moved to the top issue in Markdown editor ([#4870](https://github.com/laurent22/joplin/issues/4870) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Highlight existing text in global search field ([#4773](https://github.com/laurent22/joplin/issues/4773)) ([#4769](https://github.com/laurent22/joplin/issues/4769) by Siddhant Sehgal)
- Fixed: Prevent Goto anything from changing folders when all notes filter is on ([#4751](https://github.com/laurent22/joplin/issues/4751)) ([#4697](https://github.com/laurent22/joplin/issues/4697) by [@jalajcodes](https://github.com/jalajcodes))
- Fixed: Prevents plugin from causing an error when the app closes ([#4570](https://github.com/laurent22/joplin/issues/4570))
- Fixed: Regression: Fixed handling of provisional status of note
- Fixed: Roboto font in plugins ([#4755](https://github.com/laurent22/joplin/issues/4755)) ([#4754](https://github.com/laurent22/joplin/issues/4754) by Brett Bender)
- Fixed: Scroll position is not remembered in Markdown editor ([#4806](https://github.com/laurent22/joplin/issues/4806)) ([#4797](https://github.com/laurent22/joplin/issues/4797) by Roman Musin)
- Fixed: Set plain/text clipboard while copying ([#4791](https://github.com/laurent22/joplin/issues/4791)) ([#4788](https://github.com/laurent22/joplin/issues/4788) by Nishant Mittal)

## [v1.8.1](https://github.com/laurent22/joplin/releases/tag/v1.8.1) (Pre-release) - 2021-03-29T10:46:41Z

- New: Add monospace enforcement for certain elements in Markdown editor ([#4689](https://github.com/laurent22/joplin/issues/4689) by [@CalebJohn](https://github.com/CalebJohn))
- New: Add support for higlighting text from Rich Text editor
- New: Add support for strikethrough, sub, sup and insert formatting on Rich Text editor
- New: Save user settings to JSON file
- Improved: Allow registering multiple settings in one call ([#4627](https://github.com/laurent22/joplin/issues/4627)) ([#4614](https://github.com/laurent22/joplin/issues/4614) by [@jalajcodes](https://github.com/jalajcodes))
- Improved: Api: Don't compress image when resource is added through api ([#4660](https://github.com/laurent22/joplin/issues/4660)) ([#4655](https://github.com/laurent22/joplin/issues/4655) by Nishant Mittal)
- Improved: Bring editor katex highlight in line with renderer ([#4632](https://github.com/laurent22/joplin/issues/4632) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Ctrl+Shift+B to viewer when editor invisible ([#4537](https://github.com/laurent22/joplin/issues/4537)) ([#2810](https://github.com/laurent22/joplin/issues/2810) by Neeraj Kashyap)
- Improved: Enforce utf-8 charset for plugin scripts ([#4509](https://github.com/laurent22/joplin/issues/4509) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Filter "notebook" can now be negated ([#4651](https://github.com/laurent22/joplin/issues/4651) by Naveen M V)
- Improved: Give plugin config section without an icon, a default icon
- Improved: Improve mathmode syntax highlighting ([#4580](https://github.com/laurent22/joplin/issues/4580)) ([#4554](https://github.com/laurent22/joplin/issues/4554) by James Wright)
- Improved: Improved solarized dark theme ([#4748](https://github.com/laurent22/joplin/issues/4748)) ([#3887](https://github.com/laurent22/joplin/issues/3887) by Anakai Richards)
- Improved: Improved spell checking support in dialogs and text input fields ([#4458](https://github.com/laurent22/joplin/issues/4458))
- Improved: Plugins: Focus dialog when it is opened so that ENTER/ESC shortcuts work ([#4474](https://github.com/laurent22/joplin/issues/4474))
- Improved: Plugins: Only call onNoteChange for the current note
- Improved: Remove branch name in detached head state ([#4636](https://github.com/laurent22/joplin/issues/4636) by Helmut K. C. Tessarek)
- Improved: Reset window hash to allow clicking an anchor multiple times ([#4538](https://github.com/laurent22/joplin/issues/4538) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Save geo-location when saving note
- Improved: Select search text input when focusing it ([#4586](https://github.com/laurent22/joplin/issues/4586) by António Ramadas)
- Improved: Set keep-alive for WebDAV/Nextcloud sync ([#4668](https://github.com/laurent22/joplin/issues/4668) by Roman Musin)
- Improved: Set keep-alive on http(s) requests ([#4625](https://github.com/laurent22/joplin/issues/4625) by Roman Musin)
- Improved: Sort plugin config sections alphabetically
- Improved: Toggle math highlighting in editor with markdown options ([#4631](https://github.com/laurent22/joplin/issues/4631) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Allow copying images from Joplin to external editors ([#4724](https://github.com/laurent22/joplin/issues/4724)) ([#4602](https://github.com/laurent22/joplin/issues/4602) by Nishant Mittal)
- Fixed: Fix mermaid diagrams in WYSIWYG editor ([#4670](https://github.com/laurent22/joplin/issues/4670)) ([#4612](https://github.com/laurent22/joplin/issues/4612) by [@mablin7](https://github.com/mablin7))
- Fixed: Fixed calendar styling ([#4703](https://github.com/laurent22/joplin/issues/4703)) ([#4397](https://github.com/laurent22/joplin/issues/4397) by Harshit Kathuria)
- Fixed: Fixed exporting as HTML or PDF when a plugin is active, and make sure plugin assets are also exported ([#4452](https://github.com/laurent22/joplin/issues/4452))
- Fixed: Fixed formatting of consecutive code blocks ([#4416](https://github.com/laurent22/joplin/issues/4416))
- Fixed: Fixed issue which could cause plugin views to be orphaned
- Fixed: Fixed rendering of note and resource links
- Fixed: Improved enabling/disabling commands depending on application state ([#4473](https://github.com/laurent22/joplin/issues/4473))
- Fixed: Improved handling of empty paths for Joplin Server sync target ([#4426](https://github.com/laurent22/joplin/issues/4426))
- Fixed: Make config sidebar vertically scrollable, and make it grow horizontally depending on menu items ([#4491](https://github.com/laurent22/joplin/issues/4491))
- Fixed: Make plugin links clickable from search ([#4548](https://github.com/laurent22/joplin/issues/4548)) ([#4505](https://github.com/laurent22/joplin/issues/4505) by Roman Musin)
- Fixed: Plugin Update error when plugin was installed manually ([#4725](https://github.com/laurent22/joplin/issues/4725)) ([#4723](https://github.com/laurent22/joplin/issues/4723) by [@mablin7](https://github.com/mablin7))
- Fixed: Plugins: Apply "fields" query parameter when requesting data from data API ([#4407](https://github.com/laurent22/joplin/issues/4407))
- Fixed: Refresh note tags when a note is moved to another folder ([#4574](https://github.com/laurent22/joplin/issues/4574)) ([#4369](https://github.com/laurent22/joplin/issues/4369) by Roman Musin)
- Fixed: Updating a disabled plugin enables it ([#4711](https://github.com/laurent22/joplin/issues/4711)) ([#4683](https://github.com/laurent22/joplin/issues/4683) by [@mablin7](https://github.com/mablin7))
- Fixed: Wrong background color for the table button in the toolbar ([#4681](https://github.com/laurent22/joplin/issues/4681)) ([#4398](https://github.com/laurent22/joplin/issues/4398) by [@zozolina123](https://github.com/zozolina123))

## [v1.7.11](https://github.com/laurent22/joplin/releases/tag/v1.7.11) - 2021-02-03T12:50:01Z

- Fixed: Regression: Fixed network request repeat mechanism

## [v1.7.10](https://github.com/laurent22/joplin/releases/tag/v1.7.10) - 2021-01-30T13:25:29Z

- New: Added button to browse plugins
- New: Allow updating a plugin
- New: Plugins: Add support for "keywords" manifest field
- New: Plugins: Add support for `joplin.plugins.installationDir` to allow accessing external files packaged with the plugin
- New: Plugins: Add support for `joplin.plugins.require` API to allow using sqlite3 or fs-extra from a plugin
- New: Plugins: Add support for `plugins.dataDir` function, to provide a path for plugin to store its own data
- New: Plugins: Added support for bi-directional messages in content scripts and webview scripts using postMessage
- Fixed: Added missing translations ([#4363](https://github.com/laurent22/joplin/issues/4363))
- Fixed: Fixed copying text from Rich Text editor ([#4441](https://github.com/laurent22/joplin/issues/4441))
- Fixed: Fixed plugin panel issue that could crash app in rare case
- Fixed: Make sure note is automatically saved when format is set via keyboard shortcut in Rich Text editor ([#4337](https://github.com/laurent22/joplin/issues/4337))
- Fixed: Plugins: Fixed dropdown settings
- Fixed: Some commands were no longer working ([#4343](https://github.com/laurent22/joplin/issues/4343)) ([#4338](https://github.com/laurent22/joplin/issues/4338) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Do not allow installing plugins incompatible with current app version
- Improved: Enable TLS options for Joplin Server
- Improved: Improved error handling when importing ENEX
- Improved: In config screen, click on a plugin name to open its home page
- Improved: Move plugin settings under separate section in config menu
- Improved: Some imported ENEX files incorrectly had invisible sections

## [v1.7.9](https://github.com/laurent22/joplin/releases/tag/v1.7.9) (Pre-release) - 2021-01-28T09:50:21Z

- New: Plugins: Add support for `joplin.plugins.installationDir` to allow accessing external files packaged with the plugin

## [v1.7.6](https://github.com/laurent22/joplin/releases/tag/v1.7.6) (Pre-release) - 2021-01-27T10:36:05Z

- Fixed: Fixed installing plugins

## [v1.7.5](https://github.com/laurent22/joplin/releases/tag/v1.7.5) (Pre-release) - 2021-01-26T09:53:05Z

- New: Plugins: Add support for `joplin.plugins.require` API to allow using sqlite3 or fs-extra from a plugin
- New: Plugins: Add support for `plugins.dataDir` function, to provide a path for plugin to store its own data
- Improved: Do not allow installing plugins incompatible with current app version
- Improved: Improved error handling when importing ENEX
- Improved: In config screen, click on a plugin name to open its home page
- Improved: Localise "Click to add tags" button
- Improved: Some imported ENEX files incorrectly had invisible sections

* * *

- New: Added button to browse plugins
- New: Plugins: Add support for "keywords" manifest field
- New: Plugins: Added support for bi-directional messages in content scripts and webview scripts using postMessage
- New: Allow updating a plugin
- Improved: Enable TLS options for Joplin Server
- Improved: Move plugin settings under separate section in config menu
- Fixed: Added missing translations ([#4363](https://github.com/laurent22/joplin/issues/4363))
- Fixed: Make sure note is automatically saved when format is set via keyboard shortcut in Rich Text editor ([#4337](https://github.com/laurent22/joplin/issues/4337))
- Fixed: Plugins: Fixed dropdown settings
- Fixed: Some commands were no longer working ([#4343](https://github.com/laurent22/joplin/issues/4343)) ([#4338](https://github.com/laurent22/joplin/issues/4338) by [@CalebJohn](https://github.com/CalebJohn))

## [v1.7.4](https://github.com/laurent22/joplin/releases/tag/v1.7.4) (Pre-release) - 2021-01-22T17:58:38Z

- New: Added button to browse plugins
- New: Plugins: Add support for "keywords" manifest field
- New: Plugins: Added support for bi-directional messages in content scripts and webview scripts using postMessage
- New: Allow updating a plugin
- Improved: Enable TLS options for Joplin Server
- Improved: Move plugin settings under separate section in config menu
- Fixed: Added missing translations ([#4363](https://github.com/laurent22/joplin/issues/4363))
- Fixed: Make sure note is automatically saved when format is set via keyboard shortcut in Rich Text editor ([#4337](https://github.com/laurent22/joplin/issues/4337))
- Fixed: Plugins: Fixed dropdown settings
- Fixed: Some commands were no longer working ([#4343](https://github.com/laurent22/joplin/issues/4343)) ([#4338](https://github.com/laurent22/joplin/issues/4338) by [@CalebJohn](https://github.com/CalebJohn))

## [v1.6.8](https://github.com/laurent22/joplin/releases/tag/v1.6.8) - 2021-01-20T18:11:34Z

- Fixed: Fixed infinite sync issue with OneDrive ([#4305](https://github.com/laurent22/joplin/issues/4305))

## [v1.7.3](https://github.com/laurent22/joplin/releases/tag/v1.7.3) (Pre-release) - 2021-01-20T11:23:50Z

- New: Plugins: Add support for "keywords" manifest field
- New: Plugins: Added support for bi-directional messages in content scripts and webview scripts using postMessage
- New: Allow updating a plugin
- Fixed: Some commands were no longer working ([#4343](https://github.com/laurent22/joplin/issues/4343)) ([#4338](https://github.com/laurent22/joplin/issues/4338) by [@CalebJohn](https://github.com/CalebJohn))

## [v1.6.7](https://github.com/laurent22/joplin/releases/tag/v1.6.7) - 2021-01-11T23:20:33Z

- Fixed (regression): Some commands were no longer working ([#4343](https://github.com/laurent22/joplin/issues/4343)) ([#4338](https://github.com/laurent22/joplin/issues/4338) by [@CalebJohn](https://github.com/CalebJohn))

## [v1.6.6](https://github.com/laurent22/joplin/releases/tag/v1.6.6) - 2021-01-09T16:15:31Z

- New: Add way to install plugin from file

## [v1.6.5](https://github.com/laurent22/joplin/releases/tag/v1.6.5) (Pre-release) - 2021-01-09T01:24:32Z

- New: Plugins: Added joplin.settings.onChange event
- Improved: Do not display error message when fixing ENEX resource mime type ([#4310](https://github.com/laurent22/joplin/issues/4310))
- Improved: Handle case where a command is sent to an editor that is gone
- Improved: Improved support for bold and italic format when importing ENEX file ([#4316](https://github.com/laurent22/joplin/issues/4316))
- Fixed: Fix issue that was preventing editor context menu from being refreshed ([#4303](https://github.com/laurent22/joplin/issues/4303) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fixed OneDrive issue that would require a full resync every time ([#4324](https://github.com/laurent22/joplin/issues/4324)) ([#4313](https://github.com/laurent22/joplin/issues/4313) by Jonathan Heard)
- Fixed: Fixed attaching local files that contain spaces in path
- Fixed: Fixed context menu not being displayed on high DPI screens
- Fixed: Plugins: Fixed "exportFolders" command when exporting JEX file ([#4308](https://github.com/laurent22/joplin/issues/4308))

## [v1.6.4](https://github.com/laurent22/joplin/releases/tag/v1.6.4) (Pre-release) - 2021-01-07T19:11:32Z

- New: Add support for searching and installing plugins from repository
- Improved: Support natural sorting by title ([#4272](https://github.com/laurent22/joplin/issues/4272) by [@volatilevar](https://github.com/volatilevar))
- Fixed: [#4317](https://github.com/laurent22/joplin/issues/4317): Spell checker inserts correction at wrong location ([#4318](https://github.com/laurent22/joplin/issues/4318)) ([#4317](https://github.com/laurent22/joplin/issues/4317) by [@CalebJohn](https://github.com/CalebJohn))

## [v1.6.2](https://github.com/laurent22/joplin/releases/tag/v1.6.2) (Pre-release) - 2021-01-04T22:34:55Z

- New: Add more log info when a revision cannot be deleted due to still-encrypted item
- New: Plugins: Add support for hiding and showing panels
- New: Plugins: Added joplin.workspace.selectedFolder()
- Improved: Add extra macOS keys ([#4259](https://github.com/laurent22/joplin/issues/4259)) ([#4257](https://github.com/laurent22/joplin/issues/4257) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Made editor padding more consistent and ensure it is present even when sidebars are gone
- Improved: Plugins: Allow loading external JS or CSS from dialog
- Improved: Sort attachments in a case insensitive way in Attachments screen ([#4273](https://github.com/laurent22/joplin/issues/4273) by [@Daeraxa](https://github.com/Daeraxa))
- Improved: Upload Big Notes to Onedrive ([#4120](https://github.com/laurent22/joplin/issues/4120)) ([#3528](https://github.com/laurent22/joplin/issues/3528) by Jonathan Heard)
- Fixed: `file://` URLs would not be rendered correctly
- Fixed: MacOS: Fixed paste as text in Rich Text editor
- Fixed: Plugins: Allow API paths that contain 4 elements ([#4285](https://github.com/laurent22/joplin/issues/4285))

## [v1.5.14](https://github.com/laurent22/joplin/releases/tag/v1.5.14) - 2020-12-30T01:48:46Z

- Fixed: Fixed importing ENEX files that contain hidden sections

## [v1.6.1](https://github.com/laurent22/joplin/releases/tag/v1.6.1) (Pre-release) - 2020-12-29T19:37:45Z

At this point, this release is only to allow using Joplin Server as a sync target.

## [v1.5.13](https://github.com/laurent22/joplin/releases/tag/v1.5.13) - 2020-12-29T18:29:15Z

- Improved: Improve support for SVG images when importing ENEX files

## [v1.5.12](https://github.com/laurent22/joplin/releases/tag/v1.5.12) - 2020-12-28T15:14:08Z

Fixed ENEX import regression: Fix issue when importing ENEX file that contains invalid list elements

- New: Add support for media players (video, audio and PDF)
- New: Add table captions when importing ENEX files
- New: Added doc about Rich Text editor and added way to dismiss warning banner
- New: MacOS: Notarize application
- New: Plugins: Add support for content script asset files, for Markdown-it plugins
- New: Plugins: Add support for context menu items on notebooks and tags
- New: Plugins: Add support for workspace.onSyncStart event
- New: Plugins: Added a way to execute commands from Markdown-it content scripts
- Fixed: Fix End key behavior with Codemirror spellcheck ([#4215](https://github.com/laurent22/joplin/issues/4215) by Caleb John)
- Fixed: Fixed basic search when executing a query in Chinese ([#4034](https://github.com/laurent22/joplin/issues/4034) by Naveen M V)
- Fixed: Fixed context menu when the UI is zoomed in or out ([#4201](https://github.com/laurent22/joplin/issues/4201))
- Fixed: Fixed importing certain code blocks from ENEX
- Fixed: Fixed importing ENEX files that contain empty resources
- Fixed: Fixed importing ENEX files that contain resources with invalid mime type
- Fixed: Fixed issue when searching for text that contains diacritic ([#4152](https://github.com/laurent22/joplin/issues/4152)) ([#4025](https://github.com/laurent22/joplin/issues/4025) by Roman Musin)
- Fixed: Fixed issue with attachment paths being invalid when user has spaces in home directory path.
- Fixed: Fixed issue with note not being saved when a column is added or remove from Rich Text editor
- Fixed: Fixed issues when importing hidden tables within hidden sections in Enex files
- Fixed: Fixed numbered list bug in markdown editor ([#4116](https://github.com/laurent22/joplin/issues/4116)) ([#3917](https://github.com/laurent22/joplin/issues/3917) by [@MichBoi](https://github.com/MichBoi))
- Fixed: Fixed potential crash when watching note files or resources
- Fixed: Fixed title input field width on small windows
- Fixed: Focus editor after pressing toolbar buttons ([#4037](https://github.com/laurent22/joplin/issues/4037)) ([#4036](https://github.com/laurent22/joplin/issues/4036) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Plugins: Fixed disabling plugin files that start with "_"
- Fixed: Prevent double paste when using Shift+Ctrl+V ([#4243](https://github.com/laurent22/joplin/issues/4243))
- Fixed: Prevents crash when invalid spell checker language is selected, and provide fallback for invalid language codes ([#4146](https://github.com/laurent22/joplin/issues/4146))
- Fixed: Register Markdown editor commands with the Keyboard Shortcut editor ([#4136](https://github.com/laurent22/joplin/issues/4136)) ([#4130](https://github.com/laurent22/joplin/issues/4130) by Caleb John)
- Improved: Display Katex parsing errors
- Improved: Improved warning banner colors
- Improved: Plugins: Commands would not show up in keymap editor when no shortcut was associated with them
- Improved: Plugins: Improved note change event handling.
- Improved: Removed warning for Markdown editor spell checking
- Improved: Restrict auto-detection of links, and added option to toggle linkify ([#4205](https://github.com/laurent22/joplin/issues/4205))
- Improved: Rich Text: Do not converts to markdown links URLs that would be linkified
- Improved: Translation: Update zh_CN ([#4195](https://github.com/laurent22/joplin/issues/4195) by Zhang YANG)
- Improved: Update macOS icon for macOS Big Sur
- Improved: Update Mermaid: 8.8.1 -&gt; 8.8.4 ([#4193](https://github.com/laurent22/joplin/issues/4193) by Helmut K. C. Tessarek)
- Improved: Use plugins whenever printing or exporting notes

## [v1.5.11](https://github.com/laurent22/joplin/releases/tag/v1.5.11) - 2020-12-27T19:54:07Z

- New: Add support for media players (video, audio and PDF)
- New: Add table captions when importing ENEX files
- New: Added doc about Rich Text editor and added way to dismiss warning banner
- New: MacOS: Notarize application
- New: Plugins: Add support for content script asset files, for Markdown-it plugins
- New: Plugins: Add support for context menu items on notebooks and tags
- New: Plugins: Add support for workspace.onSyncStart event
- New: Plugins: Added a way to execute commands from Markdown-it content scripts
- Fixed: Fix End key behavior with Codemirror spellcheck ([#4215](https://github.com/laurent22/joplin/issues/4215) by Caleb John)
- Fixed: Fixed basic search when executing a query in Chinese ([#4034](https://github.com/laurent22/joplin/issues/4034) by Naveen M V)
- Fixed: Fixed context menu when the UI is zoomed in or out ([#4201](https://github.com/laurent22/joplin/issues/4201))
- Fixed: Fixed importing certain code blocks from ENEX
- Fixed: Fixed importing ENEX files that contain empty resources
- Fixed: Fixed importing ENEX files that contain resources with invalid mime type
- Fixed: Fixed issue when searching for text that contains diacritic ([#4152](https://github.com/laurent22/joplin/issues/4152)) ([#4025](https://github.com/laurent22/joplin/issues/4025) by Roman Musin)
- Fixed: Fixed issue with attachment paths being invalid when user has spaces in home directory path.
- Fixed: Fixed issue with note not being saved when a column is added or remove from Rich Text editor
- Fixed: Fixed issues when importing hidden tables within hidden sections in Enex files
- Fixed: Fixed numbered list bug in markdown editor ([#4116](https://github.com/laurent22/joplin/issues/4116)) ([#3917](https://github.com/laurent22/joplin/issues/3917) by [@MichBoi](https://github.com/MichBoi))
- Fixed: Fixed potential crash when watching note files or resources
- Fixed: Fixed title input field width on small windows
- Fixed: Focus editor after pressing toolbar buttons ([#4037](https://github.com/laurent22/joplin/issues/4037)) ([#4036](https://github.com/laurent22/joplin/issues/4036) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Plugins: Fixed disabling plugin files that start with "_"
- Fixed: Prevent double paste when using Shift+Ctrl+V ([#4243](https://github.com/laurent22/joplin/issues/4243))
- Fixed: Prevents crash when invalid spell checker language is selected, and provide fallback for invalid language codes ([#4146](https://github.com/laurent22/joplin/issues/4146))
- Fixed: Register Markdown editor commands with the Keyboard Shortcut editor ([#4136](https://github.com/laurent22/joplin/issues/4136)) ([#4130](https://github.com/laurent22/joplin/issues/4130) by Caleb John)
- Improved: Display Katex parsing errors
- Improved: Improved warning banner colors
- Improved: Plugins: Commands would not show up in keymap editor when no shortcut was associated with them
- Improved: Plugins: Improved note change event handling.
- Improved: Removed warning for Markdown editor spell checking
- Improved: Restrict auto-detection of links, and added option to toggle linkify ([#4205](https://github.com/laurent22/joplin/issues/4205))
- Improved: Rich Text: Do not converts to markdown links URLs that would be linkified
- Improved: Translation: Update zh_CN ([#4195](https://github.com/laurent22/joplin/issues/4195) by Zhang YANG)
- Improved: Update macOS icon for macOS Big Sur
- Improved: Update Mermaid: 8.8.1 -&gt; 8.8.4 ([#4193](https://github.com/laurent22/joplin/issues/4193) by Helmut K. C. Tessarek)
- Improved: Use plugins whenever printing or exporting notes

## [v1.5.10](https://github.com/laurent22/joplin/releases/tag/v1.5.10) (Pre-release) - 2020-12-26T12:35:36Z

- New: Add table captions when importing ENEX files
- Improved: Display Katex parsing errors
- Improved: Removed warning for Markdown editor spell checking
- Improved: Update macOS icon for macOS Big Sur
- Fixed: Fixed context menu when the UI is zoomed in or out ([#4201](https://github.com/laurent22/joplin/issues/4201))
- Fixed: Fixed issues when importing hidden tables within hidden sections in Enex files
- Fixed: Prevent double paste when using Shift+Ctrl+V ([#4243](https://github.com/laurent22/joplin/issues/4243))

## [v1.5.9](https://github.com/laurent22/joplin/releases/tag/v1.5.9) (Pre-release) - 2020-12-23T18:01:08Z

- Improved: Improved error handling when importing ENEX files

## [v1.5.8](https://github.com/laurent22/joplin/releases/tag/v1.5.8) (Pre-release) - 2020-12-20T09:45:19Z

- New: Plugins: Add support for content script asset files, for Markdown-it plugins
- New: Plugins: Add support for context menu items on notebooks and tags
- New: Plugins: Added a way to execute commands from Markdown-it content scripts
- Improved: Use plugins whenever printing or exporting notes
- Fixed: Fix End key behavior with Codemirror spellcheck ([#4215](https://github.com/laurent22/joplin/issues/4215) by Caleb John)
- Fixed: Fixed importing ENEX files that contain resources with invalid mime type
- Fixed: Fixed importing certain code blocks from ENEX
- Fixed: Plugins: Fixed disabling plugin files that start with "_"
- Fixed: Register Markdown editor commands with the Keyboard Shortcut editor ([#4136](https://github.com/laurent22/joplin/issues/4136)) ([#4130](https://github.com/laurent22/joplin/issues/4130) by Caleb John)

## [v1.5.7](https://github.com/laurent22/joplin/releases/tag/v1.5.7) (Pre-release) - 2020-12-10T12:58:33Z

- New: MacOS: Notarize application
- New: Add support for media players (video, audio and PDF)
- New: Added doc about Rich Text editor and added way to dismiss warning banner
- New: Plugins: Add support for workspace.onSyncStart event
- Improved: Improved warning banner colors
- Improved: Plugins: Commands would not show up in keymap editor when no shortcut was associated with them
- Improved: Restrict auto-detection of links, and added option to toggle linkify ([#4205](https://github.com/laurent22/joplin/issues/4205))
- Improved: Rich Text: Do not converts to markdown links URLs that would be linkified
- Improved: Translation: Update zh_CN ([#4195](https://github.com/laurent22/joplin/issues/4195) by Zhang YANG)
- Improved: Update Mermaid: 8.8.1 -&gt; 8.8.4 ([#4193](https://github.com/laurent22/joplin/issues/4193) by Helmut K. C. Tessarek)
- Improved: Plugins: Improved note change event handling.
- Fixed: Fixed basic search when executing a query in Chinese ([#4034](https://github.com/laurent22/joplin/issues/4034) by Naveen M V)
- Fixed: Fixed importing ENEX files that contain empty resources
- Fixed: Fixed issue with note not being saved when a column is added or remove from Rich Text editor
- Fixed: Fixed numbered list bug in markdown editor ([#4116](https://github.com/laurent22/joplin/issues/4116)) ([#3917](https://github.com/laurent22/joplin/issues/3917) by [@MichBoi](https://github.com/MichBoi))
- Fixed: Fixed potential crash when watching note files or resources
- Fixed: Focus editor after pressing toolbar buttons ([#4037](https://github.com/laurent22/joplin/issues/4037)) ([#4036](https://github.com/laurent22/joplin/issues/4036) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Prevents crash when invalid spell checker language is selected, and provide fallback for invalid language codes ([#4146](https://github.com/laurent22/joplin/issues/4146))
- Fixed: Fixed issue when searching for text that contains diacritic ([#4152](https://github.com/laurent22/joplin/issues/4152)) ([#4025](https://github.com/laurent22/joplin/issues/4025) by Roman Musin)
- Fixed: Fixed issue with attachment paths being invalid when user has spaces in home directory path.
- Fixed: Fixed title input field width on small windows

## [v1.5.4](https://github.com/laurent22/joplin/releases/tag/v1.5.4) (Pre-release) - 2020-12-05T12:07:49Z

- New: MacOS: Notarize application
- Improved: Plugins: Improved note change event handling.
- Fixed: Fixed basic search when executing a query in Chinese ([#4034](https://github.com/laurent22/joplin/issues/4034) by Naveen M V)
- Fixed: Fixed importing ENEX files that contain empty resources
- Fixed: Fixed issue with note not being saved when a column is added or remove from Rich Text editor
- Fixed: Fixed numbered list bug in markdown editor ([#4116](https://github.com/laurent22/joplin/issues/4116)) ([#3917](https://github.com/laurent22/joplin/issues/3917) by [@MichBoi](https://github.com/MichBoi))
- Fixed: Fixed potential crash when watching note files or resources
- Fixed: Focus editor after pressing toolbar buttons ([#4037](https://github.com/laurent22/joplin/issues/4037)) ([#4036](https://github.com/laurent22/joplin/issues/4036) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Prevents crash when invalid spell checker language is selected, and provide fallback for invalid language codes ([#4146](https://github.com/laurent22/joplin/issues/4146))

## [v1.4.19](https://github.com/laurent22/joplin/releases/tag/v1.4.19) - 2020-12-01T11:11:16Z

- Improved: Disable soft-break by default in Markdown rendering

Although soft-break is part of the CommonMark spec, it requires a special editor that can wrap text at a certain limit. That doesn't make much sense in Joplin, where the editor can have various sizes, from desktop to mobile, and where the tools to wrap text are not present.

## [v1.4.18](https://github.com/laurent22/joplin/releases/tag/v1.4.18) - 2020-11-28T12:21:41Z

- Fixed: Fixed notifications on macOS
- Fixed: Re-enabled ASAR packing to improve startup time

## [v1.4.16](https://github.com/laurent22/joplin/releases/tag/v1.4.16) - 2020-11-27T19:40:16Z

- Fixed: Fix sorting by title in a case insensitive way
- Fixed: Fixed spell checker crash when no language is selected

## [v1.4.15](https://github.com/laurent22/joplin/releases/tag/v1.4.15) - 2020-11-27T13:25:43Z

- Fixed: Notifications on macOS
- Fixed: Fixed potential crash when watching note files or resources
- Fixed: Prevents crash when invalid spell checker language is selected, and provide fallback for invalid language codes ([#4146](https://github.com/laurent22/joplin/issues/4146))
- Plugins: Fixed webview postMessage call

## [v1.4.12](https://github.com/laurent22/joplin/releases/tag/v1.4.12) - 2020-11-23T18:58:07Z

**Breaking Changes:**

- If you use the Clipper API, please note that there are a few breaking changes in this version. See this link for more information: https://github.com/laurent22/joplin/pull/3983
- Plugins: `joplin.views.dialogs.open()` now returns an object instead of the button ID that was clicked. So for example instead of getting just `"ok"`, you will get `{ "id": "ok" }`. This is to allow adding form data to that object.

**Deprecated:**

The following features are deprecated. It will still work for now but please update your code:

- Plugins: All `create()` functions under `joplin.views` now take a `viewId` as a first parameter.
- Plugins: `MenuItemLocation.Context` is deprecated and is now an alias for `MenuItemLocation.NoteListContextMenu`
- Plugins: The `app_min_version` manifest property is now required. If not provided it will assume v14.
- Plugins: The `id` manifest property is now required. If not set, it will be the plugin filename or directory.

Plugin doc has been updated with some info about the [development process](https://joplinapp.org/api/references/plugin_api/classes/joplin.html).

- New: Add {{bowm}} and {{bows}} - Beginning Of Week (Monday/Sunday) ([#4023](https://github.com/laurent22/joplin/issues/4023) by Helmut K. C. Tessarek)
- New: Add config screen to add, remove or enable, disable plugins
- New: Add option to toggle spellchecking for the markdown editor ([#4109](https://github.com/laurent22/joplin/issues/4109) by [@CalebJohn](https://github.com/CalebJohn))
- New: Added toolbar button to switch spell checker language
- New: Adds spell checker support for Rich Text editor ([#3974](https://github.com/laurent22/joplin/issues/3974))
- New: Allow customising application layout
- New: Api: Added ability to watch resource file
- New: Api: Added way to get the notes associated with a resource
- New: API: Adds ability to paginate data ([#3983](https://github.com/laurent22/joplin/issues/3983))
- New: Plugins: Add command "editorSetText" for desktop app
- New: Plugins: Add support for editor context menu
- New: Plugins: Add support for external CodeMirror plugins ([#4015](https://github.com/laurent22/joplin/issues/4015) by [@CalebJohn](https://github.com/CalebJohn))
- New: Plugins: Add support for JPL archive format
- New: Plugins: Added command to export folders and notes
- New: Plugins: Added support app_min_version property and made it required
- Fixed: Api: Fix note and resource association end points
- Fixed: Display note count for conflict folder, and display notes even if they are completed to-dos ([#3997](https://github.com/laurent22/joplin/issues/3997))
- Fixed: Fix crash due to React when trying to upgrade sync target ([#4098](https://github.com/laurent22/joplin/issues/4098))
- Fixed: Fix drag and drop behaviour to "copy" instead of "move" ([#4031](https://github.com/laurent22/joplin/issues/4031) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fix handling of certain keys in shortcut editor ([#4022](https://github.com/laurent22/joplin/issues/4022) by Helmut K. C. Tessarek)
- Fixed: Fix handling of new line escaping when using external edit
- Fixed: Fix size of search bar area when notebook is empty
- Fixed: Fixed importing certain ENEX files that contain invalid dates
- Fixed: Fixed inconsistent note list state when using search ([#3904](https://github.com/laurent22/joplin/issues/3904))
- Fixed: Fixed issue when a newly created note would be automatically moved to the wrong folder on save ([#4038](https://github.com/laurent22/joplin/issues/4038))
- Fixed: Fixed issue with note being saved after word has been replaced by spell checker
- Fixed: Fixed links imported from ENEX as HTML ([#4119](https://github.com/laurent22/joplin/issues/4119))
- Fixed: Fixed Markdown rendering when code highlighting is disabled
- Fixed: Fixed note list overflow when resized very small
- Fixed: Fixed text editor button tooltips
- Fixed: Plugins: Fix crash when path includes trailing slash
- Fixed: Plugins: Fixed issue with dialog being empty in some cases
- Fixed: Plugins: Fixed issue with toolbar button key not being unique
- Fixed: Prevent log from filling up when certain external editors trigger many watch events ([#4011](https://github.com/laurent22/joplin/issues/4011))
- Fixed: Regression: Fix application name
- Fixed: Regression: Fix exporting to HTML and PDF
- Fixed: Regression: Fixed external edit file watching
- Fixed: Resource links could not be opened from Rich Text editor on Linux ([#4073](https://github.com/laurent22/joplin/issues/4073))
- Fixed: Tags could not be selected in some cases ([#3876](https://github.com/laurent22/joplin/issues/3876))
- Improved: Allow exporting conflict notes ([#4095](https://github.com/laurent22/joplin/issues/4095))
- Improved: Allow lowercase filters when doing search
- Improved: Api: Always include 'has_more' field for paginated data
- Improved: Api: Make sure pagination sort options are respected for search and other requests
- Improved: Attempt to fix Outlook drag and drop on Markdown editor ([#4093](https://github.com/laurent22/joplin/issues/4093) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Change Markdown rendering to align with CommonMark spec ([#3839](https://github.com/laurent22/joplin/issues/3839))
- Improved: Disable spell checker on config and search input fields
- Improved: Disabled the auto update option in linux ([#4102](https://github.com/laurent22/joplin/issues/4102)) ([#4096](https://github.com/laurent22/joplin/issues/4096) by Anshuman Pandey)
- Improved: Make Markdown editor selection more visible in Dark mode
- Improved: Optimized resizing window
- Improved: Plugins: Allow retrieving form values from dialogs
- Improved: Plugins: Force plugin devtool dialog to be detached
- Improved: Plugins: Make sure "replaceSelection" command can be undone in Rich Text editor
- Improved: Plugins: Provides selected notes when triggering a command from the note list context menu
- Improved: Plugins: Rename command "editorSetText" to "editor.setText"
- Improved: Prevent lines from shifting in Markdown Editor when Scrollbar appears ([#4110](https://github.com/laurent22/joplin/issues/4110) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Put title bar and toolbar button over two lines when window size is below 800px
- Improved: Refresh sidebar and notes when moving note outside of conflict folder
- Improved: Upgrade to Electron 10

## [v1.4.11](https://github.com/laurent22/joplin/releases/tag/v1.4.11) (Pre-release) - 2020-11-19T23:06:51Z

**Breaking Changes:**

- If you use the Clipper API, please note that there are a few breaking changes in this version. See this link for more information: https://github.com/laurent22/joplin/pull/3983
- Plugins: `joplin.views.dialogs.open()` now returns an object instead of the button ID that was clicked. So for example instead of getting just `"ok"`, you will get `{ "id": "ok" }`. This is to allow adding form data to that object.

**Deprecated:**

The following features are deprecated. It will still work for now but please update your code:

- Plugins: All `create()` functions under `joplin.views` now take a `viewId` as a first parameter.
- Plugins: `MenuItemLocation.Context` is deprecated and is now an alias for `MenuItemLocation.NoteListContextMenu`
- Plugins: The `app_min_version` manifest property is now required. If not provided it will assume v14.
- Plugins: The `id` manifest property is now required. If not set, it will be the plugin filename or directory.

Plugin doc has been updated with some info about the [development process](https://joplinapp.org/api/references/plugin_api/classes/joplin.html).

* * * 

- New: Add config screen to add, remove or enable, disable plugins
- New: Add option to toggle spellchecking for the markdown editor ([#4109](https://github.com/laurent22/joplin/issues/4109) by [@CalebJohn](https://github.com/CalebJohn))
- New: Plugins: Add command "editorSetText" for desktop app
- New: Plugins: Add support for JPL archive format
- New: Plugins: Add support for external CodeMirror plugins ([#4015](https://github.com/laurent22/joplin/issues/4015) by [@CalebJohn](https://github.com/CalebJohn))
- New: Plugins: Added command to export folders and notes
- New: Plugins: Added support app_min_version property and made it required
- Improved: Upgrade to Electron 10
- Improved: Allow exporting conflict notes ([#4095](https://github.com/laurent22/joplin/issues/4095))
- Improved: Api: Always include 'has_more' field for paginated data
- Improved: Api: Make sure pagination sort options are respected for search and other requests
- Improved: Attempt to fix Outlook drag and drop on Markdown editor ([#4093](https://github.com/laurent22/joplin/issues/4093) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Disable spell checker on config and search input fields
- Improved: Disabled the auto update option in linux ([#4102](https://github.com/laurent22/joplin/issues/4102)) ([#4096](https://github.com/laurent22/joplin/issues/4096) by Anshuman Pandey)
- Improved: Optimized resizing window
- Improved: Plugins: Make sure "replaceSelection" command can be undone in Rich Text editor
- Improved: Plugins: Rename command "editorSetText" to "editor.setText"
- Improved: Prevent lines from shifting in Markdown Editor when Scrollbar appears ([#4110](https://github.com/laurent22/joplin/issues/4110) by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Put title bar and toolbar button over two lines when window size is below 800px
- Improved: Refresh sidebar and notes when moving note outside of conflict folder
- Fixed: Display note count for conflict folder, and display notes even if they are completed to-dos ([#3997](https://github.com/laurent22/joplin/issues/3997))
- Fixed: Fix crash due to React when trying to upgrade sync target ([#4098](https://github.com/laurent22/joplin/issues/4098))
- Fixed: Fix size of search bar area when notebook is empty
- Fixed: Fixed issue when a newly created note would be automatically moved to the wrong folder on save ([#4038](https://github.com/laurent22/joplin/issues/4038))
- Fixed: Fixed note list overflow when resized very small
- Fixed: Plugins: Fixed issue with dialog being empty in some cases
- Fixed: Prevent log from filling up when certain external editors trigger many watch events ([#4011](https://github.com/laurent22/joplin/issues/4011))
- Fixed: Regression: Fixed external edit file watching
- Fixed: Resource links could not be opened from Rich Text editor on Linux ([#4073](https://github.com/laurent22/joplin/issues/4073))

* * *

- Fixed: Api: Fix note and resource association end points
- Fixed: Fix drag and drop behaviour to "copy" instead of "move" ([#4031](https://github.com/laurent22/joplin/issues/4031) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fix handling of certain keys in shortcut editor ([#4022](https://github.com/laurent22/joplin/issues/4022) by Helmut K. C. Tessarek)
- Fixed: Fixed inconsistent note list state when using search ([#3904](https://github.com/laurent22/joplin/issues/3904))
- Fixed: Fixed issue with note being saved after word has been replaced by spell checker
- Fixed: Fixed text editor button tooltips
- Fixed: Plugins: Fix crash when path includes trailing slash
- Fixed: Regression: Fix application name
- Fixed: Regression: Fix exporting to HTML and PDF
- Fixed: Tags could not be selected in some cases ([#3876](https://github.com/laurent22/joplin/issues/3876))
- Improved: Allow lowercase filters when doing search
- Improved: Change Markdown rendering to align with CommonMark spec ([#3839](https://github.com/laurent22/joplin/issues/3839))
- Improved: Make Markdown editor selection more visible in Dark mode
- Improved: Plugins: Allow retrieving form values from dialogs
- Improved: Plugins: Force plugin devtool dialog to be detached
- New: Add {{bowm}} and {{bows}} - Beginning Of Week (Monday/Sunday) ([#4023](https://github.com/laurent22/joplin/issues/4023) by Helmut K. C. Tessarek)
- New: Added toolbar button to switch spell checker language
- New: Adds spell checker support for Rich Text editor ([#3974](https://github.com/laurent22/joplin/issues/3974))
- New: Allow customising application layout
- New: Api: Added ability to watch resource file
- New: Api: Added way to get the notes associated with a resource
- New: API: Adds ability to paginate data ([#3983](https://github.com/laurent22/joplin/issues/3983))
- New: Plugins: Add support for editor context menu

## [v1.4.10](https://github.com/laurent22/joplin/releases/tag/v1.4.10) (Pre-release) - 2020-11-14T09:53:15Z

**Breaking Changes:**

- If you use the Clipper API, please note that there are a few breaking changes in this version. See this link for more information: https://github.com/laurent22/joplin/pull/3983
- Plugins: `joplin.views.dialogs.open()` now returns an object instead of the button ID that was clicked. So for example instead of getting just `"ok"`, you will get `{ "id": "ok" }`. This is to allow adding form data to that object.

**Deprecated:**

- Plugins: All `create()` functions under `joplin.views` now take a `viewId` as a first parameter. It will still work for now if you don't provide one, but please update your plugins.
- Plugins: `MenuItemLocation.Context` is deprecated and is now an alias for `MenuItemLocation.NoteListContextMenu`

Plugin doc has been updated with some info about the [development process](https://joplinapp.org/api/references/plugin_api/classes/joplin.html).

* * * 

- New: Add {{bowm}} and {{bows}} - Beginning Of Week (Monday/Sunday) ([#4023](https://github.com/laurent22/joplin/issues/4023) by Helmut K. C. Tessarek)
- New: Plugins: Add support for editor context menu
- New: Allow customising application layout
- Improved: Allow lowercase filters when doing search
- Improved: Make Markdown editor selection more visible in Dark mode
- Improved: Plugins: Allow retrieving form values from dialogs
- Fixed: Api: Fix note and resource association end points
- Fixed: Fix drag and drop behaviour to "copy" instead of "move" ([#4031](https://github.com/laurent22/joplin/issues/4031) by [@CalebJohn](https://github.com/CalebJohn))
- Fixed: Fix handling of certain keys in shortcut editor ([#4022](https://github.com/laurent22/joplin/issues/4022) by Helmut K. C. Tessarek)
- Fixed: Fixed issue with note being saved after word has been replaced by spell checker
- Fixed: Plugins: Fix crash when path includes trailing slash
- Fixed: Regression: Fix application name

* * *

- New: Added toolbar button to switch spell checker language
- New: Api: Added way to get the notes associated with a resource
- New: Api: Added ability to watch resource file
- New: API: Adds ability to paginate data ([#3983](https://github.com/laurent22/joplin/issues/3983))
- New: Adds spell checker support for Rich Text editor ([#3974](https://github.com/laurent22/joplin/issues/3974))
- Fixed: Fixed inconsistent note list state when using search ([#3904](https://github.com/laurent22/joplin/issues/3904))
- Fixed: Fixed text editor button tooltips
- Fixed: Regression: Fix exporting to HTML and PDF
- Fixed: Tags could not be selected in some cases ([#3876](https://github.com/laurent22/joplin/issues/3876))
- Improved: Change Markdown rendering to align with CommonMark spec ([#3839](https://github.com/laurent22/joplin/issues/3839))
- Improved: Plugins: Force plugin devtool dialog to be detached

## [v1.4.9](https://github.com/laurent22/joplin/releases/tag/v1.4.9) (Pre-release) - 2020-11-11T14:23:17Z

IMPORTANT: If you use the Clipper API, please note that there are a few breaking changes in this version. See this link for more information: https://github.com/laurent22/joplin/pull/3983

* * * 

- New: Added toolbar button to switch spell checker language
- Improved: Api: Change pagination to has_more model
- Fixed: Fixed inconsistent note list state when using search ([#3904](https://github.com/laurent22/joplin/issues/3904))
- Fixed: Fixed text editor button tooltips
- Fixed: Regression: Fix exporting to HTML and PDF
- Fixed: Tags could not be selected in some cases ([#3876](https://github.com/laurent22/joplin/issues/3876))

* * *

- New: Api: Added way to get the notes associated with a resource
- New: Api: Added ability to watch resource file
- New: API: Adds ability to paginate data ([#3983](https://github.com/laurent22/joplin/issues/3983))
- New: Adds spell checker support for Rich Text editor ([#3974](https://github.com/laurent22/joplin/issues/3974))
- Improved: Change Markdown rendering to align with CommonMark spec ([#3839](https://github.com/laurent22/joplin/issues/3839))
- Improved: Plugins: Force plugin devtool dialog to be detached

## [v1.4.7](https://github.com/laurent22/joplin/releases/tag/v1.4.7) (Pre-release) - 2020-11-07T18:23:29Z

IMPORTANT: If you use the Clipper API, please note that there are a few breaking changes in this version. See this link for more information: https://github.com/laurent22/joplin/pull/3983

* * * 

- New: Api: Added ability to watch resource file
- New: Api: Added way to get the notes associated with a resource
- Improved: Plugins: Force plugin devtool dialog to be detached

* * *

- New: API: Adds ability to paginate data ([#3983](https://github.com/laurent22/joplin/issues/3983))
- New: Adds spell checker support for Rich Text editor ([#3974](https://github.com/laurent22/joplin/issues/3974))
- Improved: Change Markdown rendering to align with CommonMark spec ([#3839](https://github.com/laurent22/joplin/issues/3839))

## [v1.3.18](https://github.com/laurent22/joplin/releases/tag/v1.3.18) - 2020-11-06T12:07:02Z

- Regression: Random crash when syncing due to undefined tags ([#4051](https://github.com/laurent22/joplin/issues/4051))
- Fixed: Keymap editor crash when an invalid command is used ([#4049](https://github.com/laurent22/joplin/issues/4049))

* * *

- New: Add support for application plugins ([#3257](https://github.com/laurent22/joplin/issues/3257))
- New: Added Thunderbird count for desktop client ([#3880](https://github.com/laurent22/joplin/issues/3880) by [@Technik-J](https://github.com/Technik-J))
- New: Added support for Menu API for plugins
- New: Added support for plugins packaged as JS bundles
- New: Added `openProfileDirectory` command and menu item
- New: Api: Added service to access resource external editing
- New: Plugins: Add the openNote, openFolder and openTag commands
- Security: Remove &quot;link&quot; and &quot;meta&quot; tags from notes to prevent XSS (Discovered by [Phil Holbrook](https://twitter.com/fhlipZero))
- Improved: Make “update is available” dialog box easier to use ([#3877](https://github.com/laurent22/joplin/issues/3877) by [@roryokane](https://github.com/roryokane))
- Improved: Sort tags in a case-insensitive way
- Improved: Display more info while an ENEX file is being imported
- Improved: Made toolbar buttons bigger and swap order of bullet and number lists
- Improved: Api: Allow preserving timestamps when updating a note
- Improved: Added support for a custom S3 URL ([#3921](https://github.com/laurent22/joplin/issues/3921)) ([#3691](https://github.com/laurent22/joplin/issues/3691) by [@aaron](https://github.com/aaron))
- Improved: Actually enter insert mode after pressing o/O in CodeMirror vim mode ([#3897](https://github.com/laurent22/joplin/issues/3897) by Caleb John)
- Improved: Simplified and improve command service, and added command palette
- Improved: Tray: Exit -> Quit ([#3945](https://github.com/laurent22/joplin/issues/3945) by Helmut K. C. Tessarek)
- Improved: Import `<strike>`, `<s>` tags (strikethrough) from Evernote ([#3936](https://github.com/laurent22/joplin/issues/3936) by Ian Slinger)
- Improved: Make sidebar item font weight normal (not bold)
- Improved: Plugin API - added support for settings.globalValue method
- Improved: Remove Hide Joplin menu item on Linux and Windows
- Improved: Removed OneDrive Dev sync target which was not really useful
- Improved: Allow setting note geolocation attributes via API ([#3884](https://github.com/laurent22/joplin/issues/3884))
- Improved: Disabled emoji highlighting in editor when emoji plugin is disabled ([#3852](https://github.com/laurent22/joplin/issues/3852) by Rahil Sarvaiya)
- Improved: Sort search results by average of multiple criteria, including 'Sort notes by' field setting ([#3777](https://github.com/laurent22/joplin/issues/3777) by [@shawnaxsom](https://github.com/shawnaxsom))
- Improved: Make sure all commands appear in keymap editor
- Fixed: Add history backward and forward commands to keymap and menus ([#4010](https://github.com/laurent22/joplin/issues/4010))
- Fixed: Fixed handling of Option key for shortcuts in macOS
- Fixed: Fix slow Katex rendering when there are many global definitions ([#3993](https://github.com/laurent22/joplin/issues/3993))
- Fixed: Fix syntax of imported resources when importing ENEX as HTML
- Fixed: Fixed OneDrive authentication
- Fixed: Fixed sync issue when importing ENEX files that contain new line characters in the source URL attribute ([#3955](https://github.com/laurent22/joplin/issues/3955))
- Fixed: Handle gzipped CSS files when importing from clipper ([#3986](https://github.com/laurent22/joplin/issues/3986))
- Fixed: Update highlight.js to fix freeze for certain code blocks ([#3992](https://github.com/laurent22/joplin/issues/3992))
- Fixed: Fix search filters when language is in Korean or with accents ([#3947](https://github.com/laurent22/joplin/issues/3947) by Naveen M V)
- Fixed: Fixed freeze when importing ENEX as HTML, and fixed potential error when importing resources ([#3958](https://github.com/laurent22/joplin/issues/3958))
- Fixed: Fixed setting issue that would cause a password to be saved in plain text in the database, even when the keychain is working
- Fixed: Fixed sidebar performance issue when there are many notebooks or tags ([#3893](https://github.com/laurent22/joplin/issues/3893))
- Fixed: Allows toggling external editing off and on again ([#3886](https://github.com/laurent22/joplin/issues/3886))
- Fixed: Fixed toggleNoteList and toggleSidebar commands
- Fixed: Fixed Toggle Editor button tooltip and icon

## [v1.3.17](https://github.com/laurent22/joplin/releases/tag/v1.3.17) (Pre-release) - 2020-11-06T11:35:15Z

- Regression: Random crash when syncing due to undefined tags ([#4051](https://github.com/laurent22/joplin/issues/4051))

* * *

- New: Add support for application plugins ([#3257](https://github.com/laurent22/joplin/issues/3257))
- New: Added Thunderbird count for desktop client ([#3880](https://github.com/laurent22/joplin/issues/3880) by [@Technik-J](https://github.com/Technik-J))
- New: Added support for Menu API for plugins
- New: Added support for plugins packaged as JS bundles
- New: Added `openProfileDirectory` command and menu item
- New: Api: Added service to access resource external editing
- New: Plugins: Add the openNote, openFolder and openTag commands
- Security: Remove &quot;link&quot; and &quot;meta&quot; tags from notes to prevent XSS (Discovered by [Phil Holbrook](https://twitter.com/fhlipZero))
- Improved: Make “update is available” dialog box easier to use ([#3877](https://github.com/laurent22/joplin/issues/3877) by [@roryokane](https://github.com/roryokane))
- Improved: Sort tags in a case-insensitive way
- Improved: Display more info while an ENEX file is being imported
- Improved: Made toolbar buttons bigger and swap order of bullet and number lists
- Improved: Api: Allow preserving timestamps when updating a note
- Improved: Added support for a custom S3 URL ([#3921](https://github.com/laurent22/joplin/issues/3921)) ([#3691](https://github.com/laurent22/joplin/issues/3691) by [@aaron](https://github.com/aaron))
- Improved: Actually enter insert mode after pressing o/O in CodeMirror vim mode ([#3897](https://github.com/laurent22/joplin/issues/3897) by Caleb John)
- Improved: Simplified and improve command service, and added command palette
- Improved: Tray: Exit -> Quit ([#3945](https://github.com/laurent22/joplin/issues/3945) by Helmut K. C. Tessarek)
- Improved: Import `<strike>`, `<s>` tags (strikethrough) from Evernote ([#3936](https://github.com/laurent22/joplin/issues/3936) by Ian Slinger)
- Improved: Make sidebar item font weight normal (not bold)
- Improved: Plugin API - added support for settings.globalValue method
- Improved: Remove Hide Joplin menu item on Linux and Windows
- Improved: Removed OneDrive Dev sync target which was not really useful
- Improved: Allow setting note geolocation attributes via API ([#3884](https://github.com/laurent22/joplin/issues/3884))
- Improved: Disabled emoji highlighting in editor when emoji plugin is disabled ([#3852](https://github.com/laurent22/joplin/issues/3852) by Rahil Sarvaiya)
- Improved: Sort search results by average of multiple criteria, including 'Sort notes by' field setting ([#3777](https://github.com/laurent22/joplin/issues/3777) by [@shawnaxsom](https://github.com/shawnaxsom))
- Improved: Make sure all commands appear in keymap editor
- Fixed: Add history backward and forward commands to keymap and menus ([#4010](https://github.com/laurent22/joplin/issues/4010))
- Fixed: Fixed handling of Option key for shortcuts in macOS
- Fixed: Fix slow Katex rendering when there are many global definitions ([#3993](https://github.com/laurent22/joplin/issues/3993))
- Fixed: Fix syntax of imported resources when importing ENEX as HTML
- Fixed: Fixed OneDrive authentication
- Fixed: Fixed sync issue when importing ENEX files that contain new line characters in the source URL attribute ([#3955](https://github.com/laurent22/joplin/issues/3955))
- Fixed: Handle gzipped CSS files when importing from clipper ([#3986](https://github.com/laurent22/joplin/issues/3986))
- Fixed: Update highlight.js to fix freeze for certain code blocks ([#3992](https://github.com/laurent22/joplin/issues/3992))
- Fixed: Fix search filters when language is in Korean or with accents ([#3947](https://github.com/laurent22/joplin/issues/3947) by Naveen M V)
- Fixed: Fixed freeze when importing ENEX as HTML, and fixed potential error when importing resources ([#3958](https://github.com/laurent22/joplin/issues/3958))
- Fixed: Fixed setting issue that would cause a password to be saved in plain text in the database, even when the keychain is working
- Fixed: Fixed sidebar performance issue when there are many notebooks or tags ([#3893](https://github.com/laurent22/joplin/issues/3893))
- Fixed: Allows toggling external editing off and on again ([#3886](https://github.com/laurent22/joplin/issues/3886))
- Fixed: Fixed toggleNoteList and toggleSidebar commands
- Fixed: Fixed Toggle Editor button tooltip and icon

## [v1.4.6](https://github.com/laurent22/joplin/releases/tag/v1.4.6) (Pre-release) - 2020-11-05T22:44:12Z

IMPORTANT: If you use the Clipper API, please note that there are a few breaking changes in this version. See this link for more information: https://github.com/laurent22/joplin/pull/3983

- New: API: Adds ability to paginate data ([#3983](https://github.com/laurent22/joplin/issues/3983))
- New: Adds spell checker support for Rich Text editor ([#3974](https://github.com/laurent22/joplin/issues/3974))
- Improved: Change Markdown rendering to align with CommonMark spec ([#3839](https://github.com/laurent22/joplin/issues/3839))

## [v1.3.15](https://github.com/laurent22/joplin/releases/tag/v1.3.15) - 2020-11-04T12:22:50Z

- New: Add support for application plugins ([#3257](https://github.com/laurent22/joplin/issues/3257))
- New: Added Thunderbird count for desktop client ([#3880](https://github.com/laurent22/joplin/issues/3880) by [@Technik-J](https://github.com/Technik-J))
- New: Added support for Menu API for plugins
- New: Added support for plugins packaged as JS bundles
- New: Added `openProfileDirectory` command and menu item
- New: Api: Added service to access resource external editing
- New: Plugins: Add the openNote, openFolder and openTag commands
- Security: Remove &quot;link&quot; and &quot;meta&quot; tags from notes to prevent XSS (Discovered by [Phil Holbrook](https://twitter.com/fhlipZero))
- Improved: Make “update is available” dialog box easier to use ([#3877](https://github.com/laurent22/joplin/issues/3877) by [@roryokane](https://github.com/roryokane))
- Improved: Sort tags in a case-insensitive way
- Improved: Display more info while an ENEX file is being imported
- Improved: Made toolbar buttons bigger and swap order of bullet and number lists
- Improved: Api: Allow preserving timestamps when updating a note
- Improved: Added support for a custom S3 URL ([#3921](https://github.com/laurent22/joplin/issues/3921)) ([#3691](https://github.com/laurent22/joplin/issues/3691) by [@aaron](https://github.com/aaron))
- Improved: Actually enter insert mode after pressing o/O in CodeMirror vim mode ([#3897](https://github.com/laurent22/joplin/issues/3897) by Caleb John)
- Improved: Simplified and improve command service, and added command palette
- Improved: Tray: Exit -> Quit ([#3945](https://github.com/laurent22/joplin/issues/3945) by Helmut K. C. Tessarek)
- Improved: Import `<strike>`, `<s>` tags (strikethrough) from Evernote ([#3936](https://github.com/laurent22/joplin/issues/3936) by Ian Slinger)
- Improved: Make sidebar item font weight normal (not bold)
- Improved: Plugin API - added support for settings.globalValue method
- Improved: Remove Hide Joplin menu item on Linux and Windows
- Improved: Removed OneDrive Dev sync target which was not really useful
- Improved: Allow setting note geolocation attributes via API ([#3884](https://github.com/laurent22/joplin/issues/3884))
- Improved: Disabled emoji highlighting in editor when emoji plugin is disabled ([#3852](https://github.com/laurent22/joplin/issues/3852) by Rahil Sarvaiya)
- Improved: Sort search results by average of multiple criteria, including 'Sort notes by' field setting ([#3777](https://github.com/laurent22/joplin/issues/3777) by [@shawnaxsom](https://github.com/shawnaxsom))
- Improved: Make sure all commands appear in keymap editor
- Fixed: Add history backward and forward commands to keymap and menus ([#4010](https://github.com/laurent22/joplin/issues/4010))
- Fixed: Fixed handling of Option key for shortcuts in macOS
- Fixed: Fix slow Katex rendering when there are many global definitions ([#3993](https://github.com/laurent22/joplin/issues/3993))
- Fixed: Fix syntax of imported resources when importing ENEX as HTML
- Fixed: Fixed OneDrive authentication
- Fixed: Fixed sync issue when importing ENEX files that contain new line characters in the source URL attribute ([#3955](https://github.com/laurent22/joplin/issues/3955))
- Fixed: Handle gzipped CSS files when importing from clipper ([#3986](https://github.com/laurent22/joplin/issues/3986))
- Fixed: Update highlight.js to fix freeze for certain code blocks ([#3992](https://github.com/laurent22/joplin/issues/3992))
- Fixed: Fix search filters when language is in Korean or with accents ([#3947](https://github.com/laurent22/joplin/issues/3947) by Naveen M V)
- Fixed: Fixed freeze when importing ENEX as HTML, and fixed potential error when importing resources ([#3958](https://github.com/laurent22/joplin/issues/3958))
- Fixed: Fixed setting issue that would cause a password to be saved in plain text in the database, even when the keychain is working
- Fixed: Fixed sidebar performance issue when there are many notebooks or tags ([#3893](https://github.com/laurent22/joplin/issues/3893))
- Fixed: Allows toggling external editing off and on again ([#3886](https://github.com/laurent22/joplin/issues/3886))
- Fixed: Fixed toggleNoteList and toggleSidebar commands
- Fixed: Fixed Toggle Editor button tooltip and icon

## [v1.3.11](https://github.com/laurent22/joplin/releases/tag/v1.3.11) (Pre-release) - 2020-10-31T13:22:20Z

- Improved: Make sure all commands appear in keymap editor
- Fixed: Add history backward and forward commands to keymap and menus ([#4010](https://github.com/laurent22/joplin/issues/4010))
- Fixed: Fixed handling of Option key for shortcuts in macOS
- Security: Remove &quot;link&quot; and &quot;meta&quot; tags from notes to prevent XSS

* * *

- New: Add support for application plugins ([#3257](https://github.com/laurent22/joplin/issues/3257))
- New: Added Thunderbird count for desktop client ([#3880](https://github.com/laurent22/joplin/issues/3880) by [@Technik-J](https://github.com/Technik-J))
- New: Added support for Menu API for plugins
- New: Added support for plugins packaged as JS bundles
- New: Added `openProfileDirectory` command and menu item
- New: Api: Added service to access resource external editing
- New: Plugins: Add the openNote, openFolder and openTag commands
- Improved: Make “update is available” dialog box easier to use ([#3877](https://github.com/laurent22/joplin/issues/3877) by [@roryokane](https://github.com/roryokane))
- Improved: Sort tags in a case-insensitive way
- Improved: Display more info while an ENEX file is being imported
- Improved: Made toolbar buttons bigger and swap order of bullet and number lists
- Improved: Api: Allow preserving timestamps when updating a note
- Improved: Added support for a custom S3 URL ([#3921](https://github.com/laurent22/joplin/issues/3921)) ([#3691](https://github.com/laurent22/joplin/issues/3691) by [@aaron](https://github.com/aaron))
- Improved: Actually enter insert mode after pressing o/O in CodeMirror vim mode ([#3897](https://github.com/laurent22/joplin/issues/3897) by Caleb John)
- Improved: Simplified and improve command service, and added command palette
- Improved: Tray: Exit -> Quit ([#3945](https://github.com/laurent22/joplin/issues/3945) by Helmut K. C. Tessarek)
- Improved: Import `<strike>`, `<s>` tags (strikethrough) from Evernote ([#3936](https://github.com/laurent22/joplin/issues/3936) by Ian Slinger)
- Improved: Make sidebar item font weight normal (not bold)
- Improved: Plugin API - added support for settings.globalValue method
- Improved: Remove Hide Joplin menu item on Linux and Windows
- Improved: Removed OneDrive Dev sync target which was not really useful
- Improved: Allow setting note geolocation attributes via API ([#3884](https://github.com/laurent22/joplin/issues/3884))
- Improved: Disabled emoji highlighting in editor when emoji plugin is disabled ([#3852](https://github.com/laurent22/joplin/issues/3852) by Rahil Sarvaiya)
- Improved: Sort search results by average of multiple criteria, including 'Sort notes by' field setting ([#3777](https://github.com/laurent22/joplin/issues/3777) by [@shawnaxsom](https://github.com/shawnaxsom))
- Fixed: Fix slow Katex rendering when there are many global definitions ([#3993](https://github.com/laurent22/joplin/issues/3993))
- Fixed: Fix syntax of imported resources when importing ENEX as HTML
- Fixed: Fixed OneDrive authentication
- Fixed: Fixed sync issue when importing ENEX files that contain new line characters in the source URL attribute ([#3955](https://github.com/laurent22/joplin/issues/3955))
- Fixed: Handle gzipped CSS files when importing from clipper ([#3986](https://github.com/laurent22/joplin/issues/3986))
- Fixed: Update highlight.js to fix freeze for certain code blocks ([#3992](https://github.com/laurent22/joplin/issues/3992))
- Fixed: Fix search filters when language is in Korean or with accents ([#3947](https://github.com/laurent22/joplin/issues/3947) by Naveen M V)
- Fixed: Fixed freeze when importing ENEX as HTML, and fixed potential error when importing resources ([#3958](https://github.com/laurent22/joplin/issues/3958))
- Fixed: Fixed setting issue that would cause a password to be saved in plain text in the database, even when the keychain is working
- Fixed: Fixed sidebar performance issue when there are many notebooks or tags ([#3893](https://github.com/laurent22/joplin/issues/3893))
- Fixed: Allows toggling external editing off and on again ([#3886](https://github.com/laurent22/joplin/issues/3886))
- Fixed: Fixed toggleNoteList and toggleSidebar commands
- Fixed: Fixed Toggle Editor button toolip and icon

## [v1.3.10](https://github.com/laurent22/joplin/releases/tag/v1.3.10) (Pre-release) - 2020-10-29T13:27:14Z

- New: Api: Added service to access resource external editing
- New: Plugins: Add the openNote, openFolder and openTag commands
- Fixed: Regression: Keyboard shortcut would not save in some cases
- Fixed: Regression: Restore &quot;New sub-notebook&quot; command
- Fixed: Command Palette click did not work
- Fixed: Fix slow Katex rendering when there are many global definitions ([#3993](https://github.com/laurent22/joplin/issues/3993))
- Fixed: Fix syntax of imported resources when importing ENEX as HTML
- Fixed: Fixed OneDrive authentication
- Fixed: Fixed sync issue when importing ENEX files that contain new line characters in the source URL attribute ([#3955](https://github.com/laurent22/joplin/issues/3955))
- Fixed: Handle gzipped CSS files when importing from clipper ([#3986](https://github.com/laurent22/joplin/issues/3986))
- Fixed: Update highlight.js to fix freeze for certain code blocks ([#3992](https://github.com/laurent22/joplin/issues/3992))

* * *

- New: Add support for application plugins ([#3257](https://github.com/laurent22/joplin/issues/3257))
- New: Added Thunderbird count for desktop client ([#3880](https://github.com/laurent22/joplin/issues/3880) by [@Technik-J](https://github.com/Technik-J))
- New: Added support for Menu API for plugins
- New: Added support for plugins packaged as JS bundles
- New: Added `openProfileDirectory` command and menu item
- Improved: Make “update is available” dialog box easier to use ([#3877](https://github.com/laurent22/joplin/issues/3877) by [@roryokane](https://github.com/roryokane))
- Improved: Sort tags in a case-insensitive way
- Improved: Display more info while an ENEX file is being imported
- Improved: Made toolbar buttons bigger and swap order of bullet and number lists
- Improved: Api: Allow preserving timestamps when updating a note
- Improved: Added support for a custom S3 URL ([#3921](https://github.com/laurent22/joplin/issues/3921)) ([#3691](https://github.com/laurent22/joplin/issues/3691) by [@aaron](https://github.com/aaron))
- Improved: Actually enter insert mode after pressing o/O in CodeMirror vim mode ([#3897](https://github.com/laurent22/joplin/issues/3897) by Caleb John)
- Improved: Simplified and improve command service, and added command palette
- Improved: Tray: Exit -> Quit ([#3945](https://github.com/laurent22/joplin/issues/3945) by Helmut K. C. Tessarek)
- Improved: Import `<strike>`, `<s>` tags (strikethrough) from Evernote ([#3936](https://github.com/laurent22/joplin/issues/3936) by Ian Slinger)
- Improved: Make sidebar item font weight normal (not bold)
- Improved: Plugin API - added support for settings.globalValue method
- Improved: Remove Hide Joplin menu item on Linux and Windows
- Improved: Removed OneDrive Dev sync target which was not really useful
- Improved: Allow setting note geolocation attributes via API ([#3884](https://github.com/laurent22/joplin/issues/3884))
- Improved: Disabled emoji highlighting in editor when emoji plugin is disabled ([#3852](https://github.com/laurent22/joplin/issues/3852) by Rahil Sarvaiya)
- Improved: Sort search results by average of multiple criteria, including 'Sort notes by' field setting ([#3777](https://github.com/laurent22/joplin/issues/3777) by [@shawnaxsom](https://github.com/shawnaxsom))
- Fixed: Fix search filters when language is in Korean or with accents ([#3947](https://github.com/laurent22/joplin/issues/3947) by Naveen M V)
- Fixed: Fixed freeze when importing ENEX as HTML, and fixed potential error when importing resources ([#3958](https://github.com/laurent22/joplin/issues/3958))
- Fixed: Fixed setting issue that would cause a password to be saved in plain text in the database, even when the keychain is working
- Fixed: Fixed sidebar performance issue when there are many notebooks or tags ([#3893](https://github.com/laurent22/joplin/issues/3893))
- Fixed: Allows toggling external editing off and on again ([#3886](https://github.com/laurent22/joplin/issues/3886))
- Fixed: Fixed toggleNoteList and toggleSidebar commands
- Fixed: Fixed Toggle Editor button toolip and icon

## [v1.3.9](https://github.com/laurent22/joplin/releases/tag/v1.3.9) (Pre-release) - 2020-10-23T16:04:26Z

- New: Added `openProfileDirectory` command and menu item
- Improved: Make “update is available” dialog box easier to use ([#3877](https://github.com/laurent22/joplin/issues/3877) by [@roryokane](https://github.com/roryokane))
- Improved: Sort tags in a case-insensitive way
- Fixed: Fix invalid tag state issue when importing notes or syncing
- Fixed: Fix search filters when language is in Korean or with accents ([#3947](https://github.com/laurent22/joplin/issues/3947) by Naveen M V)
- Fixed: Fixed Cut menu item

* * *

- New: Add support for application plugins ([#3257](https://github.com/laurent22/joplin/issues/3257))
- New: Added Thunderbird count for desktop client ([#3880](https://github.com/laurent22/joplin/issues/3880) by [@Technik-J](https://github.com/Technik-J))
- New: Added support for Menu API for plugins
- New: Added support for plugins packaged as JS bundles
- Improved: Display more info while an ENEX file is being imported
- Improved: Made toolbar buttons bigger and swap order of bullet and number lists
- Improved: Api: Allow preserving timestamps when updating a note
- Improved: Added support for a custom S3 URL ([#3921](https://github.com/laurent22/joplin/issues/3921)) ([#3691](https://github.com/laurent22/joplin/issues/3691) by [@aaron](https://github.com/aaron))
- Improved: Actually enter insert mode after pressing o/O in CodeMirror vim mode ([#3897](https://github.com/laurent22/joplin/issues/3897) by Caleb John)
- Improved: Simplified and improve command service, and added command palette
- Improved: Tray: Exit -> Quit ([#3945](https://github.com/laurent22/joplin/issues/3945) by Helmut K. C. Tessarek)
- Improved: Import `<strike>`, `<s>` tags (strikethrough) from Evernote ([#3936](https://github.com/laurent22/joplin/issues/3936) by Ian Slinger)
- Improved: Make sidebar item font weight normal (not bold)
- Improved: Plugin API - added support for settings.globalValue method
- Improved: Remove Hide Joplin menu item on Linux and Windows
- Improved: Removed OneDrive Dev sync target which was not really useful
- Improved: Allow setting note geolocation attributes via API ([#3884](https://github.com/laurent22/joplin/issues/3884))
- Improved: Disabled emoji highlighting in editor when emoji plugin is disabled ([#3852](https://github.com/laurent22/joplin/issues/3852) by Rahil Sarvaiya)
- Improved: Sort search results by average of multiple criteria, including 'Sort notes by' field setting ([#3777](https://github.com/laurent22/joplin/issues/3777) by [@shawnaxsom](https://github.com/shawnaxsom))
- Fixed: Fixed freeze when importing ENEX as HTML, and fixed potential error when importing resources ([#3958](https://github.com/laurent22/joplin/issues/3958))
- Fixed: Fixed setting issue that would cause a password to be saved in plain text in the database, even when the keychain is working
- Fixed: Fixed sidebar performance issue when there are many notebooks or tags ([#3893](https://github.com/laurent22/joplin/issues/3893))
- Fixed: Allows toggling external editing off and on again ([#3886](https://github.com/laurent22/joplin/issues/3886))
- Fixed: Fixed toggleNoteList and toggleSidebar commands
- Fixed: Fixed Toggle Editor button toolip and icon

## [v1.3.8](https://github.com/laurent22/joplin/releases/tag/v1.3.8) (Pre-release) - 2020-10-21T18:46:29Z

- New: Plugins: Added support for content scripts
- Improved: Api: Allow preserving timestamps when updating a note
- Improved: Display more info while an ENEX file is being imported
- Improved: Made toolbar buttons bigger and swap order of bullet and number lists
- Improved: Plugins: Allow custom commands to return a result
- Fixed: Certain commands no longer worked. ([#3962](https://github.com/laurent22/joplin/issues/3962))
- Fixed: Fixed freeze when importing ENEX as HTML, and fixed potential error when importing resources ([#3958](https://github.com/laurent22/joplin/issues/3958))
- Fixed: Fixed setting issue that would cause a password to be saved in plain text in the database, even when the keychain is working
- Fixed: Regression: Fixed format of copied version info

* * *

- New: Add support for application plugins ([#3257](https://github.com/laurent22/joplin/issues/3257))
- New: Added Thunderbird count for desktop client ([#3880](https://github.com/laurent22/joplin/issues/3880) by [@Technik-J](https://github.com/Technik-J))
- New: Added support for Menu API for plugins
- New: Added support for plugins packaged as JS bundles
- Improved: Added support for a custom S3 URL ([#3921](https://github.com/laurent22/joplin/issues/3921)) ([#3691](https://github.com/laurent22/joplin/issues/3691) by [@aaron](https://github.com/aaron))
- Improved: Actually enter insert mode after pressing o/O in CodeMirror vim mode ([#3897](https://github.com/laurent22/joplin/issues/3897) by Caleb John)
- Improved: Simplified and improve command service, and added command palette
- Improved: Tray: Exit -> Quit ([#3945](https://github.com/laurent22/joplin/issues/3945) by Helmut K. C. Tessarek)
- Improved: Import `<strike>`, `<s>` tags (strikethrough) from Evernote ([#3936](https://github.com/laurent22/joplin/issues/3936) by Ian Slinger)
- Improved: Make sidebar item font weight normal (not bold)
- Improved: Plugin API - added support for settings.globalValue method
- Improved: Remove Hide Joplin menu item on Linux and Windows
- Improved: Removed OneDrive Dev sync target which was not really useful
- Improved: Allow setting note geolocation attributes via API ([#3884](https://github.com/laurent22/joplin/issues/3884))
- Improved: Disabled emoji highlighting in editor when emoji plugin is disabled ([#3852](https://github.com/laurent22/joplin/issues/3852) by Rahil Sarvaiya)
- Improved: Sort search results by average of multiple criteria, including 'Sort notes by' field setting ([#3777](https://github.com/laurent22/joplin/issues/3777) by [@shawnaxsom](https://github.com/shawnaxsom))
- Fixed: Fixed sidebar performance issue when there are many notebooks or tags ([#3893](https://github.com/laurent22/joplin/issues/3893))
- Fixed: Allows toggling external editing off and on again ([#3886](https://github.com/laurent22/joplin/issues/3886))
- Fixed: Fixed toggleNoteList and toggleSidebar commands
- Fixed: Fixed Toggle Editor button toolip and icon

## [v1.3.7](https://github.com/laurent22/joplin/releases/tag/v1.3.7) (Pre-release) - 2020-10-20T11:35:55Z

- Improved: Added support for a custom S3 URL ([#3921](https://github.com/laurent22/joplin/issues/3921)) ([#3691](https://github.com/laurent22/joplin/issues/3691) by [@aaron](https://github.com/aaron))
- Improved: Import `<strike>`, `<s>` tags (strikethrough) from Evernote ([#3936](https://github.com/laurent22/joplin/issues/3936) by Ian Slinger)
- Improved: Simplified and improve command service, and added command palette
- Improved: Tray: Exit -> Quit ([#3945](https://github.com/laurent22/joplin/issues/3945) by Helmut K. C. Tessarek)
- Fixed: Trying to fix sidebar performance issue when there are many notebooks or tags ([#3893](https://github.com/laurent22/joplin/issues/3893))

* * *

- New: Add support for application plugins ([#3257](https://github.com/laurent22/joplin/issues/3257))
- New: Added Thunderbird count for desktop client ([#3880](https://github.com/laurent22/joplin/issues/3880) by [@Technik-J](https://github.com/Technik-J))
- New: Added support for Menu API for plugins
- New: Added support for plugins packaged as JS bundles
- Improved: Actually enter insert mode after pressing o/O in CodeMirror vim mode ([#3897](https://github.com/laurent22/joplin/issues/3897) by Caleb John)
- Improved: Make sidebar item font weight normal (not bold)
- Improved: Plugin API - added support for settings.globalValue method
- Improved: Remove Hide Joplin menu item on Linux and Windows
- Improved: Removed OneDrive Dev sync target which was not really useful
- Improved: Allow setting note geolocation attributes via API ([#3884](https://github.com/laurent22/joplin/issues/3884))
- Improved: Disabled emoji highlighting in editor when emoji plugin is disabled ([#3852](https://github.com/laurent22/joplin/issues/3852) by Rahil Sarvaiya)
- Improved: Sort search results by average of multiple criteria, including 'Sort notes by' field setting ([#3777](https://github.com/laurent22/joplin/issues/3777) by [@shawnaxsom](https://github.com/shawnaxsom))
- Fixed: Allows toggling external editing off and on again ([#3886](https://github.com/laurent22/joplin/issues/3886))
- Fixed: Fixed toggleNoteList and toggleSidebar commands
- Fixed: Fixed Toggle Editor button toolip and icon

## [v1.3.5](https://github.com/laurent22/joplin/releases/tag/v1.3.5) (Pre-release) - 2020-10-17T14:26:35Z

- Fixed: Regression: Remove Hide Joplin menu item on Linux too
- Fixed: Regression: Editor toolbar was disabled when importing note from MD file ([#3915](https://github.com/laurent22/joplin/issues/3915))
- Fixed: Regression: Header links with special characters were no longer working ([#3903](https://github.com/laurent22/joplin/issues/3903))
- Fixed: Regression: Importing ENEX as HTML was importing as Markdown ([#3923](https://github.com/laurent22/joplin/issues/3923))
- Fixed: Regression - Layout Button Sequence menu items were disabled ([#3899](https://github.com/laurent22/joplin/issues/3899))
- Fixed: Regression: Fix export of pluginAssets when exporting to html/pdf ([#3927](https://github.com/laurent22/joplin/issues/3927) by Caleb John)
- Fixed: Regression: Fixed check for update
- Fixed: Regression: Fixed move to notebook from context menu
- Fixed: Regression: Fixed opening links

* * *

- New: Add support for application plugins ([#3257](https://github.com/laurent22/joplin/issues/3257))
- New: Added Thunderbird count for desktop client ([#3880](https://github.com/laurent22/joplin/issues/3880) by [@Technik-J](https://github.com/Technik-J))
- New: Added support for Menu API for plugins
- New: Added support for plugins packaged as JS bundles
- Improved: Actually enter insert mode after pressing o/O in CodeMirror vim mode ([#3897](https://github.com/laurent22/joplin/issues/3897) by Caleb John)
- Improved: Make sidebar item font weight normal (not bold)
- Improved: Plugin API - added support for settings.globalValue method
- Improved: Remove Hide Joplin menu item on Linux and Windows
- Improved: Removed OneDrive Dev sync target which was not really useful
- Improved: Allow setting note geolocation attributes via API ([#3884](https://github.com/laurent22/joplin/issues/3884))
- Improved: Disabled emoji highlighting in editor when emoji plugin is disabled ([#3852](https://github.com/laurent22/joplin/issues/3852) by Rahil Sarvaiya)
- Improved: Sort search results by average of multiple criteria, including 'Sort notes by' field setting ([#3777](https://github.com/laurent22/joplin/issues/3777) by [@shawnaxsom](https://github.com/shawnaxsom))
- Fixed: Allows toggling external editing off and on again ([#3886](https://github.com/laurent22/joplin/issues/3886))
- Fixed: Fixed toggleNoteList and toggleSidebar commands
- Fixed: Fixed Toggle Editor button toolip and icon

## [v1.3.3](https://github.com/laurent22/joplin/releases/tag/v1.3.3) (Pre-release) - 2020-10-17T10:56:57Z

- Fixed: Regression: Remove Hide Joplin menu item on Linux too
- Fixed: Regression: Editor toolbar was disabled when importing note from MD file ([#3915](https://github.com/laurent22/joplin/issues/3915))
- Fixed: Regression: Header links with special characters were no longer working ([#3903](https://github.com/laurent22/joplin/issues/3903))
- Fixed: Regression: Importing ENEX as HTML was importing as Markdown ([#3923](https://github.com/laurent22/joplin/issues/3923))
- Fixed: Regression - Layout Button Sequence menu items were disabled ([#3899](https://github.com/laurent22/joplin/issues/3899))
- Fixed: Regression: Fix export of pluginAssets when exporting to html/pdf ([#3927](https://github.com/laurent22/joplin/issues/3927) by Caleb John)
- Fixed: Regression: Fixed check for update
- Fixed: Regression: Fixed move to notebook from context menu

* * *

- New: Add support for application plugins ([#3257](https://github.com/laurent22/joplin/issues/3257))
- New: Added Thunderbird count for desktop client ([#3880](https://github.com/laurent22/joplin/issues/3880) by [@Technik-J](https://github.com/Technik-J))
- New: Added support for Menu API for plugins
- New: Added support for plugins packaged as JS bundles
- Improved: Actually enter insert mode after pressing o/O in CodeMirror vim mode ([#3897](https://github.com/laurent22/joplin/issues/3897) by Caleb John)
- Improved: Make sidebar item font weight normal (not bold)
- Improved: Plugin API - added support for settings.globalValue method
- Improved: Remove Hide Joplin menu item on Linux and Windows
- Improved: Removed OneDrive Dev sync target which was not really useful
- Improved: Allow setting note geolocation attributes via API ([#3884](https://github.com/laurent22/joplin/issues/3884))
- Improved: Disabled emoji highlighting in editor when emoji plugin is disabled ([#3852](https://github.com/laurent22/joplin/issues/3852) by Rahil Sarvaiya)
- Improved: Sort search results by average of multiple criteria, including 'Sort notes by' field setting ([#3777](https://github.com/laurent22/joplin/issues/3777) by [@shawnaxsom](https://github.com/shawnaxsom))
- Fixed: Allows toggling external editing off and on again ([#3886](https://github.com/laurent22/joplin/issues/3886))
- Fixed: Fixed toggleNoteList and toggleSidebar commands
- Fixed: Fixed Toggle Editor button toolip and icon

## [v1.3.2](https://github.com/laurent22/joplin/releases/tag/v1.3.2) (Pre-release) - 2020-10-11T20:39:49Z

- Fixed: Regression: Context menu in sidebar could point to wrong item

* * *

- New: Add support for application plugins ([#3257](https://github.com/laurent22/joplin/issues/3257))
- Improved: Allow setting note geolocation attributes via API ([#3884](https://github.com/laurent22/joplin/issues/3884))
- Improved: Disabled emoji highlighting in editor when emoji plugin is disabled ([#3852](https://github.com/laurent22/joplin/issues/3852) by Rahil Sarvaiya)
- Improved: Sort search results by average of multiple criteria, including 'Sort notes by' field setting ([#3777](https://github.com/laurent22/joplin/issues/3777) by [@shawnaxsom](https://github.com/shawnaxsom))
- Fixed: Allows toggling external editing off and on again ([#3886](https://github.com/laurent22/joplin/issues/3886))

## [v1.3.1](https://github.com/laurent22/joplin/releases/tag/v1.3.1) (Pre-release) - 2020-10-11T15:10:18Z

- New: Add support for application plugins ([#3257](https://github.com/laurent22/joplin/issues/3257))
- Improved: Allow setting note geolocation attributes via API ([#3884](https://github.com/laurent22/joplin/issues/3884))
- Improved: Disabled emoji highlighting in editor when emoji plugin is disabled ([#3852](https://github.com/laurent22/joplin/issues/3852) by Rahil Sarvaiya)
- Improved: Sort search results by average of multiple criteria, including 'Sort notes by' field setting ([#3777](https://github.com/laurent22/joplin/issues/3777) by [@shawnaxsom](https://github.com/shawnaxsom))
- Fixed: Allows toggling external editing off and on again ([#3886](https://github.com/laurent22/joplin/issues/3886))

## [v1.2.6](https://github.com/laurent22/joplin/releases/tag/v1.2.6) - 2020-10-09T13:56:59Z

- New: Updated UI ([#3586](https://github.com/laurent22/joplin/issues/3586))
- Improved: Add frequently used languages to markdown editor ([#3786](https://github.com/laurent22/joplin/issues/3786) by Carlos Eduardo)
- Improved: Adjust the codemirror code block colors for the dark theme ([#3794](https://github.com/laurent22/joplin/issues/3794) by Caleb John)
- Improved: Disable auto-update by default
- Improved: Extend functionality of codemirror vim ([#3823](https://github.com/laurent22/joplin/issues/3823) by Caleb John)
- Improved: Improved handling of database migration failures
- Improved: Optimised sidebar rendering speed
- Improved: Upgrade Mermaid to v8.8.0 ([#3745](https://github.com/laurent22/joplin/issues/3745)) ([#3740](https://github.com/laurent22/joplin/issues/3740) by Caleb John)
- Fixed: Add stricter rules for katex blocks ([#3795](https://github.com/laurent22/joplin/issues/3795)) ([#3791](https://github.com/laurent22/joplin/issues/3791) by Caleb John)
- Fixed: Allow Read Time label to be translated ([#3684](https://github.com/laurent22/joplin/issues/3684))
- Fixed: Always use light theme for notes in HTML mode ([#3698](https://github.com/laurent22/joplin/issues/3698))
- Fixed: Disable editor shortcuts when a dialog, such as GotoAnything, is visible ([#3700](https://github.com/laurent22/joplin/issues/3700))
- Fixed: Fade out checked items in Rich Text editor too
- Fixed: Fix bug where editor would scroll to focus global search ([#3787](https://github.com/laurent22/joplin/issues/3787) by Caleb John)
- Fixed: Fix missed highlighting when using the global search ([#3717](https://github.com/laurent22/joplin/issues/3717) by Caleb John)
- Fixed: Fixed editor font size ([#3801](https://github.com/laurent22/joplin/issues/3801))
- Fixed: Fixed issue when switching from search to "All notes" ([#3748](https://github.com/laurent22/joplin/issues/3748))
- Fixed: Improved handling of special characters when exporting to Markdown ([#3760](https://github.com/laurent22/joplin/issues/3760))
- Fixed: Notebooks and tags click area was too narrow ([#3876](https://github.com/laurent22/joplin/issues/3876))
- Fixed: Only disable relevant toolbar buttons when editor is read-only ([#3810](https://github.com/laurent22/joplin/issues/3810))
- Fixed: Prevent crash in rare case when opening the config screen ([#3835](https://github.com/laurent22/joplin/issues/3835))
- Fixed: Refresh search results when searching by tag and when a tag is changed ([#3754](https://github.com/laurent22/joplin/issues/3754))
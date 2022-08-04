# Joplin changelog

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
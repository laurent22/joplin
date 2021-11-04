# Joplin terminal app changelog

## [cli-v2.6.1](https://github.com/laurent22/joplin/releases/tag/cli-v2.6.1) - 2021-11-03T11:33:18Z

- New: Add support for public-private key pairs and improved master password support (#5438)
- New: Added mechanism to migrate default settings to new values (72db8e4)
- Improved: Add Markdown + Front Matter exporter/importer (#5465) (#5224 by [@CalebJohn](https://github.com/CalebJohn))
- Improved: Ensure that shared notebook children are not deleted when shared, unshared and shared again, and a conflict happens (ccf9882)
- Improved: Improved Joplin Server configuration check to better handle disabled accounts (72c1235)
- Improved: Improved handling of expired sessions when using Joplin Server (33249ca) (ace1118)
- Fixed: Certain attachments were not being automatically deleted (#932)
- Fixed: Fix default sync target (4b39d30)
- Fixed: Fixed potential infinite loop when Joplin Server session is invalid (c5569ef)
- Fixed: Fixed running out of memory when importing large ENEX files (#5543)
- Fixed: Ignore newline between quotes while spliting batch (#5540) (#5341 by Kingsley Yung)

## [cli-v2.4.1](https://github.com/laurent22/joplin/releases/tag/cli-v2.4.1) - 2021-09-29T15:28:01Z

- New: Add a way to disable a master key (7faa58e)
- New: Add support for single master password, to simplify handling of multiple encryption keys (ce89ee5)
- New: Added "None" sync target to allow disabling synchronisation (f5f05e6)
- Improved: Allow importing certain corrupted ENEX files (f144dae)
- Improved: Improved sync locks so that they do not prevent upgrading a sync target (06ed58b)
- Fixed: Fixed file paths when exporting as HTML (#5325)
- Fixed: Misinterpreted search term after filter in quotation marks (#5445) (#5444 by [@JackGruber](https://github.com/JackGruber))
- Fixed: Setting note contents using "set" command does not update note timestamp (#5435)

## [cli-v2.3.2](https://github.com/laurent22/joplin/releases/tag/cli-v2.3.2) - 2021-08-16T09:38:40Z

- Improved: Improved E2EE usability by making its state a property of the sync target (#5276)
- Fixed: Bump hightlight.js to v11.2 (#5278) (#5245 by Roman Musin)
- Fixed: Fixed version command so that it does not require the keychain (ca6d8ec)

## [cli-v2.2.2](https://github.com/laurent22/joplin/releases/tag/cli-v2.2.2) - 2021-08-11T15:34:56Z

- Fixed: Fixed version command so that it does not require the keychain (15766d1)

## [cli-v2.2.1](https://github.com/laurent22/joplin/releases/tag/cli-v2.2.1) - 2021-08-10T10:21:09Z

- Improved: Ensure that timestamps are not changed when sharing or unsharing a note (cafaa9c)
- Improved: Fix AWS S3 sync error and upgrade framework to v3 (#5212) (#4810 by Lee Matos)
- Improved: Handles OneDrive throttling responses and sets User-Agent based on Microsoft best practices (#5246) (#5244 by [@alec](https://github.com/alec))
- Improved: Interpret only valid search filters (#5103) (#3871 by [@JackGruber](https://github.com/JackGruber))
- Fixed: Do not export share properties (#5232)
- Fixed: Fixed issue with orphaned resource being created in case of a resource conflict (#5223)
- Fixed: Import highlighted text from ENEX files (#5213)

## [cli-v2.1.2](https://github.com/laurent22/joplin/releases/tag/cli-v2.1.2) - 2021-06-27T15:51:36Z

- New: Add support for X-API-MIN-VERSION header (51f3c00)
- New: Added flag to disable local lock when synchronising (7aff6d2)
- Improved: Allow uploading items in batch when synchronising with Joplin Server (0222c0f)
- Improved: Also allow disabling TLS errors for Joplin Cloud to go around error UNABLE_TO_GET_ISSUER_CERT_LOCALLY (118a2f9)
- Improved: Improved first sync speed when synchronising with Joplin Server (4dc1210)
- Improved: Mask auth token and password in log (0d33955)
- Improved: Optimise first synchronisation, when items have never been synced before (15ce5cd)
- Improved: Update Mermaid: 8.8.4 -&gt; 8.10.2 (#5092 by Helmut K. C. Tessarek)
- Fixed: Fixed error that could prevent a revision from being created, and that would prevent the revision service from processing the rest of the notes (#5051)
- Fixed: Fixed issue when trying to sync an item associated with a share that no longer exists (5bb68ba)
- Fixed: Fixed search when the index contains non-existing notes (5ecac21)
- Fixed: Handle special type of code block when importing ENEX files (#4965)

## [cli-v2.0.1](https://github.com/laurent22/joplin/releases/tag/cli-v2.0.1) - 2021-06-16T19:06:28Z

- New: Add new date format YYMMDD (#4954 by Helmut K. C. Tessarek)
- New: Add support for sharing notebooks with Joplin Server (#4772)
- Improved: Allow setting up E2EE without having to confirm the password (c5b0529)
- Improved: Conflict notes will now populate a new field with the ID of the conflict note. (#5049 by [@Ahmad45123](https://github.com/Ahmad45123))
- Improved: Import SVG as images when importing ENEX files (#4968)
- Improved: Improve search with Asian scripts (#5018) (#4613 by [@mablin7](https://github.com/mablin7))
- Improved: Prevent sync process from being stuck when the download state of a resource is invalid (5c6fd93)
- Fixed: Fixed possible crash when trying to delete corrupted revision in revision service (#4845)
- Fixed: Fixed user content URLs when sharing note via Joplin Server (2cf7067)
- Fixed: Improved importing Evernote notes that contain codeblocks (#4965)
- Fixed: Items are filtered in the API search (#5017) (#5007 by [@JackGruber](https://github.com/JackGruber))

## [cli-v1.8.1](https://github.com/laurent22/joplin/releases/tag/cli-v1.8.1) - 2021-05-10T09:38:05Z

- New: Add "id" and "due" search filters (#4898 by [@JackGruber](https://github.com/JackGruber))
- New: Add support for "batch" command (eef86d6)
- Improved: Also duplicate the tags when the note is duplicated (#4876) (#3157 by [@JackGruber](https://github.com/JackGruber))
- Improved: Bump KaTeX to 0.13.3 (#4902 by Roman Musin)
- Improved: Filter "notebook" can now be negated (#4651 by Naveen M V)
- Improved: Improved error handling when importing ENEX (257cde4)
- Improved: Save user settings to JSON file (71f976f)
- Improved: Some imported ENEX files incorrectly had invisible sections (f7a457f)
- Fixed: Disable WebDAV response caching (#4887) (#4706 by Roman Musin)
- Fixed: Fixed issue when getting version info (54884d6)
- Fixed: Fixed rendering of note and resource links (61399ce)
- Fixed: Regression: Fixed network request repeat mechanism (ede6004)
- Security: Apply npm audit security fixes (0b67446)

## [cli-v1.6.4](https://github.com/laurent22/joplin/releases/tag/cli-v1.6.4) - 2021-01-21T10:01:15Z

- Fixed: Fixed infinite sync issue with OneDrive (#4305)

## [cli-v1.6.3](https://github.com/laurent22/joplin/releases/tag/cli-v1.6.3) - 2021-01-11T11:52:11Z

- New: Add more log info when a revision cannot be deleted due to still-encrypted itel
- Improved: Do not display error message when fixing ENEX resource mime type (#4310)
- Improved: Improve support for SVG images when importing ENEX files
- Improved: Improved support for bold and italic format when importing ENEX file (#4316)
- Improved: Support natural sorting by title (#4272 by [@volatilevar](https://github.com/volatilevar))
- Improved: Upload Big Notes to Onedrive (#4120) (#3528 by Jonathan Heard)
- Fixed: Fixed OneDrive issue that would require a full resync every time (#4324) (#4313 by Jonathan Heard)
- Fixed: Fixed importing ENEX files that contain hidden sections

## [cli-v1.6.2](https://github.com/laurent22/joplin/releases/tag/cli-v1.6.2) - 2021-01-11T11:41:56Z

- New: Add more log info when a revision cannot be deleted due to still-encrypted item
- Improved: Do not display error message when fixing ENEX resource mime type (#4310)
- Improved: Improve support for SVG images when importing ENEX files
- Improved: Improved support for bold and italic format when importing ENEX file (#4316)
- Improved: Support natural sorting by title (#4272 by [@volatilevar](https://github.com/volatilevar))
- Improved: Upload Big Notes to Onedrive (#4120) (#3528 by Jonathan Heard)
- Fixed: Fixed OneDrive issue that would require a full resync every time (#4324) (#4313 by Jonathan Heard)
- Fixed: Fixed importing ENEX files that contain hidden sections

## [cli-v1.5.1](https://github.com/laurent22/joplin/releases/tag/cli-v1.5.1) - 2020-12-26T00:46:31Z

- New: Add table captions when importing ENEX files
- Improved: Allow exporting conflict notes (#4095)
- Improved: Allow lowercase filters when doing search
- Improved: Improved error handling when importing ENEX files
- Improved: Partially reverts #3975 (link rendering)
- Fixed: Fix sorting by title in a case insensitive way
- Fixed: Fixed basic search when executing a query in Chinese (#4034 by Naveen M V)
- Fixed: Fixed importing ENEX files that contain empty resources
- Fixed: Fixed importing ENEX files that contain resources with invalid mime type
- Fixed: Fixed importing certain ENEX files that contain invalid dates
- Fixed: Fixed importing certain code blocks from ENEX
- Fixed: Fixed issue when searching for text that contains diacritic (#4152) (#4025 by Roman Musin)
- Fixed: Fixed issues when importing hidden tables within hidden sections in Enex files

## [cli-v1.4.9](https://github.com/laurent22/joplin/releases/tag/cli-v1.4.9) - 2020-11-26T15:00:37Z

- Improved: Allow exporting conflict notes (#4095)
- Improved: Allow lowercase filters when doing search
- Improved: Refresh sidebar and notes when moving note outside of conflict folder
- Fixed: Fix handling of new line escaping when using external edit
- Fixed: Fixed importing certain ENEX files that contain invalid dates

## [cli-v1.4.3](https://github.com/laurent22/joplin/releases/tag/cli-v1.4.3) - 2020-11-06T21:19:29Z

IMPORTANT: If you use the web API, please note that there are a few breaking changes in this release. See here for more information: https://github.com/laurent22/joplin/pull/3983#issue-509624899

- New: API: Adds ability to paginate data (#3983)
- Fixed: Display proper error message when decryption worker cannot be started (#4000)
- Fixed: Fixed OneDrive authentication
- Fixed: Fixed sync issue when importing ENEX files that contain new line characters in the source URL attribute (#3955)

## [cli-v1.3.3](https://github.com/laurent22/joplin/releases/tag/cli-v1.3.3) - 2020-10-23T16:00:38Z

- Improved: Added support for a custom S3 URL (#3921) (#3691 by [@aaron](https://github.com/aaron))
- Improved: Allow setting note geolocation attributes via API (#3884)
- Improved: Import &lt;strike&gt;,&lt;s&gt; tags (strikethrough) from Evernote (#3936 by Ian Slinger)
- Improved: Removed OneDrive Dev sync target which was not really useful
- Improved: Sort search results by average of multiple criteria, including &#039;Sort notes by&#039; field setting (#3777 by [@shawnaxsom](https://github.com/shawnaxsom))
- Improved: Sort tags in a case-insensitive way
- Improved: Updated installation script with BSD support (#3930 by Andros Fenollosa)
- Fixed: Crash when trying to change app locale (#3847)
- Fixed: Fix search filters when language is in Korean or with accents (#3947 by Naveen M V)
- Fixed: Fixed freeze when importing ENEX as HTML, and fixed potential error when importing resources (#3958)
- Fixed: Fixed setting issue that would cause a password to be saved in plain text in the database, even when the keychain is working
- Fixed: Importing ENEX as HTML was importing as Markdown (#3923)
- Fixed: Regression: Fix export of pluginAssets when exporting to html/pdf (#3927 by Caleb John)

## [cli-v1.2.3](https://github.com/laurent22/joplin/releases/tag/cli-v1.2.3) - 2020-10-09T11:17:18Z

- Improved: Improved handling of database migration failures

## [cli-v1.2.2](https://github.com/laurent22/joplin/releases/tag/cli-v1.2.2) - 2020-09-29T11:33:53Z

- Fixed: Fixed crash due to missing spellfix extension
- Fixed: Fixed link generation when exporting to PDF or HTML (#3780)
- Fixed: Improved handling of special characters when exporting to Markdown (#3760)

## [cli-v1.2.1](https://github.com/laurent22/joplin/releases/tag/cli-v1.2.1) - 2020-09-23T11:15:12Z

- Fixed: Fixed crash due to missing spellfix extension
- Fixed: Fixed link generation when exporting to PDF or HTML (#3780)
- Fixed: Improved handling of special characters when exporting to Markdown (#3760)

## [cli-v1.1.8](https://github.com/laurent22/joplin/releases/tag/cli-v1.1.8) - 2020-09-21T12:02:29Z

- Improved: Do not prevent export when one item is still encrypted
- Improved: Fix keytar library being loaded up in FreeBSD. (#3712) (#3711 by Jose Esteve)
- Fixed: Fixed note export when there are folders with non-existing parents. Also fixed long path issue on Windows. (#3689)
- Fixed: Increased file extension limit to 20 to prevent issue when using external editors (#3696)

## [cli-v1.0.168](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.168) - 2020-09-14T08:47:08Z

- Improved: Implemented reliable way to sync device and server clocks

## [cli-v1.0.167](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.167) - 2020-09-04T17:15:49Z

- New: Add mechanism to lock and upgrade sync targets (#3524)
- Improved: Add search filters (#3213) (#1877 by Naveen M V)
- Improved: Add support for OneDrive for Business (#3433) (#1266 by [@jonath92](https://github.com/jonath92))
- Improved: Added link navigation shortcuts (#3275) (#3217 by j-krl)
- Improved: When searching, weight notes using Okapi BM25 score (#3454 by Naveen M V)
- Fixed: Fixed sync fetching issue (#3599) (#3591 by [@alexchee](https://github.com/alexchee))

## [cli-v1.0.166](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.166) - 2020-08-02T14:03:26Z

- New: Add support for AWS S3 synchronisation (Beta) (#2815 by [@alexchee](https://github.com/alexchee))
- Fixed: Desktop-only scripts were incorrectly being loaded in CLI server tool (#3548)
- Fixed: Fix filename when exporting notebook as Markdown (#3473)
- Fixed: Fixed attachments being out of order when importing Enex file

## [cli-v1.0.165](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.165) - 2020-07-10T18:51:42Z

- New: Translation: Add bahasa indonesia (id_ID.po) (#3246 by [@ffadilaputra](https://github.com/ffadilaputra))
- Improved: Allow importing ENEX files as HTML
- Improved: Disable support for HTML export for now as it does not work
- Improved: Upload attachments > 4 MB when using OneDrive (#3195) (#173 by [@TheOnlyTrueJonathanHeard](https://github.com/TheOnlyTrueJonathanHeard))
- Fixed: Fixed import of checkboxes in ENEX files (#3402)
- Fixed: Fixed various bugs related to the import of ENEX files as HTML
- Fixed: Only de-duplicate imported notebook titles when needed (#2331)
- Fixed: Prevent desktop.ini file from breaking sync lock (#3381)
- Fixed: Prevent notebook to be the parent of itself (#3334)
- Fixed: Sync would fail in some cases due to a database error (#3234)

## [cli-v1.0.164](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.164) - 2020-05-13T15:30:22Z

- New: Added support for basic search
- Improved: Improve automatic title generation (#2955) (#2915 by anirudh murali)
- Improved: Improve handling of encrypted items
- Improved: Made layout configurable (#3069 by [@jyuvaraj03](https://github.com/jyuvaraj03))
- Improved: Start resource fetcher service when a note has been decrypted
- Fixed: Better handling of missing table field bug on Linux (#3088)
- Fixed: Fix format of geolocation data (#2673 by [@mic704b](https://github.com/mic704b))

## [cli-v1.0.163](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.163) - 2020-04-10T18:31:50Z

- Improved: Update ko.po (#2986 by [@xmlangel](https://github.com/xmlangel))
- Improved: Update it_IT.po (#2978 by [@abonte](https://github.com/abonte))
- Improved: Update nb_NO.po (#2973 by Mats Estensen)
- Improved: Update zh_CN.po (#2971 by [@troilus](https://github.com/troilus))
- Fixed: Add support for retrying decryption after it has failed multiple times (#2981)
- Fixed: When modifying a conflicted note, it would disappear from the view (#2709)
- Fixed: Prevent decryption loop when a resource cannot be decrypted (#2257)

## [cli-v1.0.162](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.162) - 2020-04-01T17:16:14Z

- New: Compatibility with new master key and sync target encryption

## [cli-v1.0.161](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.161) - 2020-03-07T01:20:04Z

- New: Add more context to encryption errors
- Improved: Changed default encryption method to CCM
- Improved: Change geolocation service to freegeoip.app to improve privacy (#2503 by Helmut K. C. Tessarek)
- Fixed: Handle invalid UTF-8 data when encrypting (#2591)
- Fixed: Fixed issue when a notebook does not have a parent (#2536)
- Fixed: Better handling of rare error in WebDAV server (#2485)
- Fixed: Fix importing of very large attachments (150MB+) from Evernote ENEX files

## [cli-v1.0.154](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.154) - 2020-02-07T23:22:24Z

- New: Added new date format YYYY.MM.DD (#2318 by XSAkos)
- Improved: Reset time fields when duplicating a note (#2428 by [@tekdel](https://github.com/tekdel))
- Improved: More info for "unknown profile version" error message (#2361 by [@mic704b](https://github.com/mic704b))
- Improved: Handle Thai language in search (#2387) (#2279 by Kirtan Purohit)
- Fixed: Fix escaping of title when generating a markdown link (#2456) (#2085 by Helmut K. C. Tessarek)
- Fixed: Fix console messages being displayed in GUI (#2457 by Helmut K. C. Tessarek)

## [cli-v1.0.153](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.153) - 2020-01-24T23:16:32Z

- New: Added new, more secure encryption methods, so that they can be switched to at a later time
- New: Add --export, --import, and --import-file flags to joplin config (#2179 by Marcus Hill)
- New: Added more logging for resource fetching to try to debug issue
- New: Add warning message when user tries to upload a file 10MB or larger (#2102) (#2097 by Marcus Hill)
- Improved: Replace note links with relative paths in MD Exporter (#2161 by Vaidotas Simkus)
- Improved: Upgrade sqlite (#2248 by Devon Zuegel)
- Improved: Extract note renderer to separate package (WIP) (#2206 by Laurent Cozic)
- Improved: Better handling of resource download errors, and added resource info to sync status screen
- Improved: Update Node dependency to 10+ (#2177 by [@joeltaylor](https://github.com/joeltaylor))
- Improved: Allow exporting a note as HTML
- Improved: Improved logging during sync to allow finding bugs more easily
- Fixed: Handle WebDAV servers that do not return a last modified date (fixes mail.ru) (#2091)
- Fixed: Restaured translations that had been accidentally deleted (#2126)
- Fixed: Prevent synch from happening if target dir could not be created, in local sync (#2117)
- Fixed: Handle rare case when notebook has a parent that no longer exists, which causes a crash when sorting (#2088)

## [cli-v1.0.150](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.150) - 2019-11-11T19:19:03Z

- New: Add command to list all tags for a note (#2003) (#1974)
- New: Added concept of sync version and client ID to allow upgrading sync targets
- Improved: Set user-agent header to Joplin/1.0 (#2064) (#2042)
- Improved: Update sharp tp v0.23.2 (for node 13 compatibility) (#2063)
- Improved: Handle special shortcuts such as Ctrl+H
- Improved: Handle WebDAV server with empty XML namespaces (#2002)
- Improved: Allow apps to work with read-only profile
- Improved: Support italic in span tags (#1966)
- Improved: Allow setting user timestamps with "set" command
- Improved: Allow a sync client to lock a sync target, so that migration operations can be performed on it
- Improved: Give correct mime type to more file types
- Improved: Use profile temp dir when exporting files (#1932)
- Improved: Confirm encryption password (#1937)
- Fixed: Handle paths with spaces for text editor (#2039)
- Fixed: Apply default style to notes in HTML format (#1960)
- Fixed: Fixed translation of "Synchronisation Status" (#1906)
- Fixed: App would crash if trying to index a note that has not been decrypted yet (#1938)

## [cli-v1.0.149](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.149) - 2019-09-27T21:18:57Z

- New: Add support to Termux by returning a default when platform name cannot be determined (#1905)

## [cli-v1.0.148](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.148) - 2019-09-27T18:42:36Z

- Improved: Improves deletion fail-safe so it is based on percentage of notes deleted. And display warning on sidebar.
- Improved: Log last requests in case of a sync error

## [cli-v1.0.147](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.147) - 2019-09-25T21:26:24Z

- New: Import Evernote notes as HTML (#1887)
- New: Added fail-safe to prevent data from being wiped out when the sync target is empty
- Improved: Also allow importing TXT files with markdown
- Improved: Upgrade joplin-turndown-plugin-gfm to fix import of certain Enex tables
- Fixed: Fixed import of notes that contain links with hashes
- Fixed: Fixed link issue following last update

## [cli-v1.0.146](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.146) - 2019-09-08T19:12:41Z

- Fixed: Fixed regression that was making installation fail

## [cli-v1.0.145](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.145) - 2019-09-08T16:23:02Z

- New: Added headless server command (Beta) (#1860)
- Improved: Improved bold formatting support in Enex import (#1708)
- Improved: Make translation files smaller by not including untranslated strings. Also add percentage translated to config screen. (#1459)
- Fixed: Make sure setting side-effects are applied even when running in command line mode (#1779)
- Fixed: Fix typo on encryption options screen (#1823)
- Fixed: Fixes fatal error with cli 1.0.141 on start (#1791)

## [cli-v1.0.137](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.137) - 2019-05-19T11:04:28Z

- Fixed: Fixed method to autosize resource

## [cli-v1.0.136](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.136) - 2019-05-19T10:19:22Z

- Improved: Put back "Fetched items" message during sync
- Fixed: Handle missing resource blob when setting resource size
- Fixed: Prevent app from trying to upload resource it has not downloaded yet

## [cli-v1.0.135](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.135) - 2019-05-13T22:59:14Z

- New: Added option to disable creation of welcome items
- New: Support for note history (#1415) (#712)
- Improved: Save size of a resource to the database; and added mechanism to run non-database migrations
- Improved: Display better error message when trying to sync with a new sync target from an old version of Joplin
- Improved: Update sharp (for node 12 compatibility) (#1471)
- Fixed: Do not resize images if they are already below the max dimensions
- Fixed: Allow resources greater than 10 MB but they won't be synced on mobile (#371)
- Fixed: Bump sqlite3 to v4.0.7 for node12 support (#1508)
- Fixed: Prevents notes with no title to break after synchronize (#1472)
- Fixed: Import lists and sub-lists from Enex files with correct indentation (#1476)

## [cli-v1.0.125](https://github.com/laurent22/joplin/releases/tag/cli-v1.0.125) - 2019-04-29T18:38:05Z

- Improved: Improved support for Japanese, Chinese, Korean search queries (also applies to Goto Anything)
- Improved: Display warning when changing dir for filesystem sync
- Fixed: Remove message "Processing a path that has already been done" as this is not an error (#1353)
- Fixed: Some resources could incorrectly be deleted even though they are still present in a note. Also added additional verifications before deleting a resource. (#1433)
- Fixed: Handle invalid resource tags that contain no data when importing ENEX (#1405)
- Fixed: Restored inline code styling (#1326)
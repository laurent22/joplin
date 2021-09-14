# Joplin terminal app changelog

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
- Improved: Update CliClient node dependency to 10+ (#2177 by [@joeltaylor](https://github.com/joeltaylor))
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
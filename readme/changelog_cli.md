# Joplin terminal app changelog

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
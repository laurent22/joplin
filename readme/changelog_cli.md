# Joplin terminal app changelog

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
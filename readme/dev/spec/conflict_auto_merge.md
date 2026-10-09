# Conflict auto-merge

When the same note is edited on two devices before they sync, if a change is made when one of the devices was not fully synced, Joplin creates a conflict note. Auto-merge avoids this when the edits don't overlap, using a three-way merge. It runs on the client that syncs second; other devices just receive the merged note.

## Base version

The merge needs three versions: **base** (the last version this device and the sync target agreed on), **local** and **remote**.

The base is stored per sync target in `sync_items.base_body` and `base_title`. It is recorded after an upload, after a download, and after a conflict, whichever version is left in the original note. If a downloaded note is encrypted, the base is cleared until it is decrypted, so that a conflict before decryption creates a normal conflict note.

## Merge

The merge is line-based. Regions changed by only one side are taken as-is. Regions changed by both sides are auto-merged if both made the same change, otherwise they become a conflict. Edits on the same or adjacent lines therefore conflict. Word-level merging was tried and dropped because it could silently duplicate text. Titles follow the same rule.

If everything merges, the merged note is saved over the local note, becomes the new base, and its `updated_time` is moved past the remote time so it gets uploaded. If some regions conflict, a conflict note is still created, but both notes already include the non-conflicting changes, so they differ only where there's a real conflict.

## Fallback to a conflict note

The merge is skipped, and a normal conflict note is created, when:

- `sync.autoMergeConflicts` setting is off
- there is no recorded base
- the item is read-only or either note is locked
- either note cannot be decrypted
- an edit which touches identical lines, since the diff can't tell which one changed and may duplicate content.
- the diff exceeds its bounds (`maxEditLength` 5000, timeout 1000ms)

## E2EE

An encrypted remote note is decrypted in memory for the merge without being saved. If a conflict note is created, the original note is saved with the decrypted (and partially merged) remote content.

## Code

- `services/conflict/diffNotes.ts`: merge engine (`autoMerge()`) and the duplicate-line guard
- `services/conflict/boundedDiff3.ts`: fork of `node-diff3`'s `diff3MergeRegions()` using a bounded diff
- `services/conflict/autoMergeNote.ts`: merges title and body of a note
- `services/synchronizer/utils/handleConflictAction.ts`: runs the merge during sync and applies the result
- `models/BaseItem.ts`: stores the base and keeps it when a sync doesn't provide a new one

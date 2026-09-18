# Conflict auto-merge

When the same note is edited on two devices before either of them syncs, Joplin creates a conflict note which requires manual resolution. The local version is copied to the Conflicts notebook and the remote version overwrites the local note.

Auto-merge avoids this when the changes don't overlap. It uses a three-way merge to combine the edits automatically, and only creates a conflict note if the merge fails. The merge only runs on the client that detects conflict, which is the client that syncs second. The other devices simply receive the merged note with their next sync.

### The three versions

**base**: the last version this device and the sync target agreed on \- the common ancestor.

**local**: the current note on this device.

**remote**: the incoming version from the sync target.

The base is stored per sync target in `sync_items.base_body` and `base_title`. It is recorded wherever a sync makes a version common to both sides:

- after a successful upload, the uploaded body and title,  
- after a download in the delta step, the downloaded body and title,  
- after a conflict, whichever version is left on the original note

That last case covers three outcomes. For a full merge, the base becomes the merged output. For a partial merge it becomes partially merged remote version and for a plain conflict note, where no merge ran, it will be the incoming remote version.

If an encrypted note is downloaded during sync, its content cannot be read yet, so the base is temporarily cleared. Once the note is decrypted, the actual base is saved.

This is intentional: if a conflict happens before decryption, Joplin creates a normal conflict note instead of trying to merge using an old base.

The `sync_items` row is recreated during every sync. If no new base is provided, the existing base is kept and carried forward.

### The merge

The merge splits the base, local, and remote versions into lines and divides them into sections marked as unchanged, auto-merged, or conflict.

* If only one side changed a region, its changes are taken as they are → auto-merged.  
* If neither side changed a region, it stays unchanged.  
* If both sides changed overlapping ranges, the region is considered unstable and needs further checking. This is based on overlapping ranges, so even edits on adjacent lines can be treated as one region.

For an unstable region:

* If both sides have the same content, it is auto-merged.  
* If both sides deleted the same content, the region is removed.  
* If the two sides have different content, it becomes a conflict

Those sections are then turned into two versions of the note that are identical except where a real conflict remains: resolvedLocal keeps the user's side, resolvedCurrent keeps the incoming side. fullyMerged is true only when no conflict is left and the title did not conflict. Titles follow the same rule \- merged if only one side changed it, a conflict if both changed it differently.

Merging is line-based. Two edits to different words on the same line conflict, and so do edits on adjacent lines, since they fall in the same region. Word-level merging was implemented and then dropped during review: it produced silent duplication when the same change was made slightly differently on each device. Word diffing is still used for highlighting in the conflict resolution UI, but not for automatic merge.

**When it falls back to a conflict note**

* The sync.autoMergeConflicts setting is off  
* There is no recorded base  
* The item is read-only, or either note is locked  
* The local note is still encrypted, or the remote one cannot be decrypted  
* Either side's edit touches a run of identical base lines (see below)  
* A diff exceeds its bounds (see below)

**What sync does with the result**

The merge is attempted after the existing Note.mustHandleConflict() check and before the conflict note is created.

Fully merged: no conflict note. The merged title and body are saved over the local note, and the merged output becomes the new base. The updated\_time is pushed ahead of the remote time so the merge uploads as a local change.

Partially merged: a conflict note is still created, but the non-conflicting changes are merged automatically in both sides first, so the two notes differ only where there is a real conflict. The original note's timestamp is updated only when the merge actually changes the remote version. If the remote version remains unchanged, no unnecessary upload is triggered.

### Duplicate lines and bounded diffs

Two guards exist to avoid bad merges and blocked syncs. Both turn the whole note into a single conflict when they trigger.

When the base contains consecutive identical lines, a line diff cannot tell which copy was edited and may apply both edits, silently duplicating content. To avoid this, the merge is skipped if a changed region is on or next to repeated lines. Duplicate lines far from both edits do not prevent a merge. Blank lines count as duplicates. The guard only applies when both sides actually changed the note.

Diffing is bounded because an unbounded diff blocked the app for minutes on large notes. The merge runs during sync so it uses tighter bounds (maxEditLength: 5000, timeout: 1000\) than the conflict viewer (10000, 3000). Exceeding them falls back to a conflict. Before running the diff, equality checks already handle simple cases such as when both sides are the same or only one side has changed.

### E2EE

The remote note arrives encrypted, so it is decrypted into memory for the merge. Nothing is saved during this process. The local note is not decrypted \- it should already have been decrypted by a normal sync.

When a conflict note is created for an encrypted remote note, the decrypted content is copied to the remote note and the encrypted data is cleared. This prevents decryption process from later overwriting the merged result. The resolution UI reads the remote version from the original note, so it’s readable there.

This check is handled within the decryption process itself because decryption uses extra memory during sync. This ensures users can disable the setting to avoid the additional memory usage if sync has memory issues.

**Setting**

`sync.autoMergeConflicts` is a public, global setting enabled by default. It can be disabled because auto-merge may produce incorrect results and uses extra memory during sync.

### Code architecture

`packages/lib/services/conflict/diffNotes.ts`: The merge engine. autoMerge(base, local, remote) returns the merged text plus the sections. It also holds the equality shortcuts and touchesDuplicateRun(), the duplicate-line guard. twoWayDiff() is separate and used only by the conflict UI.

`packages/lib/services/conflict/boundedDiff3.ts`: A local copy of `node-diff3`’s `diff3MergeRegions()` (MIT licensed). The region-combining logic remains unchanged, but the hunks come from bounded Myers diff (`diffArrays()` from the `diff` package) instead of `node-diff3`’s LCS. It defines the diff limits and `createDiffLines()`, which caches the two-way diffs needed by both the duplicate-line check and the merge. The cache is created for each merge, so concurrent merges do not share state. Since it is a fork, upstream `node-diff3` fixes are not included automatically; `boundedDiff3.test.ts` verifies that it produces the same regions as `node-diff3`.

`packages/lib/services/conflict/autoMergeNote.ts`: Merges a whole note. Applies the title rules (mergeTitle()) and builds resolvedLocal, resolvedCurrent and fullyMerged.

`packages/lib/services/conflict/decryptNoteInMemory.ts`: Returns a decrypted copy of a remote note without saving it. Returns null if the note cannot be decrypted, or if auto-merge is disabled.

`packages/lib/services/conflict/isAutoMergeEnabled.ts`: A helper to read the sync.autoMergeConflicts setting, so the setting name is always not repeated.

`packages/lib/services/synchronizer/utils/handleConflictAction.ts`: Handles the merge process and applies its result. It decides whether to perform the merge, handles the three possible outcomes, updates `updated_time`, and writes the `conflict_note_states` row.

`packages/lib/Synchronizer.ts`: Records the base at two points \- after a successful upload and in the delta step

`packages/lib/models/BaseItem.ts`: `updateSyncTimeQueries()` rebuilds the `sync_items` row and keeps the existing base when no new base is provided. `saveSyncBaseContent()` directly saves the base and is called by `decrypt()` when a downloaded encrypted note becomes readable.

`packages/lib/models/Note.ts`: syncBaseContent() reads the base for a note; setBaseConflictNoteId() links the original note to its conflict note.

`wordDiff.ts` and `loadConflictData.ts` are part of the conflict resolution UI, not the auto-merge logic. `loadConflictData.ts` uses `diffNotes.ts` to recalculate sections when a conflict is opened.

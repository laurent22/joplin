# Conflict resolution UI

When two devices edit the same note, if automatic resolution is enabled then sync merges the changes automatically where they don't overlap. If a real conflict remains, Joplin creates a conflict note for the local version and saves the remote version over the original, with the merged changes already applied to both. The conflict resolution UI shows both versions together, highlights the differences, and saves the resolved result back to the original note.

The feature is behind the `featureFlag.conflictResolution` setting, read through `isConflictResolutionEnabled()`. It is desktop-only and Markdown-only; the rich text editor is not supported.

**Which conflicts can be resolved**

`conflictIsResolvable.ts` checks whether a conflict can be resolved. There are two checks

1. `conflictNoteIsResolvable(note)` checks only the conflict note. It makes sure the feature flag is enabled, the note is a conflict, and the note is not encrypted, locked, or non-Markdown.  
2. The default export also checks the original note. The original must exist, be Markdown, not be encrypted or locked, not be in the trash or a read-only share, and have a `conflict_original_id`.

Folder conflicts cannot be resolved. If a conflict doesn't pass these checks, it continues to work as a normal note in the Conflicts notebook.

### Loading the data

`loadConflictData.ts` loads the conflict note, gets the original from `conflictIsResolvable`, and diffs the two bodies. Sections are recomputed on every call and never stored.

**Local**, "your version": the conflict note, holding what this device had before syncing.

**Remote**, "the synced version": the original note, which keeps the note ID and was kept by sync.

**Why no base is needed**

The UI uses a two-way diff (`twoWayDiff`). Three-way merging already happens during sync. When a base exists, `autoMergeNote` merges the clean changes and leaves only the real conflicts:

base + local + remote
        ↓
   autoMergeNote
      ↙      ↘
resolvedLocal  resolvedCurrent
      ↓             ↓
conflict note   original note

Since both notes already contain the same automatically merged changes, the two-way diff only shows the remaining conflicts. Without a base, auto-merge is skipped, so nothing is pre-merged. The diff itself remains unchanged. If everything is merged successfully, `fullyMerged` is true, so no conflict note or resolution UI is created.

**How lines are matched**

`twoWayDiff` does not compare raw lines directly. Both sides are prepared by `createViewerDiffLines()` and compared using a custom comparator.

`prepareViewerLines()` identifies Markdown table rows and tracks code fences so pipes inside code blocks are not treated as tables. It also creates `comparisonText` for each line. Table matching ignores column padding, and trailing whitespace is ignored. This means table formatting changes or Markdown hard breaks do not create unnecessary conflicts.

Only the comparison uses `comparisonText`. The original `line.text` is used when showing the changes, so the text displayed to the user is never modified. This matching is only for the conflict viewer. `boundedDiff3.ts` still uses the normal line diff for auto-merge during sync.

**Sections**

`twoWayDiff` returns `MergedSection` objects, each unchanged or conflict. A conflict carries `localText`, `remoteText` and their line counts. A removal followed by an addition becomes one conflict, so a replaced block is a single change.

If the diff exceeds `maxEditLength: 10000` or a 3-second timeout (from `viewerDiffOptions`), the whole note becomes one conflict section holding the two raw bodies rather than blocking the UI.

`loadConflictData` also checks for a title conflict and returns the original note’s `updated_time` as `remoteUpdatedTime` to detect changes during resolution. If the conflict cannot be resolved, it returns `Unavailable`

### Building the document

`buildConflictDocument.ts` turns sections into the text the editor opens plus a list of regions. The document is built from the remote version: normal sections use their original text, while conflict sections use `remoteText`. The local text is not added to the document; it is attached to the region and shown as a widget.

This means the user starts with the synced version and can choose to apply local changes. If they do nothing, the synced version stays as it is.

Each conflict stores its position in the document, the local text, and its type:

* **`onlyTheirs`** \-  only the remote version has text.  
* **`onlyMine`** \-  only the local version has text.  
* **`changed`** \-  both versions have different text.

`onlyTheirs` changes are already in the document, so they are highlighted directly without a widget.

The `<<<<<<< local` markers are not used here. They are only part of `mergedText`, which the desktop UI does not use. The editor receives the text from `buildConflictDocument()`.

### In the editor

`useConflictResolution.ts` loads the conflict data, builds the document, and returns its text as the editor's content. Because regions are text offsets, the hook installs them only once the editor's document equals that text, retrying every 50ms until it does. It calls `clearHistory()` first, so undo cannot restore the pre-merge body.

While resolving, `codeMirror_change` keeps edits only in the editor instead of saving them. The changes are saved only when the user clicks Finish. `resolvingConflict` also forces the editor to use plain-text rendering.

`conflictResolutionExtension.ts` (in `packages/editor`) holds regions in a StateField and renders:

* remote text decorated blue (`cm-conflictIncoming`),  
* a block widget above it showing the local text in yellow with a Use my version button, unless the region is `addedByThem`,  
* word-level highlights from `wordDiff()`, computed against the current document text so they follow the user's edits.

`wordDiff.ts` uses a Unicode-aware regex so languages like Cyrillic, Greek, and Arabic are treated as words instead of individual characters. CJK text is kept char-by-char for better diffs.If more than 70% of a line has changed, the whole line is highlighted instead of individual words. For tables, column padding is ignored so realigning columns is not shown as a change. The widget handles copying so the local version is copied instead of the remote text.

**Resolving**

A region stops being a conflict in three ways:

* **Use my version** dispatches `useLocalVersion`; a transactionFilter then replaces the region with `localText`. If the editor is read-only, the change is ignored.  
* **Editing directly:** Regions are updated after each change and marked resolved when the text matches `localText`.  
* **Leaving it alone**, which keeps the remote text.

Resolutions are undoable: invertedEffects maps resolveConflict back to restoreConflict.

**Previous change** and **Next change** in `ConflictFooter` use `goToConflict()`. It skips resolved regions, wraps around at the ends, and scrolls to the target line block so the local version widget stays visible.

### Finish, Keep both versions, titles

`finishConflictResolution.ts` saves the resolved title and body to the original note, keeping its ID and sync data, then permanently deletes the local conflict note. Deletion happens only after the save succeeds. It returns `CannotWrite` when the original cannot be edited: encrypted, locked, trashed, or the save itself failed and `OriginalChanged` when the original changed during resolution. In that case  the user is asked to reload it instead of overwriting it, which runs the diff again against the latest original and discards any unsaved resolution changes.
`NoteEditor.tsx` prevents duplicate finishes, waits for pending saves, and gets the final body directly from the editor.

`keepConflictCopy.ts` removes the conflict status, moves the note to the original's folder, and renames it `Title (conflicted copy)`, then `Title (conflicted copy 2)`, etc. It always uses the next available number, so names are not reused. Special characters like `%`, `_`, and `\` are escaped for the `LIKE` query.

Titles are handled separately. `useConflictTitle` reports `hasTitleConflict` when the titles differ and starts `resolvedTitle` with the remote title, matching the body’s default. It re-checks the original on `ItemChange` and `SyncComplete` to set `originalIsStale`, while `finishConflictResolution` makes the final check and returns `OriginalChanged` if the original changed.

**Editor restrictions**

Two flags in `NoteEditor.tsx` have different roles, and both apply only when the resolution UI can appear. `conflictIsInView` requires a resolvable conflict and that the note is open in the Conflicts folder, trash, or a secondary window. Conflicts opened elsewhere, or when the feature is off, are unaffected.

Within that scope, `conflictRestrictsEditor` decides which editor is shown. It prevents plugin editors and whiteboards from taking over, and is true while the check runs so neither appears first. `conflictBlocksPlugins` waits for confirmation before disconnecting plugins and setting `activeNoteIsConflict`, which disables `toggleVisiblePanes` and `toggleEditors` since only the editor pane is shown.

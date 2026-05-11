# `any` Cleanup Progress

Tracks the effort to remove `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments from the codebase and replace `any` with proper types.

## Goal

Reduce the number of `eslint-disable-next-line @typescript-eslint/no-explicit-any` comments by replacing `any` with actual types wherever this can be done **without changing code logic** and **without significant refactoring**. Most of these comments are tagged `Old code before rule was applied` and are the primary targets.

## Rules

For each disable comment encountered:

1. **Replace `any` with a real type** only if:
   - An existing imported/exported type fits, or
   - The type is obvious from local context (literal, known SDK return, etc.)
2. **Leave the comment in place** (skip) when:
   - Replacing would require new type definitions, refactoring call sites, or changing logic.
   - The comment's reason is something other than `Old code before rule was applied` (e.g. `No better type available`, `CodeMirror 5 API requires any`, `would be too big of a refactoring`).
   - The correct type is genuinely `unknown` and would force narrowing changes (that's a logic change).
3. When `any` is removed, **delete the disable comment** as well.
4. Do not make whitespace-only changes to surrounding code (per `CLAUDE.md`).
5. After each package, run `yarn tsc --noEmit` and `yarn lint` for that package to verify nothing broke.

## Files to never touch

- `packages/generator-joplin/generators/app/templates/api/types.ts` — Yeoman template, not real code.
- `packages/app-cli/tests/support/plugins/*/api/types.ts` — copies of the plugin API; source of truth is `packages/lib/services/plugins/api/types.ts`. They get regenerated.

## Workflow

- One PR per package.
- Process small packages first to validate the workflow before tackling the large ones.
- **Update this file as you go, not at the end.** The Claude session may run out of context, get auto-compacted, or be interrupted at any point. Treating this file as the durable source of truth — and writing to it incrementally — means progress is never lost.
  - After each file is processed: add its entry to the package's **Per-package detail** subsection (files processed / files skipped, with reasons).
  - After each package is completed: update the **Status** table row (Removed / Remaining / Status / Session date).
  - For large packages (e.g. `lib`, `app-desktop`, `app-cli`), also update the table row at intermediate checkpoints (e.g. every ~20 files) so a hard cutoff loses at most one checkpoint's worth of detail.
- Commit the progress file alongside (or as part of) the package's cleanup PR.
- If a session stops mid-package, the **Per-package detail** section records exactly which files were processed so the next session can resume cleanly.
- At the start of any new session, re-read this file before resuming — it is the source of truth, not conversational memory.

### Context exhaustion considerations

Large packages can consume enough context in a single session that Claude either hits a hard limit, gets auto-compacted, or starts to degrade in attention. Plan for this rather than hope to avoid it:

- **One package per session is the rule.** `lib` (1140 comments, 213 files) will not fit in a single conversation with full attention; even `app-desktop` (477) and `app-cli` (742) are risky. Do not try to batch multiple packages.
- **Quality degrades before it fails.** Long sessions get sloppy (more skimming, shorter diffs, weaker verification) well before context is actually exhausted. Watch for this and stop at a clean file boundary if it happens — better to checkpoint and resume fresh than to push through.
- **Auto-compaction loses precise per-file detail.** After compaction, Claude retains the high-level task ("I'm cleaning up `any` in package X") but may lose which specific files were already processed. The on-disk progress file is the only reliable record — that's why per-file entries must be written immediately, not batched.
- **Resume protocol.** When resuming, re-read this entire file first. Compare the **Per-package detail** entries against the actual files still containing disable comments (`grep -rn "eslint-disable-next-line @typescript-eslint/no-explicit-any" packages/<name>/`) to confirm where to pick up. Trust the file, not memory.
- **Stopping protocol.** If stopping mid-package (intentionally or because of context pressure), the last action before stopping must be a progress-file update reflecting the latest state. Then say so clearly in the final user-facing message — never silently stop.

## Status

Counts captured 2026-05-11 before any work.

| # | Package | Files w/ comments | Comments (start) | Removed | Remaining | Status |
|---|---|---:|---:|---:|---:|---|
| 1 | pdf-viewer | 3 | 5 | 5 | 0 | done (2026-05-11) |
| 2 | editor | 5 | 21 | 0 | 21 | not started |
| 3 | utils | 9 | 28 | 0 | 28 | not started |
| 4 | react-native-saf-x | 1 | 1 | 1 | 0 | done (2026-05-11) |
| 5 | default-plugins | 1 | 4 | 0 | 4 | not started |
| 6 | renderer | 25 | 99 | 0 | 99 | not started |
| 7 | tools | 23 | 49 | 0 | 49 | not started |
| 8 | plugin-repo-cli | 11 | 33 | 0 | 33 | not started |
| 9 | app-mobile | 37 | 131 | 0 | 131 | not started |
| 10 | server | 67 | 227 | 0 | 227 | not started |
| 11 | app-cli | 90 | 742 | 0 | 742 | not started |
| 12 | app-desktop | 149 | 477 | 0 | 477 | not started |
| 13 | lib | 213 | 1140 | 0 | 1140 | not started |
| — | generator-joplin | 2 | 27 | — | — | excluded (template) |

Total in-scope comments at start: **2,952** across **633 files**.

## Recommended order

Smallest packages first to validate the workflow and surface common patterns before tackling the large ones:

1. pdf-viewer, react-native-saf-x, default-plugins, editor, utils (warm-up; ~59 comments total)
2. renderer (99)
3. tools, plugin-repo-cli (82)
4. app-mobile (131)
5. server (227)
6. app-cli (742) — skip the `tests/support/plugins/*/api/types.ts` copies
7. app-desktop (477)
8. lib (1140) — biggest; do last so prior packages inform the work

## Per-package detail

Each package gets a subsection added when work begins. Format:

```
### packages/<name>
Session date: YYYY-MM-DD

Files processed:
- path/to/file.ts — N removed, M left (reasons)

Files skipped entirely:
- path/to/file.ts — reason
```

### packages/pdf-viewer
Session date: 2026-05-11

Files processed:
- `messageService.ts` — 1 removed, 0 left. Replaced `data?: any` with `data?: Record<string, unknown>`.
- `Page.tsx` — 1 removed, 0 left. Replaced `let style: any` with `let style: CSSProperties` (imported from `react`).
- `PdfDocument.ts` — 3 removed, 0 left. Imported `PDFDocumentProxy` and `PDFPageProxy` from `pdfjs-dist`; typed `doc`, `pages` (as `Record<number, PDFPageProxy>`) and the local `pdfDocument`.

Verification: `yarn tsc --noEmit` clean, `yarn linter-ci packages/pdf-viewer/` clean.

### packages/react-native-saf-x
Session date: 2026-05-11

Files processed:
- `src/index.ts` — 1 removed, 0 left. Replaced `{} as any` with `{} as SafxInterface` (the interface declared in the same file).

Verification: `yarn tsc --noEmit` clean, `yarn linter-ci packages/react-native-saf-x/` clean.

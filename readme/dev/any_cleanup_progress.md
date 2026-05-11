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
   - Replacing would require **significant refactoring** (e.g. changing many call sites, splitting a class, restructuring control flow). Introducing a small new type definition (e.g. a local interface or type alias, or a type that would only be used in a few places) is fine and not considered significant refactoring.
   - Replacing would require **changing code logic**.
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
- **After each commit that updates this file, also sync the PR body** so reviewers see the latest progress without opening the file. Run:
  ```
  gh pr edit <PR-number> --body-file readme/dev/any_cleanup_progress.md
  ```
  Find the PR number with `gh pr list --head <branch> --json number`. The current PR for this cleanup is **#15339** on branch `any_refactor_2`.
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
| 2 | editor | 5 | 21 | 6 | 15 | done (2026-05-11) |
| 3 | utils | 9 | 28 | 23 | 5 | done (2026-05-11) |
| 4 | react-native-saf-x | 1 | 1 | 1 | 0 | done (2026-05-11) |
| 5 | default-plugins | 1 | 4 | 4 | 0 | done (2026-05-11) |
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

### packages/default-plugins
Session date: 2026-05-11

Files processed:
- `build.ts` — 4 removed, 0 left. Imported `Argv` and `ArgumentsCamelCase` from `yargs`; typed builder callbacks as `(yargs: Argv) => ...` and handler args as `ArgumentsCamelCase<{ outputDir: string }>` / `ArgumentsCamelCase<{ plugin: string }>`.

Verification: `yarn tsc --noEmit` clean, `yarn linter-ci packages/default-plugins/` clean.

### packages/editor
Session date: 2026-05-11

Files processed:
- `CodeMirror/CodeMirror5Emulation/CodeMirror5Emulation.ts` — 2 removed, 6 left.
  - Removed: `isPosition` type guard now uses `Partial<DocumentPosition>` instead of `any`; `removeOverlay` overlay param uses `OverlayType<unknown>` instead of `OverlayType<any>`.
  - Left: `OptionUpdateCallback` `newVal/oldVal: any` (the source is `value: any`, which is API-driven; narrowing in callbacks would be a logic change); `addOverlay` return type (the `any` structurally deceives the base-class signature `SearchQuery | undefined` to allow returning `{ clear: () => void }` from the decorator branch — fixing it is a class-hierarchy refactor, not a typing tweak); `commands as any` cast (same kind of structural deception of the base class); and the 4 entries already tagged "CodeMirror 5 API requires any" / "Must match base class signature". Re-checked after the rule was clarified to allow small new type definitions — none of these are amenable to that.
- `CodeMirror/pluginApi/PluginLoader.ts` — 4 removed, 1 left.
  - Removed: introduced `PluginLoaderWindow` type alias (`Window & { __pluginLoaderScriptLoadCallbacks: Record<number, OnScriptLoadCallback>; __pluginLoaderRequireFunctions: Record<number, typeof codeMirrorRequire> }`); replaced four `(window as any).__pluginLoader…` casts with `(window as unknown as PluginLoaderWindow).…`.
  - Left: `OnScriptLoadCallback` `exports: any` (already tagged "Plugin exports have dynamic structure").

Files skipped entirely (only non-"Old code" tags inside):
- `types.ts` — `execCommand`/varying argument types.
- `CodeMirror/editorCommands/editorCommands.ts` — `EditorCommandFunction` varying argument types.
- `CodeMirror/CodeMirror5Emulation/CodeMirror5Emulation.test.ts` — dynamic-extension test casts.

Verification: `yarn tsc --noEmit` clean, `yarn linter-ci packages/editor/` clean.

### packages/utils
Session date: 2026-05-11

Files processed:
- `dom.ts` — 1 removed, 0 left. `findParentElementByClassName` parameter typed `Element | null` (broad enough to accept `EventTarget & Element` from callers in app-desktop).
- `splitCommandString.ts` — 1 removed, 0 left. Introduced local `SplitCommandStringOptions { handleEscape?: boolean }` interface.
- `cli.ts` — 0 removed, 1 left. Tried `Interface` from `readline/promises`, but `@types/node` in this repo does not declare the `readline/promises` submodule. Updated reason on the disable comment to reflect that.
- `execCommand.ts` — 1 removed, 1 left. `env` typed as `Record<string, string | undefined>`. The other entry is already tagged with a Workaround reason (Expo/NodeJs.ProcessEnv conflict).
- `net.ts` — 1 removed, 0 left. Introduced local `FetchWithRetryOptions extends RequestInit` interface with `retry`, `callback`, `pause` fields.
- `object.ts` — 0 removed, 2 left. `objectValueFromPath` does successive indexing (`result = result[e]`) which requires `any`; tightened to `Record<string, unknown>` failed because intermediate values are `unknown`. `checkObjectHasProperties` is called with `NoteEntity` / `FolderEntity` / `ItemSlice` (interfaces without index signatures) — tightening forces every caller to widen. Updated reasons to explain why.
- `html.ts` — 1 removed, 0 left. `attributesHtml(attr: Record<string, string>)` to match the local-only usage; renderer package has its own `attributesHtml` already typed the same way.
- `Logger.ts` — 17 removed, 1 left.
  - Removed: `TargetOptions.console` typed `Console`; `Logger.create` wrapper args `unknown[]`; `addTarget` field copy uses paired `Record<string, unknown>` casts; `objectToString` outer param `unknown`, inner Error branch uses a typed intersection cast; `objectsToString`, `error/warn/info/debug` rest args `unknown[]`; `items: unknown[]`; global-logger fallback typed as a `Logger` cast; `consoleObj[fn]` indexed through `Record<string, (...args: unknown[]) => void>` cast.
  - Left: `TargetOptions.database` — tightening leaks through `lastEntries()` to all downstream consumers (e.g. `app-mobile/exportDebugReport.ts`) that read `.timestamp/.level/.message` via `any`. Refactoring those is out of scope. Updated reason on the disable comment.
- `env.ts` — 2 removed, 0 left. `(error as Error).message = …`; `key_value = … as RegExpMatchArray` (and the inner nested `.match()` typed the same way to preserve the original implicit non-null assumption).

Verification: `yarn tsc --noEmit` clean for the utils package; root `yarn tsc --noEmit` (all workspaces) clean — initial attempt broke 4 downstream files in app-desktop/app-mobile/server/tools, which forced reverts on `checkObjectHasProperties` and `LoggerDatabase` and a widening of `findParentElementByClassName`. `yarn linter-ci packages/utils/` clean.

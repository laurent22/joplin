# `any` Cleanup Progress

Tracks the effort to remove `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments from the codebase and replace `any` with proper types.

## Goal

Reduce the number of `eslint-disable-next-line @typescript-eslint/no-explicit-any` comments by replacing `any` with actual types wherever this can be done **without changing code logic** and **without significant refactoring**. Most of these comments are tagged `Old code before rule was applied` and are the primary targets.

## Rules

For each disable comment encountered:

1. **Replace `any` with a real type** only if:
   - An existing imported/exported type fits, or
   - The type is obvious from local context (literal, known SDK return, etc.)
2. **Prefer types exported by the library over hand-rolled ones.** When `any` describes a value that comes from a third-party package (e.g. `@rmp135/sql-ts` `Table`/`Column`, `yargs` `Arguments`, `markdown-it` `Token` / `StateCore`), check the package's `.d.ts` files (`node_modules/<pkg>/**/*.d.ts`) before defining a new local interface. Importing the existing type is preferable because it stays accurate as the library evolves and matches what the runtime actually produces. Only fall back to a local type when the library doesn't export one, the exported type is significantly broader/narrower than needed, or importing it would pull in a heavy dependency the file otherwise doesn't need.
   - **Import from the package's public entry, not an internal path.** If a type is re-exported from the top-level module (`'@rmp135/sql-ts'`, `'markdown-it'`), import it from there rather than reaching into `dist/`, `lib/`, or `src/` (`'@rmp135/sql-ts/dist/Typings'`, `'markdown-it/lib/token'`). Internal paths can be renamed or removed in any minor release without notice. The exception is when the type is *not* re-exported from the top level (markdown-it's `StateCore`/`Token`/`Renderer` are this case — `'markdown-it/lib/...'` is the only way to reach them); in that case the internal path is unavoidable and is fine to use.
3. **Leave the comment in place** (skip) when:
   - Replacing would require **significant refactoring** (e.g. changing many call sites, splitting a class, restructuring control flow). Introducing a small new type definition (e.g. a local interface or type alias, or a type that would only be used in a few places) is fine and not considered significant refactoring.
   - Replacing would require **changing code logic**.
   - The comment's reason is something other than `Old code before rule was applied` (e.g. `No better type available`, `CodeMirror 5 API requires any`, `would be too big of a refactoring`).
   - The correct type is genuinely `unknown` and would force narrowing changes (that's a logic change).
4. When `any` is removed, **delete the disable comment** as well.
5. Do not make whitespace-only changes to surrounding code (per `CLAUDE.md`).
6. **Don't add explanatory comments unless really needed.** A cast or local type usually speaks for itself — don't write a paragraph explaining what a reader can already see from the code. Only add a comment when the *why* is non-obvious and would otherwise mislead a future change (e.g. a cast that exists to avoid a runtime-changing fix). When you do leave a disable comment, the inline `-- reason` is enough; don't pair it with an extra block comment.
7. After each package, run `yarn tsc --noEmit` and `yarn lint` for that package to verify nothing broke.
8. Before committing, run `yarn spellcheck --all` (or `yarn spellcheck <path>` for the files you touched, including the progress docs) and ensure it passes. The pre-commit hook runs spellcheck on the staged files, so an unknown word will block the commit. When cSpell flags a real technical word that should be allowed everywhere, add it to the last dictionary in `packages/tools/cspell/dictionary?.txt` per the spec in [readme/dev/spellcheck.md](/help/dev/spellcheck) (each dictionary has a ~400-word cap; create a new one if the last is full). Don't use inline `// cSpell:disable` for individual words — only for blocks of unparseable content.

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
- **After each commit that updates this file, also sync the PR body** so reviewers see the latest progress without opening the file. Run: `gh pr edit <PR-number> --body-file readme/dev/any_cleanup_progress.md`.
  Find the PR number with `gh pr list --head <branch> --json number`. The current branch for this cleanup is `any_refactor_5` (no PR opened yet — previous PR on `any_refactor_4` was merged).
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

Counts captured 2026-05-11 before any work. Note: the original `app-cli` row counted 742 comments across 90 files, but that included `build/` (compiled JS), `app/*.js` (compiled JS), and `tests/support/plugins/*/api/` (regenerated plugin API copies — listed under "Files to never touch"). The in-scope `.ts`/`.tsx` source contains 90 comments across 38 files; the table was corrected on 2026-05-13.

| # | Package | Files w/ comments | Comments (start) | Removed | Remaining | Status |
|---|---|---:|---:|---:|---:|---|
| 1 | pdf-viewer | 3 | 5 | 5 | 0 | done (2026-05-11) |
| 2 | editor | 5 | 21 | 6 | 15 | done (2026-05-11) |
| 3 | utils | 9 | 28 | 23 | 5 | done (2026-05-11) |
| 4 | react-native-saf-x | 1 | 1 | 1 | 0 | done (2026-05-11) |
| 5 | default-plugins | 1 | 4 | 4 | 0 | done (2026-05-11) |
| 6 | renderer | 25 | 99 | 87 | 12 | done (2026-05-11) |
| 7 | tools | 23 | 49 | 45 | 4 | done (2026-05-11) |
| 8 | plugin-repo-cli | 11 | 33 | 33 | 0 | done (2026-05-11) |
| 9 | app-mobile | 37 | 131 | 98 | 33 | done (2026-05-12) |
| 10 | server | 67 | 227 | 205 | 22 | done (2026-05-12) |
| 11 | app-cli | 38 | 90 | 74 | 16 | done (2026-05-13) |
| 12 | app-desktop | 149 | 477 | 300 | 177 | done (2026-05-13) |
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

Each package gets a subsection added to `./any_cleanup_progress_details.md` when work begins. Format:

```
## packages/<name>
Session date: YYYY-MM-DD

Files processed:
- path/to/file.ts — N removed, M left (reasons)

Files skipped entirely:
- path/to/file.ts — reason
```

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
| 6 | renderer | 25 | 99 | 87 | 12 | done (2026-05-11) |
| 7 | tools | 23 | 49 | 45 | 4 | done (2026-05-11) |
| 8 | plugin-repo-cli | 11 | 33 | 33 | 0 | done (2026-05-11) |
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

### packages/renderer
Session date: 2026-05-11

Shared work: added a new `RendererTheme` interface in `types.ts` (a structural superset of the application theme that the renderer reads — `cacheKey`, `appearance`, colors, `noteViewerFontSize`, `bodyPaddingTop/Bottom`, `buttonStyle`, etc.). All fields are optional because callers pass either `ThemeStyle` from `@joplin/lib`, the renderer's `defaultNoteStyle` merge, or bare `{}` (tests). This made it possible to replace `theme: any` across the package without touching call sites in `app-desktop`, `app-mobile`, `server`, `lib/commands/renderMarkup`, etc. Also exported `ResourceEntity` from `types.ts` so `Link.resource` could be typed.

Files processed:
- `types.ts` — 7 removed, 1 left.
  - Removed: `theme?`, `plugins?` (typed as `Record<string, Record<string, unknown>>` so it can be spread), `MarkupRenderer.render`, `MarkupRenderer.allAssets`, `MarkupToHtmlConverter.render` (also tightened `options: any` → `RenderOptions`), `MarkupToHtmlConverter.allAssets`.
  - Left: `FsDriver.cacheCssToFile` — return is used loosely as a `RenderResultPluginAsset` push target while the actual returned object only has `{ path, mime }`; tightening forces logic changes. Updated reason on the comment.
- `HtmlToHtml.ts` — 2 removed, 0 left. Both `theme: any` → `RendererTheme`. Also made `Options.ResourceModel` optional (constructor already handles `null`).
- `MarkupToHtml.ts` — 4 removed, 0 left. `rawMarkdownIt_` typed as `MarkdownIt` (added a type-only `import type * as MarkdownItType from 'markdown-it'`). The `as any` on the `RendererClass` construction went away by branching to explicit `new MdToHtml(this.options_)` / `new HtmlToHtml(this.options_)` calls. `theme: any` on `render` and `allAssets` → `RendererTheme`.
- `MdToHtml.ts` — 19 removed, 4 left.
  - Removed: `RendererRule.install` (typed via `PluginContext`/`RuleOptions`/`unknown`), `RendererRule.assets` (`(theme: RendererTheme) => PluginAsset[]`), `RendererRule.plugin` (`MarkdownIt.PluginWithOptions`); `RendererPlugin.module` and `options` (typed plugin + `Record<string, unknown>`); `ExtraRendererRule.module` (`Omit<RendererRule, 'assetPath' | 'pluginId' | 'assetPathIsAbsolute'>`); `Options.pluginOptions` (`Record<string, { enabled?: boolean } & Record<string, unknown>>`); `Link.resource` (`ResourceEntity | null`); the four `PluginContext` `any` fields (`Record<string, string>` for css, `Record<string, PluginAsset[]>` for pluginAssets, `InMemoryCache` for cache, `Record<string, Record<string, unknown>>` for userData); `RuleOptions.theme` (`RendererTheme`); `pluginOptions_` (`NonNullable<Options['pluginOptions']>`); `loadExtraRendererRule.module` (matches new `ExtraRendererRule['module']`); `allProcessedAssets.theme`, `allProcessedAssets.assets` (`PluginAssets`); `allAssets.theme` and inner `assets` (`PluginAssets`); `render.theme` (`RendererTheme`); `_attrs: any` on `highlight()` → `string`.
  - Left: `outputAssetsToExternalAssets_(output: any)` — the function mutates with `delete output.cssStrings`, which `RenderResult` does not permit; updated reason on the comment. `render`'s `theme: any = null` was tightened to `theme: RendererTheme = null` (note: keeping `null` default required RendererTheme to allow `null` via callers passing it through, handled because all fields are optional). `highlight()` returns `any` because the function returns either a `string` or `{ wrapCode, html }` depending on whether `rules.fence` is set — a non-standard markdown-it return. `loadPlugin(plugin: any, options: any)` — plugin may be a function or an ES-module wrapper with `.default`, and the function reassigns it before calling `markdownIt.use(plugin, options)`; tightening forces logic restructuring. Updated reasons.
- `noteStyle.ts` — 1 removed, 0 left. `theme: any` → `RendererTheme` (all fields optional, so `theme = theme ? theme : {}` continues to type-check).
- `headerAnchor.ts` — 2 removed, 0 left. Added type-only imports for `MarkdownIt` and `markdown-it/lib/rules_core/state_core`; `markdownIt: any` → `MarkdownIt`, `state: any` → `StateCore`.
- `InMemoryCache.ts` — 0 removed, 3 left. Generic cache: values are heterogeneous across calls (different keys store different shapes); `unknown` would force narrowing changes at every caller. Updated reason on one comment that was tagged "Old code" to match the existing "Generic cache" reason.
- `MdToHtml/setupLinkify.ts` — 2 removed, 0 left. Added type-only imports for `MarkdownIt` and `linkify-it`; `markdownIt: any` → `MarkdownIt`, `self: any` → `LinkifyIt.LinkifyIt`.
- `MdToHtml/linkReplacement.ts` — 1 removed, 0 left. `LinkReplacementResult.resource: any` → `ResourceEntity | null`.
- `MdToHtml/renderMedia.ts` — 1 removed, 0 left. `Options.theme: any` → `RendererTheme`.

Verification at checkpoint (after top-level files, before processing `MdToHtml/rules/*`): package `yarn tsc --noEmit` clean; root `yarn tsc --noEmit` clean.

Shared work for the rules subdirectory: across most rules the `markdownIt: any` → `MarkdownIt`, `state: any` → `StateCore` / `StateInline` / `StateBlock`, `tokens: any[]` → `Token[]`, `Token: any` → `typeof import('markdown-it/lib/token')`, and `(tokens, idx, options, env, self)` rule signatures pick up `Renderer.RenderRule` (or its component types). All these are type-only imports from `markdown-it`'s `@types` package, so they have no runtime cost. Two `RuleOptions` extensions: `globalSettings`, `settingValue` (set per-rule by `MdToHtml.render()`), and `mapsToLine` (used only by `source_map` rule).

One unrelated typing fix: `utils.getAttr(attrs: string[], ...)` → `(attrs: [string, string][], ...)` — the function indexes `attrs[i][0]` / `attrs[i][1]`, so the original `string[]` signature was wrong and prevented typing the `tokens[idx].attrs` calls in `image.ts` correctly.

Files processed:
- `MdToHtml/rules/abc.ts` — 1 removed, 1 left. `ruleOptions: any` → `RuleOptions` (the existing comment said "we still don't have a type for ruleOptions"; we do now). Left: `(self.renderToken as any)(tokens, idx, options, env, self)` — extra args beyond the typed signature; reason already documented.
- `MdToHtml/rules/code_inline.ts` — 3 removed, 0 left. Typed `defaultRender: Renderer.RenderRule`; outer `markdownIt: any` → `MarkdownIt`; rule signature gets proper types.
- `MdToHtml/rules/externalEmbed.ts` — 0 removed, 2 left. Both `(self.renderToken as any)(...)` casts pass `env, self` which `renderToken`'s typed signature does not declare. Updated reasons.
- `MdToHtml/rules/checkbox.ts` — 5 removed, 0 left. `theme: any` → `RendererTheme`; `Token: any` → `typeof import('markdown-it/lib/token')`; `sourceToken: any` → `Token`; `markdownIt: any` → `MarkdownIt`; `state: any` → `StateCore`.
- `MdToHtml/rules/fence.ts` — 2 removed, 1 left. Typed the rule signature with `Token[]` / `MarkdownIt.Options` / `Renderer`. Left: `options: any` on the fence renderer — `options.highlight` here returns either a string or `{ wrapCode, html }`; the typed signature can't express that disjunction without restructuring `MdToHtml.render`. `tmpToken as Token` cast added because the rule constructs a partial `Token` (`{ attrs }`) just to call `slf.renderAttrs`, which only reads `attrs`.
- `MdToHtml/rules/image.ts` — 2 removed, 0 left. `markdownIt: any` → `MarkdownIt`; rule signature gets typed.
- `MdToHtml/rules/fountain.ts` — 4 removed, 0 left. `theme: any` → `RendererTheme` (the existing comment said "Theme is defined in @joplin/lib and we don't import it here" — but now we have a local `RendererTheme`); `markdownIt: any` → `MarkdownIt`; rule signatures typed.
- `MdToHtml/rules/highlight_keywords.ts` — 4 removed, 0 left. `Token: any` → `typeof import('markdown-it/lib/token')`; `markdownIt: any` → `MarkdownIt`; `state: any` → `StateCore`.
- `MdToHtml/rules/katex.ts` — 9 removed, 0 left. Introduced `KatexMacroToken`, `KatexMacro`, `KatexOptions` local interfaces (matching the macro shape documented in the file's own comments). `stringifyKatexOptions`, `renderToStringWithCache`, and the inner `toSerialize` now use these types. `(t: any) => t.text` typed via the `KatexMacroToken.text` field. `state: any` → `StateInline` / `StateBlock`; `markdownIt: any` → `MarkdownIt`; the two renderer functions typed via `Token[]`. A single `as KatexOptions['macros']` cast on the macros pulled from `options.context.userData.__katex.macros`, since `userData` is typed `Record<string, Record<string, unknown>>` and the renderer doesn't know the per-plugin shape there.
- `MdToHtml/rules/html_image.ts` — 6 removed, 0 left. Both default render fallbacks typed as `Renderer.RenderRule`; `handleImageTags` now returns `Renderer.RenderRule`; outer `markdownIt: any` → `MarkdownIt`; inner `content.replace` callback uses `string` instead of `any`.
- `MdToHtml/rules/link_close.ts` — 3 removed, 0 left. `defaultRender: Renderer.RenderRule`; `markdownIt: any` → `MarkdownIt`; rule signature typed.
- `MdToHtml/rules/mermaid.ts` — 3 removed, 1 left. `theme: any` → `RendererTheme`; `markdownIt: any` → `MarkdownIt`; rule signature typed. Left: the `(self.renderToken as any)(tokens, idx, options, env, self)` cast in the fence-rule fallback — same pattern as `abc.ts` / `externalEmbed.ts`, passes extra args beyond the typed `renderToken` signature.
- `MdToHtml/rules/sanitize_html.ts` — 3 removed, 0 left. `markdownIt: any` → `MarkdownIt`; `state: any` → `StateCore`; `tokens: any[]` → `Token[]`.
- `MdToHtml/rules/link_open.ts` — 2 removed, 0 left. `markdownIt: any` → `MarkdownIt`; rule signature typed.
- `MdToHtml/rules/source_map.ts` — 2 removed, 0 left. `params: any` → `RuleOptions` (added `mapsToLine?: boolean` to `RuleOptions`); rule signature typed.

Verification: package `yarn tsc --noEmit` clean, `yarn linter-ci packages/renderer/` clean, root `yarn tsc --noEmit` clean.

Summary: 99 → 12 disable comments. The 12 remaining are all either documented skip cases (cache values, `as any` to pass extra args to typed `renderToken`, `output: any` that mutates `delete output.cssStrings`, `cacheCssToFile` return used loosely, `loadPlugin` accepting both functions and `{ default }` wrappers, the non-standard `highlight()` return shape, generic in-memory cache) or genuinely cannot be replaced without code-logic changes that are out of scope for this PR.

### packages/tools
Session date: 2026-05-11

Note: the starting count of **49** included 3 disables inside `packages/tools/node_modules/` (docusaurus and one in `node_modules/@docusaurus/utils`) which are vendored copies of third-party code and not in scope. In-scope was **46**; after this session, **1** in-scope and **3** vendored remain (total **4**).

Files processed:
- `postPreReleasesToForum.ts` — 1 removed, 0 left. `processedReleases: Record<string, any>` → `Record<string, boolean>` (the stored value is always `true`).
- `generate-images.ts` — 1 removed, 0 left. `output: any[]` → `(string | number | undefined)[]` (matches the heterogeneous values pushed from `Operation`).
- `generate-database-types.ts` — 5 removed, 0 left. Imported `Table` and `Column` from `@rmp135/sql-ts/dist/Typings`; `createRuntimeObject`/`generateListRenderDependencyType`/the two `.map()` callbacks all typed via those. The column-push uses `as Column` because adding the missing `ColumnDefinition` fields explicitly may change `sql-ts.fromObject()` output.
- `update-readme-contributors.ts` — 1 removed, 0 left. The `request` callback typed `(error: Error | null, response: { statusCode: number }, data: Contributor[])`.
- `release-clipper.ts` — 1 removed, 0 left. Introduced local `Manifest = Record<string, unknown> & { background?, browser_specific_settings? }`; `removeManifestKeys(manifest: Manifest): Manifest`.
- `update-readme-download.ts` — 1 removed, 0 left. `main(argv: any)` → `main(argv: string[])` (called as `main(process.argv)`).
- `setupNewRelease.ts` — 1 removed, 0 left. yargs `.argv` cast to `{ _: string[]; updateVersion?: string; updateDependenciesVersion?: string }` (rather than `yargs.Arguments<T>`, because `Arguments._` is `Array<string | number>` and `parse-numbers: false` guarantees strings at runtime — using the library type would require a `_[0] as string` cast at every call site).
- `tool-utils.ts` — 11 removed, 0 left. `saveGitHubUsernameCache(cache: any)` → `Record<string, string>`; `execCommand` options typed `{ cwd?; env?; maxBuffer? }` and its callback `(error: (Error & {signal?: string}) | null, stdout: string, stderr: string)`; `execCommandWithPipes` `error: Error`, `code: number | null`; `setPackagePrivateField(value: any)` → `boolean`; `downloadFile`'s `https.get` callback `response: import('http').IncomingMessage`, `error: Error`; `fileSha256` stream `data: Buffer` and `error: Error`; `fileExists` stat callback `error: NodeJS.ErrnoException | null`; `gitHubLatestRelease`/`gitHubLatestRelease_KeepInCaseMicrosoftBreaksTheApiAgain` `response: any` deleted (node-fetch's inferred `Response` works fine); `githubRelease(options: any)` → `{ isDraft?: boolean; isPreRelease?: boolean }`.
- `build-release-stats.ts` — 0 removed, 1 left. `createMarkdownTable` is typed `(headers, rows: MarkdownTableRow[])` where `MarkdownTableRow = Record<string, string>`. `Release` rows contain numeric counts (`windows_count`, etc.), so the cast `rows as any[]` masks a real type mismatch. Tightening would require widening `createMarkdownTable` in `@joplin/lib` (cross-package change). Updated reason.
- `licenses/licenseChecker.ts` — 1 removed, 0 left. `enforceString(line: any)` → `string | string[] | undefined | null` (matches the `Array.isArray(line) ? line.join(', ') : ...` branches).
- `website/updateNews.ts` — 1 removed, 0 left. Introduced local `RssFeedItem` interface (`rss` is untyped); `feedItems: RssFeedItem[]`.
- `website/processDocs.ts` — 3 removed, 0 left. `currentLinkAttrs?: any` → `[string, string][] | null`; imported `Token` from `markdown-it/lib/token` so `processToken(token: Token, …)`; `onopentag` `attrs: Record<string, any>` → `Record<string, string>` (matches `htmlentities(attrs[n])` usage and the local `attributesHtml` signature).
- `website/build.ts` — 1 removed, 0 left. `scriptsToImport: any[]` → `{ id: string; sourcePath: string; md5: string; filename: string }[]` (the entries are all commented out, but the shape is implied by the loop that follows).
- `website/utils/applyTranslations.ts` — 1 removed, 0 left. `onopentag` `attrs: any` → `Record<string, string>`.
- `website/utils/convertLinksToLocale.test.ts` — 1 removed, 0 left. `[string, any, string][]` → `[string, Partial<Locale>, string][]` with a `locale as Locale` cast at the call site (the test cases only supply `pathPrefix`, not the full `Locale` shape).
- `website/utils/frontMatter.ts` — 3 removed, 0 left. `yaml.load(...)` cast directly to `FrontMatter`; `formatFrontMatterValue(value: any)` → `FrontMatter[keyof FrontMatter]`; the `(header as any)[key] = …` assignment refactored to a separate `Record<string, string>` output map.
- `website/utils/frontMatter.test.ts` — 1 removed, 0 left. `testCases: any[][]` → `[string, FrontMatter, string, string][]`.
- `website/utils/render.ts` — 1 removed, 0 left. `state: any` → `StateCore` (imported from `markdown-it/lib/rules_core/state_core`).
- `utils/translation.ts` — 1 removed, 0 left. Introduced local `GettextTranslation` and `GettextParsed` interfaces capturing only the fields read (`gettext-parser` is `require`-d and has no types). `serializeTranslation`'s parameter in `build-translation.ts` was incorrectly typed as `string` — corrected to `Parameters<typeof parseTranslations>[0]`.
- `utils/discourse.ts` — 5 removed, 0 left. Introduced `DiscourseApiError extends Error { apiObject; status }`; `new Error(...) as DiscourseApiError` then setting `error.apiObject`/`error.status` directly. `response.json() as any` deleted — node-fetch's inferred return works fine for the downstream `.error.status === 404` reads. `createTopic`/`createPost`/`updatePost` body params → `Record<string, string | number>` (matches `execApi`).

Verification: package `yarn tsc --noEmit` clean, `yarn linter-ci packages/tools/` clean, root `yarn tsc --noEmit` clean.

Summary: 49 → 4 disable comments; in-scope 46 → 1 (3 are inside `node_modules/` vendored copies, not touched). The single in-scope remaining one is `build-release-stats.ts`, where fixing would require widening `createMarkdownTable`'s signature in `@joplin/lib`.

### packages/plugin-repo-cli
Session date: 2026-05-11

Shared work: imported `PluginManifest` from `@joplin/lib/services/plugins/utils/types` (plugin-repo-cli already depends on `@joplin/lib`). Most `manifest: any` and `manifests: any` parameters became `PluginManifest` and `Record<string, PluginManifest>`. The `*.test.ts` files in this package frequently use partial manifest fixtures, so a few `as unknown as PluginManifest` casts at call sites were needed to keep tests typing without bulking up every fixture with the full `manifest_version`/`name`/`app_min_version` set. Two helper functions were widened structurally (rather than via casts) where they only read a subset of fields: `gitCompareUrl` now takes `Pick<PluginManifest, 'repository_url' | '_publish_commit'>`, and `getObsoleteManifests` became a generic `<T extends { _obsolete?: boolean }>` so the existing-test fixtures still type-check.

Files processed:
- `index.ts` — 13 removed, 0 left. `extractPluginFilesFromPackage` typed `existingManifests: PluginManifests`, return `Promise<PluginManifest>`; `files.find((f: any) => …)` → `(f: string)` (since `fs.readdir` returns `string[]`); `commitMessage` parameters typed (`manifest: PluginManifest | null`, `previousManifest: PluginManifest | null`, `error: Error | null`); `readManifests`/`writeManifests` return/take `PluginManifests`; the four `let X: any = {}` locals in `processNpmPackage` typed; the yargs handlers refactored — `setSelectedCommand` and the three command handlers now share a `CommandArgs` type matching the `{ pluginRepoDir, dryRun }` shape both `commandBuild` and `commandUpdateRelease` expect (the previous `selectedCommandArgs = ''` declaration also implicitly drifted from string → object); `commands: Record<string, Function>` replaced with `Record<string, (args: CommandArgs)=> Promise<void>>`. The two `await readJsonFile(...)` callers in this file pass an explicit type parameter (`readJsonFile<PluginManifest>(...)`, `readJsonFile<{ version: string }>(...)`) since `readJsonFile` is now generic.
- `commands/updateRelease.ts` — 3 removed, 0 left. `(error: Error, assets: any)` → `assets: unknown` (return is not consumed by callers); `(resolve: Function, reject: Function)` ban-types disable replaced with explicit `(assets: unknown)=> void` / `(error: Error)=> void`; introduced local `PluginVersionStats` and `PluginStats` types and used them for `createStats`/`saveStats`.
- `lib/checkIfPluginCanBeAdded.ts` — 2 removed, 0 left. `caseInsensitiveFindManifest`/default-export both typed via `PluginManifests` and `PluginManifest`.
- `lib/overrideUtils.ts` — 3 removed, 0 left. `applyManifestOverrides(manifests: PluginManifests, …)`; the inner `manifest[propName] = propValue` write uses `as PluginManifest & Record<string, unknown>` because we mutate via a `for...of` over `Object.entries(override)` keys. `getObsoleteManifests` made generic over `<T extends { _obsolete?: boolean }>` so the existing test (which passes manifest-shaped fixtures rather than `ManifestOverride`-shaped ones) types correctly without rewriting its data.
- `lib/errorsHaveChanged.test.ts` — 1 removed, 0 left. `testCases: any[][]` → `[ImportErrors, ImportErrors, boolean][]`; dropped the `as any` cast in the destructuring loop.
- `lib/validateUntrustedManifest.ts` — 1 removed, 0 left. Parameters typed `manifest: PluginManifest`, `existingManifests: Record<string, PluginManifest>`.
- `lib/updateReadme.test.ts` — 1 removed, 0 left. `manifests: any` → `Record<string, PluginManifest>`.
- `lib/updateReadme.ts` — 2 removed, 0 left. Parameter `manifests: Record<string, PluginManifest>`; the `rows.push(manifests[pluginId])` line uses an `as unknown as MarkdownTableRow` cast (the existing code stores PluginManifest objects inside a `MarkdownTableRow[]` and `createMarkdownTable` is typed for `Record<string, string>` rows — the same impedance mismatch documented on `build-release-stats.ts` last session); the `rows.sort((a: any, b: any) => …)` callback's args type-infer from `MarkdownTableRow` directly.
- `lib/utils.ts` — 2 removed, 0 left. `readJsonFile` made generic `<T = unknown>(manifestPath, defaultValue: T = null): Promise<T>`; `isJoplinPluginPackage(pack: any)` → `{ keywords?: string[]; name: string }` (matches the two fields it reads).
- `lib/overrideUtils.test.ts` — 2 removed, 0 left. First test's `manifestOverrides: any` → `Record<string, { _obsolete?: boolean; description?: string; [key: string]: unknown }>` (matches the heterogeneous fixture). Second test's `manifests: any` → inferred from the literal.
- `lib/gitCompareUrl.ts` — 1 removed, 0 left. Widened to `Pick<PluginManifest, 'repository_url' | '_publish_commit'>` (matches the fields the function actually reads, so the test fixtures don't need to spell out the whole `PluginManifest`).
- `lib/checkIfPluginCanBeAdded.test.ts` — needed touching even though it had no disable comments: the test passes partial fixtures, so call sites cast via `as unknown as Parameters<typeof checkIfPluginCanBeAdded>[0/1]`. Same pattern in `lib/validateUntrustedManifest.test.ts` (`as unknown as PluginManifest`) and `lib/gitCompareUrl.test.ts` (where the tuple is typed `[GitCompareManifest, GitCompareManifest | null, string | null]`).

Verification: package `yarn tsc --noEmit` clean, `yarn linter-ci packages/plugin-repo-cli/` clean, root `yarn tsc --noEmit` clean, `yarn test` (in plugin-repo-cli) clean — all 13 tests pass.

Summary: 33 → 0 disable comments. Every one was tagged `Old code before rule was applied` and could be replaced with `PluginManifest`, `ImportErrors`, structural picks, or generics.

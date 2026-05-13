# `any` Cleanup Progress - details

## packages/pdf-viewer
Session date: 2026-05-11

Files processed:
- `messageService.ts` — 1 removed, 0 left. Replaced `data?: any` with `data?: Record<string, unknown>`.
- `Page.tsx` — 1 removed, 0 left. Replaced `let style: any` with `let style: CSSProperties` (imported from `react`).
- `PdfDocument.ts` — 3 removed, 0 left. Imported `PDFDocumentProxy` and `PDFPageProxy` from `pdfjs-dist`; typed `doc`, `pages` (as `Record<number, PDFPageProxy>`) and the local `pdfDocument`.

Verification: `yarn tsc --noEmit` clean, `yarn linter-ci packages/pdf-viewer/` clean.

## packages/react-native-saf-x
Session date: 2026-05-11

Files processed:
- `src/index.ts` — 1 removed, 0 left. Replaced `{} as any` with `{} as SafxInterface` (the interface declared in the same file).

Verification: `yarn tsc --noEmit` clean, `yarn linter-ci packages/react-native-saf-x/` clean.

## packages/default-plugins
Session date: 2026-05-11

Files processed:
- `build.ts` — 4 removed, 0 left. Imported `Argv` and `ArgumentsCamelCase` from `yargs`; typed builder callbacks as `(yargs: Argv) => ...` and handler args as `ArgumentsCamelCase<{ outputDir: string }>` / `ArgumentsCamelCase<{ plugin: string }>`.

Verification: `yarn tsc --noEmit` clean, `yarn linter-ci packages/default-plugins/` clean.

## packages/editor
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

## packages/utils
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

## packages/renderer
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

## packages/tools
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

## packages/plugin-repo-cli
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

## packages/app-mobile
Session date: 2026-05-12

Note: starting baseline was 131 comments across 37 files. The grep also matched build artifacts under packages/app-mobile (compiled `.js`/`.bundle.js.map`) which are gitignored; the source counts (`.ts`/`.tsx` only) match the 131/37 baseline exactly.

Files processed (partial — checkpoint):
- `utils/debounce.tsx` — 2 removed, 0 left. Replaced `(...args: any[])` with generic `<Args extends unknown[]>(...args: Args)=> void` so callers like `Note.tsx`'s `(event: EditorChangeEvent)=> void` still type-check.
- `utils/getVersionInfoText.ts` — 1 removed, 0 left. Replaced `(global as any).HermesInternal` with `(global as { HermesInternal?: unknown }).HermesInternal`.
- `components/screens/ConfigScreen/types.ts` — 1 removed, 0 left. `UpdateSettingValueCallback` value param `any` → `unknown` (callers don't read it as typed values).
- `components/base-screen.ts` — 1 removed, 0 left. `Record<number, any>` → `Record<number, ReturnType<typeof StyleSheet.create>>`.
- `utils/database-driver-react-native.ts` — 4 removed, 0 left. `react-native-sqlite-storage` ships no `.d.ts` and no `@types/...` is installed, so introduced local `SqliteDb`/`SqliteResultSet` interfaces covering the two methods used (`executeSql`, returning rows/insertId). The base `DatabaseDriver` interface uses `SelectResult = any`, so the narrower return type still satisfies it.
- `utils/buildStartupTasks.ts` — 1 removed, 0 left. `resourceFetcher_downloadComplete(event: any)` → `event: { id: string; encrypted: boolean }` (the shape emitted by `ResourceFetcher.eventEmitter_.emit('downloadComplete', ...)`).
- `index.web.ts` — 1 removed, 0 left. Removed the `Root as any` cast — `Root extends React.Component` and `AppRegistry.registerComponent`'s `ComponentProvider` is `() => React.ComponentType<any>`, which `() => Root` satisfies.
- `utils/fs-driver/fs-driver-rn.ts` — 7 removed, 2 left (down from 9).
  - Removed: `appendFile`/`writeFile` content param `any` → `string` (base class uses `string`); `rnfsStatToStd_` param `any` → local `RnfsStatLike` union of `StatResultT | ReadDirResItemT | DocumentFileDetail` with `in`-checks; `readDirStats` options `any` → `ReadDirStatsOptions` (with `stats: RnfsStatLike[]`); `close(handle: any)` → `unknown` (handle is ignored); `readFileChunk(handle: any)` → typed inline `{ path: string; offset: number; mode: string; stat: { size: number } | null }`; `tarExtract`/`tarCreate` options `any` → `Omit<Parameters<typeof tar*>[0], 'cwd'> & { cwd?: string }`.
  - Left: the inner `output: any[]` in `readDirStats` — entries can be either `DocumentFileDetail` (SAF) or the normalized `Stat`-shaped object from `rnfsStatToStd_`, the recursion helpers also accept this heterogeneous shape, so a single concrete type would force restructuring. Reason updated on the disable comment.
- `services/AlarmServiceDriver.android.ts` — 2 removed, 0 left. `@joplin/react-native-alarm-notification` ships no types, so introduced local `ScheduledAlarm { id: string; data?: { joplinNotificationId?: number } }` covering the two fields read.
- `services/AlarmServiceDriver.ios.ts` — 6 removed, 0 left. Imported `PushNotification`, `PushNotificationPermissions`, `ScheduleLocalNotificationDetails` from `@react-native-community/push-notification-ios`. Notes: `requestPermissions` options `{ alert: 1, badge: 1, sound: 1 }` → booleans (the typed interface declares them as `boolean?`; runtime accepts both, but the type is stricter). `hasPermissions` return tightened to `Promise<boolean>` and `perm.alert && perm.badge && perm.sound` wrapped in `!!()` since the fields are optional booleans. `scheduleNotification`'s `iosNotification` keeps `id: string` and a final `as ScheduleLocalNotificationDetails` cast because the library's typed `ScheduleLocalNotificationDetails` declares neither `id` nor `alertBody?` — but the runtime requires `id` (and `alertBody` may be omitted), so the cast preserves existing behavior.
- `root.tsx` — 4 removed, 5 left.
  - Removed: `generalMiddleware` inner `scheduleRefreshFolders((action: any) => storeDispatch(action), ...)` simplified to `scheduleRefreshFolders(storeDispatch, ...)`; `componentDidUpdate(prevProps: any)` and `UNSAFE_componentWillReceiveProps(newProps: any)` typed as `AppComponentProps` (this also forced adding the missing `syncStarted: boolean` field that `mapStateToProps` populates but the interface had not declared); the inner `(action: any) => this.props.dispatch(action)` simplified to `(action) => ...`.
  - Left: the three top-of-file `any`s on the middleware (`storeDispatch: any`, `logReducerAction(action: any)`, `generalMiddleware = (store: any) => (next: any) => async (action: any)`) require typing redux actions across many call sites — significant refactoring; `handleOpenURL_(event: any)` — `ShareExtension.shareURL` has a pre-existing typing inconsistency (declared `()=> string` but assigned both as a function and a string literal) so typing the event would expose that unrelated bug; one `await reduxSharedMiddleware(store, next, action, storeDispatch as any)` — kept as `any` cast since the upstream signature uses `Dispatch` and storeDispatch is already typed loosely. Reasons updated on the disable comments.

In progress — packages with files still containing disable comments (see grep summary): components/* (ExtendedWebView, NoteEditor, NoteList, ScreenHeader, SelectDateTimeDialog, app-nav, plugins/backgroundPage, screens/{ConfigScreen, LogScreen, Note}, side-menu-content), contentScripts/*, services/plugins/PlatformImplementation, utils/{appReducer, types}.

Second batch:
- `components/ExtendedWebView/types.ts` — 1 removed, 0 left. `OnMessageEvent.data: any` → `string` (consumers `JSON.parse` it). Required casting the `data` field in `index.jest.tsx`'s test mock to `as string` (the mock passes pre-stringify values), and forced a typing tweak elsewhere.
- `components/ExtendedWebView/index.tsx` — 2 removed, 0 left. `postMessage(message: any)` → `unknown` (it's JSON-stringified). `(props.style as any)` cast removed by switching to array-style `style={[{...inline...}, props.style]}`.
- `components/ExtendedWebView/index.jest.tsx` — 1 removed, 0 left. `additionalProps: any` → `Record<string, unknown>`; kept inline comment explaining the HACK.
- `components/screens/ConfigScreen/SettingsToggle.tsx` — 1 removed, 0 left. `value: any` → `boolean`.
- `components/NoteList.tsx` — 1 removed, 1 left. `dispatch: (action: any)=> void` → `Dispatch` (from redux). Left: `styles_: Record<string, StyleSheet.NamedStyles<any>>` — `NamedStyles<T>` requires `T` to be the same record being passed; tightening to `unknown` breaks property access. Reason updated.
- `components/app-nav.tsx` — 1 removed, 2 left. `dispatch` typed `Dispatch`; `screens` widened to `Record<string, { screen: ComponentType<any> }>` (typed wrapper, screens still have heterogeneous props). Left: `route: any` (NAV action with heterogeneous payload across NAV_GO/NAV_BACK/etc.) and the inner `ComponentType<any>` for screens. Reasons updated.
- `components/SelectDateTimeDialog.tsx` — 3 removed, 0 left. Replaced `PureComponent<any, any>` with `PureComponent<SelectDateTimeDialogProps, SelectDateTimeDialogState>` (local interfaces capturing `themeId`, `shown`, `date`, `onAccept`, `onReject` and state shape).
- `components/ScreenHeader/index.tsx` — 12 removed, 1 left. Added local `type ScreenHeaderStyles = ReturnType<typeof StyleSheet.create>` and replaced every inner button factory's `styles: any` parameter with it (12 occurrences). Left: `styleObject` builder uses `Record<string, any>` because it incrementally mixes `ViewStyle`, `TextStyle`, and `IconStyle` entries spread from theme.icon — splitting into typed sub-objects would force restructuring. Reason updated.
- `components/screens/ConfigScreen/SettingComponent.tsx` — 3 removed, 0 left. `value: any` → `unknown` (callers pass arbitrary setting values; the inner branches narrow before forwarding). `output: any = null` → `React.ReactElement | null = null`. `items as any` (for the Dropdown options from `enumOptionsToValueLabels`) → `items as unknown as DropdownListItem[]` because `enumOptionsToValueLabels` returns `{ [computedKey]: string }[]` where the runtime values happen to be `label`/`value` but the type system can't tell. Forwarding to `SettingsToggle`/`ValidatedIntegerInput`/`SettingTextInput` adds explicit narrowing (`!!props.value`, `props.value as number`, `props.value as string`) per Setting type.
- `components/screens/ConfigScreen/SectionSelector/index.tsx` — 1 removed, 0 left. `settings: Record<string, any>` → `Record<string, unknown>` (the local `SettingsMap` type isn't exported from `@joplin/lib/components/shared/config/config-shared`; the function accepts a wider record).
- `components/screens/LogScreen.tsx` — 2 removed, 1 left. `navigation: any` → `{ state: { defaultFilter?: string } }` (the only field accessed). `navigationOptions(): any` → `: { header: null }`. Left: `styles: any` builder — same heterogeneous-style-record pattern as `ScreenHeader.styleObject`. Reason updated.
- `components/screens/ConfigScreen/ConfigScreen.tsx` — touched (not yet processed for disable count, but `renderToggle`'s `value={value}` → `value={!!value}` to satisfy the narrowed `SettingsToggle.value: boolean`).

Verification at checkpoint: package `yarn tsc --noEmit` clean; `yarn linter-ci packages/app-mobile/` clean. Current state: 131 → 71 disable comments (60 removed).

Third batch (completing the package):
- `components/screens/ConfigScreen/ConfigScreen.tsx` — 12 removed, 4 left. `navigation: any` → `{ state?: { sectionName?: string } }`; `navigationOptions(): any` → `: { header: null }`; `onHeaderLayout`/`onSectionLayout`/inline `onLayout` events → `LayoutChangeEvent` (imported from `react-native`); `renderButton`/`addSettingButton` options → `{ description?: string; statusComp?: ReactElement; disabled?: boolean }`; `handleSetting`/`settingToComponent`/inner `updateSettingValue` `value: any` → `unknown`; `renderFeatureFlags`'s `output: any[]` → `ReactElement[]`. Left: `settings: Record<string, any>` on both state and props (and the parameters that take settings) — heterogeneous values (string/number/boolean/object) accessed by string key across many call sites; `unknown` forces casts at every read. Reason updated.
- `components/screens/Note/Note.tsx` — 13 removed, 4 left. `emptyArray: any[]` → `never[]`; `lastSavedNote: any` → `NoteEntity | null`; `styles_: any` → `Record<string, ReturnType<typeof StyleSheet.create>>`; `noteTagDialog_closeRequested: any` → `()=> void`; `refreshResource(resource: any)` → `ResourceEntity`; `focusUpdateIID_: any` → `ReturnType<typeof setTimeout> | null`; `folderPickerOptions_: any` → `FolderPickerOptions` (imported from `../../ScreenHeader`); `navigationOptions(): any` → `: { header: null }`; `setState((state: any))` → inferred; `onMarkForDownload(event: any)` → `{ resourceId: string }`; `onPlainEditorSelectionChange(event: NativeSyntheticEvent<any>)` → `NativeSyntheticEvent<{ selection: SelectionRange }>`; `saveOneProperty(value: any)` → `unknown`. Left: `editorRef: any` (union of Markdown/RichText/NoteBody viewers, each with different command surfaces); `menuOptionsCache_: Record<string, any>` (heterogeneous command/option entries); `dialogbox: any` (react-native-dialogbox ref, no library types); `styles: any` builder (heterogeneous view/text/icon style entries). Reasons updated.
- `components/side-menu-content.tsx` — 1 removed, 1 left. `menuItems: any[]` → `PromptButtonSpec[]` (imported from `./DialogManager/types`). Left: `syncReport: any` — matches `state.syncReport: any` in `@joplin/lib/reducer` and `Synchronizer.reportToLines(report: any)`; tightening here would require updating the lib types first. Reason updated.
- `components/NoteEditor/NoteEditor.tsx` — 1 removed, 0 left. `execCommand(command, ...args: any[])` → `unknown[]`.
- `components/NoteEditor/hooks/useEditorCommandHandler.ts` — 1 removed, 0 left. `(...args: any[])` → `unknown[]`; the `args[0]?.name` / `args[0]?.args` reads cast through `{ name?: string; args?: unknown[] }`.
- `services/plugins/PlatformImplementation.ts` — 2 removed, 1 left. `Components.[key: string]: any` → `unknown`; `registerComponent(component: any)` → `unknown`. Left: `get nativeImage(): any` — matches `BasePlatformImplementation.nativeImage: any`. Reason updated.
- `components/plugins/backgroundPage/initializePluginBackgroundIframe.ts` — 1 removed, 0 left. `(window as any).joplin = ...` → `(window as Window & { joplin?: unknown }).joplin = ...`.
- `components/plugins/backgroundPage/utils/wrapConsoleLog.ts` — 2 removed, 1 left. `originalLog as any` → `as ((...args: unknown[])=> void) | undefined`; outer wrapper signature `(...args: any[])` → `unknown[]`. Left: the `} as any;` cast at end of `wrapLogFunction` — assigning a generic `(...args: unknown[])=> void` to a specific console method requires going through `any` because TypeScript treats `console[key]`'s type as the intersection of all method signatures. Reason updated.
- `components/NoteEditor/ImageEditor/ImageEditor.tsx` — 1 removed, 0 left. `onError(event: any)` → `WebViewErrorEvent` (imported from `react-native-webview/lib/WebViewTypes`).
- `contentScripts/markdownEditorBundle/utils/useCodeMirrorPlugins.ts` — 1 removed, 0 left. `postMessageHandler(message: any): Promise<any>` → `unknown` / `Promise<unknown>` (matches `ContentScriptData.postMessageHandler: (message: unknown)=> unknown` in `@joplin/editor/types`).
- `contentScripts/rendererBundle/useWebViewSetup.ts` — 1 removed, 0 left. `pluginOptions: any` → `PluginOptions` (imported from `@joplin/renderer/MarkupToHtml`); inner `enabled: subValues[n]` → `enabled: !!subValues[n]` (PluginOptions expects boolean).
- `contentScripts/rendererBundle/contentScript/Renderer.test.ts` — 1 removed, 0 left. `pluginSettings: Record<string, any>` → `Record<string, unknown>`.
- `contentScripts/imageEditorBundle/contentScript/index.test.ts` — 1 removed, 0 left. `window.ResizeObserver = class { ... } as any` — added the missing `unobserve()` and `disconnect()` methods so the class satisfies the `ResizeObserver` interface without a cast.
- `root.tsx` — 0 removed, 6 left (reasons updated). `storeDispatch: any` / `logReducerAction(action: any)` / `generalMiddleware = (store: any) => (next: any) => async (action: any)` / `reduxSharedMiddleware(...storeDispatch as any)` / `handleOpenURL_: any` — all kept as `any` because redux actions in this codebase don't have a single typed union; tightening would require a coordinated rewrite of every dispatched action across the mobile app. Reasons updated on every disable comment.
- `utils/appReducer.ts` — 0 removed, 8 left (reasons updated). The 3 `Old code before rule was applied` entries got their reason rewritten; the 5 `Assigning types... would be too big of a refactoring` entries were already correctly tagged.
- `utils/types.ts` — 0 removed, 2 left (reasons updated). `AppState.route` and `AppState.noteSideMenuOptions` — same redux NAV / per-screen heterogeneous-payload story as appReducer.
- `utils/fs-driver/fs-driver-rn.ts` — 0 removed, 1 left (reason already documented in the first batch).
- `components/app-nav.tsx` — 0 removed, 2 left (reasons documented in the second batch).
- `components/NoteList.tsx` — 0 removed, 1 left (`StyleSheet.NamedStyles<any>` — reason documented in the second batch).
- `components/ScreenHeader/index.tsx` — 0 removed, 1 left (heterogeneous `styleObject` builder — reason documented in the second batch).
- `components/screens/LogScreen.tsx` — 0 removed, 1 left (heterogeneous `styles` builder — reason documented in the second batch).

Verification: package `yarn tsc --noEmit` clean; `yarn linter-ci packages/app-mobile/` clean; root `yarn tsc --noEmit` (all workspaces) clean.

Summary: 131 → 33 disable comments (98 removed). The 33 remaining all fall into a small set of "structural" categories:
- Redux action/route shapes across `root.tsx` (6), `appReducer.ts` (8), `utils/types.ts` (2), `app-nav.tsx` (2) — total 18. Tightening requires a discriminated action union across the mobile codebase.
- Heterogeneous style-builder objects in `ScreenHeader/index.tsx` (1), `LogScreen.tsx` (1), `Note.tsx` (1) — total 3. Each mixes ViewStyle/TextStyle/IconStyle entries built incrementally.
- Heterogeneous redux state fields tied to lib's loose typing: `syncReport: any` in `side-menu-content.tsx` (1); `nativeImage: any` in `PlatformImplementation.ts` (1) — total 2. Tightening requires updating the lib base types first.
- Per-screen ConfigScreen settings: `settings: Record<string, any>` in `ConfigScreen.tsx` (4 occurrences: state, props, `sectionToComponent`, `renderFeatureFlags`) — total 4. Tightening to `unknown` forces casts at every `settings[key]` read across the file.
- Per-component fields that the library doesn't type: `editorRef`/`dialogbox`/`menuOptionsCache_`/`styles` builder in `Note.tsx` (4) — total 4.
- `NamedStyles<any>` in `NoteList.tsx` (1) — TypeScript pattern limitation.
- `console[key] = ... as any` in `wrapConsoleLog.ts` (1) — TypeScript pattern limitation (intersection of console method signatures).
- `output: any[]` in `fs-driver-rn.ts` (1) — `readDirStats` output mixes SAF `DocumentFileDetail` and normalized `Stat`-shaped entries.

## packages/server
Session date: 2026-05-12

Starting baseline 2026-05-12 matches the progress doc: 227 disable comments across 67 files, all tagged `Old code before rule was applied`.

General observation (different from prior packages): many of the server's `any`s sit at junction points (Koa context, Knex query callbacks, view contents, error payloads) where tightening propagates through many call sites. So this package will have a much lower remove-rate than the front-end packages.

First batch:
- `utils/strings.ts` — 1 removed, 0 left. `yesOrNo(value: any)` → `unknown`.
- `utils/array.ts` — 1 removed, 1 left. `removeElement` typed generically as `<T>(array: T[], element: T)`. Left: `unique(array: any[])` — tried generic `<T>`, but `BaseModel.loadByIds` calls it with `string[] | number[]` and TS can't unify `T` across the union, forcing a cast at the call site (a wider blast radius). Reason updated.
- `utils/cache.ts` — 4 removed, 0 left. `CacheEntry.object: any` → `string` (always JSON-stringified); `setAny/setObject` `o: any` → `unknown`; `getAny` return `Promise<any>` → `Promise<unknown>` (existing `as object` cast at the one public consumer remains valid).
- `utils/errors.ts` — 3 removed, 0 left. `ErrorOptions.details?: any` → `unknown`; `ApiError.details: any` → `unknown`; `errorToPlainObject(error: any)` → `unknown` with `'httpCode' in error` narrowing followed by `(error as { httpCode?: number }).httpCode` casts on each field read (TS's `in` operator doesn't narrow `unknown` to a typed shape, only to `object`).
- `services/MustacheService.ts` — 1 removed, 1 left. The local `layoutView: any` in `renderView` → `Record<string, unknown>`. Left: `View.content?: any` — tried tightening to `Record<string, unknown>`, but `routeHandler.ts:61` reads `view.content.error.httpCode` and other dynamic paths; views contribute heterogeneous content shapes per route. Reason updated.

Files attempted but reverted (still `any`):
- `commands/BaseCommand.ts` — `run(argv: any)`. Tried `yargs.Arguments`, but subclasses (e.g. `CompressOldChangesCommand`, `StorageCommand`) narrow `argv` to a per-command `Argv` interface, and TS function-parameter contravariance forbids that without making the whole class generic — which would propagate through every `BaseCommand[]` consumer. Reason updated.
- `utils/urlUtils.ts` — `setQueryParameters(query: any)`. Callers pass Koa `ParsedUrlQuery` (`Record<string, string | string[]>`), pagination shapes with numbers, and plain string records. Tightening forces fixes at every call site. Reason updated.
- `config.ts` — `initConfig(overrides: any)`. Tried `Partial<Config>`, but `Config.resourceDir: string` is required and only set by some test overrides; the existing spread relies on `any` to bypass the missing-field issue. Reason updated.

Verification at checkpoint: package `yarn tsc --noEmit` clean. 227 → 217 disable comments (10 removed).

Second batch:
- `models/KeyValueModel.ts` — 3 removed, 0 left. The two `as any` casts in `value<T>` use the existing type parameter (`as T`). The local `value: any` in `readThenWrite` becomes `await this.value<Value>(key)` — the explicit type param uses the public `Value = number | string` already defined in the file.
- `models/BackupItemModel.ts` — 1 removed, 0 left. `add(content: any)` → `string | Buffer` (the only runtime caller passes a JSON string; the storage type is `Buffer`). Inner assignment uses `content as Buffer`.
- `models/UserItemModel.ts` — 1 removed, 0 left. Dropped `as any` on `loadByIds(options.byUserItemIds as any)` — `byUserItemIds` is already typed `number[]` and `loadByIds` accepts `string[] | number[]`.
- `models/UserDeletionModel.ts` — 0 removed, 1 left. `end(error: any)`: tried `Error`, but tests pass plain strings. Tried `Error | string`, but `errorToString` requires `Error`; wrapping strings in `new Error()` changes runtime output (adds a `stack` field to the serialized payload). Reason updated.
- `models/utils/pagination.ts` — 4 removed, 0 left. `requestPaginationOrder(query: any)` → `ParsedUrlQuery | PaginationQueryParams` with `as string` / `as PaginationOrderDir` narrowing on the read fields; `requestPagination(query: any)` → `(Pagination & PaginationQueryParams) | null`; `filterPaginationQueryParams(query: any)` → `PaginationQueryParams | null`; `paginateDbQuery` made generic over `<T = unknown>` for `PaginatedResults<T>` and the local `orderSql: any[]` inferred from `.map`.
- `utils/views/table.ts` — 2 removed, 0 left. `Table.requestQuery?: any` → `PaginationQueryParams`; `makeTablePagination(query: any)` → `ParsedUrlQuery` (imported from `querystring`).
- `utils/views/select.ts` — 0 removed, 2 left. Tried `Record<string, unknown>`, but callers pass concrete entity types like `User` (no index signature). Reason updated.
- `models/ChangeModel/ChangeModel.ts` — 1 removed, 0 left. `requestDeltaPagination(query: any)` → `ChangePagination | null`.
- `models/ShareModel.ts` — 2 removed, 0 left. `shareUrl(query: any)` → `Record<string, string | number>`; `itemCountByShareIdPerUser`'s `groupBy('user_id') as any` → `as unknown as { item_count: number; user_id: Uuid }[]` (Knex's typed builder doesn't carry the aggregate column shape through `db.raw`).
- `utils/testing/koa/FakeRequest.ts` — 2 removed, 0 left. Introduced local `FakeNodeRequest { method?: string }` (the only field used).
- `utils/testing/koa/FakeResponse.ts` — 4 removed, 0 left. `body: any` → `unknown`; `headers_: any` → `Record<string, string>`; `set`/`get` params/return → `string`.
- `utils/testing/fileApiUtils.ts` — 2 removed, 0 left. `getDelta` return type and inner cast `PaginatedResults<any>` → `PaginatedResults<unknown>`.
- `models/items/storage/testUtils.ts` — 1 removed, 0 left. `let error: any = null` → `Error & { code?: CustomErrorCode }`.

Verification at checkpoint: package `yarn tsc --noEmit` clean. 227 → 193 disable comments (34 removed).

Third batch:
- `utils/prettycron.ts` — 17 removed, 0 left. All `numbers: any[]` → `number[]`; `numberToDateName(value: any, type: any)` → `(value: number | string, type: 'dow' | 'mon')` (the function does `value - 1`, so wrapping in `Number()`); `dateList(numbers: any[], type: any)` → `(numbers: number[], type: 'dow' | 'mon')`; introduced local `type LaterSchedule = Record<string, number[]>` and used it for `removeFromSchedule`, `scheduleToSentence`; `removeFromSchedule(schedule, member: any, length: any)` → `(LaterSchedule, string, number)`; the four `cronspec: any`/`numDates: any` handlers typed as `string` / `number`; the final `(window as any).prettyCron` cast tightened to `(window as Window & { prettyCron?: Record<string, unknown> }).prettyCron`.
- `utils/routeUtils.test.ts` — 4 removed, 0 left. Three `testCases: any[]` typed as tuple arrays (`[string, string, string, ItemAddressingType][]`, `[string, {...}][]`, `[string, string[]][]`). `routes: Record<string, any>` typed `Record<string, number>` with three `as unknown as Parameters<typeof findMatchingRoute>[1]` casts at call sites (the test injects numbers in place of `Router` instances).
- `routes/api/sessions.test.ts` — 8 removed, 0 left. Eight `(context.response.body as any).id` casts → `as { id: string }`.
- `routes/api/items.test.ts` — 4 removed, 0 left. `tree: any` → `Record<string, Record<string, null>>`; `PaginatedResults<any>` (×2) → `<unknown>`; `result.items as any` → `as unknown as SaveFromRawContentResult`.
- `routes/api/shares.test.ts` — 3 removed, 0 left. `tree: any` → `Record<string, Record<string, null>>`; both `PaginatedResults<any>` → `<Share>` and `<{ user: { email: string }; status: ShareUserStatus }>` (the test only reads those fields).
- `routes/index/users.test.ts` — 3 removed, 0 left. `postUser(props: any)` → `Partial<User>`; `patchUser(user: any)` → `Partial<User> & Record<string, unknown>`; `as any).value` on a `querySelector` → `querySelector<HTMLInputElement>('input[name=email]').value`.
- `routes/admin/users.test.ts` — 2 removed, 0 left. `postUser(props: any)` / `patchUser(user: any)` typed `Record<string, unknown>` (tests intentionally pass `max_item_size: ''` which `Partial<User>` would reject).
- `routes/index/stripe.test.ts` — 2 removed, 0 left. `WebhookOptions.stripe?: any` → `ReturnType<typeof mockStripe>`; `simulateWebhook(object: any)` → `Record<string, unknown>`.
- `routes/index/shares.link.test.ts` — 2 removed, 0 left. `getShareContent(query: any)` → `Record<string, string>`; the inner `as any` return cast → `as string | Buffer`.
- `routes/api/share_users.ts` — 2 removed, 0 left. `bodyFields<any>` → `bodyFields<{ status?: number }>`; `items: any[]` → `Record<string, unknown>[]`.
- `routes/api/share_users.test.ts` — 1 removed, 0 left. `PaginatedResults<any>` → `<{ share: { id: string } }>`.

Verification at checkpoint: package `yarn tsc --noEmit` clean; spellcheck clean. 227 → 145 disable comments (82 removed).

Fourth batch:
- `routes/api/batch.ts` — 3 removed, 0 left. `SubRequest.body: any` / `SubRequestResponse.body: any` → `unknown`; `SubRequestResponse.header: Record<string, any>` → `Record<string, unknown>`.
- `routes/api/batch_items.ts` — 2 removed, 0 left. `PaginatedResults<any>` → `<unknown>`; the inner `as any` cast → `as unknown as unknown[]`.
- `models/UserModel.test.ts` — 3 removed, 0 left. The three `syncInfo*: any` test fixtures share a single inline object-shape type with optional `ppk` (the third variant deletes it).
- `routes/index/login.ts` — 1 removed, 0 left. `makeView(error: any)` → `Error | null`.
- `routes/index/home.test.ts` — 1 removed, 0 left. `context.response.body as any` → `as string`.
- `routes/index/items.test.ts` — 1 removed, 0 left. `items: any` → `Record<string, Record<string, never>>`.
- `models/items/storage/StorageDriverS3.ts` — 2 removed, 0 left. Introduced local `ReadableLike` interface (only the 3 listener overloads used) so `stream2buffer` is typed; the S3 SDK return is an opaque union, so cast at the call site: `stream2buffer(response.Body as ReadableLike)`.
- `models/items/storage/StorageDriverS3.test.ts` — 1 removed, 0 left. `parse: any` → `StorageDriverConfig & { enabled?: boolean }`.
- `routes/api/users.ts` — 1 removed, 0 left. `bodyFields<any>` → `bodyFields<Partial<User>>` (`fromApiInput` accepts a partial user).
- `routes/api/users.test.ts` — 1 removed, 0 left. `results: any` → `getApi<{ items: User[] }>`.
- `routes/api/ping.test.ts` — 1 removed, 0 left. `body as any` → `as { status: string; message: string }`.
- `models/LockModel.test.ts` — 2 removed, 0 left. `'wrongtype' as any` → `as unknown as LockType` (and the same for `LockClientType`).
- `db.migrations.test.ts` — 2 removed, 0 left. `dbSchemaSnapshot` return → `Awaited<ReturnType<typeof sqlts.toTypeScript>>`; the `db as any` cast → `as unknown as Parameters<typeof sqlts.toTypeScript>[1]`.
- `utils/testing/testUtils.ts` — 4 removed, 3 left. `createItemTree(tree: any)` → `Record<string, unknown>`; `createItemTree3(tree: any[])` → local `ItemTree3Node` interface; `checkContextError`'s `body: any` → cast through `as { code?: ErrorCode }`; `setupAppContext({} as any, ...)` → `as unknown as AppContext`. Left: `AppContextTestOptions.request: any` (`httpMocks.RequestOptions` is too narrow; callers pass `files: { file: { path: string } }` and free-form bodies); `appContext: any` inside `koaAppContext` (intentionally mocks only a subset of `AppContext`, cast at return); the `createBaseAppContext` one was removed. Reasons updated on the two remaining ones.
- `utils/requestUtils.ts` — 2 removed, 7 left. Two safe removals: the outer `IncomingMessage` cast in `formParse` uses `as unknown as FormParseRequest`; the `bodyFields`/`bodyFiles` `req: any` typed `IncomingMessage`. The other entries (`BodyFields`, `FormParseResult.files`, `FormParseRequest.body`, `convertFieldsToKeyValue` return) were attempted but reverted — `Record<string, unknown>` breaks `Fields`/`Files` compatibility (formidable's `File | File[]` union surfaces `.filepath` access errors), and `BodyFields` widening propagates to every route handler that reads `body.fields.email` etc. without narrowing. Reasons updated on the remaining ones.
- `utils/routeUtils.ts` — 5 removed, 1 left. `Response.response: any` / `constructor(response: any)` → `unknown`; `internalRedirect(...args: any[])` → `unknown[]`; `ExecRequestResult.response: any` → `unknown`; `respondWithItemContent(koaResponse: any)` → local `KoaResponseLike` interface with just `body` and `set()`. Left: `RouteHandler`'s `...args: any[], Promise<any>` — concrete handlers (login, mfa, users) narrow `args` to per-route field types; tightening propagates through every route. Reason updated. (Plus a downstream cast `responseObject.response as typeof ctx.response` in `routeHandler.ts:56` for the now-`unknown` response.)
- `models/ChangeModel/ChangeModel.test.ts` — 1 removed, 0 left. `itemsToCreate: any[]` → `{ id: string; children: never[] }[]`.
- `models/ChangeModel/ChangeModel.old.ts` — 1 removed, 0 left. `Knex.Raw<any>` → `Knex.Raw<unknown>`.
- `routes/api/items.ts` — 1 removed, 0 left. `bodyFields.items.map((item: any))` → `(item: { name: string; body?: string })`.
- `tools/generateTypes.ts` — 1 removed, 0 left. `'pascal' as any` → `as Config['tableNameCasing']`.
- `models/utils/pagination.test.ts` — 2 removed, 0 left. `testCases: any` → `[Record<string, unknown> | null, Pagination][]`; the inline `input: any` removed by inferring from the tuple. Inner literal `dir: 'asc'` switched to `PaginationOrderDir.ASC`.

Verification at checkpoint: package `yarn tsc --noEmit` clean; spellcheck clean. 227 → 102 disable comments (125 removed).

Fifth batch:
- `utils/joplinUtils.ts` — 11 removed, 1 left. Tightened `FileViewerResponse.body`/`ResourceInfo`/`LinkedItemInfo` to concrete shapes (`Buffer | string`, `NoteEntity` etc.); `unserializeJoplinItem` / `serializeJoplinItem` typed against `NoteEntity`; `getResourceInfos` output uses the named `ResourceInfos` alias; `jopItem` and `itemToRender` use `NoteEntity & { ...optional fields }`; `FileToRender.content` → `Buffer | null` (the `null as any` cast is no longer needed). Left: the `renderOptions: any` for `markupToHtml.render` — `@joplin/renderer`'s `RenderOptions` is loosely typed in that package; tightening would require updating renderer first.
- `db.ts` — 14 removed, 0 left. `ConnectionCheckResult.error/latestMigration: any` → `Error | null` and `{ name: string } | null`; the slow-query handler `connection: any, bindings: any[]` → `DbConnection` and `unknown[]`; the inner `queryInfos: Record<any, QueryInfo>` and `timeoutId: any` → `Record<string, QueryInfo>` and `ReturnType<typeof setTimeout>`; `filterBindings(bindings: any[]): Record<string, any>` → `unknown[]` / `Record<string, unknown>`; `KnexQueryErrorData.bindings: any[]` → `unknown[]`; `migrateList`'s `migrations: any` typed as the actual `[string | { file } | { name | file }][]` tuple via a `MigrationInfo` alias; `isNoSuchTableError`/`isUniqueConstraintError` `error: any` → `{ code?: string; message?: string } | null | undefined`. The `pg` `setTypeParser` callback's `val: any` → `string`.
- `utils/testing/apiUtils.ts` — 11 removed, 0 left. All the `body: Record<string, any>` parameters (×9 functions) → `body: object` (entity types like `User`, `FormUser` don't have an index signature, so `Record<string, unknown>` rejects them — `object` accepts both concrete entities and plain records). The `query: Record<string, any>` → `Record<string, unknown>` (callers always pass plain objects).

Verification at checkpoint: package `yarn tsc --noEmit` clean; lint clean. 227 → 67 disable comments (160 removed).

Sixth batch:
- `models/ItemModel.ts` — 4 removed, 3 left. `SaveFromRawContentResultItem.error` → union of `Error & { httpCode?: number; code?: string }` / `PlainObjectError` / `null` (callers read `.httpCode` on it; `errorToPlainObject` is also assigned to it). `objectToApiOutput` inner `as any[k]` casts → `(output as Record<string, unknown>)[k]`. `allForDebug` typed `(Omit<Item, 'content'> & { content?: string | Buffer })[]` and now spreads instead of mutating. Left: `itemToJoplinItem(): any` (heterogeneous Note/Folder/Resource/Tag return); the matching `joplinItem?: any` field; the inner `joplinItem: any` local. Reasons updated.
- `models/BaseModel.ts` — 7 removed, 0 left. `SaveOptions.validationRules`/`previousItem`, `DeleteOptions.validationRules`, `ValidateOptions.rules` → `Record<string, unknown>`. `all()` `rows: any[]` cast → `as T[]` only. `fromApiInput` local `output: any` → `Record<string, unknown>` with `as Record<string, unknown>` on the input spread and `as T` on the return. `isNew`'s `'id' in (object as any)` → `typeof object === 'object' && object && 'id' in object` narrowing.
- `app.ts` — 7 removed, 0 left. `defaultEnvVariables: Record<Env, any>` → `Record<Env, Partial<EnvVariables>>`. `markPasswords(o: Record<string, any>)` → `object` parameter (concrete entity types like `DatabaseConfig` lack index signatures) with an internal cast to `Record<string, unknown>` for iteration. `getEnvFilePath(argv: any)` → `{ envFile?: string }`. `argv: Argv = yargsArgv as any` → `as unknown as Argv`. The `commandArgv._` cast → `as Argv & { _: string[] }`. `main().catch((error: any))` → `(error: Error)`.
- `utils/testing/testRouters.ts` — 3 removed, 2 left. `exec` callback `error/stdout/stderr: any` → `(Error & { signal?: string }) | null` / `string` / `string`. `serverProcess: any` → `ReturnType<typeof spawn>`. `checkAndPrintResult(result: any)` → `unknown` with `in` narrowing. Left: `curl` return type (it parses heterogeneous JSON responses that callers read without narrowing) and the `response: any` in `main()` (same reason). Reasons updated.
- `utils/testing/shareApiUtils.ts` — 5 removed, 0 left. Introduced local `LegacyTreeNode` and `ShareTreeNode` interfaces (with `[key: string]: unknown` on `ShareTreeNode` so test fixtures can include arbitrary fields like `title`). `convertTree(tree: any)` / `createItemTree3(tree: any[])` / `shareFolderWithUser(itemTree: any)` use those types.
- `routes/admin/users.ts` — 5 removed, 0 left. `boolOrDefaultToValue`/`intOrDefaultToValue`/`makeUser` `fields: any` → `Record<string, unknown>`. The field reads in `makeUser` cast via `as string` / `as number` per User shape. `error: any` on `admin/users/:id` route handler → `Error | null`. `accountTypeOptions().map((o: any))` → `(o: { value: number; selected?: boolean })`. The `formParse().fields` is cast `as unknown as Record<string, unknown> & { id?: Uuid }` at the makeUser call.

Verification at checkpoint: package `yarn tsc --noEmit` clean; lint clean. 227 → 36 disable comments (191 removed).

Final batch:
- `routes/index/stripe.ts` — 4 removed, 0 left. `stripeEvent(req: any)` → `IncomingMessage`; `StripeRouteHandler` return → `Promise<unknown>`; the two `(postHandlers as any)[path.id]` casts collapsed into a single typed lookup.
- `env.ts` — 4 removed, 0 left. `parseEnv(defaultOverrides: any)` → `Partial<EnvVariables>`. The three `(output as any)[key]` writes go through a single `outputAsRecord = output as unknown as Record<string, unknown>` alias.
- `routes/index/users.ts` — 3 removed, 0 left. `makeUser(fields: any)` → `Record<string, unknown>` with `as string` narrowing on field reads; `error: any` on `users/:id` GET → `Error | null`; `accountTypeOptions().map((o: any))` → `(o: { value: number; selected?: boolean })`.
- `models/UserModel.ts` — 2 removed, 1 left. `(resource as any)[key]` / `(previousResource as any)[key]` → `as Record<string, unknown>`. `syncInfo(): Promise<any>` → `Promise<{ ppk?: { value: PublicPrivateKeyPair } }>`. Left: `checkMaxItemSizeLimit(joplinItem: any)` — same heterogeneous itemToJoplinItem return as ItemModel.
- `middleware/routeHandler.ts` — 1 removed, 0 left. `const r: any = { error }` → typed `{ error: string; stack?: string; code?: string }`.

Verification: package `yarn tsc --noEmit` clean; `yarn linter-ci packages/server/src/` clean; root `yarn tsc --noEmit` (all workspaces) clean.

Summary: 227 → 22 disable comments (205 removed). Zero remaining `Old code before rule was applied` disables — all 22 left have descriptive reasons explaining why they can't be tightened. They fall into these categories:
- **Heterogeneous redux/Koa shapes** (5): `BaseCommand.run(argv: any)` (per-command Argv narrowing forbids the base type from being typed without making the class generic); `routeUtils.RouteHandler` (per-route argument types); `joplinUtils.renderOptions` (renderer package's RenderOptions is loose); `MustacheService.View.content` (each view contributes different fields); `testUtils.appContext` (Koa mock only provides a subset).
- **Heterogeneous Joplin item types** (3): `ItemModel.itemToJoplinItem` plus the two `joplinItem: any` locals it feeds; `UserModel.checkMaxItemSizeLimit.joplinItem`.
- **Heterogeneous error shapes** (1): `UserDeletionModel.end(error: any)` — tests pass strings while runtime callers pass Errors.
- **Concrete entity types without index signatures** (3): `urlUtils.setQueryParameters(query: any)`; `select.ts` `yesNoOptions`/`yesNoDefaultOptions`; `app.ts` config initConfig overrides.
- **Loose lib-typed defaults** (1): `config.ts` `initConfig(overrides: any)` — `Partial<Config>` requires `resourceDir`.
- **Heterogeneous test fixtures / API call results** (3): `testRouters.curl` and `response` in `main` (parsed JSON responses); `array.ts` `unique` (TS can't unify `T` across `string[] | number[]`).
- **TypeScript pattern limitations** (6): `testUtils.AppContextTestOptions.request`; the 4 in `requestUtils.ts` (`BodyFields`, `FormParseResult.files`, `FormParseRequest.body`, `convertFieldsToKeyValue` — all centered on formidable's `Fields | Files` union not allowing narrowing).
## packages/app-cli
Session date: 2026-05-13

Files processed:
- `app/command-cp.ts` — 1 removed, 0 left. Typed `action({ note, notebook? })`.
- `app/command-mv.ts` — 1 removed, 0 left. Typed `action({ item, notebook })`.
- `app/command-ren.ts` — 1 removed, 0 left. Typed `action({ item, name })`.
- `app/command-rmbook.ts` — 1 removed, 0 left. Typed `action({ notebook, options? })`.
- `app/command-rmnote.ts` — 1 removed, 0 left. Typed `action({ 'note-pattern', options? })`.
- `app/command-restore.ts` — 1 removed, 0 left. Typed `action({ pattern })`.
- `app/command-edit.ts` — 1 removed, 0 left. Typed `action({ note })`.
- `app/command-import.ts` — 1 removed, 0 left. Typed `action({ path, notebook?, options })`; outputFormat assignment now requires `as ImportModuleOutputFormat`.
- `app/command-mkbook.ts` — 1 removed, 0 left. Typed `action({ 'new-notebook', options })`.
- `app/command-help.ts` — 1 removed, 0 left. Typed `action({ command? })`.
- `app/command-use.ts` — 1 removed, 0 left. Typed `action({ notebook })`.
- `app/command-attach.ts` — 1 removed, 0 left. Typed `action({ note, file })`.
- `app/command-cat.ts` — 1 removed, 0 left. Typed `action({ note, options })`.
- `app/command-geoloc.ts` — 1 removed, 0 left. Typed `action({ note })`.
- `app/command-apidoc.ts` — 1 removed, 0 left. Typed `action({ file })`.
- `app/command-done.ts` — 2 removed, 0 left. Typed `handleAction(args: { note })` and `action(args: { note })`.
- `app/command-set.ts` — 2 removed, 0 left. Typed `action(args: { note, name, value? })`; `newNote: any` → `Record<string, unknown>` (still accepted by `Note.save`).
- `app/command-ls.ts` — 1 removed, 1 left. Typed `action` args; left `queryOptions: any` because it is fed to both `Folder.all` (FolderLoadOptions) and `Note.previews` (PreviewsOptions) and the union has fields that neither type carries (`caseInsensitive`, `orderBy`). Comment reason updated.
- `app/setupCommand.ts` — 2 removed, 0 left. Typed `cmd: BaseCommand`, introduced local `PromptOptions`; the dispatcher arg is inferred from `BaseCommand.setDispatcher(fn: DispatcherFn)` (added in base-command.ts edit), eliminating the last `any` here. Side fix: `App.setupCommand(cmd: string)` was a wrong-pre-existing-annotation, now typed `BaseCommand`.
- `app/command-e2ee.ts` — 2 removed, 0 left. Typed `action` args; typed `askForMasterKey(error: { masterKeyId })`.
- `app/command-config.ts` — 3 removed, 0 left. `chunks: any` → `Buffer[]`; typed action args; `Record<string, any>` → `Record<string, unknown>` for resultObj.
- `app/command-export.ts` — 3 removed, 0 left. Typed action args; `n.id` map callbacks now infer entity types from `loadItems`; format assignment uses `ExportModuleOutputFormat.Jex`.
- `app/gui/FolderListWidget.ts` — 3 removed, 0 left. Introduced local `FolderListItem = FolderEntity | TagEntity | SearchItem | '-'` for `itemRenderer` and `newItems`; replaced `(this.folders[i] as any).note_count` with `FolderEntity & { note_count?: number }`.
- `app/command-settingschema.ts` — 4 removed, 0 left. Typed action args; `Record<string, any>` → `Record<string, unknown>` for schema, props; removed unused `v: any` annotation.
- `app/gui/StatusBarWidget.ts` — 2 removed, 2 left. Typed `prompt(promptString: string, options)` and `textStyle: (s: string) => s`. Left 2 `any` for tkwidgets terminal-kit `inputField` options/callback — no published types and tkwidgets has no .d.ts. Comments updated with reason.
- `app/LinkSelector.ts` — 5 removed, 0 left. Introduced local `TextWidget` interface for tk text widget shape; replaced `(lines[i] as any).matchAll` with direct call (`String.prototype.matchAll` is well-typed).
- `app/command-sync.ts` — 3 removed, 2 left. Typed `action` args, `log(...s: string[])`. Left `options: any` and `report: any` because `Synchronizer.start(options: any)` and `Synchronizer.reportToLines(report: any)` in lib are themselves `any` — tightening here would diverge from lib. Comments updated.
- `app/command-testing.ts` — 5 removed, 0 left. `randomElement` → generic `<T>(array: T[]): T | null`; `itemCount(args: { arg0 })`; `options(): [string, string][]`; typed `action` args; `promises: Promise<unknown>[]`.
- `app/app.ts` — 0 removed, 6 left. All disables had descriptive reasons (`Dynamic command loading system`, `Dynamic command metadata`, `Dynamic command type`, `Dynamic GUI type with many optional methods`, `Redux dispatch type requires AnyAction`) — none were `Old code before rule was applied`, so out of scope per rule 3. Side fix in checkpoint 1: `App.setupCommand(cmd: string)` annotation corrected to `BaseCommand`.
- `app/services/plugins/PluginRunner.ts` — 6 removed, 0 left. `wrapper: any` → `Record<string, (...args: unknown[]) => unknown>` with final cast to `typeof Console` to match `SandboxProxy.console`; arg arrays → `unknown[]`; `activeSandboxCalls_: any` → `Record<string, boolean>`.
- `app/base-command.ts` — 4 removed, 4 left. Introduced typed `StdoutFn`/`PromptFn`/`DispatcherFn` aliases; typed `stdout_`/`prompt_`/`dispatcher_` fields; typed `encryptionCheck(item: { encryption_applied? })`. Left `action(_args: any)` and `options(): unknown[]`: parameters are contravariant so tightening base would break all subclass overrides. The 3 remaining `any` are now centralized in the type aliases at the top of the file (with reasons): stdout accepts arbitrary message values, prompt response varies, dispatch action shape varies; tests pass sync mocks that don't return Promises.
- `tests/HtmlToMd.ts` — 1 removed, 0 left. `htmlToMdOptions: any` → `ParseOptions` (exported from `@joplin/lib/HtmlToMd`).
- `tests/MdToHtml.ts` — 3 removed, 0 left. `newTestMdToHtml(options: any)` → `Partial<MdToHtmlConstructorOptions>`; the `ResourceModel` mock requires `as unknown as` cast because it intentionally omits `filename` and `isSupportedImageMimeType`. `mdToHtmlOptions` already had a real type, just a stale disable comment. `pluginOptions: any` → `Record<string, { enabled: boolean }>`.
- `tests/testUtils.ts` — 1 removed, 0 left. `Record<string, any>` → `Record<string, unknown>` on `PluginServiceOptions.getState`.
- `tests/services/keychain/KeychainService.ts` — 1 removed, 0 left. `describeIfCompatible(fn: any, elseFn: any)` → `() => void`.
- `tests/services/plugins/PluginService.ts` — 1 removed, 0 left. `(f: any) => f.title` → inferred `FolderEntity` (from `Folder.all()`).
- `tests/services/plugins/api/JoplinWorkspace.ts` — 2 removed, 0 left. `appState: Record<string, any>` → `Record<string, string[]>`; `result: any` → `{ id: string; event: number }`.
- `tests/services/plugins/sandboxProxy.ts` — 4 removed, 0 left. `args: any[]` → `unknown[]`; `target: any` → inferred function type (both `it` blocks).

Verification: package `yarn tsc --noEmit` clean; `yarn linter-ci packages/app-cli/` clean; root `yarn tsc --noEmit` (all workspaces) clean; spellcheck clean.

Summary: 90 → 16 disable comments (74 removed). Zero remaining `Old code before rule was applied` disables — all 16 left have descriptive reasons explaining why they cannot be tightened. They fall into these categories:
- **Base-class contravariance** (4): `base-command.ts` — `StdoutFn`, `PromptFn`, `DispatcherFn` aliases at the top of the file (centralized) and the `action(_args: any)` method. Parameters are contravariant; subclasses narrow per-command, so the base must stay permissive. Tests pass synchronous mocks that don't return Promises.
- **Heterogeneous query options** (1): `command-ls.ts` `queryOptions` is passed to both `Folder.all` (FolderLoadOptions) and `Note.previews` (PreviewsOptions) and the union has fields neither type carries; splitting would be a structural refactor.
- **Loose lib-typed APIs** (2): `command-sync.ts` — `Synchronizer.start(options: any)` and `Synchronizer.reportToLines(report: any)` in lib are themselves `any`; tightening here would diverge from lib.
- **No published types for JS modules** (3): `StatusBarWidget` (tkwidgets terminal-kit `inputField` options + callback) and `command-sync.ts` `oneDriveApiUtils_` (`onedrive-api-node-utils.js` is plain JS).
- **Dynamic command/state shapes already documented** (6): all of `app.ts` was already annotated with descriptive non-"Old code" reasons before this pass — `commands_`, `commandMetadata_`, `activeCommand_`, `gui_`, dynamic command type at L175, and the redux dispatch type.

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

## packages/app-desktop
Session date: 2026-05-13
Branch: any_refactor_6

Files processed:
- `commands/exportFolders.ts` — 1 removed, 0 left. `_context: any` → `CommandContext`.
- `commands/exportNotes.ts` — 1 removed, 0 left. `_context: any` → `CommandContext`.
- `commands/focusElement.ts` — 1 removed, 0 left. `_context: any` → `CommandContext`.
- `commands/toggleExternalEditing.ts` — 1 removed, 0 left. `mapStateToTitle(state: any)` → `AppState`.
- `checkForUpdates.ts` — 0 removed, 1 left. `parentWindow: any` is passed to `bridge().showMessageBox(parentWindow, ...)` but the bridge signature is `showMessageBox(message: string, ...)` — tightening would expose a pre-existing call-site mismatch (logic change). Reason updated.
- `gui/ConfigScreen/ButtonBar.tsx` — 1 removed, 0 left. `type StyleProps = any` → local interface with theme fields used in template literals.
- `gui/ConfigScreen/controls/plugins/PluginBox.tsx` — 1 removed, 0 left. `styled.div<{ mb: any }>` → `string | number`.
- `gui/ConfigScreen/controls/plugins/SearchPlugins.tsx` — 1 removed, 0 left. `onPluginSettingsChange(event: any)` → `OnPluginSettingChangeEvent` (already used by callers).
- `gui/DialogButtonRow.tsx` — 1 removed, 0 left. `okButtonRef?: any` → `React.Ref<HTMLButtonElement>`.
- `gui/DialogButtonRow/useKeyboardHandler.ts` — 1 removed, 0 left. `isInSubModal(targetElement: any)` → `EventTarget | null`.
- `gui/Dropdown/Dropdown.tsx` — 1 removed, 0 left. `onChange(event: any)` → `React.ChangeEvent<HTMLSelectElement>`.
- `gui/EditFolderDialog/Dialog.tsx` — 1 removed, 0 left. `onFolderTitleChange(event: any)` → `React.ChangeEvent<HTMLInputElement>`.
- `gui/EditFolderDialog/IconSelector.tsx` — 0 removed, 1 left. `(window as any).EmojiButton` — emoji-button library is dynamically loaded onto window with no published types. Reason updated.
- `gui/ErrorBoundary.tsx` — 1 removed, 0 left. `componentDidCatch(error: any)` → `Error | string` (matches the `typeof === 'string'` narrowing already in the body); needs `as Error` after the narrowing branch.
- `gui/NoteEditor/NoteBody/CodeMirror/utils/index.ts` — 1 removed, 0 left. `cursorPos: any` → `{ line: number; ch: number }` (CodeMirror 5 position shape used inside the function).
- `gui/NoteEditor/NoteBody/CodeMirror/utils/types.ts` — 1 removed, 0 left. `pluginAssets: any[]` → `RenderResultPluginAsset[]` (from `@joplin/renderer/types`).
- `gui/NoteEditor/NoteBody/CodeMirror/utils/useContextMenu.ts` — 0 removed, 1 left. `(editorRef.current as any).alignSelection` — CodeMirror 5 runtime method not in the type. Reason updated.
- `gui/NoteEditor/NoteBody/CodeMirror/v5/utils/useExternalPlugins.ts` — 0 removed, 1 left. `CodeMirror: any` — receives dynamically-loaded CM5 namespace used for plugin registration; @types/codemirror's signature is too narrow. Reason updated.
- `gui/NoteEditor/commands/focusElementNoteBody.ts` — 1 removed, 0 left. `comp: any` → `WindowCommandDependencies`.
- `gui/NoteEditor/commands/pasteAsMarkdown.ts` — 1 removed, 0 left. Same.
- `gui/NoteEditor/commands/pasteAsText.ts` — 1 removed, 0 left. Same.
- `gui/NoteEditor/commands/showLocalSearch.ts` — 1 removed, 0 left. Same.
- `gui/NoteEditor/commands/showRevisions.ts` — 1 removed, 0 left. Introduced local `ShowRevisionsDependencies` (NoteEditor passes a different shape with `setShowRevisions`/`isInFocusedDocument` for this command only — not registered via `useWindowCommandHandler`).
- `gui/NoteEditor/NoteBody/CodeMirror/v5/utils/useJoplinCommands.ts` — 0 removed, 1 left. `CodeMirror: any` — same reason as `useExternalPlugins.ts`. Reason updated.
- `gui/NoteEditor/NoteBody/CodeMirror/v5/utils/useKeymap.ts` — 0 removed, 1 left. Same.
- `gui/NoteEditor/NoteBody/CodeMirror/v5/utils/useScrollUtils.ts` — 0 removed, 1 left. Same.
- `gui/NoteEditor/NoteBody/CodeMirror/v6/utils/useContentScriptRegistration.ts` — 1 removed, 0 left. `postMessageHandler(message: any)` → `unknown` (consumed by `emitContentScriptMessage` which already accepts `unknown`).
- `gui/NoteEditor/NoteBody/PlainEditor/PlainEditor.tsx` — 1 removed, 0 left. `onChange(event: any)` → `React.ChangeEvent<HTMLTextAreaElement>`.
- `gui/NoteEditor/NoteBody/TinyMCE/utils/joplinCommandToTinyMceCommands.ts` — 1 removed, 0 left. `value?: any` → `string` (every literal in the file uses string values).
- `gui/NoteEditor/NoteBody/TinyMCE/utils/useEditDialog.ts` — 0 removed, 1 left. `onSubmit(dialogApi: any)` — TinyMCE dialog API not in published types. Reason updated.
- `gui/NoteEditor/editorCommandDeclarations.test.ts` — 1 removed, 0 left. `Record<string, any>` → `Record<string, boolean>` (every literal in the file is a boolean).
- `gui/NoteEditor/utils/contextMenu.ts` — 1 removed, 0 left. `saveFileData(data: any)` → `string | NodeJS.ArrayBufferView` (matches `fs.writeFile`'s accepted data types).
- `gui/WindowCommandsAndDialogs/commands/addProfile.ts` — 1 removed, 0 left. `comp: any` → `WindowControl`; `onClose(answer: string)` → `unknown` with `as string` (matches `PromptOptions.onClose` shape).
- `gui/WindowCommandsAndDialogs/commands/moveToFolder.ts` — 1 removed, 0 left. Same — `WindowControl`.
- `gui/WindowCommandsAndDialogs/commands/renameFolder.ts` — 1 removed, 0 left. Same; onClose answer narrowed via cast.
- `gui/WindowCommandsAndDialogs/commands/renameTag.ts` — 1 removed, 0 left. Same.
- `gui/OneDriveLoginScreen.tsx` — 0 removed, 1 left. `React.Component<any, any>` — old class component without state/props refactor. Reason updated.
- `gui/ResizableLayout/ResizableLayout.tsx` — 1 removed, 0 left. `newSize: any` → `{ width?: number; height?: number }`.
- `gui/ResizableLayout/utils/layoutItemProp.ts` — 1 removed, 0 left. `(item as any)[propName]` → `propName: keyof LayoutItem`; `item[propName]` is typed; caller (MainScreen.tsx) needs `as string` for previously-loose `item.context.pluginId`.
- `gui/ResizableLayout/utils/persist.test.ts` — 1 removed, 0 left. `layout: any` → `LayoutItem` (the type was already imported).
- `gui/ResizableLayout/utils/style.ts` — 0 removed, 1 left. styled-components `.attrs` typing collides with the dynamic style attrs (`props.size`). Reason updated; `(props: any)` callback now typed inline.
- `gui/ResizableLayout/utils/types.ts` — 1 removed, 0 left. `context?: any` → `Record<string, unknown>`.
- `gui/ResizableLayout/utils/useWindowResizeEvent.ts` — 1 removed, 0 left. `eventEmitter: any` → `{ current: { emit: (name: string) => void } }`.
- `gui/Root.tsx` — 0 removed, 1 left. `React.Component<Props, any>` — implicit state shape; tightening requires structural refactor. Reason updated.
- `gui/Sidebar/styles/index.ts` — 1 removed, 0 left. `type StyleProps = any` → local interface with theme + item discriminators.
- `gui/StatusScreen/StatusScreen.tsx` — 0 removed, 1 left. `style: any` is spread into `theme.containerStyle` (loosely typed). Reason updated.
- `gui/SyncWizard/Dialog.tsx` — 1 removed, 0 left. `boxes: any[]` → `React.ReactNode[]`.
- `gui/NoteEditor/utils/useDropHandler.ts` — 1 removed, 0 left. `editorRef: any` → `RefObject<NoteBodyEditorRef>`. Tightening exposed two `execCommand()` floating-Promise calls; fixed with `void` (same `void` pattern as showLocalSearch).
- `gui/NoteEditor/utils/useMessageHandler.ts` — 1 removed, 0 left. `editorRef: any` → `RefObject<NoteBodyEditorRef>`.
- `gui/NoteEditor/utils/useNoteSearchBar.ts` — 1 removed, 0 left. `noteSearchBarRef: MutableRefObject<any>` → `MutableRefObject<HTMLInputElement | null>`.
- `gui/NoteEditor/utils/usePluginServiceRegistration.ts` — 1 removed, 0 left. `ref: any` → `Ref<unknown>` (must use `Ref`, not `RefObject`, to accept `ForwardedRef` callers).
- `gui/NoteEditor/utils/useSearchMarkers.ts` — 1 removed, 0 left. `keywords: any[]` → `{ value: string; type?: string; accuracy?: string }[]` (matches both `Keyword`-consuming code and the literal from `useNoteSearchBar`).
- `gui/NoteList/utils/useOnNoteClick.ts` — 1 removed, 0 left. `(event.target as any)` → `HTMLElement`.
- `gui/NoteList/utils/useScroll.ts` — 1 removed, 0 left. `event: any` → `React.UIEvent<HTMLDivElement>`; switched `event.target` to `event.currentTarget` (target is `EventTarget` without scrollTop).
- `gui/NoteListControls/commands/focusSearch.ts` — 1 removed, 0 left. `searchBarRef: any` → `{ current: { select: ()=> void } | null }`.
- `gui/NoteListHeader/useDragAndDrop.test.ts` — 1 removed, 0 left. `as any` → `as InsertAt` (now exported from `useDragAndDrop`).
- `gui/NoteListHeader/utils/validateColumns.test.ts` — 1 removed, 0 left. `(props: any)` → `Partial<NoteListColumn>[]`.
- `gui/WindowCommandsAndDialogs/commands/showNoteContentProperties.ts` — 1 removed, 0 left. `comp: any` → `WindowControl`.

Checkpoint 5 (2026-05-13):
- `gui/WindowCommandsAndDialogs/commands/showNoteProperties.ts` — 1 removed, 0 left. `comp: any` → `WindowControl`.
- `gui/WindowCommandsAndDialogs/commands/showShareFolderDialog.ts` — 1 removed, 0 left. Same.
- `gui/WindowCommandsAndDialogs/commands/showShareNoteDialog.ts` — 1 removed, 0 left. Same.
- `gui/WindowCommandsAndDialogs/commands/showSpellCheckerMenu.ts` — 0 removed, 1 left. `Menu.buildFromTemplate(menuItems as any)` — `spellCheckerConfigMenuItems` returns a heterogeneous menu shape that doesn't satisfy Electron's `MenuItemConstructorOptions` structurally. Reason updated.
- `gui/WindowCommandsAndDialogs/commands/toggleNotesSortOrderField.ts` — 1 removed, 0 left. `field?: string | any[]` → `string | [string, boolean]`.
- `gui/WindowCommandsAndDialogs/utils/useWindowControl.ts` — 1 removed, 0 left. `onClose(answer: any)` → `unknown` with `as PromptSuggestion<T>` cast inside.
- `gui/dialogs.ts` — 1 removed, 0 left. `options: any = null` → `Record<string, unknown>`.
- `gui/hooks/usePrevious.ts` — 1 removed, 0 left. Dangling disable comment (no `any` in the body) — removed.
- `gui/style/StyledInput.tsx` — 1 removed, 0 left. `type StyleProps = any` → local interface with theme fields.
- `gui/utils/convertToScreenCoordinates.ts` — 1 removed, 0 left. `o: any` → `unknown` with internal `Record<string, unknown>` narrowing after `JSON.parse(JSON.stringify(o))`.
- `integration-tests/util/setMessageBoxResponse.ts` — 0 removed, 1 left. Mock return cast prevents breakage when Electron's `MessageBoxReturnValue` shape evolves. Reason updated; redundant block comment removed.
- `tools/notarizeMacApp.ts` — 0 removed, 1 left. `appBundleId` is no longer in `@electron/notarize`'s `NotaryToolStartOptions` but still required at runtime. Reason updated.
- `utils/checkForUpdatesUtilsTestData.ts` — 3 removed, 0 left. `releases1/2/3: any` → `unknown as GitHubRelease[]` cast at the end of each array literal (fixtures include extra GitHub API fields not in `GitHubRelease`).
- `utils/checkForUpdatesUtils.test.ts` — 1 removed, 0 left. `testCases: [any, …][]` → `[GitHubRelease[], …][]`.
- `gui/Navigator.tsx` — 0 removed, 1 left. `ScreenProps = any`: heterogeneous per-screen prop shapes; the navigator just spreads them. Reason updated.
- `gui/NewWindowOrIFrame.tsx` — 1 removed, 0 left. `createPortal(...) as any` cast wasn't needed; `ReactPortal` already assignable to `ReactNode`.
- `gui/DropboxLoginScreen.tsx` — 0 removed, 2 left. Reasons updated (old class component + JS module without exported type).
- `gui/Sidebar/Sidebar.tsx` — 0 removed, 2 left. `syncReport: any` matches the lib reducer shape; the inner `syncCompletedWithoutError` already had a descriptive reason. Both reasons now explain why they can't be tightened locally.
- `gui/Button/Button.tsx` — 2 removed, 0 left. `type StyleProps = any` → local theme interface; `ref: any` → `React.Ref<HTMLButtonElement>`.
- `gui/ExtensionBadge.tsx` — 2 removed, 0 left. `style?: any` → `React.CSSProperties`; `themeSelector(_state: any, props: any)` → typed by `Props`.
- `gui/ImportScreen.tsx` — 2 removed, 0 left. Local `ProgressState` interface; `onError(error: any)` → `Error`.
- `gui/MultiNoteActions.tsx` — 2 removed, 0 left. `notes: any[]` → `NoteEntity[]`; `multiNotesButton_click(item: any)` → `MenuItem` (electron).
- `gui/NoteRevisionViewer.tsx` — 2 removed, 0 left. Dangling disable on `revisionList_onChange` removed; `webview_ipcMessage(event: any)` → `{ channel?: string; args?: unknown[] }`.
- `gui/ResizableLayout/utils/setLayoutItemProps.ts` — 2 removed, 0 left. `props: any` → `Partial<LayoutItem>`; `(item as any)[n]` → `(item as unknown as Record<string, unknown>)[n]`.
- `gui/ResizableLayout/utils/useLayoutItemSizes.ts` — 2 removed, 0 left. `noWidth/HeightChildren: any[]` → `{ item: LayoutItem; parent: LayoutItem }[]`.
- `gui/ToggleEditorsButton/styles/index.ts` — 2 removed, 0 left. `innerButton/output: any` → `CSSProperties` / `Record<string, CSSProperties>`.
- `gui/WindowCommandsAndDialogs/commands/gotoAnything.ts` — 2 removed, 0 left. Local `PluginMenuItem` interface for `PluginManager.menuItems().find(...)`.
- `gui/WindowCommandsAndDialogs/commands/importFrom.ts` — 2 removed, 0 left. `errors: any[]` → `(string|Error)[]`; `onProgress(status: any)` → `Record<string, unknown>`.
- `gui/hooks/useEffectDebugger.ts` — 2 removed, 0 left. `effectHook/dependencies/dependencyNames` typed as `EffectCallback`/`unknown[]`/`string[]`; reduce accum typed.
- `gui/hooks/useImperativeHandlerDebugger.ts` — 2 removed, 0 left. Made generic over T; `ref: Ref<T>`, `effectHook: ()=> T`, deps typed.
- `gui/hooks/usePropsDebugger.ts` — 2 removed, 0 left. `props: any` → `Record<string, unknown>`; `dependencies: any[]` → `unknown[]`.
- `gui/lib/SearchInput/SearchInput.tsx` — 2 removed, 0 left. `inputRef?: any` → `React.Ref<HTMLInputElement>`; `onChange(event: any)` → `React.ChangeEvent<HTMLInputElement>`.
- `gui/utils/loadScript.ts` — 2 removed, 0 left. `attrs?: Record<string, any>` → `Record<string, string>`; `element: any` → typed `HTMLLinkElement | HTMLScriptElement | null` with branch-specific locals.
- `services/plugins/PlatformImplementation.ts` — 2 removed, 0 left. `Components` index → `unknown`; `registerComponent(_, component: any)` → `unknown`.
- `services/plugins/UserWebview.tsx` — 2 removed, 0 left. `theme?: any` → `Record<string, unknown>`; `ref: any` → `React.Ref<UserWebviewRef>` (new exported interface).
- `gui/NoteEditor/NoteBody/CodeMirror/utils/useEditorSearchHandler.ts` — 2 removed, 0 left. `searchMarkers: any` → `SearchMarkers`; `webviewRef: RefObject<any>` → `RefObject<NoteViewerControl>`.
- `gui/NoteEditor/NoteBody/CodeMirror/utils/useWebviewIpcMessage.ts` — 2 removed, 0 left. Local `WebviewIpcEvent { channel?; args? }` used for both `onMessage` parameter and the returned callback; `arg0` cast `as number` at the `percentScroll` call.
- `gui/NoteEditor/NoteBody/CodeMirror/v5/utils/useLineSorting.ts` — 0 removed, 2 left. Same dynamic CM5 loader / runtime instance reason as the other v5 utils. Reasons updated.
- `gui/NoteEditor/NoteBody/TinyMCE/utils/setupToolbarButtons.ts` — 0 removed, 2 left. TinyMCE editor + ToggleButton api types not in published types. Reasons updated.
- `gui/NoteEditor/NoteBody/TinyMCE/utils/useScroll.ts` — 1 removed, 1 left. `scheduleOnScroll(event: any)` → `{ percent: number }`; `editor: any` stays (TinyMCE Editor type narrower than getDoc/getWin usage). Reason updated.
- `gui/NoteEditor/utils/useFormNote.ts` — 2 removed, 0 left. `editorRef: any` → `RefObject<NoteBodyEditorRef>` (exposed a floating Promise in `handleAutoFocus`; fixed with `void`); `onResourceChange(event: any)` → `{ id: string }`.
- `gui/NoteEditor/utils/useWindowCommandHandler.ts` — 2 removed, 0 left. `noteSearchBarRef: any` → `MutableRefObject<HTMLInputElement | null>`; `execute(..., ...args: any[])` → `unknown[]`.
- `gui/NoteList/utils/types.ts` — 2 removed, 1 left. `themeId: any` → `number`; `resizableLayoutEventEmitter: any` → `EventEmitter`; `searches: any[]` left with descriptive reason (matches lib reducer shape).
- `gui/NoteListWrapper/NoteListWrapper.tsx` — 1 removed, 0 left. `resizableLayoutEventEmitter: any` → `EventEmitter`; `depNameToNoteProp(event.name as any)` → `as ListRendererDependency`.
- `gui/Sidebar/hooks/useOnRenderItem.tsx` — 2 removed, 0 left. `(folder as any).note_count` → `(folder as FolderEntity & { note_count?: number }).note_count` (dynamic SQL-only field).

Verification at checkpoint: package `yarn tsc --noEmit` clean; lint clean on changed files; spellcheck clean. 431 → 368 disable comments (63 removed; cumulative 109/477).

Checkpoint 6 (2026-05-13):
- `gui/WindowCommandsAndDialogs/commands/editAlarm.ts` — 3 removed, 0 left. `comp: any` → `WindowControl`; `onClose(answer: any, buttonType: string)` → `(unknown, unknown)` with `as number` for `todo_due`; `mapStateToTitle(state: any)` → `State` (from lib reducer).
- `gui/NoteListHeader/useDragAndDrop.ts` — 3 removed, 0 left. `setupDataTransfer.data: any` → `unknown`; `onResizerDragOver as any` (×2) → `as unknown as EventListener` for `add/removeEventListener`.
- `gui/NoteListItem/utils/prepareViewProps.ts` — 3 removed, 0 left. `output: any` → typed local shape `{note?: {folder?}; item?: {size?; selected?; index?}}`; `(note as any)[propName]` / `(itemSize as any)[propName]` → `as unknown as Record<string, unknown>`.
- `gui/ResizableLayout/utils/movements.ts` — 3 removed, 0 left. `array_move` made generic over T; `produce(layout, (draft: any))` → `LayoutItem`; `newSize: any` → `{ width?: number; height?: number }`.
- `gui/ToolbarButton/ToolbarButton.tsx` — 3 removed, 0 left. `getProp(props, name, defaultValue: any = null)` → `unknown` default; record-cast accessors; cast `title/tooltip/iconName as string` and `onClick as (()=> void) | undefined` at call sites.
- `InteropServiceHelper.ts` — 1 removed, 2 left. `Promise<any>` → `Promise<Buffer | null>` (this exposed a downstream `writeFile(string)` mismatch in `usePrintToCallback.ts` — added `as unknown as string` there with the runtime accepting Buffer). The other two (`pageSize as any`, `webContents.print(options as any)`) stay with descriptive reasons (Electron's option types stricter than what we pass).
- `gui/MasterPasswordDialog/Dialog.tsx` — 0 removed, 3 left. PasswordInput's `ChangeEventHandler` is typed as `(event: {value: string})=> void` but the runtime hands a DOM `React.ChangeEvent` through (StyledInput passes the raw onChange). Updated reason on all three handlers.
- `gui/EncryptionConfigScreen/EncryptionConfigScreen.tsx` — 2 removed, 1 left. `themeId: any` → `number`; `infoComp: any = null` → `React.ReactNode`. `onPasswordInputChange` left for the same PasswordInput reason above; reason updated.
- `gui/NoteListControls/NoteListControls.tsx` — 3 removed, 0 left. `StyleProps = any` → local interface; `StyledRoot: any` typed via interface; `iconMap: any` → `Record<string, string>`.
- `gui/PdfViewer.tsx` — 3 removed, 0 left. `StyleProps = any` → local theme interface; `resource: any` → `ResourceEntity`; `onMessage_(event: any)` → `MessageEvent<{ name; text? }>`.
- `gui/ConfigScreen/controls/SettingComponent.tsx` — 2 removed, 1 left. `onChange(event: any)` → `{ value: unknown }`; `inputStyle: any` → `CSSProperties`. The `settingKeyToControl` declaration's `React.FC<any>` left — each control's props differ and tightening would require structural changes. Reason updated.
- `gui/NoteEditor/NoteBody/CodeMirror/v6/CodeMirror.tsx` — 3 removed, 0 left. `pluginAssets: any[]` → `RenderResultPluginAsset[]`; `(commands as any)[cmd.name](cmd.value)` → typed record cast; `options: any` → inline typed object with optional `percent`.
- `gui/ResizableLayout/utils/persist.ts` — 4 removed, 0 left. `saveLayout(layout): any` → `Partial<LayoutItem>`; `produce(layout, (draft: any))` → `LayoutItem`; `delete (item as any)[k]` → `as unknown as Record<string, unknown>`; `loadLayout(layout: any)` → `Partial<LayoutItem> | null` with `as LayoutItem` on the spread.
- `gui/NoteEditor/utils/resourceHandling.ts` — 4 removed, 0 left. `commandAttachFileToBody.options` → local `CommandAttachFileToBodyOptions`; `resourcesStatus.resourceInfos: any` → `ResourceInfos` (renderer); `clipboardImageToResource.image: any` → `NativeImage` (electron type import); `getResourcesFromPasteEvent.event: any` → `{ preventDefault } | null`.
- `gui/SearchBar/SearchBar.tsx` — 4 removed, 0 left. `inputRef?: any` → `MutableRefObject<HTMLInputElement | null>`; `onChange(event: any)` → `{ value: string }`; `onKeyDown(event: any)` → `React.KeyboardEvent`; inner `document.activeElement as any` → `as HTMLElement`.
- `gui/WindowCommandsAndDialogs/commands/showPrompt.ts` — 4 removed, 0 left. `comp: any` → `WindowControl`; `value?: any` → `string` (matches DialogState shape); `autocomplete?: any[]` → `unknown[]`; `onClose(answer: any, buttonType: string)` → `(unknown, unknown)`.
- `gui/NoteEditor/NoteBody/CodeMirror/v6/useEditorCommands.ts` — 4 removed, 0 left. `webviewRef: RefObject<any>` → `RefObject<NoteViewerControl>`; `insertText(value: any)` → `string`; `(editorRef.current as any)[value.name]` (×2) → single `editorAsRecord` alias typed `Record<string, (...args: unknown[])=> unknown>`.
- `bridge.ts` — 3 removed, 1 left. `showOpenDialog` `(this.lastSelectedPaths_ as any)[fileType]` (×2) → typed `keyof LastSelectedPath`; `shouldShowMenu(_event: any, params: any)` → `(unknown, { isEditable: boolean })`. The remaining `as any` on `dialog.showOpenDialog(this.activeWindow(), options as any)` stays — our `OpenDialogOptions.properties` is `string[]` but Electron's is a strict union. Reason updated.
- `gui/ConfigScreen/controls/plugins/PluginsStates.tsx` — 4 removed, 0 left. `styled.div<any>` / `styled(StyledMessage)<any>` → typed prop interfaces; `value: any` → `SerializedPluginSettings`; `onSearchPluginSettingsChange(event: any)` → `OnPluginSettingChangeEvent`.

Verification at checkpoint: package `yarn tsc --noEmit` clean; lint clean on changed files; spellcheck clean. 368 → 312 disable comments (56 removed; cumulative 165/477).

Checkpoint 7 (2026-05-13):
- `gui/NoteEditor/NoteBody/CodeMirror/utils/useEditorSearchExtension.ts` — 3 removed, 2 left. `getSearchTerm.keyword: any` → `Keyword`; `match: any` → `{from: {line; ch}; to: {line; ch}}` (CodeMirror 5 DocumentPosition); `marks: any` → `ReturnType<typeof highlightSearch>[]`. The `stream: any` overlay token signature stays — CM5 StringStream isn't typed in this repo.
- `gui/NoteEditor/NoteBody/CodeMirror/v5/utils/useCursorUtils.ts` — 0 removed, 5 left. All `CodeMirror: any` / `cm: any` / `params: any` reasons updated to mention the CM5 dynamic loader / no @types/codemirror.
- `gui/ResourceScreen.tsx` — 5 removed, 0 left. `onResourceClick/Delete/ToggleSorting`'s return `any` → `void`; `rootStyle: any` → `CSSProperties & { height?; width? }`; `mapStateToProps(state: any)` → `AppState`.
- `gui/WindowCommandsAndDialogs/utils/appDialogs.tsx` — 0 removed, 5 left. Reasons consolidated — each dialog requires a different `customProps` shape and the render functions intentionally spread an open shape.
- `app.reducer.ts` — 5 removed, 1 left. `watchedResources: any` → `Record<string, unknown>`; `navHistory: any[]` → `AppStateRoute[]`; `createAppDefaultState.resourceEditWatcherDefaultState: any` → `Partial<AppState>` (this required spreading `backgroundWindows: {}` to override the lib's looser default); `getNextLayout.currentLayout: any` → `string | string[]`; `(item as any)[propName]` → `as unknown as Record<string, unknown>`. The main reducer `action: any` stays with reason — would need a redux action union.
- `gui/ShareFolderDialog/ShareFolderDialog.tsx` — 6 removed, 0 left. `styled(StyledMessage)<any>` × 2 → typed prop interfaces (`<{index: number}>` and the bare form); `StyleProps = any` → local interface; `handleError(error: any)` / `defer(error: any)` → `Error` / `Error | null`; `recipientEmail_change(event: any)` → `React.ChangeEvent<HTMLInputElement>`. Needed `type="info"` on `<StyledRecipient>` and `<StyledShareState>` to satisfy the StyledMessage's `type: string` required prop that the original `<any>` cast had hidden (runtime branches on `type === 'error'`, so 'info' = default styling).
- `gui/NoteEditor/NoteEditor.tsx` — 6 removed, 0 left. `onFieldChange.value: any` → `string`; `onTitleChange(event: any)` → `React.ChangeEvent<HTMLInputElement>`; `onBodyWillChange(event: any)` → `{ changeId: number }`; `externalEditWatcher_noteChange(event: any)` / `onNotePropertyChange(event: any)` → `{ id; note: NoteEntity }` / `{ note: NoteEntity }` (matches the `AlarmChangeEvent` shape lib emits); `(newFormNote as any)[key]` → `as unknown as Record<string, unknown>` via a typed `noteAsRecord` alias.
- `ElectronAppWrapper.ts` — 7 removed, 0 left. `stateOptions: any` → typed object literal; `windowOptions: any` → `BrowserWindowConstructorOptions` (uncovered that `enableRemoteModule` is no longer in the published `WebPreferences`; cast with comment explaining @electron/remote still relies on it); `(event as any).isMainFrame` → `as Electron.Event & {isMainFrame?: boolean}`; `close/open-url` event handlers → `import('electron').Event`; `ipcMain.on` handlers → `import('electron').IpcMainEvent` with `args` typed `unknown` and cast at the assignment site. (Used `import('electron').*` inline rather than `Electron.*` because the project's lint config doesn't surface the `Electron` global.)
- `gui/NoteEditor/NoteBody/CodeMirror/v5/CodeMirror.tsx` — 4 removed, 3 left. `commands: any` → `Record<string, (...args: any[])=> unknown>` (kept inner `any` with reason — commands are heterogeneous and dispatched by name); `replaceSelection.value: any` / `insertText.value: any` → `string`; `onEditorPaste.event: any` → `{ preventDefault } | null`; `loadScript.script: any` / `element: any` → `{src; id?; attrs?}` / `HTMLScriptElement | HTMLLinkElement` with branch-specific narrowing; `options: any` → typed object with optional `percent`. Two of the remaining disables collapsed into the new `commands` typing comment.
- `gui/NoteEditor/NoteBody/CodeMirror/v5/utils/useJoplinMode.ts` — 0 removed, 7 left. All CM5 mode/state/stream `any`s reason-updated (no @types/codemirror in this repo).
- `gui/NoteListItem/utils/useItemElement.ts` — 7 removed, 0 left. All `as any` event-listener casts → `as unknown as EventListener`; React→DOM event casts → `as unknown as React.MouseEvent<HTMLDivElement>`; `(element.style as any)[n]` → `as unknown as Record<string, unknown>`.

Verification at checkpoint: package `yarn tsc --noEmit` clean; lint clean on changed files; spellcheck clean. 312 → 266 disable comments (46 removed; cumulative 211/477).

Checkpoint 8 (2026-05-13):
- `gui/WindowCommandsAndDialogs/commands/setTags.ts` — 8 removed, 0 left. `comp: any` → `WindowControl`; introduced local `TagOption { value; label }` for the suggestion arrays; sort/map callbacks typed via `TagEntity`; `onClose(answer: any[])` → `unknown` with internal `as TagOption[]`. The `value: startTags` needed `as unknown as string` because DialogState's value is typed `string`.
- `gui/NotePropertiesDialog.tsx` — 7 removed, 2 left. `okButton: any` → `RefObject<HTMLButtonElement>`; `styles_: any` → `Record<string, CSSProperties>`; `buttonRow_click(event: any)` → `{ buttonName: string }`; `editPropertyButtonClick.initialValue: any` → `string | number | null`; `(newFormNote as any)[k]` and `(formNote as any)[key]` → `as unknown as Record<string, unknown>` casts; `editedValue: any` → `string | number | null`. Two stay with descriptive reasons: `latLongFromLocation` output spreads into NoteEntity which expects number lat/long while the code keeps them as strings (runtime coercion); `createNoteField.value` is genuinely heterogeneous (timestamps + ids + urls).
- `gui/utils/NoteListUtils.ts` — 0 removed, 11 left. All `commandToStatefulMenuItem(...) as any` casts get a consolidated reason: lib's MenuItem shape doesn't structurally satisfy Electron's MenuItemConstructorOptions.
- `app.ts` — 4 removed, 6 left. `shouldShowMenu(_event: any, params: any)` → `(unknown, { isEditable; inputFieldType })`; `ResourceEditWatcher.on('resourceChange', event: any)` → `{ id: string }`; `(window as any).joplin` → `as unknown as Record<string, unknown>`. The reducer/middleware/Tesseract/menu callback/redux dispatch `any`s stay with descriptive reasons (base class signatures, dynamic loader, heterogeneous menu items).
- `gui/ConfigScreen/ConfigScreen.tsx` — 8 removed, 2 left. Class declaration `<any, any>` stays with reason (legacy class component); `private rowStyle_: any` → `React.CSSProperties`; `sidebar_selectionChange.event: any` / `renderSectionDescription.section: any` / `sectionToComponent.section: any/settings: any` → `SettingMetadataSection` + `Record<string, unknown>`; `sectionWidths: Record<string, any>` → `Record<string, string>`; `sectionStyle: any` → `React.CSSProperties`; `needRestartComp: any` → `React.ReactNode`; `mapStateToProps(state: any)` → `AppState`. Required `settings['sync.target'] as number` casts at call sites. Constructor `props: any` stays (matches the class's open props type).
- `services/plugins/PluginRunner.ts` — 11 removed, 0 left. `ipcRendererSend.args` / `eventHandler.args` → `unknown`/`unknown[]`; `PluginMessage.args/result/error` → `unknown[]`/`unknown`; introduced local `CallbackPromise` interface and typed `callbackPromises: Record<string, CallbackPromise>`; `mapEventIdsToHandlers.arg: any` → `unknown` with internal `as Record<string, unknown>` for the object-iteration branch; `ipcRenderer.on` handler typed via `IpcRendererEvent`; `result/error` locals → `unknown` / `Error | null` with `as Error` in the catch.
- `gui/NoteEditor/NoteBody/CodeMirror/utils/useScrollHandler.ts` — 3 removed, 7 left. `scrollTimeoutId_: any` / `restoreEditorPercentScrollTimeoutId_: any` → `ReturnType<typeof setTimeout> | null`; `scheduleOnScroll.event: any` → `{ percent: number }`. The remaining seven CM5 `cm/codeMirror: any` entries reason-updated to mention the dynamic editor/scrollInfo types.
- `gui/NoteEditor/NoteBody/CodeMirror/v5/utils/useListIdent.ts` — 0 removed, 9 left. All CM5 plugin-loader `any`s reason-updated.

Verification at checkpoint: package `yarn tsc --noEmit` clean; lint clean on changed files; spellcheck clean. 266 → 226 disable comments (40 removed; cumulative 251/477).

Checkpoint 9 (2026-05-13):
- `gui/MainScreen.tsx` — 12 removed, 4 left. `style: any` → `CSSProperties & { width?; height? }`; `State` fields `promptOptions/notePropertiesDialogOptions/noteContentPropertiesDialogOptions/shareNoteDialogOptions` → `Record<string, unknown>`; `waitForNotesSavedIID_: any` → `ReturnType<typeof setInterval>`; `ipcRenderer.on` handler → `(IpcRendererEvent, string, { url })`; `produce(layout, (draft: any))` → `LayoutItem`; `layoutModeListenerKeyDown.event: any` → `KeyboardEvent`; `urlStyle: any` → `React.CSSProperties`; `renderNotification.styles: any` → `Record<string, CSSProperties>`; `resizableLayout_resize.event: any` → `{ layout: LayoutItem }`; `resizableLayout_renderItem.event: any` → typed shape (`eventEmitter: EventEmitter; visible; size: Size; item: LayoutItem`) — also added missing `return null;` and the explicit `: React.ReactNode` return type; `components: any` → `Record<string, ()=> React.ReactNode>`; `dispatch as any` → `as unknown as Dispatch`. Left: `styles_: any` (heterogeneous — CSSProperties blocks + computed numbers like rowHeight); reducer/middleware-like patterns elsewhere.
- `gui/NoteEditor/NoteBody/CodeMirror/v5/Editor.tsx` — 0 removed, 17 left. All CM5 dynamic editor/event/options `any`s reason-updated; covers `EditorProps` heterogeneous callbacks (`onChange/onScroll/onEditorPaste/onResize/onUpdate`), the dynamic `cmOptions` record, and ref/wrapper signatures.
- `gui/NoteEditor/utils/types.ts` — 12 removed, 5 left. `NoteEditorProps`: `notes: any[]` → `NoteEntity[]`; `editorNoteStatuses: any` → `Record<string, string>`; `selectedNoteTags: any[]` → `TagEntity[]`; `watchedResources: any` → `Record<string, unknown>`; `highlightedWords: any[]` → `string[]`. `NoteBodyEditorProps`: `style: any` → `React.CSSProperties`; `onWillChange.event: any` → `{ changeId: number }`; `noteToolbar: any` → `React.ReactNode`; dangling `searchMarkers: any` disable removed (already typed `SearchMarkers`). `MessageEvent.args: any[]` reason updated. `bodyEditorContent: any` reason updated (TinyMCE retains a raw editor object). `ScrollOptions.value` / `OnChangeEvent.content` / `EditorCommand.value` / `CommandValue.args/value` stay with descriptive reasons — each editor dispatches heterogeneous shapes through these fields; tightening would require per-command discriminated unions across all editors. `searches: any[]` stays (matches lib reducer).

Verification at checkpoint: package `yarn tsc --noEmit` clean; lint clean on changed files; spellcheck clean. 226 → 202 disable comments (24 removed; cumulative 275/477).

Checkpoint 10 (2026-05-13):
- `gui/PromptDialog.tsx` — 11 removed, 9 left. `defaultValue/answer/autocomplete/buttons: any` stay with descriptive reasons (DialogState.promptOptions has heterogeneous values per inputType). `styles_: any` stays (heterogeneous style blocks + react-select factories). `answerInput_: any` stays (HTMLInputElement vs react-select ref depending on inputType). All six react-select style/theme factory callbacks (`control/input/menu/option/multiValueLabel/multiValueRemove`/`selectTheme`) reason-updated. `onSelectChange.newValue: any` → `unknown`; `onKeyDown.event: any` → `React.KeyboardEvent`. `makeAnimated() as any` casts kept inline with reasons.
- `gui/plugins/GotoAnything.tsx` — 13 removed, 7 left. `UserDataCallbackEvent.item: any` → `NoteEntity | FolderEntity | ResourceEntity | TagEntity`; `folders: any[]` → `FolderEntity[]`; `Dialog: any` → `React.ComponentType<Props>`; `manifest: any` → typed object with menuItem shape; `onTrigger.event: any` → `{ userData }`; `inputRef/itemListRef: any` → `RefObject<HTMLInputElement>` / `RefObject<ItemList<...>>`; `input_onChange/listItem_onClick/input_onKeyDown.event: any` → React event types; `results: any[]` / `row: any` / `result: any` → `GotoAnythingSearchResult[]` and `result.id` accesses; `mergeOverlappingIntervals.f: any` → `[number, number]`; `gotoItem.item: any` → `GotoAnythingSearchResult & { commandArgs? }`; `selectedItemIndex.results: any[]` → `GotoAnythingSearchResult[]`. Notes results from `Tag.searchAllWithNotes`/`SearchEngine.search` and the `folder` spread need `as unknown as GotoAnythingSearchResult[]` casts since lib's signatures are looser. `styles_: any` and the heterogeneous `commandResults` callback signature stay.
- `gui/MenuBar.tsx` — 0 removed, 23 left. All 23 `any` usages reason-updated: Electron `MenuItemConstructorOptions` has heterogeneous shapes (submenu/role/type/click vary by item kind) and the menu structure is built dynamically.

Verification at checkpoint: package `yarn tsc --noEmit` clean; lint clean on changed files; spellcheck clean. 202 → 179 disable comments (23 removed; cumulative 298/477).

Checkpoint 11 (2026-05-13) — final:
- `gui/NoteEditor/NoteBody/TinyMCE/TinyMCE.tsx` — 2 removed, 18 left. `stripMarkup.options: any` → `{ collapseWhiteSpaces?: boolean }`; `dispatchDidUpdateIID_: any` → `ReturnType<typeof setTimeout> | null`. All 18 remaining `any`s reason-updated to mention TinyMCE editor instance/event types being looser than @types/tinymce (we use APIs like getDoc/getWin/formatter/ui.registry/undoManager extensions that aren't in the published types).
- `gui/MenuBar.tsx` — already updated reasons in checkpoint 10.
- `gui/NoteEditor/NoteBody/CodeMirror/utils/useContextMenu.ts` — 0 removed, 1 left. Combined `github/array-foreach` + `no-explicit-any` disable kept on one line (lint requires consecutive `disable-next-line` directives to be merged); reason updated to mention lib's MenuItem shape vs Electron's MenuItemConstructorOptions.
- `gui/NoteEditor/NoteBody/CodeMirror/utils/useScrollHandler.ts` — already in checkpoint 8. Inline disable consolidated.
- `gui/NoteEditor/utils/useSearchMarkers.ts` — 0 removed, 1 left. Combined `ban-types` + `no-explicit-any` disable kept on one line; reason explains `searches: any[]` matches lib reducer and `highlightedWords` is heterogeneous (string[] at call site, keyword shapes inside).

Verification at checkpoint: package `yarn tsc --noEmit` clean; lint clean on changed files; spellcheck clean. 179 → 177 disable comments (2 removed; cumulative 300/477 — 63% reduction).

## Summary

app-desktop final state: **177 disable comments remaining out of 477 (300 removed, 63% reduction)**.

All 177 remaining disables now have **descriptive `-- reason` comments** explaining why they can't be tightened. They fall into these categories:

1. **CodeMirror 5 dynamic loader / dynamic editor / scrollInfo / line-handle types** — no `@types/codemirror` in this monorepo. Files: `useJoplinMode.ts` (7), `useCursorUtils.ts` (5), `useListIdent.ts` (9), `useScrollHandler.ts` (7), `v5/CodeMirror.tsx` (3), `Editor.tsx` (17), and several smaller utils.
2. **TinyMCE editor / event types** — looser than `@types/tinymce` (we use APIs not in the published types). File: `TinyMCE.tsx` (18).
3. **Electron MenuItemConstructorOptions** — heterogeneous shapes (submenu/role/type/click vary by item kind). Files: `MenuBar.tsx` (23), `NoteListUtils.ts` (11), `app.ts` (a few).
4. **react-select style/theme factories** — library's own provided styles, tightening requires importing each StyleConfig generic. File: `PromptDialog.tsx` (9).
5. **Redux actions / middleware** — heterogeneous action types; tightening would require an action-type union and base class signature change. Files: `app.ts`, `app.reducer.ts`, `MainScreen.tsx`.
6. **Legacy class components without props/state interfaces** — `Root.tsx`, `OneDriveLoginScreen.tsx`, `DropboxLoginScreen.tsx`, `ConfigScreen.tsx`, `PromptDialog.tsx`.
7. **Heterogeneous editor commands** — `EditorCommand.value` / `CommandValue.args/value` / `ScrollOptions.value` / `OnChangeEvent.content` — each editor dispatches different shapes by name.
8. **Library API mismatches** — Electron's `@electron/notarize` types missing `appBundleId`; `WebPreferences.enableRemoteModule` removed; Electron's `OpenDialogOptions.properties` is a strict union but the app uses `string[]`.
9. **Heterogeneous test fixtures / external library shapes** — `electron-context-menu`'s actions/props, PluginManager dynamic menu items, `tesseract.js` dynamic loader.
10. **CSS / styling** — `styled-components.attrs` typing conflicts; `styles_` blocks that mix CSSProperties with computed numbers.

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

## packages/lib
Session date: 2026-05-14

Starting count: 1138 disable comments across 212 files (excluding `node_modules/`).

Checkpoint 1 (2026-05-14): 1138 → 1101 (37 removed across ~25 files).

Files processed:
- `SyncTargetNone.ts` — 1 removed, 0 left. `null as any` → `null as unknown as Synchronizer` with type-only import.
- `components/shared/config/shouldShowMissingPasswordWarning.ts` — 1 removed, 0 left. `settings: any` → `Record<string, unknown>`.
- `folders-screen-utils.ts` — 1 removed, 0 left. `scheduleRefreshFoldersIID_: any` → `ReturnType<typeof shim.setTimeout>`.
- `geolocation-node.ts` — 1 removed, 0 left. `fetchJson` return → `Record<string, unknown>` (and renamed shadowed `let r` to `const response` to keep types straight after `.json()`).
- `hooks/useAsyncEffect.ts` — 1 removed, 0 left. `dependencies: any[]` → `DependencyList` (type-only import from react).
- `hooks/useElementSize.ts` — 1 removed, 0 left. `elementRef: any` → `RefObject<HTMLElement>` (type-only import from react).
- `markdownUtils.ts` — 1 removed, 0 left. `searchUrls(tokens: any[])` → `MarkdownItType.Token[]` (already had type-only import).
- `markupLanguageUtils.ts` — 1 removed, 0 left. `pluginOptions: any` → `Record<string, { enabled: boolean }>`.
- `models/Note.test.ts` — 1 removed, 0 left. `t[0]` cast `as NoteEntity` instead of inner `let input: any`.
- `models/NoteResource.ts` — 1 removed, 0 left. Introduced exported `AssociatedResourceNote = Partial<NoteEntity> & { resource_id; note_id }` to reflect the join shape.
- `models/Revision.test.ts` — 1 removed, 0 left. `input as any` → `input as RevisionEntity`.
- `models/Revision.ts` — 0 removed, 1 left. Tried `unknown[]` for parsePatch; broke `patchItem.diffs` access. Reverted with updated reason — diff-match-patch JSON shape, no installed `@types/diff-match-patch`.
- `models/Setting.test.ts` — 1 removed, 0 left. `loadSettingsFromFile(): Promise<any>` → `Promise<Record<string, unknown>>`.
- `models/settings/FileHandler.ts` — 1 removed, 0 left. `SettingValues = Record<string, any>` → `Record<string, unknown>`.
- `ntp.ts` — 1 removed, 0 left. `error: any` → `Error | null` in the NTP callback signature.
- `services/ResourceEditWatcher/reducer.ts` — 0 removed, 1 left. Reason updated (heterogeneous redux state composed across desktop/mobile; action types untyped).
- `services/database/isSqliteSyntaxError.ts` — 1 removed, 0 left. `sqliteError: any` → `{ message?: string }`.
- `services/interop/InteropService_Importer_EnexToMd.ts` — 1 removed, 0 left. `options: any` → `ImportOptions`.
- `services/interop/InteropService_Importer_Raw.test.ts` — 1 removed, 0 left. Introduced local `FolderEntityWithChildren` interface; `tree: any` → typed cast.
- `services/interop/Module.test.ts` — 1 removed, 0 left. `format: ... as any` → `as ExportModuleOutputFormat`.
- `services/interop/Module.ts` — 1 removed, 0 left. `format: '' as any` → `as ExportModuleOutputFormat`.
- `services/joplinCloudUtils.ts` — 1 removed, 0 left. `Action.payload?: any` → `string` (only ever holds errorMessage).
- `services/noteList/defaultMultiColumnsRenderer.ts` — 0 removed, 1 left. Reason updated (matches OnRenderNoteHandler which is `any` by design; props heterogeneous per renderer's itemProps).
- `services/noteList/renderTemplate.test.ts` — 1 removed, 0 left. `name: '…' as any` → `as ColumnName`.
- `services/noteList/renderViewProps.ts` — 1 removed, 0 left. `value: any` → `unknown` with inner narrowing casts.
- `services/ocr/OcrService.ts` — 1 removed, 0 left. `maintenanceTimer_: any` → `ReturnType<typeof shim.setInterval>`.
- `services/plugins/MenuController.ts` — 1 removed, 0 left. `store: any` → `PluginStore` (new exported alias from `ViewController`).
- `services/plugins/MenuItemController.ts` — 1 removed, 0 left. Same fix via `PluginStore`.
- `services/plugins/ToolbarButtonController.ts` — 1 removed, 0 left. Same fix via `PluginStore`.
- `services/plugins/ViewController.ts` — 3 removed, 1 left. Introduced exported `PluginStore = Store<any>` (state heterogeneous across desktop/mobile — `mainLayout` lives on AppState only); typed `store_`/`store`/`message`. `storeView` stays `any` (controllers index different view shapes).
- `services/plugins/Plugin.ts` — 4 removed, 0 left. Introduced exported `MessageListenerCallback = (message: unknown)=> Promise<unknown>`; typed `messageListener_`, `contentScriptMessageListeners_`, `emitMessage`, `onMessage`, `onContentScriptMessage`, `emitContentScriptMessage`.
- `services/plugins/RepositoryApi.ts` — 1 removed, 0 left. `(manifest as any)[field]` → `as const` tuple + direct indexing.
- `services/plugins/api/JoplinContentScripts.ts` — 1 removed, 0 left. `callback: any` → `MessageListenerCallback`.
- `services/plugins/api/JoplinInterop.ts` — 1 removed, 0 left. `...module as any` → spread + `format: module.format as ExportModuleOutputFormat`.
- `services/plugins/utils/loadContentScripts.ts` — 1 removed, 1 left. `postMessageHandler` now async returning `Promise<unknown>`. The `loadedModule.codeMirrorResources/codeMirrorOptions` access kept `as any` with updated reason — these properties are not on `ContentScriptModule`.
- `services/interop/InteropService_Importer_EnexToHtml.ts` — follow-up fix: `outputFormat: 'html'` → `ImportModuleOutputFormat.Html` (caused by ImportOptions tightening).

Files skipped entirely:
- `database-driver.ts` — `SelectResult = any` already tagged "Partial refactor"; out of scope.
- `file-api-driver-local.ts` — already tagged "Partial refactor".
- `services/interop/InteropService_Importer_Md_frontmatter.ts` — `parseRawYamlToFolderIcon` already tagged "The raw YAML output is untyped".
- `services/e2ee/ppk/RSA.node.ts` — already tagged "Workaround for incorrect types".
- `services/e2ee/types.ts` — already tagged "Partial refactor".
- `services/commands/ToolbarButtonUtils.ts` — already tagged "WhenClauseContext can be partial in tests".

Checkpoint 2 (2026-05-14): 1101 → 1053 (48 removed across ~25 files).

- `services/plugins/api/JoplinPlugins.ts` — 1 removed, 0 left. `require(_path): any` → `unknown` (stub).
- `services/plugins/utils/manifestFromObject.ts` — 1 removed, 0 left. `(o: any)` → `Record<string, unknown>`; PluginService.validateManifest now casts on the caller side.
- `services/plugins/utils/mapEventHandlersToIds.ts` — 0 removed, 1 left. Reason updated (recursive walker; tightening to `unknown` forces narrowing at every branch and recursive call).
- `services/plugins/utils/validatePluginPlatforms.test.ts` — 1 removed, 0 left. `platforms: any` → `unknown`; inner cast in call.
- `services/profileConfig/index.ts` — 1 removed, 0 left. Introduced local `MigratingProfile`/`MigratingProfileConfig` interfaces describing the v1→v2 transition.
- `services/rest/ApiResponse.ts` — 1 removed, 0 left. `body: any` → `unknown`.
- `services/rest/routes/auth.ts` — 1 removed, 0 left. `output: any` → inline `{ status: AuthTokenStatus; token?: string }`.
- `services/rest/routes/search.ts` — 1 removed, 0 left. Restructured to construct the options as a typed object literal; NotesForQueryOptions branch narrows the LoadOptions.fields union to string[].
- `services/rest/utils/defaultAction.ts` — 1 removed, 0 left. `getOneModel.options: any` → `LoadOptions`.
- `services/rest/utils/defaultLoadOptions.ts` — 1 removed, 0 left. Return → `LoadOptions`.
- `services/rest/utils/defaultSaveOptions.ts` — 1 removed, 0 left. Introduced exported `DefaultSaveOptions { userSideValidation; isNew?; autoTimestamp? }`; callers set `autoTimestamp` after construction.
- `services/search/SearchFilter.test.ts` — 1 removed, 0 left. `let engine: any` → `SearchEngine`.
- `services/sortOrder/PerFolderSortOrderService.ts` — 1 removed, 0 left. `event: any` → `{ value: string }`.
- `services/style/loadCssToTheme.ts` — 1 removed, 0 left. Removed `(f: any)` annotation — readDirStats returns typed Stat[].
- `services/synchronizer/ItemUploader.ts` — 1 removed, 0 left. `preUploadedItems_: Record<string, any>` → `Record<string, { error?: { message?; code? } }>`.
- `services/synchronizer/MigrationHandler.ts` — 1 removed, 0 left. `autoLockError: any` / `error: any` → `Error | null`.
- `services/synchronizer/gui/useSyncTargetUpgrade.ts` — 1 removed, 0 left. `error: any` → `Error | null`.
- `services/synchronizer/migrations/1.ts` and `2.ts` — 2 removed, 0 left. `api: any` → `FileApi`.
- `services/synchronizer/utils/handleConflictAction.ts` — 1 removed, 0 left. `remoteContent/local: any` → `BaseItemEntity`.
- `utils/ipc/types.ts` — 0 removed, 1 left. Reason updated (structural constraint can't express "args extend SerializableData[]" without index-signature errors).
- `utils/ipc/utils/mergeCallbacksAndSerializable.ts` — 1 removed, 0 left. `OnAfterCallbackCreated` callback typed properly.
- `utils/ipc/utils/separateCallbacksFromSerializable.test.ts` — 1 removed, 0 left. `as any[]` → `as string[]`.
- `file-api-driver.test.ts` — 1 removed, 0 left. Removed `(f: any)` from map; items typed already.
- `file-api.test.ts` — 1 removed, 0 left. `syncContext: any` → inferred from literal with `null as unknown` for cache fields.
- `ArrayUtils.ts` — 2 removed, 0 left. `mergeOverlappingIntervals` typed `[number, number][]`; one caller (`GotoAnything.tsx`) annotated its `indices` accordingly.
- `JoplinError.ts` — 2 removed, 0 left. Introduced exported `JoplinErrorCode = string | number | null`.
- `ObjectUtils.ts` — 2 removed, 0 left. `output: any` in `sortByValue` and `convertValuesToFunctions` → `Record<string, ...>` with final cast to the typed return type.
- `dom.ts` — 2 removed, 0 left. `isInsideContainer(node: any)` → `EventTarget | Node | null`; `waitForElement` made generic `<T extends HTMLElement>` returning `T | null`. One caller (`useRootElement.ts`) now uses the generic explicitly.
- `errorUtils.ts` — 2 removed, 0 left. Introduced local `WrapErrorInput` and `WrappedError` interfaces.
- `net-utils.ts` — 2 removed, 0 left. Introduced `TcpPortUsed { check(port): Promise<boolean> }`; `Record<string, any>` → `Record<string, string>` for headers.
- `models/utils/types.ts` — 2 removed, 0 left. `LoadOptions.whereParams: any[]` → `(string|number|boolean)[]`; `SaveOptions.oldItem: any` → `Record<string, unknown>`; added `SaveOptions.fields?: string[]` (used by `BaseModel.save` and at least one renameTag caller).
- `models/Alarm.ts` — 2 removed, 0 left. `selectAll` cast to `{ id: string }[]`; `makeNotification(alarm, note)` → `AlarmEntity`/`NoteEntity`.
- `models/Tag.ts` — 2 removed, 0 left. `searchAllWithNotes(options: any)` → `SearchOptions` (new exported interface in `BaseModel`); `save.options: any` → `SaveOptions`.
- `models/utils/readOnly.ts` — 2 removed, 0 left. `Folder: any` → `typeof import('../Folder').default`; `BaseItem: any` → `typeof import('../BaseItem').default`.
- `components/shared/config/config-shared.ts` — 1 removed, 1 left. `updateSettingValue.value: any` → `unknown`. The `setState` field is left `any` with a new reason — mirrors `React.Component.setState` (`Pick<S, K>`); narrowing breaks subclass `this` assignment to the interface in app-mobile's class-based ConfigScreen.
- `components/shared/config/plugins/useOnInstallHandler.ts` — 2 removed, 0 left. Both `setInstallingPluginIds((prev: any))` callbacks rely on the `React.Dispatch<SetStateAction<...>>` inferred type.
- `components/shared/reduxSharedMiddleware.ts` — 1 removed, 1 left. `sortNoteListTimeout: any` → `ReturnType<typeof shim.setTimeout>`; `store/_next` typed (`Store<State>`/`Dispatch`); `action: any` kept with new reason explaining the heterogeneous action union.
- New shared types: `BaseModel.SearchOptions`; `JoplinError.JoplinErrorCode`; `models/NoteResource.AssociatedResourceNote`; `services/plugins/ViewController.PluginStore`; `services/plugins/Plugin.MessageListenerCallback`; `services/rest/utils/defaultSaveOptions.DefaultSaveOptions`.

Follow-up edits in other packages (caused by lib tightenings):
- `app-desktop/gui/NoteListItem/utils/useRootElement.ts` — call `waitForElement<HTMLDivElement>(...)` explicitly.
- `app-desktop/plugins/GotoAnything.tsx` — annotated local `indices: [number, number][]`.

Checkpoint 3 (2026-05-14): 1053 → 1004 (49 removed).

Plugin-API files (mostly thanks to the new `PluginStore` / `MessageListenerCallback` aliases from checkpoint 1):
- `services/plugins/api/JoplinClipboard.ts` — 3 removed, 0 left. Local `ElectronClipboardLike` / `ElectronNativeImageLike` interfaces (electron module not available in non-desktop packages).
- `services/plugins/api/JoplinViews.ts` — 3 removed, 0 left. `implementation` now `BasePlatformImplementation.JoplinViews` (the actual sub-object passed in); `store` → `PluginStore`.
- `services/plugins/api/JoplinViewsDialogs.ts` — 3 removed, 0 left. Introduced `ShowOpenDialogOptions` in `BasePlatformImplementation`; tightened return to `string[] | null`.
- `services/plugins/api/JoplinViewsEditor.ts` — 4 removed, 0 left. `store` → `PluginStore`; `onMessage.callback: Function` → `MessageListenerCallback`; `postMessage.message: any` → `unknown`.
- `services/plugins/api/JoplinViewsPanels.ts` — 3 removed, 0 left. Same pattern (`PluginStore` / `MessageListenerCallback` / `unknown`).
- `services/plugins/api/JoplinViewsToolbarButtons.ts` — 3 removed, 0 left. `store` → `PluginStore`; deprecation cast typed.
- `services/plugins/api/JoplinViewsMenus.ts` — 4 removed, 0 left. `store` → `PluginStore`; deprecation casts typed.
- `services/plugins/api/JoplinViewsMenuItems.ts` — 4 removed, 0 left. Same.
- `services/plugins/api/JoplinSettings.ts` — 4 removed, 0 left. All four setting-value returns/inputs → `unknown`.
- `services/plugins/api/JoplinPlugins.ts` — already in batch 2.
- `services/plugins/api/Joplin.ts` — follow-up: cast `implementation.clipboard/.nativeImage` to the JoplinClipboard constructor parameter shapes.
- `services/plugins/BasePlatformImplementation.ts` — 4 removed, 0 left. Introduced `ShowOpenDialogOptions`; `clipboard`/`nativeImage`/`registerComponent` returns/params → `unknown`.
- `services/plugins/api/noteListType.ts` — 1 removed, 2 left. `OnChangeEvent.value: any` → `unknown`. `RenderNoteView` and `OnRenderNoteHandler.props` kept `any` with updated reasons (heterogeneous per-renderer shape).

Top-level lib files:
- `eventManager.ts` — 0 removed, 3 left. Reason updated on `filterEmit.object: any` (filter objects vary per filter name). Two `Partial refactor` reasons already in scope; no change.
- `hooks/useEventListener.ts` — 4 removed, 0 left. Introduced local `EventHandler = (event: Event) => void`; typed `element` as `RefObject<EventTarget | null>` (type-only import from react).
- `services/AlarmService.ts` — 3 removed, 0 left. Introduced exported `AlarmServiceDriver` interface; `updateNoteNotification.noteOrId` typed `NoteEntity | string`.
- `models/Alarm.ts` — follow-up: `selectAll` cast updated to `{ id: number }[]` (alarm IDs are integers, unlike note IDs); `batchDelete` call now casts the resulting `number[]` (the function's signature accepts `string[]` for note-style IDs).
- `services/KvStore.ts` — 4 removed, 0 left. Introduced `JoplinDatabase` and `MutexInterface` imports for typed fields; `formatValues_` callers cast the `Row[]` results to `KvStoreKeyValue[]`.

Checkpoint 4 (2026-05-14): 1004 → 977 (27 removed).

- `TaskQueue.ts` — 3 removed, 0 left. `TaskCallback`/`TaskResult.result`/`completeTask.result` → `unknown`.
- `HtmlToMd.ts` — 3 removed, 0 left. `turndownOpts: any` → `Record<string, unknown>`; `blankReplacement`/`replacement` callbacks typed with `HTMLElement`.
- `InMemoryCache.ts` — 3 removed, 0 left. `Record.value`/`value()`/`setValue()` → `unknown`.
- `SyncTargetOneDrive.ts` — 2 removed, 1 left. `api_: any` → `OneDriveApi`; `(a: any)` → `unknown`. Left the inherited `db/options` constructor params (BaseSyncTarget still uses `any` there).
- `htmlUtils.ts` — 3 removed, 5 left (4 of the 5 are existing `ban-types` Function disables and now-typed callbacks via new `ReplaceUrlCallback` / `ProcessImageTagCallback` aliases). `attributesHtml.attr: any` → `Record<string, string>`; `headAndBodyHtml.doc: any` → `Document`. One test (`htmlUtils2.test.ts`) gets a typed cast. The `Function`-typed `processImageTags`/`replaceImageUrls`/`replaceEmbedUrls`/`replaceMediaUrls` callbacks are now typed via new aliases — the ban-types disables go away with the explicit-any ones.
- `downloadController.ts` — 3 removed, 0 left. Introduced local `DownloadRequest` / `DownloadChunk` interfaces.
- `services/interop/InteropService_Exporter_Base.ts` — 3 removed, 1 left. `prepareForProcessingItemType.itemsToExport: any[]` → `BaseItemEntity[]`; `processItem.item: any` → `BaseItemEntity`; `processResource.resource: any` → `ResourceEntity`; `updateContext.context: any` → `object`. The `context_` field stays `any` with updated reason — shape is exporter-specific (Html has `cssStrings/customAssets`, Md has `noteTags/tagTitles`) and indexed dynamically by subclasses.
- `services/interop/InteropService_Exporter_Jex.ts` — 3 removed, 0 left. `processItem`/`processResource` now match the tightened base; `readDirStats.filter/map` callbacks no longer need a cast.
- `services/interop/InteropService_Exporter_Html.ts` — 3 removed, 0 left. `style_: any` → `ThemeStyle`; `init.options: any` → `ExportOptions`; `processItem.item: any` → `NoteEntity`.

Follow-up: `htmlUtils2.test.ts` typed cast; `app-desktop/.../resourceHandling.ts` doesn't need changes (return type of its `replaceImageUrls` callback is `void`, which `ReplaceUrlCallback` now allows).

Checkpoint 5 (2026-05-14): 977 → 965 (12 removed across a handful of larger files).

- `services/share/ShareService.ts` — 4 removed, 0 left. `formatShareInvitations.invitations: any[]` → typed shape using `ShareInvitation`/`MasterKeyEntity`; `store_: Store<any>` → `Store<unknown>`; `state` getter narrows via `as Record<string, unknown>`.
- `services/ExternalEditWatcher.ts` — 5 removed, 3 left. Introduced local `DispatchFn`/`BridgeFn`; `eventEmitter_` typed via `EventEmitter` (switched to ES import). `chokidar_`/`watcher_` stay `any` with a single shared reason (chokidar typings vary across platforms; we use a small subset structurally). `on`/`off` callbacks stay `any` with reason (EventEmitter payloads vary per event name; per-event union would require touching every caller).
- `theme.ts` — 2 removed, 1 left. `cachedStyles_` shape typed (`themeId`, indexed `styles` record); `buildStyle.cacheKey: any` → `string | (string | number)[]`. `BuildStyleCallback` return stays `any` (heterogeneous: CSSProperties, styled-components objects, plain CSS strings).
- `services/share/reducer.ts` — 2 removed, 1 left. `parseShareCache.raw: any` → `Partial<State>`. The reducer's `action: any` keeps a reason about heterogeneous SHARE_* action shapes. `(draft.shareUsers as any)` cast removed.
- `services/interop/types.ts` — 2 removed, 1 left. `ImportOptions.destinationFolder: any` → `FolderEntity`; `onError: (error: any)` → `Error`. `onProgress` stays `any` with reason — Importer/Exporter share this options bag, export side passes ExportProgressState here.
- `services/plugins/PluginService.ts` — 3 removed, 2 left. `loadManifestToObject(path): Promise<any>` → `Promise<Record<string, unknown>>`; `plugin dispatch` action typed via `Plugin.PluginDispatchCallback`; `readDirStats` filter/map untyped. The `store_` and `platformImplementation_` fields stay `any` with reason — test fixtures across app-cli/app-mobile pass partial shapes (`{ joplin: {} }`, `{ dispatch, getState }`) that the strict interfaces don't accept.
- `services/plugins/Plugin.ts` — 2 removed, 0 left. Introduced exported `PluginDispatchCallback`; `dispatch_`/constructor `dispatch` parameter typed; `eventEmitter_: any` → `InstanceType<typeof EventEmitter>`.

Checkpoint 6 (2026-05-14): 965 → 949 (16 removed).

- `services/rest/utils/collectionToPaginatedResults.ts` — 3 removed, 1 left. `items` callbacks and sort comparator typed; the outer `items: any[]` stays with a new reason — callers pass entity types (NoteEntity, FolderEntity) without index signatures.
- `services/plugins/api/JoplinImaging.ts` — 4 removed, 0 left. Introduced local `NativeImageLike` interface (toPNG/toJPEG/resize/crop/getSize); `cacheImage` and `Image.data` typed; `toJpgResource`/`toPngResource.resourceProps` → `Partial<ResourceEntity>`.
- `testing/syncTargetUtils.ts` — 4 removed, 0 left. Introduced local `TestDataNode` / `TestData` types for the recursive test data structure.
- `time.ts` — 5 removed, 1 left. `formatLocalToMs`/`anythingToDateTime`/`anythingToMs`/`goBackInTime`/`goForwardInTime` typed using `string | number | Date | { toDate }` unions; added type-only `MomentTypes` import for `unitOfTime` namespace. `msleep` switched from `Promise((resolve: Function))` to `Promise<void>(resolve => ...)` (removes the ban-types disable too).

Checkpoint 7 (2026-05-14): 949 → 929 (20 removed).

- `services/plugins/api/JoplinWorkspace.ts` — 4 removed, 2 left. `store` → `PluginStore`; `onNoteChange` wrapper event typed; `selectedNote(): Promise<any>` → `Promise<NoteEntity | null>`. Two left (one is "No plugin-api-accessible Note type defined" reason already; one is the `Function` ban-types in `onNoteSelectionChange`).
- `services/PostMessageService.ts` — 4 removed, 1 left. `MessageResponse.response/.error` → `unknown` / `Error | null`; `Message.content` and `sendResponse.responseContent` → `unknown`. `ViewMessageHandler` left `any` with updated reason — callers register handlers with concrete payload types (MessageResponse, SerializableData); making this generic would force changes at every dispatch site.
- `locale.ts` — 5 removed, 0 left. `supportedLocales_` typed `Record<string, Record<string, string[]>>`; `localeStats_` typed `Record<string, Record<string, unknown>>` (per-locale stats include pluralForms function); `_/_n/stringByLocale` rest args → `unknown[]`. Single inner cast `as ParsePluralFormFunction` for the plural-forms field.
- `services/plugins/reducer.ts` — 3 removed, 2 left. `(view as any)` casts on `PLUGIN_VIEW_PROP_SET`/`_PUSH` → `as unknown as Record<string, unknown[]>` etc. The reducer's `action: any` keeps a reason (heterogeneous PLUGIN_* action shapes). `viewsByType` returns `any[]` with reason (menu views have menuItems not on PluginViewState).
- `JoplinDatabase.ts` — 4 removed, 2 left. `TableField.default: any` → `string | number | boolean | null`; `tableDescriptions_: any` → `Record<string, Record<string, string>>`; `open.options: any` → `Record<string, unknown>`; `tableFields.options: any` → `{ includeDescription?: boolean }`; `createDefaultRow.row: any` → `Record<string, unknown>`. `constructor(driver: any)` kept with reason — base Database.driver is `any` across multiple driver implementations (sqlite/better-sqlite3/web).

Checkpoint 8 (2026-05-14): 929 → 886 (43 removed).

- `models/utils/paginatedFeed.ts` — 2 removed, 1 left. `db: any` → `JoplinDatabase`; `WhereQuery.params` → `(string|number|boolean)[]`. The `items: any[]` stays with new reason (callers receive Note/Folder/Resource entities without index signatures).
- `models/settings/settingValidations.ts` — 2 removed, 1 left. `validateSetting.oldValue/newValue`, `newValues` typed `unknown` / `Record<string, unknown>`. The `ValidationHandler` type alias keeps `any` with a new reason — settings are heterogeneous; each validator narrows from this base.
- `services/DecryptionWorker.ts` — 5 removed, 0 left. Introduced local `DecryptionWorkerStartOptions` interface; `dispatchReport.report: any` → `Record<string, unknown>`; `dispatch: Function` → `(action: { type; ... })`; `on`/`off` callbacks updated reasons (heterogeneous payloads by event name).
- `models/Folder.test.ts` — 3 removed, 0 left. `foldersById: any` → `Record<string, FolderEntity & { note_count?: number }>`.
- `services/search/SearchEngineUtils.test.ts` — 3 removed, 0 left. `searchEngine: any` → `SearchEngine`; `options: any` → `NotesForQueryOptions`.
- `services/search/SearchEngine.test.ts` — 4 removed, 0 left. Introduced local `ExpectedTerms` interface; helper `extractValue` narrows `string | { value: string }`.
- `services/share/ShareService.test.ts` — 5 removed, 0 left. `extraExecHandlers` callbacks typed; per-handler body casts to specific shapes; `Function` ban-types disable goes away with the explicit-any ones.
- `services/ExternalEditWatcher/utils.ts` — 4 removed, 0 left. `spawnCommand.options: any` → `SpawnOptions` from `child_process`; `wrapError.error: any` → `Error | null`; `subProcess.on('error')` callback typed `Error`; introduced local `ExternalBridge { openItem }` interface.
- `services/interop/InteropService_Importer_Raw.ts` — 4 removed, 0 left. `itemIdMap/createdResources: any` → `Record<string, string>` / `Record<string, ResourceEntity>`; `folderExists.stats: any[]` → `Stat[]`; `defaultFolder_: any` → `FolderEntity | null`.
- `services/plugins/ViewController.ts` — 2 removed, 2 left. `emitMessage` returns `Promise<unknown>`, `postMessage.message: any` → `unknown`. The other two disables (Store state heterogeneous; storeView shape varies) keep updated reasons.
- `services/spellChecker/SpellCheckerService.ts` — 2 removed, 2 left. Removed `(a: any, b: any) => ...` sort callbacks (already-typed array items work). Two stay with updated reasons (Electron MenuItemConstructorOptions union not imported in lib).
- `services/WhenClause.ts` — 6 removed, 0 left. `AdvancedExpression.subExpressions: any` → `Record<string, string>`; `evaluate`/`validate.context: any` → `object` (matches existing callers that pass `WhenClauseContext`); `createContext.getValue` uses generic `<T>` to match `IContext.getValue<T>`.
- `services/plugins/api/JoplinData.ts` — 6 removed, 0 left. `api_: any` → `Api`; `serializeApiBody.body: any` → `unknown`; route calls typed with `RequestMethod` enum and `RequestFile[]`.

Checkpoint 9 (2026-05-14): 886 → 829 (57 removed).

- `models/settings/types.ts` — 3 removed, 3 left. `value: any` keeps a new reason (settings heterogeneous, each consumer narrows); `options/show` left `any` with reasons (varying per setting/heterogeneous setting access). `unitLabel/filter` left where parameters are contravariant per-setting.
- `services/plugins/utils/executeSandboxCall.ts` — 4 removed, 2 left. `EventHandler.args: any[]` → `unknown[]`; nested `args: any[]` → `unknown[]`. Recursive walker `arg` and dotted-path `parent/fn` left `any` with new reasons (heterogeneous sandbox object shape).
- `services/interop/InteropService_Exporter_Custom.ts` — 5 removed, 1 left. Each `CustomImporter` method typed: `context: ExportContext`, `item: BaseItemEntity`, `resource: ResourceEntity`.
- `services/debug/populateDatabase.ts` — 6 removed, 0 left. `randomIndex/randomElement/randomElements` made generic `<T>`; `db: any` → `JoplinDatabase & { clearForTesting }`; `folder/note: any` → `FolderEntity` / `NoteEntity`.
- `database-driver-better-sqlite.ts` — 6 removed, 0 left. Introduced local `BetterSqliteDatabase` / `PreparedStatement` / `SqliteError` / `WrappedError` / `SqlParams` types.
- `fs-driver-base.ts` — 5 removed, 3 left. Introduced exported `FileHandle = unknown` (drivers use different concrete shapes) and `TarOptions { strict?, portable?, file, cwd }`. `appendFile/open/close/readFileChunk*` typed. `ReadDirStatsOptions.recursive` made optional. `readFile` stays `any` with reason — widening to `string|Buffer` cascades broken call sites across many lib files.
- `fs-driver-node.ts` — 9 removed, 0 left. Introduced `FsError`/`WrappedFsError`; `fsErrorToJsError_`, `setTimestamp`, `readDirStats`, `open`, `close`, `readFileChunk`, `tarExtract`, `tarCreate` typed.
- `services/AlarmServiceDriverNode.ts` — 7 removed, 0 left. Introduced `StoredNotification` (extends Notification with timeoutId); `notifications_/service_/setService` typed; `displayDefault/electron` notification options typed with proper interface; `notifier.notify` callback typed.
- `services/plugins/WebviewController.ts` — 6 removed, 3 left. Introduced local `LayoutItem` for `findItemByKey`; `CloseResponse.resolve/reject` typed; `messageListener_/onMessage` use `MessageListenerCallback`; `store` → `PluginStore`; `postMessage/setStoreProp` value typed `unknown`.
- `registry.ts` — 9 removed, 2 left. Various private fields typed (`scheduleSyncId_`/`recurrentSyncId_`/`db_`/`showErrorMessageBoxHandler_`); `setShowErrorMessageBoxHandler`/`setDb`/`saveContextHandler` typed; `promiseResolve` typed. `syncTargets_/scheduleSync.syncOptions` keep `any` with reasons (heterogeneous sync target API and Synchronizer.start options).
- Side fix: `app-cli/app/command-apidoc.ts` — cast `tableFields` to `MarkdownTableRow[]` (now that `TableField` no longer has an index signature compatible with MarkdownTableRow).

Checkpoint 10 (2026-05-14): 829 → 816 (13 removed).

- `services/UndoRedoService.ts` — 8 removed, 2 left. `UndoQueue.inner_` and methods → `unknown`; `state/redoState/undoState/push.state/schedulePush.state` → `unknown`; `dispatch: Function` removed (no usage). Two `on`/`off` callbacks stay `any` with reason (EventEmitter payloads vary). Follow-up in `app-mobile/.../Note.tsx` casts the undo state to its concrete shape.
- `JoplinServerApi.ts` — 5 removed, 3 left. `connectionErrorMessage.error` → `Error | null`; `requestToCurl_.options` typed inline; `exec/exec_.query/headers` typed `Record<string, unknown>` / `Record<string, string>`; `responseJson_` → `Record<string, unknown>`. Three stay with reasons — `body` and `fetchOptions.body` flow through `shim.fetch/fetchBlob/uploadBlob` (FetchOptions) which type body as `string`; `hidePasswords` accepts both stringified bodies and header records; `response` is the shim/blob return.
- `services/ResourceFetcher.ts` — 9 removed, 4 left. `dispatch: Function` typed via the action shape; `queue_/autoAddResourcesCalls_` typed; timer IDs typed via `ReturnType<typeof shim.setTimeout>`; `on`/`off` reasons updated; the `as any` cast on `notifyDisabledSyncItems` callback replaced with a typed adapter. Four stay with reasons (`fetchingItems_` mixed bool/Entity; `fileApi_/setFileApi/constructor` widened for test mocks).

Checkpoint 11 (2026-05-14): 816 → 805 (11 removed).

- `services/RevisionService.ts` — 7 removed, 0 left. `changedSinceCollectionCache_`/`maintenanceCalls_`/`maintenanceTimer1_`/`maintenanceTimer2_` typed; `noteMetadata_.md` → `Record<string, unknown>`; `output.type_` cast uses `NoteEntity & { type_? }`.
- `BaseSyncTarget.ts` — 8 removed, 2 left. `dispatch: Function` typed via action shape; `initState_/options_` typed; `option`/`unsupportedPlatforms`/`checkConfig` typed. Two stay (`db_/fileApi_/constructor.db/setFileApi.v/initFileApi`) with reasons — sync target subclasses each pass concrete shapes (FileApi subclasses, FileApiOptions) so tightening here forces every subclass to match.

Checkpoint 12 (2026-05-14): 805 → 789 (16 removed).

- `models/Resource.ts` — 9 removed, 0 left. `fsDriver_: any` → `FsDriverBase`; `fetchStatuses` return → typed shape; `markupTag.resource` typed `ResourceEntity & { alt? }`; `localState`/`setLocalStateQueries`/`setLocalState.resourceOrId` → `ResourceEntity | string`; `itemCanBeEncrypted` cast uses `Parameters<...>`; `params: any[]` → `(string|number)[]`; `resourceConflictFolder` return type inferred.
- `models/Folder.ts` — 7 removed, 0 left. `fieldsToLabels: any` → `Record<string, string>`; `tableNameToClasses: Record<string, any>` → `Record<string, typeof BaseItem>` (2 places); `handleTitleNaturalSorting.options` typed; `allAsTree.options` → `FolderLoadOptions & { includeNotes? }`; `idToFolders.any` → `FolderEntityWithChildren`; `save.options: any` → `SaveOptions & {duplicateCheck?, reservedTitleCheck?, stripLeftSlashes?}`.

Checkpoint 13 (2026-05-14): 789 → 777 (12 removed).

- `WebDavApi.ts` — 4 removed, 5 left. `RequestInfo.options` typed via `FetchOptions & ...`; `_requestToCurl.options` typed; `serializeRequest` callback body uses `Record<string, unknown>`. Five remain with updated reasons (xml2js heterogeneous output, url-parse Url shape, JsonValue alias, fetchOptions/response are platform-specific shapes via shim).
- `file-api.ts` — 8 removed, 5 left. `RemoteItem.isDir` added (used by list filter); `requestCanBeRepeated.error` typed; `tryAndRepeat` made generic `<T>` with `Function`→`()=> T|Promise<T>`; `list` filter callbacks typed; `put.content: any` → `string | Buffer | null`; `multiPut.options: any` → `{ source? }`; introduced `BasicDeltaContext` and typed the helper; `getDirStatFn: Function` → `(path) => ItemStat[]|Promise<ItemStat[]>`; sort/map callbacks typed. Five stay with reasons: `RemoteItem.jopItem`, `PaginatedList.context`, `driver_`, constructor `driver`, and the `output: any[]` mixed array of ItemStat + deleted-items.

Checkpoint 14 (2026-05-14): 777 → 756 (21 removed).

- `services/ResourceEditWatcher/index.ts` — 10 removed, 3 left. `logger_/dispatch` typed; `eventEmitter_` typed `InstanceType<typeof EventEmitter>` with proper ES import; `externalApi.openAndWatch/watch/stopWatching/isWatched` callbacks typed `{ resourceId: string }`; watcher 'all'/'raw' event handlers typed. Three remain with reasons (chokidar typings vary across platforms; on/off heterogeneous events).
- `file-api-driver-joplinServer.ts` — 11 removed, 0 left. Typed `metadataToStat_`/`metadataToStats_` arguments; introduced `RemoteItem` return type (added `id: ''` to satisfy the interface); typed `delta`/`list`/`get`/`put`/`multiPut` options via `ExecOptions` from JoplinServerApi; typed `isRejectedBySyncTargetError`/`isReadyOnlyError.error`; typed `Object.entries<...>` response shape. Also caught a typo: `response.has_more` → `response.hasMore` (the returned object actually exposes `hasMore`).

Checkpoint 15 (2026-05-14): 756 → 732 (24 removed).

- `ClipperServer.ts` — 11 removed, 2 left. Introduced local `ClipperDispatch` alias for the dispatch field; `server_` typed `http.Server & { destroy? }` (server-destroy adds `.destroy` at runtime); all request/response handler callbacks typed via `IncomingMessage`/`ServerResponse`; `writeCorsHeaders`/`writeResponseJson`/`writeResponseText`/`writeResponseInstance`/`writeResponse`/`execRequest` typed; `multiparty.Form.parse` callback typed; `request.on('data')` typed `Buffer | string`. Two stay with reasons (`actionApi` shape varies, the Api `route` method parameter cast).
- `testing/test-utils.ts` — 13 removed, 2 left. Typed `switchClient`/`setupDatabase`/`setupDatabaseAndSynchronizer` options bag; introduced `FolderTreeNode` for `createFolderTree`; `objectsEqual` → `Record<string, unknown>`; `checkThrowAsync`/`expectThrow`/`expectNotThrow`/`checkThrow` → function signatures; `id`/`ids`/`sortedIds` → `{ id?: string }`; `at<T>` made generic; `createNTestNotes.folder` → `FolderEntity`; `middlewareCalls_: any[]` → `boolean[]`; `start.argv` → `string[]`. Two stay (`synchronizerStart.extraOptions` and `generalMiddleware` — Synchronizer.start signature and BaseApplication.generalMiddleware override force `any`).

Checkpoint 16 (2026-05-14): 732 → 700 (32 removed).

- `file-api-driver-memory.ts` — 6 removed, 0 left. Introduced local `MemoryItem` interface for `items_`/`deletedItems_`; `encodeContent_`/`decodeContent_` typed `string | Buffer` / `string`; `setTimestamp` return `Promise<void>`; `get`/`put`/`multiPut`/`delta` options typed via `GetOptions`/`PutOptions`/`DeltaOptions`; `multiPut.output` typed.
- `eventManager.ts` — 4 removed, 0 left. `AppStateChangeCallback` made generic `<T>`; `FilterHandler` made generic `<T>` (matches plugin api/types `FilterHandler<T>`); `filterEmit`/`filterOn`/`filterOff`/`appStateOn`/`appStateOff` all generic with internal `unknown`-cast for storage; `stateValue_` uses `Record<string, unknown>` instead of `any`.
- `markdownUtils.ts` — 1 removed, 0 left. `prependBaseUrl` replace callback `_match: any` → `string`.
- `utils/focusHandler.ts` — 2 removed, 0 left. Adopted `unknown` for `element` arg with a `MaybeFocusable` cast inside `toggleFocus` so the runtime `typeof` check narrows the call. Many call sites pass things like `Element`/`EventTarget`/`EditorView` that have only `focus`, so any typed interface would have rejected them.
- `utils/joplinCloud/index.ts` — 2 removed, 0 left. Extended `PlanFeature` with missing `basicInfo/proInfo/teamsInfo/joplinServerBusinessInfo*` keys (used at call sites but undeclared); `getFeatureLabel`/`getCellInfo` use `keyof PlanFeature` indexing with `typeof v === 'string'` guards.
- `utils/frontMatter.ts` — 3 removed, 0 left. `toLowerCase` → `Record<string, unknown>`; `parse` added local `asString`/`asNumber` coercion helpers since `yaml.load` returns `unknown`-shaped values; `'tags' in md` check now also requires `Array.isArray` before assigning.
- `utils/ipc/RemoteMessenger.ts` — 9 removed, 0 left. Replaced ambient `FinalizationRegistry` constructor/register `any` with `(id: string)=> void` and `object`; Proxy `get` returns `unknown`; `canRemoteAccessProperty.parentObject`/`trackCallbackFinalization.callback`/`methodFromPath` parent/current/stack typed `unknown` with narrowing `Record<string, unknown>` casts where indexing is required.
- `file-api-driver-local.ts` — 1 removed, 0 left. `fsErrorToJsError_.output` typed `Error & { code?: JoplinError['code'] }` instead of `any`.
- `SyncTargetOneDrive.ts` — 1 removed, 0 left. Constructor `options: any` → `Record<string, unknown>` (matches BaseSyncTarget); `db: any` keeps reason via `// eslint-disable-next-line` referencing BaseSyncTarget.
- `file-api.ts` — 1 removed, 0 left. Introduced `ListOptions` interface ({ includeHidden?, includeDirs?, syncItemsOnly?, context? }); `FileApi.list.options: any` → `ListOptions`.
- `database-driver.ts` — 1 removed, 0 left. `SelectResult = any` → `unknown` with a comment explaining narrowing happens at the model layer.
- `database.ts` — 1 removed, 8 left with updated reasons. Tried widening `Row`/`selectAllFields`/`open`/`insertQuery`/`updateQuery`/`formatValue` to `unknown` but each cascaded into many downstream errors across `JoplinDatabase`, `models/*`, `services/KvStore`, `services/RevisionService`, etc. (typically requiring index-signature errors, or explicit narrowing for already-extant column accesses). Reverted to `any` with descriptive reasons. The one removed was `enumId` using `(this as unknown as Record<string, number>)` for the dynamic `TYPE_*` lookup. `wrapQueries`/`wrapQuery` were already widened safely (`(string | SqlQuery | [string, SqlParams?])[]`).
- `services/synchronizer/syncInfoUtils.ts` — 9 removed, 1 left. `masterKeys`/`masterKeyMap` typed `MasterKeyEntity[]`/`Record<string, MasterKeyEntity>`; `fetchSyncInfo.output: any` → `{ version: number; [k: string]: unknown }`; `toObject` return type inferred; `setWithTimestamp`/`keyTimestamp`/`setKeyTimestamp` all use `(this as unknown as Record<...>)` casts. The `load.s: any` stays — JSON parse output varies per sync target version and is validated per-field via `'x' in s` checks below.

Checkpoint 17 (2026-05-14): 700 → 681 (19 removed).

- `services/CommandService.ts` — 5 removed, 7 left. `CommandContext.dispatch: Function` kept (acts as a variance escape hatch — desktop runtimes type dispatch more strictly via `DesktopCommandContext`). `ReduxStore` simplified to `type ReduxStore = any` with a reason — tests and platforms pass partials and add subscribe etc. `scheduleExecute.args: any` → `unknown`. `componentUnregisterCommands.commands` kept `ComponentCommandSpec<any>` with updated reason. `CommandRuntime.execute` and `Api.execute` kept `any` with updated reasons (per-command/per-route shapes). `createContext.dispatch.action` typed `unknown`.
- `services/rest/Api.ts` — 7 removed, 5 left. `Request.params: any[]` → `string[]`; `Request.action?: any` → `string`. `RequestContext.dispatch: Function` → typed dispatch. `RouteFunction` reason updated. `Api.token_: string | Function` → `string | (()=> string)`; `knownNounces_: any` → `Record<string, string>`; `dispatch_: Function` → typed dispatch. Constructor and private `dispatch` typed. `actionApi_` stays `any` with reason. `execServiceActionFromRequest_.externalApi: any` → typed. `Request.body`/`bodyJson_`/`bodyJson`/`Api.route` keep `any` with route-specific reasons.
- `services/interop/InteropService.ts` — 4 removed, 2 left. `eventEmitter_: any` → `EventEmitter` (changed `require` → ES `import { EventEmitter } from 'events'`); `on/off.callback: Function` → typed; `context: any` → `{ resourcePaths; destResourcePaths?; notePaths? }`. `normalizeItemForExport` made generic `<T extends Record<string, unknown>>`; `override: any` → `Partial<{ is_shared; share_id }>`. `itemsToExport: any[]`/`queueExportItem.itemOrId: any` kept `any` with updated reasons (mirror exporter signatures across all subclasses; structural { type, itemOrId }).
- `services/interop/InteropService_Exporter_Md.ts` — 5 removed, 1 left. `makeDirPath_.item` → `NoteEntity | FolderEntity`; `replaceLinkedItemIdsByRelativePaths_.item` → `NoteEntity`; `replaceItemIdsByRelativePaths_.paths/fn_createRelativePath` typed; `prepareForProcessingItemType` context inner type narrowed; `processItem.item` → `NoteEntity | FolderEntity`. The outer `prepareForProcessingItemType.itemsToExport: any[]` stays with reason matching InteropService.

Checkpoint 18 (2026-05-14): 681 → 620 (61 removed).

- `services/interop/InteropService_Exporter_Md.test.ts` — 21 removed, 0 left. The same `itemsToExport: any[]` / `queueExportItem` boilerplate appeared 10 times; replaced all with `const { items: itemsToExport, queue: queueExportItem } = createExportItems();` (the helper already existed at the top of the file). One inline `context: any` → typed shape. Resource.load call sites cast `itemOrId as string`.
- `services/interop/InteropService.test.ts` — 11 removed, 0 left. `fieldsEqual` made generic `<T extends object>`; `Item.object: any` → `unknown`; export callback signatures typed via `BaseItemEntity`/`ResourceEntity`; `Folder.all` result typed; `result: any` typed inline; `format: 'testing' as any` → `as ExportModuleOutputFormat`.
- `services/synchronizer/synchronizer_MigrationHandler.test.ts` — 10 removed, 0 left. `MigrationTests.[key]: Function` → `()=> Promise<void>`; the 10 `items.filter((i: any) => ...)` callbacks rely on RemoteItem inference now.
- `services/synchronizer/ItemUploader.test.ts` — 6 removed, 0 left. Introduced `MultiPutItem` / `MultiPutResult` / `ItemBodyCallback` aliases; `ApiCall.args: any[]` → `unknown[]`; `clearArray` made generic; `newFakeApi`/`newFakeApiCall` typed; the `args[0].length` accesses now cast via `MultiPutItem[]`.
- `services/rest/routes/notes.ts` — 13 removed, 0 left. Introduced `Stylesheet`, `ImageSize`, exported `ImageSizes`. `htmlToMdParser_` → `HtmlToMd`; `RequestNote.id: any` → `string`, `anchor_names: any[]` → `string[]`, `stylesheets: any` → `Stylesheet[]`, `image_sizes` → `ImageSizes`. `requestNoteToNote.output: any` → `NoteEntity`. `tryToGuessExtFromMimeType.response: any` → headers shape. `replaceUrlsByResources.imageSizes` typed; the replace callback `_match: any` → `string`. `attachImageFromDataUrl.note: any` → `NoteEntity`, `cropRect: any` typed. `extractNoteFromHTML.imageSizes` typed.

Checkpoint 19 (2026-05-14): 620 → 574 (46 removed).

- `models/settings/builtInMetadata.ts` — 28 removed, 0 left. The 20 `show: (settings: any)` callbacks all inherit the type from `SettingItem.show?(settings: any)`; dropping the explicit annotation removes the disable comments while keeping the interface as-is. `themeOptions` / multiple `options()` callbacks `: any` → `Record<string|number, string>`; `filter: (value: any)` → infers from interface; `'notes.sharedSortOrder'` value cast to `Record<string, unknown>`. Side fix: `services/sortOrder/PerFolderSortOrderService.ts` widens the read-back to `{ field?: string; reverse?: boolean } & Record<...>`.
- `Synchronizer.ts` — 18 removed, 4 left. Introduced local `ProgressReport` interface (`errors`, `state?`, `startTime?`, `completedTime?`, counter index signature) typed across `progressReport_`/`reportHasErrors`/`completionTime`/`reportToLines`/`logSyncSummary`. `isCannotSyncError.error: any` typed; `downloadQueue_: any` → `TaskQueue` (constructor now passes logger via TaskQueue's second arg instead of mutating a private field); `setEncryptionService.v: any` → `EncryptionService`; `logSyncOperation.local` typed `{ id?, path?, type_? }`. Several lambda callbacks typed: `startAutoLockRefresh.error: any` → `Error`; `result.items.filter((it: any))` infers from itemsThatNeedSync. `local = resource as any` → cast through `typeof local`. `(action: any) => dispatch(action)` typings dropped (infer). Four stay with reasons: `apiCall` dispatch by name (FileApi heterogeneous methods), `start.options: any` (caller bag), `handleCannotSyncItem.item: any` (BaseItem.saveSyncDisabled), and the BaseItem.save `options` bag during DELTA. Side fix: `cancel()` now uses `void this.downloadQueue_.stop()` (was already an awaitable promise but unmarked).

Checkpoint 20 (2026-05-14): 574 → 539 (35 removed).

- `models/Setting.ts` — 17 removed, 7 left. `appType: 'SET_ME' as any` → `as AppType`; `saveTimeoutId_/changeEventTimeoutId_: any` → `ReturnType<typeof shim.setTimeout>`; `rows.map((r: any))` typed inline; `toPlainObject.keyToValues: any` → `Record<string, unknown>`; `incValue.inc: any` → `number`; `setArrayValue.settingValue: any[]` → `string[]`; `objectValue/setObjectValue.value: any` → `unknown`; `enumOptionLabel/isAllowedEnumOption.value: any` → `unknown`/`string`; `subValues.output: any` → `Record<string, unknown>`; `groupMetadatasBySections.{generalSection,nameToSections}: any` → `SettingMetadataSection`/`Record<string, SettingMetadataSection>`. The 7 that stay (with reasons): `SettingValueType` fallback, `CacheItem.value`, `keychainService_` and its setter (concrete class in app-desktop/app-mobile), `valueToString`/`formatValue` (heterogeneous values per setting type), and the `constants_` lookup in `value()`. Side fix: `markupLanguageUtils.ts` now coerces with `!!` for `pluginOptions.enabled`.
- `models/Note.ts` — 11 removed, 13 left. `PreviewsOptions.conditionsParams: any[]` → `(string|number|boolean)[]`; `geolocationCache_/dueDateObjects_: any` → typed shapes. `linkedItemIds.links` typed `{ itemId: string }[]`. `replaceResource{Internal,External}ToInternalLinks.options: any` → `{ useAbsolutePaths? }`. `sortNotes.orders: any[]` → `{ by: string; dir: string }[]`; `noteFieldComp` made generic; sort prop access typed `string|number|boolean`. `previewFields.options: any` → `{ includeTimestamps? }`. `loadFolderNoteByField.value: any` → `string|number|boolean`. `preview.options: any` → `{ fields?: string|string[]; excludeConflicts? }`. Introduced `DuplicateOptions` for `duplicateMultipleNotes`/`duplicate`. The 13 that stay are mostly around the dynamic `(newNote as any)[field]` patterns retained as `Record<string, unknown>` casts and `search.options` forwarding to BaseItem.search. Side fixes: `models/Note.test.ts` testCases typed `[boolean, string, string][]`.

Checkpoint 21 (2026-05-14): 539 → 506 (33 removed).

- `shim.ts` — 11 removed, 25 left. `msleep_` resolver typed `Promise<void>` (no Function). `isElectron` window/process casts use structural types instead of `any`. `fetchRequestCanBeRetried.error: any` → `{ code?, message? }`. `fetchText.options` → `FetchOptions`. `fetchBlob/uploadBlob/imageFromDataUrl` keep `any` with descriptive reasons. Throwing stub methods now have concrete return types where unambiguous (`stringByteLength: number`, `appVersion: string`, `pathRelativeToCwd: string`, `writeImageToFile.format: string`, `setReact/setReactDom` typed via `typeof React`). Several stay `any` for genuine cross-platform polymorphism: `Geolocation`, `electronBridge_`, `fsDriver_`, `httpAgent_`, `proxyAgent`, `nodeSqlite_`, `sjclModule`, the node datagram module, `requireDynamic`, `fetchWithRetry.fetchFn`, `setTimeout/setInterval` return types, `openUrl` (boolean vs Promise), `readLocalFileBase64` (string vs Promise).
- `BaseApplication.ts` — 10 removed, 9 left. `eventEmitter_: any` → `EventEmitter` (changed `require` → ES `import`); `scheduleAutoAddResourcesIID_` typed via `ReturnType<typeof shim.setTimeout>`; `currentFolder_: any` → `FolderEntity`. `on(callback: Function)` → typed; `switchCurrentFolder.folder` → `FolderEntity`; `refreshNotes.state: any` → `State` (with `parentType: string|number` to allow reassign to ModelType numeric); `resourceFetcher_downloadComplete.event` typed; `reducerActionToString.action` typed `{ type; [k]: unknown }`; `applySettingsSideEffects.action`/`sideEffects` typed; `readFlagsFromFile.flags: any` replaced with `flagArgs: string[]`. The 9 that stay are around the redux middleware (`generalMiddleware`/`generalMiddlewareFn`/`reducer`/`initRedux`/`dispatch`/`start`) where per-app state and action unions diverge, plus the refreshFolders dispatch wrapper.
- `onedrive-api.ts` — 12 removed, 7 left. Introduced `OneDriveAuth` interface and `ListenerCallback` type. `auth_/setAuth/auth()` typed; `accountProperties_` → `Record<string, unknown>`; `listeners_: Record<string, ListenerCallback[]>`; `dispatch.param/setAccountProperties` typed; `oneDriveErrorResponseToError.errorResponse` typed (return still `any` since downstream augments with `request`/`headers`/`body` fields); `execTokenRequest.body/refreshAccessToken.body` → `Record<string, string>`; `authorizationTokenRemoved.data` typed `unknown` with `Record<string, unknown>` inner cast. The 7 remaining (`uploadChunk`, `uploadBigFile`, `exec`, `execJson`, `execText`, `handleRequestRepeat.error`, `oneDriveErrorResponseToError` return) cover FetchOptions/handle/buffer bags and network error augmentation.

Checkpoint 22 (2026-05-14): 506 → 477 (29 removed).

- `services/e2ee/EncryptionService.ts` — 12 removed, 13 left. `EncryptionCustomHandler<Context = any>` → `<Context = unknown>`. `EncryptOptions.onProgress: Function` → `(event: { doneSize: number })=> void`. `activeMasterKeyId` and `loadedMasterKey` error throws now use `Error & { code; masterKeyId? }` casts instead of `any`. `wrapSjclError.sjclError` typed. `randomHexString`/`generateMasterKeyContent_` cast `shim.randomBytes` to `number[]` at use site. `stringWriter_` typed inline; `fileReader_`/`fileWriter_` encoding params → `string`; `encryptString`/`decryptString` plain/cipher text → `string`. `headerTemplate` indexes via `Record<number, { fields: (string|number)[][] }>`; `encodeHeader_` parameter typed; `decodeHeaderString.cipherText` → `string`; `decodeHeaderBytes_.output` → `Record<string, string|number>`. `itemIsEncrypted.item` typed `{ encryption_applied?, encryption_cipher_text?, type_? }`. The 13 that stay (with reasons) are `fsDriver_`, `encryptAbstract_`/`decryptAbstract_`/`decodeHeaderSource_` source/destination (duck-typed reader/writer union), and a handful of polymorphic API surface bits.
- `services/plugins/api/types.ts` — 8 removed, 16 left. `Command.execute` reason updated. `ExportModule.onProcessItem/onProcessResource` reasons updated. `KeymapItem.userData/ImportContext.options/Script.onStart` typed `unknown`/`Record<string, unknown>`. `MenuItem.commandArgs: any[]` → `unknown[]`. `FormValue.value/DialogResult.formData` → `unknown`/`Record<string, unknown>`. `SettingItem.options` → `Record<string|number, string>`. `ContentScriptModuleLoadedEvent.userData` → `unknown`. The 16 staying are all plugin API surface tied to external libraries (markdown-it, CodeMirror 6) where the concrete types aren't imported in lib. Side fix: `app-mobile/components/plugins/dialogs/PluginDialogWebView.tsx` casts `formData` from `SerializableData` to `Record<string, unknown>` at the call site.

Checkpoint 23 (2026-05-14): 477 → 433 (44 removed).

- `reducer.ts` — 33 removed, 14 left. Introduced `AdditionalReducer` (kept as a 3-`any` interface — reducers from plugin/share services are immer-based with Draft mutation and per-sub-state shapes) and `SearchEntry` for `State.searches`. `StateLastSelectedNotesIds.{Folder,Tag,Search}: any` → `Record<string, string[]>`; `StateDecryptionWorker.decryptedItemCounts` → `Record<string, number>`; `State.masterKeys: any[]` → `MasterKeyEntity[]`; `pluginsLegacy/syncReport/screens` typed. `derivedStateCache_` → `Record<string, unknown>`; `cacheEnabledOutput` made generic `<T>`. Selectors and `selectArrayShallow` typed. `StateUtils.{selectArrayShallow,notesOrder,foldersOrder,lastSelectedNoteIds}` typed; `arrayHasEncryptedItems` → `{ encryption_applied? }[]`; `removeAdjacentDuplicates` made generic. `(windowDraft as any)[k]` patterns replaced with `(windowDraft as unknown as Record<string, unknown>)[k]`. Helpers `updateOneItem`, `handleHistory`, `getContextFromHistory`, `removeItemFromArray`, the top-level `reducer` body keep `any` with descriptive reasons matching the redux-action-union discrimination pattern. Side fixes: `PLUGINLEGACY_DIALOG_SET` and `DECRYPTION_WORKER_SET` reducer cases use typed intermediates.
- `models/BaseItem.ts` — 11 removed, 20 left. `ItemsThatNeedDecryptionResult.items: any[]` → `BaseItemEntity[]`; `isSystemPath` and `pathToId` use local `const`/`split` chains instead of mutating an `any` variable; `loadItemByField.value: any` → `string|number|boolean`; `syncItemClassNames`/`syncItemTypes` map callbacks typed; `encrypt` error and `reducedItem` casts now go through structural types; `decrypt`, `serialize`, `unserialize`, `serialize_format`/`unserialize_format` kept `any` with descriptive reasons for their unavoidably heterogeneous parameters. `updateSyncTimeQueries`/`saveSyncTime` kept `any` because tests pass loose objects with `id` as number.

Checkpoint 24 (2026-05-14): 433 → 411 (22 removed).

- `BaseModel.ts` — 22 removed, 19 left. `typeEnum_: any[]` → `[string, ModelType][]`. `saveMutexes_` → `Record<string, { acquire }>`. `setDb.db: any` → `JoplinDatabase`. `defaultValues.output: any` → `Record<string, unknown>`; `applySqlOptions.params/all.params` typed as primitive arrays; `allIds.rows.map` typed inline. `count.options/loadByField.fieldValue/loadByFields.fields/loadByTitle.fieldValue/fieldType.defaultValue/releaseSaveMutex.release/saveMutex.modelOrId` all typed concretely. `saveQuery.temp/filtered: any` → `Record<string, unknown>`. `userSideValidation.o` typed `{ id?, user_updated_time?, user_created_time? }`. `count.then` callback typed. Several stay `any` with descriptive reasons: `addModelMd`, `byId`, `modelIndexById` (subclass overrides return per-entity types so a base-class generic conflicts with subclass return-type variance), `removeUnknownFields`/`new`/`save`/`modOptions`/`saveQuery.o`/`saveQuery.query`/`diffObjects`/`modelsAreSame`/`modelSelectAll<T = any>` (heterogeneous entity slices across subclasses), and `dispatch: Function` for variance.

Checkpoint 25 (2026-05-14): 411 → 361 (50 removed).

- `components/shared/note-screen-shared.ts` — 21 removed, 2 left. Introduced `AttachedResource`/`AttachedResources`/`SaveNoteOptions`/`AttachFileAsset`/`ResourceHandler` types. `BaseState.noteResources: any` → `AttachedResources`. `Shared` interface methods all typed (saveOneProperty/noteComponent_change/installResourceHandling/uninstallResourceHandling/attachedResources/toggleCheckboxRange). `saveNoteButton_press.options: any` → `SaveNoteOptions`. `newState: any` → `Partial<BaseState>`. `resourceCache_: any` → `AttachedResources`. `toggleCheckboxLine` return → `ToggleCheckboxResult` discriminated union, downstream callers handle the string|tuple shape. `setState(state: any)` kept with reason (React component setState signature). `ResourceHandler` parameter `any[]` kept with reason (EventEmitter heterogeneous payloads). Side fixes: `app-desktop/.../useWebviewIpcMessage.ts` handles the new string return; `Note.tsx` resource handler signature is already compatible via variadic `any[]`.
- `shim-init-node.ts` — 12 removed, 9 left. Introduced `ProxySettings` interface; `proxySettings.any` and `setupProxySettings.options.any` typed. `ShimInitOptions` `any` fields kept with descriptive reasons (sharp/keytar/React/electronBridge/nodeSqlite are external module types). `detectAndSetLocale.Setting: any` → `typeof Setting`. `saveOptions: any` → typed structurally. `imageOptions: any` → typed. `cleanUpOnError/file/request.on('error')` typed `Error`. `requestOptions` kept `any` (node http/https request options + agent). `sites` call site typed via `NodeJS.CallSite[]`. `makeResponse.response` typed structurally.
- `import-enex.ts` — 17 removed, 3 left. `sourceStream/destStream.on('error')` typed `Error`. `removeUndefinedProperties` made generic `<T>`. `saveNoteResources.toSave: any` cast tightened via `Partial<Pick<...>>` for the delete keys. `Node.attributes: Record<string, any>` → `Record<string, string>`. `saveNoteToStorage` cast through `as ExtractedNote`. `handleSaxStreamEvent` typed `(...args: any[])=> void` with reason (sax events heterogeneous). `noteAttributes/noteResourceAttributes` typed `Record<string, string>`. `createErrorWithNoteTitle` typed. Stream and saxStream `on('error')` typed `Error`. `noteResource[n]` indexing uses a typed cast through `Record<string, string>`. `is_todo` cast to `0|1`. Latitude/longitude/altitude need `as unknown as number` casts since ENEX values arrive as strings.

Checkpoint 26 (2026-05-14): 361 → 323 (38 removed).

- `services/search/SearchEngine.ts` — 22 removed, 0 left. `ComplexTerm.scriptType: any` → `string`. `dispatch: Function` → action-shape dispatch. `syncCalls_: any[]` → `boolean[]`. `scheduleSyncTablesIID_` typed via `ReturnType<typeof shim.setTimeout>`. `setDb.db: any` → `JoplinDatabase`. `fieldNamesFromOffsets_.offsets: any[]` → `number[]`. `hitsThisRow`/`docsWithHits` typed `Uint32Array`. `processBasicSearchResults_`/`processResults_` typed `ProcessResultsRow[]` + `ParsedQuery`. `queryTermToRegex.term: any` → `string`. `basicSearch.searchOptions: any` typed structurally; `determineSearchType_.preferredSearchType` → `SearchType`; `allTerms: any[]` → `Term[]`. Side: added `fuzziness?: number` to `ProcessResultsRow` (was being assigned at runtime but not declared).
- `import-enex-md-gen.ts` — 16 removed, 5 left. `Section.lines: any[]` kept `any` with reason (mixed strings/Section/Hr objects). `ParserState.{anchorAttributes,spanAttributes}: any[]` → `Record<string, string>[]`. `collapseWhiteSpaceAndAppend.state: any` → `ParserState`. Introduced `SaxContext` type alias; `cssValue/isInvisibleBlock/isHighlight/isCodeBlock/displaySaxWarning` typed via `SaxContext` and `{ style?: string }`. `attributeToLowerCase.node` typed structurally. `isSpanWithStyle/isSpanStyleBold/isSpanStyleItalic.attributes` typed. `saxStream.on('error')` typed `Error`; `saxStream.on('opentag')` `node: any` → `{ name; attributes? }`. `captionLines: any[]` lets inference do the work. `enexXmlToMdArray.stream`, `renderLine/renderLines.lines`, and `currentCells` keep `any` with descriptive reasons (sax stream / heterogeneous nested Section objects).

Checkpoint 27 (2026-05-14): 323 → 293 (30 removed).

Scatter cleanup across many smaller files:
- `services/synchronizer/LockHandler.ts` — 2 removed, 0 left. `RefreshTimer.id: any` → `ReturnType<typeof shim.setInterval>`. `lockFileToObject.file: any` typed structurally with optional path/updated_time.
- `services/synchronizer/utils/types.ts` — 1 removed, 1 left with updated reason. `LogSyncOperationFunction.local: any` typed structurally; `ApiCallFunction` keeps `any[]`/`any` (dispatches by name across drivers).
- `services/style/themeToCss.ts` — 2 removed, 0 left. `isColor.v` typed `unknown` with type predicate; theme indexing via `Record<string, unknown>` cast.
- `services/style/cssToTheme.ts` — 2 removed, 0 left. `declarations`/`output` typed; final return cast `as unknown as Theme`.
- `services/profileConfig/mergeGlobalAndLocalSettings.ts` — 2 removed, 0 left. `rootSettings`/`subProfileSettings`/`output` all `Record<string, unknown>`.
- `utils/attachedResources.ts` — 2 removed, 0 left. `resourceCache_`/`output: any` → `AttachedResources`.
- `services/noteList/renderTemplate.ts` — 2 removed, 0 left. `Cell.value: any` → `unknown`; `valueToString.value: any` → `unknown` (using `String(value)`).
- `services/plugins/api/JoplinWindow.ts` — 2 removed, 0 left. Introduced local `DispatchStore` type for store_.
- `services/plugins/api/Global.ts` — 2 removed, 0 left. `implementation: any` → `BasePlatformImplementation`; `store: any` → `Store<any>` with descriptive reason; `process: any` → `NodeJS.Process`.
- `services/plugins/api/Joplin.ts` — 1 removed, 1 left with updated reason. `store: any` → `Store<any>` with reason. `require.return: any` kept with plugin-API reason.
- `services/plugins/api/JoplinCommands.ts` — 2 removed (reasons updated).
- `services/plugins/utils/loadContentScripts.ts` — 1 removed, 1 left. `loadedModule as any` cast → typed extension. `ExtraContentScript.module: any` kept with descriptive reason.
- `services/ResourceService.ts` — 2 removed, 0 left. `maintenanceTimer1_/maintenanceTimer2_: any` → `ReturnType<typeof shim.setTimeout/setInterval>`.
- `services/KeymapService.ts` — 2 removed, 0 left. `modifiersRegExp: any` → `RegExp`; `domToElectronAccelerator.event: any` typed structurally with the 5 fields actually read.
- `services/interop/InteropService_Importer_Base.ts` — 2 removed, 0 left. `setMetadata.md: any` → `Partial<ImportMetadata>` with cast; `init.options: any` → `ImportOptions`.
- `services/interop/InteropService_Importer_Custom.ts` — 2 removed, 0 left. `options: any` → `Record<string, unknown>` on `CustomImporter.onExec.context.options` and `processedOptions`.
- `services/interop/InteropService_Exporter_Raw.ts` — 2 removed, 0 left. `processItem.item/processResource.resource` typed via `BaseItemEntity`/`ResourceEntity`.
- `utils/ipc/utils/mergeCallbacksAndSerializable.test.ts` — 1 removed, 1 left. `data: any` typed inline.
- `utils/ipc/RemoteMessenger.test.ts` — 2 removed, 0 left. `transfer.o: any` made generic `<T>`; `testObjects: any[]` → `Record<string, unknown>[]`.
- Side fix: `services/interop/InteropService_Importer_Md.test.ts` uses `ImportModuleOutputFormat` enum members rather than raw string literals.

Checkpoint 28 (2026-05-14): 293 → 272 (21 removed).

Scatter cleanup chasing remaining "Old code before rule was applied" comments across many files:
- `models/Note.ts` — 5 removed, 7 left. `previewFieldsWithDefaultValues.options` typed; `(n as any)[field]` and `(o as any)[field]` patterns → `Record<string, unknown>` casts; `beforeChangeItems: any` → `Record<string, string | null>`; `updateNoteOrder_.order` → `number`; `handleTitleNaturalSorting.options` typed.
- `models/BaseItem.ts` — 4 removed, 16 left. `displayTitle.item` typed structurally; `items.map((item: any))` typed via `modelSelectAll<{ id: string }>`; `markdownTag.itemOrId/isMarkdownTag.md` typed structurally; `save.o` reason updated.
- `BaseModel.ts` — 3 removed, 16 left. `isNew.object/options` typed; `filterArray`/`filter` reasons updated; static enum loop uses `Record<string, ModelType>` cast.
- `models/Folder.ts` — 1 removed, 0 left. `report: any` → `Record<string, number>`.
- `services/plugins/Plugin.ts` — 1 removed, 0 left. `emit.event: any` → `unknown`.
- `services/plugins/api/JoplinPlugins.ts` — 1 removed, 0 left. `script.onStart.catch.error: any` typed structurally.
- `services/commands/MenuUtils.ts` — 1 removed, 0 left. `commandToStatefulMenuItem.commandTarget: any` → `unknown`.
- `services/interop/InteropService_Exporter_Md_frontmatter.ts` — 0 removed (reason updated).
- `import-enex.ts` — 1 removed, 2 left. saxStream cdata callback typed `string`.
- `testing/test-utils-synchronizer.ts` — 0 removed (kept with reason matching the heterogeneous test fixtures).
- `services/CommandService.test.ts` — 1 removed, 1 left. `createCommand.options` kept `any` with reason (test fixtures), execute mock kept with reason.
- `services/synchronizer/Synchronizer.conflicts.test.ts` — 2 removed, 0 left. dynamic field iteration uses `Record<string, unknown>` casts.
- `services/rest/Api.test.ts` — 2 removed, 0 left. `response: any` → `NoteEntity`; sort callback typed `{ id: string }`.
- `utils/ipc/utils/mergeCallbacksAndSerializable.test.ts` — 1 left with reason (mergeCallbacksAndSerializable return shape).

## packages/lib summary

Final: 1138 → 272 (**866 removed, 76% reduction**), processed in 28 batches over 2026-05-13 → 2026-05-14.

Of the 272 remaining disables, 270 have descriptive `-- reason` comments. The 2 without are inside commented-out code in `services/synchronizer/synchronizer_LockHandler.test.ts:103-105`.

The remaining `any` annotations cluster into a handful of structural reasons that resist simple narrowing:

1. **Per-app polymorphism**: `shim.ts` and `shim-init-node.ts` cross-platform shims (sharp, keytar, react, electron bridge, nodeSqlite, fsDriver, httpAgent, proxyAgent, node datagram module), redux store/state/dispatch differing across cli/desktop/mobile, FileApi driver subclass shapes.
2. **Plugin API surface**: `services/plugins/api/types.ts`, `Joplin.ts`, `JoplinCommands.ts`, command/script/content-script entry points where args/returns are arbitrary by design — narrowing would break plugin authors.
3. **External library types not imported here**: markdown-it, CodeMirror 6 (EditorView/Extension/CompletionSource), sax stream callbacks, node http/https request bag, css-tools declarations, sharp instance.
4. **BaseModel/BaseItem subclass variance**: `byId`, `modelIndexById`, `save`, `serialize`, `filter`, etc. are overridden by every subclass with stricter per-entity types; narrowing the base forces subclass return-type incompatibilities or many call-site casts.
5. **Reducer action unions**: `reducer.ts` matches dynamically on `action.type` across all redux actions in the app; the action union diverges across cli/desktop/mobile so a strict union here would not compose.
6. **Test fixtures**: a handful of tests pass loose `{ id: 1, type_: ... }` objects with `id` as `number`, mocked stores without `dispatch`, or partial entity slices that don't satisfy the production-typed signatures.

All `yarn tsc --noEmit` and `yarn linter-ci packages/lib/` runs pass for every batch commit.

## Multiple packages - June 2026

Migrated several `any` types that weren't migrated before. Some of these required changes spanning multiple packages and were previously left aside for this reason. Others were missed during the previous migrations.

The common technique was to tighten the type at its **definition** (the source) so that callers' documented skips cascade away too. The changes, by package:

`packages/lib`
- `Synchronizer.ts` — added exported `SyncStartOptions`, `SyncContext` and `ProgressReport`; typed `start(options)`. Cascaded to `registry.ts` (`scheduleSync`), `app-cli/command-sync.ts` and `testing/test-utils.ts`.
- `models/BaseItem.ts` — `encryptionService_` / `revisionService_` typed via `import type` of `EncryptionService` / `RevisionService` (a value import would re-create the runtime cycle those services have with `BaseItem`).
- `models/Setting.ts` — `CacheItem` made generic (`CacheItem<T>`) with `loadOne<T>` returning the precise per-key value; `formatValue` / `valueToString` params → `unknown`; `SettingItem.value` → `unknown`; `keychainService_` → `import type KeychainService`.
- `reducer.ts` — `State.syncReport` → `ProgressReport` (cascaded to `app-desktop/gui/Sidebar` and `app-mobile/side-menu-content`); `State.sharedData` → `SharedData` (exported from `note-screen-shared.ts`). Removing `sharedData: any` un-poisoned `State[keyof State]` and surfaced a previously-masked dynamic-key access in `handleItemDelete`, fixed with a localized cast.

`packages/utils`
- `Logger.ts` — `TargetOptions.database` → a minimal structural `LoggerDatabase` interface (the concrete `Database` lives in `@joplin/lib`, which depends on this package, so it cannot be imported); added exported `LogEntry` and typed `lastEntries()`. Cascaded to `app-mobile/LogScreen.tsx` (removed a duplicate `LogEntry` and a cast) and `exportDebugReport.ts`.

`packages/app-cli`
- `app/app.ts` — `commands_` / `activeCommand_` → `BaseCommand`; `commandMetadata_` → `Record<string, ReturnType<BaseCommand['metadata']>>`; the redux dispatch callback now infers from `Dispatch`. `gui_` left `any` (the GUI is the untyped `app-gui.js`). `autocompletion.ts` gained one localized cast for `base-command`'s loose `options` element.

`packages/app-mobile`
- `utils/types.ts` — `AppState.route` → `Route` (the `Route` interface was moved here from `appReducer.ts` and shared); `noteSideMenuOptions` → `SideMenuContentOptions`.
- `utils/appReducer.ts` — the nav-history helpers (`removeAdjacent*`, `removeLatestFolderIfSelected`) → `Route[]` / `Route`.
- `components/app-nav.tsx` — `Props.route` → the shared `Route`.
- `components/screens/Note/Note.tsx` — `menuOptionsCache_` → `Record<string, MenuOptionType[]>`; `editorRef` → `RefObject<EditorControl>` (it only ever attaches to `NoteEditor`, whose handle is `EditorControl`).

`packages/app-desktop`
- `gui/NoteEditor/NoteBody/TinyMCE/TinyMCE.tsx` — `pluginAssets` → `RenderResultPluginAsset[]`.

Genuinely-untyped boundaries were left as `any` with accurate reasons: the `app-gui.js` GUI handle, the `react-native-dialogbox` ref, mixed React-Native style records, the heterogeneous reducer `action` union, the per-screen `ComponentType<any>`, and the TinyMCE editor / event types that are looser than the published `@types/tinymce`.

One pre-existing inconsistency was uncovered and left for separate follow-up: `app-mobile`'s `ShareExtension.SharedData` declares `resources: string[]`, but the lib consumer reads each resource as a `SharedResource` object — the two same-named types should be reconciled after verifying the native share payload.

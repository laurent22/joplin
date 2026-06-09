# `.js` → `.ts` Migration Progress — details

Per-package detail for the migration plan in [./js_to_ts_progress.md](./js_to_ts_progress.md). Add a subsection per package when work begins, and write per-file entries immediately so a session interrupt loses at most one entry.

## Format

```markdown
## packages/<name>
Session date: YYYY-MM-DD
Branch: <branch-name>

Files processed:
- `relative/path/file.ts` — short note on notable changes (caller updates, type fixes, dead code removed, etc.). If trivial, just "converted; no caller updates" is enough.

Files skipped:
- `relative/path/file.js` — reason (vendored, config, blocked by <X>, etc.)

Verification:
- `yarn tsc --noEmit`: <result>
- `yarn test` / `cd packages/<name> && yarn jest <pattern>` (where applicable): <result>
- `yarn syncFuzzer start --steps 5` (for app-cli / lib sync-target work): <result>

Notes / `review-later.md` entries added:
- <file:line> — <one-liner about what was logged>
```

## Conventions for "Files processed" entries

- **Caller updates** are part of the same commit as the conversion. Mention them in the entry only if there are several or they are non-obvious. A single `.default` add at the consumer is implicit.
- **Type fixes the conversion surfaces** (e.g. a previously-`any` parameter that the cast reveals to be too narrow) are noted. If applied as a separate commit, mention the commit subject.
- **Dead code removed** (unused private fields, unreachable branches) is noted with the original-line reference.
- **Pre-existing smells flagged to `review-later.md`** are noted (file path + one-line summary).

---

## packages/app-cli

Session date: 2026-05-22

Files processed (under `packages/app-cli/app/`):

- `command-undone.ts` — converted; sibling `command-done` kept as `require()`.
- `command-mknote.ts` — typed local `note: NoteEntity` so post-`Note.save` reassignment type-checks; existing fire-and-forget `Note.updateGeolocation` marked `void`.
- `command-mktodo.ts` — same pattern as `command-mknote`.
- `command-todo.ts` — switched `BaseModel.TYPE_NOTE` to `ModelType.Note` to match the narrower `loadItems` parameter; `toSave` typed `NoteEntity`.
- `command-search.ts` — converted; `notebook` CLI arg name forces an `id-denylist` disable on the args type.
- `command-status.ts` — converted; no caller updates.
- `command-server.ts` — Logger `addTarget('console', …)` → `TargetType.Console` enum; partial console mock cast through `unknown` to `Console`.
- `command-tag.ts` — `loadItem(ModelType.Tag as ModelType.Note, …)` to work around the narrow signature; entity types `NoteEntity`/`TagEntity`.
- `gui/NoteMetadataWidget.ts` — `export default`; consumer in `app-gui.js` updated to `.default`.
- `gui/NoteListWidget.ts` — `export default` + consumer; `itemRenderer` callback typed `NoteEntity`.
- `gui/ConsoleWidget.ts` — `export default` + consumer; private fields typed.
- `gui/NoteWidget.ts` — `export default` + consumer; `as string` casts in the `doAsync` closure preserve "read at execution time" semantics that the `lastLoadedNoteId_` guard relies on.
- `ResourceServer.ts` — `export default` + consumer; `LinkHandler` type for the handler callback; `server-destroy` augmentation cast on `server_.destroy()`.
- `help-utils.ts` — destructured `require()` shape preserved; `'cli'` string literals → `AppType.Cli`; `eslint-disable import/prefer-default-export` on the single named export. `renderMetadata` `md` parameter tightened to `SettingItem` in a follow-up commit. (Also a follow-up to untrack the leftover compiled `help-utils.js` after a staging restore left it tracked.)
- `autocompletion.ts` — `CompletionResult = string | CompletionList` (`CompletionList = string[] & { prefix?: string }`); `yargs-parser` consumed via `import = require()`; `void` on the existing fire-and-forget `then(…)`.
- `cli-utils.ts` — `CliUtils` interface declared for the namespace object; redundant `printArray` empty-rows early return removed; the dead `if (i >= a.length)` branch in `makeCommandArgs` removed with a comment pointing at `review-later.md`; `prompt` synthesises a `Writable & { muted: boolean }` intersection.
- `app-gui.ts` — biggest of the round; dropped dead `inputMode_` field + the two unused `INPUT_MODE_*` static constants; typed `processShortcutKeys` explicitly as `boolean`; defined `KeymapItem` interface and `NoteLink` discriminated union; `void` on three pre-existing fire-and-forget calls. Single consumer in `app.ts:442` updated to `.default`.

Follow-up tightening commits (separate from each file's main conversion):

- `Tighten BaseCommand.description() return type to string` — base method throws but every subclass returns a string; tightened so `help-utils` doesn't need a cast.
- `Tighten app-cli help-utils renderMetadata md parameter` — `any` → `SettingItem`.
- `Tighten app-gui Redux store/state any types` — `store_: any` → `Store<State>`; four `(state: any) => …` mappers → `(state: State) => …`.
- `Tighten app-gui App any type to Application` — required adding `export` to the `Application` class in `app.ts`; surfaced a real type mismatch (`ResourceServer.setLogger(this.app().logger())` was passing `LoggerWrapper` into a `Logger`-typed setter — fixed by widening ResourceServer's logger types).
- `Simplify ResourceServer logger types to just LoggerWrapper` — `Logger | LoggerWrapper` collapses to `LoggerWrapper` since `Logger` is structurally assignable to it.
- `Tighten remaining app-gui any types` — `noteLinks` → discriminated union; `updateNoteText note: any` → `NoteEntity | null`.
- `Tighten cli-utils prompt mutableStdout any to a typed intersection` — replaced two `any` casts with `Writable & { muted: boolean }` and a typed `this` on the write callback.
- `Extract PromptOptions interface from StatusBarWidget.prompt` — same anonymous `{ cursorPosition?: number; secure?: boolean }` shape was duplicated across three places; extracted as `PromptOptions` exported from `StatusBarWidget`.
- `Final-review cleanup on app-cli conversions` — mirrored the `LoggerWrapper` widening to `app-gui.ts logger_/setLogger`; reordered the `NoteEntity` import to group with `@joplin/lib/*`; trimmed the 5-line closure-cast comment in `NoteWidget`.
- `Trim cli-utils explanatory comments` — removed the `printArray` empty-rows comment entirely; shortened the `prompt` `_initialText` rationale.
- `Use typed LinkSelector import in app-cli app-gui` — `LinkSelector` was already a typed `.ts` class; replaced the `require('./LinkSelector.js').default` + `any` field with a typed import and dropped the stale eslint-disable. Caught during a final consistency-check pass over the branch.
- `Trim block comments in app-cli autocompletion and cli-utils` — same consistency-check pass: shortened the `CompletionList` rationale block to one line and removed the cli-utils `makeCommandArgs` dead-branch post-mortem (the dead branch is already gone; the note lives on in `review-later.md`).

Files skipped:

- `app/main.js` — shebang preservation issue (see "Files to never touch" in the plan).
- `app/build-doc.js` — dev-time documentation generator, low value.
- `app/fuzzing.js` — 2400+ lines, exploratory test runner.
- `tests/feature_*.js`, `tests/HtmlToHtml.js`, `tests/support/createSyncTargetSnapshot.js` — feature tests / test helpers; deferred to a follow-up round.
- `tests/support/plugins/**/*.js` — intentionally JS plugin fixtures.

Verification:

- `yarn tsc --noEmit` from the repo root: clean after every commit.
- `yarn syncFuzzer start --steps 5` from the repo root: green at three checkpoints (after the first batch of commands, after the gui widget round, after the cli-utils / help-utils / autocompletion round).
- `cd packages/app-cli && yarn jest command-done.test`: 1 passing (smoke check after `command-undone`).
- `cd packages/lib && yarn jest synchronizer.basics.test`: 24/24 (baseline before the round; not re-run after every commit).

Notes / review-later entries added during this round (entries record generic locations; an on-disk `review-later.md` is per-environment and not committed):

- `packages/app-cli/app/app.ts loadItem`/`loadItems` — the typed parameter (`Note | Folder | 'folderOrNote'`) is narrower than the runtime support, which falls through to `BaseItem.itemClass(type).loadByTitle` for other types including `ModelType.Tag`. `command-tag` casts at the call site to compensate.
- `packages/app-cli/app/autocompletion.ts:103` — in the `'item'` argument completion branch, `notes.map(n => n.title)` is spread but `folders.map(n => n.title)` is **not** — folder titles end up pushed into the completion list as a single nested array element. Likely-bug; the `as unknown as string` cast in the converted file preserves the behaviour.
- `packages/app-cli/app/cli-utils.ts makeCommandArgs` — `if (i >= a.length)` where `a` is `{ required, name }` is unreachable (`a.length` is `undefined`). The else branch always ran; preserved by removing the dead conditional. Likely intended `args['_'].length`.

## packages/renderer

Session date: 2026-05-25
Branch: claude/chore/renderer--js-to-ts

Files processed (under `packages/renderer/`):

- `stringUtils.ts` — `module.exports = { surroundKeywords }` → named export; `require('html-entities').AllHtmlEntities` swapped for the typed `import { AllHtmlEntities } from 'html-entities'`; new `Keyword = string | RegexKeyword | StringKeyword` discriminated union typed off the in-code comment that documented the keyword shapes. cSpell ignore block added around the diacritic-replacement table. Existing `require('../../stringUtils.js')` consumers in `highlight_keywords.ts` unchanged (named exports remain reachable from the namespace).
- `urlUtils.ts` — `module.exports = urlUtils` namespace object → named exports (`urlDecode`, `isResourceUrl`, `parseResourceUrl`, `ParsedResourceUrl`). Internal self-references switched from `urlUtils.X(...)` to bare calls. Existing `require('../urlUtils.js')` consumers in `linkReplacement.ts` and `link_open.ts` unchanged.
- `defaultNoteStyle.ts` — `module.exports = {...}` → `export default {...}`. Single consumer in `MdToHtml.ts:76` updated to a top-of-file `import defaultNoteStyle from './defaultNoteStyle';`.
- `Tools/buildAssets.ts` — dev-time script. Three function signatures typed (`dirname(path: string)`, `copyFile(source: string, dest: string)`, `main()`); `fs-extra` kept as `const fs = require('fs-extra')` (implicit `any` from `require` per project convention; renderer has no `@types/fs-extra` and adding the dep is out of scope for a mechanical conversion). Verified by running `yarn buildAssets` from `packages/renderer/` — outputs in `assets/{abc,mermaid,katex,highlight.js}` matched the prior structure.

Files skipped:

- `MdToHtml/rules/abc_render.js` and `MdToHtml/rules/mermaid_render.js` — shipped raw to browsers by `Tools/buildAssets.js` (lines 49/52 `fs.copy` the source `.js` to `assets/{mermaid,abc}/`). Matches the same hazard pattern documented for `packages/lib/markJsUtils.js` in the plan's "Files to never touch" section: TS-emit CommonJS wrappers (`Object.defineProperty(exports, '__esModule', …)`) break in a raw `<script>` context. `mermaid_render.js` additionally assigns to `Event.target` (a readonly DOM property in lib.dom.d.ts), so strict TS would require a cast. Skip until the build pipeline is updated (e.g. compile these via a webpack/esbuild step that emits a browser-friendly IIFE, or change `buildAssets.js` to copy the compiled output instead of the source).
- `MdToHtml/rules/katex_mhchem.js` — 1700+ lines vendored from the KaTeX repo (`https://github.com/KaTeX/KaTeX/blob/master/contrib/mhchem/mhchem.js`); already preceded by `/* eslint-disable */`. Falls under the plan's "Vendored / forked third-party code — preserved verbatim" rule.
- `lib/renderer.js` — 7-line `// TODO` stub with no callers found in repo. Flag for removal as dead code in a separate PR; not in scope for a mechanical conversion.
- `tests/test-utils.js` — empty file (0 bytes), no callers. Same: candidate for deletion, not conversion.
- `jest.config.js` — config file kept as `.js` by design (plan "Files to never touch").

Verification:

- `yarn tsc --noEmit` from the repo root: zero new errors in `@joplin/renderer`. (Pre-existing errors in `@joplin/app-desktop` `WhiteboardEditor/*` and `@joplin/app-mobile` `services/e2ee/crypto.ts` were present on the branch base and are unrelated.)
- `cd packages/renderer && yarn jest`: 35/35 passing (5 suites).
- `cd packages/app-cli && yarn test MdToHtml`: 13/13 passing (cross-package renderer integration tests).
- `cd packages/renderer && yarn buildAssets`: ran clean; regenerated assets under `assets/{abc,mermaid,katex,highlight.js}` matched the prior structure. Note: regenerating overwrote a committed-stale `assets/abc/abcjs-basic-min.js` (v6.5.2 on disk vs v6.6.2 in `package.json`); restored before commit and noted as a pre-existing concern.

Notes / review-later entries added (generic locations; the on-disk `review-later.md` is per-environment and not committed):

- `packages/renderer/stringUtils.ts surroundKeywords` — `valueRegex` from `RegexKeyword` entries is passed verbatim into `new RegExp(...)`; only `pregQuote`-escaped string keywords are safe. A pathological pattern (`(a+)+$`) compiled `gi` and run against note text causes catastrophic backtracking on every render. Source of `valueRegex` is search input — primarily self-inflicted but persists into saved searches.
- `packages/renderer/assets/abc/abcjs-basic-min.js` — committed v6.5.2 disagrees with `package.json`'s `abcjs: 6.6.2`; running `yarn buildAssets` regenerates and produces a dirty working tree.
- `packages/renderer/lib/renderer.js` — 7-line `// TODO` stub, no callers in repo; deletion candidate.
- `packages/renderer/tests/test-utils.js` — 0-byte file, no callers in repo; deletion candidate.

## packages/lib

Session date: 2026-05-26
Branch: claude/chore/lib--js-to-ts

Source files processed (under `packages/lib/`):

- `envFromArgs.ts` — signature tightened to `(args: string[] | null | undefined) => 'dev' | 'prod'`.
- `parameters.ts` — introduced `Env`, `AppCredentials`, `ParametersForEnv` types; `parameters_` typed `Record<Env, ParametersForEnv>`; `Setting.value('env')` cast to `Env`.
- `randomClipperPort.ts` — added `ClipperPortState` interface and local `Env` alias.
- `SyncTargetMemory.ts` — `default export class extends BaseSyncTarget`; callers updated to default-import.
- `SyncTargetNextcloud.ts` — sibling `SyncTargetWebDAV` kept as `require()` (still JS at this point); `checkConfig` temporarily typed `options: any` with an eslint-disable.
- `SyncTargetDropbox.ts` — removed unused private `api_` field (set in constructor, never read); fixed a spelling slip flagged by cSpell; callers updated to default-import.
- `SyncTargetWebDAV.ts` — added exported `WebDavFileApiOptions` interface shared by `checkConfig` and `newFileApi_`; sibling `file-api-driver-webdav` kept as `require()`.
- `resourceUtils.ts` — split previous `module.exports = { ... }` object into individual named exports; both destructured-`require` and namespace-style callers continue to work.
- `import-enex-html-gen.ts` — removed an unused `options` parameter from `enexXmlToHtml` (forwarded to `enexXmlToHtml_` which never read it, and no caller passed it); `string-to-stream`/`@joplin/fork-sax` kept as `require()` (no types); sax event-handler node/stream-output values stay `any`.

Test files processed (production-code counterpart was already TS):

- `database.test.ts` — converted; benefits from existing TS types in `test-utils` and `BaseModel`.
- `TaskQueue.test.ts` — constructor now passed a `name`; `push` ids switched from numeric to string to match `TaskQueue.ts`'s typed signature (JS coerced the numbers at runtime).
- `ArrayUtils.test.ts` — dropped a second arg to `expect().toEqual()` in the `mergeOverlappingIntervals` case (rejected by Jest typings; silently ignored at runtime).
- `services/KvStore.test.ts` — no notable type adjustments.
- `eventManager.test.ts` — simplified test states cast through `unknown as AppState` at `appStateEmit` call sites; callbacks typed via the `AppStateChangeCallback` generic; dropped the now-redundant `'use strict'`.
- `urlUtils.test.ts` — added explicit row types for the `parseResourceUrl`/`extractResourceUrls` test-case arrays; switched to `import * as urlUtils from './urlUtils'` to preserve namespace-style call sites.
- `mimeUtils.test.ts`, `pathUtils.test.ts`, `timeUtils.test.ts` — no notable type adjustments.
- `services/KeymapService.test.ts` — negative-test data for "required properties missing" cast through `unknown as KeymapItem[]` so the type checker accepts the deliberately malformed entries; pre-existing `accelerator: null` discrepancy left as-is (masked by root `strict: false`).
- `import-enex-html-gen.test.ts` — imports `ResourceEntity` and types fixtures explicitly; one `attachment-image` fixture has a `width` field not on `ResourceEntity`, cast `as ResourceEntity` locally (field is unread by the converter; removing it would alter long-standing data).
- `models/Note.customSortOrder.test.ts` — converted and renamed from `Note_CustomSortOrder.test.js` (and `describe` title updated) to match the `Foo.aspect.test.ts` convention; `Note.insertNotesAt` calls now pass all 5 args (`false, false` for `uncompletedTodosOnTop`/`showCompletedTodos`, preserving prior falsy-undefined behaviour); `is_todo: true` switched to `is_todo: 1` to match the typed numeric schema; `originalTimestamps` typed as `Record<string, {…}>`.

Dead code removed (separate commit):

- `parseUri.js` — deleted; no callers in repo.

Follow-up tightening commits:

- `Type SyncTargetNextcloud.checkConfig with WebDavFileApiOptions` — replaced `options: any` with the `WebDavFileApiOptions` import from `SyncTargetWebDAV`, dropping the eslint-disable. Done as a separate commit because the type wasn't exported until `SyncTargetWebDAV` was itself converted.
- `Simplify eventManager.test by dropping redundant generics` — removed explicit `<string>` and `<{ name: string }>` args on `appStateOn`/`appStateOff`; the callback's `event.value` already lets TS infer the generic.

Files attempted but reverted:

- `markJsUtils.ts` — converted in `5de93c318` and reverted in `6e2a1b8ec`. The TS-emit CommonJS wrappers (`Object.defineProperty(exports, '__esModule', …)`) broke the desktop note viewer at runtime (`yarn test-ui markdownEditor` failed). `yarn tsc --noEmit` and `yarn jest` did not catch it. Same hazard pattern as the renderer's `abc_render.js` / `mermaid_render.js`: the file is shipped to a browser context where the CJS wrapper isn't valid. Documented in the plan's "Files to never touch" section; don't retry without first identifying the bundling path.

Files not yet processed (deferred to a follow-up round):

- Remaining `packages/lib/` source `.js` files not in this batch (models, services, sync helpers, etc.) — convert per the order in the plan's per-package strategy.
- `markJsUtils.js` — see above; blocked on the bundler/runtime fix.

Verification:

- `yarn tsc --noEmit` from the repo root: clean after each commit (and after the merge with `upstream/dev`).
- `cd packages/lib && yarn jest <suite>` against the touched test files: green per-conversion.
- `yarn syncFuzzer start --steps 5` from the repo root: green after each `SyncTarget*` conversion (primary verification path for sync-target files; `yarn jest` does not meaningfully exercise them).

Notes / review-later entries added during this round (generic locations; on-disk `review-later.md` is per-environment and not committed):

- `packages/lib/markJsUtils.js` — see "Files attempted but reverted" above; the CJS-wrapper-in-browser hazard applies to any other file consumed by the desktop note viewer via a raw `<script>`-style include.
- `packages/lib/SyncTargetDropbox.ts` constructor — removed unused `api_` field that was assigned but never read; verify no out-of-tree consumer (mobile/desktop overrides) relied on the field name before the next release.
- `packages/lib/import-enex-html-gen.ts` `enexXmlToHtml` — dropped unused `options` parameter; if a future plugin or external caller passes options it will now silently be ignored at compile time (the parameter was already a no-op at runtime).
- `packages/lib/services/KeymapService.test.ts` — pre-existing `accelerator: null` in test fixtures disagrees with `KeymapItem` (only present at root `strict: false`); flag for cleanup when `strict` is tightened.

## Merge with upstream/dev (2026-05-26)

`upstream/dev` landed two overlapping PRs while this branch was in progress: `#15523` (app-cli conversions) and `#15532` (renderer conversions). Both equivalently converted files we had also converted locally. Merge resolution:

- `packages/renderer/stringUtils.ts` — true content conflict (different stylistic choices: arrow-function vs function-declaration; module-scope vs function-scope `diacriticReplacements`; discriminated-union vs separate-interfaces for `Keyword`). Resolved by accepting upstream's version verbatim, since it was already reviewed and merged in `#15532`. Local commit `19893150f` becomes redundant content-wise (the rename is preserved by the merge).
- All app-cli `.js → .ts` renames and the renderer `defaultNoteStyle.ts` / `urlUtils.ts` conversions resolved without conflict (identical content on both sides; git's rename detection collapsed them).
- `.eslintignore` / `.gitignore` — merge cleanly absorbed upstream's `# AUTO-GENERATED` additions for app-cli; re-ran `yarn updateIgnored` post-merge as a sanity check (no further diff).
- `yarn tsc --noEmit` post-merge: clean.

## packages/lib (round 2)

Session date: 2026-05-26
Branch: claude/chore/lib--js-to-ts-2

Continuation of the first packages/lib round. Picks up the small / mid-size remaining `.js` files; the larger sync-target drivers (`SyncTargetAmazonS3.js`, `DropboxApi.js`, `file-api-driver-*.js`) are still deferred and need fuzzer-led conversion per the plan's sync-target verification rule.

Source files processed (under `packages/lib/`):

- `reserved-ids.ts` — `module.exports = Object.freeze({...})` → named `export const ALL_NOTES_FILTER_ID`. Single export with file/symbol-name divergence, so `eslint-disable-next-line import/prefer-default-export` per project guidance. No caller updates needed (destructured `require` continues to work).
- `fs-driver-dummy.ts` — `class FsDriverDummy` made to extend `FsDriverBase`; `readFile` typed `async`. Default-exported; consumer `models/Resource.ts` switched from destructured `require('../fs-driver-dummy.js')` to a typed default import.
- `react-logger.ts` — `module.exports = { ReactLogger }` → `export class ReactLogger extends Logger`. No callers found in the repo; conversion was mechanical. Single-export disable for `import/prefer-default-export`.
- `lib/lib.ts` — 7-line TODO stub with no callers; converted to `export default function lib()`. Deletion candidate flagged below.
- `Cache.ts` — added a minimal `Storage` interface for the two `node-persist` methods used here (the package is untyped); `module.exports = Cache` → `export default class Cache`. `catch (error)` → `catch (_error)` to satisfy unused-binding rule; no-op behaviour preserved. **Follow-up commit `6b50d7193`** fixed the app-cli caller (`app/app.ts:21` had a `const Cache = require('@joplin/lib/Cache')` that survived the conversion; at runtime the TS-emit CJS shape made `new Cache()` throw "Cache is not a constructor"). `yarn tsc` did **not** catch this; the sync fuzzer did. Lesson: when converting `module.exports = X` → `export default X`, grep all `require()` callers (including other packages and compiled JS that won't be regenerated) in the same commit.
- `migrations/20.ts`, `migrations/27.ts`, `migrations/33.ts`, `migrations/35.ts` — match the shape of the existing `migrations/42.ts` (local `Script` interface, `export default script`). Consumer `models/Migration.ts` switched from `require('../migrations/20.js')` (×4) to typed default imports.
- `services/plugins/sandboxProxy.ts` — typed the proxy target as `(path: string, args: unknown[]) => unknown` with a `__joplinNamespace?: string[]` marker; the dynamic Proxy can't be honestly typed, so the function takes a generic `T` for callers to supply the surface type (PluginRunner in app-cli now does `sandboxProxy<Joplin>(target)`).
- `mime-utils-types.ts` — added an exported `MimeType` interface (`{ t: string; e: string[] }`); `module.exports = mimeTypes` → `export default`. Wrapped the array body in `// cSpell:disable` / `// cSpell:enable` because hundreds of MIME subtype tokens are not real words. Consumer `mime-utils.ts` switched from `require()` to a typed default import.
- ~~`welcomeAssets.ts`~~ — initially converted in `a3fb2b92b`, then **reverted in `8008a3158`** after spotting that `packages/tools/build-welcome.ts:165` regenerates the file via `writeFileSync(.../welcomeAssets.js, ...)`. Any conversion would be silently undone the next time `yarn build-welcome` runs. Should be added to the plan's "files to never touch" list, or `build-welcome.ts` updated to emit a `.ts` file (and an `export default`) first.
- `services/PluginManager.ts` — `module.exports = PluginManager` → `export default class`. Introduced explicit interfaces: `PluginMenuItemDeclaration` (manifest shape, `accelerator` is a function), `PluginMenuItem` (menuItems() return shape — `accelerator` resolved to string, `click` required), `PluginManifest`, `PluginInstance`, `PluginClass`. The static `Dialog` property is typed `unknown` to keep React out of lib/; consumers cast it to `React.ComponentType<…>` at the render site. Three callers (`app.ts`, `gotoAnything.ts`, `WindowCommandsAndDialogs.tsx` in app-desktop) switched from `require()` to typed default imports.
- `database-driver-node.ts` — `module.exports = { DatabaseDriverNode }` → `export class DatabaseDriverNode` (single-export disable as above). Added a local `SqliteDatabase` interface for the methods touched (`get`/`all`/`run`/`close`/`loadExtension`). `sqliteErrorToJsError` keeps the msg array as `unknown[]` so `Array#join`'s String() coercion of each element preserves the original `error.toString(): sql: params` formatting (where params is an array; switching to `JSON.stringify` would change the output). Four consumers (`BaseApplication`, `testing/test-utils`, `server/joplinUtils`, `app-cli cli-integration-tests`) switched to typed named imports.
- `onedrive-api-node-utils.ts` — `api: OneDriveApi` parameter typed against the existing TS class; `targetConsole` callback typed `{ log(message: string): void }`; `DestroyableServer` interface to apply the `server-destroy` augmentation on top of `http.Server`. Two consumers (`app-cli command-sync.ts`, `app-desktop OneDriveLoginScreen.tsx`) switched from destructured `require()` to typed named imports. Tightened command-sync's `oneDriveApiUtils_: any` to `OneDriveApiNodeUtils | null` (drops one `no-explicit-any` disable).
- `components/shared/dropbox-login-shared.ts` — typed the small `DropboxApi` surface this module uses (`loginUrl`/`setAuthToken`/`execAuthToken`) since the full `DropboxApi` is still JS. The host-component parameter is kept `any` (with a comment) rather than modelling `React.Component<P, S>.setState` — its generic `Pick<S, K>` signature is awkward at this seam and the desktop/mobile callers each have their own Props shape. `MessageBox` typed loosely (`(msg) => unknown`) since desktop's `bridge().showInfoMessageBox` returns boolean and mobile's `shim.showMessageBox` returns a Promise. Three pre-existing fire-and-forget promise calls (`reg.scheduleSync`, two `UNSAFE_componentWillMount` calls of `refreshUrl`) now need `void` since the wrapping methods are typed async. Two consumers (`DropboxLoginScreen.tsx` desktop, `dropbox-login.tsx` mobile) switched to typed default imports and dropped their `private shared_: any` disables.

Files skipped (intentionally JS):

- `markJsUtils.js` — see prior round's "Files attempted but reverted" note.
- `string-utils-common.js` — has an explicit "leave as JavaScript" comment; consumed by `packages/editor/CodeMirror/*` files that ship to browser contexts. Same TS-emit CJS-wrapper hazard as `markJsUtils.js`.
- `renderers/webviewLib.js` — read as raw text by `packages/app-mobile/tools/buildInjectedJs/copyAssets.ts` (gulp task `copyWebviewLib`) and inlined into `packages/app-mobile/lib/rnInjectedJs/webviewLib.js`. After conversion, `copyAssets` would inline the TS-compiled `.js` (with `Object.defineProperty(exports, '__esModule', …)` wrappers) into the webview context. Same hazard pattern as `markJsUtils.js`. Skip until the build pipeline reads the `.ts` source or emits a browser-friendly IIFE.

Files not yet processed (deferred to a follow-up round):

- `DropboxApi.js` (213 lines) — touch point for `dropbox-login-shared` (which declares a minimal local interface in lieu of converting). Convert next so the local interface can be replaced.
- `SyncTargetAmazonS3.js` (154 lines) — sync-target file; needs fuzzer-led conversion per the plan.
- `file-api-driver-amazon-s3.js` (406 lines), `file-api-driver-dropbox.js` (255), `file-api-driver-webdav.js` (237) — sync-target drivers; same fuzzer rule.
- `utils/types/pdfJs.js` — already a compiled output of `utils/types/pdfJs.ts` but accidentally tracked in git. Needs `git rm --cached`; flagged as a separate fix (not a conversion).

Verification:

- `yarn tsc --noEmit` from the repo root: clean after every commit.
- `yarn tsc` from the repo root: clean after every commit.
- `cd packages/lib && yarn jest mimeUtils`: 6/6 (post mime-utils-types conversion).
- `cd packages/lib && yarn jest synchronizer.basics.test`: 24/24 (baseline check after database-driver-node conversion).
- `MAX_TIME_DRIFT=0 yarn syncFuzzer start --steps 5` from the repo root: 5/5 with clean cleanup, after the Cache caller fix (`6b50d7193`). `MAX_TIME_DRIFT=0` was needed because of a local device-clock drift unrelated to the conversion.

Notes / `review-later.md` entries added during this round:

- `packages/lib/utils/types/pdfJs.js` — compiled output of `pdfJs.ts` is tracked in git (present in `.gitignore` + `.eslintignore` AUTO-GENERATED block but still in the index). `git rm --cached packages/lib/utils/types/pdfJs.js packages/lib/utils/types/pdfJs.js.map` would clean it; separate from any conversion.
- `packages/lib/react-logger.ts` — class has no body and no callers in the repo. Deletion candidate.
- `packages/lib/lib/lib.ts` — 7-line empty `// TODO` function stub with no callers. Deletion candidate.
- `packages/lib/services/PluginManager.ts pluginDialogToShow` — returns a `Dialog: unknown` that desktop's `WindowCommandsAndDialogs.tsx` casts to `React.ComponentType<Record<string, unknown>>` to render. The right long-term fix is to add a generic-typed `Dialog` parameter (or refactor away the legacy plugin system as the existing TODO comment in that file already notes).
- `packages/lib/components/shared/dropbox-login-shared.ts` — host-component parameter stayed `any` to avoid a fragile React-types shim; revisit if `DropboxApi.js` is converted so the local `DropboxApi` interface can be removed.

<!-- Add per-package sections below as additional packages are processed. -->

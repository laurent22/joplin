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

<!-- Add per-package sections below as additional packages are processed. -->

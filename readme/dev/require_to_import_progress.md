# `require()` → `import` Migration Progress

Tracks the effort to migrate `const X = require('...')` to typed `import` statements so values pulled in from other modules carry real types instead of implicit `any`.

## Goal

Replace `const X = require('...')` with a typed `import` whenever possible and the change is mechanical. `require()` is fine to keep when the imported module has no types — it already returns implicit `any`, so no `: any` or eslint-disable is needed. The aim is to narrow `require` to the cases where it's actually load-bearing, and let the type checker cover the rest.

## Rules

For each `const X = require('...')`:

1. **Convert to a typed `import`** when types exist:
   - The module ships its own `.d.ts` (check `node_modules/<pkg>/package.json` for a `types` field).
   - A matching `@types/<pkg>` is already installed.
   - The module is an internal `@joplin/*` package or a relative path to a `.ts` file.
   - It's a Node built-in (`path`, `fs`, etc.) — but confirm the installed `@types/node` covers the specific submodule (e.g. `readline/promises` needs ≥ 17).
2. **Pick the import form that matches the module's shape:**
   - Named exports: `import { foo, bar } from 'pkg'` (use `{ foo as bar }` to rename rather than a separate `const`).
   - `module.exports = X` style: with `esModuleInterop: false` (this repo's setting), use `import * as X from 'pkg'`. `import X from 'pkg'` only works when the typings declare a real default export.
3. **Leave the `require()` in place** when:
   - The module has no types available — migrating would force a `// @ts-ignore`, a new `declare module` shim, or a fresh `@types/*` install.
   - There's an explicit comment explaining why `require()` is needed (RN bundler compatibility, conditional / lazy / side-effect load, dynamic path).
   - It's part of a `: typeof X = require(...)` pattern already typed via a paired `import type` — a deliberate runtime workaround.
   - Converting would require non-mechanical refactoring.
4. **Don't install new `@types/*` packages or upgrade dependencies** as part of this migration. The aim is to surface existing types, not expand the dependency graph.
5. **Don't make whitespace-only changes** to surrounding code (per `CLAUDE.md`).
6. **Don't add explanatory comments** unless the *why* is non-obvious (e.g. "needs `import *` because the package uses `module.exports = ...`").
7. After each package, run `yarn tsc --noEmit` from the package directory to verify nothing broke. The pre-commit hook handles linting and spellcheck.

## Files to never touch

- `packages/generator-joplin/generators/app/templates/**` — Yeoman template; package lacks a `typescript` dep.
- `packages/app-cli/tests/support/plugins/*/api/types.ts` and similar — regenerated plugin API copies.
- Anything under `**/node_modules/**` or `**/build/**`.

## Workflow

- One PR per package, smallest first.
- **Update this file as you go, not at the end.** Sessions can be auto-compacted or interrupted; the on-disk file is the source of truth.
  - After each file: add an entry to the package's **Per-package detail** subsection.
  - After each package: update the **Status** table row.
  - For large packages (`lib`, `app-desktop`, `app-mobile`), checkpoint the row every ~20 files.
- When resuming, re-read this file first and compare entries against the live state with:
  ```bash
  grep -rn --include="*.ts" --include="*.tsx" -E "^\s*const\s+[^=]+=\s*require\(" packages/[name here]/
  ```
  Trust the file, not memory.

## Status

Counts captured 2026-05-25, before any work. `const X = require(...)` occurrences in `*.ts`/`*.tsx` source files, excluding `node_modules/` and `build/`. Some will legitimately stay as `require()` after evaluation (untyped libraries, RN bundler workarounds, etc.) — the "Converted" column tracks how many were actually migrated.

| # | Package | Requires (start) | Converted | Remaining | Status |
|---|---|---:|---:|---:|---|
| 1 | pdf-viewer | 1 | 0 | 1 | done (2026-05-25) |
| 2 | fork-uslug | 1 | 0 | 1 | done (2026-05-25) |
| 3 | default-plugins | 1 | 1 | 0 | done (2026-05-25) |
| 4 | editor | 2 | 0 | 2 | done (2026-05-25) |
| 5 | plugin-repo-cli | 2 | 0 | 2 | done (2026-05-25) |
| 6 | htmlpack | 3 | 3 | 0 | done (2026-05-25) |
| 7 | utils | 9 | 4 | 5 | done (2026-05-25) |
| 8 | renderer | 23 | 7 | 16 | done (2026-05-25) |
| 9 | server | 26 | 9 | 17 | done (2026-05-25) |
| 10 | tools | 49 | 29 | 20 | done (2026-05-25) |
| 11 | app-cli | 49 | 18 | 31 | done (2026-05-25) |
| 12 | app-mobile | 61 | 18 | 43 | done (2026-05-25) |
| 13 | app-desktop | 131 | 33 | 98 | done (2026-05-25) |
| 14 | lib | 195 | 55 | 140 | done (2026-05-25) |
| — | generator-joplin | 1 | — | — | excluded (template) |

Total in-scope `require()` calls at start: **558** (counted across `*.ts`/`*.tsx`, excluding `**/node_modules/**`, `**/build/**` and `**/dist/**`).

## Recommended order

Smallest first so the workflow stabilises before the large ones:

1. Warm-up: pdf-viewer, fork-uslug, default-plugins, editor, plugin-repo-cli, htmlpack (~10 requires total)
2. utils (9)
3. renderer (23)
4. server (27)
5. tools (49)
6. app-cli (54)
7. app-mobile (61)
8. app-desktop (131)
9. lib (195) — biggest; do last so prior packages inform the work

## Per-package detail

Each package gets a subsection added below when work begins. Format:

```markdown
## packages/<name>
Session date: YYYY-MM-DD

Files processed:
- path/to/file.ts — N converted, M left (reasons for skips)

Files skipped entirely:
- path/to/file.ts — reason
```

## packages/pdf-viewer
Session date: 2026-05-25

Files skipped entirely:
- main.tsx — `react-dom/client` has types and tsc passes the conversion, but the package's build scripts are all disabled (`tsc: ""`, `build: ""`) and the bundling pipeline that produces the `vendor/lib/@joplin/pdf-viewer/` artifact isn't traceable from this repo. The author explicitly chose `require()` to fix a React 18 warning (commit 58da15432). Leave alone until the bundling path is understood.

## packages/fork-uslug
Session date: 2026-05-25

Files skipped entirely:
- lib/uslug.ts — `node-emoji` has no types installed.

## packages/default-plugins
Session date: 2026-05-25

Files processed:
- build.ts — 1 converted (`yargs` → `import * as yargs from 'yargs'`).

## packages/editor
Session date: 2026-05-25

Files skipped entirely:
- CodeMirror/utils/formatting/RegionSpec.ts — imports from `@joplin/lib/string-utils-common`, which is a deliberate `.js` file (no `.d.ts`) per the comment at the top of that file.
- CodeMirror/CodeMirror5Emulation/CodeMirror5Emulation.ts — same as above.

## packages/plugin-repo-cli
Session date: 2026-05-25

Files skipped entirely:
- commands/updateRelease.ts — `node-fetch` is `require(...).default` with an explicit comment linking the known node-fetch issue; `gh-release-assets` has no types installed.

## packages/htmlpack
Session date: 2026-05-25

Files processed:
- packToWriter.ts — 1 converted (`html-entities`).
- index.ts — 1 converted (`datauri/sync` — uses `import X = require(...)` because the package uses `export = X`).
- utils/parseHtmlAsync.ts — 1 converted (`@joplin/fork-htmlparser2`).

## packages/utils
Session date: 2026-05-25

Files processed:
- Logger.ts — 2 converted (`moment`, `async-mutex`), 1 left (`sprintf-js` — no @types installed).
- html.ts — 2 converted (`html-entities`, `@joplin/fork-htmlparser2`).

## packages/renderer
Session date: 2026-05-25

Files processed:
- htmlUtils.ts — 2 converted (`html-entities`, `@joplin/fork-htmlparser2`).
- utils.ts — 1 converted (`html-entities`).
- highlight.ts — 1 converted (`highlight.js/lib/core`).
- MdToHtml.ts — 1 converted (`html-entities`); 4 left: `md5` (no types), `@joplin/fork-uslug` (types describe `{ default: fn }` but `index.js` unwraps `.default`, so types are misaligned with runtime), `markdown-it-anchor` (no types), `./defaultNoteStyle` (JS, no `.d.ts`).
- MdToHtml/renderMedia.ts — 1 converted (`html-entities`).
- MdToHtml/linkReplacement.ts — 1 converted (`html-entities`); 2 left: `../urlUtils.js` (JS, no `.d.ts`), `font-awesome-filetypes` (no types).

Files skipped entirely:
- MarkupToHtml.ts — `markdown-it` is paired with `import type * as MarkdownItType` (deliberate workaround for mobile bundling, per the convention this plan skips).
- HtmlToHtml.ts — `md5` (no types).
- MdToHtml/rules/katex.ts — `md5`, `json-stringify-safe` (no types); `./katex_mhchem.js` (JS, no `.d.ts`).
- MdToHtml/rules/highlight_keywords.ts — `md5` (no types); `../../stringUtils.js` (JS).
- MdToHtml/rules/sanitize_html.ts — `md5` (no types).
- MdToHtml/rules/link_open.ts — `../../urlUtils.js` (JS).
- MdToHtml/rules/fountain.ts — `../../vendor/fountain.min.js` (vendor JS).

## packages/server
Session date: 2026-05-25

Files processed:
- app.ts — 1 converted (`sqlite3`); 2 left: `@koa/cors` (no types), `@joplin/lib/shim-init-node.js` (lib's `.ts` source uses `module.exports = { ... }` rather than ES `export`, so a typed `import {}` fails — would require modifying lib to convert).
- utils/htmlUtils.ts — 1 converted (`html-entities`).
- utils/bytes.ts — 1 converted (`pretty-bytes`, via `import X = require()` because the package uses `export =`).
- utils/joplinUtils.ts — 1 converted (`@joplin/lib/string-utils`); 1 left (`@joplin/lib/database-driver-node.js` — JS only, no `.d.ts`).
- utils/testing/populateDatabase.ts — 1 converted (`sqlite3`); 1 left (`shim-init-node`, same reason as app.ts).
- utils/routeUtils.ts — 1 converted (`@joplin/lib/path-utils`).
- utils/testing/testRouters.ts — 2 converted (`query-string`, `child_process.spawn`); 1 left (inline `require('child_process').exec` inside a function — would require refactoring to top-level).
- routes/admin/emails.ts — 1 converted (`@joplin/lib/string-utils`).

Files skipped entirely:
- config.ts — `require(`${__dirname}/packageInfo.js`)` uses a template-literal path; the line is also already typed via `: PackageJson`.
- utils/crypto.ts, models/UserModel.ts, routes/index/mfa.ts — `thirty-two` (no types).
- utils/prettycron.ts — `dayjs` and its plugins (`advancedFormat`, `calendar`) are convertible, but this is a vendored file (see its header comment) so kept untouched; converting also surfaces a pre-existing `noImplicitReturns` issue at line 153. `later` has no types.
- utils/stripe.ts — `stripe` has types, but the existing call site uses `stripeLib(secretKey)` as a function; the typed `Stripe` is a class requiring `new Stripe(secretKey, config)`. Converting would force a logic/signature change.
- services/TaskService.ts — `node-cron` (no types).
- routes/admin/tasks.ts — `prettycron` (no types).
- tools/generateTypes.ts — inline `require('fs')` inside a function (would require refactoring to top-level).

## packages/tools
Session date: 2026-05-25

Files processed:
- release-clipper.ts — 1 converted (`md5-file`).
- generate-database-types.ts — 2 converted (`@rmp135/sql-ts` merged with existing named import; `fs-extra`).
- generate-images.ts — 2 converted (`md5-file`, `sharp`). The typed `sharp` import surfaced a latent issue at line 682 where `s = s.toFile(destPath)` assigned a `Promise<OutputInfo>` to a `Sharp` variable, which fixed in the same follow-up: replaced with `await s.toFile(destPath)`.
- build-release-stats.ts — 1 converted (`yargs-parser`).
- update-readme-contributors.ts — 1 converted (`./tool-utils.js` merged into the existing `import { rootDir }`); 1 left (`request`, no types).
- release-android.ts — 3 converted (`path`, `uri-template`, `node-fetch`). The typed `node-fetch` import surfaced a latent issue at line 230 where `'Content-Length': binaryBody.length` (a `number`) didn't match `HeadersInit`'s `string` requirement; fixed in the same follow-up by wrapping in `String(...)`.
- website/utils/news.ts — 1 converted (`moment`).
- update-readme-sponsors.ts — 1 converted (`@joplin/lib/string-utils`).
- website/build.ts — 3 converted (`glob`, `path`, `md5-file`).
- tool-utils.ts — 3 converted at top level (`node-fetch`, `execa`, `moment`); 7 inline `require()` calls left inside functions (`child_process.exec`/`.spawn`, `path`, `https`, `crypto`, `fs`, `readline`) — converting needs moving to module top, which is a small refactor.
- fuzzer/model/FolderRecord.test.ts — 1 converted (`sqlite3`); 1 left (`@joplin/lib/shim-init-node`, same `module.exports = { ... }` issue as in server).
- website/processDocs.ts — 4 converted (`md5-file`, `@joplin/fork-htmlparser2`, `style-to-js` — drop `.default` since `export = X` is callable, `crypto`).
- website/utils/applyTranslations.ts — 2 converted (`html-entities`, `@joplin/fork-htmlparser2`).
- website/utils/frontMatter.ts, website/utils/frontMatter.test.ts — 1 each (`moment`).
- website/utils/openGraph.ts — 1 converted (`@joplin/lib/string-utils`).
- website/buildTranslations.ts — 1 converted (`gettext-extractor`).

Files skipped entirely:
- 6 inline `const argv = require('yargs').argv;` calls inside `main`-style async functions (postPreReleasesToForum.ts, tagServerLatest.ts, build-translation.ts, git-changelog.ts, release-android.ts, website/updateNews.ts) — would require a top-level import and a refactor to keep semantics; skipped per the inline-require policy.
- fuzzer/cli.ts — `@joplin/lib/shim-init-node` (same as above).
- convertThemesToCss.ts — `require(`${baseThemeDir}/${themeFile}`)` is a dynamic template-literal path.
- checkLibPaths.test.ts — inline `require('../lib/shim')` inside a function.
- utils/translation.ts — `gettext-parser` (no types).
- website/updateNews.ts — `rss` (no types).

## packages/app-cli
Session date: 2026-05-25

Files processed:
- tests/MdToHtml.ts — 2 converted (`@joplin/lib/path-utils`, `@joplin/lib/theme`).
- tests/HtmlToMd.ts — 2 converted (`os`, `@joplin/lib/path-utils`).
- app/command-version.ts — 2 converted (`@joplin/lib/locale`, `@joplin/lib/versionInfo` — dropped the `.default` since `import X from` resolves the default export).
- app/command-settingschema.ts, command-testing.ts, command-mkbook.ts, command-e2ee.ts — 1 each converted (`./base-command` — TS file with `export default class BaseCommand`).
- app/command-apidoc.ts — 1 converted (`@joplin/lib/string-utils.js` → `@joplin/lib/string-utils`).
- app/cli-integration-tests.test.ts — 3 converted (`sqlite3`, `@joplin/lib/services/SettingUtils`, `./utils/shimInitCli`); 2 left: `@joplin/lib/database-driver-node.js` (JS-only), `@joplin/lib/shim-init-node.js` (lib uses `module.exports = {}`). The typed `shimInitCli` surfaced a latent interface mismatch (`ShimInitOptions` declares `sharp`, `React`, `electronBridge`, `pdfJs` as required, runtime defaults them to null); fixed in a follow-up by passing them as `null` explicitly.
- app/gui/StatusBarWidget.ts — 2 converted (`chalk`, `strip-ansi`); 3 left (`tkwidgets/BaseWidget.js`, `tkwidgets/framework/termutils.js` — no types, `../autocompletion.js` — JS).
- app/LinkSelector.ts — 1 converted (`open`).

Files skipped entirely (sibling command files use the CommonJS `module.exports = Command` pattern — converting requires changing the exported file too, which is out of scope):
- app/command-unpublish.test.ts, command-publish.test.ts, command-done.test.ts, command-rmbook.test.ts, command-rmnote.test.ts, command-share.test.ts, command-mkbook.test.ts — `require('./command-X')` patterns.

Files skipped entirely (other reasons):
- app/command-sync.ts — 1 converted (`./base-command`); the typed `BaseCommand` surfaced a latent issue at line 65 (a variadic `log: (...s: string[])` callback spread-passed to single-arg `stdout`); fixed in the follow-up by narrowing the callback to single-arg. Other requires in the file (`@joplin/lib/onedrive-api-node-utils.js` JS-only, `./cli-utils.js` JS-only, `md5` no types) left.
- app/command-keymap.ts, command-ls.ts, command-help.ts, command-import.ts, app/app.ts — `./cli-utils.js` and `./help-utils.js` are JS-only.
- app/app.ts — `@joplin/lib/Cache` is JS-only; line 164 `require(\`./${path}\`)` and line 442 `require('./app-gui.js')` are dynamic/JS.
- app/services/plugins/PluginRunner.ts, tests/services/plugins/sandboxProxy.ts — `@joplin/lib/services/plugins/sandboxProxy` is JS-only.
- app/utils/shimInitCli.ts — `@joplin/lib/shim-init-node.js` (same lib issue as elsewhere).
- app/gui/FolderListWidget.ts — `tkwidgets/ListWidget.js` (no types).
- app/command-edit.ts, command-e2ee.ts, command-ls.ts — inline `require()` calls inside functions, or untyped (`sprintf-js`, `md5`, `fs-extra` inline).
- tests/services/plugins/PluginService.ts — dynamic `require(contentScript.path).default`.

## packages/app-mobile
Session date: 2026-05-25

Files processed:
- PluginAssetsLoader.ts — 1 converted (`@joplin/lib/path-utils`).
- commands/util/showResource.ts — 1 converted (`react-native-file-viewer`, default import).
- components/NoteList.tsx — 1 converted (`@joplin/lib/locale`).
- components/NoteBodyViewer/hooks/useOnResourceLongPress.ts — 1 converted (`@joplin/lib/locale`, dropped `.js` extension).
- components/SelectDateTimeDialog.tsx — 1 converted (`react-native-modal-datetime-picker`, default).
- components/side-menu-content.tsx — 1 converted (`@joplin/lib/string-utils`).
- components/screens/JoplinCloudLoginScreen.tsx — 2 converted (`react-redux`, `@joplin/lib/locale`).
- components/screens/Note/Note.tsx — 1 converted (`@react-native-clipboard/clipboard`, default).
- components/screens/UpgradeSyncTargetScreen.tsx — 1 converted (`react-redux`).
- root.tsx — 1 converted (`react-redux`); several `require()`s left for internal mobile `.js` modules (`./components/app-nav.js`, `./components/screens/onedrive-login.js`) and the `@joplin/lib/SyncTarget*.js` family — TS counterparts either don't exist or coexist with `.js` build artifacts in ways Metro currently relies on.
- services/AlarmServiceDriver.ios.ts — 1 converted (`@react-native-community/push-notification-ios`, default, merged with existing `import type`).
- utils/TlsUtils.ts, utils/setupNotifications.ts — 1 each converted (`react-native` named imports).
- utils/buildStartupTasks.ts — 1 converted (`react-native-version-info`, default); other requires left (SyncTarget JS-only, `AlarmServiceDriver` platform extensions kept as `require` to avoid platform-resolution complications during this mechanical pass).
- utils/fs-driver/fs-driver-rn.ts — 1 converted (`rn-fetch-blob`, default); `md5` left (no types).

Files skipped entirely (latent issues surfaced; reverted for now, worth a follow-up):
- services/e2ee/RSA.react-native.ts — typed `react-native-rsa-native` returns `KeyPair`, but the file casts it to a local `LegacyRsaKeyPair` interface with a missing `keySizeBits` property. Real interface drift; needs deciding whether the local interface should adapt or the cast is now wrong.
- utils/database-driver-react-native.web.ts — `@sqlite.org/sqlite-wasm` typings only export `init` (default); the runtime exposes `sqlite3Worker1Promiser` as a named property. Typed import fails — the `.d.ts` is incomplete vs the JS. Could be fixed with a local `declare module` augmentation, but that's beyond a mechanical pass.
- components/screens/dropbox-login.tsx — typed `connect` from `react-redux` initially rejected `DropboxLoginScreenComponent` because `BaseScreenComponent` was still `require()`'d. Fixed in a follow-up: typed both imports, declared `Props` / `State` interfaces, and made `styles_` / `shared_` proper instance fields.

Files skipped entirely (other reasons):
- utils/initReact.ts — `require('react')` is deliberate (comment explains the timing constraint with `shim.setReact`).
- utils/shim-init-react/index.web.ts — `: typeof ShimType = require()` is the deliberate paired-with-`import type` workaround pattern.
- utils/shim-init-react/index.ts — inline `require('react-native-version-info')` and JS-only `geolocation-react.js`.
- root.tsx — `react-native-dropdownalert` (no types); see "Files processed" note for the internal mobile `.js` requires.
- components/global-style.ts — `color` (no types).
- components/ProfileSwitcher/ProfileEditor.tsx — `react-native-paper` is required as `const { TextInput } = require(...)` but the package has no types.
- components/screens/Notes/Notes.tsx, components/screens/Note/Note.tsx (line 85) — `@joplin/lib/reserved-ids` is JS-only.
- contentScripts/markdownEditorBundle/useWebViewSetup.ts — `@joplin/lib/resourceUtils` is JS-only.
- contentScripts/richTextEditorBundle/contentScript/convertHtmlToMarkdown.ts — `@joplin/turndown`, `@joplin/turndown-plugin-gfm` (no types).
- services/voiceTyping/VoiceTyping.ts, fs-driver/fs-driver-rn.web.worker.ts, services/voiceTyping/whisper.test.ts — `md5` / `@joplin/whisper-voice-typing` no types.
- services/AlarmServiceDriver.android.ts — `@joplin/react-native-alarm-notification` (no types).
- utils/database-driver-react-native.ts — `react-native-sqlite-storage` (no types).
- utils/getPackageInfo.ts — `../packageInfo.js` (JS-only).
- components/plugins/backgroundPage/pluginRunnerBackgroundPage.ts — `path` and `punycode` (mobile-specific bundling; `punycode/` has no types).
- gulpfile.ts, web/webpack.config.ts — build-time files (`gulp`, `@joplin/tools/*`, `@pmmmwh/react-refresh-webpack-plugin`, `../babel.config` are untyped or build-only).

Files skipped entirely:
- time.ts — 2 deliberate `const X: typeof X = require(...)` workarounds for React Native bundler compatibility (already typed via paired `import type`).
- ipc.ts — `tcp-port-used` has no types.
- cli.ts — `readline/promises` is not in the installed `@types/node` (16.x); migrating would require a node-types upgrade.

## packages/app-desktop
Session date: 2026-05-25

This package has the highest concentration of cascading type errors when imports are typed: typed `themeStyle` / `buildStyle` from `@joplin/lib/theme` propagates strict `CSSProperties` union types (`WhiteSpace`, `TextAlign`, `OverflowX`, etc.) into inline `style` objects in many screens; typed `connect` from `react-redux` rejects components whose base class is still untyped (similar to the `BaseScreenComponent` case in app-mobile); typed `styled-components` and `reselect.createSelector` produce broad downstream errors. To keep this commit mechanical, those four patterns were intentionally **not converted** here. Many other safe patterns were converted.

Files processed:
- ElectronAppWrapper.ts — 1 converted (`@joplin/lib/path-utils`); 3 left (`@joplin/lib/shim` typeof-workaround, `fs-extra` redundant with existing import, inline `electron-window-state`).
- InteropServiceHelper.ts — 1 converted (`@joplin/lib/path-utils`).
- commands/copyDevCommand.ts — 2 converted (`@electron/remote`, `electron.clipboard`).
- gui/ClipperConfigScreen.tsx — 1 converted (`electron.clipboard`); `connect`, `themeStyle` left (see note above).
- gui/ErrorBoundary.tsx — 1 converted (`electron.ipcRenderer`).
- gui/MainScreen.tsx — 1 converted (`electron.ipcRenderer`).
- gui/MenuBar.tsx — 1 converted (`electron.clipboard`).
- gui/NoteEditor/NoteBody/CodeMirror/v5/CodeMirror.tsx — 1 converted (`electron.clipboard`).
- gui/NoteEditor/NoteBody/TinyMCE/TinyMCE.tsx — 1 converted (`electron.clipboard`).
- gui/NoteEditor/NoteEditor.tsx — 1 converted (`@joplin/lib/string-utils`); `themeStyle` left.
- gui/NoteEditor/commands/pasteAsMarkdown.ts — 1 converted (`electron.clipboard`).
- gui/NoteEditor/utils/clipboardUtils.ts — 1 converted (`electron.clipboard`).
- gui/NoteEditor/utils/contextMenu.ts — 4 converted (`electron.clipboard`, `@joplin/lib/path-utils`, two `fs-extra`).
- gui/NoteEditor/utils/index.ts — 1 converted (`@joplin/renderer` MarkupToHtml).
- gui/NoteEditor/utils/resourceHandling.ts — 1 converted (`electron.clipboard`); `@joplin/renderer.utils` left (the `.utils` namespace access doesn't cleanly map to a named import).
- gui/NoteEditor/utils/useNoteSearchBar.ts — 1 converted (`@joplin/lib/services/CommandService`, default).
- gui/NoteListItem/utils/getNoteTitleHtml.ts — 1 converted (`@joplin/lib/string-utils`).
- gui/NotePropertiesDialog.tsx — 1 converted (`electron.clipboard`).
- gui/NoteRevisionViewer.tsx — 1 converted (`@joplin/lib/urlUtils`); `react-tooltip` reverted because the typed import isn't usable as a JSX component (typings expose only the module namespace); `connect` left.
- gui/ResourceScreen.tsx — 1 converted (`pretty-bytes`); `connect`, `themeStyle` left.
- gui/Root.tsx — 1 converted (`react-dom/client`); `connect, Provider`, `styled-components` `ThemeProvider`/`StyleSheetManager`/`createGlobalStyle` left.
- gui/Root_UpgradeSyncTarget.tsx — 1 converted (`electron.ipcRenderer`).
- gui/ShareNoteDialog.tsx — 1 converted (`electron.clipboard`).
- gui/WindowCommandsAndDialogs/commands/deleteFolder.ts — 1 converted (`@joplin/lib/string-utils`).
- gui/utils/NoteListUtils.ts — 1 converted (`electron.clipboard`).
- main-html.ts — 2 converted (`pdfjs-dist`, `is-apple-silicon`); `@joplin/lib/shim-init-node.js` (lib's `module.exports = {}` issue) left.
- plugins/GotoAnything.tsx — 1 converted (`electron.clipboard`); `connect` left.
- services/plugins/PlatformImplementation.ts — 1 converted (`electron.clipboard, nativeImage`).
- services/plugins/PluginRunner.ts — 1 converted (`electron.ipcRenderer`).

Files skipped entirely / important categories left untouched:
- All `react-redux connect` requires (15) — typed `connect` rejects components whose Props haven't been declared and/or extend untyped base classes. Worth a follow-up that types each component's `Props` interface.
- All `styled-components` requires (9) — typed `styled` surfaces broad `IntrinsicAttributes` mismatches on existing `<Button type=... mr=... />` usage and breaks downstream files (e.g. SearchInput, Button.tsx). Out of scope.
- All `@joplin/lib/theme` `themeStyle` / `buildStyle` requires (9) — typed `themeStyle` returns a strict `ThemeStyle` whose CSS-property values are union types; spreading `theme.textStyle` into inline `style={{ ... }}` then fails on `WhiteSpace` / `TextAlign` / `OverflowX`. Need to either narrow each inline style with `as const` / `CSSProperties` casts, or change the lib's types. Out of scope.
- `reselect.createSelector` (in ExtensionBadge.tsx) — typed selector return propagates `CSSProperties` cascade into inline `style`. Out of scope.
- `@joplin/lib/services/PluginManager` (3), `@joplin/lib/onedrive-api-node-utils.js` (1), `@joplin/lib/markJsUtils` (1), `@joplin/lib/countable/Countable` (1), `@joplin/lib/envFromArgs` (1), `@joplin/lib/components/shared/dropbox-login-shared` (1), `@joplin/lib/reserved-ids` (2), `./packageInfo.js` (5), `./services/electron-context-menu` (1), `./execCommand` (1), `./supportedLocales` (1) — JS-only sources.
- `@joplin/lib/shim-init-node.js` (2) — same `module.exports = { ... }` issue described under packages/server.
- `md5` (4), `debounce` (5), `color` (2), `styled-system` (3), `taboverride` (1), `source-map-support` (1), `react-toggle-button` (1), `formatcoords` (1), `gulp` (1), `@joplin/tools/*` (3) — no types installed.
- `react` (2) — `const React = require('react')` is used in class components; typing surfaces missing `Props` declarations on the affected `React.Component` subclasses (TagItem, ClipperConfigScreen). Same kind of follow-up as the `connect` cluster.
- Inline `require()` calls inside functions / arrow callbacks (bridge.ts, mockClipboard.ts, markdownEditor.spec.ts, ElectronAppWrapper.ts `electron-window-state`) — would require moving to top level.

## packages/lib
Session date: 2026-05-25

Many conversions, but several modules surfaced latent type issues that need their own follow-up:

Categories converted (across roughly 40 files):
- Internal lib paths: `./path-utils`, `./string-utils`, `./urlUtils`, `./markdownUtils`, `./errorUtils`, `./locale` (when paired with a TS source).
- Node built-ins: `path`, `os`, `url`, `events` (where it doesn't cascade), `https`, `http`, `crypto`, `buffer`, `zlib`, `timers`, `dgram`, `querystring` — namespace or destructured.
- npm packages: `async-mutex` (incl. the `.Mutex` access pattern), `html-entities` (`.AllHtmlEntities`), `chokidar`, `fast-deep-equal`, `query-string`, `markdown-it`, `md5-file`, `string-to-stream`, `@joplin/renderer` (`MarkupToHtml`), `sqlite3`.

Latent issues surfaced & reverted (worth follow-ups):
- `moment` in `time.ts`: typed `moment()` rejects the `string | number | Date | { toDate(): Date }` union — `anythingToDateTime` / `anythingToMs` rely on narrowing `o` past `{ toDate(): Date }` via `'toDate' in o`, but TS doesn't propagate the narrowing into the `moment(o, format)` call. Fixed in a follow-up by converting to a typed namespace import and adding a `const input = o as string | number | Date` cast for the moment calls. `services/interop/InteropService_Importer_Md_frontmatter.test.ts` keeps `require('moment')` for now.
- `fs-extra` in `fs-driver-node.ts`: typed `fs.appendFile(path, content, { encoding })` and `fs.writeFile(path, content, { encoding })` don't accept `{ encoding: string }` — they expect `{ encoding: BufferEncoding }`. Fixed in a follow-up by converting the `require()` to a typed namespace import and casting `encoding as BufferEncoding` at the three internal fs call sites; the public method signatures stay as `string` to match the base class.
- `reselect.createSelectorCreator` / `defaultMemoize` and `re-reselect.createCachedSelector` (in `reducer.ts`, `services/commands/MenuUtils.ts`, `services/commands/ToolbarButtonUtils.ts`): typed `createCachedSelector` returns a different signature than the codebase assumes — `selectArrayShallow(props, cacheKey)` then errors with `Expected 1 arguments, but got 2`. Probably the reselect version was upgraded without updating call sites.
- `events.EventEmitter` in `services/plugins/Plugin.ts`: typed `EventEmitter.on(event, fn)` rejects `Function`-typed callbacks. Fixed in a follow-up: tighten the two callbacks to `(...args: unknown[]) => void`, switch to a typed `import { EventEmitter } from 'events'`, drop the two `@typescript-eslint/ban-types` disables and the `InstanceType<typeof EventEmitter>` workaround.
- `@joplin/lib/string-utils` `formatCssSize` in `services/style/themeToCss.ts`: same latent issue as the desktop's `useThemeCss.ts` — `formatCssSize(value: string)` was called with `number`. Fixed in a follow-up by widening the signature to `string | number` (the body already handled both at runtime); both call sites then convert cleanly to typed imports.

Files skipped entirely (other reasons):
- `@joplin/lib/shim-init-node` (multiple places) and JS-only sibling files (`./reserved-ids`, `./database-driver-node.js`, `./file-api.js`, `./file-api-driver-onedrive.js`, `./file-api-driver-webdav`, `./randomClipperPort`, `./import-enex-md-gen.js`, `./import-enex-html-gen.js`, `./resourceUtils.js`, `./SyncTarget*.js`, `./parameters.js`, `./vendor/*`, `./welcomeAssets`) — JS-only, no TS counterpart.
- No-types npm packages: `sprintf-js` (14), `md5` (9), `url-parse` (3), `tcp-port-used` (2), `string-padding` (2), `@joplin/fork-sax` (2), `word-wrap`, `uglifycss`, `server-destroy`, `relative`, `node-notifier`, `multiparty`, `image-data-uri`, `hpagent`, `diff-match-patch`, `base64-stream`, `base-64`, `@joplin/turndown`, `@joplin/turndown-plugin-gfm`, `@aws-sdk/client-s3`, `@adobe/css-tools`, `better-sqlite3`, `sharp`, `color`, `@joplin/fork-uslug`.
- Inline `require()` inside functions / `.default` accesses on JS-only modules (`shim-init-node.ts` has many of these inside `shimInit`).
- `electron` requires inside `shim-init-node.ts` (lib used in node + electron; the `require('electron').nativeImage` calls inside conditional branches are deliberately late-loaded).
- `EventDispatcher.test.ts` line 125: kept as `require(...).default` because the test specifically asserts that the `require + .default` pattern works.

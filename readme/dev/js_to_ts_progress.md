# `.js` → `.ts` Migration Progress

Tracks the effort to convert remaining JavaScript source files in the Joplin repo to TypeScript.

## Goal

Convert `.js` files under `packages/*` to `.ts` (or `.tsx` where JSX is present) so the type checker can validate them, **without changing observable behaviour** and **without significant refactoring**. The point is mechanical type-coverage, not redesign — every conversion should be reviewable as "the same code, now typed".

## Rules

For each `.js` file to convert:

1. **Use `git mv`** to record the rename. Don't `cp`/`rm`.
2. **Actively look for the right type before falling back to `any`.** For each parameter / return / field, try in this order:
   - An entity type from `@joplin/lib/services/database/types` (`NoteEntity`, `FolderEntity`, `TagEntity`, `ResourceEntity`, …).
   - A published library type from the package's `.d.ts` in `node_modules/<pkg>/`.
   - A sibling file's existing interface — a parameter named `cmd`, `options`, etc. often has a typed counterpart nearby.
   - For Redux call sites, `State` from `@joplin/lib/reducer` and `Store<State>` from `redux`.
   - For singleton-class globals (e.g. `app()` returning `Application`), the class may need a one-line `export` added in its source file before it can be imported.
   - For small fixed-variant records, a discriminated union beats `Record<string, any>`.

   Only fall back to `any` when the right type genuinely isn't available — typically callbacks from untyped third-party libraries or truly heterogeneous bags. Add `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- <reason>` only when ESLint actually fires. An implicit `any` from `const X = require('untyped-pkg')` is fine and needs no disable — but prefer a typed `import` (`import X from 'pkg'` or `import * as X from 'pkg'`) when the package ships its own `.d.ts`; reach for `require()` only when the dependency is genuinely untyped or when the surrounding code already uses CommonJS for a reason (e.g. the app-cli command dispatcher).
3. **Treat every `@typescript-eslint/no-explicit-any` disable as a candidate for one more look before committing** — sometimes the right type only becomes obvious after a second pass over the file, or after finishing related files in the same round. If a tightening genuinely doesn't fit in the conversion commit (e.g. it requires exporting a type from another file or coordinating across files), do it as its own small follow-up commit; the [`any` cleanup guide](any_cleanup_progress.md) covers the methodology for that kind of work.
4. **Match the export style of nearby converted files.**
   - `packages/app-cli/app/command-*.ts` use `module.exports = Command;` (the dispatcher loads them via `require()` and calls `new CommandClass()` without `.default`).
   - Other `packages/app-cli/app/**/*.ts` (widgets, helpers) use `export default …` and consumers add `.default` to their `require()` — see `gui/FolderListWidget` and `gui/StatusBarWidget` as in-tree precedents.
   - `packages/lib/**/*.ts` files use `export default …` for single-class/function modules and named `export const …` for utilities.
   - **Never** convert `export const X = …` to `export default X` just to silence `import/prefer-default-export` when the file name and symbol name diverge — add a second meaningful export (often a `type`/`interface` the callers benefit from), or use `// eslint-disable-next-line import/prefer-default-export -- <reason>`.
5. **Behavior-preserving casts where types are too narrow.** Apply a local `as` cast with a one-line comment and log the underlying signature mismatch somewhere for follow-up (the PR description, an issue, or a per-project review-later note) — fixing the upstream type is a correctness improvement out of scope for a mechanical conversion.
6. **Dead code surfaced by the type checker.** Unused private fields/parameters may be removed in the conversion commit when:
   - The field/parameter is genuinely unread anywhere (grep to confirm).
   - Removal doesn't change any caller's required argument count.
   - The removal is noted in the commit message.

   Unused parameters of callbacks from **untyped third-party libraries** (e.g. mark.js's `filter(node, term, termCounter, counter)`) must be **kept** with underscore prefixes (`_term`, `_termCounter`, `_counter`) — the signature documents the contract since no `.d.ts` exists.
7. **Build verification** after each conversion, from the repo root:
   - `yarn updateIgnored` — auto-appends the compiled `.js` paths to `.gitignore` and `.eslintignore` under the `# AUTO-GENERATED` marker. Without this, `yarn tsc` output gets committed by accident.
   - `yarn tsc --noEmit` to type-check; then `yarn tsc` to produce the compiled `.js`.
8. **Update consumers when the export shape changes.** Named-export conversions usually need no caller updates (destructured `require()` continues to work). `module.exports = X` → `export default X` conversions require callers to add `.default`. Do these in the same commit.
9. **Don't add explanatory comments unless really needed.** A typed parameter or cast usually speaks for itself. Only comment when the *why* would otherwise mislead a future change. Long block comments describing what the code does are unwelcome.
10. **Pre-commit hook failures.** `git commit` may fail with `yarn linter-precommit failed to spawn: SIGKILL` — the SIGKILL message hides the real lint/spellcheck error above. Use `git commit ... 2>&1 | tail -40` to see it. Common blockers:
    - cSpell flags a non-word (test data, OAuth secrets, base64): add `// cSpell:ignore word1 word2` at the top of the file or wrap an offending block in `// cSpell:disable` / `// cSpell:enable`. For real technical words, extend `packages/tools/cspell/dictionary*.txt` per [readme/dev/spellcheck.md](spellcheck.md) instead.
    - `.gitignore`/`.eslintignore` out of date: re-run `yarn updateIgnored`.
    - `checkGeneratedFiles`: a `.js` that should be compiled output is still git-tracked. `git rm --cached <path>`.
    - `import/prefer-default-export`: see rule 4.
    - `@typescript-eslint/no-floating-promises`: pre-existing fire-and-forget — add `void` in front of the call.
    - `id-denylist`: a denylisted identifier (e.g. `notebook`) appears as a CLI arg name. Add `// eslint-disable-next-line id-denylist -- <reason>` on the line.
11. **For CLI changes, run the fuzzer.** Every 3–5 commits in `packages/app-cli/`, run `yarn syncFuzzer start --steps 5` from the repo root as an end-to-end smoke check. 5 steps is the CI default (under a minute); 50 steps takes several minutes — only use when looking for race conditions. The fuzzer is also the **primary** verification for sync-target files (`SyncTarget*.ts`, `*Api.ts`, `file-api-driver-*.ts`); `yarn jest` doesn't meaningfully exercise them.
12. **Test files come after their source.** Converting `Foo.test.js` is high-value only when `Foo.ts` is already TypeScript. When `Foo.js` is still JS, convert the source first, then the test, in two separate commits.
13. **Rename legacy aspect-test names.** When converting a `Foo_Aspect.test.js`, also rename to `Foo.aspect.test.ts` to match the convention used elsewhere (e.g. `Note.customSortOrder.test.ts`).
14. **No whitespace-only changes to surrounding code** (per `CLAUDE.md`).

## Files to never touch

- **Config files** kept as `.js` by design:
  - `.eslintrc.js`, `jest.config.js`, `jest.setup.js`, `*.config.js`, `gulpfile.js`, `webpack.config.js`, `babel.config.js`, `metro.config.js`, `*sidebars.js` (Docusaurus), `lint-staged.config.js`
- **`packages/app-cli/app/main.js`** — has a `#!/usr/bin/env node` shebang that `tsc` would strip, breaking the executable. Conversion needs a shebang-preservation strategy first (a tsconfig banner, a thin shebang-only wrapper, or a post-tsc gulp step). After any such attempt, verify the shebang is still on line 1 of the compiled output.
- **`packages/lib/markJsUtils.js`** — converting it broke the desktop note viewer (`yarn test-ui markdownEditor` in `packages/app-desktop/` reported failures; `yarn tsc` and `yarn jest` did not). Most likely cause: a downstream bundler ships this file to a browser context where `tsc`'s CommonJS-wrapper output (`Object.defineProperty(exports, '__esModule', …)`, `exports.default = …`) isn't valid in the executing environment. Don't retry without first identifying the bundling path and confirming `yarn test-ui markdownEditor` stays green afterwards.
- **`packages/generator-joplin/`** — the package does not depend on `typescript`. Converting would require adding the dep and tsconfig wiring. Out of scope; if explicitly requested, surface the missing-dependency issue first.
- **Vendored / forked third-party code** — preserved verbatim:
  - `packages/fork-sax/**`, `packages/fork-uslug/**`
  - `packages/turndown/src/**`, `packages/turndown-plugin-gfm/src/**`
  - `packages/lib/countable/Countable.js`
  - `packages/app-clipper/content_scripts/Readability*.js`, `packages/app-clipper/content_scripts/JSDOMParser.js`
  - `packages/renderer/assets/**/*.min.js` (abc, mermaid, …)
- **Plugin test fixtures** — intentionally JS to mimic real Joplin plugin code:
  - `packages/app-cli/tests/support/plugins/**/*.js`
  - `packages/app-desktop/integration-tests/resources/test-plugins/**/*.js`
- **Generated files**:
  - `packages/app-desktop/locales/index.js` and similar locale indexes
  - `packages/app-desktop/services/plugins/plugin_index.js`
  - `packages/server/public/js/**` (server-side static assets shipped to browsers)
- **Web-only mock files** in `packages/app-mobile/web/mocks/**` (webpack aliases for Node-builtin shims).
- **`packages/app-cli/app/fuzzing.js`** (2400+ lines, exploratory test runner — convert only if specifically requested).
- **`packages/app-cli/app/build-doc.js`** (dev-time documentation generator — low value, skip unless requested).

## Workflow

- **One PR per package.** Process small packages first to validate the workflow before tackling the large ones.
- **One commit per converted file.** Related type fixes the conversion surfaces — e.g. tightening `BaseCommand.description()` to return `string` — go in their own follow-up commit. Use the message form `Chore: Migrate <area> <Name> to TypeScript`.
- **Update this file as you go, not at the end.** Same rules as the `any` cleanup file — write per-file entries immediately to `./js_to_ts_progress_details.md`, update the **Status** table row after each package, and checkpoint every ~10 files in big packages so a context-loss costs at most one checkpoint.
- **Commit the progress file alongside (or as part of) the package's PR.** When updating, also sync the PR body: `gh pr edit <PR-number> --body-file readme/dev/js_to_ts_progress.md`.
- **If a session stops mid-package**, the per-file detail records exactly where to resume.
- **At the start of any new session, re-read this file first** — it is the source of truth, not conversational memory.

### Context exhaustion considerations

Same as the [`any` cleanup guide](any_cleanup_progress.md#context-exhaustion-considerations) — quality degrades before context fails, one package per session, on-disk file is the only reliable resume record, re-read when resuming.

## Status

Counts captured against the `dev` branch before any conversion work from this plan landed. Excludes the "Files to never touch" categories above. Numbers are approximate; re-verify at session start with:

```bash
git ls-files packages/<name>/ | grep -E '\.js$' | grep -v -E '<the excludes>'
```

| # | Package | `.js` source | `.test.js` | Notes |
|---|---|---:|---:|---|
| 1 | pdf-viewer | 1 | 0 | warm-up |
| 2 | transcribe | 1 | 0 | warm-up |
| 3 | react-native-saf-x | 1 | 0 | warm-up |
| 4 | react-native-alarm-notification | 1 | 0 | warm-up |
| 5 | turndown | 1 | 0 | check if vendored before converting |
| 6 | turndown-plugin-gfm | 6 | 0 | likely vendored; verify first |
| 7 | onenote-converter | 3 | 0 | wrapper over Rust/WASM module |
| 8 | server | 2 | 0 | public-facing browser JS; verify safe |
| 9 | doc-builder | 4 | 0 | Docusaurus components |
| 10 | app-clipper | 9 | 0 | exclude `Readability*` / `JSDOMParser` |
| 11 | app-cli | 9 | 0 | excluding `main.js`, `fuzzing.js`, `build-doc.js` |
| 12 | renderer | 12 | 0 | excluding asset bundles |
| 13 | app-mobile | 12 | 0 | excluding `web/mocks/*` |
| 14 | tools | 17 | 0 | many are dev scripts; selectively convert |
| 15 | app-desktop | 28 | 0 | mix of services/gui/style |
| 16 | lib | 36 | 12 | biggest; sync targets, models, utilities |
| — | generator-joplin | — | — | excluded (no TS dep) |

**Approximate scope: ~143 source `.js` files + ~12 lib `.test.js` files.** Other packages' tests use different patterns (`tests/feature_*.js` in `app-cli`, etc.) — count those when starting the package.

## Recommended order

Smallest / lowest-risk packages first to validate the workflow and surface patterns:

1. **Warm-up** (one file each): `pdf-viewer`, `transcribe`, `react-native-saf-x`, `react-native-alarm-notification`, `turndown` (if not vendored).
2. **`renderer`** (12) — markdown rule modules; well-typed dependency surface.
3. **`app-clipper`** (9) — popup app; verify the webpack bundle still loads after each.
4. **`app-cli`** (9) — feature tests and small remaining utilities.
5. **`server`** (2) — check whether `public/js/` is loaded raw or bundled.
6. **`doc-builder`** (4) — Docusaurus-side; dev-time only, low blast radius.
7. **`onenote-converter`** (3) — small wrapper.
8. **`tools`** (17) — independent dev scripts; convert incrementally.
9. **`app-mobile`** (12) — verify the Metro bundler still ships the files cleanly.
10. **`app-desktop`** (28) — split into commit-sized chunks.
11. **`lib`** (36 source + 12 tests) — biggest; group by sub-area (sync targets, models, utilities) so each PR is focused.

## Per-package detail

Each package gets a subsection added to `./js_to_ts_progress_details.md` when work begins. See that file for the structure (mirrors `any_cleanup_progress_details.md`).

# Pre-commit Checklist

## Do

- Run `yarn updateIgnored` from the repo root after adding any new TypeScript file — otherwise `checkIgnoredFiles` will block the commit.
- Add `public` (or `private`/`protected`) to every class method and constructor — the linter requires explicit accessibility modifiers (`@typescript-eslint/explicit-member-accessibility`).
- Name interfaces without an `I` prefix — use `StrictPascalCase` (e.g. `PythonProcessManagerApi`, not `IPythonProcessManager`).
- Use `export default` when a file has only one export (`import/prefer-default-export`).
- Use tabs for indentation, single quotes for strings.
- Avoid restricted identifiers: `err` is banned — use `error` instead.
- Check for unknown words with cSpell before committing. If cSpell flags a legitimate term, follow `readme/dev/spellcheck.md`.

## Do Not

- Do not use an `I` prefix for interface names.
- Do not leave methods or constructors without an accessibility modifier.
- Do not add a named export when `export default` is required (single-export files).
- Do not add inline `style={{...}}` or styled-components in the desktop app — use RSCSS + SCSS.
- Do not use `any` types when a proper TypeScript type is available.
- Do not add JSDoc-style comments (`/** */`) — use `//` only.
- Do not hard-wrap lines in markdown files.
- Do not write SQL queries outside of `packages/lib/models`.

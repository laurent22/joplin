# Joplin Guidelines

## Quick Reference

- Tabs for indentation
- Single quotes for strings  
- Proper TypeScript types (avoid `any`)
- Don't annotate return types or const types when TypeScript can infer them. Annotate only when TypeScript would otherwise infer `any`.
- Comments should be only with `//` and should not contain jsdoc syntax
- If you duplicate a substantial block of code, add a comment above it noting the duplication and referencing the original location.
- When creating Jest tests, there should be only one `describe()` statement in the file.
- Focus on testing essential behaviour and edge cases — avoid adding tests for every minor detail.
- Avoid duplicating code in tests; when testing the same logic with different inputs, use `test.each` or shared helpers instead of repeating similar test blocks.
- Do not make white space changes - do not add unnecessary new lines, or spaces to existing code, or wrap existing code.
- If you add a new TypeScript file, run `yarn updateIgnored` from the root.
- When an unknown word is detected by cSpell, handle it as per the specification in `readme/dev/spellcheck.md`
- To compile TypeScript, use `yarn tsc`. To type-check without emitting files, use `yarn tsc --noEmit`.
- Default to no comments. Only add one when the why is non-obvious (workaround, hidden constraint, subtle invariant). Never explain what the code does — names handle that. Keep necessary comments to one or two line where possible.
- SQL queries should only be done from within models (in packages/lib/models).
- In markdown files, do not hard-wrap paragraphs. Let the renderer wrap lines; only insert newlines for actual paragraph or list breaks.

## Styling (desktop app)

Use RSCSS + SCSS files for the desktop app, never inline `style={{...}}` or styled-components — see readme/dev/spec/desktop_styling.md. Inline `style` is only for genuinely dynamic per-instance values (computed width, position). Use `var(--joplin-*)` CSS variables for theme colours instead of reading the theme in JS.

## Full Documentation

- Coding style: [readme/dev/coding_style.md](readme/dev/coding_style.md)
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)

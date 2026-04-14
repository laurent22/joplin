# Joplin Guidelines

## Quick Reference

- Tabs for indentation
- Single quotes for strings  
- Proper TypeScript types (avoid `any`)
- Comments should be only with `//` and should not contain jsdoc syntax
- If you duplicate a substantial block of code, add a comment above it noting the duplication and referencing the original location.
- When creating Jest tests, there should be only one `describe()` statement in the file.
- Focus on testing essential behaviour and edge cases — avoid adding tests for every minor detail.
- Avoid duplicating code in tests; when testing the same logic with different inputs, use `test.each` or shared helpers instead of repeating similar test blocks.
- Do not make white space changes - do not add unnecessary new lines, or spaces to existing code, or wrap existing code.
- If you add a new TypeScript file, run `yarn updateIgnored` from the root.
- When an unknown word is detected by cSpell, handle is as per the specification in `readme/dev/spellcheck.md`

## Full Documentation

- Coding style: [readme/dev/coding_style.md](readme/dev/coding_style.md)
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)

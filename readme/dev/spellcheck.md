# Spellchecking using CSpell

The Markdown and TypeScript files are automatically checked using [CSpell](https://cspell.org/). The configuration is in `cspell.json`

## Manually checking spelling

Spellchecking can be manually done on the entire codebase by running `yarn spellcheck --all`, or on one or more files using `yarn spellcheck /path/to/file`

## Precommit hook

The precommit hook will automatically check spelling on newly committed files.

## Ignoring words

There are two ways to ignore words:

### Using the word list

Simply add the word to the last word list in `packages/tools/cspell/dictionary?.txt`.

Please note that there cannot be more than 400 (maybe 500) words in those lists. Beyond this, [CSpell will fail loading them](https://github.com/streetsidesoftware/cspell/issues/5222) and will no longer highlight words in VSCode. If the last dictionary contains more than 400 words, create a new one, and add a reference to it in `cspell.json`.

### Using comments

You can ignore a block of code by wrapping it in `// cSpell:disable` / `// cSpell:enable`.

Only do this when there's a large block of code that contains many words to be ignored. Otherwise prefer the word list because it means we don't pollute the code with additional comments.

Also do this when the words to be ignored are not actually words. One example is encrypted data because we don't want to add random meaningless strings to the word list.

### By ignoring paths or regexes

In `cspell.json`, use the `ignore` properties to skip certain files or folders, or to ignore text that matches a particular regex. For example, `"\[.*?\]\(https:\/\/github.com\/.*?\)"` is used to ignore all usernames in the changelogs.

## Visual Studio Code Extension

The [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension can be installed to automatically underline spelling mistakes. It will use the project `cspell.json` file.
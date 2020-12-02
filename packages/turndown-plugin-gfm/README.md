# turndown-plugin-gfm

A [Turndown](https://github.com/domchristie/turndown) plugin which adds GitHub Flavored Markdown extensions.

This is a fork of the original [turndown-plugin-gfm](https://github.com/domchristie/turndown-plugin-gfm) for use with [Joplin](https://github.com/laurent22/joplin). The changes are:

- New: Always render tables even if they don't have a header.
- New: Don't render the border of tables that contain other tables (frequent for websites that do the layout using tables). Only render the inner tables, if any, and if they also don't contain other tables.
- New: Replace newlines (`\n`) with `<br>` inside table cells so that multi-line content is displayed correctly as Markdown.
- New: Table cells are at least three characters long (padded with spaces) so that they render correctly in GFM-compliant renderers.
- New: Handle colspan in TD tags
- Fixed: Ensure there are no blank lines inside tables (due for example to an empty `<tr>` tag)
- Fixed: Fixed importing tables that contain pipes.

## Installation

npm:

```
npm install joplin-turndown-plugin-gfm
```

## Usage

```js
// For Node.js
var TurndownService = require('@joplin/turndown')
var turndownPluginGfm = require('@joplin/turndown-plugin-gfm')

var gfm = turndownPluginGfm.gfm
var turndownService = new TurndownService()
turndownService.use(gfm)
var markdown = turndownService.turndown('<strike>Hello world!</strike>')
```

turndown-plugin-gfm is a suite of plugins which can be applied individually. The available plugins are as follows:

- `strikethrough` (for converting `<strike>`, `<s>`, and `<del>` elements)
- `tables`
- `taskListItems`
- `gfm` (which applies all of the above)

So for example, if you only wish to convert tables:

```js
var tables = require('turndown-plugin-gfm').tables
var turndownService = new TurndownService()
turndownService.use(tables)
```

## License

turndown-plugin-gfm is copyright © 2017+ Dom Christie and released under the MIT license.

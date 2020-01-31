# Joplin Renderer

This is the renderer used by [Joplin](https://github.com/laurent22/joplin) to render notes in Markdown or HTML format.

## Installation

	npm i -s joplin-renderer

Certain plugins require additional assets like CSS, fonts, etc. These assets are in the `/assets` directory and should be copied to wherever the application can find them at runtime.

## Usage

```js
const { MarkupToHtml } = require('joplin-renderer');

const options = {};

// The notes are rendered using the provided theme. The supported theme properties are in `defaultNoteStyle.js`
// and this is what is used if no theme is provided. A `theme` object can be provided to override default theme
// properties.
const theme = {};

const markdown = "Testing `MarkupToHtml` renderer";

const markupToHtml = new MarkupToHtml(options);
const result = await markupToHtml.render(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, markdown, theme, options);

console.info('HTML:', result.html);
console.info('Plugin assets:', result.pluginAssets);
```

When calling `render()`, an object with the following properties is returned:

- `html`: The rendered HTML code
- `pluginAssets`: The assets required by the plugins

The assets need to be loaded by the calling application. For example this is how they are loaded in the Joplin desktop application:

```js
function loadPluginAssets(assets) {
	for (let i = 0; i < assets.length; i++) {
		const asset = assets[i];

		if (asset.mime === 'text/css') {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = 'pluginAssets/' + asset.name;
			document.getElementById('joplin-container-styleContainer').appendChild(link);
		}
	}
}
```
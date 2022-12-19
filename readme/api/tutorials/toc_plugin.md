# Creating a table of content plugin

This tutorial will guide you through the steps to create a table of content plugin for Joplin. It will display a view next to the current note that will contain links to the sections of a note. It will be possible to click on one of the header to jump to the relevant section.

Through this tutorial you will learn about several aspect of the Joplin API, including:

- The plugin API
- How to create a webview
- How to listen to changes in the user interface

## Setting up your environment

Before getting any further, make sure your environment is setup correctly as described in the [Get Started guide](https://github.com/laurent22/joplin/blob/dev/readme/api/get_started/plugins.md).

## Registering the plugin

All plugins must [register themselves](https://joplinapp.org/api/references/plugin_api/classes/joplinplugins.html) and declare what events they can handle. To do so, open `src/index.ts` and register the plugin as below. We'll also need to run some initialisation code when the plugin starts, so add the `onStart()` event handler too:

```typescript
// Import the Joplin API
import joplin from 'api';

// Register the plugin
joplin.plugins.register({

	// Run initialisation code in the onStart event handler
	// Note that due to the plugin multi-process architecture, you should
	// always assume that all function calls and event handlers are async.
	onStart: async function() {
		console.info('TOC plugin started!');
	},

});
```

If you now build the plugin and try to run it in Joplin, you should see the message `TOC plugin started!` in the dev console.

## Getting the current note

In order to create the table of content, you will need to access the content of the currently selected note, and you will need to refresh the TOC every time the note changes. All this can be done using the [workspace API](https://joplinapp.org/api/references/plugin_api/classes/joplinworkspace.html), which provides information about the active content being edited.

So within the `onStart()` event handler, add the following:

```typescript
joplin.plugins.register({

	onStart: async function() {

		// Later, this is where you'll want to update the TOC
		async function updateTocView() {
			// Get the current note from the workspace.
			const note = await joplin.workspace.selectedNote();

			// Keep in mind that it can be `null` if nothing is currently selected!
			if (note) {
				console.info('Note content has changed! New note is:', note);
			} else {
				console.info('No note is selected');
			}
		}

		// This event will be triggered when the user selects a different note
		await joplin.workspace.onNoteSelectionChange(() => {
			updateTocView();
		});

		// This event will be triggered when the content of the note changes
		// as you also want to update the TOC in this case.
		await joplin.workspace.onNoteChange(() => {
			updateTocView();
		});

		// Also update the TOC when the plugin starts
		updateTocView();
	},

});
```

Try the above and you should see in the console the event handler being called every time a new note is opened, or whenever the note content changes.

## Getting the note sections and slugs

Now that you have the current note, you'll need to extract the headers from that note in order to build the TOC from it. Since the note content is plain Markdown, there are several ways to do so, such as using a Markdown parser, but for now a quick and dirty solution is to get all the lines that start with any number of  `#` followed by a space. Any such line should be a header.

The function below, which you can copy anywhere in your file, will use this method and return an array of headers, with the text and level (H1, H2, etc.) of header:

```typescript
function noteHeaders(noteBody:string) {
	const headers = [];
	const lines = noteBody.split('\n');
	for (const line of lines) {
		const match = line.match(/^(#+)\s(.*)*/);
		if (!match) continue;
		headers.push({
			level: match[1].length,
			text: match[2],
		});
	}
	return headers;
}
```

Then call this function from your event handler:

```typescript
joplin.plugins.register({

	onStart: async function() {

		async function updateTocView() {
			const note = await joplin.workspace.selectedNote();

			if (note) {
				const headers = noteHeaders(note.body);
				console.info('The note has the following headers', headers);
			} else {
				console.info('No note is selected');
			}
		}

		// ...
	},

});
```

Later you will also need a way to generate the slug for each header. A slug is an identifier which is used to link to a particular header. Essentially a header text like "My Header" is converted to "my-header". And if there's already a slug with that name, a number is appended to it. Without going into too much details, you will need the "slug" package to generate this for you, so install it using `npm i -s 'git+https://github.com/laurent22/uslug.git#emoji-support'` from the root of your plugin directory (Note: you can also install the "uslug" package on its own, but it won't have emoji support).

Then this is the function you will need for Joplin, so copy it somewhere in your file:

```typescript
const uslug = require('@joplin/fork-uslug');

let slugs = {};

function headerSlug(headerText) {
	const s = uslug(headerText);
	let num = slugs[s] ? slugs[s] : 1;
	const output = [s];
	if (num > 1) output.push(num);
	slugs[s] = num + 1;
	return output.join('-');
}
```

And you will need a utility function to escape HTML. There are many packages to do this but for now you can simply use this:

```typescript
// From https://stackoverflow.com/a/6234804/561309
function escapeHtml(unsafe:string) {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
```

Again try to run the plugin and if you select a note with multiple headers, you should see the header list in the console.

## Creating a webview

In order to display the TOC in Joplin, you will need a [webview panel](https://joplinapp.org/api/references/plugin_api/classes/joplinviewspanels.html). Panels are a simple way to add custom content to the UI using HTML/CSS and JavaScript. First you would create the panel object and get back a view handler. Using this handler, you can set various properties such as the HTML content.

Here's how it could be done:

```typescript
joplin.plugins.register({

	onStart: async function() {
		// Create the panel object
		const panel = await joplin.views.panels.create('panel_1');

		// Set some initial content while the TOC is being created
		await joplin.views.panels.setHtml(panel, 'Loading...');

		async function updateTocView() {
			const note = await joplin.workspace.selectedNote();
			slugs = {}; // Reset the slugs

			if (note) {
				const headers = noteHeaders(note.body);

				// First create the HTML for each header:
				const itemHtml = [];
				for (const header of headers) {
					const slug = headerSlug(header.text);

					// - We indent each header based on header.level.
					//
					// - The slug will be needed later on once we implement clicking on a header.
					//   We assign it to a "data" attribute, which can then be easily retrieved from JavaScript
					//
					// - Also make sure you escape the text before inserting it in the HTML to avoid XSS attacks
					//   and rendering issues. For this use the `escapeHtml()` function you've added earlier.
					itemHtml.push(`
						<p class="toc-item" style="padding-left:${(header.level - 1) * 15}px">
							<a class="toc-item-link" href="#" data-slug="${escapeHtml(slug)}">
								${escapeHtml(header.text)}
							</a>
						</p>
					`);
				}

				// Finally, insert all the headers in a container and set the webview HTML:
				await joplin.views.panels.setHtml(panel, `
					<div class="container">
						${itemHtml.join('\n')}
					</div>
				`);
			} else {
				await joplin.views.panels.setHtml(panel, 'Please select a note to view the table of content');
			}
		}

		// ...
	},

});
```

Now run the plugin again and you should see the TOC dynamically updating as you change notes.

## Styling the view

In order to better integrate the TOC to Joplin, you might want to style it using CSS. To do so, first add a `webview.css` file next to `index.ts`, then you will need to let Joplin know about this file. This is done using the `addScript()` function (which is also used to add JavaScript files as we'll see later), like so:

```typescript
const panel = await joplin.views.panels.create('panel_1');
 // Add the CSS file to the view, right after it has been created:
await joplin.views.panels.addScript(panel, './webview.css');
```

This file is just a plain CSS file you can use to style your view. Additionally, you can access from there a number of theme variables, which you can use to better integrate the view to the UI. For example, using these variables you can use a dark background in dark mode, and a light one in light mode.

The CSS file below would give the view the correct font color and family, and the right background colour:

```css
/* In webview.css */

.container {
	background-color: var(--joplin-background-color);
	color: var(--joplin-color);
	font-size: var(--joplin-font-size);
	font-family: var(--joplin-font-family);
}

.toc-item a {
	color: var(--joplin-color);
	text-decoration: none;
}
```

Try the plugin and the styling should be improved. You may also try to switch to dark or light mode and see the style being updated.

## Making the webview interactive

The next step is to make the TOC interactive so that when the user clicks on a link, the note is scrolled to right header. This can be done using an external JavaScript file that will handle the click events. As for the CSS file, create a `webview.js` file next to `index.ts`, then add the script to the webview:

```typescript
// In index.ts
const panel = await joplin.views.panels.create('panel_1');
await joplin.views.panels.addScript(panel, './webview.css');
await joplin.views.panels.addScript(panel, './webview.js'); // Add the JS file
```

To check that everything's working, let's create a simple event handler that display the header slug when clicked:

```javascript
// In webview.js

// There are many ways to listen to click events, you can even use
// something like jQuery or React. This is how it can be done using
// plain JavaScript:
document.addEventListener('click', event => {
	const element = event.target;
	// If a TOC header has been clicked:
	if (element.className === 'toc-item-link') {
		// Get the slug and display it:
		const slug = element.dataset.slug;
		console.info('Clicked header slug: ' + slug);
	}
});
```

If everything works well, you should now see the slug in the console whenever you click on a header link. The next step will be to use that slug to scroll to the right header.

## Passing messages between the webview and the plugin

For security reason, webviews run within their own sandbox (iframe) and thus do not have access to the Joplin API. You can however send messages to and from the webview to the plugin, and you can call the Joplin API from the plugin.

From within a webview, you have access to the webviewApi object, which among others has a `postMessage()` function you can use to send a message to the plugin. Let's use this to post the slug info to the plugin:

Change `webview.js` like so:

```javascript
document.addEventListener('click', event => {
	const element = event.target;
	if (element.className === 'toc-item-link') {
		// Post the message and slug info back to the plugin:
		webviewApi.postMessage({
			name: 'scrollToHash',
			hash: element.dataset.slug,
		});
	}
});
```

Then from the plugin, in `src/index.ts`, you can listen to this message using the `onMessage()` handler. Then from this handler, you can call the `scrollToHash` command and pass it the slug (or hash).

```typescript
joplin.plugins.register({
	onStart: async function() {
		const panel = await joplin.views.panels.create('panel_1');

		// ...

		await joplin.views.panels.onMessage(panel, (message) => {
			if (message.name === 'scrollToHash') {
				// As the name says, the scrollToHash command makes the note scroll
				// to the provided hash.
				joplin.commands.execute('scrollToHash', message.hash)
			}
		});

		// ...
	}

	// ...
```

And that's it! If you run this code you should now have a fully functional TOC. The full source code is available there:

https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/toc/

Various improvements can be made such as improving the styling, making the header collapsible, etc. but that tutorial should provide the basic building blocks to do so. You might also want to check the [plugin API](https://joplinapp.org/api/references/plugin_api/classes/joplin.html) for further information or head to the [development forum](https://discourse.joplinapp.org/c/development/6) for support.

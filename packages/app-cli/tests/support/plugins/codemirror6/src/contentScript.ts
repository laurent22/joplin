// With the latest version of the plugin generator, Webpack converts @codemirror/ imports
// to Joplin imports (e.g. code equivalent to joplin.require('@codemirror/')).
//
// This is necessary. Having multiple copies of the CodeMirror libraries loaded can cause
// the editor to not work properly.
//
import { lineNumbers, highlightActiveLineGutter, EditorView } from '@codemirror/view';
import { foldGutter } from '@codemirror/language';
import { completeFromList } from '@codemirror/autocomplete';
import { MarkdownEditorContentScriptModule, ContentScriptContext } from 'api/types';
//
// For the above import to work, you may also need to add @codemirror/view as a dev dependency
// to package.json. (For the type information only).
//
// With older versions of the plugin template, CodeMirror can be instead imported with
//  const { lineNumbers } = joplin.require('@codemirror/view');


export default (_context: ContentScriptContext): MarkdownEditorContentScriptModule => {
	return {
		// - codeMirrorWrapper: A thin wrapper around CodeMirror 6, designed to be similar to the
		//     CodeMirror 5 API. If running in CodeMirror 5, a CodeMirror object is provided instead.
		//     If running in CodeMirror 6, codeMirrorWrapper.editor points to a CodeMirror 6 EditorView.
		plugin: (codeMirrorWrapper) => {
			// 1. Adding CodeMirror extensions
			// ===============================

			// We add the extension to CodeMirror using a helper method:
			codeMirrorWrapper.addExtension([
				lineNumbers(),

				// We can include multiple extensions here:
				highlightActiveLineGutter(),
				foldGutter(),

				// See https://codemirror.net/ for more built-in extensions and configuration
				// options.
			]);

			// See https://codemirror.net/ for more built-in extensions and configuration
			// options.


			// 2. Communicating with the main script
			// =====================================

			// We can also send/receive messages. We define a message handler in index.ts.
			void (async () => {
				const config = await context.postMessage('get-config');

				if (config.highlightGutter) {
					codeMirrorWrapper.addExtension([
						// Adds the cm-activeLineGutter CSS class to the active line.
						highlightActiveLineGutter(),

						// Add additional CSS to the editor. CodeMirror replaces "&" with
						// the CSS seletor for the editor.
						EditorView.theme({
							'& .cm-activeLineGutter': {
								outline: '1px solid var(--joplin-color)',
							},
						}),
					]);
				}

				if (config.addCompletions) {
					//
					// 3. Using Joplin's CodeMirror extensions
					// =======================================

					// Joplin also exposes extensions for autocompletion.
					// CodeMirror's built-in `autocompletion(...)` doesn't work if multiple plugins
					// try to use its `override` option.
					codeMirrorWrapper.addExtension([
						codeMirrorWrapper.joplinExtensions.completionSource(
							completeFromList(['# Example completion'])
						),

						// Joplin also exposes a Facet that allows enabling or disabling CodeMirror's
						// built-in autocompletions. These apply, for example, to HTML tags.
						codeMirrorWrapper.joplinExtensions.enableLanguageDataAutocomplete.of(true),
					]);
				}
			})();


			// 4. Registering editor commands
			// ==============================

			// We can also register editor commands. These commands can be later executed with:
			//   joplin.commands.execute('editor.execCommand', { name: 'name-here', args: [] })
			codeMirrorWrapper.registerCommand('wrap-selection-with-tag', (tagName: string) => {
				const editor: EditorView = codeMirrorWrapper.editor;

				// See https://codemirror.net/examples/change/
				editor.dispatch(editor.state.changeByRange(range => {
					const insertBefore = `<${tagName}>`;
					const insertAfter = `</${tagName}>`;
					return {
						changes: [
							{from: range.from, insert: insertBefore},
							{from: range.to, insert: insertAfter},
						],
						range: range.extend(
							range.from,
							range.to + insertBefore.length + insertAfter.length,
						),
					};
				}));
			});
		},

		// There are two main ways to style the CodeMirror editor:
		// 1. With a CodeMirror6 theme extension (see https://codemirror.net/examples/styling/#themes)
		// 2. With CSS assets
		// 
		// CSS assets can be added by exporting an `assets` function:
		assets: () => [
			// We can include styles by either referencing a file
			{ name: './assets/style.css' },

			// or including the style sheet inline
			{
				inline: true,
				mime: 'text/css',
				text: `
					/* This CSS class is added by the highlightActiveLineGutter extension: */
					.cm-gutter .cm-activeLineGutter {
						text-decoration: underline;
						color: var(--joplin-color2);
						background-color: var(--joplin-background-color2);
					}
				`,
			},
		],
	};
};

// With the latest version of the plugin generator, Webpack converts @codemirror/ imports
// to Joplin imports (e.g. code equivalent to joplin.require('@codemirror/')).
//
// This is necessary. Having multiple copies of the CodeMirror libraries loaded can cause
// the editor to not work properly.
//
import { EditorView, highlightActiveLineGutter, lineNumbers } from '@codemirror/view';
//
// For the above import to work, you may also need to add @codemirror/view as a dev dependency
// to package.json. (For the type information only).
//
// With older versions of the plugin template, CodeMirror can be instead imported with
//  const { lineNumbers } = joplin.require('@codemirror/view');


export default (context: { contentScriptId: string, postMessage: (message: any)=>Promise<any> }) => {
	return {
		// - codeMirrorWrapper: A thin wrapper around CodeMirror 6, designed to be similar to the
		//     CodeMirror 5 API. If running in CodeMirror 5, a CodeMirror object is provided instead.
		//     If running in CodeMirror 6, codeMirrorWrapper.editor points to a CodeMirror 6 EditorView.
		plugin: (codeMirrorWrapper) => {
			// We add the extension to CodeMirror using a helper method:
			codeMirrorWrapper.addExtension([
				lineNumbers(),
			]);

			// See https://codemirror.net/ for more built-in extensions and configuration
			// options.

			// We can also send/receive messages. We define a message handler in index.ts.
			(async () => {
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
			})();
		},
	};
};

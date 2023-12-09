import type * as CodeMirrorView from '@codemirror/view';
import { CodeMirrorContentScriptModule } from 'api/types';


export default (_context: { contentScriptId: string }) => {
	const plugin: CodeMirrorContentScriptModule = {
		// - codeMirrorWrapper: A thin wrapper around CodeMirror 6, designed to be similar to the
		//     CodeMirror 5 API. If running in CodeMirror 5, a CodeMirror object is provided instead.
		// - codeMirrorLibraries: Gives access to @codemirror/view, @codemirror/state, and other
		//     codemirror libraries. If running in CodeMirror 5, this is undefined.
		plugin: (codeMirrorWrapper, codeMirrorLibraries) => {
			// Use the same versions and instances of libraries as Joplin:
			// Similar to
			//    import { lineNumbers } from '@codemirror/view';
			// but uses the same instances and libraries as Joplin;
			const codeMirrorView = codeMirrorLibraries.codemirror.view as typeof CodeMirrorView;
			const { lineNumbers } = codeMirrorView;

			// We could also write, for example
			//   const { lineNumbers } = codeMirrorLibraries.codemirror.view;
			// but the above gives us additional type safety.

			// Finally, we add the extension to CodeMirror:
			codeMirrorWrapper.addExtension([
				lineNumbers(),
			]);

			// See https://codemirror.net/ for more built-in extensions and configuration
			// options.
		},
	};

	return plugin;
};
import type * as CodeMirrorState from '@codemirror/state';
import type * as CodeMirrorView from '@codemirror/view';

import { CodeMirrorContentScriptModule } from 'api/types';


export default (_context: { contentScriptId: string }) => {
	const plugin: CodeMirrorContentScriptModule = {
		plugin: (codeMirror, codeMirrorLibraries) => {
			// Use the same versions and instances of libraries as Joplin:
			const { lineNumbers } = codeMirrorLibraries.codemirror.view as typeof CodeMirrorView;
			const { StateEffect } = codeMirrorLibraries.codemirror.state as typeof CodeMirrorState;
			
			const editorView: CodeMirrorView.EditorView = codeMirror.editor;

			// We use an appendConfig effect to add extensions to the editor.
			// See https://codemirror.net/examples/config/ for more information.
			editorView.dispatch({
				effects: [
					StateEffect.appendConfig.of([
						lineNumbers(),
					]),
				],
			});
		},
	};

	return plugin;
};
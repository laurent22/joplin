import joplin from 'api';
import { ContentScriptType } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		joplin.contentScripts.register(
			ContentScriptType.CodeMirrorPlugin,
			'cm6-example',
			'./contentScript.js',
		);

		// Calls an editor command registered in contentScript.ts.
		joplin.commands.register({
			name: 'underlineSelection',
			label: 'Underline selected text',
			execute: async () => {
				joplin.commands.execute('editor.execCommand', {
					name: 'wrap-selection-with-tag',
					args: [ 'u' ],
				});
			},
		});
	},
});

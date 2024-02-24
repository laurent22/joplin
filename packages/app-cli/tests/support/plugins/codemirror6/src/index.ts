import joplin from 'api';
import { ContentScriptType } from 'api/types';
import registerSettings from './utils/registerSettings';

joplin.plugins.register({
	onStart: async function() {
		const contentScriptId = 'cm6-example';

		await joplin.contentScripts.register(
			ContentScriptType.CodeMirrorPlugin,
			contentScriptId,
			'./contentScript.js',
		);

		await registerSettings();

		// Messages are sent by contentScript.ts
		await joplin.contentScripts.onMessage(contentScriptId, async (message: any) => {
			if (message === 'get-config') {
				return {
					// For now, we hardcode the "highlightGutter" setting. See the "settings"
					// example plugin for how we might make the highlightGutter setting configurable.
					highlightGutter: await joplin.settings.value('highlight-active-line'),

					addCompletions: false,
				};
			} else {
				throw new Error(`Unknown message ${message}`);
			}
		});

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

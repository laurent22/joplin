import joplin from 'api';
import { ContentScriptType } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		const contentScriptId = 'cm6-example';

		await joplin.contentScripts.register(
			ContentScriptType.CodeMirrorPlugin,
			contentScriptId,
			'./contentScript.js',
		);

		// Messages are sent by contentScript.ts
		await joplin.contentScripts.onMessage(contentScriptId, async (message: any) => {
			if (message === 'get-config') {
				return {
					// For now, we hardcode the "highlightGutter" setting. See the "settings"
					// example plugin for how we might make the highlightGutter setting configurable.
					highlightGutter: true,
				};
			} else {
				throw new Error(`Unknown message ${message}`);
			}
		});
	},
});

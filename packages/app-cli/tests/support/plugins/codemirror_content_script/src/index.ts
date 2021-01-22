import joplin from 'api';
import { ContentScriptType } from 'api/types';
import { MenuItemLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		console.info('Match Highlighter started!');
		await joplin.contentScripts.register(
			ContentScriptType.CodeMirrorPlugin,
			'matchHighlighter',
			'./joplinMatchHighlighter.js'
		);
	},
});

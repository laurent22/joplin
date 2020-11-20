import joplin from 'api';
import { ContentScriptType } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		console.info('Match Highlighter started!');
		await joplin.plugins.registerContentScript(
			ContentScriptType.CodeMirrorPlugin,
			'matchHighlighter',
			'./joplinMatchHighlighter.js'
		);
	},
});

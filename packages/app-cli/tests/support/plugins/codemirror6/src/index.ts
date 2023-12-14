import joplin from 'api';
import { ContentScriptType } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		joplin.contentScripts.register(
			ContentScriptType.CodeMirrorPlugin,
			'cm6-example',
			'./contentScript.js',
		);
	},
});

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

		await joplin.commands.register({
			name: 'printSomething',
			label: 'Print some random string',
			execute: async () => {
				await joplin.commands.execute('editor.execCommand', {
					name: 'printSomething',
					args: ['Anything']
				});
			},
		});

		await joplin.views.menuItems.create('printSomethingButton', 'printSomething', MenuItemLocation.Tools, { accelerator: 'Ctrl+Alt+Shift+U' });
	},
});

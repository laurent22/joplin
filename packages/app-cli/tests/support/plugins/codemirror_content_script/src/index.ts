import joplin from 'api';
import { ContentScriptType } from 'api/types';
import { MenuItemLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		console.info('Match Highlighter started!');
		await joplin.plugins.registerContentScript(
			ContentScriptType.CodeMirrorPlugin,
			'matchHighlighter',
			'./joplinMatchHighlighter.js'
		);

		await joplin.commands.register({
			name: 'editor.printSomething',
			label: 'Print some random string',
			execute: async () => {
				alert('mathMode.printSomething not implemented by Editor yet');
			},
		});

		await joplin.views.menuItems.create('printSomethingButton', 'editor.printSomething', MenuItemLocation.Tools, { accelerator: 'Ctrl+Alt+Shift+U' });
	},
});

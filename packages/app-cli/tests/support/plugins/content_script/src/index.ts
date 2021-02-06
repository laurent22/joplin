import joplin from 'api';
import { ContentScriptType } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		await joplin.commands.register({
			name: 'testCommand',
			label: 'My Test Command',
			execute: async (...args) => {
				alert('Got command "testCommand" with args: ' + JSON.stringify(args));
			},
		});

		await joplin.commands.register({
			name: 'testCommandNoArgs',
			label: 'My Test Command (no args)',
			execute: async () => {
				alert('Got command "testCommandNoArgs"');
			},
		});

		await joplin.contentScripts.register(
			ContentScriptType.MarkdownItPlugin,
			'justtesting',
			'./markdownItTestPlugin.js'
		);

		await joplin.contentScripts.onMessage('justtesting', (message:any) => {
			return message + '+response';
		});
	},
});

import joplin from 'api';
import { ToolbarButtonLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		const worker = new Worker(`${await joplin.plugins.installationDir()}/worker.js`);
		worker.onmessage = event => {
			if ('response' in event.data) {
				alert(
					JSON.stringify(event.data.response)
				);
			}
		};

		joplin.commands.register({
			name: 'classifySelection',
			label: 'Run sentiment analysis on selected text',
			iconName: 'fas fa-robot',
			execute: async () => {
				const selectedText = await joplin.commands.execute('selectedText');
				if (!selectedText) {
					alert('No text selected!');
					return;
				}

				worker.postMessage({
					type: 'classify',
					text: selectedText,
				});
			},
		});

		await joplin.views.toolbarButtons.create(
			'classifySelectionButton',
			'classifySelection',
			ToolbarButtonLocation.EditorToolbar,
		);
	},
});

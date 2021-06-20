import joplin from 'api';
import { ToolbarButtonLocation } from 'api/types';

const imageDataUrl = 'data:image/png;base64,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';

joplin.plugins.register({
	onStart: async function() {
		await joplin.commands.register({
			name: 'readFromClipboard',
			label: 'Read data from clipboard',
			iconName: 'fas fa-drum',
			execute: async () => {
				const clipboard = (joplin as any).clipboard;
				console.info('Formats', await clipboard.availableFormats());
				console.info('Text:', await clipboard.readText());
				console.info('HTML:', await clipboard.readHtml());
				console.info('Image:', await clipboard.readImage());
			},
		});

		await joplin.commands.register({
			name: 'writeToClipboard',
			label: 'Read data from clipboard',
			iconName: 'fas fa-music',
			execute: async () => {
				const clipboard = (joplin as any).clipboard;
				await clipboard.writeImage(imageDataUrl);
				// await clipboard.writeText('text from plugin');
				// await clipboard.writeHtml('<p>text <strong>from</strong> plugin</p>');
			},
		});

		await joplin.views.toolbarButtons.create('readFromClipboard', 'readFromClipboard', ToolbarButtonLocation.NoteToolbar);
		await joplin.views.toolbarButtons.create('writeToClipboard', 'writeToClipboard', ToolbarButtonLocation.NoteToolbar);
	},
});

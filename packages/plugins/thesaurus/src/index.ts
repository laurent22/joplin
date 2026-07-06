import joplin from 'api';
import { ContentScriptType, MenuItemLocation } from 'api/types';

interface SynonymMessage {
	type: string;
	word: string;
	context: string;
}

joplin.plugins.register({
	onStart: async function() {
		console.warn('Synonym Finder plugin started!');

		await joplin.contentScripts.register(
			// This registers the contentScript (which runs inside the Markdown editor of Joplin)
			ContentScriptType.CodeMirrorPlugin,
			'synonymFinderScript',
			'./contentScript.js',
		);

		await joplin.contentScripts.onMessage(
			'synonymFinderScript',
			async (message: SynonymMessage) => {
				// Waits for contentScript to send it data
				if (message.type === 'synonymRequest') {
					// Logs the captured data. THIS IS WHAT IS BEING SENT TO THE BACKEND
					console.warn('Synonym Request Received');
					console.warn('Selected word:', message.word);
					console.warn('Sentence context sent to backend:', message.context);

					// THIS IS WHERE: selectedWord and sentenceContext ARE SENT TO THE BACKEND.

					// TEMPORARY: Acknowledges that the plugin received the word and sentence from contentScript.
					return { status: 'received' };
				}
			},
		);

		await joplin.commands.register({
			// Saves the "Find Synonym" command
			name: 'findSynonym',
			label: 'Find Synonym',
			execute: async () => {
				await joplin.commands.execute('editor.execCommand', {
					// Prompts the Synonym Finder
					name: 'triggerSynonymFinder',
					args: [],
				});
			},
		});

		await joplin.views.menuItems.create(
			// Adds the command to the menu
			'findSynonymMenuItem',
			'findSynonym',
			MenuItemLocation.EditorContextMenu,
		);
	},
});

import joplin from 'api';
import { ToolbarButtonLocation } from 'api/types';

// Minimal demo of the joplin.ai.chat() plugin API.
//
// - Summarises the current note via the user's configured AI provider.
// - Appends the summary to the note.
//
// The plugin does not pick a model or a provider — those are user settings.
// AI must be enabled in Settings → AI (and `Allow remote AI providers` ticked
// if the user picked a remote provider).

interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

joplin.plugins.register({
	onStart: async function() {
		await joplin.commands.register({
			name: 'aiSummariseCurrentNote',
			label: 'Summarise current note with AI',
			iconName: 'fas fa-magic',
			execute: async () => {
				const note = await joplin.workspace.selectedNote();
				if (!note) {
					alert('No note selected.');
					return;
				}

				const ai = (joplin as any).ai;
				if (!ai || typeof ai.chat !== 'function') {
					alert('This Joplin build does not expose joplin.ai.chat().');
					return;
				}

				const messages: ChatMessage[] = [
					{ role: 'system', content: 'You are a concise assistant. Summarise the user\'s note in 2–3 sentences.' },
					{ role: 'user', content: note.body || '' },
				];

				try {
					const summary = await ai.chat(messages);
					await joplin.commands.execute('editor.setText', `${note.body}\n\n---\n\n**AI summary:** ${summary}\n`);
				} catch (error) {
					alert(`AI call failed: ${error.message}`);
				}
			},
		});

		await joplin.views.toolbarButtons.create(
			'aiSummariseCurrentNote',
			'aiSummariseCurrentNote',
			ToolbarButtonLocation.EditorToolbar,
		);
	},
});

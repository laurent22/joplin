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
				const body = (note.body || '').trim();
				if (!body) {
					alert('The selected note is empty. Add some text and try again.');
					return;
				}

				const messages: ChatMessage[] = [
					{
						role: 'system',
						content: 'Summarise the following note in 2–3 sentences. Output only the summary itself — no preamble, no reasoning, no thinking tags, no headings.',
					},
					{ role: 'user', content: body },
				];

				let summary: string;
				try {
					// The plugin sandbox proxy mutates state per property access — we
					// must reach .chat from `joplin` in a single chain and call it
					// immediately. Storing `joplin.ai` or `joplin.ai.chat` first and
					// then invoking it later corrupts the path tracking.
					const result = await (joplin as any).ai.chat(messages);
					summary = result.text;
				} catch (error) {
					alert(`AI call failed: ${error.message}`);
					return;
				}

				if (!summary) {
					alert('AI call succeeded but the response was empty. Check that your provider is returning content.');
					return;
				}

				// Show the summary in a dialog first so we can confirm the round-trip
				// works even if writing to the editor doesn't.
				alert(`AI summary:\n\n${summary}`);

				try {
					const newBody = `${note.body || ''}\n\n---\n\n**AI summary:** ${summary}\n`;
					await joplin.data.put(['notes', note.id], null, { body: newBody });
				} catch (error) {
					alert(`Got the AI summary but failed to write it to the note: ${error.message}`);
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

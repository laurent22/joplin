import joplin from 'api';
import { ContentScriptType, ToolbarButtonLocation } from 'api/types';
import registerSettings from './utils/registerSettings';

joplin.plugins.register({
	onStart: async function() {
		const contentScriptId = 'cm6-example';

		await joplin.contentScripts.register(
			ContentScriptType.CodeMirrorPlugin,
			contentScriptId,
			'./contentScript.js',
		);

		await registerSettings();

		// Messages are sent by contentScript.ts
		await joplin.contentScripts.onMessage(contentScriptId, async (message: any) => {
			if (message === 'get-config') {
				return {
					// For now, we hardcode the "highlightGutter" setting. See the "settings"
					// example plugin for how we might make the highlightGutter setting configurable.
					highlightGutter: await joplin.settings.value('highlight-active-line'),
				};
			} else {
				throw new Error(`Unknown message ${message}`);
			}
		});

		// TODO: Remove the following when done testing mobile plugins
		// -----------------------------------------------------------

		const dialogHandle = await joplin.views.dialogs.create('myDialog1');
		await joplin.commands.register({
			name: 'show-selection',
			label: 'Show selection',
			iconName: 'fas fa-object-group',
			execute: async () => {
				// We don't necessarily need content scripts to interact with the editor. For
				// example, to get selected text, we can execute the `selectedText` command:
				const selectedText = (await joplin.commands.execute('selectedText') || 'None')
						.replace(/[<]/g, '&lt;')
						.replace(/[>]/g, '&gt;')
						.replace(/[&]/g, '&amp;');
				await joplin.views.dialogs.setHtml(dialogHandle, `
					<p><b>Selected text:</b></p>
					<pre>${selectedText}</pre>
				`);
				await joplin.views.dialogs.setButtons(dialogHandle, [
					{
						id: 'ok',
					},
				]);

				await joplin.views.dialogs.open(dialogHandle);
			},
		});
		await joplin.views.toolbarButtons.create('show-selection-btn', 'show-selection', ToolbarButtonLocation.EditorToolbar);

		await joplin.commands.register({
			name: 'underline',
			label: 'Underline selection',
			iconName: 'fas fa-underline',
			execute: async () => {
				// We don't necessarily need content scripts to interact with the editor. For
				// example, to get selected text, we can execute the `selectedText` command:
				const selectedText = await joplin.commands.execute('selectedText') ?? '';
				await joplin.commands.execute('replaceSelection', `<u>${selectedText}</u>`);
			},
		});
		await joplin.views.toolbarButtons.create('underline-btn', 'underline', ToolbarButtonLocation.EditorToolbar);
	},
});

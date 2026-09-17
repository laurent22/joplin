// Allows referencing the Joplin global:
/* eslint-disable no-undef */

// Allows the `joplin-manifest` block comment:
/* eslint-disable multiline-comment-style */

/* joplin-manifest:
{
	"id": "org.joplinapp.plugins.example.editorPlugin",
	"manifest_version": 1,
	"app_min_version": "3.1",
	"name": "JS Bundle test",
	"description": "JS Bundle Test plugin",
	"version": "1.0.0",
	"author": "",
	"homepage_url": "https://joplinapp.org"
}
*/

const registerEditorPlugin = async (editorViewId) => {
	const editors = joplin.views.editors;
	const saveCallbacks = [];

	await editors.register(editorViewId, {
		onSetup: async (viewHandle) => {
			await editors.setHtml(
				viewHandle,
				'<code>Loaded!</code>',
			);

			let noteId;
			// The note ID is exposed in the DOM so tests can wait for the first update.
			await editors.onUpdate(viewHandle, async event => {
				noteId = event.noteId;
				await editors.setHtml(
					viewHandle,
					`<code>Loaded!</code><code id="note-id">${noteId}</code>`,
				);
			});

			saveCallbacks.push(async () => {
				if (!noteId) throw new Error('saveNote called before the first onUpdate event');
				await editors.saveNote(viewHandle, {
					noteId,
					body: `Changed by ${editorViewId}`,
				});
			});
		},

		onActivationCheck: async _event => {
			// Always enable
			return true;
		},
	});

	await joplin.commands.register({
		name: `testEditorPluginSave-${editorViewId}`,
		label: `Test editor plugin save for ${editorViewId}`,
		iconName: 'fas fa-music',
		execute: async () => {
			for (const saveCallback of saveCallbacks) {
				await saveCallback();
			}
		},
	});
};

joplin.plugins.register({
	onStart: async function() {
		await registerEditorPlugin('test-editor-plugin');
	},
});

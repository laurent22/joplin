joplin.plugins.register({
	onStart: async function() {
		const folder = await joplin.data.post(['folders'], null, { title: "my plugin folder" });
		await joplin.data.post(['notes'], null, { parent_id: folder.id, title: "testing plugin!" });

		// await joplin.commands.register({
		// 	name: 'updateCurrentNote',
		// 	label: 'Update current note via the data API',
		// 	iconName: 'fas fa-music',
		// 	execute: async () => {
		// 		const noteIds = await joplin.workspace.selectedNoteIds();
		// 		const noteId = noteIds.length === 1 ? noteIds[0] : null;
		// 		if (!noteId) return;
		// 		console.info('Modifying current note...');
		// 		await joplin.data.put(['notes', noteId], null, { body: "New note body " + Date.now() });
		// 	},
		// });

		// await joplin.views.toolbarButtons.create('updateCurrentNoteButton', 'updateCurrentNote', 'editorToolbar');		
	},
});
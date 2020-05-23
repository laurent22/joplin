joplin.plugins.register({
	run: async function() {
		const folder = await joplin.model.post('folders', null, { title: "my plugin folder" });
		await joplin.model.post('notes', null, { parent_id: folder.id, title: "testing plugin!" });
	},
});
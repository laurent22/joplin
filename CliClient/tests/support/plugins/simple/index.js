joplin.plugins.register({
	onStart: async function() {
		const folder = await joplin.api.post('folders', null, { title: "my plugin folder" });
		await joplin.api.post('notes', null, { parent_id: folder.id, title: "testing plugin!" });
	},
});
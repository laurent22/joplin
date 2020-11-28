import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		const folder = await joplin.data.post(['folders'], null, { title: "my plugin folder" });
		await joplin.data.post(['notes'], null, { parent_id: folder.id, title: "testing plugin!" });
	},
});

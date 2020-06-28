joplin.plugins.register({
	onStart: async function() {
		await joplin.api.post('folders', null, { title: "multi - simple1" });
	},
});
joplin.plugins.register({
	run: async function() {
		await joplin.api.post('folders', null, { title: "multi - simple2" });
	},
});
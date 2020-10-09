joplin.plugins.register({
	onStart: async function() {
		await joplin.data.post(['folders'], null, { title: "multi - simple2" });
	},
});
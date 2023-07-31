const initPlugin = joplin => {

joplin.plugins.register({
	onStart: async function() {
		// eslint-disable-next-line no-console
		console.info('RUNNING AS PLUGIN 1: ', await joplin.plugins.id()); // await joplin.plugins.id());
		// const folder = await joplin.data.post(['folders'], null, { title: "my plugin folder" });
		// await joplin.data.post(['notes'], null, { parent_id: folder.id, title: "testing plugin!" });
	},
});

}

module.exports = { initPlugin };

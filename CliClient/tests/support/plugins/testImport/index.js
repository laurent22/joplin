const testImport = require('./testImport');

joplin.plugins.register({
	onStart: async function() {
		await joplin.data.post(['folders'], null, { title: testImport() });
	},
});
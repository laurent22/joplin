const testImport = require('./testImport');

joplin.plugins.register({
	onStart: async function() {
		await joplin.api.post('folders', null, { title: testImport() });
	},
});
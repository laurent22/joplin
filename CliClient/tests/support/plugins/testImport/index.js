const testImport = require('./testImport');

joplin.plugins.register({
	run: async function() {
		await joplin.api.post('folders', null, { title: testImport() });
	},
});
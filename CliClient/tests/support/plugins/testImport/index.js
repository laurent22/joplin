const testImport = require('./testImport');

joplin.plugins.register({
	run: async function() {
		await joplin.model.post('folders', null, { title: testImport() });
	},
});
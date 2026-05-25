
import testImport from './testImport';
joplin.plugins.register({
	onStart: async function() {
		await joplin.data.post(['folders'], null, { title: testImport() });
	},
});
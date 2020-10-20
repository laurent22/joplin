import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		await joplin.plugins.registerContentScript('markdownItPlugin', 'justtesting', './markdownItTestPlugin.js');
	},
});

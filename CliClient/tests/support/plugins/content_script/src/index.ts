import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		await (joplin.plugins as any).registerContentScript('markdownItPlugin', 'justtesting', './markdownItTestPlugin.js');
	},
});

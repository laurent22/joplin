import markdownItKbd from '@gerhobbelt/markdown-it-kbd';

joplin.plugins.register({
	onStart: async function() {
		joplin.filters.on('mdToHtmlPlugins', (markdownPlugins:any) => {
			return {
				...markdownPlugins,
				markdownItKbd: {
					module: markdownItKbd,
					options: {},
				},
			}
		});
	},
});

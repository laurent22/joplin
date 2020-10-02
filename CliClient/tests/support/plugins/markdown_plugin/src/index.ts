// NOTE: as of now this is not supported as plugins don't have the ability to
// load scripts within the main window (they can only load them within their
// own process). Support for something like web extensions "content script"
// would be needed to get this working.

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

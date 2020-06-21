joplin.plugins.register({
	run: async function() {
		joplin.filters.on('codeMirrorOptions', (options:any) => {
			return { ...options, lineNumbers: true };
		});
	},
});
joplin.plugins.register({
	onStart: async function() {
		joplin.filters.on('codeMirrorOptions', (options:any) => {
			return { ...options, lineNumbers: true };
		});
	},
});
joplin.plugins.register({
	run: async function() {
		joplin.runtime.preferences.set('codemirror.options.lineNumbers', true);
	},
});
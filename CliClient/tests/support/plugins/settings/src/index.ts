joplin.plugins.register({
	onStart: async function() {
		joplin.settings.register('myCustomSetting', {
			value: "default value",
			type: 2,
			public: true,
			label: () => 'My Custom Setting',
		});
	},
});

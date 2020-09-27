joplin.plugins.register({
	onStart: async function() {
		joplin.settings.registerSection('myCustomSection', {
			label: 'My Custom Section',
			iconName: 'fas fa-music',
		});
		
		joplin.settings.registerSetting('myCustomSetting', {
			value: "default value",
			type: 2,
			section: 'myCustomSection',
			public: true,
			label: () => 'My Custom Setting',
		});
	},
});

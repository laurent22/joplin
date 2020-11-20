import joplin from 'api';
import { ToolbarButtonLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		await joplin.settings.registerSection('myCustomSection', {
			label: 'My Custom Section',
			iconName: 'fas fa-music',
		});
		
		await joplin.settings.registerSetting('myCustomSetting', {
			value: 123,
			type: 1,
			section: 'myCustomSection',
			public: true,
			label: 'My Custom Setting',
		});

		await joplin.commands.register({
			name: 'incValue',
			label: 'Increment custom setting value',
			iconName: 'fas fa-music',
			execute: async () => {
				const value = await joplin.settings.value('myCustomSetting');
				console.info('Got value', value);
				await joplin.settings.setValue('myCustomSetting', value + 1);
			},
		});

		await joplin.commands.register({
			name: 'checkValue',
			label: 'Check custom setting value',
			iconName: 'fas fa-drum',
			execute: async () => {
				const value = await joplin.settings.value('myCustomSetting');
				alert('Current value is: ' + value);
			},
		});

		await joplin.views.toolbarButtons.create('incValueButton', 'incValue', ToolbarButtonLocation.NoteToolbar);
		await joplin.views.toolbarButtons.create('checkValueButton', 'checkValue', ToolbarButtonLocation.NoteToolbar);
	},
});

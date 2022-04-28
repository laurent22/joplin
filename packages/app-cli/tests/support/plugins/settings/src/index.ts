import joplin from 'api';
import { SettingItemSubType, SettingItemType, ToolbarButtonLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		await joplin.settings.registerSection('myCustomSection', {
			label: 'My Custom Section',
			iconName: 'fas fa-music',
		});
		
		await joplin.settings.registerSettings({
			'myCustomSetting': {
				value: 123,
				type: SettingItemType.Int,
				section: 'myCustomSection',
				public: true,
				label: 'My Custom Setting',
			},

			'multiOptionTest': {
				value: 'en',
				type: SettingItemType.String,
				section: 'myCustomSection',
				isEnum: true,
				public: true,
				label: 'Multi-options test',
				options: {
					'en': 'English',
					'fr': 'French',
					'es': 'Spanish',
				},
			},

			'mySecureSetting': {
				value: 'hunter2',
				type: SettingItemType.String,
				section: 'myCustomSection',
				public: true,
				secure: true,
				label: 'My Secure Setting',
			},

			'myFileSetting': {
				value: 'abcd',
				type: SettingItemType.String,
				section: 'myCustomSection',
				public: true,
				label: 'My file setting',
				description: 'This setting will be saved to settings.json',
				['storage' as any]: 2, // Should be `storage: SettingStorage.File`
			},

			'myFilePathAndArgs': {
				value: '',
				type: SettingItemType.String,
				subType: SettingItemSubType.FilePathAndArgs,
				section: 'myCustomSection',
				public: true,
				label: 'File path and args',
			},

			'myFilePathOnly': {
				value: '',
				type: SettingItemType.String,
				subType: SettingItemSubType.FilePath,
				section: 'myCustomSection',
				public: true,
				label: 'File path',
			},

			'myDirectory': {
				value: '',
				type: SettingItemType.String,
				subType: SettingItemSubType.DirectoryPath,
				section: 'myCustomSection',
				public: true,
				label: 'Directory path',
			},
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
				console.info('Current value is: ' + value);
				const secureValue = await joplin.settings.value('mySecureSetting');
				console.info('Secure value is: ' + secureValue);
				const fileValue = await joplin.settings.value('myFileSetting');
				console.info('Setting in file is: ' + fileValue);
			},
		});

		await joplin.views.toolbarButtons.create('incValueButton', 'incValue', ToolbarButtonLocation.NoteToolbar);
		await joplin.views.toolbarButtons.create('checkValueButton', 'checkValue', ToolbarButtonLocation.NoteToolbar);
	},
});

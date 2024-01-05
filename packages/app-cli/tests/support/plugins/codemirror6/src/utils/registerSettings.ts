
import joplin from 'api';
import { SettingItemType } from 'api/types';


const registerSettings = async () => {
	const sectionName = 'codeMirror-line-numbers';
	await joplin.settings.registerSection(sectionName, {
		label: 'CodeMirror line numbers',
		iconName: 'fas fa-pencil-alt',
	});

	await joplin.settings.registerSettings({
		'highlight-active-line': {
			value: true,
			type: SettingItemType.Bool,
			section: sectionName,
			public: true,
			label: 'Highlight active line',
		},
	});
};

export default registerSettings;
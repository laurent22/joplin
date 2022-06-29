import Setting from '@joplin/lib/models/Setting';
interface SettingAndValue {
    [settingName: string]: string;
}

interface InitialSettings {
    [pluginId: string]: SettingAndValue;
}

const initialSettings: InitialSettings = {
	'io.github.jackgruber.backup': {
		'path': '/JoplinBackup',
	},
};

export default async function setSettingsForDefaultPlugins() {

	Object.keys(initialSettings).forEach(pluginId => {
		Object.keys(initialSettings[pluginId]).forEach((setting) => {
			Setting.setValue(`plugin-${pluginId}.${setting}`, initialSettings[pluginId][setting]);
		});
	});
}

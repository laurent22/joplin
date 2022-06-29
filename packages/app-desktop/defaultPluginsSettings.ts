import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import path = require('path');

interface SettingAndValue {
    [settingName: string]: string;
}

interface InitialSettings {
    [pluginId: string]: SettingAndValue;
}

const makeBackupDir = async (backupDir: string) => {
	if (!await shim.fsDriver().exists(backupDir)) {
		await shim.fsDriver().mkdir(backupDir);
	}
};

const initialSettings: InitialSettings = {
	'io.github.jackgruber.backup': {
		'password': '1234',
		'passwordRepeat': '1234',
	},
};

export default async function setSettingsForDefaultPlugins() {

	const backupDir = path.join(`${Setting.value('profileDir')}`, '/testing-backup/');
	await makeBackupDir(backupDir);
	Setting.setValue('plugin-io.github.jackgruber.backup.path', backupDir);

	Object.keys(initialSettings).forEach(pluginId => {
		Object.keys(initialSettings[pluginId]).forEach((setting) => {
			Setting.setValue(`plugin-${pluginId}.${setting}`, initialSettings[pluginId][setting]);
		});
	});
}

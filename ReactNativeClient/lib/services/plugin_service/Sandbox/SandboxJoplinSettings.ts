import Setting, { SettingItem, SettingSection } from 'lib/models/Setting';

export default class SandboxJoplinSettings {
	async registerSetting(key:string, metadata:SettingItem) {
		return Setting.registerSetting(key, metadata);
	}

	async registerSection(name:string, section:SettingSection) {
		return Setting.registerSection(name, section);
	}
}

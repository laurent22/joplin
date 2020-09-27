import Setting, { SettingItem } from 'lib/models/Setting';

export default class SandboxJoplinSettings {
	register(key:string, metadata:SettingItem) {
		// TODO: validate key name
		return Setting.registerSetting(key, metadata);
	}
}

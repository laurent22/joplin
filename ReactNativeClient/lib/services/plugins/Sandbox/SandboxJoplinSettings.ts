import Setting, { SettingItem, SettingSection } from 'lib/models/Setting';
import Plugin from '../Plugin';

export default class SandboxJoplinSettings {
	private plugin_:Plugin = null;

	constructor(plugin: Plugin) {
		this.plugin_ = plugin;
	}

	// Ensures that the plugin settings and sections are within their own namespace, to prevent them from
	// overwriting other plugin settings or the default settings.
	private namespacedKey(key:string):string {
		return `plugin-${this.plugin_.id}.${key}`;
	}

	async registerSetting(key:string, metadata:SettingItem) {
		const md = { ...metadata };
		if (md.section) md.section = this.namespacedKey(md.section);

		return Setting.registerSetting(this.namespacedKey(key), md);
	}

	async registerSection(name:string, section:SettingSection) {
		return Setting.registerSection(this.namespacedKey(name), section);
	}

	value(key:string):any {
		return Setting.value(this.namespacedKey(key));
	}

	setValue(key:string, value:any) {
		return Setting.setValue(this.namespacedKey(key), value);
	}
}

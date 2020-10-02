import Setting, { SettingItem as InternalSettingItem, SettingItemType, SettingSection } from 'lib/models/Setting';
import Plugin from '../Plugin';

// Redefine a simplified interface to mask internal details
// and to remove function calls as they would have to be async.
interface SettingItem {
	value: any,
	type: SettingItemType,
	public: boolean,
	label:string,

	description?:string,
	isEnum?: boolean,
	section?: string,
	options?:any,
	appTypes?:string[],
	secure?: boolean,
	advanced?: boolean,
	minimum?: number,
	maximum?: number,
	step?: number,
}

export default class JoplinSettings {
	private plugin_:Plugin = null;

	constructor(plugin: Plugin) {
		this.plugin_ = plugin;
	}

	// Ensures that the plugin settings and sections are within their own namespace, to prevent them from
	// overwriting other plugin settings or the default settings.
	private namespacedKey(key:string):string {
		return `plugin-${this.plugin_.id}.${key}`;
	}

	async registerSetting(key:string, settingItem:SettingItem) {
		const internalSettingItem:InternalSettingItem = {
			key: key,
			value: settingItem.value,
			type: settingItem.type,
			public: settingItem.public,
			label: () => settingItem.label,
			description: (_appType:string) => settingItem.description,
		};

		if ('isEnum' in settingItem) internalSettingItem.isEnum = settingItem.isEnum;
		if ('section' in settingItem) internalSettingItem.section = this.namespacedKey(settingItem.section);
		if ('options' in settingItem) internalSettingItem.options = settingItem.options;
		if ('appTypes' in settingItem) internalSettingItem.appTypes = settingItem.appTypes;
		if ('secure' in settingItem) internalSettingItem.secure = settingItem.secure;
		if ('advanced' in settingItem) internalSettingItem.advanced = settingItem.advanced;
		if ('minimum' in settingItem) internalSettingItem.minimum = settingItem.minimum;
		if ('maximum' in settingItem) internalSettingItem.maximum = settingItem.maximum;
		if ('step' in settingItem) internalSettingItem.step = settingItem.step;

		return Setting.registerSetting(this.namespacedKey(key), internalSettingItem);
	}

	async registerSection(name:string, section:SettingSection) {
		return Setting.registerSection(this.namespacedKey(name), section);
	}

	async value(key:string):Promise<any> {
		return Setting.value(this.namespacedKey(key));
	}

	async setValue(key:string, value:any) {
		return Setting.setValue(this.namespacedKey(key), value);
	}
}

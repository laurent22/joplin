/* eslint-disable multiline-comment-style */

import eventManager, { EventName } from '../../../eventManager';
import Setting, { SettingItem as InternalSettingItem, SettingSectionSource } from '../../../models/Setting';
import Plugin from '../Plugin';
import getPluginNamespacedSettingKey from '../utils/getPluginNamespacedSettingKey';
import getPluginSettingKeyPrefix from '../utils/getPluginSettingKeyPrefix';
import makeListener from '../utils/makeListener';
import { SettingItem, SettingSection } from './types';

// That's all the plugin as of 27/08/21 - any new plugin after that will not be
// able to use the registerSetting API. Fixes in particular all the ambrt
// plugins. Some of them don't need this hack but it's easier that way.
const registerSettingAllowedPluginIds: string[] = [
	'b53da1f6-868c-468d-b60c-2897a27166ac',
	'com.andrejilderda.macOSTheme',
	'com.export-to-ssg.aman-d-1-n-only',
	'com.github.BeatLink.joplin-plugin-untagged',
	'com.github.joplin.kanban',
	'com.github.marc0l92.joplin-plugin-jira-issue',
	'com.github.uphy.PlantUmlPlugin',
	'com.gitlab.BeatLink.joplin-plugin-repeating-todos',
	'com.joplin_plugin.nlr',
	'com.lki.homenote',
	'com.plugin.randomNotePlugin',
	'com.shantanugoel.JoplinCMLineNumbersPlugin',
	'com.whatever.inline-tags',
	'com.whatever.quick-links',
	'com.xUser5000.bibtex',
	'cx.evermeet.tessus.menu-shortcut-toolbar',
	'fd117a99-b165-4824-893c-5825439a842d',
	'io.github.jackgruber.backup',
	'io.github.jackgruber.combine-notes',
	'io.github.jackgruber.copytags',
	'io.github.jackgruber.hotfolder',
	'io.github.jackgruber.note-overview',
	'io.treymo.LinkGraph',
	'joplin-insert-date',
	'joplin-plugin-conflict-resolution',
	'joplin.plugin.ambrt.backlinksToNote',
	'joplin.plugin.ambrt.convertToNewNote',
	'joplin.plugin.ambrt.copyNoteLink',
	'joplin.plugin.ambrt.embedSearch',
	'joplin.plugin.ambrt.fold-cm',
	'joplin.plugin.ambrt.goToItem',
	'joplin.plugin.anki-sync',
	'joplin.plugin.benji.favorites',
	'joplin.plugin.benji.persistentLayout',
	'joplin.plugin.benji.quick-move',
	'joplin.plugin.forcewake.tags-generator',
	'joplin.plugin.note.tabs',
	'joplin.plugin.quick.html.tags',
	'joplin.plugin.spoiler.cards',
	'joplin.plugin.templates',
	'net.rmusin.joplin-table-formatter',
	'net.rmusin.resource-search',
	'org.joplinapp.plugins.AbcSheetMusic',
	'org.joplinapp.plugins.admonition',
	'org.joplinapp.plugins.ToggleSidebars',
	'osw.joplin.markdowncalc',
	'outline',
	'plugin.azamahJunior.note-statistics',
	'plugin.calebjohn.MathMode',
	'plugin.calebjohn.rich-markdown',
];

export interface ChangeEvent {
	/**
	 * Setting keys that have been changed
	 */
	keys: string[];
}

export type ChangeHandler = (event: ChangeEvent)=> void;

/**
 * This API allows registering new settings and setting sections, as well as getting and setting settings. Once a setting has been registered it will appear in the config screen and be editable by the user.
 *
 * Settings are essentially key/value pairs.
 *
 * Note: Currently this API does **not** provide access to Joplin's built-in settings. This is by design as plugins that modify user settings could give unexpected results
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/settings)
 */
export default class JoplinSettings {
	private plugin_: Plugin = null;

	public constructor(plugin: Plugin) {
		this.plugin_ = plugin;
	}

	/**
	 * Registers new settings.
	 * Note that registering a setting item is dynamic and will be gone next time Joplin starts.
	 * What it means is that you need to register the setting every time the plugin starts (for example in the onStart event).
	 * The setting value however will be preserved from one launch to the next so there is no risk that it will be lost even if for some
	 * reason the plugin fails to start at some point.
	 */
	public async registerSettings(settings: Record<string, SettingItem>) {
		for (const [key, setting] of Object.entries(settings)) {
			const internalSettingItem: InternalSettingItem = {
				key: key,
				value: setting.value,
				type: setting.type,
				public: setting.public,
				label: () => setting.label,
				description: (_appType: string) => setting.description,
			};

			if ('subType' in setting) internalSettingItem.subType = setting.subType;
			if ('isEnum' in setting) internalSettingItem.isEnum = setting.isEnum;
			if ('section' in setting) internalSettingItem.section = getPluginNamespacedSettingKey(this.plugin_.id, setting.section);
			if ('options' in setting) internalSettingItem.options = () => setting.options;
			if ('appTypes' in setting) internalSettingItem.appTypes = setting.appTypes;
			if ('secure' in setting) internalSettingItem.secure = setting.secure;
			if ('advanced' in setting) internalSettingItem.advanced = setting.advanced;
			if ('minimum' in setting) internalSettingItem.minimum = setting.minimum;
			if ('maximum' in setting) internalSettingItem.maximum = setting.maximum;
			if ('step' in setting) internalSettingItem.step = setting.step;
			if ('storage' in setting) internalSettingItem.storage = setting.storage;

			await Setting.registerSetting(getPluginNamespacedSettingKey(this.plugin_.id, key), internalSettingItem);
		}
	}

	/**
	 * @deprecated Use joplin.settings.registerSettings()
	 *
	 * Registers a new setting.
	 */
	public async registerSetting(key: string, settingItem: SettingItem) {
		// It's a warning for older plugins and an error for new ones.
		this.plugin_.deprecationNotice(
			'1.8',
			'joplin.settings.registerSetting() is deprecated in favour of joplin.settings.registerSettings()',
			!registerSettingAllowedPluginIds.includes(this.plugin_.id),
		);

		await this.registerSettings({ [key]: settingItem });
	}

	/**
	 * Registers a new setting section. Like for registerSetting, it is dynamic and needs to be done every time the plugin starts.
	 */
	public async registerSection(name: string, section: SettingSection) {
		return Setting.registerSection(getPluginNamespacedSettingKey(this.plugin_.id, name), SettingSectionSource.Plugin, section);
	}

	/**
	 * Gets a setting value (only applies to setting you registered from your plugin)
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async value(key: string): Promise<any> {
		return Setting.value(getPluginNamespacedSettingKey(this.plugin_.id, key));
	}

	/**
	 * Sets a setting value (only applies to setting you registered from your plugin)
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async setValue(key: string, value: any) {
		return Setting.setValue(getPluginNamespacedSettingKey(this.plugin_.id, key), value);
	}

	/**
	 * Gets a global setting value, including app-specific settings and those set by other plugins.
	 *
	 * The list of available settings is not documented yet, but can be found by looking at the source code:
	 *
	 * https://github.com/laurent22/joplin/blob/dev/packages/lib/models/Setting.ts#L142
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async globalValue(key: string): Promise<any> {
		return Setting.value(key);
	}

	/**
	 * Called when one or multiple settings of your plugin have been changed.
	 * - For performance reasons, this event is triggered with a delay.
	 * - You will only get events for your own plugin settings.
	 */
	public async onChange(handler: ChangeHandler): Promise<void> {
		// Filter out keys that are not related to this plugin
		const listener = (event: ChangeEvent) => {
			const keys = event.keys
				.filter(k => k.indexOf(getPluginSettingKeyPrefix(this.plugin_.id)) === 0)
				.map(k => k.substr(getPluginSettingKeyPrefix(this.plugin_.id).length));
			if (!keys.length) return;
			handler({ keys });
		};
		makeListener(this.plugin_, eventManager, EventName.SettingsChange, listener);
	}
}

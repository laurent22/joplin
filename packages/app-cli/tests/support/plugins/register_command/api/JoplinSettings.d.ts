import Plugin from '../Plugin';
import { SettingItem, SettingSection } from './types';
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
    private plugin_;
    constructor(plugin: Plugin);
    private namespacedKey;
    /**
     * Registers a new setting. Note that registering a setting item is dynamic and will be gone next time Joplin starts.
     * What it means is that you need to register the setting every time the plugin starts (for example in the onStart event).
     * The setting value however will be preserved from one launch to the next so there is no risk that it will be lost even if for some
     * reason the plugin fails to start at some point.
     */
    registerSetting(key: string, settingItem: SettingItem): Promise<void>;
    /**
     * Registers a new setting section. Like for registerSetting, it is dynamic and needs to be done every time the plugin starts.
     */
    registerSection(name: string, section: SettingSection): Promise<void>;
    /**
     * Gets a setting value (only applies to setting you registered from your plugin)
     */
    value(key: string): Promise<any>;
    /**
     * Sets a setting value (only applies to setting you registered from your plugin)
     */
    setValue(key: string, value: any): Promise<void>;
    /**
     * Gets a global setting value, including app-specific settings and those set by other plugins.
     *
     * The list of available settings is not documented yet, but can be found by looking at the source code:
     *
     * https://github.com/laurent22/joplin/blob/3539a452a359162c461d2849829d2d42973eab50/packages/app-mobile/lib/models/Setting.ts#L142
     */
    globalValue(key: string): Promise<any>;
}

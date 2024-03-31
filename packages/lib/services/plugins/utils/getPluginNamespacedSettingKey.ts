import getPluginSettingKeyPrefix from './getPluginSettingKeyPrefix';

// Ensures that the plugin settings and sections are within their own namespace,
// to prevent them from overwriting other plugin settings or the default
// settings.

export default (pluginId: string, key: string): string => {
	return `${getPluginSettingKeyPrefix(pluginId)}${key}`;
};

import Setting from '../../../models/Setting';
import getPluginNamespacedSettingKey from './getPluginNamespacedSettingKey';

export default (pluginId: string, key: string) => {
	return Setting.value(getPluginNamespacedSettingKey(pluginId, key));
};

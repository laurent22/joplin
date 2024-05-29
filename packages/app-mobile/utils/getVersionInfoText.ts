import versionInfo from '@joplin/lib/versionInfo';
import { Platform, NativeModules } from 'react-native';
import getPackageInfo from './getPackageInfo';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';

const getWebViewVersion = (): string|null => {
	if (Platform.OS === 'android') {
		const constants = NativeModules.DebugModule.getConstants();
		return constants.webViewVersion;
	}
	return null;
};

const getOSVersion = (): string => {
	if (Platform.OS === 'android') {
		return _('Android version: %s', `API ${Platform.Version}`);
	} else {
		return _('iOS version: %s', Platform.Version);
	}
};

const getVersionInfoText = (pluginStates: PluginSettings) => {
	const packageInfo = getPackageInfo();
	const appInfo = versionInfo(packageInfo, PluginService.instance().enabledPlugins(pluginStates));
	const webViewVersion = getWebViewVersion();
	const versionInfoText = [
		appInfo.body,
		'',
		webViewVersion ? _('WebView version: %s', webViewVersion) : '',
		getOSVersion(),
		_('FTS enabled: %d', Setting.value('db.ftsEnabled')),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		_('Hermes enabled: %d', (global as any).HermesInternal ? 1 : 0),
	].join('\n');
	return versionInfoText;
};

export default getVersionInfoText;

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
		return _('Android API level: %d', Platform.Version);
	} else {
		return _('iOS version: %s', Platform.Version);
	}
};

const getVersionInfoText = (pluginStates: PluginSettings) => {
	const packageInfo = getPackageInfo();
	const appInfo = versionInfo(packageInfo, PluginService.instance().enabledPlugins(pluginStates));
	const versionInfoLines = [
		appInfo.body,
		'',
	];

	const webViewVersion = getWebViewVersion();
	if (webViewVersion) {
		versionInfoLines.push(_('WebView version: %s', webViewVersion));
	}

	versionInfoLines.push(
		getOSVersion(),
		_('FTS enabled: %d', Setting.value('db.ftsEnabled')),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partially refactored old code before rule was applied
		_('Hermes enabled: %d', (global as any).HermesInternal ? 1 : 0),
	);

	return versionInfoLines.join('\n');
};

export default getVersionInfoText;

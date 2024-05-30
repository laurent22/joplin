import versionInfo from '@joplin/lib/versionInfo';
import { Platform, NativeModules } from 'react-native';
import getPackageInfo from './getPackageInfo';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';

const getWebViewVersionText = () => {
	if (Platform.OS === 'android') {
		const constants = NativeModules.SystemVersionInformationModule.getConstants();
		return [
			_('WebView version: %s', constants.webViewVersion),
			_('WebView package: %s', constants.webViewPackage),
		].join('\n');
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
		getOSVersion(),
	];

	const webViewVersion = getWebViewVersionText();
	if (webViewVersion) {
		versionInfoLines.push(webViewVersion);
	}

	versionInfoLines.push(
		_('FTS enabled: %d', Setting.value('db.ftsEnabled')),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partially refactored old code before rule was applied
		_('Hermes enabled: %d', (global as any).HermesInternal ? 1 : 0),
	);

	return versionInfoLines.join('\n');
};

export default getVersionInfoText;

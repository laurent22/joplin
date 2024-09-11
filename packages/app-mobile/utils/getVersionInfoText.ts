import versionInfo from '@joplin/lib/versionInfo';
import { Platform, NativeModules } from 'react-native';
import getPackageInfo from './getPackageInfo';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';

const getWebViewVersionText = () => {
	if (Platform.OS === 'android') {
		// SystemVersionInformationModule is unavailable on older versions of Android.
		const constants = NativeModules.SystemVersionInformationModule?.getConstants();
		return [
			_('WebView version: %s', constants?.webViewVersion ?? _('Unknown')),
			_('WebView package: %s', constants?.webViewPackage ?? _('Unknown')),
		].join('\n');
	}
	return null;
};

const getOSVersion = (): string => {
	if (Platform.OS === 'android') {
		return _('Android API level: %d', Platform.Version);
	} else if (Platform.OS === 'ios') {
		return _('iOS version: %s', Platform.Version);
	} else if (Platform.OS === 'web') {
		return `User agent: ${navigator.userAgent}`;
	} else {
		return _('Unknown platform');
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

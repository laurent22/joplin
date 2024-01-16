
import { _ } from '@joplin/lib/locale';
import PluginService, { PluginSettings, defaultPluginSetting } from '@joplin/lib/services/plugins/PluginService';
import * as React from 'react';
import { useCallback } from 'react';
import { Button } from 'react-native-paper';
import pickDocument from '../../../../utils/pickDocument';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import { Platform } from 'react-native';

interface Props {
	updatePluginStates: (settingValue: PluginSettings)=> void;
	pluginSettings: string;
}

const logger = Logger.create('PluginUploadButton');

// Used for search
export const buttonLabel = () => _('Install from file');

const PluginUploadButton: React.FC<Props> = props => {
	const onInstallFromFile = useCallback(async () => {
		const pluginService = PluginService.instance();

		const pluginFiles = await pickDocument(false);
		if (pluginFiles.length === 0) {
			return;
		}

		const localFilePath = Platform.select({
			android: pluginFiles[0].uri,
			ios: decodeURI(pluginFiles[0].uri),
		});
		const pluginSettings = pluginService.unserializePluginSettings(props.pluginSettings);

		try {
			logger.info('Installing plugin from file', localFilePath);
			const plugin = await pluginService.installPlugin(localFilePath);
			const newSettings = { ...pluginSettings, [plugin.id]: defaultPluginSetting() };
			props.updatePluginStates(newSettings);
		} catch (error) {
			logger.error('Error installing plugin:', error);
			await shim.showMessageBox(_('Error: %s', error));
		}
	}, [props.pluginSettings, props.updatePluginStates]);

	return (
		<Button onPress={onInstallFromFile}>{buttonLabel()}</Button>
	);
};

export default PluginUploadButton;

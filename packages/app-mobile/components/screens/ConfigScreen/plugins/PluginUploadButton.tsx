
import { _ } from '@joplin/lib/locale';
import PluginService, { PluginSettings, SerializedPluginSettings, defaultPluginSetting } from '@joplin/lib/services/plugins/PluginService';
import * as React from 'react';
import { useCallback, useState } from 'react';
import { Button } from 'react-native-paper';
import pickDocument from '../../../../utils/pickDocument';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import { Platform } from 'react-native';
import { join, extname } from 'path';
import uuid from '@joplin/lib/uuid';
import Setting from '@joplin/lib/models/Setting';

interface Props {
	updatePluginStates: (settingValue: PluginSettings)=> void;
	pluginSettings: SerializedPluginSettings;
}

const logger = Logger.create('PluginUploadButton');

// Used for search
export const buttonLabel = () => _('Install from file');

export const canInstallPluginsFromFile = () => {
	return shim.mobilePlatform() !== 'ios' || Setting.value('env') === 'dev';
};

const PluginUploadButton: React.FC<Props> = props => {
	const [showLoadingAnimation, setShowLoadingAnimation] = useState(false);

	const onInstallFromFile = useCallback(async () => {
		const pluginService = PluginService.instance();

		const pluginFiles = await pickDocument(false);
		if (pluginFiles.length === 0) {
			return;
		}
		const selectedFile = pluginFiles[0];

		const localFilePath = Platform.select({
			android: selectedFile.uri,
			ios: decodeURI(selectedFile.uri),
		});
		logger.info('Installing plugin from file', localFilePath);

		const fsDriver = shim.fsDriver();
		const tempDir = join(Setting.value('tempDir'), uuid.createNano());
		await fsDriver.mkdir(tempDir);

		let extension = extname(localFilePath);

		// On Android, localFilePath has no extension (e.g. content://48) and we need to provide
		// one for installPlugin to work.
		if (!extension) {
			if (selectedFile.mime === 'application/javascript') {
				extension = '.js';
			} else {
				extension = '.jpl';
			}

			logger.info('No file extension found. Using', extension, `(media type: ${selectedFile.mime})`);
		}

		try {
			setShowLoadingAnimation(true);

			const targetFile = join(tempDir, `plugin${extension}`);
			logger.info('Copying to', targetFile);

			await fsDriver.copy(localFilePath, targetFile);
			const plugin = await pluginService.installPlugin(targetFile);

			const pluginSettings = pluginService.unserializePluginSettings(props.pluginSettings);
			const newSettings = { ...pluginSettings, [plugin.id]: defaultPluginSetting() };
			props.updatePluginStates(newSettings);
		} catch (error) {
			logger.error('Error installing plugin:', error);
			await shim.showMessageBox(_('Error: %s', error));
		} finally {
			setShowLoadingAnimation(false);

			await fsDriver.remove(tempDir);
		}
	}, [props.pluginSettings, props.updatePluginStates]);

	return (
		<Button
			onPress={onInstallFromFile}
			disabled={showLoadingAnimation || !canInstallPluginsFromFile()}
			loading={showLoadingAnimation}
		>
			{buttonLabel()}
		</Button>
	);
};

export default PluginUploadButton;


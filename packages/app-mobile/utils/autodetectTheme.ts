import Logger from '@joplin/lib/Logger';
import Setting from '@joplin/lib/models/Setting';
import { Appearance } from 'react-native';

const logger = Logger.create('autodetectTheme');

const autodetectTheme = () => {
	if (!Setting.value('themeAutoDetect')) {
		logger.info('Theme autodetect disabled, not switching theme to match system.');
	}

	const colorScheme = Appearance.getColorScheme();
	logger.info('System colorScheme changed to ', colorScheme);

	if (colorScheme === 'dark') {
		Setting.setValue('theme', Setting.value('preferredDarkTheme'));
	} else {
		Setting.setValue('theme', Setting.value('preferredLightTheme'));
	}
};

export default autodetectTheme;

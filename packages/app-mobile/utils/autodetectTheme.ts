import Logger from '@joplin/utils/Logger';
import Setting from '@joplin/lib/models/Setting';
import { Appearance, ColorSchemeName } from 'react-native';

const logger = Logger.create('autodetectTheme');

let systemColorScheme: ColorSchemeName|null = null;

// We export an `onThemeChange`, rather than using `Appearance.getColorScheme()` directly
// to work around https://github.com/facebook/react-native/issues/36061. On some devices,
// `Appearance.getColorScheme()` returns incorrect values.
export const onSystemColorSchemeChange = (newColorScheme: ColorSchemeName|null) => {
	if (systemColorScheme !== newColorScheme) {
		systemColorScheme = newColorScheme;
		autodetectTheme();
	}
};

const autodetectTheme = () => {
	if (!Setting.value('themeAutoDetect')) {
		logger.info('Theme autodetect disabled, not switching theme to match system.');
		return;
	}

	const colorScheme = systemColorScheme;
	logger.debug(
		'Autodetecting theme. getColorScheme returns', Appearance.getColorScheme(),
		'and the expected theme is', systemColorScheme
	);

	if (colorScheme === 'dark') {
		Setting.setValue('theme', Setting.value('preferredDarkTheme'));
	} else {
		Setting.setValue('theme', Setting.value('preferredLightTheme'));
	}
};

export default autodetectTheme;

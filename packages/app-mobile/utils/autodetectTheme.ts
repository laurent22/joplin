import Setting from '@joplin/lib/models/Setting';
import { Appearance } from 'react-native';

const autodetectTheme = () => {
	if (!Setting.value('themeAutoDetect')) return;

	if (Appearance.getColorScheme() === 'dark') {
		Setting.setValue('theme', Setting.value('preferredDarkTheme'));
	} else {
		Setting.setValue('theme', Setting.value('preferredLightTheme'));
	}
};

export default autodetectTheme;

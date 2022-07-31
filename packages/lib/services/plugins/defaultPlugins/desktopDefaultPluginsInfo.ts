import { InitialSettings } from '../PluginService';
import Setting from '../../../models/Setting';

export const defaultPlugins = {
	'io.github.jackgruber.backup': '1.0.2',
	'plugin.calebjohn.rich-markdown': '0.8.3',
};

export const initialSettings: InitialSettings = {
	'io.github.jackgruber.backup': {
		'path': `${Setting.value('profileDir')}`,
	},
};

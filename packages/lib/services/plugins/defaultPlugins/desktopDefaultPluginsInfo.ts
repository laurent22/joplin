import { DefaultPluginsInfo } from '../PluginService';
import Setting from '../../../models/Setting';

const getDefaultPluginsInfo = (): DefaultPluginsInfo => {
	const defaultPlugins = {
		'io.github.jackgruber.backup': {
			version: '1.0.2',
			settings: {
				'path': `${Setting.value('profileDir')}`,
			},
		},
		'plugin.calebjohn.rich-markdown': {
			version: '0.8.3',
		},
	};
	return defaultPlugins;
};
export default getDefaultPluginsInfo;

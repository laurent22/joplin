import { DefaultPluginsInfo } from '../PluginService';
import Setting from '../../../models/Setting';

const getDefaultPluginsInfo = (): DefaultPluginsInfo => {
	const defaultPlugins = {
		'io.github.jackgruber.backup': {
			settings: {
				'path': `${Setting.value('profileDir')}`,
			},
		},
	};
	return defaultPlugins;
};
export default getDefaultPluginsInfo;

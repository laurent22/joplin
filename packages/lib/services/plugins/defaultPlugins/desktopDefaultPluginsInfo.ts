import { DefaultPluginsInfo } from '../PluginService';
import Setting from '../../../models/Setting';

const getDefaultPluginsInfo = (): DefaultPluginsInfo => {
	const defaultPlugins = {
		'io.github.jackgruber.backup': {
			settings: {
				'path': `${Setting.value('profileDir')}`,
			},
		},
		'joplin.plugin.note.tabs': { },
	};
	return defaultPlugins;
};
export default getDefaultPluginsInfo;

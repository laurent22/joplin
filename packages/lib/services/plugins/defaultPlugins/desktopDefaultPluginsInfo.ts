import { DefaultPluginsInfo } from '../PluginService';
import Setting from '../../../models/Setting';
import shim from '../../../shim';

const getDefaultPluginsInfo = (): DefaultPluginsInfo => {
	const defaultPlugins = {
		'io.github.jackgruber.backup': {
			settings: {
				'path': `${Setting.value('homeDir')}`,
				'createSubfolderPerProfile': true,
			},

			// Joplin Portable is more likely to run on a device with low write speeds
			// and memory. Because Simple Backup has auto-backup enabled by default,
			// we disable it in Joplin Portable.
			enabled: !shim.isPortable(),
		},

		'io.github.personalizedrefrigerator.js-draw': {

		},
	};
	return defaultPlugins;
};
export default getDefaultPluginsInfo;

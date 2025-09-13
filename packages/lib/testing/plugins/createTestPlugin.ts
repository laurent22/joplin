import { join } from 'path';
import { PluginManifest } from '../../services/plugins/utils/types';
import Setting from '../../models/Setting';
import { writeFile } from 'fs-extra';
import { defaultPluginSetting } from '../../services/plugins/PluginService';


const setPluginEnabled = (id: string, enabled: boolean) => {
	const newPluginStates = {
		...Setting.value('plugins.states'),
		[id]: {
			...defaultPluginSetting(),
			enabled,
		},
	};
	Setting.setValue('plugins.states', newPluginStates);
};

interface Options {
	onStart?: string;
	enabled?: boolean;
}

const createTestPlugin = async (manifest: PluginManifest, { onStart = '', enabled = true }: Options = {}) => {
	const pluginSource = `
		/* joplin-manifest:
		${JSON.stringify(manifest)}
		*/

		joplin.plugins.register({
			onStart: async function() {
				${onStart}
			},
		});
	`;
	const pluginPath = join(Setting.value('pluginDir'), `${manifest.id}.js`);
	await writeFile(pluginPath, pluginSource, 'utf-8');

	setPluginEnabled(manifest.id, enabled);

	return {
		manifest,
		setEnabled: (enabled: boolean) => {
			setPluginEnabled(manifest.id, enabled);
		},
	};
};

export default createTestPlugin;

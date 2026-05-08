import { join } from 'path';
import { PluginManifest } from '../../services/plugins/utils/types';
import Setting from '../../models/Setting';
import { mkdirp, writeFile } from 'fs-extra';
import { defaultPluginSetting } from '../../services/plugins/PluginService';
import shim from '../../shim';


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
	format?: 'js' | 'jpl';
}

const createTestPlugin = async (manifest: PluginManifest, { onStart = '', enabled = true, format = 'js' }: Options = {}) => {
	const scriptSource = `joplin.plugins.register({
		onStart: async function() {
			${onStart}
		},
	});`;

	if (format === 'jpl') {
		const tempDir = join(Setting.value('tempDir'), `plugin-build-${manifest.id}`);
		await mkdirp(tempDir);
		await writeFile(join(tempDir, 'manifest.json'), JSON.stringify(manifest), 'utf-8');
		await writeFile(join(tempDir, 'index.js'), scriptSource, 'utf-8');

		const jplPath = join(Setting.value('pluginDir'), `${manifest.id}.jpl`);
		await shim.fsDriver().tarCreate({ cwd: tempDir, file: jplPath }, ['manifest.json', 'index.js']);
	} else {
		const pluginSource = `
		/* joplin-manifest:
		${JSON.stringify(manifest)}
		*/

		${scriptSource}
	`;
		const pluginPath = join(Setting.value('pluginDir'), `${manifest.id}.js`);
		await writeFile(pluginPath, pluginSource, 'utf-8');
	}

	setPluginEnabled(manifest.id, enabled);

	return {
		manifest,
		setEnabled: (enabled: boolean) => {
			setPluginEnabled(manifest.id, enabled);
		},
	};
};

export default createTestPlugin;

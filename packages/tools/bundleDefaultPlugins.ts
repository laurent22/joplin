import path = require('path');
import { downloadFile, execCommand2 } from './tool-utils';
import fs = require('fs-extra');
import shim from '@joplin/lib/shim';

interface PluginAndVersion {
   [pluginId: string]: string;
}

// export const testManifestsPath = path.join(__dirname, '..', '..', '..' , '/app-cli/tests/services/pluginsManifests')

export const localPluginsVersion = async (defaultPluginDir: string, defaultPluginsId: any): Promise<PluginAndVersion> => {
	if (!await fs.pathExists(path.join(__dirname, '..', '..', 'packages/app-desktop/build/defaultPlugins/'))) return null;
	const localPluginsVersions: PluginAndVersion = {};

	for (const pluginId of Object.keys(defaultPluginsId)) {

		if (!await fs.pathExists(path.join(__dirname, '..', '..', `packages/app-desktop/build/defaultPlugins/${pluginId}`))) {
			localPluginsVersions[pluginId] = '0.0.0';
			continue;
		}
		const data = fs.readFileSync(`${defaultPluginDir}/${pluginId}/manifest.json`, 'utf8');
		const manifest = JSON.parse(data);
		localPluginsVersions[pluginId] = manifest.version;
	}
	return localPluginsVersions;
};

export const downloadPlugins = async (params: any[]): Promise<void> => {

	const [defaultPluginDir, localPluginsVersions, defaultPluginsId] = params;

	for (const pluginId of Object.keys(defaultPluginsId)) {
		if (localPluginsVersions[pluginId] !== defaultPluginsId[pluginId][1][pluginId]) continue;

		await execCommand2(`curl -O -J -L https://github.com/${defaultPluginsId[pluginId][0]}/releases/download/v${defaultPluginsId[pluginId][1]}/${pluginId}.jpl`);
		await fs.move(`${pluginId}.jpl`,`${defaultPluginDir}/${pluginId}/plugin.jpl`, { overwrite: true });

		await downloadFile(`https://raw.githubusercontent.com/joplin/plugins/master/plugins/${pluginId}/manifest.json`, `${defaultPluginDir}/${pluginId}/manifest.json`);
	}
};

async function start(): Promise<void> {
	const defaultPluginDir = path.join(__dirname, '..', '..', 'packages/app-desktop/build/defaultPlugins');

	const defaultPluginsId = {
		'plugin.calebjohn.rich-markdown': ['CalebJohn/joplin-rich-markdown', '0.8.3'],
		'io.github.jackgruber.backup': ['JackGruber/joplin-plugin-backup', '1.0.2'],
	};


	const localPluginsVersions = await localPluginsVersion(defaultPluginDir, defaultPluginsId);
	await shim.fetchWithRetry(downloadPlugins, {}, [defaultPluginDir, localPluginsVersions, defaultPluginsId]);
}

start().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});

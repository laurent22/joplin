import { join, normalize } from 'path';
import { pathExists, mkdir, readFile, move, remove, writeFile } from 'fs-extra';
import { DefaultPluginsInfo } from '@joplin/lib/services/plugins/PluginService';
import getDefaultPluginsInfo from '@joplin/lib/services/plugins/defaultPlugins/desktopDefaultPluginsInfo';
import { execCommand } from '@joplin/utils';
const fetch = require('node-fetch');

interface PluginAndVersion {
   [pluginId: string]: string;
}

interface PluginIdAndName {
	[pluginId: string]: string;
}

export const localPluginsVersion = async (defaultPluginDir: string, defaultPluginsInfo: DefaultPluginsInfo): Promise<PluginAndVersion> => {
	if (!await pathExists(join(defaultPluginDir))) await mkdir(defaultPluginDir);
	const localPluginsVersions: PluginAndVersion = {};

	for (const pluginId of Object.keys(defaultPluginsInfo)) {

		if (!await pathExists(join(defaultPluginDir, pluginId))) {
			localPluginsVersions[pluginId] = '0.0.0';
			continue;
		}
		const data = await readFile(`${defaultPluginDir}/${pluginId}/manifest.json`, 'utf8');
		const manifest = JSON.parse(data);
		localPluginsVersions[pluginId] = manifest.version;
	}
	return localPluginsVersions;
};

async function downloadFile(url: string, outputPath: string) {
	const response = await fetch(url);
	if (!response.ok) {
		const responseText = await response.text();
		throw new Error(`Cannot download file from ${url} : ${responseText.substr(0, 500)}`);
	}
	await writeFile(outputPath, await response.buffer());
}

export async function extractPlugins(currentDir: string, defaultPluginDir: string, downloadedPluginsNames: PluginIdAndName): Promise<void> {
	for (const pluginId of Object.keys(downloadedPluginsNames)) {
		await execCommand(`tar xzf ${currentDir}/${downloadedPluginsNames[pluginId]}`, { quiet: true });
		await move(`package/publish/${pluginId}.jpl`, `${defaultPluginDir}/${pluginId}/plugin.jpl`, { overwrite: true });
		await move(`package/publish/${pluginId}.json`, `${defaultPluginDir}/${pluginId}/manifest.json`, { overwrite: true });
		await remove(`${downloadedPluginsNames[pluginId]}`);
		await remove('package');
	}
}

export const downloadPlugins = async (localPluginsVersions: PluginAndVersion, defaultPluginsInfo: DefaultPluginsInfo, manifests: any): Promise<PluginIdAndName> => {

	const downloadedPluginsNames: PluginIdAndName = {};
	for (const pluginId of Object.keys(defaultPluginsInfo)) {
		if (localPluginsVersions[pluginId] === defaultPluginsInfo[pluginId].version) continue;
		const response = await fetch(`https://registry.npmjs.org/${manifests[pluginId]._npm_package_name}`);

		if (!response.ok) {
			const responseText = await response.text();
			throw new Error(`Cannot fetch ${manifests[pluginId]._npm_package_name} release info from NPM : ${responseText.substr(0, 500)}`);
		}
		const releaseText = await response.text();
		const release = JSON.parse(releaseText);

		const pluginUrl = release.versions[defaultPluginsInfo[pluginId].version].dist.tarball;

		const pluginName = `${manifests[pluginId]._npm_package_name}-${defaultPluginsInfo[pluginId].version}.tgz`;
		await downloadFile(pluginUrl, pluginName);

		downloadedPluginsNames[pluginId] = pluginName;
	}
	return downloadedPluginsNames;
};

async function start(): Promise<void> {
	// windows CI fix: normalizing __dirname for windows
	const cwd = normalize(__dirname);
	process.chdir(cwd);
	const defaultPluginDir = join(cwd, '..', '..', 'packages', 'app-desktop', 'build', 'defaultPlugins');
	const defaultPluginsInfo = getDefaultPluginsInfo();

	const manifestData = await fetch('https://raw.githubusercontent.com/joplin/plugins/master/manifests.json');
	const manifests = JSON.parse(await manifestData.text());
	if (!manifests) throw new Error('Invalid or missing JSON');

	const localPluginsVersions = await localPluginsVersion(defaultPluginDir, defaultPluginsInfo);
	const downloadedPluginNames: PluginIdAndName = await downloadPlugins(localPluginsVersions, defaultPluginsInfo, manifests);
	await extractPlugins(cwd, defaultPluginDir, downloadedPluginNames);
}

if (require.main === module) {
// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
	start().catch((error) => {
		console.error('Fatal error');
		console.error(error);
		process.exit(1);
	});
}

module.exports = async () => {
	await start();
};

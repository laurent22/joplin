import path = require('path');
import { execCommand2 } from './tool-utils';
import fs = require('fs-extra');
const fetch = require('node-fetch');
const util = require('util');
const streamPipeline = util.promisify(require('stream').pipeline);

interface PluginAndVersion {
   [pluginId: string]: string;
}

export const localPluginsVersion = async (defaultPluginDir: string, defaultPluginsId: any): Promise<PluginAndVersion> => {
	if (!await fs.pathExists(path.join(defaultPluginDir))) await fs.mkdir(defaultPluginDir);
	const localPluginsVersions: PluginAndVersion = {};

	for (const pluginId of Object.keys(defaultPluginsId)) {

		if (!await fs.pathExists(`${defaultPluginDir}/${pluginId}`)) {
			localPluginsVersions[pluginId] = '0.0.0';
			continue;
		}
		const data = fs.readFileSync(`${defaultPluginDir}/${pluginId}/manifest.json`, 'utf8');
		const manifest = JSON.parse(data);
		localPluginsVersions[pluginId] = manifest.version;
	}
	return localPluginsVersions;
};

const downloadFile = async (url: string, name: string) => {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Unexpected response ${response.statusText}`);
	await streamPipeline(response.body, fs.createWriteStream(name));
};

export const downloadPlugins = async (defaultPluginDir: string, localPluginsVersions: PluginAndVersion, defaultPluginsId: any, manifests: any): Promise<void> => {
	for (const pluginId of Object.keys(defaultPluginsId)) {
		if (localPluginsVersions[pluginId] === defaultPluginsId[pluginId]) continue;

		const response = await fetch(`https://registry.npmjs.org/${manifests[pluginId]._npm_package_name}`);

		if (!(response.ok)) {
			const responseText = await response.text();
			throw new Error(`Cannot get plugins' info from npm: ${responseText.substr(0,500)}`);
		}
		const release = JSON.parse(await response.text());
		const pluginUrl = release.versions[defaultPluginsId[pluginId]].dist.tarball;

		const pluginName = `${manifests[pluginId]._npm_package_name}-${defaultPluginsId[pluginId]}.tgz`;
		await downloadFile(pluginUrl, pluginName);

		if (!(fs.existsSync(pluginName))) throw new Error(`${pluginName} cannot be downloaded`);

		await execCommand2(`tar xzf ${pluginName}`);
		await fs.move(`package/publish/${pluginId}.jpl`,`${defaultPluginDir}/${pluginId}/plugin.jpl`, { overwrite: true });
		await fs.move(`package/publish/${pluginId}.json`,`${defaultPluginDir}/${pluginId}/manifest.json`, { overwrite: true });
		await fs.remove(`${pluginName}`);
		await fs.remove('package');
	}
};

async function start(): Promise<void> {
	const defaultPluginDir = path.join(__dirname, '..', '..', 'packages/app-desktop/build/defaultPlugins');

	const defaultPluginsId = {
		'plugin.calebjohn.rich-markdown': '0.8.3',
		'io.github.jackgruber.backup': '1.0.2',
	};

	const manifestData = await fetch('https://raw.githubusercontent.com/joplin/plugins/master/manifests.json');
	const manifests = JSON.parse(await manifestData.text());
	if (!manifests) throw new Error('Invalid or missing JSON');

	const localPluginsVersions = await localPluginsVersion(defaultPluginDir, defaultPluginsId);
	await downloadPlugins(defaultPluginDir, localPluginsVersions, defaultPluginsId, manifests);
}

if (require.main === module) {
	start().catch((error) => {
		console.error('Fatal error');
		console.error(error);
		process.exit(1);
	});
}

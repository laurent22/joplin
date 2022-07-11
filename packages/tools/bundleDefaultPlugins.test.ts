import path = require('path');
import { localPluginsVersion } from './bundleDefaultPlugins';
// import fs = require('fs-extra');

describe('buildServerDocker', function() {

	const defaultPluginsId = {
		'plugin.calebjohn.rich-markdown': ['CalebJohn/joplin-rich-markdown', '0.8.3'],
		'io.github.jackgruber.backup': ['JackGruber/joplin-plugin-backup', '1.0.2'],
	};

	test('it should get local plugin versions', async () => {
		const manifestsPath = path.join(__dirname, '..', '..', '..' , 'joplin/packages/app-cli/tests/services/pluginsManifests');

		const localPluginsVersions = await localPluginsVersion(manifestsPath, Object.keys(defaultPluginsId));

		expect(localPluginsVersions['io.github.jackgruber.backup']).toBe('1.0.5');
		expect(localPluginsVersions['plugin.calebjohn.rich-markdown']).toBe('0.9.0');
		console.log('localPluginsVersions', localPluginsVersions);
	});

	// test('it should download plugins folder from GitHub', async () => {
	// 	const pinnedVersions:any = {
	// 		'io.github.jackgruber.backup': '0.0.1',
	// 		'plugin.calebjohn.rich-markdown': '0.0.1'
	// 	}

	// 	const tempDir = path.join(__dirname, '/tempDownload')
	// 	const defaultPluginIds = ['io.github.jackgruber.backup', 'plugin.calebjohn.rich-markdown']

	// 	const localPluginsVersions = {'io.github.jackgruber.backup' : '9.9.9', 'plugin.calebjohn.rich-markdown' : '9.9.9'}
	// 	const latestPluginsVersions = {'io.github.jackgruber.backup' : '0.0.1', 'plugin.calebjohn.rich-markdown' : '0.0.1'}

	// 	await fs.mkdirp(`${tempDir}`);
	// 	await downloadPlugins(tempDir, localPluginsVersions, latestPluginsVersions, defaultPluginIds, pinnedVersions)

	// 	// var files = fs.readdirSync(tempDir)
	// 	// console.log('files contents>>>>>',files)
	// 	expect(fs.existsSync(`${tempDir}/io.github.jackgruber.backup`)).toBe(true)
	// })

	// different tests with different plugins versions with pinned versions

});

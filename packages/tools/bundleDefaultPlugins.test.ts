import path = require('path');
import { downloadPlugins, localPluginsVersion } from './bundleDefaultPlugins';
import fs = require('fs-extra');
const fetch = require('node-fetch');

describe('bundlePlugins', function() {

	beforeEach(() => {
		jest.setTimeout(20000);
	});

	const testDefaultPluginsIds = {
		'plugin.calebjohn.rich-markdown': '0.9.0',
		'io.github.jackgruber.backup': '1.1.0',
	};

	test('it should get local plugin versions', async () => {

		const testDefaultPluginsIds = {
			'plugin.calebjohn.rich-markdown': '0.9.0',
			'io.github.jackgruber.backup': '1.1.0',
			'plugin-that-dont-exist-locally': '9.9.9',
		};

		const manifestsPath = path.join(__dirname, '..', '..', '..' , 'joplin/packages/app-cli/tests/services/testPlugins');

		const localPluginsVersions = await localPluginsVersion(manifestsPath, testDefaultPluginsIds);

		expect(localPluginsVersions['io.github.jackgruber.backup']).toBe('1.1.0');
		expect(localPluginsVersions['plugin.calebjohn.rich-markdown']).toBe('0.9.0');
		expect(localPluginsVersions['plugin-that-dont-exist-locally']).toBe('0.0.0');
	});

	test('it should download plugins folder from GitHub with no initial plugins', async () => {

		let manifests = [];
		try {
			const manifestData = await fetch('https://raw.githubusercontent.com/joplin/plugins/master/manifests.json');
			manifests = JSON.parse(await manifestData.text());
			if (!manifests) throw new Error('Invalid or missing JSON');
		} catch (error) {
			console.log(error);
		}

		const tempDir = path.join(__dirname, '/tempDownload');

		const localPluginsVersions = { 'io.github.jackgruber.backup': '0.0.0', 'plugin.calebjohn.rich-markdown': '0.0.0' };

		await fs.mkdirp(`${tempDir}`);
		await downloadPlugins(tempDir, localPluginsVersions, testDefaultPluginsIds, manifests);

		expect(fs.existsSync(`${tempDir}/io.github.jackgruber.backup`)).toBe(true);
		expect(fs.existsSync(`${tempDir}/plugin.calebjohn.rich-markdown`)).toBe(true);

		const localPluginsVersions2 = await localPluginsVersion(tempDir, testDefaultPluginsIds);

		expect(localPluginsVersions2['plugin.calebjohn.rich-markdown']).toBe('0.9.0');
		expect(localPluginsVersions2['io.github.jackgruber.backup']).toBe('1.1.0');

		await fs.remove(tempDir);
	});

	test('it should download plugins folder from GitHub with initial plugins', async () => {

		const tempDir = path.join(__dirname, '/tempDownload');
		await fs.remove(tempDir);

		let manifests = [];
		try {
			const manifestData = await fetch('https://raw.githubusercontent.com/joplin/plugins/master/manifests.json');
			manifests = JSON.parse(await manifestData.text());
			if (!manifests) throw new Error('Invalid or missing JSON');
		} catch (error) {
			console.log(error);
		}

		const localPluginsVersions = { 'io.github.jackgruber.backup': '1.1.0', 'plugin.calebjohn.rich-markdown': '0.0.0' };

		await fs.mkdirp(`${tempDir}`);
		await downloadPlugins(tempDir, localPluginsVersions, testDefaultPluginsIds, manifests);

		expect(fs.existsSync(`${tempDir}/io.github.jackgruber.backup`)).toBe(false);
		expect(fs.existsSync(`${tempDir}/plugin.calebjohn.rich-markdown`)).toBe(true);

		const localPluginsVersions2 = await localPluginsVersion(tempDir, testDefaultPluginsIds);

		expect(localPluginsVersions2['plugin.calebjohn.rich-markdown']).toBe('0.9.0');
		expect(localPluginsVersions2['io.github.jackgruber.backup']).toBe('0.0.0');

		await fs.remove(tempDir);
	});

});

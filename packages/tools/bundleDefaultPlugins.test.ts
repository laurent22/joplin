


import { join } from 'path';
import { downloadPlugins, extractPlugins, localPluginsVersion } from './bundleDefaultPlugins';
import { pathExists, readFile, remove } from 'fs-extra';
import Setting from '@joplin/lib/models/Setting';
import { createTempDir, supportDir } from '@joplin/lib/testing/test-utils';
import { rootDir } from './tool-utils';

const fetch = require('node-fetch');

jest.mock('node-fetch', ()=>jest.fn());

const manifests = {
	'io.github.jackgruber.backup': {
		'manifest_version': 1,
		'id': 'io.github.jackgruber.backup',
		'app_min_version': '2.1.3',
		'version': '1.1.0',
		'name': 'Simple Backup',
		'description': 'Plugin to create manual and automatic backups.',
		'author': 'JackGruber',
		'homepage_url': 'https://github.com/JackGruber/joplin-plugin-backup/blob/master/README.md',
		'repository_url': 'https://github.com/JackGruber/joplin-plugin-backup',
		'keywords': [
			'backup',
			'jex',
			'export',
			'zip',
			'7zip',
			'encrypted',
		],
		'_publish_hash': 'sha256:8d8c6a3bb92fafc587269aea58b623b05242d42c0766a05bbe25c3ba2bbdf8ee',
		'_publish_commit': 'master:00ed52133c659e0f3ac1a55f70b776c42fca0a6d',
		'_npm_package_name': 'joplin-plugin-backup',
	},
	'plugin.calebjohn.rich-markdown': {
		'manifest_version': 1,
		'id': 'plugin.calebjohn.rich-markdown',
		'app_min_version': '2.7',
		'version': '0.9.0',
		'name': 'Rich Markdown',
		'description': 'Helping you ditch the markdown viewer for good.',
		'author': 'Caleb John',
		'homepage_url': 'https://github.com/CalebJohn/joplin-rich-markdown#readme',
		'repository_url': 'https://github.com/CalebJohn/joplin-rich-markdown',
		'keywords': [
			'editor',
			'visual',
		],
		'_publish_hash': 'sha256:95337a3868aebdc9bf8c347a37460d0c2753b391ff51a0c72bdccdef9679705f',
		'_publish_commit': 'main:af3493b6ca96c931327ab3bd04906faaed0c782c',
		'_npm_package_name': 'joplin-plugin-rich-markdown',
	},

};

const NPM_Response1 = JSON.stringify({
	'_id': 'joplin-plugin-rich-markdown',
	'name': 'joplin-plugin-rich-markdown',
	'versions': {
		'0.8.2': {
			'name': 'joplin-plugin-rich-markdown',
			'version': '0.8.2',
			'description': 'A plugin that will finally allow you to ditch the markdown viewer, saving space and making your life easier.',
			'_id': 'joplin-plugin-rich-markdown@0.1.0',
			'dist': {
				'tarball': 'no-link-here',
			},
		},
		'0.9.0': {
			'name': 'joplin-plugin-rich-markdown',
			'version': '0.9.0',
			'dist': {
				'tarball': 'response-1-link',
			},
		},
	},
});

const NPM_Response2 = JSON.stringify({
	'_id': 'io.github.jackgruber.backup',
	'name': 'joplin-plugin-rich-markdown',
	'versions': {
		'1.0.0': {
			'name': 'joplin-plugin-rich-markdown',
			'version': '1.0.0',
			'description': 'A plugin that will finally allow you to ditch the markdown viewer, saving space and making your life easier.',
			'_id': 'joplin-plugin-rich-markdown@0.1.0',
			'dist': {
				'tarball': 'no-link-here',
			},
		},
		'1.1.0': {
			'name': 'joplin-plugin-rich-markdown',
			'version': '1.1.0',
			'dist': {
				'tarball': 'response-2-link',
			},
		},
	},
});

async function mockPluginData() {
	const filePath = join(__dirname, '..', 'app-cli', 'tests', 'services', 'plugins', 'mockData', 'mockPlugin.tgz');
	const tgzData = await readFile(filePath, 'utf8');
	return tgzData;
}

describe('bundleDefaultPlugins', () => {

	const testDefaultPluginsInfo = {
		'plugin.calebjohn.rich-markdown': {
			version: '0.9.0',
		},
		'io.github.jackgruber.backup': {
			version: '1.1.0',
			settings: {
				'path': `${Setting.value('profileDir')}`,
			},
		},
	};

	it('should get local plugin versions', async () => {
		const manifestsPath = join(supportDir, 'pluginRepo', 'plugins');
		const testDefaultPluginsInfo = {
			'joplin.plugin.ambrt.backlinksToNote': { version: '1.0.4' },
			'org.joplinapp.plugins.ToggleSidebars': { version: '1.0.2' },
		};
		const localPluginsVersions = await localPluginsVersion(manifestsPath, testDefaultPluginsInfo);

		expect(localPluginsVersions['joplin.plugin.ambrt.backlinksToNote']).toBe('1.0.4');
		expect(localPluginsVersions['org.joplinapp.plugins.ToggleSidebars']).toBe('1.0.2');
	});

	it('should download plugins folder from GitHub with no initial plugins', async () => {

		const testCases = [
			{
				localVersions: { 'io.github.jackgruber.backup': '0.0.0', 'plugin.calebjohn.rich-markdown': '0.0.0' },
				downloadedPlugin1: 'joplin-plugin-rich-markdown-0.9.0.tgz',
				downloadedPlugin2: 'joplin-plugin-backup-1.1.0.tgz',
				numberOfCalls: 4,
				calledWith: ['https://registry.npmjs.org/joplin-plugin-rich-markdown', 'response-1-link', 'https://registry.npmjs.org/joplin-plugin-backup', 'response-2-link'],
			},
			{
				localVersions: { 'io.github.jackgruber.backup': '1.1.0', 'plugin.calebjohn.rich-markdown': '0.0.0' },
				downloadedPlugin1: 'joplin-plugin-rich-markdown-0.9.0.tgz',
				downloadedPlugin2: undefined,
				numberOfCalls: 2,
				calledWith: ['https://registry.npmjs.org/joplin-plugin-rich-markdown', 'response-1-link'],
			},
			{
				localVersions: { 'io.github.jackgruber.backup': '1.1.0', 'plugin.calebjohn.rich-markdown': '0.9.0' },
				downloadedPlugin1: undefined,
				downloadedPlugin2: undefined,
				numberOfCalls: 0,
				calledWith: [],
			},
		];

		const tgzData = await mockPluginData();

		const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

		for (const testCase of testCases) {

			mockFetch.mockResolvedValueOnce({ text: () => Promise.resolve(NPM_Response1), ok: true })
				.mockResolvedValueOnce({ buffer: () => Promise.resolve(tgzData), ok: true })
				.mockResolvedValueOnce({ text: () => Promise.resolve(NPM_Response2), ok: true })
				.mockResolvedValueOnce({ buffer: () => Promise.resolve(tgzData), ok: true });

			const downloadedPlugins = await downloadPlugins(testCase.localVersions, testDefaultPluginsInfo, manifests);

			expect(downloadedPlugins[Object.keys(testDefaultPluginsInfo)[0]]).toBe(testCase.downloadedPlugin1);
			expect(downloadedPlugins[Object.keys(testDefaultPluginsInfo)[1]]).toBe(testCase.downloadedPlugin2);

			expect(mockFetch).toHaveBeenCalledTimes(testCase.numberOfCalls);

			testCase.calledWith.forEach((callValue, index) => expect(mockFetch).toHaveBeenNthCalledWith(index + 1, callValue));

			jest.clearAllMocks();
		}

		await remove(`${rootDir}/packages/tools/joplin-plugin-backup-1.1.0.tgz`);
		await remove(`${rootDir}/packages/tools/joplin-plugin-rich-markdown-0.9.0.tgz`);
	});

	it('should extract plugins files', async () => {

		const downloadedPluginsNames = { 'plugin.calebjohn.rich-markdown': 'mockPlugin.tgz' };

		const filePath = join(__dirname, '..', 'app-cli', 'tests', 'services', 'plugins', 'mockData');
		const tempDir = await createTempDir();

		await extractPlugins(filePath, tempDir, downloadedPluginsNames);

		expect(await pathExists(join(tempDir, 'plugin.calebjohn.rich-markdown', 'plugin.jpl'))).toBe(true);
		expect(await pathExists(join(tempDir, 'plugin.calebjohn.rich-markdown', 'manifest.json'))).toBe(true);

		await remove(tempDir);
	});

});

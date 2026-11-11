import { AppType } from '@joplin/lib/models/Setting';
import RepositoryApi, { AppInfo, InstallMode } from '@joplin/lib/services/plugins/RepositoryApi';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import refreshBlockedPluginVersions from '@joplin/lib/services/plugins/refreshBlockedPluginVersions';
import { setupDatabaseAndSynchronizer, switchClient, supportDir, createTempDir } from '@joplin/lib/testing/test-utils';
import { copy, mkdirp, readJson, remove, writeFile, writeJson } from 'fs-extra';

let tempDirs: string[] = [];
async function newRepoApi(appInfo: AppInfo = { type: AppType.Desktop, version: '3.0.0' }, blockedVersions: Record<string, string[]> = null): Promise<RepositoryApi> {
	const tempDir = await createTempDir();
	tempDirs.push(tempDir);

	let repoDir = `${supportDir}/pluginRepo`;
	if (blockedVersions) {
		repoDir = `${tempDir}/pluginRepo`;
		await copy(`${supportDir}/pluginRepo`, repoDir);
		const manifests = await readJson(`${repoDir}/manifests.json`);
		for (const [id, versions] of Object.entries(blockedVersions)) manifests[id]._blocked_versions = versions;
		await writeJson(`${repoDir}/manifests.json`, manifests);
	}

	const repo = new RepositoryApi(repoDir, tempDir, appInfo, InstallMode.Default);
	await repo.initialize();
	return repo;
}

describe('services_plugins_RepositoryApi', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});
	afterEach(async () => {
		for (const tempDir of tempDirs) {
			await remove(tempDir);
		}
		tempDirs = [];
	});

	it('should get the manifests', (async () => {
		const api = await newRepoApi();
		const manifests = await api.manifests();
		expect(!!manifests.find(m => m.id === 'joplin.plugin.ambrt.backlinksToNote')).toBe(true);
		expect(!!manifests.find(m => m.id === 'org.joplinapp.plugins.ToggleSidebars')).toBe(true);
	}));

	it('should search', (async () => {
		const api = await newRepoApi();

		{
			const results = await api.search('to');
			expect(results.length).toBe(3);
			expect(!!results.find(m => m.id === 'joplin.plugin.ambrt.backlinksToNote')).toBe(true);
			expect(!!results.find(m => m.id === 'org.joplinapp.plugins.ToggleSidebars')).toBe(true);
			expect(!!results.find(m => m.id === 'org.joplinapp.plugins.AbcSheetMusic')).toBe(true);
		}

		{
			const results = await api.search('backlink');
			expect(results.length).toBe(1);
			expect(!!results.find(m => m.id === 'joplin.plugin.ambrt.backlinksToNote')).toBe(true);
		}
	}));

	it('should download a plugin', (async () => {
		const api = await newRepoApi();
		const pluginPath = await api.downloadPlugin('org.joplinapp.plugins.ToggleSidebars');
		expect(await shim.fsDriver().exists(pluginPath)).toBe(true);
	}));

	it.each([
		{ id: 'org.joplinapp.plugins.ToggleSidebars', installedVersion: '1.0.0', appVersion: '3.0.0', shouldBeUpdatable: true },
		{ id: 'org.joplinapp.plugins.ToggleSidebars', installedVersion: '1.0.0', appVersion: '1.0.0', shouldBeUpdatable: false },
		{ id: 'org.joplinapp.plugins.ToggleSidebars', installedVersion: '1.0.2', appVersion: '3.0.0', shouldBeUpdatable: false },
		{ id: 'does.not.exist', installedVersion: '1.0.0', appVersion: '3.0.0', shouldBeUpdatable: false },
	])('should tell if a plugin can be updated (case %#)', (async ({ id, installedVersion, appVersion, shouldBeUpdatable }) => {
		const api = await newRepoApi({ version: appVersion, type: AppType.Desktop });
		expect(await api.pluginCanBeUpdated(id, installedVersion)).toBe(shouldBeUpdatable);
	}));

	it.each([
		['1.0.2'],
		['>=1.0.1'],
		['*'],
	])('should not update to or download a blocked version (%s)', (async (blockedVersion) => {
		const id = 'org.joplinapp.plugins.ToggleSidebars';
		const api = await newRepoApi(undefined, { [id]: [blockedVersion] });
		expect(await api.pluginCanBeUpdated(id, '1.0.0')).toBe(false);
		await expect(api.downloadPlugin(id)).rejects.toThrow('has been blocked');
	}));

	it('should cache the blocked versions only when plugins are installed', (async () => {
		const blockedVersions = { 'org.joplinapp.plugins.ToggleSidebars': ['1.0.1', '1.0.2'] };
		const api = await newRepoApi(undefined, blockedVersions);

		await refreshBlockedPluginVersions(api);
		expect(Setting.value('plugins.blockedVersions')).toEqual({});

		const pluginPath = `${Setting.value('pluginDir')}/test.jpl`;
		await mkdirp(Setting.value('pluginDir'));
		await writeFile(pluginPath, '');
		try {
			await refreshBlockedPluginVersions(api);
			expect(Setting.value('plugins.blockedVersions')).toEqual(blockedVersions);
		} finally {
			await remove(pluginPath);
		}
	}));

});

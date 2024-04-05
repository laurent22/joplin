import { AppType } from '@joplin/lib/models/Setting';
import RepositoryApi, { AppInfo, InstallMode } from '@joplin/lib/services/plugins/RepositoryApi';
import shim from '@joplin/lib/shim';
import { setupDatabaseAndSynchronizer, switchClient, supportDir, createTempDir } from '@joplin/lib/testing/test-utils';
import { remove } from 'fs-extra';

let tempDirs: string[] = [];
async function newRepoApi(appInfo: AppInfo = { type: AppType.Desktop, version: '3.0.0' }): Promise<RepositoryApi> {
	const tempDir = await createTempDir();
	tempDirs.push(tempDir);
	const repo = new RepositoryApi(`${supportDir}/pluginRepo`, tempDir, appInfo, InstallMode.Default);
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

});

import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import shim from '@joplin/lib/shim';
import { setupDatabaseAndSynchronizer, switchClient, supportDir, createTempDir } from '@joplin/lib/testing/test-utils';

async function newRepoApi(): Promise<RepositoryApi> {
	const repo = new RepositoryApi(`${supportDir}/pluginRepo`, await createTempDir());
	await repo.initialize();
	return repo;
}

describe('services_plugins_RepositoryApi', function() {

	beforeEach(async (done: Function) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should get the manifests', (async () => {
		const api = await newRepoApi();
		const manifests = await api.manifests();
		expect(!!manifests.find(m => m.id === 'joplin.plugin.ambrt.backlinksToNote')).toBe(true);
		expect(!!manifests.find(m => m.id === 'org.joplinapp.plugins.ToggleSidebars')).toBe(true);
	}));

	it('it should load statistics in plugins manifest', (async () => {
		const api = await newRepoApi();
		await api.initialize();
		const manifests = await api.manifests();

		expect(manifests.find(m => m.id === 'joplin.plugin.ambrt.backlinksToNote')._created_date).toBe('2021-06-01T08:30:48Z');
		expect(manifests.find(m => m.id === 'joplin.plugin.ambrt.backlinksToNote')._totalDownloads).toBe(5355);
	}));

	it('should search and sort', (async () => {
		const api = await newRepoApi();

		{
			const results = await api.searchAndFilter('','to');
			expect(results.length).toBe(2);
			expect(!!results.find(m => m.id === 'joplin.plugin.ambrt.backlinksToNote')).toBe(true);
			expect(!!results.find(m => m.id === 'org.joplinapp.plugins.ToggleSidebars')).toBe(true);
		}

		{
			const results = await api.searchAndFilter('','backlink');
			expect(results.length).toBe(1);
			expect(!!results.find(m => m.id === 'joplin.plugin.ambrt.backlinksToNote')).toBe(true);
		}

		{
			const results = await api.searchAndFilter('appearance','');
			expect(results.length).toBe(1);
			expect(!!results.find(m => m.id === 'org.joplinapp.plugins.ToggleSidebars')).toBe(true);
		}

		{
			const results = await api.searchAndFilter('appearance', 'toggle');
			expect(results.length).toBe(1);
			expect(!!results.find(m => m.id === 'org.joplinapp.plugins.ToggleSidebars')).toBe(true);
		}
	}));

	it('should download a plugin', (async () => {
		const api = await newRepoApi();
		const pluginPath = await api.downloadPlugin('org.joplinapp.plugins.ToggleSidebars');
		expect(await shim.fsDriver().exists(pluginPath)).toBe(true);
	}));

	it('should tell if a plugin can be updated', (async () => {
		const api = await newRepoApi();
		expect(await api.pluginCanBeUpdated('org.joplinapp.plugins.ToggleSidebars', '1.0.0')).toBe(true);
		expect(await api.pluginCanBeUpdated('org.joplinapp.plugins.ToggleSidebars', '1.0.2')).toBe(false);
		expect(await api.pluginCanBeUpdated('does.not.exist', '1.0.0')).toBe(false);
	}));

});

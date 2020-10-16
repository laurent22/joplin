import PluginRunner from '../app/services/plugins/PluginRunner';
import PluginService from 'lib/services/plugins/PluginService';

require('app-module-path').addPath(__dirname);
const { asyncTest, setupDatabaseAndSynchronizer, switchClient, expectThrow } = require('test-utils.js');
const Note = require('lib/models/Note');
const Folder = require('lib/models/Folder');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

const testPluginDir = `${__dirname}/../tests/support/plugins`;

function newPluginService() {
	const runner = new PluginRunner();
	const service = new PluginService();
	service.initialize(
		{
			joplin: {
				workspace: {},
			},
		},
		runner,
		{
			dispatch: () => {},
			getState: () => {},
		}
	);
	return service;
}

describe('services_PluginService', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should load and run a simple plugin', asyncTest(async () => {
		const service = newPluginService();
		await service.loadAndRunPlugins([`${testPluginDir}/simple`]);

		const allFolders = await Folder.all();
		expect(allFolders.length).toBe(1);
		expect(allFolders[0].title).toBe('my plugin folder');

		const allNotes = await Note.all();
		expect(allNotes.length).toBe(1);
		expect(allNotes[0].title).toBe('testing plugin!');
		expect(allNotes[0].parent_id).toBe(allFolders[0].id);
	}));

	it('should load and run a plugin that uses external packages', asyncTest(async () => {
		const service = newPluginService();
		await service.loadAndRunPlugins([`${testPluginDir}/withExternalModules`]);
		const plugin = service.pluginById('withexternalmodules');
		expect(plugin.id).toBe('withexternalmodules');

		const allFolders = await Folder.all();
		expect(allFolders.length).toBe(1);
		expect(allFolders[0].title).toBe('  foo');
	}));

	it('should load multiple plugins from a directory', asyncTest(async () => {
		const service = newPluginService();
		await service.loadAndRunPlugins(`${testPluginDir}/multi_plugins`);

		const plugin1 = service.pluginById('simple1');
		const plugin2 = service.pluginById('simple2');
		expect(!!plugin1).toBe(true);
		expect(!!plugin2).toBe(true);

		const allFolders = await Folder.all();
		expect(allFolders.length).toBe(2);
		expect(allFolders.map((f:any) => f.title).sort().join(', ')).toBe('multi - simple1, multi - simple2');
	}));

	it('should load plugins from JS bundles', asyncTest(async () => {
		const service = newPluginService();

		const plugin = await service.loadPluginFromString('example', '/tmp', `
			/* joplin-manifest:
			{
				"manifest_version": 1,
				"name": "JS Bundle test",
				"description": "JS Bundle Test plugin",
				"version": "1.0.0",
				"author": "Laurent Cozic",
				"homepage_url": "https://joplinapp.org"
			}
			*/
			
			joplin.plugins.register({
				onStart: async function() {
					await joplin.data.post(['folders'], null, { title: "my plugin folder" });
				},
			});
		`);

		await service.runPlugin(plugin);

		expect(plugin.manifest.manifest_version).toBe(1);
		expect(plugin.manifest.name).toBe('JS Bundle test');

		const allFolders = await Folder.all();
		expect(allFolders.length).toBe(1);
	}));

	it('should load plugins from JS bundle files', asyncTest(async () => {
		const service = newPluginService();
		await service.loadAndRunPlugins(`${testPluginDir}/jsbundles`);
		expect(!!service.pluginById('example')).toBe(true);
		expect((await Folder.all()).length).toBe(1);
	}));

	it('should validate JS bundles', asyncTest(async () => {
		const invalidJsBundles = [
			`
				/* joplin-manifest:
				{
					"not_a_valid_manifest_at_all": 1
				}
				*/
				
				joplin.plugins.register({
					onStart: async function() {},
				});
			`, `
				/* joplin-manifest:
				*/
				
				joplin.plugins.register({
					onStart: async function() {},
				});
			`, `
				joplin.plugins.register({
					onStart: async function() {},
				});
			`, '',
		];

		const service = newPluginService();

		for (const jsBundle of invalidJsBundles) {
			await expectThrow(async () => await service.loadPluginFromString('example', '/tmp', jsBundle));
		}
	}));

});

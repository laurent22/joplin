require('app-module-path').addPath(__dirname);

const { asyncTest, setupDatabaseAndSynchronizer, switchClient } = require('test-utils.js');
const PluginService = require('lib/services/plugin_service/PluginService.js').default;
const Folder = require('lib/models/Folder');
const Note = require('lib/models/Note');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

const testPluginDir = `${__dirname}/../tests/support/plugins`;

describe('services_PluginService', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should load and run a simple plugin', asyncTest(async () => {
		const plugin = await PluginService.instance().loadPlugin(`${testPluginDir}/simple`);
		await PluginService.instance().runPlugin(plugin);

		const allFolders = await Folder.all();
		expect(allFolders.length).toBe(1);
		expect(allFolders[0].title).toBe('my plugin folder');

		const allNotes = await Note.all();
		expect(allNotes.length).toBe(1);
		expect(allNotes[0].title).toBe('testing plugin!');
		expect(allNotes[0].parent_id).toBe(allFolders[0].id);
	}));

	it('should load and run a plugin from a directory', asyncTest(async () => {
		const plugin = await PluginService.instance().loadPlugin(`${testPluginDir}/testImport`);
		await PluginService.instance().runPlugin(plugin);

		const allFolders = await Folder.all();
		expect(allFolders.length).toBe(1);
		expect(allFolders[0].title).toBe('testImport');
	}));

	it('should load and run a plugin that uses external packages', asyncTest(async () => {
		const plugin = await PluginService.instance().loadPlugin(`${testPluginDir}/withExternalModules`);
		expect(plugin.id).toBe('withExternalModules');
		await PluginService.instance().runPlugin(plugin);

		const allFolders = await Folder.all();
		expect(allFolders.length).toBe(1);
		expect(allFolders[0].title).toBe('  foo');
	}));

	it('should load multiple plugins from a directory', asyncTest(async () => {
		const service = PluginService.instance();
		await service.loadPlugins(`${testPluginDir}/multi_plugins`);

		expect(service.plugins.length).toBe(2);

		const allFolders = await Folder.all();
		expect(allFolders.length).toBe(2);
		expect(allFolders.map(f => f.title).sort().join(', ')).toBe('multi - simple1, multi - simple2');
	}));
});

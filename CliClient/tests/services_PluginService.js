require('app-module-path').addPath(__dirname);

const { asyncTest, setupDatabaseAndSynchronizer, switchClient } = require('test-utils.js');
const PluginService = require('lib/services/plugin_service/PluginService.js').default;
const Folder = require('lib/models/Folder');
const Note = require('lib/models/Note');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('services_PluginService', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should load and run a plugin', asyncTest(async () => {
		const plugin = {
			id: 'test',
			script: `
				exports = {
					run: async function() {
						const folder = await joplin.model.post('folders', null, { title: "my plugin folder" });
						await joplin.model.post('notes', null, { parent_id: folder.id, title: "testing plugin!" });
					},
				};
			`,
		};

		await PluginService.instance().runPlugin(plugin);

		const allFolders = await Folder.all();
		expect(allFolders.length).toBe(1);
		expect(allFolders[0].title).toBe('my plugin folder');

		const allNotes = await Note.all();
		expect(allNotes.length).toBe(1);
		expect(allNotes[0].title).toBe('testing plugin!');
		expect(allNotes[0].parent_id).toBe(allFolders[0].id);
	}));
});

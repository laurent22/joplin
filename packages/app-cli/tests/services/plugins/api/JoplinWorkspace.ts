import Setting from '@joplin/lib/models/Setting';
import { setupDatabaseAndSynchronizer, switchClient, afterEachCleanUp } from '@joplin/lib/testing/test-utils';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import ItemChange from '@joplin/lib/models/ItemChange';
import { newPluginScript, newPluginService } from '../../../testUtils';
import eventManager, { EventName } from '@joplin/lib/eventManager';

describe('JoplinWorkspace', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	afterEach(async () => {
		await afterEachCleanUp();
	});

	test('should listen to noteChange events', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const appState: Record<string, any> = {
			selectedNoteIds: [],
		};

		const service = newPluginService('1.4', {
			getState: () => {
				return appState;
			},
		});

		const pluginScript = newPluginScript(`			
			joplin.plugins.register({
				onStart: async function() {
					await joplin.workspace.onNoteChange(async (event) => {
						await joplin.data.post(['folders'], null, { title: JSON.stringify(event) });
					});
				},
			});
		`);

		const note = await Note.save({});
		appState.selectedNoteIds.push(note.id);
		await ItemChange.waitForAllSaved();

		const plugin = await service.loadPluginFromJsBundle('', pluginScript);
		await service.runPlugin(plugin);

		await Note.save({ id: note.id, body: 'testing' });
		await ItemChange.waitForAllSaved();

		const folder = (await Folder.all())[0];

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const result: any = JSON.parse(folder.title);

		expect(result.id).toBe(note.id);
		expect(result.event).toBe(ItemChange.TYPE_UPDATE);

		await service.destroy();
	});

	test('should return the selected folder', async () => {
		const service = newPluginService();

		const pluginScript = newPluginScript(`			
			joplin.plugins.register({
				onStart: async function() {
					const folder = await joplin.workspace.selectedFolder();
					await joplin.data.put(['folders', folder.id], null, { title: "changedtitle" });
				},
			});
		`);

		const folder = await Folder.save({ title: 'folder' });
		Setting.setValue('activeFolderId', folder.id);

		const plugin = await service.loadPluginFromJsBundle('', pluginScript);
		await service.runPlugin(plugin);

		const modFolder = await Folder.load(folder.id);
		expect(modFolder.title).toBe('changedtitle');
	});

	test('should remove event listeners when plugins are unloaded', async () => {
		const service = newPluginService();

		const pluginScript = newPluginScript(`
			joplin.plugins.register({
				onStart: async () => {
					// Register each listener 8 times to improve test reliability -- it's possible
					// for listeners for the same events to be added/removed by other sources.
					for (let i = 0; i < 8; i++) {
						await joplin.workspace.onNoteChange(async (event) => { });
						await joplin.workspace.onResourceChange(async (event) => { });
						await joplin.workspace.filterEditorContextMenu(async (event) => { });
					}
				}
			})
		`);
		const plugin = await service.loadPluginFromJsBundle('', pluginScript);
		await service.runPlugin(plugin);

		const itemChangeListenerCounter = eventManager.listenerCounter_(EventName.ItemChange);
		const resourceChangeListenerCounter = eventManager.listenerCounter_(EventName.ResourceChange);

		plugin.onUnload();

		expect(itemChangeListenerCounter.getCountRemoved()).toBeGreaterThanOrEqual(8);
		expect(resourceChangeListenerCounter.getCountRemoved()).toBeGreaterThanOrEqual(8);

		await service.destroy();
	});
});

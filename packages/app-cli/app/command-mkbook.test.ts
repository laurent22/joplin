import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { setupCommandForTesting, setupApplication } from './utils/testUtils';
import Folder from '@joplin/lib/models/Folder';
const Command = require('./command-mkbook');


describe('command-mkbook', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await setupApplication();
	});


	it('should create a subfolder in first folder', async () => {
		const command = setupCommandForTesting(Command);
		await command.action({ 'new-notebook': 'folder1', options: {} });
		await command.action({ 'new-notebook': 'folder1_1', options: { parent: 'folder1' } });

		const folder1 = await Folder.loadByTitle('folder1');
		const folder1_1 = await Folder.loadByTitle('folder1_1');

		expect(folder1.title).toBe('folder1');
		expect(folder1_1.parent_id).toBe(folder1.id);
	});

	it('should not be possible to create a subfolder without an argument.', async () => {
		const command = setupCommandForTesting(Command);
		await command.action({ 'new-notebook': 'folder2', options: {} });
		await expect(command.action({ 'new-notebook': 'folder2_1', options: { parent: true } })).rejects.toThrowError();
	});

	it('should not be possible to create subfolder in ambiguous destination folder', async () => {
		const command = setupCommandForTesting(Command);
		await command.action({ 'new-notebook': 'folder3', options: {} });
		await command.action({ 'new-notebook': 'folder3', options: {} });	// ambiguous folder
		await expect(command.action({ 'new-notebook': 'folder3_1', options: { parent: 'folder3' } })).rejects.toThrowError();

		// check if duplicate entries have been created.
		const folderAll = await Folder.all();
		const folders3 = folderAll.filter(x => x.title === 'folder3');
		expect(folders3.length).toBe(2);

		// check if something has been created in one of the duplicate entries.
		expect(await Folder.childrenIds(folders3[0].id)).toEqual([]);
		expect(await Folder.childrenIds(folders3[1].id)).toEqual([]);
	});
});


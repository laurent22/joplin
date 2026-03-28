import { afterAllCleanUp, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import JoplinData from './api/JoplinData';
import Note from '../../models/Note';
import Folder from '../../models/Folder';
import { ModelType } from '../../BaseModel';
import Plugin from './Plugin';

const newJoplinData = () => {
	// JoplinData only uses plugin.id for userDataGet/Set/Delete, not for itemType
	return new JoplinData({ id: 'test-plugin' } as Plugin);
};

describe('JoplinData', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('itemType should return the correct ModelType for an existing note', async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', parent_id: folder.id });

		const joplinData = newJoplinData();
		const result = await joplinData.itemType(note.id);

		expect(result).toBe(ModelType.Note);
	});

	it('itemType should return the correct ModelType for an existing folder', async () => {
		const folder = await Folder.save({ title: 'folder' });

		const joplinData = newJoplinData();
		const result = await joplinData.itemType(folder.id);

		expect(result).toBe(ModelType.Folder);
	});

	it('itemType should return null when the item does not exist', async () => {
		const joplinData = newJoplinData();
		const result = await joplinData.itemType('non_existent_id_000000000000000000000');

		expect(result).toBeNull();
	});

});

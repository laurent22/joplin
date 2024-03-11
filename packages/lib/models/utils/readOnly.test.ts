import { ModelType } from '../../BaseModel';
import Folder from '../Folder';
import ItemChange from '../ItemChange';
import Note from '../Note';
import { defaultState as defaultShareState } from '../../services/share/reducer';
import { ItemSlice, itemIsReadOnlySync } from './readOnly';
import Resource from '../Resource';
import shim from '../../shim';
import { setupDatabaseAndSynchronizer, switchClient, tempFilePath } from '../../testing/test-utils';


const checkUnsharedReadOnly = (itemType: ModelType, item: ItemSlice) => {
	const syncUserId = '';
	return itemIsReadOnlySync(itemType, ItemChange.SOURCE_UNSPECIFIED, item, syncUserId, defaultShareState);
};

describe('readOnly', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	test('trashed items should be marked as read-only', async () => {
		let folder = await Folder.save({ title: 'Test' });
		let note = await Note.save({ parent_id: folder.id, title: 'Test note' });

		expect(checkUnsharedReadOnly(ModelType.Note, note as ItemSlice)).toBe(false);
		expect(checkUnsharedReadOnly(ModelType.Folder, folder as ItemSlice)).toBe(false);

		await Folder.delete(folder.id, { toTrash: true });

		// Should be deleted
		note = await Note.load(note.id);
		expect(note.deleted_time).not.toBe(0);
		folder = await Folder.load(folder.id);
		expect(folder.deleted_time).not.toBe(0);

		expect(checkUnsharedReadOnly(ModelType.Note, note as ItemSlice)).toBe(true);
		expect(checkUnsharedReadOnly(ModelType.Folder, folder as ItemSlice)).toBe(true);
	});

	test('should support checking if resources are read-only', async () => {
		const tempFile = tempFilePath('txt');
		await shim.fsDriver().writeFile(tempFile, 'Test', 'utf8');
		const note1 = await Note.save({ title: 'note' });
		await shim.attachFileToNote(note1, tempFile);

		const resource = (await Resource.all())[0];
		expect(checkUnsharedReadOnly(ModelType.Resource, resource)).toBe(false);
	});
});

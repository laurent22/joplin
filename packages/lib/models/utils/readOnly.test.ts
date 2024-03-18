import { ModelType } from '../../BaseModel';
import Folder from '../Folder';
import ItemChange from '../ItemChange';
import Note from '../Note';
import { defaultState as defaultShareState, State as ShareState } from '../../services/share/reducer';
import { ItemSlice, itemIsReadOnlySync } from './readOnly';
import Resource from '../Resource';
import shim from '../../shim';
import { setupDatabaseAndSynchronizer, simulateReadOnlyShareEnv, switchClient, tempFilePath } from '../../testing/test-utils';
import BaseItem from '../BaseItem';


const checkReadOnly = (itemType: ModelType, item: ItemSlice, shareData: ShareState = defaultShareState) => {
	const syncUserId = '';
	return itemIsReadOnlySync(itemType, ItemChange.SOURCE_UNSPECIFIED, item, syncUserId, shareData);
};

const createTestResource = async () => {
	const tempFile = tempFilePath('txt');
	await shim.fsDriver().writeFile(tempFile, 'Test', 'utf8');
	const note1 = await Note.save({ title: 'note' });
	await shim.attachFileToNote(note1, tempFile);
};

describe('readOnly', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	test('trashed items should be marked as read-only', async () => {
		let folder = await Folder.save({ title: 'Test' });
		let note = await Note.save({ parent_id: folder.id, title: 'Test note' });

		expect(checkReadOnly(ModelType.Note, note as ItemSlice)).toBe(false);
		expect(checkReadOnly(ModelType.Folder, folder as ItemSlice)).toBe(false);

		await Folder.delete(folder.id, { toTrash: true });

		// Should be deleted
		note = await Note.load(note.id);
		expect(note.deleted_time).not.toBe(0);
		folder = await Folder.load(folder.id);
		expect(folder.deleted_time).not.toBe(0);

		expect(checkReadOnly(ModelType.Note, note as ItemSlice)).toBe(true);
		expect(checkReadOnly(ModelType.Folder, folder as ItemSlice)).toBe(true);
	});

	test('should support checking if resources are not read-only', async () => {
		await createTestResource();
		const resource = (await Resource.all())[0];
		expect(checkReadOnly(ModelType.Resource, resource)).toBe(false);
	});

	test('should support checking that resources are read-only due to a share', async () => {
		await createTestResource();

		const share_id = '123456';
		let resource = (await Resource.all())[0];
		resource = await Resource.save({ ...resource, share_id });

		const cleanup = simulateReadOnlyShareEnv(share_id);
		expect(checkReadOnly(ModelType.Resource, resource, BaseItem.syncShareCache)).toBe(true);
		cleanup();
	});
});

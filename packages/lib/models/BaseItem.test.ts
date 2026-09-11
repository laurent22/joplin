import { Second } from '@joplin/utils/time';
import { afterAllCleanUp, setupDatabaseAndSynchronizer, switchClient, syncTargetId, synchronizerStart, msleep } from '../testing/test-utils';
import BaseItem from './BaseItem';
import Folder from './Folder';
import Note from './Note';
import ItemChange from './ItemChange';

describe('BaseItem', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	// This is to handle the case where a property is removed from a BaseItem table - in that case files in
	// the sync target will still have the old property but we don't need it locally.
	it('should ignore properties that are present in sync file but not in database when serialising', async () => {
		const folder = await Folder.save({ title: 'folder1' });

		let serialized = await Folder.serialize(folder);
		serialized += '\nignore_me: true';

		const unserialized = await Folder.unserialize(serialized);

		expect('ignore_me' in unserialized).toBe(false);
	});

	it('should not modify title when unserializing', async () => {
		const folder1 = await Folder.save({ title: '' });
		const folder2 = await Folder.save({ title: 'folder1' });

		const serialized1 = await Folder.serialize(folder1);
		const unserialized1 = await Folder.unserialize(serialized1);

		expect(unserialized1.title).toBe(folder1.title);

		const serialized2 = await Folder.serialize(folder2);
		const unserialized2 = await Folder.unserialize(serialized2);

		expect(unserialized2.title).toBe(folder2.title);
	});

	it.each([
		'',
		'\n\na\nb\nc\nç\nTest!\n Testing. \n',
		'Test! ☺',
		'Test! ☺\n\n\n',
	])('should not modify body when unserializing (body: %j)', async (body) => {
		const note = await Note.save({ title: 'note1', body });

		expect(await Note.unserialize(await Note.serialize(note))).toMatchObject({
			body,
		});
	});

	it('should correctly unserialize note timestamps', async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', parent_id: folder.id });

		const serialized = await Note.serialize(note);
		const unserialized = await Note.unserialize(serialized);

		expect(unserialized.created_time).toEqual(note.created_time);
		expect(unserialized.updated_time).toEqual(note.updated_time);
		expect(unserialized.user_created_time).toEqual(note.user_created_time);
		expect(unserialized.user_updated_time).toEqual(note.user_updated_time);
	});

	it('should unserialize a very large note quickly', async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', parent_id: folder.id });

		const serialized = await Note.serialize({
			...note,
			// 2 MiB
			body: '\n.'.repeat(1 * 1024 * 1024),
		});

		const start = performance.now();
		await Note.unserialize(serialized);
		// Locally, this passes in in < 2s, so 30s should be a safe upper bound.
		expect(performance.now() - start).toBeLessThan(30 * Second);
	});

	it('should serialize geolocation fields', async () => {
		const folder = await Folder.save({ title: 'folder' });
		let note = await Note.save({ title: 'note', parent_id: folder.id });
		note = await Note.load(note.id);

		let serialized = await Note.serialize(note);
		let unserialized = await Note.unserialize(serialized);

		expect(unserialized.latitude).toEqual('0.00000000');
		expect(unserialized.longitude).toEqual('0.00000000');
		expect(unserialized.altitude).toEqual('0.0000');

		await Note.save({
			id: note.id,
			longitude: -3.459,
			altitude: 0,
			latitude: 48.732,
		});
		note = await Note.load(note.id);

		serialized = await Note.serialize(note);
		unserialized = await Note.unserialize(serialized);

		expect(unserialized.latitude).toEqual(note.latitude);
		expect(unserialized.longitude).toEqual(note.longitude);
		expect(unserialized.altitude).toEqual(note.altitude);
	});

	it('should serialize and unserialize notes', async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', parent_id: folder.id });
		await Note.save({
			id: note.id,
			longitude: -3.459,
			altitude: 0,
			latitude: 48.732,
		});

		const noteBefore = await Note.load(note.id);
		const serialized = await Note.serialize(noteBefore);
		const noteAfter = await Note.unserialize(serialized);

		expect(noteAfter).toEqual(noteBefore);
	});

	it('should serialize and unserialize properties that contain new lines', async () => {
		const sourceUrl = `
https://joplinapp.org/ \\n
`;

		const note = await Note.save({ title: 'note', source_url: sourceUrl });

		const noteBefore = await Note.load(note.id);
		const serialized = await Note.serialize(noteBefore);
		const noteAfter = await Note.unserialize(serialized);

		expect(noteAfter).toEqual(noteBefore);
	});

	it('should not serialize the note title and body', async () => {
		const note = await Note.save({ title: 'my note', body: `one line
two line
three line \\n no escape` });

		const noteBefore = await Note.load(note.id);
		const serialized = await Note.serialize(noteBefore);
		expect(serialized.indexOf(`my note

one line
two line
three line \\n no escape`)).toBe(0);
	});

	it('should update item sync item', async () => {
		const note1 = await Note.save({ });

		const syncTime = async (itemId: string) => {
			const syncItem = await BaseItem.syncItem(syncTargetId(), itemId, { fields: ['sync_time'] });
			return syncItem ? syncItem.sync_time : 0;
		};

		expect(await syncTime(note1.id)).toBe(0);

		await synchronizerStart();

		const newTime = await syncTime(note1.id);
		expect(newTime).toBeLessThanOrEqual(Date.now());

		// Check that it doesn't change if we sync again
		await msleep(1);
		await synchronizerStart();
		expect(await syncTime(note1.id)).toBe(newTime);
	});

	it('should only sync updates to conflict notes with an original note and no share', async () => {
		const originalNote = await Note.save({ title: 'Original' });
		const conflictNote = await Note.createConflictNote(originalNote, ItemChange.SOURCE_SYNC);
		const conflictWithoutOriginal = await Note.save({ title: 'Conflict without original', is_conflict: 1 });
		const sharedConflict = await Note.save({
			title: 'Shared conflict',
			is_conflict: 1,
			conflict_original_id: originalNote.id,
			share_id: 'share-id',
		});

		let result = await BaseItem.itemsThatNeedSync(syncTargetId());
		expect(result.items.map(item => item.id)).toContain(conflictNote.id);
		expect(result.items.map(item => item.id)).not.toContain(conflictWithoutOriginal.id);
		expect(result.items.map(item => item.id)).not.toContain(sharedConflict.id);

		await BaseItem.saveSyncTime(syncTargetId(), conflictNote, conflictNote.updated_time);
		await BaseItem.deleteOrphanSyncItems();
		expect(await BaseItem.syncItem(syncTargetId(), conflictNote.id)).toBeTruthy();

		await msleep(1);
		await Note.save({ id: conflictNote.id, title: 'Changed conflict' });

		result = await BaseItem.itemsThatNeedSync(syncTargetId());
		expect(result.items.map(item => item.id)).toContain(conflictNote.id);
		let changedConflict = result.items.find(item => item.id === conflictNote.id);
		await BaseItem.saveSyncTime(syncTargetId(), changedConflict, changedConflict.updated_time);

		await msleep(1);
		await Note.delete(conflictNote.id, { toTrash: true });
		result = await BaseItem.itemsThatNeedSync(syncTargetId());
		expect(result.items.map(item => item.id)).toContain(conflictNote.id);
		changedConflict = result.items.find(item => item.id === conflictNote.id);
		await BaseItem.saveSyncTime(syncTargetId(), changedConflict, changedConflict.updated_time);

		await msleep(1);
		await Note.save({ id: conflictNote.id, deleted_time: 0 });
		result = await BaseItem.itemsThatNeedSync(syncTargetId());
		expect(result.items.map(item => item.id)).toContain(conflictNote.id);

		await BaseItem.saveSyncTime(syncTargetId(), conflictWithoutOriginal, conflictWithoutOriginal.updated_time);
		await BaseItem.saveSyncTime(syncTargetId(), sharedConflict, sharedConflict.updated_time);
		await msleep(1);
		await Note.save({ id: conflictWithoutOriginal.id, title: 'Changed without original' });
		await Note.save({ id: sharedConflict.id, title: 'Changed shared conflict' });
		result = await BaseItem.itemsThatNeedSync(syncTargetId());
		expect(result.items.map(item => item.id)).not.toContain(conflictWithoutOriginal.id);
		expect(result.items.map(item => item.id)).not.toContain(sharedConflict.id);
	});

	it('should not track deletions of conflict notes that are ineligible for sync', async () => {
		const normalNote = await Note.save({ title: 'Normal' });
		const originalNote = await Note.save({ title: 'Original' });
		const eligibleConflict = await Note.createConflictNote(originalNote, ItemChange.SOURCE_SYNC);
		const conflictWithoutOriginal = await Note.save({ title: 'Conflict without original', is_conflict: 1 });
		const sharedConflict = await Note.save({
			title: 'Shared conflict',
			is_conflict: 1,
			conflict_original_id: originalNote.id,
			share_id: 'share-id',
		});

		await Note.batchDelete([
			normalNote.id,
			eligibleConflict.id,
			conflictWithoutOriginal.id,
			sharedConflict.id,
		], { disableReadOnlyCheck: true });

		const deletedItemIds = (await BaseItem.deletedItems(syncTargetId())).map(item => item.item_id);
		expect(deletedItemIds).toContain(normalNote.id);
		expect(deletedItemIds).toContain(eligibleConflict.id);
		expect(deletedItemIds).not.toContain(conflictWithoutOriginal.id);
		expect(deletedItemIds).not.toContain(sharedConflict.id);
	});

	it.each([
		'test-test!',
		'This ID has    spaces\ttabs\nand newlines',
		'Test`;',
		'Test"',
		'Test\'',
		'Test\'\'\'a\'\'',
		'% test',
	])('should support querying items with IDs containing special characters (id: %j)', async (id) => {
		const note = await Note.save({ id }, { isNew: true });
		expect(await BaseItem.loadItemById(note.id)).toMatchObject({ id });
	});

	// Sync ingestion concatenates resource.id and resource.file_extension into
	// a local file path; a malformed id like `../../foo` would escape the
	// resource directory. unserialize() must reject these.
	it.each([
		'../../escape',
		'../foo',
		'foo/bar',
		'foo\\bar',
		'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
		'short',
	])('should reject items with malformed IDs during unserialize (id: %j)', async (id) => {
		const serialized = `poc-resource\n\nid: ${id}\ntype_: 4`;
		await expect(BaseItem.unserialize(serialized)).rejects.toMatchObject({
			code: 'malformedItem',
			message: expect.stringMatching(/Invalid item ID/),
		});
	});

	it.each([
		'../foo',
		'foo/bar',
		'foo\\bar',
		'..',
	])('should reject items with malformed file_extension during unserialize (ext: %j)', async (ext) => {
		const serialized = `poc-resource\n\nid: 00000000000000000000000000000001\nfile_extension: ${ext}\ntype_: 4`;
		await expect(BaseItem.unserialize(serialized)).rejects.toMatchObject({
			code: 'malformedItem',
			message: expect.stringMatching(/Invalid file extension/),
		});
	});

	it('should accept well-formed resource items', async () => {
		const serialized = 'poc-resource\n\nid: 00000000000000000000000000000001\nfile_extension: txt\ntype_: 4';
		const out = await BaseItem.unserialize(serialized);
		expect(out.id).toBe('00000000000000000000000000000001');
		expect(out.file_extension).toBe('txt');
	});
});

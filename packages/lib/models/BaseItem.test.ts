import { afterAllCleanUp, setupDatabaseAndSynchronizer, switchClient, syncTargetId, synchronizerStart, msleep } from '../testing/test-utils';
import BaseItem from './BaseItem';
import Folder from './Folder';
import Note from './Note';

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
});

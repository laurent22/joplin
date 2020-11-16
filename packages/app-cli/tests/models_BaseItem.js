/* eslint-disable no-unused-vars */


const time = require('@joplin/lib/time').default;
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('./test-utils.js');
const Folder = require('@joplin/lib/models/Folder.js');
const Note = require('@joplin/lib/models/Note.js');
const BaseItem = require('@joplin/lib/models/BaseItem.js');
const Resource = require('@joplin/lib/models/Resource.js');
const BaseModel = require('@joplin/lib/BaseModel').default;
const shim = require('@joplin/lib/shim').default;

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at models_BaseItem: Promise', p, 'reason:', reason);
});

async function allItems() {
	const folders = await Folder.all();
	const notes = await Note.all();
	return folders.concat(notes);
}

describe('models_BaseItem', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	// This is to handle the case where a property is removed from a BaseItem table - in that case files in
	// the sync target will still have the old property but we don't need it locally.
	it('should ignore properties that are present in sync file but not in database when serialising', asyncTest(async () => {
		const folder = await Folder.save({ title: 'folder1' });

		let serialized = await Folder.serialize(folder);
		serialized += '\nignore_me: true';

		const unserialized = await Folder.unserialize(serialized);

		expect('ignore_me' in unserialized).toBe(false);
	}));

	it('should not modify title when unserializing', asyncTest(async () => {
		const folder1 = await Folder.save({ title: '' });
		const folder2 = await Folder.save({ title: 'folder1' });

		const serialized1 = await Folder.serialize(folder1);
		const unserialized1 = await Folder.unserialize(serialized1);

		expect(unserialized1.title).toBe(folder1.title);

		const serialized2 = await Folder.serialize(folder2);
		const unserialized2 = await Folder.unserialize(serialized2);

		expect(unserialized2.title).toBe(folder2.title);
	}));

	it('should correctly unserialize note timestamps', asyncTest(async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', parent_id: folder.id });

		const serialized = await Note.serialize(note);
		const unserialized = await Note.unserialize(serialized);

		expect(unserialized.created_time).toEqual(note.created_time);
		expect(unserialized.updated_time).toEqual(note.updated_time);
		expect(unserialized.user_created_time).toEqual(note.user_created_time);
		expect(unserialized.user_updated_time).toEqual(note.user_updated_time);
	}));

	it('should serialize geolocation fields', asyncTest(async () => {
		const folder = await Folder.save({ title: 'folder' });
		let note = await Note.save({ title: 'note', parent_id: folder.id });
		note = await Note.load(note.id);

		let serialized = await Note.serialize(note);
		let unserialized = await Note.unserialize(serialized);

		expect(unserialized.latitude).toEqual('0.00000000');
		expect(unserialized.longitude).toEqual('0.00000000');
		expect(unserialized.altitude).toEqual('0.0000');

		await Note.updateGeolocation(note.id);
		note = await Note.load(note.id);

		serialized = await Note.serialize(note);
		unserialized = await Note.unserialize(serialized);

		expect(unserialized.latitude).toEqual(note.latitude);
		expect(unserialized.longitude).toEqual(note.longitude);
		expect(unserialized.altitude).toEqual(note.altitude);
	}));

	it('should serialize and unserialize notes', asyncTest(async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', parent_id: folder.id });
		await Note.updateGeolocation(note.id);

		const noteBefore = await Note.load(note.id);
		const serialized = await Note.serialize(noteBefore);
		const noteAfter = await Note.unserialize(serialized);

		expect(noteAfter).toEqual(noteBefore);
	}));

	it('should serialize and unserialize properties that contain new lines', asyncTest(async () => {
		const note = await Note.save({ title: 'note', source_url: '\nhttps://joplinapp.org/\n' });

		const noteBefore = await Note.load(note.id);
		const serialized = await Note.serialize(noteBefore);
		const noteAfter = await Note.unserialize(serialized);

		expect(noteAfter).toEqual(noteBefore);
	}));
});

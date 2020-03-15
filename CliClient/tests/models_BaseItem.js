/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const BaseItem = require('lib/models/BaseItem.js');
const Resource = require('lib/models/Resource.js');
const BaseModel = require('lib/BaseModel.js');
const { shim } = require('lib/shim');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
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
		let folder = await Folder.save({ title: 'folder' });
		let note = await Note.save({ title: 'note', parent_id: folder.id });

		let serialized = await Note.serialize(note);
		let unserialized = await Note.unserialize(serialized);

		expect(unserialized.created_time).toEqual(note.created_time);
		expect(unserialized.updated_time).toEqual(note.updated_time);
		expect(unserialized.user_created_time).toEqual(note.user_created_time);
		expect(unserialized.user_updated_time).toEqual(note.user_updated_time);
	}));
});

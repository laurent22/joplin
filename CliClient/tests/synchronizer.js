import { time } from 'src/time-utils.js';
import { setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient } from 'test-utils.js';
import { createFoldersAndNotes } from 'test-data.js';
import { Folder } from 'src/models/folder.js';
import { Note } from 'src/models/note.js';
import { BaseItem } from 'src/models/base-item.js';
import { BaseModel } from 'src/base-model.js';

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
	// application specific logging, throwing an error, or other logic here
});

async function localItemsSameAsRemote(locals, expect) {
	try {
		let files = await fileApi().list();
		expect(locals.length).toBe(files.length);

		for (let i = 0; i < locals.length; i++) {
			let dbItem = locals[i];
			let path = BaseItem.systemPath(dbItem);
			let remote = await fileApi().stat(path);

			// console.info('=======================');
			// console.info(remote);
			// console.info(dbItem);
			// console.info('=======================');

			expect(!!remote).toBe(true);
			expect(remote.updated_time).toBe(dbItem.updated_time);

			let remoteContent = await fileApi().get(path);
			remoteContent = dbItem.type_ == BaseModel.ITEM_TYPE_NOTE ? Note.unserialize(remoteContent) : Folder.unserialize(remoteContent);
			expect(remoteContent.title).toBe(dbItem.title);
		}
	} catch (error) {
		console.error(error);
	}
}

describe('Synchronizer', function() {

	beforeEach( async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		switchClient(1);
		done();
	});

	it('should create remote items', async (done) => {
		let folder = await Folder.save({ title: "folder1" });
		await Note.save({ title: "un", parent_id: folder.id });

		let all = await Folder.all(true);

		await synchronizer().start();

		await localItemsSameAsRemote(all, expect);

		done();
	});

	it('should update remote item', async (done) => {
		let folder = await Folder.save({ title: "folder1" });
		let note = await Note.save({ title: "un", parent_id: folder.id });
		await synchronizer().start();

		await sleep(1);

		await Note.save({ title: "un UPDATE", id: note.id });

		let all = await Folder.all(true);
		await synchronizer().start();

		await localItemsSameAsRemote(all, expect);

		done();
	});

	it('should create local items', async (done) => {
		let folder = await Folder.save({ title: "folder1" });
		await Note.save({ title: "un", parent_id: folder.id });
		await synchronizer().start();

		switchClient(2);

		await synchronizer().start();

		let all = await Folder.all(true);
		await localItemsSameAsRemote(all, expect);

		done();
	});

	it('should update local items', async (done) => {
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: "un", parent_id: folder1.id });
		await synchronizer().start();

		switchClient(2);

		await synchronizer().start();

		await sleep(1);

		let note2 = await Note.load(note1.id);
		note2.title = "Updated on client 2";
		await Note.save(note2);

		note2 = await Note.load(note2.id);

		await synchronizer().start();

		let files = await fileApi().list();

		switchClient(1);

		await synchronizer().start();

		note1 = await Note.load(note1.id);

		expect(!!note1).toBe(true);
		expect(note1.title).toBe(note2.title);
		expect(note1.body).toBe(note2.body);

		done();
	});

});
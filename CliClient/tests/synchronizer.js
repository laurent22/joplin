import { time } from 'src/time-utils.js';
import { setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient } from 'test-utils.js';
import { createFoldersAndNotes } from 'test-data.js';
import { Folder } from 'src/models/folder.js';
import { Note } from 'src/models/note.js';
import { BaseItem } from 'src/models/base-item.js';
import { BaseModel } from 'src/base-model.js';

async function localItemsSameAsRemote(locals, expect) {
	try {
		for (let i = 0; i < locals.length; i++) {
			let dbItem = locals[i];
			let path = BaseItem.systemPath(dbItem);
			let remote = await fileApi().stat(path);

			// console.info('=======================');
			// console.info(remote);
			// console.info(dbItem);
			// console.info('=======================');

			expect(!!remote).toBe(true);
			expect(remote.updatedTime).toBe(dbItem.updated_time);

			let remoteContent = await fileApi().get(path);
			remoteContent = dbItem.type_ == BaseModel.ITEM_TYPE_NOTE ? Note.fromFriendlyString(remoteContent) : Folder.fromFriendlyString(remoteContent);
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

	// it('should create remote items', async (done) => {
	// 	let folder = await Folder.save({ title: "folder1" });
	// 	await Note.save({ title: "un", parent_id: folder.id });

	// 	let all = await Folder.all(true);

	// 	await synchronizer().start();

	// 	await localItemsSameAsRemote(all, expect);

	// 	done();
	// });

	// it('should update remote item', async (done) => {
	// 	let folder = await Folder.save({ title: "folder1" });
	// 	let note = await Note.save({ title: "un", parent_id: folder.id });

	// 	await sleep(1);

	// 	await Note.save({ title: "un UPDATE", id: note.id });

	// 	let all = await Folder.all(true);
	// 	await synchronizer().start();

	// 	await localItemsSameAsRemote(all, expect);

	// 	done();
	// });

	// it('should create local items', async (done) => {
	// 	let folder = await Folder.save({ title: "folder1" });
	// 	await Note.save({ title: "un", parent_id: folder.id });
	// 	await synchronizer().start();
	// 	await clearDatabase();
	// 	await synchronizer().start();

	// 	let all = await Folder.all(true);
	// 	await localItemsSameAsRemote(all, expect);

	// 	done();
	// });

	// it('should create same items on client 2', async (done) => {
	// 	let folder = await Folder.save({ title: "folder1" });
	// 	let note = await Note.save({ title: "un", parent_id: folder.id });
	// 	await synchronizer().start();

	// 	await sleep(1);

	// 	switchClient(2);

	// 	await synchronizer().start();

	// 	let folder2 = await Folder.load(folder.id);
	// 	let note2 = await Note.load(note.id);

	// 	expect(!!folder2).toBe(true);
	// 	expect(!!note2).toBe(true);

	// 	expect(folder.title).toBe(folder.title);
	// 	expect(folder.updated_time).toBe(folder.updated_time);

	// 	expect(note.title).toBe(note.title);
	// 	expect(note.updated_time).toBe(note.updated_time);
	// 	expect(note.body).toBe(note.body);

	// 	done();
	// });

	it('should update local items', async (done) => {
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: "un", parent_id: folder1.id });
		await synchronizer().start();

		await sleep(1);

		switchClient(2);

		await synchronizer().start();

		let note2 = await Note.load(note1.id);
		note2.title = "Updated on client 2";
		await Note.save(note2);

		let all = await Folder.all(true);

		await synchronizer().start();

		switchClient(1);

		await synchronizer().start();

		note1 = await Note.load(note1.id);

		expect(!!note1).toBe(true);
		expect(note1.title).toBe(note2.title);
		expect(note1.body).toBe(note2.body);

		done();
	});

});

// // Note: set 1 matches set 1 of createRemoteItems()
// function createLocalItems(id, updatedTime, lastSyncTime) {
// 	let output = [];
// 	if (id === 1) {
// 		output.push({ path: 'test', isDir: true, updatedTime: updatedTime, lastSyncTime: lastSyncTime });
// 		output.push({ path: 'test/un', updatedTime: updatedTime, lastSyncTime: lastSyncTime });
// 	} else {
// 		throw new Error('Invalid ID');
// 	}
// 	return output;
// }

// function createRemoteItems(id = 1, updatedTime = null) {
// 	if (!updatedTime) updatedTime = time.unix();

// 	if (id === 1) {
// 		return fileApi().format()
// 		.then(() => fileApi().mkdir('test'))
// 		.then(() => fileApi().put('test/un', 'abcd'))
// 		.then(() => fileApi().list('', true))
// 		.then((items) => {
// 			for (let i = 0; i < items.length; i++) {
// 				items[i].updatedTime = updatedTime;
// 			}
// 			return items;
// 		});
// 	} else {
// 		throw new Error('Invalid ID');
// 	}
// }

// describe('Synchronizer syncActions', function() {

// 	beforeEach(function(done) {
// 		setupDatabaseAndSynchronizer(done);
// 	});

// 	it('should create remote items', function() {
// 		let localItems = createLocalItems(1, time.unix(), 0);
// 		let remoteItems = [];

// 		let actions = synchronizer().syncActions(localItems, remoteItems, []);

// 		expect(actions.length).toBe(2);
// 		for (let i = 0; i < actions.length; i++) {
// 			expect(actions[i].type).toBe('create');
// 			expect(actions[i].dest).toBe('remote');
// 		}
// 	});

// 	it('should update remote items', function(done) {	
// 		createRemoteItems(1).then((remoteItems) => {
// 			let lastSyncTime = time.unix() + 1000;
// 			let localItems = createLocalItems(1, lastSyncTime + 1000, lastSyncTime);
// 			let actions = synchronizer().syncActions(localItems, remoteItems, []);

// 			expect(actions.length).toBe(2);
// 			for (let i = 0; i < actions.length; i++) {
// 				expect(actions[i].type).toBe('update');
// 				expect(actions[i].dest).toBe('remote');
// 			}

// 			done();
// 		});
// 	});

// 	it('should detect conflict', function(done) {
// 		// Simulate this scenario:
// 		// - Client 1 create items
// 		// - Client 1 sync
// 		// - Client 2 sync
// 		// - Client 2 change items
// 		// - Client 2 sync
// 		// - Client 1 change items
// 		// - Client 1 sync
// 		// => Conflict

// 		createRemoteItems(1).then((remoteItems) => {
// 			let localItems = createLocalItems(1, time.unix() + 1000, time.unix() - 1000);
// 			let actions = synchronizer().syncActions(localItems, remoteItems, []);

// 			expect(actions.length).toBe(2);
// 			for (let i = 0; i < actions.length; i++) {
// 				expect(actions[i].type).toBe('conflict');
// 			}

// 			done();
// 		});
// 	});


// 	it('should create local file', function(done) {
// 		createRemoteItems(1).then((remoteItems) => {
// 			let localItems = [];
// 			let actions = synchronizer().syncActions(localItems, remoteItems, []);

// 			expect(actions.length).toBe(2);
// 			for (let i = 0; i < actions.length; i++) {
// 				expect(actions[i].type).toBe('create');
// 				expect(actions[i].dest).toBe('local');
// 			}

// 			done();
// 		});
// 	});

// 	it('should delete remote files', function(done) {
// 		createRemoteItems(1).then((remoteItems) => {
// 			let localItems = createLocalItems(1, time.unix(), time.unix());
// 			let deletedItemPaths = [localItems[0].path, localItems[1].path];
// 			let actions = synchronizer().syncActions([], remoteItems, deletedItemPaths);

// 			expect(actions.length).toBe(2);
// 			for (let i = 0; i < actions.length; i++) {
// 				expect(actions[i].type).toBe('delete');
// 				expect(actions[i].dest).toBe('remote');
// 			}

// 			done();
// 		});
// 	});

// 	it('should delete local files', function(done) {
// 		let lastSyncTime = time.unix();
// 		createRemoteItems(1, lastSyncTime - 1000).then((remoteItems) => {
// 			let localItems = createLocalItems(1, lastSyncTime - 1000, lastSyncTime);
// 			let actions = synchronizer().syncActions(localItems, [], []);

// 			expect(actions.length).toBe(2);
// 			for (let i = 0; i < actions.length; i++) {
// 				expect(actions[i].type).toBe('delete');
// 				expect(actions[i].dest).toBe('local');
// 			}

// 			done();
// 		});
// 	});

// 	it('should update local files', function(done) {
// 		let lastSyncTime = time.unix();
// 		createRemoteItems(1, lastSyncTime + 1000).then((remoteItems) => {
// 			let localItems = createLocalItems(1, lastSyncTime - 1000, lastSyncTime);
// 			let actions = synchronizer().syncActions(localItems, remoteItems, []);

// 			expect(actions.length).toBe(2);
// 			for (let i = 0; i < actions.length; i++) {
// 				expect(actions[i].type).toBe('update');
// 				expect(actions[i].dest).toBe('local');
// 			}

// 			done();
// 		});
// 	});

// });

// // describe('Synchronizer start', function() {

// // 	beforeEach(function(done) {
// // 		setupDatabaseAndSynchronizer(done);
// // 	});

// // 	it('should create remote items', function(done) {
// // 		createFoldersAndNotes().then(() => {
// // 			return synchronizer().start();
// // 		}
// // 	}).then(() => {
// // 		done();
// // 	});

// // });


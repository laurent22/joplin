import { time } from 'src/time-utils.js';
import { setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi } from 'test-utils.js';
import { createFoldersAndNotes } from 'test-data.js';

// Note: set 1 matches set 1 of createRemoteItems()
function createLocalItems(id, updatedTime, lastSyncTime) {
	let output = [];
	if (id === 1) {
		output.push({ path: 'test', isDir: true, updatedTime: updatedTime, lastSyncTime: lastSyncTime });
		output.push({ path: 'test/un', updatedTime: updatedTime, lastSyncTime: lastSyncTime });
	} else {
		throw new Error('Invalid ID');
	}
	return output;
}

function createRemoteItems(id = 1, updatedTime = null) {
	if (!updatedTime) updatedTime = time.unix();

	if (id === 1) {
		return fileApi().format()
		.then(() => fileApi().mkdir('test'))
		.then(() => fileApi().put('test/un', 'abcd'))
		.then(() => fileApi().list('', true))
		.then((items) => {
			for (let i = 0; i < items.length; i++) {
				items[i].updatedTime = updatedTime;
			}
			return items;
		});
	} else {
		throw new Error('Invalid ID');
	}
}

describe('Synchronizer syncActions', function() {

	beforeEach(function(done) {
		setupDatabaseAndSynchronizer(done);
	});

	it('should create remote items', function() {
		let localItems = createLocalItems(1, time.unix(), 0);
		let remoteItems = [];

		let actions = synchronizer().syncActions(localItems, remoteItems, []);

		expect(actions.length).toBe(2);
		for (let i = 0; i < actions.length; i++) {
			expect(actions[i].type).toBe('create');
			expect(actions[i].dest).toBe('remote');
		}
	});

	it('should update remote items', function(done) {	
		createRemoteItems(1).then((remoteItems) => {
			let lastSyncTime = time.unix() + 1000;
			let localItems = createLocalItems(1, lastSyncTime + 1000, lastSyncTime);
			let actions = synchronizer().syncActions(localItems, remoteItems, []);

			expect(actions.length).toBe(2);
			for (let i = 0; i < actions.length; i++) {
				expect(actions[i].type).toBe('update');
				expect(actions[i].dest).toBe('remote');
			}

			done();
		});
	});

	it('should detect conflict', function(done) {
		// Simulate this scenario:
		// - Client 1 create items
		// - Client 1 sync
		// - Client 2 sync
		// - Client 2 change items
		// - Client 2 sync
		// - Client 1 change items
		// - Client 1 sync
		// => Conflict

		createRemoteItems(1).then((remoteItems) => {
			let localItems = createLocalItems(1, time.unix() + 1000, time.unix() - 1000);
			let actions = synchronizer().syncActions(localItems, remoteItems, []);

			expect(actions.length).toBe(2);
			for (let i = 0; i < actions.length; i++) {
				expect(actions[i].type).toBe('conflict');
			}

			done();
		});
	});


	it('should create local file', function(done) {
		createRemoteItems(1).then((remoteItems) => {
			let localItems = [];
			let actions = synchronizer().syncActions(localItems, remoteItems, []);

			expect(actions.length).toBe(2);
			for (let i = 0; i < actions.length; i++) {
				expect(actions[i].type).toBe('create');
				expect(actions[i].dest).toBe('local');
			}

			done();
		});
	});

	it('should delete remote files', function(done) {
		createRemoteItems(1).then((remoteItems) => {
			let localItems = createLocalItems(1, time.unix(), time.unix());
			let deletedItemPaths = [localItems[0].path, localItems[1].path];
			let actions = synchronizer().syncActions([], remoteItems, deletedItemPaths);

			expect(actions.length).toBe(2);
			for (let i = 0; i < actions.length; i++) {
				expect(actions[i].type).toBe('delete');
				expect(actions[i].dest).toBe('remote');
			}

			done();
		});
	});

	it('should delete local files', function(done) {
		let lastSyncTime = time.unix();
		createRemoteItems(1, lastSyncTime - 1000).then((remoteItems) => {
			let localItems = createLocalItems(1, lastSyncTime - 1000, lastSyncTime);
			let actions = synchronizer().syncActions(localItems, [], []);

			expect(actions.length).toBe(2);
			for (let i = 0; i < actions.length; i++) {
				expect(actions[i].type).toBe('delete');
				expect(actions[i].dest).toBe('local');
			}

			done();
		});
	});

	it('should update local files', function(done) {
		let lastSyncTime = time.unix();
		createRemoteItems(1, lastSyncTime + 1000).then((remoteItems) => {
			let localItems = createLocalItems(1, lastSyncTime - 1000, lastSyncTime);
			let actions = synchronizer().syncActions(localItems, remoteItems, []);

			expect(actions.length).toBe(2);
			for (let i = 0; i < actions.length; i++) {
				expect(actions[i].type).toBe('update');
				expect(actions[i].dest).toBe('local');
			}

			done();
		});
	});

});

describe('Synchronizer start', function() {

	beforeEach(function(done) {
		setupDatabaseAndSynchronizer(done);
	});

	it('should create remote items', function(done) {
		createFoldersAndNotes().then(() => {
			return synchronizer().start();
		}
	}).then(() => {
		done();
	});

});
import LockHandler from 'lib/services/synchronizer/LockHandler';
import MigrationHandler from 'lib/services/synchronizer/MigrationHandler';

require('app-module-path').addPath(__dirname);

const { asyncTest, fileApi, synchronizer, setupDatabaseAndSynchronizer, switchClient, expectThrow, expectNotThrow } = require('test-utils.js');
const Setting = require('lib/models/Setting');
const Folder = require('lib/models/Folder');
const Note = require('lib/models/Note');
const { shim } = require('lib/shim');

let lockHandler_:LockHandler = null;
let migrationHandler_:MigrationHandler = null;

function lockHandler():LockHandler {
	if (lockHandler_) return lockHandler_;
	lockHandler_ = new LockHandler(fileApi());
	return lockHandler_;
}

function migrationHandler(clientId:string = 'abcd'):MigrationHandler {
	if (migrationHandler_) return migrationHandler_;
	migrationHandler_ = new MigrationHandler(fileApi(), lockHandler(), 'desktop', clientId);
	return migrationHandler_;
}

async function createTestNotes() {
	const struct:any = {
		folder1: {
			subFolder1: {},
			subFolder2: {
				note1: {
					resource: true,
					tags: ['tag1'],
				},
				note2: {},
			},
			note3: {
				tags: ['tag1', 'tag2'],
			},
			note4: {
				tags: ['tag2'],
			},
		},
		folder2: {},
		folder3: {
			note5: {
				resource: true,
				tags: ['tag2'],
			},
		},
	};

	async function recurseStruct(s:any, parentId:string = '') {
		for (const n in s) {
			if (n.toLowerCase().includes('folder')) {
				const folder = await Folder.save({ title: n, parent_id: parentId });
				await recurseStruct(s[n], folder.id);
			} else {
				const note = await Note.save({ title: n, parent_id: parentId });
				if (s[n].resource) {
					await shim.attachFileToNote(note, `${__dirname}/../tests/support/photo.jpg`);
				}
			}
		}
	}

	await recurseStruct(struct);
}

describe('synchronizer_MigrationHandler', function() {

	beforeEach(async (done:Function) => {
		lockHandler_ = null;
		migrationHandler_ = null;
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		done();
	});

	it('should not allow syncing if the sync versions are not the same', asyncTest(async () => {
		Setting.setConstant('syncVersion', 1);

		await synchronizer().start();

		Setting.setConstant('syncVersion', 2);

		expectThrow(async () => await migrationHandler().checkCanSync(), 'outdatedSyncTarget');

		await migrationHandler().upgrade(2);

		expectNotThrow(async () => await migrationHandler().checkCanSync());

		Setting.setConstant('syncVersion', 1);

		expectThrow(async () => await migrationHandler().checkCanSync(), 'outdatedClient');
	}));

	// Create a helper function that create notes, folders, resources and tags
	// Sync with previous sync format
	// Upgrade
	// Sync with new sync format
	// With encryption and without
	// => Check we got back the same notes, folders and tags

	it('should migrate (2)', asyncTest(async () => {
		await createTestNotes();

		Setting.setConstant('syncVersion', 1);

		await synchronizer().start();

		{
			const v = await migrationHandler().fetchSyncTargetInfo();
			expect(v.version).toBe(1);
		}

		await migrationHandler().upgrade(2);

		{
			const v = await migrationHandler().fetchSyncTargetInfo();
			expect(v.version).toBe(2);
			const items = (await fileApi().list()).items;
			expect(items.filter((i:any) => i.path === 'locks' && i.isDir).length).toBe(1);
			expect(items.filter((i:any) => i.path === 'temp' && i.isDir).length).toBe(1);
			expect(items.filter((i:any) => i.path === 'info.json' && !i.isDir).length).toBe(1);
		}
	}));

});

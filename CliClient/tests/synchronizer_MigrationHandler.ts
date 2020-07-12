import LockHandler from 'lib/services/synchronizer/LockHandler';
import MigrationHandler from 'lib/services/synchronizer/MigrationHandler';

require('app-module-path').addPath(__dirname);

const { asyncTest, fileApi, synchronizer, setupDatabaseAndSynchronizer, switchClient, expectThrow, expectNotThrow } = require('test-utils.js');
const Setting = require('lib/models/Setting');

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

	it('should migrate (2)', asyncTest(async () => {
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

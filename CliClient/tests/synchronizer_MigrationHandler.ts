import LockHandler from 'lib/services/synchronizer/LockHandler';
import MigrationHandler from 'lib/services/synchronizer/MigrationHandler';

// To create a sync target snapshot for the current syncVersion:
// - In test-utils, set syncTargetName_ to "filesystem"
// - Then run:
// gulp buildTests -L && node tests-build/support/createSyncTargetSnapshot.js normal && node tests-build/support/createSyncTargetSnapshot.js e2ee

require('app-module-path').addPath(__dirname);

const { asyncTest, setSyncTargetName, fileApi, synchronizer, decryptionWorker, encryptionService, setupDatabaseAndSynchronizer, switchClient, expectThrow, expectNotThrow } = require('test-utils.js');
const { deploySyncTargetSnapshot, testData, checkTestData } = require('./support/syncTargetUtils');
const Setting = require('lib/models/Setting');
const MasterKey = require('lib/models/MasterKey');

const specTimeout = 60000 * 10; // Nextcloud tests can be slow

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

interface MigrationTests {
	[key:string]: Function;
}

const migrationTests:MigrationTests = {
	2: async function() {
		const items = (await fileApi().list('', { includeHidden: true })).items;
		expect(items.filter((i:any) => i.path === '.resource' && i.isDir).length).toBe(1);
		expect(items.filter((i:any) => i.path === 'locks' && i.isDir).length).toBe(1);
		expect(items.filter((i:any) => i.path === 'temp' && i.isDir).length).toBe(1);
		expect(items.filter((i:any) => i.path === 'info.json' && !i.isDir).length).toBe(1);

		const versionForOldClients = await fileApi().get('.sync/version.txt');
		expect(versionForOldClients).toBe('2');
	},
};

let previousSyncTargetName:string = '';

describe('synchronizer_MigrationHandler', function() {

	beforeEach(async (done:Function) => {
		// To test the migrations, we have to use the filesystem sync target
		// because the sync target snapshots are plain files. Eventually
		// it should be possible to copy a filesystem target to memory
		// but for now that will do.
		previousSyncTargetName = setSyncTargetName('filesystem');
		lockHandler_ = null;
		migrationHandler_ = null;
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		done();
	});

	afterEach(async (done:Function) => {
		setSyncTargetName(previousSyncTargetName);
		done();
	});

	it('should not allow syncing if the sync target is out-dated', asyncTest(async () => {
		await synchronizer().start();
		await fileApi().put('info.json', `{"version":${Setting.value('syncVersion') - 1}}`);
		await expectThrow(async () => await migrationHandler().checkCanSync(), 'outdatedSyncTarget');
	}), specTimeout);

	it('should not allow syncing if the client is out-dated', asyncTest(async () => {
		await synchronizer().start();
		await fileApi().put('info.json', `{"version":${Setting.value('syncVersion') + 1}}`);
		await expectThrow(async () => await migrationHandler().checkCanSync(), 'outdatedClient');
	}), specTimeout);

	for (const migrationVersionString in migrationTests) {
		const migrationVersion = Number(migrationVersionString);

		it(`should migrate (${migrationVersion})`, asyncTest(async () => {
			await deploySyncTargetSnapshot('normal', migrationVersion - 1);

			const info = await migrationHandler().fetchSyncTargetInfo();
			expect(info.version).toBe(migrationVersion - 1);

			// Now, migrate to the new version
			await migrationHandler().upgrade(migrationVersion);

			// Verify that it has been upgraded
			const newInfo = await migrationHandler().fetchSyncTargetInfo();
			expect(newInfo.version).toBe(migrationVersion);
			await migrationTests[migrationVersion]();

			// Now sync with that upgraded target
			await synchronizer().start();

			// Check that the data has not been altered
			await expectNotThrow(async () => await checkTestData(testData));

			// Check what happens if we switch to a different client and sync
			await switchClient(2);
			Setting.setConstant('syncVersion', migrationVersion);
			await synchronizer().start();
			await expectNotThrow(async () => await checkTestData(testData));
		}), specTimeout);

		it(`should migrate (E2EE) (${migrationVersion})`, asyncTest(async () => {
			// First create some test data that will be used to validate
			// that the migration didn't alter any data.
			await deploySyncTargetSnapshot('e2ee', migrationVersion - 1);

			// Now, migrate to the new version
			Setting.setConstant('syncVersion', migrationVersion);
			await migrationHandler().upgrade(migrationVersion);

			// Verify that it has been upgraded
			const newInfo = await migrationHandler().fetchSyncTargetInfo();
			expect(newInfo.version).toBe(migrationVersion);
			await migrationTests[migrationVersion]();

			// Now sync with that upgraded target
			await synchronizer().start();

			// Decrypt the data
			const masterKey = (await MasterKey.all())[0];
			Setting.setObjectKey('encryption.passwordCache', masterKey.id, '123456');
			await encryptionService().loadMasterKeysFromSettings();
			await decryptionWorker().start();

			// Check that the data has not been altered
			await expectNotThrow(async () => await checkTestData(testData));

			// Check what happens if we switch to a different client and sync
			await switchClient(2);
			Setting.setConstant('syncVersion', migrationVersion);
			await synchronizer().start();

			// Should throw because data hasn't been decrypted yet
			await expectThrow(async () => await checkTestData(testData));

			// Enable E2EE and decrypt
			Setting.setObjectKey('encryption.passwordCache', masterKey.id, '123456');
			await encryptionService().loadMasterKeysFromSettings();
			await decryptionWorker().start();

			// Should not throw because data is decrypted
			await expectNotThrow(async () => await checkTestData(testData));
		}), specTimeout);
	}

});

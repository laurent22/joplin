// To create a sync target snapshot for the current syncVersion:
// - In test-utils, set syncTargetName_ to "filesystem"
// - Then run:
// node tests/support/createSyncTargetSnapshot.js normal && node tests/support/createSyncTargetSnapshot.js e2ee
//
// These tests work by a taking a sync target snapshot at a version n and upgrading it to n+1.

import LockHandler, { LockClientType } from './LockHandler';
import MigrationHandler from './MigrationHandler';
import { Dirnames } from './utils/types';
import { setSyncTargetName, fileApi, synchronizer, decryptionWorker, encryptionService, setupDatabaseAndSynchronizer, switchClient, expectThrow, expectNotThrow, db } from '../../testing/test-utils';
import { deploySyncTargetSnapshot, testData, checkTestData } from '../../testing/syncTargetUtils';
import Setting from '../../models/Setting';
import MasterKey from '../../models/MasterKey';
import { loadMasterKeysFromSettings } from '../e2ee/utils';
import { fetchSyncInfo } from './syncInfoUtils';

const specTimeout = 60000 * 10; // Nextcloud tests can be slow

let lockHandler_: LockHandler = null;
let migrationHandler_: MigrationHandler = null;

function lockHandler(): LockHandler {
	if (lockHandler_) return lockHandler_;
	lockHandler_ = new LockHandler(fileApi());
	return lockHandler_;
}

function migrationHandler(clientId = 'abcd'): MigrationHandler {
	if (migrationHandler_) return migrationHandler_;
	migrationHandler_ = new MigrationHandler(fileApi(), db(), lockHandler(), LockClientType.Desktop, clientId);
	return migrationHandler_;
}

interface MigrationTests {
	[key: string]: Function;
}

const migrationTests: MigrationTests = {
	2: async function() {
		const items = (await fileApi().list('', { includeHidden: true })).items;
		expect(items.filter((i: any) => i.path === '.resource' && i.isDir).length).toBe(1);
		expect(items.filter((i: any) => i.path === 'locks' && i.isDir).length).toBe(1);
		expect(items.filter((i: any) => i.path === 'temp' && i.isDir).length).toBe(1);
		expect(items.filter((i: any) => i.path === 'info.json' && !i.isDir).length).toBe(1);

		const versionForOldClients = await fileApi().get('.sync/version.txt');
		expect(versionForOldClients).toBe('2');
	},

	3: async function() {
		const items = (await fileApi().list('', { includeHidden: true })).items;
		expect(items.filter((i: any) => i.path === '.resource' && i.isDir).length).toBe(1);
		expect(items.filter((i: any) => i.path === 'locks' && i.isDir).length).toBe(1);
		expect(items.filter((i: any) => i.path === 'temp' && i.isDir).length).toBe(1);
		expect(items.filter((i: any) => i.path === 'info.json' && !i.isDir).length).toBe(1);

		const versionForOldClients = await fileApi().get('.sync/version.txt');
		expect(versionForOldClients).toBe('2');
	},
};

const maxSyncVersion = Number(Object.keys(migrationTests).sort().pop());

async function testMigration(migrationVersion: number, maxSyncVersion: number) {
	await deploySyncTargetSnapshot('normal', migrationVersion - 1);

	const info = await fetchSyncInfo(fileApi());
	expect(info.version).toBe(migrationVersion - 1);

	// Now, migrate to the new version
	Setting.setConstant('syncVersion', migrationVersion);
	await migrationHandler().upgrade(migrationVersion);

	// Verify that it has been upgraded
	const newInfo = await fetchSyncInfo(fileApi());
	expect(newInfo.version).toBe(migrationVersion);
	await migrationTests[migrationVersion]();

	// If we're not on the latest version, we exit here, because although the
	// synchronizer can run the migration from one version to another, it cannot
	// sync the data on an older version (since the code has been changed to
	// work with the latest version).
	if (migrationVersion !== maxSyncVersion) return;

	// Now sync with that upgraded target
	await synchronizer().start();

	// Check that the data has not been altered
	await expectNotThrow(async () => await checkTestData(testData));

	// Check what happens if we switch to a different client and sync
	await switchClient(2);
	Setting.setConstant('syncVersion', migrationVersion);
	await synchronizer().start();
	await expectNotThrow(async () => await checkTestData(testData));
}

async function testMigrationE2EE(migrationVersion: number, maxSyncVersion: number) {
	// First create some test data that will be used to validate
	// that the migration didn't alter any data.
	await deploySyncTargetSnapshot('e2ee', migrationVersion - 1);

	// Now, migrate to the new version
	Setting.setConstant('syncVersion', migrationVersion);
	await migrationHandler().upgrade(migrationVersion);

	// Verify that it has been upgraded
	const newInfo = await fetchSyncInfo(fileApi());
	expect(newInfo.version).toBe(migrationVersion);
	await migrationTests[migrationVersion]();

	if (migrationVersion !== maxSyncVersion) return;

	// Now sync with that upgraded target
	await synchronizer().start();

	// Decrypt the data
	const masterKey = (await MasterKey.all())[0];
	Setting.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
	await loadMasterKeysFromSettings(encryptionService());
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
	Setting.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
	await loadMasterKeysFromSettings(encryptionService());
	await decryptionWorker().start();

	// Should not throw because data is decrypted
	await expectNotThrow(async () => await checkTestData(testData));
}

let previousSyncTargetName = '';

describe('MigrationHandler', () => {

	beforeEach(async () => {
		// Note that, for undocumented reasons, the timeout argument passed
		// to `test()` (or `it()`) is ignored if it is higher than the
		// global Jest timeout. So we need to set it globally.
		//
		// https://github.com/facebook/jest/issues/5055#issuecomment-513585906
		jest.setTimeout(specTimeout);

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
	});

	afterEach(async () => {
		setSyncTargetName(previousSyncTargetName);
	});

	it('should init a new sync target', (async () => {
		// Check that basic folders "locks" and "temp" are created for new sync targets.
		await migrationHandler().upgrade(1);
		const result = await fileApi().list();
		expect(result.items.filter((i: any) => i.path === Dirnames.Locks).length).toBe(1);
		expect(result.items.filter((i: any) => i.path === Dirnames.Temp).length).toBe(1);
	}), specTimeout);

	it('should not allow syncing if the sync target is out-dated', (async () => {
		await synchronizer().start();
		await fileApi().put('info.json', `{"version":${Setting.value('syncVersion') - 1}}`);
		await expectThrow(async () => await migrationHandler().checkCanSync(), 'outdatedSyncTarget');
	}), specTimeout);

	it('should not allow syncing if the client is out-dated', (async () => {
		await synchronizer().start();
		await fileApi().put('info.json', `{"version":${Setting.value('syncVersion') + 1}}`);
		await expectThrow(async () => await migrationHandler().checkCanSync(), 'outdatedClient');
	}), specTimeout);

	it('should apply migration 2 normal', async () => {
		await testMigration(2, maxSyncVersion);
	}, specTimeout);

	it('should apply migration 2 E2EE', async () => {
		await testMigrationE2EE(2, maxSyncVersion);
	}, specTimeout);

	it('should apply migration 3 normal', async () => {
		await testMigration(3, maxSyncVersion);
	}, specTimeout);

	it('should apply migration 3 E2EE', async () => {
		await testMigrationE2EE(3, maxSyncVersion);
	}, specTimeout);

});

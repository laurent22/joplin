import Setting from '../../models/Setting';
import { afterAllCleanUp, encryptionService, fileContentEqual, setupDatabaseAndSynchronizer, supportDir, switchClient, synchronizerStart } from '../../testing/test-utils';
import EncryptionService from '../e2ee/EncryptionService';
import { localSyncInfo, saveLocalSyncInfo } from '../synchronizer/syncInfoUtils';
import NoteLockKey from './NoteLockKey';
import NoteLockService from './NoteLockService';

describe('NoteLockService', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		NoteLockKey.destroyInstance();
		NoteLockService.destroyInstance();
		EncryptionService.instance_ = encryptionService();
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should encrypt and decrypt strings and files without loading an E2EE master key', async () => {
		const encryptionServiceInstance = EncryptionService.instance();
		const noteLockKey = NoteLockKey.instance();
		const service = NoteLockService.instance();
		await noteLockKey.create('123456');

		const cipherText = await service.encryptString('some secret');
		expect(await service.decryptString(cipherText)).toBe('some secret');

		const sourcePath = `${supportDir}/photo.jpg`;
		const encryptedPath = `${Setting.value('tempDir')}/note-lock-photo.crypted`;
		const decryptedPath = `${Setting.value('tempDir')}/note-lock-photo.jpg`;
		await service.encryptFile(sourcePath, encryptedPath);
		await service.decryptFile(encryptedPath, decryptedPath);

		expect(fileContentEqual(sourcePath, encryptedPath)).toBe(false);
		expect(fileContentEqual(sourcePath, decryptedPath)).toBe(true);
		expect(encryptionServiceInstance.loadedMasterKeysCount()).toBe(0);
	});

	it('should clear cached key data and only rotate on reset', async () => {
		const noteLockKey = NoteLockKey.instance();
		const firstKey = await noteLockKey.create('123456');
		await expect(noteLockKey.create('123456')).rejects.toThrow('Note lock key already exists');

		noteLockKey.lock();
		expect(noteLockKey.isUnlocked()).toBe(false);
		await expect(noteLockKey.unlock('wrong password')).rejects.toThrow();

		const secondKey = await noteLockKey.reset('654321');
		expect(secondKey.id).not.toBe(firstKey.id);
		expect(noteLockKey.isUnlocked()).toBe(true);
	});

	it('should defer clearing key data while exporting', async () => {
		const noteLockKey = NoteLockKey.instance();
		const service = NoteLockService.instance();
		await noteLockKey.create('123456');
		const cipherText = await service.encryptString('some secret');

		noteLockKey.startExport();
		expect(noteLockKey.isUnlocked()).toBe(true);
		noteLockKey.endExport();
		expect(noteLockKey.isUnlocked()).toBe(true);

		noteLockKey.startExport();
		noteLockKey.lock();

		expect(noteLockKey.isUnlocked()).toBe(false);
		expect(await service.decryptString(cipherText)).toBe('some secret');

		noteLockKey.endExport();

		expect(noteLockKey.isUnlocked()).toBe(false);
		await expect(service.decryptString(cipherText)).rejects.toThrow('Note lock key is not unlocked');
	});

	it('should defer a synced key change until all exports finish', async () => {
		const noteLockKey = NoteLockKey.instance();
		const service = NoteLockService.instance();
		await noteLockKey.create('123456');
		const cipherText = await service.encryptString('some secret');

		noteLockKey.startExport();
		noteLockKey.startExport();

		const syncInfo = localSyncInfo();
		syncInfo.noteLockKey = {
			...syncInfo.noteLockKey,
			id: '0123456789abcdef0123456789abcdef',
		};
		saveLocalSyncInfo(syncInfo);

		expect(noteLockKey.isUnlocked()).toBe(false);
		expect(await service.decryptString(cipherText)).toBe('some secret');

		noteLockKey.endExport();
		expect(await service.decryptString(cipherText)).toBe('some secret');

		noteLockKey.endExport();
		await expect(service.decryptString(cipherText)).rejects.toThrow('Note lock key is not unlocked');
	});

	it('should clear a synced key change when the final export ends', async () => {
		const noteLockKey = NoteLockKey.instance();
		const service = NoteLockService.instance();
		const originalKey = await noteLockKey.create('123456');
		const cipherText = await service.encryptString('some secret');

		noteLockKey.startExport();
		const syncInfo = localSyncInfo();
		syncInfo.noteLockKey = {
			...originalKey,
			id: '0123456789abcdef0123456789abcdef',
		};
		saveLocalSyncInfo(syncInfo);
		noteLockKey.endExport();

		syncInfo.noteLockKey = originalKey;
		saveLocalSyncInfo(syncInfo);
		await expect(service.decryptString(cipherText)).rejects.toThrow('Note lock key is not unlocked');
	});

	it('should sync the encrypted note lock key without loading it into the E2EE registry', async () => {
		const createdKey = await NoteLockKey.instance().create('123456');
		NoteLockKey.destroyInstance();
		NoteLockService.destroyInstance();
		await synchronizerStart();

		await switchClient(2);
		EncryptionService.instance_ = encryptionService();
		await synchronizerStart();

		const syncedKey = NoteLockKey.instance();
		expect(syncedKey.load()).toEqual(createdKey);
		expect(syncedKey.isUnlocked()).toBe(false);
		expect(EncryptionService.instance().loadedMasterKeysCount()).toBe(0);
	});
});

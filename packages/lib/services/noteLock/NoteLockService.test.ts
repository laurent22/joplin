import Setting from '../../models/Setting';
import { afterAllCleanUp, encryptionService, fileContentEqual, setupDatabaseAndSynchronizer, supportDir, switchClient, synchronizerStart } from '../../testing/test-utils';
import EncryptionService from '../e2ee/EncryptionService';
import { localSyncInfo, saveLocalSyncInfo } from '../synchronizer/syncInfoUtils';
import NoteLockKey from './NoteLockKey';
import NoteLockSession from './NoteLockSession';
import NoteLockService from './NoteLockService';

describe('NoteLockService', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		NoteLockKey.destroyInstance();
		NoteLockSession.destroyInstance();
		NoteLockService.destroyInstance();
		EncryptionService.instance_ = encryptionService();
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should encrypt and decrypt strings and files without loading an E2EE master key', async () => {
		const encryptionServiceInstance = EncryptionService.instance();
		const noteLockKey = NoteLockKey.instance();
		const session = NoteLockSession.instance();
		const service = NoteLockService.instance();
		await noteLockKey.create('123456');
		await session.unlock('123456');

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
		const session = NoteLockSession.instance();
		const firstKey = await noteLockKey.create('123456');
		await expect(noteLockKey.create('123456')).rejects.toThrow('Note lock key already exists');

		await session.unlock('123456');
		session.lock();
		expect(session.isUnlocked()).toBe(false);
		await expect(session.unlock('wrong password')).rejects.toThrow();

		const secondKey = await noteLockKey.reset('654321');
		expect(secondKey.id).not.toBe(firstKey.id);
		await session.unlock('654321');
		expect(session.isUnlocked()).toBe(true);
	});

	it('should keep the key available to a lease after locking', async () => {
		const noteLockKey = NoteLockKey.instance();
		const session = NoteLockSession.instance();
		const service = NoteLockService.instance();
		await noteLockKey.create('123456');
		await session.unlock('123456');
		const cipherText = await service.encryptString('some secret');

		await session.withKeyHeld(async () => {
			expect(session.isUnlocked()).toBe(true);
		});
		expect(session.isUnlocked()).toBe(true);

		await session.withKeyHeld(async () => {
			session.lock();
			expect(session.isUnlocked()).toBe(false);
			expect(await service.decryptString(cipherText)).toBe('some secret');
		});

		expect(session.isUnlocked()).toBe(false);
		await expect(service.decryptString(cipherText)).rejects.toThrow('Note lock session is locked');
	});

	it('should release the lease when a held callback throws', async () => {
		const noteLockKey = NoteLockKey.instance();
		const session = NoteLockSession.instance();
		await noteLockKey.create('123456');
		await session.unlock('123456');

		await expect(session.withKeyHeld(async () => {
			throw new Error('boom');
		})).rejects.toThrow('boom');

		session.lock();
		expect(() => session.decryptedKey()).toThrow('Note lock session is locked');
	});

	it('should leave the session locked after create and reset until explicitly unlocked', async () => {
		const noteLockKey = NoteLockKey.instance();
		const session = NoteLockSession.instance();

		await noteLockKey.create('123456');
		expect(session.isUnlocked()).toBe(false);

		await session.unlock('123456');
		expect(session.isUnlocked()).toBe(true);

		await noteLockKey.reset('654321');
		expect(session.isUnlocked()).toBe(false);
	});

	it('should not serve a key that changed before the lease started', async () => {
		const noteLockKey = NoteLockKey.instance();
		const session = NoteLockSession.instance();
		const service = NoteLockService.instance();
		await noteLockKey.create('123456');
		await session.unlock('123456');
		const cipherText = await service.encryptString('some secret');

		const syncInfo = localSyncInfo();
		syncInfo.noteLockKey = {
			...syncInfo.noteLockKey,
			id: '0123456789abcdef0123456789abcdef',
		};
		saveLocalSyncInfo(syncInfo);

		await session.withKeyHeld(async () => {
			await expect(service.decryptString(cipherText)).rejects.toThrow('Note lock session is locked');
		});
	});

	it('should reject unlocking while a lease holds the key', async () => {
		const noteLockKey = NoteLockKey.instance();
		const session = NoteLockSession.instance();
		await noteLockKey.create('123456');
		await session.unlock('123456');

		await session.withKeyHeld(async () => {
			await expect(session.unlock('123456')).rejects.toThrow('Cannot unlock the note lock session while an operation is holding the key');
		});
	});

	it('should hold the key until the last overlapping lease finishes out of order', async () => {
		const noteLockKey = NoteLockKey.instance();
		const session = NoteLockSession.instance();
		const service = NoteLockService.instance();
		await noteLockKey.create('123456');
		await session.unlock('123456');
		const cipherText = await service.encryptString('some secret');

		let releaseFirst: ()=> void = () => {};
		let releaseSecond: ()=> void = () => {};
		const firstGate = new Promise<void>(resolve => { releaseFirst = resolve; });
		const secondGate = new Promise<void>(resolve => { releaseSecond = resolve; });

		const firstLease = session.withKeyHeld(async () => { await firstGate; });
		const secondLease = session.withKeyHeld(async () => { await secondGate; });

		session.lock();
		expect(session.isUnlocked()).toBe(false);

		releaseFirst();
		await firstLease;
		// While any lease is in flight the held key is process-wide: even this caller, which is
		// outside the lease, can still decrypt. Intentional for now; to be scoped to the leased
		// operation when export integration lands.
		expect(await service.decryptString(cipherText)).toBe('some secret');

		releaseSecond();
		await secondLease;
		await expect(service.decryptString(cipherText)).rejects.toThrow('Note lock session is locked');
	});

	it('should defer a synced key change until the final lease ends, then clear it', async () => {
		const noteLockKey = NoteLockKey.instance();
		const session = NoteLockSession.instance();
		const service = NoteLockService.instance();
		const originalKey = await noteLockKey.create('123456');
		await session.unlock('123456');
		const cipherText = await service.encryptString('some secret');

		await session.withKeyHeld(async () => {
			await session.withKeyHeld(async () => {
				const syncInfo = localSyncInfo();
				syncInfo.noteLockKey = {
					...syncInfo.noteLockKey,
					id: '0123456789abcdef0123456789abcdef',
				};
				saveLocalSyncInfo(syncInfo);

				// Visible session reads as locked, but the in-flight lease still gets the key.
				expect(session.isUnlocked()).toBe(false);
				expect(await service.decryptString(cipherText)).toBe('some secret');
			});

			expect(await service.decryptString(cipherText)).toBe('some secret');
		});

		// Once every lease is done the key is cleared and stays cleared even if the original returns.
		const syncInfo = localSyncInfo();
		syncInfo.noteLockKey = originalKey;
		saveLocalSyncInfo(syncInfo);
		await expect(service.decryptString(cipherText)).rejects.toThrow('Note lock session is locked');
	});

	it('should sync the encrypted note lock key without loading it into the E2EE registry', async () => {
		const createdKey = await NoteLockKey.instance().create('123456');
		NoteLockKey.destroyInstance();
		NoteLockSession.destroyInstance();
		NoteLockService.destroyInstance();
		await synchronizerStart();

		await switchClient(2);
		EncryptionService.instance_ = encryptionService();
		await synchronizerStart();

		const syncedKey = NoteLockKey.instance();
		expect(syncedKey.load()).toEqual(createdKey);
		expect(NoteLockSession.instance().isUnlocked()).toBe(false);
		expect(EncryptionService.instance().loadedMasterKeysCount()).toBe(0);
	});
});

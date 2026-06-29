import Setting from '../../models/Setting';
import { afterAllCleanUp, encryptionService, fileContentEqual, setupDatabaseAndSynchronizer, supportDir, switchClient } from '../../testing/test-utils';
import EncryptionService from '../e2ee/EncryptionService';
import { localSyncInfo, saveLocalSyncInfo } from '../synchronizer/syncInfoUtils';
import NoteLockKey from './NoteLockKey';
import NoteLockSession from './NoteLockSession';
import NoteLockService, { ScopedNoteLockService } from './NoteLockService';

describe('NoteLockService', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		NoteLockService.destroyInstance();
		NoteLockSession.destroyInstance();
		NoteLockKey.destroyInstance();
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

	it('should refuse to run a held operation while the session is locked', async () => {
		await NoteLockKey.instance().create('123456');
		await expect(NoteLockService.withDecryptedKey(async () => {})).rejects.toThrow('Note lock session is locked');
	});

	it('should keep a held operation working after the session locks, refuse the session-backed service, and revoke the scoped service afterwards', async () => {
		const session = NoteLockSession.instance();
		const service = NoteLockService.instance();
		await NoteLockKey.instance().create('123456');
		await session.unlock('123456');
		const cipherText = await service.encryptString('some secret');

		let escaped: ScopedNoteLockService = null;
		await NoteLockService.withDecryptedKey(async scoped => {
			escaped = scoped;
			session.lock();
			await expect(service.decryptString(cipherText)).rejects.toThrow('Note lock session is locked');
			expect(await scoped.decryptString(cipherText)).toBe('some secret');
		});

		await expect(service.decryptString(cipherText)).rejects.toThrow('Note lock session is locked');
		await expect(escaped.decryptString(cipherText)).rejects.toThrow('Note lock operation key is no longer available');
	});

	it('should keep a held operation on its captured key when the synced key changes, and fail the session-backed service closed', async () => {
		const session = NoteLockSession.instance();
		const service = NoteLockService.instance();
		await NoteLockKey.instance().create('123456');
		await session.unlock('123456');
		const cipherText = await service.encryptString('some secret');

		await NoteLockService.withDecryptedKey(async scoped => {
			const syncInfo = localSyncInfo();
			syncInfo.noteLockKey = { ...syncInfo.noteLockKey, id: '0123456789abcdef0123456789abcdef' };
			saveLocalSyncInfo(syncInfo);

			expect(await scoped.decryptString(cipherText)).toBe('some secret');
			await expect(service.encryptString('unrelated')).rejects.toThrow('Note lock session is locked');
		});
	});

	it('should propagate errors from a held operation and still revoke the scoped service', async () => {
		const session = NoteLockSession.instance();
		await NoteLockKey.instance().create('123456');
		await session.unlock('123456');

		let escaped: ScopedNoteLockService = null;
		await expect(NoteLockService.withDecryptedKey(async scoped => {
			escaped = scoped;
			throw new Error('boom');
		})).rejects.toThrow('boom');

		await expect(escaped.decryptString('does not matter')).rejects.toThrow('Note lock operation key is no longer available');
	});
});
